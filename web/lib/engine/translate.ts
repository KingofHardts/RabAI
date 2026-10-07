import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CORE_PREMISES } from "./core-premises.generated";
import { engineConfig, type ModelClient } from "./answer";
import {
  MIN_COVERAGE,
  alignGlosses,
  checkReadings,
  glossCoverage,
  glossParts,
  passageWords,
  readGlossReply,
  type GlossRow,
  type Reading,
  type Translation,
  type TranslationBasis,
} from "./gloss";

/*
 * RabAI's own translations: a translation of a passage the library has no English for (much of
 * Rashi and Tosafot), and a word-by-word translation of any passage. They are made from the
 * library's own sources (the Orthodox English of the line a comment explains, the other
 * commentaries on it, and the dictionaries) and kept in RabAI's translation library
 * (lib/library/translations.ts), so each passage is translated once. They are RabAI's reading,
 * not a source: the app labels them as not from the library and not yet reviewed by the
 * rabbinic board.
 *
 * The same requests serve two callers: the app, when a person taps Translate (translatePassage),
 * and the batch job that fills the translation library ahead of time (scripts/translate-library.ts).
 */

/** What a source is to the passage being translated. */
export type SourceRole = "explains" | "before" | "commentary" | "dictionary";

/** A passage from the library given to RabAI to translate from. */
export interface TranslationSource {
  ref: string;
  role: SourceRole;
  he: string;
  en: string;
  /** What it is, for the person: "Berakhot 2a:1, with the library's English (William Davidson Edition)". */
  label: string;
}

export interface TranslateInput {
  ref: string;
  /** The passage's Hebrew or Aramaic, without markup. */
  he: string;
  /** The library's English for it, or "" when there is none. */
  en: string;
  /** Sources from the library to translate from (see gatherSources in translate-sources.ts). */
  sources: TranslationSource[];
}

/** What to make: the general translation (only when the library has no English) and word by word. */
export interface TranslateWant {
  general: boolean;
  words: boolean;
}

const TRANSLATE_INSTRUCTIONS = `## Translating a passage

You are adding to RabAI's library of translations: translations of passages the library has no
English for, and word-by-word translations, made once and kept so people can learn from them.
You are given the passage's reference and its Hebrew or Aramaic, and sources from the library to
translate from:
- The line it explains (for a commentary), or the line before it, often with the library's
  English. That English is by Orthodox translators: follow its reading of the line.
- Other commentaries on the same line.
- Dictionary entries for its words. Jastrow is used only for what words mean.

Translate faithfully, the way a teacher in a yeshiva explains a text to a beginner:
- Follow the text's own meaning. For the Gemara, read it as Rashi explains it. For a commentary
  (Rashi, Tosafot), say what the commentator means about the line he is explaining.
- Base the translation on the sources you are given: the library's English of the line it
  explains, and the dictionaries for hard words.
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

Other readings go after a line "READINGS:", when you are asked for them. List a reading only
where one of the commentaries or dictionary entries you were given reads part of the passage
differently from your translation. One line each, at most four:
words of the passage | the other reading, in a few plain words | the source's reference, exactly as given | a few of that source's own words that show it, copied exactly
Never name a source you were not given. When none of them reads it differently, write nothing
after "READINGS:".
`;

const ROLE_HEADINGS: Record<SourceRole, string> = {
  explains: "The line this passage explains",
  before: "The line before it",
  commentary: "Other commentaries on the same line",
  dictionary: "Dictionary entries for its words",
};

/** Words in one word-by-word request; longer passages are split and sent at the same time. */
export const PART_SIZE = 70;
/** At most this many parts: a passage longer than about 700 words gets English for its start. */
export const MAX_PARTS = 10;

export function translateRequest(
  input: TranslateInput,
  task: { general: boolean; readings: boolean; part?: string },
  model = engineConfig().model,
): MessageCreateParamsNonStreaming {
  const sources = (Object.keys(ROLE_HEADINGS) as SourceRole[])
    .map((role) => {
      const of = input.sources.filter((s) => s.role === role && s.he.trim() + s.en.trim());
      if (!of.length) return "";
      return `${ROLE_HEADINGS[role]}:\n\n${of.map((s) => `[${s.ref}] ${s.label}\n${s.he}${s.en ? `\n${s.en}` : ""}`).join("\n\n")}`;
    })
    .filter(Boolean)
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
  if (task.readings) asks.push(`Then list other readings, after "READINGS:".`);
  const body = [
    `The passage, ${input.ref}:\n${input.he}`,
    input.en ? `The library's English for it:\n${input.en}` : "",
    sources ? `Sources from the library:\n\n${sources}` : "",
    asks.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
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

/** One request of a translation. */
export interface TranslationJob {
  /** Unique within the translation: "g" for the general translation, "p0", "p1"... for parts. */
  key: string;
  general: boolean;
  readings: boolean;
  /** The words of the passage this job translates word by word, or null. */
  range: [number, number] | null;
  params: MessageCreateParamsNonStreaming;
}

export interface TranslationPlan {
  input: TranslateInput;
  /** What is actually made: no general translation when the library has English. */
  want: TranslateWant;
  words: string[];
  jobs: TranslationJob[];
}

/**
 * The requests for one translation. A short passage takes one request; a long one sends its
 * word-by-word parts at the same time, with the general translation as a request of its own.
 * Other readings are asked for once, with the general translation or the first part.
 */
export function planTranslation(input: TranslateInput, want: TranslateWant, model = engineConfig().model): TranslationPlan {
  const words = passageWords(input.he);
  const made: TranslateWant = { general: want.general && !input.en.trim(), words: want.words };
  const parts = made.words ? glossParts(words, PART_SIZE).slice(0, MAX_PARTS) : [];
  const jobs: TranslationJob[] = [];
  const job = (key: string, general: boolean, readings: boolean, range: [number, number] | null, whole: boolean) => {
    const part = range ? (whole ? input.he : words.slice(range[0], range[1]).join(" ")) : undefined;
    jobs.push({ key, general, readings, range, params: translateRequest(input, { general, readings, part }, model) });
  };
  if (!made.general && !made.words) return { input, want: made, words, jobs };
  if (parts.length <= 1) {
    job(made.general ? "g" : "p0", made.general, true, made.words ? (parts[0] ?? [0, words.length]) : null, true);
  } else {
    if (made.general) job("g", true, true, null, false);
    parts.forEach((range, i) => job(`p${i}`, false, !made.general && i === 0, range, false));
  }
  return { input, want: made, words, jobs };
}

/** What came back for one job: the reply's text, or the error. */
export type JobResult = { text: string; model?: string } | { error: unknown };

/** The sources a translation was made from, as the person sees them. */
export function basisOf(sources: TranslationSource[]): TranslationBasis[] {
  return sources.map((s) => ({ ref: s.ref, label: s.label }));
}

/**
 * The translation from its jobs' replies. Throws when nothing usable came back: no general
 * translation when one was needed, or no general translation and a word list that didn't match.
 */
export function assembleTranslation(plan: TranslationPlan, results: Map<string, JobResult>): Translation {
  const { input, want, words } = plan;
  let general: string | null = null;
  let readings: Reading[] = [];
  let model: string | undefined;
  const rows: GlossRow[] = [];
  let lastEnd = 0;
  for (const job of plan.jobs) {
    const result = results.get(job.key);
    if (!result || "error" in result) {
      if (result && "error" in result) {
        console.error("[rabai] a translation request failed:", result.error instanceof Error ? result.error.message : result.error);
      }
      continue;
    }
    const reply = readGlossReply(result.text);
    model ??= result.model;
    if (job.general && reply.general) general = reply.general;
    if (job.readings) readings = checkReadings(reply.readings, input.sources);
    if (!job.range) continue;
    // Words between the parts that came back (a part whose request failed) have no English.
    if (job.range[0] > lastEnd) alignGlosses(words, [], lastEnd, job.range[0], rows);
    alignGlosses(words, reply.items, job.range[0], job.range[1], rows);
    lastEnd = job.range[1];
  }
  let wordList: GlossRow[] | null | undefined;
  if (want.words) {
    if (lastEnd < words.length) alignGlosses(words, [], lastEnd, words.length, rows);
    wordList = glossCoverage(words, rows) >= MIN_COVERAGE ? rows : null;
  }
  if (want.general && !general) throw new Error("No general translation came back.");
  if (!general && !wordList) throw new Error("The word-by-word translation didn't match the text.");
  return {
    ref: input.ref,
    general,
    ...(want.words ? { words: wordList } : {}),
    ...(readings.length ? { readings } : {}),
    ...(input.sources.length ? { basis: basisOf(input.sources) } : {}),
    ...(model ? { model } : {}),
  };
}

const replyText = (content: Array<{ type: string; text?: string }>) => content.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");

/** Translates a passage now, sending its requests at the same time. */
export async function translatePassage(input: TranslateInput, client: ModelClient, want: TranslateWant = { general: true, words: true }): Promise<Translation> {
  const plan = planTranslation(input, want);
  const settled = await Promise.allSettled(plan.jobs.map((job) => client.create(job.params)));
  const results = new Map<string, JobResult>();
  plan.jobs.forEach((job, i) => {
    const s = settled[i];
    results.set(job.key, s.status === "fulfilled" ? { text: replyText(s.value.content), model: s.value.model } : { error: s.reason });
  });
  return assembleTranslation(plan, results);
}

/**
 * A translation with what was made later added to what was kept: a word-by-word list made on
 * request joins a general translation made earlier, and so on. The newer part wins.
 */
export function mergeTranslations(kept: Translation | undefined, made: Translation): Translation {
  if (!kept) return made;
  return {
    ref: made.ref,
    general: made.general ?? kept.general,
    ...(made.words !== undefined ? { words: made.words } : kept.words !== undefined ? { words: kept.words } : {}),
    ...((made.readings ?? kept.readings) ? { readings: made.readings ?? kept.readings } : {}),
    ...((made.basis ?? kept.basis) ? { basis: made.basis ?? kept.basis } : {}),
    ...((made.model ?? kept.model) ? { model: made.model ?? kept.model } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// Several short passages in one request (the batch job). Rashi's comments are often a dozen
// words; sending each alone would repeat the instructions and the sources dozens of times. A run
// of comments on the same page goes in one request, each answered under its own reference.

/** At most this many Hebrew words in one request of several passages. */
export const GROUP_WORDS = { general: 450, words: 220 };

export function groupRequest(
  inputs: TranslateInput[],
  sources: TranslationSource[],
  want: TranslateWant,
  model = engineConfig().model,
): MessageCreateParamsNonStreaming {
  const sourceText = (Object.keys(ROLE_HEADINGS) as SourceRole[])
    .map((role) => {
      const of = sources.filter((s) => s.role === role && s.he.trim() + s.en.trim());
      if (!of.length) return "";
      return `${ROLE_HEADINGS[role]}:\n\n${of.map((s) => `[${s.ref}] ${s.label}\n${s.he}${s.en ? `\n${s.en}` : ""}`).join("\n\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");
  const passages = inputs.map((i) => `[${i.ref}]\n${i.he}${i.en ? `\nThe library's English for it:\n${i.en}` : ""}`).join("\n\n");
  const parts = [
    want.general ? `"GENERAL:" (only for a passage that has no English from the library)` : "",
    want.words ? `"WORDS:" with every word of the passage` : "",
    `"READINGS:"`,
  ].filter(Boolean);
  const body = [
    `Translate each of these ${inputs.length} passages:\n\n${passages}`,
    sourceText ? `Sources from the library, for all of them:\n\n${sourceText}` : "",
    `Answer each passage in order. Start each answer with a line holding only its reference in square brackets, exactly as given (for example [${inputs[0].ref}]), then write ${parts.join(", then ")}, as explained.`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    model,
    max_tokens: 32000,
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

/** A reply to a request of several passages, split by the reference line that starts each answer. */
export function splitGroupReply(text: string, refs: string[]): Map<string, string> {
  const known = new Set(refs);
  const out = new Map<string, string>();
  let current: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    if (current && !out.has(current)) out.set(current, lines.join("\n"));
  };
  for (const line of text.split("\n")) {
    const m = line.trim().match(/^\[(.+)\]$/);
    if (m && known.has(m[1].trim())) {
      flush();
      current = m[1].trim();
      lines = [];
    } else if (current) {
      lines.push(line);
    }
  }
  flush();
  return out;
}

/** One passage's translation from its part of a reply, checked the same way as a single request. */
export function assembleOne(input: TranslateInput, want: TranslateWant, text: string, sources: TranslationSource[], model?: string): Translation {
  const plan: TranslationPlan = {
    input: { ...input, sources },
    want: { general: want.general && !input.en.trim(), words: want.words },
    words: passageWords(input.he),
    jobs: [],
  };
  plan.jobs.push({
    key: "one",
    general: plan.want.general,
    readings: true,
    range: plan.want.words ? [0, plan.words.length] : null,
    params: {} as MessageCreateParamsNonStreaming,
  });
  return assembleTranslation(plan, new Map([["one", { text, model }]]));
}
