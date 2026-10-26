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
  Check
} from 'lucide-react';
import { Exercise } from '../types';

interface ExerciseCatalogProps {
  exercises: Exercise[];
  onStartExercise: (exercise: Exercise) => void;
  onOpenVault: () => void;
}

const CATEGORIES = [
  'Todos',
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
  onStartExercise,
  onOpenVault,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedExerciseForTips, setSelectedExerciseForTips] = useState<Exercise | null>(null);

  const filteredExercises =
    selectedCategory === 'Todos'
      ? exercises
      : exercises.filter((ex) => ex.category === selectedCategory);

  const getExerciseIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wind':
        return <Wind className="w-5 h-5 text-teal-600" />;
      case 'Waves':
        return <Waves className="w-5 h-5 text-sky-600" />;
      case 'Timer':
        return <Timer className="w-5 h-5 text-amber-600" />;
      case 'Smile':
        return <Smile className="w-5 h-5 text-indigo-600" />;
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-purple-600" />;
      case 'Feather':
        return <Feather className="w-5 h-5 text-emerald-600" />;
      case 'Moon':
        return <Moon className="w-5 h-5 text-slate-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-teal-600" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Visual Clinical Guide Hero Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
              <span className="w-2 h-2 rounded-full bg-teal-600 inline-block"></span>
              <span>Prescrição Fonoaudiológica Baseada em Evidências</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 font-display">
              Rotina Guiada de Reabilitação & Condicionamento Vocal
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Exercícios fonoaudiológicos personalizados para redução de fenda glótica, equilíbrio acústico e fortalecimento da musculatura laríngea sem sobrecarga vocal.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Dados de prática 100% criptografados</span>
              </div>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <div className="flex items-center gap-1.5 font-medium">
                <Volume2 className="w-4 h-4 text-teal-600" />
                <span>Feedback de afinação em tempo real</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-4/3 bg-slate-100">
              <img
                src="/src/assets/images/vocal_anatomy_guide_1793024499378.jpg"
                alt="Diagrama Anatômico das Pregas Vocais e Ressonadores"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-4">
                <div className="text-white text-xs">
                  <div className="font-bold">Mecanismo de Ressonância & Fonação</div>
                  <div className="text-slate-200 text-[11px]">Ajuste do trato vocal semiocluído e suporte subglótico</div>
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
            className={`px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredExercises.map((exercise) => {
          return (
            <div
              key={exercise.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header of Card: Icon & Category */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
                    {getExerciseIcon(exercise.icon_name)}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                      {exercise.category}
                    </span>
                  </div>
                </div>

                {/* Title & Target Range */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-display">
                  {exercise.title}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">
                  {exercise.target_range}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                  {exercise.description}
                </p>

                {/* Fonoaudiological Benefits Callout */}
                <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700">
                  <strong className="text-slate-900 block mb-0.5 font-semibold">
                    Benefício Terapêutico:
                  </strong>
                  <span className="line-clamp-2 text-slate-600 leading-normal">
                    {exercise.benefits}
                  </span>
                </div>
              </div>

              {/* Footer with Metrics & Action Button */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 tabular-nums">
                  <span>{exercise.default_reps} séries</span>
                  <span className="mx-1">·</span>
                  <span>{exercise.default_duration_sec}s</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedExerciseForTips(exercise)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Ver Orientações & Cuidados"
                    aria-label="Ver Orientações"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onStartExercise(exercise)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Iniciar Treino</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal with Clinical Guidance & Instructions */}
      {selectedExerciseForTips && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                  {selectedExerciseForTips.category}
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                  {selectedExerciseForTips.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExerciseForTips(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Passo a Passo Fonoaudiológico:
              </h4>
              <ol className="space-y-2 text-xs text-slate-600">
                {selectedExerciseForTips.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {selectedExerciseForTips.caution_tips && (
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/70 text-xs text-amber-900">
                <strong>Orientações de Cuidado: </strong>
                <span>{selectedExerciseForTips.caution_tips}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedExerciseForTips(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  const ex = selectedExerciseForTips;
                  setSelectedExerciseForTips(null);
                  onStartExercise(ex);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Começar Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
