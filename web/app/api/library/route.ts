import { NextResponse } from "next/server";
import { listSections, loadLibrary } from "@/lib/library";

export const runtime = "nodejs";

/** GET /api/library → every page or chapter the app can open. */
export async function GET() {
  const lib = loadLibrary();
  return NextResponse.json({ libraryMode: lib.mode, sections: listSections(lib) });
}
