import { NextResponse } from "next/server";
import { loadLibrary } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { ordinaryCase } from "@/lib/siddur/lines";

export const runtime = "nodejs";

/**
 * GET /api/siddur/headings?book=… → the headings printed inside a siddur's sections, each with the
 * line it opens ("Blessing After Food -- Al HaMiḥya" inside Birkat HaMazon), so the Daven tab's
 * search finds a prayer that is not a section of its own. Names only, from the library.
 */
export async function GET(request: Request) {
  const book = (new URL(request.url).searchParams.get("book") ?? "").trim().slice(0, 160);
  if (!book) return NextResponse.json({ error: "Which siddur? Pass ?book=" }, { status: 400 });
  if (loadLibrary().mode !== "testing") return NextResponse.json({ book, headings: [] });
  const store = testingStore();
  if (!store) return NextResponse.json({ error: "The library isn't connected right now." }, { status: 503 });
  try {
    const found = await store.headings(book);
    const headings = found.map((h) => ({ ref: h.ref, en: ordinaryCase(h.en), he: h.he }));
    return NextResponse.json({ book, headings }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    console.error("[rabai] siddur headings lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The siddur's headings couldn't be read just now." }, { status: 502 });
  }
}
