import React, { useState, useMemo } from 'react';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  CheckCircle2,
  XCircle,
  KeyRound,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  initialRole?: 'paciente' | 'fonoaudiologa';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialRole = 'paciente',
}) => {
  const [mode, setMode] = useState<'login' | 'register_patient' | 'register_therapist'>('login');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [activationCode, setActivationCode] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic Password Validation & Strength Feedback
  const passwordCriteria = useMemo(() => {
    const hasMinLength = password.length >= 6;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const matchesConfirm = password.length > 0 && password === confirmPassword;

    let score = 0;
    if (hasMinLength) score += 1;
    if (hasLower && hasUpper) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;
    if (password.length >= 10) score += 1;

    let label = 'Muito Fraca';
    let colorClass = 'bg-rose-500 text-rose-700';
    let percentage = 20;

    if (score === 2) {
      label = 'Fraca';
      colorClass = 'bg-amber-500 text-amber-700';
      percentage = 40;
    } else if (score === 3) {
      label = 'Média';
      colorClass = 'bg-yellow-500 text-yellow-700';
      percentage = 60;
    } else if (score === 4) {
      label = 'Forte';
      colorClass = 'bg-teal-500 text-teal-700';
      percentage = 80;
    } else if (score >= 5) {
      label = 'Excelente & Segura';
      colorClass = 'bg-emerald-600 text-emerald-800';
      percentage = 100;
    }

    return {
      hasMinLength,
      hasLower,
      hasUpper,
      hasNumber,
      hasSpecial,
      matchesConfirm,
      score,
      label,
      colorClass,
      percentage,
      isValid: hasMinLength && (confirmPassword === '' || matchesConfirm),
    };
  }, [password, confirmPassword]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setActivationCode('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Preencha seu e-mail e senha.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.login({ email, password });
      setSuccessMsg('Autenticado com sucesso!');
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
        resetForm();
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Por favor, preencha nome, e-mail e senha.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Verifique a confirmação.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.register({
        role: 'paciente',
        name,
        email,
        password,
        activation_code: activationCode.trim() || undefined,
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
        resetForm();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro no cadastro de paciente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMsg('Por favor, preencha nome, telefone, e-mail e senha.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.register({
        role: 'fonoaudiologa',
        name,
        email,
        phone,
        password,
      });

      setSuccessMsg('Cadastro profissional realizado com sucesso!');
      setTimeout(() => {
        onAuthSuccess(res.user);
        onClose();
        resetForm();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro no cadastro da fonoaudióloga.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Logins
  const handleQuickLogin = async (role: 'paciente' | 'fonoaudiologa') => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const creds =
        role === 'paciente'
          ? { email: 'camila@email.com', password: 'Voz1234!' }
          : { email: 'dra.beatriz@vocalis.com.br', password: 'Fono1234!' };
      const res = await api.login(creds);
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg('Falha ao conectar conta de demonstração.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            V
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Acesso ao Vocalis
            </h2>
            <p className="text-xs text-slate-500">
              Prontuário e reabilitação vocal criptografados no SQLite
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              resetForm();
            }}
            className={`py-2 px-2 rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register_patient');
              resetForm();
            }}
            className={`py-2 px-2 rounded-xl transition-all ${
              mode === 'register_patient'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sou Paciente
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register_therapist');
              resetForm();
            }}
            className={`py-2 px-2 rounded-xl transition-all ${
              mode === 'register_therapist'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fonoaudióloga
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORM 1: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar no Aplicativo'}
            </button>

            {/* Quick Demo Access Bar */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-600 block text-center mb-2">
                Acesso Rápido para Demonstração:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('paciente')}
                  className="p-2.5 text-xs font-semibold rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 transition-colors flex items-center justify-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5 text-teal-600" />
                  <span>Paciente (Camila)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('fonoaudiologa')}
                  className="p-2.5 text-xs font-semibold rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dra. Beatriz (Fono)</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* FORM 2: CADASTRO DO PACIENTE */}
        {mode === 'register_patient' && (
          <form onSubmit={handleRegisterPatient} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@email.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie sua senha segura"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar a Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Real-time Password Strength Feedback Component */}
            {password.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Força da Senha:</span>
                  <span className={`font-bold ${passwordCriteria.colorClass}`}>
                    {passwordCriteria.label}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordCriteria.score <= 1
                        ? 'bg-rose-500'
                        : passwordCriteria.score === 2
                        ? 'bg-amber-500'
                        : passwordCriteria.score === 3
                        ? 'bg-yellow-500'
                        : passwordCriteria.score === 4
                        ? 'bg-teal-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${passwordCriteria.percentage}%` }}
                  />
                </div>

                {/* Checklist criteria */}
                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasMinLength ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={passwordCriteria.hasMinLength ? 'text-slate-800 font-medium' : 'text-slate-600'}>
                      Mínimo 6 caracteres
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasNumber ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={passwordCriteria.hasNumber ? 'text-slate-800 font-medium' : 'text-slate-600'}>
                      Pelo menos 1 número
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasUpper && passwordCriteria.hasLower ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={passwordCriteria.hasUpper && passwordCriteria.hasLower ? 'text-slate-800 font-medium' : 'text-slate-600'}>
                      Maiúscula e minúscula
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.matchesConfirm ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={passwordCriteria.matchesConfirm ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                      {confirmPassword ? (passwordCriteria.matchesConfirm ? 'Senhas conferem' : 'Senhas diferentes') : 'Aguardando confirmação'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Código da Fonoaudióloga */}
            <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                <span>Código da Fonoaudióloga (Opcional agora)</span>
              </label>
              <p className="text-[11px] text-teal-800 leading-normal">
                Você pode inserir o código gerado pela sua fonoaudióloga agora ou quando for iniciar os exercícios vocais.
              </p>
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                placeholder="Ex: VOCA-2026"
                className="w-full uppercase font-mono tracking-wider px-3 py-2 text-xs rounded-lg border border-teal-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (password.length > 0 && !passwordCriteria.matchesConfirm)}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Finalizar Cadastro de Paciente'}
            </button>
          </form>
        )}

        {/* FORM 3: CADASTRO DA FONOAUDIÓLOGA */}
        {mode === 'register_therapist' && (
          <form onSubmit={handleRegisterTherapist} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome da Profissional
              </label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dra. Mariana Vasconcelos"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Telefone de Contato
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                E-mail Profissional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dra.mariana@clinica.com.br"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Senha Fono */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha forte"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmação Senha Fono */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmação da Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a senha da fonoaudióloga"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Feedback em tempo real sobre a senha */}
            {password.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Validação da Senha:</span>
                  <span className={`font-bold ${passwordCriteria.colorClass}`}>
                    {passwordCriteria.label}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordCriteria.score <= 1
                        ? 'bg-rose-500'
                        : passwordCriteria.score === 2
                        ? 'bg-amber-500'
                        : passwordCriteria.score === 3
                        ? 'bg-yellow-500'
                        : passwordCriteria.score === 4
                        ? 'bg-teal-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${passwordCriteria.percentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.hasMinLength ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={passwordCriteria.hasMinLength ? 'text-slate-800 font-medium' : 'text-slate-600'}>
                      Mínimo 6 dígitos
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {passwordCriteria.matchesConfirm ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className={passwordCriteria.matchesConfirm ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                      {confirmPassword ? (passwordCriteria.matchesConfirm ? 'Senhas conferem' : 'Senhas diferentes') : 'Aguardando confirmação'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <span>
                Após o cadastro, você terá acesso imediato ao painel clínico com gerador de códigos de acesso e prontuários dos pacientes.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || (password.length > 0 && !passwordCriteria.matchesConfirm)}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Cadastrando...' : 'Concluir Cadastro de Fonoaudióloga'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
