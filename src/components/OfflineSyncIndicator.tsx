import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  Clock,
  ArrowUpCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { OfflineSyncStatus } from '../types';
import { offlineStorage } from '../services/indexedDbService';

interface OfflineSyncIndicatorProps {
  onManualSyncTriggered?: () => void;
}

export const OfflineSyncIndicator: React.FC<OfflineSyncIndicatorProps> = ({
  onManualSyncTriggered
}) => {
  const [status, setStatus] = useState<OfflineSyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    hasIndexedDb: true
  });
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [justSynced, setJustSynced] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = offlineStorage.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status.isSyncing) return;

    const res = await offlineStorage.syncPendingLogs();
    if (res.synced > 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
      if (onManualSyncTriggered) onManualSyncTriggered();
    }
  };

  // If online, 0 pending, and not syncing, show minimal unobtrusive badge
  const isAllSynced = status.isOnline && status.pendingCount === 0 && !status.isSyncing;

  return (
    <div className="relative inline-block text-xs">
      {/* Pill Trigger */}
      <div
        onClick={() => setShowDetails((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer select-none border shadow-2xs ${
          !status.isOnline
            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800'
            : status.pendingCount > 0
            ? 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-800 animate-pulse'
            : status.isSyncing
            ? 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-800'
            : justSynced
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
            : 'bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        }`}
        title="Status da Camada de Cache Local (IndexedDB & Sincronização)"
      >
        {!status.isOnline ? (
          <>
            <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Modo Offline (IndexedDB Ativo)</span>
            {status.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold text-[10px]">
                {status.pendingCount}
              </span>
            )}
          </>
        ) : status.isSyncing ? (
          <>
            <RefreshCw className="w-3 h-3 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
            <span>Sincronizando...</span>
          </>
        ) : status.pendingCount > 0 ? (
          <>
            <ArrowUpCircle className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>{status.pendingCount} pendente{status.pendingCount > 1 ? 's' : ''}</span>
            <button
              type="button"
              onClick={handleSyncClick}
              className="ml-1 px-1.5 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] cursor-pointer"
            >
              Sincronizar
            </button>
          </>
        ) : justSynced ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Sincronizado</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <Database className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span>IndexedDB Online</span>
          </>
        )}
      </div>

      {/* Expanded Details Popover */}
      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          <div className="absolute right-0 mt-2 w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 text-xs space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Cache Local & IndexedDB
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  status.isOnline
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                }`}
              >
                {status.isOnline ? 'Internet Conectada' : 'Sem Conexão'}
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Seus registros de treino e histórico vocal são gravados instantaneamente no banco local IndexedDB do seu navegador. Mesmo sem internet, seus dados ficam protegidos e sobem para o servidor automaticamente ao reconectar.
            </p>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status do Motor Local:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {status.hasIndexedDb ? 'IndexedDB v1 (Ativo)' : 'Memória / LocalStorage'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Treinos Pendentes de Sync:</span>
                <span className={`font-bold ${status.pendingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {status.pendingCount} {status.pendingCount === 1 ? 'exercício' : 'exercícios'}
                </span>
              </div>

              {status.lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Última Sincronização:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {status.lastSyncTime}
                  </span>
                </div>
              )}
            </div>

            {status.pendingCount > 0 && status.isOnline && (
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={status.isSyncing}
                className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`} />
                <span>{status.isSyncing ? 'Sincronizando...' : 'Sincronizar com o Prontuário Agora'}</span>
              </button>
            )}

            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <Info className="w-3 h-3 shrink-0" />
              <span>Sincronização em segundo plano habilitada para reconexão automática.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
