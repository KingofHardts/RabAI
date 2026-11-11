import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFS, HEBREW_FONTS, parsePrefs } from "../lib/siddur/prefs";
import { metsudahFor, PARALLEL_BOOK } from "../lib/siddur/parallel";
import type { TestingStore } from "../lib/library/testing";
import parallel from "../lib/siddur/parallel.generated.json";

test("the reading settings are read back, and anything unknown falls back to the usual", () => {
  const p = parsePrefs({ english: "metsudah", heFont: "noto", enFont: "classic", vowels: false, enSize: "larger", spacing: "roomy" });
  assert.equal(p.english, "metsudah");
  assert.equal(p.heFont, "noto");
  assert.equal(p.enFont, "classic");
  assert.equal(p.vowels, false);
  assert.equal(p.enSize, "larger");
  assert.equal(p.spacing, "roomy");
  const q = parsePrefs({ english: "x", heFont: "comic", vowels: "no", spacing: 3 });
  assert.equal(q.english, DEFAULT_PREFS.english);
  assert.equal(q.heFont, DEFAULT_PREFS.heFont);
  assert.equal(q.vowels, true);
  assert.equal(q.spacing, "comfortable");
  // Every typeface keeps a fallback the device has.
  for (const f of Object.values(HEBREW_FONTS)) assert.match(f.css, /serif|sans-serif/);
});

test("letters only: the vowels and accents go, the letters, maqaf and marks stay", async () => {
  const { withoutVowels } = await import("../components/Siddur");
  assert.equal(withoutVowels("בָּרוּךְ אַתָּה"), "ברוך אתה");
  assert.equal(withoutVowels("עֲלֵי־עָשׂוֹר"), "עלי־עשור");
  assert.equal(withoutVowels("בְּרֵאשִׁ֖ית"), "בראשית");
  assert.equal(withoutVowels("▾בָּרוּךְ"), "▾ברוך");
});

test("the Metsudah English is given only for paired lines, whole, without speaker labels or leftover notes", async () => {
  const pairs = (parallel as { pairs: Record<string, string[]> }).pairs;
  const [koren, guides] = Object.entries(pairs).find(([, g]) => g.length >= 1)!;
  assert.ok(koren.startsWith(PARALLEL_BOOK));
  const en = (ref: string, text: string) => ({ ref, he: "", en: text, source: { enEdition: "The Metsudah Linear Siddur, translated by Rabbi Avrohom Davis" } });
  const fake = (texts: Record<string, string>) =>
    ({ async exact(refs: string[]) { return refs.filter((r) => texts[r] !== undefined).map((r) => en(r, texts[r])); } }) as unknown as TestingStore;
  const all = Object.fromEntries(guides.map((g, i) => [g, i === 0 ? "Blessed are You, Adonoy" : "Congregation and Chazzan:"]));
  const got = await metsudahFor(fake(all), [koren, "Not a paired line"]);
  assert.deepEqual(Object.keys(got), [koren]);
  assert.equal(got[koren], "Blessed are You, Adonoy");
  // A line with a guide line missing its English, or with a leftover note, gets none.
  assert.deepEqual(await metsudahFor(fake({ [guides[0]]: "it means my Master.—Avudraham open my lips" }), [koren]), {});
  assert.deepEqual(await metsudahFor(fake({}), [koren]), {});
});
