import { test } from "node:test";
import assert from "node:assert/strict";
import { ask, planRequest } from "../lib/engine/answer";
import { asksAboutLibrary, parseLookupPlan } from "../lib/engine/lookup";
import { loadLibrary } from "../lib/library/index";
import { SOURCES, editionsRead, fold, libraryDetails, libraryOverview, sourceCounts, worksNamed } from "../lib/sources";

const config = { model: "m", effort: "medium" as const, maxTokens: 1000 };

test("the sources list is made from the whole canon, area by area", () => {
  assert.ok(SOURCES.works.length > 700, "every work in the canon");
  assert.deepEqual(
    SOURCES.areas.map((a) => a.id),
    ["tanakh", "oral-torah", "halacha", "thought", "kabbalah", "prayer", "language", "articles"],
    "shelved the way a beit midrash is",
  );
  const areas = new Set(SOURCES.areas.map((a) => a.id));
  for (const w of SOURCES.works) {
    assert.ok(areas.has(w.area), `${w.id} stands in a known area`);
    assert.ok(w.editions.length > 0, `${w.id} lists its editions`);
  }
  assert.ok(SOURCES.leftOut.length > 0 && SOURCES.leftOut.every((x) => x.reason.trim()), "what is left out says why");
});

test("the testing library reads its tested editions; a public app reads only approved ones", () => {
  const talmud = SOURCES.works.find((w) => w.id === "talmud-bavli")!;
  const read = editionsRead(talmud, "testing").map((e) => e.name);
  assert.ok(read.some((n) => /Vilna/.test(n)));
  assert.ok(!read.some((n) => /Schottenstein/.test(n)), "a copyrighted edition isn't read");
  assert.deepEqual(editionsRead(talmud, "approved"), [], "nothing is approved until the board approves it");
  const testing = sourceCounts("testing");
  assert.ok(testing.read > 700 && testing.leftOut === SOURCES.leftOut.length);
  assert.equal(sourceCounts("approved").read, 0);
});

test("asked about its library, RabAI is given the whole list, and told it is a proposal", () => {
  const text = libraryOverview("testing");
  assert.match(text, /## RabAI's own library/);
  assert.match(text, /the rabbinic board has not approved it yet/);
  assert.match(text, /Mishnah Berurah/);
  assert.match(text, /### Kept with a caution/);
  assert.match(text, /### Waiting for the rabbinic board's decision/);
  assert.match(text, /### Left out, and why\n[\s\S]*Siddur Sim Shalom/);
  assert.match(text, /A line of the Gemara \(Talmud Bavli\)\. First: Rashi, Tosafot\./, "the order it opens the commentaries in");
  assert.match(text, /dinonline\.org/, "the websites it may search");
  assert.match(text, /never about the people who wrote it or the communities that use it/);
  // A book that is left out is never listed among the ones RabAI reads.
  const readPart = text.slice(text.indexOf("### The works you read"), text.indexOf("### Kept with a caution"));
  assert.ok(!readPart.includes("Siddur Sim Shalom"));
  assert.equal(libraryOverview("testing"), text, "the same text every time, so it can be cached");
});

test("a public app with nothing approved says so instead of claiming the testing library", () => {
  const text = libraryOverview("approved");
  assert.match(text, /hasn't approved any yet, so you have no texts of your own to quote/);
  assert.match(text, /### Proposed for the board, by area/);
});

test("the books a question names are found by title, Hebrew name, author or edition", () => {
  const names = (q: string) => worksNamed(q).map((w) => w.title);
  assert.equal(names("Do you have the Zohar?")[0], "Sefer HaZohar", "HaZohar is the Zohar");
  assert.match(names("Do you use Jastrow?")[0] ?? "", /Dictionary of the Targumim/);
  assert.equal(names("Do you have the Tanya?")[0], "Tanya (Likkutei Amarim)");
  assert.equal(names("האם יש לך משנה ברורה")[0], "Mishnah Berurah");
  assert.ok(names("Are the Ralbag's books in there?").includes("Ralbag on Tanakh"), "a possessive still finds the author");
  assert.ok(names("Do you use the Schottenstein?").includes("Talmud Bavli"), "an edition's name finds its work");
  assert.deepEqual(names("Do you have Igros Moshe?"), [], "a given name alone names no author");
  assert.deepEqual(names("What halacha books do you use?"), [], "a topic is not a book");
  assert.deepEqual(names("What is the meaning of life?"), [], "a word from a book's description is not its name");
  assert.equal(names("Do you have Likkutei Amarim?")[0], "Tanya (Likkutei Amarim)", "a name within the title");
  assert.equal(fold("Ha'amek Davar"), "amek davar");
});

test("the books named are given with every edition and whether RabAI reads it", () => {
  const details = libraryDetails("testing", "Is the Mishnah Berurah in English?");
  assert.match(details, /Mishnah Berurah \(משנה ברורה\)/);
  assert.match(details, /Hebrew text, standard \[Hebrew\/Aramaic\]: read now/);
  assert.match(details, /\[English\]: not used: copyrighted, needs the publisher's agreement/);
  assert.equal(libraryDetails("testing", "What is the meaning of life?"), "");
});

test("plain questions about the library are recognized without the planner", () => {
  for (const q of [
    "What sources do you use?",
    "Is the Kuzari in your library?",
    "What do you leave out, and why?",
    "Do you use the Schottenstein translation?",
    "Which commentaries do you open first?",
  ]) {
    assert.equal(asksAboutLibrary(q), true, q);
  }
  for (const q of [
    "What are the sources for lighting Chanukah candles?",
    "Do you have a source for waiting six hours between meat and milk?",
    "Which books of Tanakh did Shlomo write?",
    "Can I use a microwave on Shabbat?",
  ]) {
    assert.equal(asksAboutLibrary(q), false, q);
  }
});

test("the planner says when a question is about RabAI's library", () => {
  assert.equal(parseLookupPlan('{"refs": [], "library": true}').library, true);
  assert.equal(parseLookupPlan('{"refs": [], "library": "yes"}').library, false, "true itself, not truthy");
  assert.equal(parseLookupPlan('{"refs": []}').library, false);
});

test("a library question gets the list after the cached instructions, cached itself, and the books it names", () => {
  const lib = loadLibrary("development");
  const { params } = planRequest({ question: "Do you have the Mishnah Berurah?" }, lib, config, [], { library: true });
  const system = params.system as Array<{ text: string; cache_control?: unknown }>;
  assert.equal(system.length, 4);
  assert.match(system[2].text, /## RabAI's own library/);
  assert.ok(system[2].cache_control, "the list is the same for every such question, so it is cached");
  const settings = system[3].text;
  assert.match(settings, /This question is about RabAI's own library/);
  assert.match(settings, /Books this question names[\s\S]*Mishnah Berurah/);
  assert.ok(!/No passages were found/.test(settings), "an empty search is not reported as a missing Torah source");

  const plain = planRequest({ question: "Why does the Torah start with Creation?" }, lib, config);
  assert.equal((plain.params.system as unknown[]).length, 3, "other questions don't carry the list");
});

test("an answer about the library is marked, so the app links to the full list", async () => {
  const lib = loadLibrary("development");
  const about = await ask({ question: "What sources do you use, and what do you leave out?" }, null, lib, null);
  assert.equal(about.aboutLibrary, true);
  const other = await ask({ question: "What is a mitzvah?" }, null, lib, null);
  assert.equal(other.aboutLibrary, undefined);
  const line = await ask({ question: "", action: "explain", focusRef: "Bereishit 1:1" }, null, lib, null);
  assert.equal(line.aboutLibrary, undefined, "a line action is about its line");
});
