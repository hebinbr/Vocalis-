// Ensure window.fetch has both getter and setter for browser extensions and interceptors
if (typeof window !== 'undefined') {
  try {
    let _fetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return _fetch;
      },
      set(fn) {
        _fetch = fn;
      },
      configurable: true,
      enumerable: true,
    });
  } catch (_) {}
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

// Registro do Service Worker para gerenciar cache e garantir sempre a versão mais recente
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('[Vocalis PWA] Service Worker registrado:', registration.scope);
        registration.update();
      })
      .catch((error) => {
        console.warn('[Vocalis PWA] Falha ao registrar Service Worker:', error);
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      }
    });
  });
}
