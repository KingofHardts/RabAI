import { NextResponse } from "next/server";
import { getPassage, getSection, loadLibrary } from "@/lib/library";
import { studyPassages } from "@/lib/library/word-study";

export const runtime = "nodejs";

/**
 * GET /api/text?ref=Rashi on Bereishit 1:1 → the whole page or chapter, with commentaries,
 * each line split into words for word study.
 */
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref")?.slice(0, 120) ?? "";
  if (!ref) return NextResponse.json({ error: "Which text? Pass ?ref=" }, { status: 400 });

  const lib = loadLibrary();
  const section = getSection(lib, ref);
  if (!section) return NextResponse.json({ error: `“${ref}” isn't in the library yet.` }, { status: 404 });

  const all = section.lines.flatMap((l) => [l.passage, ...l.commentaries]);
  const { tokens, study } = studyPassages(lib, all);
  const focus = getPassage(lib, ref);

  return NextResponse.json({
    focus: focus?.ref ?? null,
    libraryMode: lib.mode,
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
