import { test } from "node:test";
import assert from "node:assert/strict";
import { copiedLine, DEFAULT_LETTERS, lettersStyle, parseLetters, withoutVowels } from "../lib/reading-letters";
import { parsePrefs } from "../lib/siddur/prefs";
import { textReport, parseFeedback, ANSWER_REASONS } from "../lib/account/feedback";
import { sacksRef } from "../lib/siddur/sacks";

test("the reader's letters are read back, and anything unknown falls back to the usual", () => {
  const l = parseLetters({ heFont: "david", enFont: "sans", vowels: false, enSize: "largest", width: "narrow" });
  assert.deepEqual(l, { heFont: "david", enFont: "sans", vowels: false, enSize: "largest", width: "narrow" });
  assert.deepEqual(parseLetters({ heFont: "comic", width: 9, vowels: "no" }), DEFAULT_LETTERS);
  assert.deepEqual(parseLetters(null), DEFAULT_LETTERS);
  const style = lettersStyle(l);
  assert.match(String(style["--rd-he-font"]), /David/);
  assert.equal(style["--rd-en-width"], "58ch");
  assert.equal(lettersStyle(DEFAULT_LETTERS)["--rd-en-scale"], 1);
});

test("letters only in the reader uses the same rule as the siddur", () => {
  assert.equal(withoutVowels("בְּרֵאשִׁ֖ית בָּרָ֣א"), "בראשית ברא");
});

test("a copied line keeps its reference, and a testing-library line says so", () => {
  const c = copiedLine(" בראשית ברא ", "In the beginning", "Genesis 1:1", true);
  assert.equal(c.split("\n")[0], "בראשית ברא");
  assert.equal(c.split("\n")[1], "In the beginning");
  assert.match(c, /— Genesis 1:1 \(RabbAI's testing library, not yet approved by the rabbinic board\)$/);
  assert.equal(copiedLine("", "Only English", "X 1", false), "Only English\n— X 1");
});

test("the siddur's new settings are read back", () => {
  const p = parsePrefs({ layout: "hebrew", english: "both", instructionsOpen: true });
  assert.equal(p.layout, "hebrew");
  assert.equal(p.english, "both");
  assert.equal(p.instructionsOpen, true);
  assert.equal(parsePrefs({ instructionsOpen: "yes" }).instructionsOpen, false);
});

test("a 'this word looks wrong' report is an ordinary feedback record, with nothing about the person", () => {
  const body = textReport({ ref: "Siddur Ashkenaz, Weekday, Shacharit, Modeh Ani 1", text: "מודה אני", word: "מודה", note: "missing vowel" });
  const rec = parseFeedback(body);
  assert.ok(typeof rec !== "string");
  if (typeof rec === "string") return;
  assert.deepEqual(rec.reasons, ["text-wrong"]);
  assert.equal(rec.helpful, false);
  assert.deepEqual(rec.sources, ["Siddur Ashkenaz, Weekday, Shacharit, Modeh Ani 1"]);
  assert.equal(rec.note, "Word: מודה · missing vowel");
  assert.deepEqual(Object.keys(rec).sort(), ["answer", "helpful", "note", "question", "reasons", "sources"]);
  // It is not offered under an answer.
  assert.ok(!ANSWER_REASONS.includes("text-wrong"));
});

test("Rabbi Sacks's note is found by the Koren line's own reference", () => {
  assert.equal(sacksRef("The Koren Shalem Siddur; Ashkenaz, Weekdays, The Rabbis' Kaddish 1"), "Rabbi Sacks on Siddur, Weekdays, The Rabbis' Kaddish 1");
  assert.equal(sacksRef("Siddur Ashkenaz, Weekday, Shacharit, Modeh Ani 1"), null);
});
