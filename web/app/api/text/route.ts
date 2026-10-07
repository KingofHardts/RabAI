import { NextResponse } from "next/server";
import { getPassage, getSection, listSections, loadLibrary, type Library } from "@/lib/library";
import { studyPassages } from "@/lib/library/word-study";
import { testingStore } from "@/lib/library/testing";
import type { Passage, Work } from "@/lib/library/types";

export const runtime = "nodejs";

/**
 * GET /api/text?ref=Rashi on Bereishit 1:1 → the whole page or chapter, with commentaries,
 * each line split into words for word study.
 */
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref")?.slice(0, 160) ?? "";
  if (!ref) return NextResponse.json({ error: "Which text? Pass ?ref=" }, { status: 400 });

  const lib = loadLibrary();
  if (lib.mode === "testing") return testingSection(ref, lib);

  const section = getSection(lib, ref);
  if (!section) return NextResponse.json({ error: `“${ref}” isn't in the library yet.` }, { status: 404 });

  const all = section.lines.flatMap((l) => [l.passage, ...l.commentaries]);
  const { tokens, study } = studyPassages(lib, all);
  const focus = getPassage(lib, ref);
  // The sections before and after, among this work's sections.
  const siblings = listSections(lib).filter((s) => s.workId === section.work.id).map((s) => s.section);
  const at = siblings.indexOf(section.section);

  return NextResponse.json({
    focus: focus?.ref ?? null,
    libraryMode: lib.mode,
    ...(at > 0 ? { prev: siblings[at - 1] } : {}),
    ...(at >= 0 && at < siblings.length - 1 ? { next: siblings[at + 1] } : {}),
    book: section.work.title,
    section: section.section,
    sectionHe: section.sectionHe,
    work: section.work,
    wordStudy: study,
    lines: section.lines.map((l) => ({
      ...l.passage,
      keywords: undefined,
      tokens: tokens.get(l.passage.ref) ?? [],
      commentaries: l.commentaries.map((c) => {
        const work = lib.works.find((w) => w.id === c.work);
        return {
          ...c,
          keywords: undefined,
          tokens: tokens.get(c.ref) ?? [],
          author: work?.author ?? work?.title ?? "",
          translation: work?.translation,
        };
      }),
    })),
  });
}

/** A section from the private testing library, in the same shape the reader uses. */
async function testingSection(ref: string, lib: Library) {
  const store = testingStore();
  if (!store) return NextResponse.json({ error: "The library isn't connected right now." }, { status: 503 });
  let found: Awaited<ReturnType<typeof store.section>>;
  try {
    found = await store.section(ref);
  } catch (err) {
    console.error("[rabai] reader lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The library couldn't open that text just now." }, { status: 502 });
  }
  if (!found || !found.lines.length) {
    return NextResponse.json({ error: `“${ref}” isn't in the library yet.` }, { status: 404 });
  }
  const first = found.lines[0];
  const s = first.source!;
  const work: Work = {
    id: s.canonId,
    title: s.book,
    he: s.bookHe ?? s.book,
    canonId: s.canonId,
    kind: / on /.test(s.book) ? "commentary" : "text",
    edition: s.heEdition ?? s.enEdition ?? "",
    translation: { by: s.enEdition ?? "No English translation in the library yet", status: "testing" },
    library: "testing",
  };
  const all: Passage[] = [...found.lines, ...[...found.commentaries.values()].flat()];
  const { tokens, study } = studyPassages({ ...lib, passages: all }, all);
  const focus = all.find((p) => p.ref === ref)?.ref ?? null;

  return NextResponse.json({
    focus,
    libraryMode: lib.mode,
    ...(found.prev ? { prev: found.prev } : {}),
    ...(found.next ? { next: found.next } : {}),
    book: s.book,
    section: first.section,
    sectionHe: first.sectionHe,
    work,
    wordStudy: study,
    lines: found.lines.map((l) => ({
      ...l,
      tokens: tokens.get(l.ref) ?? [],
      commentaries: (found.commentaries.get(l.ref) ?? []).map((c) => ({
        ...c,
        tokens: tokens.get(c.ref) ?? [],
        author: c.source?.book.replace(/ on .*$/, "") ?? "",
        translation: { by: c.source?.enEdition ?? "No English translation in the library yet", status: "testing" as const },
      })),
    })),
  });
}
