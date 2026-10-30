import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Check,
  Clock,
  Volume2,
  Sparkles,
  Droplets,
  Sun,
  Sunset,
  Moon,
  ShieldCheck,
  AlertCircle,
  BellRing,
  Radio
} from 'lucide-react';
import { Reminder } from '../types';
import { useVocalAudio } from '../hooks/useVocalAudio';
import { UseNotificationSchedulerReturn } from '../hooks/useNotificationScheduler';
import { NotificationSettingsBanner } from './NotificationSettingsBanner';
import therapistAvatarImg from '../assets/images/avatar_therapist_1793024499041.jpg';

interface RemindersManagerProps {
  reminders: Reminder[];
  onAddReminder: (data: Partial<Reminder>) => Promise<void>;
  onToggleReminder: (id: number, currentActive: boolean) => Promise<void>;
  onDeleteReminder: (id: number) => Promise<void>;
  notificationScheduler?: UseNotificationSchedulerReturn;
}

const DAYS_OF_WEEK = [
  { id: 'seg', label: 'S' },
  { id: 'ter', label: 'T' },
  { id: 'qua', label: 'Q' },
  { id: 'qui', label: 'Q' },
  { id: 'sex', label: 'S' },
  { id: 'sab', label: 'S' },
  { id: 'dom', label: 'D' },
];

export const RemindersManager: React.FC<RemindersManagerProps> = ({
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  notificationScheduler,
}) => {
  const { playChime } = useVocalAudio();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('Treino de Aquecimento Vocal');
  const [newTime, setNewTime] = useState<string>('09:00');
  const [newCategory, setNewCategory] = useState<Reminder['category']>('aquecimento');
  const [selectedDays, setSelectedDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [soundAlert, setSoundAlert] = useState<boolean>(true);
  const [testChimePlaying, setTestChimePlaying] = useState<boolean>(false);

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleTestChime = () => {
    setTestChimePlaying(true);
    playChime('alert');
    setTimeout(() => setTestChimePlaying(false), 1200);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTime) return;

    await onAddReminder({
      title: newTitle.trim(),
      time_str: newTime,
      category: newCategory,
      days_mask: selectedDays,
      sound_alert: soundAlert,
      is_active: true,
    });

    setShowAddModal(false);
    setNewTitle('Treino de Aquecimento Vocal');
    setNewTime('09:00');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'aquecimento':
        return <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'hidratacao':
        return <Droplets className="w-4 h-4 text-sky-500 dark:text-sky-400" />;
      case 'desaquecimento':
        return <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
              Lembretes Diários & Higiene Vocal
            </h2>
            <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Criptografados</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Configure alarmes suaves para seus momentos de aquecimento matinal, hidratação laríngea e desaquecimento noturno com notificações push no navegador.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestChime}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors ${
              testChimePlaying
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-inner'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{testChimePlaying ? 'Tocando Som...' : 'Testar Alarme Suave'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lembrete</span>
          </button>
        </div>
      </div>

      {/* Browser Push & Background Notifications Hub */}
      {notificationScheduler && (
        <NotificationSettingsBanner
          permission={notificationScheduler.permission}
          isSupported={notificationScheduler.isSupported}
          isSubscribed={notificationScheduler.isSubscribed}
          isWorkerActive={notificationScheduler.isWorkerActive}
          onRequestPermission={notificationScheduler.requestPermission}
          onSendTestNotification={notificationScheduler.sendTestNotification}
          onToggleNotifications={notificationScheduler.toggleNotifications}
        />
      )}

      {/* Grid of Scheduled Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reminders.map((rem) => {
          return (
            <div
              key={rem.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                rem.is_active
                  ? 'border-slate-200/80 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-700'
                  : 'border-slate-200/50 dark:border-slate-800/50 opacity-60 bg-slate-50/50 dark:bg-slate-900/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {getCategoryIcon(rem.category)}
                    </div>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums font-display tracking-tight">
                      {rem.time_str}
                    </span>
                  </div>

                  {/* Switch Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rem.is_active}
                      onChange={() => onToggleReminder(rem.id, rem.is_active)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600 dark:peer-checked:bg-teal-500"></div>
                  </label>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2 font-display">
                  {rem.title}
                </h3>

                {/* Days of week chips */}
                <div className="flex items-center gap-1.5 mt-3">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = rem.days_mask && rem.days_mask.includes(d.id);
                    return (
                      <span
                        key={d.id}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isSelected
                            ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {d.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {rem.is_active && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800">
                      <BellRing className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      Push Ativo
                    </span>
                  )}
                  {rem.sound_alert ? (
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>Alarme harmônico</span>
                    </span>
                  ) : (
                    <span>Apenas push</span>
                  )}
                </div>

                <button
                  onClick={() => onDeleteReminder(rem.id)}
                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Excluir Lembrete"
                  aria-label="Excluir Lembrete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clinician Advice & Vocal Hygiene Box */}
      <div className="bg-teal-900 dark:bg-teal-950 text-white p-6 md:p-8 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center border border-teal-800/80 dark:border-teal-900">
        <div className="md:col-span-3 flex justify-center">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-teal-400/40 shadow-md">
            <img
              src={therapistAvatarImg}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes('/images/')) {
                  target.src = '/images/avatar_therapist_1793024499041.jpg';
                }
              }}
              alt="Dra. Beatriz Menezes - Fonoaudióloga"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="md:col-span-9 space-y-2">
          <div className="text-teal-300 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider">
            Orientação da sua Fonoaudióloga
          </div>
          <h3 className="text-lg font-bold font-display text-white">
            "A hidratação sistêmica é o primeiro exercício vocal do dia."
          </h3>
          <p className="text-xs text-teal-100/90 leading-relaxed">
            As pregas vocais vibram centenas de vezes por segundo. Beber pequenas porções de água em temperatura ambiente ao longo de todo o dia mantém a onda mucosa flexível, reduzindo atrito e prevenindo o aparecimento de lesões e cansaço ao falar.
          </p>
          <div className="text-[11px] text-teal-300 dark:text-teal-400 pt-1">
            Dra. Beatriz Menezes · Especialista em Voz Clínica · CRFa 2-19842/SP
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Criar Novo Lembrete Vocal
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Lembrete:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Aquecimento com Trilos / Copo de Água"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário:
                  </label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="aquecimento">Aquecimento</option>
                    <option value="hidratacao">Hidratação</option>
                    <option value="exercicio">Exercício Vocal</option>
                    <option value="desaquecimento">Desaquecimento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Repetir nos dias da semana:
                </label>
                <div className="flex items-center gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = selectedDays.includes(d.id);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleDay(d.id)}
                        className={`w-9 h-9 rounded-xl font-bold transition-colors ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={soundAlert}
                    onChange={(e) => setSoundAlert(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>Emitir alarme sonoro suave</span>
                </label>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800 flex items-center gap-2">
                  <BellRing className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Notificação push garantida: alerta emitido no navegador mesmo com a aba em segundo plano.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl transition-colors"
                >
                  Salvar Lembrete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
