/*
 * Today's davening (components/Siddur.tsx, "Today" view): which parts of a siddur section aren't
 * said today, so they can be folded into one line the person can open. It works from the siddur's
 * own markings: the Koren siddur's instructions ("On Mondays and Thursdays…", "Omit on Rosh
 * Ḥodesh…"), its "On Ḥanukka:" and "Sunday:" labels, and the names of whole prayers (Taḥanun,
 * Avinu Malkenu, the Reading of the Torah). Nothing is ever removed: a folded part is a line that
 * opens it, with the reason.
 *
 * This is RabbAI's reading of the calendar and of the siddur's rules, not yet reviewed by the
 * rabbinic board (founding spec, open question 23), and the app says so wherever it is shown.
 * Customs that differ between communities are the person's own settings (DavenCustoms).
 */

import type { DaySummaryDavening } from "@/lib/calendar/place";
import { appliesToday, CONDITION_NAMES, type ConditionKey, type SiddurLine } from "./lines";

/** Customs that differ between communities, chosen in the Daven tab's settings. */
export interface DavenCustoms {
  /** Yom HaAtzma'ut and Yom Yerushalayim kept as days of thanksgiving: Hallel, and no Tachanun. */
  modernDays: boolean;
  /** In Israel, Viduy and the Thirteen Attributes before Tachanun (the Koren siddur: "some say"). */
  viduyIsrael: boolean;
  /** Outside Israel: no Tachanun through 12 Sivan (the days of Shavuot's make-up offerings). */
  sivan12?: boolean;
  /** Outside Israel: no Tachanun through the end of Tishrei. */
  tishreiEnd?: boolean;
}

export const DEFAULT_CUSTOMS: DavenCustoms = { modernDays: false, viduyIsrael: false, sivan12: false, tishreiEnd: false };

export type Service = "shacharit" | "mincha" | "maariv";

/** A run of lines (from, to: indexes into the section's lines) not said today. */
export interface Fold {
  from: number;
  to: number;
  /** In plain words, why it isn't said today. */
  reason: string;
}

export interface TodayPlan {
  /** The whole section isn't said today, and why. */
  whole?: string;
  folds: Fold[];
}

/** The service a section belongs to, by its name ("Minha for Weekdays", "Ma'ariv for Weekdays"). */
export function serviceOf(section: string): Service {
  if (/min[ḥh]a|mincha/i.test(section)) return "mincha";
  if (/ma['’]?ariv|arvit|maariv/i.test(section)) return "maariv";
  return "shacharit";
}

const modernDay = (d: DaySummaryDavening) => d.yomHaatzmaut || d.yomYerushalayim;

/** Whether Tachanun is said today at this service, with the person's custom for the modern days. */
export function tachanunToday(d: DaySummaryDavening, customs: DavenCustoms, service: Service): boolean {
  if (service === "maariv" || d.dow === 6) return false;
  const modern = d.tachanun.modern ? (service === "mincha" ? d.tachanun.modern.mincha : d.tachanun.modern.shacharit) : modernDay(d);
  if (customs.modernDays && modern) return false;
  if ((customs.sivan12 && d.tachanun.customWindow === "sivan") || (customs.tishreiEnd && d.tachanun.customWindow === "tishrei")) return false;
  return service === "mincha" ? d.tachanun.mincha : d.tachanun.shacharit;
}

/** Why there's no Tachanun today, as far as the calendar says. */
function noTachanunWhy(d: DaySummaryDavening): string {
  const named = [
    d.shulNoTachanun,
    d.tachanun.why,
    d.roshChodesh && "Rosh Chodesh",
    d.chanukah && "Chanukah",
    d.adar1415 && (d.purim ? "Purim" : "the 14th and 15th of Adar"),
    d.cholHamoed && "Chol HaMoed",
    d.erevPesach && "Erev Pesach",
    d.erevYomKippur && "Erev Yom Kippur",
    d.tishaBav && "Tisha B'Av",
    d.yomHaatzmaut && "Yom HaAtzma'ut",
    d.yomYerushalayim && "Yom Yerushalayim",
  ].filter(Boolean);
  return named.length ? ` (${named[0]})` : d.houseOfMourning ? " (a house of mourning)" : "";
}

/** The Torah is read on Mondays and Thursdays, Rosh Chodesh, Chol HaMoed, Chanukah, Purim and fast days. */
export function torahToday(d: DaySummaryDavening): boolean {
  // In Jerusalem `purim` is the 15th of Adar, so the reading follows the city.
  return d.dow === 1 || d.dow === 4 || d.roshChodesh || d.cholHamoed || d.chanukah || d.purim || d.fast;
}

/** Avinu Malkeinu: in the Ten Days of Repentance and on fast days (not Tisha B'Av), when Tachanun is said. */
export function avinuMalkeinuToday(d: DaySummaryDavening, customs: DavenCustoms, service: Service): boolean {
  if (d.dow === 6 || d.yomTov) return false;
  // On Erev Yom Kippur it is said only when it falls on Friday (Yom Kippur is then on Shabbat), at Shacharit.
  if (d.erevYomKippur) return service === "shacharit" && d.dow === 5;
  return (d.tenDays || (d.fast && !d.tishaBav)) && tachanunToday(d, customs, service);
}

/** Mizmor LeTodah isn't said on Erev Pesach, on Pesach (Chol HaMoed), or on Erev Yom Kippur. */
export function mizmorLetodahToday(d: DaySummaryDavening): boolean {
  return !(d.erevPesach || d.erevYomKippur || d.festival === "pesach" || d.yomTov || d.dow === 6);
}

/** Lamenatzei'ach (Psalm 20) is left out on the days the Koren siddur lists. */
export function lamenatzeachToday(d: DaySummaryDavening, customs: DavenCustoms): boolean {
  return !(
    d.roshChodesh ||
    d.cholHamoed ||
    d.erevPesach ||
    d.erevYomKippur ||
    d.chanukah ||
    d.adar1415 ||
    d.tishaBav ||
    d.houseOfMourning ||
    (d.israel && d.isruChag) ||
    (customs.modernDays && modernDay(d))
  );
}

export function hallelToday(d: DaySummaryDavening, customs: DavenCustoms): boolean {
  return d.hallel > 0 || (customs.modernDays && modernDay(d));
}

/** Plain words for the day of the week in a "Sunday:" label. */
const WEEKDAY: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };

/** The day of the week a "Sunday:" label names, or null. */
function weekdayOf(line: SiddurLine): number | null {
  const t = line.en[0]?.tag ?? line.he[0]?.tag;
  const tag = t?.text?.toLowerCase().replace(/^on /, "");
  if (tag && tag in WEEKDAY) return WEEKDAY[tag];
  // "On Sunday:" / "בראשון בשבת:" (Sefaria's siddurim), read through the tag's condition.
  const cond = t?.condition;
  if (cond && cond in WEEKDAY) return WEEKDAY[cond];
  // Edot HaMizrach: "מזמור ליום ראשון היום יום אחד בשבת קודש…".
  const he = line.he.map((p) => p.segs.map((x) => x.text).join("")).join(" ").replace(/[֑-ׇ]/g, "");
  const m = he.match(/^\s*מזמור ליום (ראשון|שני|שלישי|רביעי|חמישי|ששי)/);
  return m ? ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "ששי"].indexOf(m[1]) : null;
}

/**
 * A whole-line condition: the English names the time for the whole line ("On Rosh Ḥodesh and Ḥol
 * HaMo'ed, say: …"), or the line is one phrase for one time ("בחנוכה: עַל הַנִּסִּים…").
 */
export function lineCondition(line: SiddurLine): ConditionKey | null {
  if (line.kind !== "prayer") return null;
  const en0 = line.en[0]?.tag;
  const he0 = line.he[0]?.tag;
  if (en0?.kind === "when" && en0.condition && he0?.kind !== "when") return en0.condition;
  if (line.he.length === 1 && he0?.kind === "when" && he0.condition) return he0.condition;
  // "בחנוכה:" over the whole of Al HaNissim: the lines after the first carry no time of their own.
  if (he0?.kind === "when" && he0.condition && line.he.slice(1).some((p) => !p.tag)) return he0.condition;
  if (!line.he.length && line.en.length === 1 && en0?.kind === "when" && en0.condition) return en0.condition;
  return null;
}

/**
 * How far a rule's lines run from its instruction: to the next heading or instruction (the usual),
 * only the one line after it ("omit the next verse"), to the next heading, or to the first line
 * matching a pattern (that line not included).
 */
export type Span = "break" | "next" | "heading" | "self" | { until: RegExp } | { through: RegExp };

/** The reason given for an instruction folded on a day it doesn't apply to (not counted as a prayer left out). */
export const NOTE_FOR_ANOTHER_DAY = "A note for another day";

/** Bentching's opening psalm follows the day: "By the rivers of Babylon" on days with Tachanun. */
function tachanunDay(d: DaySummaryDavening): boolean {
  return d.dow !== 6 && !d.yomTov && (d.tachanun.shacharit || d.tachanun.mincha);
}

/** A Koren instruction that introduces lines said only on some days, and whether they are said today. */
export function instructionToday(
  text: string,
  d: DaySummaryDavening,
  customs: DavenCustoms,
  service: Service,
): { said: boolean; reason: string; span?: Span; noteWhenSaid?: boolean } | null {
  // The siddur breaks long instructions over lines; the rules read them as one line.
  text = text.replace(/\s+/g, " ").trim();
  const monThu = d.dow === 1 || d.dow === 4;
  if (/^On Mondays and Thursdays,? when Ta[ḥh]anun is said/i.test(text) || /^Sit upright\.?\s*On Mondays and Thursdays,? say the following/i.test(text))
    return { said: monThu, reason: "Said on Mondays and Thursdays" };
  if (/^On those Mondays and Thursdays when Ta[ḥh]anun is said/i.test(text))
    return { said: monThu && tachanunToday(d, customs, service), reason: "Said on Mondays and Thursdays when Tachanun is said" };
  if (/^Before taking the Torah out of the Ark, on Mondays and Thursdays/i.test(text))
    return { said: monThu && tachanunToday(d, customs, service) && !d.erevPesach, reason: "Said on Mondays and Thursdays when Tachanun is said" };
  // Only the psalm itself: "May the LORD's glory" after it is said every day.
  if (/^The following psalm recalls the thanksgiving-offering/i.test(text))
    return { said: mizmorLetodahToday(d), reason: "Not said on Erev Pesach, on Pesach, or on Erev Yom Kippur", span: "next" };
  if (/^Omit on Rosh [ḤH]odesh,? [ḤH]ol HaMo/i.test(text))
    return { said: lamenatzeachToday(d, customs), reason: `Left out today${noTachanunWhy(d)}` };
  if (/^On Rosh [ḤH]odesh,? the following psalm is said/i.test(text)) return { said: d.roshChodesh, reason: "Said on Rosh Chodesh" };
  if (/^(During the month of Elul|From the second day of Rosh [ḤH]odesh Elul)/i.test(text))
    return { said: d.ledavid, reason: "Said from Rosh Chodesh Elul through Shemini Atzeret" };
  if (/^Between Rosh HaShana and Yom Kippur, and on Hoshana Raba, many congregations open the Ark/i.test(text))
    return { said: d.tenDays || d.hoshanaRaba, reason: "Said between Rosh HaShana and Yom Kippur, and on Hoshana Raba" };
  // Koren prints the Israeli custom of Ein Keloheinu and Pitum HaKetoret every weekday; outside
  // Israel they are said on Shabbat.
  if (/^In Israel the following through .Bless the Lord/i.test(text))
    return { said: d.israel, reason: "Said every weekday in Israel", span: { until: /^In Israel during Elul|^In a house of mourning/i } };
  if (/^In Israel, on days when the Torah is not read, the person saying Kaddish adds/i.test(text))
    return { said: d.israel && !torahToday(d), reason: "Said in Israel on days the Torah isn't read", span: { until: /^In Israel during Elul|^In a house of mourning/i } };
  if (/^In Israel the service continues with Half Kaddish/i.test(text))
    return { said: !d.israel, reason: "Not said in Israel", span: "heading" };
  if (/^On days when Ta[ḥh]anun is said:?$/i.test(text)) return { said: tachanunDay(d), reason: "Said on days with Tachanun" };
  if (/^On days when Ta[ḥh]anun is omitted/i.test(text)) return { said: !tachanunDay(d), reason: "Said on Shabbat, festivals and days without Tachanun" };
  if (/^On Shabbat,? say:?$/i.test(text)) return { said: d.dow === 6, reason: "Said on Shabbat" };
  if (/^On Rosh [ḤH]odesh and Festivals,? say/i.test(text))
    return { said: d.roshChodesh || d.cholHamoed || d.yomTov, reason: "Said on Rosh Chodesh and festivals" };
  if (/^Between Rosh HaShana and Yom Kippur:?$/i.test(text)) return { said: d.tenDays, reason: "Said between Rosh HaShana and Yom Kippur" };
  if (/^On Fast Days:?$/i.test(text)) return { said: d.fast && !d.tishaBav, reason: "Said on fast days" };
  if (/^On Tisha B.Av,? omit the next verse/i.test(text)) return { said: !d.tishaBav, reason: "Left out on Tisha B'Av", span: "next" };
  // The siddur's directions for other days ("On fast days, turn to…"): folded on days they don't
  // apply to, so today's davening reads straight through. Only the note itself is folded.
  const note = (applies: boolean) => ({ said: applies, reason: NOTE_FOR_ANOTHER_DAY, span: "self" as const });
  if (/^On days when Ta[ḥh]anun is said \(see page/i.test(text)) return note(tachanunToday(d, customs, "shacharit"));
  if (/^On fast days \(except Tisha B.Av\) most congregations say Seli/i.test(text)) return note(d.fast && !d.tishaBav);
  if (/^Between Rosh HaShana and Yom Kippur \(but not on Erev Yom Kippur/i.test(text)) return note(avinuMalkeinuToday(d, customs, "shacharit"));
  if (/^On Rosh [ḤH]odesh, [ḤH]anukk?a, [ḤH]ol HaMo.ed, Yom HaAtzma/i.test(text)) return note(hallelToday(d, customs));
  if (/^On other days when Ta[ḥh]anun is not said/i.test(text)) return note(!tachanunToday(d, customs, "shacharit") && !hallelToday(d, customs));
  if (/^On Rosh [ḤH]odesh and [ḤH]ol HaMo.ed, the Leader says Half Kaddish/i.test(text)) return note(d.roshChodesh || d.cholHamoed);
  if (/^On other days, the Leader continues with Full Kaddish/i.test(text)) return note(!(d.roshChodesh || d.cholHamoed));
  if (/^In Israel during Elul, some congregations blow shofar/i.test(text)) return note((d.israel && d.ledavid) || !!d.houseOfMourning);
  if (/^On fast days, turn to Removing the Torah/i.test(text)) return note(d.fast);
  if (/^Between Rosh HaShana and Yom Kippur and on fast days, except days when Ta[ḥh]anun is not said/i.test(text))
    return note((d.tenDays || (d.fast && !d.tishaBav)) && tachanunToday(d, customs, "mincha"));
  if (/^On Motza.ei Shabbat/i.test(text)) return note(d.motzaei);
  if (/^\*?At this point, in times of drought in Israel/i.test(text)) return note(false);
  if (/^On Yom HaAtzma.ut \(in Israel and many communities outside Israel\) the service continues/i.test(text)) return note(d.yomHaatzmaut || !!d.omerTonight);
  if (/^On Shabbat, Yom Tov, Hoshana Raba, and \(in Israel/i.test(text)) return note(d.dow === 6 || d.yomTov || d.hoshanaRaba || d.yomHaatzmaut || d.yomYerushalayim);

  // Shabbat and Yom Tov services (2026-11-17 audit). Al HaNissim is printed in the Shabbat Ma'ariv
  // as a heading-like note, its paragraphs, and "Continue with 'For all these things.'"
  const weekdayYomTov = d.yomTov && d.dow !== 6;
  const modern = customs.modernDays && (d.yomHaatzmaut || d.yomYerushalayim);
  if (/^On [ḤH]anukk?a:?$/i.test(text)) return { said: d.chanukah, reason: "Said on Chanukah", span: { through: /^Continue with/i } };
  if (/^On Shushan Purim in Jerusalem:?$/i.test(text)) return { said: d.jerusalem && d.purim, reason: "Said on Shushan Purim in Jerusalem", span: { through: /^Continue with/i } };
  if (/^On Purim:?$/i.test(text)) return { said: d.purim, reason: "Said on Purim", span: { through: /^Continue with/i } };
  if (/^\*?On Shabbat Shuva outside Israel, many end the blessing/i.test(text)) return { said: d.shabbatShuva && !d.israel, reason: "Said on Shabbat Shuva, outside Israel", span: "next" };
  if (/^On Shabbat Shuva, many congregations open the Ark/i.test(text)) return { said: d.shabbatShuva, reason: "Said on Shabbat Shuva" };
  if (/^On Rosh [ḤH]odesh, [ḤH]ol HaMo.ed and [ḤH]anukk?a, the service continues with Hallel/i.test(text)) return note(hallelToday(d, customs));
  if (/^On Yom Tov( of the Three Festivals)?,? say:?$/i.test(text)) return { said: d.yomTov, reason: "Said on festivals" };
  if (/^On Yom Tov \(including one that falls on Shabbat\)/i.test(text)) return note(d.yomTov);
  if (/^On the first two nights of Pesa/i.test(text)) return note(d.festival === "pesach" && d.yomTov);
  if (/^On Yom Tov, say the Kiddush/i.test(text) || /^For Kiddush on Yom Tov/i.test(text)) return note(d.yomTov);
  if (/^From the second night of Pesa.*the Omer is counted here/i.test(text)) return note(!!d.omerTonight);
  if (/^On Hoshana Raba, Yom HaAtzma.ut and Yom Yerushalayim, the following psalm is said/i.test(text))
    return { said: d.hoshanaRaba || modern, reason: "Said on Hoshana Raba (and by custom on Yom HaAtzma'ut and Yom Yerushalayim)" };
  if (/^On Hoshana Raba, Yom HaAtzma.ut and Yom Yerushalayim, continue with the weekday service/i.test(text)) return note(d.hoshanaRaba || modern);
  if (/^On Yom Tov the Leader begins here/i.test(text)) return note(d.yomTov);
  if (/^On Shabbat the Leader begins here/i.test(text)) return note(d.dow === 6);
  if (/^If Yom Tov falls on a weekday continue with/i.test(text))
    return { said: !weekdayYomTov, reason: "Said on Shabbat", span: { until: /^If Yom Tov falls on a weekday continue here/i }, noteWhenSaid: true };
  if (/^If Yom Tov falls on a weekday continue here:?$/i.test(text)) return { said: weekdayYomTov, reason: "Said on a festival that falls on a weekday", span: { through: /^Continue with/i } };
  if (/^On Yom Tov, Motza.ei Yom Tov or Shabbat [ḤH]ol HaMo.ed, Kabbalat Shabbat begins here/i.test(text)) return note(d.yomTov || d.cholHamoed);
  if (/^The following is not said on Yom Tov, Shabbat [ḤH]ol HaMo.ed or Motza.ei Yom Tov/i.test(text))
    return { said: !(d.yomTov || d.cholHamoed), reason: "Not said on festivals or Shabbat Chol HaMoed", span: "heading" };
  if (/^On Shabbat, continue with .Blessed is the name/i.test(text)) return note(false);
  if (/^On Yom Tov \(except when it falls on Shabbat\) and on Hoshana Raba, say the following verses three times/i.test(text))
    return { said: weekdayYomTov || d.hoshanaRaba, reason: "Said on festivals that fall on a weekday and on Hoshana Raba", span: { until: /^On Shabbat, Yom Tov and Hoshana Raba/i } };
  if (/^On Yom Tov \(except on Shabbat\) continue, inserting/i.test(text)) return { said: weekdayYomTov, reason: "Said on festivals that fall on a weekday" };
  if (/^On Hoshana Raba continue:?$/i.test(text)) return { said: d.hoshanaRaba, reason: "Said on Hoshana Raba" };
  if (/^On Shabbat, Yom Tov and Hoshana Raba:?$/i.test(text)) return { said: d.dow === 6 || d.yomTov || d.hoshanaRaba, reason: "Said on Shabbat, festivals and Hoshana Raba" };
  if (/^On Shabbat, the congregation stands and, together with the Leader, says/i.test(text)) return { said: d.dow === 6, reason: "Said on Shabbat" };
  // Av HaRachamim before Musaf, and Tzidkatcha at Minha (Koren's own conditions; lib/calendar/davening.ts).
  if (/^The following is omitted on days when Ta[ḥh]anun is not said \(see page 144\)\. It is also omitted on a Shabbat before Rosh/i.test(text))
    return { said: d.dow !== 6 || d.avHarachamim, reason: "Not said this Shabbat (no Tachanun, Shabbat Mevarchim or a special Shabbat)", span: "next", noteWhenSaid: true };
  if (/^The following is omitted on days when Ta[ḥh]anun is not said \(see page 232\)/i.test(text))
    return { said: d.dow !== 6 || d.tzidkatcha, reason: "Not said this Shabbat (Tachanun wouldn't be said today)", noteWhenSaid: true };
  if (/^While the Torah scroll is being returned to the Ark, on Shabbat say/i.test(text)) return { said: d.dow === 6, reason: "Said on Shabbat" };
  if (/^On a Yom Tov occurring on a weekday say/i.test(text)) return { said: weekdayYomTov, reason: "Said on a festival that falls on a weekday" };
  if (/^On Yom Tov \(including Shabbat [ḤH]ol HaMo.ed\) say the Musaf for Festivals/i.test(text)) return note(d.yomTov || d.cholHamoed);
  if (/^On Yom Tov that falls on a weekday, say the appropriate Daily Psalm/i.test(text)) return note(weekdayYomTov);
  if (/^\(In Israel on Shabbat Rosh [ḤH]odesh, some say Barekhi Nafshi/i.test(text)) return note(d.israel && d.roshChodesh);
  if (/^On Rosh [ḤH]odesh, say Barekhi Nafshi on page/i.test(text)) return note(d.roshChodesh || d.chanukah);
  if (/^On Shabbat continue below\. On Yom Tov falling on a weekday/i.test(text)) return note(weekdayYomTov);
  if (/^Outside Israel:?$/i.test(text)) return { said: !d.israel, reason: "Said outside Israel" };
  if (/^In Israel:?$/i.test(text)) return { said: d.israel, reason: "Said in Israel" };
  if (/^Between Pesa.h and Shavuot the Omer is counted at this point/i.test(text)) return note(!!d.omerTonight);
  if (/^On [ḤH]anukk?a, the candles are lit at this point/i.test(text)) return note(d.chanukah);
  if (/^On Shabbat [ḤH]ol HaMo.ed Sukkot, if Kiddush is made in the sukka/i.test(text)) return { said: d.cholHamoed && d.festival === "sukkot", reason: "Said on Shabbat Chol HaMoed Sukkot" };
  if (/^Omit on Rosh [ḤH]odesh \(except on [ḤH]anukk?a\) and the last six days of Pesa/i.test(text))
    return { said: d.hallel !== 1, reason: "Left out in half Hallel", span: "next" };
  return null;
}

/**
 * A prayer line that the Koren siddur opens with its own note of when it is said ("*In times of
 * drought in Israel, add: …"), and whether it is said today. Only that line is folded.
 */
export function prayerLineToday(en: string, d: DaySummaryDavening): { said: boolean; reason: string } | null {
  const t = en.replace(/\s+/g, " ").replace(/^[\s*]+/, "");
  if (/^In times of drought in Israel/i.test(t)) return { said: false, reason: "Said in times of drought in Israel" };
  if (/^On Tisha B.Av all conclude as follows/i.test(t)) return { said: d.tishaBav, reason: "Said on Tisha B'Av" };
  if (/^At this point on fast days, the congregation adds/i.test(t)) return { said: d.fast, reason: "Said on fast days" };
  if (/^On public fast days only, the following is said by the Leader/i.test(t)) return { said: d.fast && !d.houseOfMourning, reason: "Said by the Leader on public fast days" };
  if (/^The following is said by the Leader during the Repetition of the Amida, except in a house of mourning and on Tisha B.Av/i.test(t))
    return { said: !d.tishaBav && !d.houseOfMourning, reason: d.tishaBav ? "Not said on Tisha B'Av" : "Not said in a house of mourning" };
  if (/^On Shabbat Shuva outside Israel, many end the blessing/i.test(t)) return { said: d.shabbatShuva && !d.israel, reason: "Said on Shabbat Shuva, outside Israel" };
  // Al HaNissim's second paragraph, printed as its own line.
  if (/^בימי מתתיהו/.test(t.replace(/[֑-ׇ]/g, ""))) return { said: d.chanukah, reason: "Said on Chanukah" };
  if (/^Between Rosh HaShana and Yom Kippur outside Israel, many end the blessing/i.test(t))
    return { said: d.tenDays && !d.israel, reason: "Said between Rosh HaShana and Yom Kippur, outside Israel" };
  if (/^A person undertaking a personal fast/i.test(t)) return { said: false, reason: "Said the day before a personal fast" };
  if (/^On Motza.ei Shabbat and Motza.ei Yom Tov add/i.test(t)) return { said: d.motzaei, reason: "Said after Shabbat and festivals" };
  return null;
}

/**
 * A prayer line known by its Hebrew opening, for siddurim that print the day's insertions without a
 * label (Sefaria's Siddur Ashkenaz, Sefard and Edot HaMizrach): Ya'aleh VeYavo, Al HaNissim, Aneinu.
 */
export function hebrewLineToday(he: string, d: DaySummaryDavening): { said: boolean; reason: string; span?: "next" } | null {
  const t = he.replace(/[֑-ׇ]/g, "").replace(/[^א-ת ]/g, " ").replace(/\s+/g, " ").trim();
  // A Hebrew direction over the next paragraph ("בשבת מוסיפים:", "בראש חודש ובחול המועד אומרים כאן…").
  if (/^בשבת (מוסיפים|אומרים)/.test(t)) return { said: d.dow === 6, reason: "Said on Shabbat", span: "next" };
  if (/^בראש חודש ובחול המועד (מוסיפים|אומרים)/.test(t)) return { said: d.roshChodesh || d.cholHamoed || d.yomTov, reason: "Said on Rosh Chodesh and festivals", span: "next" };
  if (/^בחנוכה (מוסיפים|אומרים)/.test(t)) return { said: d.chanukah, reason: "Said on Chanukah", span: "next" };
  if (/^בפורים (מוסיפים|אומרים)/.test(t)) return { said: d.purim, reason: "Said on Purim", span: "next" };
  if (/^(אלהינו ואלהי אבותינו )?יעלה ויבא/.test(t)) return { said: d.roshChodesh || d.cholHamoed || d.yomTov, reason: "Said on Rosh Chodesh and festivals" };
  if (/^על הנסים/.test(t)) return { said: d.chanukah || d.purim, reason: "Said on Chanukah and Purim" };
  if (/^בימי מתתיה/.test(t)) return { said: d.chanukah, reason: "Said on Chanukah" };
  if (/^בימי מרדכי/.test(t)) return { said: d.purim, reason: "Said on Purim" };
  if (/^עננו .{0,12}עננו ביום צום/.test(t)) return { said: d.fast, reason: "Said on fast days" };
  return null;
}

/** "ט"ז ניסן", "א אייר": the day of the Omer a Hebrew date label names. */
function omerDayOfDate(he: string): number | null {
  const m = he.replace(/[֑-ׇ]/g, "").trim().match(/^([א-ת"״'׳]{1,5})\s+(ניסן|אייר|סיון)$/);
  if (!m) return null;
  const V: Record<string, number> = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ל: 30 };
  const n = [...m[1]].reduce((sum, c) => sum + (V[c] ?? 0), 0);
  const day = m[2] === "ניסן" ? n - 15 : m[2] === "אייר" ? 15 + n : 44 + n;
  return day >= 1 && day <= 49 ? day : null;
}

/** The English of a prayer line, as printed. */
function lineEnglish(l: SiddurLine): string {
  return l.en.map((p) => (p.tag ? `${p.tag.text}: ` : "") + p.segs.map((x) => x.text).join("")).join(" ").trim();
}

/**
 * A section of a siddur that splits a prayer into parts (Sefaria's Siddur Ashkenaz, Sefard and Edot
 * HaMizrach: "Weekday, Shacharit, Post Amidah, Tachanun, Nefilat Apayim"), by the names on its path.
 */
function pathToday(section: string, d: DaySummaryDavening, customs: DavenCustoms): string | null {
  const parts = section.split(/,\s*/).slice(1).map((p) => p.trim().toLowerCase());
  const has = (re: RegExp) => parts.some((p) => re.test(p));
  const service: Service = has(/^min[ḥc]?hah?$|^weekday mincha$/) ? "mincha" : has(/^maariv$|^weekday maariv$|^arvit$/) ? "maariv" : "shacharit";
  const sephardi = /sefard|edot/i.test(section);
  if (has(/^ta(ḥ|ch|h)anun$/) && !tachanunToday(d, customs, service)) return `No Tachanun today${noTachanunWhy(d)}`;
  if (has(/^vidui( and 13 middot)?$/)) {
    // Sephardi and Hasidic siddurim say Viduy every day there is Tachanun; Ashkenaz, in Israel by custom.
    if (sephardi ? !tachanunToday(d, customs, service) : !(d.israel && customs.viduyIsrael && tachanunToday(d, customs, service))) return `No Viduy today${noTachanunWhy(d)}`;
  }
  if (has(/^avinu malk[ei]i?nu$/) && !avinuMalkeinuToday(d, customs, service)) return "Said in the Ten Days of Repentance and on fast days";
  if (has(/^torah reading for fast days?$/) && !d.fast) return "Read on fast days";
  if (has(/^(weekday|weekday shacharit)$/) && has(/^torah reading$/) && !torahToday(d)) return "The Torah is read on Mondays, Thursdays, Rosh Chodesh, Chol HaMoed, Chanukah, Purim and fast days";
  if (has(/^el erech app?ayim$/) && !((d.dow === 1 || d.dow === 4) && tachanunToday(d, customs, "shacharit") && !d.erevPesach)) return "Said on Mondays and Thursdays when Tachanun is said";
  if (has(/^lamenatze.?ach$/) && !lamenatzeachToday(d, customs)) return `Left out today${noTachanunWhy(d)}`;
  if (has(/^(weekday|weekday shacharit)$/) && has(/^barchi nafshi$/) && !d.roshChodesh) return "Said on Rosh Chodesh";
  if (has(/^ledavid$/) && !d.ledavid) return "Said from Rosh Chodesh Elul through Shemini Atzeret";
  if (has(/^(sefirat haomer|counting of the omer)$/) && !d.omerTonight) return "The Omer is counted from the second night of Pesach until Shavuot";
  if (has(/^rosh [ḥch]?odesh$/)) {
    if (has(/^hallel$/)) return hallelToday(d, customs) ? null : "Hallel is said on Rosh Chodesh, Chanukah and the festivals";
    if (!d.roshChodesh) return "Said on Rosh Chodesh";
  }
  if (has(/^hallel$/) && !hallelToday(d, customs)) return "Hallel is said on Rosh Chodesh, Chanukah and the festivals";
  return null;
}

/** A whole prayer said only on some days, by its name. */
function sectionToday(short: string, part: string, d: DaySummaryDavening, customs: DavenCustoms): string | null {
  const service = serviceOf(short);
  if (/^ta[ḥh]anun$/i.test(short) && !tachanunToday(d, customs, service)) return `No Tachanun today${noTachanunWhy(d)}`;
  if (/^viduy$/i.test(short) && /weekday/i.test(part) && !(d.israel && customs.viduyIsrael && tachanunToday(d, customs, "shacharit")))
    return "Said in Israel by some congregations, on days with Tachanun";
  if (/^avinu malk[ei]nu$/i.test(short) && !avinuMalkeinuToday(d, customs, "shacharit"))
    return "Said in the Ten Days of Repentance and on fast days";
  if (/^reading of the torah$/i.test(short) && /weekday/i.test(part) && !torahToday(d))
    return "The Torah is read on Mondays, Thursdays, Rosh Chodesh, Chol HaMoed, Chanukah, Purim and fast days";
  if (/^counting of the omer$/i.test(short) && !d.omerTonight) return "The Omer is counted from the second night of Pesach until Shavuot";
  if (/^hallel$/i.test(short) && !hallelToday(d, customs)) return "Hallel is said on Rosh Chodesh, Chanukah and the festivals";
  if (/^musaf for rosh [ḥh]odesh$/i.test(short) && !d.roshChodesh) return "Said on Rosh Chodesh";
  if (/^blessing the new month$/i.test(short) && !d.mevarchim) return "Said on the Shabbat before Rosh Chodesh";
  if (/^barekhi nafshi$/i.test(short) && /shabbat/i.test(part) && !d.barchiNafshi) return "Said at Shabbat Minha from after Simchat Torah until Shabbat HaGadol";
  const avot = short.match(/^ethics of the fathers (\d)$/i);
  if (avot && !(d.pirkeiAvot ?? []).includes(Number(avot[1])))
    return d.pirkeiAvot?.length ? `This week's chapter is ${d.pirkeiAvot.join(" and ")}` : "Read on the Shabbatot between Pesach and Rosh HaShana";
  return null;
}

/**
 * Today's plan for one section of a siddur: `part` is the part of the siddur it's in ("Weekdays"),
 * `short` its own name ("Tahanun"). Returns the whole section when it isn't said today, or the
 * runs of its lines that aren't.
 */
export function planToday(
  part: string,
  short: string,
  lines: SiddurLine[],
  d: DaySummaryDavening | undefined,
  customs: DavenCustoms,
  /** The section's full name ("Siddur Ashkenaz, Weekday, Shacharit, Post Amidah, Tachanun, Nefilat Apayim"), for siddurim that split a prayer into parts. */
  section?: string,
): TodayPlan {
  if (!d) return { folds: [] };
  const whole = sectionToday(short, part, d, customs) ?? (section ? pathToday(section, d, customs) : null);
  if (whole) return { whole, folds: [] };
  const service = serviceOf(short);
  const folds: Fold[] = [];
  // The Counting of the Omer prints each night's count as a line ("16 Nisan 1. Today is…"): only
  // tonight's stays open.
  if (/^(counting of the omer|sefirat haomer)$/i.test(short) && d.omerTonight) {
    // Each night's count is a block: its count line and the lines up to the next count (Edot
    // HaMizrach prints a date, then the count's kavana). The last block is as long as the one before.
    const counts = lines.map((l, i) => ({ i, n: omerDayOf(l) })).filter((x) => x.n !== null) as Array<{ i: number; n: number }>;
    const reason = `Other nights' counts (tonight is day ${d.omerTonight})`;
    counts.forEach((c, k) => {
      if (c.n === d.omerTonight) return;
      const size = k + 1 < counts.length ? counts[k + 1].i - c.i : k > 0 ? c.i - counts[k - 1].i : 1;
      const last = folds[folds.length - 1];
      if (last && last.to === c.i) last.to = c.i + size;
      else folds.push({ from: c.i, to: Math.min(lines.length, c.i + size), reason });
    });
    return { folds };
  }
  const isBreak = (l: SiddurLine) => l.kind === "heading" || l.kind === "instruction";
  const structured = lines.some(isBreak);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Mincha's Tachanun, under its own heading, runs to the Kaddish after it.
    if (l.kind === "heading" && /^ta[ḥh]anun$/i.test(l.heading?.en ?? "") && service === "mincha" && !tachanunToday(d, customs, "mincha")) {
      let j = i + 1;
      while (j < lines.length && !(lines[j].kind === "heading" && /kaddish|aleinu|alenu/i.test(lines[j].heading?.en ?? ""))) j++;
      folds.push({ from: i, to: j, reason: `No Tachanun today${noTachanunWhy(d)}` });
      i = j - 1;
      continue;
    }
    // "In a house of mourning and on Tisha B'Av omit the verse beginning 'As for Me'": that one verse,
    // a few lines further on.
    if (l.kind === "instruction" && l.instruction && /omit the verse beginning .As for Me/i.test(l.instruction)) {
      if (d.tishaBav || d.houseOfMourning) {
        const at = lines.findIndex((x, k) => k > i && k <= i + 6 && x.kind === "prayer" && /^ואני זאת בריתי/.test(plainHe(x)));
        if (at > 0) folds.push({ from: at, to: at + 1, reason: d.tishaBav ? "Left out on Tisha B'Av" : "Left out in a house of mourning" });
      } else folds.push({ from: i, to: i + 1, reason: NOTE_FOR_ANOTHER_DAY });
      continue;
    }
    // Musaf on Shabbat Rosh Chodesh: "Long ago You formed" replaces "You instituted the Sabbath".
    if (l.kind === "instruction" && /^On Shabbat Rosh [ḤH]odesh say .Long ago You formed/i.test(l.instruction ?? "")) {
      const rc = lines.findIndex((x, k) => k > i && x.kind === "prayer" && x.en[0]?.tag?.condition === "shabbatRoshChodesh");
      if (d.dow === 6 && d.roshChodesh && rc > i) {
        // The heading over both ("Holiness of the Day") stays.
        let from = i + 1;
        while (from < rc && lines[from].kind === "heading") from++;
        folds.push({ from: i, to: i + 1, reason: NOTE_FOR_ANOTHER_DAY });
        folds.push({ from, to: rc, reason: "On Shabbat Rosh Chodesh, “Long ago You formed” is said instead" });
        i = rc - 1;
      } else folds.push({ from: i, to: i + 1, reason: NOTE_FOR_ANOTHER_DAY });
      continue;
    }
    if (l.kind === "instruction" && l.instruction) {
      const rule = instructionToday(l.instruction, d, customs, service);
      if (rule && !rule.said) {
        const span = rule.span ?? "break";
        let j = i + 1;
        if (span === "next") j = Math.min(lines.length, i + 2);
        else if (span === "self") j = i + 1;
        else if (typeof span === "object" && "through" in span) {
          while (j < lines.length && !(lines[j].kind === "instruction" && span.through.test(lines[j].instruction ?? ""))) j++;
          if (j < lines.length) j++;
        }
        else if (span === "heading") while (j < lines.length && lines[j].kind !== "heading") j++;
        else if (span === "break") while (j < lines.length && !isBreak(lines[j])) j++;
        else if (typeof span === "object" && "until" in span) while (j < lines.length && !(lines[j].kind === "instruction" && span.until.test(lines[j].instruction ?? ""))) j++;
        folds.push({ from: i, to: j, reason: rule.reason });
        i = j - 1;
      } else if (rule?.span === "next" || rule?.noteWhenSaid) {
        // "On Tisha B'Av, omit the next verse": on other days the note itself isn't needed.
        folds.push({ from: i, to: i + 1, reason: NOTE_FOR_ANOTHER_DAY });
      }
      continue;
    }
    if (l.kind === "prayer") {
      // The Hebrew with its own labels ("בפורים: על הנסים…" is Purim's, not an unlabeled insertion).
      const rule = prayerLineToday(lineEnglish(l), d) ?? hebrewLineToday(l.he.map((p) => (p.tag ? `${p.tag.text} ` : "") + p.segs.map((x) => x.text).join("")).join(" "), d);
      if (rule) {
        if (!rule.said) {
          const to = "span" in rule && rule.span === "next" ? Math.min(lines.length, i + 2) : i + 1;
          folds.push({ from: i, to, reason: rule.reason });
          i = to - 1;
        }
        continue;
      }
      // "On Shabbat:" printed as a line of its own, over the passage after it.
      const tagOnly = l.en.length > 0 && l.en.every((p) => p.tag?.kind === "when" && !p.segs.some((x) => x.text.trim()));
      const cond = tagOnly ? l.en[0].tag?.condition : undefined;
      if (cond) {
        // To the next heading or instruction in a siddur that prints them (Koren); otherwise (Sefaria's
        // siddurim, with no breaks) only the paragraph under the label.
        let j = i + 1;
        if (structured) while (j < lines.length && !isBreak(lines[j]) && !(lines[j].en.length && lines[j].en.every((p) => p.tag?.kind === "when" && !p.segs.some((x) => x.text.trim())))) j++;
        else j = Math.min(lines.length, i + 2);
        if (appliesToday(cond, d) === false) {
          folds.push({ from: i, to: j, reason: `Said ${whenWords(cond)}` });
          i = j - 1;
        }
        continue;
      }
    }
    // "Sunday: Today is the first day…": the psalm of the day, with what follows it until the next day.
    const dow = weekdayOf(l);
    if (dow !== null) {
      let j = i + 1;
      while (j < lines.length && lines[j].kind !== "heading" && weekdayOf(lines[j]) === null && !lineCondition(lines[j]) && !(lines[j].kind === "instruction" && lines[j].instruction && instructionToday(lines[j].instruction!, d, customs, service))) j++;
      if (dow !== d.dow) folds.push({ from: i, to: j, reason: `Said on ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"][dow]}` });
      i = j - 1;
      continue;
    }
    const cond = lineCondition(l);
    if (cond && appliesToday(cond, d) === false) folds.push({ from: i, to: i + 1, reason: `Said ${whenWords(cond)}` });
  }
  return { folds };
}

/** A line's Hebrew without vowels or marks. */
function plainHe(l: SiddurLine): string {
  return l.he
    .map((p) => p.segs.map((x) => ("text" in x ? x.text : "")).join(""))
    .join(" ")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[^א-ת ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The night of the Omer a line of the count is for ("16 Nisan 1. Today is the first day…"). */
export function omerDayOf(line: SiddurLine): number | null {
  const en = line.en.map((p) => p.segs.map((s) => s.text).join("")).join(" ");
  // "16 Nisan 1. Today is…", "30 Nisan, 1st day Rosh Ḥodesh 15. Today is…", "27 Iyar 42.Today is…".
  const m = en.match(/^\s*\d{1,2}\s+[A-Z][a-z]+[^.]*?\s(\d{1,2})\.\s*Today is the\b/);
  if (m) return Number(m[1]);
  // Sefaria's siddurim: "ט"ז ניסן / 1. הַיּוֹם יוֹם אֶחָד בָּעֹמֶר" (Hebrew only).
  const he = plainHe(line).length ? line.he.map((p) => p.segs.map((x) => x.text).join("")).join(" ").replace(/[֑-ׇ]/g, "") : "";
  const h = he.match(/(?:^|\s)(\d{1,2})\.\s*היום/);
  if (h) return Number(h[1]);
  // Edot HaMizrach prints only the date over each night's count ("ט"ז ניסן").
  return omerDayOfDate(he.trim());
}

/** "on Rosh Chodesh", "in the Ten Days of Repentance": the time a condition names, for a reason. */
export function whenWords(cond: ConditionKey): string {
  const name = CONDITION_NAMES[cond];
  if (cond === "tenDays") return "in the Ten Days of Repentance";
  if (cond === "mashiv" || cond === "talUmatar") return "in winter";
  if (cond === "beracha") return "in summer";
  if (cond === "moridHatal") return "in summer, in Israel";
  if (cond === "israel") return "in Israel";
  if (cond === "jerusalem") return "on Shushan Purim in Jerusalem";
  if (cond === "fast") return "on fast days";
  return `on ${name}`;
}
