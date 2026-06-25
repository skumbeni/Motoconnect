// MotoConnect Zambia — Service Worker
// Repo: skumbeni/Motoconnect → served at /Motoconnect/
// Based on proven GitHub Pages PWA pattern

const GHPATH = '/Motoconnect';
const CACHE  = 'mc-v5';

// Every URL the app needs to open offline — both slash forms required
const URLS = [
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/sw.js`,
  `${GHPATH}/manifest.json`,
];

// ── INSTALL: pre-cache everything in URLS using addAll ──
// addAll is atomic — if any URL 404s, the whole install fails,
// so you know immediately if something is wrong.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: wipe old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for shell, network-only for Firebase/APIs ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Firebase REST, auth, geocoding — always network, never cache
  if (
    url.includes('firebaseio.com')    ||
    url.includes('googleapis.com')    ||
    url.includes('identitytoolkit')   ||
    url.includes('nominatim.openstreetmap.org')
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        // Serve from cache immediately; refresh cache in background
        fetch(e.request)
          .then(res => { if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res)); })
          .catch(() => {});
        return cached;
      }

      // Not in cache — try network, cache on success
      return fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => {
          // Network failed and nothing cached — for navigation requests
          // fall back to the cached shell so app still opens
          if (e.request.mode === 'navigate') {
            return caches.match(`${GHPATH}/`) || caches.match(`${GHPATH}/index.html`);
          }
        });
    })
  );
});
