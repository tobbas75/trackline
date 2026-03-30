/// <reference lib="webworker" />

/**
 * FireManager Service Worker
 *
 * Caching strategy:
 * - App shell (HTML, JS, CSS): cache-first with network update
 * - API responses: network-first with stale fallback
 * - Map tiles: cache-first (long-lived)
 * - Static assets: cache-first
 */

const CACHE_VERSION = "v1";
const APP_CACHE = `firemanager-app-${CACHE_VERSION}`;
const TILE_CACHE = `firemanager-tiles-${CACHE_VERSION}`;
const API_CACHE = `firemanager-api-${CACHE_VERSION}`;
const DATA_CACHE = `firemanager-data-${CACHE_VERSION}`;

// App shell files to pre-cache
const APP_SHELL = [
  "/",
  "/manifest.json",
];

// Tile URL patterns to cache
const TILE_PATTERNS = [
  "tiles.openfreemap.org",
  "pmtiles",
];

// API patterns to cache with network-first
const API_PATTERNS = [
  "/api/hotspots",
  "/api/weather",
];

// ─── Install ─────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[SW] Pre-cache failed for some resources:", err);
      });
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(
            (key) =>
              key !== APP_CACHE &&
              key !== TILE_CACHE &&
              key !== API_CACHE &&
              key !== DATA_CACHE
          )
          .map((key) => caches.delete(key))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// ─── Fetch ─────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Map tiles — cache-first, long-lived
  if (TILE_PATTERNS.some((p) => url.href.includes(p))) {
    event.respondWith(cacheFirst(event.request, TILE_CACHE));
    return;
  }

  // API responses — network-first with stale fallback
  if (API_PATTERNS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(networkFirst(event.request, API_CACHE, 5000));
    return;
  }

  // Navigation requests (HTML pages) — network-first
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, APP_CACHE, 3000));
    return;
  }

  // Static assets (JS, CSS, images, fonts) — stale-while-revalidate
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|svg|ico)$/) ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(staleWhileRevalidate(event.request, APP_CACHE));
    return;
  }
});

// ─── Caching Strategies ─────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline — resource not cached", { status: 503 });
  }
}

async function networkFirst(request, cacheName, timeoutMs) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      ),
    ]);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Offline", cached: false }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response.clone());
        });
      }
      return response;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("Offline", { status: 503 });
}

// ─── Background Sync ─────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-operations") {
    event.waitUntil(syncOperationsData());
  }
});

async function syncOperationsData() {
  // Read queued operations from IndexedDB and push to server
  // This will be implemented when Supabase is connected
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_COMPLETE" });
    });
  } catch (err) {
    console.error("[SW] Sync failed:", err);
  }
}

// ─── Push Notifications ─────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "New fire alert",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "fire-alert",
    data: { url: data.url || "/" },
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "FireManager", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing tab if possible
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(url);
    })
  );
});
