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
  Moon,
  ShieldCheck,
  AlertCircle,
  BellRing,
  Radio,
  Edit3,
  Play,
  Send,
  Loader2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Reminder, Exercise } from '../types';
import { useVocalAudio } from '../hooks/useVocalAudio';
import { UseNotificationSchedulerReturn } from '../hooks/useNotificationScheduler';
import { NotificationSettingsBanner } from './NotificationSettingsBanner';
import { downloadRemindersIcs } from '../utils/icsExport';
import therapistAvatarImg from '../assets/images/avatar_therapist_1793024499041.jpg';

interface RemindersManagerProps {
  reminders: Reminder[];
  exercises?: Exercise[];
  onAddReminder: (data: Partial<Reminder>) => Promise<void>;
  onToggleReminder: (id: number, currentActive: boolean) => Promise<void>;
  onDeleteReminder: (id: number) => Promise<void>;
  onUpdateReminder?: (id: number, data: Partial<Reminder>) => Promise<void>;
  notificationScheduler?: UseNotificationSchedulerReturn;
  onStartExercise?: (reminder: Reminder) => void;
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

function formatDaysSummary(days: string[]): string {
  if (!days || days.length === 0) return 'Nenhum dia selecionado';
  if (days.length === 7) return 'Todos os dias da semana (Diário)';
  const weekdays = ['seg', 'ter', 'qua', 'qui', 'sex'];
  const isWeekdays = weekdays.length === days.length && weekdays.every((d) => days.includes(d));
  if (isWeekdays) return 'Segunda a Sexta-feira (Dias úteis)';
  const weekend = ['dom', 'sab'];
  const isWeekend = weekend.length === days.length && weekend.every((d) => days.includes(d));
  if (isWeekend) return 'Finais de Semana (Sáb e Dom)';
  const alternate = ['seg', 'qua', 'sex'];
  const isAlternate = alternate.length === days.length && alternate.every((d) => days.includes(d));
  if (isAlternate) return 'Dias Alternados (Seg, Qua, Sex)';

  const dayMap: Record<string, string> = {
    dom: 'Dom',
    seg: 'Seg',
    ter: 'Ter',
    qua: 'Qua',
    qui: 'Qui',
    sex: 'Sex',
    sab: 'Sáb',
  };
  return days.map((d) => dayMap[d] || d).join(', ');
}

export const RemindersManager: React.FC<RemindersManagerProps> = ({
  reminders,
  exercises = [],
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onUpdateReminder,
  notificationScheduler,
  onStartExercise,
}) => {
  const { playChime } = useVocalAudio();

  // State for Add / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('Treino de Aquecimento Vocal');
  const [formTime, setFormTime] = useState<string>('09:00');
  const [formCategory, setFormCategory] = useState<Reminder['category']>('aquecimento');
  const [formExerciseId, setFormExerciseId] = useState<string>('');
  const [formDays, setFormDays] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex']);
  const [formSoundAlert, setFormSoundAlert] = useState<boolean>(true);

  // UI state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [testChimePlaying, setTestChimePlaying] = useState<boolean>(false);
  const [testingVisualId, setTestingVisualId] = useState<number | null>(null);
  const [testVisualSentId, setTestVisualSentId] = useState<number | null>(null);
  const [quickSaveSuccess, setQuickSaveSuccess] = useState<boolean>(false);
  const [icsExportCount, setIcsExportCount] = useState<number | null>(null);

  const handleExportIcs = () => {
    const count = downloadRemindersIcs(reminders);
    if (count > 0) {
      setIcsExportCount(count);
      setTimeout(() => setIcsExportCount(null), 4000);
    }
  };

  // Open modal in create mode
  const handleOpenCreateModal = () => {
    setEditingReminder(null);
    setFormTitle('Treino de Aquecimento Vocal');
    setFormTime('09:00');
    setFormCategory('aquecimento');
    setFormExerciseId('');
    setFormDays(['seg', 'ter', 'qua', 'qui', 'sex']);
    setFormSoundAlert(true);
    setShowModal(true);
  };

  // Open modal in edit mode
  const handleOpenEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormTitle(reminder.title);
    setFormTime(reminder.time_str);
    setFormCategory(reminder.category);
    setFormExerciseId(reminder.exercise_id || '');
    setFormDays(Array.isArray(reminder.days_mask) ? reminder.days_mask : ['seg', 'ter', 'qua', 'qui', 'sex']);
    setFormSoundAlert(reminder.sound_alert ?? true);
    setShowModal(true);
  };

  // Toggle day in form
  const toggleDayInForm = (dayId: string) => {
    setFormDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Preset frequency handlers
  const setDaysPreset = (preset: 'weekdays' | 'all' | 'weekend' | 'alternate') => {
    if (preset === 'weekdays') {
      setFormDays(['seg', 'ter', 'qua', 'qui', 'sex']);
    } else if (preset === 'all') {
      setFormDays(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']);
    } else if (preset === 'weekend') {
      setFormDays(['dom', 'sab']);
    } else if (preset === 'alternate') {
      setFormDays(['seg', 'qua', 'sex']);
    }
  };

  // Quick Time preset
  const setQuickTime = (time: string, suggestedCat?: Reminder['category']) => {
    setFormTime(time);
    if (suggestedCat) setFormCategory(suggestedCat);
  };

  // Preset 1 minute ahead for instant live testing
  const setQuickOneMinute = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 1);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setFormTime(`${hh}:${mm}`);
    const todayId = DAYS_OF_WEEK[new Date().getDay()].id;
    if (!formDays.includes(todayId)) {
      setFormDays((prev) => [...prev, todayId]);
    }
  };

  // Exercise selection changed
  const handleExerciseSelection = (eId: string) => {
    setFormExerciseId(eId);
    if (eId) {
      const found = exercises.find((ex) => ex.id === eId);
      if (found) {
        setFormTitle(`Treino: ${found.title}`);
        if (found.category.toLowerCase().includes('aquecimento')) setFormCategory('aquecimento');
        else if (found.category.toLowerCase().includes('desaquecimento')) setFormCategory('desaquecimento');
        else if (found.category.toLowerCase().includes('semiocluído') || found.title.toLowerCase().includes('sovte')) setFormCategory('hidratacao');
        else setFormCategory('exercicio');
      }
    }
  };

  // Test chime sound
  const handleTestChime = () => {
    setTestChimePlaying(true);
    playChime('alert');
    setTimeout(() => setTestChimePlaying(false), 1200);
  };

  // Test visual alert for a specific reminder
  const handleTestSpecificReminderVisual = async (rem: Reminder) => {
    setTestingVisualId(rem.id);
    try {
      playChime('alert');
      if (notificationScheduler) {
        if (notificationScheduler.permission !== 'granted') {
          await notificationScheduler.requestPermission();
        }
        await notificationScheduler.sendTestNotification();
      }
      setTestVisualSentId(rem.id);
      setTimeout(() => setTestVisualSentId(null), 4000);
    } finally {
      setTestingVisualId(null);
    }
  };

  // Save / Update Form Submit
  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formTime || formDays.length === 0) return;

    setSubmitting(true);
    try {
      const payload: Partial<Reminder> = {
        title: formTitle.trim(),
        time_str: formTime,
        category: formCategory,
        days_mask: formDays,
        sound_alert: formSoundAlert,
        is_active: true,
        exercise_id: formExerciseId || undefined,
      };

      if (editingReminder && onUpdateReminder) {
        await onUpdateReminder(editingReminder.id, payload);
      } else {
        await onAddReminder(payload);
      }

      // If notification permission is default, request it
      if (notificationScheduler && notificationScheduler.permission === 'default') {
        notificationScheduler.requestPermission();
      }

      setQuickSaveSuccess(true);
      setTimeout(() => setQuickSaveSuccess(false), 3000);
      setShowModal(false);
    } catch (err) {
      console.error('Falha ao salvar horário recorrente:', err);
    } finally {
      setSubmitting(false);
    }
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

  const activeRemindersCount = reminders.filter((r) => r.is_active).length;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header do Painel de Lembretes Recorrentes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
              Lembretes Diários & Horários Recorrentes
            </h2>
            <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Criptografados no SQLite</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Configure sua rotina com horários recorrentes para exercícios específicos em dias personalizados da semana. O sistema utiliza notificações visuais do navegador e alarmes harmônicos para lembrar você pontualmente.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleTestChime}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
              testChimePlaying
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-inner'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Ouvir o toque fonoaudiológico suave do diapasão"
          >
            <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{testChimePlaying ? 'Tocando Som...' : 'Ouvir Som'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportIcs}
            disabled={activeRemindersCount === 0}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
              icsExportCount !== null
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="Exportar lembretes recorrentes para Google Agenda ou Calendário do dispositivo"
          >
            <CalendarPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>
              {icsExportCount !== null
                ? `${icsExportCount} exportado(s)!`
                : 'Exportar Agenda (.ics)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Horário Recorrente</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Notificações Fora do App & Configuração do Dispositivo */}
      {notificationScheduler && (
        <NotificationSettingsBanner
          permission={notificationScheduler.permission}
          isSupported={notificationScheduler.isSupported}
          isSubscribed={notificationScheduler.isSubscribed}
          isWorkerActive={notificationScheduler.isWorkerActive}
          isPushSubscribed={notificationScheduler.isPushSubscribed}
          isAndroidAlarmSynced={notificationScheduler.isAndroidAlarmSynced}
          onRequestPermission={notificationScheduler.requestPermission}
          onEnableBackgroundPush={notificationScheduler.enableBackgroundPush}
          onSendTestNotification={notificationScheduler.sendTestNotification}
          onToggleNotifications={notificationScheduler.toggleNotifications}
          onExportIcs={handleExportIcs}
        />
      )}

      {/* 3. Seção do Programador Rápido de Treino Recorrente (Inline Quick Scheduler) */}
      <div className="bg-gradient-to-br from-white via-teal-50/15 to-white dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Programação Semanal Recorrente de Exercícios
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalize os dias específicos da semana para cada momento da sua terapia vocal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 border border-teal-200/60 dark:border-teal-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{activeRemindersCount} horários ativos</span>
            </span>
          </div>
        </div>

        {/* Grade de Lembretes Recorrentes Cadastrados */}
        {reminders.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum horário recorrente programado
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Adicione horários para lembrar seus exercícios de aquecimento matinal, hidratação laríngea ou desaquecimento noturno.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Primeiro Lembrete</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reminders.map((rem) => {
              const days = Array.isArray(rem.days_mask) ? rem.days_mask : [];
              const isTestingThis = testingVisualId === rem.id;
              const sentThis = testVisualSentId === rem.id;

              return (
                <div
                  key={rem.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between group hover:shadow-md ${
                    rem.is_active
                      ? 'border-slate-200/90 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700'
                      : 'border-slate-200/50 dark:border-slate-800/50 opacity-60 bg-slate-50/50 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header do Card: Horário, Ícone e Toggle de Ativação */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                          {getCategoryIcon(rem.category)}
                        </div>
                        <div>
                          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums font-display tracking-tight block">
                            {rem.time_str}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                            {rem.category === 'aquecimento'
                              ? 'Aquecimento Vocal'
                              : rem.category === 'hidratacao'
                              ? 'Hidratação Laríngea'
                              : rem.category === 'desaquecimento'
                              ? 'Desaquecimento'
                              : 'Exercício Terapêutico'}
                          </span>
                        </div>
                      </div>

                      {/* Switch de Ativação Rápida */}
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

                    {/* Título do Treino */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display line-clamp-1">
                        {rem.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatDaysSummary(days)}
                      </p>
                    </div>

                    {/* Visualização Destacada dos Dias da Semana Específicos */}
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 block mb-1">
                        Dias Recorrentes Programados:
                      </span>
                      <div className="grid grid-cols-7 gap-1">
                        {DAYS_OF_WEEK.map((d) => {
                          const isSelected = days.includes(d.id);
                          return (
                            <div
                              key={d.id}
                              className={`h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                                isSelected
                                  ? 'bg-teal-600 text-white shadow-2xs scale-102 ring-1 ring-teal-500/30'
                                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                              }`}
                              title={`${d.full}: ${isSelected ? 'Ativo' : 'Inativo'}`}
                            >
                              <span>{d.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Badges de Alerta Visual e Sonoro */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {rem.is_active && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800">
                          <BellRing className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                          <span>Alerta Visual Ativo</span>
                        </span>
                      )}

                      {rem.sound_alert && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                          <Volume2 className="w-3 h-3 text-slate-500" />
                          <span>Som Harmônico</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card com Ações */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {/* Botão para Testar Alerta Visual Imediatamente */}
                    <button
                      type="button"
                      onClick={() => handleTestSpecificReminderVisual(rem)}
                      disabled={isTestingThis}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        sentThis
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Disparar teste do alerta visual no navegador para este lembrete agora"
                    >
                      {isTestingThis ? (
                        <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                      ) : sentThis ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <Send className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      )}
                      <span>{sentThis ? 'Disparado!' : 'Testar Alerta'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Botão Praticar Exercício se houver callback */}
                      {onStartExercise && (
                        <button
                          type="button"
                          onClick={() => onStartExercise(rem)}
                          className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-lg transition-colors"
                          title="Iniciar treino agora"
                          aria-label="Iniciar treino"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}

                      {/* Botão Editar Horário */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(rem)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar horário e dias da semana"
                        aria-label="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão Excluir */}
                      <button
                        type="button"
                        onClick={() => onDeleteReminder(rem.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Excluir Horário"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Orientação da Fonoaudióloga (Caixa de Higiene Vocal) */}
      <div className="bg-teal-900 dark:bg-teal-950 text-white p-6 md:p-8 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center border border-teal-800/80 dark:border-teal-900">
        <div className="md:col-span-3 flex justify-center">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-teal-400/40 shadow-md bg-teal-950 flex items-center justify-center">
            <img
              src={therapistAvatarImg}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.includes('/images/')) {
                  target.src = '/images/avatar_therapist_1793024499041.jpg';
                } else if (!target.src.includes('/assets/images/')) {
                  target.src = '/assets/images/avatar_therapist_1793024499041.jpg';
                } else {
                  target.style.display = 'none';
                  const fallback = target.parentElement?.querySelector('.therapist-svg-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }
              }}
              alt="Dra. Beatriz Menezes - Fonoaudióloga"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="therapist-svg-fallback hidden w-full h-full bg-gradient-to-br from-teal-800 to-teal-950 flex-col items-center justify-center text-teal-200">
              <svg className="w-14 h-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-300">CRFa 2-19842</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-9 space-y-2">
          <div className="text-teal-300 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider">
            Orientação da sua Fonoaudióloga
          </div>
          <h3 className="text-lg font-bold font-display text-white">
            "A constância em horários previsíveis acelera a consolidação neuromuscular das pregas vocais."
          </h3>
          <p className="text-xs text-teal-100/90 leading-relaxed">
            Realizar os exercícios sempre no mesmo horário programa o reflexo condicionado laríngeo. O aquecimento matinal prepara o trato vocal para a demanda diária, e o desaquecimento noturno desfaz as tensões musculares acumuladas.
          </p>
          <div className="text-[11px] text-teal-300 dark:text-teal-400 pt-1">
            Dra. Beatriz Menezes · Especialista em Voz Clínica · CRFa 2-19842/SP
          </div>
        </div>
      </div>

      {/* 5. Modal de Criação / Edição de Horário Recorrente */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 relative my-8 transition-colors">
            {/* Botão Fechar */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                  {editingReminder ? 'Editar Horário Recorrente' : 'Novo Horário Recorrente'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure o horário e os dias da semana para receber alertas visuais
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-4 text-xs">
              {/* Exercício Vinculado */}
              {exercises.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Vincular a Exercício (Opcional):
                  </label>
                  <select
                    value={formExerciseId}
                    onChange={(e) => handleExerciseSelection(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Nenhum (Lembrete Geral de Rotina)</option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Título do Lembrete */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Título do Horário:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Aquecimento com Trilos / Copo de Água"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              {/* Horário & Categoria com Quick Presets */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Horário Programado:
                    </label>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Categoria Terapêutica:
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="aquecimento">Aquecimento Vocal</option>
                      <option value="hidratacao">Hidratação Laríngea</option>
                      <option value="exercicio">Exercício Específico</option>
                      <option value="desaquecimento">Desaquecimento Noturno</option>
                    </select>
                  </div>
                </div>

                {/* Quick Time Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickTime('07:30', 'aquecimento')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    07:30 Manhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('10:00', 'exercicio')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    10:00 Pausa
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('14:00', 'hidratacao')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    14:00 Tarde
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('18:30', 'exercicio')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    18:30 Fim de Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTime('21:00', 'desaquecimento')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    21:00 Noite
                  </button>
                  <button
                    type="button"
                    onClick={setQuickOneMinute}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                    title="Configura para daqui a 1 minuto para testar"
                  >
                    ⚡ Em 1 min
                  </button>
                </div>
              </div>

              {/* Personalização dos Dias da Semana */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Dias da Semana Recorrentes:
                  </label>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDaysPreset('weekdays')}
                      className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                    >
                      Seg-Sex
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('all')}
                      className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={() => setDaysPreset('alternate')}
                      className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                    >
                      Alternados
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = formDays.includes(d.id);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleDayInForm(d.id)}
                        className={`h-10 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-xs scale-102 ring-2 ring-teal-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={d.full}
                      >
                        <span className="text-xs">{d.label}</span>
                        <span className="text-[8px] opacity-75 uppercase">{d.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notificação Visual e Alarme Sonoro */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BellRing className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                        Alerta Visual no Navegador (useNotificationScheduler)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Exibe banner no sistema e pop-up na tela com botão "Abrir Exercício"
                      </span>
                    </div>
                  </div>

                  {notificationScheduler && notificationScheduler.permission !== 'granted' ? (
                    <button
                      type="button"
                      onClick={() => notificationScheduler.requestPermission()}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors"
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
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                      Alarme sonoro harmônico suave
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSoundAlert}
                    onChange={(e) => setFormSoundAlert(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || formDays.length === 0}
                  className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{editingReminder ? 'Atualizar Horário' : 'Salvar Horário Recorrente'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
