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

export interface Translation {
  ref: string;
  /** RabAI's translation of the whole passage. Null when the library already has English. */
  general: string | null;
  /** Word by word, in the library's own words. Null when RabAI's list didn't match the text. */
  words: GlossRow[] | null;
  model?: string;
}

/** What the model wrote for one word or expression. */
export interface GlossItem {
  he: string;
  en: string;
  expanded?: string;
}

/** The model's reply: GENERAL: ... then WORDS: one "word | English | full form" per line. */
export function readGlossReply(text: string): { general: string | null; items: GlossItem[] } {
  const wordsAt = text.search(/^\s*WORDS:\s*$/m);
  const generalAt = text.search(/^\s*GENERAL:/m);
  let general: string | null = null;
  if (generalAt >= 0) {
    const end = wordsAt > generalAt ? wordsAt : text.length;
    general = text.slice(generalAt, end).replace(/^\s*GENERAL:\s*/, "").trim().slice(0, 8000) || null;
  }
  const items: GlossItem[] = [];
  if (wordsAt >= 0) {
    for (const raw of text.slice(wordsAt).split("\n").slice(1)) {
      const line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
      if (!line.includes("|")) continue;
      const [he, en, expanded] = line.split("|").map((s) => s.trim());
      if (!he || !lettersOf(he) || !en) continue;
      items.push({ he, en: en.slice(0, 200), ...(expanded && lettersOf(expanded) ? { expanded: expanded.slice(0, 120) } : {}) });
    }
  }
  return { general, items };
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
  return { ref: t.ref, general, words, ...(typeof t.model === "string" ? { model: t.model } : {}) };
}
