/*
 * Helpers for showing one amud of the Bavli as printed: naming the page, finding the pages before
 * and after it, and telling Rashi's and Tosafot's opening words from the rest of the comment.
 * Pure functions, shared by the server route and the page.
 */

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

/** A page number in Hebrew letters, as printed: 2 -> ב, 15 -> טו, 16 -> טז, 176 -> קעו. */
export function hebrewNumeral(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n >= 500) return String(n);
  const tail = n % 100;
  const tens = tail === 15 ? "ט" : tail === 16 ? "ט" : TENS[Math.floor(tail / 10)];
  const ones = tail === 15 ? "ו" : tail === 16 ? "ז" : ONES[tail % 10];
  return HUNDREDS[Math.floor(n / 100)] + tens + ones;
}

export interface AmudRef {
  tractate: string;
  daf: number;
  amud: "a" | "b";
}

/** "Berakhot 2a" -> { tractate: "Berakhot", daf: 2, amud: "a" }. A line ref works too. */
export function parseAmud(ref: string): AmudRef | null {
  const m = ref.trim().match(/^(.+?) (\d+)([ab])(?::.*)?$/);
  if (!m) return null;
  const daf = Number(m[2]);
  if (!daf) return null;
  return { tractate: m[1], daf, amud: m[3] as "a" | "b" };
}

export function amudRef(a: AmudRef): string {
  return `${a.tractate} ${a.daf}${a.amud}`;
}

/** The page before: 3a -> 2b, 2b -> 2a. A tractate starts at 2a. */
export function prevAmud(a: AmudRef): AmudRef | null {
  if (a.amud === "b") return { ...a, amud: "a" };
  return a.daf > 2 ? { ...a, daf: a.daf - 1, amud: "b" } : null;
}

export function nextAmud(a: AmudRef): AmudRef {
  return a.amud === "a" ? { ...a, amud: "b" } : { ...a, daf: a.daf + 1, amud: "a" };
}

/** How the page is named in Hebrew: "ברכות ב." for amud a and "ברכות ב:" for amud b. */
export function amudLabelHe(tractateHe: string, a: AmudRef): string {
  return `${tractateHe} ${hebrewNumeral(a.daf)}${a.amud === "a" ? "." : ":"}`;
}

/**
 * Rashi and Tosafot begin each comment with the words they explain (the dibbur hamatchil),
 * printed in bold. They end at the first dash, or else at the first period near the start.
 */
export function splitOpening(text: string): { opening: string; rest: string } {
  const dash = text.search(/\s[–—-]\s/);
  if (dash > 0 && dash <= 90) return { opening: text.slice(0, dash).trim(), rest: text.slice(dash).replace(/^\s[–—-]\s/, " ").trimStart() };
  const dot = text.indexOf(". ");
  if (dot > 0 && dot <= 70) return { opening: text.slice(0, dot + 1).trim(), rest: text.slice(dot + 1).trimStart() };
  return { opening: "", rest: text };
}

/** "Rashi on Berakhot 2a:1:3" -> "Berakhot 2a:1", the Gemara line it explains. */
export function commentBase(ref: string): string {
  const withoutAuthor = ref.replace(/^.+? on /, "");
  const parts = withoutAuthor.split(":");
  return parts.length >= 3 ? parts.slice(0, 2).join(":") : withoutAuthor;
}

/** Remove markup a source text may carry, keeping its words. */
export function plainText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** One piece of text on the page, as the page view needs it. */
export interface DafPiece {
  ref: string;
  he: string;
  en: string;
  /** For Rashi and Tosafot: the Gemara line the comment explains. */
  on?: string;
  /**
   * For the Gemara, when the library has its vocalized copy: each of the passage's words
   * (pieceWords(he)) with its vowels, or "" where the copy doesn't have that word. See vowelWords.
   */
  vowels?: string[];
}

export interface DafData {
  section: string;
  tractate: string;
  tractateHe: string;
  daf: number;
  amud: "a" | "b";
  labelHe: string;
  prev: string | null;
  next: string;
  main: DafPiece[];
  rashi: DafPiece[];
  tosafot: DafPiece[];
  /** Which editions the page comes from, for the label under it. */
  editions: { main: string; mainEnglish: string; rashi: string; tosafot: string };
  libraryLabel: string;
  /** Where each printed line sits on the Vilna page, when the library has it for this amud. */
  printed?: DafPrinted;
}

// ---------------------------------------------------------------------------
// The page line for line, as printed.
//
// tools/daf_layout.py reads a scan of the Romm Vilna printing and records, for every printed line,
// its box on the page and the library words it holds. A comment can start on one page and end on
// the next, so a line can hold words of the amud before or after this one; those pieces come along
// in `extra`.

export type DafPart = "main" | "rashi" | "tosafot";

export interface DafPrintedLine {
  part: DafPart;
  /** The line's letters on the scan: left, top, right, bottom. */
  box: [number, number, number, number];
  /** How tall its letters are, in the same units. */
  letter: number;
  /** The words it holds: [passage ref, first word, past the last word], in reading order. */
  spans: Array<[string, number, number]>;
  /**
   * Where each of those words is printed on the line, [left, right] in the scan's units, in reading
   * order; missing when the scan didn't show every word's place (the words are then spread evenly).
   */
  words?: Array<[number, number]>;
  /**
   * Words printed larger than the line (a commentary's first words, a chapter's opening word): for
   * each, its number among the line's words and the [top, bottom] of its letters, in the scan's units.
   * Only with `words`.
   */
  big?: Array<[number, number, number]>;
  /**
   * Words the print sets as one short form, where the library spells them out: the print's ק״ש
   * for "קריאת שמע", ר׳ for "רבי". For each, the number of its first word among the line's words,
   * how many words it stands for, and the form. Its letters are always the library's own (see
   * shortForms); only which ones, and the mark, come from the scan. Only with `words`.
   */
  short?: Array<[number, number, string]>;
}

/**
 * A word of the page's heading (the line above the text naming the chapter and the tractate, with
 * the daf's or the page's number), where the scan prints it.
 */
export interface DafHeadingWord {
  text: string;
  /** The word's letters on the scan: left, top, right, bottom. */
  box: [number, number, number, number];
}

/** A note's mark above the text: an asterisk or a ring, and its box on the scan. */
export interface DafMark {
  mark: "*" | "°";
  box: [number, number, number, number];
}

export interface DafPrinted {
  /** The part of the scan the lines fill: left, top, right, bottom. */
  area: [number, number, number, number];
  lines: DafPrintedLine[];
  /** The heading, right to left; empty when the layout has none. */
  heading: DafHeadingWord[];
  /** Labels printed inside the text's lines (such as תורה אור, where those notes begin). */
  labels: DafHeadingWord[];
  /** The note marks set above the text: asterisks and rings, where they print. */
  marks: DafMark[];
  /**
   * Words whose line is an estimate, as "ref#word": the reading of the scan didn't settle it (a word
   * it couldn't read, or one two lines both read), so it was put beside its neighbor in the text.
   */
  estimated: string[];
  /** Pieces of the neighboring amudim that lines on this page hold. */
  extra: Array<DafPiece & { part: DafPart }>;
}

export const PRINTED_LAYOUT_VERSION = 1;

/** The words of a passage as the page shows them. */
export function pieceWords(he: string): string[] {
  return he.split(/\s+/).filter(Boolean);
}

const FINAL_TO_REGULAR: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const isLetter = (ch: string) => ch >= "א" && ch <= "ת";
/** Vowel points, dagesh and shin/sin dots: marks that sit on a letter and take no width of their own. */
const isPoint = (ch: string) => ch >= "\u0591" && ch <= "\u05C7" && !"\u05BE\u05C0\u05C3\u05C6".includes(ch);
/** A word's letters only: no points, punctuation or quotation marks, and final letters made regular. */
export const lettersOf = (w: string) => [...w].filter(isLetter).map((ch) => FINAL_TO_REGULAR[ch] ?? ch).join("");

/** A word as the library spells it: the vowels shown with it taken off. */
export const withoutPoints = (w: string) => [...w].filter((ch) => !isPoint(ch)).join("");

/**
 * The passage's own words with the vowels of its vocalized copy laid on them, word by word: each
 * word keeps exactly its letters and punctuation, and gains the points that follow each of its
 * letters in the matching word of the copy. A word the copy doesn't have with the same letters gets
 * "" (shown without vowels). Undefined when nothing matched.
 */
export function vowelWords(he: string, vocalized: string): string[] | undefined {
  const words = pieceWords(he);
  const copy = pieceWords(vocalized).filter((t) => [...t].some(isLetter));
  const out: string[] = [];
  let at = 0;
  let any = false;
  for (const w of words) {
    const want = lettersOf(w);
    let found = -1;
    if (want) for (let j = at; j < Math.min(copy.length, at + 4); j++) if (lettersOf(copy[j]) === want) { found = j; break; }
    if (found < 0) {
      out.push("");
      continue;
    }
    const chars = [...copy[found]];
    let k = 0;
    let built = "";
    for (const ch of w) {
      built += ch;
      if (!isLetter(ch)) continue;
      const base = FINAL_TO_REGULAR[ch] ?? ch;
      while (k < chars.length && !(isLetter(chars[k]) && (FINAL_TO_REGULAR[chars[k]] ?? chars[k]) === base)) k++;
      for (k++; k < chars.length && isPoint(chars[k]); k++) built += chars[k];
    }
    out.push(built);
    at = found + 1;
    any = true;
  }
  return any ? out : undefined;
}

/**
 * A short check of a passage's words (FNV-1a, 32 bits, over the UTF-8 of the words joined by one
 * space). tools/daflayout/text.py computes the same when it makes a layout; when they differ, the
 * library's text has changed since, and the layout's word numbers can't be trusted.
 */
export function wordsFingerprint(words: string[]): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(words.join(" "))) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** How an estimated word is named in DafPrinted.estimated. */
export const wordKey = (ref: string, index: number) => `${ref}#${index}`;

/**
 * Turn a stored layout into the page's printed lines, or null when it can't be trusted: every word of
 * the amud must be placed (a few may be estimates, which are listed), every passage it points into
 * must be here with the same words it was made from, and every word number must exist. `pieces` holds
 * this amud's pieces and any neighbors' the layout needs.
 */
export function readPrinted(record: unknown, pieces: Map<string, DafPiece & { part: DafPart }>, section: string): Omit<DafPrinted, "extra"> | null {
  if (!record || typeof record !== "object") return null;
  const r = record as Record<string, unknown>;
  if (r.v !== PRINTED_LAYOUT_VERSION || r.section !== section) return null;
  if (r.complete !== true && r.placed_all !== true) return null;
  const refs = r.refs, checks = r.checks, lines = r.lines;
  if (!Array.isArray(refs) || !Array.isArray(checks) || refs.length !== checks.length || !lines || typeof lines !== "object") return null;
  const counts: number[] = [];
  const texts: string[][] = [];
  for (let i = 0; i < refs.length; i++) {
    const p = typeof refs[i] === "string" ? pieces.get(refs[i]) : undefined;
    if (!p) return null;
    const words = pieceWords(p.he);
    if (wordsFingerprint(words) !== checks[i]) return null;
    counts.push(words.length);
    texts.push(words);
  }
  const out: DafPrintedLine[] = [];
  for (const part of ["main", "rashi", "tosafot"] as const) {
    const list = (lines as Record<string, unknown>)[part];
    if (!Array.isArray(list)) return null;
    for (const row of list) {
      if (!Array.isArray(row) || row.length < 6 || row.length > 9 || !row.slice(0, 5).every(isNum) || !Array.isArray(row[5])) return null;
      const [x0, y0, x1, y1, letter] = row as number[];
      const flat = row[5] as unknown[];
      if (x1 <= x0 || y1 <= y0 || letter <= 0 || flat.length === 0 || flat.length % 3 !== 0 || !flat.every(isNum)) return null;
      const spans: Array<[string, number, number]> = [];
      const lineWords: Array<[number, string]> = []; // [span number, word] for each word on the line
      for (let i = 0; i < flat.length; i += 3) {
        const [k, a, b] = flat.slice(i, i + 3) as number[];
        if (!Number.isInteger(k) || k < 0 || k >= refs.length || !(0 <= a && a < b && b <= counts[k])) return null;
        spans.push([refs[k] as string, a, b]);
        for (let w = a; w < b; w++) lineWords.push([spans.length - 1, texts[k][w]]);
      }
      const words = wordPlaces(row[6], spans, x0, x1);
      const big = words ? bigWords(row[7], words.length) : undefined;
      const short = words ? shortForms(row[8], lineWords) : undefined;
      out.push(
        words
          ? { part, box: [x0, y0, x1, y1], letter, spans, words, ...(big ? { big } : {}), ...(short ? { short } : {}) }
          : { part, box: [x0, y0, x1, y1], letter, spans },
      );
    }
  }
  if (!out.length) return null;
  const estimated: string[] = [];
  const guesses = r.estimated === undefined ? [] : r.estimated;
  if (!Array.isArray(guesses) || guesses.length % 3 !== 0 || !guesses.every(isNum)) return null;
  for (let i = 0; i < guesses.length; i += 3) {
    const [k, a, b] = guesses.slice(i, i + 3) as number[];
    if (!Number.isInteger(k) || k < 0 || k >= refs.length || !(0 <= a && a < b && b <= counts[k])) return null;
    for (let w = a; w < b; w++) estimated.push(wordKey(refs[k] as string, w));
  }
  const heading = readHeading(r.heading);
  const labels = readHeading(r.labels, LABEL);
  const marks = readMarks(r.marks);
  const boxes = [...out.map((l) => l.box), ...heading.map((w) => w.box)];
  const pad = 6;
  const area: [number, number, number, number] = [
    Math.min(...boxes.map((b) => b[0])) - pad,
    Math.min(...boxes.map((b) => b[1])) - pad,
    Math.max(...boxes.map((b) => b[2])) + pad,
    Math.max(...boxes.map((b) => b[3])) + pad,
  ];
  return { area, lines: out, estimated, heading, labels, marks };
}

const HEADING_WORD = /^(?:[\u05D0-\u05EA]{1,12}|[0-9]{1,4})$/;
const LABEL = /^[\u05D0-\u05EA"'\u05F3\u05F4]{1,12}(?: [\u05D0-\u05EA"'\u05F3\u05F4]{1,12}){0,3}$/;

/**
 * The page's heading (or its labels) from a layout: [text, left, top, right, bottom] for each word.
 * A list that isn't well formed is left off (the page is drawn without it); the lines don't depend
 * on it.
 */
export function readHeading(raw: unknown, pattern: RegExp = HEADING_WORD): DafHeadingWord[] {
  if (!Array.isArray(raw) || raw.length > 16) return [];
  const out: DafHeadingWord[] = [];
  for (const w of raw) {
    if (!Array.isArray(w) || w.length !== 5 || typeof w[0] !== "string" || !pattern.test(w[0]) || !w.slice(1).every(isNum)) return [];
    const [x0, y0, x1, y1] = w.slice(1) as number[];
    if (x1 <= x0 || y1 <= y0) return [];
    out.push({ text: w[0], box: [x0, y0, x1, y1] });
  }
  return out;
}

/**
 * A line's word places, when they fit it: one [left, right] for each of its words, inside the line,
 * each word to the left of (or touching) the one before it, as Hebrew runs. Anything else is
 * dropped, and the line's words are spread evenly instead.
 */
function wordPlaces(raw: unknown, spans: Array<[string, number, number]>, x0: number, x1: number): Array<[number, number]> | undefined {
  if (!Array.isArray(raw) || !raw.every(isNum)) return undefined;
  const n = spans.reduce((s, [, a, b]) => s + b - a, 0);
  if (raw.length !== 2 * n) return undefined;
  const out: Array<[number, number]> = [];
  const slack = 4;
  for (let i = 0; i < raw.length; i += 2) {
    const [l, r] = [raw[i] as number, raw[i + 1] as number];
    if (l > r || l < x0 - slack || r > x1 + slack) return undefined;
    if (out.length && r > out[out.length - 1][1] + slack) return undefined;
    out.push([l, r]);
  }
  return out;
}

/** The note marks of a layout: [mark, left, top, right, bottom] each; none if any is malformed. */
export function readMarks(raw: unknown): DafMark[] {
  if (!Array.isArray(raw) || raw.length > 400) return [];
  const out: DafMark[] = [];
  for (const m of raw) {
    if (!Array.isArray(m) || m.length !== 5 || (m[0] !== "*" && m[0] !== "°") || !m.slice(1).every(isNum)) return [];
    const [x0, y0, x1, y1] = m.slice(1) as number[];
    if (x1 <= x0 || y1 <= y0) return [];
    out.push({ mark: m[0], box: [x0, y0, x1, y1] });
  }
  return out;
}

/** A line's big words, when well formed: [word number, top, bottom] each, numbers in order. */
function bigWords(raw: unknown, n: number): Array<[number, number, number]> | undefined {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length % 3 !== 0 || !raw.every(isNum)) return undefined;
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < raw.length; i += 3) {
    const [k, top, bottom] = raw.slice(i, i + 3) as number[];
    if (!Number.isInteger(k) || k < 0 || k >= n || bottom <= top || (out.length && k <= out[out.length - 1][0])) return undefined;
    out.push([k, top, bottom]);
  }
  return out;
}

const SHORT_FORM = /^[\u05D0-\u05EA]{1,6}\u05F3$|^[\u05D0-\u05EA]{1,7}\u05F4[\u05D0-\u05EA]$/;

/**
 * Whether printed letters are a short form of these words (letters only, final forms as regular):
 * one piece per word, in order, each starting with its word's first letter and the rest of its
 * letters found in that word in order, and no piece all of a word of three or more letters. The same
 * test as abbreviates() in tools/daflayout/words.py.
 */
export function abbreviates(t: string, words: string[]): boolean {
  const seen = new Map<string, boolean>();
  const fits = (i: number, k: number): boolean => {
    const key = `${i},${k}`;
    const known = seen.get(key);
    if (known !== undefined) return known;
    let ok = false;
    if (k === words.length) ok = i === t.length;
    else {
      const w = words[k];
      if (i < t.length && w && t[i] === w[0]) {
        let j = i + 1;
        let at = 1;
        ok = fits(j, k + 1);
        while (!ok && j < t.length) {
          at = w.indexOf(t[j], at);
          if (at < 0) break;
          j += 1;
          at += 1;
          ok = (j - i < w.length || w.length < 3) && fits(j, k + 1);
        }
      }
    }
    seen.set(key, ok);
    return ok;
  };
  return t.length > 0 && fits(0, 0);
}

/**
 * A line's short forms, when every one is sound: in order and apart, within one passage, and made of
 * the library's own letters for the words it stands for (a word cut short is the start of the word,
 * then ׳; several words are their letters by abbreviates(), with ״ before the last). Anything else
 * is dropped, and those words are drawn as the library spells them.
 */
function shortForms(raw: unknown, lineWords: Array<[number, string]>): Array<[number, number, string]> | undefined {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 200) return undefined;
  const out: Array<[number, number, string]> = [];
  let next = 0;
  for (const f of raw) {
    if (!Array.isArray(f) || f.length !== 3 || !isNum(f[0]) || !isNum(f[1]) || typeof f[2] !== "string") return undefined;
    const [i, n, form] = f as [number, number, string];
    if (!Number.isInteger(i) || !Number.isInteger(n) || i < next || n < 1 || n > 6 || i + n > lineWords.length) return undefined;
    if (!SHORT_FORM.test(form)) return undefined;
    const group = lineWords.slice(i, i + n);
    if (group.some(([span, w]) => span !== group[0][0] || /["'\u05F3\u05F4]/.test(w))) return undefined;
    const letters = lettersOf(form);
    const full = group.map(([, w]) => lettersOf(w));
    if (n === 1 ? !(full[0].startsWith(letters) && letters.length < full[0].length) : !form.includes("\u05F4") || !abbreviates(letters, full)) return undefined;
    if (n === 1 && !form.endsWith("\u05F3")) return undefined;
    out.push([i, n, form]);
    next = i + n;
  }
  return out;
}

/** The passages a stored layout points into (for fetching the neighbors' pieces it needs). */
export function printedRefs(record: unknown): string[] {
  const refs = record && typeof record === "object" ? (record as { refs?: unknown }).refs : undefined;
  return Array.isArray(refs) ? refs.filter((r): r is string => typeof r === "string").slice(0, 2000) : [];
}

// ---------------------------------------------------------------------------
// Laying out the page.
//
// The method is ported from daf-renderer by Dan Jutan and Shaun Regenbaum (MIT License,
// https://github.com/GT-Jewish-DH/daf-renderer; the notice is in web/THIRD-PARTY-NOTICES.md).
// The page is three layers of the same size, one for the Gemara and one for each commentary.
// Floating "spacers" in each layer keep its text out of the places the other two use. The
// spacers' heights come from how much room each text needs: the commentaries share the top four
// lines, then sit beside the Gemara, and whatever is longest runs on below.

/** The page's proportions, in pixels, and how tall each text is when set alone in its column. */
export interface DafMeasure {
  /** The whole page's width. */
  width: number;
  /** The Gemara column's share of the width, and the share each commentary takes on top. */
  mainShare: number;
  topShare: number;
  padH: number;
  padV: number;
  lineSide: number;
  /** The Gemara's height at the Gemara column's width (`mainColumn`). */
  mainHeight: number;
  /** Rashi's (inner) and Tosafot's (outer) heights at a side column's width (`sideColumn`). */
  innerHeight: number;
  outerHeight: number;
}

export interface DafSpacers {
  /** The commentaries' lines across the top, above the Gemara. */
  start: number;
  /** How far down each commentary runs beside the Gemara. */
  inner: number;
  outer: number;
  /** The half-width stretch below the Gemara, before text runs the full width. */
  end: number;
  /**
   * 0: the usual shape. 1: Rashi is too short to share the top, so Tosafot takes it alone.
   * 2: the other way around. 3: both are too short to fill the top; they sit above the Gemara.
   */
  exception: 0 | 1 | 2 | 3;
}

export function mainColumn(m: Pick<DafMeasure, "width" | "mainShare" | "padH">): number {
  return m.width * m.mainShare - 2 * m.padH;
}
/** A commentary's column beside the Gemara: its share of the page, less the gap between them. */
export function sideColumn(m: Pick<DafMeasure, "width" | "mainShare" | "padH">): number {
  return (m.width * (1 - m.mainShare)) / 2 - m.padH;
}

/** How many side lines the commentaries share across the top. */
export const TOP_LINES = 4.3;

export function computeSpacers(m: DafMeasure): DafSpacers {
  const midWidth = mainColumn(m);
  const sideWidth = sideColumn(m);
  const topWidth = m.width * m.topShare - m.padH;
  const start = TOP_LINES * m.lineSide;
  const topArea = 4 * m.lineSide * topWidth;

  const text = (name: "main" | "inner" | "outer", height: number, width: number, minusTop: boolean) => {
    const area = height * width - (minusTop ? topArea : 0);
    return { name, width, area, height: area / width, unadjustedHeight: (area + (minusTop ? topArea : 0)) / width };
  };
  const main = text("main", m.mainHeight, midWidth, false);
  const inner = text("inner", m.innerHeight, sideWidth, true);
  const outer = text("outer", m.outerHeight, sideWidth, true);

  // No commentary at all: the Gemara takes the whole page.
  if (m.innerHeight <= 0 && m.outerHeight <= 0) return { start: 0, inner: 0, outer: 0, end: 0, exception: 0 };
  // Too little commentary to fill the top: it sits in two halves above the Gemara.
  if (inner.height <= start && outer.height <= start) {
    const half = (h: number) => (h * sideWidth) / topWidth;
    return { start: Math.max(half(m.innerHeight), half(m.outerHeight), 0), inner: 0, outer: 0, end: 0, exception: 3 };
  }
  // One commentary too short to share the top: the other takes the top alone.
  if (inner.unadjustedHeight <= start) {
    return { start, inner: inner.unadjustedHeight, outer: (outer.area + topArea - m.width * 4 * m.lineSide) / sideWidth, end: 0, exception: 1 };
  }
  if (outer.unadjustedHeight <= start) {
    return { start, outer: outer.unadjustedHeight, inner: (inner.area + topArea - m.width * 4 * m.lineSide) / sideWidth, end: 0, exception: 2 };
  }

  const byHeight = [main, inner, outer].sort((a, b) => a.height - b.height);
  // The Gemara is shortest: both commentaries wrap around it.
  if (byHeight[0].name === "main") {
    const beside = main.area / midWidth;
    const sideArea = beside * sideWidth + sideWidth * m.padV;
    return { start, inner: beside, outer: beside, end: Math.max(0, (byHeight[1].area - sideArea) / topWidth), exception: 0 };
  }
  // Stairs: the shortest commentary and the Gemara form a block, and the longer commentary
  // steps down past it.
  const blockArea = main.area + byHeight[0].area;
  const blockWidth = midWidth + sideWidth;
  const blockHeight = blockArea / blockWidth;
  const stair = byHeight[1].name === "main" ? byHeight[2] : byHeight[1];
  if (blockHeight < stair.area / stair.width) {
    const smallest = byHeight[0];
    const spacers: DafSpacers = { start, inner: 0, outer: 0, end: 0, exception: 0 };
    const set = (name: string, v: number) => {
      if (name === "inner") spacers.inner = v;
      else if (name === "outer") spacers.outer = v;
    };
    set(smallest.name, smallest.height);
    set(stair.name, (blockArea - m.padH * (blockHeight - smallest.height)) / blockWidth);
    return spacers;
  }
  // The Gemara is longest: it wraps around both commentaries.
  return { start, inner: inner.height, outer: outer.height, end: 0, exception: 0 };
}

/** Where each text really ended once drawn, and the columns' real widths. */
export interface DafDrawn {
  width: number;
  padV: number;
  mainColumn: number;
  sideColumn: number;
  mainBottom: number;
  innerBottom: number;
  outerBottom: number;
}

/**
 * The spacers are an estimate from each text's area; once the page is drawn, a commentary can
 * run a line or two past its column (or the Gemara past its), and two texts then share the same
 * place. This moves the spacers so that cannot happen, and returns null when nothing needs to
 * move. Called a few times, it settles.
 */
export function correctSpacers(s: DafSpacers, d: DafDrawn): DafSpacers | null {
  const next: DafSpacers = { ...s };
  const slack = 1;
  const colEnd = (side: "inner" | "outer") => s.start + 2 * d.padV + s[side];
  const mainColEnd = (side: "inner" | "outer") => s.start + s[side] + d.padV;
  const bottom = { inner: d.innerBottom, outer: d.outerBottom };
  let changed = false;

  for (const side of ["inner", "outer"] as const) {
    const sideSpill = bottom[side] - colEnd(side);
    const mainPast = d.mainBottom - Math.min(colEnd(side), mainColEnd(side));
    if (sideSpill <= slack || mainPast <= slack) continue;
    if (d.mainBottom >= bottom[side]) {
      // The Gemara runs on longer: this commentary must finish beside it.
      const spillWidth = s.end > 0 && bottom[side] <= colEnd(side) + s.end ? d.width / 2 : d.width;
      next[side] = s[side] + Math.max(sideSpill * (spillWidth / d.sideColumn), 4);
    } else {
      // The commentary runs on longer: the Gemara must finish beside it.
      const mainSpill = d.mainBottom - mainColEnd(side);
      if (mainSpill > slack) next[side] = s[side] + Math.max(mainSpill * (d.width / d.mainColumn), 4);
      else continue;
    }
    changed = true;
  }

  // Below the Gemara, the commentaries share the width until the shorter one ends.
  const fullStart = (side: "inner" | "outer") => colEnd(side) + s.end;
  const innerPast = d.innerBottom - fullStart("inner");
  const outerPast = d.outerBottom - fullStart("outer");
  if (!changed && innerPast > slack && outerPast > slack && d.mainBottom < Math.min(d.innerBottom, d.outerBottom)) {
    next.end = s.end + Math.max(Math.min(innerPast, outerPast) * 2, 4);
    changed = true;
  }
  return changed ? next : null;
}
