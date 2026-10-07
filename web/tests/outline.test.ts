import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { numberedWords, outlineDaf, outlineRequest } from "../lib/engine/outline";
import {
  OUTLINE_VERSION,
  checkPhrases,
  cleanNote,
  flowSteps,
  keptOutline,
  kindCounts,
  nearestStep,
  outlineKey,
  phraseClass,
  phraseEnglish,
  phraseOfWord,
  phraseRuns,
  readKeptOutline,
  readOutline,
  type FlowView,
} from "../lib/engine/outline-phrases";
import { outlineFixtureClient } from "../lib/engine/outline-fixture";
import type { ModelClient } from "../lib/engine/answer";

// Two short lines, as the page numbers their words (pieceWords): 0-based, split on spaces.
const lines = [
  // 0 מאימתי 1 קורין 2 את 3 שמע 4 בערבין 5 משעה 6 שהכהנים 7 נכנסים
  { ref: "Berakhot 2a:1", he: "מאימתי קורין את שמע בערבין משעה שהכהנים נכנסים", en: "From when may one recite Shema in the evening? From the time when the priests enter" },
  // 0 גמ׳ 1 תנא 2 היכא 3 קאי
  { ref: "Berakhot 2a:6", he: "גמ׳ תנא היכא קאי", en: "GEMARA: On what basis does the tanna ask?" },
];

const reply = (items: unknown[]) => items.map((i) => JSON.stringify(i)).join("\n");

const goodLine1 = {
  ref: "Berakhot 2a:1",
  kind: "mishnah",
  note: "The Mishnah asks when the evening Shema begins",
  phrases: [
    { first: 0, last: 4, kind: "question", note: "Asks   when the evening Shema may start", en: "From when may one recite Shema in the evening?" },
    { first: 5, last: 7, kind: "answer", note: "From when the priests eat teruma", en: "From the time when the priests enter" },
  ],
};

test("phrases are read by word positions, with the library's English only when it is really there", () => {
  const out = readOutline(reply([goodLine1]), lines);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], {
    ref: "Berakhot 2a:1",
    kind: "mishnah",
    note: "The Mishnah asks when the evening Shema begins",
    phrases: [
      { from: 0, to: 5, kind: "question", note: "Asks when the evening Shema may start", en: "From when may one recite Shema in the evening?" },
      { from: 5, to: 8, kind: "answer", note: "From when the priests eat teruma", en: "From the time when the priests enter" },
    ],
  });
});

test("the outline keeps only known lines, each once, in page order, from either reply form", () => {
  const line6 = { ref: "Berakhot 2a:6", kind: "question", note: "Asks what the Mishnah builds on", phrases: [{ first: 0, last: 3, kind: "question", note: "x", en: "" }] };
  const items = [line6, goodLine1, { ...goodLine1, kind: "answer" }, { ref: "Berakhot 9z:1", kind: "answer", phrases: [] }];
  for (const text of [reply(items), `Here: ${JSON.stringify({ lines: items })}`]) {
    const out = readOutline(text, lines);
    assert.deepEqual(
      out.map((l) => [l.ref, l.kind]),
      [
        ["Berakhot 2a:1", "mishnah"],
        ["Berakhot 2a:6", "question"],
      ],
    );
  }
  assert.deepEqual(readOutline("no json", lines), []);
});

test("a reply cut short still gives the lines it finished", () => {
  const text = `${JSON.stringify(goodLine1)}\n{"ref": "Berakhot 2a:6", "kind": "question", "phrases": [{"first": 0, "la`;
  assert.deepEqual(
    readOutline(text, lines).map((l) => l.ref),
    ["Berakhot 2a:1"],
  );
});

test("phrases that don't check fall back to one phrase for the whole line, of the line's own kind", () => {
  const bad = (phrases: unknown) => readOutline(reply([{ ...goodLine1, phrases }]), lines)[0];
  const cases: Array<[string, unknown]> = [
    ["overlapping", [{ first: 0, last: 4, kind: "question" }, { first: 3, last: 7, kind: "answer" }]],
    ["out of order", [{ first: 5, last: 7, kind: "answer" }, { first: 0, last: 4, kind: "question" }]],
    ["past the line's end", [{ first: 0, last: 4, kind: "question" }, { first: 5, last: 8, kind: "answer" }]],
    ["negative", [{ first: -1, last: 7, kind: "question" }]],
    ["last before first", [{ first: 4, last: 2, kind: "question" }]],
    ["not whole numbers", [{ first: 0.5, last: 7, kind: "question" }]],
    ["Hebrew instead of positions", [{ first: "מאימתי", last: "בערבין", kind: "question" }]],
    ["an unknown kind", [{ first: 0, last: 7, kind: "opinion" }]],
    ["too little of the line", [{ first: 0, last: 2, kind: "question" }]],
    ["no phrases", []],
    ["missing", undefined],
  ];
  for (const [why, phrases] of cases) {
    assert.deepEqual(
      bad(phrases),
      {
        ref: "Berakhot 2a:1",
        kind: "mishnah",
        note: "The Mishnah asks when the evening Shema begins",
        phrases: [{ from: 0, to: 8, kind: "mishnah", note: "The Mishnah asks when the evening Shema begins" }],
        whole: true,
      },
      why,
    );
  }
  // With no usable kind for the line either, the line is left out.
  assert.deepEqual(readOutline(reply([{ ...goodLine1, kind: "opinion", phrases: [] }]), lines), []);
  // A line with a bad kind but good phrases takes its first phrase's kind.
  assert.equal(readOutline(reply([{ ...goodLine1, kind: "opinion" }]), lines)[0].kind, "question");
});

test("phrases may leave a little of the line out, but not much, and bare punctuation joins its phrase", () => {
  const words = ["תנא", "היכא", "קאי", ":", "ותו", "מאי", "שנא", "דתני", "בערבית", "ברישא"];
  // One word with letters left out of ten: allowed, and left uncolored.
  const gap = checkPhrases(
    [
      { from: 0, to: 3, kind: "question", note: "", en: "" },
      { from: 5, to: 10, kind: "question", note: "", en: "" },
    ],
    words,
    "",
  );
  assert.deepEqual(
    gap?.map((p) => [p.from, p.to]),
    [
      [0, 4],
      [5, 10],
    ],
    "the colon joins the phrase before it; ותו stays uncolored",
  );
  // Three of ten left out is too many.
  assert.equal(checkPhrases([{ from: 0, to: 3, kind: "question", note: "", en: "" }, { from: 7, to: 10, kind: "answer", note: "", en: "" }], words, ""), null);
  // Bare words before the first phrase join it.
  assert.deepEqual(checkPhrases([{ from: 1, to: 3, kind: "statement", note: "", en: "" }], ["–", "תנא", "קאי"], "")?.[0], { from: 0, to: 3, kind: "statement", note: "" });
});

test("a phrase's English must be an exact stretch of the line's English", () => {
  const en = "From when may one recite   Shema in the evening? From the time when the priests enter";
  assert.equal(phraseEnglish("From when may one recite Shema", en), "From when may one recite Shema");
  assert.equal(phraseEnglish("  recite\nShema in the  evening?  ", en), "recite Shema in the evening?", "spaces count as one");
  assert.equal(phraseEnglish("When may one recite the Shema", en), undefined, "reworded");
  assert.equal(phraseEnglish("from when may one recite Shema", en), undefined, "letter case differs");
  assert.equal(phraseEnglish("From when may one recite Shema at night", en), undefined, "words added");
  assert.equal(phraseEnglish("", en), undefined);
  assert.equal(phraseEnglish("?", en), undefined, "no letters");
  assert.equal(phraseEnglish(42, en), undefined);
  assert.equal(phraseEnglish("Shema", ""), undefined, "a line with no English");
  // In a reply: a phrase whose English was rewritten keeps its place and kind, but shows no English.
  const rewritten = readOutline(reply([{ ...goodLine1, phrases: [{ ...goodLine1.phrases[0], en: "When can one say the evening Shema?" }, goodLine1.phrases[1]] }]), lines)[0];
  assert.equal(rewritten.whole, undefined);
  assert.equal(rewritten.phrases[0].en, undefined);
  assert.equal(rewritten.phrases[0].kind, "question");
  assert.equal(rewritten.phrases[1].en, "From the time when the priests enter");
});

test("notes are short plain words", () => {
  assert.equal(cleanNote("  **Asks**   why\nthe Mishnah starts at night  "), "Asks why the Mishnah starts at night");
  assert.equal(cleanNote(7), "");
  const long = cleanNote("word ".repeat(60));
  assert.ok(long.length <= 140 && long.endsWith("…"));
});

test("the outline request numbers the library's words and gives each line's English", () => {
  assert.equal(numberedWords("גמ׳ תנא  היכא"), "(0) גמ׳ (1) תנא (2) היכא");
  const req = outlineRequest(lines, "test-model");
  const system = JSON.stringify(req.system);
  assert.ok(system.includes("Marking the flow of the Gemara"));
  assert.ok(system.includes("first and last words") && system.includes("copied exactly"));
  assert.ok(system.length > 10_000, "the core premises come first");
  assert.equal((req.system as Array<{ cache_control?: unknown }>)[1].cache_control !== undefined, true, "the instructions are cached");
  const user = String(req.messages[0].content);
  assert.ok(user.includes("[Berakhot 2a:1]\nWords: (0) מאימתי (1) קורין"));
  assert.ok(user.includes("English: GEMARA: On what basis does the tanna ask?"));
  assert.ok(req.max_tokens >= 16000, "room for a long amud");
});

test("outlining asks the model once and checks its reply", async () => {
  let calls = 0;
  const client: ModelClient = {
    create: async () => {
      calls++;
      return { model: "test-model", content: [{ type: "text", text: reply([goodLine1]) }] } as unknown as BetaMessage;
    },
  };
  const result = await outlineDaf(lines, client);
  assert.equal(calls, 1);
  assert.equal(result.model, "test-model");
  assert.deepEqual(
    result.lines[0].phrases.map((p) => p.kind),
    ["question", "answer"],
  );
});

test("an outline kept on the device is versioned and checked again against the page", () => {
  assert.notEqual(outlineKey("Berakhot 2a"), "rabai_outline:Berakhot 2a", "a new key, so an old line-by-line outline is never read as phrases");
  const made = { lines: readOutline(reply([goodLine1]), lines), model: "m" };
  const kept = JSON.parse(keptOutline(made));
  assert.equal(kept.v, OUTLINE_VERSION);
  assert.deepEqual(readKeptOutline(kept, lines), made);
  // The old form (one kind per line, no phrases, no version) isn't read.
  assert.equal(readKeptOutline({ lines: [{ ref: "Berakhot 2a:1", kind: "mishnah", note: "x" }] }, lines), null);
  // The library's English changed: the English is no longer shown.
  const newEnglish = readKeptOutline(kept, [{ ...lines[0], en: "Another translation entirely" }, lines[1]]);
  assert.deepEqual(newEnglish?.lines[0].phrases.map((p) => p.en), [undefined, undefined]);
  // The words changed: the phrases no longer fit, so the line is one phrase.
  const fewer = readKeptOutline(kept, [{ ...lines[0], he: "מאימתי קורין את" }, lines[1]]);
  assert.deepEqual(fewer?.lines[0].phrases, [{ from: 0, to: 3, kind: "mishnah", note: "The Mishnah asks when the evening Shema begins" }]);
});

test("the page wraps words in runs by phrase, and colors only the chosen kind", () => {
  const phrases = readOutline(reply([goodLine1]), lines)[0].phrases;
  assert.deepEqual(phraseRuns(phrases, 0, 8), [
    { from: 0, to: 5, n: 0 },
    { from: 5, to: 8, n: 1 },
  ]);
  // A printed line holding only part of the passage.
  assert.deepEqual(phraseRuns(phrases, 3, 7), [
    { from: 3, to: 5, n: 0 },
    { from: 5, to: 7, n: 1 },
  ]);
  assert.deepEqual(phraseRuns(undefined, 2, 4), [{ from: 2, to: 4, n: -1 }]);
  assert.deepEqual(phraseRuns([{ from: 2, to: 3, kind: "proof", note: "" }], 0, 5), [
    { from: 0, to: 2, n: -1 },
    { from: 2, to: 3, n: 0 },
    { from: 3, to: 5, n: -1 },
  ]);
  assert.equal(phraseOfWord(phrases, 6), 1);
  assert.equal(phraseOfWord(phrases, 9), -1);

  const flow: FlowView = { phrases: { "Berakhot 2a:1": phrases }, only: null, current: { ref: "Berakhot 2a:1", n: 1 } };
  assert.equal(phraseClass(flow, "Berakhot 2a:1", 0), "dphr k-question");
  assert.equal(phraseClass(flow, "Berakhot 2a:1", 1), "dphr k-answer cur");
  assert.equal(phraseClass({ ...flow, only: "answer" }, "Berakhot 2a:1", 0), "dphr faded");
  assert.equal(phraseClass(flow, "Berakhot 9z:1", 0), "dphr");
});

test("stepping goes phrase by phrase in page order, and through one kind when it is chosen", () => {
  const line6 = { ref: "Berakhot 2a:6", kind: "question", note: "n", phrases: [{ first: 0, last: 3, kind: "question", note: "x", en: "" }] };
  const outline = readOutline(reply([line6, goodLine1]), lines);
  const all = flowSteps(outline);
  assert.deepEqual(
    all.map((s) => [s.ref, s.n, s.phrase.kind]),
    [
      ["Berakhot 2a:1", 0, "question"],
      ["Berakhot 2a:1", 1, "answer"],
      ["Berakhot 2a:6", 0, "question"],
    ],
  );
  const questions = flowSteps(outline, "question");
  assert.equal(questions.length, 2);
  assert.deepEqual(kindCounts(outline), [
    ["question", 2],
    ["answer", 1],
  ]);
  // Choosing "question" while on the answer moves on to the next question after it.
  assert.equal(nearestStep(outline, questions, { ref: "Berakhot 2a:1", n: 1 }), 1);
  assert.equal(nearestStep(outline, questions, { ref: "Berakhot 2a:1", n: 0 }), 0);
  assert.equal(nearestStep(outline, questions, null), 0);
  assert.equal(nearestStep(outline, [], null), -1);
});

test("a saved reply stands in for the model only on a computer, never on a deployment", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rabai-outline-"));
  await writeFile(join(dir, "Berakhot 2a.txt"), reply([goodLine1]));
  const path = join(dir, "{section}.txt");
  assert.equal(outlineFixtureClient("Berakhot 2a", {}), null);
  assert.equal(outlineFixtureClient("Berakhot 2a", { RABAI_OUTLINE_FIXTURE: path, VERCEL: "1" }), null);
  assert.equal(outlineFixtureClient("Berakhot 2a", { RABAI_OUTLINE_FIXTURE: path, NODE_ENV: "production" }), null);
  const client = outlineFixtureClient("Berakhot 2a", { RABAI_OUTLINE_FIXTURE: path, NODE_ENV: "development" });
  assert.ok(client);
  const result = await outlineDaf(lines, client);
  assert.equal(result.model, "fixture");
  assert.equal(result.lines[0].phrases.length, 2, "the saved reply is checked like a real one");
});
