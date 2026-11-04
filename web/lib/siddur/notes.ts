/*
 * The board's draft instructions (canon/davening-notes.yaml) placed before the line they belong
 * to, in siddurim that don't print their own. A note matches a line by the line's opening words,
 * in Hebrew letters, ignoring vowels, the siddur's marks and a speaker's label. Safe on the device.
 */

import { DAVENING_NOTES, type DaveningNote } from "./davening-notes.generated";
import type { SiddurLine } from "./lines";

/** Hebrew letters and single spaces only: "בָּרוּךְ ▾אַתָּה" -> "ברוך אתה". */
export function bareLetters(text: string): string {
  return text
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[^\u05D0-\u05EA\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** How far into a line a note's opening words may start (a line can begin with a word or two before them). */
const REACH = 40;

/** Whether a note belongs in this prayer, by the words of its name (the line's reference). */
function inPlace(note: DaveningNote, ref: string): boolean {
  const where = ref.toLowerCase();
  if (note.notIn?.some((w) => where.includes(w.toLowerCase()))) return false;
  return !note.in || note.in.some((w) => where.includes(w.toLowerCase()));
}

/** The note that belongs before a line, if any. */
export function noteFor(line: SiddurLine, notes: DaveningNote[] = DAVENING_NOTES): DaveningNote | null {
  if (line.kind !== "prayer" || !line.he.length) return null;
  const text = bareLetters(line.he.map((p) => p.segs.map((s) => s.text).join("")).join(" "));
  for (const note of notes) {
    if (!inPlace(note, line.ref)) continue;
    for (const m of note.match) {
      const at = text.indexOf(m);
      if (at >= 0 && at <= REACH) return note;
    }
  }
  return null;
}
