/** Where an English translation came from. */
export type TranslationStatus =
  | "approved" // an approved, license-cleared published translation
  | "rabai" // RabAI's own translation, labeled as such wherever it appears
  | "development"; // a placeholder typed by the team while building; never shipped publicly

export interface Work {
  /** Id used by passages, e.g. "bereishit" or "rashi-bereishit". */
  id: string;
  title: string;
  he: string;
  /** The matching entry in canon/canon.yaml. */
  canonId: string;
  kind: "text" | "commentary";
  author?: string;
  /** The edition of the Hebrew or Aramaic text. */
  edition: string;
  translation: { by: string; status: TranslationStatus };
  /** "development" texts are for building and testing only, never for a public launch. */
  library: "development" | "approved";
  /** Other names people use for this work, to help search. */
  aliases?: string[];
}

export interface Passage {
  /** Unique, human-readable reference, e.g. "Bereishit 1:1" or "Shabbat 21b:2". */
  ref: string;
  work: string;
  /** The page or chapter the passage belongs to, e.g. "Bereishit 1". */
  section: string;
  sectionHe: string;
  /** Position within its section. */
  order: number;
  /** Short label shown above the line, e.g. "Verse 1" or "Rashi". */
  label: string;
  labelHe: string;
  he: string;
  en: string;
  /** For a commentary: the ref of the line it comments on. */
  on?: string;
  /** Extra search words (development library only, until real search arrives). */
  keywords?: string[];
}
