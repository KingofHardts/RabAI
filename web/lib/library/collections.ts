import type { Passage } from "./types";
import type { Db, TestingStore } from "./testing";

/*
 * Website collections: articles copied from an organization's website (Aish.com, ...) by its
 * written permission for private use, one database per site (tools/collection_build.py), read
 * beside the testing library. Every reference in a collection starts with its site's name
 * ("Aish.com, Why We Light Candles 3"), so each request goes to the one database that holds it.
 *
 * Like the testing library, collections are private and not yet approved by the rabbinic board,
 * and they are never opened on a public app (testingClient and collectionClients refuse it).
 */

export interface CollectionInfo {
  /** The permission id it rests on, e.g. "aish" (canon/permissions.yaml). */
  name: string;
  /** The site's name as shown, e.g. "Aish.com". */
  site: string;
  /** What every reference in it starts with, e.g. "Aish.com, ". */
  prefix: string;
}

/** A collection's description, from its meta table. Null when the database isn't a collection. */
export async function collectionInfo(db: Db): Promise<CollectionInfo | null> {
  const rows = await db.all("SELECT key, value FROM meta WHERE key IN ('collection', 'site', 'ref_prefix')");
  const meta = new Map(rows.map((r) => [String(r.key), String(r.value)]));
  const prefix = meta.get("ref_prefix");
  if (!prefix || prefix.length < 3) return null;
  return { name: meta.get("collection") ?? prefix, site: meta.get("site") ?? prefix.replace(/, $/, ""), prefix };
}

interface Connected extends CollectionInfo {
  store: TestingStore;
}

/**
 * One store over the testing library and its collections. A reference goes to the collection
 * whose prefix it starts with, and anything else to the testing library. Search (`search`) stays
 * the testing library's; `articles` searches the collections. A collection that can't be reached
 * is left out, so the library keeps working without it.
 */
export function combineStores(main: TestingStore, sources: Array<{ db: Db; store: TestingStore }>): TestingStore {
  let ready: Promise<Connected[]> | null = null;
  const collections = (): Promise<Connected[]> => {
    ready ??= Promise.all(
      sources.map(async ({ db, store }) => {
        try {
          const info = await collectionInfo(db);
          return info ? { ...info, store } : null;
        } catch (err) {
          console.warn("[rabai] a collection couldn't be opened:", err instanceof Error ? err.message : err);
          return null;
        }
      }),
    ).then((list) => {
      const found = list.filter((c): c is Connected => c !== null);
      // A collection that failed is tried again on a later request.
      if (found.length < sources.length) ready = null;
      return found;
    });
    return ready;
  };

  const ownerOf = (cols: Connected[], ref: string): TestingStore => cols.find((c) => ref.startsWith(c.prefix))?.store ?? main;

  /** Refs grouped by the store that holds them, in the order each store first appears. */
  async function byOwner(refs: string[]): Promise<Array<[TestingStore, string[]]>> {
    const cols = await collections();
    const groups = new Map<TestingStore, string[]>();
    for (const ref of refs) {
      const store = ownerOf(cols, ref);
      const list = groups.get(store) ?? [];
      list.push(ref);
      groups.set(store, list);
    }
    return [...groups.entries()];
  }

  /** Run a lookup on each owner's refs and keep the results in the order of the refs asked. */
  async function spread(refs: string[], run: (store: TestingStore, refs: string[]) => Promise<Passage[]>): Promise<Passage[]> {
    const groups = await byOwner(refs);
    const results = await Promise.all(groups.map(([store, mine]) => run(store, mine)));
    return results.flat();
  }

  return {
    lookup: (refs, perRef) => spread(refs, (store, mine) => store.lookup(mine, perRef)),
    search: (phrases, limit) => main.search(phrases, limit),
    async articles(phrases, limit) {
      const cols = await collections();
      if (!cols.length || limit <= 0) return [];
      const each = await Promise.all(
        cols.map((c) =>
          c.store.search(phrases, limit).catch((err) => {
            console.warn(`[rabai] searching ${c.site} failed:`, err instanceof Error ? err.message : err);
            return [] as Passage[];
          }),
        ),
      );
      // Take from each collection in turn, so one site can't crowd out the others.
      const out: Passage[] = [];
      for (let i = 0; out.length < limit && each.some((list) => i < list.length); i++) {
        for (const list of each) if (i < list.length && out.length < limit) out.push(list[i]);
      }
      return out;
    },
    async linked(refs, limit) {
      // Articles have no cross-references; follow only the library's.
      const cols = await collections();
      return main.linked(refs.filter((r) => ownerOf(cols, r) === main), limit);
    },
    dictionary: (passages, limit) => main.dictionary(passages, limit),
    wordEntries: (word, limit) => main.wordEntries(word, limit),
    async section(ref) {
      return ownerOf(await collections(), ref).section(ref);
    },
    async contents(title) {
      return ownerOf(await collections(), title).contents(title);
    },
    daf: (section) => main.daf(section),
    exact: (refs) => spread(refs, (store, mine) => store.exact(mine)),
    dafLayout: (section) => main.dafLayout(section),
    vowels: (refs) => main.vowels(refs),
    booksFor: (select) => main.booksFor(select),
    untranslated: (titles, afterSeq, limit) => main.untranslated(titles, afterSeq, limit),
    untranslatedCount: (titles) => main.untranslatedCount(titles),
    // The shelves list the library's books; the articles have their own list (articleShelves).
    books: () => main.books(),
    catalog: () => main.catalog(),
    async articleShelves() {
      const cols = await collections();
      const each = await Promise.all(cols.map((c) => c.store.articleShelves().catch(() => [])));
      return each.flat();
    },
    async articleList(work, offset, limit) {
      const cols = await collections();
      const each = await Promise.all(cols.map((c) => c.store.articleList(work, offset, limit).catch(() => [])));
      return each.flat().slice(0, Math.max(0, limit));
    },
  };
}
