/**
 * Vocalis - Service Worker PWA (service-worker.js)
 * Versão v10: Network-First com limpeza ativa de caches legados e suporte offline.
 */

const CACHE_NAME = 'vocalis-cache-v10';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/images/avatar_therapist_1793024499041.jpg',
  '/images/vocal_anatomy_guide_1793024499378.jpg',
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
    }).then(async () => {
      await self.clients.claim();
      // Notifica todas as abas abertas para recarregar o bundle atualizado
      const allClients = await self.clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      }
    })
  );
});

// Estratégia Network-First: Sempre busca a versão mais recente na rede.
// Se estiver offline ou a conexão cair, recorre ao cache local.
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

  // Network-First para todas as requisições (APIs, HTML, JS, CSS e imagens)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback offline: busca do cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Se for navegação (HTML) e estiver offline, serve index.html
        if (request.mode === 'navigate') {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
        }

        // Se for API e offline
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

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Comunicação com a aplicação
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_OLD_CACHES') {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (key !== CACHE_NAME) caches.delete(key);
      });
    });
  }
});
