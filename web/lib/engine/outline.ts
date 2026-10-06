import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CORE_PREMISES } from "./core-premises.generated";
import { engineConfig, type ModelClient } from "./answer";

/*
 * RabAI's outline of an amud: what each line of the Gemara does (asks, answers, proves,
 * challenges...), so the page can color the flow of the argument. It is RabAI's reading of the
 * text, not a source, and the app labels it as not yet reviewed by the rabbinic board.
 *
 * It runs only when the person asks to see the flow, and the app keeps it on the device so the
 * same page is never outlined twice.
 */

export const OUTLINE_KINDS = ["mishnah", "question", "answer", "statement", "proof", "challenge", "resolution", "story"] as const;
export type OutlineKind = (typeof OUTLINE_KINDS)[number];

/** Plain-English names for the kinds, as the legend shows them. */
export const OUTLINE_LABELS: Record<OutlineKind, string> = {
  mishnah: "Mishnah",
  question: "Question",
  answer: "Answer",
  statement: "Statement",
  proof: "Proof",
  challenge: "Challenge",
  resolution: "Resolution",
  story: "Story",
};

export interface OutlineLine {
  ref: string;
  kind: OutlineKind;
  /** What the line does, in a few plain words. */
  note: string;
}

export interface OutlineLineInput {
  ref: string;
  he: string;
  en: string;
}

const OUTLINE_INSTRUCTIONS = `## Marking the flow of the Gemara

The person is learning one amud (page side) of the Gemara and asked to see the flow of the
argument, the way a teacher marks it in colors. You are given each line with its reference, its
Aramaic, and an English translation.

For each line, choose one kind:
- mishnah: the words of the Mishnah itself.
- question: a question is asked (for example מאי, היכי, מנא הני מילי, מאי טעמא).
- answer: an answer to a question just asked.
- statement: a teaching or ruling stated, or the Gemara explaining what something means.
- proof: a source brought as support (a verse, a baraita: דתניא, תא שמע, שנאמר).
- challenge: an objection to what was said (איתיביה, מיתיבי, והא, ורמינהו, קשיא).
- resolution: a challenge resolved (לא קשיא, הכא... הכא, תרגמה).
- story: an account of something that happened (מעשה, ההוא).

Also write a note of at most 12 words saying what the line does, in plain English, for a
beginner. Use only the text given; do not bring in other sources. If a line could be read two
ways, choose the reading the Gemara's own flow supports.

Reply with JSON only, in this form:
{"lines": [{"ref": "...", "kind": "...", "note": "..."}]}
`;

export function outlineRequest(lines: OutlineLineInput[], model = engineConfig().model): MessageCreateParamsNonStreaming {
  const body = lines.map((l) => `[${l.ref}]\n${l.he}\n${l.en}`).join("\n\n");
  return {
    model,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: CORE_PREMISES },
      { type: "text", text: OUTLINE_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: body }],
  };
}

/** The outline from the model's reply: only known lines, only known kinds, each line once. */
export function readOutline(text: string, refs: readonly string[]): OutlineLine[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  const raw = (json as { lines?: unknown })?.lines;
  if (!Array.isArray(raw)) return [];
  const known = new Set(refs);
  const out: OutlineLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { ref, kind, note } = item as Record<string, unknown>;
    if (typeof ref !== "string" || !known.has(ref) || out.some((o) => o.ref === ref)) continue;
    if (typeof kind !== "string" || !(OUTLINE_KINDS as readonly string[]).includes(kind)) continue;
    out.push({ ref, kind: kind as OutlineKind, note: typeof note === "string" ? note.replace(/\s+/g, " ").trim().slice(0, 140) : "" });
  }
  return out.sort((a, b) => refs.indexOf(a.ref) - refs.indexOf(b.ref));
}

export async function outlineDaf(lines: OutlineLineInput[], client: ModelClient): Promise<{ lines: OutlineLine[]; model?: string }> {
  const message = await client.create(outlineRequest(lines));
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { lines: readOutline(text, lines.map((l) => l.ref)), model: message.model };
}
