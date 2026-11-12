/*
 * Rabbi Jonathan Sacks's commentary on the Koren siddur, from the library. Its references follow
 * the Koren siddur's own, section by section and line by line ("Rabbi Sacks on Siddur, Weekdays,
 * The Rabbis' Kaddish 1" is on "The Koren Shalem Siddur; Ashkenaz, Weekdays, The Rabbis' Kaddish
 * 1"), so a line's note is found by its reference alone. Server only.
 */
import type { TestingStore } from "../library/testing";

export const SACKS_BOOK = "Rabbi Sacks on Siddur";
export const KOREN_BOOK = "The Koren Shalem Siddur; Ashkenaz";

/** The commentary's reference for a line of the Koren siddur, or null for a line of another book. */
export function sacksRef(korenRef: string): string | null {
  return korenRef.startsWith(`${KOREN_BOOK}, `) ? `${SACKS_BOOK}, ${korenRef.slice(KOREN_BOOK.length + 2)}` : null;
}

/** Rabbi Sacks's English note on each of these lines that has one, by the line's reference. */
export async function sacksFor(store: TestingStore, refs: string[]): Promise<Record<string, string>> {
  const pairs = refs.map((r) => [r, sacksRef(r)] as const).filter((p): p is readonly [string, string] => !!p[1]);
  if (!pairs.length) return {};
  const rows = await store.exact(pairs.map((p) => p[1]));
  const byRef = new Map(rows.filter((p) => p.source?.book === SACKS_BOOK && p.en.trim()).map((p) => [p.ref, p.en.trim()]));
  const out: Record<string, string> = {};
  for (const [line, note] of pairs) {
    const text = byRef.get(note);
    if (text) out[line] = text;
  }
  return out;
}
