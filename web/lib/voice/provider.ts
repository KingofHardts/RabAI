/*
 * RabbAI's own voice, from a speech service, when one is set up in the app's settings (Vercel):
 *
 *   ElevenLabs: ELEVENLABS_API_KEY. The person chooses among the account's voices (voices.ts); a
 *     kind, calm older man's voice is the default, or ELEVENLABS_VOICE_ID when set (for example a
 *     voice made with ElevenLabs' Voice Design from a description; never a copy of a real person's
 *     voice). ELEVENLABS_MODEL picks the model (eleven_v4 by default, falling back to eleven_v3).
 *     A conversation out loud (Talk) asks for the quick model, ELEVENLABS_TALK_MODEL
 *     (eleven_flash_v2_5 by default; "off" uses the usual model), so its first words come sooner.
 *   OpenAI: OPENAI_API_KEY, with OPENAI_TTS_MODEL (gpt-4o-mini-tts) and OPENAI_TTS_VOICE (cedar).
 *
 * RABAI_VOICE_PROVIDER chooses when both are set. With neither, the app uses the device's voices.
 * The service receives only the text being read aloud (an answer already checked and shown, and the
 * pieces just before and after it, so the voice flows from one piece to the next), never the
 * question, a picture, or anything about the person. Nothing is kept, and the text is never logged.
 */

import type { VoiceGroup } from "./voices";

export type VoiceProvider = "elevenlabs" | "openai";

/** ElevenLabs' address; ELEVENLABS_BASE_URL can point elsewhere for testing. */
export function elevenBase(): string {
  return (process.env.ELEVENLABS_BASE_URL?.trim() || "https://api.elevenlabs.io").replace(/\/+$/, "");
}

/** How the voice should sound, for a service that takes instructions. Qualities only, never a person. */
export function voiceInstructions(group: VoiceGroup = "men"): string {
  const who =
    group === "women"
      ? "an older woman, warm, gentle and unhurried"
      : group === "other"
        ? "warm, gentle and unhurried"
        : "an older man, warm, gentle and unhurried, a kind grandfatherly voice";
  return (
    `Voice: ${who}, with the calm of a teacher who has learned for many years. ` +
    "Speak naturally and kindly, the way one explains an old text to a student sitting across the table, " +
    "never like an announcer or a narrator performing. Comforting and reassuring; smile a little in the voice. " +
    "Pause briefly between ideas. Pronounce Hebrew and Aramaic words and the names of rabbis as they are said " +
    "in a yeshiva, with the throaty 'ch' of 'Bach' where the spelling has 'kh'."
  );
}

export function voiceProvider(): VoiceProvider | null {
  const forced = process.env.RABAI_VOICE_PROVIDER?.trim().toLowerCase();
  const eleven = !!process.env.ELEVENLABS_API_KEY;
  const openai = !!process.env.OPENAI_API_KEY;
  if (forced === "elevenlabs") return eleven ? "elevenlabs" : null;
  if (forced === "openai") return openai ? "openai" : null;
  if (forced === "off" || forced === "device") return null;
  if (eleven) return "elevenlabs";
  if (openai) return "openai";
  return null;
}

export const SPEAK_MAX_CHARS = 1200;
/** How much of the neighbouring pieces is sent along, so a piece starts and ends the way speech flows. */
export const SPEAK_CONTEXT_CHARS = 400;

export interface SpeakRequest {
  text: string;
  voice: string;
  group: VoiceGroup;
  /** The end of the piece before this one, and the start of the one after (may be empty). */
  previous?: string;
  next?: string;
  /** A turn in a conversation: the quick model, so the voice starts sooner. */
  fast?: boolean;
  signal?: AbortSignal;
}

/** The ElevenLabs model, and which of its options it took, once a request has worked. */
type ElevenTry = { model: string; settings: boolean; stitch: boolean; fast?: boolean };
let elevenWorks: ElevenTry | null = null;
let elevenFastWorks: ElevenTry | null = null;

/** The quick model for a conversation's turns, or null to use the usual one. */
export function elevenTalkModel(): string | null {
  const m = process.env.ELEVENLABS_TALK_MODEL?.trim() || "eleven_flash_v2_5";
  return m.toLowerCase() === "off" ? null : m;
}

/** The quick model first (with and without its options), then the usual ones. */
function elevenFastTries(): ElevenTry[] {
  const model = elevenTalkModel();
  if (!model) return elevenTries();
  const fast: ElevenTry[] = [
    { model, settings: true, stitch: !NO_STITCH.test(model), fast: true },
    { model, settings: false, stitch: false, fast: true },
  ];
  const known = elevenFastWorks;
  const ordered = known ? [known, ...fast.filter((t) => t.settings !== known.settings || t.stitch !== known.stitch || t.model !== known.model)] : fast;
  return [...ordered, ...elevenTries()];
}

/** Models that don't take the text around a piece (request stitching). */
const NO_STITCH = /^eleven_v3/;

function elevenTries(): ElevenTry[] {
  const model = process.env.ELEVENLABS_MODEL?.trim() || "eleven_v4";
  const tries: ElevenTry[] = [
    { model, settings: true, stitch: !NO_STITCH.test(model) },
    { model, settings: false, stitch: false },
  ];
  if (model !== "eleven_v3") tries.push({ model: "eleven_v3", settings: true, stitch: false }, { model: "eleven_v3", settings: false, stitch: false });
  return elevenWorks ? [elevenWorks, ...tries.filter((t) => t.model !== elevenWorks?.model || t.settings !== elevenWorks?.settings || t.stitch !== elevenWorks?.stitch)] : tries;
}

/**
 * Voice settings for a calm, natural reading. The newer models take stability and similarity only;
 * the older ones also take style, speed and speaker boost. A middle stability keeps the voice
 * natural and varied without wandering.
 */
function elevenSettings(model: string, fast = false): Record<string, number | boolean> {
  if (/^eleven_v[34]/.test(model)) return { stability: 0.5, similarity_boost: 0.75 };
  // In a conversation, a touch quicker than reading an answer, still unhurried.
  return { stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true, speed: fast ? 0.98 : 0.94 };
}

/** Speech audio (MP3) for one piece of text, from the chosen service. Throws on failure. */
export async function synthesize(provider: VoiceProvider, req: SpeakRequest): Promise<Response> {
  const timeout = AbortSignal.timeout(30_000);
  const both = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
  if (provider === "elevenlabs") {
    const voice = encodeURIComponent(req.voice);
    let last = 0;
    for (const t of req.fast ? elevenFastTries() : elevenTries()) {
      const body: Record<string, unknown> = { text: req.text, model_id: t.model };
      if (t.settings) body.voice_settings = elevenSettings(t.model, t.fast);
      if (t.stitch && req.previous) body.previous_text = req.previous;
      if (t.stitch && req.next) body.next_text = req.next;
      // A conversation's turn is streamed, so the first audio leaves the service as soon as it is made.
      const path = t.fast ? `${voice}/stream` : voice;
      const res = await fetch(`${elevenBase()}/v1/text-to-speech/${path}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify(body),
        signal: both,
      });
      if (res.ok && res.body) {
        if (t.fast) elevenFastWorks = t;
        else elevenWorks = t;
        return res;
      }
      last = res.status;
      // Only a request the service couldn't accept is tried again in a simpler form.
      if (![400, 404, 422].includes(res.status)) break;
      if (elevenWorks && elevenWorks.model === t.model && elevenWorks.settings === t.settings && elevenWorks.stitch === t.stitch) elevenWorks = null;
      if (t.fast && elevenFastWorks && elevenFastWorks.settings === t.settings && elevenFastWorks.stitch === t.stitch) elevenFastWorks = null;
    }
    throw new Error(`ElevenLabs answered ${last}`);
  }
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
      voice: req.voice,
      input: req.text,
      instructions: voiceInstructions(req.group),
      response_format: "mp3",
    }),
    signal: both,
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI answered ${res.status}`);
  return res;
}
