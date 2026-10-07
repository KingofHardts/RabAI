/** Where an English translation came from. */
export type TranslationStatus =
  | "approved" // an approved, license-cleared published translation
  | "rabai" // RabAI's own translation, labeled as such wherever it appears
  | "development" // a placeholder typed by the team while building; never shipped publicly
  | "testing"; // a published translation in the private testing library, not yet approved by the board

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
  /**
   * "development" texts are typed by the team for building. "testing" texts come from the
   * private testing library (published editions not yet approved by the board). Neither is
   * ever part of a public launch.
   */
  library: "development" | "approved" | "testing";
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
  /** Where a testing-library passage came from: the canon editions and Sefaria versions. */
  source?: PassageSource;
}

export interface PassageSource {
  library: "testing";
  /** The canon work id, e.g. "rashi-tanakh". */
  canonId: string;
  workTitle: string;
  /** The book within the work, as Sefaria names it, e.g. "Rashi on Genesis". */
  book: string;
  bookHe?: string;
  heEdition?: string;
  heVersion?: string;
  enEdition?: string;
  enVersion?: string;
  licenses: string[];
  /** A dictionary entry (Jastrow, Radak's Sefer HaShorashim, the Aruch). */
  dictionary?: boolean;
  /** A dictionary RabAI may use only for what words mean, never for history or belief. */
  wordToolOnly?: boolean;
  /** The canon category of the work, e.g. "kabbalah". */
  category?: string;
  /**
   * A debated work (canon standing: debated): kept so people can ask about it, but presented with
   * its caution and never relied on alone for halacha.
   */
  standing?: "debated";
  /** Why it is debated, in plain English, for the person and for RabAI. */
  caution?: string;
  /** From canon/vocabulary.yaml: uncertain_author, unusual_source, disputed_claims, criticized_views. */
  cautionKinds?: string[];
}
