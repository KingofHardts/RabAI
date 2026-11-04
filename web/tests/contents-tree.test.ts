import { test } from "node:test";
import assert from "node:assert/strict";
import { contentsTree, holdsSection, isShortLabel, sectionCount, type ContentsNode } from "../lib/library/contents-tree";

const siddur = [
  "Weekday, Shacharit, Preparatory Prayers, Modeh Ani",
  "Weekday, Shacharit, Preparatory Prayers, Netilat Yadayim",
  "Weekday, Shacharit, Preparatory Prayers, Korbanot, Terumat HaDeshen",
  "Weekday, Shacharit, Preparatory Prayers, Korbanot, Korban HaTamid",
  "Weekday, Shacharit, Pesukei Dezimra, Introductory Psalm",
  "Weekday, Mincha, Ashrei",
  "Weekday, Mincha, Amidah",
  "Shabbat, Kabbalat Shabbat, Lecha Dodi",
  "Shabbat, Kabbalat Shabbat, Mizmor Shir",
].map((label) => ({ label, section: `Siddur Ashkenaz, ${label}` }));

const names = (nodes: ContentsNode[]) => nodes.map((n) => n.name);

test("a siddur's long section names become an outline, in reading order", () => {
  const tree = contentsTree(siddur)!;
  assert.deepEqual(names(tree), ["Weekday", "Shabbat · Kabbalat Shabbat"], "Shabbat has one group here, so the two join");
  const weekday = tree[0];
  assert.deepEqual(names(weekday.children), ["Shacharit", "Mincha"]);
  const shacharit = weekday.children[0];
  assert.deepEqual(names(shacharit.children), ["Preparatory Prayers", "Pesukei Dezimra"]);
  const prep = shacharit.children[0];
  assert.deepEqual(names(prep.children), ["Modeh Ani", "Netilat Yadayim", "Korbanot"]);
  assert.equal(prep.children[0].section, "Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Modeh Ani");
  assert.deepEqual(names(prep.children[2].children), ["Terumat HaDeshen", "Korban HaTamid"]);
  assert.equal(sectionCount(weekday), 7);
  assert.ok(holdsSection(weekday, "Siddur Ashkenaz, Weekday, Mincha, Amidah"));
  assert.ok(!holdsSection(tree[1], "Siddur Ashkenaz, Weekday, Mincha, Amidah"));
});

test("a heading with only one way down joins the next one", () => {
  const tree = contentsTree([
    { label: "Weekday, Shacharit, Modeh Ani", section: "a" },
    { label: "Weekday, Shacharit, Ashrei", section: "b" },
  ])!;
  assert.deepEqual(names(tree), ["Weekday · Shacharit"]);
  assert.deepEqual(names(tree[0].children), ["Modeh Ani", "Ashrei"]);
});

test("plain sections keep the grid", () => {
  assert.equal(contentsTree(["2a", "2b", "3a"].map((s) => ({ label: s, section: s }))), null);
  assert.equal(contentsTree([{ label: "Introduction", section: "x" }, { label: "Laws of Shabbat, 1", section: "y" }]), null);
});

test("a section that also has sections under it keeps its own button", () => {
  const tree = contentsTree([
    { label: "Laws of Shabbat", section: "s" },
    { label: "Laws of Shabbat, 1", section: "s1" },
    { label: "Laws of Shabbat, 2", section: "s2" },
  ])!;
  assert.equal(tree[0].section, "s");
  assert.deepEqual(names(tree[0].children), ["1", "2"]);
});

test("short labels are drawn as small squares", () => {
  for (const s of ["1", "12", "2a", "ב", "יא"]) assert.ok(isShortLabel(s), s);
  for (const s of ["Modeh Ani", "Introduction", "123456"]) assert.ok(!isShortLabel(s), s);
});
