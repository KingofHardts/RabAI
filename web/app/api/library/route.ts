import { NextResponse } from "next/server";
import { listSections, loadLibrary } from "@/lib/library";
import { phraseGlossary } from "@/lib/library/word-study";

export const runtime = "nodejs";

/** GET /api/library → every page or chapter the app can open, and the Gemara's key words. */
export async function GET() {
  const lib = loadLibrary();
  return NextResponse.json({
    libraryMode: lib.mode,
    sections: listSections(lib),
    phrases: phraseGlossary(lib),
  });
}
