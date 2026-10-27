import React from 'react';
import {
  Activity,
  ShieldCheck,
  Flame,
  Bell,
  User as UserIcon,
  Sparkles,
  Stethoscope,
  LogIn,
  LogOut,
  KeyRound
} from 'lucide-react';
import { Patient, User } from '../types';

interface HeaderProps {
  currentTab: 'exercises' | 'progress' | 'reminders' | 'vault' | 'therapist';
  onSelectTab: (tab: 'exercises' | 'progress' | 'reminders' | 'vault' | 'therapist') => void;
  patient: Patient | null;
  currentUser: User | null;
  onOpenProfile: () => void;
  onStartQuickExercise: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  patient,
  currentUser,
  onOpenProfile,
  onStartQuickExercise,
  onOpenAuth,
  onLogout,
}) => {
  const isTherapist = currentUser?.role === 'fonoaudiologa';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Wordmark Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab(isTherapist ? 'therapist' : 'exercises')}
              className="flex items-center gap-2 text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                V
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  Vocalis
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                  Fonoaudiologia
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
            {isTherapist ? (
              <button
                onClick={() => onSelectTab('therapist')}
                className={`hover:text-indigo-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 flex items-center gap-1.5 ${
                  currentTab === 'therapist'
                    ? 'border-indigo-600 text-indigo-900 font-semibold'
                    : 'border-transparent text-slate-600'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-indigo-600" />
                <span>Painel da Fonoaudióloga</span>
              </button>
            ) : null}

            <button
              onClick={() => onSelectTab('exercises')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentTab === 'exercises'
                  ? 'border-teal-600 text-teal-800 font-semibold'
                  : 'border-transparent text-slate-600'
              }`}
            >
              Exercícios Vocais
            </button>

            <button
              onClick={() => onSelectTab('progress')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentTab === 'progress'
                  ? 'border-teal-600 text-teal-800 font-semibold'
                  : 'border-transparent text-slate-600'
              }`}
            >
              Progresso Visual
            </button>

            <button
              onClick={() => onSelectTab('reminders')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentTab === 'reminders'
                  ? 'border-teal-600 text-teal-800 font-semibold'
                  : 'border-transparent text-slate-600'
              }`}
            >
              Lembretes Diários
            </button>

            <button
              onClick={() => onSelectTab('vault')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 flex items-center gap-1.5 ${
                currentTab === 'vault'
                  ? 'border-teal-600 text-teal-800 font-semibold'
                  : 'border-transparent text-slate-600'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Privacidade & Vault</span>
            </button>
          </nav>

          {/* Status & Action Hub */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Gamification Level & XP pill (if patient) */}
            {!isTherapist && patient && (
              <div
                onClick={() => onSelectTab('progress')}
                className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-800 cursor-pointer transition-colors text-xs font-semibold"
                title={`${patient.xp_points} XP acumulados · Nível ${patient.level}: ${patient.level_title || 'Ressonador Ativo'}`}
              >
                <div className="w-5 h-5 rounded-lg bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">
                  {patient.level}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-semibold text-slate-700 leading-none">
                    {patient.level_title || 'Ressonador'}
                  </span>
                  <span className="text-[10px] text-teal-800 font-bold tabular-nums">
                    {patient.xp_points} XP
                  </span>
                </div>
              </div>
            )}

            {/* Streak Pill */}
            {!isTherapist && patient && (
              <div
                onClick={() => onSelectTab('progress')}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors text-xs font-semibold"
                title={`${patient.streak_count} dias consecutivos de prática vocal`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span className="tabular-nums">{patient.streak_count}d</span>
              </div>
            )}

            {/* User Account / Role Badge */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 px-2 py-1 rounded-xl text-xs">
                {isTherapist ? (
                  <Stethoscope className="w-4 h-4 text-indigo-600 shrink-0" />
                ) : (
                  <UserIcon className="w-4 h-4 text-teal-700 shrink-0" />
                )}
                <div className="flex flex-col text-left max-w-[120px] sm:max-w-none">
                  <span className="font-bold text-slate-900 truncate text-[11px] leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-none capitalize">
                    {isTherapist ? 'Fonoaudióloga' : currentUser.is_activated ? 'Paciente Ativo' : 'Pendente Código'}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="ml-1 p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                  title="Trocar de conta / Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 transition-colors flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar / Cadastrar</span>
              </button>
            )}

            {!isTherapist && (
              <button
                onClick={onOpenProfile}
                className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors hidden sm:block"
                title="Meu Perfil Clínico"
                aria-label="Perfil do Paciente"
              >
                <UserIcon className="w-5 h-5" />
              </button>
            )}

            {!isTherapist ? (
              <button
                onClick={onStartQuickExercise}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Praticar</span>
              </button>
            ) : (
              <button
                onClick={() => onSelectTab('therapist')}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Gerar Código</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile secondary navigation strip */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-100 text-xs font-medium text-slate-600 overflow-x-auto gap-2">
          {isTherapist && (
            <button
              onClick={() => onSelectTab('therapist')}
              className={`px-2.5 py-1.5 rounded-md whitespace-nowrap flex items-center gap-1 ${
                currentTab === 'therapist' ? 'bg-indigo-50 text-indigo-900 font-bold' : ''
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
              <span>Painel Fono</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('exercises')}
            className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
              currentTab === 'exercises' ? 'bg-teal-50 text-teal-800 font-semibold' : ''
            }`}
          >
            Exercícios
          </button>
          <button
            onClick={() => onSelectTab('progress')}
            className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
              currentTab === 'progress' ? 'bg-teal-50 text-teal-800 font-semibold' : ''
            }`}
          >
            Progresso
          </button>
          <button
            onClick={() => onSelectTab('reminders')}
            className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
              currentTab === 'reminders' ? 'bg-teal-50 text-teal-800 font-semibold' : ''
            }`}
          >
            Lembretes
          </button>
          <button
            onClick={() => onSelectTab('vault')}
            className={`px-2.5 py-1.5 rounded-md whitespace-nowrap flex items-center gap-1 ${
              currentTab === 'vault' ? 'bg-teal-50 text-teal-800 font-semibold' : ''
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Vault</span>
          </button>
        </div>
      </div>
    </header>
  );
};
