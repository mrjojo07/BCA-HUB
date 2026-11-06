const CACHE_NAME = "bca-sync-mobile-v7";
const APP_ROOT = new URL("./", self.location.href);
const SHELL_FILES = ["./","index.html","style.css","welcome-auth.css","script.js","welcome-auth.js","question-dna.html","assets/bca-sync-logo.svg"];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_FILES.map(path => new URL(path, APP_ROOT).href));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("bca-sync-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !["http:","https:"].includes(url.protocol)) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE_NAME)).put(request,response.clone());
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match(new URL("index.html",APP_ROOT).href)) || Response.error();
      }
    })());
    return;
  }
  if (!/\.(css|js|svg|png|jpe?g|webp|woff2?|ttf|pdf)$/i.test(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(request,response.clone());
        const keys = await cache.keys();
        if (keys.length > 60) await cache.delete(keys[0]);
      }
      return response;
    } catch (_) { return cached || Response.error(); }
  })());
});
