import { test } from "node:test";
import assert from "node:assert/strict";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { ask, buildQuestion, planRequest, type ModelClient } from "../lib/engine/answer";
import { mapAnswer, cleanText } from "../lib/engine/citations";
import { checkSafety } from "../lib/engine/safety";
import { CORE_PREMISES } from "../lib/engine/core-premises.generated";
import { loadLibrary } from "../lib/library/index";

const lib = loadLibrary("development");
const config = { model: "claude-opus-5-5", effort: "high" as const, maxTokens: 16000 };

function fakeClient(build: (params: MessageCreateParamsNonStreaming) => Partial<BetaMessage>) {
  const calls: MessageCreateParamsNonStreaming[] = [];
  const client: ModelClient = {
    async create(params) {
      calls.push(params);
      return { id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", content: [], ...build(params) } as BetaMessage;
    },
  };
  return { client, calls };
}

/** Index of the document whose title is the ref, in the request the engine sent. */
function docIndex(params: MessageCreateParamsNonStreaming, ref: string): number {
  const last = params.messages[params.messages.length - 1];
  const content = Array.isArray(last.content) ? last.content : [];
  return content.findIndex((b) => b.type === "document" && b.title === ref);
}

test("the core premises are loaded from prompts/core-premises.md", () => {
  assert.match(CORE_PREMISES, /^You are RabAI/);
  assert.match(CORE_PREMISES, /Never invent a\s+source/);
});

test("the request: core premises first, documents with citations, fallback on, adaptive thinking", () => {
  const { params, documents } = planRequest({ question: "Why does the Torah start with Creation?" }, lib, config);
  const system = params.system as Array<{ text: string; cache_control?: unknown }>;
  assert.equal(system[0].text, CORE_PREMISES);
  assert.ok(system[1].cache_control, "stable instructions are cached");
  assert.match(system[2].text, /Growth help: off\./);
  assert.equal(params.model, "claude-opus-5-5");
  assert.deepEqual(params.thinking, { type: "adaptive" });
  assert.deepEqual(params.output_config, { effort: "high" });
  assert.equal(params.fallbacks, "default");
  assert.deepEqual(params.betas, ["server-side-fallback-2026-07-01"]);
  assert.ok(documents.length > 0);
  const last = params.messages[params.messages.length - 1];
  assert.equal(last.role, "user");
  const content = last.content as unknown as Array<Record<string, unknown>>;
  for (const block of content.slice(0, -1)) {
    assert.equal(block.type, "document");
    assert.deepEqual(block.citations, { enabled: true });
  }
  assert.equal(content[content.length - 1].type, "text");
});

test("history alternates and never ends on the user before the new question", () => {
  const { params } = planRequest(
    {
      question: "And the Ramban?",
      history: [
        { role: "assistant", text: "welcome" },
        { role: "user", text: "Why does the Torah begin with Creation?" },
        { role: "assistant", text: "Rashi asks this." },
        { role: "user", text: "dangling" },
      ],
      growth: true,
    },
    lib,
    config,
  );
  const roles = params.messages.map((m) => m.role);
  assert.deepEqual(roles, ["user", "assistant", "user"]);
  assert.match((params.system as Array<{ text: string }>)[2].text, /Growth help: on\./);
});

test("line actions become a clear question about that line", () => {
  assert.match(buildQuestion({ question: "", action: "words", focusRef: "Bereishit 1:1" }), /word by word/);
  assert.equal(buildQuestion({ question: "Why light?", focusRef: "Bereishit 1:3" }), "About Bereishit 1:3: Why light?");
});

test("verified citations become source buttons; invented ones are dropped", async () => {
  const { client, calls } = fakeClient((params) => {
    const rashi = docIndex(params, "Rashi on Bereishit 1:1");
    return {
      content: [
        { type: "thinking", thinking: "", signature: "x" },
        { type: "text", text: "What a wonderful question. ", citations: null },
        {
          type: "text",
          text: "Rashi asks exactly this.",
          citations: [
            { type: "char_location", cited_text: "Why did it begin with Creation?", document_index: rashi, document_title: "Rashi on Bereishit 1:1", start_char_index: 0, end_char_index: 10, file_id: null },
            // Points at a document that was never sent.
            { type: "char_location", cited_text: "anything", document_index: 99, document_title: "Kuzari 1:25", start_char_index: 0, end_char_index: 8, file_id: null },
            // Quotes words that are not in the document.
            { type: "char_location", cited_text: "words Rashi never wrote", document_index: rashi, document_title: "Rashi on Bereishit 1:1", start_char_index: 0, end_char_index: 8, file_id: null },
          ],
        },
        { type: "text", text: "\n\nShall we read it together?", citations: null },
      ] as BetaMessage["content"],
    };
  });
  const result = await ask({ question: "Why does the Torah begin with Creation and not with the first mitzvah?" }, client, lib);
  assert.equal(calls.length, 1);
  assert.equal(result.status, "answered");
  assert.equal(result.droppedCitations, 2);
  assert.deepEqual(result.sources.map((s) => s.ref), ["Rashi on Bereishit 1:1"]);
  assert.deepEqual(result.blocks[1].citations.map((c) => c.ref), ["Rashi on Bereishit 1:1"]);
  assert.equal(result.blocks.map((b) => b.text).join(""), "What a wonderful question. Rashi asks exactly this.\n\nShall we read it together?");
});

test("a refusal is shown kindly, without partial text", async () => {
  const { client } = fakeClient(() => ({ stop_reason: "refusal", content: [{ type: "text", text: "partial", citations: null }] as BetaMessage["content"] }));
  const result = await ask({ question: "Why do we add a Chanukah light each night?" }, client, lib);
  assert.equal(result.status, "refused");
  assert.equal(result.blocks.length, 0);
  assert.ok(result.notice);
});

test("without an API key it still shows the sources it found", async () => {
  const result = await ask({ question: "Why do we add a Chanukah light each night?" }, null, lib);
  assert.equal(result.status, "no_key");
  assert.ok(result.retrieved.includes("Shabbat 21b:2"));
});

test("a failed model call becomes a gentle error", async () => {
  const client: ModelClient = { create: async () => { throw new Error("network down"); } };
  const result = await ask({ question: "Who was Hillel?" }, client, lib);
  assert.equal(result.status, "error");
});

test("the safety check flags danger, shows resources, and tells the model", async () => {
  assert.equal(checkSafety("I want to die").concern, "self_harm");
  assert.equal(checkSafety("Why do we light Chanukah candles?").concern, null);
  const { client, calls } = fakeClient(() => ({ content: [{ type: "text", text: "I'm so glad you told me.", citations: null }] as BetaMessage["content"] }));
  const result = await ask({ question: "I don't want to live anymore" }, client, lib);
  assert.equal(result.safety?.lines[0].href, "tel:988");
  assert.match((calls[0].system as Array<{ text: string }>)[2].text, /safety check flagged/);
});

test("cleanText strips Markdown the model should not use", () => {
  assert.equal(cleanText("**Rashi** says\n## Heading\n- one"), "Rashi says\nHeading\none");
});

test("mapAnswer ignores non-text blocks and keeps text-only answers", () => {
  const mapped = mapAnswer([{ type: "fallback" }, { type: "text", text: "Hello", citations: null }], [], []);
  assert.equal(mapped.blocks.length, 1);
  assert.equal(mapped.dropped, 0);
});

test("a word question attaches every place the root appears and names them for RabAI", () => {
  const { params, documents } = planRequest(
    { question: "", action: "word", word: "ויבדל", focusRef: "Bereishit 1:4" },
    lib,
    config,
  );
  const sent = documents.map((d) => d.ref);
  assert.equal(sent[0], "Bereishit 1:4");
  for (const r of ["Bereishit 1:6", "Bereishit 1:7", "Bereishit 1:14"]) assert.ok(sent.includes(r), r);
  const settings = (params.system as Array<{ text: string }>)[2].text;
  assert.match(settings, /Elsewhere in the library, the root ב-ד-ל appears in: Bereishit 1:6; Bereishit 1:7; Bereishit 1:14\./);
  const last = params.messages[params.messages.length - 1];
  const content = last.content as unknown as Array<{ type: string; text?: string }>;
  assert.match(content[content.length - 1].text ?? "", /What does the word ויבדל mean in Bereishit 1:4\?/);
});

test("a word with no other appearances tells RabAI not to name any", () => {
  const { params } = planRequest({ question: "", action: "word", word: "תהום", focusRef: "Bereishit 1:2" }, lib, config);
  assert.match((params.system as Array<{ text: string }>)[2].text, /do not name other places it appears/);
});

test("checking a translation quotes the person's attempt", () => {
  const q = buildQuestion({ question: "One said: the taste of Beis Shammai", action: "check", focusRef: "Shabbat 21b:4" });
  assert.match(q, /my own translation of Shabbat 21b:4/);
  assert.match(q, /the taste of Beis Shammai/);
});
