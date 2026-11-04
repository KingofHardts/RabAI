import { NextResponse } from "next/server";
import { SPEAK_CONTEXT_CHARS, SPEAK_MAX_CHARS, synthesize, voiceProvider } from "@/lib/voice/provider";
import { chooseVoice, voiceList } from "@/lib/voice/voices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whether RabbAI's own voice is set up (otherwise the app uses the device's voices), and the voices
 * a person can choose from: names and a few words on how each sounds, never a key.
 */
export async function GET() {
  const provider = voiceProvider();
  if (!provider) return NextResponse.json({ available: false, voices: [], defaultVoice: "" }, { headers: { "Cache-Control": "no-store" } });
  const list = await voiceList(provider);
  return NextResponse.json({ available: true, ...list }, { headers: { "Cache-Control": "no-store" } });
}

/** A string from the request, cut to `max` characters (from its end when `end` is set). */
const text = (v: unknown, max: number, end = false) => (typeof v !== "string" ? "" : end ? v.trim().slice(-max) : v.trim().slice(0, max));

/**
 * {"text": "...", "voice"?: id, "previous"?: "...", "next"?: "..."} → MP3 audio of one piece of an
 * answer, already prepared for speech on the device (lib/voice/speech-text.ts). "previous" and "next"
 * are the end of the piece before and the start of the piece after, so the voice flows across the
 * pieces. Only these words are sent to the speech service; nothing is kept or logged.
 */
export async function POST(request: Request) {
  const provider = voiceProvider();
  if (!provider) return NextResponse.json({ error: "RabbAI's voice isn't set up; the device's voice is used." }, { status: 404 });
  let body: { text?: unknown; voice?: unknown; previous?: unknown; next?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* no body */
  }
  const piece = typeof body.text === "string" ? body.text.trim() : "";
  if (!piece) return NextResponse.json({ error: "Nothing to read." }, { status: 400 });
  if (piece.length > SPEAK_MAX_CHARS) return NextResponse.json({ error: "Too long to read in one piece." }, { status: 413 });
  try {
    const voice = await chooseVoice(provider, body.voice);
    if (!voice) return NextResponse.json({ error: "No voice is available just now." }, { status: 502 });
    const audio = await synthesize(provider, {
      text: piece,
      voice: voice.id,
      group: voice.group,
      previous: text(body.previous, SPEAK_CONTEXT_CHARS, true),
      next: text(body.next, SPEAK_CONTEXT_CHARS),
      signal: request.signal,
    });
    return new Response(audio.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    // The reason only (a status code), never the text.
    console.warn("[rabai] speech failed:", err instanceof Error ? err.message.slice(0, 80) : "unknown");
    return NextResponse.json({ error: "RabbAI's voice couldn't be reached just now." }, { status: 502 });
  }
}
