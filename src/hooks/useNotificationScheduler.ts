import { useState, useEffect, useRef, useCallback } from 'react';
import { Reminder } from '../types';
import { useVocalAudio } from './useVocalAudio';

export interface UseNotificationSchedulerReturn {
  permission: NotificationPermission | 'unsupported';
  isSupported: boolean;
  isSubscribed: boolean;
  isWorkerActive: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  sendTestNotification: () => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => void;
  lastAlert: { reminder: Reminder; time: string } | null;
  clearLastAlert: () => void;
}

const STORAGE_KEY_SUBSCRIBED = 'vocalis_notifications_subscribed';

export function useNotificationScheduler(
  reminders: Reminder[],
  onOpenExercise?: (reminder: Reminder) => void
): UseNotificationSchedulerReturn {
  const { playChime } = useVocalAudio();
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBSCRIBED);
      return saved !== 'false'; // Padrão: ativado se permitido
    } catch {
      return true;
    }
  });
  const [isWorkerActive, setIsWorkerActive] = useState<boolean>(false);
  const [lastAlert, setLastAlert] = useState<{ reminder: Reminder; time: string } | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);

  // Inicializa suporte e Service Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }

    // Registra Service Worker para exibição em segundo plano garantida
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then((reg) => {
          swRegRef.current = reg;
          console.log('[Vocalis PWA] Service Worker registrado com sucesso:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Vocalis PWA] Falha ao registrar Service Worker:', err);
        });

      // Escuta cliques vindos do Service Worker
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICKED') {
          console.log('[Vocalis PWA] Notificação clicada pelo usuário:', event.data);
          if (event.data.data && onOpenExercise) {
            onOpenExercise(event.data.data as Reminder);
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [onOpenExercise]);

  // Inicializa o Web Worker de segundo plano
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const worker = new Worker('/reminder-worker.js');
      workerRef.current = worker;
      setIsWorkerActive(true);

      worker.onmessage = (e: MessageEvent) => {
        const { type, reminder, currentTime } = e.data || {};
        if (type === 'TRIGGER_REMINDER' && reminder) {
          handleReminderTriggered(reminder, currentTime);
        }
      };

      worker.onerror = (err) => {
        console.warn('[Vocalis Worker] Erro no Web Worker de segundo plano:', err);
      };

      return () => {
        worker.terminate();
        workerRef.current = null;
        setIsWorkerActive(false);
      };
    } catch (err) {
      console.warn('[Vocalis] Não foi possível iniciar Web Worker separado, usando timer local:', err);
    }
  }, []);

  // Atualiza lembretes no Web Worker sempre que a lista de lembretes mudar
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'SET_REMINDERS',
        payload: reminders
      });
    }
  }, [reminders]);

  // Despacha a notificação no navegador
  const dispatchNotification = useCallback(
    async (title: string, body: string, reminderData?: any) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission !== 'granted') return false;

      const options: NotificationOptions = {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: `vocalis-reminder-${reminderData?.id || Date.now()}`,
        requireInteraction: true,
        data: reminderData,
        // @ts-ignore - vibration API
        vibrate: [250, 100, 250, 100, 250],
      };

      // 1. Tenta via Service Worker (mais confiável para abas em segundo plano)
      if (swRegRef.current && 'showNotification' in swRegRef.current) {
        try {
          await swRegRef.current.showNotification(title, options);
          return true;
        } catch (swErr) {
          console.warn('[Vocalis SW Notification] Fallback para Notification API clássica:', swErr);
        }
      }

      // 2. Fallback: Notification clássica
      try {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          notif.close();
          if (reminderData && onOpenExercise) {
            onOpenExercise(reminderData);
          }
        };
        return true;
      } catch (err) {
        console.error('[Vocalis Notification Error]:', err);
        return false;
      }
    },
    [onOpenExercise]
  );

  // Executa o disparo do lembrete (Áudio + Notificação do Sistema + Alerta em tela)
  const handleReminderTriggered = useCallback(
    (reminder: Reminder, currentTime?: string) => {
      // Se o usuário desativou no switch local, não dispara
      if (!isSubscribed) return;

      const nowTimeStr = currentTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // 1. Toca som suave fonoaudiológico se ativado no lembrete
      if (reminder.sound_alert) {
        try {
          playChime('alert');
        } catch (e) {
          console.warn('Could not play chime:', e);
        }
      }

      // 2. Define o alerta recente para a interface
      setLastAlert({ reminder, time: nowTimeStr });

      // 3. Emite a Notificação do Navegador (aparece mesmo em segundo plano)
      const categoryNames: Record<string, string> = {
        aquecimento: 'Aquecimento Vocal',
        hidratacao: 'Hidratação Laríngea',
        exercicio: 'Exercício Terapêutico',
        desaquecimento: 'Desaquecimento Vocal'
      };
      const catLabel = categoryNames[reminder.category] || 'Higiene Vocal';

      const title = `Vocalis: ${reminder.title}`;
      const body = `⏰ Horário de ${catLabel} agendado para às ${reminder.time_str}. Clique para praticar com segurança.`;

      dispatchNotification(title, body, reminder);
    },
    [isSubscribed, playChime, dispatchNotification]
  );

  // Solicita permissão do navegador
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return 'denied';
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        setIsSubscribed(true);
        localStorage.setItem(STORAGE_KEY_SUBSCRIBED, 'true');

        // Envia notificação de confirmação imediata
        dispatchNotification(
          'Vocalis: Notificações Ativadas com Sucesso!',
          'Seus lembretes de exercícios vocais serão emitidos neste dispositivo mesmo quando a aba estiver em segundo plano.'
        );
      }
      return res;
    } catch (err) {
      console.error('[Vocalis Permission Error]:', err);
      return 'denied';
    }
  }, [dispatchNotification]);

  // Envia notificação de teste sob demanda
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    playChime('alert');

    if (permission !== 'granted') {
      const res = await requestPermission();
      if (res !== 'granted') return false;
    }

    const testReminder: Reminder = {
      id: 999999,
      title: 'Teste de Lembrete Vocal (Segundo Plano)',
      time_str: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      days_mask: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      is_active: true,
      sound_alert: true,
      category: 'aquecimento'
    };

    setLastAlert({ reminder: testReminder, time: testReminder.time_str });

    return dispatchNotification(
      'Vocalis: Alerta de Exercício Vocal (Teste)',
      'O sistema de notificações em segundo plano está funcionando perfeitamente! Seus treinos vocais serão lembrados com pontualidade.',
      testReminder
    );
  }, [permission, playChime, requestPermission, dispatchNotification]);

  const toggleNotifications = useCallback((enabled: boolean) => {
    setIsSubscribed(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_SUBSCRIBED, enabled ? 'true' : 'false');
    } catch {}
    if (enabled && permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const clearLastAlert = useCallback(() => {
    setLastAlert(null);
  }, []);

  return {
    permission,
    isSupported,
    isSubscribed,
    isWorkerActive,
    requestPermission,
    sendTestNotification,
    toggleNotifications,
    lastAlert,
    clearLastAlert
  };
}
