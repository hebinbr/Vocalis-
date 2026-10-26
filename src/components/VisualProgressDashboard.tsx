import React, { useState } from 'react';
import {
  Flame,
  Award,
  Clock,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Lock,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Zap,
  Waves,
  Sparkles
} from 'lucide-react';
import { ProgressStats, ExerciseLog, Patient } from '../types';

interface VisualProgressDashboardProps {
  stats: ProgressStats | null;
  logs: ExerciseLog[];
  patient: Patient | null;
  onSelectExercise: (id: string) => void;
  onDeleteLog: (id: number) => void;
}

export const VisualProgressDashboard: React.FC<VisualProgressDashboardProps> = ({
  stats,
  logs,
  patient,
  onSelectExercise,
  onDeleteLog,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        <span>Carregando métricas de evolução vocal...</span>
      </div>
    );
  }

  const todayProgress = stats.last_7_days[stats.last_7_days.length - 1];
  const todayMinutes = todayProgress ? todayProgress.minutes : 0;
  const targetMinutes = patient?.daily_goal_minutes || 15;
  const todayPercent = Math.min(Math.round((todayMinutes / targetMinutes) * 100), 100);

  const handleDelete = async (id: number) => {
    if (confirm('Deseja excluir este registro de exercício?')) {
      setDeletingId(id);
      try {
        await onDeleteLog(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Motivational Streak Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-teal-600 rounded-3xl p-6 md:p-8 text-white shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Flame className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plano Terapêutico Ativo</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
              {stats.streak_days > 0
                ? `${stats.streak_days} dias seguidos cuidando da sua voz!`
                : 'Comece sua sequência vocal hoje!'}
            </h2>
            <p className="text-white/90 text-sm max-w-xl leading-relaxed">
              A regularidade dos exercícios de trato vocal semiocluído e respiração fortalece a musculatura intrínseca da laringe e previne sobrecarga nas cordas vocais.
            </p>
          </div>

          <div className="flex md:justify-end items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-inner">
              <Flame className="w-8 h-8 fill-amber-950" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/80 font-semibold">
                Sequência Atual
              </div>
              <div className="text-3xl font-extrabold tabular-nums tracking-tight text-white">
                {stats.streak_days} <span className="text-sm font-medium text-white/80">dias</span>
              </div>
              <div className="text-xs text-white/70">
                Recorde: <span className="font-semibold text-white tabular-nums">{stats.best_streak}</span> dias
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Visual Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Goal Ring */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Meta de Hoje
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {todayMinutes} <span className="text-sm font-normal text-slate-500">/ {targetMinutes} min</span>
            </div>
            <div className="text-xs text-teal-700 mt-1 font-medium">
              {todayPercent >= 100 ? 'Meta atingida hoje!' : `Faltam ${Math.max(0, targetMinutes - todayMinutes)} min`}
            </div>
          </div>

          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="6"
                className="text-slate-100"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={163.36}
                strokeDashoffset={163.36 - (163.36 * todayPercent) / 100}
                strokeLinecap="round"
                className="text-teal-600 transition-all duration-1000 ease-out"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-800 tabular-nums">
              {todayPercent}%
            </span>
          </div>
        </div>

        {/* Metric 2: Total Time Practiced */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo Total Acumulado</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.total_minutes} <span className="text-sm font-normal text-slate-500">minutos</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Em <span className="font-semibold text-slate-800 tabular-nums">{stats.total_sessions}</span> sessões fonoaudiológicas
          </div>
        </div>

        {/* Metric 3: Average Pitch Accuracy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Afinidade / Precisão F0</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.avg_pitch_accuracy}%
          </div>
          <div className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Excelente controle glótico</span>
          </div>
        </div>

        {/* Metric 4: Average Vocal Fatigue Reduction */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Alívio de Fadiga</span>
            <TrendingDown className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-800 tabular-nums mt-1">
            -{stats.avg_fatigue_relief} <span className="text-sm font-normal text-slate-500">pontos</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Redução média da tensão laringofaringea
          </div>
        </div>
      </div>

      {/* 7-Day Visual Progress Chart & Weekly Discipline */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Constância nos Últimos 7 Dias
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Minutos de treino vocal realizados comparados à meta diária de {targetMinutes} min
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-teal-600 inline-block"></span>
              <span className="text-slate-600">Meta Concluída</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-teal-200 inline-block"></span>
              <span className="text-slate-600">Treino Parcial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-100 inline-block"></span>
              <span className="text-slate-600">Sem Registro</span>
            </div>
          </div>
        </div>

        {/* Interactive Bar Columns */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 pb-2 border-b border-slate-100">
          {stats.last_7_days.map((day, idx) => {
            const maxDisplay = Math.max(targetMinutes * 1.5, 25);
            const heightPercent = Math.min(Math.round((day.minutes / maxDisplay) * 100), 100);
            const isToday = idx === stats.last_7_days.length - 1;

            return (
              <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[11px] font-semibold tabular-nums text-slate-600 mb-2 opacity-80 group-hover:opacity-100">
                  {day.minutes > 0 ? `${day.minutes}m` : '-'}
                </div>

                <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl h-28 relative overflow-hidden flex items-end">
                  {day.minutes > 0 && (
                    <div
                      style={{ height: `${Math.max(heightPercent, 12)}%` }}
                      className={`w-full rounded-t-xl transition-all duration-700 ${
                        day.completed
                          ? 'bg-gradient-to-t from-teal-700 to-teal-500'
                          : 'bg-teal-300'
                      }`}
                    />
                  )}

                  {/* Target line indicator */}
                  <div
                    style={{ bottom: `${(targetMinutes / maxDisplay) * 100}%` }}
                    className="absolute left-0 right-0 border-b border-dashed border-slate-300 pointer-events-none"
                    title={`Meta: ${targetMinutes}min`}
                  />
                </div>

                <div className="mt-3 text-center">
                  <div
                    className={`text-xs font-semibold ${
                      isToday ? 'text-teal-700 underline font-bold' : 'text-slate-700'
                    }`}
                  >
                    {day.day_name}
                  </div>
                  <div className="text-[10px] text-slate-600 tabular-nums">
                    {day.date.split('-').slice(1).reverse().join('/')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Linha pontilhada indica sua meta prescrita ({targetMinutes} min/dia)</span>
          <span className="font-medium text-slate-700">
            {stats.last_7_days.filter((d) => d.completed).length} de 7 dias com meta batida
          </span>
        </div>
      </div>

      {/* Motivational Badges / Conquistas Fonoaudiológicas */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 font-display">
            Conquistas & Marcos Terapêuticos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Badges desbloqueados conforme sua evolução vocal e consistência de treino
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {stats.badges.map((badge) => {
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all ${
                  badge.unlocked
                    ? 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      badge.unlocked
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {badge.title}
                    </h4>
                    <span
                      className={`text-[10px] font-medium ${
                        badge.unlocked ? 'text-amber-800' : 'text-slate-600'
                      }`}
                    >
                      {badge.unlocked ? 'Desbloqueado' : 'Em progresso'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico Recente de Treinos (Criptografado) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Histórico de Exercícios Realizados
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Dados Criptografados no SQLite</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reflexões, autoavaliações de fadiga e notas clínicas do paciente
            </p>
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Total de {logs.length} registros no histórico
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Waves className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum exercício registrado ainda</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Selecione um exercício na aba "Exercícios Vocais" para começar seu treino diário.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const formattedDate = new Date(log.created_at || log.date_iso).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={log.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 p-2 rounded-xl transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{log.exercise_title}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-500 tabular-nums">{formattedDate}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Duração: <strong className="text-slate-800 tabular-nums">{Math.round(log.duration_sec / 60)} min</strong> ({log.duration_sec}s)
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>
                        Séries: <strong className="text-slate-800 tabular-nums">{log.repetitions} repetições</strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>
                        Precisão: <strong className="text-teal-700 tabular-nums">{log.pitch_accuracy}%</strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>
                        Fadiga vocal: de <span className="text-amber-700 font-semibold tabular-nums">{log.fatigue_before}/10</span> para <span className="text-emerald-700 font-semibold tabular-nums">{log.fatigue_after}/10</span>
                      </span>
                    </div>

                    {log.notes && (
                      <div className="mt-1.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 max-w-2xl flex items-start gap-2">
                        <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-900">Nota Confidencial: </span>
                          <span>{log.notes}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => onSelectExercise(log.exercise_id)}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors whitespace-nowrap"
                    >
                      Repetir Treino
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deletingId === log.id}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir Registro"
                      aria-label="Excluir Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
