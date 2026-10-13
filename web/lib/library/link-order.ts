/**
 * Which of a text's cross-references RabAI opens first, the way a learner opens the books.
 *
 * A seif of the Shulchan Aruch is read with the commentaries printed around it, the main ones
 * first: on Orach Chayim the Mishnah Berurah and the Biur Halacha, then the Magen Avraham and
 * the Taz; on Yoreh De'ah the Shach and the Taz; on Even HaEzer the Chelkat Mechokek and the
 * Beit Shmuel; on Choshen Mishpat the Sma and the Shach. Next come the sources of the ruling
 * (the Gemara, the Rambam, the Tur), then the later commentaries. A halacha of the Rambam's
 * Mishneh Torah comes with the Maggid Mishneh, the Kessef Mishneh and the Ra'avad's glosses. A
 * line of Gemara comes with Rashi and Tosafot, then the codes that rule on it (the Ein Mishpat:
 * the Rambam, the Tur, the Shulchan Aruch). A verse of the Torah comes with Onkelos, Rashi, the
 * Ramban, the Ibn Ezra and the Sforno; a mishnah with the Bartenura, the Rambam and the Tosafot
 * Yom Tov.
 *
 * Each book gives a line or two before the next book is opened, so one long commentary can't
 * crowd out the others. A commentary on another siman or verse is a cross-reference, not a
 * commentary on this line, and waits with the rest.
 *
 * Pure: the library store hands it the links, and it says which to open.
 */

/** A link from a line RabAI opened (the anchor) to another line. */
export interface LinkPair {
  anchor: string;
  other: string;
}

/** The 37 tractates of the Babylonian Talmud, as the library names them. */
const BAVLI = new Set([
  "Berakhot",
  "Shabbat",
  "Eruvin",
  "Pesachim",
  "Rosh Hashanah",
  "Yoma",
  "Sukkah",
  "Beitzah",
  "Taanit",
  "Megillah",
  "Moed Katan",
  "Chagigah",
  "Yevamot",
  "Ketubot",
  "Nedarim",
  "Nazir",
  "Sotah",
  "Gittin",
  "Kiddushin",
  "Bava Kamma",
  "Bava Metzia",
  "Bava Batra",
  "Sanhedrin",
  "Makkot",
  "Shevuot",
  "Avodah Zarah",
  "Horayot",
  "Zevachim",
  "Menachot",
  "Chullin",
  "Bekhorot",
  "Arakhin",
  "Temurah",
  "Keritot",
  "Meilah",
  "Tamid",
  "Niddah",
]);

const TORAH = new Set(["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]);

const NACH = new Set([
  "Joshua",
  "Judges",
  "I Samuel",
  "II Samuel",
  "I Kings",
  "II Kings",
  "Isaiah",
  "Jeremiah",
  "Ezekiel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Psalms",
  "Proverbs",
  "Job",
  "Song of Songs",
  "Ruth",
  "Lamentations",
  "Ecclesiastes",
  "Esther",
  "Daniel",
  "Ezra",
  "Nehemiah",
  "I Chronicles",
  "II Chronicles",
]);

/** The four parts of the Shulchan Aruch, and the Mishneh Torah. */
export type Code = "oc" | "yd" | "eh" | "cm" | "mt";

const CODE_BOOKS: Array<[string, Code]> = [
  ["Shulchan Arukh, Orach Chayim", "oc"],
  ["Shulchan Arukh, Yoreh De'ah", "yd"],
  ["Shulchan Arukh, Even HaEzer", "eh"],
  ["Shulchan Arukh, Choshen Mishpat", "cm"],
];

/** A line's book and its place in it: "Mishnah Berurah 671:4" -> "Mishnah Berurah", "671:4". */
export function splitRef(ref: string): { book: string; place: string } {
  const m = ref.match(/^(.*?) (\d+[ab]?(?::\d+)*)$/);
  return m ? { book: m[1], place: m[2] } : { book: ref, place: "" };
}

/** Which code a line belongs to: a part of the Shulchan Aruch, the Mishneh Torah, or none. */
export function codeOf(ref: string): Code | null {
  const { book } = splitRef(ref);
  for (const [name, code] of CODE_BOOKS) if (book === name) return code;
  return book.startsWith("Mishneh Torah, ") ? "mt" : null;
}

/**
 * The commentaries printed with each part of the Shulchan Aruch, in the order a rav opens them:
 * the main ones, the next ones, then later ones. A commentary on this part that isn't listed
 * comes after these; one on a different siman is a cross-reference.
 */
const SHULCHAN_ARUKH: Record<Exclude<Code, "mt">, string[][]> = {
  oc: [
    ["Mishnah Berurah", "Biur Halacha"],
    ["Magen Avraham", "Turei Zahav on Shulchan Arukh, Orach Chayim"],
    [
      "Beur HaGra on Shulchan Arukh, Orach Chayim",
      "Sha'arei Teshuvah on Shulchan Arukh, Orach Chayim",
      "Rabbi Akiva Eiger on Shulchan Arukh, Orach Chayim",
      "Kaf HaChayim on Shulchan Arukh, Orach Chayim",
      "Machatzit HaShekel on Orach Chayim",
      "Peri Megadim on Orach Chayim",
    ],
  ],
  yd: [
    ["Siftei Kohen on Shulchan Arukh, Yoreh De'ah", "Turei Zahav on Shulchan Arukh, Yoreh De'ah"],
    [
      "Pitchei Teshuva on Shulchan Arukh, Yoreh De'ah",
      "Rabbi Akiva Eiger on Shulchan Arukh, Yoreh De'ah",
      "Beur HaGra on Shulchan Arukh, Yoreh De'ah",
    ],
    [
      "Nekudot HaKesef on Shulchan Arukh, Yoreh De'ah",
      "Peri Megadim on Yoreh De'ah",
      "Kaf HaChayim on Shulchan Arukh, Yoreh De'ah",
      "Kereti on Shulchan Arukh, Yoreh De'ah",
      "Peleti on Shulchan Arukh, Yoreh De'ah",
    ],
  ],
  eh: [
    ["Chelkat Mechokek", "Beit Shmuel"],
    [
      "Turei Zahav on Shulchan Arukh, Even HaEzer",
      "Pitchei Teshuva on Shulchan Arukh, Even HaEzer",
      "Beur HaGra on Shulchan Arukh, Even HaEzer",
    ],
    [
      "Rabbi Akiva Eiger on Shulchan Arukh, Even HaEzer",
      "Beit Meir on Shulchan Arukh, Even HaEzer",
      "Ezer MiKodesh on Shulchan Arukh, Even HaEzer",
    ],
  ],
  cm: [
    ["Me'irat Einayim on Shulchan Arukh, Choshen Mishpat", "Siftei Kohen on Shulchan Arukh, Choshen Mishpat"],
    [
      "Ketzot HaChoshen on Shulchan Arukh, Choshen Mishpat",
      "Netivot HaMishpat, Beurim on Shulchan Arukh, Choshen Mishpat",
      "Netivot HaMishpat, Hidushim on Shulchan Arukh, Choshen Mishpat",
      "Turei Zahav on Shulchan Arukh, Choshen Mishpat",
      "Pitchei Teshuva on Shulchan Arukh, Choshen Mishpat",
      "Beur HaGra on Shulchan Arukh, Choshen Mishpat",
    ],
    [
      "Urim VeTumim, Urim",
      "Urim VeTumim, Tumim",
      "Rabbi Akiva Eiger on Shulchan Arukh, Choshen Mishpat",
      "Chatam Sofer on Shulchan Arukh, Choshen Mishpat",
    ],
  ],
};

/** Commentators on the Mishneh Torah, by rank. Their books are named "<name> on Mishneh Torah, <book>". */
export const MISHNEH_TORAH_COMMENTATORS: string[][] = [
  ["Maggid Mishneh", "Kessef Mishneh", "Hasagot HaRa'avad"],
  ["Lechem Mishneh", "Mishneh LaMelech", "Migdal Oz", "Commentary of Mahari Kurkus and Radbaz"],
  ["Ohr Sameach", "Sha'ar HaMelekh", "Even Ha'azel", "Tzafnat Pa'neach", "Avodat HaMelekh", "Kiryat Sefer"],
];

/** Commentators on the Torah, by rank, as the library names them ("Ramban on Genesis"). */
const TORAH_COMMENTATORS: string[][] = [
  ["Onkelos", "Rashi", "Ramban", "Ibn Ezra", "Sforno"],
  [
    "Rashbam",
    "Or HaChaim",
    "Kli Yakar",
    "Kitzur Ba'al HaTurim",
    "Haamek Davar",
    "Chizkuni",
    "Rabbeinu Bahya",
    "Siftei Chakhamim",
    "Targum Jonathan",
    "Malbim",
    "Radak",
  ],
];

/** Commentators on the Prophets and Writings, by rank. */
const NACH_COMMENTATORS: string[][] = [
  ["Rashi", "Radak", "Metzudat David", "Metzudat Zion"],
  ["Malbim", "Ibn Ezra", "Ralbag", "Abarbanel"],
];

/** Commentators on the Mishnah, by rank ("Bartenura on Mishnah Berakhot"). */
const MISHNAH_COMMENTATORS: string[][] = [
  ["Bartenura", "Rambam", "Tosafot Yom Tov"],
  ["Yachin", "Boaz", "Melekhet Shelomoh", "Tosafot Rabbi Akiva Eiger", "Ikar Tosafot Yom Tov"],
];

/** Commentators on the Gemara, by rank ("Rashi on Berakhot"). */
const BAVLI_COMMENTATORS: string[][] = [
  ["Rashi", "Tosafot"],
  [],
  [
    "Rabbeinu Chananel",
    "Chiddushei Ramban",
    "Rashba",
    "Ritva",
    "Ran",
    "Rosh",
    "Tosafot HaRosh",
    "Meiri",
    "Shita Mekubetzet",
  ],
  ["Chidushei Halachot", "Chidushei Agadot", "Maharam", "Penei Yehoshua", "Rashash"],
];

type Family = Exclude<Code, "mt"> | "mt" | "bavli" | "mishnah" | "torah" | "tanakh" | "plain";

function familyOf(anchor: string): Family {
  const code = codeOf(anchor);
  if (code) return code;
  const { book } = splitRef(anchor);
  if (BAVLI.has(book)) return "bavli";
  if (/^Mishnah (?!Berurah)/.test(book)) return "mishnah";
  if (TORAH.has(book)) return "torah";
  return NACH.has(book) ? "tanakh" : "plain";
}

/** Names compared without apostrophes, since the library spells "Yoreh De'ah" both ways. */
function plainName(name: string): string {
  return name.replace(/['’]/g, "");
}

/** The first number of a place: the siman of a code, the chapter of a book. */
function firstNumber(place: string): string {
  return place.split(":")[0];
}

/** Whether a commentary's place is on the anchor's line ("1:1:2" on "1:1"). */
function onLine(place: string, anchorPlace: string): boolean {
  return place === anchorPlace || place.startsWith(anchorPlace + ":");
}

/** "Ramban on Genesis" -> "Ramban"; "Onkelos Genesis" -> "Onkelos", given the book explained. */
function commentatorOf(book: string, explained: string): string | null {
  if (book.endsWith(` on ${explained}`)) return book.slice(0, -` on ${explained}`.length);
  if (book === `Onkelos ${explained}`) return "Onkelos";
  return null;
}

/** The rank of a name in a table of ranks, as [rank, position], or null when it isn't listed. */
function rankIn(table: string[][], name: string): [number, number] | null {
  for (let r = 0; r < table.length; r++) {
    const i = table[r].indexOf(name);
    if (i >= 0) return [r, i];
  }
  return null;
}

/**
 * Tiers, from first to last:
 *   0  the main commentaries printed with the text
 *   1  the next ones (on the Gemara: the codes that rule on it)
 *   2  the sources of a ruling (on a code); other early commentaries (on the Gemara)
 *   3  the later commentaries listed
 *   4  other commentaries on this very line or siman
 *   5  everything else: cross-references, parallels, later works that cite the line
 *   6  Be'er HaGolah, which lists the sources the other links already give
 */
const BASE = [0, 1, 2, 4, 6, 8, 20];
/** How much each further line from the same book adds, so books take turns. */
const STEP = [2, 3, 3, 5, 6, 8, 10];

export interface Tier {
  tier: number;
  /** Order within the tier: the table's order, then sources in their usual order. */
  pos: number;
  /** A commentary on this very line (or, on a code, this siman or halacha), not a cross-reference. */
  commentary: boolean;
}

/** Where a code's sources stand: the Gemara first, then the Rambam, the Tur, the Yerushalmi, the Rif. */
function sourceRank(book: string): number | null {
  if (BAVLI.has(book)) return 0;
  if (book.startsWith("Mishneh Torah, ")) return 1;
  if (book.startsWith("Tur, ") || book === "Tur") return 2;
  if (book.startsWith("Beit Yosef")) return 3;
  if (book.startsWith("Jerusalem Talmud ")) return 4;
  if (book.startsWith("Rif ")) return 5;
  return null;
}

/** How the other line of a link stands to the anchor. */
export function tierOf(anchor: string, other: string): Tier {
  const family = familyOf(anchor);
  const a = splitRef(anchor);
  const o = splitRef(other);
  const commentary = (tier: number, pos = 0): Tier => ({ tier, pos, commentary: true });
  const related = (tier: number, pos = 0): Tier => ({ tier, pos, commentary: false });
  const last = (): Tier => related(5);

  if (family === "oc" || family === "yd" || family === "eh" || family === "cm") {
    const sameSiman = o.place !== "" && firstNumber(o.place) === firstNumber(a.place);
    const listed = rankIn(SHULCHAN_ARUKH[family], o.book);
    if (listed && sameSiman) return commentary(listed[0] === 2 ? 3 : listed[0], listed[1]);
    const source = sourceRank(o.book);
    if (source !== null) return related(2, source);
    // Another commentary on this siman: "Ba'er Hetev on Shulchan Arukh, Orach Chayim".
    const part = a.book.replace("Shulchan Arukh, ", "");
    const on = plainName(o.book);
    const onThisPart = on.endsWith(plainName(` on ${a.book}`)) || on.endsWith(plainName(` on ${part}`));
    // The Be'er HaGolah lists the sources the other links already give: it is read last.
    if (sameSiman && onThisPart) return commentary(o.book.startsWith("Be'er HaGolah on ") ? 6 : 4);
    return last();
  }

  if (family === "mt") {
    const who = commentatorOf(o.book, a.book);
    if (who && onLine(o.place, a.place)) {
      const listed = rankIn(MISHNEH_TORAH_COMMENTATORS, who);
      return listed ? commentary(listed[0] === 2 ? 3 : listed[0], listed[1]) : commentary(4);
    }
    // The Rambam's sources: the Gemara, the Yerushalmi, the Tosefta and the halachic midrashim,
    // the Rif. Then the later codes that rule with him or against him.
    if (BAVLI.has(o.book)) return related(2, 0);
    if (o.book.startsWith("Jerusalem Talmud ")) return related(2, 1);
    if (/^(?:Tosefta |Sifra|Sifrei |Mekhilta)/.test(o.book)) return related(2, 2);
    if (o.book.startsWith("Rif ")) return related(2, 3);
    if (o.book.startsWith("Tur, ")) return related(3, 8);
    if (o.book.startsWith("Shulchan Arukh, ")) return related(3, 9);
    return last();
  }

  if (family === "bavli") {
    const who = commentatorOf(o.book, a.book);
    if (who && onLine(o.place, a.place)) {
      const listed = rankIn(BAVLI_COMMENTATORS, who);
      return listed ? commentary(listed[0], listed[1]) : commentary(4);
    }
    // The Ein Mishpat: where the halacha is ruled. And the mishnah the Gemara explains.
    if (o.book.startsWith("Mishneh Torah, ")) return related(1, 0);
    if (o.book.startsWith("Shulchan Arukh, ")) return related(1, 1);
    if (o.book.startsWith("Tur, ")) return related(1, 2);
    if (o.book === `Mishnah ${a.book}`) return related(1, 3);
    if (o.book === `Rif ${a.book}`) return related(1, 4);
    return last();
  }

  const table =
    family === "torah" ? TORAH_COMMENTATORS : family === "tanakh" ? NACH_COMMENTATORS : family === "mishnah" ? MISHNAH_COMMENTATORS : [];
  const who = commentatorOf(o.book, a.book);
  if (who !== null && onLine(o.place, a.place)) {
    const listed = rankIn(table, who);
    if (listed) return commentary(listed[0], listed[1]);
    return commentary(family === "plain" ? 0 : 4);
  }
  if (family === "mishnah" && BAVLI.has(o.book) && a.book === `Mishnah ${o.book}`) return related(1, 9);
  return last();
}

/** Compare two places in reading order: "671:4" before "671:10", "21b:3" after "21a:9". */
export function comparePlaces(a: string, b: string): number {
  const pa = a.split(":");
  const pb = b.split(":");
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    const na = placeNumber(pa[i]);
    const nb = placeNumber(pb[i]);
    if (na !== nb) return na - nb;
  }
  return 0;
}

function placeNumber(part: string): number {
  const m = part.match(/^(\d+)([ab]?)$/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[1]) * 2 + (m[2] === "b" ? 1 : 0);
}

interface Candidate {
  other: string;
  book: string;
  place: string;
  tier: number;
  pos: number;
  anchorIndex: number;
  seen: number;
}

/**
 * The other lines of these links, in the order to open them, at most `limit`. The anchors are
 * the lines RabAI opened, first first; a line linked from several anchors is placed by its best
 * link, and the anchors themselves are never returned.
 */
export function orderLinked(pairs: LinkPair[], anchors: string[], limit: number): string[] {
  if (limit <= 0) return [];
  const anchorIndex = new Map(anchors.map((a, i) => [a, i]));
  const best = new Map<string, Candidate>();
  pairs.forEach((p, seen) => {
    if (anchorIndex.has(p.other) || !anchorIndex.has(p.anchor)) return;
    const { tier, pos } = tierOf(p.anchor, p.other);
    const { book, place } = splitRef(p.other);
    const c: Candidate = { other: p.other, book, place, tier, pos, anchorIndex: anchorIndex.get(p.anchor)!, seen };
    const prev = best.get(p.other);
    if (!prev || c.tier < prev.tier || (c.tier === prev.tier && c.anchorIndex < prev.anchorIndex)) best.set(p.other, c);
  });

  // Each book's lines in reading order, its commentary on this line before its cross-references:
  // its first line is round 0, the next round 1, and so on.
  const byBook = new Map<string, Candidate[]>();
  for (const c of best.values()) {
    const list = byBook.get(c.book) ?? [];
    list.push(c);
    byBook.set(c.book, list);
  }
  const scored: Array<Candidate & { score: number }> = [];
  for (const list of byBook.values()) {
    list.sort((x, y) => x.tier - y.tier || x.anchorIndex - y.anchorIndex || comparePlaces(x.place, y.place) || x.seen - y.seen);
    list.forEach((c, round) => scored.push({ ...c, score: BASE[c.tier] + round * STEP[c.tier] }));
  }
  scored.sort(
    (x, y) =>
      x.score - y.score ||
      x.tier - y.tier ||
      x.anchorIndex - y.anchorIndex ||
      x.pos - y.pos ||
      x.seen - y.seen ||
      comparePlaces(x.place, y.place),
  );
  return scored.slice(0, limit).map((c) => c.other);
}

/**
 * Whether a linked line is a commentary on this very line: "Rashi on Genesis 1:1:2" on Genesis
 * 1:1, or, on a code, a commentary printed with it on this siman (the Mishnah Berurah on a seif
 * of Orach Chayim, the Shach on a seif of Yoreh De'ah). The reader shows these under the line.
 */
export function isCommentaryOn(base: string, other: string): boolean {
  return tierOf(base, other).commentary;
}

/**
 * Commentaries the library finds by their refs rather than by links. Those on the Mishneh Torah
 * are named "<commentator> on Mishneh Torah, <book> <chapter>:<halacha>:<n>", and the library
 * holds few links to them. For a halacha, or a whole chapter, the ref prefixes to read them from.
 */
export function commentaryPrefixes(ref: string): string[] {
  const { book, place } = splitRef(ref);
  if (!book.startsWith("Mishneh Torah, ") || !place) return [];
  return MISHNEH_TORAH_COMMENTATORS.flat().map((c) => `${c} on ${book} ${place}:`);
}

/** The halacha a Mishneh Torah commentary explains: "Kessef Mishneh on Mishneh Torah, Sabbath 1:3:2" -> "Mishneh Torah, Sabbath 1:3". */
export function commentaryBase(ref: string): string | null {
  const m = ref.match(/^.+? on (Mishneh Torah, .+ \d+:\d+):\d+$/);
  return m ? m[1] : null;
}
