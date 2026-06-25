// MotoConnect Zambia — Service Worker
// Deploy this file alongside index.html on GitHub Pages.
// Bump CACHE_VERSION whenever you deploy a new build of index.html.
const CACHE_VERSION = 'mc-zambia-v3';
const SHELL = './index.html';

// ── INSTALL: pre-cache the app shell ──────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => c.add(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't let a cache failure block install
  );
});

// ── ACTIVATE: delete old caches ───────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: network-first for Firebase/API calls,
//           cache-first for app shell & assets ─────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Let non-GET requests (POST/PUT/DELETE to Firebase REST) pass through untouched
  if (e.request.method !== 'GET') return;

  // Firebase REST, Nominatim geocoding, and any external API → network only,
  // no caching (always needs live data)
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('nominatim.openstreetmap.org') ||
    url.includes('identitytoolkit')
  ) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App shell & static assets → cache-first, update in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);

      // Return cache immediately if available, else wait for network
      // (if both fail, serve the cached app shell as the fallback)
      return cached || networkFetch || caches.match(SHELL);
    })
  );
});
