import { test } from "node:test";
import assert from "node:assert/strict";
import { forKeeping, keepable, keptKey, memoryKeptStore, KEPT_MS } from "../lib/kept-answers";
import type { AskResult } from "../lib/engine/answer";

const answer = (over: Partial<AskResult> = {}): AskResult =>
  ({ status: "answered", blocks: [{ text: "x", citations: [] }], sources: [], retrieved: [], safety: null, libraryMode: "testing", droppedCitations: 0, ...over }) as AskResult;

test("a suggested question's key is the same for everyone, and changes with the day only when the question does", () => {
  assert.equal(keptKey("What is  Shabbat?", "testing", "2026-11-13"), keptKey("what is shabbat?", "testing", "2026-11-20"));
  assert.notEqual(keptKey("What is this week's parsha about?", "testing", "2026-11-13"), keptKey("What is this week's parsha about?", "testing", "2026-11-20"));
  assert.notEqual(keptKey("What is Shabbat?", "testing", "x"), keptKey("What is Shabbat?", "development", "x"));
});

test("only a clean answer with text is kept, and only for a week", async () => {
  assert.ok(keepable(answer()));
  assert.ok(!keepable(answer({ status: "error" })));
  assert.ok(!keepable(answer({ practical: true })), "a practical halacha answer is always fresh");
  assert.ok(!keepable(answer({ blocks: [] })));
  const store = memoryKeptStore();
  await store.put("k", answer({ kept: { madeAt: 1 }, timings: { total: 3 } as never }), 1000);
  const got = await store.get("k", 1000 + 60_000);
  assert.ok(got && !got.result.kept && !("timings" in got.result));
  assert.equal(await store.get("k", 1000 + KEPT_MS + 1), null);
  assert.deepEqual(Object.keys(forKeeping(answer())).sort(), Object.keys(answer()).sort());
});
