import React, { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidAppModal } from './AndroidAppModal';
import { triggerHaptic } from '../utils/androidBridge';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);

  // Suprime o botão de instalação quando já estiver rodando como App Standalone / APK
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    triggerHaptic(15);
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-[0.97] cursor-pointer ${
          isInstallable
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'
        }`}
        title={isInstallable ? 'Instalar Aplicativo Vocalis no Android' : 'Baixar / Instalar App Android'}
      >
        {isInstallable ? (
          <>
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Instalar App</span>
            <span className="sm:hidden">App</span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="hidden lg:inline">App Android</span>
          </>
        )}
      </button>

      <AndroidAppModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        isAndroid={isAndroid}
        onInstall={install}
      />
    </>
  );
};
