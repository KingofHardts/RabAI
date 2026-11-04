import { test } from "node:test";
import assert from "node:assert/strict";
import { contentsTree } from "../lib/library/contents-tree";
import { findPrayers, foldPrayer, knownPrayer, prayerForHour, prayerNames, siddurOrder, wantsDavening, wantsTimes } from "../lib/library/prayer-find";

const tree = (book: string, labels: string[]) => ({
  book,
  nodes: contentsTree(labels.map((label) => ({ label, section: `${book}, ${label}` })))!,
});

const ashkenaz = tree("Siddur Ashkenaz", [
  "Weekday, Shacharit, Preparatory Prayers, Modeh Ani",
  "Weekday, Shacharit, Preparatory Prayers, Morning Blessings",
  "Weekday, Mincha, Ashrei",
  "Weekday, Mincha, Amidah",
  "Weekday, Shacharit, Blessings of the Shema, Shema",
  "Weekday, Maariv, Barchu",
  "Weekday, Maariv, Bedtime Shema",
  "Weekday, Post Meal Blessing, Birkat HaMazon",
  "Shabbat, Mincha, Ashrei",
  "Shabbat, Kabbalat Shabbat, Lecha Dodi",
]);
const sefard = tree("Siddur Sefard", ["Weekday Mincha, Korbanot", "Weekday Mincha, Ashrei", "Upon Arising, Modeh Ani", "Upon Arising, Netilat Yadayim"]);

test("names are folded the way people type them", () => {
  assert.equal(foldPrayer("Ma'ariv"), "maariv");
  assert.equal(foldPrayer("Birkhat HaMazon"), "birchat hamazon");
  assert.ok(prayerNames("Minchah").includes("mincha"));
  assert.ok(prayerNames("bentching").includes("birkat hamazon"));
  assert.ok(prayerNames("Shacharis").includes("shacharit"));
  assert.deepEqual(prayerNames("ab"), []);
});

test("Mincha finds the siddurs' Mincha, whole headings first", () => {
  const hits = findPrayers([ashkenaz, sefard], "Mincha");
  assert.ok(hits.length >= 3);
  assert.deepEqual(hits[0].path, ["Weekday", "Mincha"]);
  assert.equal(hits[0].section, "Siddur Ashkenaz, Weekday, Mincha, Ashrei", "a heading opens its first prayer");
  assert.ok(hits.some((h) => h.book === "Siddur Ashkenaz" && h.path.join("/") === "Shabbat/Mincha"));
  assert.ok(hits.some((h) => h.book === "Siddur Sefard" && h.path[0] === "Weekday Mincha"));
  // Parts inside a match aren't listed again.
  assert.ok(!hits.some((h) => h.path.join("/") === "Weekday/Mincha/Ashrei"));
});

test("every spelling of the prayer named counts the same, so the siddurs keep their order", () => {
  const minchah = tree("Siddur Ashkenaz", ["Weekday, Minchah, Ashrei", "Weekday, Minchah, Amidah"]);
  const other = tree("Siddur Sefard", ["Shabbat Eve Mincha, Mincha, Ashrei", "Shabbat Eve Mincha, Mincha, Amidah"]);
  const hits = findPrayers([minchah, other], "Mincha");
  assert.equal(hits[0].book, "Siddur Ashkenaz");
  assert.equal(hits[0].path.at(-1), "Minchah");
});

test("other spellings and English names find the same prayers", () => {
  assert.equal(findPrayers([ashkenaz], "bentching")[0].path.at(-1), "Birkat HaMazon");
  assert.equal(findPrayers([ashkenaz], "Kabbolas Shabbos")[0].path.at(-1), "Kabbalat Shabbat");
  assert.equal(findPrayers([ashkenaz], "Modeh Ani")[0].section, "Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani");
  assert.equal(findPrayers([ashkenaz], "Lekha Dodi")[0].path.at(-1), "Lecha Dodi");
  assert.equal(findPrayers([ashkenaz], "Shema")[0].path.at(-1), "Shema", "the name as typed comes first");
  assert.ok(findPrayers([ashkenaz], "Shema").some((h) => h.path.at(-1) === "Bedtime Shema"));
  assert.deepEqual(findPrayers([ashkenaz], "Menachot"), [], "a tractate's name finds no prayer");
});

test("a prayer's own name is told apart from a book that shares a word", () => {
  for (const q of ["Mincha", "bentching", "Shacharis", "lecha dodi", "Havdalah"]) assert.ok(knownPrayer(q), q);
  for (const q of ["Berakhot", "Rashi", "Shabbat"]) assert.ok(!knownPrayer(q), q);
});

test("davening and times are recognized", () => {
  for (const q of ["davening", "Daven", "tefillah", "Siddur", "prayers"]) assert.ok(wantsDavening(q), q);
  for (const q of ["Mincha", "Berakhot"]) assert.ok(!wantsDavening(q), q);
  for (const q of ["zmanim", "Zmanim", "sunset", "candle lighting", "when does shabbat end", "sof zman shema", "Tzeis"]) assert.ok(wantsTimes(q), q);
  for (const q of ["Shabbat", "Mincha", "Rashi"]) assert.ok(!wantsTimes(q), q);
});

test("siddurs in a sensible order, and the prayer for the hour", () => {
  assert.deepEqual(siddurOrder(["Siddur Sefard", "Siddur Rashi", "Siddur Ashkenaz", "Rabbi Sacks on Siddur"]), [
    "Siddur Ashkenaz",
    "Siddur Sefard",
    "Rabbi Sacks on Siddur",
    "Siddur Rashi",
  ]);
  assert.equal(prayerForHour(7), "Shacharit");
  assert.equal(prayerForHour(14), "Mincha");
  assert.equal(prayerForHour(21), "Maariv");
  assert.equal(prayerForHour(2), "Maariv");
});
