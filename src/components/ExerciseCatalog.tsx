import React, { useState } from 'react';
import {
  Wind,
  Waves,
  Timer,
  Smile,
  TrendingUp,
  Feather,
  Moon,
  Sparkles,
  Info,
  Volume2,
  PlayCircle,
  HelpCircle,
  ShieldCheck,
  Check,
  Lock,
  Star,
  Trophy,
  Zap,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { Exercise, User } from '../types';
import { DailyVocalTip } from './DailyVocalTip';
import { ActivationCodePrompt } from './ActivationCodePrompt';
import vocalAnatomyImg from '../assets/images/vocal_anatomy_guide_1793024499378.jpg';

interface ExerciseCatalogProps {
  exercises: Exercise[];
  patientLevel: number;
  isActivated?: boolean;
  currentUser?: User | null;
  onStartExercise: (exercise: Exercise) => void;
  onOpenVault: () => void;
  onActivateUser?: (user: User) => void;
  onOpenTherapistPanel?: () => void;
}

const CATEGORIES = [
  'Todos',
  'Desafios de Nível',
  'Aquecimento & Soltura',
  'Trato Vocal Semiocluído',
  'Coordenação Pneumofônica',
  'Ressonância & Foco Facial',
  'Flexibilidade & Extensão',
  'Relaxamento Laríngeo',
  'Desaquecimento Vocal',
];

export const ExerciseCatalog: React.FC<ExerciseCatalogProps> = ({
  exercises,
  patientLevel,
  isActivated = true,
  currentUser,
  onStartExercise,
  onOpenVault,
  onActivateUser,
  onOpenTherapistPanel,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedExerciseForTips, setSelectedExerciseForTips] = useState<Exercise | null>(null);
  const [showActivationModal, setShowActivationModal] = useState<boolean>(false);

  const filteredExercises = exercises.filter((ex) => {
    if (selectedCategory === 'Todos') return true;
    if (selectedCategory === 'Desafios de Nível') return ex.is_challenge;
    return ex.category === selectedCategory;
  });

  const getExerciseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wind':
        return <Wind className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'Waves':
        return <Waves className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case 'Timer':
        return <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'Smile':
        return <Smile className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'Feather':
        return <Feather className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'Moon':
        return <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
      case 'Award':
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    }
  };

  const handleExerciseClick = (exercise: Exercise) => {
    if (!isActivated) {
      setShowActivationModal(true);
      return;
    }
    onStartExercise(exercise);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Componente Dica do Dia Baseada em Evidências Científicas */}
      <DailyVocalTip />

      {/* 2. Banner de Ativação caso o paciente ainda não tenha inserido o código */}
      {!isActivated && currentUser && (
        <ActivationCodePrompt
          user={currentUser}
          onActivated={(updated) => {
            setShowActivationModal(false);
            if (onActivateUser) onActivateUser(updated);
          }}
          onOpenTherapistPanel={onOpenTherapistPanel}
        />
      )}

      {/* Visual Clinical Guide Hero Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm overflow-hidden transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 inline-block"></span>
              <span>Prescrição Fonoaudiológica & Desafios por Nível</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-display">
              Rotina de Reabilitação & Condicionamento Vocal
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:base leading-relaxed">
              Pratique exercícios e enfrente desafios fonoaudiológicos para subir de nível vocal, acumular pontos XP e fortalecer as pregas vocais com apoio acústico e feedback de afinação.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-medium">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>Ganhe até 120 XP por sessão concluída</span>
              </div>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Dados de prática criptografados no SQLite</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm aspect-4/3 bg-slate-100 dark:bg-slate-800">
              <img
                src={vocalAnatomyImg}
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.src.includes('/images/')) {
                    target.src = '/images/vocal_anatomy_guide_1793024499378.jpg';
                  }
                }}
                alt="Diagrama Anatômico das Pregas Vocais e Ressonadores"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-4">
                <div className="text-white text-xs">
                  <div className="font-bold">Mecanismo de Ressonância & Fonação</div>
                  <div className="text-slate-200 text-[11px]">
                    Seu Nível Atual: Nível {patientLevel} · Desbloqueando novas técnicas
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Segmented Control Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 ${
              selectedCategory === cat
                ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800'
            }`}
          >
            {cat === 'Desafios de Nível' && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Exercises & Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExercises.map((exercise) => {
          const isLevelLocked = exercise.min_level > patientLevel;

          return (
            <div
              key={exercise.id}
              className={`rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between group relative overflow-hidden ${
                isLevelLocked
                  ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/80 opacity-80'
                  : exercise.is_challenge
                  ? 'bg-gradient-to-b from-amber-50/40 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-200/90 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md'
              }`}
            >
              <div>
                {/* Header of Card: Icon & Category & Gamification XP */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                      exercise.is_challenge
                        ? 'bg-amber-100/70 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700'
                    }`}
                  >
                    {getExerciseIcon(exercise.icon_name)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {exercise.is_challenge && (
                      <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Desafio</span>
                      </span>
                    )}

                    <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-100 dark:border-teal-800 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                      <span>+{exercise.xp_reward || 45} XP</span>
                    </span>
                  </div>
                </div>

                {/* Title & Target Range */}
                <div className="flex items-start gap-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors font-display">
                    {exercise.title}
                  </h3>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                  <span>{exercise.target_range}</span>
                  {exercise.min_level > 1 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isLevelLocked ? 'text-amber-800 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Nível {exercise.min_level}+
                      </span>
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 line-clamp-2 leading-relaxed">
                  {exercise.description}
                </p>

                {/* Clinical Benefit Callout */}
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-slate-100 block mb-0.5 font-semibold">
                    Benefício Fonoaudiológico:
                  </strong>
                  <span className="line-clamp-2 text-slate-600 dark:text-slate-400 leading-normal">
                    {exercise.benefits}
                  </span>
                </div>
              </div>

              {/* Footer with Controls */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{exercise.default_reps} séries</span>
                  <span className="mx-1">·</span>
                  <span>{exercise.default_duration_sec}s</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedExerciseForTips(exercise)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Ver Orientações & Instruções"
                    aria-label="Ver Instruções"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {isLevelLocked ? (
                    <div
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-not-allowed"
                      title={`Desbloqueia no Nível ${exercise.min_level}`}
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Bloqueado (Nv. {exercise.min_level})</span>
                    </div>
                  ) : !isActivated ? (
                    <button
                      onClick={() => setShowActivationModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
                      title="Requer código da fonoaudióloga"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Ativar Código</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExerciseClick(exercise)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs ${
                        exercise.is_challenge
                          ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white'
                          : 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white'
                      }`}
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>{exercise.is_challenge ? 'Iniciar Desafio' : 'Iniciar Treino'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activation Modal barrier if clicked */}
      {showActivationModal && currentUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-xl w-full">
            <button
              onClick={() => setShowActivationModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 z-10 font-bold p-2"
            >
              ✕
            </button>
            <ActivationCodePrompt
              user={currentUser}
              onActivated={(updated) => {
                setShowActivationModal(false);
                if (onActivateUser) onActivateUser(updated);
              }}
              onOpenTherapistPanel={() => {
                setShowActivationModal(false);
                if (onOpenTherapistPanel) onOpenTherapistPanel();
              }}
            />
          </div>
        </div>
      )}

      {/* Modal with Clinical Guidance & Instructions */}
      {selectedExerciseForTips && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                    {selectedExerciseForTips.category}
                  </span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    +{selectedExerciseForTips.xp_reward} XP
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display mt-1">
                  {selectedExerciseForTips.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExerciseForTips(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2">
                Passo a Passo Fonoaudiológico:
              </h4>
              <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {selectedExerciseForTips.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {selectedExerciseForTips.caution_tips && (
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200/70 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <strong>Orientações de Cuidado: </strong>
                <span>{selectedExerciseForTips.caution_tips}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedExerciseForTips(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Fechar
              </button>
              {selectedExerciseForTips.min_level <= patientLevel ? (
                <button
                  onClick={() => {
                    const ex = selectedExerciseForTips;
                    setSelectedExerciseForTips(null);
                    handleExerciseClick(ex);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Começar Agora</span>
                </button>
              ) : (
                <span className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Desbloqueia no Nível {selectedExerciseForTips.min_level}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
