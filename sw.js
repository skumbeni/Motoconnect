// MotoConnect Zambia — Service Worker v4
// Deploy at: https://skumbeni.github.io/Motoconnect/sw.js
const CACHE = 'mc-v4';

// These MUST match your GitHub Pages URL exactly — trailing slash included
const SHELL_URLS = [
  '/Motoconnect/',
  '/Motoconnect/index.html',
];

// ── INSTALL: cache the app shell under both URL forms ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      for (const url of SHELL_URLS) {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) await c.put(url, res);
        } catch (_) {}
      }
    })
    .then(() => self.skipWaiting())
    .catch(() => self.skipWaiting())
  );
});

// ── ACTIVATE: remove old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── FETCH ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;

  // Let Firebase / external API calls go straight to network
  // (app handles failures gracefully with localStorage fallback)
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('identitytoolkit') ||
    url.includes('nominatim.openstreetmap.org')
  ) return;

  e.respondWith(
    caches.open(CACHE).then(async c => {
      // 1. Try exact cache match
      let cached = await c.match(e.request);

      // 2. If the request is a navigation (opening the app), also try
      //    the shell URLs — catches trailing-slash vs index.html mismatches
      if (!cached && e.request.mode === 'navigate') {
        cached = await c.match('/Motoconnect/') || await c.match('/Motoconnect/index.html');
      }

      // 3. Try network, update cache on success
      const networkPromise = fetch(e.request)
        .then(res => {
          if (res && res.ok) c.put(e.request, res.clone());
          return res;
        })
        .catch(() => null);

      // Return cached immediately if available; otherwise wait for network
      return cached || await networkPromise || cached;
    })
  );
});
