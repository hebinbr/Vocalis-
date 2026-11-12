import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Modo Offline — Dados salvos localmente no dispositivo</span>
    </div>
  );
};
