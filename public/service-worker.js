/**
 * Vocalis - Service Worker PWA (service-worker.js)
 * Gerencia cache de recursos estáticos, suporte offline e persistência
 * de notificações push mesmo após o fechamento da aba.
 */

const CACHE_NAME = 'vocalis-cache-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/images/avatar_therapist_1793024499041.jpg',
  '/images/vocal_anatomy_guide_1793024499378.jpg',
  '/reminder-worker.js'
];

// Instalação do Service Worker e pré-cache de ativos essenciais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Vocalis SW] Pré-armazenando ativos estáticos no cache:', CACHE_NAME);
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Vocalis SW] Aviso ao pré-carregar alguns ativos:', err);
      });
    })
  );
});

// Ativação do Service Worker: limpa caches antigos e assume controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Vocalis SW] Removendo cache obsoleto:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições:
// - Para /api/*: Network-First (rede primeiro, com fallback transparente)
// - Para recursos estáticos: Cache-First / Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Apenas requisições GET
  if (request.method !== 'GET') {
    return;
  }

  // Rotas de API do backend: Network-First com cache de leitura se rede falhar
  if (url.pathname.startsWith('/api/')) {
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
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('[Vocalis SW] Fornecendo resposta em cache offline para:', url.pathname);
            return cachedResponse;
          }
          return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Ativos estáticos e navegação: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se for requisição de navegação (HTML) e rede falhar, retorna index.html em cache
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Evento Push do Navegador (notificações push remotas ou locais)
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

// Recebe mensagens da aplicação (ex: disparos do timer em segundo plano)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'Vocalis: Alarme Vocal', {
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [250, 100, 250, 100, 250],
        tag: options?.tag || 'vocalis-reminder',
        renotify: true,
        requireInteraction: true,
        ...options
      })
    );
  }
});

// Manipula cliques na notificação do sistema
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se houver uma janela aberta do Vocalis, foca nela
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action: event.action,
            data: notificationData
          });
          return;
        }
      }
      // Se nenhuma janela estiver aberta, abre a página principal do app
      if (self.clients.openWindow) {
        return self.clients.openWindow('/#exercises');
      }
    })
  );
});
