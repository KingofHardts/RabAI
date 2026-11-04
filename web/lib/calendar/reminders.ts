/*
 * Reminders for the Daven tab, made into a calendar file on the person's device (lib/calendar/ics.ts):
 * Mincha before sunset, the window for Kiddush Levana, and the dates of a yahrzeit. Server side
 * (the calendar library); nothing here is kept, and a yahrzeit is computed from a date alone,
 * never a name.
 */

import { HDate, HebrewCalendar, Location, Molad, Zmanim } from "@hebcal/core";
import type { Place } from "./place";
import { timeIn } from "./calendar";

export interface ReminderItem {
  title: string;
  /** When, as an instant (ISO). */
  start: string;
  /** For a day-long reminder (a yahrzeit): the civil date. */
  date?: string;
  notes?: string;
}

function locationOf(place: Place, tz: string): Location {
  return new Location(place.lat, place.lon, Boolean(place.il), place.tz ?? tz, place.name, place.il ? "IL" : undefined);
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A reminder each day, `before` minutes before sunset, for the next `days` days. */
export function minchaReminders(place: Place, tz: string, now = new Date(), days = 30, before = 30): ReminderItem[] {
  const loc = locationOf(place, tz);
  const out: ReminderItem[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    const sunset = new Zmanim(loc, day, false).sunset();
    if (Number.isNaN(sunset.getTime())) continue;
    const at = new Date(sunset.getTime() - before * 60000);
    if (at.getTime() < now.getTime()) continue;
    out.push({ title: `Mincha (sunset ${timeIn(sunset, place.tz ?? tz)})`, start: at.toISOString() });
  }
  return out;
}

/** The local hour of an instant at a time zone. */
function hourIn(d: Date, tz: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(d));
}

/** The same day at 7pm local, when the instant falls earlier in the day: a reminder for the evening, not the small hours. */
function evening(d: Date, tz: string): Date {
  const h = hourIn(d, tz);
  return h >= 19 ? d : new Date(d.getTime() + (19 - h) * 3600000);
}

/**
 * Kiddush Levana for the coming months: from 3 days after the molad (or 7, a common custom) until
 * halfway to the next molad (the Maharil's time).
 */
export function kiddushLevanaReminders(tz: string, now = new Date(), months = 6, fromDays: 3 | 7 = 3): ReminderItem[] {
  const out: ReminderItem[] = [];
  let hd = new HDate(now);
  for (let i = 0; i < months + 1 && out.length < months * 2; i++) {
    const molad = new Molad(hd.getFullYear(), hd.getMonth());
    const start = new Date((fromDays === 7 ? molad.getTchilasZmanKidushLevana7Days() : molad.getTchilasZmanKidushLevana3Days()).epochMilliseconds);
    const end = new Date(molad.getSofZmanKidushLevanaBetweenMoldos().epochMilliseconds);
    if (end.getTime() > now.getTime()) {
      const month = hd.getMonthName();
      const until = `${end.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz })} at ${timeIn(end, tz)}`;
      out.push({
        title: `Kiddush Levana from tonight (${month})`,
        start: evening(new Date(Math.max(start.getTime(), now.getTime())), tz).toISOString(),
        notes: `Kiddush Levana can be said at night from ${fromDays} days after the molad until ${until} (halfway to the next molad, the Maharil's time). Ask your rav about your custom.`,
      });
      out.push({ title: `Last nights for Kiddush Levana (${month})`, start: evening(new Date(end.getTime() - 24 * 3600000), tz).toISOString(), notes: `The time ends ${until}.` });
    }
    // The first day of the next month.
    hd = new HDate(1, hd.getMonth(), hd.getFullYear()).add(32, "d");
    hd = new HDate(1, hd.getMonth(), hd.getFullYear());
  }
  return out;
}

/**
 * The yahrzeit of a death on a civil date (after sunset, the next Hebrew day): its Hebrew date and
 * the civil dates it falls on in the coming years. The yahrzeit begins the evening before.
 */
export interface YahrzeitDate {
  date: string;
  hebrew: string;
  /** For a passing in Adar of an ordinary year, the same day in Adar II in a leap year: customs differ. */
  adarII?: { date: string; hebrew: string };
}

export function yahrzeitDates(date: string, afterSunset: boolean, now = new Date(), years = 10): { hebrew: string; dates: YahrzeitDate[] } | null {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const died = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + (afterSunset ? 1 : 0), 12);
  if (Number.isNaN(died.getTime()) || died.getTime() > now.getTime() + 86400000) return null;
  const hd = new HDate(died);
  const thisYear = new HDate(now).getFullYear();
  const dates: YahrzeitDate[] = [];
  // Adar of an ordinary year (hebcal numbers it 12, as Adar I).
  const adarOrdinary = hd.getMonth() === 12 && !HDate.isLeapYear(hd.getFullYear());
  for (let y = thisYear; y < thisYear + years + 1 && dates.length < years; y++) {
    const yz = HebrewCalendar.getYahrzeit(y, died);
    if (!yz) continue;
    const g = yz.greg();
    if (g.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) continue;
    const entry: YahrzeitDate = { date: ymd(g), hebrew: yz.render("en") };
    if (adarOrdinary && HDate.isLeapYear(y)) {
      const other = new HDate(Math.min(hd.getDate(), 29), 13, y);
      if (other.abs() !== yz.abs()) entry.adarII = { date: ymd(other.greg()), hebrew: other.render("en") };
    }
    dates.push(entry);
  }
  return { hebrew: hd.render("en"), dates };
}
