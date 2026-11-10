/*
 * The siddur, organized for davening: the order its prayers are said in, the names shown for them,
 * and an outline that groups them the way a person looks for them (the weekday morning in its
 * stages, Shabbat by its meals and services, the holidays by season).
 *
 * Nothing here changes a word of any siddur. The prayers are the library's; only the order they are
 * offered in, the headings over them and the spelling of their names in the app's own menus are
 * ours. Safe on the device.
 */

import { labelParts } from "../library/contents-tree";

/** Where the blessings over the Torah come in the morning. */
export type TorahBlessingsPlace =
  /** Just before the morning blessings, after the preparation for prayer (the usual place; the default). */
  | "before-morning-blessings"
  /** Where this siddur prints them. */
  | "as-printed";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .trim();

/** The Koren siddur's top headings: under one, the rest of the label is a prayer's whole name, commas and all. */
const ONE_LEVEL = /^(Weekdays|Shabbat|Festivals|Giving Thanks|The Cycle of Life|Torah Readings|Gates to Prayer)$/;

/**
 * The parts of a section's label: its headings, then its own name. A siddur that names its
 * prayers under one heading each (`oneLevel`, the Koren siddur) keeps a name that has a comma in
 * it whole ("Blessings on Pleasures, Sights and Sounds").
 */
export function partsOf(label: string, oneLevel = false): string[] {
  const parts = labelParts(label);
  if (oneLevel && parts.length > 2 && ONE_LEVEL.test(parts[0])) return [parts[0], label.slice(label.indexOf(",") + 1).trim()];
  return parts;
}

/** The last part of a section's label ("…, Weekdays, The Amida" -> "The Amida"). */
function shortOf(label: string, oneLevel = false): string {
  const parts = partsOf(label, oneLevel);
  return parts[parts.length - 1] ?? label;
}

/** The heading a section sits under: its label without its last part. */
function parentOf(label: string, oneLevel = false): string {
  return partsOf(label, oneLevel).slice(0, -1).join(", ");
}

/** Whether a siddur names its prayers under one heading each (the Koren siddur). */
export function isOneLevel(book: string): boolean {
  return /koren/i.test(book);
}

const TORAH_BLESSINGS = /^(blessings? (over|on|of) (the )?torah|torah blessings|birk(a|o)t ha ?torah)$/;
/** What is learned right after the blessing, which moves with it. */
const TORAH_STUDY = /^torah study$/;
const MORNING_BLESSINGS = /^(morning blessings|birk(a|o)t ha ?shachar)$/;

/**
 * The sections in the order they are davened. A siddur that prints the blessings over the Torah
 * early in the morning (the Koren siddur has them straight after waking, before tallit and
 * tefillin) has them moved to just before its morning blessings, after the preparation for prayer,
 * where most siddurim have them; `as-printed` leaves every siddur as it is. A siddur that already
 * has them beside or after the morning blessings is left alone.
 */
export function davenOrder<T extends { label: string }>(sections: T[], place: TorahBlessingsPlace = "before-morning-blessings"): T[] {
  if (place === "as-printed") return sections;
  const short = sections.map((s) => fold(shortOf(s.label)));
  const at = short.findIndex((n) => TORAH_BLESSINGS.test(n));
  if (at < 0) return sections;
  const parent = parentOf(sections[at].label);
  // The morning blessings under the same heading, later on, with something between the two.
  let target = -1;
  for (let i = at + 1; i < sections.length; i++) {
    if (parentOf(sections[i].label) !== parent) break;
    if (MORNING_BLESSINGS.test(short[i])) {
      target = i;
      break;
    }
  }
  let end = at + 1;
  while (end < sections.length && TORAH_STUDY.test(short[end]) && parentOf(sections[end].label) === parent) end++;
  if (target < 0 || target === end) return sections;
  const moved = sections.slice(at, end);
  return [...sections.slice(0, at), ...sections.slice(end, target), ...moved, ...sections.slice(target)];
}

/** Whether `davenOrder` moves anything in this siddur (so the setting is worth showing). */
export function movesTorahBlessings<T extends { label: string }>(sections: T[]): boolean {
  const moved = davenOrder(sections);
  return moved.some((s, i) => s !== sections[i]);
}

// ---------------------------------------------------------------------------------------------
// Names

/** Spellings the app uses everywhere (its buttons say Shacharit, Mincha, Maariv), word by word. */
const RESPELL: Array<[RegExp, string]> = [
  [/\bMinchah\b|\bMinha\b/g, "Mincha"],
  [/\bMa'?ariv\b/g, "Maariv"],
  [/\bShaharit\b/g, "Shacharit"],
  [/\bTahanun\b/g, "Tachanun"],
  [/\bAmida\b/g, "Amidah"],
  [/\bHavdala\b/g, "Havdalah"],
  [/\bHanukka\b|\bHanukkah\b/g, "Chanukah"],
  [/\bHametz\b/g, "Chametz"],
  [/\bSukka\b/g, "Sukkah"],
  [/\bHol HaMo'?ed\b/g, "Chol HaMoed"],
  [/\bRosh Hodesh\b/g, "Rosh Chodesh"],
  [/\bSimhat\b/g, "Simchat"],
  [/\bPesah\b/g, "Pesach"],
  [/\bSelihot\b/g, "Selichot"],
  [/\bTashlikh\b/g, "Tashlich"],
  [/\bMotza'ei\b/g, "Motzaei"],
  [/\bMila\b/g, "Milah"],
  [/\bHatan\b/g, "Chatan"],
  [/\bEiruvin\b/g, "Eruvin"],
  [/\bEiruv\b/g, "Eruv"],
  [/\bSe'uda\b/g, "Seuda"],
  [/\bViduy\b/g, "Vidui"],
  [/\bMussaf\b/g, "Musaf"],
  [/\bTefilin\b/g, "Tefillin"],
  [/\bTalit\b/g, "Tallit"],
];

/** Whole names that read better another way. Keys are folded. */
const RENAME: Record<string, string> = {
  "blessings over the torah": "Blessings over the Torah",
  "the amida": "The Amidah",
  "minha for weekdays": "Mincha",
  "maariv for weekdays": "Maariv",
  "shema before sleep at night": "Shema before sleep",
  "havdala at home": "Havdalah",
  "birkat hamazon; grace after meals": "Birkat HaMazon (Grace after Meals)",
  "blessings on pleasures, sights and sounds": "Blessings on food, sights and sounds",
  "the travelers prayer": "The Traveler's Prayer",
  "selihot; all days": "Selichot for every fast",
  "seuda shelishit for shabbat": "The third meal (Seuda Shelishit)",
  "maariv for motzaei shabbat": "Maariv after Shabbat",
  "a psalm before verses of praise": "A psalm before Pesukei DeZimra",
  "the interpretive principles of rabbi yishmael": "Rabbi Yishmael's thirteen principles",
  "accepting the sovereignty of heaven": "Accepting the sovereignty of Heaven",
  "piyutei geula; berah dodi": "Piyutei Geula: Berach Dodi",
};

/** What a name means, for names a newcomer may not know. Keys are folded display names. */
const GLOSS: Record<string, string> = {
  "pesukei dezimra": "Verses of praise",
  "pesukei dzimra": "Verses of praise",
  "tachanun": "Supplications",
  "vidui": "Confession",
  "the amidah": "The standing prayer (Shemoneh Esrei)",
  "amidah": "The standing prayer (Shemoneh Esrei)",
  "amida": "The standing prayer (Shemoneh Esrei)",
  "mincha": "The afternoon prayer",
  "maariv": "The evening prayer",
  "arvit": "The evening prayer",
  "kabbalat shabbat": "Welcoming Shabbat",
  "havdalah": "The close of Shabbat",
  "hallel": "Psalms of praise, on Rosh Chodesh and festivals",
  "musaf for rosh chodesh": "The additional prayer",
  "musaf for shabbat": "The additional prayer",
  "musaf for festivals": "The additional prayer",
  "avinu malkenu": "Our Father, our King: on fast days and the Ten Days",
  "offerings": "Korbanot",
  "the binding of isaac": "The Akedah",
  "eruvin": "Eruv for carrying, and for a Yom Tov before Shabbat",
  "eruv tavshilin": "Cooking for Shabbat on a Yom Tov",
  "birkat hamazon (grace after meals)": "After a meal with bread",
  "nishmat": "The soul of all that lives",
  "akdamut": "Read on Shavuot",
  "yizkor": "Remembering the departed",
  "tashlich": "By the water on Rosh HaShana",
  "kaparot": "Before Yom Kippur",
  "brit milah": "Circumcision",
  "pidyon haben": "Redeeming a firstborn son",
  "zeved habat": "Naming a daughter",
  "sheva berakhot": "The seven blessings after a wedding",
  "hoshanot": "On Sukkot",
};

/** A section's name as the app's menus show it: the siddur's own, in the app's spelling. */
export function displayName(name: string): string {
  const fixed = RENAME[fold(name)];
  if (fixed) return fixed;
  let out = name;
  for (const [re, to] of RESPELL) out = out.replace(re, to);
  const avot = /^Ethics of the Fathers (\d+)$/.exec(out);
  if (avot) return `Pirkei Avot, chapter ${avot[1]}`;
  const renamed = RENAME[fold(out)];
  return renamed ?? out.replace(/\s*;\s*/g, ": ");
}

/** A few words on what a prayer is, when its name may be unfamiliar. */
export function glossFor(display: string): string | undefined {
  return GLOSS[fold(display)];
}

// ---------------------------------------------------------------------------------------------
// The outline

export type CategoryId = "weekday" | "shabbat" | "holidays" | "blessings" | "life" | "readings" | "about" | "more";

export interface OutlineItem {
  section: string;
  /** The name shown. */
  title: string;
  /** The siddur's own name, when it differs. */
  own?: string;
  note?: string;
}

export interface OutlineGroup {
  title: string;
  note?: string;
  items: OutlineItem[];
}

export interface OutlineCategory {
  id: CategoryId;
  title: string;
  note: string;
  groups: OutlineGroup[];
  count: number;
}

const CATEGORIES: Array<{ id: CategoryId; title: string; note: string }> = [
  { id: "weekday", title: "Weekdays", note: "Morning, afternoon and evening" },
  { id: "shabbat", title: "Shabbat", note: "From candle lighting to Havdalah" },
  { id: "holidays", title: "Holidays and special days", note: "Rosh Chodesh, the festivals, fast days" },
  { id: "blessings", title: "Blessings", note: "After meals, on food, on the road" },
  { id: "life", title: "Life events", note: "From a birth to a house of mourning" },
  { id: "readings", title: "Torah readings", note: "For weekdays, festivals and fasts" },
  { id: "about", title: "About this siddur", note: "Introductions and the laws of prayer" },
  { id: "more", title: "More", note: "Other prayers in this siddur" },
];

/** Which category a section belongs to, by the siddur's own headings. */
export function categoryOf(label: string): CategoryId {
  const l = fold(label);
  const top = fold(labelParts(label)[0] ?? label);
  if (/^(preface|foreword|introduction|understanding jewish prayer|guide to the reader|gates to prayer)/.test(top)) return "about";
  if (/^torah readings?/.test(top)) return "readings";
  if (/cycle of life/.test(top)) return "life";
  if (/^(shabbat|third meal|daytime meal|havdalah|motzaei shabbat|song of songs|kabbalat shabbat|mishna study for shabbat|musaf$|mussaf$)/.test(top)) return "shabbat";
  if (
    /^(festivals?|rosh (ch|h)odesh|holidays?|nissan|pesach|sukkot|simchat torah|shavuot|yotzerot|ch?anukk?ah?|hanukkah|purim|fast days?|shaking lulav|lag baomer|priestly blessing|prayers for three festivals|eruv tavshilin)/.test(
      top,
    )
  )
    return "holidays";
  if (
    /^(weekdays?|upon arising|preparatory prayers|the midnight rite|additional prayers|additions for shacharit|bedtime shema|counting of the omer|sefirat haomer)/.test(top) ||
    /^weekday /.test(top)
  )
    return "weekday";
  if (/bless|berachot|birchat|birkat|mealtime|giving thanks|al hamihya|kiddush levanah|various prayers|post meal/.test(l)) return "blessings";
  return "more";
}

/** The stages of the weekday prayers, for a siddur that lists them in one run (the Koren siddur). */
const WEEKDAY_STAGES: Array<{ title: string; note?: string; re: RegExp }> = [
  { title: "Waking up and getting ready", re: /^(on waking|modeh ani|netilat yadayim|asher yatzar|elokai neshama|tzitzit|tallit|tefillin|preparation for prayer|ma tovu|adon olam|yigdal)$/ },
  {
    title: "Morning blessings and offerings",
    re: /^(blessings over the torah|torah blessings|torah study|morning blessings|the binding of isaac|akedah|accepting the sovereignty of heaven|offerings|the interpretive principles of rabbi yishmael|the rabbis kaddish)$/,
  },
  { title: "Pesukei DeZimra", note: "Verses of praise", re: /^(a psalm before verses of praise|pesukei dezimra)$/ },
  { title: "The Shema and the Amidah", re: /^(blessings of the shema|the amida)$/ },
  { title: "After the Amidah", re: /^(viduy|avinu malkenu|tahanun|reading of the torah)$/ },
  { title: "The end of Shacharit", re: /^(conclusion of the service|the daily psalm|readings after the service|personal supplications)$/ },
  { title: "Afternoon", note: "Mincha", re: /^minha for weekdays$/ },
  { title: "Evening", note: "Maariv", re: /^maariv for weekdays$/ },
  { title: "At night", re: /^(counting of the omer|shema before sleep at night)$/ },
];

const SHABBAT_STAGES: Array<{ title: string; re: RegExp }> = [
  { title: "Friday night", re: /^(eiruvin|candle lighting|kabbalat shabbat|maariv for shabbat and yom tov|kiddush and zemirot for shabbat evening)$/ },
  {
    title: "Shabbat morning",
    re: /^(shaharit for shabbat and yom tov|pesukei dezimra|nishmat|blessings of the shema|the amida for shabbat|reading of the torah|prayer for .*|blessing the new month|musaf for shabbat|kiddush and zemirot for shabbat morning)$/,
  },
  { title: "Shabbat afternoon", re: /^(minha for shabbat and yom tov|barekhi nafshi|ethics of the fathers \d+|seuda shelishit for shabbat)$/ },
  { title: "After Shabbat", re: /^(maariv for motzaei shabbat|blessing of the new moon|havdala at home)$/ },
];

const HOLIDAY_STAGES: Array<{ title: string; re: RegExp }> = [
  { title: "Rosh Chodesh", re: /^(hallel|musaf for rosh hodesh)$/ },
  { title: "Rosh HaShana and Yom Kippur", re: /(rosh hashana|tashlikh|kaparot|yom kippur|annulment of vows)/ },
  { title: "Chanukah and Purim", re: /(hanukka|purim)/ },
  { title: "Israel's days", re: /(yom hazikaron|yom haatzmaut|yom yerushalayim)/ },
  { title: "Fast days", re: /^selihot/ },
  { title: "Pesach, Shavuot and Sukkot", re: /./ },
];

/** The heading a section is listed under inside its category. */
function groupTitle(category: CategoryId, label: string, flat: boolean, oneLevel: boolean): { title: string; note?: string } {
  const parts = partsOf(label, oneLevel);
  const short = fold(parts[parts.length - 1] ?? label);
  if (flat) {
    // The siddur lists this whole category in one run: give it stages.
    const stages = category === "weekday" ? WEEKDAY_STAGES : category === "shabbat" ? SHABBAT_STAGES : category === "holidays" ? HOLIDAY_STAGES : [];
    const hit = stages.find((s) => s.re.test(short));
    if (hit) return { title: hit.title, ...("note" in hit && hit.note ? { note: hit.note as string } : {}) };
  }
  // Otherwise the siddur's own headings, without the part the category already says.
  const head = parts.slice(0, -1);
  const own = head.filter((p, i) => !(i === 0 && /^(weekdays?|shabbat|festivals?|giving thanks|the cycle of life|torah readings|gates to prayer)$/.test(fold(p))));
  return { title: own.map(displayName).join(" · ") };
}

/**
 * The siddur as an outline: categories, each with its headings, each with its prayers in the
 * order they are said. `sections` are in davening order (davenOrder), each with its label.
 */
export function siddurOutline(sections: Array<{ section: string; label: string }>, oneLevel = false): OutlineCategory[] {
  const byCat = new Map<CategoryId, Array<{ section: string; label: string }>>();
  for (const s of sections) {
    const c = categoryOf(s.label);
    byCat.set(c, [...(byCat.get(c) ?? []), s]);
  }
  const out: OutlineCategory[] = [];
  for (const cat of CATEGORIES) {
    const list = byCat.get(cat.id);
    if (!list?.length) continue;
    // Flat: the siddur gives these one heading for all of them (or none), so stages help.
    const heads = new Set(list.map((s) => parentOf(s.label, oneLevel)));
    const flat = heads.size <= 1 && list.length > 6;
    const groups: OutlineGroup[] = [];
    for (const s of list) {
      const own = shortOf(s.label, oneLevel);
      const title = displayName(own);
      const g = groupTitle(cat.id, s.label, flat, oneLevel);
      // Stages gather their prayers from wherever the siddur lists them; a siddur's own headings
      // stay in its order, so a prayer with no heading stays between the headings around it.
      let group = flat ? groups.find((x) => x.title === g.title) : groups[groups.length - 1]?.title === g.title ? groups[groups.length - 1] : undefined;
      if (!group) {
        group = { title: g.title, ...(g.note ? { note: g.note } : {}), items: [] };
        groups.push(group);
      }
      const note = glossFor(title);
      group.items.push({ section: s.section, title, ...(title !== own ? { own } : {}), ...(note ? { note } : {}) });
    }
    // Stages come in the order of the day, whatever order their first prayer was listed in.
    if (flat) {
      const stages = cat.id === "weekday" ? WEEKDAY_STAGES : cat.id === "shabbat" ? SHABBAT_STAGES : cat.id === "holidays" ? HOLIDAY_STAGES : [];
      const rank = (t: string) => {
        const i = stages.findIndex((s) => s.title === t);
        return i < 0 ? stages.length : i;
      };
      groups.sort((a, b) => rank(a.title) - rank(b.title));
    }
    out.push({ ...cat, groups, count: list.length });
  }
  return out;
}

/** Where a section sits in the outline: its category and heading ("Weekdays", "Morning blessings and offerings"). */
export function placeInOutline(outline: OutlineCategory[], section: string): { category: OutlineCategory; group: OutlineGroup; item: OutlineItem } | null {
  for (const category of outline)
    for (const group of category.groups) {
      const item = group.items.find((i) => i.section === section);
      if (item) return { category, group, item };
    }
  return null;
}
