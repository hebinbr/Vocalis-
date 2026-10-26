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
  User,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Lock,
  Layers,
  HeartPulse
} from 'lucide-react';
import { Patient, Exercise, ExerciseLog, Reminder, ProgressStats } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { ExerciseCatalog } from './components/ExerciseCatalog';
import { VisualProgressDashboard } from './components/VisualProgressDashboard';
import { RemindersManager } from './components/RemindersManager';
import { ExerciseSessionModal } from './components/ExerciseSessionModal';
import { SecurityVaultModal } from './components/SecurityVaultModal';
import { PatientProfileModal } from './components/PatientProfileModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'exercises' | 'progress' | 'reminders' | 'vault'>('exercises');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Modals
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);

  // Load all initial data from Python SQLite backend
  const loadAppData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [patientData, exercisesData, logsData, remindersData, statsData] = await Promise.all([
        api.getPatient(),
        api.getExercises(),
        api.getLogs(),
        api.getReminders(),
        api.getProgressStats(),
      ]);

      setPatient(patientData);
      setExercises(exercisesData);
      setLogs(logsData);
      setReminders(remindersData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading Vocalis app data:', err);
      setError('Conectando ao backend Python e banco SQLite... Caso seja a primeira inicialização, tente recarregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  // Handle saving an exercise log
  const handleSaveExerciseLog = async (logData: any) => {
    await api.addLog(logData);
    // Refresh logs, stats, and patient streak
    const [updatedLogs, updatedStats, updatedPatient] = await Promise.all([
      api.getLogs(),
      api.getProgressStats(),
      api.getPatient(),
    ]);
    setLogs(updatedLogs);
    setStats(updatedStats);
    setPatient(updatedPatient);
  };

  // Handle deleting an exercise log
  const handleDeleteLog = async (id: number) => {
    await api.deleteLog(id);
    const [updatedLogs, updatedStats] = await Promise.all([
      api.getLogs(),
      api.getProgressStats(),
    ]);
    setLogs(updatedLogs);
    setStats(updatedStats);
  };

  // Handle adding a reminder
  const handleAddReminder = async (data: Partial<Reminder>) => {
    await api.addReminder(data);
    const updated = await api.getReminders();
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
    const updated = await api.updatePatient(data);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-teal-500 selection:text-white">
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
        onOpenProfile={() => setShowProfileModal(true)}
        onStartQuickExercise={handleStartQuickPractice}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
        {/* Error / Offline Notice with Reconnect */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadAppData}
              className="px-3 py-1.5 font-semibold bg-white border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !patient ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-500 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
            <p className="text-sm font-semibold text-slate-700">
              Iniciando Vocalis & Conectando ao Banco SQLite Criptografado...
            </p>
            <p className="text-xs text-slate-400">Derivando chaves PBKDF2 e validando registros</p>
          </div>
        ) : (
          <>
            {/* View Tab 1: Vocal Exercises Catalog */}
            {currentTab === 'exercises' && (
              <ExerciseCatalog
                exercises={exercises}
                onStartExercise={(ex) => setActiveExercise(ex)}
                onOpenVault={() => setShowVaultModal(true)}
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
              />
            )}
          </>
        )}
      </main>

      {/* Footer with Minimalist Clinical Assurance */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="font-semibold text-slate-700">Vocalis Fonoaudiologia</span>
            <span>·</span>
            <span>SQLite Local Criptografado (AES-256 / PBKDF2)</span>
            <span>·</span>
            <span>Backend Python 3</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => setShowVaultModal(true)}
              className="hover:text-teal-700 transition-colors flex items-center gap-1 font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verificação de Criptografia LGPD</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowProfileModal(true)}
              className="hover:text-teal-700 transition-colors font-medium"
            >
              Relatório da Consulta
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
    </div>
  );
}
