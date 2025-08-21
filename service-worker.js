// Basic service worker for offline app shell + network-first for the XML feed
const CACHE_NAME = "autoslm-pwa-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-first for XML feed (to keep stock fresh)
  const FEED_URL = "https://www.dealerhub.net/workspace/zaexports/autoslmcustomstockfeed/autoslmcustomstockfeedXquisiteUmhlanga.xml";
  if (event.request.method === "GET" && event.request.url.indexOf(FEED_URL) === 0) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for the rest (app shell)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        return response;
      }).catch(() => caches.match("/index.html"));
    })
  );
});