/*
 * Turns an answer into text a speech voice reads well: no links or marks, Hebrew with vowels in
 * English letters (by the person's pronunciation), and Hebrew words and names respelled
 * (lexicon.ts). Unpointed Hebrew is left as it is: a voice that reads Hebrew reads it, since a
 * guess at its vowels could be wrong. Used by the server voice and the device's voice alike.
 */

import { transliterate, type Pronunciation } from "../siddur/translit";
import { respell } from "./lexicon";

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

/**
 * Outside prayer, the custom is not to say God's names as written: the Name is said "Hashem" and
 * Elohim "Elokim". Reading an answer aloud is learning, not prayer, so the voice does the same.
 */
export function namesForLearning(text: string, forHebrewVoice = false): string {
  const hashem = forHebrewVoice ? "\u05D4\u05E9\u05DD" : " Hashem ";
  return text
    .replace(THE_NAME, hashem)
    .replace(NAME_ABBREVIATION, `$1${hashem}`)
    .replace(ELOHIM, "\u05D0$1\u05DC$2\u05E7$3")
    .replace(/\bAdon(?:ai|oy)\b/g, "Hashem")
    .replace(/\bElo(?:h|k)(im|einu|ei|echa|echa|ai)\b/g, (_, end: string) => `Elok${end}`);
}

export function speechText(text: string, hebrew: Pronunciation = "sephardi"): string {
  let t = text
    .replace(/https?:\/\/\S*[^\s.,;:!?)]/g, "")
    .replace(/\[(\d{1,3})\]/g, "")
    .replace(/[*_`#>~|]+/g, " ")
    .replace(/\s*[•▪●]\s*/g, ". ");
  t = namesForLearning(t);
  t = t.replace(HEBREW_RUN, (run) => (POINTS.test(run) ? ` ${transliterate(run, hebrew)} ` : run));
  return respell(namesForLearning(t))
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
