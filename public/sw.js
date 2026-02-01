// Swamp Darts Service Worker
const CACHE_NAME = 'swamp-darts-v2'; // Increment version to force cache refresh
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('Failed to cache assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first strategy (better for development)
self.addEventListener('fetch', (event) => {
  // Skip service worker entirely for:
  // - Non-GET requests (POST, PUT, DELETE, etc.)
  // - Supabase API requests
  // - External API requests
  // - Localhost (development) requests
  // - Next.js chunks and pages
  const url = new URL(event.request.url);
  const isSupabaseRequest = url.hostname.includes('supabase.co');
  const isApiRequest = url.pathname.startsWith('/api/');
  const isGetRequest = event.request.method === 'GET';
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const isNextJsResource = url.pathname.includes('/_next/') || url.pathname.includes('.js') || url.pathname.includes('.json');

  // Skip service worker for development and dynamic resources
  if (!isGetRequest || isSupabaseRequest || isApiRequest || isLocalhost || isNextJsResource) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first strategy for everything else
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone and cache successful responses
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Fallback to cache only on network failure
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/');
        });
      })
  );
});
