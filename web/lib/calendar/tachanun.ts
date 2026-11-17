/*
 * When Tachanun is said, from the Koren siddur's own printed list (Minha for Weekdays: "Taḥanun is
 * not said on Erev Shabbat and Erev Yom Tov. It is also not said on the following days: Rosh
 * Ḥodesh, Ḥanukka, Tu BiShvat, the 14th and 15th of Adar I, Purim and Shushan Purim, Yom
 * HaAtzma'ut, Lag BaOmer, Yom Yerushalayim, Tisha B'Av, Tu B'Av, and the preceding afternoons, the
 * month of Nisan, the 14th of Iyar (Pesaḥ Sheni), from Rosh Ḥodesh Sivan through the day after
 * Shavuot (in Israel through 12th of Sivan), and from Erev Yom Kippur through the day after Simḥat
 * Torah (in Israel through Rosh Ḥodesh Marḥeshvan)").
 *
 * This replaced Hebcal's tachanun() (2026-11-17 audit, docs/davening-calendar-audit.md), which
 * differs from the printed list on: Minha before Ḥanukka and before 14 Adar I, 15 Adar I, the day
 * after Ḥanukka when Kislev has 30 days, Minha of the day before Erev Rosh HaShana, Pesaḥ Sheni,
 * and in Israel the end of Tishrei and 8–12 Sivan. Each difference was checked against the
 * Shulchan Aruch (131, 697), its commentaries and established Orthodox sources; the list is the
 * siddur's own. Yom HaAtzma'ut and Yom Yerushalayim are kept apart (`modern`), since communities
 * differ and the person chooses in the Daven settings. RabbAI's reading, for the board (open
 * question 23).
 */
import { HDate, HebrewCalendar, flags, months } from "@hebcal/core";

export interface TachanunDay {
  shacharit: boolean;
  mincha: boolean;
  /** False when the only reason for leaving it out is a custom some keep and some don't. */
  allCongs: boolean;
  /** Left out only for Yom HaAtzma'ut or Yom Yerushalayim (that day, or the afternoon before). */
  modern: { shacharit: boolean; mincha: boolean };
  /** Why it isn't said today ("Tu BiShvat", "the afternoon before Chanukah", "Erev Shabbat"), when it isn't. */
  why?: string;
  /**
   * A day Koren says Tachanun on that many communities leave out by custom (sources in
   * docs/davening-calendar-audit.md): outside Israel, 9–12 Sivan ("sivan") and 25–29 Tishrei
   * ("tishrei"). The person's custom decides (Daven settings).
   */
  customWindow?: "sivan" | "tishrei";
}

const descs = (hd: HDate, il: boolean) => (HebrewCalendar.getHolidaysOnDate(hd, il) ?? []).map((e) => ({ d: e.getDesc(), f: e.getFlags() }));

/** Chanukah: 25 Kislev for eight days. */
function chanukah(hd: HDate): boolean {
  const start = new HDate(25, months.KISLEV, hd.getFullYear());
  const n = hd.abs() - start.abs();
  return n >= 0 && n < 8;
}

/** Why there is no Tachanun all day, by Koren's list: [reason, whether its afternoon before is free too]. */
export function noTachanunDay(hd: HDate, il: boolean): { why: string; before: boolean; modern?: boolean } | null {
  const m = hd.getMonth();
  const d = hd.getDate();
  const ev = descs(hd, il);
  const leap = HDate.isLeapYear(hd.getFullYear());
  if (ev.some((e) => e.f & flags.ROSH_CHODESH)) return { why: "Rosh Chodesh", before: true };
  if (chanukah(hd)) return { why: "Chanukah", before: true };
  if (m === months.SHVAT && d === 15) return { why: "Tu BiShvat", before: true };
  if (leap && m === months.ADAR_I && (d === 14 || d === 15)) return { why: "Purim Katan", before: true };
  if (m === (leap ? months.ADAR_II : months.ADAR_I) && (d === 14 || d === 15)) return { why: d === 14 ? "Purim" : "Shushan Purim", before: true };
  if (ev.some((e) => /^Yom HaAtzma/.test(e.d))) return { why: "Yom HaAtzma'ut", before: true, modern: true };
  if (ev.some((e) => /^Yom Yerushalayim/.test(e.d))) return { why: "Yom Yerushalayim", before: true, modern: true };
  if (m === months.IYYAR && d === 18) return { why: "Lag BaOmer", before: true };
  if (ev.some((e) => /^Tish'a B'Av/.test(e.d))) return { why: "Tisha B'Av", before: true };
  if (m === months.AV && d === 15) return { why: "Tu B'Av", before: true };
  if (m === months.NISAN) return { why: "Nisan", before: false };
  if (m === months.IYYAR && d === 14) return { why: "Pesach Sheni", before: false };
  if (m === months.SIVAN && d <= (il ? 12 : 8)) return { why: d >= 6 && d <= (il ? 6 : 7) ? "Shavuot" : "the days around Shavuot", before: false };
  if (m === months.TISHREI && d >= 9 && d <= (il ? 30 : 24)) return { why: d === 9 ? "Erev Yom Kippur" : d === 10 ? "Yom Kippur" : "the days of Sukkot", before: false };
  if (il && m === months.CHESHVAN && d === 1) return { why: "Rosh Chodesh", before: true };
  if (m === months.TISHREI && d <= 2) return { why: "Rosh HaShana", before: false };
  if (m === months.ELUL && d === 29) return { why: "Erev Rosh HaShana", before: false };
  if (ev.some((e) => e.f & flags.CHAG)) return { why: "a festival", before: false };
  return null;
}

/** A festival or Rosh HaShana tomorrow: Erev Yom Tov. */
function erevYomTov(next: HDate, il: boolean): boolean {
  return descs(next, il).some((e) => e.f & flags.CHAG) || (next.getMonth() === months.TISHREI && next.getDate() <= 2);
}

/** Whether Tachanun is said today at Shacharit and at Mincha (Shabbat: never). */
export function korenTachanun(hd: HDate, il: boolean, onShabbat = false): TachanunDay {
  // `onShabbat`: whether it would be said if this were a weekday. On Shabbat that decides Av
  // HaRachamim before Musaf and Tzidkatcha at Minha (Koren: "omitted on days when Taḥanun is not said").
  if (hd.getDay() === 6 && !onShabbat) return { shacharit: false, mincha: false, allCongs: true, modern: { shacharit: false, mincha: false }, why: "Shabbat" };
  const today = noTachanunDay(hd, il);
  const next = hd.next();
  const tomorrow = noTachanunDay(next, il);
  const erev = hd.getDay() === 5 || erevYomTov(next, il);
  const minchaFree = !!today || erev || (!!tomorrow && tomorrow.before);
  // Left out only because of a modern day: said where the person's custom says it.
  const modernOnly = (x: ReturnType<typeof noTachanunDay>) => !!x && !!x.modern;
  const shacharitModern = modernOnly(today);
  const minchaModern = !erev && (modernOnly(today) || (!today && modernOnly(tomorrow)));
  return {
    shacharit: !today || shacharitModern,
    mincha: !minchaFree || minchaModern,
    allCongs: !(today?.why === "Pesach Sheni" || shacharitModern || minchaModern),
    modern: { shacharit: shacharitModern, mincha: minchaModern },
    ...(today ? { why: today.why } : erev ? { why: hd.getDay() === 5 ? "Erev Shabbat" : "Erev Yom Tov" } : tomorrow?.before ? { why: `the afternoon before ${tomorrow.why}` } : {}),
    ...(!il && hd.getMonth() === months.SIVAN && hd.getDate() >= 9 && hd.getDate() <= 12 ? { customWindow: "sivan" as const } : {}),
    ...(!il && hd.getMonth() === months.TISHREI && hd.getDate() >= 25 ? { customWindow: "tishrei" as const } : {}),
  };
}
