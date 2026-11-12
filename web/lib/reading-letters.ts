/*
 * The Learn reader's letters: the Hebrew and English typefaces, vowels on or off, how large the
 * English is beside the Hebrew, and how wide a line of English may run. Kept on the device. The
 * typefaces are the Daven tab's (lib/siddur/prefs.ts), so a choice looks the same in both.
 */

import { ENGLISH_FONTS, HEBREW_FONTS, type EnglishFont, type HebrewFont } from "./siddur/prefs";

export type ReaderEnSize = "usual" | "larger" | "largest";
export type ReaderWidth = "narrow" | "usual" | "wide";

export interface ReaderLetters {
  heFont: HebrewFont;
  enFont: EnglishFont;
  vowels: boolean;
  enSize: ReaderEnSize;
  width: ReaderWidth;
}

export const DEFAULT_LETTERS: ReaderLetters = { heFont: "frank", enFont: "serif", vowels: true, enSize: "usual", width: "usual" };

/** The English beside the Hebrew, as a share of its usual size. */
export const READER_EN_SCALE: Record<ReaderEnSize, number> = { usual: 1, larger: 1.14, largest: 1.3 };
/** The longest a line of English may run, in characters (about 70 is easiest to read). */
export const READER_WIDTH: Record<ReaderWidth, string> = { narrow: "58ch", usual: "72ch", wide: "none" };

export const LETTERS_KEY = "rabai_reader_letters";

const one = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;

/** The settings from stored text, each checked; anything unknown falls back to the default. */
export function parseLetters(raw: unknown): ReaderLetters {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    heFont: one(r.heFont, Object.keys(HEBREW_FONTS) as HebrewFont[], DEFAULT_LETTERS.heFont),
    enFont: one(r.enFont, Object.keys(ENGLISH_FONTS) as EnglishFont[], DEFAULT_LETTERS.enFont),
    vowels: typeof r.vowels === "boolean" ? r.vowels : DEFAULT_LETTERS.vowels,
    enSize: one(r.enSize, ["usual", "larger", "largest"] as const, DEFAULT_LETTERS.enSize),
    width: one(r.width, ["narrow", "usual", "wide"] as const, DEFAULT_LETTERS.width),
  };
}

/** The settings as CSS variables on the reader. */
export function lettersStyle(l: ReaderLetters): Record<string, string | number> {
  return {
    "--rd-he-font": HEBREW_FONTS[l.heFont].css,
    "--rd-en-font": ENGLISH_FONTS[l.enFont].css,
    "--rd-en-scale": READER_EN_SCALE[l.enSize],
    "--rd-en-width": READER_WIDTH[l.width],
  };
}

/**
 * Hebrew without its vowels and cantillation, for people who read the letters alone. The letters,
 * the maqaf and the text's marks are kept; only the points and accents go.
 */
export function withoutVowels(text: string): string {
  return text.replace(/[֑-ׇֽֿׁׂׅׄ]/g, "");
}

/** Loads the Google Fonts families named (each once), so a typeface not shipped with the app can be shown. */
export function loadFonts(loads: (string | undefined)[]) {
  if (typeof document === "undefined") return;
  for (const load of loads) {
    if (!load) continue;
    const id = `font-${load.split(":")[0]}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${load}&display=swap`;
    document.head.appendChild(link);
  }
}

/**
 * A line as copied: the Hebrew, the English, and where it is from. A text from the testing library
 * says so, as it does in the app.
 */
export function copiedLine(he: string, en: string, ref: string, testing: boolean): string {
  const parts = [he.trim(), en.trim()].filter(Boolean);
  const from = `— ${ref}${testing ? " (RabbAI's testing library, not yet approved by the rabbinic board)" : ""}`;
  return [...parts, from].join("\n");
}
