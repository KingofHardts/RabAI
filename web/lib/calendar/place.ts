/*
 * Where the person is, for the calendar and its times (lib/calendar/calendar.ts). Safe to use on
 * the device and on the server; it never imports the calendar library itself.
 *
 * A place is kept only on the person's device (localStorage), and sent with a question so the
 * server can work out the day's times. The server never keeps it. When the person hasn't set one,
 * the server may use the approximate location of their internet connection, and says so.
 */

/** Where a place came from. */
export type PlaceSource =
  /** The person chose a city in Settings. */
  | "set"
  /** The person let the app use their device's location. */
  | "device"
  /** The approximate location of the person's internet connection (never stored). */
  | "approx";

export interface Place {
  lat: number;
  lon: number;
  /** A short name to show, such as "Baltimore, Maryland" or "Your location". */
  name: string;
  /** The place's time zone (IANA), when known. */
  tz?: string;
  /** In Israel: the Israeli holiday and Torah-reading schedule. */
  il?: boolean;
  from: PlaceSource;
}

/** How the person likes their times worked out. All optional; the defaults are the usual ones. */
export interface TimesPrefs {
  /** Minutes before sunset to light Shabbat candles (default 18, or the city's custom in Israel). */
  candleMins?: number;
  /** When Shabbat and Yom Tov end: nightfall at 8.5° (default), or a fixed 42, 50 or 72 minutes. */
  havdalah?: "8.5" | "42" | "50" | "72";
  /** Whose daily times to give first: most calendars, or Chabad's (the Baal HaTanya's). */
  custom?: "general" | "chabad";
}

/** What the device sends with a question: its time zone, and the place and preferences if set. */
export interface WhenAndWhere {
  tz?: string;
  place?: Place | null;
  prefs?: TimesPrefs;
  /**
   * False when the person turned off using the approximate area of their connection. With no place
   * set, the server then gives dates but no times.
   */
  approx?: boolean;
}

/** A short view of the day for the app's welcome screen and its suggested questions (POST /api/calendar). */
export interface DaySummary {
  /** YYYY-MM-DD where the person is. */
  date: string;
  /** "Tuesday, November 3, 2026". */
  civil: string;
  /** "23 Cheshvan 5787". */
  hebrew: string;
  hebrewHe: string;
  afterSunset: boolean;
  /** This week's parsha; `ref` is its first verse as the library names it. */
  parsha?: { name: string; he: string; day: string; ref?: string; holiday?: boolean; next?: string };
  /** Today's Daf Yomi, "Bechorot 46", and the library's name for its first amud. */
  daf?: { text: string; ref?: string };
  /** What today is: a fast, Rosh Chodesh, a night of Chanukah, a holiday, a day of the Omer. */
  todayIs: string[];
  /** The next holidays, fasts and Rosh Chodesh in the coming weeks. */
  coming: Array<{ title: string; day: string; date: string; kind: string }>;
  shabbat?: { candles: string; candlesDay: string; ends: string; endsDay: string };
  /** A fast or holiday today or in the next two days, with when a fast begins and ends. */
  soon?: {
    title: string;
    date: string;
    day: string;
    kind: string;
    begins?: { date: string; time: string };
    ends?: { date: string; time: string };
  };
  place?: { name: string; from: PlaceSource };
  /** Today's times at the place, when a place is known (the Learn search shows them for "zmanim"). */
  zmanim?: { day: string; items: Array<{ label: string; time: string; note?: string }> };
}

export const CANDLE_MINUTES = [15, 18, 20, 22, 24, 30, 40] as const;
export const HAVDALAH_CHOICES = ["8.5", "42", "50", "72"] as const;

/** A time zone the browser knows, or null. */
export function validTimeZone(tz: unknown): string | null {
  if (typeof tz !== "string" || !tz || tz.length > 64 || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/.test(tz)) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

/** A place sent by the device, checked; anything malformed is dropped. */
export function parsePlace(raw: unknown, sources: readonly PlaceSource[] = ["set", "device"]): Place | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lat = typeof r.lat === "number" ? r.lat : Number.NaN;
  const lon = typeof r.lon === "number" ? r.lon : Number.NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const from = sources.includes(r.from as PlaceSource) ? (r.from as PlaceSource) : null;
  if (!from) return null;
  const name = typeof r.name === "string" ? r.name.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) : "";
  const tz = validTimeZone(r.tz) ?? undefined;
  // Two decimal places (about a kilometer) are plenty for the times; nothing finer is kept.
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    lat: round(lat),
    lon: round(lon),
    name: name || (from === "device" ? "Your location" : "Your place"),
    ...(tz ? { tz } : {}),
    ...(r.il === true ? { il: true } : {}),
    from,
  };
}

export function parsePrefs(raw: unknown): TimesPrefs {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: TimesPrefs = {};
  if (typeof r.candleMins === "number" && (CANDLE_MINUTES as readonly number[]).includes(r.candleMins)) out.candleMins = r.candleMins;
  if (typeof r.havdalah === "string" && (HAVDALAH_CHOICES as readonly string[]).includes(r.havdalah)) out.havdalah = r.havdalah as TimesPrefs["havdalah"];
  if (r.custom === "chabad" || r.custom === "general") out.custom = r.custom;
  return out;
}

/** What the device sends, checked. */
export function parseWhenAndWhere(raw: unknown): WhenAndWhere {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const tz = validTimeZone(r.tz);
  const place = parsePlace(r.place);
  const prefs = parsePrefs(r.prefs);
  return {
    ...(tz ? { tz } : {}),
    ...(place ? { place } : {}),
    ...(Object.keys(prefs).length ? { prefs } : {}),
    ...(r.approx === false ? { approx: false } : {}),
  };
}

/**
 * What the server works with for one question: the device's time zone and place, checked, and,
 * when the person hasn't set a place (and hasn't turned this off), the approximate place of their
 * connection. Nothing here is kept.
 */
export function whenForRequest(raw: unknown, headers: Headers): WhenAndWhere {
  const when = parseWhenAndWhere(raw);
  let place = when.place ?? (when.approx === false ? null : placeFromHeaders(headers));
  const tz = when.tz ?? place?.tz ?? validTimeZone(headers.get("x-vercel-ip-timezone")) ?? undefined;
  if (place) {
    // A device location carries no time zone of its own; the device's is the best guide to it.
    if (!place.tz && tz) place = { ...place, tz };
    if (!place.il && place.tz === "Asia/Jerusalem") place = { ...place, il: true };
  }
  return {
    ...(tz ? { tz } : {}),
    ...(place ? { place } : {}),
    ...(when.prefs ? { prefs: when.prefs } : {}),
    ...(when.approx === false ? { approx: false } : {}),
  };
}

/**
 * The approximate place of the person's connection, from the headers Vercel adds to each request
 * (x-vercel-ip-latitude and the rest). Only used when the person hasn't set a place, and never kept.
 */
export function placeFromHeaders(headers: Headers): Place | null {
  const lat = Number(headers.get("x-vercel-ip-latitude"));
  const lon = Number(headers.get("x-vercel-ip-longitude"));
  if (!headers.get("x-vercel-ip-latitude") || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const decode = (v: string | null) => {
    if (!v) return "";
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  const city = decode(headers.get("x-vercel-ip-city"));
  const region = decode(headers.get("x-vercel-ip-country-region"));
  const country = headers.get("x-vercel-ip-country") ?? "";
  const tz = validTimeZone(headers.get("x-vercel-ip-timezone")) ?? undefined;
  const name = [city, region && region !== city ? region : "", country && country !== "US" ? country : ""].filter(Boolean).join(", ");
  return parsePlace({ lat, lon, name: name || "Your area", tz, il: country === "IL", from: "approx" }, ["approx"]);
}

/** The distance between two points, in kilometers. */
export function kmBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * Whether a question is about dates or times: the day's zmanim, Shabbat, a holiday or fast, the
 * parsha, or today's learning. Used when the lookup step isn't available to say so itself.
 */
export function asksAboutCalendar(question: string): boolean {
  const t = question.slice(0, 600);
  return /\b(?:zman(?:im)?|candle[- ]?lighting|candles|havdal(?:ah|a)|shabb?(?:at|os|es)\s+(?:start|begin|end|come|in|out)|(?:when|what\s+time)\b[^?.!]{0,60}\b(?:shabb?(?:at|os)|yom\s*tov|chag|fast|sunset|sunrise|shkiah|tzeit|nightfall|dawn|alos|alot|shema|shma|tefill?ah|davening|mincha|maariv|shacharis|shacharit|plag|chatzos|chatzot|start|begin|end|over|light)|sunset|sunrise|shki(?:a|ah)|tzeit|tzais|nightfall|alos\s+hashachar|alot\s+hashachar|sof\s+zman|latest\s+time|chatzo[st]|plag\s+hamincha|mincha\s+(?:gedol|ketan)|this\s+week'?s?\s+(?:parsh|parash|sedr|torah\s+portion)|(?:parsh|parash)(?:a|ah|as|at|ios|iot|ius)?\s+(?:of\s+)?(?:this|the)\s+week|today'?s?\s+(?:daf|date|hebrew\s+date|mishna|rambam|learning|halacha)|daf\s+yomi|hebrew\s+date|what(?:'s|\s+is)\s+the\s+date|what\s+day\s+is|rosh\s+chodesh|yom\s+kippur|rosh\s+hashan|sukk?o[st]|pesach|passover|shavuo[st]|chanuk?ah|hanukk?ah|purim|tisha\s+b'?av|tzom|fast\s+(?:day|begin|start|end)|omer|sefir|selichos|selichot|molad|kiddush\s+levana)/i.test(
    t,
  );
}
