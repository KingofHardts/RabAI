/*
 * The greeting on a new chat: the time of day where the person is, and a good wish that fits the
 * day (Rosh Chodesh, a festival, a fast, Friday before Shabbat, the night after it). Made from the
 * server's day summary; with none, only the time of day. Plain words, no halacha. Safe on the device.
 */

import type { DaySummary } from "./calendar/place";

/** "Good morning", "Good afternoon" or "Good evening", by the hour where the person is. */
export function timeGreeting(hour: number): string {
  if (hour >= 4 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/** A wish for what today is, from the day's own names; null on an ordinary day. */
export function dayWish(day: DaySummary | null, weekday: number): string | null {
  if (!day) return null;
  const is = (re: RegExp) => day.todayIs.some((t) => re.test(t));
  if (is(/^(?:Tzom|Ta['’]anit|Asara|Tish['’]a)/)) return "Have an easy and meaningful fast.";
  if (is(/^Yom Kippur/)) return "Gmar chatimah tovah.";
  if (is(/^Rosh Hashana/)) return "Shanah tovah.";
  if (is(/^Chanukah/)) return "Chanukah sameach.";
  if (is(/^Purim/)) return "Purim sameach.";
  if (is(/^(?:Pesach|Shavuot|Sukkot|Shmini Atzeret|Simchat Torah)/)) return "Chag sameach.";
  if (is(/^Rosh Chodesh/)) return "Chodesh tov.";
  // Friday by day: Shabbat is coming. Saturday night: a good week.
  if (weekday === 5 && !day.afterSunset) return "Shabbat shalom.";
  if (weekday === 6 && day.afterSunset) return "Shavua tov.";
  return null;
}

/** The whole greeting: "Good morning, Josh. Chodesh tov." */
export function greeting(opts: { hour: number; weekday: number; name?: string; day: DaySummary | null }): { hello: string; wish: string | null } {
  const name = opts.name?.trim();
  return { hello: `${timeGreeting(opts.hour)}${name ? `, ${name}` : ""}.`, wish: dayWish(opts.day, opts.weekday) };
}
