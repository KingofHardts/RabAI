/*
 * Learning the person's customs as they daven (lib/siddur/tradition.ts). When they open a prayer
 * that today's davening left out because of a custom, the siddur asks whether they say it on days
 * like today, and remembers only when they say so. This finds the custom behind a reason.
 */

import type { DaySummaryDavening } from "@/lib/calendar/place";
import type { CustomKey, DavenCustoms } from "./tradition";

export interface CustomQuestion {
  key: CustomKey;
  /** The value that would show what they opened. */
  value: boolean | string;
  /** The question, in plain words. */
  ask: string;
}

/** The custom that left out what the person opened, and the question to ask; null when no custom decided it. */
export function customBehind(reason: string, d: DaySummaryDavening | undefined, customs: DavenCustoms): CustomQuestion | null {
  if (!d) return null;
  if (/^No Tachanun today/.test(reason)) {
    if (customs.sivan12 && d.tachanun.customWindow === "sivan") return { key: "sivan12", value: false, ask: "Do you say Tachanun from 9 to 12 Sivan?" };
    if (customs.tishreiEnd && d.tachanun.customWindow === "tishrei") return { key: "tishreiEnd", value: false, ask: "Do you say Tachanun at the end of Tishrei?" };
    if (customs.pesachSheni && d.tachanun.why === "Pesach Sheni") return { key: "pesachSheni", value: false, ask: "Do you say Tachanun on Pesach Sheni?" };
    if (customs.modernDays && (d.yomHaatzmaut || d.yomYerushalayim)) return { key: "modernDays", value: false, ask: "Do you say Tachanun today?" };
    if (customs.chabadDays && (d.hebDate?.month === 9 || d.hebDate?.month === 4)) return { key: "chabadDays", value: false, ask: "Do you say Tachanun on the Chabad days (10 and 19 Kislev, 12 Tammuz)?" };
    if (customs.noMinchaTachanun) return { key: "noMinchaTachanun", value: false, ask: "Do you say Tachanun at Mincha?" };
    return null;
  }
  if (/^(No Viduy today|Said in Israel by some congregations)/.test(reason) && !customs.viduyDaily) return { key: "viduyDaily", value: true, ask: "Do you say Viduy before Tachanun every day?" };
  if (/^Said every weekday in Israel/.test(reason) && !customs.pitumDaily) return { key: "pitumDaily", value: true, ask: "Do you say Ein Keloheinu and Pitum HaKetoret every day?" };
  if (/^Left out when a festival falls in the coming week/.test(reason) && !customs.vihiNoamAlways) return { key: "vihiNoamAlways", value: true, ask: "Do you say Vihi No'am even when a festival falls in the week?" };
  if (/Hashkavah instead/.test(reason) && !customs.yizkor) return { key: "yizkor", value: true, ask: "Do you say Yizkor?" };
  if (/^Not said in your tradition: Av HaRachamim/.test(reason)) return { key: "avHarachamim", value: true, ask: "Do you say Av HaRachamim before Musaf?" };
  if (/^Not said in your tradition: Akdamut/.test(reason)) return { key: "akdamut", value: true, ask: "Do you say Akdamut on Shavuot?" };
  if (/^Not said in your tradition: Barekhi Nafshi/.test(reason)) return { key: "barchiNafshi", value: true, ask: "Do you say Barekhi Nafshi on winter Shabbat afternoons?" };
  if (/^Not said on Shabbat in your tradition/.test(reason)) return { key: "hoshanotShabbat", value: true, ask: "Do you say Hoshanot on Shabbat?" };
  if (/^Said from Rosh Chodesh Elul through Shemini Atzeret/.test(reason) && customs.ledavid !== "all-year") return { key: "ledavid", value: "all-year", ask: "Do you say LeDavid HaShem Ori all year?" };
  return null;
}
