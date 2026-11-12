import React from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { triggerHaptic } from '../utils/androidBridge';

type TabType = 'exercises' | 'progress' | 'reminders' | 'vault' | 'therapist';

interface MobileBottomNavProps {
  currentTab: TabType;
  isTherapist: boolean;
  onSelectTab: (tab: TabType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  isTherapist,
  onSelectTab,
}) => {
  const handleSelect = (tab: TabType) => {
    triggerHaptic(10);
    onSelectTab(tab);
  };

  const navItems: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accent?: 'indigo' | 'emerald' | 'teal';
  }> = [
    ...(isTherapist
      ? [
          {
            id: 'therapist' as TabType,
            label: 'Fono',
            icon: Stethoscope,
            accent: 'indigo' as const,
          },
        ]
      : []),
    {
      id: 'exercises',
      label: 'Exercícios',
      icon: Activity,
      accent: 'teal',
    },
    {
      id: 'progress',
      label: 'Progresso',
      icon: BarChart3,
      accent: 'teal',
    },
    {
      id: 'reminders',
      label: 'Lembretes',
      icon: Bell,
      accent: 'teal',
    },
    {
      id: 'vault',
      label: 'Vault',
      icon: ShieldCheck,
      accent: 'emerald',
    },
  ];

  return (
    <nav
      aria-label="Navegação inferior Android"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.45)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const activeColorClass =
            item.accent === 'indigo'
              ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
              : item.accent === 'emerald'
              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
              : 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 text-[11px] font-semibold transition-all active:scale-95 focus:outline-none"
            >
              <div
                className={`px-3.5 py-1 rounded-full transition-colors ${
                  isActive
                    ? activeColorClass
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`leading-tight ${
                  isActive
                    ? 'text-slate-900 dark:text-slate-100 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
