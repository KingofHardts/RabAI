/*
 * A prayer a person may add in their own words or for their own need, where the siddur says so
 * ("The following prayer for a sick person may be said here", "יש אומרים כאן תפילה זו"): the Daven
 * tab shades it, as printed siddurim set it apart, so it reads as optional. Only the siddur's own
 * words decide; nothing is added.
 */
import type { SiddurLine } from "./lines";

const EN = /^\s*(The following (prayer|request|supplication)s? (for [^:]{3,60} )?(may|can) be (said|added) here|One may add (here|a personal)|A personal (prayer|request)|Here (one|you) may add|Some add (here )?a (personal )?(prayer|request))/i;
const HE = /^(יש אומרים כאן תפילה זו|כאן יכול להוסיף|כאן מוסיפים בקשה|המתפלל על חולה)/;

/** Whether a line is an optional personal prayer, and what to call it. */
export function personalInsert(line: SiddurLine): string | null {
  if (line.kind !== "prayer") return null;
  const en = line.en.map((p) => p.segs.map((s) => s.text).join("")).join(" ");
  const m = en.match(EN);
  if (m) return /sick|ill|recovery|heal/i.test(m[0]) ? "For someone who is ill" : "Your own words";
  const he = line.he.map((p) => p.segs.map((s) => s.text).join("")).join(" ").replace(/[֑-ׇ]/g, "").trim();
  if (HE.test(he)) return "Your own words";
  return null;
}
