import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, AlertCircle, ArrowRight, Stethoscope, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface ActivationCodePromptProps {
  user: User;
  onActivated: (updatedUser: User) => void;
  onOpenTherapistPanel?: () => void;
}

export const ActivationCodePrompt: React.FC<ActivationCodePromptProps> = ({
  user,
  onActivated,
  onOpenTherapistPanel,
}) => {
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Por favor, informe o código fornecido pela sua fonoaudióloga.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.activateWithCode(user.id, code.trim());
      setSuccessMsg(res.message || 'Código validado com sucesso! Exercícios liberados.');
      setTimeout(() => {
        onActivated(res.user);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Código não encontrado ou já utilizado.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPresetCode = (preset: string) => {
    setCode(preset);
    setErrorMsg(null);
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 rounded-3xl border-2 border-amber-300/80 dark:border-amber-700/80 p-6 sm:p-8 shadow-sm transition-colors">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        {/* Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500 dark:bg-amber-600 text-white flex items-center justify-center mx-auto shadow-md">
          <KeyRound className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            Acesso Clínico Restrito
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display">
            Ativação de Exercícios Vocais com sua Fonoaudióloga
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            Olá, <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong>! Para garantir sua segurança vocal e acompanhar a evolução personalizada, a prática de exercícios requer o código de liberação emitido pela sua fonoaudióloga.
          </p>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 rounded-xl flex items-center justify-center gap-2 max-w-md mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 rounded-xl flex items-center justify-center gap-2 max-w-md mx-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleActivate} className="max-w-md mx-auto space-y-3">
          <div className="relative">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DIGITE O CÓDIGO (EX: VOCA-2026)"
              className="w-full text-center tracking-widest font-mono uppercase text-base sm:text-lg font-bold py-3.5 px-4 rounded-2xl border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-amber-200/60 dark:focus:ring-amber-900/60 focus:border-amber-500 shadow-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Validando no Banco SQLite...</span>
            ) : (
              <>
                <span>Ativar Meu Plano de Exercícios</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Demonstration & Guidance Pill */}
        <div className="pt-4 border-t border-amber-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
            Códigos clínicos disponíveis no banco de dados para teste rápido:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['VOCA-2026', 'FONO-9900', 'VOCA-7842'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleApplyPresetCode(preset)}
                className="px-2.5 py-1 font-mono font-bold text-[11px] text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors cursor-pointer"
                title="Clique para preencher este código"
              >
                {preset}
              </button>
            ))}
          </div>

          {onOpenTherapistPanel && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenTherapistPanel}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-900 dark:hover:text-teal-300 inline-flex items-center gap-1.5 underline"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Sou fonoaudióloga: abrir painel e gerar novos códigos</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
