import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  PlusCircle,
  Copy,
  Check,
  Share2,
  Users,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  Trophy,
  Activity,
  FileText,
  AlertCircle,
  Video,
  Play,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Sliders,
  Flame,
  Volume2
} from 'lucide-react';
import { TherapistDashboardData, AccessCode, User, Exercise } from '../types';
import { api } from '../services/api';
import { TherapistExerciseModal } from './TherapistExerciseModal';
import { YouTubeVideoModal } from './YouTubeVideoModal';
import { isValidYouTubeUrl, getYouTubeThumbnailUrl } from '../utils/youtube';

interface TherapistDashboardProps {
  currentUser: User;
  onSwitchToPatientView?: () => void;
  onRefreshExercises?: () => void;
}

export const TherapistDashboard: React.FC<TherapistDashboardProps> = ({
  currentUser,
  onSwitchToPatientView,
  onRefreshExercises,
}) => {
  // Main sub-tabs for the dashboard
  const [activeTab, setActiveTab] = useState<'exercises' | 'patients'>('exercises');

  const [dashboardData, setDashboardData] = useState<TherapistDashboardData | null>(null);
  const [exercisesList, setExercisesList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingExercises, setLoadingExercises] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Exercise Filter & Search
  const [exerciseSearch, setExerciseSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Exercise Modals
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState<boolean>(false);
  const [selectedExerciseForEdit, setSelectedExerciseForEdit] = useState<Exercise | null>(null);
  const [selectedExerciseForVideo, setSelectedExerciseForVideo] = useState<Exercise | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);

  // New Code Form
  const [patientName, setPatientName] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [justGeneratedCode, setJustGeneratedCode] = useState<AccessCode | null>(null);

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getTherapistDashboard(currentUser.id || 1);
      setDashboardData(data);
    } catch (err: any) {
      setErrorMsg('Falha ao sincronizar dados do painel fonoaudiológico.');
    } finally {
      setLoading(false);
    }
  };

  const loadExercises = async () => {
    try {
      setLoadingExercises(true);
      const list = await api.getExercises();
      setExercisesList(list);
    } catch (err: any) {
      console.warn('Erro ao carregar lista de exercícios:', err);
    } finally {
      setLoadingExercises(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadExercises();
  }, [currentUser.id]);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setErrorMsg(null);
      const res = await api.generateAccessCode({
        therapist_id: currentUser.id || 1,
        patient_name: patientName.trim() || undefined,
        patient_email: patientEmail.trim() || undefined,
      });

      setJustGeneratedCode(res.code);
      setPatientName('');
      setPatientEmail('');
      await loadDashboard();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar código para o paciente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(codeStr);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const getWhatsAppShareUrl = (codeStr: string, name?: string) => {
    const text = encodeURIComponent(
      `Olá${name ? ` ${name}` : ''}! Aqui está o seu código de acesso para os exercícios vocais no aplicativo Vocalis: *${codeStr}*.\n\nBaixe ou abra o app e digite o código na aba de exercícios para iniciar seu plano terapêutico prescrito!`
    );
    return `https://wa.me/?text=${text}`;
  };

  // Exercise Handlers
  const handleOpenCreateExercise = () => {
    setSelectedExerciseForEdit(null);
    setIsExerciseModalOpen(true);
  };

  const handleOpenEditExercise = (exercise: Exercise) => {
    setSelectedExerciseForEdit(exercise);
    setIsExerciseModalOpen(true);
  };

  const handleExerciseSaved = (savedExercise: Exercise) => {
    setIsExerciseModalOpen(false);
    setSelectedExerciseForEdit(null);
    setSuccessMsg(`Exercício "${savedExercise.title}" salvo com sucesso!`);
    setTimeout(() => setSuccessMsg(null), 4000);
    loadExercises();
    if (onRefreshExercises) onRefreshExercises();
  };

  const handleDeleteExercise = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja excluir o exercício "${title}"?`)) {
      return;
    }
    try {
      setDeletingExerciseId(id);
      await api.deleteExercise(id);
      setSuccessMsg(`Exercício "${title}" excluído do catálogo.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadExercises();
      if (onRefreshExercises) onRefreshExercises();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir exercício.');
    } finally {
      setDeletingExerciseId(null);
    }
  };

  // Categories list derived from exercises
  const categories = [
    'Todos',
    ...Array.from(new Set(exercisesList.map((e) => e.category).filter(Boolean)))
  ];

  // Filtered exercises
  const filteredExercises = exercisesList.filter((ex) => {
    const matchesCategory = selectedCategory === 'Todos' || ex.category === selectedCategory;
    const matchesSearch =
      exerciseSearch === '' ||
      ex.title.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.description.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.benefits.toLowerCase().includes(exerciseSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const exercisesWithVideo = exercisesList.filter((e) => isValidYouTubeUrl(e.video_url)).length;
  const customExercisesCount = exercisesList.filter((e) => e.is_custom).length;

  return (
    <div className="space-y-8 pb-16">
      {/* Therapist Profile & Stats Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
              {currentUser.name.charAt(0) || 'F'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
                  Fonoaudióloga Responsável
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  CRFa 2-19842
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-display">
                {currentUser.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>{currentUser.email}</span>
                </span>
                {currentUser.phone && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>{currentUser.phone}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                loadDashboard();
                loadExercises();
              }}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Atualizar dados do banco SQLite"
            >
              <RefreshCw className={`w-4 h-4 ${loading || loadingExercises ? 'animate-spin' : ''}`} />
            </button>
            {onSwitchToPatientView && (
              <button
                onClick={onSwitchToPatientView}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-900 dark:text-teal-200 transition-colors"
              >
                Visualizar Área do Paciente
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs: Navigation between Exercises & Codes */}
        <div className="flex items-center gap-2 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('exercises')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'exercises'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Exercícios Vocais & Vídeos do YouTube</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'exercises'
                ? 'bg-teal-700/80 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {exercisesList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'patients'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Códigos de Acesso & Pacientes</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'patients'
                ? 'bg-teal-700/80 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {dashboardData?.active_patients || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: EXERCÍCIOS VOCAIS & VÍDEOS DO YOUTUBE (SOLICITAÇÃO PRINCIPAL)
      ========================================================================= */}
      {activeTab === 'exercises' && (
        <div className="space-y-6">
          {/* Exercises Header & Metrics */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-400 inline-block"></span>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                    Prescrição Clínica & Demonstrações Visuais
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-display">
                  Catálogo de Exercícios & Vídeos do YouTube
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Crie e gerencie sua lista de exercícios vocais. Cada exercício pode conter um link direto de vídeo do YouTube demonstrando passo a passo como realizar os movimentos fonoaudiológicos corretos.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateExercise}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 hover:shadow-lg transition-all shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Cadastrar Novo Exercício com Vídeo</span>
              </button>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-100/80 dark:border-teal-900/60">
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block mb-1">
                  Total no Catálogo
                </span>
                <div className="text-2xl font-black text-teal-900 dark:text-teal-100">
                  {exercisesList.length} exercícios
                </div>
                <span className="text-[11px] text-teal-700 dark:text-teal-400">Disponíveis para prática dos pacientes</span>
              </div>

              <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/40 border border-red-100/80 dark:border-red-900/60">
                <span className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider block mb-1">
                  Com Demonstração no YouTube
                </span>
                <div className="text-2xl font-black text-red-900 dark:text-red-100 flex items-center gap-2">
                  <span>{exercisesWithVideo}</span>
                  <span className="text-xs font-normal text-red-600 dark:text-red-400">
                    ({Math.round((exercisesWithVideo / (exercisesList.length || 1)) * 100)}%)
                  </span>
                </div>
                <span className="text-[11px] text-red-700 dark:text-red-400">Vídeos orientando como fazer cada exercício</span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/60">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block mb-1">
                  Prescrições Personalizadas
                </span>
                <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100">
                  {customExercisesCount} criados
                </div>
                <span className="text-[11px] text-indigo-700 dark:text-indigo-400">Criados por você no consultório</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Buscar exercício por nome, benefício ou técnica..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exercises Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredExercises.map((exercise) => {
              const hasVideo = isValidYouTubeUrl(exercise.video_url);
              const thumbnail = hasVideo ? getYouTubeThumbnailUrl(exercise.video_url) : null;

              return (
                <div
                  key={exercise.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {exercise.category}
                        </span>
                        {exercise.is_custom && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Prescrição da Fono
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Nv. {exercise.min_level}+
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExercise(exercise)}
                          className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar exercício e link do YouTube"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {exercise.is_custom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteExercise(exercise.id, exercise.title)}
                            disabled={deletingExerciseId === exercise.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors disabled:opacity-50"
                            title="Excluir exercício prescrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Target Range */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                        {exercise.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>{exercise.target_range}</span>
                        </span>
                        <span>·</span>
                        <span>{exercise.target_hz} Hz</span>
                      </div>
                    </div>

                    {/* Video Demonstration Feature Box */}
                    {hasVideo ? (
                      <div className="p-3 rounded-2xl bg-red-50/70 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt="Vídeo"
                              className="w-14 h-10 object-cover rounded-lg border border-red-200 dark:border-red-800 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                              <Video className="w-5 h-5" />
                            </div>
                          )}
                          <div className="truncate">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                              Vídeo do YouTube Vinculado
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                              Mostra a execução correta
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedExerciseForVideo(exercise)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                          title="Assistir demonstração no aplicativo"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Assistir</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Video className="w-4 h-4 text-slate-400" />
                          <span className="text-xs">Nenhum vídeo demonstrativo vinculado</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditExercise(exercise)}
                          className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Vídeo</span>
                        </button>
                      </div>
                    )}

                    {/* Description and Clinical Benefit */}
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {exercise.description}
                    </p>

                    {exercise.benefits && (
                      <div className="text-xs bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/80 text-slate-600 dark:text-slate-300">
                        <strong className="text-teal-700 dark:text-teal-400">Benefício Clínico: </strong>
                        <span>{exercise.benefits}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer: Dosage & Quick Edit */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                      <span><strong>{exercise.default_reps}</strong> séries</span>
                      <span>·</span>
                      <span><strong>{exercise.default_duration_sec}s</strong> duração</span>
                      <span>·</span>
                      <span className="text-teal-700 dark:text-teal-400 font-bold">+{exercise.xp_reward} XP</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditExercise(exercise)}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Configurar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredExercises.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Video className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nenhum exercício encontrado
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar os filtros ou cadastre um novo exercício vocal com vídeo do YouTube usando o botão acima.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateExercise}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Novo Exercício</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: CÓDIGOS DE ACESSO & PACIENTES VINCULADOS
      ========================================================================= */}
      {activeTab === 'patients' && (
        <div className="space-y-8">
          {/* Dashboard Metric Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/60">
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider block mb-1">
                Códigos Disponíveis
              </span>
              <div className="text-3xl font-black text-indigo-900 dark:text-indigo-100">
                {dashboardData?.available_codes || 0}
              </div>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400">Prontos para envio a novos pacientes</span>
            </div>

            <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100/80 dark:border-emerald-900/60">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block mb-1">
                Pacientes Ativos
              </span>
              <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100">
                {dashboardData?.active_patients || 0}
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Com prontuário criptografado em andamento</span>
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Total de Códigos Gerados
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {dashboardData?.total_codes || 0}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Histórico completo de prescrições</span>
            </div>
          </div>

          {/* SECTION: GERADOR DE CÓDIGO PARA O PACIENTE */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
            <div className="max-w-3xl space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
                  Gerar Código de Acesso para Paciente
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Crie um código de prescrição exclusivo. Ao inserir este código no aplicativo, o paciente tem o catálogo completo liberado, o prontuário criptografado vinculado ao seu CRM/CRFa e o progresso sincronizado com o SQLite.
              </p>
            </div>

            <form onSubmit={handleGenerateCode} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Paciente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Oliveira"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail do Paciente (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="carlos@email.com"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{generating ? 'Gerando...' : 'Gerar Código Exclusivo'}</span>
                </button>
              </div>
            </form>

            {/* Just Generated Highlight Card */}
            {justGeneratedCode && (
              <div className="mt-6 p-5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 animate-in fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                    <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    <span className="font-bold text-sm">Código Criado com Sucesso!</span>
                  </div>
                  <span className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                    {justGeneratedCode.patient_name || 'Paciente Geral'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-teal-100 dark:border-teal-900">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">
                      Código de Ativação do Paciente
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-teal-700 dark:text-teal-400">
                      {justGeneratedCode.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(justGeneratedCode.code)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      {copiedCode === justGeneratedCode.code ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <a
                      href={getWhatsAppShareUrl(justGeneratedCode.code, justGeneratedCode.patient_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Enviar no WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION: TABELA DE CÓDIGOS GERADOS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                Histórico de Códigos de Acesso Gerados
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {dashboardData?.codes?.length || 0} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 font-bold">Código</th>
                    <th className="py-3 px-4 font-bold">Paciente Prescrito</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Data de Criação</th>
                    <th className="py-3 px-4 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dashboardData?.codes && dashboardData.codes.length > 0 ? (
                    dashboardData.codes.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.code}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="font-semibold block">{item.patient_name || 'Paciente Geral'}</span>
                            {item.patient_email && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">{item.patient_email}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {item.is_used ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Utilizado</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800">
                              <span>Disponível</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                              title="Copiar código"
                            >
                              {copiedCode === item.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {!item.is_used && (
                              <a
                                href={getWhatsAppShareUrl(item.code, item.patient_name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors"
                                title="Compartilhar no WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        Nenhum código gerado ainda. Use o formulário acima para criar o primeiro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION: PACIENTES VINCULADOS & PRONTUÁRIOS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                  Pacientes com Acesso Liberado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acompanhamento de assiduidade, nível vocal e anotações clínicas
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData?.patients && dashboardData.patients.length > 0 ? (
                dashboardData.patients.map((pat) => (
                  <div
                    key={pat.id}
                    className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 hover:border-teal-300 dark:hover:border-teal-700 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{pat.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{pat.email}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-300 px-2.5 py-1 rounded-lg">
                        Código: {pat.activation_code || 'VOCA-ATIVO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Nível</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">Nv. {pat.level}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Experiência</span>
                        <span className="font-bold text-teal-700 dark:text-teal-400">{pat.xp} XP</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Sequência</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{pat.streak} dias</span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-700 dark:text-slate-200">Diagnóstico: </strong>
                        <span>{pat.diagnosis}</span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 italic text-[11px] bg-slate-100/70 dark:bg-slate-800/80 p-2 rounded-lg">
                        "{pat.clinical_notes}"
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Nenhum paciente ativado no momento. Envie um código de acesso para seu primeiro paciente!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Exercício com Link do YouTube */}
      {isExerciseModalOpen && (
        <TherapistExerciseModal
          currentUser={currentUser}
          exerciseToEdit={selectedExerciseForEdit}
          patientsList={dashboardData?.patients?.map((p) => ({ id: p.id, name: p.name })) || []}
          onClose={() => {
            setIsExerciseModalOpen(false);
            setSelectedExerciseForEdit(null);
          }}
          onSaved={handleExerciseSaved}
        />
      )}

      {/* Modal de Pré-visualização do Vídeo do YouTube */}
      {selectedExerciseForVideo && (
        <YouTubeVideoModal
          exercise={selectedExerciseForVideo}
          onClose={() => setSelectedExerciseForVideo(null)}
        />
      )}
    </div>
  );
};
