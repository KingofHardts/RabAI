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
  /** Where the blessings over the Torah come in the morning (lib/siddur/outline.ts, davenOrder). */
  torahBlessings: TorahBlessingsPlace;
}

export const DEFAULT_PREFS: DavenPrefs = {
  layout: "lines",
  lang: "both",
  today: true,
  wording: "both",
  translit: "off",
  wordTap: true,
  customs: DEFAULT_CUSTOMS,
  torahBlessings: "before-morning-blessings",
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
