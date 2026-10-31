/**
 * Vocalis - Service Worker PWA (service-worker.js)
 * Versão v11: Estratégia segura, sem interceptar módulos do Vite, suporte a Push Notifications.
 */

const CACHE_NAME = 'vocalis-cache-v11';

// Apenas ativos estáticos imutáveis são pré-cacheados (nunca o HTML dinâmico ou scripts JS)
const STATIC_ASSETS = [
  '/icon.svg',
  '/reminder-worker.js'
];

// Instalação do Service Worker com ativação imediata
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Vocalis SW] Aviso no pré-cache:', err);
      });
    })
  );
});

// Ativação: Limpa TODOS os caches antigos e assume controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Vocalis SW] Purgando cache obsoleto:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de Fetch com regras estritas de segurança
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Apenas requisições GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignora extensões de navegador
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // NUNCA interceptar requisições do Vite Dev Server ou arquivos de código TypeScript/React
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.search.includes('import') ||
    url.search.includes('v=') ||
    url.pathname.includes('hot-update')
  ) {
    return;
  }

  // Network-First para requisições com fallback seguro
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Apenas faz cache de imagens estáticas ou fontes (evita cachear HTML dinâmico ou APIs)
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/images/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        if (url.pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'Modo Offline', offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('Offline', { status: 503 });
      })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Vocalis - Exercício Agendado', body: event.data.text() };
    }
  }

  const title = data.title || 'Vocalis: Hora do Exercício Vocal';
  const options = {
    body: data.body || 'Seu lembrete programado de cuidados vocais começou.',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'vocalis-reminder',
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: '/#exercises' },
    actions: [
      { action: 'open', title: 'Praticar Agora' },
      { action: 'dismiss', title: 'Mais Tarde' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na Notificação Push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se houver uma aba aberta do Vocalis, foca nela
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'START_REMINDER_EXERCISE',
            reminderData: event.notification.data
          });
          return client.focus();
        }
      }

      // Se o app estiver fechado em segundo plano, abre a página
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
