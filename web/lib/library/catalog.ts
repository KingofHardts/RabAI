/**
 * The library's catalog: every book placed on a shelf (Tanakh, Mishnah, Talmud, Halacha, ...),
 * grouped the way learners know it (the six orders of the Mishnah and Talmud, the three parts
 * of Tanakh), with each commentary tied to the book it explains. And a forgiving book search:
 * spelling variants (Kidushin, Kesubos), partial names, any word order, Hebrew, and words like
 * "Gemara" or "Mishnah" that say which shelf is meant.
 *
 * Pure and client-safe: the app calls it in the browser with the list from /api/library.
 */

export type ShelfId =
  | "tanakh"
  | "mishnah"
  | "talmud"
  | "halacha"
  | "midrash"
  | "tosefta"
  | "minor"
  | "prayer"
  | "thought"
  | "musar"
  | "chasidut"
  | "kabbalah"
  | "responsa"
  | "reference"
  | "commentaries"
  | "other";

export interface ShelfInfo {
  id: ShelfId;
  name: string;
  he: string;
}

/** The shelves in the order they are shown. */
export const SHELVES: ShelfInfo[] = [
  { id: "tanakh", name: "Tanakh", he: "תנ״ך" },
  { id: "mishnah", name: "Mishnah", he: "משנה" },
  { id: "talmud", name: "Talmud", he: "תלמוד" },
  { id: "halacha", name: "Halacha", he: "הלכה" },
  { id: "midrash", name: "Midrash", he: "מדרש" },
  { id: "tosefta", name: "Tosefta", he: "תוספתא" },
  { id: "minor", name: "Minor tractates", he: "מסכתות קטנות" },
  { id: "prayer", name: "Prayer", he: "תפילה" },
  { id: "thought", name: "Jewish thought", he: "מחשבה" },
  { id: "musar", name: "Musar", he: "מוסר" },
  { id: "chasidut", name: "Chasidut", he: "חסידות" },
  { id: "kabbalah", name: "Kabbalah", he: "קבלה" },
  { id: "responsa", name: "Responsa", he: "שו״ת" },
  { id: "reference", name: "Dictionaries", he: "מילונים" },
  { id: "commentaries", name: "Commentaries", he: "מפרשים" },
  { id: "other", name: "Other", he: "שונות" },
];

export function shelfInfo(id: ShelfId): ShelfInfo {
  return SHELVES.find((s) => s.id === id) ?? SHELVES[SHELVES.length - 1];
}

/** A book as /api/library lists it. */
export interface CatalogBook {
  title: string;
  he: string;
  firstRef: string;
  workTitle: string;
  /** Sefaria's category path, e.g. ["Talmud", "Bavli", "Seder Nashim"]. Empty when unknown. */
  categories: string[];
  /** Reading order across the library (Sefaria's table of contents). */
  order: number;
}

export interface PlacedBook extends CatalogBook {
  /** The shelf of the text itself; for a commentary, the shelf of what it explains. */
  shelf: ShelfId;
  /** Talmud: "Talmud Bavli" or "Talmud Yerushalmi". */
  part?: string;
  /** The heading it sits under, e.g. "Seder Nashim", "Torah", "Mishneh Torah". */
  group: string;
  /** A collection inside the group, e.g. "Sefer Zemanim" in the Mishneh Torah. */
  subgroup?: string;
  /** Set when the book explains another one. */
  commentary?: {
    /** The title of the book it explains, when it is in the library. */
    on?: string;
    /** Who wrote it, as the library names it: "Rashi", "Chidushei Halachot". */
    by: string;
    /** The name learners use: "Rashi", "Maharsha (Halachot)". */
    label: string;
    byHe?: string;
    /** "Rishonim", "Acharonim", "Targum", "Modern" or "Commentaries". */
    era: string;
  };
  /** A short label for where it sits, e.g. "Talmud Bavli · Nashim". */
  where: string;
}

// ---------------------------------------------------------------------------
// Names

const SEDARIM: Record<string, { name: string; en: string; he: string }> = {
  "Seder Zeraim": { name: "Zeraim", en: "Seeds", he: "זרעים" },
  "Seder Moed": { name: "Moed", en: "Festivals", he: "מועד" },
  "Seder Nashim": { name: "Nashim", en: "Women", he: "נשים" },
  "Seder Nezikin": { name: "Nezikin", en: "Damages", he: "נזיקין" },
  "Seder Kodashim": { name: "Kodashim", en: "Holy things", he: "קדשים" },
  "Seder Tahorot": { name: "Tahorot", en: "Purity", he: "טהרות" },
};

const GROUP_NAMES: Record<string, { name: string; he?: string }> = {
  Torah: { name: "Torah (the Five Books)", he: "תורה" },
  Prophets: { name: "Nevi’im (Prophets)", he: "נביאים" },
  Writings: { name: "Ketuvim (Writings)", he: "כתובים" },
  Rishonim: { name: "Rishonim (earlier authorities)", he: "ראשונים" },
  Acharonim: { name: "Acharonim (later authorities)", he: "אחרונים" },
  Geonim: { name: "Geonim", he: "גאונים" },
  Modern: { name: "Recent works", he: "בני זמננו" },
  Aggadah: { name: "Aggadah (teachings and stories)", he: "אגדה" },
  "Sifrei Mitzvot": { name: "Books of the mitzvot", he: "ספרי מצוות" },
  "Mishneh Torah": { name: "Mishneh Torah (the Rambam)", he: "משנה תורה" },
  "Shulchan Arukh": { name: "Shulchan Arukh", he: "שולחן ערוך" },
  Tur: { name: "Tur", he: "טור" },
  "Midrash Rabbah": { name: "Midrash Rabbah", he: "מדרש רבה" },
  "Early Works": { name: "Early works", he: "ראשית החסידות" },
  "Other Chasidut Works": { name: "More works" },
  Dictionary: { name: "Dictionaries", he: "מילונים" },
  Grammar: { name: "Grammar", he: "דקדוק" },
  Siddur: { name: "Siddur", he: "סידור" },
};

/** Other names learners use for a book, by its library title. Spelling variants of one name are found without help. */
const BOOK_ALIASES: Record<string, string[]> = {
  Genesis: ["Bereshit", "Bereishit"],
  Exodus: ["Shemot"],
  Leviticus: ["Vayikra"],
  Numbers: ["Bamidbar"],
  Deuteronomy: ["Devarim"],
  Joshua: ["Yehoshua"],
  Judges: ["Shoftim"],
  "I Samuel": ["Shmuel 1", "1 Samuel", "First Samuel", "Shmuel Aleph"],
  "II Samuel": ["Shmuel 2", "2 Samuel", "Second Samuel", "Shmuel Bet"],
  "I Kings": ["Melachim 1", "1 Kings", "First Kings", "Melachim Aleph"],
  "II Kings": ["Melachim 2", "2 Kings", "Second Kings", "Melachim Bet"],
  Isaiah: ["Yeshayahu"],
  Jeremiah: ["Yirmiyahu"],
  Ezekiel: ["Yechezkel"],
  Hosea: ["Hoshea"],
  Joel: ["Yoel"],
  Obadiah: ["Ovadiah"],
  Jonah: ["Yonah"],
  Micah: ["Michah"],
  Nahum: ["Nachum"],
  Habakkuk: ["Chavakuk"],
  Zephaniah: ["Tzefaniah"],
  Haggai: ["Chaggai"],
  Zechariah: ["Zecharyah"],
  Psalms: ["Tehillim"],
  Proverbs: ["Mishlei"],
  Job: ["Iyov"],
  "Song of Songs": ["Shir HaShirim", "Song of Solomon"],
  Ruth: ["Rut"],
  Lamentations: ["Eichah"],
  Ecclesiastes: ["Kohelet"],
  Nehemiah: ["Nechemiah"],
  "I Chronicles": ["Divrei HaYamim 1", "1 Chronicles", "Divrei HaYamim Aleph"],
  "II Chronicles": ["Divrei HaYamim 2", "2 Chronicles", "Divrei HaYamim Bet"],
  "Bava Kamma": ["BK", "Baba Kamma", "ב״ק"],
  "Bava Metzia": ["BM", "Baba Metzia", "ב״מ"],
  "Bava Batra": ["BB", "Baba Batra", "ב״ב"],
  "Avodah Zarah": ["AZ", "ע״ז"],
  "Rosh Hashanah": ["RH", "ר״ה"],
  "Moed Katan": ["MK", "מו״ק"],
  "Pirkei Avot": ["Avot", "Ethics of the Fathers", "Ethics of Our Fathers"],
  "Bereshit Rabbah": ["Genesis Rabbah"],
  "Shemot Rabbah": ["Exodus Rabbah"],
  "Vayikra Rabbah": ["Leviticus Rabbah"],
  "Bamidbar Rabbah": ["Numbers Rabbah"],
  "Devarim Rabbah": ["Deuteronomy Rabbah"],
  "Shir HaShirim Rabbah": ["Song of Songs Rabbah"],
  "Kohelet Rabbah": ["Ecclesiastes Rabbah"],
  "Eikhah Rabbah": ["Lamentations Rabbah", "Eichah Rabbah"],
  "Shulchan Arukh, Orach Chayim": ["Orach Chayim", "OC", "Shulchan Arukh"],
  "Shulchan Arukh, Yoreh De'ah": ["Yoreh Deah", "YD", "Shulchan Arukh"],
  "Shulchan Arukh, Even HaEzer": ["Even HaEzer", "EH", "Shulchan Arukh"],
  "Shulchan Arukh, Choshen Mishpat": ["Choshen Mishpat", "CM", "Shulchan Arukh"],
  "Guide for the Perplexed": ["Moreh Nevuchim"],
  "Duties of the Heart": ["Chovot HaLevavot"],
  Kuzari: ["Sefer HaKuzari"],
  Tanya: ["Likutei Amarim"],
  "Mesillat Yesharim": ["Path of the Just"],
  "Sefer HaChinukh": ["Chinuch"],
  "Nefesh HaChayim": ["Nefesh HaChaim"],
  "Epistle of Rav Sherira Gaon": ["Iggeret Rav Sherira Gaon"],
  "Sefer HeArukh": ["Aruch", "HeAruch"],
  "Chafetz Chaim": ["Chofetz Chaim"],
};

/** Other names for commentators, by the name the library gives them. */
const BY_ALIASES: Record<string, string[]> = {
  Tosafot: ["Tosfos", "Tosafos"],
  "Chidushei Halachot": ["Maharsha"],
  "Chidushei Agadot": ["Maharsha"],
  "Chiddushei Rabbi Akiva Eiger": ["Rabbi Akiva Eiger", "Rav Akiva Eiger", "Reb Akiva Eiger"],
  "Chiddushei Ramban": ["Ramban"],
  Bartenura: ["Bertinoro", "Rav Ovadiah"],
  "Tosafot Yom Tov": ["Tosfos Yom Tov"],
  "Metzudat David": ["Metzudos"],
  "Metzudat Zion": ["Metzudos"],
  "Or HaChaim": ["Ohr HaChaim"],
  Onkelos: ["Targum Onkelos"],
  "Targum Jonathan": ["Targum Yonatan"],
  "Gur Aryeh": ["Maharal"],
  Rosh: ["Piskei HaRosh"],
  Rif: ["Hilchot HaRif"],
};

/** Names learners use for commentaries the library lists by their book titles. */
const BY_LABELS: Record<string, string> = {
  "Chidushei Halachot": "Maharsha (Halachot)",
  "Chidushei Agadot": "Maharsha (Aggadot)",
  "Chiddushei Rabbi Akiva Eiger": "Rabbi Akiva Eiger",
  "Chiddushei Ramban": "Ramban",
};

/** Collections named in Hebrew, with what the name means. */
const SET_NAMES: Record<string, { gloss: string; he: string }> = {
  Introduction: { gloss: "", he: "הקדמה" },
  "Sefer Madda": { gloss: "Knowledge", he: "ספר המדע" },
  "Sefer Ahavah": { gloss: "Love", he: "ספר אהבה" },
  "Sefer Zemanim": { gloss: "Times", he: "ספר זמנים" },
  "Sefer Nashim": { gloss: "Women", he: "ספר נשים" },
  "Sefer Kedushah": { gloss: "Holiness", he: "ספר קדושה" },
  "Sefer Haflaah": { gloss: "Vows and pledges", he: "ספר הפלאה" },
  "Sefer Zeraim": { gloss: "Seeds", he: "ספר זרעים" },
  "Sefer Avodah": { gloss: "Temple service", he: "ספר עבודה" },
  "Sefer Korbanot": { gloss: "Offerings", he: "ספר קרבנות" },
  "Sefer Taharah": { gloss: "Purity", he: "ספר טהרה" },
  "Sefer Nezikim": { gloss: "Damages", he: "ספר נזיקין" },
  "Sefer Kinyan": { gloss: "Acquisition", he: "ספר קנין" },
  "Sefer Mishpatim": { gloss: "Civil law", he: "ספר משפטים" },
  "Sefer Shoftim": { gloss: "Judges", he: "ספר שופטים" },
  "Midrash Rabbah": { gloss: "The great midrash on the Torah and Megillot", he: "מדרש רבה" },
};

/** Words that change no meaning in a book search. */
const FILLER = new Set(
  (
    "the of on a an in to for and by with book books tractate tractates masechet masechta maseches masechtos masechtot " +
    "mesechta mesechet meseches maseket massekhet sefer seder perek chapter daf amud read open learn study show me find " +
    "al ha ve v u של על את ספר מסכת מסכתא פרק דף"
  ).split(" "),
);

/** Words that say which shelf is meant, by how people type them. */
const SHELF_WORDS: Record<string, string> = {};
for (const [key, words] of Object.entries({
  gemara: "gemara gemora gemarah gemorah gmara gamara gemoro גמרא גמ",
  talmud: "talmud shas תלמוד ש״ס שס",
  bavli: "bavli babylonian בבלי",
  yerushalmi: "yerushalmi jerusalem palestinian ירושלמי",
  mishnah: "mishna mishnah mishnayos mishnayot mishnaiot משנה משניות",
  tanakh: "tanakh tanach tanak tenach bible scripture תנ״ך תנך מקרא",
  torah: "chumash humash pentateuch torah חומש תורה",
  nach: "nach neviim prophets ketuvim writings נביאים כתובים",
  halacha: "halacha halakha halakhah halachah hilchot hilchos laws הלכה הלכות",
  midrash: "midrash medrash midrashim מדרש",
  commentary: "commentary commentaries perush peirush pirush meforshim mefarshim פירוש פירושים מפרשים",
})) {
  for (const w of words.split(" ")) SHELF_WORDS[plain(w)] = key;
}

/** Single words that mean the same in a title. */
const WORD_SYNONYMS: Record<string, string[]> = {
  sabbath: ["shabbat"],
  shabbat: ["sabbath"],
};

// ---------------------------------------------------------------------------
// Placing books

function isHebrew(s: string): boolean {
  return /[֐-׿]/.test(s);
}

/** Lower case, without accents, vowel points or quote marks. */
export function plain(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[֑-ׇ]/g, "")
    .replace(/['’‘`"״׳]/g, "")
    .toLowerCase();
}

const COMMENTARY_MARK = /^(Rishonim on|Acharonim on|Modern Commentary on|Commentary$|Targum$)/;

function eraOf(mark: string): string {
  if (mark.startsWith("Rishonim")) return "Rishonim";
  if (mark.startsWith("Acharonim")) return "Acharonim";
  if (mark.startsWith("Modern")) return "Modern";
  if (mark === "Targum") return "Targum";
  return "Commentaries";
}

const SHELF_OF_CATEGORY: Record<string, ShelfId> = {
  Tanakh: "tanakh",
  Mishnah: "mishnah",
  Talmud: "talmud",
  Halakhah: "halacha",
  Midrash: "midrash",
  Tosefta: "tosefta",
  Liturgy: "prayer",
  "Jewish Thought": "thought",
  Musar: "musar",
  Chasidut: "chasidut",
  Kabbalah: "kabbalah",
  Responsa: "responsa",
  Reference: "reference",
};

/** A best guess at a book's category path from its work's name, when the library has none. */
export function guessCategories(workTitle: string): string[] {
  const w = workTitle.toLowerCase();
  if (w.includes("yerushalmi") || w.includes("jerusalem talmud")) return ["Talmud", "Yerushalmi"];
  if (w.includes("talmud") || w.includes("bavli")) return ["Talmud", "Bavli"];
  if (w.startsWith("mishnah berurah")) return ["Halakhah"];
  if (w.includes("mishnah")) return ["Mishnah"];
  if (w.includes("rashi") || w.includes("commentary")) return ["Tanakh", "Rishonim on Tanakh"];
  if (/tanakh|torah|bereishit|genesis|tehillim|psalms/.test(w)) return ["Tanakh"];
  if (w.includes("shulchan") || w.includes("mishneh torah")) return ["Halakhah"];
  if (w.includes("midrash")) return ["Midrash"];
  return [];
}

function displayGroup(key: string): { name: string; he?: string } {
  const seder = SEDARIM[key];
  if (seder) return { name: `${seder.name} (${seder.en})`, he: seder.he };
  return GROUP_NAMES[key] ?? { name: key };
}

/** The short name of a group, for "where" labels: "Nashim", "Torah". */
function shortGroup(key: string): string {
  return SEDARIM[key]?.name ?? (GROUP_NAMES[key]?.name.replace(/ \(.*\)$/, "") || key);
}

/** Place every book on its shelf and tie each commentary to the book it explains. */
export function placeBooks(books: CatalogBook[]): PlacedBook[] {
  const withCats = books.map((b) => ({ ...b, categories: b.categories.length ? b.categories : guessCategories(b.workTitle) }));
  const isCommentary = (b: CatalogBook) => b.categories.some((c) => COMMENTARY_MARK.test(c));

  // Books a commentary can be "on": every book that is not itself a commentary.
  const bases = new Map<string, CatalogBook>();
  for (const b of withCats) if (!isCommentary(b)) bases.set(plain(b.title), b);
  for (const [title, names] of Object.entries(BOOK_ALIASES)) {
    const base = bases.get(plain(title));
    if (base) for (const n of names) if (!bases.has(plain(n))) bases.set(plain(n), base);
  }

  const findBase = (b: CatalogBook): CatalogBook | undefined => {
    const t = b.title.split(";")[0].trim();
    const on = t.lastIndexOf(" on ");
    if (on >= 0) {
      const hit = bases.get(plain(t.slice(on + 4)));
      if (hit) return hit;
    }
    // "Rif Kiddushin", "Onkelos Genesis": the longest book title the name ends with.
    let best: CatalogBook | undefined;
    for (const base of bases.values()) {
      if (base === b || base.title.length >= t.length) continue;
      if (t.endsWith(` ${base.title}`) && (!best || base.title.length > best.title.length)) best = base;
    }
    return best;
  };

  const placedMain = new Map<string, PlacedBook>();
  const out: PlacedBook[] = [];

  const placeMain = (b: CatalogBook): PlacedBook => {
    const cats = b.categories;
    const shelf: ShelfId = SHELF_OF_CATEGORY[cats[0]] ?? "other";
    let part: string | undefined;
    let rest = cats.slice(1);
    if (shelf === "talmud") {
      if (rest[0] === "Minor Tractates" || rest[1] === "Minor Tractates") {
        return finish(b, "minor", undefined, "Minor tractates");
      }
      part = rest[0] === "Yerushalmi" ? "Talmud Yerushalmi" : "Talmud Bavli";
      rest = rest.slice(1);
    }
    // A book in a commentary category without a book to point to (Mishnah Berurah) stays a main book.
    rest = rest.filter((c) => !COMMENTARY_MARK.test(c));
    const group = rest[0] ?? (shelf === "other" ? b.workTitle : "");
    const subgroup = rest[1] && !SEDARIM[rest[1]] && rest[1] !== b.title ? rest[1] : undefined;
    return finish(b, shelf, part, group, subgroup);
  };

  function finish(b: CatalogBook, shelf: ShelfId, part: string | undefined, group: string, subgroup?: string): PlacedBook {
    const label = [part ?? shelfInfo(shelf).name, group ? shortGroup(group) : ""].filter(Boolean);
    return { ...b, shelf, part, group, subgroup, where: label.join(" · ") };
  }

  for (const b of withCats) {
    if (isCommentary(b)) continue;
    const p = placeMain(b);
    placedMain.set(b.title, p);
    out.push(p);
  }

  for (const b of withCats) {
    if (!isCommentary(b)) continue;
    const cats = b.categories;
    const markAt = cats.findIndex((c) => COMMENTARY_MARK.test(c));
    const base = findBase(b);
    const basePlaced = base ? placedMain.get(base.title) : undefined;
    if (cats[0] === "Halakhah" && cats[markAt] === "Commentary" && !basePlaced) {
      const p = placeMain(b);
      out.push(p);
      continue;
    }
    const title = b.title.split(";")[0].trim();
    let by = cats[markAt + 1]?.replace(/ on .*$/, "");
    if (!by || SEDARIM[by] || ["Torah", "Prophets", "Writings"].includes(by)) {
      const on = title.lastIndexOf(" on ");
      by = on > 0 ? title.slice(0, on) : basePlaced && title.endsWith(basePlaced.title) ? title.slice(0, -basePlaced.title.length).trim() : title;
    }
    const heOn = b.he.indexOf(" על ");
    const byHe = heOn > 0 ? b.he.slice(0, heOn) : basePlaced && b.he.endsWith(basePlaced.he) ? b.he.slice(0, -basePlaced.he.length).trim() || undefined : undefined;
    const era = eraOf(cats[markAt]);
    const shelf = basePlaced?.shelf ?? SHELF_OF_CATEGORY[cats[0]] ?? "other";
    const part = basePlaced?.part ?? (shelf === "talmud" ? (cats[1] === "Yerushalmi" ? "Talmud Yerushalmi" : "Talmud Bavli") : undefined);
    out.push({
      ...b,
      shelf,
      part,
      group: basePlaced?.group ?? cats[1] ?? "",
      commentary: {
        on: basePlaced?.title,
        by,
        // Sefaria keeps a second printing of a few ("…; Alternate Version").
        label: (BY_LABELS[by] ?? by) + (/;\s*Alternate Version/i.test(b.title) ? " (another version)" : ""),
        byHe,
        era,
      },
      where: basePlaced
        ? `Commentary on ${basePlaced.title} · ${era === "Commentaries" ? shelfInfo(shelf).name : era}`
        : `Commentary · ${shelfInfo(shelf).name}`,
    });
  }

  return out.sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Browsing

export interface BookSet {
  name: string;
  he?: string;
  /** What a Hebrew name means: "Knowledge" for Sefer Madda. */
  gloss?: string;
  books: PlacedBook[];
}

export interface GroupView {
  key: string;
  name: string;
  he?: string;
  /** Single books, then collections opened as one tile. */
  books: PlacedBook[];
  sets: BookSet[];
}

export interface PartView {
  name?: string;
  groups: GroupView[];
}

export interface ShelfView extends ShelfInfo {
  count: number;
  parts: PartView[];
}

function groupBooks(books: PlacedBook[], keyOf: (b: PlacedBook) => string, setOf: (b: PlacedBook) => string | undefined): GroupView[] {
  const groups = new Map<string, PlacedBook[]>();
  for (const b of books) {
    const k = keyOf(b);
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const sets = new Map<string, PlacedBook[]>();
    const singles: PlacedBook[] = [];
    for (const b of list) {
      const s = setOf(b);
      if (s) sets.set(s, [...(sets.get(s) ?? []), b]);
      else singles.push(b);
    }
    // A collection of one is just a book.
    for (const [name, members] of [...sets.entries()]) {
      if (members.length === 1) {
        singles.push(members[0]);
        sets.delete(name);
      }
    }
    const d = displayGroup(key);
    return {
      key,
      name: d.name,
      he: d.he,
      books: singles.sort((a, b) => a.order - b.order),
      sets: [...sets.entries()].map(([name, members]) => {
        const label = members[0].commentary?.by === name ? members[0].commentary.label : name;
        return {
          name: label,
          he: SET_NAMES[name]?.he ?? commonHe(members),
          gloss: SET_NAMES[name]?.gloss || undefined,
          books: members.sort((a, b) => a.order - b.order),
        };
      }),
    };
  });
}

/** The Hebrew name a collection's books share at their start ("משנה תורה"), if any. */
function commonHe(books: PlacedBook[]): string | undefined {
  const firsts = books.map((b) => b.commentary?.byHe ?? b.he.split(",")[0].trim());
  return firsts.every((f) => f === firsts[0]) && firsts[0] ? firsts[0] : undefined;
}

const PART_ORDER = ["Talmud Bavli", "Talmud Yerushalmi"];
const COMMENTARY_PARTS: Record<string, string> = {
  Tanakh: "On Tanakh",
  Mishnah: "On the Mishnah",
  "Talmud Bavli": "On the Talmud Bavli",
  "Talmud Yerushalmi": "On the Talmud Yerushalmi",
  Halacha: "On halacha",
  Midrash: "On the Midrash",
};

function minOrder(books: PlacedBook[]): number {
  return Math.min(...books.map((b) => b.order));
}

function groupOrder(g: GroupView): number {
  return minOrder([...g.books, ...g.sets.flatMap((s) => s.books)]);
}
const ERA_ORDER = ["Targum", "Rishonim", "Acharonim", "Commentaries", "Modern"];
const ERA_NAMES: Record<string, { name: string; he?: string }> = {
  Targum: { name: "Targumim (Aramaic translations)", he: "תרגומים" },
  Rishonim: { name: "Rishonim (earlier authorities)", he: "ראשונים" },
  Acharonim: { name: "Acharonim (later authorities)", he: "אחרונים" },
  Modern: { name: "Recent", he: "בני זמננו" },
  Commentaries: { name: "Commentaries", he: "מפרשים" },
};

/** The shelves that hold at least one book, each with its parts, groups and collections. */
export function buildShelves(placed: PlacedBook[]): ShelfView[] {
  const views: ShelfView[] = [];
  for (const info of SHELVES) {
    if (info.id === "commentaries") {
      const list = placed.filter((b) => b.commentary);
      if (!list.length) continue;
      // By what they explain, then by era; each commentator's books are one collection.
      const byShelf = new Map<string, PlacedBook[]>();
      for (const b of list) {
        const k = b.part ?? shelfInfo(b.shelf).name;
        byShelf.set(k, [...(byShelf.get(k) ?? []), b]);
      }
      // In shelf order: Tanakh, Mishnah, the Bavli, the Yerushalmi, Halacha, ...
      const rank = (books: PlacedBook[]) => SHELVES.findIndex((x) => x.id === books[0].shelf) * 10 + Math.max(0, PART_ORDER.indexOf(books[0].part ?? ""));
      const parts: PartView[] = [...byShelf.entries()]
        .sort((a, b) => rank(a[1]) - rank(b[1]))
        .map(([name, books]) => ({
          name: COMMENTARY_PARTS[name] ?? `On ${name}`,
          groups: groupBooks(
            books,
            (b) => b.commentary!.era,
            (b) => b.commentary!.by,
          )
            .sort((a, b) => ERA_ORDER.indexOf(a.key) - ERA_ORDER.indexOf(b.key))
            .map((g) => ({ ...g, ...(ERA_NAMES[g.key] ?? { name: g.key }) })),
        }));
      views.push({ ...info, count: list.length, parts });
      continue;
    }
    const books = placed.filter((b) => !b.commentary && b.shelf === info.id);
    if (!books.length) continue;
    const byPart = new Map<string, PlacedBook[]>();
    for (const b of books) byPart.set(b.part ?? "", [...(byPart.get(b.part ?? "") ?? []), b]);
    const parts: PartView[] = [...byPart.entries()]
      .sort((a, b) => PART_ORDER.indexOf(a[0]) - PART_ORDER.indexOf(b[0]))
      .map(([name, list]) => ({
        name: name || undefined,
        groups: groupBooks(
          list,
          (b) => b.group,
          (b) => b.subgroup,
        ).sort((a, b) => groupOrder(a) - groupOrder(b)),
      }));
    views.push({ ...info, count: books.length, parts });
  }
  return views;
}

/** The commentaries in the library on one book, by era, each with its commentator's name. */
export function commentariesOf(placed: PlacedBook[], title: string): Array<{ era: string; name: string; books: PlacedBook[] }> {
  const list = placed.filter((b) => b.commentary?.on === title);
  const byEra = new Map<string, PlacedBook[]>();
  for (const b of list) byEra.set(b.commentary!.era, [...(byEra.get(b.commentary!.era) ?? []), b]);
  return [...byEra.entries()]
    .sort((a, b) => ERA_ORDER.indexOf(a[0]) - ERA_ORDER.indexOf(b[0]))
    .map(([era, books]) => ({ era, name: ERA_NAMES[era]?.name ?? era, books: books.sort((a, b) => a.order - b.order) }));
}

// ---------------------------------------------------------------------------
// Searching

interface Tok {
  plain: string;
  skel: string;
  /** Positions in the name this token covers (two for a pair of words read as one). */
  pos: number[];
}

/**
 * A spelling-proof key for a word: Ashkenazi and Sephardi spellings, kh/ch/h, tz/ts, doubled
 * letters and vowels all fall away, so Kiddushin, Kidushin and Kedushin share one key, as do
 * Berakhot and Brachos, and Ketubot and Kesubos. Short keys collide (Rashi, Rosh), so a match on
 * the key alone counts for less than a match on the word itself.
 */
export function skeleton(word: string): string {
  const p = plain(word);
  if (isHebrew(p)) {
    return p
      .replace(/[^א-ת]/g, "")
      .replace(/ך/g, "כ")
      .replace(/ם/g, "מ")
      .replace(/ן/g, "נ")
      .replace(/ף/g, "פ")
      .replace(/ץ/g, "צ")
      .replace(/(?!^)[וי]/g, "")
      .replace(/(.)\1+/g, "$1");
  }
  let s = p.replace(/[^a-z0-9]/g, "");
  s = s
    .replace(/sch/g, "$")
    .replace(/sh/g, "$")
    .replace(/t[sz]/g, "z")
    .replace(/zz/g, "z")
    .replace(/[ck]h/g, "h")
    .replace(/ck/g, "k")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/[cq]/g, "k")
    .replace(/x/g, "ks")
    .replace(/w/g, "v")
    .replace(/([aeiou])h$/, "$1")
    // Ashkenazi "s" for a tav without a dagesh: Kesubos, Shabbos, Brachos.
    .replace(/s/g, "t");
  if (!s) return "";
  s = s[0] + s.slice(1).replace(/[aeiouy]/g, "");
  s = s.replace(/^[aeiou]/, "");
  return s.replace(/(.)\1+/g, "$1");
}

export function tokensOf(name: string): Tok[] {
  const words = plain(name)
    .split(/[\s,;:()\-–—/&־+.]+/)
    .filter(Boolean);
  const out: Tok[] = [];
  words.forEach((w, i) => {
    out.push({ plain: w, skel: skeleton(w), pos: [i] });
    for (const syn of WORD_SYNONYMS[w] ?? []) out.push({ plain: syn, skel: skeleton(syn), pos: [i] });
    if (i + 1 < words.length) {
      const joined = w + words[i + 1];
      out.push({ plain: joined, skel: skeleton(joined), pos: [i, i + 1] });
    }
  });
  return out;
}

function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > limit) return limit + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How alike two words are, from 0 to 1. */
function likeness(a: string, b: string): number {
  const n = Math.max(a.length, b.length);
  return n ? 1 - editDistance(a, b, n) / n : 0;
}

/** How well a typed word matches a word of a name: 0 for not at all, 3 for the very word. */
export function matchWord(q: Tok, n: Tok): number {
  if (!q.plain || !n.plain) return 0;
  if (isHebrew(q.plain) !== isHebrew(n.plain)) return 0;
  if (q.plain === n.plain) return 3;
  let best = 0;
  const offer = (s: number) => {
    if (s > best) best = s;
  };
  if (q.skel && q.skel === n.skel) {
    if (q.skel.length >= 3) offer(2.2 + 0.4 * likeness(q.plain, n.plain));
    else if (q.plain.length >= 3 && n.plain.length >= 3) offer(1 + 0.5 * likeness(q.plain, n.plain));
  }
  if (q.plain.length >= 2 && n.plain.startsWith(q.plain)) offer(1.5 + q.plain.length / n.plain.length);
  if (q.skel.length >= 3 && n.skel.startsWith(q.skel)) offer(1.4);
  if (q.plain.length >= 4 && n.plain.includes(q.plain)) offer(1.2);
  if (q.plain.length >= 5 && editDistance(q.plain, n.plain, 1) <= 1) offer(1.4);
  const allowed = q.skel.length >= 6 ? 2 : q.skel.length >= 4 ? 1 : 0;
  if (!best && allowed && editDistance(q.skel, n.skel, allowed) <= allowed) offer(1 + 0.4 * likeness(q.plain, n.plain));
  return best;
}

interface Query {
  content: Tok[];
  shelfWords: Array<{ tok: Tok; key: string }>;
  fillers: Tok[];
  place?: string;
}

function readQuery(text: string): Query {
  const q: Query = { content: [], shelfWords: [], fillers: [] };
  const words = plain(text)
    .split(/[\s,;()\-–—/&־+]+/)
    .filter(Boolean);
  words.forEach((w, i) => {
    const tok: Tok = { plain: w.replace(/[.:]+$/, ""), skel: skeleton(w), pos: [i] };
    if (!tok.plain) return;
    // A page or verse: "40b", "3:4", or a number after a name ("Kiddushin 40"); "1 Samuel" stays a name.
    if (!q.place && (/^\d+(?:[ab]|[:.]\d+)$/.test(tok.plain) || (i > 0 && /^\d+$/.test(tok.plain)))) {
      q.place = w;
      return;
    }
    const key = SHELF_WORDS[tok.plain];
    if (key) q.shelfWords.push({ tok, key });
    else if (FILLER.has(tok.plain)) q.fillers.push(tok);
    else q.content.push(tok);
  });
  return q;
}

/** The shelf words each book answers to, with how strongly. */
function shelfWordsOf(b: PlacedBook): Map<string, number> {
  const m = new Map<string, number>();
  const w = b.commentary ? 0.5 : 1;
  const add = (k: string, v = 1) => m.set(k, Math.max(m.get(k) ?? 0, v * w));
  if (b.shelf === "talmud") {
    add("talmud");
    if (b.part === "Talmud Yerushalmi") {
      add("yerushalmi");
      add("gemara", 0.6);
    } else {
      add("bavli");
      add("gemara");
    }
  }
  if (b.shelf === "mishnah") add("mishnah");
  if (b.shelf === "tanakh") {
    add("tanakh");
    add(b.group === "Torah" ? "torah" : "nach");
  }
  if (b.shelf === "halacha") add("halacha");
  if (b.shelf === "midrash") add("midrash");
  if (b.commentary) m.set("commentary", 1);
  return m;
}

function namesOf(b: PlacedBook, byTitle: Map<string, PlacedBook>): string[] {
  const names = [b.title, b.he, ...(BOOK_ALIASES[b.title] ?? [])];
  if (b.title.startsWith("Mishneh Torah, ")) names.push(`Rambam ${b.title.slice("Mishneh Torah, ".length)}`);
  const c = b.commentary;
  if (c) {
    const on = c.on ? [c.on, ...(BOOK_ALIASES[c.on] ?? [])] : [];
    const by = [c.by, ...(BY_ALIASES[c.by] ?? [])];
    for (const x of by) for (const y of on) names.push(`${x} on ${y}`);
    if (c.on) {
      const base = byTitle.get(c.on);
      if (base && base.he && c.byHe) names.push(`${c.byHe} ${base.he}`);
    }
  }
  return [...new Set(names.filter(Boolean))];
}

interface Scored {
  score: number;
  missing: number;
  /** How well each typed name word matched, in order. */
  words: number[];
}

function scoreName(q: Query, name: Tok[], keys: Map<string, number>): Scored {
  const used = new Set<number>();
  const take = (tok: Tok, minScore = 0): number => {
    let best = 0;
    let bestTok: Tok | undefined;
    for (const n of name) {
      if (n.pos.some((p) => used.has(p))) continue;
      // Two words read as one ("bavakamma") count only when typed whole, not as a beginning.
      const m = matchWord(tok, n);
      const s = n.pos.length > 1 ? (m >= 2.2 ? m + 0.2 : 0) : m;
      if (s > best) {
        best = s;
        bestTok = n;
      }
    }
    if (bestTok && best > minScore) {
      for (const p of bestTok.pos) used.add(p);
      return best;
    }
    return 0;
  };

  let score = 0;
  let missing = 0;
  const words: number[] = [];
  for (const tok of q.content) {
    const s = take(tok);
    words.push(s);
    if (s) score += s;
    else missing += 1;
  }
  for (const { tok, key } of q.shelfWords) {
    const s = take(tok, 2.5);
    if (s) score += s;
    else {
      const w = keys.get(key) ?? 0;
      score += w > 0 ? 2 * w : -1.2;
    }
  }
  for (const tok of q.fillers) if (take(tok, 2.9)) score += 0.2;

  const nameWords = new Set(name.flatMap((n) => n.pos));
  let unused = 0;
  for (const p of nameWords) {
    if (used.has(p)) continue;
    const word = name.find((n) => n.pos.length === 1 && n.pos[0] === p)?.plain ?? "";
    if (!FILLER.has(word)) unused += 1;
  }
  score += unused === 0 ? 1.5 : -0.35 * Math.min(unused, 5);
  return { score, missing, words };
}

export interface BookSearch {
  books: PlacedBook[];
  /** True when nothing matched every word, so these are the nearest matches. */
  closest: boolean;
  /** A page or verse typed with the name: "40b", "3:4". */
  place?: string;
  /** The shelf the words named, when no book name was typed ("gemara" alone). */
  shelf?: ShelfId;
}

const SHELF_OF_KEY: Record<string, ShelfId> = {
  gemara: "talmud",
  talmud: "talmud",
  bavli: "talmud",
  yerushalmi: "talmud",
  mishnah: "mishnah",
  tanakh: "tanakh",
  torah: "tanakh",
  nach: "tanakh",
  halacha: "halacha",
  midrash: "midrash",
  commentary: "commentaries",
};

const indexCache = new WeakMap<PlacedBook[], Array<{ book: PlacedBook; keys: Map<string, number>; names: Tok[][] }>>();

function searchIndex(placed: PlacedBook[]) {
  let index = indexCache.get(placed);
  if (!index) {
    const byTitle = new Map(placed.map((b) => [b.title, b]));
    index = placed.map((book) => ({ book, keys: shelfWordsOf(book), names: namesOf(book, byTitle).map(tokensOf) }));
    indexCache.set(placed, index);
  }
  return index;
}

/** Find books by any part of their name, in English or Hebrew, forgiving spelling. */
export function searchBooks(placed: PlacedBook[], text: string, limit = 50): BookSearch {
  const q = readQuery(text);
  if (!q.content.length && !q.shelfWords.length) {
    if (!q.fillers.length) return { books: [], closest: false, place: q.place };
    // Only filler words: treat them as names ("Sefer", "Seder").
    q.content = q.fillers;
    q.fillers = [];
  }
  const results: Array<{ book: PlacedBook; score: number; missing: number; words: number[] }> = [];
  for (const { book: b, keys, names } of searchIndex(placed)) {
    let best: Scored | undefined;
    for (const name of names) {
      const s = scoreName(q, name, keys);
      if (!best || s.missing < best.missing || (s.missing === best.missing && s.score > best.score)) best = s;
    }
    if (!best) continue;
    let score = best.score;
    if (!b.commentary) score += 0.8;
    if (b.shelf === "talmud" && b.part === "Talmud Bavli" && !b.commentary) score += 0.4;
    else if ((b.shelf === "tanakh" || b.shelf === "mishnah") && !b.commentary) score += 0.3;
    if (!q.content.length) {
      // Only shelf words, like "gemara": the books of that shelf, in order.
      const keys2 = q.shelfWords.map((s) => keys.get(s.key) ?? 0);
      if (keys2.some((k) => k < 1)) continue;
    }
    results.push({ book: b, score, missing: best.missing, words: best.words });
  }
  const shelfOnly = !q.content.length;
  let strict = results.filter((r) => r.missing === 0);
  // When a typed word is some book's very word ("Rashi"), drop books that only resemble it
  // ("Rosh", "Rashash"); otherwise keep the near matches close to the best one.
  if (strict.length) {
    const best = q.content.map((_, i) => Math.max(...strict.map((r) => r.words[i])));
    const floor = best.map((b) => (b >= 3 ? 2.45 : b - 1));
    strict = strict.filter((r) => r.words.every((w, i) => w >= floor[i]));
  }
  let closest = false;
  let pool = strict;
  if (!pool.length && q.content.length) {
    const need = Math.max(1, Math.ceil(q.content.length / 2));
    pool = results.filter((r) => q.content.length - r.missing >= need);
    for (const r of pool) r.score -= 2 * r.missing;
    closest = pool.length > 0;
  }
  pool.sort((a, b) => (shelfOnly ? a.book.order - b.book.order : b.score - a.score || a.book.order - b.book.order));
  return {
    books: pool.slice(0, limit).map((r) => r.book),
    closest,
    place: q.place,
    shelf: shelfOnly ? SHELF_OF_KEY[q.shelfWords[0].key] : undefined,
  };
}

/** A reference for a book and a page or verse typed with it ("Kiddushin" + "40" → "Kiddushin 40a"). */
export function placeRef(book: PlacedBook, place: string): string {
  const p = place.replace(/\.$/, "").replace(".", ":");
  if (book.shelf === "talmud" && book.part === "Talmud Bavli" && !book.commentary && /^\d+$/.test(p)) return `${book.title} ${p}a`;
  return `${book.title} ${p}`;
}

// ---------------------------------------------------------------------------
// A book's sections, and the library home

/** The shelves on the first row of the library; the others are under "More". */
export const MAIN_SHELVES: ShelfId[] = ["tanakh", "mishnah", "talmud", "halacha", "midrash", "prayer"];

/**
 * A section's short name inside its book: "5b" for "Berakhot 5b", "1" for "Genesis 1". Null when
 * the section isn't in that book ("Genesis Rabbah 1" isn't in "Genesis").
 */
export function sectionIn(book: string, section: string): string | null {
  if (!section.startsWith(`${book} `)) return null;
  const rest = section.slice(book.length + 1);
  return /^\d/.test(rest) ? rest : null;
}

/** A section's label in a grid of its book's sections: its short name, or the whole name. */
export function sectionLabel(book: string, section: string): string {
  return sectionIn(book, section) ?? (section.startsWith(`${book}, `) ? section.slice(book.length + 2) : section);
}

/** The newest place read in a book, if any (recent places are listed newest first). */
export function lastPlaceIn<T extends { title: string }>(book: string, recent: T[]): T | undefined {
  return recent.find((r) => sectionIn(book, r.title) !== null);
}
