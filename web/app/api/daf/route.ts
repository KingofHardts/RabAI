import { NextResponse } from "next/server";
import { libraryMode } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { TESTING_LABEL } from "@/lib/library/testing-config";
import {
  amudLabelHe,
  amudRef,
  commentBase,
  nextAmud,
  parseAmud,
  plainText,
  prevAmud,
  printedRefs,
  readPrinted,
  type DafData,
  type DafPart,
  type DafPiece,
  type DafPrinted,
} from "@/lib/library/daf";
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

const partOf = (ref: string): DafPart => (ref.startsWith("Rashi on ") ? "rashi" : ref.startsWith("Tosafot on ") ? "tosafot" : "main");

/**
 * The printed lines of this amud, when the library has a layout for it that still fits its text.
 * Anything wrong (no layout, an incomplete one, text that changed since) means the page is laid out
 * the other way, never shown with words in the wrong places.
 */
async function printedLayout(
  store: NonNullable<ReturnType<typeof testingStore>>,
  section: string,
  own: Array<DafPiece & { part: DafPart }>,
): Promise<DafPrinted | undefined> {
  try {
    const record = await store.dafLayout(section);
    if (!record) return undefined;
    const pieces = new Map(own.map((p) => [p.ref, p]));
    const missing = printedRefs(record).filter((r) => !pieces.has(r));
    const extra: DafPrinted["extra"] = [];
    if (missing.length) {
      for (const p of await store.exact(missing)) {
        const x = { ...piece(p, partOf(p.ref) !== "main"), part: partOf(p.ref) };
        pieces.set(x.ref, x);
        extra.push(x);
      }
    }
    const read = readPrinted(record, pieces, section);
    return read ? { ...read, extra } : undefined;
  } catch (err) {
    console.error("[rabai] printed layout failed:", err instanceof Error ? err.message : err);
    return undefined;
  }
}

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
  const main = found.main.map((p) => piece(p, false));
  const rashi = found.rashi.map((p) => piece(p, true));
  const tosafot = found.tosafot.map((p) => piece(p, true));
  const printed = await printedLayout(store, section, [
    ...main.map((p) => ({ ...p, part: "main" as const })),
    ...rashi.map((p) => ({ ...p, part: "rashi" as const })),
    ...tosafot.map((p) => ({ ...p, part: "tosafot" as const })),
  ]);
  const data: DafData = {
    section,
    tractate: at.tractate,
    tractateHe,
    daf: at.daf,
    amud: at.amud,
    labelHe: amudLabelHe(tractateHe, at),
    prev: prev ? amudRef(prev) : null,
    next: amudRef(nextAmud(at)),
    main,
    rashi,
    tosafot,
    editions: {
      main: edition(found.main),
      mainEnglish: found.main.find((p) => p.en)?.source?.enEdition ?? "",
      rashi: edition(found.rashi),
      tosafot: edition(found.tosafot),
    },
    libraryLabel: TESTING_LABEL,
    ...(printed ? { printed } : {}),
  };
  return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=600" } });
}
