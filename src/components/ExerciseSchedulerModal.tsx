import React, { useState, useEffect } from 'react';
import {
  Clock,
  Bell,
  BellRing,
  Volume2,
  Check,
  X,
  Calendar,
  Sparkles,
  ShieldCheck,
  Sun,
  Droplets,
  Moon,
  Play,
  Send,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Exercise, Reminder } from '../types';
import { useVocalAudio } from '../hooks/useVocalAudio';
import { UseNotificationSchedulerReturn } from '../hooks/useNotificationScheduler';

interface ExerciseSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercises: Exercise[];
  preSelectedExercise?: Exercise | null;
  onSaveSchedule: (reminderData: Partial<Reminder>) => Promise<void>;
  notificationScheduler?: UseNotificationSchedulerReturn;
}

const DAYS_OF_WEEK = [
  { id: 'dom', label: 'D', full: 'Domingo' },
  { id: 'seg', label: 'S', full: 'Segunda-feira' },
  { id: 'ter', label: 'T', full: 'Terça-feira' },
  { id: 'qua', label: 'Q', full: 'Quarta-feira' },
  { id: 'qui', label: 'Q', full: 'Quinta-feira' },
  { id: 'sex', label: 'S', full: 'Sexta-feira' },
  { id: 'sab', label: 'S', full: 'Sábado' },
];

export const ExerciseSchedulerModal: React.FC<ExerciseSchedulerModalProps> = ({
  isOpen,
  onClose,
  exercises,
  preSelectedExercise,
  onSaveSchedule,
  notificationScheduler,
}) => {
  const { playChime } = useVocalAudio();

  // State
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('all');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [timeStr, setTimeStr] = useState<string>('09:00');
  const [category, setCategory] = useState<Reminder['category']>('exercicio');
  const [selectedDays, setSelectedDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [soundAlert, setSoundAlert] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [playingChime, setPlayingChime] = useState<boolean>(false);
  const [testingNotification, setTestingNotification] = useState<boolean>(false);
  const [testNotificationSent, setTestNotificationSent] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Initialize or update fields when preSelectedExercise changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (preSelectedExercise) {
        setSelectedExerciseId(preSelectedExercise.id);
        setCustomTitle(`Treino: ${preSelectedExercise.title}`);

        // Infer category
        if (preSelectedExercise.category.toLowerCase().includes('aquecimento')) {
          setCategory('aquecimento');
          setTimeStr('08:15');
        } else if (preSelectedExercise.category.toLowerCase().includes('desaquecimento')) {
          setCategory('desaquecimento');
          setTimeStr('20:30');
        } else if (preSelectedExercise.category.toLowerCase().includes('semiocluído') || preSelectedExercise.title.toLowerCase().includes('sovte')) {
          setCategory('hidratacao');
          setTimeStr('14:00');
        } else {
          setCategory('exercicio');
          setTimeStr('10:00');
        }
      } else {
        setSelectedExerciseId('all');
        setCustomTitle('Treino Vocal Diário');
        setCategory('exercicio');
        setTimeStr('09:00');
      }
      setSavedSuccess(false);
      setTestNotificationSent(false);
    }
  }, [isOpen, preSelectedExercise]);

  if (!isOpen) return null;

  // Toggle single day
  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Set quick day presets
  const setDaysPreset = (preset: 'weekdays' | 'all' | 'weekend') => {
    if (preset === 'weekdays') {
      setSelectedDays(['seg', 'ter', 'qua', 'qui', 'sex']);
    } else if (preset === 'all') {
      setSelectedDays(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']);
    } else if (preset === 'weekend') {
      setSelectedDays(['dom', 'sab']);
    }
  };

  // Quick Time Presets
  const setQuickTime = (time: string, suggestedCategory?: Reminder['category']) => {
    setTimeStr(time);
    if (suggestedCategory) setCategory(suggestedCategory);
  };

  // Quick preset: In 1 minute (for testing real background notification!)
  const setQuickOneMinute = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setTimeStr(`${hh}:${mm}`);
    // Ensure today is included
    const todayId = DAYS_OF_WEEK[new Date().getDay()].id;
    if (!selectedDays.includes(todayId)) {
      setSelectedDays((prev) => [...prev, todayId]);
    }
  };

  // Test sound
  const handleTestSound = () => {
    setPlayingChime(true);
    playChime('alert');
    setTimeout(() => setPlayingChime(false), 1200);
  };

  // Test notification button
  const handleTestNotification = async () => {
    if (!notificationScheduler) return;
    setTestingNotification(true);
    try {
      const ok = await notificationScheduler.sendTestNotification();
      if (ok) {
        setTestNotificationSent(true);
        setTimeout(() => setTestNotificationSent(false), 4000);
      }
    } finally {
      setTestingNotification(false);
    }
  };

  // Handle exercise selection change
  const handleExerciseChange = (eId: string) => {
    setSelectedExerciseId(eId);
    if (eId === 'all') {
      setCustomTitle('Treino Vocal Diário Completo');
      setCategory('exercicio');
    } else {
      const found = exercises.find((e) => e.id === eId);
      if (found) {
        setCustomTitle(`Treino: ${found.title}`);
        if (found.category.toLowerCase().includes('aquecimento')) setCategory('aquecimento');
        else if (found.category.toLowerCase().includes('desaquecimento')) setCategory('desaquecimento');
        else setCategory('exercicio');
      }
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeStr || selectedDays.length === 0) return;

    setSaving(true);
    try {
      const exercise = selectedExerciseId !== 'all' ? exercises.find((ex) => ex.id === selectedExerciseId) : undefined;
      const finalTitle = customTitle.trim() || (exercise ? `Treino: ${exercise.title}` : 'Treino Vocal Diário');

      await onSaveSchedule({
        title: finalTitle,
        time_str: timeStr,
        category,
        days_mask: selectedDays,
        sound_alert: soundAlert,
        is_active: true,
        exercise_id: exercise ? exercise.id : undefined,
      });

      // If notification permission not requested yet, prompt
      if (notificationScheduler && notificationScheduler.permission === 'default') {
        notificationScheduler.requestPermission();
      }

      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Falha ao salvar horário de exercício:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 relative my-8 transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 font-display">
                Configurar Horário de Exercício
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Notificação Ativa
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha o horário diário e você será lembrado por notificação e alarme suave no seu dispositivo
            </p>
          </div>
        </div>

        {savedSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-500/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Horário Configurado com Sucesso!
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Seu lembrete vocal para às <strong>{timeStr}</strong> foi programado e você receberá uma notificação pontualmente nos dias selecionados.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Escolha do Exercício */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Exercício ou Rotina Vocal
              </label>
              <select
                value={selectedExerciseId}
                onChange={(e) => handleExerciseChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">🌟 Rotina Completa de Exercícios Prescritos</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.category})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Horário do Lembrete com Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Horário do Treino
                </label>
                <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeStr}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="time"
                    required
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm sm:text-base font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-wider"
                  />
                </div>

                <button
                  type="button"
                  onClick={setQuickOneMinute}
                  className="px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shrink-0"
                  title="Configurar alarme para daqui a 1 minuto para testar a notificação imediatamente"
                >
                  ⚡ Daqui a 1 min
                </button>
              </div>

              {/* Quick Time Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickTime('07:30', 'aquecimento')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                    timeStr === '07:30'
                      ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-400 text-amber-900 dark:text-amber-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  <span>07:30 Manhã</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('10:00', 'exercicio')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                    timeStr === '10:00'
                      ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-400 text-teal-900 dark:text-teal-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>10:00 Pausa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('14:00', 'hidratacao')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                    timeStr === '14:00'
                      ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-400 text-sky-900 dark:text-sky-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Droplets className="w-3 h-3 text-sky-500" />
                  <span>14:00 Tarde</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('18:30', 'exercicio')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                    timeStr === '18:30'
                      ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-400 text-purple-900 dark:text-purple-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span>18:30 Fim da Tarde</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('21:00', 'desaquecimento')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                    timeStr === '21:00'
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 text-indigo-900 dark:text-indigo-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Moon className="w-3 h-3 text-indigo-500" />
                  <span>21:00 Noite</span>
                </button>
              </div>
            </div>

            {/* 3. Dias da Semana */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Dias de Repetição
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDaysPreset('weekdays')}
                    className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                  >
                    Seg a Sex
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setDaysPreset('all')}
                    className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                  >
                    Todos
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <button
                    type="button"
                    onClick={() => setDaysPreset('weekend')}
                    className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                  >
                    Fim de Semana
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`h-11 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-xs scale-102 ring-2 ring-teal-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={day.full}
                    >
                      <span>{day.label}</span>
                      <span className="text-[9px] font-normal uppercase opacity-75">{day.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Notificação & Alerta Sonoro */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Notificação no Dispositivo
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dispara alerta mesmo com o navegador em segundo plano
                    </span>
                  </div>
                </div>

                {notificationScheduler?.permission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={() => notificationScheduler?.requestPermission()}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shrink-0"
                  >
                    Permitir
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    Ativo ✓
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Alarme Sonoro Suave (Diapasão Fono)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tom harmônico relaxante que convida ao treino vocal
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>{playingChime ? 'Tocando...' : 'Ouvir Tom'}</span>
                  </button>

                  <input
                    type="checkbox"
                    checked={soundAlert}
                    onChange={(e) => setSoundAlert(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Test Notification Banner Button */}
            {notificationScheduler && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 text-xs text-teal-900 dark:text-teal-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="text-[11px]">Deseja testar se as notificações funcionam no seu aparelho agora?</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testingNotification}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shrink-0 flex items-center gap-1"
                >
                  {testingNotification ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : testNotificationSent ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>{testNotificationSent ? 'Enviado!' : 'Testar Agora'}</span>
                </button>
              </div>
            )}

            {/* Submit & Cancel Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving || selectedDays.length === 0}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-md shadow-teal-600/20 hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Horário...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Salvar Horário de Exercício</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
