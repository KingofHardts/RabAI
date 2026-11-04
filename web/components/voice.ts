"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { namesForLearning, speechChunks, speechText } from "@/lib/voice/speech-text";
import { respell } from "@/lib/voice/lexicon";
import type { Pronunciation } from "@/lib/siddur/translit";

/*
 * Talking with RabbAI: the browser's own speech recognition for the microphone, and a voice for
 * reading answers aloud. That voice is RabbAI's own (a speech service, through /api/speak) when the
 * app has one set up, and the device's voices otherwise. Only the text being read is sent to the
 * speech service; what the microphone hears stays in the browser, and nothing is recorded.
 *
 * Lessons built in (from building voice typing before):
 * - stop() lets the browser finish the last words; cancel() throws them away. Sending a question
 *   or typing over it must cancel, or late words land in a box that was just emptied.
 * - Every session has a number, and anything that arrives from an older session is ignored.
 * - Some browsers never report that listening ended, so stop() has a watchdog.
 * - Words are added up from each result as it becomes final, because some phones forget the
 *   earlier results after a pause.
 * - What was heard goes into the text box. The person reads it and presses Ask themselves.
 *   (Talk, a conversation out loud that the person turns on, is in components/talk.ts.)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

export function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The longest a single listening session runs before it stops by itself. */
const MAX_LISTEN_MS = 90_000;
/** How long to wait for the browser to report the end after stop(). */
const END_WATCHDOG_MS = 3_000;

export type DictationState = "idle" | "listening";

export function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<DictationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const session = useRef(0);
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
  }, []);

  const clearCap = () => {
    if (capTimer.current) clearTimeout(capTimer.current);
    capTimer.current = null;
  };

  /** Stop listening and throw away anything not yet written into the box. */
  const cancel = useCallback(() => {
    session.current += 1;
    clearCap();
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
    setState("idle");
  }, []);

  /** Stop listening, keeping the last words the browser is still finishing. */
  const stop = useCallback(() => {
    clearCap();
    const rec = recRef.current;
    if (!rec) {
      setState("idle");
      return;
    }
    const mine = session.current;
    try {
      rec.stop();
    } catch {
      cancel();
      return;
    }
    setTimeout(() => {
      if (session.current === mine && recRef.current === rec) cancel();
    }, END_WATCHDOG_MS);
  }, [cancel]);

  /** Start listening. `base` is what is already in the box; new words are added after it. */
  const start = useCallback(
    (base: string) => {
      const Ctor = recognitionCtor();
      if (!Ctor) return;
      cancel();
      const mine = ++session.current;
      const rec: Recognition = new Ctor();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      const prefix = base.trim() ? `${base.trimEnd()} ` : "";
      let finals = "";
      rec.onresult = (e: any) => {
        if (session.current !== mine) return;
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finals += `${r[0].transcript} `;
          else interim += r[0].transcript;
        }
        onTextRef.current(`${prefix}${finals}${interim}`.replace(/\s+/g, " ").trimStart());
      };
      rec.onerror = (e: any) => {
        if (session.current !== mine) return;
        const code = String(e?.error ?? "");
        if (code === "not-allowed" || code === "service-not-allowed") {
          setError("RabbAI needs permission to use your microphone. You can allow it in your browser's settings.");
        } else if (code === "no-speech") {
          setError("I didn't hear anything. Tap the microphone and try again.");
        } else if (code === "audio-capture") {
          setError("No microphone was found.");
        } else if (code === "network") {
          setError("Voice typing needs an internet connection.");
        } else if (code !== "aborted") {
          setError("The microphone stopped. Please try again, or type your question.");
        }
      };
      rec.onend = () => {
        if (session.current !== mine) return;
        clearCap();
        recRef.current = null;
        setState("idle");
      };

      recRef.current = rec;
      setError(null);
      setState("listening");
      try {
        rec.start();
        capTimer.current = setTimeout(() => {
          if (session.current === mine) stop();
        }, MAX_LISTEN_MS);
      } catch {
        recRef.current = null;
        setState("idle");
        setError("The microphone couldn't start. Please try again, or type your question.");
      }
    },
    [cancel, stop],
  );

  useEffect(
    () => () => {
      session.current += 1;
      clearCap();
      try {
        recRef.current?.abort();
      } catch {
        /* nothing to stop */
      }
    },
    [],
  );

  return { supported, state, error, start, stop, cancel, clearError: () => setError(null) };
}

// ---------------------------------------------------------------------------
// Reading answers aloud

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

const HEBREW = /[֐-׿]/;
/** A run of Hebrew script, with the spaces and punctuation inside it. */
const HEBREW_RUN = /[֐-׿][֐-׿\s"'״׳־,.:;]*[֐-׿]|[֐-׿]/g;

/** Male voice names on the common devices, for the warm older voice RabbAI aims for. */
const MALE = /\b(male|daniel|arthur|aaron|alex|tom|evan|nathan|gordon|oliver|rishi|lee|thomas|james|guy|andrew|brian|christopher|eric|roger|steffan|davis|tony|jason|ryan|william|liam|connor|mitchell|george|david|mark|avri|asaf)\b/;
const FEMALE = /\b(female|samantha|ava|jenny|karen|moira|tessa|victoria|susan|zira|aria|emma|michelle|sonia|libby|serena|allison|joanna|kate|carmit|hila|catherine|fiona|kathy)\b/;

/** Higher is better: natural-sounding voices first, and among them a man's voice. */
function voiceScore(v: SpeechSynthesisVoice, lang: "en" | "he"): number {
  const name = v.name.toLowerCase();
  const tag = v.lang.toLowerCase();
  const gender = MALE.test(name) ? 2 : FEMALE.test(name) ? -1 : 0;
  if (lang === "he") return tag.startsWith("he") || tag.startsWith("iw") ? 10 + (/enhanced|premium|natural/.test(name) ? 2 : 0) + gender : -1;
  if (!tag.startsWith("en")) return -1;
  let score = 0;
  if (/natural|neural|online/.test(name)) score += 4;
  if (/enhanced|premium/.test(name)) score += 3;
  if (/google/.test(name)) score += 1;
  score += gender;
  if (tag === "en-us") score += 1;
  else if (tag === "en-gb") score += 0.5;
  // Novelty and robotic voices (Apple's Eloquence voices among them) are never chosen on their own.
  if (/novelty|whisper|bad news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|wobble|zarvox|albert|fred|junior|ralph|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley/.test(name)) score -= 10;
  return score;
}

/** The voice chosen in Settings: empty for the best available (RabbAI's own, when set up), DEVICE_BEST for the device's best, or a device voice's name. */
let preferredVoice = "";
export const DEVICE_BEST = "device";
export function setPreferredVoice(name: string): void {
  preferredVoice = name;
}

/** How Hebrew written with vowels is said: Israeli (Sephardi) or Ashkenazi. */
let hebrewSay: Pronunciation = "sephardi";
export function setHebrewPronunciation(p: Pronunciation): void {
  hebrewSay = p;
}

/** Whether RabbAI's own voice is set up on the server (checked once). */
let ownVoice: Promise<boolean> | null = null;
export function ownVoiceAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  ownVoice ??= fetch("/api/speak")
    .then((r) => (r.ok ? (r.json() as Promise<{ available?: boolean }>) : { available: false }))
    .then((j) => !!j.available)
    .catch(() => {
      ownVoice = null;
      return false;
    });
  return ownVoice;
}

/** The device's English voices, best first, for the choice in Settings. */
export function englishVoices(): Array<{ name: string; lang: string }> {
  if (!canSpeak()) return [];
  return window.speechSynthesis
    .getVoices()
    .map((v) => ({ v, score: voiceScore(v, "en") }))
    .filter((x) => x.score > -1)
    .sort((a, b) => b.score - a.score || a.v.name.localeCompare(b.v.name))
    .map(({ v }) => ({ name: v.name, lang: v.lang }));
}

function bestVoice(lang: "en" | "he"): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (lang === "en" && preferredVoice && preferredVoice !== DEVICE_BEST) {
    const chosen = voices.find((v) => v.name === preferredVoice);
    if (chosen) return chosen;
  }
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = voiceScore(v, lang);
    if (s > bestScore) {
      best = v;
      bestScore = s;
    }
  }
  return bestScore >= 0 ? best : null;
}

/** Split an answer into short pieces, keeping Hebrew apart so it can get a Hebrew voice. */
export function speechPieces(text: string): Array<{ text: string; lang: "en" | "he" }> {
  const pieces: Array<{ text: string; lang: "en" | "he" }> = [];
  const push = (t: string, lang: "en" | "he") => {
    const clean = t.replace(/\s+/g, " ").trim();
    if (clean && /[\p{L}\p{N}]/u.test(clean)) pieces.push({ text: clean, lang });
  };
  for (const para of text.split(/\n+/)) {
    let last = 0;
    for (const m of para.matchAll(HEBREW_RUN)) {
      pushSentences(para.slice(last, m.index), push);
      push(m[0], "he");
      last = (m.index ?? 0) + m[0].length;
    }
    pushSentences(para.slice(last), push);
  }
  return pieces;
}

function pushSentences(text: string, push: (t: string, lang: "en" | "he") => void) {
  // Short pieces: some browsers stop reading a long one partway through.
  let chunk = "";
  // (No lookbehind in this pattern: older iPhones can't read it, and the page would not load.)
  for (const sentence of (text.match(/[^.!?;]+[.!?;]*\s*|[.!?;]+\s*/g) ?? []).map((t) => t.trim())) {
    if (chunk && chunk.length + sentence.length > 220) {
      push(chunk, "en");
      chunk = "";
    }
    chunk = chunk ? `${chunk} ${sentence}` : sentence;
  }
  push(chunk, "en");
}

let speakingToken = 0;

/** How fast answers are read aloud, chosen in Settings (1 is the usual pace). */
let speechRate = 1;
export const SPEECH_RATES = [0.8, 1, 1.2] as const;
export function setSpeechRate(rate: number): void {
  speechRate = SPEECH_RATES.includes(rate as (typeof SPEECH_RATES)[number]) ? rate : 1;
}

/** Whether the device has a Hebrew voice (so a word can be heard). */
export function hasHebrewVoice(): boolean {
  return canSpeak() && !!bestVoice("he");
}

/** Say one Hebrew word or phrase slowly, with the device's Hebrew voice. */
export function speakHebrew(text: string): void {
  const voice = canSpeak() ? bestVoice("he") : null;
  if (!voice) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  speakingToken += 1;
  const u = new SpeechSynthesisUtterance(namesForLearning(text, true));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.75 * speechRate;
  synth.speak(u);
}

// ---- RabbAI's own voice: audio from /api/speak, played piece by piece ----

/** A moment of silence, played inside a tap so a phone lets this page play audio later. */
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
let player: HTMLAudioElement | null = null;
let fetches: AbortController | null = null;
let stopPlaying: (() => void) | null = null;

function audioPlayer(): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  player ??= new Audio();
  return player;
}

function primeAudio(): void {
  const a = audioPlayer();
  if (!a || !a.paused) return;
  try {
    a.src = SILENT_WAV;
    void a.play().catch(() => undefined);
  } catch {
    /* audio is simply not available */
  }
}

/** Plays one piece; true when it played to the end (or was stopped on purpose), false when it couldn't play. */
function playUrl(url: string, mine: number): Promise<boolean> {
  const a = audioPlayer();
  if (!a) return Promise.resolve(false);
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      a.onended = null;
      a.onerror = null;
      stopPlaying = null;
      resolve(ok);
    };
    stopPlaying = () => {
      a.pause();
      done(true);
    };
    a.onended = () => done(true);
    a.onerror = () => done(false);
    a.src = url;
    a.playbackRate = speechRate;
    a.play().catch(() => done(mine !== speakingToken));
  });
}

/**
 * Reads text in RabbAI's own voice. Returns false if nothing could be played (so the device's
 * voice takes over); if a later piece fails, the device's voice reads the rest.
 */
async function speakOwn(text: string, mine: number, finish: () => void): Promise<boolean> {
  const chunks = speechChunks(speechText(text, hebrewSay));
  if (!chunks.length) {
    finish();
    return true;
  }
  const ctrl = new AbortController();
  fetches = ctrl;
  const audioFor = (piece: string) =>
    fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: piece }), signal: ctrl.signal }).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.blob();
    });
  let next = audioFor(chunks[0]);
  for (let i = 0; i < chunks.length; i++) {
    let blob: Blob;
    try {
      blob = await next;
    } catch {
      if (mine !== speakingToken) return true;
      if (i === 0) return false;
      speakDevice(chunks.slice(i).join(" "), mine, finish);
      return true;
    }
    if (mine !== speakingToken) return true;
    // Fetch the next piece while this one plays, so there is no gap between them.
    if (i + 1 < chunks.length) {
      next = audioFor(chunks[i + 1]);
      next.catch(() => undefined);
    }
    const url = URL.createObjectURL(blob);
    const played = await playUrl(url, mine);
    URL.revokeObjectURL(url);
    if (mine !== speakingToken) return true;
    if (!played) {
      if (i === 0) return false;
      speakDevice(chunks.slice(i).join(" "), mine, finish);
      return true;
    }
  }
  finish();
  return true;
}

/** Reads text with the device's own voices: Hebrew with a Hebrew voice, or in English letters when there is none. */
function speakDevice(text: string, mine: number, finish: () => void): void {
  if (!canSpeak()) {
    finish();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const english = bestVoice("en");
  const hebrew = bestVoice("he");
  const pieces = speechPieces(namesForLearning(text))
    .map((p) => (p.lang === "he" && !hebrew ? { text: speechText(p.text, hebrewSay), lang: "en" as const } : p))
    .filter((p) => p.lang === "en" ? !/[\u0590-\u05FF]/.test(p.text) || !!hebrew : !!hebrew);
  if (!pieces.length || mine !== speakingToken) {
    finish();
    return;
  }
  pieces.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.lang === "en" ? respell(p.text) : p.text);
    const voice = p.lang === "he" ? hebrew : english;
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (p.lang === "he" ? "he-IL" : "en-US");
    // A little slower and lower than the device's usual, for a calmer voice.
    u.rate = (p.lang === "he" ? 0.85 : 0.92) * speechRate;
    u.pitch = 0.95;
    if (i === pieces.length - 1) {
      u.onend = finish;
      u.onerror = finish;
    }
    synth.speak(u);
  });
}

/**
 * Read text aloud: in RabbAI's own voice when it is set up (and not turned off in Settings), else
 * with the device's voices. Calls onEnd once, when the reading ends or is stopped by another.
 */
export function speak(text: string, onEnd?: () => void): void {
  stopSpeaking();
  const mine = speakingToken;
  let finished = false;
  const finish = () => {
    if (finished || mine !== speakingToken) return;
    finished = true;
    onEnd?.();
  };
  if (preferredVoice) {
    speakDevice(text, mine, finish);
    return;
  }
  // Inside a tap, this lets the audio play once it arrives (phones require a tap first).
  primeAudio();
  void ownVoiceAvailable().then(async (own) => {
    if (mine !== speakingToken) return;
    if (own && (await speakOwn(text, mine, finish))) return;
    if (mine === speakingToken) speakDevice(text, mine, finish);
  });
}

export function stopSpeaking(): void {
  speakingToken += 1;
  fetches?.abort();
  fetches = null;
  stopPlaying?.();
  if (canSpeak()) window.speechSynthesis.cancel();
}

/**
 * Phones only let a page speak after a tap. Calling this inside a tap (the microphone, for
 * example) lets a spoken answer play when it arrives later.
 */
export function unlockSpeech(): void {
  primeAudio();
  void ownVoiceAvailable();
  if (!canSpeak()) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* speaking is simply not available */
  }
}

/** Whether a piece of text has Hebrew letters (for tests and callers). */
export function hasHebrew(text: string): boolean {
  return HEBREW.test(text);
}
