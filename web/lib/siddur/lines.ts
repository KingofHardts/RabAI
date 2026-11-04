/*
 * Reading a siddur's lines for the Daven tab (components/Siddur.tsx): which lines are headings
 * (the blessings of the Amidah), which are the siddur's own instructions (the Koren siddur prints
 * them in its English only), who says a phrase ("Leader:", "קהל:"), when a phrase is said ("On
 * Rosh Ḥodesh:", "בחורף:"), the siddur's marks for bowing, rising on the toes, striking the chest
 * and where the leader begins, and the places it prints two wordings with a slash: a man's and a
 * woman's ("מוֹדֶה/מוֹדָה"), or words said only at some times ("/בעשרת ימי תשובה: …/"). Nothing
 * here changes a word of the text: it only finds these parts so they can be shown clearly. Safe on
 * the device.
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
  | "jerusalem"
  | "pesach"
  | "sukkot"
  | "yomTov"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as const;

/** A plain name for each condition, for a reader who doesn't read the siddur's Hebrew label. */
export const CONDITION_NAMES: Record<ConditionKey, string> = {
  tenDays: "The Ten Days of Repentance",
  shabbatShuva: "Shabbat Shuva",
  roshChodesh: "Rosh Chodesh",
  roshChodeshOrCholHamoed: "Rosh Chodesh and Chol HaMoed",
  chanukah: "Chanukah",
  purim: "Purim",
  fast: "Fast days",
  shabbat: "Shabbat",
  israel: "In Israel",
  mashiv: "Winter",
  moridHatal: "Summer, in Israel",
  talUmatar: "Winter",
  beracha: "Summer",
  jerusalem: "Shushan Purim in Jerusalem",
  pesach: "Pesach",
  sukkot: "Sukkot",
  yomTov: "Yom Tov",
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
};

/** One way of saying a word or phrase, where the siddur prints two ("מוֹדֶה/מוֹדָה"). */
export interface AltOption {
  label: string;
  text: string;
}

/**
 * A piece of a line: text, one of the siddur's marks, a choice between two wordings (a man's and a
 * woman's, or for a man and for a woman), or words said only at some times
 * ("/בעשרת ימי תשובה: הַמֶּֽלֶךְ הַקָּדוֹשׁ./"). `text` always holds the words as printed.
 */
export type Seg =
  | { mark?: undefined; alt?: undefined; text: string }
  | { mark: MarkKind; alt?: undefined; text: string }
  | { alt: "gender"; mark?: undefined; text: string; options: AltOption[] }
  | { alt: "when"; mark?: undefined; text: string; label: string; words: string; condition?: ConditionKey }
  | { alt: "response"; mark?: undefined; text: string; who: string; words: string };

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

const NIQQUD = /[֑-ׇ]/g;

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
    "Men",
    "Women",
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
  const r = fold(rest.replace(NIQQUD, ""));
  if (/^(between rosh hashana (and|&) yom kippur(,.*)?|בעשרת ימי תשובה)$/.test(p)) return "tenDays";
  if (/^(on shabbat shuva(,.*)?|בשבת שובה)$/.test(p)) return "shabbatShuva";
  if (/^(on rosh hodesh|בראש חודש)$/.test(p)) return "roshChodesh";
  if (/^on (rosh hodesh|ראש חודש) and (hol hamo'ed|חול המועד)(, say)?$/.test(p)) return "roshChodeshOrCholHamoed";
  if (/^(on hanukka|בחנוכה)$/.test(p)) return "chanukah";
  if (/^(on purim|בפורים)$/.test(p)) return "purim";
  if (/^(on fast days( the leader adds)?|בתענית( ציבור)?)$/.test(p)) return "fast";
  if (/^(on shabbat|בשבת)$/.test(p)) return "shabbat";
  if (/^(on pesah|בפסח)$/.test(p)) return "pesach";
  if (/^(on sukkot|בסוכות)$/.test(p)) return "sukkot";
  if (/^(on yom tov|ביום טוב)$/.test(p)) return "yomTov";
  const weekday = WEEKDAYS.find((w) => w === p);
  if (weekday) return weekday;
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
    case "pesach":
      return d.festival === "pesach";
    case "sukkot":
      return d.festival === "sukkot";
    case "yomTov":
      return d.yomTov;
    default:
      return d.dow === WEEKDAYS.indexOf(key);
  }
}

/** Text split around the siddur's marks. */
function markSegments(text: string): Seg[] {
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

const lettersOf = (w: string) => w.replace(/[^א-ת]/g, "");
/** Pairs that are one word for a man and another for a woman, by their letters. */
const GENDER_PAIRS = new Set(["בן|בת"]);
/** Words the person praying says of themselves, so the choice is theirs: a man says one, a woman the other. */
const SPEAKER_WORDS = new Set(["מודה"]);

/**
 * Whether two printed words are one word, for a man and for a woman ("מוֹדֶה/מוֹדָה", "בֶּן/בַּת"):
 * the same letters, or the same but the last letter. "speaker" when it is the person praying.
 */
export function genderPair(a: string, b: string): "speaker" | "other" | null {
  const x = lettersOf(a);
  const y = lettersOf(b);
  if (x.length < 2 || y.length < 2) return null;
  const same = x === y || GENDER_PAIRS.has(`${x}|${y}`) || (x.length === y.length && x.length >= 3 && x.slice(0, -1) === y.slice(0, -1));
  if (!same) return null;
  return SPEAKER_WORDS.has(x) ? "speaker" : "other";
}

const HE_WORD = "[\\u05D0-\\u05EA][\\u0591-\\u05C7\\u05D0-\\u05EA]*";
/** "מוֹדֶה/מוֹדָה/": two forms of a word, the second slash optional. */
const GENDER_RE = new RegExp(`(${HE_WORD})/\\s?(${HE_WORD})/?`, "g");
/** "(קהל: אָמֵן)": the congregation's response, printed in parentheses inside the leader's words. */
const RESPONSE_RE = /\((קהל(?: וש"ץ)?|Cong\.?|All)\s*:\s*([^()]+?)\)/g;
/** "/בעשרת ימי תשובה: הַמֶּֽלֶךְ הַקָּדוֹשׁ./": words said only at some times, between slashes. */
const WHEN_RE = /\/\s*([^/:\n]{2,70}?):\s*([^/\n]+?)\s*\//g;

/**
 * A line of text split into its parts: the siddur's marks, a choice between a man's and a woman's
 * wording, and words said only at some times. Every word is kept exactly as printed.
 */
export function segments(text: string): Seg[] {
  type Found = { start: number; end: number; seg: Seg };
  const found: Found[] = [];
  for (const m of text.matchAll(WHEN_RE)) {
    const label = m[1].trim();
    const condition = conditionOf(label, m[2]);
    if (condition === undefined) continue;
    found.push({
      start: m.index,
      end: m.index + m[0].length,
      seg: { alt: "when", text: m[0], label, words: m[2].trim(), ...(condition ? { condition } : {}) },
    });
  }
  for (const m of text.matchAll(RESPONSE_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    if (found.some((f) => start < f.end && end > f.start)) continue;
    found.push({ start, end, seg: { alt: "response", text: m[0], who: m[1], words: m[2].trim() } });
  }
  for (const m of text.matchAll(GENDER_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    if (found.some((f) => start < f.end && end > f.start)) continue;
    const kind = genderPair(m[1], m[2]);
    if (!kind) continue;
    const labels = kind === "speaker" ? ["Men", "Women"] : ["For a man", "For a woman"];
    found.push({
      start,
      end,
      seg: { alt: "gender", text: m[0], options: [{ label: labels[0], text: m[1] }, { label: labels[1], text: m[2] }] },
    });
  }
  found.sort((a, b) => a.start - b.start);
  const out: Seg[] = [];
  let at = 0;
  for (const f of found) {
    if (f.start > at) out.push(...markSegments(text.slice(at, f.start)));
    out.push(f.seg);
    at = f.end;
  }
  if (at < text.length) out.push(...markSegments(text.slice(at)));
  return out;
}

/** "men: …" and "women: …" on two lines of the English, where the Hebrew prints the two with a slash. */
export function menAndWomen(en: string): boolean {
  return /^\s*men:/im.test(en) && /^\s*women:/im.test(en);
}

/** "Leader:", "קהל:", "On Rosh Ḥodesh:": a speaker or a time at the start of a printed line. */
const PREFIX_RE = /^\s*(\/?[^:\n֑-ׇ]{1,64}?):\s*(.*)$/s;
/** " / בארץ ישראל בקיץ: ": where the next time begins, inside the same line. */
const NEXT_WHEN_RE = /\s*\/\s*([^/:\n֑-ׇ]{2,64}?):\s*/g;

/** A line beginning with a time ("בחורף: … / בקיץ: …"), split where each next time begins. */
function whenPhrases(line: string): Phrase[] | null {
  const m = line.match(PREFIX_RE);
  if (!m) return null;
  const first = m[1].trim();
  if (ROLES.has(fold(first))) return null;
  const cond = conditionOf(first, m[2]);
  if (cond === undefined) return null;
  const out: Phrase[] = [];
  let prefix = first;
  let condition: ConditionKey | null = cond;
  let rest = m[2];
  for (;;) {
    const remaining = rest;
    const next = [...remaining.matchAll(NEXT_WHEN_RE)].find((x) => conditionOf(x[1].trim(), remaining.slice(x.index + x[0].length)) !== undefined);
    let words = next ? rest.slice(0, next.index) : rest;
    // "/בעשרת ימי תשובה: …/" on a line of its own: the closing slash goes with the opening one.
    if (prefix.startsWith("/")) words = words.replace(/\/\s*$/, "");
    out.push({ tag: { text: prefix.replace(/^\//, ""), kind: "when", ...(condition ? { condition } : {}) }, segs: segments(words) });
    if (!next) break;
    prefix = next[1].trim();
    rest = rest.slice(next.index + next[0].length);
    condition = conditionOf(prefix, rest) ?? null;
  }
  return out;
}

/**
 * Each printed line of a text, with its speaker or time pulled out. `menWomen`: the English prints
 * a men's line and a women's line here, so a Hebrew line with one " / " holds the two.
 */
export function phrases(text: string, menWomen = false): Phrase[] {
  // A doubled speaker in the source ("Leader:Leader:") is shown once.
  const clean = text.replace(/((?:Leader|Cong\.|All|Reader):)(?:\s*\1)+/g, "$1");
  return clean
    .split("\n")
    .filter((l) => l.trim())
    .flatMap((line): Phrase[] => {
      const when = whenPhrases(line);
      if (when) return when;
      const m = line.match(PREFIX_RE);
      if (m && ROLES.has(fold(m[1].trim()))) {
        const shown = m[1].trim().replace(/^\//, "");
        return [{ tag: { text: /^(men|women)$/i.test(shown) ? shown[0].toUpperCase() + shown.slice(1) : shown, kind: "role" }, segs: segments(m[2]) }];
      }
      if (menWomen && !line.includes(":")) {
        const halves = line.split(/\s+\/\s+/);
        if (halves.length === 2) {
          return [
            {
              segs: [
                {
                  alt: "gender",
                  text: line,
                  options: [
                    { label: "Men", text: halves[0] },
                    { label: "Women", text: halves[1] },
                  ],
                },
              ],
            },
          ];
        }
      }
      return [{ segs: segments(line) }];
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
  return { ref, kind: "prayer", he: phrases(he, menAndWomen(en)), en: phrases(en) };
}

/** The opening Hebrew words the Koren siddur puts before its English ("▾בָּרוּךְ Blessed are You…"), when the Hebrew is shown anyway. */
export function withoutHebrewOpening(segs: Seg[]): Seg[] {
  const first = segs.findIndex((s) => !s.mark && !s.alt);
  if (first < 0) return segs;
  const m = segs[first].text.match(/^[\s֐-׿"״׳'־\-]+(?=[A-Za-z“"(])/);
  if (!m || !/[א-ת]/.test(m[0])) return segs;
  // Marks before the opening words belong to the Hebrew, which shows them already.
  const rest = segs.slice(first + 1);
  const tail = segs[first].text.slice(m[0].length);
  return [...(tail ? [{ text: tail }] : []), ...rest];
}
