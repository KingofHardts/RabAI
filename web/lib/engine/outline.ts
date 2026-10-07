import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CORE_PREMISES } from "./core-premises.generated";
import { engineConfig, type ModelClient } from "./answer";
import { pieceWords } from "../library/daf";
import { readOutline, type OutlineLine, type OutlineLineInput } from "./outline-phrases";

/*
 * RabAI's outline of an amud: what each phrase of the Gemara does (asks, answers, proves,
 * challenges...), so the page can color the flow of the argument. It is RabAI's reading of the
 * text, not a source, and the app labels it as not yet reviewed by the rabbinic board.
 *
 * The model names each phrase by the numbers of the library's own words, and points at the
 * library's English for it; outline-phrases.ts checks both before anything is shown.
 *
 * It runs only when the person asks to see the flow, and the app keeps it on the device so the
 * same page is never outlined twice.
 */

export * from "./outline-phrases";

const OUTLINE_INSTRUCTIONS = `## Marking the flow of the Gemara

The person is learning one amud (page side) of the Gemara and asked to see the flow of the
argument, the way a teacher marks it in colors. You are given each line with its reference, its
words numbered from 0, and the library's English translation of the line.

Split each line into phrases: the steps of the argument, from a few words to a sentence (a
question, the answer to it, a verse brought as proof, the challenge to a ruling). A short line
may be a single phrase. Give each phrase by the numbers of its first and last words. A line's
phrases go in order, do not overlap, and together hold every word of the line. Never copy or
retype the Aramaic: refer to it only by the word numbers.

For each phrase, choose one kind:
- mishnah: the words of the Mishnah itself.
- question: a question is asked (for example מאי, היכי, מנא הני מילי, מאי טעמא).
- answer: an answer to a question just asked.
- statement: a teaching or ruling stated, or the Gemara explaining what something means.
- proof: a source brought as support (a verse, a baraita: דתניא, תא שמע, שנאמר).
- challenge: an objection to what was said (איתיביה, מיתיבי, והא, ורמינהו, קשיא).
- resolution: a challenge resolved (לא קשיא, הכא... הכא, תרגמה).
- story: an account of something that happened (מעשה, ההוא).

For each phrase also write:
- "note": at most 12 words saying what the phrase does, in plain English, for a beginner.
- "en": the words of the line's English translation that translate this phrase, copied exactly
  as they are written there (the same letters, spelling and punctuation, curly quotation marks
  and apostrophes included), as one unbroken stretch. Copy only; never rephrase or add words.
  If no stretch of the English matches the phrase, write "".

For each line also give one kind and a note for the line as a whole.

Use only the text given; do not bring in other sources. If a phrase could be read two ways,
choose the reading the Gemara's own flow supports.

Reply with one JSON object for each line, each on its own line, in page order, and nothing else:
{"ref": "...", "kind": "...", "note": "...", "phrases": [{"first": 0, "last": 4, "kind": "...", "note": "...", "en": "..."}]}
`;

/** A line's words numbered from 0, as the model refers to them. */
export function numberedWords(he: string): string {
  return pieceWords(he)
    .map((w, i) => `(${i}) ${w}`)
    .join(" ");
}

export function outlineRequest(lines: readonly OutlineLineInput[], model = engineConfig().model): MessageCreateParamsNonStreaming {
  const body = lines.map((l) => `[${l.ref}]\nWords: ${numberedWords(l.he)}\nEnglish: ${l.en || "(none)"}`).join("\n\n");
  return {
    model,
    // A phrase-by-phrase outline of a long amud is long: room for it, and for thinking first.
    max_tokens: 24000,
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

export async function outlineDaf(lines: OutlineLineInput[], client: ModelClient): Promise<{ lines: OutlineLine[]; model?: string }> {
  const message = await client.create(outlineRequest(lines));
  const text = message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { lines: readOutline(text, lines), model: message.model };
}
