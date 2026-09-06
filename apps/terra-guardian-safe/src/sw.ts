/**
 * TerraGuardian Safe — Service Worker stub.
 *
 * This is a minimal service worker that will be extended
 * in later phases with:
 * - Offline caching strategy
 * - Background sync for citizen reports
 * - Push notification handling
 * - IndexedDB offline queue
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "terraguardian-safe-v1";

// Minimal install handler
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/", "/index.html"]);
    }),
  );
  // Activate immediately
  self.skipWaiting();
});

// Minimal activate handler
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first fetch strategy (minimal)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((response) => response ?? new Response("Offline", { status: 503 })),
    ),
  );
});
