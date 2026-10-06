import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CORE_PREMISES } from "./core-premises.generated";
import { mapAnswer, answerText, type AnswerBlock, type AnswerSource } from "./citations";
import { checkSafety, safetyInstruction, safetyNotice, type SafetyNotice } from "./safety";
import { getWork, loadLibrary, search, type Library, type LibraryMode, type Passage } from "../library";
import { connectionsFor } from "../library/language";
import { testingStore, type TestingStore } from "../library/testing";
import { retrieveFromTesting } from "./lookup";

// ---------------------------------------------------------------------------
// Inputs and outputs

export type LineAction = "explain" | "words" | "commentaries" | "halacha" | "check" | "word";
export const LINE_ACTIONS: readonly LineAction[] = ["explain", "words", "commentaries", "halacha", "check", "word"];

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

export interface AskInput {
  question: string;
  history?: Turn[];
  /** The line the person is asking about, from the reader. */
  focusRef?: string;
  action?: LineAction;
  /** For the "word" action: the word the person tapped, as written. */
  word?: string;
  /** "Growing closer to HaShem" help. Off unless the person turned it on. */
  growth?: boolean;
}

export interface AskResult {
  status: "answered" | "refused" | "no_key" | "error";
  blocks: AnswerBlock[];
  sources: AnswerSource[];
  /** Every passage that was retrieved and offered to the model. */
  retrieved: string[];
  safety: SafetyNotice | null;
  libraryMode: LibraryMode;
  /** Citations removed by the checker. */
  droppedCitations: number;
  /** The model that wrote the answer, when known. */
  model?: string;
  /** A short message for the person when there is no answer. */
  notice?: string;
  /** In the testing library: the places the lookup step chose to open. */
  lookedUp?: string[];
}

/** The one call the engine makes. Injected so tests never touch the network. */
export interface ModelClient {
  create(params: MessageCreateParamsNonStreaming): Promise<BetaMessage>;
}

export const DEFAULT_MODEL = "claude-opus-5-5";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

export function engineConfig() {
  const effort = (process.env.RABAI_EFFORT ?? "high") as Effort;
  return {
    model: process.env.RABAI_MODEL || DEFAULT_MODEL,
    effort: EFFORTS.includes(effort) ? effort : ("high" as Effort),
    maxTokens: 16000,
  };
}

/** The real client: streams under the hood so long, thoughtful answers do not time out. */
export function anthropicClient(apiKey = process.env.ANTHROPIC_API_KEY): ModelClient | null {
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return {
    create: (params) => client.beta.messages.stream(params).finalMessage(),
  };
}

// ---------------------------------------------------------------------------
// The app's instructions, added after the core premises

const APP_INSTRUCTIONS = `## How this app works

You are answering inside the RabAI app. The person sees your answer in a conversation, and
every source you cite becomes a button that opens the text itself in a reader beside it.

Sources:
- The passages retrieved for this question are attached to the person's message as documents.
  Each document's title is its reference, for example "Rashi on Bereishit 1:1".
- Cite a document whenever you rely on it. The app turns each citation into a button. Citing
  is how the person sees that every point rests on a real source, so cite generously and
  precisely.
- These documents are the only library you have for this answer. If they do not cover the
  question, say so plainly and kindly, answer only what you can stand behind, and suggest
  asking a rav or a teacher. Do not name or quote a source you were not given, and never
  quote a translation that is not in a document.
- Some documents are marked as development texts. Quote and cite them normally; the app labels
  them for the person.
- Documents from the private testing library are published Orthodox editions that the rabbinic
  board has not yet approved. Quote and cite them normally; the app labels them for the person.
  When a document has no English, translate the words you use yourself and say that the
  translation is yours.

Shape of an answer:
- Start with a short, warm, direct answer. Then the sources and the reasoning, step by step.
  End with one gentle invitation to keep learning, such as offering to open a text together
  or go deeper.
- Write in short paragraphs of plain prose. Do not use Markdown: no headings, bold, tables,
  or bullet symbols.
- Usually 120 to 350 words. Shorter for a simple question. Longer only when the person asks to
  go deeper.
- Hebrew words and short phrases are welcome; transliterate and translate them for someone
  who does not read Hebrew.

When the person asks about a specific line in the reader, the message says which line and what
they want: an explanation, a word-by-word translation, what the commentaries say, or where the
line is used in halacha. Keep that line at the center of your answer.

Learning to read:
- When the person asks about a single word, the app attaches every passage in the library where
  that word's root appears (or the word itself, if the root is not known), and the settings
  name them. Explain the word in its own line first: its parts and its root. Then show how the
  root connects the passages you were given, citing each one. These are the only connections
  you may name.
- When the person offers their own translation of a line, follow "Let them try first": begin
  with what they got right, then correct one or two things, gently, with the reason. Ask
  whether they would like to try again or see the whole line.`;

const ACTION_PROMPTS: Record<Exclude<LineAction, "check" | "word">, (ref: string) => string> = {
  explain: (ref) => `Please explain ${ref} to me.`,
  words: (ref) =>
    `Please go through ${ref} word by word. For each word or short phrase, give the Hebrew or Aramaic, a translation, and a short note where it helps. Put each word on its own line in the form: word — meaning — note.`,
  commentaries: (ref) => `What do the commentaries say about ${ref}?`,
  halacha: (ref) =>
    `Where is ${ref} used in halacha? If the sources I have here do not say, tell me honestly and tell me what I could ask my rav.`,
};

// ---------------------------------------------------------------------------
// Limits

export const LIMITS = {
  questionChars: 2000,
  wordChars: 40,
  historyTurns: 12,
  historyChars: 6000,
  passages: 10,
};

// ---------------------------------------------------------------------------
// The engine

export function documentText(passage: Passage): string {
  return [passage.he, passage.en].filter((t) => t.trim()).join("\n\n");
}

function testingContext(passage: Passage): string {
  const s = passage.source!;
  const parts = [
    `Work: ${s.workTitle} (${s.book}).`,
    / on /.test(s.book) ? "This is a commentary." : "",
    "From the private testing library: a published Orthodox edition, not yet approved by the rabbinic board.",
    s.heEdition ? `Original text: ${s.heEdition}.` : "",
    s.enEdition ? `English: ${s.enEdition}.` : "There is no English translation of this passage in the library.",
    s.heEdition && s.enEdition ? "The first part is the original text; the second is the English translation." : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function documentContext(passage: Passage, lib: Library): string {
  if (passage.source?.library === "testing") return testingContext(passage);
  const work = getWork(lib, passage.work);
  const parts = [
    `Work: ${work?.title ?? passage.work}${work?.author ? ` (${work.author})` : ""}.`,
    passage.on ? `This is a commentary on ${passage.on}.` : "",
    `The first part is the original text; the second is an English translation.`,
    work ? `Edition: ${work.edition}` : "",
    work?.translation.status === "development"
      ? "The English is a development placeholder by the RabAI team, not an approved translation."
      : work?.translation.status === "rabai"
        ? "The English is RabAI's own translation."
        : work
          ? `Translation: ${work.translation.by}.`
          : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function buildQuestion(input: AskInput): string {
  const q = input.question.trim();
  if (input.action === "check" && input.focusRef) {
    return `Here is my own translation of ${input.focusRef}:\n\n"${q}"\n\nCould you check it for me?`;
  }
  if (input.action === "word" && input.focusRef && input.word) {
    const ask = `What does the word ${input.word} mean in ${input.focusRef}? Show me how it is built, and where else its root comes up in the texts.`;
    return q ? `${ask}\n\n${q}` : ask;
  }
  if (input.action && input.action !== "check" && input.action !== "word" && input.focusRef) {
    const ask = ACTION_PROMPTS[input.action](input.focusRef);
    return q ? `${ask}\n\n${q}` : ask;
  }
  if (input.focusRef && q) return `About ${input.focusRef}: ${q}`;
  return q;
}

function wordStudyNote(
  word: string,
  focusRef: string | undefined,
  rootText: string,
  related: Passage[],
  documents: Passage[],
): string {
  const sent = new Set(documents.map((d) => d.ref));
  const refs = related.map((p) => p.ref).filter((r) => sent.has(r) && r !== focusRef);
  const where = focusRef ? ` in ${focusRef}` : "";
  return refs.length
    ? `Word study: the person asked about ${word}${where}. Elsewhere in the library, ${rootText} appears in: ${refs.join("; ")}. Those passages are attached.`
    : `Word study: the person asked about ${word}${where}. The library has no other passage with ${rootText}; do not name other places it appears.`;
}

export interface RequestPlan {
  params: MessageCreateParamsNonStreaming;
  documents: Passage[];
  documentTexts: string[];
}

/** What to search with: the question and the last thing the person said before it, so a
 * follow-up like "and what does the Ramban say?" still finds the right text. */
export function searchQuery(input: AskInput): string {
  const history = (input.history ?? []).slice(-LIMITS.historyTurns);
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.text ?? "";
  return `${buildQuestion(input)}\n${lastUser}`.trim();
}

/**
 * @param retrieved Passages already found in the testing library. Without them, the in-memory
 *   library is searched.
 */
export function planRequest(input: AskInput, lib: Library, config = engineConfig(), retrieved?: Passage[]): RequestPlan {
  const question = buildQuestion(input);
  const history = (input.history ?? []).slice(-LIMITS.historyTurns);
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.text ?? "";
  const query = searchQuery(input);
  // For a word question, every place its root appears in the library comes along, so RabAI can
  // show real connections and cite them.
  const connections = !retrieved && input.action === "word" && input.word ? connectionsFor(lib, input.word) : null;
  const related = connections?.passages ?? [];
  const documents =
    retrieved ??
    search(lib, query, {
      focusRef: input.focusRef,
      includeRefs: related.map((p) => p.ref),
      limit: LIMITS.passages,
    });
  const documentTexts = documents.map(documentText);

  const safety = checkSafety(`${input.question}\n${lastUser}`);
  const settings = [
    `Growth help: ${input.growth ? "on" : "off"}.`,
    lib.mode === "development"
      ? "Library: development. The texts are the team's working copies, for building and testing."
      : lib.mode === "testing"
        ? "Library: the private testing library. Published Orthodox editions, not yet approved by the rabbinic board."
        : "Library: approved editions.",
    documents.length === 0 ? "No passages were found in the library for this question." : "",
    connections && input.word ? wordStudyNote(input.word, input.focusRef, connections.label, related, documents) : "",
    retrieved && input.action === "word" && input.word
      ? `Word study: the person asked about ${input.word}${input.focusRef ? ` in ${input.focusRef}` : ""}. Other passages that contain this exact word were searched for and are attached if found; the library has no root index yet, so do not claim other places its root appears.`
      : "",
    safety.concern ? safetyInstruction(safety.concern) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: MessageCreateParamsNonStreaming["messages"] = [];
  for (const turn of history) {
    const text = turn.text.slice(0, LIMITS.historyChars).trim();
    if (!text) continue;
    const prev = messages[messages.length - 1];
    // The API needs alternating roles; join any repeats.
    if (prev && prev.role === turn.role && typeof prev.content === "string") {
      prev.content = `${prev.content}\n\n${text}`;
    } else {
      messages.push({ role: turn.role, content: text });
    }
  }
  if (messages[0]?.role === "assistant") messages.shift();
  if (messages[messages.length - 1]?.role === "user") messages.pop();

  messages.push({
    role: "user",
    content: [
      ...documents.map((p, i) => ({
        type: "document" as const,
        source: { type: "text" as const, media_type: "text/plain" as const, data: documentTexts[i] },
        title: p.ref,
        context: documentContext(p, lib),
        citations: { enabled: true },
      })),
      { type: "text" as const, text: question },
    ],
  });

  const params: MessageCreateParamsNonStreaming = {
    model: config.model,
    max_tokens: config.maxTokens,
    thinking: { type: "adaptive" },
    output_config: { effort: config.effort },
    // If the model declines, the API re-runs the request on Anthropic's recommended fallback.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: CORE_PREMISES },
      { type: "text", text: APP_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
      { type: "text", text: settings },
    ],
    messages,
  };

  return { params, documents, documentTexts };
}

export async function ask(
  input: AskInput,
  client: ModelClient | null,
  lib = loadLibrary(),
  store: TestingStore | null = lib.mode === "testing" ? testingStore() : null,
): Promise<AskResult> {
  const safety = checkSafety(`${input.question}\n${(input.history ?? []).filter((t) => t.role === "user").slice(-1)[0]?.text ?? ""}`);
  const notice = safety.concern ? safetyNotice(safety.concern) : null;

  let retrieved: Passage[] | undefined;
  let lookedUp: string[] | undefined;
  if (lib.mode === "testing") {
    if (!store) {
      return {
        status: "error",
        blocks: [],
        sources: [],
        retrieved: [],
        safety: notice,
        libraryMode: lib.mode,
        droppedCitations: 0,
        notice: "RabAI can't reach its library right now. Please try again in a moment.",
      };
    }
    try {
      const found = await retrieveFromTesting(searchQuery(input), store, client, {
        focusRef: input.focusRef,
        extraPhrases: input.action === "word" && input.word ? [input.word] : [],
      });
      retrieved = found.documents;
      lookedUp = found.plan.refs;
    } catch (err) {
      console.error("[rabai] library lookup failed:", err instanceof Error ? err.message : err);
      return {
        status: "error",
        blocks: [],
        sources: [],
        retrieved: [],
        safety: notice,
        libraryMode: lib.mode,
        droppedCitations: 0,
        notice: "RabAI couldn't search its library just now. Please try again in a moment.",
      };
    }
  }

  const plan = planRequest(input, lib, engineConfig(), retrieved);
  const base = {
    blocks: [] as AnswerBlock[],
    sources: [] as AnswerSource[],
    retrieved: plan.documents.map((p) => p.ref),
    safety: notice,
    libraryMode: lib.mode,
    droppedCitations: 0,
    ...(lookedUp ? { lookedUp } : {}),
  };

  if (!client) {
    return {
      ...base,
      status: "no_key",
      notice:
        "RabAI isn't connected to its model yet, so it can't answer. These are the passages it found for your question. (Add ANTHROPIC_API_KEY to the server's settings.)",
    };
  }

  let message: BetaMessage;
  try {
    message = await client.create(plan.params);
  } catch (err) {
    console.error("[rabai] model call failed:", err instanceof Error ? err.message : err);
    return {
      ...base,
      status: "error",
      notice: "Something went wrong reaching RabAI. Please try again in a moment.",
    };
  }

  if (message.stop_reason === "refusal") {
    return {
      ...base,
      status: "refused",
      model: message.model,
      notice:
        "I'm not able to help with that one. If something is weighing on you, please speak with your rav or someone you trust.",
    };
  }

  const mapped = mapAnswer(message.content, plan.documents, plan.documentTexts);
  if (mapped.dropped > 0) {
    console.warn(`[rabai] dropped ${mapped.dropped} unverifiable citation(s)`);
  }
  if (!answerText(mapped).trim()) {
    return { ...base, status: "error", model: message.model, notice: "RabAI didn't finish its answer. Please try asking again." };
  }
  return {
    ...base,
    status: "answered",
    blocks: mapped.blocks,
    sources: mapped.sources,
    droppedCitations: mapped.dropped,
    model: message.model,
  };
}
