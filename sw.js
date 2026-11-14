// Service worker: keeps a copy of the app so it opens even without internet.
// When you change index.html, bump the version number below so users get the new version.
const CACHE = 'sakura-pomodoro-v3';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Google Fonts: use the saved copy, refresh it in the background
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const saved = await c.match(e.request);
      const fresh = fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => saved);
      return saved || fresh;
    }));
    return;
  }

  // App files: try the network first (to get updates), fall back to the saved copy when offline or the site is gone
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          // Only trust a good answer. If the site was removed (404) or errors, keep using the saved copy.
          if (!r.ok) throw new Error('bad response');
          const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
  }
});
