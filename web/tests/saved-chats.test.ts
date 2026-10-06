import { test } from "node:test";
import assert from "node:assert/strict";
import type { AskResult } from "../lib/engine/answer";
import {
  addRecent,
  categoriesFor,
  groupByCategory,
  MAX_CHATS,
  parseChats,
  parseRecent,
  serializeChats,
  titleFor,
  upsertChat,
  whenLabel,
  type SavedChat,
} from "../lib/saved-chats";

const answer = (text: string): AskResult => ({
  status: "answered",
  blocks: [{ text, citations: [] }],
  sources: [],
  retrieved: Array.from({ length: 50 }, (_, i) => `Ref ${i}`),
  safety: null,
  libraryMode: "development",
  droppedCitations: 0,
});

const chat = (id: string, updatedAt: number, category = ""): SavedChat => ({
  id,
  title: "",
  category,
  createdAt: updatedAt,
  updatedAt,
  messages: [
    { role: "user", text: `Question ${id}` },
    { role: "ai", result: answer(`Answer ${id}`) },
  ],
});

test("a chat is titled by its first question, cut at a word", () => {
  assert.equal(titleFor([{ role: "user", text: "  Why  do we light candles? " }]), "Why do we light candles?");
  const long = titleFor([{ role: "user", text: "word ".repeat(40) }]);
  assert.ok(long.endsWith("…") && long.length <= 71 && !long.includes("wor…"));
  assert.equal(titleFor([]), "New chat");
});

test("saving a chat moves it to the top, trims long lists, and keeps the limit", () => {
  let chats: SavedChat[] = [];
  for (let i = 0; i < MAX_CHATS + 5; i++) chats = upsertChat(chats, chat(`c${i}`, i));
  assert.equal(chats.length, MAX_CHATS);
  assert.equal(chats[0].id, `c${MAX_CHATS + 4}`);
  assert.equal(chats[0].title, `Question c${MAX_CHATS + 4}`);
  assert.equal(chats[0].messages[1].result?.retrieved.length, 20);
  chats = upsertChat(chats, { ...chat("c10", 999), category: "  Gemara  " });
  assert.equal(chats[0].id, "c10");
  assert.equal(chats[0].category, "Gemara");
  assert.equal(chats.filter((c) => c.id === "c10").length, 1);
  assert.deepEqual(upsertChat(chats, { ...chat("empty", 1), messages: [] }), chats, "an empty chat is not saved");
});

test("stored chats are checked, and anything malformed is left out", () => {
  const good = chat("a", 5);
  const parsed = parseChats([
    good,
    { id: "b", messages: [{ role: "ai", result: { status: "answered" } }] },
    { id: "c", updatedAt: 9, messages: [{ role: "user", text: "Hi" }, { role: "ai", result: "nope" }] },
    "junk",
    { ...good },
  ]);
  assert.deepEqual(
    parsed.map((c) => [c.id, c.messages.length]),
    [
      ["c", 1],
      ["a", 2],
    ],
  );
  assert.deepEqual(parseChats("not a list"), []);
});

test("chats group by category, unsorted ones last; categories include suggestions once", () => {
  const groups = groupByCategory([chat("1", 3, "Halacha"), chat("2", 2), chat("3", 1, "Gemara"), chat("4", 0, "Halacha")]);
  assert.deepEqual(
    groups.map((g) => [g.category, g.chats.map((c) => c.id)]),
    [
      ["Gemara", ["3"]],
      ["Halacha", ["1", "4"]],
      ["", ["2"]],
    ],
  );
  const cats = categoriesFor([chat("1", 1, "Shabbos"), chat("2", 1, "gemara")]);
  assert.equal(cats[0], "Shabbos");
  assert.equal(cats.filter((c) => c.toLowerCase() === "gemara").length, 1);
});

test("storage drops the oldest chats until it fits", () => {
  const chats = Array.from({ length: 10 }, (_, i) => chat(`c${i}`, 10 - i));
  const json = serializeChats(chats, 2_000);
  const kept = JSON.parse(json) as SavedChat[];
  assert.ok(json.length <= 2_000 && kept.length >= 1 && kept.length < 10);
  assert.equal(kept[0].id, "c0", "the newest stays");
});

test("dates read plainly", () => {
  const now = new Date(2026, 9, 6, 15).getTime();
  assert.equal(whenLabel(new Date(2026, 9, 6, 1).getTime(), now), "Today");
  assert.equal(whenLabel(new Date(2026, 9, 5, 23).getTime(), now), "Yesterday");
  assert.equal(whenLabel(new Date(2026, 9, 1).getTime(), now), "Oct 1");
  assert.equal(whenLabel(new Date(2025, 9, 1).getTime(), now), "Oct 1, 2025");
});

test("recent reading keeps one place per section, newest first", () => {
  let list = addRecent([], { ref: "Berakhot 2a:1", title: "Berakhot 2a", at: 1 });
  list = addRecent(list, { ref: "Genesis 1:1", title: "Genesis 1", at: 2 });
  list = addRecent(list, { ref: "Berakhot 2a:5", title: "Berakhot 2a", at: 3 });
  assert.deepEqual(
    list.map((r) => r.ref),
    ["Berakhot 2a:5", "Genesis 1:1"],
  );
  assert.deepEqual(parseRecent([{ ref: 1 }, ...list]).length, 2);
});
