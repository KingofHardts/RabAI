/*
 * Plain-English names for the letters that attach to the front of a Hebrew or Aramaic word, and
 * for common endings. Used to explain how a tapped word breaks down. These are the app's own
 * rules of thumb; the dictionary entry they lead to is the source.
 */

const LETTERS: Record<string, string> = {
  ו: "and",
  ה: "the",
  ב: "in, with",
  ל: "to, for",
  מ: "from",
  ש: "that, which",
  כ: "like, as",
  ד: "of, that (Aramaic)",
};

const ENDINGS: Record<string, string> = {
  ים: "a plural ending",
  ות: "a plural ending",
  ין: "an Aramaic plural ending",
  א: "the Aramaic ending, often meaning “the”",
  יא: "the Aramaic ending, often meaning “the”",
  תא: "the Aramaic ending, often meaning “the”",
  ייא: "an Aramaic plural ending",
  יה: "an ending meaning “his” or “her” (Aramaic), or a feminine ending",
  הו: "an Aramaic ending meaning “him” or “his”",
  ה: "a feminine or possessive ending",
  יך: "an ending meaning “your”",
  ך: "an ending meaning “your”",
  כם: "an ending meaning “your” (plural)",
  הם: "an ending meaning “their”",
  הן: "an ending meaning “their”",
  נו: "an ending meaning “our” or “us”",
  תי: "an ending meaning “I” (past tense)",
  ו: "an ending meaning “his” or “him”",
  ם: "an ending meaning “their”",
};

/** Each front letter with its meaning: "וה" -> [["ו","and"],["ה","the"]]. */
export function prefixParts(prefix: string): Array<[string, string]> {
  return [...prefix].map((l) => [l, LETTERS[l] ?? ""]);
}

export function endingMeaning(suffix: string): string {
  return ENDINGS[suffix] ?? "";
}

/** A dictionary entry for a tapped word, as the app shows it. */
export interface WordEntry {
  dictionary: string;
  note?: string;
  headword: string;
  ref: string;
  text: string;
  lang: "he" | "en";
  /** How the tapped word was read to find this entry. */
  found: {
    form: string;
    prefix: Array<[string, string]>;
    suffix: string;
    suffixMeaning: string;
    /** When the form is a guess at the root or dictionary form: what was changed, in plain words. */
    guess?: string[];
  };
}
