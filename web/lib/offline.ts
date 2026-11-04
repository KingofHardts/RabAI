/*
 * Working without a connection: registers the service worker (public/sw.js) and keeps chosen
 * library texts in the browser's storage on this device. The cache names must match sw.js.
 */

export const DATA_CACHE = "rabbai-data-v1";
export const PAGES_CACHE = "rabbai-pages-v1";
export const CODE_CACHE = "rabbai-code-v1";

/** Registers the service worker once the page has loaded. Only in a built app: in development it would keep stale code. */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;
  const go = () => void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/**
 * Fetches a library address and keeps the answer on this device, even before the service worker
 * is running. Returns whether it was kept.
 */
export async function keepOnDevice(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    if (typeof caches !== "undefined") await (await caches.open(DATA_CACHE)).put(url, res.clone());
    return true;
  } catch {
    return false;
  }
}

/** Keeps the app's page itself, so it opens with no connection. */
export async function keepAppPage(): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const res = await fetch("/", { credentials: "same-origin" });
    if (res.ok && !res.redirected) await (await caches.open(PAGES_CACHE)).put("/", res);
  } catch {
    /* kept what could be kept */
  }
}

/** Keeps the code files this page has loaded (scripts, styles, fonts), so the app runs with no connection. */
export async function keepAppCode(): Promise<void> {
  if (typeof caches === "undefined" || typeof performance === "undefined") return;
  const urls = new Set<string>();
  const add = (raw: string | null) => {
    if (!raw) return;
    const u = new URL(raw, location.href);
    if (u.origin === location.origin && u.pathname.startsWith("/_next/static/")) urls.add(u.pathname + u.search);
  };
  for (const e of performance.getEntriesByType("resource")) add(e.name);
  document.querySelectorAll("script[src]").forEach((el) => add(el.getAttribute("src")));
  document.querySelectorAll("link[href]").forEach((el) => add(el.getAttribute("href")));
  const cache = await caches.open(CODE_CACHE);
  await Promise.all(
    [...urls].map(async (u) => {
      try {
        if (await cache.match(u)) return;
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch {
        /* kept what could be kept */
      }
    }),
  );
}

/** Whether the device says it has a connection (it can be wrong in one direction: on Wi-Fi with no internet). */
export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
