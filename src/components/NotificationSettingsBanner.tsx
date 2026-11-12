import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  ShieldAlert,
  Radio,
  Send,
  Loader2,
  CalendarPlus,
  Smartphone,
  CloudLightning,
} from 'lucide-react';

interface NotificationSettingsBannerProps {
  permission: NotificationPermission | 'unsupported';
  isSupported: boolean;
  isSubscribed: boolean;
  isWorkerActive: boolean;
  isPushSubscribed?: boolean;
  isAndroidAlarmSynced?: boolean;
  onRequestPermission: () => Promise<NotificationPermission>;
  onEnableBackgroundPush?: () => Promise<boolean>;
  onSendTestNotification: () => Promise<boolean>;
  onToggleNotifications: (enabled: boolean) => void;
  onExportIcs?: () => void;
}

export const NotificationSettingsBanner: React.FC<NotificationSettingsBannerProps> = ({
  permission,
  isSupported,
  isSubscribed,
  isWorkerActive,
  isPushSubscribed = false,
  isAndroidAlarmSynced = false,
  onRequestPermission,
  onEnableBackgroundPush,
  onSendTestNotification,
  onToggleNotifications,
  onExportIcs,
}) => {
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [activatingPush, setActivatingPush] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    const ok = await onSendTestNotification();
    setTesting(false);
    if (ok) {
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 4000);
    }
  };

  const handleEnablePush = async () => {
    if (!onEnableBackgroundPush) return;
    setActivatingPush(true);
    await onEnableBackgroundPush();
    setActivatingPush(false);
  };

  if (!isSupported && !isAndroidAlarmSynced) {
    return (
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Notificações Web Indisponíveis neste Navegador:
            </span>{' '}
            Use a exportação para a Agenda do dispositivo para receber alarmes nativos mesmo com o app fechado.
          </div>
        </div>
        {onExportIcs && (
          <button
            type="button"
            onClick={onExportIcs}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Exportar Agenda (.ics)</span>
          </button>
        )}
      </div>
    );
  }

  // Notificações concedidas ou APK Android nativo ativo
  if (permission === 'granted' || isAndroidAlarmSynced) {
    const outOfAppReady = isPushSubscribed || isAndroidAlarmSynced;

    return (
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900/40 border border-emerald-500/30 dark:border-emerald-800/60 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative p-3 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <BellRing className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-300 rounded-full border-2 border-white dark:border-slate-900" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
                  Notificações Fora do App {outOfAppReady ? 'Conectadas' : 'Prontas'}
                </h3>

                {isPushSubscribed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                    <CloudLightning className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Web Push Ativo (App Fechado)
                  </span>
                )}

                {isAndroidAlarmSynced && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/70 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
                    <Smartphone className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    Alarmes Nativos Android Ativos
                  </span>
                )}

                {isWorkerActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">
                    <Radio className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                    Web Worker Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                {isAndroidAlarmSynced
                  ? 'Seus horários foram agendados no AlarmManager do Android. Os alertas tocarão nos dias programados mesmo com o app fechado ou após reiniciar o celular.'
                  : isPushSubscribed
                    ? 'Inscrição Web Push (VAPID) sincronizada com o servidor. Você receberá alertas no dispositivo nos horários marcados mesmo com a aba ou navegador fechados.'
                    : 'Notificações locais estão ativas. Ative o Web Push em segundo plano ou adicione à Agenda do celular para garantir alertas mesmo com o navegador fechado.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
            {!isPushSubscribed && !isAndroidAlarmSynced && onEnableBackgroundPush && (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={activatingPush}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
              >
                {activatingPush ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudLightning className="w-3.5 h-3.5" />
                )}
                <span>Ativar Push (App Fechado)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                testSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span>Disparando...</span>
                </>
              ) : testSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Notificação Enviada!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Testar Alerta Agora</span>
                </>
              )}
            </button>

            {onExportIcs && (
              <button
                type="button"
                onClick={onExportIcs}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-sm transition-all"
                title="Sincronizar horários com Google Agenda / Calendário do iOS e Android"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Agenda (.ics)</span>
              </button>
            )}

            <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isSubscribed}
                onChange={(e) => onToggleNotifications(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <span>Ativado</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  // Notificações bloqueadas pelo paciente no navegador
  if (permission === 'denied') {
    return (
      <div className="p-5 sm:p-6 rounded-3xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0">
            <BellOff className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Notificações do Navegador Bloqueadas
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              O navegador está configurado para bloquear notificações deste site. Para receber os lembretes fora do aplicativo:
            </p>
            <ol className="text-xs text-rose-700 dark:text-rose-400 list-decimal list-inside space-y-0.5 pt-1">
              <li>Clique no ícone de <strong>Cadeado / Informações do Site</strong> na barra de endereços (ao lado da URL).</li>
              <li>Altere a permissão de <strong>Notificações</strong> para <strong>Permitir</strong> e recarregue a página.</li>
              <li>Ou exporte seus horários diretamente para o calendário do celular abaixo.</li>
            </ol>
            {onExportIcs && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onExportIcs}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Exportar Lembretes para Agenda (.ics)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Permissão ainda pendente (padrão)
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 via-amber-500/5 to-transparent dark:from-teal-950/40 dark:via-amber-950/20 dark:to-slate-900/40 border border-teal-500/30 dark:border-teal-800/60 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white shadow-md shadow-teal-500/20 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
              Receber Lembretes Mesmo Fora do App
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                Recomendado
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              Autorize as notificações Push para receber os alertas dos seus exercícios vocais diretamente no sistema, <strong>mesmo com o aplicativo ou navegador fechados</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onExportIcs && (
            <button
              type="button"
              onClick={onExportIcs}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <CalendarPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Agenda (.ics)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRequestPermission}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 hover:shadow-lg transition-all flex items-center gap-2"
          >
            <BellRing className="w-4 h-4" />
            <span>Permitir Notificações</span>
          </button>
        </div>
      </div>
    </div>
  );
};
