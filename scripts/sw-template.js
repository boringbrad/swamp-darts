// Swamp Darts Service Worker — SOURCE TEMPLATE
// !! Do NOT edit public/sw.js directly — it is generated at build time.
// !! Edit THIS file (scripts/sw-template.js) instead.
//
// scripts/generate-sw.js runs after `next build` and:
//   1. Reads all /_next/static/ asset URLs from the build output
//   2. Injects them below the BUILD_ASSETS_PLACEHOLDER comment
//   3. Writes the result to public/sw.js

const CACHE_NAME = 'swamp-darts-v4';

// Pages to precache at install time so hard navigation to game pages
// works offline even on first visit.
// Install uses individual fetch calls (not cache.addAll) with a
// !response.redirected guard — one failure doesn't block the rest, and
// Safari's "Response served by service worker has redirections" is avoided.
// Production builds append all /_next/static/ JS and CSS bundles below.
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  // App pages — hard navigation works offline once these are cached
  '/cricket',
  '/cricket/singles/players',
  '/cricket/singles/game',
  '/cricket/tag-team/players',
  '/cricket/tag-team/game',
  '/cricket/triple-threat/players',
  '/cricket/triple-threat/game',
  '/cricket/fatal-4-way/players',
  '/cricket/fatal-4-way/game',
  '/golf',
  '/golf/stroke-play/players',
  '/golf/stroke-play/game',
  '/golf/match-play/players',
  '/golf/match-play/game',
  '/golf/skins/players',
  '/golf/skins/game',
  '/extra/x01',
  '/extra/x01/game',
  '/stats',
  '/profile',
  // BUILD_ASSETS_PLACEHOLDER
];

// Install — download and cache every asset individually, then immediately
// skip waiting so this SW takes control without requiring a user prompt.
// clients.claim() in activate handles existing open tabs.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      let cached = 0;
      let skipped = 0;
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url);
            // Safari refuses to serve redirected responses from the SW cache.
            // Skip any URL that redirected — it will be cached on first visit instead.
            if (response.ok && !response.redirected) {
              await cache.put(url, response);
              cached++;
            } else {
              skipped++;
              console.warn('[SW] Pre-cache skipped (redirect or error):', url, response.status);
            }
          } catch (err) {
            skipped++;
            console.warn('[SW] Pre-cache fetch failed:', url, err);
          }
        })
      );
      console.log(`[SW] Pre-cached ${cached} assets, skipped ${skipped}`);
    }).then(() => self.skipWaiting())
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

// Helper: only cache a clean, non-redirected 200 response.
// Safari/iOS refuses to serve a cached response that involved a redirect.
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
//   5. HTML page navigations         → network-first, cache on success,
//                                       offline fallback: this URL → '/' → error()
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

  // Next.js RSC navigation requests — network-first, cache on success.
  // Serves cached RSC payload when offline so previously-visited pages
  // work without a network connection.
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
          // Return cached RSC payload if available; otherwise a network-error
          // response — Safari crashes if event.respondWith resolves to null/undefined.
          return cached || Response.error();
        })
    );
    return;
  }

  // /_next/static/ assets are content-hashed by Next.js.
  // Cache-first: serve instantly; fetch-and-cache on first miss.
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
  // Offline fallback chain: cached version of this URL → cached '/' (app shell)
  // → Response.error() so Safari never crashes with "Returned response is null".
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        caches.open(CACHE_NAME).then((cache) =>
          safeCachePut(cache, event.request, response)
        );
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const root = await caches.match('/');
        return root || Response.error();
      })
  );
});
