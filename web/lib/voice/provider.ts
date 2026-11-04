/*
 * RabbAI's own voice, from a speech service, when one is set up in the app's settings (Vercel):
 *
 *   ElevenLabs: ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID (an original voice made with ElevenLabs'
 *     Voice Design from a description; never a copy of a real person's voice). ELEVENLABS_MODEL
 *     picks the model (eleven_v3 by default, which reads Hebrew).
 *   OpenAI: OPENAI_API_KEY, with OPENAI_TTS_MODEL (gpt-4o-mini-tts) and OPENAI_TTS_VOICE (ash).
 *
 * RABAI_VOICE_PROVIDER chooses when both are set. With neither, the app uses the device's voices.
 * The service receives only the text being read aloud (an answer already checked and shown), never
 * the question, a picture, or anything about the person. Nothing is kept, and the text is never logged.
 */

export type VoiceProvider = "elevenlabs" | "openai";

/** How the voice should sound, for a service that takes instructions. Qualities only, never a person. */
export const VOICE_INSTRUCTIONS =
  "Voice: an older man, warm, gentle and unhurried, with the calm of a teacher who has learned for many years. " +
  "Speak naturally and kindly, like explaining an old text to a student across the table, never like an announcer. " +
  "Pause briefly between ideas. Pronounce Hebrew and Aramaic words and the names of rabbis as they are said in a " +
  "yeshiva, with the throaty 'ch' of 'Bach' where the spelling has 'kh'.";

export function voiceProvider(): VoiceProvider | null {
  const forced = process.env.RABAI_VOICE_PROVIDER?.trim().toLowerCase();
  const eleven = !!process.env.ELEVENLABS_API_KEY && !!process.env.ELEVENLABS_VOICE_ID;
  const openai = !!process.env.OPENAI_API_KEY;
  if (forced === "elevenlabs") return eleven ? "elevenlabs" : null;
  if (forced === "openai") return openai ? "openai" : null;
  if (forced === "off" || forced === "device") return null;
  if (eleven) return "elevenlabs";
  if (openai) return "openai";
  return null;
}

export const SPEAK_MAX_CHARS = 1200;

/** Speech audio (MP3) for one piece of text, from the chosen service. Throws on failure. */
export async function synthesize(provider: VoiceProvider, text: string, signal?: AbortSignal): Promise<Response> {
  const timeout = AbortSignal.timeout(30_000);
  const both = signal ? AbortSignal.any([signal, timeout]) : timeout;
  if (provider === "elevenlabs") {
    const voice = encodeURIComponent(process.env.ELEVENLABS_VOICE_ID ?? "");
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL?.trim() || "eleven_v3" }),
      signal: both,
    });
    if (!res.ok || !res.body) throw new Error(`ElevenLabs answered ${res.status}`);
    return res;
  }
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE?.trim() || "ash",
      input: text,
      instructions: VOICE_INSTRUCTIONS,
      response_format: "mp3",
    }),
    signal: both,
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI answered ${res.status}`);
  return res;
}
