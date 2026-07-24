// SpecialParents.in service worker — minimal offline story.
// Strategy: network-first for HTML (so app updates propagate), cache-first
// for /icons + /_next/static (long-lived immutable), skip everything under
// /api (must be online — health data). Never cache authenticated content.

const CACHE_NAME = 'sp-v1';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch API traffic or auth — always online.
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) return;

  // Immutable Next.js chunks + our static icons → cache-first.
  const isImmutable =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest';

  if (isImmutable) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            return res;
          }),
      ),
    );
    return;
  }

  // HTML navigations → network-first, cache as fallback so if the user
  // opens the app on a train with no signal they at least see the last
  // dashboard shell (they'll still hit the API-must-be-online empty state
  // inside, which is the honest behaviour).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('/dashboard'))),
    );
  }
});
