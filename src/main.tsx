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
