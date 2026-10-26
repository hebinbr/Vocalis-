import React from 'react';
import { Activity, ShieldCheck, Flame, Bell, User, Sparkles } from 'lucide-react';
import { Patient } from '../types';

interface HeaderProps {
  currentTab: 'exercises' | 'progress' | 'reminders' | 'vault';
  onSelectTab: (tab: 'exercises' | 'progress' | 'reminders' | 'vault') => void;
  patient: Patient | null;
  onOpenProfile: () => void;
  onStartQuickExercise: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  patient,
  onOpenProfile,
  onStartQuickExercise,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('exercises')}
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

          {/* Zone 2: 4 clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
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

          {/* Zone 3: 1 primary action & patient status */}
          <div className="flex items-center gap-3 shrink-0">
            {patient && (
              <div
                onClick={onOpenProfile}
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors text-xs font-semibold"
                title={`${patient.streak_count} dias consecutivos de prática vocal`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span className="tabular-nums">{patient.streak_count}</span>
                <span className="font-normal text-amber-800">dias seguidos</span>
              </div>
            )}

            <button
              onClick={onOpenProfile}
              className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Meu Perfil Clínico"
              aria-label="Perfil do Paciente"
            >
              <User className="w-5 h-5" />
            </button>

            <button
              onClick={onStartQuickExercise}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Praticar Agora</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation strip */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-slate-100 text-xs font-medium text-slate-600 overflow-x-auto gap-2">
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
            <span>Vault Cripto</span>
          </button>
        </div>
      </div>
    </header>
  );
};
