import { test } from "node:test";
import assert from "node:assert/strict";
import { ask, conversationTurn, CONVERSATION_SETTING, CONVERSATION_TURN_NOTE, interruptedSetting, modelFor, planRequest, type ModelClient } from "../lib/engine/answer";
import { quickFollowUp, retrieveFollowUp } from "../lib/engine/lookup";
import { warmRequests } from "../lib/engine/warm";
import { CORE_PREMISES } from "../lib/engine/core-premises.generated";
import { loadLibrary } from "../lib/library";
import { nextLivePiece } from "../components/voice";
import { isCuttingIn } from "../components/talk";
import { lastHeard, talkReducer, TALK_OFF, type TalkState } from "../lib/talk";
import type { TestingStore } from "../lib/library/testing";
import type { Passage } from "../lib/library/types";

/*
 * Talking with RabbAI: the faster path for a conversation's turns, cutting in while it speaks, and
 * reading an answer aloud while it is written. The texts are short test lines, not an edition.
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

test("a conversation's turn is quick: Talk and chavrusa, not a line action or 'go deeper'", () => {
  assert.equal(conversationTurn({ talking: true }), true);
  assert.equal(conversationTurn({ chavrusa: { style: "partner", depth: "standard", text: "Berakhot 2a" } }), true);
  assert.equal(conversationTurn({ talking: true, deep: true }), false);
  assert.equal(conversationTurn({ talking: true, action: "explain" }), false);
  assert.equal(conversationTurn({}), false);
  const config = { model: "big", effort: "medium" as const, maxTokens: 16000, talkModel: "fast", talkEffort: "low" as const, talkMaxTokens: 6000 };
  assert.deepEqual(modelFor({ talking: true }, config), { model: "fast", effort: "low", maxTokens: 6000 });
  assert.deepEqual(modelFor({}, config), { model: "big", effort: "medium", maxTokens: 16000 });
  assert.deepEqual(modelFor({ deep: true }, config), { model: "big", effort: "high", maxTokens: 16000 });
});

test("a conversation's turn is told to be short, and where the person cut in", () => {
  const lib = loadLibrary("development");
  const config = { model: "big", effort: "medium" as const, maxTokens: 16000, talkModel: "fast", talkEffort: "low" as const, talkMaxTokens: 6000, cacheTtl: "1h" as const };
  const plan = planRequest({ question: "Why?", talking: true, interrupted: "and so Rashi says the verse" }, lib, config, []);
  const system = plan.params.system as Array<{ text: string; cache_control?: { ttl?: string } }>;
  const settings = system[system.length - 1].text;
  assert.ok(settings.includes(CONVERSATION_SETTING));
  assert.ok(settings.includes(interruptedSetting("and so Rashi says the verse")));
  assert.equal(plan.params.model, "fast");
  // The instructions are kept cached for an hour.
  assert.equal(system[1].cache_control?.ttl, "1h");
  // The reminder comes right after the question, the last thing the model reads.
  const lastContent = (p: typeof plan) => {
    const content = p.params.messages.at(-1)!.content as Array<{ type: string; text?: string }>;
    return content.at(-1)!;
  };
  assert.equal(lastContent(plan).text, CONVERSATION_TURN_NOTE);
  // An ordinary question: no conversation line, no reminder, the usual model.
  const plain = planRequest({ question: "Why?" }, lib, config, []);
  assert.ok(!(plain.params.system as Array<{ text: string }>).at(-1)!.text.includes(CONVERSATION_SETTING));
  assert.equal(lastContent(plain).text, "Why?");
  assert.equal(plain.params.model, "big");
  // The core premises say how to talk like a person.
  assert.ok(CORE_PREMISES.includes("## Talking like a person"));
});

test("only a short follow-up with nothing new skips the lookup step", () => {
  const refs = ["Berakhot 2a:1"];
  assert.equal(quickFollowUp({ question: "Why two of them?", conversation: true, refs }), true);
  assert.equal(quickFollowUp({ question: "And what does Tosafot say?", conversation: true, refs }), true);
  // New books, halacha, the calendar, a long question, or pictures: the lookup step looks.
  assert.equal(quickFollowUp({ question: "What does the Rambam say?", conversation: true, refs }), false);
  assert.equal(quickFollowUp({ question: "Can I do this on Shabbat?", conversation: true, refs }), false);
  assert.equal(quickFollowUp({ question: "When is candle lighting tonight?", conversation: true, refs }), false);
  assert.equal(quickFollowUp({ question: "Where else is this discussed?", conversation: true, refs }), false);
  assert.equal(quickFollowUp({ question: "What do the Rishonim say?", conversation: true, refs }), false);
  assert.equal(quickFollowUp({ question: "why ".repeat(30), conversation: true, refs }), false);
  assert.equal(quickFollowUp({ question: "Why?", conversation: true, refs, pictures: 1 }), false);
  assert.equal(quickFollowUp({ question: "Why?", conversation: false, refs }), false);
  assert.equal(quickFollowUp({ question: "Why?", conversation: true, refs: [] }), false);
});

test("a quick follow-up opens the sources before and searches its words, with no model call", async () => {
  const gemara = P("Berakhot 2a:1", "מאימתי קורין את שמע", "From when do we recite the Shema?");
  const rashi = P("Rashi on Berakhot 2a:1:1", "משעה שהכהנים נכנסים");
  const looked: string[][] = [];
  const store = {
    async lookup(refs: string[]) {
      looked.push(refs);
      return refs.includes(gemara.ref) ? [gemara] : [];
    },
    async search() {
      return [];
    },
    async linked(refs: string[]) {
      return refs.includes(gemara.ref) ? [rashi] : [];
    },
  } as unknown as TestingStore;
  const found = await retrieveFollowUp("Why the evening?", store, { refs: [gemara.ref], anchors: [gemara.ref] });
  assert.deepEqual(found.documents.map((p) => p.ref), [gemara.ref, rashi.ref]);
  assert.equal(found.plan.quick, true);
  assert.equal(found.timings?.plan, 0);
  assert.deepEqual(looked, [[gemara.ref]]);

  // Through ask(): the planner is never called, and the answer says it was quick.
  let calls = 0;
  const client: ModelClient = {
    async create(params, onText) {
      calls++;
      assert.equal(params.model, "claude-sonnet-5-5");
      onText?.("Because Rashi says so.");
      return {
        id: "m",
        type: "message",
        role: "assistant",
        model: params.model,
        content: [{ type: "text", text: "Because Rashi says so.", citations: null }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 1 },
      } as never;
    },
  };
  const lib = loadLibrary("development");
  const result = await ask(
    {
      question: "Why the evening?",
      talking: true,
      history: [
        { role: "user", text: "When do we say Shema at night?" },
        { role: "assistant", text: "From when the kohanim go in." },
      ],
      lastRefs: [gemara.ref],
    },
    client,
    { ...lib, mode: "testing" },
    store,
  );
  assert.equal(calls, 1);
  assert.equal(result.status, "answered");
  assert.equal(result.quick, true);
  assert.ok(result.timings && result.timings.total >= 0 && result.timings.firstWords !== undefined);
});

test("cutting in: the person's own words count, RabbAI's voice coming back doesn't", () => {
  const saying = "Rashi explains that the kohanim go in to eat their teruma at nightfall";
  assert.equal(isCuttingIn("the kohanim go in to eat", saying), false);
  assert.equal(isCuttingIn("wait why nightfall", saying), true);
  assert.equal(isCuttingIn("hold on a second", saying), true);
  assert.equal(isCuttingIn("but what about the morning", saying), true);
  assert.equal(isCuttingIn("eat", saying), false);
  // The turn starts with what they said, and remembers what they last heard.
  const speaking: TalkState = { ...TALK_OFF, phase: "speaking" };
  const next = talkReducer(speaking, { type: "cutIn", heard: `First sentence. ${saying}.`, said: "wait why", now: 5 });
  assert.equal(next.phase, "listening");
  assert.equal(next.settled, "wait why");
  assert.ok(next.cutIn.endsWith("nightfall."));
  // Cutting in only happens while RabbAI speaks.
  assert.equal(talkReducer({ ...TALK_OFF, phase: "listening" }, { type: "cutIn", heard: "x", said: "y", now: 1 }).phase, "listening");
  assert.ok(lastHeard("A. ".repeat(400)).length <= 300);
});

test("an answer is read a sentence at a time while it is written", () => {
  const text = "Right. That's exactly what bothers Tosafot here. Look at the verse: it says ";
  const first = nextLivePiece(text, 0, { first: true, finished: false, idle: true })!;
  assert.equal(first.piece, "Right. That's exactly what bothers Tosafot here.");
  // While the voice still has something to read, a short sentence waits for more.
  assert.equal(nextLivePiece(text, first.end, { first: false, finished: false, idle: false }), null);
  // When the voice is about to run out, whatever whole sentences are ready go.
  assert.equal(nextLivePiece(text, first.end, { first: false, finished: false, idle: true })!.piece, "Look at the verse:");
  // A finished answer is read to the end.
  assert.equal(nextLivePiece(text, first.end, { first: false, finished: true, idle: true })!.piece, "Look at the verse: it says");
  assert.equal(nextLivePiece("Hmm", 0, { first: true, finished: false, idle: true }), null);
});

test("warming the caches uses the same instructions, model and effort as the real questions", () => {
  const { answer, plan } = warmRequests("talk", "Genesis: Genesis");
  assert.equal(answer.max_tokens, 0);
  assert.equal(answer.model, modelFor({ talking: true }).model);
  assert.equal(answer.system[0].text, CORE_PREMISES);
  assert.equal(answer.system[1].cache_control?.ttl, "1h");
  assert.ok(plan && plan.max_tokens === 0);
  // Nothing about a person: only the word "warmup".
  assert.equal(answer.messages[0].content, "warmup");
});

test("the lookup step's plan is read even with a slip around it", async () => {
  const { parseLookupPlan } = await import("../lib/engine/lookup");
  // A word in braces after the plan.
  assert.deepEqual(parseLookupPlan('{"refs": ["Genesis 18:1"], "english": []} I left out {nothing}').refs, ["Genesis 18:1"]);
  // A comma before a closing bracket, and curly quotes.
  assert.deepEqual(parseLookupPlan('{"refs": ["Genesis 18:1",], "english": ["hospitality"],}').english, ["hospitality"]);
  assert.deepEqual(parseLookupPlan("{“refs”: [“Genesis 18:1”]}").refs, ["Genesis 18:1"]);
  // In a code block, with a sentence before it.
  assert.deepEqual(parseLookupPlan('Here is the plan:\n```json\n{"refs": ["Rashi on Genesis 18:1:1"], "topic": "Vayera"}\n```').topic, "Vayera");
  // Gershayim inside Hebrew words still work.
  assert.deepEqual(parseLookupPlan('{"refs": [], "hebrew": ["רש"י"]}').hebrew, ["רש״י"]);
});
