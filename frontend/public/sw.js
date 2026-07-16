/* Keventers PWA service worker.
 * - App shell precache + navigation network-first (offline fallback to shell).
 * - Static assets: stale-while-revalidate.
 * - API + non-GET requests: always network (the app's Offline Platform owns the
 *   offline mutation queue; the SW must not cache or replay API writes).
 * - Push-notification ready (a 'push' handler stub for later wiring).
 */
const VERSION = 'kv-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

function isApi(url) {
  return url.pathname.startsWith('/api') || url.pathname.includes('/socket.io');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never cache mutations
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isApi(url)) return; // let the network handle it

  // Navigations → network-first, fall back to the cached shell (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || caches.match('/index.html'))),
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// Push-notification ready (wired to the Notification Platform later).
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Keventers', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Keventers', {
      body: payload.body,
      icon: '/brand/favicon.svg',
      data: payload.data || {},
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/';
  event.waitUntil(self.clients.openWindow(href));
});
