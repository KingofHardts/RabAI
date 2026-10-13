/**
 * The sources list: what RabAI reads, and what it leaves out (tools/review_list.py, made from
 * the canon by tools/validate.py --write into sources.generated.ts).
 */

/**
 * testing: in the private testing library. held: waiting for the rabbinic board's decision.
 * needs_agreement: copyrighted, needs the publisher's license. no_copy: wanted, but there is no
 * copy RabAI may use yet.
 */
export type EditionState = "testing" | "held" | "needs_agreement" | "no_copy";

export interface SourceEdition {
  name: string;
  language: "he" | "en";
  state: EditionState;
  /** In the approved library: the board approved it and its license is cleared. */
  approved: boolean;
  /** Used only for what words mean (a dictionary by an author outside Orthodoxy), or only for vowels. */
  use?: "words" | "vowels";
  /** An editor's additions are removed when the library is built. */
  cleaned?: boolean;
  note?: string;
}

export interface SourceWork {
  id: string;
  title: string;
  /** Which area of the library it stands in (SourceArea.id). */
  area: string;
  /** Its shelf within the area, such as "Codes" or "Commentaries" ("" when the area has one). */
  group: string;
  era: string;
  kind: string;
  hebrew?: string;
  author?: string;
  dates?: string;
  region?: string;
  /** The communities it belongs to most; none means shared by all. */
  streams: string[];
  /** Whose practice a halacha work records. */
  minhag?: string;
  /** On RabAI's founding list. */
  core: boolean;
  approved: boolean;
  /** A debated work: the caution RabAI gives whenever it uses it, and why. */
  caution?: string;
  cautionKinds?: string[];
  note?: string;
  editions: SourceEdition[];
}

export interface SourceArea {
  id: string;
  title: string;
  about: string;
}

export interface LeftOut {
  id: string;
  title: string;
  reason: string;
  /** The board may bring it back. */
  mayReconsider: boolean;
  note?: string;
}

/** An earlier question for the board (docs/library-comparison.md, section 3). */
export interface BoardQuestion {
  number: number;
  section: string;
  text: string;
}

export interface ReadingText {
  id: string;
  title: string;
  ranks: Array<{ rank: "main" | "next" | "later"; label: string; names: string[] }>;
  /** What RabAI opens between the ranks: the sources of a ruling, or the codes that rule on a line. */
  between?: string;
  after?: string;
}

export interface SourcesData {
  areas: SourceArea[];
  /** Each generation's name: "Rishonim (about 1040-1550)". */
  eras: Record<string, string>;
  /** In display order: by area, shelf, generation, then the canon's own order. */
  works: SourceWork[];
  leftOut: LeftOut[];
  questions: BoardQuestion[];
  readingOrder: { status: string; texts: ReadingText[] };
  sites: {
    status: string;
    trusted: Array<{ name: string; domain: string; offers: string }>;
    notForWeb: Array<{ name: string; domain: string; reason: string }>;
  };
}
