// Swamp Darts Service Worker — SOURCE TEMPLATE
// !! Do NOT edit public/sw.js directly — it is generated at build time.
// !! Edit THIS file (scripts/sw-template.js) instead.
//
// scripts/generate-sw.js runs after `next build` and:
//   1. Reads all /_next/static/ asset URLs from the build output
//   2. Injects them below the BUILD_ASSETS_PLACEHOLDER comment
//   3. Writes the result to public/sw.js
//
// In development (`next dev`), public/sw.js is regenerated from this template
// with only the core assets — full precaching only applies to production builds.

const CACHE_NAME = 'swamp-darts-v1';

// Core assets always pre-cached.
// Production builds append all /_next/static/ JS and CSS bundles below.
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  // BUILD_ASSETS_PLACEHOLDER
];

// Install — download and cache every asset in PRECACHE_ASSETS.
// Do NOT call skipWaiting() here; the new SW waits until the user
// approves via the update prompt in PWARegister.tsx.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.error('[SW] Pre-cache failed:', err);
      });
    })
  );
});

// Activate — remove caches from old versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Skip-waiting message from PWARegister.tsx.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch — four-tier strategy:
//   1. Supabase / API requests       → pass through (no interception)
//   2. Next.js RSC / prefetch reqs   → network-only; offline error lets Next.js
//                                       show its error boundary (not a broken page)
//   3. /_next/static/ assets         → cache-first (content-hashed, safe forever)
//   4. HTML page navigations         → network-first with cache fallback to '/'
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests.
  if (event.request.method !== 'GET') return;

  // Let Supabase API calls go straight to the network.
  if (url.hostname.includes('supabase.co')) return;

  // Let Next.js internal API routes go straight to the network.
  if (url.pathname.startsWith('/api/')) return;

  // Next.js RSC (React Server Component) navigation requests carry an 'RSC: 1'
  // header. If we return cached HTML for these, Next.js receives the wrong
  // content type and shows "can't load the page". Instead, pass them straight
  // to the network. When offline they fail, and Next.js shows its error
  // boundary rather than a broken page.
  const isRSC      = event.request.headers.get('RSC') === '1';
  const isPrefetch = event.request.headers.get('Next-Router-Prefetch') === '1';
  if (isRSC || isPrefetch) return;

  // /_next/static/ assets are content-hashed by Next.js.
  // Cache-first: serve from cache instantly; fetch-and-cache on first miss.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        });
      })
    );
    return;
  }

  // Full HTML page navigations — network-first, cache on success.
  // Offline fallback: serve cached version of this URL, or '/' so Next.js
  // client-side routing can take over from the cached app shell.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, response.clone())
          );
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(
          (cached) => cached || caches.match('/')
        );
      })
  );
});
