// Swamp Darts Service Worker — SOURCE TEMPLATE
// !! Do NOT edit public/sw.js directly — it is generated at build time.
// !! Edit THIS file (scripts/sw-template.js) instead.
//
// scripts/generate-sw.js runs after `next build` and:
//   1. Reads all /_next/static/ asset URLs from the build output
//   2. Injects them below the BUILD_ASSETS_PLACEHOLDER comment
//   3. Writes the result to public/sw.js

const CACHE_NAME = 'swamp-darts-v2';

// Only precache true static assets (icons, manifest) that never redirect.
// HTML pages are cached dynamically by the fetch handler when visited online —
// precaching them risks storing redirect responses, which Safari/iOS refuses
// to serve ("Response served by service worker has redirections").
// Production builds append all /_next/static/ JS and CSS bundles below.
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  // BUILD_ASSETS_PLACEHOLDER
];

// Install — download and cache static assets.
// Uses individual fetches so one failure doesn't block the rest.
// Do NOT call skipWaiting() here; the new SW waits until the user
// approves via the update prompt in PWARegister.tsx.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            // Safari refuses to serve redirected responses from SW cache
            if (response.ok && !response.redirected) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn('[SW] Pre-cache skipped:', url, err);
          }
        })
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) console.warn(`[SW] ${failed} precache entries skipped`);
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

// Helper: cache a response only if it's a clean, non-redirected success.
// Safari/iOS will refuse to serve a response that was a redirect.
function safeCachePut(cache, request, response) {
  if (response && response.status === 200 && !response.redirected) {
    cache.put(request, response.clone());
  }
}

// Fetch — five-tier strategy:
//   1. Supabase / API requests       → pass through (no interception)
//   2. Next.js prefetch reqs         → pass through (speculative, don't cache)
//   3. Next.js RSC navigation reqs   → network-first, cache RSC payload on success,
//                                       serve cached payload when offline
//   4. /_next/static/ assets         → cache-first (content-hashed, safe forever)
//   5. HTML page navigations         → network-first with cache fallback to '/'
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests.
  if (event.request.method !== 'GET') return;

  // Let Supabase API calls go straight to the network.
  if (url.hostname.includes('supabase.co')) return;

  // Let Next.js internal API routes go straight to the network.
  if (url.pathname.startsWith('/api/')) return;

  const isRSC      = event.request.headers.get('RSC') === '1';
  const isPrefetch = event.request.headers.get('Next-Router-Prefetch') === '1';

  // Next.js prefetch requests are speculative — don't intercept or cache them.
  if (isPrefetch) return;

  // Next.js RSC navigation requests — network-first, cache the RSC payload so
  // pages that were visited while online are navigable offline.
  if (isRSC) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && !response.redirected) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          // Return cached RSC payload if available; otherwise return a network-
          // error response so Safari doesn't crash with "Returned response is null"
          return cached || Response.error();
        })
    );
    return;
  }

  // /_next/static/ assets are content-hashed by Next.js.
  // Cache-first: serve from cache instantly; fetch-and-cache on first miss.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          caches.open(CACHE_NAME).then((cache) =>
            safeCachePut(cache, event.request, response)
          );
          return response;
        });
      })
    );
    return;
  }

  // Full HTML page navigations — network-first, cache on success.
  // Offline fallback: serve cached version of this URL, or '/' so the
  // pre-cached app shell is shown (client-side routing takes over from there).
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        caches.open(CACHE_NAME).then((cache) =>
          safeCachePut(cache, event.request, response)
        );
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(
          (cached) => cached || caches.match('/')
        );
      })
  );
});
