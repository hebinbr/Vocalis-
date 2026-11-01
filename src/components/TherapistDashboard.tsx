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
  Volume2,
  CheckCheck,
  CalendarDays,
  HeartPulse,
  Clock,
  Eye
} from 'lucide-react';
import { TherapistDashboardData, AccessCode, User, Exercise, VocalSymptomEntry } from '../types';
import { api } from '../services/api';
import { TherapistExerciseModal } from './TherapistExerciseModal';
import { YouTubeVideoModal } from './YouTubeVideoModal';
import { isValidYouTubeUrl, getYouTubeThumbnailUrl } from '../utils/youtube';

interface TherapistDashboardProps {
  currentUser: User;
  symptoms?: VocalSymptomEntry[];
  onRefreshSymptoms?: () => void;
  onSwitchToPatientView?: () => void;
  onRefreshExercises?: () => void;
}

export const TherapistDashboard: React.FC<TherapistDashboardProps> = ({
  currentUser,
  symptoms: propSymptoms,
  onRefreshSymptoms,
  onSwitchToPatientView,
  onRefreshExercises,
}) => {
  // Main sub-tabs for the dashboard
  const [activeTab, setActiveTab] = useState<'exercises' | 'patients' | 'symptoms'>('exercises');

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

  // Symptom Diary State
  const [symptomsList, setSymptomsList] = useState<VocalSymptomEntry[]>([]);
  const [loadingSymptoms, setLoadingSymptoms] = useState<boolean>(false);
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>('todos');
  const [symptomSearch, setSymptomSearch] = useState<string>('');
  const [reviewedMap, setReviewedMap] = useState<Record<number, { reviewedAt: string }>>(() => {
    try {
      const stored = localStorage.getItem('vocalis_therapist_reviewed_symptoms');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

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

  const loadSymptoms = async () => {
    try {
      setLoadingSymptoms(true);
      const list = await api.getSymptoms();
      setSymptomsList(list);
    } catch (err: any) {
      console.warn('Erro ao carregar sintomas no painel da fono:', err);
    } finally {
      setLoadingSymptoms(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadExercises();
  }, [currentUser.id]);

  useEffect(() => {
    if (propSymptoms) {
      setSymptomsList(propSymptoms);
    } else {
      loadSymptoms();
    }
  }, [propSymptoms]);

  const handleToggleReview = (symptomId: number) => {
    const updated = { ...reviewedMap };
    if (updated[symptomId]) {
      delete updated[symptomId];
      setSuccessMsg('Marcação de visto removida.');
    } else {
      const now = new Date();
      updated[symptomId] = {
        reviewedAt: now.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      setSuccessMsg('Visto fonoaudiológico registrado com sucesso no diário do paciente!');
    }
    setReviewedMap(updated);
    try {
      localStorage.setItem('vocalis_therapist_reviewed_symptoms', JSON.stringify(updated));
    } catch {}
    setTimeout(() => setSuccessMsg(null), 3500);
  };

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

  // Symptom Diary Helpers & Metrics
  const patientNames = Array.from(new Set(symptomsList.map((s) => s.patient_name || '').filter(Boolean)));

  const filteredSymptoms = symptomsList.filter((entry) => {
    const pName = (entry.patient_name || '').toLowerCase().trim();
    const matchesPatient =
      selectedPatientFilter === 'todos' ||
      pName === selectedPatientFilter.toLowerCase().trim();
    const q = symptomSearch.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      pName.includes(q) ||
      (entry.entry_date && entry.entry_date.includes(q)) ||
      (entry.notes && entry.notes.toLowerCase().includes(q)) ||
      (entry.symptoms && entry.symptoms.some((s) => s.toLowerCase().includes(q))) ||
      (entry.triggers && entry.triggers.some((t) => t.toLowerCase().includes(q)));
    return matchesPatient && matchesSearch;
  });

  const totalSymptomsCount = symptomsList.length;
  const avgEffort = totalSymptomsCount > 0
    ? (symptomsList.reduce((acc, curr) => acc + (curr.vocal_effort || 0), 0) / totalSymptomsCount).toFixed(1)
    : '0.0';
  const avgFatigue = totalSymptomsCount > 0
    ? (symptomsList.reduce((acc, curr) => acc + (curr.fatigue_score || 0), 0) / totalSymptomsCount).toFixed(1)
    : '0.0';
  const reviewedCount = symptomsList.filter((s) => reviewedMap[s.id]).length;

  const formatDatePtBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1];
      const day = parts[2];
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthName = months[parseInt(month, 10) - 1] || month;
      return `${parseInt(day, 10)} de ${monthName} de ${year}`;
    }
    return dateStr;
  };

  const getEffortBadge = (val: number) => {
    switch (val) {
      case 1:
        return { label: 'Mínimo (1/5)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 2:
        return { label: 'Leve (2/5)', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      case 3:
        return { label: 'Moderado (3/5)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 4:
        return { label: 'Intenso (4/5)', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
      case 5:
        return { label: 'Severo (5/5)', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      default:
        return { label: `${val}/5`, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  const getFatigueBadge = (val: number) => {
    switch (val) {
      case 1:
        return { label: 'Descansada (1/5)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 2:
        return { label: 'Cansaço Leve (2/5)', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      case 3:
        return { label: 'Cansaço Médio (3/5)', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 4:
        return { label: 'Cansaço Alto (4/5)', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
      case 5:
        return { label: 'Exaustão (5/5)', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      default:
        return { label: `${val}/5`, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

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

          <button
            type="button"
            onClick={() => setActiveTab('symptoms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'symptoms'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Diário de Sintomas dos Pacientes</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'symptoms'
                ? 'bg-teal-700/80 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {symptomsList.length}
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

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {symptomsList.filter((s) => (s.patient_name || '').toLowerCase().trim() === pat.name.toLowerCase().trim()).length} relatos no diário
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatientFilter(pat.name);
                          setActiveTab('symptoms');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200/80 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-bold transition-all shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Diário de Sintomas</span>
                      </button>
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

      {/* =========================================================================
          TAB 3: DIÁRIO DE SINTOMAS DOS PACIENTES (SOLICITAÇÃO PRINCIPAL DA FONOAUDIÓLOGA)
      ========================================================================= */}
      {activeTab === 'symptoms' && (
        <div className="space-y-6">
          {/* Symptoms Header & Metrics Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2.5 py-0.5 rounded-full">
                    Acompanhamento Terapêutico Contínuo
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    LGPD Art. 11 Criptografado
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
                  Diário de Sintomas Vocais & Notas dos Pacientes
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Consulte os relatos diários registrados pelos seus pacientes ao final do dia. Analise a evolução do esforço fonatório, fadiga vocal, queixas e gatilhos para ajustar o plano terapêutico com segurança.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    loadSymptoms();
                    if (onRefreshSymptoms) onRefreshSymptoms();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                  title="Recarregar registros do banco SQLite"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSymptoms ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
              </div>
            </div>

            {/* 4 Clinical KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total de Registros</span>
                  <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {symptomsList.length}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Notas ao final do dia
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Esforço Vocal Médio</span>
                  <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {avgEffort} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">/ 5.0</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {Number(avgEffort) <= 2.5 ? 'Leve / Confortável' : Number(avgEffort) <= 3.5 ? 'Moderado' : 'Atenção Fonoaudiológica'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Fadiga Vocal Média</span>
                  <HeartPulse className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {avgFatigue} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">/ 5.0</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Percepção de cansaço
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Vistos Fonoaudiológicos</span>
                  <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {reviewedCount} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">/ {symptomsList.length}</span>
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {symptomsList.length > 0 ? `${Math.round((reviewedCount / symptomsList.length) * 100)}% analisados` : '0%'}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  placeholder="Buscar por queixa vocal, gatilho, data ou anotação confidencial..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400"
                />
                {symptomSearch && (
                  <button
                    type="button"
                    onClick={() => setSymptomSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Patient Selector Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  Paciente:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPatientFilter('todos')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedPatientFilter === 'todos'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Todos ({symptomsList.length})
                </button>
                {patientNames.map((name: string) => {
                  const count = symptomsList.filter((s) => (s.patient_name || '') === name).length;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedPatientFilter(name)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        selectedPatientFilter === name
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* List of Symptoms Entries */}
          <div className="space-y-4">
            {filteredSymptoms.length > 0 ? (
              filteredSymptoms.map((entry) => {
                const effortInfo = getEffortBadge(entry.vocal_effort);
                const fatigueInfo = getFatigueBadge(entry.fatigue_score);
                const isReviewed = Boolean(reviewedMap[entry.id]);
                const reviewMeta = reviewedMap[entry.id];

                return (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm transition-all hover:border-teal-300 dark:hover:border-teal-700 space-y-4"
                  >
                    {/* Entry Top Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600/10 dark:bg-teal-400/10 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-sm shrink-0 border border-teal-200/50 dark:border-teal-800/50">
                          {entry.patient_name ? entry.patient_name.charAt(0) : 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                              {entry.patient_name || 'Paciente'}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              ID Paciente #{entry.user_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>{formatDatePtBR(entry.entry_date)}</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span>Relato noturno</span>
                          </div>
                        </div>
                      </div>

                      {/* Review Status & Action Button */}
                      <div className="flex items-center gap-2">
                        {isReviewed ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span>Visto da Fonoaudióloga ({reviewMeta?.reviewedAt})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleReview(entry.id)}
                              className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors px-2 py-1"
                              title="Remover visto"
                            >
                              Desmarcar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleReview(entry.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm shadow-teal-600/20"
                          >
                            <CheckCheck className="w-4 h-4" />
                            <span>Registrar Visto da Fonoaudióloga</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metrics Gauges Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                            Esforço Vocal Percebido
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${effortInfo.color}`}>
                            {effortInfo.label}
                          </span>
                        </div>
                        {/* 5-step visual bar */}
                        <div className="grid grid-cols-5 gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <div
                              key={lvl}
                              className={`h-2 rounded-full transition-all ${
                                lvl <= entry.vocal_effort
                                  ? lvl <= 2
                                    ? 'bg-teal-500'
                                    : lvl === 3
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <HeartPulse className="w-3.5 h-3.5 text-amber-500" />
                            Fadiga Laríngea ao Final do Dia
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${fatigueInfo.color}`}>
                            {fatigueInfo.label}
                          </span>
                        </div>
                        {/* 5-step visual bar */}
                        <div className="grid grid-cols-5 gap-1 pt-1">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <div
                              key={lvl}
                              className={`h-2 rounded-full transition-all ${
                                lvl <= entry.fatigue_score
                                  ? lvl <= 2
                                    ? 'bg-teal-500'
                                    : lvl === 3
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Symptoms & Triggers Tags */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {entry.symptoms && entry.symptoms.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Sintomas Relatados
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.symptoms.map((sym, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800 font-medium"
                              >
                                {sym}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {entry.triggers && entry.triggers.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Fatores Desencadeantes / Gatilhos
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.triggers.map((trig, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-800 font-medium"
                              >
                                {trig}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Patient Confidential Observation Note (LGPD protected) */}
                    {entry.notes ? (
                      <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
                          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span>Observação Clínica Confidencial do Paciente</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed pl-1">
                          "{entry.notes}"
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-1">
                        Nenhuma observação textual registrada para este dia.
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Nenhum relato encontrado com os filtros atuais
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {symptomSearch || selectedPatientFilter !== 'todos'
                    ? 'Tente limpar a pesquisa ou selecionar outro paciente para visualizar os diários.'
                    : 'Assim que os pacientes responderem à pergunta sobre como sua voz se sentiu ao final do dia, as notas aparecerão aqui automaticamente.'}
                </p>
                {(symptomSearch || selectedPatientFilter !== 'todos') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSymptomSearch('');
                      setSelectedPatientFilter('todos');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
                  >
                    Restaurar Todos os Pacientes
                  </button>
                )}
              </div>
            )}
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
