/*
 * Finding a prayer, not a book: "Mincha", "bentching", "Shema before bed" are sections inside the
 * siddurs, and "davening" or "zmanim" aren't book names at all. The Learn search uses this to put
 * the siddur's own sections, the siddurs themselves, or today's times above the books. Names are
 * matched in the spellings people use (Ashkenazi and Sephardi, English names). Safe on the device.
 */

import type { ContentsNode } from "./contents-tree";

/** Lower case, accents and apostrophes gone, "kh" read as "ch", spaces tidied. */
export function foldPrayer(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`ʼ"]/g, "")
    .replace(/[-_.,:;!?()/]/g, " ")
    .replace(/kh/g, "ch")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prayers and their names. The first name is how the siddurs in the library title it; the rest
 * are the other ways people say it. Each is folded before matching.
 */
const PRAYERS: string[][] = [
  ["Shacharit", "shacharis", "shaharit", "schacharit", "shachris", "morning prayer", "morning prayers", "morning service"],
  ["Mincha", "minchah", "minha", "afternoon prayer", "afternoon prayers", "afternoon service"],
  ["Maariv", "arvit", "arvis", "maariv", "evening prayer", "evening prayers", "evening service"],
  ["Musaf", "mussaf", "musof"],
  ["Birkat HaMazon", "birkat hamazon", "birkas hamazon", "birchas hamazon", "bentching", "benching", "bentshing", "bensching", "bentch", "bench", "grace after meals"],
  ["Shema", "shma", "kriat shema", "krias shema", "keriat shema", "shema yisrael"],
  ["Bedtime Shema", "kriat shema al hamitah", "krias shema al hamita", "shema al hamita", "shema al hamitah", "shema before bed", "shema before sleep", "shema before sleep at night", "bedtime shema", "night shema"],
  ["Amidah", "shemoneh esrei", "shmoneh esrei", "shemone esre", "shemona esrei", "amida"],
  ["Kabbalat Shabbat", "kabbolas shabbos", "kabalat shabbat", "kabbalas shabbos", "welcoming shabbat"],
  ["Lecha Dodi", "lecha dodi", "lcha dodi", "lekha dodi"],
  ["Kiddush", "kidush"],
  ["Havdalah", "havdala", "havdole"],
  ["Hallel", "halel"],
  ["Tachanun", "tachnun", "tahanun"],
  ["Selichot", "selichos", "slichot", "slichos"],
  ["Ashrei", "ashray", "ashre"],
  ["Aleinu", "alenu", "aleynu"],
  ["Pesukei Dezimra", "pesukei dzimra", "psukei dzimra", "pesukei dezimrah", "verses of praise"],
  ["Birkot HaShachar", "birchot hashachar", "birchos hashachar", "birkot hashachar", "morning blessings"],
  ["Korbanot", "korbanos", "offerings"],
  ["Modeh Ani", "modah ani", "mode ani"],
  ["Asher Yatzar", "asher yatzar", "asher yotzar"],
  ["Tefillat HaDerech", "tefilat haderech", "tefilas haderech", "tefillas haderech", "travelers prayer", "wayfarers prayer", "prayer for travel"],
  ["Al HaMichya", "al hamichya", "meein shalosh", "mein shalosh", "beracha achrona", "bracha achrona"],
  ["Borei Nefashot", "borei nefashos", "bore nefashot"],
  ["Sefirat HaOmer", "sefiras haomer", "counting the omer", "omer"],
  ["Kiddush Levana", "kiddush levanah", "kidush levana", "blessing of the moon", "blessing the new moon", "blessing of the new moon"],
  ["Birkat HaChodesh", "birkas hachodesh", "blessing the new month"],
  ["Yizkor", "yizkor"],
  ["Eruv Tavshilin", "eiruv tavshilin", "eruv tavshilin"],
  ["Hoshanot", "hoshanos", "hoshanas"],
  ["Ein Keloheinu", "ein kelokeinu", "ein kelokenu"],
  ["Adon Olam", "adon olam"],
  ["Yigdal", "yigdal"],
  ["Tikkun Chatzot", "tikkun chatzos", "tikun chatzot"],
  ["Pirkei Avot", "pirkei avos", "ethics of the fathers"],
];

const PRAYER_GROUPS = PRAYERS.map((names) => [...new Set(names.map(foldPrayer))]);

/** Words that ask for the siddur itself. */
const DAVENING = /^(?:daven(?:ing)?|davenen|davening times|tefill?(?:ah|a|os|ot)|prayers?|pray(?:ing)?|sidd?ur(?:im)?|prayer ?book|services?)$/;

/** Words that ask for today's times. */
const TIMES =
  /^(?:zmanim|zemanim|zman|zmanei|times?|todays? times|halachic times|zmanim today|sunset|shkia|shkiah|shekiah|sunrise|netz|hanetz|candle ?lighting|candles?|when (?:is|does) shabb?[ao][ts](?: (?:start|begin|end|come in|go out)s?)?|shabb?[ao][ts] (?:times?|starts?|ends?)|alos|alot|alos hashachar|tzeis|tzeit|tzais|nightfall|chatzos|chatzot|midday|plag|plag hamincha|sof zman.*|latest shema|end of shema|havdalah time|fast (?:times?|ends?|begins?|starts?))$/;

/**
 * The names a typed word may mean. `exact`: itself, and every spelling of the prayer it names
 * ("Mincha" is also "Minchah"). `loose`: prayers that only start with it ("Shema" begins "Shema al
 * hamita", the bedtime Shema).
 */
function prayerNameSets(query: string): { exact: string[]; loose: string[] } {
  const q = foldPrayer(query);
  if (q.length < 3) return { exact: [], loose: [] };
  const exact = new Set<string>([q]);
  const loose = new Set<string>();
  for (const group of PRAYER_GROUPS) {
    if (group.includes(q)) group.forEach((n) => exact.add(n));
    else if (q.length >= 4 && group.some((n) => n.startsWith(q))) group.forEach((n) => loose.add(n));
  }
  return { exact: [...exact], loose: [...loose].filter((n) => !exact.has(n)) };
}

/** The names a typed word may mean: itself, and the prayer whose name it is. */
export function prayerNames(query: string): string[] {
  const { exact, loose } = prayerNameSets(query);
  return [...exact, ...loose];
}

/** Whether what was typed is a prayer's own name ("Mincha", "bentching"), not just a word a prayer shares. */
export function knownPrayer(query: string): boolean {
  const q = foldPrayer(query);
  if (q.length < 3) return false;
  return PRAYER_GROUPS.some((group) => group.some((n) => n === q || (q.length >= 4 && n.startsWith(q))));
}

/** Whether the person is looking for the siddur itself ("davening", "tefillah", "siddur"). */
export function wantsDavening(query: string): boolean {
  return DAVENING.test(foldPrayer(query));
}

/** Whether the person is looking for today's times ("zmanim", "sunset", "candle lighting"). */
export function wantsTimes(query: string): boolean {
  return TIMES.test(foldPrayer(query));
}

/** At most one letter added, dropped or changed. */
function nearlySame(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** How well a section's name matches the names sought: 0 for no match. */
export function nameScore(name: string, wanted: string[]): number {
  const n = foldPrayer(name);
  let best = 0;
  for (const w of wanted) {
    if (n === w) best = Math.max(best, 4);
    else if (n.startsWith(`${w} `) || n.startsWith(w)) best = Math.max(best, 3);
    else if (` ${n} `.includes(` ${w} `)) best = Math.max(best, 2);
    else if (w.length >= 5 && n.length >= 5 && nearlySame(n, w)) best = Math.max(best, 1);
  }
  return best;
}

export interface PrayerHit {
  /** The siddur. */
  book: string;
  /** The path to the match: ["Weekday", "Mincha"]. */
  path: string[];
  /** The section to open: the match itself, or the first section under it. */
  section: string;
  score: number;
}

/** The first section a node opens: itself, or the first one under it. */
export function firstSection(node: ContentsNode): string | undefined {
  if (node.section) return node.section;
  for (const c of node.children) {
    const s = firstSection(c);
    if (s) return s;
  }
  return undefined;
}

/**
 * The prayers in the siddurs that match what was typed, best first: a whole heading ("Mincha")
 * before a part inside it, the siddurs in the order given, then reading order. `trees` holds each
 * siddur's outline (lib/library/contents-tree.ts).
 */
export function findPrayers(trees: Array<{ book: string; nodes: ContentsNode[] }>, query: string, limit = 8): PrayerHit[] {
  const { exact, loose } = prayerNameSets(query);
  if (!exact.length) return [];
  // The prayer the person named, in any of its spellings, counts a little more than prayers that
  // only start with the same word, so "Shema" finds the Shema before "Bedtime Shema", and
  // "Mincha" finds a siddur's "Minchah" as readily as another's "Mincha".
  const scoreOf = (name: string) => {
    const own = nameScore(name, exact);
    return Math.max(own ? own + 0.5 : 0, nameScore(name, loose));
  };
  const hits: Array<PrayerHit & { depth: number; order: number; bookIndex: number }> = [];
  let order = 0;
  trees.forEach(({ book, nodes }, bookIndex) => {
    const walk = (list: ContentsNode[], path: string[]) => {
      for (const node of list) {
        order++;
        const here = [...path, ...node.name.split(" · ")];
        const score = scoreOf(node.name.split(" · ").pop() ?? node.name);
        const section = firstSection(node);
        if (score && section) hits.push({ book, path: here, section, score, depth: here.length, order, bookIndex });
        // Under a strong match ("Mincha"), its parts aren't listed again; under a heading that only
        // contains the word ("Blessings of the Shema"), the search goes on, since a part may be the prayer itself.
        if (score < 3) walk(node.children, here);
      }
    };
    walk(nodes, []);
  });
  hits.sort((a, b) => b.score - a.score || a.bookIndex - b.bookIndex || a.depth - b.depth || a.order - b.order);
  return hits.slice(0, limit).map(({ book, path, section, score }) => ({ book, path, section, score }));
}

/** The siddurs to search, in the order they're offered: the common ones first. */
export function siddurOrder(titles: string[]): string[] {
  const rank = (t: string) => {
    const order = [/^Siddur Ashkenaz$/, /^Siddur Sefard$/, /^Siddur Edot HaMizrach$/, /Koren Shalem Siddur/, /Weekday Siddur Sefard Linear/, /Shabbat Siddur Sefard Linear/];
    const i = order.findIndex((re) => re.test(t));
    return i < 0 ? order.length : i;
  };
  return titles.filter((t) => /siddur/i.test(t)).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** The daily prayer for the time of day: Shacharit in the morning, Mincha in the afternoon, Maariv at night. */
export function prayerForHour(hour: number): "Shacharit" | "Mincha" | "Maariv" {
  if (hour >= 4 && hour < 12) return "Shacharit";
  if (hour >= 12 && hour < 18) return "Mincha";
  return "Maariv";
}
