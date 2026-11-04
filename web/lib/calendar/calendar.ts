import { HDate, HebrewCalendar, Location, Sedra, Zmanim, flags, DailyLearning, parshiot, type Event } from "@hebcal/core";
import "@hebcal/learning";
import { getLeyningForParsha } from "@hebcal/leyning";
import { kmBetween, validTimeZone, type DaySummary, type Place, type TimesPrefs } from "./place";

/*
 * The Jewish calendar for RabbAI: today's date and Hebrew date, this week's parsha, the coming
 * holidays and fasts, today's daily learning, and the day's times (zmanim) for the person's place.
 *
 * Server only. The calculations come from Hebcal (@hebcal/core, GPL-2.0-or-later, with
 * @hebcal/learning and @hebcal/leyning, BSD-2-Clause): the same solar method (NOAA's, as in the
 * KosherJava library Hebcal's zmanim derive from) that most Jewish calendars use. It runs only
 * on the server and is never sent to a browser. The model is given these figures and told never
 * to work out a date or a time itself (core premises, "Dates and times").
 *
 * Times are for sea level at the place given, rounded to the minute. Printed calendars may differ
 * by a minute or two, and communities differ in which opinion they follow; RabbAI says so.
 */

export interface CalendarItem {
  /** Civil date, YYYY-MM-DD in the place's time zone. */
  date: string;
  /** "Tuesday, November 10". */
  day: string;
  title: string;
  he?: string;
  /** A time that goes with it: candle lighting, the end of a fast. */
  time?: string;
  kind: "holiday" | "fast" | "roshchodesh" | "shabbat" | "candles" | "havdalah" | "chanukah" | "special" | "omer" | "other";
}

export interface Zman {
  id: string;
  label: string;
  time: string;
  /** Whose opinion or which calculation, in plain words. */
  note?: string;
}

export interface CalendarInfo {
  /** The time zone used for the person's date and the place's times. */
  tz: string;
  today: {
    /** YYYY-MM-DD in the person's time zone. */
    date: string;
    /** "Tuesday, November 3, 2026". */
    civil: string;
    /** "2:15 pm". */
    time: string;
    /** "23 Cheshvan 5787". */
    hebrew: string;
    /** "כ״ג חשון תשפ״ז". */
    hebrewHe: string;
    /** It is after sunset at the place, so the Hebrew date has already moved on. */
    afterSunset: boolean;
  };
  parsha: {
    /** "Chayei Sara". */
    name: string;
    he: string;
    /** "Saturday, November 7". */
    day: string;
    /** "Genesis 23:1–25:18". */
    range?: string;
    /** The first verse, as the library names it: "Genesis 23:1". */
    ref?: string;
    /** A holiday's reading instead of a weekly parsha. */
    holiday?: boolean;
    /** Shabbat Shekalim, Shabbat Mevarchim and the like. */
    special?: string[];
    /** The Israel schedule. */
    il: boolean;
  } | null;
  /** On a Saturday before Shabbat ends: next week's parsha, which is read from Shabbat afternoon on. */
  parshaNext?: CalendarInfo["parsha"];
  /** The coming days' holidays, fasts and Shabbat times, in order. */
  upcoming: CalendarItem[];
  /** Today's daily learning, by schedule: "Daf Yomi": "Bechorot 46". */
  learning: Array<{ id: string; label: string; text: string; ref?: string }>;
  /** The place the times are for, when known. */
  place?: { name: string; from: Place["from"]; il: boolean };
  /** Today's times at the place, when a place is known. */
  zmanim?: { day: string; items: Zman[] };
  /** Tomorrow's main times. */
  tomorrow?: { day: string; items: Zman[] };
  /** This week's Shabbat at the place: when to light candles and when it ends. */
  shabbat?: { candles?: string; candlesDay?: string; candleMins?: number; ends?: string; endsDay?: string; endsNote?: string; rabbeinuTam?: string };
}

/** The calendar a year ahead, major days only, for a question about a date further off. */
export interface YearItem {
  date: string;
  day: string;
  title: string;
}

/** The person's civil date in a time zone, as year, month and day. */
export function civilParts(now: Date, tz: string): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/**
 * A Date for a civil date, at this server's local midnight. The calendar library reads a Date's
 * local year, month and day, so this is how a date in the person's time zone reaches it whatever
 * time zone the server runs in.
 */
function localDay(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

/** The same local-midnight date, a number of days later (safe across clock changes). */
function addDays(dt: Date, n: number): Date {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
}

function isoOf(dt: Date): string {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** "Tuesday, November 10" for a library date (local midnight). */
function dayName(dt: Date, withYear = false): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", ...(withYear ? { year: "numeric" } : {}) }).format(dt);
}

/** "5:02 pm" in a time zone. */
export function timeIn(dt: Date, tz: string): string {
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(dt).replace(" AM", " am").replace(" PM", " pm");
}

/**
 * Candle-lighting minutes for a place: the person's own choice, else the custom the calendar
 * knows (40 in Jerusalem, 30 in Haifa and Zikhron Ya'akov, 20 elsewhere in Israel, 18 abroad).
 */
export function candleMinutesFor(place: Place, prefs: TimesPrefs = {}): number {
  if (prefs.candleMins) return prefs.candleMins;
  if (!place.il) return 18;
  if (kmBetween(place, { lat: 31.778, lon: 35.235 }) < 12) return 40;
  if (kmBetween(place, { lat: 32.794, lon: 34.99 }) < 10 || kmBetween(place, { lat: 32.571, lon: 34.953 }) < 5) return 30;
  return 20;
}

function locationOf(place: Place, tz: string): Location {
  return new Location(place.lat, place.lon, Boolean(place.il), place.tz ?? tz, place.name, place.il ? "IL" : undefined);
}

/** The day's times at a place, labeled with the opinion each follows. */
export function zmanimFor(loc: Location, day: Date, tz: string, prefs: TimesPrefs = {}, brief = false): Zman[] {
  const z = new Zmanim(loc, day, false);
  const t = (d: Date) => timeIn(d, tz);
  const chabad = prefs.custom === "chabad";
  const items: Zman[] = chabad
    ? [
        { id: "alot", label: "Dawn (alot hashachar)", time: t(z.alosBaalHatanya()), note: "the Baal HaTanya's (Chabad)" },
        { id: "sunrise", label: "Sunrise (netz)", time: t(z.sunrise()) },
        { id: "shma", label: "Latest time for the morning Shema", time: t(z.sofZmanShmaBaalHatanya()), note: "the Baal HaTanya's (Chabad)" },
        { id: "tefillah", label: "Latest time for the morning Amidah (Shacharit)", time: t(z.sofZmanTfilaBaalHatanya()), note: "the Baal HaTanya's (Chabad)" },
        { id: "chatzot", label: "Midday (chatzot)", time: t(z.chatzot()) },
        { id: "minchaGedola", label: "Earliest Mincha (mincha gedola)", time: t(z.minchaGedolaBaalHatanya()), note: "the Baal HaTanya's (Chabad)" },
        { id: "plag", label: "Plag hamincha", time: t(z.plagHaminchaBaalHatanya()), note: "the Baal HaTanya's (Chabad)" },
        { id: "sunset", label: "Sunset (shkiah)", time: t(z.sunset()) },
        { id: "tzeit", label: "Nightfall (tzeit hakochavim)", time: t(z.tzaisBaalHatanya()), note: "the Baal HaTanya's (Chabad)" },
      ]
    : [
        { id: "alot", label: "Dawn (alot hashachar)", time: t(z.alotHaShachar()), note: "sun 16.1° below the horizon" },
        { id: "misheyakir", label: "Earliest tallit and tefillin (misheyakir)", time: t(z.misheyakir()), note: "sun 11.5° below the horizon" },
        { id: "sunrise", label: "Sunrise (netz)", time: t(z.sunrise()) },
        { id: "shmaMGA", label: "Latest time for the morning Shema", time: t(z.sofZmanShmaMGA()), note: "Magen Avraham" },
        { id: "shma", label: "Latest time for the morning Shema", time: t(z.sofZmanShma()), note: "the Vilna Gaon" },
        { id: "tefillahMGA", label: "Latest time for the morning Amidah (Shacharit)", time: t(z.sofZmanTfillaMGA()), note: "Magen Avraham" },
        { id: "tefillah", label: "Latest time for the morning Amidah (Shacharit)", time: t(z.sofZmanTfilla()), note: "the Vilna Gaon" },
        { id: "chatzot", label: "Midday (chatzot)", time: t(z.chatzot()) },
        { id: "minchaGedola", label: "Earliest Mincha (mincha gedola)", time: t(z.minchaGedola()) },
        { id: "minchaKetana", label: "Mincha ketana", time: t(z.minchaKetana()) },
        { id: "plag", label: "Plag hamincha", time: t(z.plagHaMincha()) },
        { id: "sunset", label: "Sunset (shkiah)", time: t(z.sunset()) },
        { id: "tzeit7083", label: "Nightfall, three medium stars", time: t(z.tzeit(7.083)), note: "sun 7.083° below the horizon; many calendars end fasts at this time" },
        { id: "tzeit", label: "Nightfall, three small stars (tzeit hakochavim)", time: t(z.tzeit(8.5)), note: "sun 8.5° below the horizon" },
        { id: "rabbeinuTam", label: "Nightfall according to Rabbeinu Tam", time: t(z.sunsetOffset(72, false)), note: "72 minutes after sunset" },
        { id: "chatzotNight", label: "Midnight (chatzot halailah)", time: t(z.chatzotNight()) },
      ];
  const keep = brief ? new Set(["alot", "sunrise", "shma", "shmaMGA", "chatzot", "sunset", "tzeit", "tzeit7083"]) : null;
  return items.filter((i) => i.time && (!keep || keep.has(i.id)));
}

/** The kind of a calendar event, for the coming days' list. */
function kindOf(e: Event): CalendarItem["kind"] {
  const f = e.getFlags();
  if (f & flags.LIGHT_CANDLES) return "candles";
  if (f & flags.LIGHT_CANDLES_TZEIS) return "havdalah";
  if (f & flags.CHANUKAH_CANDLES) return "chanukah";
  if (f & (flags.MAJOR_FAST | flags.MINOR_FAST)) return "fast";
  if (f & flags.ROSH_CHODESH) return "roshchodesh";
  if (f & (flags.SPECIAL_SHABBAT | flags.SHABBAT_MEVARCHIM)) return "special";
  if (f & flags.OMER_COUNT) return "omer";
  if (f & (flags.CHAG | flags.MINOR_HOLIDAY | flags.EREV | flags.CHOL_HAMOED)) return "holiday";
  return "other";
}

/** Daily learning schedules given to RabbAI, and how to name them. */
const LEARNING: Array<{ id: string; label: string }> = [
  { id: "dafYomi", label: "Daf Yomi (Bavli)" },
  { id: "mishnaYomi", label: "Mishnah Yomit" },
  { id: "rambam1", label: "Rambam, one chapter a day" },
  { id: "rambam3", label: "Rambam, three chapters a day" },
  { id: "nachYomi", label: "Nach Yomi" },
  { id: "yerushalmi-vilna", label: "Yerushalmi Daf Yomi" },
  { id: "kitzurShulchanAruch", label: "Kitzur Shulchan Aruch Yomi" },
  { id: "arukhHaShulchanYomi", label: "Arukh HaShulchan Yomi" },
  { id: "chofetzChaim", label: "Sefer Chofetz Chaim, daily" },
  { id: "shemiratHaLashon", label: "Shemirat HaLashon, daily" },
  { id: "tanyaYomi", label: "Tanya Yomi" },
  { id: "dirshuAmudYomi", label: "Dirshu Amud Yomi" },
];

/** Tractate names as the library spells them, where Hebcal spells them differently. */
const TRACTATE_NAMES: Record<string, string> = {
  Berachot: "Berakhot",
  "Rosh Hashana": "Rosh Hashanah",
  Gitin: "Gittin",
  "Baba Kamma": "Bava Kamma",
  "Baba Metzia": "Bava Metzia",
  "Baba Batra": "Bava Batra",
  Bechorot: "Bekhorot",
  Arachin: "Arakhin",
  Midot: "Middot",
  Ketubot: "Ketubot",
  Kinnim: "Kinnim",
};

/** Today's daf as the library names its first amud: "Bekhorot 46a". */
export function dafRef(text: string): string | undefined {
  const m = /^(.+?)\s+(\d+)$/.exec(text.trim());
  if (!m) return undefined;
  const name = TRACTATE_NAMES[m[1]] ?? m[1];
  return name === "Shekalim" ? `Jerusalem Talmud Shekalim` : `${name} ${m[2]}a`;
}

export interface CalendarOptions {
  now?: Date;
  /** The person's time zone. */
  tz?: string;
  place?: Place | null;
  prefs?: TimesPrefs;
  /** How many days ahead to list (default 21). */
  days?: number;
}

/** The calendar for the person, at their place if one is known. */
export function calendarInfo(opts: CalendarOptions = {}): CalendarInfo {
  const now = opts.now ?? new Date();
  const place = opts.place ?? null;
  const tz = validTimeZone(place?.tz) ?? validTimeZone(opts.tz) ?? "UTC";
  const il = Boolean(place?.il) || (!place && tz === "Asia/Jerusalem");
  const prefs = opts.prefs ?? {};
  const { y, m, d } = civilParts(now, tz);
  const day = localDay(y, m, d);
  const loc = place ? locationOf(place, tz) : null;

  // After sunset the Hebrew date has already moved on to the next day.
  let afterSunset = false;
  if (loc) {
    const sunset = new Zmanim(loc, day, false).sunset();
    afterSunset = !Number.isNaN(sunset.getTime()) && now.getTime() >= sunset.getTime();
  }
  const hd = afterSunset ? new HDate(day).next() : new HDate(day);
  // Once Shabbat is over on Saturday night, "this week" is the coming week.
  const saturday = day.getDay() === 6;
  const shabbatOver = Boolean(saturday && loc && now.getTime() >= shabbatEndAt(loc, day, prefs).getTime());
  const weekOf = shabbatOver ? addDays(day, 1) : day;

  const info: CalendarInfo = {
    tz,
    today: {
      date: isoOf(day),
      civil: dayName(day, true),
      time: timeIn(now, tz),
      hebrew: hd.toString(),
      hebrewHe: hd.renderGematriya(true),
      afterSunset,
    },
    parsha: parshaFor(new HDate(weekOf), il),
    ...(saturday && !shabbatOver ? { parshaNext: parshaFor(new HDate(addDays(day, 1)), il) } : {}),
    upcoming: [],
    learning: [],
  };

  // This week's Shabbat and the coming days, from today through the number of days asked for.
  const end = addDays(day, opts.days ?? 21);
  const events = HebrewCalendar.calendar({
    start: day,
    end,
    il,
    noModern: true,
    shabbatMevarchim: true,
    ...(loc ? { location: loc, candlelighting: true, candleLightingMins: candleMinutesFor(place!, prefs), ...havdalahOption(prefs) } : {}),
  });
  info.upcoming = events
    .filter((e) => !(e.getFlags() & (flags.PARSHA_HASHAVUA | flags.DAILY_LEARNING | flags.MODERN_HOLIDAY)))
    .map((e) => {
      const dt = e.getDate().greg();
      const at = (e as Event & { eventTime?: Date }).eventTime;
      const kind = kindOf(e);
      const title = kind === "candles" ? "Candle lighting" : kind === "havdalah" ? "Shabbat or Yom Tov ends (havdalah)" : e.render("en").replace(/:\s*\d{1,2}:\d{2}\s*[ap]m$/i, "");
      const he = kind === "candles" || kind === "havdalah" ? undefined : e.render("he-x-NoNikud").replace(/:\s*\d{1,2}:\d{2}\s*[ap]m$/i, "");
      return { date: isoOf(dt), day: dayName(dt), title, ...(he ? { he } : {}), ...(at ? { time: timeIn(at, tz) } : {}), kind };
    });
  // "Fast begins" and "Fast ends" say which fast: the one that day, or the next day for a fast that
  // begins the evening before (Yom Kippur, Tisha B'Av).
  const named = info.upcoming.filter((u) => u.kind === "fast" && !/^Fast (?:begins|ends)$/.test(u.title));
  for (const u of info.upcoming) {
    if (u.kind !== "fast" || !/^Fast (?:begins|ends)$/.test(u.title)) continue;
    const next = isoOf(addDays(new Date(`${u.date}T12:00:00`), 1));
    const fast = named.find((n) => n.date === u.date) ?? (u.title === "Fast begins" ? named.find((n) => n.date === next) : undefined);
    if (fast) u.title = `${u.title} (${fast.title})`;
  }

  for (const s of LEARNING) {
    try {
      const ev = DailyLearning.lookup(s.id, new HDate(day), il);
      if (!ev) continue;
      // The daf schedules' own names come with a prefix the label already says ("Daf Yomi: ...").
      const text = s.id === "dafYomi" || s.id === "dirshuAmudYomi" ? (ev as Event & { renderBrief(l?: string): string }).renderBrief("en") : ev.render("en");
      info.learning.push({ id: s.id, label: s.label, text, ...(s.id === "dafYomi" ? { ref: dafRef(text) } : {}) });
    } catch {
      // A schedule that doesn't cover today simply isn't listed.
    }
  }

  if (place && loc) {
    info.place = { name: place.name, from: place.from, il: Boolean(place.il) };
    info.zmanim = { day: dayName(day), items: zmanimFor(loc, day, tz, prefs) };
    const next = localDay(y, m, d + 1);
    info.tomorrow = { day: dayName(next), items: zmanimFor(loc, next, tz, prefs, true) };
    info.shabbat = shabbatFor(weekOf, loc, place, tz, prefs);
  }
  return info;
}

function havdalahOption(prefs: TimesPrefs): { havdalahMins?: number } {
  return prefs.havdalah && prefs.havdalah !== "8.5" ? { havdalahMins: Number(prefs.havdalah) } : {};
}

/** When Shabbat ends on a Saturday at the place, by the person's choice of havdalah time. */
function shabbatEndAt(loc: Location, saturday: Date, prefs: TimesPrefs): Date {
  const sat = new Zmanim(loc, saturday, false);
  return prefs.havdalah && prefs.havdalah !== "8.5" ? sat.sunsetOffset(Number(prefs.havdalah), false) : sat.tzeit(8.5);
}

/** This week's (or today's) Shabbat at the place: candle lighting, the end, and Rabbeinu Tam. */
function shabbatFor(day: Date, loc: Location, place: Place, tz: string, prefs: TimesPrefs): CalendarInfo["shabbat"] {
  // From Friday of this week: on Saturday, today's Shabbat; otherwise the coming one.
  const dow = day.getDay();
  const friday = dow === 6 ? addDays(day, -1) : addDays(day, (5 - dow + 7) % 7);
  const saturday = addDays(friday, 1);
  const mins = candleMinutesFor(place, prefs);
  const fri = new Zmanim(loc, friday, false);
  const sat = new Zmanim(loc, saturday, false);
  const endsAt = shabbatEndAt(loc, saturday, prefs);
  return {
    candlesDay: dayName(friday),
    candles: timeIn(fri.sunsetOffset(-mins, false), tz),
    candleMins: mins,
    endsDay: dayName(saturday),
    ends: timeIn(endsAt, tz),
    endsNote: prefs.havdalah && prefs.havdalah !== "8.5" ? `${prefs.havdalah} minutes after sunset` : "nightfall, three small stars (sun 8.5° below the horizon)",
    rabbeinuTam: timeIn(sat.sunsetOffset(72, false), tz),
  };
}

/** The weekly parsha read on the coming Shabbat (today, if today is Shabbat). */
export function parshaFor(today: HDate, il: boolean): CalendarInfo["parsha"] {
  const sat = today.onOrAfter(6);
  const sedra = new Sedra(sat.getFullYear(), il).lookup(sat);
  const evs = HebrewCalendar.calendar({ start: sat, end: sat, il, sedrot: true, noModern: true, shabbatMevarchim: true });
  const special = evs
    .filter((e) => e.getFlags() & (flags.SPECIAL_SHABBAT | flags.SHABBAT_MEVARCHIM))
    .map((e) => e.render("en"));
  const day = dayName(sat.greg());
  if (sedra.chag) {
    const hol = evs.find((e) => e.getFlags() & (flags.CHAG | flags.CHOL_HAMOED | flags.MINOR_HOLIDAY));
    const name = hol ? hol.render("en") : sedra.parsha.join(" ");
    return { name, he: hol ? hol.render("he-x-NoNikud") : name, day, holiday: true, il, ...(special.length ? { special } : {}) };
  }
  const name = sedra.parsha.join("-");
  const pe = evs.find((e) => e.getFlags() & flags.PARSHA_HASHAVUA);
  let range: string | undefined;
  let ref: string | undefined;
  try {
    const ley = getLeyningForParsha(name);
    range = ley.summary?.replace(/-/g, "–");
    ref = ley.summary?.split("-")[0]?.trim();
  } catch {
    // Without the range the parsha is still named.
  }
  return {
    name,
    he: pe ? pe.render("he-x-NoNikud").replace(/^פרשת\s*/, "") : name,
    day,
    ...(range ? { range } : {}),
    ...(ref ? { ref } : {}),
    il,
    ...(special.length ? { special } : {}),
  };
}

/** The year ahead: the holidays and fasts, with the date each begins. */
export function yearAhead(opts: CalendarOptions = {}): YearItem[] {
  const now = opts.now ?? new Date();
  const tz = validTimeZone(opts.place?.tz) ?? validTimeZone(opts.tz) ?? "UTC";
  const il = Boolean(opts.place?.il) || (!opts.place && tz === "Asia/Jerusalem");
  const { y, m, d } = civilParts(now, tz);
  const start = localDay(y, m, d);
  const end = addDays(start, 380);
  const events = HebrewCalendar.calendar({ start, end, il, noModern: true, noRoshChodesh: true, noSpecialShabbat: true });
  const keepMinor = /^(Chanukah: 1 Candle|Tu BiShvat|Purim|Shushan Purim|Lag BaOmer|Tu B['’]Av|Purim Katan|Leil Selichot|Pesach Sheni)$/;
  const seen = new Set<string>();
  const out: YearItem[] = [];
  for (const e of events) {
    const f = e.getFlags();
    const title = e.render("en");
    const major = f & (flags.CHAG | flags.MAJOR_FAST | flags.MINOR_FAST | flags.EREV);
    if (!major && !(f & flags.MINOR_HOLIDAY && keepMinor.test(title))) continue;
    const key = `${title}|${isoOf(e.getDate().greg())}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dt = e.getDate().greg();
    out.push({ date: isoOf(dt), day: dayName(dt, true), title });
  }
  return out;
}

/** The calendar as plain lines for RabbAI's settings. */
export function calendarSettings(info: CalendarInfo, opts: { times?: boolean; year?: YearItem[] } = {}): string {
  const lines: string[] = [];
  lines.push(
    `Today, for the person: ${info.today.civil}, ${info.today.time} (time zone ${info.tz}). Hebrew date: ${info.today.hebrew} (${info.today.hebrewHe})` +
      (info.today.afterSunset ? ", because it is already after sunset where they are; the civil date has not changed yet." : ".") +
      (info.place ? "" : " The Hebrew date changes at sunset."),
  );
  const p = info.parsha;
  if (p) {
    lines.push(
      p.holiday
        ? `This Shabbat (${p.day}) there is no weekly parsha: the reading is for ${p.name}.`
        : `This week's parsha, read on ${p.day}: ${p.name} (${p.he})${p.range ? `, ${p.range}` : ""}${p.il ? ", on the Israel schedule" : ""}.` +
            (p.special?.length ? ` That Shabbat is also ${p.special.join(" and ")}.` : ""),
    );
  }
  const pn = info.parshaNext;
  if (pn) {
    lines.push(
      `Today is Shabbat. Next week's ${pn.holiday ? `reading (${pn.day}) is for ${pn.name}` : `parsha (read ${pn.day}, and from this afternoon's Mincha) is ${pn.name}${pn.range ? `, ${pn.range}` : ""}`}; once Shabbat is over, "this week's parsha" usually means that one.`,
    );
  }
  const coming = info.upcoming.filter((u) => u.kind !== "candles" && u.kind !== "havdalah" && u.kind !== "omer" && u.kind !== "other");
  if (coming.length) {
    const byDay = new Map<string, string[]>();
    for (const u of coming) {
      const label = `${u.title}${u.time ? ` (${u.time})` : ""}`;
      byDay.set(u.day, [...(byDay.get(u.day) ?? []), label]);
    }
    lines.push(`Coming up: ${[...byDay.entries()].map(([d, ts]) => `${d}: ${ts.join("; ")}`).join(". ")}.`);
  }
  const daf = info.learning.find((l) => l.id === "dafYomi");
  if (daf) lines.push(`Today's Daf Yomi: ${daf.text}.`);

  if (opts.times) {
    const others = info.learning.filter((l) => l.id !== "dafYomi");
    if (others.length) lines.push(`Today's other daily learning: ${others.map((l) => `${l.label}: ${l.text}`).join("; ")}.`);
    if (info.place && info.zmanim) {
      lines.push(
        `Times are for ${info.place.name}` +
          (info.place.from === "approx"
            ? ", the approximate location of the person's internet connection (it can be off by many miles; they can set their place in Settings for exact times)."
            : info.place.from === "device"
              ? ", from their device's location."
              : ", the place they chose in Settings.") +
          " Worked out for sea level with the solar calculation most Jewish calendars use (Hebcal's, from the KosherJava method), rounded to the minute.",
      );
      const fmt = (z: Zman) => `${z.label}${z.note ? `, ${z.note}` : ""}: ${z.time}`;
      lines.push(`Times today, ${info.zmanim.day}: ${info.zmanim.items.map(fmt).join("; ")}.`);
      if (info.tomorrow) lines.push(`Times tomorrow, ${info.tomorrow.day}: ${info.tomorrow.items.map(fmt).join("; ")}.`);
      const s = info.shabbat;
      if (s) {
        lines.push(
          `This Shabbat at ${info.place.name}: candle lighting ${s.candlesDay} at ${s.candles} (${s.candleMins} minutes before sunset); Shabbat ends ${s.endsDay} at ${s.ends} (${s.endsNote}); according to Rabbeinu Tam (72 minutes) at ${s.rabbeinuTam}.`,
        );
      }
      const timed = info.upcoming.filter((u) => (u.kind === "candles" || u.kind === "havdalah" || u.kind === "chanukah" || u.kind === "fast") && u.time);
      if (timed.length) lines.push(`Times in the coming days: ${timed.map((u) => `${u.day}: ${u.title} ${u.time}`).join("; ")}.`);
    } else {
      lines.push("RabbAI doesn't know where the person is, so it has no times (zmanim) for them. If they ask for a time, say you need their place, and that they can set it in Settings (Your place) or tell you their city.");
    }
    if (opts.year?.length) lines.push(`The year ahead (the date each day falls on): ${opts.year.map((yI) => `${yI.title}: ${yI.day}`).join("; ")}.`);
  }
  return lines.join("\n");
}

/** "This week's parsha", "the weekly portion", "parshas hashavua", "the parsha this week" and the like. */
const THIS_WEEKS_PARSHA =
  /\b(?:this\s+week'?s?|this|the(?:\s+weekly)?|weekly)\s+(?:torah\s+)?(?:par(?:a)?sh[a-z]*|sedra|sidra|portion)\b|\bpar(?:a)?sh[a-z]*\s+ha[-\s]?shavu'?a\b|\b(?:par(?:a)?sh[a-z]*|portion|sedra)\s+(?:of|for)\s+(?:this|the)\s+week\b/i;

/** Every weekly parsha's name, as a pattern that allows a space for a hyphen and an "h" at the end. */
const PARSHA_NAMES = parshiot.map(
  (name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’]?").replace(/[-\s]/g, "[-\\s]?")}h?\\b`, "i"),
);

/**
 * The first verse of this week's parsha, when a question asks about "this week's parsha" without
 * naming one (a dvar Torah, a question on the parsha), so its verses and their meforshim open even
 * if the lookup step misses. Empty otherwise, and for a holiday's reading.
 */
export function parshaRefsFor(question: string, info: CalendarInfo | null): string[] {
  const ref = info?.parsha?.ref;
  if (!ref || info?.parsha?.holiday || !THIS_WEEKS_PARSHA.test(question)) return [];
  if (PARSHA_NAMES.some((name) => name.test(question))) return [];
  return [ref];
}

/**
 * The line the lookup step sees before the question, so "this week's parsha" or "today's daf"
 * can be opened in the library.
 */
export function calendarNoteForLookup(info: CalendarInfo): string {
  const parts = [`Today is ${info.today.civil} (${info.today.hebrew}).`];
  if (info.parsha && !info.parsha.holiday) parts.push(`This week's parsha is ${info.parsha.name}${info.parsha.range ? `, ${info.parsha.range}` : ""}.`);
  if (info.parsha?.holiday) parts.push(`This Shabbat's reading is for ${info.parsha.name}.`);
  const daf = info.learning.find((l) => l.id === "dafYomi");
  if (daf?.ref) parts.push(`Today's Daf Yomi is ${daf.ref.replace(/a$/, "")}.`);
  const next = info.upcoming.find((u) => u.kind === "holiday" || u.kind === "fast");
  if (next) parts.push(`Coming up: ${next.title}, ${next.day}.`);
  return parts.join(" ");
}

/** The day in short, for the app's welcome screen and its suggested questions. */
export function daySummary(info: CalendarInfo): DaySummary {
  const p = info.parsha;
  const daf = info.learning.find((l) => l.id === "dafYomi");
  const today = info.upcoming.filter((u) => u.date === info.today.date && !["candles", "havdalah", "other", "special"].includes(u.kind));
  const seen = new Set<string>();
  const coming: DaySummary["coming"] = [];
  for (const u of info.upcoming) {
    if (u.date <= info.today.date || !["holiday", "fast", "roshchodesh", "chanukah"].includes(u.kind)) continue;
    if (/^Fast (?:begins|ends)/.test(u.title)) continue;
    const key = u.title.replace(/\s+(?:I|II|III|IV|V|VI|VII|VIII|\d+)$/, "").replace(/: \d+ Candles?$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    coming.push({ title: u.title, day: u.day, date: u.date, kind: u.kind });
    if (coming.length >= 3) break;
  }
  const s = info.shabbat;
  // A fast or holiday today or in the next two days, for a heads-up on the welcome screen.
  const horizon = isoOf(addDays(new Date(`${info.today.date}T12:00:00`), 2));
  const soonItem = info.upcoming.find(
    (u) => u.date >= info.today.date && u.date <= horizon && (u.kind === "fast" || u.kind === "holiday") && !/^Fast (?:begins|ends)/.test(u.title),
  );
  const fastTime = (which: "begins" | "ends") => {
    if (soonItem?.kind !== "fast") return undefined;
    const t = info.upcoming.find((u) => u.time && u.title === `Fast ${which} (${soonItem.title})`);
    return t?.time ? { date: t.date, time: t.time } : undefined;
  };
  const begins = fastTime("begins");
  const ends = fastTime("ends");
  return {
    date: info.today.date,
    civil: info.today.civil,
    hebrew: info.today.hebrew,
    hebrewHe: info.today.hebrewHe,
    afterSunset: info.today.afterSunset,
    ...(p ? { parsha: { name: p.name, he: p.he, day: p.day, ...(p.ref ? { ref: p.ref } : {}), ...(p.holiday ? { holiday: true } : {}), ...(info.parshaNext ? { next: info.parshaNext.name } : {}) } } : {}),
    ...(daf ? { daf: { text: daf.text, ...(daf.ref ? { ref: daf.ref } : {}) } } : {}),
    todayIs: [...new Set(today.filter((u) => !/^Fast (?:begins|ends)/.test(u.title)).map((u) => u.title))],
    coming,
    ...(s?.candles && s.ends && s.candlesDay && s.endsDay ? { shabbat: { candles: s.candles, candlesDay: s.candlesDay, ends: s.ends, endsDay: s.endsDay } } : {}),
    ...(info.place ? { place: { name: info.place.name, from: info.place.from } } : {}),
    ...(info.zmanim?.items.length
      ? { zmanim: { day: info.zmanim.day, items: info.zmanim.items.map((z) => ({ label: z.label, time: z.time, ...(z.note ? { note: z.note } : {}) })) } }
      : {}),
    ...(soonItem
      ? {
          soon: {
            title: soonItem.title,
            date: soonItem.date,
            day: soonItem.day,
            kind: soonItem.kind,
            ...(begins ? { begins } : {}),
            ...(ends ? { ends } : {}),
          },
        }
      : {}),
  };
}
