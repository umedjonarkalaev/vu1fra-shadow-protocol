const CACHE_NAME = 'vu1fra-shadow-protocol-v3';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve(true);
          })
        );
      } catch {
        // Ignore cache cleanup errors
      }

      try {
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
        for (const client of windowClients) {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url).catch(() => {});
          }
        }
      } catch {
        // Ignore client claim/navigate errors
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never intercept document/iframe navigations or non-follow redirect requests
  if (
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.destination === 'iframe' ||
    req.redirect !== 'follow'
  ) {
    return;
  }

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Only cache static PWA icon/manifest assets; let Vite/app scripts & HTML pass through directly
  const isStaticAsset =
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webmanifest');
  if (!isStaticAsset) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic' && !res.redirected) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
