import React from 'react';
import { X, Play, ExternalLink, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { Exercise } from '../types';
import { getYouTubeEmbedUrl } from '../utils/youtube';

interface YouTubeVideoModalProps {
  exercise: Exercise;
  onClose: () => void;
  onStartExercise?: (exercise: Exercise) => void;
}

export const YouTubeVideoModal: React.FC<YouTubeVideoModalProps> = ({
  exercise,
  onClose,
  onStartExercise,
}) => {
  const embedUrl = getYouTubeEmbedUrl(exercise.video_url);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                Demonstração Prática em Vídeo
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 font-display line-clamp-1">
                {exercise.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Box */}
        <div className="relative aspect-video w-full bg-slate-950">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`Demonstração de ${exercise.title}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
              <Play className="w-12 h-12 text-slate-600 mb-1" />
              <p className="text-sm font-semibold text-slate-200">Vídeo demonstrativo não configurado</p>
              <p className="text-xs text-slate-400 max-w-sm">
                A fonoaudióloga responsável pode adicionar o link do YouTube diretamente pelo Painel Fonoaudiológico.
              </p>
            </div>
          )}
        </div>

        {/* Clinical Info & Steps */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                Prescrição: <strong>{exercise.category}</strong> · Foco: <strong>{exercise.target_range}</strong>
              </span>
            </div>
            {exercise.video_url && (
              <a
                href={exercise.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Assistir no YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Como Executar Corretamente (Passo a Passo Clínico)
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {exercise.instructions && exercise.instructions.length > 0 ? (
                exercise.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">{exercise.description}</p>
              )}
            </div>
          </div>

          {exercise.caution_tips && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
              <strong>Orientação da Fono: </strong>
              <span>{exercise.caution_tips}</span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Fechar
          </button>
          {onStartExercise && (
            <button
              onClick={() => {
                onClose();
                onStartExercise(exercise);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Praticar Exercício Agora</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
