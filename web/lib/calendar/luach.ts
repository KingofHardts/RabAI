/*
 * The Daven tab's calendar (the "Luach"): a civil month with each day's Hebrew date and what it is
 * (a festival, a fast, Rosh Chodesh, the parsha on Shabbat), and any day's full summary, for the
 * Times and Calendar views. From Hebcal, as the rest of the calendar is. Server side.
 */

import { HDate, HebrewCalendar, flags, gematriya } from "@hebcal/core";
import { calendarInfo, daySummary } from "./calendar";
import type { WhenAndWhere } from "./place";

export interface LuachDay {
  /** YYYY-MM-DD. */
  date: string;
  /** 0 Sunday … 6 Shabbat. */
  dow: number;
  /** "7 Kislev". */
  hebrew: string;
  /** The day of the Hebrew month in Hebrew letters ("ז׳"). */
  heDay: string;
  /** What the day is: festivals, fasts, Rosh Chodesh, the parsha on Shabbat. */
  events: Array<{ title: string; kind: "holiday" | "fast" | "roshChodesh" | "parsha" | "special" | "modern" }>;
}

export interface LuachMonth {
  year: number;
  /** 1–12. */
  month: number;
  /** "December 2026". */
  title: string;
  /** "Kislev – Tevet 5787". */
  hebrewTitle: string;
  days: LuachDay[];
}

const pad = (n: number) => String(n).padStart(2, "0");

function kindOf(mask: number, desc: string): LuachDay["events"][number]["kind"] | null {
  if (mask & flags.PARSHA_HASHAVUA) return "parsha";
  if (mask & flags.ROSH_CHODESH) return "roshChodesh";
  if (mask & (flags.MINOR_FAST | flags.MAJOR_FAST)) return "fast";
  if (mask & flags.MODERN_HOLIDAY) return "modern";
  if (mask & flags.SPECIAL_SHABBAT) return "special";
  if (mask & (flags.CHAG | flags.CHOL_HAMOED | flags.MINOR_HOLIDAY | flags.EREV | flags.LIGHT_CANDLES_TZEIS)) return "holiday";
  if (/Chanukah|Purim|Tu Bi|Lag BaOmer|Pesach Sheni|Tu B'Av/.test(desc)) return "holiday";
  return null;
}

/** One civil month, day by day. */
export function luachMonth(year: number, month: number, il: boolean): LuachMonth {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const events = HebrewCalendar.calendar({ start, end, il, sedrot: true, noMinorFast: false, noModern: false, noSpecialShabbat: false });
  const byDate = new Map<string, LuachDay["events"]>();
  for (const e of events) {
    const g = e.getDate().greg();
    const key = `${g.getFullYear()}-${pad(g.getMonth() + 1)}-${pad(g.getDate())}`;
    const kind = kindOf(e.getFlags(), e.getDesc());
    if (!kind) continue;
    const list = byDate.get(key) ?? [];
    const title = e.render("en");
    if (!list.some((x) => x.title === title)) list.push({ title, kind });
    byDate.set(key, list);
  }
  const days: LuachDay[] = [];
  for (let d = 1; d <= end.getDate(); d++) {
    const g = new Date(year, month - 1, d);
    const hd = new HDate(g);
    const key = `${year}-${pad(month)}-${pad(d)}`;
    days.push({ date: key, dow: g.getDay(), hebrew: `${hd.getDate()} ${hd.getMonthName()}`, heDay: gematriya(hd.getDate()), events: byDate.get(key) ?? [] });
  }
  const first = new HDate(start);
  const last = new HDate(end);
  const hebrewTitle =
    first.getMonth() === last.getMonth()
      ? `${first.getMonthName()} ${first.getFullYear()}`
      : `${first.getMonthName()} – ${last.getMonthName()} ${last.getFullYear()}`;
  return { year, month, title: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }), hebrewTitle, days };
}

/** Noon on a date at a time zone (so the day's times and Hebrew date are that day's, before sunset). */
export function noonAt(date: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, 12));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23", day: "numeric" }).formatToParts(guess);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? d);
  const shift = (day - d) * 24 + (hour - 12);
  return new Date(guess.getTime() - shift * 3600_000);
}

/** Any day's summary (times, what it is, the davening's changes), at the person's place. */
export function luachDay(date: string, when: WhenAndWhere) {
  const tz = when.place?.tz ?? when.tz ?? "UTC";
  return daySummary(calendarInfo({ now: noonAt(date, tz), tz: when.tz, place: when.place, prefs: when.prefs, days: 1 }));
}
