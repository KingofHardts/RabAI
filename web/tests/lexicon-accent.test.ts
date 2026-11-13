import { test } from "node:test";
import assert from "node:assert/strict";
import { ISRAELI, SAY_AS, respell } from "../lib/voice/lexicon";

test("every Israeli entry belongs to a word in the list, and stresses one syllable", () => {
  const first = new Set(SAY_AS.map((e) => e.written[0]));
  for (const [k, [say, ipa]] of Object.entries(ISRAELI)) {
    assert.ok(first.has(k), `${k} is not the first spelling of an entry`);
    for (const word of say.split(" ")) assert.ok((word.match(/[A-Z]{2,}/g) ?? []).length <= 1, `${k}: one stressed syllable per word`);
    assert.equal(ipa.split(" ").length, say.split(" ").length, `${k}: one group of sounds per word`);
  }
});

test("names are said the yeshiva way unless the Israeli way is chosen", () => {
  assert.equal(respell("the Gemara and the Rambam", "natural", { style: "caps" }), "the Geh-MAH-rah and the RAHM-bahm");
  assert.equal(respell("the Gemara and the Rambam", "natural", { style: "caps", accent: "israeli" }), "the G'mah-RAH and the Rahm-BAHM");
  // A word a natural voice says well the yeshiva way is left alone, and told the Israeli way.
  assert.equal(respell("a mitzvah", "natural", { style: "caps" }), "a mitzvah");
  assert.equal(respell("a mitzvah", "natural", { style: "caps", accent: "israeli" }), "a meets-VAH");
  // Written the Ashkenazi way: the same in both.
  assert.equal(respell("Shabbos", "natural", { style: "caps", accent: "israeli" }), respell("Shabbos", "natural", { style: "caps" }));
  assert.equal(respell("Gemara", "natural", { style: "ipa", accent: "israeli" }), "/ɡəmɑˈɹɑ/");
});
