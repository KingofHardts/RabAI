import { NextResponse } from "next/server";
import { SPEAK_MAX_CHARS, synthesize, voiceProvider } from "@/lib/voice/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether RabbAI's own voice is set up (otherwise the app uses the device's voices). */
export async function GET() {
  return NextResponse.json({ available: !!voiceProvider() }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * {"text": "..."} → MP3 audio of one piece of an answer, already prepared for speech on the device
 * (lib/voice/speech-text.ts). Only the text is sent to the speech service; nothing is kept or logged.
 */
export async function POST(request: Request) {
  const provider = voiceProvider();
  if (!provider) return NextResponse.json({ error: "RabbAI's voice isn't set up; the device's voice is used." }, { status: 404 });
  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text === "string") text = body.text.trim();
  } catch {
    /* no body */
  }
  if (!text) return NextResponse.json({ error: "Nothing to read." }, { status: 400 });
  if (text.length > SPEAK_MAX_CHARS) return NextResponse.json({ error: "Too long to read in one piece." }, { status: 413 });
  try {
    const audio = await synthesize(provider, text, request.signal);
    return new Response(audio.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    // The reason only (a status code), never the text.
    console.warn("[rabai] speech failed:", err instanceof Error ? err.message.slice(0, 80) : "unknown");
    return NextResponse.json({ error: "RabbAI's voice couldn't be reached just now." }, { status: 502 });
  }
}
