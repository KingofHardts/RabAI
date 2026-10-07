import { NextResponse } from "next/server";
import { listSections, loadLibrary } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";

export const runtime = "nodejs";

/**
 * GET /api/contents?book=Berakhot → the book's pages or chapters in order, for the reader's table
 * of contents and a book's page in the library.
 */
export async function GET(request: Request) {
  const book = (new URL(request.url).searchParams.get("book") ?? "").trim().slice(0, 160);
  if (!book) return NextResponse.json({ error: "Which book? Pass ?book=" }, { status: 400 });
  const lib = loadLibrary();
  if (lib.mode !== "testing") {
    const sections = listSections(lib)
      .filter((s) => s.workTitle === book || s.section.startsWith(`${book} `))
      .map((s) => s.section);
    return NextResponse.json({ book, sections });
  }
  const store = testingStore();
  if (!store) return NextResponse.json({ error: "The library isn't connected right now." }, { status: 503 });
  try {
    const sections = await store.contents(book);
    return NextResponse.json({ book, sections }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    console.error("[rabai] contents lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The library couldn't list this book just now." }, { status: 502 });
  }
}
