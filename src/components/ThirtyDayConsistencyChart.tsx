import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';
import { ExerciseLog, Patient } from '../types';

interface ThirtyDayConsistencyChartProps {
  logs: ExerciseLog[];
  patient: Patient | null;
}

interface DayDataPoint {
  dateIso: string;
  shortDate: string; // e.g. "12/10"
  fullDate: string;  // e.g. "12 de outubro de 2026"
  dayName: string;   // e.g. "Seg"
  dayOfWeek: number; // 0-6
  minutes: number;
  sessionsCount: number;
  exercises: string[];
  goalMinutes: number;
  isGoalAchieved: boolean;
  hasActivity: boolean;
}

export const ThirtyDayConsistencyChart: React.FC<ThirtyDayConsistencyChartProps> = ({
  logs,
  patient,
}) => {
  const [timeRange, setTimeRange] = useState<'30' | '14'>('30');
  const [metricView, setMetricView] = useState<'minutes' | 'sessions'>('minutes');
  const [hoveredPoint, setHoveredPoint] = useState<DayDataPoint | null>(null);

  const goalMinutes = patient?.daily_goal_minutes || 15;

  // Generate 30 days series up to today
  const chartData = useMemo(() => {
    const daysCount = timeRange === '30' ? 30 : 14;
    const result: DayDataPoint[] = [];

    // Reference base date (today)
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateIso = `${year}-${month}-${day}`;

      const shortDate = `${day}/${month}`;
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const dayName = dayNames[d.getDay()];

      const fullDate = d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });

      // Filter matching logs for this date
      const matchingLogs = logs.filter((log) => {
        if (!log) return false;
        if (log.date_iso === dateIso) return true;
        if (log.created_at && log.created_at.startsWith(dateIso)) return true;
        return false;
      });

      const totalSec = matchingLogs.reduce((acc, curr) => acc + (curr.duration_sec || 0), 0);
      const minutes = Math.round(totalSec / 60);
      const sessionsCount = matchingLogs.length;

      // Extract unique exercise names
      const exerciseNames = Array.from(new Set(matchingLogs.map((l) => l.exercise_title || 'Exercício Vocal')));

      result.push({
        dateIso,
        shortDate,
        fullDate,
        dayName,
        dayOfWeek: d.getDay(),
        minutes,
        sessionsCount,
        exercises: exerciseNames,
        goalMinutes,
        isGoalAchieved: minutes >= goalMinutes,
        hasActivity: minutes > 0 || sessionsCount > 0,
      });
    }

    return result;
  }, [logs, timeRange, goalMinutes]);

  // Key consistency KPIs for the selected window
  const metrics = useMemo(() => {
    const totalMinutes = chartData.reduce((acc, d) => acc + d.minutes, 0);
    const totalSessions = chartData.reduce((acc, d) => acc + d.sessionsCount, 0);
    const activeDays = chartData.filter((d) => d.hasActivity).length;
    const goalMetDays = chartData.filter((d) => d.isGoalAchieved).length;
    const totalDays = chartData.length;

    const consistencyRate = Math.round((activeDays / totalDays) * 100);
    const goalSuccessRate = Math.round((goalMetDays / totalDays) * 100);
    const avgDailyMinutes = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

    // Calculate longest consecutive streak in this window
    let currentStreak = 0;
    let maxStreak = 0;
    chartData.forEach((d) => {
      if (d.hasActivity) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    return {
      totalMinutes,
      totalSessions,
      activeDays,
      goalMetDays,
      totalDays,
      consistencyRate,
      goalSuccessRate,
      avgDailyMinutes,
      maxStreak,
    };
  }, [chartData]);

  // Max value for Y axis headroom
  const maxDataValue = useMemo(() => {
    if (metricView === 'minutes') {
      const highest = Math.max(...chartData.map((d) => d.minutes), goalMinutes);
      return Math.ceil((highest + 5) / 5) * 5;
    } else {
      const highest = Math.max(...chartData.map((d) => d.sessionsCount), 3);
      return Math.max(highest + 1, 4);
    }
  }, [chartData, metricView, goalMinutes]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors space-y-6">
      {/* Header with Title and Range Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Consistência de Longo Prazo ({timeRange === '30' ? 'Últimos 30 Dias' : 'Últimos 14 Dias'})
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-display mt-1">
            Tempo Total de Prática Diária & Regularidade
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Gráfico contínuo com a biblioteca <span className="font-semibold text-teal-700 dark:text-teal-400">Recharts</span>. Permite visualizar se o paciente mantém a dosagem de reabilitação prescrita ao longo de um mês completo, essencial para a consolidação neuromuscular.
          </p>
        </div>

        {/* Action Controls: 14/30 Days & Metric Toggle */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* Metric View Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetricView('minutes')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                metricView === 'minutes'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Minutos</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('sessions')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                metricView === 'sessions'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Sessões</span>
            </button>
          </div>

          {/* Time Window (14d vs 30d) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeRange('14')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeRange === '14'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              14 dias
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeRange === '30'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              30 dias
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights for the Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Consistency Percentage */}
        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60">
          <div className="flex items-center justify-between text-teal-800 dark:text-teal-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assiduidade {timeRange}d</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-900 dark:text-teal-100 flex items-baseline gap-1">
            <span>{metrics.consistencyRate}%</span>
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-400 block mt-0.5">
            {metrics.activeDays} de {metrics.totalDays} dias com treino
          </span>
        </div>

        {/* Metric 2: Total Time in Window */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tempo Total</span>
            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {metrics.totalMinutes} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {metrics.totalSessions} sessões registradas
          </span>
        </div>

        {/* Metric 3: Active Daily Average */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Média por Dia Ativo</span>
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-100">
            {metrics.avgDailyMinutes} <span className="text-xs font-normal text-emerald-600">min/dia</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
            Meta fonoaudiológica: {goalMinutes} min
          </span>
        </div>

        {/* Metric 4: Longest Streak in Period */}
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Maior Sequência</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-100">
            {metrics.maxStreak} <span className="text-xs font-normal text-amber-600">dias</span>
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 block mt-0.5">
            Consectivos sem falhar
          </span>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>
              {metricView === 'minutes'
                ? `Curva de Minutos de Exercício Diário (Linha tracejada: Meta de ${goalMinutes} min)`
                : 'Curva de Quantidade de Sessões Executadas por Dia'}
            </span>
          </span>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-teal-500 rounded-full inline-block"></span>
              <span>Tempo Praticado</span>
            </span>
            {metricView === 'minutes' && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-b-2 border-dashed border-teal-500 inline-block"></span>
                <span>Meta ({goalMinutes} min)</span>
              </span>
            )}
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-72 sm:h-80 w-full pt-4 pb-2 px-1 sm:px-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 16, left: -16, bottom: 4 }}
              onMouseMove={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  setHoveredPoint(e.activePayload[0].payload as DayDataPoint);
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="practiceMinutesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
              />

              <XAxis
                dataKey="shortDate"
                tickLine={false}
                axisLine={false}
                interval={timeRange === '30' ? 2 : 1}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-500 dark:text-slate-400"
              />

              <YAxis
                domain={[0, maxDataValue]}
                tickLine={false}
                axisLine={false}
                tickCount={6}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-500 dark:text-slate-400"
                unit={metricView === 'minutes' ? 'm' : ''}
              />

              {metricView === 'minutes' && (
                <ReferenceLine
                  y={goalMinutes}
                  stroke="#0d9488"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Meta ${goalMinutes}m`,
                    position: 'insideTopRight',
                    fill: '#0d9488',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {/* Area Gradient Fill under line */}
              <Area
                type="monotone"
                dataKey={metricView === 'minutes' ? 'minutes' : 'sessionsCount'}
                fill="url(#practiceMinutesGradient)"
                stroke="none"
              />

              {/* Interactive Line */}
              <Line
                type="monotone"
                dataKey={metricView === 'minutes' ? 'minutes' : 'sessionsCount'}
                stroke="#0d9488"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!payload || !payload.hasActivity) {
                    return (
                      <circle
                        key={`dot-empty-${payload?.dateIso || cx}`}
                        cx={cx}
                        cy={cy}
                        r={2}
                        className="fill-slate-300 dark:fill-slate-700"
                      />
                    );
                  }

                  const isGoal = payload.isGoalAchieved;
                  return (
                    <circle
                      key={`dot-${payload.dateIso}`}
                      cx={cx}
                      cy={cy}
                      r={isGoal ? 4 : 3}
                      className={
                        isGoal
                          ? 'fill-emerald-500 stroke-white dark:stroke-slate-900 stroke-2'
                          : 'fill-teal-600 stroke-white dark:stroke-slate-900 stroke-1'
                      }
                    />
                  );
                }}
                activeDot={{
                  r: 6,
                  fill: '#0d9488',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                  className: 'shadow-md',
                }}
              />

              {/* Custom Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload as DayDataPoint;
                    return (
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2 min-w-[200px]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                            {data.fullDate}
                          </span>
                          {data.isGoalAchieved ? (
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded-md">
                              Meta Atingida
                            </span>
                          ) : data.hasActivity ? (
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded-md">
                              Parcial
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                              Repouso
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Tempo Praticado:</span>
                            <span className="font-extrabold text-teal-700 dark:text-teal-400 tabular-nums">
                              {data.minutes} minutos
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Sessões Realizadas:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                              {data.sessionsCount} {data.sessionsCount === 1 ? 'sessão' : 'sessões'}
                            </span>
                          </div>

                          {metricView === 'minutes' && (
                            <div className="flex items-center justify-between text-[11px] pt-0.5 text-slate-500">
                              <span>Meta Diária:</span>
                              <span>{goalMinutes} min</span>
                            </div>
                          )}
                        </div>

                        {data.exercises.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                              Exercícios praticados:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {data.exercises.map((name, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-medium bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clinical Adherence Summary Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Avaliação de Consistência Terapêutica
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {metrics.consistencyRate >= 70 ? (
                <>
                  <strong className="text-teal-800 dark:text-teal-300">Excelente padrão de adesão!</strong> Você praticou em {metrics.activeDays} dos últimos {metrics.totalDays} dias. Esse volume continuado consolida a memória proprioceptiva do trato vocal semiocluído e protege contra sobrecargas fonatórias.
                </>
              ) : metrics.consistencyRate >= 40 ? (
                <>
                  <strong className="text-amber-800 dark:text-amber-300">Bom ritmo com oportunidades de ajuste.</strong> Foram {metrics.activeDays} dias de prática nos últimos {metrics.totalDays} dias. Manter sessões curtas de 5 a 10 minutos mesmo em dias corridos previne a perda de ganho acústico.
                </>
              ) : (
                <>
                  <strong className="text-indigo-800 dark:text-indigo-300">Início de condicionamento vocal.</strong> Lembre-se de que a regularidade diária de 10 minutos traz mais benefícios fisiológicos às cordas vocais do que treinos longos e espaçados.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 shadow-2xs">
            {metrics.goalMetDays} metas batidas
          </span>
        </div>
      </div>
    </div>
  );
};
