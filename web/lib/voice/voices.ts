/*
 * The voices a person can choose for RabbAI, from the speech service that is set up.
 *
 * ElevenLabs: the voices in the account (its stock voices, and any made with Voice Design), read
 * from its voice list and ranked so a kind, calm, older man's voice comes first. Voices cloned from
 * a particular person are left out: RabbAI's voice is never a copy of a real person's voice.
 * ELEVENLABS_VOICE_ID, when set, is the default and listed first.
 * OpenAI: its built-in voices, described by how they sound. OPENAI_TTS_VOICE, when set, is the default.
 *
 * Only names and short descriptions reach the app; never a key.
 */

import { elevenBase, type VoiceProvider } from "./provider";

export type VoiceGroup = "men" | "women" | "other";

export interface VoiceOption {
  id: string;
  name: string;
  /** A few words on how it sounds, for the choice in Settings. */
  about: string;
  group: VoiceGroup;
}

export interface VoiceList {
  voices: VoiceOption[];
  /** The voice used when the person hasn't chosen one. */
  defaultVoice: string;
}

/** One voice as ElevenLabs lists it (only the fields used here). */
export interface ElevenVoice {
  voice_id?: unknown;
  name?: unknown;
  category?: unknown;
  description?: unknown;
  labels?: unknown;
}

/** OpenAI's built-in voices. The two it recommends for quality (cedar, marin) lead each group. */
export const OPENAI_VOICES: VoiceOption[] = [
  { id: "cedar", name: "Cedar", about: "Natural, calm", group: "men" },
  { id: "ash", name: "Ash", about: "Warm, clear", group: "men" },
  { id: "onyx", name: "Onyx", about: "Deep, steady", group: "men" },
  { id: "ballad", name: "Ballad", about: "Soft, gentle", group: "men" },
  { id: "echo", name: "Echo", about: "Even, plain", group: "men" },
  { id: "verse", name: "Verse", about: "Expressive", group: "men" },
  { id: "marin", name: "Marin", about: "Natural, calm", group: "women" },
  { id: "sage", name: "Sage", about: "Calm, measured", group: "women" },
  { id: "coral", name: "Coral", about: "Warm, bright", group: "women" },
  { id: "shimmer", name: "Shimmer", about: "Soft", group: "women" },
  { id: "nova", name: "Nova", about: "Bright", group: "women" },
];

/** Kinds of ElevenLabs voices that are copies of a particular person's voice; never offered. */
const CLONED = new Set(["cloned", "professional", "famous"]);
/** How a voice sounds, in words that fit a kind teacher, and words that don't. */
const KIND = /\b(warm|calm|gentle|sooth\w*|soft|kind|comfort\w*|reassur\w*|wise|grandfather\w*|grandfatherly|trustworthy|mature|deep|rich|storytell\w*|narrat\w*|audiobook|educational|informative|balanced|smooth|relaxed|friendly)\b/g;
const UNKIND = /\b(energetic|excited|upbeat|hyped?|intense|raspy|whisper\w*|characters?|cartoon\w*|gaming|game|sassy|aggressive|news|announcer|advertis\w*|commercial|social media|playful|quirky|loud|fast)\b/g;

const MAX_PER_GROUP = 16;
const VOICE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function labelsOf(v: ElevenVoice): Record<string, string> {
  const out: Record<string, string> = {};
  if (v.labels && typeof v.labels === "object") {
    for (const [k, val] of Object.entries(v.labels as Record<string, unknown>)) if (typeof val === "string") out[k.toLowerCase()] = val.trim();
  }
  return out;
}

const AGE_WORD: Record<string, string> = { old: "Older", middle_aged: "Middle-aged", "middle aged": "Middle-aged", young: "Younger" };

const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * ElevenLabs' voices, ranked for RabbAI: men's voices first, and among them older, calmer, warmer
 * voices first. `preferred` (ELEVENLABS_VOICE_ID) leads and is the default. Pure, for tests.
 */
export function rankElevenVoices(raw: ElevenVoice[], preferred = ""): VoiceList {
  const seen = new Set<string>();
  const scored: Array<VoiceOption & { score: number }> = [];
  for (const v of raw) {
    const id = str(v.voice_id);
    if (!VOICE_ID.test(id) || seen.has(id)) continue;
    const category = str(v.category).toLowerCase();
    if (CLONED.has(category) && id !== preferred) continue;
    seen.add(id);
    const labels = labelsOf(v);
    // Stock voices are named like "Bill - Wise, Mature, Balanced": the name, then how it sounds.
    const [rawName, ...rest] = str(v.name).split(/\s+[-–—]\s+/);
    const name = rawName || "Voice";
    const words = [rest.join(" "), labels.description, labels.descriptive, labels.use_case, str(v.description)].join(" ").toLowerCase().replace(/_/g, " ");
    const gender = (labels.gender ?? "").toLowerCase();
    const group: VoiceGroup = /^(male|man)$/.test(gender) || (!gender && /\b(male|man|grandfather\w*)\b/.test(words))
      ? "men"
      : /^(female|woman)$/.test(gender) || (!gender && /\b(female|woman|grandmother\w*)\b/.test(words))
        ? "women"
        : "other";
    const age = (labels.age ?? "").toLowerCase();
    let score = age === "old" ? 4 : age.startsWith("middle") ? 2 : age === "young" ? -2 : 0;
    score += Math.min(4, (words.match(KIND) ?? []).length);
    score -= 2 * (words.match(UNKIND) ?? []).length;
    if (category === "generated") score += 1;
    if (id === preferred) score += 100;
    const about = [AGE_WORD[age], capital(labels.accent ?? ""), rest.length ? rest.join(" ") : capital(labels.description ?? "")]
      .filter(Boolean)
      .join(" · ")
      .replace(/_/g, " ")
      .slice(0, 60);
    scored.push({ id, name: name.slice(0, 40), about, group, score });
  }
  const order: VoiceGroup[] = ["men", "women", "other"];
  const voices: VoiceOption[] = [];
  for (const g of order) {
    scored
      .filter((v) => v.group === g)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, MAX_PER_GROUP)
      .forEach(({ score: _score, ...v }) => voices.push(v));
  }
  const def = (preferred && voices.find((v) => v.id === preferred)) || voices.find((v) => v.group === "men") || voices[0];
  // The chosen voice can be missing from the list (another account's, say); it is still the default.
  if (preferred && VOICE_ID.test(preferred) && !voices.some((v) => v.id === preferred)) {
    voices.unshift({ id: preferred, name: "RabbAI's voice", about: "Chosen for RabbAI", group: "men" });
    return { voices, defaultVoice: preferred };
  }
  return { voices, defaultVoice: def?.id ?? "" };
}

/** OpenAI's voices, with OPENAI_TTS_VOICE (if set) first and the default. */
export function openAiVoices(preferred = ""): VoiceList {
  const voices = [...OPENAI_VOICES];
  const p = preferred.toLowerCase();
  if (p && VOICE_ID.test(p)) {
    const i = voices.findIndex((v) => v.id === p);
    if (i > 0) voices.unshift(...voices.splice(i, 1));
    else if (i < 0) voices.unshift({ id: p, name: capital(p), about: "Chosen for RabbAI", group: "men" });
    return { voices, defaultVoice: p };
  }
  return { voices, defaultVoice: "cedar" };
}

async function fetchElevenVoices(signal: AbortSignal): Promise<ElevenVoice[]> {
  const key = process.env.ELEVENLABS_API_KEY ?? "";
  const headers = { "xi-api-key": key, Accept: "application/json" };
  const all: ElevenVoice[] = [];
  let token = "";
  // The newer list, page by page (a few pages at most).
  for (let page = 0; page < 3; page++) {
    const url = new URL(`${elevenBase()}/v2/voices`);
    url.searchParams.set("page_size", "100");
    if (token) url.searchParams.set("next_page_token", token);
    const res = await fetch(url, { headers, signal });
    if (!res.ok) break;
    const body = (await res.json()) as { voices?: unknown; has_more?: unknown; next_page_token?: unknown };
    if (Array.isArray(body.voices)) all.push(...(body.voices as ElevenVoice[]));
    token = str(body.next_page_token);
    if (body.has_more !== true || !token) break;
  }
  if (all.length) return all;
  // The older list, all at once.
  const res = await fetch(`${elevenBase()}/v1/voices`, { headers, signal });
  if (!res.ok) throw new Error(`ElevenLabs voices answered ${res.status}`);
  const body = (await res.json()) as { voices?: unknown };
  return Array.isArray(body.voices) ? (body.voices as ElevenVoice[]) : [];
}

let cache: { provider: VoiceProvider; until: number; list: Promise<VoiceList> } | null = null;

/** The voices for the service in use, kept for an hour (a few minutes when the list couldn't be read). */
export function voiceList(provider: VoiceProvider): Promise<VoiceList> {
  const now = Date.now();
  if (cache && cache.provider === provider && cache.until > now) return cache.list;
  if (provider === "openai") {
    const list = Promise.resolve(openAiVoices(process.env.OPENAI_TTS_VOICE?.trim() ?? ""));
    cache = { provider, until: now + 3_600_000, list };
    return list;
  }
  const preferred = process.env.ELEVENLABS_VOICE_ID?.trim() ?? "";
  const entry: { provider: VoiceProvider; until: number; list: Promise<VoiceList> } = {
    provider,
    until: now + 3_600_000,
    list: fetchElevenVoices(AbortSignal.timeout(10_000))
      .then((raw) => {
        const ranked = rankElevenVoices(raw, preferred);
        if (!ranked.voices.length) throw new Error("no voices listed");
        return ranked;
      })
      .catch((err) => {
        console.warn("[rabai] voice list unavailable:", err instanceof Error ? err.message.slice(0, 80) : "unknown");
        entry.until = Date.now() + 120_000;
        // Without the list, only the chosen voice (or ElevenLabs' older male narrator) can be used.
        return rankElevenVoices([{ voice_id: preferred || FALLBACK_VOICE, name: preferred ? "RabbAI's voice" : "Bill", labels: { gender: "male", age: "old" } }], preferred);
      }),
  };
  cache = entry;
  return entry.list;
}

/** ElevenLabs' stock older male narrator ("Bill"), used only when its voice list can't be read. */
export const FALLBACK_VOICE = "pqHfZKP75CvOlQylNhV4";

/** The voice to use for a request: the one asked for, if it is on the list, else the default. */
export async function chooseVoice(provider: VoiceProvider, asked: unknown): Promise<VoiceOption> {
  const list = await voiceList(provider);
  const want = typeof asked === "string" ? asked.trim() : "";
  const found = (want && list.voices.find((v) => v.id === want)) || list.voices.find((v) => v.id === list.defaultVoice) || list.voices[0];
  return found;
}

/** For tests: forget the kept list. */
export function forgetVoiceList(): void {
  cache = null;
}
