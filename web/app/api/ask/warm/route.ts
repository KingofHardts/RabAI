import { after, NextResponse } from "next/server";
import { libraryMode } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { warmCaches, shouldWarm, type WarmKind } from "@/lib/engine/warm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * {"kind": "talk" | "ask"} → warms RabbAI's caches in the background (lib/engine/warm.ts), so the
 * person's first question is quick. Sent when they start Talk or a chavrusa session, or begin to
 * type. Nothing about the person is sent or kept.
 */
export async function POST(request: Request) {
  let kind: WarmKind = "ask";
  try {
    const body = (await request.json()) as { kind?: unknown };
    if (body.kind === "talk") kind = "talk";
  } catch {
    /* no body: an ordinary question */
  }
  if (!process.env.ANTHROPIC_API_KEY || !shouldWarm(kind)) return NextResponse.json({ warming: false }, { headers: { "Cache-Control": "no-store" } });
  const store = libraryMode() === "testing" ? testingStore() : null;
  after(() => warmCaches(kind, store).then(() => undefined));
  return NextResponse.json({ warming: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
