import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { checkReadings, readGlossReply } from "../lib/engine/gloss";
import { assembleOne, groupRequest, mergeTranslations, splitGroupReply } from "../lib/engine/translate";
import { gatherGroupSources, gatherSources, sourcesFor } from "../lib/engine/translate-sources";
import { buildRequests, collectBatch, dollars, groupPassages, pendingPassages, type BatchAnswer, type BatchClient } from "../lib/engine/translate-batch";
import { createTranslationStore, textCheck } from "../lib/library/translations";
import type { TestingStore } from "../lib/library/testing";
import type { Passage } from "../lib/library/types";

/*
 * RabAI's translation library: the readings check, the store, the sources a translation is made
 * from, and the batch job that fills the library. The texts are short test lines, not an edition.
 */

const P = (ref: string, he: string, en = "", order = 0, extra: Partial<Passage> = {}): Passage => ({
  ref,
  work: "test",
  section: ref.split(":")[0],
  sectionHe: "",
  order,
  label: ref,
  labelHe: "",
  he,
  en,
  source: {
    library: "testing",
    canonId: "test",
    workTitle: "A whole shelf of works",
    book: ref.replace(/ \d.*$/, ""),
    licenses: [],
    ...(en ? { enEdition: "The William Davidson Talmud" } : {}),
  },
  ...extra,
});

const GEMARA = P("Berakhot 2a:1", "מאימתי קורין את שמע בערבין", "From when may one recite Shema in the evening?");
const RASHI1 = P("Rashi on Berakhot 2a:1:1", "מאימתי קורין. משעה שהכהנים נכנסים", "", 10);
const RASHI2 = P("Rashi on Berakhot 2a:1:2", "את שמע בערבין. קריאת שמע של לילה", "", 11);
const RASHI3 = P("Rashi on Berakhot 2b:3:1", "עד סוף האשמורה. שליש הלילה", "", 12);
const TOSAFOT = P("Tosafot on Berakhot 2a:1:1", "מאימתי קורין את שמע בערבין. פירש רש״י ואנן היכי קרינן", "", 20);
const RASHA_ELSEWHERE = P("Rashba on Berakhot 11a:4", "דבר אחר לגמרי", "", 30);
const JASTROW = P("Jastrow, אֵימָתַי", "", "אֵימָתַי when? at what time?", 40, {
  source: { library: "testing", canonId: "jastrow", workTitle: "A Dictionary of the Targumim", book: "Jastrow", licenses: [], dictionary: true, wordToolOnly: true },
});

/** A stand-in for the testing library with only what translating needs. */
function fakeStore(passages: Passage[] = [GEMARA, RASHI1, RASHI2, RASHI3, TOSAFOT, RASHA_ELSEWHERE, JASTROW]): TestingStore {
  const byRef = new Map(passages.map((p) => [p.ref, p]));
  const store: Partial<TestingStore> = {
    async exact(refs) {
      return refs.map((r) => byRef.get(r)).filter((p): p is Passage => !!p);
    },
    async linked(refs) {
      return passages.filter((p) => p.ref.includes(" on ") && !refs.includes(p.ref) && (refs.some((r) => p.ref.includes(` on ${r}`)) || p === RASHA_ELSEWHERE));
    },
    async dictionary() {
      return [JASTROW];
    },
    async untranslated(_titles, after, limit) {
      return passages.filter((p) => / on /.test(p.ref) && !p.en && p.order > after).slice(0, limit);
    },
  };
  return store as TestingStore;
}

test("a reading is kept only when its source was given and quotes it", () => {
  const reply = readGlossReply(`GENERAL:
From when do we recite.
READINGS:
קורין | they read it in the synagogue | Tosafot on Berakhot 2a:1:1 | ואנן היכי קרינן
קורין | made up | Rashi on Shabbat 2a:1 | ואנן היכי קרינן
קורין | not quoted | Tosafot on Berakhot 2a:1:1 | words that are not there
קורין | one word | Tosafot on Berakhot 2a:1:1 | קרינן`);
  assert.equal(reply.general, "From when do we recite.");
  assert.equal(reply.readings.length, 4);
  const kept = checkReadings(reply.readings, [{ ref: TOSAFOT.ref, he: TOSAFOT.he, en: "" }]);
  assert.deepEqual(kept, [{ phrase: "קורין", reading: "they read it in the synagogue", ref: TOSAFOT.ref, quote: "ואנן היכי קרינן" }]);
});

test("the sources are the line a comment explains, comments on that line, and the dictionaries", async () => {
  const sources = await gatherSources(fakeStore(), RASHI1);
  assert.deepEqual(
    sources.map((s) => [s.role, s.ref]),
    [
      ["explains", "Berakhot 2a:1"],
      ["commentary", "Tosafot on Berakhot 2a:1:1"],
      ["dictionary", "Jastrow, אֵימָתַי"],
    ],
    "the other Rashi on the same line and the Rashba on another page are left out",
  );
  assert.equal(sources[0].label, "Berakhot, with the library's English (The William Davidson Talmud)");
  assert.equal(sources[2].label, "Jastrow (for word meanings only)");

  const group = await gatherGroupSources(fakeStore(), [RASHI1, RASHI2]);
  assert.deepEqual(group.map((s) => s.ref), ["Berakhot 2a:1", "Tosafot on Berakhot 2a:1:1", "Jastrow, אֵימָתַי"]);
  assert.deepEqual(sourcesFor(RASHI3, group).map((s) => s.ref), ["Jastrow, אֵימָתַי"]);
});

test("the store keeps a translation, tells what is still missing, and records batches", async () => {
  const client = createClient({ url: ":memory:" });
  const store = createTranslationStore({ run: async (sql, args = []) => (await client.execute({ sql, args })).rows.map((r) => ({ ...r })) });
  const check = textCheck(RASHI1.he);
  await store.put({ ref: RASHI1.ref, general: "From when do we recite.", basis: [{ ref: GEMARA.ref, label: "Berakhot" }] }, check, "batch");
  const kept = (await store.get([RASHI1.ref])).get(RASHI1.ref)!;
  assert.equal(kept.translation.general, "From when do we recite.");
  assert.equal(kept.translation.words, undefined, "word by word not made yet");
  assert.equal(kept.madeBy, "batch");
  assert.equal(kept.review, "unreviewed");

  const items = [{ ref: RASHI1.ref, check }, { ref: RASHI2.ref, check: textCheck(RASHI2.he) }];
  assert.deepEqual([...(await store.have(items, { general: true, words: false }))], [RASHI1.ref]);
  assert.deepEqual([...(await store.have(items, { general: true, words: true }))], [], "word by word still missing");
  assert.deepEqual([...(await store.have([{ ref: RASHI1.ref, check: "changed" }], { general: true, words: false }))], [], "a changed text needs a new translation");

  const merged = mergeTranslations(kept.translation, { ref: RASHI1.ref, general: null, words: null });
  assert.equal(merged.general, "From when do we recite.");
  assert.equal(merged.words, null, "made, but it didn't line up");
  await store.put(merged, check, "request");
  assert.equal((await store.get([RASHI1.ref])).get(RASHI1.ref)!.translation.words, null);

  await store.addJob({ batchId: "b1", madeOn: "2026-10-07", model: "claude-opus-5-5", status: "submitted", manifest: {} });
  assert.equal((await store.jobs("submitted")).length, 1);
  await store.setJobStatus("b1", "collected", "{}");
  assert.equal((await store.jobs("submitted")).length, 0);
});

test("short passages of one page go in one request, and each answer is found by its reference", () => {
  const groups = groupPassages([RASHI1, RASHI2, RASHI3], 450);
  assert.deepEqual(groups.map((g) => g.map((p) => p.ref)), [[RASHI1.ref, RASHI2.ref], [RASHI3.ref]], "a new page starts a new request");
  const req = groupRequest(
    [RASHI1, RASHI2].map((p) => ({ ref: p.ref, he: p.he, en: "", sources: [] })),
    [{ ref: GEMARA.ref, role: "explains", he: GEMARA.he, en: GEMARA.en, label: "Berakhot" }],
    { general: true, words: false },
    "test-model",
  );
  const user = JSON.stringify(req.messages);
  assert.ok(user.includes(`[${RASHI1.ref}]`) && user.includes(`[${RASHI2.ref}]`) && user.includes(`[${GEMARA.ref}]`));
  const parts = splitGroupReply(
    `[${RASHI1.ref}]\nGENERAL:\nFrom when.\n\n[Somewhere else]\nignored\n[${RASHI2.ref}]\nGENERAL:\nThe Shema of the night.`,
    [RASHI1.ref, RASHI2.ref],
  );
  assert.equal(readGlossReply(parts.get(RASHI1.ref)!).general?.startsWith("From when."), true);
  assert.equal(readGlossReply(parts.get(RASHI2.ref)!).general, "The Shema of the night.");
  const one = assembleOne({ ref: RASHI2.ref, he: RASHI2.he, en: "", sources: [] }, { general: true, words: false }, parts.get(RASHI2.ref)!, []);
  assert.equal(one.general, "The Shema of the night.");
  assert.equal(one.words, undefined);
});

test("the batch job sends only what is missing and keeps what comes back", async () => {
  const testing = fakeStore();
  const client = createClient({ url: ":memory:" });
  const library = createTranslationStore({ run: async (sql, args = []) => (await client.execute({ sql, args })).rows.map((r) => ({ ...r })) });
  await library.put({ ref: RASHI3.ref, general: "Until the end of the watch." }, textCheck(RASHI3.he), "request");
  const sel = { titles: ["Rashi on Berakhot"], want: { general: true, words: false }, model: "claude-opus-5-5" };

  const pending = await pendingPassages(testing, library, sel, 10);
  assert.deepEqual(pending.map((p) => p.ref), [RASHI1.ref, RASHI2.ref, TOSAFOT.ref, RASHA_ELSEWHERE.ref], "the kept one is skipped");

  const { requests, manifest, words } = await buildRequests(testing, pending.slice(0, 2), sel, "t1");
  assert.equal(requests.length, 1, "two comments on one page: one request");
  assert.ok(words > 0);
  assert.ok(!("betas" in requests[0].params), "the beta goes on the batch, not each request");
  const id = requests[0].custom_id;
  assert.match(id, /^[a-zA-Z0-9_-]{1,64}$/);
  assert.deepEqual(manifest[id].passages.map((p) => p.ref), [RASHI1.ref, RASHI2.ref]);

  const answers: BatchAnswer[] = [
    {
      custom_id: id,
      model: "claude-opus-5-5",
      usage: { input_tokens: 1000, output_tokens: 200 },
      text: `[${RASHI1.ref}]\nGENERAL:\nFrom when: from the time the kohanim go in.\nREADINGS:\nקורין | read in the synagogue | Tosafot on Berakhot 2a:1:1 | ואנן היכי קרינן\n[${RASHI2.ref}]\nGENERAL:\nThe Shema of the night.`,
    },
  ];
  const batches: BatchClient = {
    create: async () => ({ id: "b1" }),
    ended: async () => true,
    async *results() {
      yield* answers;
    },
  };
  const report = await collectBatch(testing, library, batches, {
    batchId: "b1",
    madeOn: "2026-10-07",
    model: "claude-opus-5-5",
    status: "submitted",
    manifest,
  });
  assert.equal(report.kept, 2);
  assert.equal(report.failed, 0);
  assert.equal(report.dollars, dollars("claude-opus-5-5", { input_tokens: 1000, output_tokens: 200 }));
  const kept = await library.get([RASHI1.ref, RASHI2.ref]);
  const first = kept.get(RASHI1.ref)!;
  assert.equal(first.madeBy, "batch");
  assert.equal(first.translation.general, "From when: from the time the kohanim go in.");
  assert.equal(first.translation.readings?.[0].ref, TOSAFOT.ref);
  assert.deepEqual(first.translation.basis?.map((b) => b.ref), [GEMARA.ref, TOSAFOT.ref, JASTROW.ref]);

  // A text that changed after it was sent is skipped, not kept with the old translation.
  const changed = fakeStore([GEMARA, { ...RASHI1, he: "נוסח אחר" }, RASHI2, TOSAFOT, JASTROW]);
  const again = await collectBatch(changed, library, batches, { batchId: "b1", madeOn: "", model: "claude-opus-5-5", status: "submitted", manifest });
  assert.equal(again.skipped, 1);
});
