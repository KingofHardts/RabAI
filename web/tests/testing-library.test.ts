import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { ask, type ModelClient } from "../lib/engine/answer";
import { fallbackPlan, parseLookupPlan, retrieveFromTesting, type LookupClient } from "../lib/engine/lookup";
import { libraryMode, loadLibrary } from "../lib/library/index";
import { abbreviationOf, hebrewNumber } from "../lib/library/word-parts";
import {
  createTestingStore,
  dbFrom,
  ftsQuery,
  wordReadings,
  rootGuesses,
  parseRef,
  plainForSearch,
  sectionOf,
  TESTING_LABEL,
  wordForms,
} from "../lib/library/testing";

/*
 * A tiny copy of the testing library, built from the same schema as the real one
 * (tools/library_schema.sql). The texts here are short test lines, not an edition.
 */

const schema = readFileSync(new URL("../../tools/library_schema.sql", import.meta.url), "utf8").replace("-- @indexes", "");

const PASSAGES: Array<[number, string, number, number, number, number, string]> = [
  // id, ref, title, edition, version, seq, text
  [1, "Genesis 1:1", 1, 1, 1, 1, "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃"],
  [2, "Genesis 1:1", 1, 2, 2, 1, "In the beginning of God's creating the heavens and the earth"],
  [3, "Genesis 1:2", 1, 1, 1, 2, "וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ"],
  [4, "Genesis 1:2", 1, 2, 2, 2, "The earth was astonishingly empty"],
  [5, "Genesis 1:3", 1, 1, 1, 3, "וַיֹּאמֶר אֱלֹהִים יְהִי אוֹר"],
  [6, "Genesis 2:1", 1, 1, 1, 4, "וַיְכֻלּוּ הַשָּׁמַיִם וְהָאָרֶץ"],
  [7, "Genesis 10:1", 1, 1, 1, 5, "וְאֵלֶּה תּוֹלְדֹת בְּנֵי נֹחַ"],
  [8, "Rashi on Genesis 1:1:1", 2, 3, 3, 10, "בראשית. אמר רבי יצחק"],
  [9, "Rashi on Genesis 1:1:1", 2, 4, 4, 10, "In the beginning. Rabbi Yitzchak said"],
  [10, "Rashi on Genesis 1:1:2", 2, 3, 3, 11, "ברא אלהים. ולא אמר ברא ה׳"],
  [11, "Berakhot 2a:1", 3, 5, 5, 20, "מאימתי קורין את שמע בערבית"],
  [12, "Jerusalem Talmud Berakhot 1:1:1", 4, 6, 5, 30, "מאימתי קורין את שמע בערבית משעה שהכהנים נכנסין"],
  [13, "Jastrow, אֵימָתַי", 5, 7, 6, 40, "אֵימָתַי when? at what time?"],
  [14, "Jastrow, קְרָא", 5, 7, 6, 41, "קְרָא to call; to read, recite"],
  [15, 'Jastrow, א"ל', 5, 7, 6, 42, 'א"ל abbreviation for אמר ליה, he said to him'],
  [16, "Jastrow, אֵל", 5, 7, 6, 43, "אֵל God; mighty"],
];

async function fixture() {
  const client = createClient({ url: ":memory:" });
  await client.executeMultiple(schema);
  await client.executeMultiple(`
    INSERT INTO works (id, title, category, streams) VALUES ('torah', 'The Torah', 'tanakh', '[]'), ('rashi', 'Rashi on the Torah', 'commentary', '[]'),
      ('bavli', 'Babylonian Talmud', 'talmud', '[]'), ('yerushalmi', 'Talmud Yerushalmi', 'talmud', '[]'),
      ('jastrow', 'A Dictionary of the Targumim', 'reference', '[]');
    INSERT INTO titles VALUES (1, 'Genesis', 'בראשית', 'torah', '[]', 2, '[]'),
      (2, 'Rashi on Genesis', 'רש״י על בראשית', 'rashi', '[]', 3, '[]'),
      (3, 'Berakhot', 'ברכות', 'bavli', '[]', 2, '[]'),
      (4, 'Jerusalem Talmud Berakhot', 'ירושלמי ברכות', 'yerushalmi', '[]', 3, '[]'),
      (5, 'Jastrow', 'מילון יאסטרוב', 'jastrow', '["Reference", "Dictionary"]', 1, '["Entry"]');
    INSERT INTO editions (id, work, name, language, approved, word_tool) VALUES
      (1, 'torah', 'Test Hebrew Chumash', 'he', 0, 0), (2, 'torah', 'Test English Chumash', 'en', 0, 0),
      (3, 'rashi', 'Test Hebrew Rashi', 'he', 0, 0), (4, 'rashi', 'Test English Rashi', 'en', 0, 0),
      (5, 'bavli', 'Test Vilna Shas', 'he', 0, 0), (6, 'yerushalmi', 'Test Venice printing', 'he', 0, 0),
      (7, 'jastrow', 'Test Jastrow', 'en', 0, 1);
    INSERT INTO versions VALUES (1, 'v1', 'CC-BY-SA', ''), (2, 'v2', 'CC-BY', ''), (3, 'v3', 'Public Domain', ''),
      (4, 'v4', 'CC-BY', ''), (5, 'v5', 'Public Domain', ''), (6, 'v6', 'Public Domain (printed 1903)', '');
    INSERT INTO links VALUES ('Genesis 1:1', 'Rashi on Genesis 1:1:1', 'commentary'),
      ('Berakhot 2a:1', 'Genesis 1:1', 'talmud'),
      ('Rashi on Genesis 1:1:2', 'Genesis 1:1', 'commentary'),
      ('Jastrow, קְרָא', 'Jerusalem Talmud Berakhot 1:1:1', 'dictionary'),
      ('Jastrow, קְרָא', 'Genesis 1:1', 'dictionary');
    INSERT INTO lexicon VALUES ('אימתי', 13), ('קרא', 14), ('א ל', 15), ('אל', 16);
  `);
  for (const [id, ref, title, edition, version, seq, text] of PASSAGES) {
    await client.execute({ sql: "INSERT INTO passages VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id, ref, title, edition, version, seq, text] });
    await client.execute({ sql: "INSERT INTO passages_fts (rowid, plain) VALUES (?, ?)", args: [id, plainForSearch(text)] });
  }
  return createTestingStore(dbFrom(client));
}

const storePromise = fixture();

/** A one-line library with one work, in the current schema or in the schema before works had a standing. */
async function oneWorkStore(opts: { oldSchema?: boolean; debated?: boolean }) {
  const client = createClient({ url: ":memory:" });
  const sql = opts.oldSchema
    ? schema.replace(/CREATE TABLE works \([\s\S]*?\);/, "CREATE TABLE works (id TEXT PRIMARY KEY, title TEXT, category TEXT, streams TEXT);")
    : schema;
  await client.executeMultiple(sql);
  const work = opts.debated
    ? `INSERT INTO works (id, title, category, streams, standing, caution, caution_kinds) VALUES
         ('bahir', 'Sefer HaBahir', 'kabbalah', '[]', 'debated', 'Traditionally attributed; authorship discussed.', '["uncertain_author"]');`
    : `INSERT INTO works (id, title, category, streams) VALUES ('bahir', 'Sefer HaBahir', 'kabbalah', '[]');`;
  await client.executeMultiple(`
    ${work}
    INSERT INTO titles VALUES (1, 'Sefer HaBahir', 'ספר הבהיר', 'bahir', '[]', 1, '[]');
    INSERT INTO editions (id, work, name, language, approved, word_tool) VALUES (1, 'bahir', 'Test Bahir', 'he', 0, 0);
    INSERT INTO versions VALUES (1, 'v1', 'Public Domain', '');
    INSERT INTO passages VALUES (1, 'Sefer HaBahir 1', 1, 1, 1, 1, 'אמר רבי נחוניא בן הקנה');
  `);
  return createTestingStore(dbFrom(client));
}

test("a debated work's passages carry its caution, and its category", async () => {
  const [p] = await (await oneWorkStore({ debated: true })).lookup(["Sefer HaBahir 1"]);
  assert.equal(p.source?.category, "kabbalah");
  assert.equal(p.source?.standing, "debated");
  assert.equal(p.source?.caution, "Traditionally attributed; authorship discussed.");
  assert.deepEqual(p.source?.cautionKinds, ["uncertain_author"]);
});

test("an established work carries no caution", async () => {
  const [p] = await (await oneWorkStore({})).lookup(["Sefer HaBahir 1"]);
  assert.equal(p.source?.standing, undefined);
  assert.equal(p.source?.caution, undefined);
});

test("a library built before works had a standing still reads, as established", async () => {
  const [p] = await (await oneWorkStore({ oldSchema: true })).lookup(["Sefer HaBahir 1"]);
  assert.equal(p.ref, "Sefer HaBahir 1");
  assert.equal(p.source?.category, "kabbalah");
  assert.equal(p.source?.standing, undefined);
});

test("refs: sections and ranges", () => {
  assert.equal(sectionOf("Genesis 1:3"), "Genesis 1");
  assert.equal(sectionOf("Berakhot 2a:4"), "Berakhot 2a");
  assert.equal(sectionOf("Rashi on Genesis 1:1:2"), "Rashi on Genesis 1:1");
  assert.deepEqual(parseRef("Genesis 1:1-5"), { start: "Genesis 1:1", end: "Genesis 1:5" });
  assert.deepEqual(parseRef("Genesis 1:28–2:3"), { start: "Genesis 1:28", end: "Genesis 2:3" });
  assert.deepEqual(parseRef("Berakhot 2a"), { start: "Berakhot 2a", end: null });
});

test("search queries strip vowels and quote each phrase", () => {
  assert.equal(plainForSearch("בְּרֵאשִׁית"), "בראשית");
  assert.equal(ftsQuery(["בְּרֵאשִׁית בָּרָא", 'the "light"']), '"בראשית ברא" OR "the light"');
  assert.equal(ftsQuery(["", "a"]), null);
});

test("a line comes back in Hebrew and English, labeled as the testing library", async () => {
  const store = await storePromise;
  const [p] = await store.lookup(["Genesis 1:1"]);
  assert.equal(p.ref, "Genesis 1:1");
  assert.match(p.he, /בָּרָא/);
  assert.match(p.en, /In the beginning/);
  assert.equal(p.section, "Genesis 1");
  assert.equal(p.source?.library, "testing");
  assert.equal(p.source?.heEdition, "Test Hebrew Chumash");
  assert.equal(p.source?.enEdition, "Test English Chumash");
  assert.deepEqual(p.source?.licenses.sort(), ["CC-BY", "CC-BY-SA"]);
});

test("a chapter opens its own lines only, and a range stops at its end", async () => {
  const store = await storePromise;
  const chapter = await store.lookup(["Genesis 1"]);
  assert.deepEqual(chapter.map((p) => p.ref), ["Genesis 1:1", "Genesis 1:2", "Genesis 1:3"]);
  const range = await store.lookup(["Genesis 1:1-2"]);
  assert.deepEqual(range.map((p) => p.ref), ["Genesis 1:1", "Genesis 1:2"]);
  assert.deepEqual(await store.lookup(["Exodus 3:14"]), [], "a book the library doesn't have finds nothing");
});

test("search finds Hebrew typed with vowels", async () => {
  const store = await storePromise;
  const hits = await store.search(["בְּרֵאשִׁית בָּרָא"], 5);
  assert.equal(hits[0].ref, "Genesis 1:1");
  const english = await store.search(["Rabbi Yitzchak"], 5);
  assert.equal(english[0].ref, "Rashi on Genesis 1:1:1");
});

test("links run both ways, commentaries first", async () => {
  const store = await storePromise;
  const linked = await store.linked(["Genesis 1:1"], 5);
  assert.deepEqual(linked.map((p) => p.ref), ["Rashi on Genesis 1:1:1", "Rashi on Genesis 1:1:2", "Berakhot 2a:1"]);
});

test("dictionary links are kept apart from commentaries and parallels", async () => {
  const store = await storePromise;
  const linked = await store.linked(["Genesis 1:1"], 10);
  assert.ok(!linked.some((p) => p.ref.startsWith("Jastrow")), "a dictionary entry is not a parallel passage");
});

test("word forms: the word, without its front letters, without a common ending", () => {
  const forms = wordForms("מֵאֵימָתַי קוֹרִין את שמע");
  assert.ok(forms.includes("מאימתי"));
  assert.ok(forms.includes("אימתי"), "מ (from) taken off the front");
  assert.ok(forms.includes("קור"), "the plural ending taken off");
  assert.ok(!forms.includes("את"), "common words are skipped");
  assert.deepEqual(wordForms("מלכא"), ["מלכא", "מלך", "לכא", "לך"]);
});

test("dictionary: entries that cite the line come first, then headword matches", async () => {
  const store = await storePromise;
  const [line] = await store.lookup(["Jerusalem Talmud Berakhot 1:1:1"]);
  assert.equal(line.en, "");
  const entries = await store.dictionary([line], 5);
  assert.deepEqual(entries.map((e) => e.ref), ["Jastrow, קְרָא", "Jastrow, אֵימָתַי"]);
  assert.equal(entries[0].source?.dictionary, true);
  assert.equal(entries[0].source?.wordToolOnly, true);
  assert.match(entries[1].en, /when\?/);
});

test("the reader: a commentary opens on its verse, with the commentary beside it", async () => {
  const store = await storePromise;
  const found = await store.section("Rashi on Genesis 1:1:1");
  assert.ok(found);
  assert.deepEqual(found.lines.map((p) => p.ref), ["Genesis 1:1", "Genesis 1:2", "Genesis 1:3"]);
  const comments = found.commentaries.get("Genesis 1:1") ?? [];
  assert.deepEqual(comments.map((c) => c.ref), ["Rashi on Genesis 1:1:1", "Rashi on Genesis 1:1:2"]);
  assert.equal(comments[0].on, "Genesis 1:1");
});

test("the reader: a section knows the sections before and after it, and a book lists its sections in order", async () => {
  const store = await storePromise;
  const first = await store.section("Genesis 1");
  assert.equal(first?.prev, undefined);
  assert.equal(first?.next, "Genesis 2");
  const second = await store.section("Genesis 2");
  assert.equal(second?.prev, "Genesis 1");
  assert.equal(second?.next, "Genesis 10");
  // In the book's own order, not in the order of the letters ("Genesis 10" would sort before "Genesis 2").
  assert.deepEqual(await store.contents("Genesis"), ["Genesis 1", "Genesis 2", "Genesis 10"]);
  assert.deepEqual(await store.contents("Berakhot"), ["Berakhot 2a"]);
  assert.deepEqual(await store.contents("No such book"), []);
});

test("books and the planner's catalog", async () => {
  const store = await storePromise;
  const books = await store.books();
  assert.deepEqual(books.map((b) => b.title).sort(), ["Berakhot", "Genesis", "Jastrow", "Jerusalem Talmud Berakhot", "Rashi on Genesis"]);
  assert.equal(books.find((b) => b.title === "Genesis")?.firstRef, "Genesis 1:1");
  // Each book carries its Sefaria categories and its place in reading order, for the shelves.
  assert.deepEqual(books.find((b) => b.title === "Jastrow")?.categories, ["Reference", "Dictionary"]);
  assert.deepEqual(books.find((b) => b.title === "Genesis")?.categories, []);
  assert.deepEqual(books.map((b) => b.order), [...books.map((b) => b.order)].sort((a, b) => a - b));
  assert.match(await store.catalog(), /^Babylonian Talmud: Berakhot$/m);
});

test("the planner's reply is read safely", () => {
  assert.deepEqual(parseLookupPlan('Sure: {"refs": ["Genesis 1:1", 3], "hebrew": ["בראשית"], "english": []}'), {
    refs: ["Genesis 1:1"],
    hebrew: ["בראשית"],
    english: [],
  });
  assert.deepEqual(parseLookupPlan("no json here"), { refs: [], hebrew: [], english: [] });
  assert.deepEqual(fallbackPlan("What does בראשית ברא mean for creation?"), {
    refs: [],
    hebrew: ["בראשית ברא"],
    english: ["mean", "creation"],
  });
});

function planner(reply: string): LookupClient & { calls: number } {
  const c = {
    calls: 0,
    async create() {
      c.calls++;
      return { content: [{ type: "text", text: reply }] };
    },
  };
  return c;
}

test("retrieval opens the planned places, follows links, searches, and puts the focus first", async () => {
  const store = await storePromise;
  const client = planner(JSON.stringify({ refs: ["Genesis 1:1", "Exodus 3:14"], hebrew: ["מאימתי קורין"], english: [] }));
  const found = await retrieveFromTesting("When do we say Shema at night?", store, client, { focusRef: "Genesis 1:2" });
  assert.equal(client.calls, 1);
  const refs = found.documents.map((p) => p.ref);
  assert.equal(refs[0], "Genesis 1:2");
  for (const r of ["Genesis 1:1", "Rashi on Genesis 1:1:1", "Berakhot 2a:1"]) assert.ok(refs.includes(r), r);
  assert.equal(new Set(refs).size, refs.length, "no passage twice");
});

test("a passage with no English brings dictionary entries for its words", async () => {
  const store = await storePromise;
  const client = planner(JSON.stringify({ refs: ["Jerusalem Talmud Berakhot 1:1:1"], hebrew: [], english: [] }));
  const found = await retrieveFromTesting("When is the evening Shema said, according to the Yerushalmi?", store, client);
  const refs = found.documents.map((p) => p.ref);
  assert.equal(refs[0], "Jerusalem Talmud Berakhot 1:1:1");
  assert.ok(refs.includes("Jastrow, קְרָא") && refs.includes("Jastrow, אֵימָתַי"), refs.join(", "));
});

test("a tapped word is read with and without its front letters and endings", () => {
  const forms = (w: string) => wordReadings(w).map((r) => `${r.prefix}+${r.form}+${r.suffix}`);
  assert.deepEqual(forms("מֵאֵימָתַי").slice(0, 2), ["+מאימתי+", "מ+אימתי+"]);
  assert.ok(forms("ובראשית").indexOf("ו+בראשית+") < forms("ובראשית").indexOf("וב+ראשית+"), "one letter off before two");
  assert.ok(forms("מלכא").includes("+מלך+א"), "final letter restored");
  assert.deepEqual(wordReadings("א"), []);
});

test("a tapped word finds its dictionary entries, with how it was read", async () => {
  const store = await storePromise;
  const found = await store.wordEntries("מֵאֵימָתַי");
  assert.equal(found[0]?.ref, "Jastrow, אֵימָתַי");
  assert.deepEqual(found[0]?.reading, { form: "אימתי", prefix: "מ", suffix: "" });
  assert.equal(found[0]?.source?.wordToolOnly, true);
  assert.deepEqual(await store.wordEntries("שלום"), []);
});

test("a printed short form is never looked up as the word its letters spell", async () => {
  const store = await storePromise;
  // Jastrow's own א"ל (a letter cipher) is not what a text's א״ל (he said to him) means, and
  // the plain word אל is a different word altogether.
  for (const w of ["א״ל", 'א"ל', "וא״ל", "אל׳"]) assert.deepEqual(await store.wordEntries(w), [], w);
  assert.deepEqual((await store.wordEntries("אל")).map((f) => f.ref), ["Jastrow, אֵל"]);
  assert.deepEqual(abbreviationOf("רמב״ם"), { kind: "gershayim", form: "רמב״ם" });
  assert.deepEqual(abbreviationOf("וכו'"), { kind: "geresh", form: "וכו׳" });
  assert.equal(abbreviationOf("ברכות"), null);
  assert.equal(abbreviationOf("קְרָא"), null);
  // A chapter and verse in letters is a number, not a short form.
  assert.deepEqual(abbreviationOf("ל״ד:כ״ה"), { kind: "verse", form: "ל״ד:כ״ה", numbers: [34, 25] });
  assert.deepEqual(abbreviationOf("ט״ו:ג׳"), { kind: "verse", form: "ט״ו:ג׳", numbers: [15, 3] });
  assert.equal(hebrewNumber("תשפ״ו"), 786);
  assert.equal(hebrewNumber("קש"), null, "letters out of number order are not a number");
  assert.deepEqual(await store.wordEntries("ל״ד:כ״ה"), []);
});

test("a conjugated word is traced to its root, and the guess says what it changed", async () => {
  const guess = (stem: string) => rootGuesses(stem).map((g) => g.form);
  assert.ok(guess("אומר").includes("אמר"), "vowel letter taken out");
  assert.ok(guess("נכנס").includes("כנס"), "verb front letter taken off");
  assert.ok(guess("תרומת").includes("תרומה"), "final ת read as ה");
  assert.ok(guess("אמרת").includes("אמר"), "past-tense ending taken off");
  assert.ok(guess("הגיע").includes("נגע"), "a root's lost first נ restored");
  assert.ok(guess("הגיע").indexOf("נגע") < guess("הגיע").indexOf("יגע"), "נ tried before י");
  assert.ok(guess("הושיב").includes("ישב"), "a root's first י written as ו");
  assert.ok(rootGuesses("אומר").find((g) => g.form === "אמר")?.changes.some((c) => c.includes("vowel letter")));
  const forms = wordReadings("אומרים").map((r) => r.form);
  assert.ok(forms.indexOf("אומר") < forms.indexOf("אמר"), "plain readings before guesses");

  const store = await storePromise;
  const found = await store.wordEntries("יקרא");
  assert.equal(found[0]?.ref, "Jastrow, קְרָא");
  assert.equal(found[0]?.reading.form, "קרא");
  assert.ok(found[0]?.reading.guess?.some((c) => c.includes("he will")));
});

test("when the planner says no sources are needed, nothing is searched", async () => {
  const store = await storePromise;
  const client = planner(JSON.stringify({ refs: [], hebrew: [], english: [] }));
  const found = await retrieveFromTesting("Can you help me plan a birthday party for my mother?", store, client);
  assert.equal(client.calls, 1);
  assert.deepEqual(found.documents, []);
});

test("a planner reply with no plan in it falls back to the question's own words", async () => {
  const store = await storePromise;
  const client = planner("I am not sure.");
  const found = await retrieveFromTesting("מאימתי קורין את שמע", store, client);
  assert.ok(found.documents.some((p) => p.ref === "Berakhot 2a:1"));
});

test("without a planner, retrieval still searches the question's own words", async () => {
  const store = await storePromise;
  const found = await retrieveFromTesting("מאימתי קורין את שמע", store, null);
  assert.ok(found.documents.some((p) => p.ref === "Berakhot 2a:1"));
});

test("library mode: the testing library switches on when its database is set", () => {
  assert.equal(libraryMode({}), "development");
  assert.equal(libraryMode({ RABAI_LIBRARY_DB_URL: "file:test.db" }), "testing");
  assert.equal(libraryMode({ TURSO_DATABASE_URL: "libsql://x" }), "testing");
  assert.equal(libraryMode({ TURSO_DATABASE_URL: "libsql://x", RABAI_LIBRARY: "development" }), "development");
  assert.equal(libraryMode({ RABAI_LIBRARY: "approved" }), "approved");
  const lib = loadLibrary("testing");
  assert.equal(lib.works.length, 0, "no development texts mix into the testing library");
  assert.equal(lib.passages.length, 0);
  assert.match(TESTING_LABEL, /Not yet approved by the rabbinic board/);
});

test("ask: the testing library feeds the answer, and citations still must point into what was sent", async () => {
  const store = await storePromise;
  const calls: MessageCreateParamsNonStreaming[] = [];
  const client: ModelClient = {
    async create(params) {
      calls.push(params);
      const system = params.system as Array<{ text: string }>;
      if (system[0].text.startsWith("You find sources")) {
        return { content: [{ type: "text", text: '{"refs": ["Genesis 1:1"], "hebrew": [], "english": []}', citations: null }] } as unknown as BetaMessage;
      }
      const last = params.messages[params.messages.length - 1];
      const docs = (last.content as Array<{ type: string; title?: string }>).filter((b) => b.type === "document");
      const idx = docs.findIndex((d) => d.title === "Genesis 1:1");
      return {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-opus-5-5",
        stop_reason: "end_turn",
        content: [
          {
            type: "text",
            text: "The Torah opens with the beginning of creation.",
            citations: [
              { type: "char_location", cited_text: "In the beginning of God's creating", document_index: idx, document_title: "Genesis 1:1", start_char_index: 0, end_char_index: 10, file_id: null },
              { type: "char_location", cited_text: "words that are not there", document_index: idx, document_title: "Genesis 1:1", start_char_index: 0, end_char_index: 5, file_id: null },
            ],
          },
        ],
      } as unknown as BetaMessage;
    },
  };
  const result = await ask({ question: "How does the Torah begin?" }, client, loadLibrary("testing"), store);
  assert.equal(result.status, "answered");
  assert.equal(result.libraryMode, "testing");
  assert.deepEqual(result.lookedUp, ["Genesis 1:1"]);
  assert.ok(result.retrieved.includes("Rashi on Genesis 1:1:1"), "linked commentary was sent too");
  assert.deepEqual(result.sources.map((s) => s.ref), ["Genesis 1:1"]);
  assert.equal(result.droppedCitations, 1, "a quote that isn't in the passage is dropped");
  assert.equal(calls.length, 2);
  const answerSystem = (calls[1].system as Array<{ text: string }>).map((b) => b.text).join("\n");
  assert.match(answerSystem, /private testing library/);
  assert.match(answerSystem, /use it only for what a word means, never for history/);
});

test("ask: a dictionary by an author outside Orthodoxy is sent as a word tool only", async () => {
  const store = await storePromise;
  const calls: MessageCreateParamsNonStreaming[] = [];
  const client: ModelClient = {
    async create(params) {
      calls.push(params);
      const system = params.system as Array<{ text: string }>;
      const text = system[0].text.startsWith("You find sources")
        ? '{"refs": ["Jerusalem Talmud Berakhot 1:1:1"], "hebrew": [], "english": []}'
        : "From when do we read the Shema in the evening? (My translation.)";
      return { id: "m", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", content: [{ type: "text", text, citations: null }] } as unknown as BetaMessage;
    },
  };
  const result = await ask({ question: "Translate the first line of Yerushalmi Berakhot." }, client, loadLibrary("testing"), store);
  assert.equal(result.status, "answered");
  const last = calls[1].messages[calls[1].messages.length - 1];
  const docs = (last.content as Array<{ type: string; title?: string; context?: string }>).filter((b) => b.type === "document");
  const jastrow = docs.find((d) => d.title === "Jastrow, קְרָא");
  assert.ok(jastrow, "the Jastrow entry was sent");
  assert.match(jastrow!.context ?? "", /only for what words mean, never for history or belief/);
  const line = docs.find((d) => d.title === "Jerusalem Talmud Berakhot 1:1:1");
  assert.match(line!.context ?? "", /no English translation/);
});

test("ask: without the library database, RabAI says so instead of answering from memory", async () => {
  const result = await ask({ question: "How does the Torah begin?" }, null, loadLibrary("testing"), null);
  assert.equal(result.status, "error");
  assert.match(result.notice ?? "", /can't reach its library/);
  assert.deepEqual(result.retrieved, []);
});
