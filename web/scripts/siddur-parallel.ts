/*
 * Pairs the lines of the Koren siddur with the lines of Siddur Ashkenaz that hold the same Hebrew
 * words, so the Daven tab can show the Metsudah Linear Siddur's English (Rabbi Avrohom Davis,
 * phrase by phrase, literal) beside the Koren Hebrew when the person asks for it. Writes
 * lib/siddur/parallel.generated.json: references only, never any text, so nothing of the library
 * is committed. A line is paired only when the Metsudah lines hold its words in the same order
 * (lib/siddur/guide-match.ts, pairWithGuide), and only Metsudah lines with Metsudah English count.
 *
 * Run from web/ with the library (as for translate-here.ts):
 *   npx tsx scripts/siddur-parallel.ts
 */
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { plainText } from "../lib/library/daf";
import { testingStore } from "../lib/library/testing";
import { guideIndex, pairWithGuide, type GuideLine } from "../lib/siddur/guide-match";

const KOREN = "The Koren Shalem Siddur; Ashkenaz";
const GUIDE = "Siddur Ashkenaz";
const EDITION = "Metsudah";

async function linesOf(store: NonNullable<ReturnType<typeof testingStore>>, book: string) {
  const out: Array<GuideLine & { edition: string }> = [];
  for (const section of await store.contents(book)) {
    const found = await store.section(section, { bare: true });
    for (const l of found?.lines ?? []) out.push({ ref: l.ref, he: plainText(l.he ?? ""), en: plainText(l.en ?? ""), edition: l.source?.enEdition ?? "" });
  }
  return out;
}

async function main() {
  const store = testingStore();
  if (!store) throw new Error("Set RABAI_LIBRARY_DB_URL (and the token) as for translate-here.ts.");
  const guide = (await linesOf(store, GUIDE)).filter((l) => l.he.trim() && l.en.trim() && l.edition.includes(EDITION));
  const index = guideIndex(guide);
  const koren = (await linesOf(store, KOREN)).filter((l) => /[א-ת]/.test(l.he));
  const pairs: Record<string, string[]> = {};
  for (const l of koren) {
    const got = pairWithGuide(l.he, index);
    if (got) pairs[l.ref] = got.map((g) => g.ref);
  }
  const file = join(resolve(import.meta.dirname, ".."), "lib", "siddur", "parallel.generated.json");
  writeFileSync(file, JSON.stringify({ made: "scripts/siddur-parallel.ts", from: KOREN, guide: GUIDE, edition: EDITION, pairs }, null, 0) + "\n");
  console.log(`${KOREN}: ${koren.length} Hebrew lines, ${Object.keys(pairs).length} paired with ${GUIDE}'s ${EDITION} lines (${guide.length} lines with ${EDITION} English).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
