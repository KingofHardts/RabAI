import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { articleContext, testingContext } from "../lib/engine/answer";
import { combineStores, collectionInfo } from "../lib/library/collections";
import { collectionClients, createTestingStore, dbFrom, plainForSearch, type Db } from "../lib/library/testing";
import { collectionDbUrls } from "../lib/library/testing-config";

/*
 * The testing library beside one website collection, both built from the real schemas
 * (tools/library_schema.sql, tools/collection_schema.sql). The texts are short test lines.
 */

const librarySchema = readFileSync(new URL("../../tools/library_schema.sql", import.meta.url), "utf8");
const collectionSchema = readFileSync(new URL("../../tools/collection_schema.sql", import.meta.url), "utf8");

async function mainLibrary() {
  const client = createClient({ url: ":memory:" });
  await client.executeMultiple(librarySchema);
  await client.executeMultiple(`
    INSERT INTO works (id, title, category, streams) VALUES ('torah', 'The Torah', 'tanakh', '[]');
    INSERT INTO titles VALUES (1, 'Genesis', 'בראשית', 'torah', '[]', 2, '[]');
    INSERT INTO editions (id, work, name, language, approved, word_tool) VALUES (1, 'torah', 'Test Chumash', 'en', 0, 0);
    INSERT INTO versions VALUES (1, 'v1', 'Public Domain', '');
    INSERT INTO passages VALUES (1, 'Genesis 1:1', 1, 1, 1, 1, 'In the beginning God created the heavens and the earth, and light');
  `);
  await client.execute({ sql: "INSERT INTO passages_fts (rowid, plain) VALUES (1, ?)", args: [plainForSearch("In the beginning God created the heavens and the earth, and light")] });
  return createTestingStore(dbFrom(client));
}

const ARTICLE = [
  "Why do we light candles before Shabbat?",
  "The Sages instituted candle lighting for peace in the home.",
];

async function aishCollection(opts: { meta?: boolean } = {}) {
  const client = createClient({ url: ":memory:" });
  await client.executeMultiple(librarySchema + "\n" + collectionSchema);
  await client.executeMultiple(`
    INSERT INTO works (id, title, category, streams) VALUES ('aish-shabbat', 'Aish.com: Shabbat', 'articles', '["kiruv"]');
    INSERT INTO editions (id, work, name, language, approved, word_tool) VALUES (1, 'aish-shabbat', 'Aish.com, Shabbat (English)', 'en', 0, 0);
    INSERT INTO titles VALUES (1, 'Aish.com, Lighting Candles', NULL, 'aish-shabbat', '["Aish.com","Shabbat"]', 1, '["Paragraph"]'),
      (2, 'Aish.com, Lighting Candles (2)', NULL, 'aish-shabbat', '["Aish.com","Shabbat"]', 1, '["Paragraph"]');
    INSERT INTO versions VALUES (1, 'Aish.com', 'Permission (Aish.com, 2026-10-10)', 'https://aish.com/lighting/'),
      (2, 'Aish.com', 'Permission (Aish.com, 2026-10-10)', 'https://aish.com/lighting-2/');
    INSERT INTO articles (title_id, edition_id, url, site, site_id, author, published, modified, section, fetched_on, checksum) VALUES
      (1, 1, 'https://aish.com/lighting/', 'Aish.com', '10', 'Rabbi A. Writer', '2019-05-01T10:00:00', '2020-01-01T00:00:00', 'Shabbat > Candles', '2026-10-11', 'x'),
      (2, 1, 'https://aish.com/lighting-2/', 'Aish.com', '11', NULL, NULL, '2020-01-01T00:00:00', 'Shabbat', '2026-10-11', 'y');
    ${opts.meta === false ? "" : "INSERT INTO meta VALUES ('collection', 'aish'), ('site', 'Aish.com'), ('ref_prefix', 'Aish.com, ');"}
  `);
  const rows: Array<[number, string, number, number, string]> = [
    [1, "Aish.com, Lighting Candles 1", 1, 1, ARTICLE[0]],
    [2, "Aish.com, Lighting Candles 2", 1, 1, ARTICLE[1]],
    [3, "Aish.com, Lighting Candles (2) 1", 2, 2, "A second article with the same name, about havdalah."],
  ];
  for (const [id, ref, title, version, text] of rows) {
    await client.execute({ sql: "INSERT INTO passages VALUES (?, ?, ?, 1, ?, ?, ?)", args: [id, ref, title, version, title * 10000 + id, text] });
    await client.execute({ sql: "INSERT INTO passages_fts (rowid, plain) VALUES (?, ?)", args: [id, plainForSearch(text)] });
  }
  const db = dbFrom(client);
  return { db, store: createTestingStore(db) };
}

test("a collection describes itself from its meta table", async () => {
  const { db } = await aishCollection();
  assert.deepEqual(await collectionInfo(db), { name: "aish", site: "Aish.com", prefix: "Aish.com, " });
  const bare = await aishCollection({ meta: false });
  assert.equal(await collectionInfo(bare.db), null);
});

test("each reference goes to the database that holds it, and an article carries its author and address", async () => {
  const store = combineStores(await mainLibrary(), [await aishCollection()]);
  const found = await store.lookup(["Aish.com, Lighting Candles 2", "Genesis 1:1"]);
  assert.deepEqual(found.map((p) => p.ref), ["Aish.com, Lighting Candles 2", "Genesis 1:1"]);
  const article = found[0].source!.article!;
  assert.equal(article.site, "Aish.com");
  assert.equal(article.url, "https://aish.com/lighting/");
  assert.equal(article.author, "Rabbi A. Writer");
  assert.equal(found[0].source!.library, "testing");
  assert.equal(found[1].source!.article, undefined);
});

test("asking for an article by its title opens that article, not another whose title begins the same way", async () => {
  const { store } = await aishCollection();
  const found = await store.lookup(["Aish.com, Lighting Candles"]);
  assert.deepEqual(found.map((p) => p.ref), ["Aish.com, Lighting Candles 1", "Aish.com, Lighting Candles 2"]);
  const section = await store.section("Aish.com, Lighting Candles 1");
  assert.deepEqual(section?.lines.map((l) => l.ref), ["Aish.com, Lighting Candles 1", "Aish.com, Lighting Candles 2"]);
});

test("the texts are searched apart from the articles, and the articles on their own", async () => {
  const store = combineStores(await mainLibrary(), [await aishCollection()]);
  assert.deepEqual((await store.search(["light"], 8)).map((p) => p.ref), ["Genesis 1:1"]);
  const articles = await store.articles(["candle lighting"], 4);
  assert.deepEqual(articles.map((p) => p.ref), ["Aish.com, Lighting Candles 2"]);
  assert.deepEqual(await store.articles(["candle"], 0), []);
});

test("a collection that can't be reached is left out, and the library keeps working", async () => {
  const broken: Db = {
    all: async () => {
      throw new Error("unreachable");
    },
  };
  const store = combineStores(await mainLibrary(), [{ db: broken, store: createTestingStore(broken) }]);
  assert.deepEqual((await store.lookup(["Genesis 1:1"])).map((p) => p.ref), ["Genesis 1:1"]);
  assert.deepEqual(await store.articles(["candle"], 4), []);
});

test("RabAI is told an article is a teacher's explanation, by whom, and never settled halacha", async () => {
  const { store } = await aishCollection();
  const [p] = await store.lookup(["Aish.com, Lighting Candles 1"]);
  const context = testingContext(p);
  assert.equal(context, articleContext(p.source!));
  assert.match(context, /^Article: "Lighting Candles" on Aish\.com, by Rabbi A\. Writer \(2019\)\./);
  assert.match(context, /written permission for private study/);
  assert.match(context, /not a primary source/);
  assert.match(context, /never present its opinion as settled halacha/);
});

test("collections are never opened on a public app", () => {
  const env = { TURSO_DATABASE_URL: "libsql://main.example", RABAI_COLLECTION_DB_URLS: "libsql://a.example, libsql://b.example" };
  assert.deepEqual(collectionDbUrls(env), ["libsql://a.example", "libsql://b.example"]);
  assert.equal(collectionClients(env).length, 2);
  assert.deepEqual(collectionClients({ ...env, RABAI_PUBLIC: "true" }), []);
  assert.deepEqual(collectionClients({ RABAI_COLLECTION_DB_URLS: "libsql://a.example" }), []);
});

test("the articles are listed by section, with counts, newest first", async () => {
  const store = combineStores(await mainLibrary(), [await aishCollection()]);
  assert.deepEqual(await store.articleShelves(), [{ site: "Aish.com", work: "aish-shabbat", title: "Aish.com: Shabbat", count: 2 }]);
  const list = await store.articleList("aish-shabbat", 0, 10);
  assert.deepEqual(
    list.map((a) => [a.name, a.author ?? null, a.firstRef]),
    [
      ["Lighting Candles", "Rabbi A. Writer", "Aish.com, Lighting Candles 1"],
      ["Lighting Candles (2)", null, "Aish.com, Lighting Candles (2) 1"],
    ],
  );
  assert.deepEqual((await store.articleList("aish-shabbat", 1, 10)).map((a) => a.name), ["Lighting Candles (2)"]);
  assert.deepEqual(await store.articleList("aish-nothing", 0, 10), []);
  // The library alone has no articles.
  assert.deepEqual(await (await mainLibrary()).articleShelves(), []);
});
