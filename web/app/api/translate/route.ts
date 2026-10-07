import { NextResponse } from "next/server";
import { libraryMode } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { plainText } from "@/lib/library/daf";
import { anthropicClient } from "@/lib/engine/answer";
import { translatePassage } from "@/lib/engine/translate";
import type { Translation } from "@/lib/engine/gloss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Translations made on this server instance, so a passage is not translated twice. */
const made = new Map<string, Translation>();
const MAX_KEPT = 300;

const FAILED = "RabAI couldn't translate this just now. Please try again.";

/**
 * POST /api/translate {"ref": "Rashi on Berakhot 2a:1:1", "context": ["Berakhot 2a:1"]} →
 * RabAI's translation of the passage: a general translation when the library has no English, and
 * word by word. Called only when the person taps Translate. `context` names up to two passages
 * (the line a comment explains, or the line before) that are sent along to read it in context.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send JSON: {"ref": "Berakhot 2a:1"}' }, { status: 400 });
  }
  const ref = String((body as { ref?: unknown })?.ref ?? "").trim().slice(0, 160);
  if (!ref) return NextResponse.json({ error: "Which passage?" }, { status: 400 });
  const rawContext = (body as { context?: unknown })?.context;
  const context = (Array.isArray(rawContext) ? rawContext : [])
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0 && r !== ref)
    .map((r) => r.trim().slice(0, 160))
    .slice(0, 2);

  const kept = made.get(ref);
  if (kept) return NextResponse.json(kept);

  if (libraryMode() !== "testing") return NextResponse.json({ error: "Translating needs the full library." }, { status: 404 });
  const store = testingStore();
  if (!store) return NextResponse.json({ error: "The library isn't connected right now." }, { status: 503 });
  const client = anthropicClient();
  if (!client) return NextResponse.json({ error: "This build isn't connected to its AI model yet." }, { status: 503 });

  try {
    const found = await store.exact([ref, ...context]);
    const passage = found.find((p) => p.ref === ref);
    const he = passage ? plainText(passage.he) : "";
    if (!passage || !he) return NextResponse.json({ error: `${ref} isn't in the library.` }, { status: 404 });
    const result = await translatePassage(
      {
        ref,
        he,
        en: plainText(passage.en),
        context: context
          .map((r) => found.find((p) => p.ref === r))
          .filter((p) => p !== undefined)
          .map((p) => ({ ref: p.ref, he: plainText(p.he), en: plainText(p.en) })),
      },
      client,
    );
    if (made.size >= MAX_KEPT) made.delete(made.keys().next().value!);
    made.set(ref, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rabai] translation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: FAILED }, { status: 502 });
  }
}
