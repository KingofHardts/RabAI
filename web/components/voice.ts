"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Talking with RabAI: the browser's own speech recognition for the microphone, and its own
 * voices for reading answers aloud. Nothing is sent anywhere else, and nothing is recorded.
 *
 * Lessons built in (from building voice typing before):
 * - stop() lets the browser finish the last words; cancel() throws them away. Sending a question
 *   or typing over it must cancel, or late words land in a box that was just emptied.
 * - Every session has a number, and anything that arrives from an older session is ignored.
 * - Some browsers never report that listening ended, so stop() has a watchdog.
 * - Words are added up from each result as it becomes final, because some phones forget the
 *   earlier results after a pause.
 * - What was heard goes into the text box. The person reads it and presses Ask themselves.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

function recognitionCtor(): (new () => Recognition) | null {
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
          setError("RabAI needs permission to use your microphone. You can allow it in your browser's settings.");
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

/** Higher is better: natural-sounding voices first, then warm voices known to read well. */
function voiceScore(v: SpeechSynthesisVoice, lang: "en" | "he"): number {
  const name = v.name.toLowerCase();
  const tag = v.lang.toLowerCase();
  if (lang === "he") return tag.startsWith("he") || tag.startsWith("iw") ? 10 + (/enhanced|premium|natural/.test(name) ? 2 : 0) : -1;
  if (!tag.startsWith("en")) return -1;
  let score = 0;
  if (/natural|neural|online/.test(name)) score += 4;
  if (/enhanced|premium/.test(name)) score += 3;
  if (/google/.test(name)) score += 1;
  if (/daniel|arthur|aaron|andrew|guy|christopher|davis|eric|samantha|ava|jenny/.test(name)) score += 1;
  if (tag === "en-us") score += 1;
  else if (tag === "en-gb") score += 0.5;
  if (/novelty|whisper|bad news|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|wobble|zarvox|albert|fred|junior|kathy|ralph/.test(name)) score -= 10;
  return score;
}

function bestVoice(lang: "en" | "he"): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
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

/**
 * Read text aloud in a calm voice. Hebrew is read with a Hebrew voice when the device has one,
 * and skipped otherwise (an answer translates its Hebrew right beside it). Calls onEnd once.
 */
export function speak(text: string, onEnd?: () => void): void {
  if (!canSpeak()) {
    onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const mine = ++speakingToken;
  const english = bestVoice("en");
  const hebrew = bestVoice("he");
  const pieces = speechPieces(text).filter((p) => p.lang === "en" || hebrew);
  if (!pieces.length) {
    onEnd?.();
    return;
  }
  let finished = false;
  const finish = () => {
    if (finished || mine !== speakingToken) return;
    finished = true;
    onEnd?.();
  };
  pieces.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.text);
    const voice = p.lang === "he" ? hebrew : english;
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (p.lang === "he" ? "he-IL" : "en-US");
    u.rate = p.lang === "he" ? 0.85 : 0.95;
    u.pitch = 1;
    if (i === pieces.length - 1) {
      u.onend = finish;
      u.onerror = finish;
    }
    synth.speak(u);
  });
}

export function stopSpeaking(): void {
  if (!canSpeak()) return;
  speakingToken += 1;
  window.speechSynthesis.cancel();
}

/**
 * Phones only let a page speak after a tap. Calling this inside a tap (the microphone, for
 * example) lets a spoken answer play when it arrives later.
 */
export function unlockSpeech(): void {
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
