import { useState, useEffect, useRef, useCallback } from 'react';
import { Reminder } from '../types';
import { useVocalAudio } from './useVocalAudio';
import { syncAndroidAlarms, triggerHaptic } from '../utils/androidBridge';
import { api } from '../services/api';

export interface UseNotificationSchedulerReturn {
  permission: NotificationPermission | 'unsupported';
  isSupported: boolean;
  isSubscribed: boolean;
  isWorkerActive: boolean;
  isPushSubscribed: boolean;
  isAndroidAlarmSynced: boolean;
  isPeriodicSyncActive: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  enableBackgroundPush: () => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  toggleNotifications: (enabled: boolean) => void;
  lastAlert: { reminder: Reminder; time: string } | null;
  clearLastAlert: () => void;
}

const STORAGE_KEY_SUBSCRIBED = 'vocalis_notifications_subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotificationScheduler(
  reminders: Reminder[],
  onOpenExercise?: (reminder: Reminder) => void,
  userId?: number
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
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [isAndroidAlarmSynced, setIsAndroidAlarmSynced] = useState<boolean>(false);
  const [isPeriodicSyncActive, setIsPeriodicSyncActive] = useState<boolean>(false);
  const [lastAlert, setLastAlert] = useState<{ reminder: Reminder; time: string } | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const pushEndpointRef = useRef<string | null>(null);
  const remindersRef = useRef<Reminder[]>(reminders);
  remindersRef.current = reminders;

  const firedMapRef = useRef<Set<string>>(new Set());

  const syncToServiceWorkerAndServer = useCallback(
    async (list: Reminder[]) => {
      const tzOffsetMinutes = new Date().getTimezoneOffset();

      // 1. Android APK AlarmManager nativo (roda mesmo com APK fechado e após reiniciar)
      const androidSynced = syncAndroidAlarms(list);
      if (androidSynced) {
        setIsAndroidAlarmSynced(true);
      }

      // 2. Service Worker IndexedDB (para PeriodicSync e clique offline)
      try {
        if ('serviceWorker' in navigator) {
          const controller = navigator.serviceWorker.controller || swRegRef.current?.active;
          controller?.postMessage({
            type: 'SYNC_REMINDERS',
            payload: { reminders: list, tzOffsetMinutes },
          });
        }
      } catch {
        // Ignore postMessage restriction
      }

      // 3. Backend Web Push Scheduler (entrega notificações com o navegador/aba fechados)
      if (pushEndpointRef.current || isPushSubscribed) {
        await api.syncPushReminders({
          endpoint: pushEndpointRef.current || undefined,
          userId,
          reminders: list,
          tzOffsetMinutes,
        });
      }
    },
    [isPushSubscribed, userId]
  );

  // Registra inscrição Web Push (VAPID) + Periodic Background Sync no Service Worker
  const enableBackgroundPush = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

    try {
      const reg = swRegRef.current || (await navigator.serviceWorker.ready);
      swRegRef.current = reg;

      // Sincroniza lembretes para o SW imediatamente
      const tzOffsetMinutes = new Date().getTimezoneOffset();
      (reg.active || navigator.serviceWorker.controller)?.postMessage({
        type: 'SYNC_REMINDERS',
        payload: { reminders: remindersRef.current, tzOffsetMinutes },
      });

      // Tenta registrar Periodic Background Sync (para acordar o SW mesmo sem internet)
      try {
        const regAny = reg as unknown as {
          periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
        };
        if (regAny.periodicSync) {
          await regAny.periodicSync.register('vocalis-reminder-check', {
            minInterval: 15 * 60 * 1000,
          });
          setIsPeriodicSyncActive(true);
        }
      } catch {
        // PeriodicSync não permitido neste navegador ou contexto
      }

      if (!('PushManager' in window) || Notification.permission !== 'granted') {
        return false;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyResp = await api.getPushPublicKey();
        if (!keyResp?.publicKey) return false;
        const applicationServerKey = urlBase64ToUint8Array(keyResp.publicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as unknown as BufferSource,
        });
      }

      const subJson = sub.toJSON();
      pushEndpointRef.current = sub.endpoint;

      const result = await api.subscribePush({
        subscription: subJson,
        reminders: remindersRef.current,
        tzOffsetMinutes,
        userId,
      });

      const ok = Boolean(result?.success);
      setIsPushSubscribed(ok);
      return ok;
    } catch (err) {
      console.warn('[Vocalis Push] Não foi possível ativar Web Push neste contexto:', err);
      return false;
    }
  }, [userId]);

  // Inicializa suporte, Service Worker e verifica assinatura Push existente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    } else {
      setPermission('unsupported');
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(async (reg) => {
          swRegRef.current = reg;
          await syncToServiceWorkerAndServer(remindersRef.current);

          if ('PushManager' in window && Notification.permission === 'granted') {
            try {
              const existing = await reg.pushManager.getSubscription();
              if (existing) {
                pushEndpointRef.current = existing.endpoint;
                setIsPushSubscribed(true);
                await api.subscribePush({
                  subscription: existing.toJSON(),
                  reminders: remindersRef.current,
                  tzOffsetMinutes: new Date().getTimezoneOffset(),
                  userId,
                });
              } else {
                // Tenta inscrever automaticamente se permissão já estiver concedida
                await enableBackgroundPush();
              }
            } catch {
              // Ignora caso PushManager seja bloqueado em iframe sandboxed
            }
          }
        })
        .catch(() => {});
    }
  }, [enableBackgroundPush, syncToServiceWorkerAndServer, userId]);

  // Flashes document title to alert the patient when browsing other tabs
  const flashTitle = useCallback((alertTitle: string) => {
    if (typeof document === 'undefined') return;
    const originalTitle = document.title;
    let isFlashed = false;
    let count = 0;
    const interval = setInterval(() => {
      document.title = isFlashed ? originalTitle : `⏰ ${alertTitle}`;
      isFlashed = !isFlashed;
      count++;
      if (count >= 12 || document.visibilityState === 'visible') {
        clearInterval(interval);
        document.title = originalTitle;
      }
    }, 1000);
  }, []);

  // Despacha a notificação no navegador / Android
  const dispatchNotification = useCallback(
    async (title: string, body: string, reminderData?: any) => {
      triggerHaptic([200, 100, 200]);

      if (typeof window !== 'undefined' && window.VocalisAndroid?.showNotification) {
        try {
          window.VocalisAndroid.showNotification(title, body);
          return true;
        } catch {}
      }

      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission !== 'granted') return false;

      const options: NotificationOptions = {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `vocalis-reminder-${reminderData?.id || Date.now()}`,
        requireInteraction: true,
        data: {
          ...(reminderData || {}),
          reminderId: reminderData?.id,
          exerciseId: reminderData?.exercise_id,
          url: reminderData?.id ? `/?tab=exercises&reminderId=${reminderData.id}` : '/?tab=exercises',
        },
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
      if (!isSubscribed) return;

      const nowTimeStr =
        currentTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      if (reminder.sound_alert) {
        try {
          playChime('alert');
        } catch (e) {
          console.warn('Could not play chime:', e);
        }
      }

      setLastAlert({ reminder, time: nowTimeStr });

      const categoryNames: Record<string, string> = {
        aquecimento: 'Aquecimento Vocal',
        hidratacao: 'Hidratação Laríngea',
        exercicio: 'Exercício Terapêutico',
        desaquecimento: 'Desaquecimento Vocal',
      };
      const catLabel = categoryNames[reminder.category] || 'Higiene Vocal';

      const title = `Vocalis: ${reminder.title}`;
      const body = `⏰ Horário de ${catLabel} agendado para às ${reminder.time_str}. Clique para praticar com segurança.`;

      flashTitle(reminder.title);
      void dispatchNotification(title, body, reminder);
    },
    [isSubscribed, playChime, dispatchNotification, flashTitle]
  );

  const handleTriggeredRef = useRef(handleReminderTriggered);
  handleTriggeredRef.current = handleReminderTriggered;

  // Inicializa o Web Worker de segundo plano
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const worker = new Worker('/reminder-worker.js');
      workerRef.current = worker;
      setIsWorkerActive(true);

      worker.onmessage = (e: MessageEvent) => {
        const { type, reminder, currentTime, dateStr } = e.data || {};
        if (type === 'TRIGGER_REMINDER' && reminder) {
          const triggerKey = `${reminder.id}_${dateStr || ''}_${currentTime || ''}`;
          if (!firedMapRef.current.has(triggerKey)) {
            firedMapRef.current.add(triggerKey);
            handleTriggeredRef.current(reminder, currentTime);
          }
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

  // Main-thread fallback ticker: checks every 10 seconds in addition to Web Worker & Web Push
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const DAY_MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

    const checkLocalReminders = () => {
      const now = new Date();
      const dayIndex = now.getDay();
      const currentDay = DAY_MAP[dayIndex];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;
      const dateStr = now.toISOString().split('T')[0];

      for (const rem of reminders) {
        if (!rem.is_active) continue;
        const days = Array.isArray(rem.days_mask) ? rem.days_mask : [];
        if (!days.includes(currentDay)) continue;

        if (rem.time_str === currentTime) {
          const triggerKey = `${rem.id}_${dateStr}_${currentTime}`;
          if (!firedMapRef.current.has(triggerKey)) {
            firedMapRef.current.add(triggerKey);
            handleTriggeredRef.current(rem, currentTime);
          }
        }
      }

      if (firedMapRef.current.size > 200) {
        firedMapRef.current.clear();
      }
    };

    const intervalId = setInterval(checkLocalReminders, 10000);
    checkLocalReminders();

    return () => clearInterval(intervalId);
  }, [reminders]);

  // Atualiza lembretes no Web Worker, Service Worker, Servidor Web Push e Android AlarmManager
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'SET_REMINDERS',
        payload: reminders,
      });
    }
    void syncToServiceWorkerAndServer(reminders);
  }, [reminders, syncToServiceWorkerAndServer]);

  // Solicita permissão do navegador e ativa Web Push fora do app
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

        await enableBackgroundPush();

        void dispatchNotification(
          'Vocalis: Notificações Fora do App Ativadas!',
          'Seus lembretes de exercícios vocais serão entregues mesmo quando o aplicativo ou navegador estiver fechado.'
        );
      }
      return res;
    } catch (err) {
      console.error('[Vocalis Permission Error]:', err);
      return 'denied';
    }
  }, [dispatchNotification, enableBackgroundPush]);

  // Envia notificação de teste sob demanda (tenta Web Push real primeiro)
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    playChime('alert');

    if (permission !== 'granted') {
      const res = await requestPermission();
      if (res !== 'granted') return false;
    }

    const testReminder: Reminder = {
      id: 999999,
      title: 'Teste de Lembrete Vocal (Fora do App)',
      time_str: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      days_mask: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
      is_active: true,
      sound_alert: true,
      category: 'aquecimento',
    };

    setLastAlert({ reminder: testReminder, time: testReminder.time_str });

    if (isPushSubscribed && pushEndpointRef.current) {
      const pushRes = await api.sendTestPush(pushEndpointRef.current, userId);
      if (pushRes?.success) {
        return true;
      }
    }

    return dispatchNotification(
      'Vocalis: Alerta de Exercício Vocal (Teste)',
      'O sistema de notificações em segundo plano está funcionando! Seus treinos vocais serão lembrados com pontualidade.',
      testReminder
    );
  }, [permission, playChime, requestPermission, dispatchNotification, isPushSubscribed, userId]);

  const toggleNotifications = useCallback(
    (enabled: boolean) => {
      setIsSubscribed(enabled);
      try {
        localStorage.setItem(STORAGE_KEY_SUBSCRIBED, enabled ? 'true' : 'false');
      } catch {}

      if (enabled) {
        if (permission === 'default') {
          void requestPermission();
        } else if (permission === 'granted') {
          void enableBackgroundPush();
        }
      } else if (pushEndpointRef.current) {
        void api.unsubscribePush(pushEndpointRef.current);
        setIsPushSubscribed(false);
      }
    },
    [permission, requestPermission, enableBackgroundPush]
  );

  const clearLastAlert = useCallback(() => {
    setLastAlert(null);
  }, []);

  return {
    permission,
    isSupported,
    isSubscribed,
    isWorkerActive,
    isPushSubscribed,
    isAndroidAlarmSynced,
    isPeriodicSyncActive,
    requestPermission,
    enableBackgroundPush,
    sendTestNotification,
    toggleNotifications,
    lastAlert,
    clearLastAlert,
  };
}
