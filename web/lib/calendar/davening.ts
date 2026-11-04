/*
 * What changes in the davening today, from the Hebrew calendar (Hebcal): Rosh Chodesh, Chanukah,
 * Purim, a fast, the Ten Days of Repentance, Chol HaMoed, the Omer, whether Tachanun and Hallel are
 * said, and the seasons for the rain phrases, by the dates the Koren siddur prints. Shown in the
 * Daven tab as RabbAI's reading of the calendar, not yet reviewed by the rabbinic board (founding
 * spec, open question 23). Server side; the result travels in the day summary.
 */

import { HDate, HebrewCalendar, flags, months } from "@hebcal/core";

export interface DaveningDay {
  /** 0 Sunday … 6 Shabbat, of the Hebrew day (after sunset, tomorrow's). */
  dow: number;
  israel: boolean;
  roshChodesh: boolean;
  chanukah: boolean;
  purim: boolean;
  fast: boolean;
  tishaBav: boolean;
  tenDays: boolean;
  shabbatShuva: boolean;
  cholHamoed: boolean;
  yomTov: boolean;
  /** Which festival it is (on Chol HaMoed too), or null. */
  festival: Festival | null;
  erevPesach: boolean;
  erevYomKippur: boolean;
  /** The 14th or 15th of Adar (Purim, Shushan Purim, or their days in the first Adar of a leap year). */
  adar1415: boolean;
  yomHaatzmaut: boolean;
  yomYerushalayim: boolean;
  /** The day after a festival, in Israel. */
  isruChag: boolean;
  /** "LeDavid HaShem Ori" (Psalm 27): from Rosh Chodesh Elul through Shemini Atzeret (in Israel, Hoshana Raba). */
  ledavid: boolean;
  /** Tonight's count of the Omer (1–49), when counting goes on tonight. */
  omerTonight?: number;
  tachanun: { shacharit: boolean; mincha: boolean; allCongs: boolean };
  /** 0 none, 1 half Hallel, 2 whole Hallel. */
  hallel: 0 | 1 | 2;
  /** "He makes the wind blow and the rain fall" (from Shemini Atzeret until Pesach). */
  mashivHaruach: boolean;
  /** "Grant dew and rain as a blessing" in the ninth blessing. */
  talUmatar: boolean;
}

export type Festival = "rosh-hashana" | "yom-kippur" | "sukkot" | "shemini-atzeret" | "pesach" | "shavuot";

/** The festival a date falls in, Chol HaMoed included (a second day only outside Israel). */
export function festivalOf(hd: HDate, israel: boolean): Festival | null {
  const m = hd.getMonth();
  const d = hd.getDate();
  if (m === months.TISHREI) {
    if (d === 1 || d === 2) return "rosh-hashana";
    if (d === 10) return "yom-kippur";
    if (d >= 15 && d <= 21) return "sukkot";
    if (d === 22 || (d === 23 && !israel)) return "shemini-atzeret";
  }
  if (m === months.NISAN && d >= 15 && d <= (israel ? 21 : 22)) return "pesach";
  if (m === months.SIVAN && (d === 6 || (d === 7 && !israel))) return "shavuot";
  return null;
}

function isLeapCivil(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Pesach of the Hebrew year a date is in (the year runs from Tishrei to Elul, so Pesach comes after its winter). */
function pesachOf(hd: HDate): HDate {
  return new HDate(15, months.NISAN, hd.getFullYear());
}

/**
 * The rain request in the ninth blessing, by the Koren siddur's dates: outside Israel from December
 * 5th (December 6th in the year before a civil leap year), in Israel from the 7th of Cheshvan, and
 * in both until Pesach.
 */
export function talUmatarSeason(hd: HDate, israel: boolean): boolean {
  const hy = hd.getFullYear();
  let start: HDate;
  if (israel) start = new HDate(7, months.CHESHVAN, hy);
  else {
    const fallYear = new HDate(1, months.TISHREI, hy).greg().getFullYear();
    start = new HDate(new Date(fallYear, 11, isLeapCivil(fallYear + 1) ? 6 : 5));
  }
  return hd.abs() >= start.abs() && hd.abs() < pesachOf(hd).abs();
}

/** "He makes the wind blow": from Shemini Atzeret (22 Tishrei) until the first day of Pesach. */
export function mashivSeason(hd: HDate): boolean {
  return hd.abs() >= new HDate(22, months.TISHREI, hd.getFullYear()).abs() && hd.abs() < pesachOf(hd).abs();
}

/**
 * Hallel, by the calendar: whole on Chanukah and the festivals (the first day or two of Pesach only),
 * half on Rosh Chodesh and the rest of Pesach. Yom HaAtzma'ut and Yom Yerushalayim are left to the
 * community's custom (DaveningDay.yomHaatzmaut, .yomYerushalayim), so they aren't counted here.
 */
export function hallelOf(hd: HDate, israel: boolean, roshChodesh: boolean, chanukah: boolean): 0 | 1 | 2 {
  const f = festivalOf(hd, israel);
  if (chanukah) return 2;
  if (f === "pesach") return hd.getDate() === 15 || (hd.getDate() === 16 && !israel) ? 2 : 1;
  if (f === "shavuot" || f === "sukkot" || f === "shemini-atzeret") return 2;
  if (roshChodesh && hd.getMonth() !== months.TISHREI) return 1;
  return 0;
}

/**
 * The day's facts. `afterSunset`: the Hebrew day has begun this evening, so tonight belongs to `hd`.
 */
export function daveningDay(hd: HDate, israel: boolean, afterSunset = false): DaveningDay {
  const events = HebrewCalendar.getHolidaysOnDate(hd, israel) ?? [];
  const has = (mask: number) => events.some((e) => (e.getFlags() & mask) !== 0);
  const desc = events.map((e) => e.getDesc());
  const month = hd.getMonth();
  const day = hd.getDate();
  const dow = hd.getDay();
  const purimMonth = HDate.isLeapYear(hd.getFullYear()) ? months.ADAR_II : months.ADAR_I;
  const tenDays = month === months.TISHREI && day >= 1 && day <= 10;
  // The Omer is counted at night, from the night after the first day of Pesach. Tonight's count is
  // the Hebrew day that begins this evening: after sunset that is `hd` itself.
  const tonight = hd.abs() + (afterSunset ? 0 : 1) - pesachOf(hd).abs();
  const t = HebrewCalendar.tachanun(hd, israel);
  const adarMonth: number[] = HDate.isLeapYear(hd.getFullYear()) ? [months.ADAR_I, months.ADAR_II] : [months.ADAR_I];
  // Isru Chag in Israel: the day after Pesach, Shavuot and Sukkot (Shemini Atzeret).
  const isru =
    israel && ((month === months.NISAN && day === 22) || (month === months.SIVAN && day === 7) || (month === months.TISHREI && day === 23));
  return {
    dow,
    israel,
    roshChodesh: has(flags.ROSH_CHODESH),
    chanukah: desc.some((d) => /^Chanukah/.test(d)),
    purim: month === purimMonth && day === 14,
    fast: (has(flags.MINOR_FAST) || has(flags.MAJOR_FAST)) && !has(flags.CHAG),
    tishaBav: desc.some((d) => /^Tish'a B'Av/.test(d)),
    tenDays,
    shabbatShuva: tenDays && dow === 6,
    cholHamoed: has(flags.CHOL_HAMOED),
    yomTov: has(flags.CHAG),
    festival: festivalOf(hd, israel),
    erevPesach: month === months.NISAN && day === 14,
    erevYomKippur: month === months.TISHREI && day === 9,
    adar1415: adarMonth.includes(month) && (day === 14 || day === 15),
    yomHaatzmaut: desc.some((d) => /^Yom HaAtzma/.test(d)),
    yomYerushalayim: desc.some((d) => /^Yom Yerushalayim/.test(d)),
    isruChag: isru,
    ledavid: month === months.ELUL || (month === months.TISHREI && day <= (israel ? 21 : 22)),
    ...(tonight >= 1 && tonight <= 49 ? { omerTonight: tonight } : {}),
    tachanun: { shacharit: t.shacharit, mincha: t.mincha, allCongs: t.allCongs },
    hallel: hallelOf(hd, israel, has(flags.ROSH_CHODESH), desc.some((d) => /^Chanukah/.test(d))),
    mashivHaruach: mashivSeason(hd),
    talUmatar: talUmatarSeason(hd, israel),
  };
}

/** Today's changes in plain words, for the top of the Daven tab. */
export function daveningNotes(d: DaveningDay): string[] {
  const notes: string[] = [];
  if (d.yomTov) notes.push("A festival: the festival prayers and Musaf.");
  if (d.roshChodesh) notes.push("Rosh Chodesh: Ya'aleh VeYavo in the Amidah and in Birkat HaMazon, and Musaf.");
  if (d.cholHamoed) notes.push("Chol HaMoed: Ya'aleh VeYavo in the Amidah and in Birkat HaMazon, and Musaf.");
  if (d.chanukah) notes.push("Chanukah: Al HaNissim in the Amidah and in Birkat HaMazon.");
  if (d.purim) notes.push("Purim: Al HaNissim in the Amidah and in Birkat HaMazon.");
  if (d.tenDays) notes.push("The Ten Days of Repentance: the additions the siddur marks for these days (Zochreinu, HaMelech HaKadosh).");
  if (d.fast && !d.tishaBav) notes.push("A fast day: Aneinu in the Amidah.");
  if (d.tishaBav) notes.push("Tisha B'Av: follow the siddur's order for the day.");
  if (d.yomHaatzmaut || d.yomYerushalayim)
    notes.push(`${d.yomHaatzmaut ? "Yom HaAtzma'ut" : "Yom Yerushalayim"}: many congregations say Hallel and leave out Tachanun. Follow your community's custom (Daven settings).`);
  if (d.hallel === 2) notes.push("Whole Hallel after the Amidah.");
  else if (d.hallel === 1) notes.push("Half Hallel after the Amidah.");
  const t = d.tachanun;
  if (d.dow !== 6) {
    if (!t.shacharit && !t.mincha) notes.push("No Tachanun today.");
    else if (t.shacharit && !t.mincha) notes.push("Tachanun at Shacharit, not at Mincha.");
    else if (!t.allCongs) notes.push("Some congregations don't say Tachanun today.");
  }
  notes.push(
    d.mashivHaruach
      ? "In the Amidah: Mashiv HaRuach (He makes the wind blow and the rain fall)."
      : d.israel
        ? "In the Amidah: Morid HaTal (He causes the dew to fall)."
        : "In the Amidah: no Mashiv HaRuach until Shemini Atzeret.",
  );
  notes.push(d.talUmatar ? "In the ninth blessing: VeTen Tal UMatar (grant dew and rain)." : "In the ninth blessing: VeTen Beracha (grant blessing).");
  if (d.omerTonight) notes.push(`Tonight: count day ${d.omerTonight} of the Omer.`);
  return notes;
}
