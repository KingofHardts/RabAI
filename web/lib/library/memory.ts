import { createHash } from "node:crypto";

/*
 * RabbAI's memory of the library (founding spec, "Faster answers"): exact copies of what the
 * library returned for a read (a section, lines by reference, a search, dictionary entries), kept in
 * this server's memory for half an hour, so the same text asked for again (the next question in a
 * chavrusa, the same daf by many people, a follow-up) comes back at once instead of from the
 * database across the network.
 *
 * Accurate by construction: only the library's own rows are kept, exactly as read, and handed out
 * as fresh copies, so nothing a caller changes can leak into the next answer. Nothing the model
 * wrote is ever kept here, and nothing about a person. The library changes only when it is rebuilt
 * or repaired, and the copies expire within half an hour of that. Server only; each server keeps
 * its own, up to a size limit, dropping the least recently used.
 */

export const MEMORY_TTL_MS = 30 * 60 * 1000;
/** About how much text to keep, in characters of JSON (roughly bytes). */
export const MEMORY_MAX_SIZE = 60_000_000;

interface Entry {
  at: number;
  size: number;
  value: unknown;
}

export interface MemoryStats {
  hits: number;
  misses: number;
  entries: number;
  size: number;
}

export class LibraryMemory {
  private map = new Map<string, Entry>();
  private size = 0;
  private inFlight = new Map<string, Promise<unknown>>();
  hits = 0;
  misses = 0;
  constructor(
    private ttl = MEMORY_TTL_MS,
    private maxSize = MEMORY_MAX_SIZE,
    private now: () => number = Date.now,
  ) {}

  stats(): MemoryStats {
    return { hits: this.hits, misses: this.misses, entries: this.map.size, size: this.size };
  }

  /** The value for this key: a fresh copy of what is kept, or read once (even if asked twice at the same time) and kept. */
  async remember<T>(key: string, read: () => Promise<T>): Promise<T> {
    const e = this.map.get(key);
    if (e && this.now() - e.at < this.ttl) {
      this.hits++;
      // Least recently used goes first: a hit moves to the end.
      this.map.delete(key);
      this.map.set(key, e);
      return structuredClone(e.value) as T;
    }
    if (e) this.drop(key);
    const pending = this.inFlight.get(key);
    if (pending) return structuredClone(await pending) as T;
    this.misses++;
    const p = read();
    this.inFlight.set(key, p);
    try {
      const value = await p;
      this.keep(key, value);
      return structuredClone(value);
    } finally {
      this.inFlight.delete(key);
    }
  }

  private keep(key: string, value: unknown) {
    // Nothing empty or failed is kept: a missing text may be added by the next rebuild.
    if (value === null || value === undefined || (Array.isArray(value) && !value.length)) return;
    let size = 0;
    try {
      size = JSON.stringify(value, (_k, v) => (v instanceof Map ? [...v.entries()] : v))?.length ?? 0;
    } catch {
      return;
    }
    if (size > this.maxSize / 20) return; // one huge read never pushes everything else out
    this.map.set(key, { at: this.now(), size, value });
    this.size += size;
    for (const [k] of this.map) {
      if (this.size <= this.maxSize) break;
      this.drop(k);
    }
  }

  private drop(key: string) {
    const e = this.map.get(key);
    if (!e) return;
    this.map.delete(key);
    this.size -= e.size;
  }
}

/** A short key for a read: the method and its arguments. */
export function memoryKey(method: string, args: unknown[]): string {
  const json = JSON.stringify(args, (_k, v) => (v instanceof Map ? [...v.entries()] : v)) ?? "";
  return `${method}:${json.length > 200 ? createHash("sha256").update(json).digest("hex") : json}`;
}

/** The store's reads that may be remembered: they only read the library, and depend only on their arguments. */
export const REMEMBERED = ["lookup", "search", "articles", "linked", "dictionary", "wordEntries", "section", "contents", "headings", "daf", "exact", "dafLayout", "vowels", "catalog", "books", "articleShelves"] as const;

/** The same store, with its library reads remembered. Anything else (the translation jobs' reads) goes straight through. */
export function withMemory<S extends object>(store: S, memory: LibraryMemory): S {
  const remembered = new Set<string>(REMEMBERED);
  return new Proxy(store, {
    get(target, prop, receiver) {
      const v = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || typeof v !== "function" || !remembered.has(prop)) return v;
      // dictionary(passages): the passages are named by their refs and words.
      return (...args: unknown[]) =>
        memory.remember(memoryKey(prop, prop === "dictionary" ? [(args[0] as Array<{ ref: string; he?: string }>).map((p) => [p.ref, p.he ?? ""]), args[1]] : args), () =>
          (v as (...a: unknown[]) => Promise<unknown>).apply(target, args),
        );
    },
  });
}

const g = globalThis as typeof globalThis & { __rabaiLibraryMemory?: LibraryMemory };
/** This server's memory of the library. */
export function libraryMemory(): LibraryMemory {
  return (g.__rabaiLibraryMemory ??= new LibraryMemory());
}
