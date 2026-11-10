import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  ArrowUpCircle,
  ShieldCheck,
  ChevronDown,
  CloudCheck,
  Sparkles,
  Lock,
  HardDrive
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

  const handleSyncClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (status.isSyncing) return;

    const res = await offlineStorage.syncPendingLogs();
    if (res.synced > 0 || res.failed === 0) {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
      if (onManualSyncTriggered) onManualSyncTriggered();
    }
  };

  return (
    <div className="relative inline-block text-xs">
      {/* Modern Renovated Pill Button */}
      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        aria-expanded={showDetails}
        aria-label="Status de sincronização e armazenamento do prontuário vocal"
        className={`group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none border shadow-xs active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${
          !status.isOnline
            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-700/60'
            : status.pendingCount > 0
            ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-300/60 dark:border-sky-700/60 ring-1 ring-sky-400/20 animate-pulse'
            : status.isSyncing
            ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-300/60 dark:border-teal-700/60'
            : justSynced
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/60 dark:border-emerald-600/60 shadow-emerald-500/10'
            : 'bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
        title="Status da Sincronização & Proteção de Dados (Clique para detalhes)"
      >
        {/* Visual Status Indicator Dot / Icon */}
        {!status.isOnline ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold tracking-tight">Offline</span>
            {status.pendingCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold text-[10px]">
                {status.pendingCount}
              </span>
            )}
          </>
        ) : status.isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-spin shrink-0" />
            <span className="font-semibold tracking-tight">Sincronizando...</span>
          </>
        ) : status.pendingCount > 0 ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <ArrowUpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span className="font-semibold tracking-tight">
              {status.pendingCount} pendente{status.pendingCount > 1 ? 's' : ''}
            </span>
            <span
              onClick={handleSyncClick}
              role="button"
              className="ml-1 px-1.5 py-0.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] transition-colors shadow-2xs"
            >
              Subir
            </span>
          </>
        ) : justSynced ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-bounce" />
            <span className="font-semibold tracking-tight text-emerald-700 dark:text-emerald-300">
              Atualizado
            </span>
          </>
        ) : (
          <>
            {/* Live Pulsing Green Beacon */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
            </span>
            {/* Elegant Shield/Check Icon */}
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold tracking-tight">
              Sincronizado
            </span>
          </>
        )}

        {/* Small subtle chevron indicating interactivity */}
        <ChevronDown
          className={`w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            showDetails ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'group-hover:translate-y-0.5'
          }`}
        />
      </button>

      {/* Expanded Details Popover with Clinical Elegance */}
      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-[1px] transition-opacity"
            onClick={() => setShowDetails(false)}
          />
          <div className="absolute right-0 mt-2 w-84 sm:w-96 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-none">
                    Prontuário & Sincronização
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Armazenamento híbrido e seguro
                  </p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  status.isOnline
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    status.isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {status.isOnline ? 'Nuvem Conectada' : 'Modo Offline Ativo'}
              </span>
            </div>

            {/* Explanation */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Seus registros de treino e histórico vocal são gravados instantaneamente no cache local do dispositivo (<span className="font-semibold text-slate-800 dark:text-slate-200">IndexedDB</span>) e sincronizados de forma transparente com o prontuário central (<span className="font-semibold text-slate-800 dark:text-slate-200">SQLite</span>).
              </p>
            </div>

            {/* System Status Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <HardDrive className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  <span>Cache Local</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {status.hasIndexedDb ? 'Ativo e Protegido' : 'Memória Transitória'}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <ArrowUpCircle className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                  <span>Fila de Upload</span>
                </div>
                <p
                  className={`font-bold ${
                    status.pendingCount > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {status.pendingCount === 0
                    ? 'Tudo em Dia'
                    : `${status.pendingCount} pendente(s)`}
                </p>
              </div>
            </div>

            {/* Last Sync Timestamp */}
            {status.lastSyncTime && (
              <div className="flex items-center justify-between px-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Última sincronização bem-sucedida:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {status.lastSyncTime}
                </span>
              </div>
            )}

            {/* Manual Sync Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleSyncClick()}
                disabled={status.isSyncing || !status.isOnline}
                className="w-full py-2.5 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${status.isSyncing ? 'animate-spin' : ''}`}
                />
                <span>
                  {status.isSyncing
                    ? 'Sincronizando com o Servidor...'
                    : status.pendingCount > 0
                    ? `Sincronizar ${status.pendingCount} Exercício(s) Pendente(s)`
                    : 'Verificar & Sincronizar Agora'}
                </span>
              </button>
            </div>

            {/* Footer Assurance */}
            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <Lock className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
              <span>Garantia de integridade: nenhum treino é perdido ao fechar a aba.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
