import { NextResponse } from "next/server";
import { listSections, loadLibrary } from "@/lib/library";
import { phraseGlossary } from "@/lib/library/word-study";
import { testingStore } from "@/lib/library/testing";

export const runtime = "nodejs";

/** GET /api/library → every page or chapter the app can open, and the Gemara's key words. */
export async function GET() {
  const lib = loadLibrary();
  if (lib.mode === "testing") {
    const store = testingStore();
    let books: Awaited<ReturnType<NonNullable<typeof store>["books"]>> = [];
    try {
      books = store ? await store.books() : [];
    } catch (err) {
      console.error("[rabai] listing the library failed:", err instanceof Error ? err.message : err);
    }
    return NextResponse.json({
      libraryMode: lib.mode,
      // In the testing library each book opens at its beginning.
      sections: books.map((b) => ({
        section: b.title,
        sectionHe: b.he,
        workId: b.workTitle,
        workTitle: b.workTitle,
        firstRef: b.firstRef,
        lineCount: 0,
        commentaryCount: 0,
      })),
      phrases: phraseGlossary(lib),
    });
  }
  return NextResponse.json({
    libraryMode: lib.mode,
    sections: listSections(lib),
    phrases: phraseGlossary(lib),
  });
}
