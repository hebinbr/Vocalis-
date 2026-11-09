import React, { useState, useEffect, useMemo } from 'react';
import {
  Lightbulb,
  BookOpen,
  Droplets,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Apple,
  Wind,
  Sparkles,
  CloudSun,
  Thermometer,
  Flame,
  Activity,
  HeartPulse,
  CheckCircle2,
  SlidersHorizontal,
  Plus,
  RotateCcw,
  Info
} from 'lucide-react';
import { ProgressStats, ExerciseLog, Patient, User, WeatherData, VocalTip } from '../types';
import {
  fetchWeatherForLocation,
  getDefaultWeatherData,
  BRAZIL_CITY_PRESETS,
  CLIMATE_SIMULATION_PRESETS
} from '../services/weatherService';
import { ALL_VOCAL_TIPS, selectContextualTip } from '../data/vocalTipsData';

// Safe localStorage access helpers to prevent crashes in restricted iframe sandbox
function safeGetStorage(key: string): string | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

interface DailyVocalTipProps {
  stats?: ProgressStats | null;
  logs?: ExerciseLog[];
  patient?: Patient | null;
  currentUser?: User | null;
}

export const DailyVocalTip: React.FC<DailyVocalTipProps> = ({
  stats = null,
  logs = [],
  patient = null,
  currentUser = null
}) => {
  // Mode selection: 'climate' (default), 'frequency', 'hydration', 'all'
  const [activeMode, setActiveMode] = useState<'climate' | 'frequency' | 'hydration' | 'all'>('climate');

  // Weather state with safe fallback
  const [weather, setWeather] = useState<WeatherData>(() => {
    try {
      return getDefaultWeatherData();
    } catch {
      return {
        city: 'São Paulo (Referência)',
        temperature: 24,
        relativeHumidity: 48,
        condition: 'moderate',
        conditionLabel: 'Condição Apoiada',
        isAutoDetected: false,
        updatedAt: new Date().toISOString()
      };
    }
  });

  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [showClimateSelector, setShowClimateSelector] = useState<boolean>(false);

  // Hydration state (stored per day in localStorage)
  const todayIso = useMemo(() => {
    try {
      return new Date().toISOString().split('T')[0];
    } catch {
      return '2026-today';
    }
  }, []);

  const [glassesDrank, setGlassesDrank] = useState<number>(() => {
    try {
      const stored = safeGetStorage(`vocalis_hydration_${todayIso}`);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [justDrank, setJustDrank] = useState<boolean>(false);

  // Manual tip browsing index
  const [manualIndex, setManualIndex] = useState<number>(0);

  // Auto-detect weather on mount if not loaded (STRICTLY safe for iframes)
  useEffect(() => {
    let isMounted = true;

    async function detectWeather() {
      // In iframes without allow="geolocation", calling or checking geolocation can throw
      try {
        if (
          typeof window !== 'undefined' &&
          'navigator' in window &&
          navigator &&
          'geolocation' in navigator &&
          typeof navigator.geolocation?.getCurrentPosition === 'function'
        ) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (!isMounted || !pos?.coords) return;
              try {
                setLoadingWeather(true);
                const data = await fetchWeatherForLocation(
                  pos.coords.latitude,
                  pos.coords.longitude,
                  'Sua Localização'
                );
                if (isMounted && data) {
                  setWeather(data);
                  safeSetStorage('vocalis_weather_data', JSON.stringify(data));
                }
              } catch (err) {
                console.info('[Vocalis] Geolocation weather fallback:', err);
              } finally {
                if (isMounted) setLoadingWeather(false);
              }
            },
            (err) => {
              // Geolocation denied or unavailable in iframe: gracefully ignore
              console.info('[Vocalis] Geolocation permission status:', err?.message || 'unavailable');
            },
            { timeout: 4000, maximumAge: 600000, enableHighAccuracy: false }
          );
        }
      } catch (e) {
        // Sandboxed iframe permissions policy error swallowed safely
        console.info('[Vocalis] Geolocation not permitted in sandbox, using regional preset.');
      }
    }

    detectWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save hydration progress
  const handleDrinkWater = () => {
    const next = glassesDrank + 1;
    setGlassesDrank(next);
    safeSetStorage(`vocalis_hydration_${todayIso}`, String(next));
    setJustDrank(true);
    setTimeout(() => setJustDrank(false), 2000);
  };

  const handleResetWater = () => {
    setGlassesDrank(0);
    safeSetStorage(`vocalis_hydration_${todayIso}`, '0');
  };

  // Safe city name and metrics
  const displayCity = useMemo(() => {
    const raw = weather?.city || 'São Paulo';
    return raw.split('(')[0].trim() || 'Sua Região';
  }, [weather?.city]);

  const temperature = typeof weather?.temperature === 'number' ? weather.temperature : 24;
  const humidity = typeof weather?.relativeHumidity === 'number' ? weather.relativeHumidity : 48;
  const condition = weather?.condition || 'moderate';

  // Base hydration calculation: 35ml per kg (~2.100ml) + Climate bonus
  const baseWaterGoal = 2100;
  const climateBonus = useMemo(() => {
    if (condition === 'dry' || humidity < 40) return 500;
    if (condition === 'hot' || temperature >= 29) return 600;
    if (condition === 'cold' || temperature < 18) return 250;
    return 200;
  }, [condition, humidity, temperature]);

  const totalWaterGoalMl = baseWaterGoal + climateBonus;
  const currentWaterMl = glassesDrank * 250;
  const hydrationPercent = Math.min(Math.round((currentWaterMl / totalWaterGoalMl) * 100), 100);

  // Selected tip resolution with try-catch fallback
  const contextualRecommendation = useMemo(() => {
    try {
      return selectContextualTip(weather, stats, logs, activeMode === 'frequency' ? 'frequency' : 'climate');
    } catch (err) {
      console.warn('[Vocalis] Tip resolution notice:', err);
      return {
        tip: ALL_VOCAL_TIPS[0],
        reasonBadge: 'Conselho Clínico do Dia',
        reasonDetail: 'Higiene e biomecânica fonoaudiológica baseada em evidências.'
      };
    }
  }, [weather, stats, logs, activeMode]);

  const currentTip: VocalTip = useMemo(() => {
    if (activeMode === 'all') {
      const idx = Math.abs(manualIndex) % ALL_VOCAL_TIPS.length;
      return ALL_VOCAL_TIPS[idx] || ALL_VOCAL_TIPS[0];
    }
    return contextualRecommendation?.tip || ALL_VOCAL_TIPS[0];
  }, [activeMode, manualIndex, contextualRecommendation]);

  const handleNextTip = () => {
    setManualIndex((prev) => (prev + 1) % ALL_VOCAL_TIPS.length);
  };

  const handlePrevTip = () => {
    setManualIndex((prev) => (prev - 1 + ALL_VOCAL_TIPS.length) % ALL_VOCAL_TIPS.length);
  };

  const handleSelectCity = async (city: (typeof BRAZIL_CITY_PRESETS)[0]) => {
    setLoadingWeather(true);
    try {
      const data = await fetchWeatherForLocation(city.lat, city.lon, `${city.name} (${city.state})`);
      if (data) {
        setWeather(data);
        safeSetStorage('vocalis_weather_data', JSON.stringify(data));
      }
      setShowClimateSelector(false);
    } catch (err) {
      console.warn('City weather fetch failed:', err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleSelectSimulatedCondition = (preset: (typeof CLIMATE_SIMULATION_PRESETS)[0]) => {
    if (preset?.data) {
      setWeather(preset.data);
      safeSetStorage('vocalis_weather_data', JSON.stringify(preset.data));
    }
    setShowClimateSelector(false);
  };

  const getTipIcon = (iconName: string = '') => {
    switch (iconName) {
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'Apple':
        return <Apple className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'Wind':
        return <Wind className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-amber-500 fill-amber-400" />;
      case 'HeartPulse':
        return <HeartPulse className="w-5 h-5 text-rose-500 dark:text-rose-400" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default:
        return <Lightbulb className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
    }
  };

  const getClimateBadgeStyle = (cond: WeatherData['condition']) => {
    switch (cond) {
      case 'dry':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800';
      case 'cold':
        return 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800';
      case 'hot':
        return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800';
      default:
        return 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-200 dark:border-teal-800';
    }
  };

  return (
    <div className="bg-gradient-to-br from-teal-50/80 via-white to-sky-50/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-teal-950/40 rounded-3xl border border-teal-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs relative overflow-hidden transition-all">
      {/* Decorative background watermark */}
      <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-teal-500/5 dark:from-teal-400/5 to-transparent pointer-events-none" />

      {/* TOP BAR: Header, Mode Selector & Weather/Frequency Pill */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-teal-100 dark:border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-teal-600/30">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                Prescrição Inteligente
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Conselho Fonoaudiológico do Dia
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 font-display">
              Dica & Higiene Vocal Personalizada
            </h3>
          </div>
        </div>

        {/* Live Climate / Frequency Indicator Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Weather Widget Pill with trigger button */}
          <button
            type="button"
            onClick={() => setShowClimateSelector((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs hover:scale-102 cursor-pointer ${getClimateBadgeStyle(
              condition
            )}`}
            title="Clique para alterar cidade ou simular condições climáticas de fonação"
          >
            <CloudSun className="w-3.5 h-3.5 shrink-0" />
            <span>{displayCity}:</span>
            <span className="tabular-nums">{temperature}°C</span>
            <span>·</span>
            <span className="tabular-nums">{humidity}% UR</span>
            <SlidersHorizontal className="w-3 h-3 ml-1 opacity-70" />
          </button>

          {/* Usage Frequency Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
            <span>{stats?.streak_days || 0} dias ativos</span>
            {logs && logs[0]?.fatigue_after != null && (
              <>
                <span>·</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Fadiga pós: {logs[0].fatigue_after}/10
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CLIMATE SELECTOR & SIMULATOR ACCORDION */}
      {showClimateSelector && (
        <div className="my-4 p-4 rounded-2xl bg-white dark:bg-slate-800/95 border border-teal-200 dark:border-teal-900 shadow-md animate-in fade-in space-y-3 relative z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Configurar Clima & Simular Ambientes Vocais
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowClimateSelector(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            A temperatura e a umidade do ar influenciam diretamente a viscosidade do biofilme e a vibração das pregas vocais. Selecione sua cidade ou simule um ambiente:
          </p>

          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Simulação de Cenários Clínicos:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CLIMATE_SIMULATION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectSimulatedCondition(preset)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all hover:border-teal-500 cursor-pointer ${
                    condition === preset.data.condition
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-bold">{preset.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {preset.data.temperature}°C · {preset.data.relativeHumidity}% UR
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Capitais Brasileiras (Dados Open-Meteo em Tempo Real):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BRAZIL_CITY_PRESETS.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  disabled={loadingWeather}
                  onClick={() => handleSelectCity(city)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    (weather?.city || '').includes(city.name)
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {city.name} ({city.state})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE TABS SWITCHER */}
      <div className="flex items-center gap-1.5 pt-3 overflow-x-auto pb-1 text-xs font-bold relative z-10 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveMode('climate')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeMode === 'climate'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-white'
          }`}
        >
          <CloudSun className="w-3.5 h-3.5" />
          <span>Ajustada ao Clima ({temperature}°C / {humidity}%)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('frequency')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeMode === 'frequency'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Ajustada ao seu Treino ({stats?.streak_days || 0} dias)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('hydration')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeMode === 'hydration'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-white'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-sky-500" />
          <span>Monitor de Hidratação ({currentWaterMl}ml / {totalWaterGoalMl}ml)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('all')}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeMode === 'all'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Todas as Evidências ({ALL_VOCAL_TIPS.length})</span>
        </button>
      </div>

      {/* CONTENT AREA: HYDRATION TRACKER PANEL */}
      {activeMode === 'hydration' ? (
        <div className="mt-4 p-5 rounded-2xl bg-white/95 dark:bg-slate-800/90 border border-sky-200 dark:border-sky-900 shadow-xs space-y-4 relative z-10 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                  Hidratação Sistêmica Dinâmica
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Meta calculada com base climática ({weather?.conditionLabel || 'Condição Apoiada'})
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display mt-1">
                Meta Hídrica Vocal de Hoje: {totalWaterGoalMl} ml
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
                A hidratação reduz a pressão de limiar de fonação (PTP). Em dias de ar seco ou calor, adicionamos automaticamente +{climateBonus}ml à sua meta para compensar as perdas respiratórias.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDrinkWater}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 hover:scale-102 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Bebi 1 Copo (+250ml)</span>
              </button>

              {glassesDrank > 0 && (
                <button
                  type="button"
                  onClick={handleResetWater}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                  title="Reiniciar contagem de hoje"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Water progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-500" />
                <span>{currentWaterMl} ml consumidos ({glassesDrank} copos)</span>
              </span>
              <span className="text-sky-700 dark:text-sky-300 font-bold">{hydrationPercent}% da meta</span>
            </div>

            <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-600">
              <div
                style={{ width: `${hydrationPercent}%` }}
                className="h-full bg-gradient-to-r from-sky-400 to-teal-500 rounded-full transition-all duration-500"
              />
            </div>

            {justDrank && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>+250ml registrados! A lâmina própria agradece a hidratação constante.</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-800 dark:text-slate-200 font-bold">Pequenos Goles</strong>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Evite beber 500ml de uma só vez. A absorção celular laríngea é otimizada em goles de 150ml a cada hora.
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-start gap-2">
              <Thermometer className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-800 dark:text-slate-200 font-bold">Temperatura Ambiente</strong>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Água muito gelada logo antes de fonar provoca vasoconstrição transitória das pregas vocais.
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-start gap-2">
              <Droplets className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-800 dark:text-slate-200 font-bold">Hidratação Tópica</strong>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  A água bebida hidrata o corpo; para hidratar diretamente as pregas vocais, faça inalação com soro 0.9%.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CONTENT AREA: TIP DETAILS (CLIMATE / FREQUENCY / ALL) */
        <div className="pt-4 relative z-10 space-y-3">
          {/* Why this tip was picked */}
          {activeMode !== 'all' && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-bold text-[11px]">
                {contextualRecommendation?.reasonBadge || 'Conselho Fonoaudiológico'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {contextualRecommendation?.reasonDetail || 'Higiene e biomecânica para proteção da voz.'}
              </span>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-4xl">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-teal-100 dark:border-slate-700 shrink-0 mt-0.5">
                {getTipIcon(currentTip?.iconName || 'Lightbulb')}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                    {currentTip?.category || 'Higiene Vocal'}
                  </span>

                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{currentTip?.benefitTag || 'Condicionamento & Saúde'}</span>
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                  {currentTip?.title || 'Cuidados Diários com a Saúde Vocal'}
                </h4>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {currentTip?.summary || 'Orientações fonoaudiológicas para manter a qualidade vocal e prevenir a fadiga.'}
                </p>

                {/* Practical Action Box */}
                <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-slate-800/95 border border-teal-200/90 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2.5 shadow-2xs">
                  <span className="font-bold text-teal-800 dark:text-teal-400 shrink-0 uppercase tracking-wider text-[11px] pt-0.5">
                    Ação Prática:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 leading-normal font-medium">
                    {currentTip?.practicalAction || 'Mantenha hidratação constante e pratique seus exercícios prescritos.'}
                  </span>
                </div>

                {/* Scientific evidence citation */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <BookOpen className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span className="italic font-medium">
                    Evidência Científica Fonoaudiológica: {currentTip?.scientificSource || 'Diretrizes Clínicas de Fonoaudiologia'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual navigation arrows when in 'all' mode or browsing */}
            <div className="flex md:flex-col items-center justify-between md:justify-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-teal-100 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                {activeMode === 'all'
                  ? `${(Math.abs(manualIndex) % ALL_VOCAL_TIPS.length) + 1} de ${ALL_VOCAL_TIPS.length}`
                  : 'Dica Selecionada'}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('all');
                    handlePrevTip();
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                  title="Dica anterior"
                  aria-label="Dica anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMode('all');
                    handleNextTip();
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                  title="Próxima evidência científica"
                  aria-label="Próxima evidência"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
