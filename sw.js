// Mi Ruta: guarda la app en el iPad para que funcione sin internet.
const CACHE = "miruta-v1.5";
const ASSETS = ["./", "./index.html", "./xlsx.full.min.js", "./manifest.webmanifest",
  "./fonts/public-sans-400.woff2", "./fonts/public-sans-700.woff2", "./fonts/barlow-condensed-600.woff2",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Primero lo guardado; en segundo plano busca la versión nueva.
  e.respondWith(caches.open(CACHE).then(async c => {
    const key = e.request.mode === "navigate" ? "./index.html" : e.request;
    const hit = await c.match(key, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
