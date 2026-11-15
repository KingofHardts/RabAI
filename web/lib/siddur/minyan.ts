/*
 * Davening alone (the Daven tab's "Davening: with a minyan / alone"): the parts of a service that
 * are said only with a minyan, found from the siddur's own instructions ("requires the presence of a
 * minyan", "said only in the presence of a minyan", "During the Leader's Repetition…", "the Torah is
 * read when a minyan is present") and from the Kaddish itself (a line that begins יתגדל). Nothing is
 * decided here that the siddur doesn't say; it is RabbAI's reading of the siddur's instructions, not
 * yet reviewed by the rabbinic board (open question 29).
 */
import type { SiddurLine } from "./lines";
import type { Fold } from "./today";

export const MINYAN_REASON = "Said only with a minyan";

const plain = (s: string) => s.replace(/[֑-ׇ]/g, "").replace(/[ -‏ ]/g, " ").trim();
const enText = (l: SiddurLine) => l.instruction ?? l.en.map((p) => p.segs.map((s) => ("text" in s ? s.text : "")).join("")).join(" ");
const heText = (l: SiddurLine) => plain(l.he.map((p) => p.segs.map((s) => ("text" in s ? s.text : "")).join("")).join(" "));

/** An instruction that opens a part said only with a minyan. */
const OPENS = /requires the presence of a minyan|said only in the presence of a minyan|only (?:in|with) a minyan|during the leader[’']s repetition|said by the leader during the repetition|is read when a minyan is present/i;

/** A whole section said only with a minyan. */
export function minyanWhole(short: string): string | null {
  return /^(?:reading of the torah|removing the torah from the ark|returning the torah to the ark)$/i.test(short) ? MINYAN_REASON : null;
}

const isBreak = (l: SiddurLine) => l.kind === "heading" || l.kind === "instruction";

/** The runs of a section's lines said only with a minyan. */
export function minyanFolds(lines: SiddurLine[]): Fold[] {
  const folds: Fold[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const text = enText(l);
    const kaddish = l.kind === "prayer" && /^יתגדל/.test(heText(l));
    if ((l.kind === "instruction" && OPENS.test(text)) || kaddish) {
      // To the next heading or instruction (the instruction itself goes too).
      let j = i + 1;
      while (j < lines.length && !isBreak(lines[j])) j++;
      folds.push({ from: i, to: j, reason: MINYAN_REASON });
      i = j - 1;
    } else if (l.kind === "prayer" && /^during the leader[’']s repetition/i.test(text)) {
      folds.push({ from: i, to: i + 1, reason: MINYAN_REASON });
    }
  }
  return folds;
}
