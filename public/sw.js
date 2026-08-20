// RideBuddy Service Worker
const CACHE_VERSION = "v1";
const STATIC_CACHE = `ridebuddy-static-${CACHE_VERSION}`;
const TILE_CACHE = `ridebuddy-tiles-${CACHE_VERSION}`;
const API_CACHE = `ridebuddy-api-${CACHE_VERSION}`;

const STATIC_ASSETS = ["/", "/manifest.json", "/icons/icon.svg"];

const TILE_ORIGINS = ["https://api.maptiler.com"];

const API_ORIGINS = ["http://localhost:5000"];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const allowedCaches = [STATIC_CACHE, TILE_CACHE, API_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Map tile requests → cache-first (tiles rarely change)
  if (TILE_ORIGINS.some((origin) => url.origin === origin)) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
    return;
  }

  // API requests → network-first with cache fallback
  if (API_ORIGINS.some((origin) => url.origin === origin)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Static assets → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

// ── Strategies ─────────────────────────────────────────────────────────────
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

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
