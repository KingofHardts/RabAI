import { NextResponse } from "next/server";
import { libraryMode } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { amudRef, parseAmud, plainText } from "@/lib/library/daf";
import { anthropicClient } from "@/lib/engine/answer";
import { outlineDaf, type OutlineLine } from "@/lib/engine/outline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Outlines made on this server instance, so a page is not outlined twice. */
const made = new Map<string, { lines: OutlineLine[]; model?: string }>();
const MAX_KEPT = 200;

/**
 * POST /api/daf/outline {"ref": "Berakhot 2a"} → RabAI's outline of the amud: what each line of
 * the Gemara does. Called only when the person asks to see the flow.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON: {\"ref\": \"Berakhot 2a\"}" }, { status: 400 });
  }
  const at = parseAmud(String((body as { ref?: unknown })?.ref ?? "").slice(0, 120));
  if (!at) return NextResponse.json({ error: "Which page?" }, { status: 400 });
  const section = amudRef(at);

  const kept = made.get(section);
  if (kept) return NextResponse.json({ section, ...kept });

  if (libraryMode() !== "testing") return NextResponse.json({ error: "The page view needs the full library." }, { status: 404 });
  const store = testingStore();
  if (!store) return NextResponse.json({ error: "The library isn't connected right now." }, { status: 503 });
  const client = anthropicClient();
  if (!client) return NextResponse.json({ error: "This build isn't connected to its AI model yet." }, { status: 503 });

  try {
    const found = await store.daf(section);
    if (!found) return NextResponse.json({ error: `${section} isn't in the library.` }, { status: 404 });
    const result = await outlineDaf(
      found.main.map((p) => ({ ref: p.ref, he: plainText(p.he), en: plainText(p.en) })),
      client,
    );
    if (!result.lines.length) return NextResponse.json({ error: "RabAI couldn't outline this page just now. Please try again." }, { status: 502 });
    if (made.size >= MAX_KEPT) made.delete(made.keys().next().value!);
    made.set(section, result);
    return NextResponse.json({ section, ...result });
  } catch (err) {
    console.error("[rabai] outline failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "RabAI couldn't outline this page just now. Please try again." }, { status: 502 });
  }
}
