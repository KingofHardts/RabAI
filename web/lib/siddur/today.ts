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
}

export const DEFAULT_CUSTOMS: DavenCustoms = { modernDays: false, viduyIsrael: false };

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
  if (customs.modernDays && modernDay(d)) return false;
  return service === "mincha" ? d.tachanun.mincha : d.tachanun.shacharit;
}

/** Why there's no Tachanun today, as far as the calendar says. */
function noTachanunWhy(d: DaySummaryDavening): string {
  const named = [
    d.shulNoTachanun,
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
  const tag = line.en[0]?.tag?.text?.toLowerCase();
  return tag && tag in WEEKDAY ? WEEKDAY[tag] : null;
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
export type Span = "break" | "next" | "heading" | { until: RegExp };

/** Bentching's opening psalm follows the day: "By the rivers of Babylon" on days with Tachanun. */
function tachanunDay(d: DaySummaryDavening): boolean {
  return d.dow !== 6 && !d.yomTov && (d.tachanun.shacharit || d.tachanun.mincha);
}

/** A Koren instruction that introduces lines said only on some days, and whether they are said today. */
export function instructionToday(text: string, d: DaySummaryDavening, customs: DavenCustoms, service: Service): { said: boolean; reason: string; span?: Span } | null {
  const monThu = d.dow === 1 || d.dow === 4;
  if (/^On Mondays and Thursdays,? when Ta[ḥh]anun is said/i.test(text) || /^Sit upright\.?\s*On Mondays and Thursdays,? say the following/i.test(text))
    return { said: monThu, reason: "Said on Mondays and Thursdays" };
  if (/^On those Mondays and Thursdays when Ta[ḥh]anun is said/i.test(text))
    return { said: monThu && tachanunToday(d, customs, service), reason: "Said on Mondays and Thursdays when Tachanun is said" };
  if (/^Before taking the Torah out of the Ark, on Mondays and Thursdays/i.test(text))
    return { said: monThu && tachanunToday(d, customs, service) && !d.erevPesach, reason: "Said on Mondays and Thursdays when Tachanun is said" };
  if (/^The following psalm recalls the thanksgiving-offering/i.test(text))
    return { said: mizmorLetodahToday(d), reason: "Not said on Erev Pesach, on Pesach, or on Erev Yom Kippur" };
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
  if (/^Omit on Rosh [ḤH]odesh \(except on [ḤH]anukk?a\) and the last six days of Pesa/i.test(text))
    return { said: d.hallel !== 1, reason: "Left out in half Hallel", span: "next" };
  return null;
}

/**
 * A prayer line that the Koren siddur opens with its own note of when it is said ("*In times of
 * drought in Israel, add: …"), and whether it is said today. Only that line is folded.
 */
export function prayerLineToday(en: string, d: DaySummaryDavening): { said: boolean; reason: string } | null {
  const t = en.replace(/^[\s*]+/, "");
  if (/^In times of drought in Israel/i.test(t)) return { said: false, reason: "Said in times of drought in Israel" };
  if (/^On Tisha B.Av all conclude as follows/i.test(t)) return { said: d.tishaBav, reason: "Said on Tisha B'Av" };
  if (/^At this point on fast days, the congregation adds/i.test(t)) return { said: d.fast, reason: "Said on fast days" };
  if (/^On public fast days only, the following is said by the Leader/i.test(t)) return { said: d.fast && !d.houseOfMourning, reason: "Said by the Leader on public fast days" };
  if (/^The following is said by the Leader during the Repetition of the Amida, except in a house of mourning and on Tisha B.Av/i.test(t))
    return { said: !d.tishaBav && !d.houseOfMourning, reason: d.tishaBav ? "Not said on Tisha B'Av" : "Not said in a house of mourning" };
  if (/^Between Rosh HaShana and Yom Kippur outside Israel, many end the blessing/i.test(t))
    return { said: d.tenDays && !d.israel, reason: "Said between Rosh HaShana and Yom Kippur, outside Israel" };
  if (/^A person undertaking a personal fast/i.test(t)) return { said: false, reason: "Said the day before a personal fast" };
  if (/^On Motza.ei Shabbat and Motza.ei Yom Tov add/i.test(t)) return { said: d.motzaei, reason: "Said after Shabbat and festivals" };
  return null;
}

/** The English of a prayer line, as printed. */
function lineEnglish(l: SiddurLine): string {
  return l.en.map((p) => (p.tag ? `${p.tag.text}: ` : "") + p.segs.map((x) => x.text).join("")).join(" ").trim();
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
  return null;
}

/**
 * Today's plan for one section of a siddur: `part` is the part of the siddur it's in ("Weekdays"),
 * `short` its own name ("Tahanun"). Returns the whole section when it isn't said today, or the
 * runs of its lines that aren't.
 */
export function planToday(part: string, short: string, lines: SiddurLine[], d: DaySummaryDavening | undefined, customs: DavenCustoms): TodayPlan {
  if (!d) return { folds: [] };
  const whole = sectionToday(short, part, d, customs);
  if (whole) return { whole, folds: [] };
  const service = serviceOf(short);
  const folds: Fold[] = [];
  // The Counting of the Omer prints each night's count as a line ("16 Nisan 1. Today is…"): only
  // tonight's stays open.
  if (/^counting of the omer$/i.test(short) && d.omerTonight) {
    let run: number | null = null;
    lines.forEach((l, i) => {
      const n = omerDayOf(l);
      const other = n !== null && n !== d.omerTonight;
      if (other && run === null) run = i;
      if (!other && run !== null) {
        folds.push({ from: run, to: i, reason: `Other nights' counts (tonight is day ${d.omerTonight})` });
        run = null;
      }
    });
    if (run !== null) folds.push({ from: run, to: lines.length, reason: `Other nights' counts (tonight is day ${d.omerTonight})` });
    return { folds };
  }
  const isBreak = (l: SiddurLine) => l.kind === "heading" || l.kind === "instruction";
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
      }
      continue;
    }
    if (l.kind === "instruction" && l.instruction) {
      const rule = instructionToday(l.instruction, d, customs, service);
      if (rule && !rule.said) {
        const span = rule.span ?? "break";
        let j = i + 1;
        if (span === "next") j = Math.min(lines.length, i + 2);
        else if (span === "heading") while (j < lines.length && lines[j].kind !== "heading") j++;
        else if (span === "break") while (j < lines.length && !isBreak(lines[j])) j++;
        else while (j < lines.length && !(lines[j].kind === "instruction" && span.until.test(lines[j].instruction ?? ""))) j++;
        folds.push({ from: i, to: j, reason: rule.reason });
        i = j - 1;
      } else if (rule?.span === "next") {
        // "On Tisha B'Av, omit the next verse": on other days the note itself isn't needed.
        folds.push({ from: i, to: i + 1, reason: "A note for another day" });
      }
      continue;
    }
    if (l.kind === "prayer") {
      const rule = prayerLineToday(lineEnglish(l), d);
      if (rule) {
        if (!rule.said) folds.push({ from: i, to: i + 1, reason: rule.reason });
        continue;
      }
      // "On Shabbat:" printed as a line of its own, over the passage after it.
      const tagOnly = l.en.length > 0 && l.en.every((p) => p.tag?.kind === "when" && !p.segs.some((x) => x.text.trim()));
      const cond = tagOnly ? l.en[0].tag?.condition : undefined;
      if (cond) {
        let j = i + 1;
        while (j < lines.length && !isBreak(lines[j]) && !(lines[j].en.length && lines[j].en.every((p) => p.tag?.kind === "when" && !p.segs.some((x) => x.text.trim())))) j++;
        if (appliesToday(cond, d) === false) folds.push({ from: i, to: j, reason: `Said ${whenWords(cond)}` });
        i = j - 1;
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
  const m = en.match(/^\s*\d{1,2}\s+[A-Z][a-z]+\s+(\d{1,2})\.\s+Today/);
  return m ? Number(m[1]) : null;
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
