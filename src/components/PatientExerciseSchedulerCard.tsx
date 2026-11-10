import React, { useState } from 'react';
import {
  Clock,
  Bell,
  BellRing,
  Plus,
  CheckCircle2,
  Calendar,
  Sparkles,
  Volume2,
  Send,
  Loader2,
  Sun,
  Droplets,
  Moon,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Reminder, Exercise } from '../types';
import { UseNotificationSchedulerReturn } from '../hooks/useNotificationScheduler';

interface PatientExerciseSchedulerCardProps {
  reminders: Reminder[];
  onOpenScheduler: (exercise?: Exercise) => void;
  onToggleReminder: (id: number, currentActive: boolean) => Promise<void>;
  notificationScheduler?: UseNotificationSchedulerReturn;
  onGoToRemindersTab?: () => void;
}

const DAY_LABELS: Record<string, string> = {
  dom: 'Dom',
  seg: 'Seg',
  ter: 'Ter',
  qua: 'Qua',
  qui: 'Qui',
  sex: 'Sex',
  sab: 'Sáb',
};

export const PatientExerciseSchedulerCard: React.FC<PatientExerciseSchedulerCardProps> = ({
  reminders,
  onOpenScheduler,
  onToggleReminder,
  notificationScheduler,
  onGoToRemindersTab,
}) => {
  const [testing, setTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const activeReminders = reminders.filter((r) => r.is_active);

  // Compute next scheduled reminder for today or upcoming days
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeMinutes = currentHours * 60 + currentMinutes;
  const currentDayIndex = now.getDay();
  const dayKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const todayKey = dayKeys[currentDayIndex];

  // Find reminder scheduled for today that hasn't passed yet, or the earliest one
  let nextTodayReminder: Reminder | null = null;
  let minDiff = Infinity;

  for (const rem of activeReminders) {
    if (rem.days_mask && rem.days_mask.includes(todayKey)) {
      const [h, m] = rem.time_str.split(':').map(Number);
      const remMinutes = h * 60 + m;
      if (remMinutes >= currentTimeMinutes) {
        const diff = remMinutes - currentTimeMinutes;
        if (diff < minDiff) {
          minDiff = diff;
          nextTodayReminder = rem;
        }
      }
    }
  }

  // Quick test notification trigger
  const handleTestNotification = async () => {
    if (!notificationScheduler) return;
    setTesting(true);
    try {
      const ok = await notificationScheduler.sendTestNotification();
      if (ok) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 4000);
      }
    } finally {
      setTesting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'aquecimento':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'hidratacao':
        return <Droplets className="w-3.5 h-3.5 text-sky-500" />;
      case 'desaquecimento':
        return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-white via-teal-50/20 to-white dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left side: Heading, Next Practice Status & Info */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-8 h-8 rounded-xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
              Horário Programado de Exercícios
            </h3>

            {notificationScheduler && (
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                  notificationScheduler.permission === 'granted'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
              >
                <BellRing className="w-3 h-3" />
                <span>
                  {notificationScheduler.permission === 'granted'
                    ? 'Notificações Ativas'
                    : 'Notificações Pendentes'}
                </span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Configure seu horário diário de treino vocal. Você receberá uma notificação pontual no navegador ou celular com um toque relaxante para praticar com segurança.
          </p>

          {/* Next Scheduled Practice Alert Banner */}
          {nextTodayReminder ? (
            <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/80 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  {getCategoryIcon(nextTodayReminder.category)}
                </div>
                <div>
                  <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 block">
                    Próximo Treino de Hoje: {nextTodayReminder.title}
                  </span>
                  <span className="text-[10px] text-teal-800 dark:text-teal-300">
                    Agendado para às <strong>{nextTodayReminder.time_str}</strong> (em cerca de {Math.round(minDiff / 60)}h{minDiff % 60 ? ` ${minDiff % 60}m` : ''})
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-teal-200 dark:border-teal-700 shrink-0">
                Hoje às {nextTodayReminder.time_str}
              </span>
            </div>
          ) : activeReminders.length > 0 ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Você tem <strong>{activeReminders.length}</strong> horários de exercícios ativos programados.
              </span>
            </div>
          ) : null}

          {/* Active reminders list pills */}
          {activeReminders.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeReminders.slice(0, 4).map((rem) => (
                <div
                  key={rem.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                >
                  {getCategoryIcon(rem.category)}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{rem.time_str}</span>
                  <span className="text-slate-400 dark:text-slate-500">·</span>
                  <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                    {rem.title}
                  </span>
                </div>
              ))}
              {activeReminders.length > 4 && onGoToRemindersTab && (
                <button
                  type="button"
                  onClick={onGoToRemindersTab}
                  className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline self-center px-1 cursor-pointer"
                >
                  +{activeReminders.length - 4} mais...
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right side: Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenScheduler()}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-md shadow-teal-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Configurar Novo Horário</span>
          </button>

          {notificationScheduler && (
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testing}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                testSent
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title="Testar alarme sonoro e notificação push agora"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  <span>Enviando...</span>
                </>
              ) : testSent ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Alerta Disparado!</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <span>Testar Alarme Agora</span>
                </>
              )}
            </button>
          )}

          {onGoToRemindersTab && (
            <button
              type="button"
              onClick={onGoToRemindersTab}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium text-center py-1 flex items-center justify-center gap-1 transition-colors"
            >
              <span>Gerenciar todos os lembretes</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
