import { NextResponse } from "next/server";
import { listSections, loadLibrary } from "@/lib/library";
import { phraseGlossary } from "@/lib/library/word-study";
import { testingStore, type ArticleShelf } from "@/lib/library/testing";

export const runtime = "nodejs";

/** GET /api/library → every page or chapter the app can open, and the Gemara's key words. */
export async function GET() {
  const lib = loadLibrary();
  if (lib.mode === "testing") {
    const store = testingStore();
    let books: Awaited<ReturnType<NonNullable<typeof store>["books"]>> = [];
    let articleShelves: ArticleShelf[] = [];
    try {
      [books, articleShelves] = store
        ? await Promise.all([store.books(), store.articleShelves().catch(() => [] as ArticleShelf[])])
        : [[], []];
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
        categories: b.categories,
        order: b.order,
      })),
      phrases: phraseGlossary(lib),
      // The website collections' sections (articles copied by the sites' permission, private use only).
      articleShelves,
    });
  }
  return NextResponse.json({
    libraryMode: lib.mode,
    sections: listSections(lib),
    phrases: phraseGlossary(lib),
  });
}
