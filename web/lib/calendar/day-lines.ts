/*
 * The short lines about today on the welcome screen, made from the server's day summary
 * (/api/calendar). Plain words only; the times come from the server's calculation, never the app's.
 * Safe on the device.
 */

import type { DaySummary } from "./place";

const weekday = (civil: string) => civil.split(",")[0];

/** "Tuesday, 23 Cheshvan 5787", or "Tuesday night, 24 Cheshvan 5787" after sunset. */
export function todayLine(day: DaySummary): string {
  return `${weekday(day.civil)}${day.afterSunset ? " night" : ""}, ${day.hebrew}`;
}

/** The next day's date, YYYY-MM-DD. */
function nextDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** "Wednesday", for a YYYY-MM-DD date. */
function weekdayOf(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/** "today", "tonight", "tomorrow" or the weekday of a date, relative to the person's today. */
function when(day: DaySummary, date: string, evening = false): string {
  if (date === day.date) return evening ? "tonight" : "today";
  if (date === nextDate(day.date)) return "tomorrow";
  return weekdayOf(date);
}

/**
 * Shabbat's times when they matter soon: on Thursday, candle lighting on Friday; on Friday,
 * candle lighting today (or "Shabbat Shalom" after sunset) and when it ends; on Shabbat, when it ends.
 */
export function shabbatLine(day: DaySummary): string | null {
  const s = day.shabbat;
  if (!s) return null;
  const isToday = (d: string) => day.civil.startsWith(d);
  const where = day.place ? ` (${day.place.from === "approx" ? "near " : ""}${day.place.name})` : "";
  if (isToday(s.endsDay)) return `Shabbat ends ${s.ends}${where}`;
  if (isToday(s.candlesDay)) return day.afterSunset ? `Shabbat Shalom · ends ${s.ends}${where}` : `Candle lighting today ${s.candles}${where}`;
  if (weekday(day.civil) === "Thursday") return `Candles ${weekday(s.candlesDay)} ${s.candles}${where}`;
  return null;
}

/** A fast or holiday today or in the next two days: "Tomorrow: Asara B'Tevet · from 5:56 am · ends 5:23 pm". */
export function soonLine(day: DaySummary): string | null {
  const s = day.soon;
  if (!s) return null;
  const head = when(day, s.date);
  const parts = [`${head[0].toUpperCase()}${head.slice(1)}: ${s.title}`];
  const at = (t: { date: string; time: string }, evening: boolean) => (t.date === s.date ? t.time : `${when(day, t.date, evening)} ${t.time}`);
  // A fast that began before today has begun already; only its end is news.
  if (s.begins && s.begins.date >= day.date) parts.push(`from ${at(s.begins, true)}`);
  if (s.ends) parts.push(`ends ${at(s.ends, false)}`);
  return parts.join(" · ");
}
