/*
 * FitnessClub — service worker: app instalável, uso sem rede e notificações push (fim do descanso).
 *
 * Cache (só GET da própria origem):
 * - Ficheiros do build (/_next/static, imutáveis), ícones e arte: cache primeiro.
 * - Páginas (navegação): rede primeiro, com 4 s de espera; sem rede, a última versão guardada desta página e,
 *   se não houver, /offline. Guardam-se as últimas 60 páginas abertas.
 * - Nunca: /api, /admin, Server Actions (POST), pedidos RSC da navegação interna.
 * As páginas têm dados da pessoa: o cache de páginas é apagado ao terminar sessão (ClearPrivateCache).
 * As escritas sem rede (séries do treino) ficam na fila do dispositivo (sessionQueue) e seguem quando a rede volta.
 */
const VERSION = 'v1';
const STATIC_CACHE = `fc-static-${VERSION}`;
const PAGES_CACHE = 'fc-pages';
const OFFLINE_URL = '/offline';
const PAGE_LIMIT = 60;
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((c) => c.add(new Request(OFFLINE_URL, { credentials: 'same-origin' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('fc-static-') && k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/game/');

const isPrivatePath = (url) => url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin');

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') cache.put(request, res.clone());
  return res;
}

async function trimPages(cache) {
  const keys = await cache.keys();
  const pages = keys.filter((k) => new URL(k.url).pathname !== OFFLINE_URL);
  await Promise.all(pages.slice(0, Math.max(0, pages.length - PAGE_LIMIT)).map((k) => cache.delete(k)));
}

async function networkFirstPage(event) {
  const { request } = event;
  const cache = await caches.open(PAGES_CACHE);
  const network = fetch(request).then(async (res) => {
    // Só respostas finais desta página (um redirect para /login não substitui a página guardada).
    if (res.ok && res.type === 'basic' && !res.redirected) {
      await cache.put(request, res.clone());
      trimPages(cache);
    }
    return res;
  });
  event.waitUntil(network.catch(() => undefined));
  const timeout = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS, null));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
  } catch {
    // sem rede: segue para o cache
  }
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    return await network;
  } catch {
    return (await cache.match(OFFLINE_URL, { ignoreVary: true })) || Response.error();
  }
}

// Páginas abertas pela navegação interna do Next (RSC) não passam pelo fetch abaixo: a app pede para as guardar.
const kept = new Map();
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'keep-page' || typeof data.path !== 'string' || !data.path.startsWith('/')) return;
  const url = new URL(data.path, self.location.origin);
  if (isPrivatePath(url) || url.pathname === OFFLINE_URL) return;
  const last = kept.get(url.pathname) || 0;
  if (Date.now() - last < 10 * 60 * 1000) return;
  kept.set(url.pathname, Date.now());
  event.waitUntil(
    (async () => {
      const res = await fetch(url.href, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
      if (!res.ok || res.redirected || !(res.headers.get('content-type') || '').includes('text/html')) return;
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(new Request(url.href), res);
      await trimPages(cache);
    })().catch(() => undefined),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url)) return;
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Navegação interna do Next (RSC): sem rede falha e o Next recarrega a página, que vem do cache abaixo.
  if (request.mode === 'navigate') event.respondWith(networkFirstPage(event));
});

// Push: payload JSON { title, body, url, tag, icon, badge, id } enviado pelo servidor (web-push).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : 'FitnessClub' };
  }
  const title = data.title || 'FitnessClub';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/', id: data.id },
      // O aviso de fim de descanso (tag 'rest') substitui o anterior e volta a tocar.
      renotify: data.tag === 'rest',
    }),
  );
});

// Tocar na notificação: foca uma janela da app aberta e navega para o url; senão abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        if ('navigate' in client) return client.navigate(url);
        return undefined;
      }
      return self.clients.openWindow(url);
    })(),
  );
});

