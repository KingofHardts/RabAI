import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CORE_PREMISES } from "./core-premises.generated";
import { mapAnswer, answerText, type AnswerBlock, type AnswerSource } from "./citations";
import { checkSafety, safetyInstruction, safetyNotice, type SafetyNotice } from "./safety";
import { getWork, loadLibrary, search, type Library, type LibraryMode, type Passage } from "../library";

// ---------------------------------------------------------------------------
// Inputs and outputs

export type LineAction = "explain" | "words" | "commentaries" | "halacha";

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
line is used in halacha. Keep that line at the center of your answer.`;

const ACTION_PROMPTS: Record<LineAction, (ref: string) => string> = {
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
  historyTurns: 12,
  historyChars: 6000,
  passages: 10,
};

// ---------------------------------------------------------------------------
// The engine

export function documentText(passage: Passage): string {
  return `${passage.he}\n\n${passage.en}`;
}

function documentContext(passage: Passage, lib: Library): string {
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
  if (input.action && input.focusRef) {
    const ask = ACTION_PROMPTS[input.action](input.focusRef);
    return q ? `${ask}\n\n${q}` : ask;
  }
  if (input.focusRef && q) return `About ${input.focusRef}: ${q}`;
  return q;
}

export interface RequestPlan {
  params: MessageCreateParamsNonStreaming;
  documents: Passage[];
  documentTexts: string[];
}

export function planRequest(input: AskInput, lib: Library, config = engineConfig()): RequestPlan {
  const question = buildQuestion(input);
  const history = (input.history ?? []).slice(-LIMITS.historyTurns);

  // Search with the question and the last thing the person said before it, so a follow-up
  // like "and what does the Ramban say?" still finds the right text.
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.text ?? "";
  const query = `${question}\n${lastUser}`;
  const documents = search(lib, query, { focusRef: input.focusRef, limit: LIMITS.passages });
  const documentTexts = documents.map(documentText);

  const safety = checkSafety(`${input.question}\n${lastUser}`);
  const settings = [
    `Growth help: ${input.growth ? "on" : "off"}.`,
    lib.mode === "development"
      ? "Library: development. The texts are the team's working copies, for building and testing."
      : "Library: approved editions.",
    documents.length === 0 ? "No passages were found in the library for this question." : "",
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

export async function ask(input: AskInput, client: ModelClient | null, lib = loadLibrary()): Promise<AskResult> {
  const safety = checkSafety(`${input.question}\n${(input.history ?? []).filter((t) => t.role === "user").slice(-1)[0]?.text ?? ""}`);
  const notice = safety.concern ? safetyNotice(safety.concern) : null;
  const plan = planRequest(input, lib);
  const base = {
    blocks: [] as AnswerBlock[],
    sources: [] as AnswerSource[],
    retrieved: plan.documents.map((p) => p.ref),
    safety: notice,
    libraryMode: lib.mode,
    droppedCitations: 0,
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
