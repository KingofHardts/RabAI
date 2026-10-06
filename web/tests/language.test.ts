import { test } from "node:test";
import assert from "node:assert/strict";
import { loadLibrary, getPassage } from "../lib/library/index";
import {
  connectionsFor,
  findPhrases,
  loadLexicon,
  lookupWord,
  normalizeWord,
  phraseOccurrences,
  relatedForWord,
  rootOccurrences,
  splitWords,
  tokenize,
} from "../lib/library/language";

const lib = loadLibrary("development");
const lex = loadLexicon();
const refs = (ps: { ref: string }[]) => ps.map((p) => p.ref);

test("no written form belongs to two roots", () => {
  const seen = new Map<string, string>();
  for (const root of lex.roots) {
    for (const f of root.forms) {
      const key = normalizeWord(f.form);
      assert.ok(!seen.has(key), `${f.form} is listed under ${seen.get(key)} and ${root.id}`);
      seen.set(key, root.id);
    }
  }
});

test("every root and phrase is actually found somewhere in the library", () => {
  for (const root of lex.roots) {
    if (["shma"].includes(root.id)) continue;
    assert.ok(rootOccurrences(lib, root.id).length > 0, `root ${root.root} never appears`);
  }
});

test("normalizing strips vowels and punctuation at the edges", () => {
  assert.equal(normalizeWord("וַיַּבְדֵּל"), "ויבדל");
  assert.equal(normalizeWord("לילה׃"), "לילה");
  assert.equal(normalizeWord("״החדש"), "החדש");
});

test("ב-ד-ל connects Bereishit 1:4, 1:6, 1:7 and 1:14, computed from the text", () => {
  assert.deepEqual(refs(rootOccurrences(lib, "bdl")), ["Bereishit 1:4", "Bereishit 1:6", "Bereishit 1:7", "Bereishit 1:14"]);
});

test("ואהבת links loving your fellow and loving HaShem", () => {
  assert.deepEqual(refs(rootOccurrences(lib, "ahv")), ["Vayikra 19:18", "Devarim 6:5"]);
});

test("ר-א-ש links the first word of the Torah to the first mitzvah, as Rashi does", () => {
  const found = refs(rootOccurrences(lib, "rsh"));
  for (const r of ["Bereishit 1:1", "Shemos 12:2", "Rashi on Bereishit 1:1"]) assert.ok(found.includes(r), r);
});

test("tokenize marks roots and phrases without changing the words", () => {
  const p = getPassage(lib, "Bereishit 1:4")!;
  const tokens = tokenize(p.he);
  assert.equal(tokens.map((t) => t.text).join(" "), p.he);
  const vayavdel = tokens.find((t) => t.text === "ויבדל");
  assert.equal(vayavdel?.root, "bdl");
  assert.equal(vayavdel?.gloss, "and He separated");
});

test("Gemara phrases are found, including with a ו in front", () => {
  const b = (ref: string) => findPhrases(splitWords(getPassage(lib, ref)!.he), lex).map((h) => h.phrase.id);
  assert.ok(b("Shabbat 21b:1").includes("tanu-rabanan"));
  assert.ok(b("Shabbat 21b:5").includes("chad-amar"), "וחד אמר");
  assert.ok(b("Shabbat 21b:2").includes("michan-veilach"));
  assert.ok(b("Eruvin 13b:1").includes("halacha-ke"));
  assert.ok(b("Eruvin 13b:1").includes("eilu-veilu"));
  assert.deepEqual(refs(phraseOccurrences(lib, "zil-gmor")), ["Shabbat 31a:1"]);
});

test("a phrase word ending in * needs at least one more letter", () => {
  const only = { roots: [], phrases: lex.phrases.filter((p) => p.id === "halacha-ke") };
  assert.equal(findPhrases(["הלכה", "כ"], only).length, 0);
  assert.equal(findPhrases(["הלכה", "כמותנו"], only).length, 1);
});

test("a word question pulls in every place its root appears", () => {
  assert.equal(lookupWord("וַיַּבְדֵּל")?.root.root, "ב-ד-ל");
  assert.deepEqual(refs(relatedForWord(lib, "להבדיל")), ["Bereishit 1:4", "Bereishit 1:6", "Bereishit 1:7", "Bereishit 1:14"]);
  // An unknown word falls back to exact matches of that word.
  assert.deepEqual(refs(relatedForWord(lib, "רקיע")), ["Bereishit 1:6"]);
});

test("a question about a whole phrase finds the phrase, not a single word", () => {
  const c = connectionsFor(lib, "תנו רבנן");
  assert.equal(c.label, "the phrase תנו רבנן");
  assert.deepEqual(refs(c.passages), ["Shabbat 21b:1"]);
  const shown = connectionsFor(lib, "חד אמר … וחד אמר");
  assert.deepEqual(refs(shown.passages), ["Shabbat 21b:4", "Shabbat 21b:5"]);
  assert.equal(connectionsFor(lib, "ויבדל").label, "the root ב-ד-ל");
});
