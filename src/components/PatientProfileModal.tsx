import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Save,
  X,
  Stethoscope,
  Flame,
  Award,
  Clock,
  Lock
} from 'lucide-react';
import { Patient, ProgressStats, ExerciseLog } from '../types';

interface PatientProfileModalProps {
  patient: Patient;
  stats: ProgressStats | null;
  logs: ExerciseLog[];
  onClose: () => void;
  onUpdatePatient: (data: Partial<Patient>) => Promise<void>;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  patient,
  stats,
  logs,
  onClose,
  onUpdatePatient,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'report'>('profile');
  const [name, setName] = useState<string>(patient.name);
  const [diagnosis, setDiagnosis] = useState<string>(patient.diagnosis);
  const [therapistName, setTherapistName] = useState<string>(patient.therapist_name);
  const [therapistCrfa, setTherapistCrfa] = useState<string>(patient.therapist_crfa);
  const [clinicalNotes, setClinicalNotes] = useState<string>(patient.clinical_notes);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(patient.daily_goal_minutes);
  const [saving, setSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdatePatient({
        name,
        diagnosis,
        therapist_name: therapistName,
        therapist_crfa: therapistCrfa,
        clinical_notes: clinicalNotes,
        daily_goal_minutes: dailyGoalMinutes,
      });
      alert('Perfil clínico salvo e criptografado com sucesso!');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyReport = () => {
    const reportText = `=== RELATÓRIO FONOAUDIOLÓGICO VOCALIS ===
Paciente: ${patient.name}
Diagnóstico: ${patient.diagnosis}
Fonoaudióloga Responsável: ${patient.therapist_name} (${patient.therapist_crfa})

METAS & DESEMPENHO VOCAL:
- Sequência Atual: ${stats?.streak_days || 0} dias consecutivos (Recorde: ${stats?.best_streak || 0} dias)
- Tempo Total de Exercícios: ${stats?.total_minutes || 0} minutos em ${stats?.total_sessions || 0} sessões
- Precisão Média de Afinação (F0): ${stats?.avg_pitch_accuracy || 0}%
- Redução Média de Fadiga Vocal: -${stats?.avg_fatigue_relief || 0} pontos

ÚLTIMOS EXERCÍCIOS REGISTRADOS:
${logs
  .slice(0, 5)
  .map(
    (l) =>
      `• ${l.date_iso} - ${l.exercise_title}: ${Math.round(l.duration_sec / 60)}min | Fadiga de ${l.fatigue_before}/10 para ${l.fatigue_after}/10 | Nota: "${l.notes || 'Sem observações'}"`
  )
  .join('\n')}

Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} via Vocalis (Dados Criptografados no SQLite).`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Prontuário & Perfil do Paciente
              </h2>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Armazenamento Criptografado no SQLite</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation in Modal */}
        <div className="px-6 pt-3 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Dados Cadastrais & Diagnóstico
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'report'
                ? 'border-teal-600 dark:border-teal-400 text-teal-800 dark:text-teal-300'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Relatório para Fonoaudióloga (Consulta)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo do Paciente:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Diagnóstico / Queixa Vocal Focal:
                </label>
                <textarea
                  rows={2}
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Ex: Fadiga vocal após uso contínuo, fenda em ampulheta com nódulos..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fonoaudióloga(o) Responsável:
                  </label>
                  <input
                    type="text"
                    value={therapistName}
                    onChange={(e) => setTherapistName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CRFa (Registro Profissional):
                  </label>
                  <input
                    type="text"
                    value={therapistCrfa}
                    onChange={(e) => setTherapistCrfa(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recomendações Clínicas da Fonoaudióloga:
                </label>
                <textarea
                  rows={2}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Orientações de hidratação, postura cervical e repouso vocal..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta Diária de Exercícios Vocais (Minutos):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={dailyGoalMinutes}
                    onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                    className="w-24 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold tabular-nums"
                  />
                  <span className="text-slate-500 dark:text-slate-400">
                    minutos por dia (Recomendado: 10 a 20 min diários)
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Criptografando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Tab 2: Clinical Report for Doctor / Therapist */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm font-display">
                      Relatório de Prática Vocal
                    </h3>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Emitido em {new Date().toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyReport}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">Paciente:</span>
                    <span>{patient.name}</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">Fonoaudióloga:</span>
                    <span>{patient.therapist_name} ({patient.therapist_crfa})</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold block text-slate-900 dark:text-slate-100">Diagnóstico Vocal:</span>
                    <span>{patient.diagnosis}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Nível / XP</div>
                    <div className="font-bold text-teal-800 dark:text-teal-300 text-sm">Nv. {patient.level} ({patient.xp_points} XP)</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Sequência</div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{stats?.streak_days || 0} dias</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Tempo Total</div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{stats?.total_minutes || 0} min</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Precisão F0</div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{stats?.avg_pitch_accuracy || 0}%</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Alívio Fadiga</div>
                    <div className="font-bold text-teal-700 dark:text-teal-400 text-sm">-{stats?.avg_fatigue_relief || 0} pts</div>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Últimas 5 Sessões Registradas:</div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden">
                    {logs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-2.5 text-[11px] flex items-center justify-between">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200">{log.exercise_title}</strong>
                          <div className="text-slate-500 dark:text-slate-400">
                            Fadiga: {log.fatigue_before}/10 → {log.fatigue_after}/10 {log.notes && `· "${log.notes}"`}
                          </div>
                        </div>
                        <div className="text-right text-slate-500 dark:text-slate-400 tabular-nums">
                          {log.date_iso} ({Math.round(log.duration_sec / 60)}m)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
