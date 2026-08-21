// Minimal service worker — this exists mainly to satisfy PWA installability
// requirements (needed for the Android TWA wrapper). It does light caching of
// static assets; it deliberately does NOT cache API responses or HTML pages,
// since this is a marketplace with live pricing/stock/order data that must
// always be fresh.

const CACHE_NAME = "unimart-static-v1";
const STATIC_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png", "/logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStaticAsset = STATIC_ASSETS.some((path) => url.pathname === path);
  if (!isStaticAsset) return; // let everything else (pages, API calls) go straight to the network

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
