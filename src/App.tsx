/**
 * Vocalis - Aplicativo de Fonoaudiologia & Terapia Vocal
 * Acompanhamento de exercícios vocais, lembretes diários e progresso visual
 * Backend Python 3 + SQLite com criptografia de dados de pacientes (LGPD)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ShieldCheck,
  Flame,
  Bell,
  User as UserIcon,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Lock,
  Layers,
  HeartPulse,
  KeyRound,
  Stethoscope
} from 'lucide-react';
import { Patient, Exercise, ExerciseLog, Reminder, ProgressStats, User } from './types';
import {
  INITIAL_PATIENT,
  INITIAL_EXERCISES,
  INITIAL_REMINDERS,
  INITIAL_STATS,
  INITIAL_LOGS,
} from './data/initialClinicalData';
import { api } from './services/api';
import { Header } from './components/Header';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { VisualProgressDashboard } from './components/VisualProgressDashboard';
import { RemindersManager } from './components/RemindersManager';
import { ExerciseSessionModal } from './components/ExerciseSessionModal';
import { SecurityVaultModal } from './components/SecurityVaultModal';
import { PatientProfileModal } from './components/PatientProfileModal';
import { CelebrationModal, CelebrationData } from './components/CelebrationModal';
import { AuthModal } from './components/AuthModal';
import { TherapistDashboard } from './components/TherapistDashboard';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import { ActiveReminderToast } from './components/ActiveReminderToast';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'exercises' | 'progress' | 'reminders' | 'vault' | 'therapist'>('exercises');
  const [patient, setPatient] = useState<Patient>(INITIAL_PATIENT);
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [logs, setLogs] = useState<ExerciseLog[]>(INITIAL_LOGS);
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [stats, setStats] = useState<ProgressStats>(INITIAL_STATS);

  // Authenticated User State (defaults to Camila, patient with persistent SQLite record)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('vocalis_current_user');
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return {
      id: 2,
      role: 'paciente',
      name: 'Camila Rossi',
      email: 'camila@email.com',
      is_activated: true,
      therapist_id: 1,
      activation_code_used: 'VOCA-2026',
    };
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Active Modals & Triggers
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);

  // Save current user to localStorage whenever changed
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('vocalis_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('vocalis_current_user');
    }
  }, [currentUser]);

  // Load / Sync app data with SQLite backend in background with graceful retry
  const loadAppData = useCallback(async (retryCount = 0) => {
    try {
      const patientPromise = api.getPatient(currentUser?.id).catch((e) => {
        console.warn('Patient sync notice:', e);
        return null;
      });
      const exercisesPromise = api.getExercises().catch((e) => {
        console.warn('Exercises sync notice:', e);
        return null;
      });
      const logsPromise = api.getLogs(currentUser?.id).catch((e) => {
        console.warn('Logs sync notice:', e);
        return null;
      });
      const remindersPromise = api.getReminders(currentUser?.id).catch((e) => {
        console.warn('Reminders sync notice:', e);
        return null;
      });
      const statsPromise = api.getProgressStats(currentUser?.id).catch((e) => {
        console.warn('Stats sync notice:', e);
        return null;
      });

      const [patientData, exercisesData, logsData, remindersData, statsData] = await Promise.all([
        patientPromise,
        exercisesPromise,
        logsPromise,
        remindersPromise,
        statsPromise,
      ]);

      if (patientData && patientData.name) {
        setPatient(patientData);
      }
      if (Array.isArray(exercisesData) && exercisesData.length > 0) {
        setExercises(exercisesData);
      }
      if (Array.isArray(logsData) && logsData.length > 0) {
        setLogs(logsData);
      }
      if (Array.isArray(remindersData) && remindersData.length > 0) {
        setReminders(remindersData);
      }
      if (statsData && statsData.level_title) {
        setStats(statsData);
      }
    } catch (err: any) {
      console.warn(`Background sync attempt ${retryCount + 1} notice:`, err?.message || err);
      if (retryCount < 3) {
        setTimeout(() => {
          loadAppData(retryCount + 1);
        }, 1500 * (retryCount + 1));
      }
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadAppData(0);
  }, [loadAppData]);

  // Handle saving an exercise log with gamification celebration rewards
  const handleSaveExerciseLog = async (logData: any) => {
    const previousBadges = stats?.badges?.filter((b) => b.unlocked).map((b) => b.id) || [];
    const result = await api.addLog({
      ...logData,
      user_id: currentUser?.id,
    });

    // Refresh logs, stats, and patient level/xp/streak
    const [updatedLogs, updatedStats, updatedPatient] = await Promise.all([
      api.getLogs(currentUser?.id),
      api.getProgressStats(currentUser?.id),
      api.getPatient(currentUser?.id),
    ]);

    setLogs(updatedLogs);
    setStats(updatedStats);
    setPatient(updatedPatient);

    // Trigger Celebration Modal on Level-Up or Badge Unlock!
    if (result.leveled_up) {
      setCelebrationData({
        type: 'level',
        title: `Parabéns! Você subiu para o Nível ${result.new_level}!`,
        subtitle: result.level_title || 'Nova Conquista Vocal',
        description: `Sua disciplina vocal deu frutos. Novos desafios e técnicas avançadas foram liberados no seu plano de exercícios!`,
        levelNumber: result.new_level,
        xpBonus: result.xp_earned,
      });
    } else {
      // Check if a new badge was unlocked
      const newBadges = updatedStats.badges.filter((b) => b.unlocked && !previousBadges.includes(b.id));
      if (newBadges.length > 0) {
        const badge = newBadges[0];
        setCelebrationData({
          type: 'badge',
          title: `Distintivo Desbloqueado: ${badge.title}!`,
          subtitle: badge.category,
          description: badge.description,
          xpBonus: result.xp_earned,
        });
      }
    }

    return result;
  };

  // Handle deleting an exercise log
  const handleDeleteLog = async (id: number) => {
    await api.deleteLog(id);
    const [updatedLogs, updatedStats] = await Promise.all([
      api.getLogs(currentUser?.id),
      api.getProgressStats(currentUser?.id),
    ]);
    setLogs(updatedLogs);
    setStats(updatedStats);
  };

  // Handle adding a reminder
  const handleAddReminder = async (data: Partial<Reminder>) => {
    await api.addReminder(data, currentUser?.id);
    const updated = await api.getReminders(currentUser?.id);
    setReminders(updated);
  };

  // Handle toggling a reminder
  const handleToggleReminder = async (id: number, currentActive: boolean) => {
    await api.updateReminder(id, { is_active: !currentActive });
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !currentActive } : r))
    );
  };

  // Handle deleting a reminder
  const handleDeleteReminder = async (id: number) => {
    await api.deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Handle updating patient profile
  const handleUpdatePatient = async (data: Partial<Patient>) => {
    const updated = await api.updatePatient(data, currentUser?.id);
    setPatient(updated);
  };

  // Handle selecting an exercise by ID
  const handleSelectExerciseById = (exerciseId: string) => {
    const found = exercises.find((e) => e.id === exerciseId);
    if (found) {
      setActiveExercise(found);
    } else {
      setCurrentTab('exercises');
    }
  };

  // Handle quick practice start
  const handleStartQuickPractice = () => {
    if (exercises.length > 0) {
      setActiveExercise(exercises[0]);
    }
  };

  // Handle start exercise triggered from background push notification or toast
  const handleStartReminderExercise = useCallback((reminder: Reminder) => {
    setCurrentTab('exercises');
    const match = exercises.find((e) =>
      reminder.title.toLowerCase().includes(e.title.toLowerCase()) ||
      (reminder.category === 'aquecimento' && e.id === 'vib_labios') ||
      (reminder.category === 'hidratacao' && e.id === 'canudo_sovte') ||
      (reminder.category === 'desaquecimento' && e.id === 'vocal_fry')
    );
    if (match) {
      setActiveExercise(match);
    } else if (exercises.length > 0) {
      setActiveExercise(exercises[0]);
    }
  }, [exercises]);

  // Browser Push Notification Scheduler with Web Worker background ticker
  const notificationScheduler = useNotificationScheduler(reminders, handleStartReminderExercise);

  // Handle user authentication switch
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'fonoaudiologa') {
      setCurrentTab('therapist');
    } else {
      setCurrentTab('exercises');
    }
  };

  const handleLogout = () => {
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased selection:bg-teal-500 selection:text-white transition-colors duration-200">
      {/* Universal Top Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'vault') {
            setShowVaultModal(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        patient={patient}
        currentUser={currentUser}
        onOpenProfile={() => setShowProfileModal(true)}
        onStartQuickExercise={handleStartQuickPractice}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">

        {/* Loading Spinner */}
        {loading && !patient && currentTab !== 'therapist' ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-500 dark:text-slate-400 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 dark:border-teal-400"></div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Iniciando Vocalis & Conectando ao Banco SQLite Criptografado...
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Derivando chaves PBKDF2 e validando registros</p>
          </div>
        ) : (
          <>
            {/* View Tab: Área Exclusiva da Fonoaudióloga */}
            {currentTab === 'therapist' && currentUser && (
              <TherapistDashboard
                currentUser={currentUser}
                onSwitchToPatientView={() => setCurrentTab('exercises')}
              />
            )}

            {/* View Tab 1: Vocal Exercises Catalog */}
            {currentTab === 'exercises' && (
              <ExerciseCatalog
                exercises={exercises}
                patientLevel={patient?.level || 2}
                isActivated={
                  currentUser?.role === 'fonoaudiologa'
                    ? true
                    : (currentUser?.is_activated ?? false)
                }
                currentUser={currentUser}
                onStartExercise={(ex) => setActiveExercise(ex)}
                onOpenVault={() => setShowVaultModal(true)}
                onActivateUser={(updated) => {
                  setCurrentUser(updated);
                  loadAppData();
                }}
                onOpenTherapistPanel={() => setCurrentTab('therapist')}
              />
            )}

            {/* View Tab 2: Visual Progress & Motivational Badges */}
            {currentTab === 'progress' && (
              <VisualProgressDashboard
                stats={stats}
                logs={logs}
                patient={patient}
                onSelectExercise={handleSelectExerciseById}
                onDeleteLog={handleDeleteLog}
              />
            )}

            {/* View Tab 3: Daily Reminders & Vocal Hygiene */}
            {currentTab === 'reminders' && (
              <RemindersManager
                reminders={reminders}
                onAddReminder={handleAddReminder}
                onToggleReminder={handleToggleReminder}
                onDeleteReminder={handleDeleteReminder}
                notificationScheduler={notificationScheduler}
              />
            )}
          </>
        )}
      </main>

      {/* Footer with Minimalist Clinical Assurance */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Vocalis Fonoaudiologia</span>
            <span>·</span>
            <span>SQLite Local Criptografado (AES-256 / PBKDF2)</span>
            <span>·</span>
            <span>Backend Python 3</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setShowVaultModal(true)}
              className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors flex items-center gap-1 font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Verificação de Criptografia LGPD</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowAuthModal(true)}
              className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors font-medium flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Trocar de Usuário / Cadastrar</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Active Exercise Practice Session Modal */}
      {activeExercise && (
        <ExerciseSessionModal
          exercise={activeExercise}
          onClose={() => setActiveExercise(null)}
          onSaveSession={handleSaveExerciseLog}
        />
      )}

      {/* Security & Cryptography Vault Inspector Modal */}
      {showVaultModal && (
        <SecurityVaultModal onClose={() => setShowVaultModal(false)} />
      )}

      {/* Patient Profile & Clinical Report Modal */}
      {showProfileModal && patient && (
        <PatientProfileModal
          patient={patient}
          stats={stats}
          logs={logs}
          onClose={() => setShowProfileModal(false)}
          onUpdatePatient={handleUpdatePatient}
        />
      )}

      {/* Celebration Modal (Framer Motion + Confetti + Fanfare) */}
      <CelebrationModal
        data={celebrationData}
        onClose={() => setCelebrationData(null)}
      />

      {/* Authentication & Registration Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Floating Active Reminder Toast (Real-time alert even when returning from background) */}
      <ActiveReminderToast
        alert={notificationScheduler.lastAlert}
        onClose={notificationScheduler.clearLastAlert}
        onStartExercise={handleStartReminderExercise}
      />
    </div>
  );
}
