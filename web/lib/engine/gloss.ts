import { lettersOf, pieceWords } from "../library/daf";

/*
 * RabAI's translation of one passage, read and lined up with the library's own words. This file
 * has no model calls, so the app can use its types and checks on the device; translate.ts asks
 * the model.
 *
 * The Hebrew in a word-by-word list always comes from the library's text, never from the model:
 * the model's list is only used to attach English to the library's words, and a word the model
 * skipped or misspelled is shown with no English rather than with the model's copy of it.
 */

/** One step of a word-by-word translation: one or a few of the library's words, and their English. */
export interface GlossRow {
  /** The library's own words, as the page shows them. */
  he: string;
  /** Where these words start among the passage's words (pieceWords of its Hebrew). */
  at: number;
  /** How many of the passage's words this row holds. */
  n: number;
  /** RabAI's English; null where it gave none. */
  en: string | null;
  /** For a short form (abbreviation): the words it stands for, as RabAI read them. */
  expanded?: string;
}

/**
 * Another way to read part of the passage, as one of the sources RabAI was given reads it. Kept
 * only when the source was among those given and the quoted words are really in it.
 */
export interface Reading {
  /** The words of the passage the other reading is about. */
  phrase: string;
  /** The other reading, in RabAI's words. */
  reading: string;
  /** The source that reads it so. */
  ref: string;
  /** That source's own words that show it, copied exactly. */
  quote: string;
}

/** A source RabAI was given to translate from: shown as "Based on ..." beside the translation. */
export interface TranslationBasis {
  ref: string;
  /** What it is, for the person: "The library's English (William Davidson Edition)", "Jastrow". */
  label: string;
}

export interface Translation {
  ref: string;
  /** RabAI's translation of the whole passage. Null when the library already has English. */
  general: string | null;
  /**
   * Word by word, in the library's own words. Null when RabAI's list didn't match the text;
   * missing when it hasn't been asked for yet.
   */
  words?: GlossRow[] | null;
  /** Other ways to read parts of the passage, each from a source in the library. */
  readings?: Reading[];
  /** The library's sources the translation was made from. */
  basis?: TranslationBasis[];
  model?: string;
}

/** The plain letters, digits and spaces of a text, for checking that a quote is really in it. */
export function plainForCheck(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0591-\u05C7]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/[ךםןףץ]/g, (ch) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[ch] ?? ch)
    .trim();
}

/**
 * The readings worth showing: each names a source RabAI was given and quotes at least two of its
 * words that really appear in it. Anything else is dropped, the way the answer engine drops a
 * citation it can't check.
 */
export function checkReadings(readings: Reading[], sources: Array<{ ref: string; he: string; en: string }>, max = 4): Reading[] {
  const texts = new Map(sources.map((s) => [s.ref, ` ${plainForCheck(`${s.he} ${s.en}`)} `]));
  const out: Reading[] = [];
  for (const r of readings) {
    const text = texts.get(r.ref);
    const quote = plainForCheck(r.quote);
    if (!text || quote.split(" ").length < 2 || !text.includes(` ${quote} `)) continue;
    if (out.some((o) => o.ref === r.ref && o.phrase === r.phrase)) continue;
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

/** What the model wrote for one word or expression. */
export interface GlossItem {
  he: string;
  en: string;
  expanded?: string;
}

const SECTION = /^\s*(GENERAL|WORDS|READINGS):[ \t]*/gm;

/** The reply's sections: the text after each "GENERAL:", "WORDS:" or "READINGS:" line. */
function sections(text: string): Partial<Record<"GENERAL" | "WORDS" | "READINGS", string>> {
  const marks = [...text.matchAll(SECTION)];
  const out: Partial<Record<"GENERAL" | "WORDS" | "READINGS", string>> = {};
  marks.forEach((m, i) => {
    const name = m[1] as "GENERAL" | "WORDS" | "READINGS";
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    if (out[name] === undefined) out[name] = text.slice(m.index + m[0].length, end);
  });
  return out;
}

const listLines = (block: string | undefined) =>
  (block ?? "")
    .split("\n")
    .map((raw) => raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter((line) => line.includes("|"));

/**
 * The model's reply: "GENERAL:" then the translation; "WORDS:" then one "word | English | full
 * form" per line; "READINGS:" then one "phrase | other reading | source ref | its words" per line.
 */
export function readGlossReply(text: string): { general: string | null; items: GlossItem[]; readings: Reading[] } {
  const parts = sections(text);
  const general = parts.GENERAL?.trim().slice(0, 8000) || null;
  const items: GlossItem[] = [];
  for (const line of listLines(parts.WORDS)) {
    const [he, en, expanded] = line.split("|").map((s) => s.trim());
    if (!he || !lettersOf(he) || !en) continue;
    items.push({ he, en: en.slice(0, 200), ...(expanded && lettersOf(expanded) ? { expanded: expanded.slice(0, 120) } : {}) });
  }
  const readings: Reading[] = [];
  for (const line of listLines(parts.READINGS)) {
    const [phrase, reading, ref, ...quote] = line.split("|").map((s) => s.trim());
    if (!phrase || !reading || !ref || !quote.length) continue;
    readings.push({ phrase: phrase.slice(0, 200), reading: reading.slice(0, 400), ref: ref.slice(0, 160), quote: quote.join(" | ").slice(0, 300) });
  }
  return { general, items, readings };
}

/** A word's letters with ו and י taken out after the first letter, so a full or short spelling still matches. */
function skeleton(letters: string): string {
  return letters ? letters[0] + letters.slice(1).replace(/[וי]/g, "") : "";
}

/** How many of the library's words ahead to look for the model's next word, past ones it skipped. */
const LOOK_AHEAD = 8;

/**
 * The model's list laid on the library's words from `from` to `to`: each item claims the next
 * run of words with the same letters (allowing a full or short spelling, and an expression the
 * model gave as one item). Words no item claimed become rows with no English. Words with no
 * letters (punctuation, a dash) join the row before them. Rows are added to `rows` (a list
 * already holding the parts before `from`) and it is returned.
 */
export function alignGlosses(words: string[], items: GlossItem[], from = 0, to = words.length, rows: GlossRow[] = []): GlossRow[] {
  const keys = words.map((w) => lettersOf(w));
  const addPlain = (start: number, end: number) => {
    if (end <= start) return;
    const hasLetters = keys.slice(start, end).some(Boolean);
    const last = rows[rows.length - 1];
    if (!hasLetters && last && last.at + last.n === start) {
      last.he = `${last.he} ${words.slice(start, end).join(" ")}`;
      last.n += end - start;
      return;
    }
    if (last && last.en === null && last.at + last.n === start) {
      last.he = `${last.he} ${words.slice(start, end).join(" ")}`;
      last.n += end - start;
      return;
    }
    rows.push({ he: words.slice(start, end).join(" "), at: start, n: end - start, en: null });
  };

  let i = from;
  for (const item of items) {
    const want = item.he.split(/\s+/).map((w) => lettersOf(w)).join("");
    if (!want) continue;
    const wantSkeleton = skeleton(want);
    let hit: [number, number] | null = null;
    for (let s = i; s < Math.min(to, i + LOOK_AHEAD) && !hit; s++) {
      if (!keys[s]) continue;
      let have = "";
      for (let e = s; e < to; e++) {
        have += keys[e];
        if (!keys[e]) continue;
        if (have === want || skeleton(have) === wantSkeleton) {
          hit = [s, e + 1];
          break;
        }
        if (skeleton(have).length > wantSkeleton.length) break;
      }
    }
    if (!hit) continue;
    addPlain(i, hit[0]);
    rows.push({
      he: words.slice(hit[0], hit[1]).join(" "),
      at: hit[0],
      n: hit[1] - hit[0],
      en: item.en,
      ...(item.expanded ? { expanded: item.expanded } : {}),
    });
    i = hit[1];
  }
  addPlain(i, to);
  return rows;
}

/** The share of the passage's words (those with letters) that have English. */
export function glossCoverage(words: string[], rows: GlossRow[]): number {
  const total = words.filter((w) => lettersOf(w)).length;
  if (!total) return 0;
  const covered = rows.filter((r) => r.en !== null).reduce((sum, r) => sum + words.slice(r.at, r.at + r.n).filter((w) => lettersOf(w)).length, 0);
  return covered / total;
}

/** Below this share of words with English, the word-by-word list is left out rather than shown full of holes. */
export const MIN_COVERAGE = 0.6;

/** The passage's words in parts small enough for one request, ending where a sentence ends when possible. */
export function glossParts(words: string[], size = 70, least = 40): Array<[number, number]> {
  const parts: Array<[number, number]> = [];
  let start = 0;
  let count = 0;
  for (let i = 0; i < words.length; i++) {
    if (lettersOf(words[i])) count++;
    const endsSentence = /[.:;?!]$/.test(words[i]) || /^[–—-]$/.test(words[i]);
    if (count >= size || (count >= least && endsSentence)) {
      parts.push([start, i + 1]);
      start = i + 1;
      count = 0;
    }
  }
  if (start < words.length) {
    // A short remainder joins the part before it.
    const rest = words.slice(start).filter((w) => lettersOf(w)).length;
    if (parts.length && rest < least / 2) parts[parts.length - 1][1] = words.length;
    else parts.push([start, words.length]);
  }
  return parts;
}

/** The passage's words, the way the page numbers them. */
export function passageWords(he: string): string[] {
  return pieceWords(he);
}

/** A translation kept on the device, checked before it is shown again. */
export function readKeptTranslation(raw: unknown): Translation | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.ref !== "string") return null;
  const general = typeof t.general === "string" ? t.general : null;
  let words: GlossRow[] | null = null;
  if (Array.isArray(t.words)) {
    words = [];
    for (const r of t.words) {
      if (!r || typeof r !== "object") return null;
      const row = r as Record<string, unknown>;
      if (typeof row.he !== "string" || typeof row.at !== "number" || typeof row.n !== "number") return null;
      if (row.en !== null && typeof row.en !== "string") return null;
      words.push({
        he: row.he,
        at: row.at,
        n: row.n,
        en: row.en as string | null,
        ...(typeof row.expanded === "string" ? { expanded: row.expanded } : {}),
      });
    }
  }
  if (!general && !words) return null;
  const readings = Array.isArray(t.readings)
    ? t.readings.filter(
        (r): r is Reading =>
          !!r && typeof r === "object" && ["phrase", "reading", "ref", "quote"].every((k) => typeof (r as Record<string, unknown>)[k] === "string"),
      )
    : [];
  const basis = Array.isArray(t.basis)
    ? t.basis.filter((b): b is TranslationBasis => !!b && typeof b === "object" && typeof b.ref === "string" && typeof b.label === "string")
    : [];
  return {
    ref: t.ref,
    general,
    ...(Array.isArray(t.words) || t.words === null ? { words } : {}),
    ...(readings.length ? { readings } : {}),
    ...(basis.length ? { basis } : {}),
    ...(typeof t.model === "string" ? { model: t.model } : {}),
  };
}
