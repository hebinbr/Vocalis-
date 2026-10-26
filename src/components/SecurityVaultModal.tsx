import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Database,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { SecurityAudit } from '../types';
import { api } from '../services/api';

interface SecurityVaultModalProps {
  onClose: () => void;
}

export const SecurityVaultModal: React.FC<SecurityVaultModalProps> = ({ onClose }) => {
  const [audit, setAudit] = useState<SecurityAudit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showRaw, setShowRaw] = useState<boolean>(true);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityAudit();
      setAudit(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">
                Auditoria de Criptografia & Privacidade dos Dados
              </h2>
              <div className="text-[11px] text-slate-500">
                Padrão LGPD (Lei Geral de Proteção de Dados - Art. 11: Dados de Saúde)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Security Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
                <Database className="w-4 h-4 text-teal-600" />
                <span>Banco de Dados</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900">SQLite 3 Local</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Arquivo relacional isolado sem telemetria externa.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Algoritmo de Chave</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900">PBKDF2-HMAC-SHA256</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                10.000 iterações com salt pseudo-aleatório de 128 bits.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-2 text-slate-700 font-bold mb-1">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Cifra & Integridade</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900">CTR + Encrypt-then-MAC</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Assinatura HMAC-SHA256 antiadulteração de registros.
              </div>
            </div>
          </div>

          {/* Live Side-by-Side Comparison */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
              <span>Inspecionando blocos de dados criptografados do SQLite...</span>
            </div>
          ) : audit ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Comparação em Tempo Real: Armazenamento em Disco vs Memória Autorizada
                </h3>

                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 font-medium"
                >
                  {showRaw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showRaw ? 'Ocultar Texto Cifrado' : 'Exibir Texto Cifrado'}</span>
                </button>
              </div>

              {/* Patient Record Proof */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100/70 px-4 py-2 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
                  <span>Prontuário do Paciente (Tabela: `patient`)</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Criptografia Ativa
                  </span>
                </div>

                <div className="p-4 space-y-3 bg-white">
                  <div>
                    <div className="text-slate-500 font-semibold mb-0.5">Nome do Paciente:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-slate-900 text-slate-300 font-mono text-[10px] break-all">
                        <span className="text-teal-400 block font-bold font-sans text-[9px] uppercase">
                          No Arquivo SQLite (Ciphertext):
                        </span>
                        {showRaw
                          ? audit.patient_record.raw_encrypted_in_sqlite.name
                          : '••••••••••••••••••••••••••••••••••••'}
                      </div>
                      <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-950 font-semibold">
                        <span className="text-teal-700 block text-[9px] uppercase">
                          Decifrado na Aplicação:
                        </span>
                        {audit.patient_record.decrypted_in_memory.name}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500 font-semibold mb-0.5">Diagnóstico Fonoaudiológico:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-slate-900 text-slate-300 font-mono text-[10px] break-all max-h-24 overflow-y-auto">
                        <span className="text-teal-400 block font-bold font-sans text-[9px] uppercase">
                          No Arquivo SQLite (Ciphertext):
                        </span>
                        {showRaw
                          ? audit.patient_record.raw_encrypted_in_sqlite.diagnosis
                          : '••••••••••••••••••••••••••••••••••••'}
                      </div>
                      <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-950 font-semibold">
                        <span className="text-teal-700 block text-[9px] uppercase">
                          Decifrado na Aplicação:
                        </span>
                        {audit.patient_record.decrypted_in_memory.diagnosis}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Notes Proof */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100/70 px-4 py-2 font-bold text-slate-800 border-b border-slate-200 flex items-center justify-between">
                  <span>Anotações Subjetivas de Treino (Tabela: `exercise_logs`)</span>
                  <span className="text-[10px] text-slate-500">Últimos registros</span>
                </div>

                <div className="divide-y divide-slate-100 p-2">
                  {audit.logs_sample.map((log, idx) => (
                    <div key={idx} className="py-2.5 px-2 space-y-1">
                      <div className="font-bold text-slate-800">{log.exercise}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-slate-900 text-slate-300 font-mono text-[10px] break-all">
                          <span className="text-amber-400 block text-[9px] uppercase font-sans">
                            Ciphertext Criptografado:
                          </span>
                          {showRaw ? log.raw_encrypted_note : '••••••••••••••••••••'}
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                          <span className="text-slate-500 block text-[9px] uppercase font-semibold">
                            Texto Original do Paciente:
                          </span>
                          {log.decrypted_note || '(Sem anotações no registro)'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Privacy Guarantee Note */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block font-semibold">Garantia Técnica de Privacidade:</strong>
              <p className="text-emerald-900/90 leading-relaxed text-[11px]">
                Mesmo que o arquivo do banco de dados <code className="bg-emerald-100 px-1 rounded font-mono">vocalis.db</code> seja copiado ou inspecionado por ferramentas externas como SQLite Browser ou scripts não autorizados, nenhum diagnóstico clínico, anotação de voz ou dado do paciente poderá ser lido sem a validação criptográfica da chave mestra e do HMAC.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
          >
            Entendido & Concluir Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};
