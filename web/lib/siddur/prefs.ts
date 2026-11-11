/*
 * The Daven tab's settings, kept on the device: how the text is laid out, the language, whether
 * today's view folds what isn't said today, which wording to show where a man and a woman say
 * different words, transliteration, and the community's customs. Safe on the device.
 */

import { DEFAULT_CUSTOMS, type DavenCustoms } from "./today";
import type { Pronunciation } from "./translit";
import type { TorahBlessingsPlace } from "./outline";

/** lines: Hebrew then its translation, line by line; paragraph: each prayer's Hebrew, then its translation; words: English under each Hebrew word; panes: Hebrew above, English below. */
export type Layout = "lines" | "paragraph" | "words" | "panes";
export type DavenLang = "he" | "both" | "en";
export type Wording = "both" | "men" | "women";
/**
 * How much is shown around the prayers: only the prayers; the prayers with the siddur's
 * instructions and RabbAI's guide notes (the usual); or all of that with a few words on each prayer
 * and, on every line, ways to understand it better.
 */
export type DavenDepth = "prayers" | "guide" | "study";

/** How large the siddur's text is, on top of the app's own text size. */
export type DavenSize = "small" | "usual" | "large" | "larger";
export const SIZE_SCALE: Record<DavenSize, number> = { small: 0.9, usual: 1, large: 1.18, larger: 1.38 };

/** Whose English: the siddur's own, or the Metsudah Linear Siddur's where the words match (Koren only). */
export type DavenEnglish = "own" | "metsudah";
/** The Hebrew typeface. */
export type HebrewFont = "frank" | "noto" | "david" | "sans" | "device";
/** The English typeface. */
export type EnglishFont = "serif" | "sans" | "classic";
/** How large the English is beside the Hebrew. */
export type EnglishSize = "smaller" | "same" | "larger";
/** How much room between lines. */
export type Spacing = "compact" | "comfortable" | "roomy";

/** Each typeface: its CSS family, and the Google Fonts family to load for it (none: already loaded or on the device). */
export const HEBREW_FONTS: Record<HebrewFont, { label: string; about: string; css: string; load?: string }> = {
  frank: { label: "Frank Ruhl", about: "The classic printed siddur letter", css: '"Frank Ruhl Libre", "David", serif' },
  noto: { label: "Noto Serif", about: "Clear vowels, good for the small marks", css: '"Noto Serif Hebrew", "Frank Ruhl Libre", serif', load: "Noto+Serif+Hebrew:wght@400;600" },
  david: { label: "David", about: "Lighter and rounder", css: '"David Libre", "David", serif', load: "David+Libre:wght@400;500;700" },
  sans: { label: "Plain", about: "Without serifs, like a sign", css: '"Noto Sans Hebrew", "Arial Hebrew", sans-serif', load: "Noto+Sans+Hebrew:wght@400;500;600" },
  device: { label: "Device", about: "Your phone's or computer's own Hebrew letters", css: '"New Peninim MT", "Times New Roman", "David", serif' },
};
export const ENGLISH_FONTS: Record<EnglishFont, { label: string; css: string; load?: string }> = {
  serif: { label: "Book", css: '"Source Serif 4", Georgia, serif' },
  classic: { label: "Classic", css: '"EB Garamond", Garamond, Georgia, serif', load: "EB+Garamond:ital,wght@0,400;0,600;1,400" },
  sans: { label: "Plain", css: '"IBM Plex Sans", system-ui, sans-serif' },
};
export const ENGLISH_SCALE: Record<EnglishSize, number> = { smaller: 0.92, same: 1.05, larger: 1.2 };
export const SPACING_SCALE: Record<Spacing, number> = { compact: 0.65, comfortable: 1, roomy: 1.45 };

export interface DavenPrefs {
  layout: Layout;
  lang: DavenLang;
  /** Fold what isn't said today (RabbAI's reading of the calendar, labeled as such). */
  today: boolean;
  wording: Wording;
  translit: "off" | Pronunciation;
  /** Tap a Hebrew word to see its meaning. */
  wordTap: boolean;
  customs: DavenCustoms;
  depth: DavenDepth;
  size: DavenSize;
  /** Where the blessings over the Torah come in the morning (lib/siddur/outline.ts, davenOrder). */
  torahBlessings: TorahBlessingsPlace;
  english: DavenEnglish;
  heFont: HebrewFont;
  enFont: EnglishFont;
  /** Show the vowels (nekudot); without them the letters alone, for people who read that way. */
  vowels: boolean;
  enSize: EnglishSize;
  spacing: Spacing;
}

export const DEFAULT_PREFS: DavenPrefs = {
  layout: "lines",
  lang: "both",
  today: true,
  wording: "both",
  translit: "off",
  wordTap: true,
  customs: DEFAULT_CUSTOMS,
  depth: "guide",
  size: "usual",
  torahBlessings: "before-morning-blessings",
  english: "own",
  heFont: "frank",
  enFont: "serif",
  vowels: true,
  enSize: "smaller",
  spacing: "comfortable",
};

const KEY = "rabai_daven_prefs";
const one = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback);

/** The settings from stored text, each checked; anything unknown falls back to the default. */
export function parsePrefs(raw: unknown): DavenPrefs {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const c = r.customs && typeof r.customs === "object" ? (r.customs as Record<string, unknown>) : {};
  return {
    layout: one(r.layout, ["lines", "paragraph", "words", "panes"] as const, DEFAULT_PREFS.layout),
    lang: one(r.lang, ["he", "both", "en"] as const, DEFAULT_PREFS.lang),
    today: typeof r.today === "boolean" ? r.today : DEFAULT_PREFS.today,
    wording: one(r.wording, ["both", "men", "women"] as const, DEFAULT_PREFS.wording),
    translit: one(r.translit, ["off", "sephardi", "ashkenazi"] as const, DEFAULT_PREFS.translit),
    wordTap: typeof r.wordTap === "boolean" ? r.wordTap : DEFAULT_PREFS.wordTap,
    depth: one(r.depth, ["prayers", "guide", "study"] as const, DEFAULT_PREFS.depth),
    size: one(r.size, ["small", "usual", "large", "larger"] as const, DEFAULT_PREFS.size),
    english: one(r.english, ["own", "metsudah"] as const, DEFAULT_PREFS.english),
    heFont: one(r.heFont, ["frank", "noto", "david", "sans", "device"] as const, DEFAULT_PREFS.heFont),
    enFont: one(r.enFont, ["serif", "sans", "classic"] as const, DEFAULT_PREFS.enFont),
    vowels: typeof r.vowels === "boolean" ? r.vowels : DEFAULT_PREFS.vowels,
    enSize: one(r.enSize, ["smaller", "same", "larger"] as const, DEFAULT_PREFS.enSize),
    spacing: one(r.spacing, ["compact", "comfortable", "roomy"] as const, DEFAULT_PREFS.spacing),
    torahBlessings: one(r.torahBlessings, ["before-morning-blessings", "as-printed"] as const, DEFAULT_PREFS.torahBlessings),
    customs: {
      modernDays: typeof c.modernDays === "boolean" ? c.modernDays : DEFAULT_CUSTOMS.modernDays,
      viduyIsrael: typeof c.viduyIsrael === "boolean" ? c.viduyIsrael : DEFAULT_CUSTOMS.viduyIsrael,
    },
  };
}

export function loadPrefs(): DavenPrefs {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return parsePrefs(JSON.parse(stored));
    // The language chosen before these settings existed.
    const lang = localStorage.getItem("rabai_daven_lang");
    return { ...DEFAULT_PREFS, lang: one(lang, ["he", "both", "en"] as const, "both") };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: DavenPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}
