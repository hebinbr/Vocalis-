import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Mic,
  WifiOff,
  Bell,
  FileText,
  Sparkles,
  Youtube,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { triggerHaptic } from '../utils/androidBridge';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  onInstall: () => Promise<boolean>;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  isIOS,
  isAndroid,
  onInstall,
}) => {
  const [installing, setInstalling] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    triggerHaptic(20);
    setInstalling(true);
    try {
      const accepted = await onInstall();
      if (accepted) {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyCommand = async () => {
    const cmd = 'npm run android:sync';
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(true);
      triggerHaptic(12);
      setTimeout(() => setCopiedCmd(false), 2500);
    } catch {}
  };

  const androidCapabilities = [
    {
      icon: Mic,
      title: 'Biofeedback Vocal em Tempo Real',
      desc: 'Captura de microfone e monitor de frequência (Hz) nativo no celular',
    },
    {
      icon: WifiOff,
      title: 'Offline Total (IndexedDB + Service Worker)',
      desc: 'Registre exercícios sem internet e sincronize automaticamente ao reconectar',
    },
    {
      icon: Bell,
      title: 'Notificações & Vibração Háptica',
      desc: 'Lembretes programados com dias da semana, alerta sonoro e vibração',
    },
    {
      icon: FileText,
      title: 'PDF Clínico & Compartilhamento Android',
      desc: 'Exporte o relatório de 30 dias e envie direto via WhatsApp ou Gmail',
    },
    {
      icon: Youtube,
      title: 'Vídeos Demonstrativos & Dica Gemini',
      desc: 'Links do YouTube integrados e orientação diária personalizada por IA',
    },
    {
      icon: ShieldCheck,
      title: 'Tela Sempre Ativa & Vault LGPD',
      desc: 'Impede bloqueio de tela durante o treino e criptografa dados locais',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-600/10 via-emerald-600/5 to-transparent dark:from-teal-500/15">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 text-white flex items-center justify-center shadow-md shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider block">
                Vocalis Mobile · Android App
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 font-display">
                Instalar e Usar no Android
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Primary Install Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-200" />
                  <span>
                    {isInstalled
                      ? 'App Android Instalado e Ativo'
                      : 'Instalação Instantânea no Android'}
                  </span>
                </h4>
                <p className="text-xs text-teal-50/90 mt-1 leading-relaxed">
                  {isInstalled
                    ? 'Você já está executando o Vocalis em modo aplicativo independente (Standalone), com acesso completo ao microfone, offline e notificações.'
                    : 'Instale o Vocalis diretamente na tela inicial do seu celular Android com ícone nativo, tela cheia sem barra do navegador e funcionamento offline.'}
                </p>
              </div>
            </div>

            {!isInstalled && isInstallable && (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3 px-4 rounded-xl bg-white text-teal-800 hover:bg-teal-50 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Instalando App...' : 'Instalar Vocalis no Dispositivo'}</span>
              </button>
            )}

            {!isInstalled && !isInstallable && (
              <div className="p-3.5 rounded-xl bg-slate-950/25 border border-white/15 text-xs space-y-2">
                {isIOS ? (
                  <>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Como instalar no iPhone / iPad (Safari):</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-teal-50">
                      <li>Toque no ícone <strong>Compartilhar</strong> na barra do Safari.</li>
                      <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>
                        {isAndroid
                          ? 'Como instalar no Android Chrome:'
                          : 'Para instalar no seu smartphone Android:'}
                      </span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-teal-50">
                      <li>Abra este aplicativo no <strong>Google Chrome</strong> do seu Android.</li>
                      <li>Toque no menu <strong>⋮ (três pontos)</strong> no canto superior direito.</li>
                      <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                    </ol>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 100% Web Feature Parity Matrix */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Todas as Funcionalidades Web Integradas no Android
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {androidCapabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight flex items-center gap-1">
                        <span>{item.title}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Native Android Studio APK Build Section */}
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Projeto Nativo Android Studio (.APK) Incluso
                </h4>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Kotlin + WebView
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              O repositório já conta com o projeto nativo completo na pasta <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-900 font-mono text-[10px]">android/</code> com permissões de microfone (<code className="font-mono text-[10px]">RECORD_AUDIO</code>), notificações, tela ativa e compartilhamento de PDF via <code className="font-mono text-[10px]">FileProvider</code>. Para empacotar os arquivos Web dentro do APK:
            </p>
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs">
              <span className="truncate">npm run android:sync</span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-[10px] font-sans font-semibold flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedCmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
