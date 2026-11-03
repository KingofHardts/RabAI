/*
 * The person's place and time preferences, kept only on this device (localStorage), and what is
 * sent with each question so the server can work out the day and its times. Safe on the device.
 */

import { parsePlace, parsePrefs, type Place, type TimesPrefs, type WhenAndWhere } from "./place";

const KEY = "rabai_place";

export interface PlaceSettings {
  /** The place the person chose, or their device's location; null when not set. */
  place: Place | null;
  prefs: TimesPrefs;
  /** With no place set, use the approximate area of the internet connection (default on). */
  approx: boolean;
}

const EMPTY: PlaceSettings = { place: null, prefs: {}, approx: true };

export function loadPlaceSettings(): PlaceSettings {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") return EMPTY;
    return { place: parsePlace(raw.place), prefs: parsePrefs(raw.prefs), approx: raw.approx !== false };
  } catch {
    return EMPTY;
  }
}

export function savePlaceSettings(s: PlaceSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the setting lasts until the page closes.
  }
}

/** The device's own time zone, if the browser says. */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/** What goes with a question: the device's time zone, and the place and preferences if set. */
export function deviceWhen(): WhenAndWhere {
  const s = loadPlaceSettings();
  const tz = deviceTimeZone();
  return {
    ...(tz ? { tz } : {}),
    ...(s.place ? { place: s.place } : {}),
    ...(Object.keys(s.prefs).length ? { prefs: s.prefs } : {}),
    ...(s.approx ? {} : { approx: false }),
  };
}
