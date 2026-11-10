/*
 * For a session translation job on one siddur (scripts/translate-here.ts), writes beside each
 * request a guide file: for every passage in the request, the lines of another siddur in the
 * library that hold the same Hebrew words, with that siddur's English. Used so the word-by-word
 * translation of a Koren line follows the Metsudah Linear Siddur (Rabbi Avrohom Davis), which
 * translates phrase by phrase.
 *
 * Usage, from web/, with the same settings as translate-here.ts:
 *   npx tsx scripts/siddur-guide.ts [--guide "Siddur Ashkenaz"] [--edition Metsudah] [--job ID]
 *
 * --guide    the siddur to take the guide lines from (default "Siddur Ashkenaz").
 * --edition  only lines whose English is from an edition with this word in its name (default
 *            "Metsudah"), so another translation in the same siddur is never passed off as it.
 * --job      one job; otherwise every job that isn't collected yet.
 *
 * The guide siddur's lines are read once and kept in ../library/session-translations/, which is
 * never committed: these files hold the library's texts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { plainText } from "../lib/library/daf";
import { testingStore } from "../lib/library/testing";
import { translationStore } from "../lib/library/translations";
import { guideIndex, matchGuide, type GuideLine } from "../lib/siddur/guide-match";

const ROOT = resolve(import.meta.dirname, "..", "..");
const WORK = join(ROOT, "library", "session-translations");
const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const store = testingStore();
  const library = translationStore();
  if (!store || !library) throw new Error("Set RABAI_LIBRARY_DB_URL and RABAI_TRANSLATIONS_DB_URL as for translate-here.ts.");
  const book = opt("guide") ?? "Siddur Ashkenaz";
  const edition = opt("edition") ?? "Metsudah";
  mkdirSync(WORK, { recursive: true });
  const kept = join(WORK, `guide-${book.replace(/[^a-zA-Z0-9]+/g, "-")}-${edition}.json`);
  let lines: GuideLine[];
  if (existsSync(kept)) lines = JSON.parse(readFileSync(kept, "utf8")) as GuideLine[];
  else {
    lines = [];
    const sections = await store.contents(book);
    if (!sections.length) throw new Error(`"${book}" isn't in the library.`);
    for (const section of sections) {
      const found = await store.section(section, { bare: true });
      for (const l of found?.lines ?? []) {
        if (!l.he?.trim() || !l.en?.trim()) continue;
        if (!(l.source?.enEdition ?? "").includes(edition)) continue;
        lines.push({ ref: l.ref, he: plainText(l.he), en: plainText(l.en) });
      }
    }
    writeFileSync(kept, JSON.stringify(lines));
  }
  const index = guideIndex(lines);
  console.log(`${book}: ${lines.length} lines with ${edition} English (${index.lines.length} different).`);

  const only = opt("job");
  for (const j of await library.jobs("submitted")) {
    if (only && j.batchId !== only) continue;
    const dir = join(WORK, j.batchId);
    let withGuide = 0;
    let total = 0;
    for (const [id, entry] of Object.entries(j.manifest)) {
      const passages = await store.exact(entry.passages.map((p) => p.ref));
      const byRef = new Map(passages.map((p) => [p.ref, p]));
      const out: string[] = [
        `# The ${edition} linear siddur on these words`,
        "",
        `For each passage: the lines of the ${edition} Linear Siddur (Rabbi Avrohom Davis) that hold the same Hebrew words, each`,
        "with its English. It translates phrase by phrase, so it is the guide to what each word means here.",
        `Where a passage has none, that siddur doesn't have those words in the library.`,
        "",
      ];
      for (const { ref } of entry.passages) {
        const p = byRef.get(ref);
        const hits = p ? matchGuide(plainText(p.he), index) : [];
        total++;
        if (hits.length) withGuide++;
        out.push(`[${ref}]`);
        if (!hits.length) out.push("(none)");
        for (const h of hits) out.push(`- ${h.he} = ${h.en}`);
        out.push("");
      }
      writeFileSync(join(dir, `${id}.guide.md`), out.join("\n"));
    }
    console.log(`${j.batchId}: ${withGuide} of ${total} passages have ${edition} lines for their words.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
