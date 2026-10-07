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
const LETTER_VALUES: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50,
  ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400,
};

/** The number Hebrew letters write (ל״ד → 34), when they are written as a number: largest first, with ט״ו and ט״ז for 15 and 16. */
export function hebrewNumber(letters: string): number | null {
  const ls = [...letters.replace(/[^א-ת]/g, "")];
  if (!ls.length || ls.length > 4) return null;
  let total = 0;
  for (let i = 0; i < ls.length; i++) {
    const v = LETTER_VALUES[ls[i]];
    const next = LETTER_VALUES[ls[i + 1]] ?? 0;
    const fifteen = ls[i] === "ט" && (ls[i + 1] === "ו" || ls[i + 1] === "ז") && i + 2 === ls.length;
    if (next > v && !fifteen) return null;
    total += v;
  }
  return total;
}

/**
 * A tapped word that is a printed short form: ר״ה, א״ל (gershayim, standing for several words),
 * ר׳, וכו׳ (a geresh, standing for one cut-short word or a number), or a chapter and verse written
 * in letters (ל״ד:כ״ה). None is looked up as the plain word its letters spell; א״ל is not אל.
 */
export function abbreviationOf(
  word: string,
): { kind: "gershayim" | "geresh" | "verse"; form: string; numbers?: number[] } | null {
  const w = word.trim().replace(/[\u0591-\u05C7]/g, "").replace(/"/g, "״").replace(/'/g, "׳");
  if (/[א-ת][״׳]?:[א-ת]/.test(w)) {
    const parts = w.split(":").map((x) => hebrewNumber(x));
    if (parts.every((n): n is number => n !== null)) return { kind: "verse", form: w, numbers: parts };
  }
  if (/[א-ת]״[א-ת]/.test(w)) return { kind: "gershayim", form: w };
  if (/[א-ת]׳$/.test(w)) return { kind: "geresh", form: w };
  return null;
}

export interface WordEntry {
  dictionary: string;
  note?: string;
  /** The note in a few words, shown on the entry's one-line row. */
  tag?: string;
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
