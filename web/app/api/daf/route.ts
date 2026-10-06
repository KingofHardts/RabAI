import { NextResponse } from "next/server";
import { libraryMode } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { TESTING_LABEL } from "@/lib/library/testing-config";
import { amudLabelHe, amudRef, commentBase, nextAmud, parseAmud, plainText, prevAmud, type DafData, type DafPiece } from "@/lib/library/daf";
import type { Passage } from "@/lib/library/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const piece = (p: Passage, comment: boolean): DafPiece => ({
  ref: p.ref,
  he: plainText(p.he),
  en: plainText(p.en),
  ...(comment ? { on: commentBase(p.ref) } : {}),
});

const edition = (list: Passage[]) => list[0]?.source?.heEdition ?? "";

/**
 * GET /api/daf?ref=Berakhot 2a → one amud of the Bavli with the Rashi and Tosafot printed on it,
 * for the page view. Only the testing library has the full Shas.
 */
export async function GET(request: Request) {
  const raw = (new URL(request.url).searchParams.get("ref") ?? "").slice(0, 120);
  const at = parseAmud(raw);
  if (!at) return NextResponse.json({ error: "Which page? For example ?ref=Berakhot 2a" }, { status: 400 });

  if (libraryMode() !== "testing") {
    return NextResponse.json({ error: "The printed-page view needs the full library, which this build doesn't have." }, { status: 404 });
  }
  const store = testingStore();
  if (!store) return NextResponse.json({ error: "The library isn't connected right now." }, { status: 503 });

  const section = amudRef(at);
  let found: Awaited<ReturnType<typeof store.daf>>;
  try {
    found = await store.daf(section);
  } catch (err) {
    console.error("[rabai] daf lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The library couldn't open that page just now." }, { status: 502 });
  }
  if (!found) return NextResponse.json({ error: `${section} isn't in the library.` }, { status: 404 });

  const tractateHe = found.main[0].source?.bookHe ?? at.tractate;
  const prev = prevAmud(at);
  const data: DafData = {
    section,
    tractate: at.tractate,
    tractateHe,
    daf: at.daf,
    amud: at.amud,
    labelHe: amudLabelHe(tractateHe, at),
    prev: prev ? amudRef(prev) : null,
    next: amudRef(nextAmud(at)),
    main: found.main.map((p) => piece(p, false)),
    rashi: found.rashi.map((p) => piece(p, true)),
    tosafot: found.tosafot.map((p) => piece(p, true)),
    editions: {
      main: edition(found.main),
      mainEnglish: found.main.find((p) => p.en)?.source?.enEdition ?? "",
      rashi: edition(found.rashi),
      tosafot: edition(found.tosafot),
    },
    libraryLabel: TESTING_LABEL,
  };
  return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=600" } });
}
