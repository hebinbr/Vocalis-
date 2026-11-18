import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Tipagem local do Service Worker para manter 100% de compatibilidade com tsconfig DOM do frontend
interface SwWindowClient {
  id: string;
  url: string;
  focused?: boolean;
  focus: () => Promise<SwWindowClient>;
  navigate: (url: string) => Promise<SwWindowClient | null>;
  postMessage: (message: unknown) => void;
}

interface SwNotificationAction {
  action: string;
  title: string;
}

interface SwNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: SwNotificationAction[];
  renotify?: boolean;
}

interface SwRegistration extends ServiceWorkerRegistration {
  showNotification: (title: string, options?: SwNotificationOptions) => Promise<void>;
}

interface SwGlobalScope {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  location: Location;
  registration: SwRegistration;
  skipWaiting: () => Promise<void>;
  clients: {
    matchAll: (options?: { type?: 'window' | 'worker' | 'sharedworker' | 'all'; includeUncontrolled?: boolean }) => Promise<SwWindowClient[]>;
    openWindow: (url: string) => Promise<SwWindowClient | null>;
  };
  addEventListener: (type: string, listener: (event: any) => void) => void;
}

declare global {
  interface Window {
    __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  }
}

const sw = self as unknown as SwGlobalScope;

// Token literal exigido pelo workbox-build injectManifest
const manifestEntries = self.__WB_MANIFEST;
const isProdBuild = Array.isArray(manifestEntries) && manifestEntries.length > 0;

// Workbox Precache & Lifecycle
cleanupOutdatedCaches();
if (isProdBuild) {
  precacheAndRoute(manifestEntries);
}
clientsClaim();

sw.addEventListener('install', () => {
  void sw.skipWaiting();
});

// Em modo dev, limpa caches de builds anteriores para evitar HTML/chunks desatualizados no preview
sw.addEventListener('activate', (event: { waitUntil: (p: Promise<unknown>) => void }) => {
  if (!isProdBuild) {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name.includes('workbox-precache'))
            .map((name) => caches.delete(name))
        )
      )
    );
  }
});

// Runtime Caching apenas para APIs e fontes; em dev nunca intercepta navegações ou módulos Vite
registerRoute(/^\/api\/.*/i, new NetworkOnly());

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// SPA Navigation NetworkFirst apenas em build de produção (nunca intercepta navegações no dev server)
if (isProdBuild) {
  try {
    registerRoute(
      new NavigationRoute(
        async ({ request }) => {
          try {
            const networkResponse = await fetch(request.url, {
              credentials: 'same-origin',
            });
            if (networkResponse && networkResponse.ok) {
              return networkResponse;
            }
          } catch {
            // Sem rede: segue para fallback offline
          }
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return fetch(request);
        },
        { denylist: [/^\/api/] }
      )
    );
  } catch {
    // Fallback seguro
  }
}

// ============================================================================
// IndexedDB Store no Service Worker para verificação em segundo plano (PeriodicSync / Sync)
// ============================================================================
const IDB_NAME = 'vocalis_sw_reminders_db';
const IDB_STORE = 'state';
const DAY_MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const CATEGORY_LABELS: Record<string, string> = {
  aquecimento: 'Aquecimento Vocal',
  hidratacao: 'Hidratação Laríngea',
  exercicio: 'Exercício Terapêutico',
  desaquecimento: 'Desaquecimento Vocal',
};

interface SwReminder {
  id: number;
  title: string;
  time_str: string;
  days_mask: string[];
  is_active: boolean;
  sound_alert?: boolean;
  category: string;
  exercise_id?: string;
}

interface SwSavedState {
  reminders: SwReminder[];
  tzOffsetMinutes: number;
  firedKeys?: Record<string, number>;
}

function openSwDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readSwState(): Promise<SwSavedState> {
  try {
    const db = await openSwDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get('config');
      req.onsuccess = () => resolve((req.result as SwSavedState) || { reminders: [], tzOffsetMinutes: 180, firedKeys: {} });
      req.onerror = () => resolve({ reminders: [], tzOffsetMinutes: 180, firedKeys: {} });
    });
  } catch {
    return { reminders: [], tzOffsetMinutes: 180, firedKeys: {} };
  }
}

async function writeSwState(next: SwSavedState): Promise<void> {
  try {
    const db = await openSwDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(next, 'config');
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB errors
  }
}

async function checkOfflineDueReminders(): Promise<void> {
  const state = await readSwState();
  if (!Array.isArray(state.reminders) || state.reminders.length === 0) return;

  const nowMs = Date.now();
  const tzOffsetMs = (state.tzOffsetMinutes ?? 180) * 60_000;
  const localNow = new Date(nowMs - tzOffsetMs);
  const dayCode = DAY_MAP[localNow.getUTCDay()];
  const dateStr = `${localNow.getUTCFullYear()}-${String(localNow.getUTCMonth() + 1).padStart(2, '0')}-${String(localNow.getUTCDate()).padStart(2, '0')}`;
  const currentTotalMin = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();

  const firedKeys: Record<string, number> = { ...(state.firedKeys || {}) };
  let changed = false;

  for (const [k, ts] of Object.entries(firedKeys)) {
    if (nowMs - ts > 4 * 60 * 60 * 1000) {
      delete firedKeys[k];
      changed = true;
    }
  }

  for (const rem of state.reminders) {
    if (!rem.is_active) continue;
    const days = Array.isArray(rem.days_mask) ? rem.days_mask : [];
    if (!days.includes(dayCode)) continue;

    const [hhStr, mmStr] = String(rem.time_str || '').split(':');
    const remMin = Number(hhStr) * 60 + Number(mmStr);
    if (!Number.isFinite(remMin)) continue;

    const diffMin = currentTotalMin - remMin;
    if (diffMin >= 0 && diffMin <= 10) {
      const key = `${rem.id}_${dateStr}_${rem.time_str}`;
      if (firedKeys[key]) continue;

      firedKeys[key] = nowMs;
      changed = true;

      const catLabel = CATEGORY_LABELS[rem.category] || 'Higiene Vocal';
      await sw.registration.showNotification(`Vocalis: ${rem.title}`, {
        body: `⏰ Horário de ${catLabel} (${rem.time_str}). Toque para iniciar seu exercício vocal.`,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `vocalis-reminder-${rem.id}-${dateStr}-${rem.time_str}`,
        requireInteraction: true,
        renotify: true,
        vibrate: [250, 100, 250, 100, 250],
        actions: [{ action: 'practice', title: 'Praticar Agora' }],
        data: {
          reminderId: rem.id,
          exerciseId: rem.exercise_id || '',
          url: `/?tab=exercises&reminderId=${encodeURIComponent(String(rem.id))}`,
        },
      });
    }
  }

  if (changed) {
    await writeSwState({ ...state, firedKeys });
  }
}

sw.addEventListener('message', (event: { data?: { type?: string; payload?: { reminders?: SwReminder[]; tzOffsetMinutes?: number } } }) => {
  const { type, payload } = event.data || {};
  if (type === 'SYNC_REMINDERS' && payload) {
    void (async () => {
      const prev = await readSwState();
      await writeSwState({
        reminders: Array.isArray(payload.reminders) ? payload.reminders : prev.reminders,
        tzOffsetMinutes:
          typeof payload.tzOffsetMinutes === 'number'
            ? payload.tzOffsetMinutes
            : prev.tzOffsetMinutes,
        firedKeys: prev.firedKeys || {},
      });
    })();
  } else if (type === 'SKIP_WAITING') {
    void sw.skipWaiting();
  }
});

sw.addEventListener('push', (event: { data?: { json: () => any; text: () => string }; waitUntil: (p: Promise<unknown>) => void }) => {
  const showPush = async () => {
    let data: any = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch {
      const text = event.data ? event.data.text() : '';
      data = { body: text };
    }

    const title = data.title || 'Vocalis: Lembrete de Exercício Vocal';
    const body = data.body || 'Está na hora do seu treino vocal diário. Toque para praticar.';
    const reminderId = data.reminderId ?? '';
    const exerciseId = data.exerciseId ?? '';
    const url = data.url || (reminderId ? `/?tab=exercises&reminderId=${encodeURIComponent(String(reminderId))}` : '/?tab=exercises');

    await sw.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || `vocalis-push-${reminderId || Date.now()}`,
      requireInteraction: true,
      renotify: true,
      vibrate: [250, 100, 250, 100, 250],
      actions: [{ action: 'practice', title: 'Praticar Agora' }],
      data: {
        reminderId,
        exerciseId,
        url,
      },
    });
  };

  event.waitUntil(showPush());
});

sw.addEventListener('notificationclick', (event: {
  notification: Notification & { data?: { reminderId?: number | string; exerciseId?: string; url?: string } };
  waitUntil: (p: Promise<unknown>) => void;
}) => {
  event.notification.close();

  const data = event.notification.data || {};
  const reminderId = data.reminderId;
  const exerciseId = data.exerciseId;
  const targetUrl =
    data.url ||
    (reminderId
      ? `/?tab=exercises&reminderId=${encodeURIComponent(String(reminderId))}`
      : '/?tab=exercises');

  const handleClick = async () => {
    const windowClients = await sw.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of windowClients) {
      if (client.url.startsWith(sw.location.origin)) {
        await client.focus();
        client.postMessage({
          type: 'OPEN_REMINDER_EXERCISE',
          reminderId,
          exerciseId,
        });
        return;
      }
    }

    if (sw.clients.openWindow) {
      await sw.clients.openWindow(targetUrl);
    }
  };

  event.waitUntil(handleClick());
});

sw.addEventListener('periodicsync', (event: { tag?: string; waitUntil: (p: Promise<unknown>) => void }) => {
  if (event.tag === 'vocalis-reminder-check') {
    event.waitUntil(checkOfflineDueReminders());
  }
});

sw.addEventListener('sync', (event: { tag?: string; waitUntil: (p: Promise<unknown>) => void }) => {
  if (event.tag === 'vocalis-reminder-check') {
    event.waitUntil(checkOfflineDueReminders());
  }
});
