import { test } from "node:test";
import assert from "node:assert/strict";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { alignGlosses, glossCoverage, glossParts, readGlossReply, readKeptTranslation } from "../lib/engine/gloss";
import { translatePassage, translateRequest } from "../lib/engine/translate";
import type { ModelClient } from "../lib/engine/answer";

const reply = (text: string, model = "test-model") =>
  ({ id: "m", type: "message", role: "assistant", model, content: [{ type: "text", text, citations: null }], stop_reason: "end_turn" }) as unknown as BetaMessage;

test("the reply is read into a general translation and word lines", () => {
  const out = readGlossReply(`GENERAL:
Our Rabbis taught: [one] who sees a place.

WORDS:
- ת"ר | our Rabbis taught | תנו רבנן
הרואה | one who sees
מקום|a place
not a word line
| missing word
`);
  assert.equal(out.general, "Our Rabbis taught: [one] who sees a place.");
  assert.deepEqual(out.items, [
    { he: 'ת"ר', en: "our Rabbis taught", expanded: "תנו רבנן" },
    { he: "הרואה", en: "one who sees" },
    { he: "מקום", en: "a place" },
  ]);
  assert.deepEqual(readGlossReply("WORDS:\nאמר | said"), { general: null, items: [{ he: "אמר", en: "said" }] });
});

test("the model's words are laid on the library's own words", () => {
  const words = ["ת״ר", "הרואה", "מקום", "שנעשו", "בו", "נסים", "לישראל", "-", "אומר:"];
  const rows = alignGlosses(words, [
    { he: 'ת"ר', en: "our Rabbis taught", expanded: "תנו רבנן" },
    { he: "הרואה", en: "one who sees" },
    // a skipped word (מקום) and a full spelling the text writes short (נסים)
    { he: "שנעשו בו", en: "where were done" },
    { he: "ניסים", en: "miracles" },
    { he: "לא-קיים", en: "not in the text" },
    { he: "לישראל", en: "for Israel" },
    { he: "אומר", en: "says" },
  ]);
  assert.deepEqual(rows, [
    { he: "ת״ר", at: 0, n: 1, en: "our Rabbis taught", expanded: "תנו רבנן" },
    { he: "הרואה", at: 1, n: 1, en: "one who sees" },
    { he: "מקום", at: 2, n: 1, en: null },
    { he: "שנעשו בו", at: 3, n: 2, en: "where were done" },
    { he: "נסים", at: 5, n: 1, en: "miracles" },
    // the dash has no letters, so it joins the word before it
    { he: "לישראל -", at: 6, n: 2, en: "for Israel" },
    { he: "אומר:", at: 8, n: 1, en: "says" },
  ]);
  assert.equal(glossCoverage(words, rows), 7 / 8);
});

test("a word list that doesn't match the text gives no English", () => {
  const words = ["אמר", "רבי", "יוחנן"];
  const rows = alignGlosses(words, [{ he: "שלום", en: "peace" }]);
  assert.deepEqual(rows, [{ he: "אמר רבי יוחנן", at: 0, n: 3, en: null }]);
  assert.equal(glossCoverage(words, rows), 0);
});

test("long passages are split at the end of a sentence", () => {
  const words = Array.from({ length: 140 }, (_, i) => (i === 49 ? "סוף." : "מלה"));
  assert.deepEqual(glossParts(words, 70, 40), [
    [0, 50],
    [50, 120],
    [120, 140],
  ]);
  // A short remainder joins the part before it.
  assert.deepEqual(glossParts(Array(75).fill("מלה"), 70, 40), [[0, 75]]);
  assert.deepEqual(glossParts(Array(30).fill("מלה")), [[0, 30]]);
});

test("a kept translation is checked before it is shown", () => {
  const good = { ref: "Rashi on Berakhot 2a:1:1", general: "From when", words: [{ he: "מאימתי", at: 0, n: 1, en: "from when" }] };
  assert.deepEqual(readKeptTranslation(good), good);
  assert.equal(readKeptTranslation({ ref: "x", general: null, words: null }), null);
  assert.equal(readKeptTranslation({ ref: "x", general: "y", words: [{ he: "a" }] }), null);
  assert.equal(readKeptTranslation("nope"), null);
});

test("the request carries the core premises, the passage and its context", () => {
  const req = translateRequest(
    { ref: "Rashi on Berakhot 2a:1:1", he: "מאימתי קורין", en: "", context: [{ ref: "Berakhot 2a:1", he: "מאימתי קורין את שמע", en: "From when" }] },
    { general: true, part: "מאימתי קורין" },
    "test-model",
  );
  const system = JSON.stringify(req.system);
  assert.ok(system.includes("Translating a passage"));
  assert.ok(system.length > 10_000, "the core premises come first");
  const user = JSON.stringify(req.messages);
  assert.ok(user.includes("Rashi on Berakhot 2a:1:1") && user.includes("For context only, Berakhot 2a:1"));
  assert.ok(user.includes("GENERAL:") && user.includes("word-by-word translation of the whole passage"));
});

test("a short passage takes one request; the general translation is skipped when the library has English", async () => {
  const sent: MessageCreateParamsNonStreaming[] = [];
  const client: ModelClient = {
    create: async (params) => {
      sent.push(params);
      return reply("GENERAL:\nFrom when do we recite.\nWORDS:\nמאימתי | from when\nקורין | do we recite");
    },
  };
  const both = await translatePassage({ ref: "R 1", he: "מאימתי קורין", en: "", context: [] }, client);
  assert.equal(sent.length, 1);
  assert.equal(both.general, "From when do we recite.");
  assert.equal(both.words?.length, 2);
  assert.equal(both.model, "test-model");

  const wordsOnly = await translatePassage({ ref: "R 2", he: "מאימתי קורין", en: "From when", context: [] }, client);
  assert.equal(wordsOnly.general, null);
  assert.ok(!JSON.stringify(sent[1].messages).includes("GENERAL:"));
});

test("a long passage is translated in parts at the same time, and put back in order", async () => {
  const words = Array.from({ length: 150 }, (_, i) => `מלה${"אבגדהוזחטכלמנסעפצקרשת"[i % 22]}${"אבגדהוזח"[Math.floor(i / 22)]}`);
  const he = words.join(" ");
  let general = 0;
  const client: ModelClient = {
    create: async (params) => {
      const user = JSON.stringify(params.messages);
      const asksGeneral = user.includes('after \\"GENERAL:\\"');
      if (asksGeneral) {
        general++;
        return reply("GENERAL:\nThe whole passage.");
      }
      const part = user.match(/last, after \\"WORDS:\\":\\n([^"]+)"/)?.[1] ?? "";
      // Answer in a different order of time than asked, so order must come from the parts.
      await new Promise((r) => setTimeout(r, part.length % 7));
      return reply(`WORDS:\n${part.split(" ").map((w) => `${w} | g-${w}`).join("\n")}`);
    },
  };
  const out = await translatePassage({ ref: "Tosafot on X", he, en: "", context: [] }, client);
  assert.equal(general, 1);
  assert.equal(out.general, "The whole passage.");
  assert.equal(out.words?.length, 150);
  assert.deepEqual(out.words?.map((r) => r.at), words.map((_, i) => i));
  assert.ok(out.words?.every((r, i) => r.en === `g-${words[i]}`));
});

test("a failed part leaves its words without English; too many holes hides the list", async () => {
  const words = Array.from({ length: 220 }, () => "מלה");
  let n = 0;
  const failing: ModelClient = {
    create: async (params) => {
      const user = JSON.stringify(params.messages);
      if (user.includes('after \\"GENERAL:\\"')) return reply("GENERAL:\nText.");
      if (n++ === 0) throw new Error("overloaded");
      const part = user.match(/last, after \\"WORDS:\\":\\n([^"]+)"/)?.[1] ?? "";
      return reply(`WORDS:\n${part.split(" ").map((w) => `${w} | word`).join("\n")}`);
    },
  };
  const out = await translatePassage({ ref: "T", he: words.join(" "), en: "", context: [] }, failing);
  assert.equal(out.general, "Text.");
  assert.ok(out.words, "two of three parts is enough");
  assert.ok(out.words.some((r) => r.en === null));

  const silent: ModelClient = { create: async () => reply("I can't.") };
  await assert.rejects(translatePassage({ ref: "T", he: "אמר רבא", en: "", context: [] }, silent));
  await assert.rejects(translatePassage({ ref: "T", he: "אמר רבא", en: "Rava said", context: [] }, silent));
});
