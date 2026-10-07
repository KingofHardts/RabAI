import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CORE_PREMISES } from "./core-premises.generated";
import { engineConfig, type ModelClient } from "./answer";
import { MIN_COVERAGE, alignGlosses, glossCoverage, glossParts, passageWords, readGlossReply, type GlossRow, type Translation } from "./gloss";

/*
 * RabAI's own translation of a passage the library has no English for (much of Rashi and
 * Tosafot), and a word-by-word translation of any passage. It is RabAI's reading, not a source:
 * the app labels it as not from the library and not yet reviewed by the rabbinic board. It runs
 * only when the person taps "Translate", and the app keeps it on the device.
 */

export interface TranslateInput {
  ref: string;
  /** The passage's Hebrew or Aramaic, without markup. */
  he: string;
  /** The library's English for it, or "" when there is none. */
  en: string;
  /** The line a comment explains, or the line before, to translate in context. */
  context: Array<{ ref: string; he: string; en: string }>;
}

const TRANSLATE_INSTRUCTIONS = `## Translating a passage

The person is learning and tapped "Translate" on one passage. You are given its reference and its
Hebrew or Aramaic, and sometimes the passage it comments on or the line before it, for context
only. Translate faithfully, the way a teacher in a yeshiva explains a text to a beginner:
- Follow the text's own meaning. For the Gemara, read it as Rashi explains it. For a commentary
  (Rashi, Tosafot), say what the commentator means about the line he is explaining.
- Add nothing that is not in the text: no other opinions, sources or teachings.
- Write out every short form (abbreviation) in full.
- Give people their usual names (Rabbi Yehoshua ben Levi, Rava, Abaye, Rabbeinu Tam).

Reply in exactly the form you are asked for, with no other words.

The general translation goes after a line "GENERAL:". Write it in clear, plain English, and put
words you add for clarity in [square brackets], so the reader can tell them from the text's own.

The word-by-word translation goes after a line "WORDS:", one line for each word, in the text's
order, covering every word of the part you are given, without skipping any:
word | its meaning here, in a few English words | the full form, only for a short form
Write the word with its letters as the text has them. Letters in front of a word (ו, ה, ב, כ, ל,
מ, ש, ד) stay with it, and its meaning includes them ("and the...", "that..."). When a few words
together form one expression (for example תא שמע, "come and hear"), you may give them on one line.
`;

/** Words in one word-by-word request; longer passages are split and sent at the same time. */
const PART_SIZE = 70;
/** At most this many parts: a passage longer than about 700 words gets English for its start. */
const MAX_PARTS = 10;

export function translateRequest(
  input: TranslateInput,
  task: { general: boolean; part?: string },
  model = engineConfig().model,
): MessageCreateParamsNonStreaming {
  const context = input.context
    .filter((c) => c.he.trim())
    .map((c) => `For context only, ${c.ref}:\n${c.he}${c.en ? `\n${c.en}` : ""}`)
    .join("\n\n");
  const asks: string[] = [];
  if (task.general) asks.push(`Write the general translation of the whole passage, after "GENERAL:".`);
  if (task.part !== undefined) {
    asks.push(
      task.part === input.he
        ? `Write the word-by-word translation of the whole passage, after "WORDS:".`
        : `Write the word-by-word translation of only this part of the passage, from its first word to its last, after "WORDS:":\n${task.part}`,
    );
  }
  const body = [`The passage, ${input.ref}:\n${input.he}`, context, asks.join("\n\n")].filter(Boolean).join("\n\n");
  return {
    model,
    max_tokens: 12000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: CORE_PREMISES },
      { type: "text", text: TRANSLATE_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: body }],
  };
}

const replyText = (content: Array<{ type: string; text?: string }>) => content.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");

/**
 * Translates the passage: a general translation when the library has no English, and word by word.
 * Throws when nothing usable came back.
 */
export async function translatePassage(input: TranslateInput, client: ModelClient): Promise<Translation> {
  const words = passageWords(input.he);
  const parts = glossParts(words, PART_SIZE).slice(0, MAX_PARTS);
  const needGeneral = !input.en.trim();

  // A short passage takes one request; a long one sends its parts at the same time, with the
  // general translation (when needed) as a request of its own.
  const oneRequest = parts.length <= 1;
  const jobs = oneRequest
    ? [{ general: needGeneral, range: parts[0] ?? ([0, words.length] as [number, number]), whole: true }]
    : [
        ...(needGeneral ? [{ general: true, range: null, whole: false }] : []),
        ...parts.map((range) => ({ general: false, range, whole: false })),
      ];
  const settled = await Promise.allSettled(
    jobs.map(async (job) => {
      const part = job.range ? (job.whole ? input.he : words.slice(job.range[0], job.range[1]).join(" ")) : undefined;
      const message = await client.create(translateRequest(input, { general: job.general, part }));
      return { job, model: message.model, ...readGlossReply(replyText(message.content)) };
    }),
  );

  let general: string | null = null;
  let model: string | undefined;
  const rows: GlossRow[] = [];
  let lastEnd = 0;
  for (const s of settled) {
    if (s.status !== "fulfilled") {
      console.error("[rabai] a translation request failed:", s.reason instanceof Error ? s.reason.message : s.reason);
      continue;
    }
    const { job } = s.value;
    model ??= s.value.model;
    if (job.general && s.value.general) general = s.value.general;
    if (!job.range) continue;
    // Words between the parts that came back (a part whose request failed) have no English.
    if (job.range[0] > lastEnd) alignGlosses(words, [], lastEnd, job.range[0], rows);
    alignGlosses(words, s.value.items, job.range[0], job.range[1], rows);
    lastEnd = job.range[1];
  }
  if (lastEnd < words.length) alignGlosses(words, [], lastEnd, words.length, rows);

  const wordList = glossCoverage(words, rows) >= MIN_COVERAGE ? rows : null;
  if (needGeneral && !general) throw new Error("No general translation came back.");
  if (!general && !wordList) throw new Error("The word-by-word translation didn't match the text.");
  return { ref: input.ref, general, words: wordList, ...(model ? { model } : {}) };
}
