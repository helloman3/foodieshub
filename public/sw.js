const CACHE_NAME = 'foodiehub-pos-v11';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/icons/foodiehub-192.png',
  '/icons/foodiehub-512.png',
  '/icons/foodiehub-32.png',
  '/icons/foodiehub-192.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // API calls are always live network
  if (url.pathname.startsWith('/api/')) return;

  // Network-First strategy: Always get fresh code from server when connected
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return (await caches.match('/index.html')) || (await caches.match('/offline.html'));
        }
        return new Response('Network error', { status: 503, statusText: 'Offline' });
      })
  );
});
