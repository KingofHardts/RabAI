import { abbreviationOf } from "./word-parts";
import { createClient as createHttpClient } from "@libsql/client/http";
import type { Client, InValue } from "@libsql/client";
import { collectionDbUrls, TESTING_LABEL, testingDbUrl } from "./testing-config";
import { combineStores } from "./collections";
import type { ArticleListing, ArticleShelf, Passage, PassageSource } from "./types";

export type { ArticleListing, ArticleShelf };

export { TESTING_LABEL, testingDbUrl };

/*
 * The private testing library: Orthodox editions from canon/canon.yaml, mapped to exact
 * Sefaria versions with open licenses, built by tools/library_build.py into one database.
 *
 * Nothing here is approved by the rabbinic board. Every passage carries `source.library =
 * "testing"`, and the app labels it as not yet approved wherever it appears. The online app
 * stays locked while this library is in use.
 */

/** How many passages one lookup may return, so a question never floods the model. */
export const TESTING_LIMITS = {
  perRef: 8,
  section: 400,
  commentariesPerLine: 6,
  textChars: 2400,
};

// ---------------------------------------------------------------------------
// Connection

const clients = new Map<string, Promise<Client>>();

/**
 * A database client. A hosted database (Turso) is reached over plain HTTPS, which suits
 * serverless functions and needs no native code. A local file (a developer's own build of the
 * library) loads the full client only when it is used.
 */
function clientFor(url: string, authToken: string | undefined): Promise<Client> {
  const key = `${url}\n${authToken ?? ""}`;
  let client = clients.get(key);
  if (!client) {
    const remote = /^(libsql|https?):\/\//.test(url);
    client = remote
      ? Promise.resolve(createHttpClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken }))
      : import("@libsql/client").then((m) => m.createClient({ url, authToken }));
    clients.set(key, client);
  }
  return client;
}

/** The testing library's database client, or null when it isn't configured or the app is public. */
export function testingClient(env: Record<string, string | undefined> = process.env): Promise<Client> | null {
  const url = testingDbUrl(env);
  // Never open the testing library on a public app (see libraryMode in ./index).
  if (!url || env.RABAI_PUBLIC === "true") return null;
  return clientFor(url, env.RABAI_LIBRARY_DB_TOKEN || env.TURSO_AUTH_TOKEN || undefined);
}

/**
 * The website collections' database clients (RABAI_COLLECTION_DB_URLS). Like the testing
 * library, they are never opened on a public app: their sites allowed private use only.
 */
export function collectionClients(env: Record<string, string | undefined> = process.env): Array<Promise<Client>> {
  if (env.RABAI_PUBLIC === "true" || !testingDbUrl(env)) return [];
  const token = env.RABAI_COLLECTION_DB_TOKEN || env.RABAI_LIBRARY_DB_TOKEN || env.TURSO_AUTH_TOKEN || undefined;
  return collectionDbUrls(env).map((url) => clientFor(url, token));
}

/** The few queries the store makes, so tests can run against a small local database. */
export interface Db {
  all(sql: string, args?: InValue[]): Promise<Record<string, unknown>[]>;
}

export function dbFrom(client: Client | Promise<Client>): Db {
  return {
    async all(sql, args = []) {
      const rs = await (await client).execute({ sql, args });
      return rs.rows.map((r) => ({ ...r }) as Record<string, unknown>);
    },
  };
}

// ---------------------------------------------------------------------------
// Rows to passages

interface Row {
  id: number;
  ref: string;
  text: string;
  seq: number;
  title: string;
  he_title: string | null;
  work: string;
  work_title: string;
  edition: string;
  language: "he" | "en";
  version: string;
  license: string;
  word_tool: boolean;
  dictionary: boolean;
  /** The canon category of the work, e.g. "kabbalah". */
  category: string;
  /** "debated" when the canon marks the work debated (canon/vocabulary.yaml, standing). */
  standing: "established" | "debated";
  caution: string | null;
  caution_kinds: string[];
  /** An article from a website collection: where it is and who wrote it. */
  article_url: string | null;
  article_site: string | null;
  article_author: string | null;
  article_published: string | null;
  article_section: string | null;
}

/**
 * The columns for each passage row. A library built before works carried their standing has no
 * standing columns; it reads as established until it is rebuilt.
 */
function rowSelect(hasStanding: boolean, hasArticles = false): string {
  const standing = hasStanding
    ? "w.standing, w.caution, w.caution_kinds"
    : "'established' AS standing, NULL AS caution, NULL AS caution_kinds";
  // A website collection (tools/collection_schema.sql) keeps each article's address and author.
  // Its passages are read only together with their article (an inner join): a paragraph that has
  // lost its article's details would otherwise reach RabAI looking like a book of the library.
  const article = hasArticles
    ? "a.url AS article_url, a.site AS article_site, a.author AS article_author, a.published AS article_published, a.section AS article_section"
    : "NULL AS article_url, NULL AS article_site, NULL AS article_author, NULL AS article_published, NULL AS article_section";
  return `
  SELECT p.id, p.ref, p.text, p.seq, t.title, t.he_title, t.work, w.title AS work_title, w.category,
         ${standing}, ${article},
         e.name AS edition, e.language, e.word_tool, t.categories, v.name AS version, v.license
  FROM passages p
  JOIN titles t ON t.id = p.title_id
  JOIN works w ON w.id = t.work
  JOIN editions e ON e.id = p.edition_id
  JOIN versions v ON v.id = p.version_id${hasArticles ? "\n  JOIN articles a ON a.title_id = t.id" : ""}`;
}

/** The caution kinds stored as JSON; anything unreadable is left out. */
function cautionKinds(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function toRow(r: Record<string, unknown>): Row {
  return {
    id: Number(r.id),
    ref: String(r.ref),
    text: String(r.text ?? ""),
    seq: Number(r.seq),
    title: String(r.title),
    he_title: r.he_title == null ? null : String(r.he_title),
    work: String(r.work),
    work_title: String(r.work_title),
    edition: String(r.edition),
    language: r.language === "en" ? "en" : "he",
    version: String(r.version),
    license: String(r.license),
    word_tool: Number(r.word_tool ?? 0) === 1,
    dictionary: String(r.categories ?? "").includes('"Dictionary"'),
    category: String(r.category ?? ""),
    standing: r.standing === "debated" ? "debated" : "established",
    caution: r.caution == null || r.caution === "" ? null : String(r.caution),
    caution_kinds: cautionKinds(r.caution_kinds),
    article_url: r.article_url == null ? null : String(r.article_url),
    article_site: r.article_site == null ? null : String(r.article_site),
    article_author: r.article_author == null || r.article_author === "" ? null : String(r.article_author),
    article_published: r.article_published == null || r.article_published === "" ? null : String(r.article_published),
    article_section: r.article_section == null || r.article_section === "" ? null : String(r.article_section),
  };
}

function clip(text: string): string {
  if (text.length <= TESTING_LIMITS.textChars) return text;
  const cut = text.slice(0, TESTING_LIMITS.textChars);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(": "), cut.lastIndexOf("׃"));
  return (end > TESTING_LIMITS.textChars * 0.6 ? cut.slice(0, end + 1) : cut) + " …";
}

/** The section a ref belongs to: "Genesis 1:3" -> "Genesis 1", "Berakhot 2a:4" -> "Berakhot 2a". */
export function sectionOf(ref: string): string {
  const colon = ref.lastIndexOf(":");
  if (colon > 0) return ref.slice(0, colon);
  const space = ref.lastIndexOf(" ");
  return space > 0 ? ref.slice(0, space) : ref;
}

/** The book a ref belongs to, given its title. */
function locationIn(ref: string, title: string): string {
  return ref.startsWith(title) ? ref.slice(title.length).trim() : ref;
}

/**
 * Join the Hebrew and English rows of each ref into one passage, in reading order.
 * Within a language, the first edition (by the canon's order) is used.
 */
export function groupRows(rows: Row[], opts: { full?: boolean } = {}): Passage[] {
  const text = (t: string) => (opts.full ? t : clip(t));
  const byRef = new Map<string, { he?: Row; en?: Row; seq: number }>();
  for (const r of rows) {
    const entry = byRef.get(r.ref) ?? { seq: r.seq };
    if (!entry[r.language]) entry[r.language] = r;
    entry.seq = Math.min(entry.seq, r.seq);
    byRef.set(r.ref, entry);
  }
  return [...byRef.entries()]
    .sort((a, b) => a[1].seq - b[1].seq)
    .map(([ref, { he, en, seq }]) => {
      const base = (he ?? en)!;
      const loc = locationIn(ref, base.title);
      const source: PassageSource = {
        library: "testing",
        canonId: base.work,
        workTitle: base.work_title,
        book: base.title,
        bookHe: base.he_title ?? undefined,
        heEdition: he?.edition,
        heVersion: he?.version,
        enEdition: en?.edition,
        enVersion: en?.version,
        licenses: [...new Set([he?.license, en?.license].filter((x): x is string => Boolean(x)))],
        ...(base.dictionary ? { dictionary: true } : {}),
        ...(he?.word_tool || en?.word_tool ? { wordToolOnly: true } : {}),
        ...(base.category ? { category: base.category } : {}),
        ...(base.standing === "debated" && base.caution
          ? { standing: "debated" as const, caution: base.caution, cautionKinds: base.caution_kinds }
          : {}),
        ...(base.article_url && base.article_site
          ? {
              article: {
                site: base.article_site,
                url: base.article_url,
                ...(base.article_author ? { author: base.article_author } : {}),
                ...(base.article_published ? { published: base.article_published } : {}),
                ...(base.article_section ? { section: base.article_section } : {}),
              },
            }
          : {}),
      };
      return {
        ref,
        work: base.work,
        section: sectionOf(ref),
        sectionHe: base.he_title ? `${base.he_title} ${locationIn(sectionOf(ref), base.title)}`.trim() : sectionOf(ref),
        order: seq,
        label: loc || base.title,
        labelHe: base.he_title ?? base.title,
        he: he ? text(he.text) : "",
        en: en ? text(en.text) : "",
        source,
      };
    });
}

// ---------------------------------------------------------------------------
// The store

export interface TestingStore {
  /** Passages at these refs. A section ref ("Berakhot 2a") returns its first lines. */
  lookup(refs: string[], perRef?: number): Promise<Passage[]>;
  /** Full-text search. Hebrew is matched without vowels. */
  search(phrases: string[], limit: number): Promise<Passage[]>;
  /**
   * Full-text search of the website collections only (articles from Aish.com and the like). Empty
   * when no collection is connected.
   */
  articles(phrases: string[], limit: number): Promise<Passage[]>;
  /** Passages linked to these refs by Sefaria's cross-references, commentaries first. */
  linked(refs: string[], limit: number): Promise<Passage[]>;
  /**
   * Dictionary entries for the words of these passages: first the entries that cite these very
   * lines, then entries whose headword matches a word in them.
   */
  dictionary(passages: Passage[], limit: number): Promise<Passage[]>;
  /**
   * Dictionary entries for one word a person tapped: the word itself first, then the word
   * without its front letters or ending. Each entry carries the reading it was found under.
   */
  wordEntries(word: string, limit?: number): Promise<Array<Passage & { reading: WordReading }>>;
  /**
   * A whole section for the reader, with each line's commentaries, and the sections before and
   * after it in the same book.
   */
  section(ref: string): Promise<{ lines: Passage[]; commentaries: Map<string, Passage[]>; prev?: string; next?: string } | null>;
  /** A book's sections in order ("Berakhot 2a", "Berakhot 2b", ...), for its table of contents. */
  contents(title: string): Promise<string[]>;
  /**
   * One amud of the Bavli as printed: its Gemara, and the Rashi and Tosafot written on it, each
   * in full and in order. Null when the library has no Gemara at this ref.
   */
  daf(section: string): Promise<{ main: Passage[]; rashi: Passage[]; tosafot: Passage[] } | null>;
  /** These passages in full, by exact ref (a printed page's lines can hold a neighboring amud's words). */
  exact(refs: string[]): Promise<Passage[]>;
  /**
   * Where each printed line of an amud sits on the Vilna page (tools/daf_layout.py), or null when
   * the library has no layout for it. Checked by readPrinted in daf.ts before it is shown.
   */
  dafLayout(section: string): Promise<unknown | null>;
  /**
   * The vocalized copies of these passages, by ref (canon: vowels_only), for showing vowels on the
   * Gemara page. Empty when the library has none.
   */
  vowels(refs: string[]): Promise<Map<string, string>>;
  /**
   * For the job that fills RabAI's translation library: the books named, the books of these canon
   * works, and the books whose titles match these patterns ("Rashi on %").
   */
  booksFor(select: { titles?: string[]; works?: string[]; like?: string[] }): Promise<string[]>;
  /** Passages of these books with Hebrew and no English, in reading order, after `afterSeq` (Passage.order). */
  untranslated(titles: string[], afterSeq: number, limit: number): Promise<Passage[]>;
  /** How many passages of these books have Hebrew and no English, and about how many words they hold. */
  untranslatedCount(titles: string[]): Promise<{ passages: number; words: number }>;
  /** Every book in the library: [title, Hebrew title, first ref, work title]. */
  books(): Promise<Array<{ title: string; he: string; firstRef: string; workTitle: string; categories: string[]; order: number }>>;
  /** The short list of book names the lookup planner may use. */
  catalog(): Promise<string>;
  /** The website collections' sections, each with how many articles it holds. Empty without collections. */
  articleShelves(): Promise<ArticleShelf[]>;
  /** One section's articles (by its canon work id), newest first. */
  articleList(work: string, offset: number, limit: number): Promise<ArticleListing[]>;
  /** Articles whose title holds every word of the search, then those whose text does. */
  articleSearch(text: string, limit: number): Promise<ArticleListing[]>;
}

/** The columns an article's place in a list needs (a collection's articles table). */
const LISTING_SELECT = `SELECT t.id AS title_id, t.title, a.site, a.author, a.published, w.title AS shelf,
  (SELECT p.ref FROM passages p WHERE p.title_id = t.id ORDER BY p.seq LIMIT 1) AS first_ref
  FROM articles a JOIN titles t ON t.id = a.title_id JOIN editions e ON e.id = a.edition_id JOIN works w ON w.id = e.work`;

function listings(rows: Record<string, unknown>[]): ArticleListing[] {
  return rows
    .filter((r) => r.first_ref)
    .map((r) => {
      const title = String(r.title);
      const site = String(r.site);
      const shelf = r.shelf ? String(r.shelf) : "";
      return {
        title,
        name: title.startsWith(`${site}, `) ? title.slice(site.length + 2) : title,
        ...(r.author ? { author: String(r.author) } : {}),
        ...(r.published ? { published: String(r.published) } : {}),
        ...(shelf ? { shelf: shelf.startsWith(`${site}: `) ? shelf.slice(site.length + 2) : shelf } : {}),
        firstRef: String(r.first_ref),
      };
    });
}

/** A search's words, as the full-text index holds them: plain, lowercase, no query symbols. */
export function searchWords(text: string): string[] {
  return plainForSearch(text)
    .replace(/["*^():{}+\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 8);
}

/** A title's Sefaria category path, stored as JSON; empty when missing or unreadable. */
function parseCategories(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

/** Remove vowels and cantillation, as the build does for the search index. */
export function plainForSearch(s: string): string {
  return s
    .replace(/[־׀׃׳״]/g, " ")
    .replace(/[֑-ׇֽֿׁׂׅׄ]/g, "")
    .toLowerCase();
}

/** A full-text query from phrases: each phrase must appear as written; any phrase may match. */
export function ftsQuery(phrases: string[]): string | null {
  const parts = phrases
    .map((p) => plainForSearch(p).replace(/["*^():{}]/g, " ").replace(/\s+/g, " ").trim())
    .filter((p) => p.length >= 2)
    .slice(0, 12)
    .map((p) => `"${p}"`);
  return parts.length ? parts.join(" OR ") : null;
}

/** Words too common to look up. */
const COMMON_WORDS = new Set(
  "את של על אל כי לא כל זה זו הוא היא הם אם או גם עם מן אין יש אמר רבי רב תנא מאי היכי דתנן תניא אמר ליה ליה לה להו ביה בה דאמר הכא התם אלא אבל ואם ולא וכל וזה".split(
    " ",
  ),
);
/** Letters that attach to the front of a word: and, the, in, to, from, that, as, of. */
const PREFIXES = ["וד", "וה", "וב", "ול", "ומ", "וש", "וכ", "דה", "שה", "מה", "בה", "לה", "ו", "ד", "ה", "ב", "ל", "מ", "ש", "כ"];
/** Aramaic and Hebrew endings: the definite -א, plurals, and "his/her". */
const SUFFIXES = ["ייא", "יא", "תא", "ין", "ים", "ות", "יה", "הו", "א", "ה"];
const FINALS: Record<string, string> = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" };

function withFinal(word: string): string {
  const last = word.slice(-1);
  return FINALS[last] ? word.slice(0, -1) + FINALS[last] : word;
}

/**
 * The forms a dictionary might list a text's words under: the word itself, without its front
 * letters, and without a common ending. Distinct and in reading order, at most 80.
 */
export function wordForms(text: string): string[] {
  const words = plainForSearch(text)
    .replace(/[^א-ת\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !COMMON_WORDS.has(w));
  const out: string[] = [];
  const add = (w: string) => {
    if (w.length >= 2 && !out.includes(w)) out.push(w);
  };
  for (const word of words) {
    if (out.length >= 80) break;
    add(word);
    const bases = [word];
    for (const p of PREFIXES) if (word.startsWith(p) && word.length - p.length >= 2) bases.push(word.slice(p.length));
    for (const base of bases) {
      add(base);
      for (const s of SUFFIXES) if (base.endsWith(s) && base.length - s.length >= 2) add(withFinal(base.slice(0, -s.length)));
    }
  }
  return out.slice(0, 80);
}

/** One way to read a word: the base form a dictionary might list, and what was taken off it. */
export interface WordReading {
  form: string;
  /** Letters taken off the front, such as ו "and" or ב "in". */
  prefix: string;
  /** An ending taken off, such as ים (plural) or א (the Aramaic "the"). */
  suffix: string;
  /**
   * Present when the form is a guess at the word's root or dictionary form, with each change in
   * plain words ("the ו inside is only a vowel letter"). Guesses are tried after everything else.
   */
  guess?: string[];
}

/**
 * The readings of a single tapped word, most likely first: the word as written, then without
 * its front letters, then without a common ending. Unlike wordForms, common words are kept,
 * since the person asked about this one.
 */
export function wordReadings(word: string): WordReading[] {
  const w = plainForSearch(word).replace(/[^א-ת]/g, "");
  const out: WordReading[] = [];
  const add = (form: string, prefix: string, suffix: string, guess?: string[]) => {
    if (form.length < 2 || out.some((r) => r.form === form)) return;
    out.push(guess ? { form, prefix, suffix, guess } : { form, prefix, suffix });
  };
  if (w.length < 2) return out;
  add(w, "", "");
  const bases = [{ base: w, prefix: "" }];
  for (const p of PREFIXES) if (w.startsWith(p) && w.length - p.length >= 2) bases.push({ base: w.slice(p.length), prefix: p });
  // One front letter taken off is likelier than two.
  bases.sort((a, b) => a.prefix.length - b.prefix.length);
  for (const { base, prefix } of bases) add(base, prefix, "");
  const stems = bases.map((b) => ({ stem: b.base, prefix: b.prefix, suffix: "" }));
  for (const { base, prefix } of bases) {
    for (const s of TAP_SUFFIXES) {
      if (!base.endsWith(s) || base.length - s.length < 2) continue;
      const stem = withFinal(base.slice(0, -s.length));
      add(stem, prefix, s);
      stems.push({ stem: base.slice(0, -s.length), prefix, suffix: s });
    }
  }
  // Last, guesses at the root or dictionary form, for verbs and for nouns before another word.
  // A stem with its front letters and ending already off is the likelier one to guess from.
  const stripped = (x: { prefix: string; suffix: string }) => (x.prefix ? 1 : 0) + (x.suffix ? 1 : 0);
  for (const { stem, prefix, suffix } of [...stems].sort((a, b) => stripped(b) - stripped(a))) {
    for (const g of rootGuesses(stem)) add(withFinal(g.form), prefix, suffix, g.changes);
  }
  return out.slice(0, 40);
}

/** For a single tapped word, a few more endings are worth trying: "your", "our", "his", "my". */
const TAP_SUFFIXES = [...SUFFIXES, "יך", "כם", "הם", "הן", "נו", "תי", "ני", "ך", "ו", "ם", "ן"];

/** Letters a verb can carry in front of its root, each with a plain-English note. */
const VERB_FRONTS: Array<[string, string]> = [
  ["הת", "הת at the front marks a verb done to oneself"],
  ["את", "את at the front marks a verb done to oneself (Aramaic)"],
  ["נת", "נת at the front marks a verb done to oneself"],
  ["ית", "ית at the front marks a verb done to oneself"],
  ["מת", "מת at the front marks a verb done to oneself, happening now"],
  ["נ", "a נ at the front often marks a verb form, such as the passive or “we will”"],
  ["ה", "a ה at the front often marks a verb meaning to cause something"],
  ["י", "a י at the front often marks “he will”"],
  ["ת", "a ת at the front often marks “you will” or “she will”"],
  ["א", "an א at the front often marks “I will”, or an Aramaic verb form"],
];

/** Endings a verb takes in the past tense. */
const PAST_ENDINGS: Array<[string, string]> = [
  ["תם", "the ending תם means “you did” (plural)"],
  ["תן", "the ending תן means “you did” (plural)"],
  ["ת", "the ending ת means “you did”"],
];

/** Take out ו and י that only stand for vowels (not the first or last letter). */
function withoutVowelLetters(s: string): string {
  return s.length <= 3 ? s : s[0] + s.slice(1, -1).replace(/[וי]/g, "") + s.slice(-1);
}

/**
 * Guesses at the root or dictionary form of a stem whose front letters and ending are already
 * off: without its vowel letters, without a verb's front letters, without a past-tense ending,
 * and with a final ת as ה (תרומת -> תרומה). Each guess says what was changed.
 */
export function rootGuesses(stem: string): Array<{ form: string; changes: string[] }> {
  const out: Array<{ form: string; changes: string[] }> = [];
  const vowel = (s: string) => (s.includes("ו") ? "the ו inside is only a vowel letter" : "the י inside is only a vowel letter");
  const add = (form: string, changes: string[]) => {
    if (form.length >= 2 && form.length <= 6 && form !== stem && !out.some((o) => o.form === form)) out.push({ form, changes });
  };
  const tryStem = (s: string, changes: string[]) => {
    if (s !== stem && s.length >= 3) add(s, changes);
    const bare = withoutVowelLetters(s);
    if (bare !== s && bare.length >= 3) add(bare, [...changes, vowel(s.slice(1, -1))]);
  };
  tryStem(stem, []);
  if (stem.endsWith("ת") && stem.length >= 4) tryStem(stem.slice(0, -1) + "ה", ["a ת at the end becomes ה in the dictionary"]);
  for (const [end, note] of PAST_ENDINGS) {
    if (stem.endsWith(end) && stem.length - end.length >= 3) tryStem(stem.slice(0, -end.length), [note]);
  }
  for (const [front, note] of VERB_FRONTS) {
    if (!stem.startsWith(front)) continue;
    const rest = stem.slice(front.length);
    if (rest.length >= 3) tryStem(rest, [note]);
    // Some roots lose their first letter, נ or י, in these forms (הגיע from נגע, הושיב from ישב).
    const core = rest.length >= 3 ? rest[0] + rest.slice(1, -1).replace(/[וי]/g, "") + rest.slice(-1) : rest;
    if (core.length === 2) {
      add("נ" + core, [note, "the root's first letter, נ, drops out in this form"]);
      add("י" + core, [note, "the root's first letter, י, drops out in this form"]);
    }
    if (rest.length >= 3 && rest.startsWith("ו")) add(withoutVowelLetters("י" + rest.slice(1)), [note, "the ו stands for the root's first letter, י"]);
  }
  return out;
}

/** Dictionary entries can run for pages; a few hundred words are enough for one line. */
function clipEntry(text: string): string {
  const max = 900;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut) + " …";
}

/** A range of refs that share a section prefix, using the index (LIKE would scan). */
function prefixRange(prefix: string): [string, string] {
  return [prefix, prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1)];
}

/** "Genesis 1:1-5" -> ["Genesis 1:1", "Genesis 1:5"]; "Genesis 1" -> ["Genesis 1", null]. */
export function parseRef(ref: string): { start: string; end: string | null } {
  const clean = ref.trim().replace(/\s+/g, " ").replace(/[–—]/g, "-");
  const m = clean.match(/^(.*\s)([\d]+[ab]?(?::\d+[ab]?)*)-([\d:ab]+)$/);
  if (!m) return { start: clean, end: null };
  const startLoc = m[2];
  const endPart = m[3];
  const startParts = startLoc.split(":");
  const endParts = endPart.split(":");
  const merged = [...startParts.slice(0, startParts.length - endParts.length), ...endParts];
  return { start: m[1] + startLoc, end: m[1] + merged.join(":") };
}

export function createTestingStore(db: Db): TestingStore {
  let catalogCache: string | null = null;
  let selectCache: Promise<string> | null = null;

  let articlesCache: Promise<boolean> | null = null;

  /** Whether this database is a website collection (it has the articles table). */
  function hasArticles(): Promise<boolean> {
    articlesCache ??= db
      .all("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articles'")
      .then((rows) => rows.length > 0)
      .catch(() => false);
    return articlesCache;
  }

  /** The row columns, checked once against the library's works table, and whether it holds articles. */
  function select(): Promise<string> {
    selectCache ??= Promise.all([
      db.all("SELECT name FROM pragma_table_info('works')").catch(() => [] as Record<string, unknown>[]),
      hasArticles(),
    ]).then(([cols, articles]) => rowSelect(cols.some((c) => c.name === "standing"), articles));
    return selectCache;
  }

  async function rowsWhere(where: string, args: InValue[], limit: number): Promise<Row[]> {
    const rows = await db.all(`${await select()} WHERE ${where} ORDER BY p.seq LIMIT ${Math.max(1, Math.floor(limit))}`, args);
    return rows.map(toRow);
  }

  async function byExactRefs(refs: string[]): Promise<Row[]> {
    if (!refs.length) return [];
    return rowsWhere(`p.ref IN (${refs.map(() => "?").join(",")})`, refs, refs.length * 4);
  }

  async function lookupOne(ref: string, perRef: number): Promise<Row[]> {
    const { start, end } = parseRef(ref);
    const exact = await rowsWhere("p.ref = ?", [start], 6);
    if (exact.length && !end) return exact;
    if (exact.length && end) {
      // A range within one section: from the start line to the end line.
      const [lo, hi] = prefixRange(sectionOf(start) + ":");
      const rows = await rowsWhere("p.ref >= ? AND p.ref < ? AND p.seq >= ?", [lo, hi, exact[0].seq], perRef * 4);
      const endRow = rows.find((r) => r.ref === end);
      return endRow ? rows.filter((r) => r.seq <= endRow.seq) : rows;
    }
    // A whole book or article by its title ("Genesis", "Aish.com, Why We Light Candles"), so a
    // title that begins another ("Genesis Rabbah") isn't mixed in.
    const whole = await rowsWhere("t.title = ?", [start], perRef * 4);
    if (whole.length) return whole;
    // A section ("Berakhot 2a", "Genesis 1") or a book with numbered paragraphs ("Kuzari 1").
    for (const sep of [":", " ", ", "]) {
      const [lo, hi] = prefixRange(start + sep);
      const rows = await rowsWhere("p.ref >= ? AND p.ref < ?", [lo, hi], perRef * 4);
      if (rows.length) return rows;
    }
    return [];
  }

  function limitRefs(rows: Row[], max: number): Row[] {
    const keep = new Set<string>();
    for (const r of rows.sort((a, b) => a.seq - b.seq)) {
      if (keep.size >= max && !keep.has(r.ref)) continue;
      keep.add(r.ref);
    }
    return rows.filter((r) => keep.has(r.ref));
  }

  return {
    async lookup(refs, perRef = TESTING_LIMITS.perRef) {
      const results = await Promise.all(refs.slice(0, 12).map((r) => lookupOne(r, perRef)));
      const rows = results.flatMap((rs) => limitRefs(rs, perRef));
      // Fill in the other language for refs that came back in only one.
      const refsSeen = [...new Set(rows.map((r) => r.ref))];
      const more = await byExactRefs(refsSeen);
      const ids = new Set(rows.map((r) => r.id));
      const passages = groupRows([...rows, ...more.filter((r) => !ids.has(r.id))]);
      const order = new Map(refsSeen.map((r, i) => [r, i]));
      return passages.sort((a, b) => (order.get(a.ref) ?? 0) - (order.get(b.ref) ?? 0));
    },

    async search(phrases, limit) {
      const query = ftsQuery(phrases);
      if (!query) return [];
      let ids: Record<string, unknown>[];
      try {
        ids = await db.all(
          `SELECT rowid AS id FROM passages_fts WHERE passages_fts MATCH ? ORDER BY rank LIMIT ${Math.floor(limit) * 2}`,
          [query],
        );
      } catch (err) {
        console.warn("[rabai] library search failed:", err instanceof Error ? err.message : err);
        return [];
      }
      if (!ids.length) return [];
      const idList = ids.map((r) => Number(r.id));
      const hits = await rowsWhere(`p.id IN (${idList.map(() => "?").join(",")})`, idList, idList.length);
      const rank = new Map(idList.map((id, i) => [id, i]));
      hits.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
      const refs: string[] = [];
      for (const h of hits) if (!refs.includes(h.ref)) refs.push(h.ref);
      const top = refs.slice(0, limit);
      const rows = await byExactRefs(top);
      const order = new Map(top.map((r, i) => [r, i]));
      return groupRows(rows).sort((a, b) => (order.get(a.ref) ?? 0) - (order.get(b.ref) ?? 0));
    },

    async articles() {
      // One database is the testing library or one collection; combineStores searches the collections.
      return [];
    },

    async linked(refs, limit) {
      if (!refs.length || limit <= 0) return [];
      const marks = refs.map(() => "?").join(",");
      const notDictionary = "(kind IS NULL OR kind != 'dictionary')";
      const rows = await db.all(
        `SELECT a, b FROM links WHERE a IN (${marks}) AND ${notDictionary} UNION ALL ` +
          `SELECT b, a FROM links WHERE b IN (${marks}) AND ${notDictionary} LIMIT 400`,
        [...refs, ...refs],
      );
      const seen = new Set(refs);
      const others: string[] = [];
      for (const r of rows) {
        const other = String(r.b);
        if (!seen.has(other)) {
          seen.add(other);
          others.push(other);
        }
      }
      // Commentaries on these lines first ("Rashi on Genesis 1:1:1"), then other texts.
      const isCommentary = (ref: string) => / on /.test(ref) && refs.some((r) => ref.includes(` on ${sectionOf(r)}`));
      others.sort((a, b) => Number(isCommentary(b)) - Number(isCommentary(a)));
      const chosen = others.slice(0, limit);
      const found = await byExactRefs(chosen);
      const order = new Map(chosen.map((r, i) => [r, i]));
      return groupRows(found).sort((a, b) => (order.get(a.ref) ?? 0) - (order.get(b.ref) ?? 0));
    },

    async dictionary(passages, limit) {
      if (!passages.length || limit <= 0) return [];
      const refs = passages.map((p) => p.ref);
      const cited = await db.all(
        `SELECT DISTINCT a FROM links WHERE kind = 'dictionary' AND b IN (${refs.map(() => "?").join(",")}) LIMIT 60`,
        refs,
      );
      const order: string[] = cited.map((r) => String(r.a));
      const forms = wordForms(passages.map((p) => p.he).join(" "));
      if (forms.length) {
        const hits = await db.all(
          `SELECT l.word, p.ref FROM lexicon l JOIN passages p ON p.id = l.passage_id WHERE l.word IN (${forms
            .map(() => "?")
            .join(",")}) LIMIT 400`,
          forms,
        );
        // Words in the order they appear; for each word, its own form before a guessed base form.
        const rank = new Map(forms.map((f, i) => [f, i]));
        hits.sort((a, b) => (rank.get(String(a.word)) ?? 0) - (rank.get(String(b.word)) ?? 0));
        // At most two entries per form, so one ambiguous word can't crowd out the rest.
        const perForm = new Map<string, number>();
        for (const h of hits) {
          const word = String(h.word);
          const n = perForm.get(word) ?? 0;
          if (n >= 2 || order.includes(String(h.ref))) continue;
          perForm.set(word, n + 1);
          order.push(String(h.ref));
        }
      }
      const chosen = order.slice(0, limit);
      const rows = await byExactRefs(chosen);
      const at = new Map(chosen.map((r, i) => [r, i]));
      return groupRows(rows)
        .sort((a, b) => (at.get(a.ref) ?? 0) - (at.get(b.ref) ?? 0))
        .map((p) => ({ ...p, he: clipEntry(p.he), en: clipEntry(p.en) }));
    },

    async wordEntries(word, limit = 8) {
      // A printed short form (א״ל, ר׳) is never looked up as the plain word its letters spell (א״ל
      // is not אל). Nor as a short form: the few the dictionaries list with a mark are letter
      // names and letter ciphers (Jastrow's א"ל is "Albam"), almost never what a text means by it.
      if (abbreviationOf(word)) return [];
      const readings = wordReadings(word);
      if (!readings.length) return [];
      const forms = readings.map((r) => r.form);
      const hits = await db.all(
        `SELECT l.word, p.ref FROM lexicon l JOIN passages p ON p.id = l.passage_id WHERE l.word IN (${forms
          .map(() => "?")
          .join(",")}) LIMIT 300`,
        forms,
      );
      const rank = new Map(forms.map((f, i) => [f, i]));
      hits.sort((a, b) => (rank.get(String(a.word)) ?? 0) - (rank.get(String(b.word)) ?? 0));
      // At most four entries per reading, so one common form can't crowd out a better one. The
      // likeliest kind of reading that found anything leads; at most two others follow it.
      const tier = (r: WordReading) => (r.guess ? 2 : r.suffix ? 1 : 0);
      const chosen: Array<{ ref: string; reading: WordReading }> = [];
      const perForm = new Map<string, number>();
      let best = -1;
      let others = 0;
      for (const h of hits) {
        const form = String(h.word);
        const ref = String(h.ref);
        const reading = readings[rank.get(form) ?? 0];
        const n = perForm.get(form) ?? 0;
        if (n >= 4 || chosen.some((c) => c.ref === ref)) continue;
        if (best < 0) best = tier(reading);
        if (tier(reading) !== best && ++others > 2) break;
        perForm.set(form, n + 1);
        chosen.push({ ref, reading });
        if (chosen.length >= limit) break;
      }
      if (!chosen.length) return [];
      const found = groupRows(await byExactRefs(chosen.map((c) => c.ref)));
      return chosen.flatMap((c) => {
        const p = found.find((f) => f.ref === c.ref);
        return p ? [{ ...p, he: clipEntry(p.he), en: clipEntry(p.en), reading: c.reading }] : [];
      });
    },

    async section(ref) {
      let first = (await lookupOne(ref, 1))[0];
      if (!first) return null;
      // A commentary opens on the text it explains: "Rashi on Genesis 1:1:2" -> Genesis 1.
      const onBook = first.title.match(/^.+? on (.+)$/);
      if (onBook) {
        const parts = locationIn(first.ref, first.title).split(":");
        if (parts.length >= 2) {
          const base = (await lookupOne(`${onBook[1]} ${parts.slice(0, -1).join(":")}`, 1))[0];
          if (base) first = base;
        }
      }
      const section = sectionOf(first.ref);
      const [lo, hi] = prefixRange(section === first.ref ? section : section + (first.ref.charAt(section.length) || ":"));
      const rows = await rowsWhere("p.ref >= ? AND p.ref < ? AND t.title = ?", [lo, hi, first.title], TESTING_LIMITS.section * 3);
      const lines = groupRows(rows.length ? rows : [first]);
      const lineRefs = lines.map((l) => l.ref);
      const commentaries = new Map<string, Passage[]>();
      if (lineRefs.length) {
        const marks = lineRefs.map(() => "?").join(",");
        const links = await db.all(
          `SELECT a AS base, b AS other FROM links WHERE a IN (${marks}) UNION ALL SELECT b AS base, a AS other FROM links WHERE b IN (${marks})`,
          [...lineRefs, ...lineRefs],
        );
        const wanted = new Map<string, string>();
        for (const l of links) {
          const other = String(l.other);
          if (other.includes(` on ${first.title} `)) wanted.set(other, String(l.base));
        }
        const comm = groupRows(await byExactRefs([...wanted.keys()].slice(0, 600)));
        for (const c of comm) {
          const base = wanted.get(c.ref)!;
          const list = commentaries.get(base) ?? [];
          if (list.length < TESTING_LIMITS.commentariesPerLine) list.push({ ...c, on: base });
          commentaries.set(base, list);
        }
      }
      // The sections before and after, in the book's own order.
      const seqs = (rows.length ? rows : [first]).map((r) => r.seq);
      const [before, after] = await Promise.all([
        db.all(
          "SELECT p.ref FROM passages p JOIN titles t ON t.id = p.title_id WHERE t.title = ? AND p.seq < ? ORDER BY p.seq DESC LIMIT 1",
          [first.title, Math.min(...seqs)],
        ),
        db.all(
          "SELECT p.ref FROM passages p JOIN titles t ON t.id = p.title_id WHERE t.title = ? AND p.seq > ? ORDER BY p.seq LIMIT 200",
          [first.title, Math.max(...seqs)],
        ),
      ]);
      const prev = before[0] ? sectionOf(String(before[0].ref)) : undefined;
      const next = after.map((r) => sectionOf(String(r.ref))).find((x) => x !== section);
      return { lines, commentaries, ...(prev && prev !== section ? { prev } : {}), ...(next ? { next } : {}) };
    },

    async contents(title) {
      const rows = await db.all(
        `SELECT rtrim(rtrim(p.ref, '0123456789'), ':') AS s, MIN(p.seq) AS q
         FROM passages p JOIN titles t ON t.id = p.title_id
         WHERE t.title = ? GROUP BY s ORDER BY q LIMIT 4000`,
        [title],
      );
      return [...new Set(rows.map((r) => String(r.s).trim()).filter(Boolean))];
    },

    async daf(section) {
      const m = section.trim().match(/^(.+) (\d+[ab])$/);
      if (!m) return null;
      const [, tractate, amud] = m;
      const rowsOf = async (title: string) => {
        const [lo, hi] = prefixRange(`${title} ${amud}:`);
        return groupRows(await rowsWhere("p.ref >= ? AND p.ref < ? AND t.title = ?", [lo, hi, title], TESTING_LIMITS.section * 3), {
          full: true,
        });
      };
      const [main, rashi, tosafot] = await Promise.all([rowsOf(tractate), rowsOf(`Rashi on ${tractate}`), rowsOf(`Tosafot on ${tractate}`)]);
      if (!main.length) return null;
      return { main, rashi, tosafot };
    },

    async exact(refs) {
      const wanted = [...new Set(refs)].slice(0, 400);
      const rows: Row[] = [];
      for (let i = 0; i < wanted.length; i += 100) rows.push(...(await byExactRefs(wanted.slice(i, i + 100))));
      return groupRows(rows, { full: true });
    },

    async vowels(refs) {
      const wanted = [...new Set(refs)].slice(0, 400);
      const out = new Map<string, string>();
      for (let i = 0; i < wanted.length; i += 100) {
        const chunk = wanted.slice(i, i + 100);
        let rows: Array<Record<string, unknown>>;
        try {
          rows = await db.all(`SELECT ref, text FROM vowels WHERE ref IN (${chunk.map(() => "?").join(", ")})`, chunk);
        } catch {
          return out; // a library built before the vowels existed has no such table
        }
        for (const r of rows) if (typeof r.ref === "string" && typeof r.text === "string") out.set(r.ref, r.text);
      }
      return out;
    },

    async dafLayout(section) {
      let rows: Array<Record<string, unknown>>;
      try {
        rows = await db.all("SELECT data FROM daf_layout WHERE section = ?", [section]);
      } catch {
        return null; // a library built before the layouts existed has no such table
      }
      const raw = rows[0]?.data;
      if (typeof raw !== "string") return null;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    },

    async booksFor({ titles = [], works = [], like = [] }) {
      const where: string[] = [];
      const args: InValue[] = [];
      if (titles.length) {
        where.push(`t.title IN (${titles.map(() => "?").join(",")})`);
        args.push(...titles);
      }
      if (works.length) {
        where.push(`t.work IN (${works.map(() => "?").join(",")})`);
        args.push(...works);
      }
      for (const pattern of like) {
        where.push("t.title LIKE ?");
        args.push(pattern);
      }
      if (!where.length) return [];
      const rows = await db.all(
        `SELECT t.title FROM titles t WHERE (${where.join(" OR ")}) AND t.categories NOT LIKE '%"Dictionary"%' ORDER BY t.id`,
        args,
      );
      return rows.map((r) => String(r.title));
    },

    async untranslated(titles, afterSeq, limit) {
      if (!titles.length || limit <= 0) return [];
      const rows = await db.all(
        `SELECT p.ref FROM passages p
           JOIN titles t ON t.id = p.title_id
           JOIN editions e ON e.id = p.edition_id
         WHERE t.title IN (${titles.map(() => "?").join(",")}) AND e.language = 'he' AND e.word_tool = 0 AND p.seq > ?
           AND NOT EXISTS (SELECT 1 FROM passages q JOIN editions f ON f.id = q.edition_id WHERE q.ref = p.ref AND f.language = 'en')
         ORDER BY p.seq LIMIT ${Math.max(1, Math.floor(limit))}`,
        [...titles, afterSeq],
      );
      return groupRows(await byExactRefs(rows.map((r) => String(r.ref))), { full: true }).filter((p) => p.he.trim() && !p.en.trim());
    },

    async untranslatedCount(titles) {
      if (!titles.length) return { passages: 0, words: 0 };
      const rows = await db.all(
        `SELECT COUNT(*) AS n, SUM(LENGTH(p.text) - LENGTH(REPLACE(p.text, ' ', '')) + 1) AS words FROM passages p
           JOIN titles t ON t.id = p.title_id
           JOIN editions e ON e.id = p.edition_id
         WHERE t.title IN (${titles.map(() => "?").join(",")}) AND e.language = 'he' AND e.word_tool = 0
           AND NOT EXISTS (SELECT 1 FROM passages q JOIN editions f ON f.id = q.edition_id WHERE q.ref = p.ref AND f.language = 'en')`,
        titles,
      );
      return { passages: Number(rows[0]?.n ?? 0), words: Number(rows[0]?.words ?? 0) };
    },

    async articleShelves() {
      if (!(await hasArticles())) return [];
      const rows = await db.all(
        `SELECT w.id AS work, w.title, a.site, COUNT(*) AS n
         FROM articles a JOIN editions e ON e.id = a.edition_id JOIN works w ON w.id = e.work
         GROUP BY w.id, a.site ORDER BY MIN(e.id)`,
      );
      return rows.map((r) => ({ site: String(r.site), work: String(r.work), title: String(r.title), count: Number(r.n) }));
    },

    async articleList(work, offset, limit) {
      if (limit <= 0 || !(await hasArticles())) return [];
      const rows = await db.all(
        `${LISTING_SELECT} WHERE e.work = ?
         ORDER BY a.published DESC, t.id DESC LIMIT ${Math.floor(limit)} OFFSET ${Math.max(0, Math.floor(offset))}`,
        [work],
      );
      return listings(rows);
    },

    async articleSearch(text, limit) {
      if (limit <= 0 || !(await hasArticles())) return [];
      const words = searchWords(text);
      if (!words.length) return [];
      const lim = Math.floor(limit);
      // First, articles whose title (after the site's name) holds every word, newest first.
      const titled = await db.all(
        `${LISTING_SELECT} WHERE ${words.map(() => "substr(t.title, length(a.site) + 3) LIKE ? ESCAPE '\\'").join(" AND ")}
         ORDER BY a.published DESC, t.id DESC LIMIT ${lim}`,
        words.map((w) => `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`),
      );
      const out = listings(titled);
      if (out.length >= lim) return out;
      // Then articles whose text holds every word, best match first.
      let hits: Record<string, unknown>[] = [];
      try {
        hits = await db.all(`SELECT rowid AS id FROM passages_fts WHERE passages_fts MATCH ? ORDER BY rank LIMIT 300`, [
          words.map((w) => `"${w}"`).join(" "),
        ]);
      } catch (err) {
        console.warn("[rabai] searching the articles failed:", err instanceof Error ? err.message : err);
      }
      if (!hits.length) return out;
      const ids = hits.map((r) => Number(r.id));
      const owners = await db.all(`SELECT id, title_id FROM passages WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
      const titleOf = new Map(owners.map((r) => [Number(r.id), Number(r.title_id)]));
      const have = new Set(titled.map((r) => Number(r.title_id)));
      const want: number[] = [];
      for (const id of ids) {
        const t = titleOf.get(id);
        if (t !== undefined && !have.has(t) && !want.includes(t)) want.push(t);
        if (out.length + want.length >= lim) break;
      }
      if (!want.length) return out;
      const rows = await db.all(`${LISTING_SELECT} WHERE t.id IN (${want.map(() => "?").join(",")})`, want);
      const rank = new Map(want.map((t, i) => [t, i]));
      rows.sort((a, b) => (rank.get(Number(a.title_id)) ?? 0) - (rank.get(Number(b.title_id)) ?? 0));
      return [...out, ...listings(rows)];
    },

    async books() {
      const rows = await db.all(
        `SELECT t.id, t.title, t.he_title, t.categories, w.title AS work_title,
                (SELECT p.ref FROM passages p WHERE p.title_id = t.id ORDER BY p.seq LIMIT 1) AS first_ref
         FROM titles t JOIN works w ON w.id = t.work ORDER BY t.id`,
      );
      return rows
        .filter((r) => r.first_ref)
        .map((r) => ({
          title: String(r.title),
          he: String(r.he_title ?? r.title),
          firstRef: String(r.first_ref),
          workTitle: String(r.work_title),
          categories: parseCategories(r.categories),
          order: Number(r.id),
        }));
    },

    async catalog() {
      if (catalogCache) return catalogCache;
      const rows = await db.all(`SELECT w.title AS work, t.title FROM titles t JOIN works w ON w.id = t.work ORDER BY w.title, t.id`);
      const byWork = new Map<string, string[]>();
      for (const r of rows) {
        const list = byWork.get(String(r.work)) ?? [];
        list.push(String(r.title));
        byWork.set(String(r.work), list);
      }
      catalogCache = [...byWork.entries()].map(([work, titles]) => `${work}: ${titles.join("; ")}`).join("\n");
      return catalogCache;
    },
  };
}

let storeCache: { key: string; store: TestingStore } | null = null;

/**
 * The testing library, when its database is configured, together with any website collections
 * (RABAI_COLLECTION_DB_URLS): one store that sends each request to the database that holds it.
 */
export function testingStore(env: Record<string, string | undefined> = process.env): TestingStore | null {
  const url = testingDbUrl(env);
  const client = testingClient(env);
  // testingClient refuses a public app, so so does this (and collectionClients).
  if (!url || !client) return null;
  const key = [url, ...collectionDbUrls(env)].join("\n");
  if (storeCache?.key === key) return storeCache.store;
  const main = createTestingStore(dbFrom(client));
  const sources = collectionClients(env).map((c) => {
    const db = dbFrom(c);
    return { db, store: createTestingStore(db) };
  });
  const store = sources.length ? combineStores(main, sources) : main;
  storeCache = { key, store };
  return store;
}
