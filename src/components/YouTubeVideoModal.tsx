import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Edit2,
  Check,
  AlertCircle,
  Video,
  Save,
  Trash2
} from 'lucide-react';
import { Exercise } from '../types';
import { getYouTubeEmbedUrl, isValidYouTubeUrl, normalizeYouTubeUrl } from '../utils/youtube';
import { api } from '../services/api';

interface YouTubeVideoModalProps {
  exercise: Exercise;
  onClose: () => void;
  onStartExercise?: (exercise: Exercise) => void;
  onExerciseUpdated?: (updated: Exercise) => void;
}

export const YouTubeVideoModal: React.FC<YouTubeVideoModalProps> = ({
  exercise: initialExercise,
  onClose,
  onStartExercise,
  onExerciseUpdated,
}) => {
  const [currentExercise, setCurrentExercise] = useState<Exercise>(initialExercise);
  const [isEditingLink, setIsEditingLink] = useState<boolean>(!initialExercise.video_url);
  const [inputUrl, setInputUrl] = useState<string>(initialExercise.video_url || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCurrentExercise(initialExercise);
    setInputUrl(initialExercise.video_url || '');
    setIsEditingLink(!initialExercise.video_url);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialExercise]);

  const embedUrl = getYouTubeEmbedUrl(currentExercise.video_url);
  const previewEmbedUrl = getYouTubeEmbedUrl(inputUrl);
  const isInputValid = !inputUrl.trim() || isValidYouTubeUrl(inputUrl);

  const handleSaveVideoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();

    if (trimmed && !isValidYouTubeUrl(trimmed)) {
      setErrorMsg('Link não reconhecido. Use formatos como https://www.youtube.com/watch?v=... ou https://youtu.be/...');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      const normalized = trimmed ? normalizeYouTubeUrl(trimmed) || trimmed : null;

      await api.updateExercise(currentExercise.id, {
        video_url: normalized ?? '',
      });

      const updated: Exercise = {
        ...currentExercise,
        video_url: normalized || undefined,
      };

      setCurrentExercise(updated);
      setIsEditingLink(false);
      setSuccessMsg(normalized ? 'Link do YouTube salvo com sucesso!' : 'Vídeo removido com sucesso.');
      setTimeout(() => setSuccessMsg(null), 3500);

      if (onExerciseUpdated) {
        onExerciseUpdated(updated);
      }
    } catch (err: any) {
      console.error('Falha ao salvar link do YouTube:', err);
      setErrorMsg(err.message || 'Erro ao salvar link do vídeo no banco SQLite.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveVideo = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);

      await api.updateExercise(currentExercise.id, {
        video_url: '' as any,
      });

      const updated: Exercise = {
        ...currentExercise,
        video_url: undefined,
      };

      setCurrentExercise(updated);
      setInputUrl('');
      setIsEditingLink(true);
      setSuccessMsg('Link de vídeo removido.');
      setTimeout(() => setSuccessMsg(null), 3000);

      if (onExerciseUpdated) {
        onExerciseUpdated(updated);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao remover link de vídeo.');
    } finally {
      setIsSaving(false);
    }
  };

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
                {currentExercise.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsEditingLink((prev) => !prev)}
              className="p-1.5 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1"
              title={isEditingLink ? 'Cancelar Edição do Link' : 'Editar Link do YouTube'}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEditingLink ? 'Cancelar' : 'Alterar Link'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success / Error Notification Bar */}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Video Player or Link Editor */}
        {isEditingLink ? (
          <div className="p-5 bg-slate-950 text-white space-y-3.5">
            <form onSubmit={handleSaveVideoUrl} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4" />
                  <span>Vincular Link do Vídeo no YouTube</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Aceita youtube.com, youtu.be, shorts ou lives
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Ex: https://www.youtube.com/watch?v=0h9Vp1Xb1l8"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="submit"
                  disabled={isSaving || (inputUrl.trim() !== '' && !isInputValid)}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Link'}</span>
                </button>
                {currentExercise.video_url && (
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    disabled={isSaving}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-400 transition-colors"
                    title="Remover vídeo deste exercício"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Instant Live Preview inside the Editor */}
              {inputUrl.trim() && (
                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Pré-visualização do Vídeo:
                  </span>
                  {previewEmbedUrl ? (
                    <div className="aspect-video w-full max-h-48 rounded-xl overflow-hidden border border-slate-800 bg-black">
                      <iframe
                        src={previewEmbedUrl}
                        title="Prévia do YouTube"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Formato de link não reconhecido. Certifique-se de colar a URL do YouTube.</span>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        ) : (
          <div className="relative aspect-video w-full bg-slate-950">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={`Demonstração de ${currentExercise.title}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <Play className="w-12 h-12 text-slate-600 mb-1" />
                <p className="text-sm font-semibold text-slate-200">Vídeo demonstrativo não configurado</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Adicione um vídeo de demonstração do YouTube para que os pacientes vejam como executar a postura e ressonância vocal corretas.
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditingLink(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Vincular Vídeo Agora</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Clinical Info & Steps */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300">
                Prescrição: <strong>{currentExercise.category}</strong> · Foco: <strong>{currentExercise.target_range}</strong>
              </span>
            </div>
            {currentExercise.video_url && (
              <a
                href={currentExercise.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Abrir no YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Como Executar Corretamente (Passo a Passo Clínico)
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {currentExercise.instructions && currentExercise.instructions.length > 0 ? (
                currentExercise.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">{currentExercise.description}</p>
              )}
            </div>
          </div>

          {currentExercise.caution_tips && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
              <strong>Orientação da Fono: </strong>
              <span>{currentExercise.caution_tips}</span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {currentExercise.video_url ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Vídeo ativo e sincronizado no SQLite</span>
              </span>
            ) : (
              <span>Sem vídeo demonstrativo vinculado</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
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
                  onStartExercise(currentExercise);
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
    </div>
  );
};
