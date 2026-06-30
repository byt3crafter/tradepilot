/**
 * JTradePilot Service Worker — network-first, safe minimal shell cache.
 *
 * Strategy:
 *   - Navigation requests (page loads): try network first; fall back to
 *     cached shell (/) if offline so the app still opens.
 *   - All other requests: pass through to network, no caching.
 *
 * Versioned cache name so that redeploying (new cache name) cleanly
 * discards the old shell on activate.
 */

const CACHE_NAME = 'jtp-shell-v1';
const SHELL_URL = '/';

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  // Take control immediately (don't wait for existing tabs to close)
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL))
  );
});

// ── Activate: purge stale caches from previous versions ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for navigation; pass-through for everything else ────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    // Navigation: try network, fall back to shell
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(SHELL_URL)
      )
    );
    return;
  }

  // All other requests: straight network, no caching
  // (assets are versioned by Vite content-hash; no need to cache them here)
});
