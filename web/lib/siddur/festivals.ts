/*
 * The festivals in "today's davening" (lib/siddur/today.ts): which parts of the festival services
 * are said today and at which service (the festival Amidah is shared by Ma'ariv, Shacharit and
 * Mincha), read from the siddurs' own instructions: the Koren siddur's English ones, and the Hebrew
 * directions Sefaria's Siddur Sefard and Edot HaMizrach print as lines ("ליום א' וב' דפסח:").
 *
 * Rules follow each siddur's own words; where they name a custom, the person's customs decide
 * (lib/siddur/tradition.ts). RabbAI's reading, for the rabbinic board (founding spec, open
 * question 23); the sources are in docs/davening-calendar-audit.md.
 */

import type { DaySummaryDavening } from "@/lib/calendar/place";
import type { DavenCustoms } from "./tradition";

export type Service = "shacharit" | "mincha" | "maariv" | "musaf";

/** Hebcal's month numbers. */
const NISAN = 1;
const SIVAN = 3;
const ELUL = 6;
const TISHREI = 7;

/** "He makes the wind blow" at this service: on the day it changes, by the service (Musaf of Shemini Atzeret; Musaf of the first day of Pesach). */
export function mashivAt(d: DaySummaryDavening, service: Service): boolean {
  if (d.rainChange === "starts") return service === "musaf" || service === "mincha";
  if (d.rainChange === "stops") return service === "maariv" || service === "shacharit";
  return d.mashivHaruach;
}

/**
 * The day's facts as seen at one service: on the day the rain phrase changes, the service decides
 * which is said, so the change is settled here and every rule reads an ordinary day.
 */
export function atService(d: DaySummaryDavening | undefined, service: Service): DaySummaryDavening | undefined {
  if (!d || !d.rainChange) return d;
  const { rainChange: _changes, ...rest } = d;
  return { ...rest, mashivHaruach: mashivAt(d, service) };
}

/** Facts about the festival day, from the Hebrew date. */
export function festivalFacts(d: DaySummaryDavening) {
  const { day, month } = d.hebDate ?? { day: 0, month: 0 };
  const il = d.israel;
  const pesach = d.festival === "pesach";
  const sukkot = d.festival === "sukkot";
  const pesachFirst = pesach && (day === 15 || (day === 16 && !il));
  const sukkotFirst = sukkot && (day === 15 || (day === 16 && !il));
  return {
    day,
    month,
    pesachFirst,
    pesachLast: pesach && !pesachFirst,
    sukkotFirst,
    sukkotChol: sukkot && !sukkotFirst,
    /** The day of Shavuot Ruth is read and Yizkor said: the second day (in Israel, the only one). */
    shavuotSecond: d.festival === "shavuot" && day === (il ? 6 : 7),
    shavuotFirst: d.festival === "shavuot" && day === 6,
    simchatTorah: month === TISHREI && day === (il ? 22 : 23),
    sheminiAtzeretDay: month === TISHREI && day === 22,
    lastOfPesach: pesach && day === (il ? 21 : 22),
    yizkorDay: (pesach && day === (il ? 21 : 22)) || (d.festival === "shavuot" && day === (il ? 6 : 7)) || (month === TISHREI && (day === 10 || day === 22)),
    talDay: month === NISAN && day === 15,
    geshemDay: month === TISHREI && day === 22,
    elul29: month === ELUL && day === 29,
    sivan: month === SIVAN,
  };
}

const said = (yes: boolean, reason: string, extra: Partial<FestivalRule> = {}): FestivalRule => ({ said: yes, reason, ...extra });

export interface FestivalRule {
  said: boolean;
  reason: string;
  /** How far it runs: "next" (one line), "self" (the note only), to a line matching a pattern, or to the next instruction (default). */
  span?: "next" | "self" | "heading" | "break" | { until: RegExp } | { through: RegExp };
  noteWhenSaid?: boolean;
  /** A note for another day: not counted as a prayer left out. */
  note?: boolean;
  /** Of the paragraphs under it, only this one is said today (in Israel, one day's offering of the two printed). */
  keep?: "first" | "second";
}

/** A Koren instruction in a festival service. */
export function festivalInstruction(text: string, d: DaySummaryDavening, customs: DavenCustoms, service: Service): FestivalRule | null {
  const f = festivalFacts(d);
  const shabbat = d.dow === 6;
  const note = (applies: boolean): FestivalRule => ({ said: applies, reason: "", span: "self", note: true });
  const throughContinue = { until: /^(On weekdays, continue|Continue with)/i };

  // The rain phrases in the festival Amidah and Musaf: settled by the service (atService).
  if (/^From Min[ḥh]a of Shemini Atzeret, through Sha[ḥh]arit on the first day of Pesa/i.test(text))
    return said(d.mashivHaruach, d.mashivHaruach ? "" : "Said from Shemini Atzeret until Pesach", { span: "next", noteWhenSaid: true });
  if (/^In Israel, on other Festivals:?$/i.test(text))
    return said((d.israel || customs.dew) && !d.mashivHaruach, d.mashivHaruach ? "Said in summer" : "Said in Israel (and outside it by Sefard and Sephardi custom)", { span: "next" });

  // The festival Amidah, shared by Ma'ariv, Shacharit and Mincha.
  if (/^On Motza.ei Shabbat:?$/i.test(text)) return said(service === "maariv" && d.dow === 0, "Said in Ma'ariv after Shabbat", { span: "next" });
  if (/^On Shabbat,? add the words in parentheses:?$/i.test(text)) return note(shabbat);
  if (/^In Sha[ḥh]arit, and in Israel in Shabbat Min[ḥh]a:?$/i.test(text))
    return said(service === "shacharit" || service === "musaf" || (d.israel && shabbat && service === "mincha"), "Said in Shacharit", { span: "next" });
  if (/^In Min[ḥh]a and Ma.ariv:?$/i.test(text))
    return said(!(service === "shacharit" || service === "musaf" || (d.israel && shabbat && service === "mincha")), "Said in Mincha and Ma'ariv", { span: "next" });
  if (/^During the Leader.s Repetition of Min[ḥh]a, turn to the Kedusha/i.test(text)) return note(service === "mincha");
  if (/^On Friday night, the service continues with/i.test(text)) return note(shabbat && service === "maariv");
  if (/^If the first night of Pesa[ḥh] falls on Shabbat/i.test(text)) return note(service === "maariv" && d.festival === "pesach" && f.day === 15);
  if (/^On the other Yamim Tovim, both in Min[ḥh]a and Ma.ariv/i.test(text)) return note(service !== "shacharit");
  if (/^On the last nights of Pesa[ḥh], the Omer/i.test(text)) return note(service === "maariv" && !!d.omerTonight);
  if (/^On Sim[ḥh]at Torah, both in Ma.ariv and Sha[ḥh]arit/i.test(text)) return note(f.simchatTorah && service !== "mincha");
  if (/^In Sha[ḥh]arit, continue with Full Hallel/i.test(text)) return note(service === "shacharit");
  if (/^If the first day of Pesa[ḥh] falls on Shabbat, then Shir HaShirim/i.test(text)) return note(service === "shacharit" && d.festival === "pesach");
  if (/^On the second day of Shavuot, Megillat R/i.test(text)) return note(service === "shacharit" && f.shavuotSecond);
  if (/^If the first day of Sukkot falls on Shabbat, then Kohelet/i.test(text)) return note(service === "shacharit" && (d.festival === "sukkot" || f.sheminiAtzeretDay));

  // Musaf for Festivals: the day's offerings.
  if (/^On the first day of Pesa[ḥh], the Leader begins the Repetition with .Prayer for Dew/i.test(text)) return note(f.talDay || f.geshemDay);
  if (/^On Shabbat [ḤH]ol HaMo.ed, the following paragraph is omitted/i.test(text)) return said(!(shabbat && d.cholHamoed), "Left out on Shabbat Chol HaMoed", { span: "next" });
  if (/^On [ḤH]ol HaMo.ed, turn to the Kedusha on the next page\. On Yom Tov/i.test(text))
    return said(d.yomTov || shabbat || d.hoshanaRaba, "Said on Yom Tov, Shabbat and Hoshana Raba", { span: "heading" });
  if (/^On Shabbat add:?$/i.test(text)) return said(shabbat, "Said on Shabbat", { span: "next" });
  if (/^On the first two days of Pesa[ḥh] say/i.test(text)) return said(f.pesachFirst, "Said on the first days of Pesach", { span: throughContinue });
  if (/^On the last six days of Pesa[ḥh] say/i.test(text)) return said(f.pesachLast, "Said on the last six days of Pesach", { span: throughContinue });
  if (/^On Shavuot say:?$/i.test(text)) return said(d.festival === "shavuot", "Said on Shavuot", { span: throughContinue });
  if (/^On the first two days of Sukkot say/i.test(text)) return said(f.sukkotFirst, "Said on the first days of Sukkot", { span: throughContinue });
  const chol = text.match(/^On the (first|second|third|fourth) day of [ḤH]ol HaMo.ed Sukkot, say the following two paragraphs/i);
  if (chol) {
    const j = ["first", "second", "third", "fourth"].indexOf(chol[1].toLowerCase()) + 1;
    const today = d.festival === "sukkot" && f.day === (d.israel ? 15 + j : 16 + j);
    return said(today, `Said on the ${chol[1].toLowerCase()} day of Chol HaMoed Sukkot`, { span: throughContinue, ...(d.israel ? { keep: "first" as const } : {}) });
  }
  if (/^On Hoshana Raba, say the following two paragraphs\. In Israel, say the first paragraph on the fifth day/i.test(text))
    return said(d.festival === "sukkot" && (f.day === 21 || (d.israel && f.day === 20)), "Said on Hoshana Raba", {
      span: throughContinue,
      ...(d.israel ? { keep: f.day === 20 ? ("first" as const) : ("second" as const) } : {}),
    });
  if (/^On Shemini Atzeret and Sim[ḥh]at Torah, say:?$/i.test(text)) return said(d.festival === "shemini-atzeret", "Said on Shemini Atzeret", { span: throughContinue });
  if (/^On Shabbat say:?$/i.test(text)) return said(shabbat, "Said on Shabbat");
  if (/^On weekdays, continue with .Our God and God of our ancestors/i.test(text)) return note(false);
  if (/^If Kohanim bless the congregation during the Leader.s Repetition, the following is said\. It is not said on [ḤH]ol HaMo/i.test(text))
    return said(d.yomTov && !d.israel, "Said on Yom Tov outside Israel, when the Kohanim bless", { span: { through: /^Continue with .We give thanks/i } });
  if (/^Outside Israel, if Kohanim bless the congregation during the Leader.s Repetition, the service continues/i.test(text)) return note(true);
  if (/^On Sukkot, Hoshanot \( ?page/i.test(text)) return note(d.festival === "sukkot");

  // Hallel.
  if (/^On Sukkot some say at this point Hoshanot/i.test(text)) return note(d.festival === "sukkot");
  if (/^On weekday [ḤH]anukk?a \(except Rosh/i.test(text)) return note(d.chanukah && !d.roshChodesh);
  if (/^On Rosh [ḤH]odesh and [ḤH]ol HaMo.ed, the service continues with the Reading of the Torah/i.test(text)) return note(d.roshChodesh || d.cholHamoed);
  if (/^Shabbat, Yom Tov, and Hoshana Raba, the service continues with the Reading/i.test(text)) return note(shabbat || d.yomTov || d.hoshanaRaba);
  if (/^On Shabbat [ḤH]ol HaMo.ed, the appropriate megill?a is read/i.test(text)) return note(shabbat && d.cholHamoed);
  if (/^On the second day of Shavuot, Megillat Ruth/i.test(text)) return note(f.shavuotSecond);
  if (/^On Sim[ḥh]at Torah, continue with Hakafot/i.test(text)) return note(f.simchatTorah);
  if (/^On Sukkot, the lulav and etrog are waved/i.test(text)) return note(d.festival === "sukkot" && !shabbat);

  // Kiddush and the sukka.
  if (/^On Motza.ei Shabbat, the following Havdala is added/i.test(text)) return said(d.dow === 0, "Said when Yom Tov begins as Shabbat ends", { span: { until: /^On Sukkot, say the following blessing|^The following blessing is omitted/i } });
  if (/^On Sukkot, say the following blessing\. On the first night/i.test(text)) return said(d.festival === "sukkot", "Said on Sukkot", { span: "next" });
  if (/^The following blessing is omitted on the last two nights of Pesa/i.test(text)) return said(!f.pesachLast, "Not said on the last nights of Pesach", { span: "next" });
  if (/^On other evenings Kiddush starts here/i.test(text)) return note(!shabbat);
  if (/^On Shabbat [ḤH]ol HaMo.ed, turn to page/i.test(text)) return note(shabbat && d.cholHamoed);
  if (/^On a Yom Tov that falls on Shabbat, (some )?start Kiddush here/i.test(text)) return said(shabbat, "Said when Yom Tov falls on Shabbat", { span: { until: /^On a Yom Tov that falls on a weekday|^On a Yom Tov that falls on Shabbat, some/i } });
  if (/^On a Yom Tov that falls on a weekday, start here/i.test(text)) return note(!shabbat);
  if (/^On the last day of Sukkot, on leaving the sukka/i.test(text)) return said(d.hoshanaRaba || f.sheminiAtzeretDay, "Said on leaving the sukka at the end of Sukkot", { span: "break" });
  if (/^On the first day the lulav is taken, add:?$/i.test(text)) return said(d.festival === "sukkot" && (f.day === 15 || (f.day === 16 && d.dow === 0)), "Said the first time the lulav is taken", { span: "next" });
  return null;
}

/** A heading in a festival service that names a service ("Kedusha for Shaḥarit"). */
export function festivalHeading(heading: string, d: DaySummaryDavening, service: Service): FestivalRule | null {
  if (/^Kedusha for Sha[ḥh]arit$/i.test(heading)) return said(service === "shacharit", "The Kedusha for Shacharit", { span: "heading" });
  if (/^Kedusha for Min[ḥh]a$/i.test(heading)) return said(service === "mincha", "The Kedusha for Mincha", { span: { until: /^When saying the Amida silently, continue here/i } });
  if (/^Kedusha for [ḥh]ol hamo.ed$/i.test(heading))
    return said(!(d.yomTov || d.dow === 6 || d.hoshanaRaba), "The Kedusha for Chol HaMoed", { span: { until: /^When saying the Amida silently, continue here/i } });
  return null;
}

/** Plain Hebrew, without vowels or marks. */
export function plainHebrew(he: string): string {
  return he.replace(/[֑-ׇ]/g, "").replace(/[״]/g, '"').replace(/[׳]/g, "'").replace(/[^א-ת"':, ]/g, " ").replace(/\s+/g, " ").replace(/\s+([:,])/g, "$1").trim();
}

/**
 * A Hebrew direction printed as a line in Sefaria's siddurim ("ליום א' וב' דפסח:", "למנחה:"):
 * whether the lines after it, until the next direction, are said today.
 */
export function festivalHebrew(he: string, d: DaySummaryDavening, customs: DavenCustoms, service: Service): FestivalRule | null {
  const t = plainHebrew(he).replace(/[״"]/g, '"').replace(/[׳']/g, "'");
  if (t.length > 70) return null;
  const f = festivalFacts(d);
  const shabbat = d.dow === 6;
  const toNext = { until: HEBREW_DIRECTION };
  // Which service.
  if (/^לערבית ולשחרית:?$/.test(t)) return said(service === "maariv" || service === "shacharit", "Said in Ma'ariv and Shacharit", { span: "next" });
  if (/^למנחה:?$/.test(t)) return said(service === "mincha", "Said in Mincha", { span: "next" });
  if (/^בשחרית אומרים:?$/.test(t)) return said(service === "shacharit", "Said in Shacharit", { span: "next" });
  if (/^במנחה אומרים:?$/.test(t)) return said(service === "mincha", "Said in Mincha", { span: "next" });
  if (/^(כשחל יו"ט במוצאי שבת אומרים ותודיענו|במוצאי שבת מוסיפים):?$/.test(t)) return said(service === "maariv" && d.dow === 0, "Said in Ma'ariv after Shabbat", { span: "next" });
  if (/^למוסף של חג, הושענא רבה, או שבת חוה"מ:?$/.test(t) || /^קדושה בחזרת הש"ץ במוסף של יו"ט/.test(t))
    return said(d.yomTov || shabbat || d.hoshanaRaba, "Said on Yom Tov, Shabbat and Hoshana Raba", { span: "next" });
  if (/^(למוסף של חוה"מ|בחזרת השץ במוסף של חול המועד אומרים):?$/.test(t)) return said(!(d.yomTov || shabbat || d.hoshanaRaba), "Said on Chol HaMoed", { span: "next" });
  // Psalms after the festival Ma'ariv (Edot HaMizrach).
  if (/^אם חל בשבת מוסיפים מזמור זה:?$/.test(t)) return said(shabbat, "Said when Yom Tov falls on Shabbat", { span: "next" });
  if (/^בפסח אומרים:?$/.test(t)) return said(d.festival === "pesach", "Said on Pesach", { span: "next" });
  if (/^בשבועות, סוכות, ושמיני עצרת אומרים:?$/.test(t)) return said(d.festival === "shavuot" || d.festival === "sukkot" || d.festival === "shemini-atzeret", "Said on Shavuot, Sukkot and Shemini Atzeret", { span: "next" });
  // The day's offerings in Musaf (Siddur Sefard).
  if (/^ליום א' וב' דפסח:?$/.test(t)) return said(f.pesachFirst, "Said on the first days of Pesach", { span: toNext });
  if (/^לשבועות:?$/.test(t)) return said(d.festival === "shavuot", "Said on Shavuot", { span: toNext });
  if (/^ליום א' וב' דסכות:?$/.test(t)) return said(f.sukkotFirst, "Said on the first days of Sukkot", { span: toNext });
  if (/^בחול המועד פסח ובשני ימים אחרונים של פ/.test(t)) return said(f.pesachLast, "Said on the last six days of Pesach", { span: toNext });
  if (/^בסוכות בחו"ל אומרים גם ספיקא דיומא/.test(t)) return { said: !d.israel && d.festival === "sukkot", reason: "", span: "self", note: true };
  const ch = t.match(/^ביום (ראשון|שני|שלישי|רביעי|חמישי) דחוה"מ סוכות באר"י:?$/);
  if (ch) {
    const k = ["ראשון", "שני", "שלישי", "רביעי", "חמישי"].indexOf(ch[1]) + 1;
    // In Israel the k-th day of Chol HaMoed (16 Tishrei is the first); outside Israel each day says two: its own and the next (ספיקא דיומא).
    const today = d.festival === "sukkot" && (d.israel ? f.day === 15 + k : f.day === 16 + k || f.day === 15 + k) && f.day >= (d.israel ? 16 : 17);
    return said(today, `Said on the ${["first", "second", "third", "fourth", "fifth"][k - 1]} day of Chol HaMoed Sukkot`, { span: toNext });
  }
  if (/^להושענא רבה:?$/.test(t)) return said(d.festival === "sukkot" && f.day === 21, "Said on Hoshana Raba", { span: toNext });
  if (/^לשמיני עצרת ולשמחת תורה:?$/.test(t)) return said(d.festival === "shemini-atzeret", "Said on Shemini Atzeret", { span: toNext });
  if (/^לשבת:?$/.test(t)) return said(shabbat, "Said on Shabbat", { span: "next" });
  if (/^בחזרת הש"ץ אומרים כאן ותערב:?$/.test(t)) return said(d.yomTov && !d.israel, "Said on Yom Tov outside Israel, when the Kohanim bless", { span: { until: /^ותחזינה/ } });
  if (/^ביום טוב אחרי החזרה אומרים/.test(t)) return { said: d.yomTov, reason: "", span: "self", note: true };
  if (/^בחול המועד אחרי קדיש/.test(t)) return { said: d.cholHamoed, reason: "", span: "self", note: true };
  if (/^בערבית ליל יום טוב, אחרי/.test(t)) return { said: service === "maariv", reason: "", span: "self", note: true };
  void customs;
  return null;
}

/** A short Hebrew line that is a direction ("לשבועות:", "ביום שני דחוה"מ סוכות באר"י:"), for a fold to stop at. */
export const HEBREW_DIRECTION = /^(ל|ב)[א-ת"' ,]{1,40}:\s*$|^בחול המועד פסח|^בסוכות בחו"ל|^ביום \S+ דחוה"מ|^להושענא רבה|^לשמיני עצרת|^לשבת/;

/** A whole festival prayer by its name, and whether it is said today. */
export function festivalSection(short: string, d: DaySummaryDavening, customs: DavenCustoms, section = ""): string | null {
  const f = festivalFacts(d);
  const shabbat = d.dow === 6;
  const s = short.toLowerCase();
  const regalim = d.festival === "pesach" || d.festival === "shavuot" || d.festival === "sukkot" || d.festival === "shemini-atzeret";
  if (/^amida for yom tov$/.test(s) || /Holidays, Maariv, Shacharit & Mincha Amidah$|Three Festivals, Amidah$/.test(section)) return regalim && d.yomTov ? null : "Said on the festivals (Pesach, Shavuot, Sukkot, Shemini Atzeret)";
  if (/^musaf for festivals$|^yom tov musaf amidah$/.test(s) || /Three Festivals, Mussaf$/.test(section)) return regalim && (d.yomTov || d.cholHamoed) ? null : "Said on the festivals and Chol HaMoed";
  if (/^yizkor$/.test(s)) {
    if (!f.yizkorDay) return "Said on the last day of Pesach, Shavuot (the second day outside Israel), Yom Kippur and Shemini Atzeret";
    if (!customs.yizkor) return "Your tradition says Hashkavah instead (Daven settings)";
    return null;
  }
  if (/^prayer for dew$/.test(s)) return f.talDay ? null : "Said on the first day of Pesach";
  if (/^prayer for rain$/.test(s)) return f.geshemDay ? null : "Said on Shemini Atzeret";
  if (/^akdamut$/.test(s)) {
    if (!f.shavuotFirst) return "Said on the first day of Shavuot";
    if (!customs.akdamut) return "Not said in your tradition: Akdamut (Daven settings)";
    return null;
  }
  if (/^blessing on taking the lulav$/.test(s)) return d.festival === "sukkot" && !shabbat ? null : "Said on Sukkot, except on Shabbat";
  if (/^hoshanot$/.test(s)) return d.festival === "sukkot" && !shabbat && !d.hoshanaRaba ? null : "Said on the weekdays of Sukkot";
  if (/^hoshanot for shabbat hol hamo.ed$/.test(s)) {
    if (!(d.festival === "sukkot" && shabbat)) return "Said on the Shabbat of Sukkot";
    if (!customs.hoshanotShabbat) return "Not said on Shabbat in your tradition (Daven settings)";
    return null;
  }
  if (/^hoshanot for hoshana raba$/.test(s)) return d.hoshanaRaba ? null : "Said on Hoshana Raba";
  if (/^hakafot for simhat torah$/.test(s)) return f.simchatTorah ? null : "Said on Simchat Torah";
  if (/^kiddush for yom tov evening$|^yom tov eve kiddush$/.test(s)) return regalim && d.yomTov ? null : "Said on the festivals";
  if (/^kiddush for yom tov morning$|^yom tov daytime kiddush$/.test(s)) return regalim && d.yomTov ? null : "Said on the festivals";
  if (/^on entering the sukka$|^prayer upon entering sukkah$/.test(s)) return d.festival === "sukkot" || f.sheminiAtzeretDay ? null : "Said on Sukkot";
  if (/^removal of hametz$/.test(s)) return f.month === NISAN && f.day >= 12 && f.day <= 14 ? null : "Said the night before Pesach and on Erev Pesach";
  if (/^eiruv tavshilin$/.test(s)) return null;
  if (/^annulment of vows before rosh hashana$/.test(s)) return f.month === ELUL && f.day >= 24 ? null : "Said on Erev Rosh HaShana";
  if (/^kiddush for rosh hashana (evening|day)$/.test(s)) return d.festival === "rosh-hashana" ? null : "Said on Rosh HaShana";
  if (/^tashlikh$/.test(s)) return d.festival === "rosh-hashana" || d.tenDays ? null : "Said on Rosh HaShana";
  if (/^kaparot$/.test(s)) return d.tenDays ? null : "Said before Yom Kippur";
  if (/^viduy for minha of erev yom kippur$/.test(s)) return d.erevYomKippur ? null : "Said at Mincha on Erev Yom Kippur";
  if (/^candle lighting for hanukk?a$/.test(s)) return d.chanukah ? null : "Said on Chanukah";
  if (/^service for purim$/.test(s)) return d.purim || d.adar1415 ? null : "Said on Purim";
  if (/^additions to sha[ḥh]arit for yom hazikaron$/.test(s)) return null;
  if (/^additions to (ma'ariv|sha[ḥh]arit) for yom haatzma.ut$/.test(s)) return d.yomHaatzmaut ? null : "Said on Yom HaAtzma'ut";
  if (/^yom yerushalayim$/.test(s)) return d.yomYerushalayim ? null : "Said on Yom Yerushalayim";
  if (/^seli[ḥh]ot for the tenth of tevet$/.test(s)) return d.fast && f.month === 10 ? null : "Said on the Tenth of Tevet";
  if (/^seli[ḥh]ot for the fast of esther$/.test(s)) return d.fast && (f.month === 12 || f.month === 13) ? null : "Said on the Fast of Esther";
  if (/^seli[ḥh]ot for the seventeenth of tammuz$/.test(s)) return d.fast && f.month === 4 ? null : "Said on the Seventeenth of Tammuz";
  // The Shabbat prayers in a Koren Shabbat-and-Yom-Tov service: on Yom Tov the festival's own are said.
  if (/^the amida for shabbat$/.test(s)) return shabbat && !d.yomTov ? null : d.yomTov ? "On Yom Tov, the festival Amidah is said" : "Said on Shabbat";
  if (/^musaf for shabbat$/.test(s)) return shabbat && !d.yomTov && !d.cholHamoed ? null : d.yomTov || d.cholHamoed ? "On festivals, Musaf for Festivals is said" : "Said on Shabbat";
  if (/^(kabbalat shabbat|kiddush and zemirot for shabbat (evening|morning)|se'uda shelishit for shabbat)$/.test(s)) return shabbat ? null : "Said on Shabbat";
  if (/^order of hoshanot$/.test(s)) return d.festival === "sukkot" ? null : "Said on Sukkot";
  return null;
}
