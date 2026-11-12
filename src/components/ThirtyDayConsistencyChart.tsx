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
  Brush,
  Legend
} from 'recharts';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  MousePointerClick,
  SlidersHorizontal,
  Stethoscope,
  Target,
  TrendingUp,
  Zap,
  X
} from 'lucide-react';
import { ExerciseLog, Patient } from '../types';
import { triggerHaptic } from '../utils/androidBridge';

interface ThirtyDayConsistencyChartProps {
  logs: ExerciseLog[];
  patient: Patient | null;
}

interface DayDataPoint {
  dateIso: string;
  shortDate: string; // e.g. "12/10"
  fullDate: string;  // e.g. "segunda-feira, 12 de outubro"
  dayName: string;   // e.g. "Seg"
  dayOfWeek: number; // 0-6
  minutes: number;
  sessionsCount: number;
  avgAccuracy: number;
  movingAvgMinutes: number;
  movingAvgSessions: number;
  exercises: string[];
  goalMinutes: number;
  isGoalAchieved: boolean;
  hasActivity: boolean;
}

type MetricView = 'minutes' | 'sessions' | 'both';
type TimeWindow = '30' | '14' | '7';

export const ThirtyDayConsistencyChart: React.FC<ThirtyDayConsistencyChartProps> = ({
  logs,
  patient,
}) => {
  const [timeRange, setTimeRange] = useState<TimeWindow>('30');
  const [metricView, setMetricView] = useState<MetricView>('minutes');
  const [showMovingAvg, setShowMovingAvg] = useState<boolean>(true);
  const [showZoomBrush, setShowZoomBrush] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<DayDataPoint | null>(null);
  const [pinnedPoint, setPinnedPoint] = useState<DayDataPoint | null>(null);

  const goalMinutes = patient?.daily_goal_minutes || 15;

  // Build continuous 30-day series and compute 7-day rolling averages
  const full30DaySeries = useMemo(() => {
    const rawDays: Omit<DayDataPoint, 'movingAvgMinutes' | 'movingAvgSessions'>[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
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

      const matchingLogs = logs.filter((log) => {
        if (!log) return false;
        if (log.date_iso === dateIso) return true;
        if (log.created_at && log.created_at.startsWith(dateIso)) return true;
        return false;
      });

      const totalSec = matchingLogs.reduce((acc, curr) => acc + (curr.duration_sec || 0), 0);
      const minutes = Math.round(totalSec / 60);
      const sessionsCount = matchingLogs.length;
      const avgAccuracy =
        sessionsCount > 0
          ? Math.round(
              matchingLogs.reduce((acc, curr) => acc + (curr.pitch_accuracy || 0), 0) / sessionsCount
            )
          : 0;

      const exerciseNames = Array.from(
        new Set(matchingLogs.map((l) => l.exercise_title || 'Exercício Vocal'))
      );

      rawDays.push({
        dateIso,
        shortDate,
        fullDate,
        dayName,
        dayOfWeek: d.getDay(),
        minutes,
        sessionsCount,
        avgAccuracy,
        exercises: exerciseNames,
        goalMinutes,
        isGoalAchieved: minutes >= goalMinutes,
        hasActivity: minutes > 0 || sessionsCount > 0,
      });
    }

    return rawDays.map((day, idx): DayDataPoint => {
      const start = Math.max(0, idx - 6);
      const slice = rawDays.slice(start, idx + 1);
      const movingAvgMinutes = Number(
        (slice.reduce((sum, item) => sum + item.minutes, 0) / slice.length).toFixed(1)
      );
      const movingAvgSessions = Number(
        (slice.reduce((sum, item) => sum + item.sessionsCount, 0) / slice.length).toFixed(1)
      );

      return {
        ...day,
        movingAvgMinutes,
        movingAvgSessions,
      };
    });
  }, [logs, goalMinutes]);

  const chartData = useMemo(() => {
    const count = Number(timeRange);
    return full30DaySeries.slice(full30DaySeries.length - count);
  }, [full30DaySeries, timeRange]);

  const metrics = useMemo(() => {
    const totalMinutes = chartData.reduce((acc, d) => acc + d.minutes, 0);
    const totalSessions = chartData.reduce((acc, d) => acc + d.sessionsCount, 0);
    const activeDays = chartData.filter((d) => d.hasActivity).length;
    const goalMetDays = chartData.filter((d) => d.isGoalAchieved).length;
    const totalDays = chartData.length;

    const consistencyRate = Math.round((activeDays / totalDays) * 100);
    const avgDailyMinutes = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

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
      avgDailyMinutes,
      maxStreak,
    };
  }, [chartData]);

  const maxMinutesAxis = useMemo(() => {
    const highest = Math.max(...chartData.map((d) => d.minutes), goalMinutes);
    return Math.ceil((highest + 5) / 5) * 5;
  }, [chartData, goalMinutes]);

  const maxSessionsAxis = useMemo(() => {
    const highest = Math.max(...chartData.map((d) => d.sessionsCount), 2);
    return Math.max(highest + 1, 4);
  }, [chartData]);

  const inspectedPoint = pinnedPoint || hoveredPoint;

  const handleChartClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const clicked = e.activePayload[0].payload as DayDataPoint;
      triggerHaptic(10);
      setPinnedPoint((prev) => (prev?.dateIso === clicked.dateIso ? null : clicked));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors space-y-6">
      {/* Header & Interactive Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Gráfico de Linhas Interativo · Últimos {timeRange} Dias
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-display mt-1">
            Frequência & Duração dos Exercícios Vocais
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Alterne entre duração diária (minutos), frequência (sessões) ou visão comparativa. Passe o mouse ou toque em qualquer ponto do gráfico para inspecionar os exercícios do dia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          {/* Metric Selector: Duração / Frequência / Ambas */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setMetricView('minutes');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                metricView === 'minutes'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Duração</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setMetricView('sessions');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                metricView === 'sessions'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Frequência</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setMetricView('both');
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                metricView === 'both'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Ambas</span>
            </button>
          </div>

          {/* Time Window (7d / 14d / 30d) */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs font-semibold">
            {(['7', '14', '30'] as TimeWindow[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setTimeRange(range);
                  setPinnedPoint(null);
                }}
                className={`px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60">
          <div className="flex items-center justify-between text-teal-800 dark:text-teal-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assiduidade {timeRange}d</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-900 dark:text-teal-100">
            {metrics.consistencyRate}%
          </div>
          <span className="text-[11px] text-teal-700 dark:text-teal-400 block mt-0.5">
            {metrics.activeDays} de {metrics.totalDays} dias com treino
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Duração Total</span>
            <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
            {metrics.totalMinutes} <span className="text-xs font-normal text-slate-500">min</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
            {metrics.totalSessions} sessões executadas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Média por Dia Ativo</span>
            <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-100">
            {metrics.avgDailyMinutes} <span className="text-xs font-normal text-emerald-600">min/dia</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
            Meta prescrita: {goalMinutes} min
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Maior Sequência</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-amber-100">
            {metrics.maxStreak} <span className="text-xs font-normal text-amber-600">dias</span>
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 block mt-0.5">
            Consecutivos no período
          </span>
        </div>
      </div>

      {/* Interactive Recharts Toolbar & Line Chart */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>
              {metricView === 'minutes'
                ? `Duração Diária (min) com Meta de ${goalMinutes} min`
                : metricView === 'sessions'
                ? 'Frequência Diária de Exercícios (Sessões por dia)'
                : 'Comparativo: Duração (min) × Frequência (sessões)'}
            </span>
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {metricView !== 'both' && (
              <button
                type="button"
                onClick={() => setShowMovingAvg((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  showMovingAvg
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="w-2.5 h-0.5 border-b-2 border-dashed border-current"></span>
                <span>Média Móvel 7d</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowZoomBrush((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                showZoomBrush
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Zoom Temporal</span>
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-80 sm:h-88 w-full pt-4 pb-2 px-1 sm:px-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 12, right: metricView === 'both' ? 8 : 18, left: -14, bottom: 4 }}
              onMouseMove={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  setHoveredPoint(e.activePayload[0].payload as DayDataPoint);
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={handleChartClick}
            >
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
                interval={timeRange === '30' ? 2 : timeRange === '14' ? 1 : 0}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-500 dark:text-slate-400"
              />

              <YAxis
                yAxisId="left"
                domain={[0, metricView === 'sessions' ? maxSessionsAxis : maxMinutesAxis]}
                tickLine={false}
                axisLine={false}
                tickCount={6}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-500 dark:text-slate-400"
                unit={metricView === 'sessions' ? '' : 'm'}
              />

              {metricView === 'both' && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, maxSessionsAxis]}
                  tickLine={false}
                  axisLine={false}
                  tickCount={5}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6366f1' }}
                />
              )}

              {(metricView === 'minutes' || metricView === 'both') && (
                <ReferenceLine
                  yAxisId="left"
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

              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
              />

              {/* Primary Line: Minutes (Duração) */}
              {(metricView === 'minutes' || metricView === 'both') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="minutes"
                  name="Duração (min)"
                  stroke="#0d9488"
                  strokeWidth={2.75}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    if (cx === undefined || cy === undefined) return <g key={`empty-${payload?.dateIso ?? index}`} />;
                    const isPinned = pinnedPoint?.dateIso === payload?.dateIso;
                    if (!payload || !payload.hasActivity) {
                      return (
                        <circle
                          key={`dot-m-empty-${payload?.dateIso || cx}`}
                          cx={cx}
                          cy={cy}
                          r={isPinned ? 5 : 2}
                          className={isPinned ? 'fill-teal-500 stroke-white stroke-2' : 'fill-slate-300 dark:fill-slate-700'}
                        />
                      );
                    }
                    const isGoal = payload.isGoalAchieved;
                    return (
                      <circle
                        key={`dot-m-${payload.dateIso}`}
                        cx={cx}
                        cy={cy}
                        r={isPinned ? 6 : isGoal ? 4.5 : 3.2}
                        className={
                          isGoal
                            ? 'fill-emerald-500 stroke-white dark:stroke-slate-900 stroke-2 cursor-pointer'
                            : 'fill-teal-600 stroke-white dark:stroke-slate-900 stroke-1 cursor-pointer'
                        }
                      />
                    );
                  }}
                  activeDot={{
                    r: 6.5,
                    fill: '#0d9488',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              )}

              {/* Frequency Line: Sessions */}
              {(metricView === 'sessions' || metricView === 'both') && (
                <Line
                  yAxisId={metricView === 'both' ? 'right' : 'left'}
                  type="monotone"
                  dataKey="sessionsCount"
                  name="Frequência (sessões)"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{
                    r: 3.5,
                    fill: '#6366f1',
                    stroke: '#ffffff',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 6.5,
                    fill: '#4f46e5',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              )}

              {/* 7-Day Rolling Moving Average Line */}
              {showMovingAvg && metricView !== 'both' && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={metricView === 'minutes' ? 'movingAvgMinutes' : 'movingAvgSessions'}
                  name="Tendência (Média 7d)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f59e0b' }}
                />
              )}

              {/* Interactive Range Zoom Brush */}
              {showZoomBrush && (
                <Brush
                  dataKey="shortDate"
                  height={24}
                  stroke="#0d9488"
                  travellerWidth={10}
                  tickFormatter={(val) => String(val)}
                />
              )}

              {/* Rich Custom Interactive Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload as DayDataPoint;
                    return (
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs space-y-2 min-w-[215px]">
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
                            {data.fullDate}
                          </span>
                          {data.isGoalAchieved ? (
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.5 rounded-md shrink-0">
                              Meta Atingida
                            </span>
                          ) : data.hasActivity ? (
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-1.5 py-0.5 rounded-md shrink-0">
                              Parcial
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
                              Repouso
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Duração Total:</span>
                            <span className="font-extrabold text-teal-700 dark:text-teal-400 tabular-nums">
                              {data.minutes} min
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Frequência:</span>
                            <span className="font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                              {data.sessionsCount} {data.sessionsCount === 1 ? 'sessão' : 'sessões'}
                            </span>
                          </div>
                          {data.avgAccuracy > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 dark:text-slate-400">Precisão F0 Média:</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                {data.avgAccuracy}%
                              </span>
                            </div>
                          )}
                        </div>

                        {data.exercises.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                              Exercícios do dia:
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
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Live Selected / Hovered Day Inspector Strip */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {inspectedPoint ? (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 capitalize">
                  <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{inspectedPoint.fullDate}</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold tabular-nums">
                  {inspectedPoint.minutes} min
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold tabular-nums">
                  {inspectedPoint.sessionsCount} {inspectedPoint.sessionsCount === 1 ? 'sessão' : 'sessões'}
                </span>
                {inspectedPoint.avgAccuracy > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold tabular-nums">
                    <Zap className="w-3 h-3" />
                    <span>{inspectedPoint.avgAccuracy}% F0</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {inspectedPoint.exercises.length > 0 ? (
                  inspectedPoint.exercises.slice(0, 3).map((exName, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      {exName}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">Dia de repouso vocal</span>
                )}

                {pinnedPoint && (
                  <button
                    type="button"
                    onClick={() => setPinnedPoint(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md"
                    title="Desafixar dia"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <MousePointerClick className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>
                Toque ou passe o cursor sobre qualquer ponto da linha para fixar e detalhar os exercícios realizados naquela data.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clinical Consistency Summary */}
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
