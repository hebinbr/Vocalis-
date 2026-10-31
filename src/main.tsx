import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Error Boundary para evitar tela branca em caso de qualquer exceção não tratada
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Vocalis] Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto text-xl font-bold">
              V
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
              Recuperando Vocalis Fonoaudiologia
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Ocorreu uma instabilidade pontual na inicialização da interface. Clique abaixo para restabelecer os dados e a sessão.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('vocalis-cache-v10');
                  } catch (e) {}
                  window.location.reload();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all"
              >
                Recarregar Aplicativo
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                    if ('caches' in window) {
                      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
                    }
                  } catch (e) {}
                  window.location.reload();
                }}
                className="w-full py-2 px-4 rounded-xl text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Limpar Cache Local e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Registro seguro do Service Worker (sem loops de reload)
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('[Vocalis PWA] Service Worker registrado com sucesso:', registration.scope);
      })
      .catch((error) => {
        console.warn('[Vocalis PWA] Registro do Service Worker dispensado:', error);
      });
  });
}
