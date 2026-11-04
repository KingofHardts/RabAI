/*
 * RabbAI's service worker: lets the siddur open without a connection.
 *
 * It keeps three things in the browser's own storage, on this device only:
 *   - the app's code files (their names change with every build, so a kept copy never goes stale);
 *   - the app's pages, for opening the app with no connection (always fetched fresh when online);
 *   - the library's texts and contents that were opened, or that "Keep this siddur on this device" fetched.
 * It never keeps a question, an answer, an account call or anything sent with POST.
 * The cache names here must match lib/offline.ts.
 */

const VERSION = "v1";
const CODE = `rabbai-code-${VERSION}`;
const PAGES = `rabbai-pages-${VERSION}`;
const DATA = `rabbai-data-${VERSION}`;
const KEEP = new Set([CODE, PAGES, DATA]);
const CODE_LIMIT = 400;
const DATA_LIMIT = 3000;
const WAIT_MS = 6000;

/** The library calls that are safe to keep: texts, contents and dictionary entries, read with GET. */
const DATA_PATHS = ["/api/text", "/api/contents", "/api/library", "/api/word"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name.startsWith("rabbai-") && !KEEP.has(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

/** Only a plain, complete answer from this site is kept. */
const keepable = (res) => res && res.ok && res.status === 200 && res.type === "basic" && !res.redirected;

async function trim(name, limit) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - limit; i++) await cache.delete(keys[i]);
}

/** The network, but no longer than WAIT_MS, so a weak signal falls back to the kept copy. */
function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("slow")), WAIT_MS);
    fetch(request).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function networkFirst(event, name, limit, fallbackUrl) {
  const cache = await caches.open(name);
  try {
    const res = await fromNetwork(event.request);
    if (keepable(res)) {
      await cache.put(event.request, res.clone());
      if (limit) event.waitUntil(trim(name, limit));
    }
    return res;
  } catch (err) {
    const kept = (await cache.match(event.request)) || (fallbackUrl && (await cache.match(fallbackUrl)));
    if (kept) return kept;
    throw err;
  }
}

async function codeFirst(event) {
  const cache = await caches.open(CODE);
  const kept = await cache.match(event.request);
  if (kept) return kept;
  const res = await fetch(event.request);
  if (keepable(res)) {
    await cache.put(event.request, res.clone());
    event.waitUntil(trim(CODE, CODE_LIMIT));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Next's own page-data requests are left alone.
  if (url.searchParams.has("_rsc") || req.headers.get("RSC")) return;

  if (url.pathname.startsWith("/_next/static/") || /^\/(icon-\d+\.png|rabbai\.webmanifest)$/.test(url.pathname)) {
    event.respondWith(codeFirst(event));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(event, PAGES, 20, "/"));
    return;
  }
  if (DATA_PATHS.includes(url.pathname)) {
    event.respondWith(networkFirst(event, DATA, DATA_LIMIT));
  }
});
