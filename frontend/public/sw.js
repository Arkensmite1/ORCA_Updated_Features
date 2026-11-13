const CACHE = "orca-shell-v1";
const SHELL = ["/", "/index.html", "/orca-logo.png", "/orca-bg.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network-first for the app shell and bundles; cached copy when there is no connection.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.includes("hot-update") || url.pathname.startsWith("/ws")
      || url.pathname.startsWith("/sockjs-node") || url.pathname.endsWith(".zip")) return;

  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "/index.html" : req, copy));
      }
      return res;
    }).catch(async () => {
      const cache = await caches.open(CACHE);
      if (req.mode === "navigate") return (await cache.match("/index.html")) || (await cache.match("/"));
      return (await cache.match(req)) || Response.error();
    }),
  );
});
