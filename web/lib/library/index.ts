import { DEV_PASSAGES, DEV_WORKS } from "./dev-library";
import { testingDbUrl } from "./testing-config";
import type { Passage, Work } from "./types";

export type { Passage, Work } from "./types";

/**
 * Which texts the app may use.
 *
 * - "development": the team's typed texts, for building and testing only.
 * - "testing": the private testing library (tools/validate.py --testing, built into a database by
 *   tools/library_build.py): published Orthodox editions not yet approved by the board. Used
 *   whenever its database is configured, unless RABAI_LIBRARY says otherwise. Never public.
 * - "approved": only works and editions the rabbinic board has approved and whose licenses are
 *   cleared (canon/canon.yaml + tools/validate.py --whitelist). Empty until the board approves.
 */
export type LibraryMode = "development" | "testing" | "approved";

export function libraryMode(env: Record<string, string | undefined> = process.env): LibraryMode {
  if (env.RABAI_LIBRARY === "approved") return "approved";
  if (env.RABAI_LIBRARY === "development") return "development";
  return testingDbUrl(env) ? "testing" : "development";
}

export interface Library {
  mode: LibraryMode;
  works: Work[];
  passages: Passage[];
}

/**
 * The texts held in memory. In testing mode they live in the database instead
 * (lib/library/testing.ts), so this is empty.
 */
export function loadLibrary(mode: LibraryMode = libraryMode()): Library {
  const works = DEV_WORKS.filter((w) =>
    mode === "approved" ? w.library === "approved" : mode === "testing" ? false : true,
  );
  const ids = new Set(works.map((w) => w.id));
  const passages = DEV_PASSAGES.filter((p) => ids.has(p.work));
  return { mode, works, passages };
}

// ---------------------------------------------------------------------------
// Lookups

export function getWork(lib: Library, id: string): Work | undefined {
  return lib.works.find((w) => w.id === id);
}

export function getPassage(lib: Library, ref: string): Passage | undefined {
  const key = normalizeRef(ref);
  return lib.passages.find((p) => normalizeRef(p.ref) === key);
}

/** Commentaries written on a given line, in library order. */
export function commentariesOn(lib: Library, ref: string): Passage[] {
  const key = normalizeRef(ref);
  return lib.passages.filter((p) => p.on && normalizeRef(p.on) === key).sort((a, b) => a.order - b.order);
}

export interface SectionLine {
  passage: Passage;
  commentaries: Passage[];
}

export interface Section {
  section: string;
  sectionHe: string;
  work: Work;
  lines: SectionLine[];
}

/**
 * A whole page or chapter, with each line's commentaries attached.
 * Accepts the section name ("Bereishit 1") or any ref inside it ("Rashi on Bereishit 1:1").
 */
export function getSection(lib: Library, refOrSection: string): Section | undefined {
  const passage = getPassage(lib, refOrSection);
  const sectionName = passage
    ? passage.on
      ? (getPassage(lib, passage.on)?.section ?? passage.section)
      : passage.section
    : lib.passages.find((p) => !p.on && normalizeRef(p.section) === normalizeRef(refOrSection))?.section;
  if (!sectionName) return undefined;

  const base = lib.passages
    .filter((p) => !p.on && p.section === sectionName)
    .sort((a, b) => a.order - b.order);
  if (base.length === 0) return undefined;
  const work = getWork(lib, base[0].work);
  if (!work) return undefined;

  return {
    section: sectionName,
    sectionHe: base[0].sectionHe,
    work,
    lines: base.map((p) => ({ passage: p, commentaries: commentariesOn(lib, p.ref) })),
  };
}

export interface SectionSummary {
  section: string;
  sectionHe: string;
  workId: string;
  workTitle: string;
  firstRef: string;
  lineCount: number;
  commentaryCount: number;
}

/** Every page or chapter in the library, for browsing. */
export function listSections(lib: Library): SectionSummary[] {
  const out = new Map<string, SectionSummary>();
  for (const p of lib.passages) {
    if (p.on) continue;
    const work = getWork(lib, p.work);
    if (!work) continue;
    const existing = out.get(p.section);
    if (existing) {
      existing.lineCount += 1;
    } else {
      out.set(p.section, {
        section: p.section,
        sectionHe: p.sectionHe,
        workId: work.id,
        workTitle: work.title,
        firstRef: p.ref,
        lineCount: 1,
        commentaryCount: 0,
      });
    }
  }
  for (const p of lib.passages) {
    if (!p.on) continue;
    const base = getPassage(lib, p.on);
    const summary = base && out.get(base.section);
    if (summary) summary.commentaryCount += 1;
  }
  for (const s of out.values()) {
    const first = lib.passages
      .filter((p) => !p.on && p.section === s.section)
      .sort((a, b) => a.order - b.order)[0];
    if (first) s.firstRef = first.ref;
  }
  return [...out.values()];
}

// ---------------------------------------------------------------------------
// Search

const STOP_WORDS = new Set(
  "a an and are as at be but by can could did do does for from had has have how i if in into is it its me my of on or our so than that the their them then there these they this those to was we were what when where which who whom why will with would you your about tell please explain mean means say says said".split(
    " ",
  ),
);

/** Remove Hebrew vowels and cantillation (U+0591–U+05C7) and geresh-style marks. */
export function stripNiqqud(s: string): string {
  return s.replace(/[֑-ׇ]/g, "").replace(/[״׳"']/g, "");
}

export function normalizeRef(ref: string): string {
  return stripNiqqud(ref).toLowerCase().replace(/\s+/g, " ").trim();
}

function words(s: string): string[] {
  return stripNiqqud(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/** Reduce simple English plurals so "candles" finds "candle". */
function stem(w: string): string {
  if (/^[a-z]+$/.test(w) && w.length > 4) {
    if (w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.endsWith("es") && /(ch|sh|s|x|z)es$/.test(w)) return w.slice(0, -2);
    if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  }
  return w;
}

export interface SearchOptions {
  /** A ref the person is looking at; it and its neighbors are always included. */
  focusRef?: string;
  /** Passages that must be included after the focused line, such as every place a root appears. */
  includeRefs?: string[];
  /** Maximum passages to return. */
  limit?: number;
}

export interface SearchHit {
  passage: Passage;
  score: number;
}

/**
 * Find the passages that bear on a question. Development-grade search: keyword and reference
 * matching. Real libraries will use full-text and embedding search over the whitelist.
 */
export function search(lib: Library, query: string, opts: SearchOptions = {}): Passage[] {
  const limit = opts.limit ?? 10;
  const q = normalizeRef(query);
  const qWords = new Set(words(query).map(stem));

  const scored: SearchHit[] = lib.passages.map((p) => {
    const work = getWork(lib, p.work);
    let score = 0;

    // An explicit reference ("Bereishit 1:1", "Shabbat 21b", "Rashi on Genesis 1:1").
    const refForms = refVariants(p, work);
    for (const form of refForms) {
      if (q.includes(form.full)) score += 30;
      else if (form.section && q.includes(form.section)) score += 6;
    }

    const text = new Set([...words(p.en), ...words(p.he)].map(stem));
    const keys = new Set((p.keywords ?? []).flatMap((k) => words(k)).map(stem));
    const phrases = (p.keywords ?? []).map((k) => k.toLowerCase()).filter((k) => k.includes(" "));
    const names = new Set(
      [work?.title ?? "", work?.author ?? "", ...(work?.aliases ?? [])].flatMap((n) => words(n)).map(stem),
    );

    for (const w of qWords) {
      if (keys.has(w)) score += 3;
      if (text.has(w)) score += 1;
      if (names.has(w)) score += 2;
    }
    for (const phrase of phrases) if (q.includes(phrase)) score += 4;

    return { passage: p, score };
  });

  const picked = new Map<string, Passage>();
  const add = (p: Passage | undefined) => {
    if (p && picked.size < limit && !picked.has(p.ref)) picked.set(p.ref, p);
  };

  // The line the person is looking at comes first, with its commentaries and close neighbors.
  if (opts.focusRef) {
    const focus = getPassage(lib, opts.focusRef);
    if (focus) {
      add(focus);
      if (focus.on) add(getPassage(lib, focus.on));
      for (const c of commentariesOn(lib, focus.ref)) add(c);
      const section = getSection(lib, focus.ref);
      if (section) {
        const base = focus.on ? getPassage(lib, focus.on) : focus;
        const idx = section.lines.findIndex((l) => l.passage.ref === base?.ref);
        add(section.lines[idx - 1]?.passage);
        add(section.lines[idx + 1]?.passage);
      }
    }
  }

  for (const ref of opts.includeRefs ?? []) add(getPassage(lib, ref));

  const best = scored
    .filter((h) => h.score >= 2)
    .sort((a, b) => b.score - a.score || a.passage.order - b.passage.order);
  for (const hit of best) {
    if (picked.size >= limit) break;
    add(hit.passage);
    // Keep each text with its commentary, so RabAI can explain the commentary on its line.
    if (hit.passage.on) add(getPassage(lib, hit.passage.on));
    else for (const c of commentariesOn(lib, hit.passage.ref)) if (hit.score >= 4) add(c);
  }

  return [...picked.values()];
}

interface RefForm {
  full: string;
  section?: string;
}

function refVariants(p: Passage, work: Work | undefined): RefForm[] {
  const forms: RefForm[] = [{ full: normalizeRef(p.ref), section: p.on ? undefined : normalizeRef(p.section) }];
  if (!work) return forms;
  // "Genesis 1:1" for "Bereishit 1:1", "Shabbos 21b" for "Shabbat 21b".
  const location = p.ref.slice(p.ref.lastIndexOf(" ") + 1);
  const sectionLoc = p.section.slice(p.section.lastIndexOf(" ") + 1);
  if (!p.on) {
    for (const alias of work.aliases ?? []) {
      forms.push({ full: normalizeRef(`${alias} ${location}`), section: normalizeRef(`${alias} ${sectionLoc}`) });
    }
  }
  return forms;
}
