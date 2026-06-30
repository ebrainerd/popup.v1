// PopUp service worker — minimal offline shell for PWA installability.
// Realtime features (chat, live, flash drops) require a network connection.
//
// IMPORTANT: do not cache HTML or /_next/ assets. Caching those after a deploy
// leaves users on stale JS with invalid Server Action IDs.

const CACHE = "popup-shell-v2";
const SHELL = ["/manifest.webmanifest", "/icons/icon.svg", "/icons/maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// --- Web push -------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = { title: "PopUp", body: "Something is happening!", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept navigations, RSC, API, auth, or Next.js build assets.
  if (
    request.mode === "navigate" ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next")
  ) {
    return;
  }

  // Cache only static install metadata (not HTML).
  if (!SHELL.includes(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
