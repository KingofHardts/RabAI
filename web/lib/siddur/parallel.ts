/*
 * The Metsudah Linear Siddur's English (Rabbi Avrohom Davis, phrase by phrase) for lines of the
 * Koren siddur that hold the same Hebrew words as lines of Siddur Ashkenaz. Which lines pair is
 * fixed in parallel.generated.json (references only, made by scripts/siddur-parallel.ts with
 * pairWithGuide in guide-match.ts); the English itself is read from the library each time. Server
 * only: the pairing list is too large for the page.
 */
import parallel from "./parallel.generated.json";
import type { TestingStore } from "../library/testing";

const PAIRS = (parallel as { pairs: Record<string, string[]> }).pairs;

/** The book the pairs are for. */
export const PARALLEL_BOOK = (parallel as { from: string }).from;
/** The edition whose English is given. */
export const PARALLEL_EDITION = "The Metsudah Linear Siddur, translated by Rabbi Avrohom Davis";

/** A Metsudah line that is only a speaker's label ("Congregation and Chazzan:"): the Koren line shows its own. */
const LABEL = /^[^.!?]{1,40}:\s*$/;

/**
 * The Metsudah English for those of these lines that are paired, joined line by line. A line is
 * left out when any of its Metsudah lines has no English in the library, or English with a
 * leftover translator's note (an em dash before a source, from before the build removed notes
 * whole), so a line is never given part of a translation.
 */
export async function metsudahFor(store: TestingStore, refs: string[]): Promise<Record<string, string>> {
  const wanted = refs.filter((r) => PAIRS[r]?.length);
  if (!wanted.length) return {};
  const guideRefs = [...new Set(wanted.flatMap((r) => PAIRS[r]))];
  const rows = await store.exact(guideRefs);
  const en = new Map<string, string>();
  for (const p of rows) if (p.source?.enEdition?.includes("Metsudah") && p.en.trim()) en.set(p.ref, p.en.trim());
  const out: Record<string, string> = {};
  for (const r of wanted) {
    const parts = PAIRS[r].map((g) => en.get(g));
    if (parts.some((x) => !x || x.includes("—"))) continue;
    const text = (parts as string[]).filter((x) => !LABEL.test(x)).join(" ").replace(/\s+/g, " ").trim();
    if (text) out[r] = text;
  }
  return out;
}
