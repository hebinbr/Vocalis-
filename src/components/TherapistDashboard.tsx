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
  AlertCircle
} from 'lucide-react';
import { TherapistDashboardData, AccessCode, User } from '../types';
import { api } from '../services/api';

interface TherapistDashboardProps {
  currentUser: User;
  onSwitchToPatientView?: () => void;
}

export const TherapistDashboard: React.FC<TherapistDashboardProps> = ({
  currentUser,
  onSwitchToPatientView,
}) => {
  const [dashboardData, setDashboardData] = useState<TherapistDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  useEffect(() => {
    loadDashboard();
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

  return (
    <div className="space-y-8 pb-16">
      {/* Therapist Profile & Stats Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
              {currentUser.name.charAt(0) || 'F'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                  Fonoaudióloga Responsável
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  CRFa 2-19842
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                {currentUser.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentUser.email}</span>
                </span>
                {currentUser.phone && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentUser.phone}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadDashboard}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Atualizar dados do banco SQLite"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onSwitchToPatientView && (
              <button
                onClick={onSwitchToPatientView}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 transition-colors"
              >
                Visualizar Área do Paciente
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block mb-1">
              Códigos Disponíveis
            </span>
            <div className="text-2xl font-black text-indigo-900">
              {dashboardData?.available_codes || 0}
            </div>
            <span className="text-[11px] text-indigo-700">Prontos para envio a novos pacientes</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Pacientes Ativos
            </span>
            <div className="text-2xl font-black text-emerald-900">
              {dashboardData?.active_patients || 0}
            </div>
            <span className="text-[11px] text-emerald-700">Com prontuário criptografado em andamento</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Total de Códigos Gerados
            </span>
            <div className="text-2xl font-black text-slate-900">
              {dashboardData?.total_codes || 0}
            </div>
            <span className="text-[11px] text-slate-500">Histórico completo de prescrições</span>
          </div>
        </div>
      </div>

      {/* SECTION: GERADOR DE CÓDIGO PARA O PACIENTE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-slate-900 font-display">
              Gerar Código de Acesso para Paciente
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            O paciente precisa deste código para ter acesso aos exercícios vocais após se cadastrar. Cada código garante a rastreabilidade do prontuário e vínculo clínico.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Highlight of Just Generated Code */}
        {justGeneratedCode && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Código Criado com Sucesso no SQLite:
                </span>
                <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-950 tracking-wider">
                  {justGeneratedCode.code}
                </div>
                {justGeneratedCode.patient_name && (
                  <p className="text-xs text-emerald-800">
                    Destinado a: <strong>{justGeneratedCode.patient_name}</strong>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCode(justGeneratedCode.code)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {copiedCode === justGeneratedCode.code ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>

                <a
                  href={getWhatsAppShareUrl(justGeneratedCode.code, justGeneratedCode.patient_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Creation Form */}
        <form onSubmit={handleGenerateCode} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Paciente (Opcional)
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Ex: Carlos Eduardo"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              E-mail do Paciente (Opcional)
            </label>
            <input
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="carlos@email.com"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="sm:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{generating ? 'Gerando...' : 'Gerar Código'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION: LISTA DE CÓDIGOS GERADOS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Códigos Registrados no Banco
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Total: {dashboardData?.codes.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código Clínico</th>
                <th className="py-3 px-4">Destinatário</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Criado em</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboardData?.codes && dashboardData.codes.length > 0 ? (
                dashboardData.codes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      {item.patient_name || item.activated_by_name || (
                        <span className="text-slate-400 italic">Livre para qualquer paciente</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {item.is_used ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Ativado por {item.activated_by_name || 'Paciente'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Disponível
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(item.code)}
                          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                          title="Copiar código"
                        >
                          {copiedCode === item.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {!item.is_used && (
                          <a
                            href={getWhatsAppShareUrl(item.code, item.patient_name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
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
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhum código gerado ainda. Use o formulário acima para criar o primeiro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: PACIENTES VINCULADOS & PRONTUÁRIOS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-teal-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Pacientes com Acesso Liberado
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento de assiduidade, nível vocal e anotações clínicas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardData?.patients && dashboardData.patients.length > 0 ? (
            dashboardData.patients.map((pat) => (
              <div
                key={pat.id}
                className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-teal-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{pat.name}</h4>
                    <p className="text-xs text-slate-500">{pat.email}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-teal-100 text-teal-900 px-2.5 py-1 rounded-lg">
                    Código: {pat.activation_code || 'VOCA-ATIVO'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-white rounded-xl border border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nível</span>
                    <span className="font-bold text-slate-800">Nv. {pat.level}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Experiência</span>
                    <span className="font-bold text-teal-700">{pat.xp} XP</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sequência</span>
                    <span className="font-bold text-amber-600">{pat.streak} dias</span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="text-slate-600">
                    <strong className="text-slate-700">Diagnóstico: </strong>
                    <span>{pat.diagnosis}</span>
                  </div>
                  <div className="text-slate-500 italic text-[11px] bg-slate-100/70 p-2 rounded-lg">
                    "{pat.clinical_notes}"
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
              Nenhum paciente ativado no momento. Envie um código de acesso para seu primeiro paciente!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
