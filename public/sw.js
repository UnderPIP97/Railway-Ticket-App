const CACHE_NAME = 'rail-babu-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/Rail_Babu_logo.png',
  '/indian-railways-logo.jpg',
  '/p_sign.png'
];

// Install new service worker immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // Force new SW to activate immediately
});

// Clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // Take control of all pages immediately
});

// Network-first strategy for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Network-first for HTML (always get latest)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first for other assets
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
