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
  Sparkles,
  Crown,
  Trophy,
  Star,
  Target,
  ArrowUpRight,
  Shield,
  Check
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
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState<string>('Todos');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        <span>Carregando métricas de evolução vocal e gamificação...</span>
      </div>
    );
  }

  const todayProgress = stats.last_7_days[stats.last_7_days.length - 1];
  const todayMinutes = todayProgress ? todayProgress.minutes : 0;
  const targetMinutes = patient?.daily_goal_minutes || 15;
  const todayPercent = Math.min(Math.round((todayMinutes / targetMinutes) * 100), 100);

  const currentLevel = stats.level || 2;
  const currentXp = stats.xp_points || 350;
  const levelProgress = stats.level_progress_percent || 42;
  const xpRemaining = stats.xp_for_next_level || 170;

  const badgeCategories = ['Todos', 'Disciplina', 'Técnica', 'Reabilitação', 'Nível'];
  const filteredBadges =
    selectedBadgeCategory === 'Todos'
      ? stats.badges
      : stats.badges.filter((b) => b.category === selectedBadgeCategory);

  const unlockedBadgesCount = stats.badges.filter((b) => b.unlocked).length;

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

  const getBadgeIcon = (icon: string, unlocked: boolean) => {
    const colorClass = unlocked ? 'text-amber-500' : 'text-slate-400';
    switch (icon) {
      case 'Flame':
        return <Flame className={`w-5 h-5 ${unlocked ? 'text-orange-500 fill-orange-500' : colorClass}`} />;
      case 'ShieldCheck':
      case 'Shield':
        return <ShieldCheck className={`w-5 h-5 ${unlocked ? 'text-emerald-600' : colorClass}`} />;
      case 'Zap':
        return <Zap className={`w-5 h-5 ${unlocked ? 'text-amber-500 fill-amber-400' : colorClass}`} />;
      case 'Waves':
        return <Waves className={`w-5 h-5 ${unlocked ? 'text-sky-500' : colorClass}`} />;
      case 'Crown':
        return <Crown className={`w-5 h-5 ${unlocked ? 'text-amber-500 fill-amber-400' : colorClass}`} />;
      case 'Clock':
        return <Clock className={`w-5 h-5 ${unlocked ? 'text-indigo-500' : colorClass}`} />;
      case 'TrendingDown':
        return <TrendingDown className={`w-5 h-5 ${unlocked ? 'text-teal-600' : colorClass}`} />;
      default:
        return <Award className={`w-5 h-5 ${colorClass}`} />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Gamification Banner: Level, XP Bar & Streak */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden border border-slate-700/50">
        <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none flex items-center pr-8">
          <Trophy className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-teal-500/20">
                {currentLevel}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-teal-400">
                    Nível {currentLevel}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300" />
                    <span>{currentXp} XP Acumulados</span>
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                  {stats.level_title || 'Ressonador Ativo'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="tabular-nums font-bold text-white text-sm">{stats.streak_days}</span>
                <span className="text-slate-300">dias seguidos</span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="tabular-nums font-bold text-white text-sm">
                  {unlockedBadgesCount} / {stats.badges.length}
                </span>
                <span className="text-slate-300">distintivos</span>
              </div>
            </div>
          </div>

          {/* XP Progress Bar towards next level */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-teal-400" />
                <span>Evolução para o Nível {Math.min(currentLevel + 1, 5)}</span>
              </span>
              <span className="tabular-nums text-white font-semibold">
                {currentLevel >= 5
                  ? 'Nível Máximo Alcançado!'
                  : `Faltam ${xpRemaining} XP para o próximo nível`}
              </span>
            </div>

            <div className="h-3 w-full bg-slate-700/60 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                style={{ width: `${levelProgress}%` }}
                className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-300 rounded-full transition-all duration-1000 ease-out shadow-xs"
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{levelProgress}% concluído</span>
              <span>Recompensa: Desbloqueio de novos desafios fonoaudiológicos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap dos 5 Níveis Vocais */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Trilha de Níveis & Maestria Fonoaudiológica
            </h3>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
              Gamificação Clínica
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cada nível desbloqueia exercícios fisiologicamente avançados e desafios de controle neuromuscular
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {stats.all_levels?.map((lvl) => {
            const isCurrent = lvl.level === currentLevel;
            const isUnlocked = lvl.level <= currentLevel;

            return (
              <div
                key={lvl.level}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-teal-500 bg-teal-50/50 shadow-sm ring-2 ring-teal-500/20'
                    : isUnlocked
                    ? 'border-slate-200 bg-slate-50/80'
                    : 'border-slate-200/50 bg-slate-50/40 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isCurrent
                          ? 'bg-teal-600 text-white'
                          : isUnlocked
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {lvl.level}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                      {lvl.min_xp} XP
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 mb-1">{lvl.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-normal line-clamp-2">
                    {lvl.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/60">
                  <span
                    className={`text-[10px] font-semibold block ${
                      isCurrent
                        ? 'text-teal-700 font-bold'
                        : isUnlocked
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {isCurrent ? 'Nível Atual' : isUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                  </span>
                </div>
              </div>
            );
          })}
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
            <span className="text-xs font-semibold uppercase tracking-wider">Tempo Acumulado</span>
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
            <span className="text-xs font-semibold uppercase tracking-wider">Precisão Acústica F0</span>
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
            Redução média da tensão muscular
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
          <span>Linha pontilhada indica sua meta diária ({targetMinutes} min)</span>
          <span className="font-medium text-slate-700">
            {stats.last_7_days.filter((d) => d.completed).length} de 7 dias com meta batida
          </span>
        </div>
      </div>

      {/* Galeria de Distintivos / Badges por Marcos Alcançados */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Galeria de Distintivos por Marcos Alcançados
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Conquistas fonoaudiológicas desbloqueadas conforme sua evolução vocal ({unlockedBadgesCount} de {stats.badges.length} desbloqueados)
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {badgeCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedBadgeCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                  selectedBadgeCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {filteredBadges.map((badge) => {
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  badge.unlocked
                    ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-200/90 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200/60 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        badge.unlocked
                          ? 'bg-amber-100 border border-amber-300 text-amber-900 shadow-xs'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {getBadgeIcon(badge.icon, badge.unlocked)}
                    </div>

                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {badge.category}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-tight mb-1">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      badge.unlocked ? 'text-amber-800' : 'text-slate-600'
                    }`}
                  >
                    {badge.unlocked ? (
                      <>
                        <Check className="w-3 h-3 text-amber-600" />
                        <span>Conquistado</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Em progresso</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico Recente de Treinos (Criptografado com Exibição de XP) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Histórico de Sessões & XP Ganho
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Dados Criptografados no SQLite</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reflexões, autoavaliações de fadiga e pontuação de cada prática vocal
            </p>
          </div>

          <div className="text-xs text-slate-500 tabular-nums">
            Total de {logs.length} sessões registradas
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Waves className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum exercício registrado ainda</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Selecione um exercício na aba "Exercícios Vocais" para começar seu treino diário e ganhar seus primeiros pontos XP.
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
                      {log.xp_earned && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                          +{log.xp_earned} XP
                        </span>
                      )}
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
                        Fadiga: de <span className="text-amber-700 font-semibold tabular-nums">{log.fatigue_before}/10</span> para <span className="text-emerald-700 font-semibold tabular-nums">{log.fatigue_after}/10</span>
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
