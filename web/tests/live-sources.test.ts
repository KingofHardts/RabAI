import { test } from "node:test";
import assert from "node:assert/strict";
import { createReadFilter, readableRefs, refKey, stripMarkers } from "../lib/engine/live-sources";
import { answerText, mapAnswer } from "../lib/engine/citations";
import { ask, type ModelClient } from "../lib/engine/answer";
import { loadLibrary } from "../lib/library";
import type { TestingStore } from "../lib/library/testing";
import type { Passage } from "../lib/library/types";

/*
 * The texts on screen while RabbAI answers: what it quotes (its own citations, checked) and the
 * lines it reads aloud ([[read REF]]). The texts here are short test lines, not an edition.
 */

const P = (ref: string, he: string, en = ""): Passage => ({
  ref,
  work: "test",
  section: ref.split(":")[0],
  sectionHe: "",
  order: 0,
  label: ref,
  labelHe: "",
  he,
  en,
  source: { library: "testing", canonId: "test", workTitle: "Test", book: ref.replace(/ \d.*$/, ""), licenses: [] },
});

function filtered(pieces: string[], readable: string[]) {
  const refs = new Map(readable.map((r) => [refKey(r), r]));
  let text = "";
  const reads: Array<{ ref: string; at: number }> = [];
  const f = createReadFilter({ canRead: (r) => refs.get(refKey(r)) ?? null, onText: (t) => (text += t), onRead: (ref, at) => reads.push({ ref, at }) });
  for (const p of pieces) f.push(p);
  f.flush();
  return { text, reads };
}

test("read markers are taken out of the live text, even when they arrive in pieces", () => {
  const { text, reads } = filtered(["Let's start.\n[", "[re", "ad Berakhot 2a", ":1]]\nSo the Mishnah asks."], ["Berakhot 2a:1"]);
  assert.equal(text, "Let's start.\nSo the Mishnah asks.");
  assert.deepEqual(reads, [{ ref: "Berakhot 2a:1", at: "Let's start.\n".length }]);
});

test("a marker naming a text that wasn't sent shows nothing and reads nothing", () => {
  const { text, reads } = filtered(["[[read Shabbat 2a:1]] Then."], ["Berakhot 2a:1"]);
  assert.equal(text, " Then.");
  assert.deepEqual(reads, []);
});

test("brackets that aren't a marker pass through", () => {
  assert.equal(filtered(["He said [[maybe]] and [so]."], []).text, "He said [[maybe]] and [so].");
  assert.equal(filtered(["A [", "b] c"], []).text, "A [b] c");
  assert.equal(stripMarkers("x [[read Berakhot 2a"), "x ");
});

test("the final answer turns markers into reading blocks, and history keeps them", () => {
  const docs = [P("Berakhot 2a:1", "מאימתי קורין את שמע", "From when do we recite the Shema?")];
  const texts = docs.map((d) => `${d.he}\n\n${d.en}`);
  const mapped = mapAnswer(
    [
      { type: "text", text: "Let's read it.\n[[read Berakhot 2a:1]]\nThe Mishnah starts with the evening. " },
      { type: "text", text: "It asks from when", citations: [{ type: "char_location", cited_text: "From when do we recite the Shema?", document_index: 0 }] },
      { type: "text", text: " [[read Shabbat 2a:1]]." },
    ],
    docs,
    texts,
    readableRefs(docs),
  );
  assert.deepEqual(
    mapped.blocks.map((b) => (b.read ? `R:${b.read}` : b.text)),
    ["Let's read it.\n", "R:Berakhot 2a:1", "The Mishnah starts with the evening. ", "It asks from when", " ."],
  );
  assert.equal(mapped.dropped, 0);
  assert.ok(answerText(mapped).includes("[[read Berakhot 2a:1]]"));
});

test("while it writes: the passages it quotes and reads come once each, with where they came", async () => {
  const gemara = P("Berakhot 2a:1", "מאימתי קורין את שמע", "From when do we recite the Shema in the evening?");
  const rashi = P("Rashi on Berakhot 2a:1:1", "משעה שהכהנים נכנסים", "From the time the priests enter");
  const store = {
    async lookup(refs: string[]) {
      return [gemara, rashi].filter((p) => refs.includes(p.ref));
    },
    async search() {
      return [];
    },
    async linked() {
      return [rashi];
    },
  } as unknown as TestingStore;
  const client: ModelClient = {
    async create(params, onText, options) {
      onText?.("Here it is.\n[[read Berakhot 2a:1]]\n");
      // A citation the check refuses (words not in the passage), then one it passes.
      options?.onCitation?.({ type: "char_location", cited_text: "something else", document_index: 0 });
      options?.onCitation?.({ type: "char_location", cited_text: "From the time the priests enter", document_index: 1 });
      onText?.("Rashi says from when the kohanim go in.");
      return {
        id: "m",
        type: "message",
        role: "assistant",
        model: params.model,
        content: [
          { type: "text", text: "Here it is.\n[[read Berakhot 2a:1]]\n", citations: null },
          { type: "text", text: "Rashi says from when the kohanim go in.", citations: [{ type: "char_location", cited_text: "From the time the priests enter", document_index: 1, start_char_index: 0, end_char_index: 10, document_title: "x" }] },
        ],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      } as never;
    },
  };
  const passages: string[] = [];
  const cites: Array<{ ref: string; at: number }> = [];
  const reads: Array<{ ref: string; at: number }> = [];
  let text = "";
  const lib = loadLibrary("development");
  const result = await ask(
    {
      question: "Why the evening?",
      talking: true,
      history: [
        { role: "user", text: "Let's learn the first Mishnah." },
        { role: "assistant", text: "Gladly." },
      ],
      lastRefs: [gemara.ref, rashi.ref],
    },
    client,
    { ...lib, mode: "testing" },
    store,
    {
      onText: (t) => (text += t),
      onPassage: (p) => passages.push(p.ref),
      onCite: (c) => cites.push({ ref: c.ref, at: c.at }),
      onRead: (r) => reads.push(r),
    },
  );
  assert.equal(text, "Here it is.\nRashi says from when the kohanim go in.");
  assert.deepEqual(passages, ["Berakhot 2a:1", "Rashi on Berakhot 2a:1:1"]);
  assert.deepEqual(reads, [{ ref: "Berakhot 2a:1", at: "Here it is.\n".length }]);
  assert.deepEqual(cites, [{ ref: "Rashi on Berakhot 2a:1:1", at: "Here it is.\n".length }]);
  assert.equal(result.status, "answered");
  assert.deepEqual(
    result.card?.map((p) => p.ref),
    ["Berakhot 2a:1", "Rashi on Berakhot 2a:1:1"],
  );
  assert.equal(result.card?.[0].library, "testing");
  assert.ok(result.blocks.some((b) => b.read === "Berakhot 2a:1"));
});
