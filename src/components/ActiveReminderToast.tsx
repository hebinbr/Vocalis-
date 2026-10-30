import React from 'react';
import { BellRing, Play, X, Clock, Droplets, Sun, Moon, Sparkles } from 'lucide-react';
import { Reminder } from '../types';

interface ActiveReminderToastProps {
  alert: { reminder: Reminder; time: string } | null;
  onClose: () => void;
  onStartExercise: (reminder: Reminder) => void;
}

export const ActiveReminderToast: React.FC<ActiveReminderToastProps> = ({
  alert,
  onClose,
  onStartExercise
}) => {
  if (!alert) return null;
  const { reminder, time } = alert;

  const getIcon = () => {
    switch (reminder.category) {
      case 'aquecimento':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'hidratacao':
        return <Droplets className="w-5 h-5 text-sky-500" />;
      case 'desaquecimento':
        return <Moon className="w-5 h-5 text-indigo-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-teal-500" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-500/50 dark:border-teal-400/40 shadow-2xl text-slate-900 dark:text-slate-100 flex items-start gap-4 backdrop-blur-md">
        <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 shrink-0 border border-teal-200 dark:border-teal-800">
          {getIcon()}
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              Lembrete Programado ({time})
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100">
            {reminder.title}
          </h4>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Horário terapêutico atingido. Reserve alguns minutos para cuidar do equilíbrio e saúde da sua voz.
          </p>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onStartExercise(reminder);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Abrir Exercício</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
            >
              Lembrar depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
