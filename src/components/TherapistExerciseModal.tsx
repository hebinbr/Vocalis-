import React, { useState } from 'react';
import {
  X,
  Play,
  Plus,
  Trash2,
  Video,
  Sparkles,
  ShieldCheck,
  Check,
  AlertCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Exercise, User } from '../types';
import { api } from '../services/api';
import { getYouTubeEmbedUrl, isValidYouTubeUrl } from '../utils/youtube';

interface TherapistExerciseModalProps {
  currentUser: User;
  exerciseToEdit?: Exercise | null;
  patientsList?: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSaved: (exercise: Exercise) => void;
}

const CATEGORY_OPTIONS = [
  'Trato Vocal Semiocluído',
  'Aquecimento & Soltura',
  'Coordenação Pneumofônica',
  'Ressonância & Foco Facial',
  'Flexibilidade & Extensão',
  'Relaxamento Laríngeo',
  'Desaquecimento Vocal',
  'Desafios de Nível'
];

export const TherapistExerciseModal: React.FC<TherapistExerciseModalProps> = ({
  currentUser,
  exerciseToEdit,
  patientsList = [],
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(exerciseToEdit);

  const [title, setTitle] = useState(exerciseToEdit?.title || '');
  const [category, setCategory] = useState(exerciseToEdit?.category || 'Trato Vocal Semiocluído');
  const [targetRange, setTargetRange] = useState(exerciseToEdit?.target_range || 'Frequência Confortável');
  const [description, setDescription] = useState(exerciseToEdit?.description || '');
  const [benefits, setBenefits] = useState(exerciseToEdit?.benefits || '');
  const [videoUrl, setVideoUrl] = useState(exerciseToEdit?.video_url || '');
  const [instructions, setInstructions] = useState<string[]>(
    exerciseToEdit?.instructions && exerciseToEdit.instructions.length > 0
      ? exerciseToEdit.instructions
      : [
          'Posicione-se confortavelmente com a postura ereta e ombros relaxados.',
          'Assista à demonstração em vídeo para verificar a postura e emissão correta.',
          'Execute a fonação suave sem forçar a musculatura do pescoço.'
        ]
  );
  const [defaultReps, setDefaultReps] = useState<number>(exerciseToEdit?.default_reps || 4);
  const [defaultDurationSec, setDefaultDurationSec] = useState<number>(exerciseToEdit?.default_duration_sec || 45);
  const [targetHz, setTargetHz] = useState<number>(exerciseToEdit?.target_hz || 220);
  const [cautionTips, setCautionTips] = useState(exerciseToEdit?.caution_tips || 'Se sentir coceira, pigarro ou esforço excessivo, pare e tome um gole de água.');
  const [minLevel, setMinLevel] = useState<number>(exerciseToEdit?.min_level || 1);
  const [patientId, setPatientId] = useState<number | string>(exerciseToEdit?.patient_id || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live YouTube Embed Preview
  const embedPreviewUrl = getYouTubeEmbedUrl(videoUrl);
  const isVideoValid = !videoUrl || isValidYouTubeUrl(videoUrl);

  const handleAddInstructionStep = () => {
    setInstructions([...instructions, '']);
  };

  const handleRemoveInstructionStep = (index: number) => {
    if (instructions.length <= 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, val: string) => {
    const updated = [...instructions];
    updated[index] = val;
    setInstructions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Informe o título do exercício.');
      return;
    }

    if (videoUrl.trim() && !isValidYouTubeUrl(videoUrl)) {
      setErrorMsg('Por favor, informe um link válido do YouTube (ex: https://www.youtube.com/watch?v=... ou https://youtu.be/...).');
      return;
    }

    const filteredInstructions = instructions.map((s) => s.trim()).filter(Boolean);
    if (filteredInstructions.length === 0) {
      setErrorMsg('Adicione pelo menos um passo de instrução.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        title: title.trim(),
        category,
        target_range: targetRange.trim() || 'Frequência Confortável',
        description: description.trim() || 'Exercício prescrito pela fonoaudióloga.',
        benefits: benefits.trim() || 'Melhora da eficiência vocal e equilíbrio da musculatura glótica.',
        instructions: filteredInstructions,
        default_reps: Number(defaultReps),
        default_duration_sec: Number(defaultDurationSec),
        target_hz: Number(targetHz),
        caution_tips: cautionTips.trim(),
        min_level: Number(minLevel),
        xp_reward: 50,
        video_url: videoUrl.trim() || undefined,
        patient_id: patientId ? Number(patientId) : undefined,
        therapist_id: currentUser.id || 1,
        created_by_name: currentUser.name || 'Dra. Beatriz Menezes',
      };

      if (isEditing && exerciseToEdit) {
        await api.updateExercise(exerciseToEdit.id, payload);
        onSaved({
          ...exerciseToEdit,
          ...payload,
        } as Exercise);
      } else {
        const res = await api.createExercise(payload);
        onSaved(res.exercise);
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar exercício vocal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                {isEditing ? 'Editar Exercício & Link de Vídeo' : 'Cadastrar Exercício com Vídeo no YouTube'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prescrição clínica com demonstração visual para seus pacientes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Exercise Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Nome do Exercício Vocal *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Trilo com Tubo de Ressonância"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Categoria Clínica
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs sm:text-sm"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* YouTube Video URL Field & Instant Preview */}
          <div className="bg-red-50/50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
                <Play className="w-3.5 h-3.5 fill-current text-red-600 dark:text-red-400" />
                <span>Link do Vídeo no YouTube (Demonstração de como fazer)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Opcional, mas altamente recomendado
              </span>
            </div>

            <div className="relative">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 text-xs sm:text-sm ${
                  videoUrl && !isVideoValid
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-red-500'
                }`}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cole o link do seu próprio vídeo gravado no YouTube ou de um tutorial fonoaudiológico de referência. O paciente poderá assistir antes e durante a prática do exercício.
            </p>

            {/* Live Video Preview Box */}
            {videoUrl && (
              <div className="mt-2 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Prévia do Player do YouTube:
                </span>
                {embedPreviewUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-sm bg-black">
                    <iframe
                      src={embedPreviewUrl}
                      title="Prévia do YouTube"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Link do YouTube não reconhecido. Verifique se o endereço está no formato correto.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description & Clinical Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Descrição Curta
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Emissão sustentada com resistência anterior..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Objetivo & Benefício Clínico
              </label>
              <textarea
                rows={2}
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="Ex: Redução da tensão cordal e equilíbrio da pressão subglótica..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
              />
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Instruções Passo a Passo para o Paciente
              </label>
              <button
                type="button"
                onClick={handleAddInstructionStep}
                className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Passo</span>
              </button>
            </div>

            <div className="space-y-2">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 text-xs">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleInstructionChange(idx, e.target.value)}
                    placeholder={`Instrução do passo ${idx + 1}`}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInstructionStep(idx)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Remover passo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dosage & Target Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Séries / Reps
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={defaultReps}
                onChange={(e) => setDefaultReps(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Duração (segundos)
              </label>
              <input
                type="number"
                min={10}
                max={300}
                step={5}
                value={defaultDurationSec}
                onChange={(e) => setDefaultDurationSec(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Tom / Pitch (Hz)
              </label>
              <input
                type="number"
                min={60}
                max={600}
                step={5}
                value={targetHz}
                onChange={(e) => setTargetHz(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Nível Mínimo
              </label>
              <select
                value={minLevel}
                onChange={(e) => setMinLevel(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value={1}>Nível 1 (Iniciante)</option>
                <option value={2}>Nível 2 (Ressonador)</option>
                <option value={3}>Nível 3 (Articulador)</option>
                <option value={4}>Nível 4 (Mestre)</option>
                <option value={5}>Nível 5 (Voz de Ouro)</option>
              </select>
            </div>
          </div>

          {/* Caution Tips & Target Patient Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Cuidados Clínicos / Contraindicações
              </label>
              <input
                type="text"
                value={cautionTips}
                onChange={(e) => setCautionTips(e.target.value)}
                placeholder="Ex: Não force o volume. Mantenha os lábios frouxos."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Destinatário da Prescrição
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Geral (Disponível no catálogo para todos os pacientes)</option>
                {patientsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    Exclusivo para: {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Salvando no SQLite...' : isEditing ? 'Atualizar Exercício' : 'Salvar e Prescrever Exercício'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
