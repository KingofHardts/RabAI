import type { Passage } from "../library/types";

/*
 * The texts on screen while RabbAI answers: the passage it is quoting, shown above the answer and
 * marked where it is quoting, and the lines it reads aloud with the person.
 *
 * Nothing here is a new path around the citation check (citations.ts). A passage reaches the
 * screen only when it was sent to the model and the model's own citation points into it with
 * words that really are in it (the same test mapAnswer applies), or when the model asks to read
 * one of the documents it was given aloud ([[read REF]]). The words shown are always the
 * library's own, never the model's copy of them.
 */

/** A passage as the answer's card shows it. */
export interface LivePassage {
  ref: string;
  label: string;
  /** The book, for the card's heading. */
  book: string;
  he: string;
  en: string;
  /** Which library it is from, for the label beside it. */
  library: "testing" | "development" | "approved";
  /** A debated work's caution, shown beside it (canon `standing: debated`). */
  caution?: string;
}

/** The words a live citation quoted, and where in the answer's text it came. */
export interface LiveCite {
  ref: string;
  quote: string;
  /** How many characters of the answer had been written when it came. */
  at: number;
}

/** A line RabbAI reads aloud with the person, and where in the answer's text it comes. */
export interface LiveRead {
  ref: string;
  at: number;
}

export const CARD_LIMITS = {
  /** Passages kept with a finished answer. */
  passages: 4,
  heChars: 1200,
  enChars: 1800,
} as const;

function cut(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const room = t.slice(0, max);
  const space = room.lastIndexOf(" ");
  return `${(space > max * 0.7 ? room.slice(0, space) : room).trim()}…`;
}

/** The passage as the card shows it. */
export function livePassage(p: Passage): LivePassage {
  const library = p.source?.library === "testing" ? "testing" : p.source?.library === "approved" ? "approved" : "development";
  const s = p.source;
  return {
    ref: p.ref,
    label: p.label,
    book: s?.book ?? p.section,
    he: cut(p.he ?? "", CARD_LIMITS.heChars),
    en: cut(p.en ?? "", CARD_LIMITS.enChars),
    library,
    ...(s?.standing === "debated" && s.caution ? { caution: s.caution } : {}),
  };
}

/** Whether a passage is one of the texts (not a teacher's article, a page found online or a dictionary entry). */
export function isText(p: Passage): boolean {
  return !p.online && !p.source?.article && !p.source?.dictionary;
}

/** A reference written loosely: spaces tidied, case ignored. */
export function refKey(ref: string): string {
  return ref.replace(/\s+/g, " ").trim().toLowerCase();
}

/** The texts the model may read aloud, by their references written loosely. */
export function readableRefs(documents: Passage[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of documents) if (isText(p)) map.set(refKey(p.ref), p.ref);
  return map;
}

/** [[read Berakhot 2a:1]], as the model writes it (lib/engine/answer.ts, APP_INSTRUCTIONS). */
export const READ_MARKER = /\[\[\s*read\s*:?\s*([^\]\n]{1,160}?)\s*\]\]/gi;

/** Anything left of a marker that couldn't be read, so it never shows. */
export function stripMarkers(text: string): string {
  return text.replace(/\[\[\s*read\b[^\]\n]*\]?\]?/gi, "");
}

/**
 * Takes the answer's text as it is written and takes the read markers out of it: each one that
 * names a document becomes `onRead` (at the place in the text where it was), anything else that
 * looks like a marker is dropped, and the rest is passed on to `onText` unchanged. A marker split
 * across pieces of the stream is held back until it is whole.
 */
export function createReadFilter(opts: { canRead: (ref: string) => string | null; onText: (delta: string) => void; onRead: (ref: string, at: number) => void }) {
  let held = "";
  let written = 0;
  let lastOut = "";
  const out = (t: string) => {
    if (!t) return;
    written += t.length;
    lastOut = t;
    opts.onText(t);
  };
  const drain = (final: boolean) => {
    for (;;) {
      const start = held.indexOf("[[");
      if (start < 0) {
        // A lone "[" at the end may start a marker.
        if (!final && held.endsWith("[")) {
          out(held.slice(0, -1));
          held = "[";
        } else {
          out(held);
          held = "";
        }
        return;
      }
      out(held.slice(0, start));
      held = held.slice(start);
      const end = held.indexOf("]]");
      if (end < 0) {
        // Not a marker after all (too long, or it never closes): pass it on as text.
        if (final || held.length > 200 || (held.length >= 7 && !/^\[\[\s*read/i.test(held))) {
          out(held.slice(0, 2));
          held = held.slice(2);
          continue;
        }
        return;
      }
      const marker = held.slice(0, end + 2);
      held = held.slice(end + 2);
      const m = /^\[\[\s*read\s*:?\s*(.+?)\s*\]\]$/i.exec(marker);
      if (!m) {
        out(marker);
        continue;
      }
      const ref = opts.canRead(m[1]);
      if (ref) opts.onRead(ref, written);
      // A marker on a line of its own leaves no empty line behind.
      if (held.startsWith("\n") && (written === 0 || lastOut.endsWith("\n"))) held = held.slice(1);
    }
  };
  return {
    push(delta: string) {
      held += delta;
      drain(false);
    },
    /** The answer is complete: whatever is held back is passed on. */
    flush() {
      drain(true);
    },
    /** How much of the answer has been written, counting what is held back. */
    position(): number {
      return written + held.length;
    },
  };
}
