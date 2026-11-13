/*
 * Turns an answer into text a speech voice reads well: no links or marks, Hebrew with vowels in
 * English letters (by the person's pronunciation), and Hebrew words and names respelled
 * (lexicon.ts). Unpointed Hebrew is left as it is: a voice that reads Hebrew reads it, since a
 * guess at its vowels could be wrong. Used by the server voice and the device's voice alike.
 */

import { sayHebrew, type Pronunciation } from "../siddur/translit";
import { respell, type Accent, type MyWord, type RespellFor, type SayStyle } from "./lexicon";

const POINTS = /[ְ-ׇּׁׂ]/;
/** A run of Hebrew script, with the spaces and punctuation inside it. */
const HEBREW_RUN = /[֐-׿][֐-׿\s"'׳״,.:;-]*[֐-׿]|[֐-׿]/g;

const MARKS = "[\\u0591-\\u05C7]*";
/** The four-letter Name, pointed or not. */
const THE_NAME = new RegExp(`\u05D9${MARKS}\u05D4${MARKS}\u05D5${MARKS}\u05D4${MARKS}`, "g");
/** The Name written as ה׳ or ה'. */
const NAME_ABBREVIATION = /(^|[\s(\[])\u05D4[\u05F3'](?=[\s,.;:)\]]|$)/g;
/** Elohim and its forms: אֱלֹהִים, אֱלֹהֵינוּ, אֱלֹהֵי … */
const ELOHIM = new RegExp(`\u05D0(${MARKS})\u05DC(${MARKS})\u05D4(${MARKS})(?=\u05D9)`, "g");

/** The Name as it is read in prayer, written out with its own vowels: אֲדֹנָי. */
const ACC = "[\u0591-\u05AF\u05BD]*";
const ADONAI = new RegExp(`\u05D0${ACC}\u05B2${ACC}\u05D3${ACC}\u05B9${ACC}\u05E0${ACC}\u05B8${ACC}\u05D9(?![\u05B0-\u05BC\u05D0-\u05EA])`, "g");

/**
 * Outside prayer, the custom is not to say God's names as written: the Name is said "Hashem" and
 * Elohim "Elokim". Reading an answer aloud is learning, not prayer, so the voice does the same.
 */
export function namesForLearning(text: string, forHebrewVoice = false): string {
  const hashem = forHebrewVoice ? "\u05D4\u05E9\u05DD" : " Hashem ";
  return text
    .replace(THE_NAME, hashem)
    .replace(NAME_ABBREVIATION, `$1${hashem}`)
    .replace(ADONAI, hashem)
    .replace(ELOHIM, "\u05D0$1\u05DC$2\u05E7$3")
    .replace(/\bAdon(?:ai|oy)\b/g, "Hashem")
    .replace(/\bElo(?:h|k)(im|einu|ei|echa|echa|ai)\b/g, (_, end: string) => `Elok${end}`);
}

/**
 * The person's choice of how the voice is told to say Hebrew words and names (Settings):
 *   auto: names as exact sounds where the voice reads them, Hebrew passages with the stress in capitals;
 *   sounds: exact sounds for both, where the voice reads them;
 *   capitals: the stressed syllable in capitals for both;
 *   plain: respelled, with no stress shown.
 */
export type SayMode = "auto" | "sounds" | "capitals" | "plain";
export const SAY_MODES: SayMode[] = ["auto", "sounds", "capitals", "plain"];

export interface SayOptions {
  /** How names and Hebrew words written in English letters are shown to the voice. */
  names?: SayStyle;
  /** How vocalized Hebrew is shown to the voice. */
  hebrew?: SayStyle;
  /** The person's own fixes. */
  mine?: MyWord[];
  /** Names and terms the yeshiva way (the usual) or the Israeli way. */
  accent?: Accent;
}

/**
 * The styles for a choice. `sounds` says whether the voice that will read reads sounds written
 * between slashes (RabbAI's newest voices do; the quick voice in Talk and the device's don't).
 */
export function sayOptions(mode: SayMode, sounds: boolean, mine: MyWord[] = [], accent: Accent = "yeshiva"): SayOptions {
  const a = accent === "israeli" ? { accent } : {};
  if (mode === "plain") return { names: "plain", hebrew: "plain", mine, ...a };
  if (mode === "capitals") return { names: "caps", hebrew: "caps", mine, ...a };
  if (mode === "sounds") return { names: sounds ? "ipa" : "caps", hebrew: sounds ? "ipa" : "caps", mine, ...a };
  return { names: sounds ? "ipa" : "caps", hebrew: "caps", mine, ...a };
}

/** An answer without what is never read aloud: links, source numbers, and marks. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S*[^\s.,;:!?)]/g, "")
    .replace(/\[(\d{1,3})\]/g, "")
    .replace(/[*_`#>~|]+/g, " ")
    .replace(/\s*[•▪●]\s*/g, ". ");
}

/**
 * `voice` is "natural" for RabbAI's own voice (a speech service), which needs fewer words respelled
 * than the device's voices (lexicon.ts). The device's voices are never given capitals or sounds.
 */
export function speechText(text: string, hebrew: Pronunciation = "sephardi", voice: RespellFor = "device", say: SayOptions = {}): string {
  const names: SayStyle = voice === "device" ? "plain" : (say.names ?? "plain");
  const hebrewStyle: SayStyle = voice === "device" ? "plain" : (say.hebrew ?? "plain");
  let t = cleanForSpeech(text);
  // God's names first, then the English words and names, then the Hebrew itself, so a word's
  // respelling is never respelled again.
  t = respell(namesForLearning(t), voice, { style: names, mine: say.mine, ...(say.accent ? { accent: say.accent } : {}) });
  t = t.replace(HEBREW_RUN, (run) => (POINTS.test(run) ? ` ${sayHebrew(run, hebrew, hebrewStyle)} ` : run));
  return t
    .replace(/[ \t]+/g, " ")
    .replace(/ ([.,;:!?])/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Pieces of about a paragraph, split at sentences, so speech starts quickly (a short first piece)
 * and each request stays small. No piece is longer than `max`.
 */
export function speechChunks(text: string, first = 220, max = 700): string[] {
  const sentences = (text.match(/[^.!?;\n]+[.!?;]*["'”’)]*\s*|[.!?;\n]+\s*/g) ?? []).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  const limit = () => (chunks.length === 0 ? first : max);
  for (const s0 of sentences) {
    // A sentence longer than a piece is cut between words.
    const parts = s0.length <= max ? [s0] : (s0.match(new RegExp(`.{1,${max}}(?:\\s|$)`, "g")) ?? [s0]).map((p) => p.trim());
    for (const s of parts) {
      if (cur && cur.length + 1 + s.length > limit()) {
        chunks.push(cur);
        cur = "";
      }
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.filter((c) => /[\p{L}\p{N}]/u.test(c));
}
