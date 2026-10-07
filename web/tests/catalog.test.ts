import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShelves, commentariesOf, lastPlaceIn, MAIN_SHELVES, placeBooks, placeRef, searchBooks, sectionIn, sectionLabel, skeleton, type CatalogBook } from "../lib/library/catalog";

// Book names and Sefaria category paths shaped like the testing library's; no texts.
let order = 0;
const book = (title: string, he: string, workTitle: string, categories: string[]): CatalogBook => ({
  title,
  he,
  workTitle,
  categories,
  firstRef: `${title} 1`,
  order: ++order,
});
const BOOKS: CatalogBook[] = [
  book("Genesis", "בראשית", "Tanakh", ["Tanakh", "Torah"]),
  book("Exodus", "שמות", "Tanakh", ["Tanakh", "Torah"]),
  book("Psalms", "תהילים", "Tanakh", ["Tanakh", "Writings"]),
  book("Mishnah Kiddushin", "משנה קידושין", "Mishnah", ["Mishnah", "Seder Nashim"]),
  book("Berakhot", "ברכות", "Talmud Bavli", ["Talmud", "Bavli", "Seder Zeraim"]),
  book("Shabbat", "שבת", "Talmud Bavli", ["Talmud", "Bavli", "Seder Moed"]),
  book("Ketubot", "כתובות", "Talmud Bavli", ["Talmud", "Bavli", "Seder Nashim"]),
  book("Kiddushin", "קידושין", "Talmud Bavli", ["Talmud", "Bavli", "Seder Nashim"]),
  book("Bava Kamma", "בבא קמא", "Talmud Bavli", ["Talmud", "Bavli", "Seder Nezikin"]),
  book("Jerusalem Talmud Kiddushin", "תלמוד ירושלמי קידושין", "Talmud Yerushalmi", ["Talmud", "Yerushalmi", "Seder Nashim"]),
  book("Rashi on Genesis", 'רש"י על בראשית', "Rashi on Tanakh", ["Tanakh", "Rishonim on Tanakh", "Rashi", "Torah"]),
  book("Onkelos Genesis", "אונקלוס בראשית", "Targum Onkelos", ["Tanakh", "Targum", "Onkelos", "Torah"]),
  book("Gur Aryeh on Bereishit", "גור אריה על בראשית", "Maharal", ["Tanakh", "Acharonim on Tanakh", "Gur Aryeh", "Torah"]),
  book("Rashi on Kiddushin", 'רש"י על קידושין', "Rishonim", ["Talmud", "Bavli", "Rishonim on Talmud", "Rashi", "Seder Nashim"]),
  book("Tosafot on Kiddushin", "תוספות על קידושין", "Rishonim", ["Talmud", "Bavli", "Rishonim on Talmud", "Tosafot", "Seder Nashim"]),
  book("Rif Kiddushin", 'רי"ף קידושין', "Rif", ["Talmud", "Bavli", "Rishonim on Talmud", "Rif", "Seder Nashim"]),
  book("Chidushei Halachot on Kiddushin", "חדושי הלכות על קידושין", "Acharonim", ["Talmud", "Bavli", "Acharonim on Talmud", "Chidushei Halachot", "Seder Nashim"]),
  book("Rosh on Kiddushin", 'פסקי הרא"ש על קידושין', "Rosh", ["Talmud", "Bavli", "Rishonim on Talmud", "Rosh", "Seder Nashim"]),
  book("Bartenura on Mishnah Kiddushin", "ברטנורא על משנה קידושין", "Bartenura", ["Mishnah", "Rishonim on Mishnah", "Bartenura", "Seder Nashim"]),
  book("Mishneh Torah, Sabbath", "משנה תורה, הלכות שבת", "Mishneh Torah", ["Halakhah", "Mishneh Torah", "Sefer Zemanim"]),
  book("Mishneh Torah, Eruvin", "משנה תורה, הלכות עירובין", "Mishneh Torah", ["Halakhah", "Mishneh Torah", "Sefer Zemanim"]),
  book("Shulchan Arukh, Orach Chayim", "שולחן ערוך, אורח חיים", "Shulchan Arukh", ["Halakhah", "Shulchan Arukh"]),
  book("Mishnah Berurah", "משנה ברורה", "Mishnah Berurah", ["Halakhah", "Shulchan Arukh", "Commentary", "Mishnah Berurah"]),
  book("Kitzur Shulchan Arukh", "קיצור שולחן ערוך", "Kitzur", ["Halakhah"]),
  book("Kuzari", "כוזרי", "The Kuzari", ["Jewish Thought", "Rishonim"]),
  book("Jastrow", "מילון יאסטרוב", "Jastrow", ["Reference", "Dictionary"]),
];
const placed = placeBooks(BOOKS);
const titles = (q: string) => searchBooks(placed, q).books.map((b) => b.title);
const get = (title: string) => placed.find((b) => b.title === title)!;

test("books are placed on their shelves, by seder and part", () => {
  assert.equal(get("Kiddushin").shelf, "talmud");
  assert.equal(get("Kiddushin").part, "Talmud Bavli");
  assert.equal(get("Kiddushin").group, "Seder Nashim");
  assert.equal(get("Kiddushin").where, "Talmud Bavli · Nashim");
  assert.equal(get("Jerusalem Talmud Kiddushin").part, "Talmud Yerushalmi");
  assert.equal(get("Mishnah Kiddushin").shelf, "mishnah");
  assert.equal(get("Psalms").group, "Writings");
  assert.equal(get("Mishneh Torah, Sabbath").subgroup, "Sefer Zemanim");
  // A halacha work in a commentary category with no book to point to stays a main book.
  assert.equal(get("Mishnah Berurah").commentary, undefined);
  assert.equal(get("Mishnah Berurah").shelf, "halacha");
});

test("each commentary is tied to the book it explains", () => {
  assert.deepEqual(get("Rashi on Kiddushin").commentary, { on: "Kiddushin", by: "Rashi", label: "Rashi", byHe: 'רש"י', era: "Rishonim" });
  assert.equal(get("Chidushei Halachot on Kiddushin").commentary?.label, "Maharsha (Halachot)");
  assert.equal(get("Rashi on Kiddushin").where, "Commentary on Kiddushin · Rishonim");
  assert.equal(get("Rif Kiddushin").commentary?.on, "Kiddushin");
  assert.equal(get("Rif Kiddushin").commentary?.by, "Rif");
  assert.equal(get("Onkelos Genesis").commentary?.on, "Genesis");
  assert.equal(get("Onkelos Genesis").commentary?.era, "Targum");
  assert.equal(get("Gur Aryeh on Bereishit").commentary?.on, "Genesis", "a Hebrew book name finds the book");
  assert.equal(get("Bartenura on Mishnah Kiddushin").commentary?.on, "Mishnah Kiddushin");
  // Jerusalem Talmud Kiddushin ends with "Kiddushin" but explains nothing.
  assert.equal(get("Jerusalem Talmud Kiddushin").commentary, undefined);
  const onKiddushin = commentariesOf(placed, "Kiddushin");
  assert.deepEqual(
    onKiddushin.map((e) => [e.era, e.books.map((b) => b.commentary!.by)]),
    [
      ["Rishonim", ["Rashi", "Tosafot", "Rif", "Rosh"]],
      ["Acharonim", ["Chidushei Halachot"]],
    ],
  );
});

test("the shelves show main books by group, and commentators as collections", () => {
  const shelves = buildShelves(placed);
  const ids = shelves.map((s) => s.id);
  assert.deepEqual(ids, ["tanakh", "mishnah", "talmud", "halacha", "thought", "reference", "commentaries"]);
  const talmud = shelves.find((s) => s.id === "talmud")!;
  assert.deepEqual(
    talmud.parts.map((p) => p.name),
    ["Talmud Bavli", "Talmud Yerushalmi"],
  );
  const bavli = talmud.parts[0];
  assert.deepEqual(
    bavli.groups.map((g) => [g.name, g.he, g.books.map((b) => b.title)]),
    [
      ["Zeraim (Seeds)", "זרעים", ["Berakhot"]],
      ["Moed (Festivals)", "מועד", ["Shabbat"]],
      ["Nashim (Women)", "נשים", ["Ketubot", "Kiddushin"]],
      ["Nezikin (Damages)", "נזיקין", ["Bava Kamma"]],
    ],
  );
  // No commentary sits among the tractates.
  assert.ok(talmud.parts.flatMap((p) => p.groups.flatMap((g) => g.books)).every((b) => !b.commentary));
  const halacha = shelves.find((s) => s.id === "halacha")!;
  const mt = halacha.parts[0].groups.find((g) => g.key === "Mishneh Torah")!;
  assert.deepEqual(
    mt.sets.map((s) => [s.name, s.he, s.gloss, s.books.length]),
    [["Sefer Zemanim", "ספר זמנים", "Times", 2]],
  );
  const comm = shelves.find((s) => s.id === "commentaries")!;
  assert.deepEqual(
    comm.parts.map((p) => p.name),
    ["On Tanakh", "On the Mishnah", "On the Talmud Bavli"],
  );
});

test("a tractate is found however it is typed", () => {
  for (const q of ["Kiddushin", "kidushin", "Kedushin", "kidd", "קידושין", "קדושין", "Gemara Kiddushin", "Kiddushin Gemara", "the gemara of kiddushin", "masechet kiddushin"]) {
    assert.equal(titles(q)[0], "Kiddushin", q);
  }
  assert.equal(titles("Kesubos")[0], "Ketubot");
  assert.equal(titles("Shabbos")[0], "Shabbat");
  assert.equal(titles("Brachos")[0], "Berakhot");
  assert.equal(titles("baba kama")[0], "Bava Kamma");
  assert.equal(titles("bavakamma")[0], "Bava Kamma");
  assert.equal(titles("BK")[0], "Bava Kamma");
  assert.equal(titles("ב״ק")[0], "Bava Kamma");
});

test("shelf words choose between the Gemara, the Mishnah and the Yerushalmi", () => {
  assert.equal(titles("mishnah kiddushin")[0], "Mishnah Kiddushin");
  assert.equal(titles("yerushalmi kiddushin")[0], "Jerusalem Talmud Kiddushin");
  assert.ok(!titles("gemara kiddushin").includes("Mishnah Kiddushin") || titles("gemara kiddushin").indexOf("Mishnah Kiddushin") > titles("gemara kiddushin").indexOf("Rashi on Kiddushin"));
  const gemara = searchBooks(placed, "gemara");
  assert.equal(gemara.shelf, "talmud");
  assert.deepEqual(gemara.books.map((b) => b.title), ["Berakhot", "Shabbat", "Ketubot", "Kiddushin", "Bava Kamma"]);
});

test("commentaries are found by commentator and book, in any order and spelling", () => {
  assert.deepEqual(titles("rashi kiddushin"), ["Rashi on Kiddushin"]);
  assert.deepEqual(titles("kiddushin rashi"), ["Rashi on Kiddushin"]);
  assert.equal(titles("tosfos kidushin")[0], "Tosafot on Kiddushin");
  assert.deepEqual(titles("maharsha kiddushin"), ["Chidushei Halachot on Kiddushin"]);
  assert.deepEqual(titles("rashi bereishis"), ["Rashi on Genesis"]);
  assert.equal(titles("tehillim")[0], "Psalms");
  // "Rashi" is a word of some names, so names that only look like it (Rosh) are left out.
  assert.ok(!titles("rashi").includes("Rosh on Kiddushin"));
});

test("other works, partial names, and nothing found", () => {
  assert.deepEqual(titles("kitzur"), ["Kitzur Shulchan Arukh"]);
  assert.equal(titles("orach chaim")[0], "Shulchan Arukh, Orach Chayim");
  assert.equal(titles("mishna berura")[0], "Mishnah Berurah");
  assert.equal(titles("rambam shabbos")[0], "Mishneh Torah, Sabbath");
  assert.deepEqual(titles("zzzz qqq"), []);
  const near = searchBooks(placed, "kiddushin rashi tosafot");
  assert.equal(near.closest, true);
  assert.ok(near.books.some((b) => b.title === "Rashi on Kiddushin"));
});

test("a page typed with a name opens that page", () => {
  const r = searchBooks(placed, "kiddushin 40b");
  assert.equal(r.books[0].title, "Kiddushin");
  assert.equal(r.place, "40b");
  assert.equal(placeRef(r.books[0], "40b"), "Kiddushin 40b");
  assert.equal(placeRef(r.books[0], "40"), "Kiddushin 40a");
  assert.equal(placeRef(get("Psalms"), "23"), "Psalms 23");
  assert.equal(placeRef(get("Genesis"), "1:3"), "Genesis 1:3");
  // A number before a name is part of the name, not a page.
  assert.equal(searchBooks(placed, "1 kiddushin").place, undefined);
});

test("spelling keys", () => {
  assert.equal(skeleton("Kiddushin"), skeleton("Kidushin"));
  assert.equal(skeleton("Berakhot"), skeleton("Brachos"));
  assert.equal(skeleton("Ketubot"), skeleton("Kesubos"));
  assert.equal(skeleton("קידושין"), skeleton("קדושין"));
  assert.notEqual(skeleton("Shabbat"), skeleton("Shevuot"));
});

test("a section's place in its book, and the last place read there", () => {
  assert.equal(sectionIn("Berakhot", "Berakhot 5b"), "5b");
  assert.equal(sectionIn("Genesis", "Genesis 12"), "12");
  assert.equal(sectionIn("Genesis", "Genesis Rabbah 1"), null);
  assert.equal(sectionIn("Genesis", "Exodus 1"), null);
  assert.equal(sectionLabel("Berakhot", "Berakhot 5b"), "5b");
  assert.equal(sectionLabel("Mishneh Torah", "Mishneh Torah, Prayer 1"), "Prayer 1");
  assert.equal(sectionLabel("Genesis", "Something else"), "Something else");
  const recent = [
    { title: "Genesis Rabbah 3", at: 3 },
    { title: "Berakhot 5b", at: 2 },
    { title: "Berakhot 2a", at: 1 },
  ];
  assert.equal(lastPlaceIn("Berakhot", recent)?.title, "Berakhot 5b");
  assert.equal(lastPlaceIn("Genesis", recent), undefined);
  assert.deepEqual(MAIN_SHELVES, ["tanakh", "mishnah", "talmud", "halacha", "midrash", "prayer"]);
});
