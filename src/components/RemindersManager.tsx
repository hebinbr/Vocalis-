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
  AlertCircle
} from 'lucide-react';
import { Reminder } from '../types';
import { useVocalAudio } from '../hooks/useVocalAudio';

interface RemindersManagerProps {
  reminders: Reminder[];
  onAddReminder: (data: Partial<Reminder>) => Promise<void>;
  onToggleReminder: (id: number, currentActive: boolean) => Promise<void>;
  onDeleteReminder: (id: number) => Promise<void>;
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
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'hidratacao':
        return <Droplets className="w-4 h-4 text-sky-500" />;
      case 'desaquecimento':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-display">
              Lembretes Diários & Higiene Vocal
            </h2>
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Criptografados</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Configure alarmes suaves para seus momentos de aquecimento matinal, hidratação laríngea e desaquecimento noturno.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestChime}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors ${
              testChimePlaying
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-inner'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Volume2 className="w-4 h-4 text-amber-600" />
            <span>{testChimePlaying ? 'Tocando Som...' : 'Testar Alarme Suave'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lembrete</span>
          </button>
        </div>
      </div>

      {/* Grid of Scheduled Reminders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reminders.map((rem) => {
          return (
            <div
              key={rem.id}
              className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                rem.is_active
                  ? 'border-slate-200/80 hover:border-teal-200'
                  : 'border-slate-200/50 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0">
                      {getCategoryIcon(rem.category)}
                    </div>
                    <span className="text-2xl font-black text-slate-900 tabular-nums font-display tracking-tight">
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
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2 font-display">
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
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {d.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-[11px]">
                  {rem.sound_alert ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alarme harmônico ativo</span>
                    </>
                  ) : (
                    <span>Apenas notificação visual</span>
                  )}
                </span>

                <button
                  onClick={() => onDeleteReminder(rem.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
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
      <div className="bg-teal-900 text-white p-6 md:p-8 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-3 flex justify-center">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-teal-400/40 shadow-md">
            <img
              src="/src/assets/images/avatar_therapist_1793024499041.jpg"
              alt="Dra. Beatriz Menezes - Fonoaudióloga"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="md:col-span-9 space-y-2">
          <div className="text-teal-300 text-xs font-semibold uppercase tracking-wider">
            Orientação da sua Fonoaudióloga
          </div>
          <h3 className="text-lg font-bold font-display text-white">
            "A hidratação sistêmica é o primeiro exercício vocal do dia."
          </h3>
          <p className="text-xs text-teal-100/90 leading-relaxed">
            As pregas vocais vibram centenas de vezes por segundo. Beber pequenas porções de água em temperatura ambiente ao longo de todo o dia mantém a onda mucosa flexível, reduzindo atrito e prevenindo o aparecimento de lesões e cansaço ao falar.
          </p>
          <div className="text-[11px] text-teal-300 pt-1">
            Dra. Beatriz Menezes · Especialista em Voz Clínica · CRFa 2-19842/SP
          </div>
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Criar Novo Lembrete Vocal
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Título do Lembrete:
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Aquecimento com Trilos / Copo de Água"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Horário:
                  </label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Categoria:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="aquecimento">Aquecimento</option>
                    <option value="hidratacao">Hidratação</option>
                    <option value="exercicio">Exercício Vocal</option>
                    <option value="desaquecimento">Desaquecimento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
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
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={soundAlert}
                    onChange={(e) => setSoundAlert(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>Emitir alarme sonoro suave</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
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
