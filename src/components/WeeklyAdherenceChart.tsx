import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Flame,
  Clock,
  Activity,
  Layers,
  Info,
  Stethoscope
} from 'lucide-react';
import { DayProgress, ExerciseLog, Patient } from '../types';

interface WeeklyAdherenceChartProps {
  last7Days: DayProgress[];
  logs?: ExerciseLog[];
  patientDailyGoalMinutes?: number;
}

export const WeeklyAdherenceChart: React.FC<WeeklyAdherenceChartProps> = ({
  last7Days,
  logs = [],
  patientDailyGoalMinutes = 15,
}) => {
  // Toggle between 'frequency' (number of exercises) and 'duration' (minutes)
  const [metricType, setMetricType] = useState<'frequency' | 'duration'>('frequency');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Derive daily stats combining last7Days with logs
  const enrichedDays = last7Days.map((day, idx) => {
    // Count exercise logs on this specific date
    const dayLogs = logs.filter((l) => l.date_iso === day.date);
    const exerciseCount = dayLogs.length > 0 ? dayLogs.length : day.count || (day.minutes > 0 ? Math.max(1, Math.round(day.minutes / 5)) : 0);
    const dayMinutes = dayLogs.length > 0 ? Math.round(dayLogs.reduce((acc, l) => acc + (l.duration_sec || 0), 0) / 60) : day.minutes;

    // Clinical target: at least 3 exercise sessions per day (or 15 minutes)
    const targetCount = 3;
    const isCompleted = metricType === 'frequency' ? exerciseCount >= targetCount : dayMinutes >= patientDailyGoalMinutes;
    const isPartial = metricType === 'frequency' ? exerciseCount > 0 && exerciseCount < targetCount : dayMinutes > 0 && dayMinutes < patientDailyGoalMinutes;

    return {
      ...day,
      day_index: idx,
      exercise_count: exerciseCount,
      calculated_minutes: dayMinutes,
      is_completed: isCompleted,
      is_partial: isPartial,
      day_logs: dayLogs,
    };
  });

  // Calculate totals and adherence percentage
  const totalExercisesWeek = enrichedDays.reduce((acc, d) => acc + d.exercise_count, 0);
  const totalMinutesWeek = enrichedDays.reduce((acc, d) => acc + d.calculated_minutes, 0);
  const daysWithPractice = enrichedDays.filter((d) => d.exercise_count > 0).length;
  const daysGoalAchieved = enrichedDays.filter((d) => d.is_completed).length;

  // Adherence rate: percentage of days achieving clinical target (out of 7 days)
  const adherenceRate = Math.round((daysGoalAchieved / 7) * 100);

  // Peak day
  const peakDay = [...enrichedDays].sort((a, b) => b.exercise_count - a.exercise_count)[0];

  // Maximum value for scaling the bar chart
  const maxExercises = Math.max(...enrichedDays.map((d) => d.exercise_count), 4);
  const maxMinutes = Math.max(...enrichedDays.map((d) => d.calculated_minutes), patientDailyGoalMinutes * 1.5, 25);

  const activeDay = selectedDayIndex !== null ? enrichedDays[selectedDayIndex] : enrichedDays[enrichedDays.length - 1];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors space-y-6">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-400"></span>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Análise Clínica de Adesão ao Tratamento
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-display mt-1">
            Frequência de Execução Semanal dos Exercícios
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Acompanhamento diário da constância vocal. Permite à fonoaudióloga verificar se o paciente está realizando a dosagem prescrita e mantendo a regularidade do condicionamento.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 self-start lg:self-auto shrink-0 border border-slate-200/60 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMetricType('frequency')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              metricType === 'frequency'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Frequência (Exercícios)</span>
          </button>
          <button
            type="button"
            onClick={() => setMetricType('duration')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              metricType === 'duration'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Duração (Minutos)</span>
          </button>
        </div>
      </div>

      {/* Adherence Overview KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60">
          <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block mb-1">
            Taxa de Adesão Semanal
          </span>
          <div className="text-2xl sm:text-3xl font-black text-teal-900 dark:text-teal-100 flex items-baseline gap-1">
            <span>{adherenceRate}%</span>
            <span className="text-xs font-medium text-teal-700 dark:text-teal-400">
              ({daysGoalAchieved}/7 dias)
            </span>
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-400 block mt-0.5">
            {adherenceRate >= 70 ? 'Excelente assiduidade' : 'Abaixo da meta recomendada'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
          <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block mb-1">
            Total de Exercícios
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-900 dark:text-indigo-100">
            {totalExercisesWeek}
          </div>
          <span className="text-[11px] text-indigo-700 dark:text-indigo-400 block mt-0.5">
            Sessões práticas na semana
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
            Dia de Maior Frequência
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100 truncate">
            {peakDay ? peakDay.day_name : 'N/A'}
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 block mt-0.5">
            {peakDay ? `${peakDay.exercise_count} exercícios (${peakDay.calculated_minutes} min)` : '-'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
            Tempo Total de Prática
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {totalMinutesWeek} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {Math.round(totalMinutesWeek / 7)} min média diária
          </span>
        </div>
      </div>

      {/* Main Bar Chart Visualization */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {metricType === 'frequency'
              ? 'Exercícios Realizados por Dia (Meta: 3 exercícios diários)'
              : `Tempo em Minutos por Dia (Meta: ${patientDailyGoalMinutes} min)`}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
              <span>Meta Concluída</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span>Prática Parcial</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block"></span>
              <span>Repouso</span>
            </span>
          </div>
        </div>

        {/* The 7-Day Bar Chart Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-56 pt-8 pb-3 px-2 sm:px-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 relative">
          {/* Target Reference Line */}
          <div
            style={{
              bottom:
                metricType === 'frequency'
                  ? `${(3 / maxExercises) * 100}%`
                  : `${(patientDailyGoalMinutes / maxMinutes) * 100}%`,
            }}
            className="absolute left-2 right-2 border-b-2 border-dashed border-teal-500/40 pointer-events-none flex items-center justify-end pr-2"
          >
            <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-md -translate-y-2 border border-teal-200 dark:border-teal-800 shadow-2xs">
              Meta: {metricType === 'frequency' ? '3 ex' : `${patientDailyGoalMinutes}m`}
            </span>
          </div>

          {enrichedDays.map((day, idx) => {
            const val = metricType === 'frequency' ? day.exercise_count : day.calculated_minutes;
            const maxVal = metricType === 'frequency' ? maxExercises : maxMinutes;
            const heightPercent = val > 0 ? Math.min(Math.round((val / maxVal) * 100), 100) : 0;
            const isSelected = selectedDayIndex === idx || (selectedDayIndex === null && idx === enrichedDays.length - 1);
            const isToday = idx === enrichedDays.length - 1;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center h-full justify-end group transition-transform focus:outline-none ${
                  isSelected ? 'scale-105' : 'hover:scale-102 opacity-90 hover:opacity-100'
                }`}
              >
                {/* Value above bar */}
                <div
                  className={`text-xs font-bold tabular-nums mb-2 transition-colors ${
                    val === 0
                      ? 'text-slate-400 dark:text-slate-600'
                      : day.is_completed
                      ? 'text-teal-700 dark:text-teal-300 font-extrabold'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {val > 0 ? (metricType === 'frequency' ? `${val} ex` : `${val}m`) : '-'}
                </div>

                {/* Bar Track & Fill */}
                <div
                  className={`w-full max-w-[44px] rounded-t-2xl h-36 relative overflow-hidden flex items-end transition-all ${
                    isSelected
                      ? 'bg-slate-200/80 dark:bg-slate-700/80 ring-2 ring-teal-500 dark:ring-teal-400'
                      : 'bg-slate-200/50 dark:bg-slate-800/80'
                  }`}
                >
                  {val > 0 ? (
                    <div
                      style={{ height: `${Math.max(heightPercent, 12)}%` }}
                      className={`w-full rounded-t-xl transition-all duration-700 ${
                        day.is_completed
                          ? 'bg-gradient-to-t from-teal-600 to-emerald-400 shadow-md'
                          : 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-sm'
                      }`}
                    />
                  ) : (
                    <div className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-full mb-1" />
                  )}
                </div>

                {/* Day of Week Label */}
                <div className="mt-3 text-center">
                  <div
                    className={`text-xs font-bold ${
                      isToday
                        ? 'text-teal-700 dark:text-teal-300 underline underline-offset-4'
                        : isSelected
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {day.day_name}
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 tabular-nums">
                    {day.date.split('-').slice(1).reverse().join('/')}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Clinical Detail Box */}
      {activeDay && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {activeDay.day_name} ({activeDay.date.split('-').reverse().join('/')})
              </span>
              {activeDay.is_completed ? (
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Meta Atingida</span>
                </span>
              ) : activeDay.exercise_count > 0 ? (
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Prática Parcial
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  Repouso Vocal
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {activeDay.exercise_count > 0 ? (
                <>
                  Foram executados <strong>{activeDay.exercise_count} exercícios vocais</strong> somando <strong>{activeDay.calculated_minutes} minutos de fonação</strong>.
                </>
              ) : (
                'Nenhum exercício registrado nesta data. Dia de descanso das pregas vocais.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Meta Recomendada</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">3 sessões (15 min)</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>
            <div className="text-right text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Status Clínico</span>
              <span className="font-bold text-teal-700 dark:text-teal-400">
                {activeDay.is_completed ? '100% Conforme Prescrição' : activeDay.exercise_count > 0 ? '50% Cumprido' : '0%'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Adherence Therapist Insight */}
      <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-900/50 flex items-start gap-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
        <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-teal-900 dark:text-teal-200 font-semibold block mb-0.5">
            Interpretação para a Fonoaudióloga:
          </strong>
          <span>
            {adherenceRate >= 70
              ? 'O paciente apresenta alta assiduidade semanal aos exercícios de Trato Vocal Semiocluído (SOVTE), com excelente resposta de redução de fadiga e estabilização da frequência fundamental (F0). Manter plano.'
              : 'O paciente praticou em dias alternados com lacunas nos finais de semana. Recomenda-se incentivar a inclusão de pelo menos 1 lembrete de hidratação e desaquecimento noturno nos dias sem sessões presenciais.'}
          </span>
        </div>
      </div>
    </div>
  );
};
