// Mi Ruta: guarda la app en el iPad para que funcione sin internet y se actualice sola.
const CACHE = "miruta-v2.1";
const ASSETS = ["./", "./index.html", "./xlsx.full.min.js", "./manifest.webmanifest",
  "./fonts/public-sans-400.woff2", "./fonts/public-sans-700.woff2", "./fonts/barlow-condensed-600.woff2",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  // Baja todo directo de internet (sin copias viejas) y entra en uso enseguida.
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: "reload"}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const wait = ms => new Promise(r => setTimeout(r, ms));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  const isPage = req.mode === "navigate" || url.pathname === scope || url.pathname === scope + "index.html";
  if (isPage) {
    // La página: primero internet (hasta 3 segundos) para abrir siempre la versión más nueva;
    // sin señal, abre la copia guardada.
    let saved = Promise.resolve();
    const net = fetch(url.href, {cache: "no-store", credentials: "same-origin"}).then(r => {
      if (r.ok) { const copy = r.clone(); saved = caches.open(CACHE).then(c => c.put("./index.html", copy)); }
      return r;
    });
    e.waitUntil(net.then(() => saved, () => {}));
    e.respondWith(Promise.race([net.catch(() => null), wait(3000).then(() => null)]).then(r =>
      (r && r.ok) ? r : caches.match("./index.html", {ignoreSearch: true}).then(hit => hit || net)));
    return;
  }
  // Los demás archivos: la copia guardada primero y se renueva en segundo plano.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true});
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
