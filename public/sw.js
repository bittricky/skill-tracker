/* eslint-disable no-restricted-globals */
/**
 * Skill Tracker service worker.
 *
 * Strategies:
 *   - Navigation requests (HTML):
 *       network-first, fall back to the cached shell on failure.
 *       Keeps the latest HTML in sync while providing an offline page.
 *   - Same-origin static assets (JS/CSS/fonts/images):
 *       stale-while-revalidate. Always returns cached bytes instantly when
 *       available, then refreshes the cache in the background.
 *   - Cross-origin requests:
 *       passed through (fetch as normal). Google Fonts CSS/font files are
 *       still cached opportunistically via the runtime cache if successful.
 *
 * Versioning:
 *   Bump CACHE_VERSION whenever you change this file to invalidate old
 *   caches. Old versions are cleared in the `activate` event.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `skill-tracker-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `skill-tracker-runtime-${CACHE_VERSION}`;

// Fallback shell assets we always want in the cache.
const PRECACHE_URLS = [
  "/",
  "/browser",
  "/manifest.webmanifest",
  "/icon.svg",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Add each URL individually so one 404 doesn't abort the install.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            /* ignore, precache is best-effort */
          }
        }),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (k) =>
              k.startsWith("skill-tracker-") &&
              k !== SHELL_CACHE &&
              k !== RUNTIME_CACHE,
          )
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/**
 * Allow the page to trigger an update via `navigator.serviceWorker.controller.postMessage({type:'SKIP_WAITING'})`.
 */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Navigations: network-first, fall back to cached shell (/) for offline.
  if (req.mode === "navigate") {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (sameOrigin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Cross-origin (e.g. Google Fonts): stale-while-revalidate with safe
  // failure so we don't throw on opaque responses.
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirstNavigation(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(req);
    // Cache the latest navigable HTML under its own URL for future offline hits.
    cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    const cached =
      (await cache.match(req)) ??
      (await cache.match("/")) ??
      (await cache.match("/browser"));
    if (cached) return cached;
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Offline</title>
       <style>body{background:#0f0f0f;color:#f5f5f5;font-family:system-ui;padding:40px;line-height:1.5}</style>
       <h1>You're offline</h1>
       <p>Skill Tracker can't reach the network and there's no cached copy of this page yet.
          Try opening the app on the home page first while online, then try again.</p>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
    );
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  const networkFetch = fetch(req)
    .then((res) => {
      // Only cache successful responses we can actually reuse.
      if (res && (res.ok || res.type === "opaque")) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);
  return cached || (await networkFetch) || Response.error();
}
