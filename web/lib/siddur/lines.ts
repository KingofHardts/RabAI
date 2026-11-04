/*
 * Reading a siddur's lines for the Daven tab (components/Siddur.tsx): which lines are headings
 * (the blessings of the Amidah), which are the siddur's own instructions (the Koren siddur prints
 * them in its English only), who says a phrase ("Leader:", "קהל:"), when a phrase is said ("On
 * Rosh Ḥodesh:", "בחורף:"), and the siddur's marks for bowing, rising on the toes, striking the
 * chest and where the leader begins. Nothing here changes a word of the text: it only finds these
 * parts so they can be shown clearly. Safe on the device.
 */

import type { DaySummaryDavening } from "@/lib/calendar/place";

export type MarkKind = "bow" | "rise" | "strike" | "leader";

export const MARKS: Record<string, MarkKind> = { "▾": "bow", "▴": "rise", "°": "strike", "◂": "leader" };

/** What each mark asks, in the Koren siddur's own words where it explains them. */
export const MARK_WORDS: Record<MarkKind, { label: string; koren: string }> = {
  bow: { label: "Bow", koren: "At the points indicated by ▾, bend the knees at the first word, bow at the second, and stand straight before saying God’s name." },
  rise: { label: "Rise on your toes", koren: "Rising on the toes at the words indicated by ▴." },
  strike: { label: "Strike the chest", koren: "Strike the left side of the chest at °." },
  leader: { label: "The leader begins", koren: "A small arrow (◂) indicates the suggested starting point for the Shaliaḥ Tzibbur." },
};

export type Seg = { mark?: undefined; text: string } | { mark: MarkKind; text: string };

export type ConditionKey =
  | "tenDays"
  | "shabbatShuva"
  | "roshChodesh"
  | "roshChodeshOrCholHamoed"
  | "chanukah"
  | "purim"
  | "fast"
  | "shabbat"
  | "israel"
  | "mashiv"
  | "moridHatal"
  | "talUmatar"
  | "beracha"
  | "jerusalem";

export interface Phrase {
  /** A speaker ("Leader", "קהל") or a time ("On Rosh Ḥodesh"), as printed. */
  tag?: { text: string; kind: "role" | "when"; condition?: ConditionKey };
  segs: Seg[];
}

export interface SiddurLine {
  ref: string;
  kind: "heading" | "instruction" | "prayer";
  /** For a heading: its English in ordinary case ("Patriarchs") and its Hebrew. */
  heading?: { en: string; he: string };
  he: Phrase[];
  en: Phrase[];
  /** The plain words of an instruction. */
  instruction?: string;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/["״]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const ROLES = new Set(
  [
    "Leader",
    "All",
    "Mourner",
    "Cong.",
    "Cong",
    "Congregation",
    "Cong. then Leader",
    "Congregation followed by the Gabbai",
    "The congregation followed by the Gabbai",
    "Reader",
    "Oleh",
    "Quietly",
    "All say aloud",
    "Some add",
    "Some say",
    "The congregation responds",
    "The Leader continues",
    "The Leader says the following",
    "The Leader repeats",
    'ש"ץ',
    "קהל",
    "אבל",
    'קהל וש"ץ',
    "קהל ואבל",
    'קהל then ש"ץ',
    "עולה",
    "קורא",
    "קהל וקורא",
  ].map(fold),
);

/** The condition a "when" prefix names; the season words depend on the words that follow. */
export function conditionOf(prefix: string, rest: string): ConditionKey | null | undefined {
  const p = fold(prefix).replace(/^\//, "");
  // The words that follow, without Hebrew vowels, to tell the seasons apart.
  const r = fold(rest.replace(/[\u0591-\u05C7]/g, ""));
  if (/^(between rosh hashana (and|&) yom kippur|בעשרת ימי תשובה)$/.test(p)) return "tenDays";
  if (/^(on shabbat shuva|בשבת שובה)$/.test(p)) return "shabbatShuva";
  if (/^(on rosh hodesh|בראש חודש)$/.test(p)) return "roshChodesh";
  if (/^on (rosh hodesh|ראש חודש) and (hol hamo'ed|חול המועד)(, say)?$/.test(p)) return "roshChodeshOrCholHamoed";
  if (/^(on hanukka|בחנוכה)$/.test(p)) return "chanukah";
  if (/^(on purim|בפורים)$/.test(p)) return "purim";
  if (/^(on fast days( the leader adds)?|בתענית( ציבור)?)$/.test(p)) return "fast";
  if (/^(on shabbat|בשבת)$/.test(p)) return "shabbat";
  if (/^(on shushan purim in jerusalem|בשושן פורים בירושלים)$/.test(p)) return "jerusalem";
  if (/^(in israel, in spring and summer|בארץ ישראל בקיץ)$/.test(p)) return "moridHatal";
  if (/^(in israel|בארץ ישראל)$/.test(p)) return "israel";
  if (/^(in fall (and|&) winter|in winter|בחורף)$/.test(p)) {
    if (/wind|משיב|הרוח/.test(r)) return "mashiv";
    if (/rain and dew|dew and rain|טל ומטר/.test(r)) return "talUmatar";
    return null;
  }
  if (/^(in other seasons|in spring and summer|בקיץ)$/.test(p)) {
    if (/blessing|ברכה/.test(r)) return "beracha";
    return null;
  }
  return undefined;
}

/** Whether a condition holds today: undefined when the calendar can't tell (a place within Israel). */
export function appliesToday(key: ConditionKey, d: DaySummaryDavening | undefined): boolean | undefined {
  if (!d) return undefined;
  switch (key) {
    case "tenDays":
      return d.tenDays;
    case "shabbatShuva":
      return d.shabbatShuva;
    case "roshChodesh":
      return d.roshChodesh;
    case "roshChodeshOrCholHamoed":
      return d.roshChodesh || d.cholHamoed;
    case "chanukah":
      return d.chanukah;
    case "purim":
      return d.purim;
    case "fast":
      return d.fast;
    case "shabbat":
      return d.dow === 6;
    case "israel":
      return d.israel;
    case "mashiv":
      return d.mashivHaruach;
    case "moridHatal":
      return d.israel && !d.mashivHaruach;
    case "talUmatar":
      return d.talUmatar;
    case "beracha":
      return !d.talUmatar;
    case "jerusalem":
      return undefined;
  }
}

/** A line of text split around the siddur's marks. */
export function segments(text: string): Seg[] {
  const out: Seg[] = [];
  let buf = "";
  for (const ch of text) {
    const mark = MARKS[ch];
    if (mark) {
      if (buf) out.push({ text: buf });
      buf = "";
      out.push({ mark, text: ch });
    } else buf += ch;
  }
  if (buf) out.push({ text: buf });
  return out;
}

/** Each printed line of a text, with its speaker or time pulled out. */
export function phrases(text: string): Phrase[] {
  // A doubled speaker in the source ("Leader:Leader:") is shown once.
  const clean = text.replace(/((?:Leader|Cong\.|All|Reader):)(?:\s*\1)+/g, "$1");
  return clean
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const m = line.match(/^\s*(\/?[^:\n֑-ׇ]{1,64}?):\s*(.*)$/s);
      if (m) {
        const prefix = m[1].trim();
        const rest = m[2];
        if (ROLES.has(fold(prefix))) return { tag: { text: prefix.replace(/^\//, ""), kind: "role" as const }, segs: segments(rest) };
        const cond = conditionOf(prefix, rest);
        if (cond !== undefined) {
          return {
            tag: { text: prefix.replace(/^\//, ""), kind: "when" as const, ...(cond ? { condition: cond } : {}) },
            segs: segments(rest),
          };
        }
      }
      return { segs: segments(line) };
    });
}

/** "PATRIARCHS" -> "Patriarchs", "DIVINE MIGHT" -> "Divine Might". */
function ordinaryCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-'’(])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

/** A heading: short capital English ("PATRIARCHS") with a short Hebrew ("אבות"). */
export function isHeading(he: string, en: string): boolean {
  const e = en.trim();
  return e.length >= 3 && e.length <= 48 && !/\n/.test(e) && /[A-Z]{3}/.test(e) && e === e.toUpperCase() && !/[a-z]/.test(e) && he.trim().length <= 40 && !/\n/.test(he.trim());
}

/**
 * A siddur line read for davening. `instructions`: the book prints its instructions in English only
 * (the Koren siddur), so an English line without Hebrew is an instruction.
 */
export function readLine(ref: string, he: string, en: string, instructions: boolean): SiddurLine {
  if (en && isHeading(he, en)) return { ref, kind: "heading", heading: { en: ordinaryCase(en.trim()), he: he.trim() }, he: [], en: [] };
  if (instructions && !he.trim() && en.trim()) return { ref, kind: "instruction", instruction: en.trim(), he: [], en: phrases(en) };
  return { ref, kind: "prayer", he: phrases(he), en: phrases(en) };
}

/** The opening Hebrew words the Koren siddur puts before its English ("▾בָּרוּךְ Blessed are You…"), when the Hebrew is shown anyway. */
export function withoutHebrewOpening(segs: Seg[]): Seg[] {
  const first = segs.findIndex((s) => !s.mark);
  if (first < 0) return segs;
  const m = segs[first].text.match(/^[\s֐-׿"״׳'־\-]+(?=[A-Za-z“"(])/);
  if (!m || !/[א-ת]/.test(m[0])) return segs;
  // Marks before the opening words belong to the Hebrew, which shows them already.
  const rest = segs.slice(first + 1);
  const tail = segs[first].text.slice(m[0].length);
  return [...(tail ? [{ text: tail }] : []), ...rest];
}
