import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { ask, type ModelClient } from "../lib/engine/answer";
import { fallbackPlan, parseLookupPlan, retrieveFromTesting, type LookupClient } from "../lib/engine/lookup";
import { libraryMode, loadLibrary } from "../lib/library/index";
import { createTestingStore, dbFrom, ftsQuery, parseRef, plainForSearch, sectionOf, TESTING_LABEL } from "../lib/library/testing";

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
];

async function fixture() {
  const client = createClient({ url: ":memory:" });
  await client.executeMultiple(schema);
  await client.executeMultiple(`
    INSERT INTO works VALUES ('torah', 'The Torah', 'tanakh', '[]'), ('rashi', 'Rashi on the Torah', 'commentary', '[]'),
      ('bavli', 'Babylonian Talmud', 'talmud', '[]');
    INSERT INTO titles VALUES (1, 'Genesis', 'בראשית', 'torah', '[]', 2, '[]'),
      (2, 'Rashi on Genesis', 'רש״י על בראשית', 'rashi', '[]', 3, '[]'),
      (3, 'Berakhot', 'ברכות', 'bavli', '[]', 2, '[]');
    INSERT INTO editions VALUES (1, 'torah', 'Test Hebrew Chumash', 'he', 0), (2, 'torah', 'Test English Chumash', 'en', 0),
      (3, 'rashi', 'Test Hebrew Rashi', 'he', 0), (4, 'rashi', 'Test English Rashi', 'en', 0),
      (5, 'bavli', 'Test Vilna Shas', 'he', 0);
    INSERT INTO versions VALUES (1, 'v1', 'CC-BY-SA', ''), (2, 'v2', 'CC-BY', ''), (3, 'v3', 'Public Domain', ''),
      (4, 'v4', 'CC-BY', ''), (5, 'v5', 'Public Domain', '');
    INSERT INTO links VALUES ('Genesis 1:1', 'Rashi on Genesis 1:1:1', 'commentary'),
      ('Berakhot 2a:1', 'Genesis 1:1', 'talmud'),
      ('Rashi on Genesis 1:1:2', 'Genesis 1:1', 'commentary');
  `);
  for (const [id, ref, title, edition, version, seq, text] of PASSAGES) {
    await client.execute({ sql: "INSERT INTO passages VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id, ref, title, edition, version, seq, text] });
    await client.execute({ sql: "INSERT INTO passages_fts (rowid, plain) VALUES (?, ?)", args: [id, plainForSearch(text)] });
  }
  return createTestingStore(dbFrom(client));
}

const storePromise = fixture();

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

test("the reader: a commentary opens on its verse, with the commentary beside it", async () => {
  const store = await storePromise;
  const found = await store.section("Rashi on Genesis 1:1:1");
  assert.ok(found);
  assert.deepEqual(found.lines.map((p) => p.ref), ["Genesis 1:1", "Genesis 1:2", "Genesis 1:3"]);
  const comments = found.commentaries.get("Genesis 1:1") ?? [];
  assert.deepEqual(comments.map((c) => c.ref), ["Rashi on Genesis 1:1:1", "Rashi on Genesis 1:1:2"]);
  assert.equal(comments[0].on, "Genesis 1:1");
});

test("books and the planner's catalog", async () => {
  const store = await storePromise;
  const books = await store.books();
  assert.deepEqual(books.map((b) => b.title).sort(), ["Berakhot", "Genesis", "Rashi on Genesis"]);
  assert.equal(books.find((b) => b.title === "Genesis")?.firstRef, "Genesis 1:1");
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
});

test("ask: without the library database, RabAI says so instead of answering from memory", async () => {
  const result = await ask({ question: "How does the Torah begin?" }, null, loadLibrary("testing"), null);
  assert.equal(result.status, "error");
  assert.match(result.notice ?? "", /can't reach its library/);
  assert.deepEqual(result.retrieved, []);
});
