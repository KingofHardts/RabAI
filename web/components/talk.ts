"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { micOpen, TALK_OFF, TALK_TIMING, talkReducer, tapAction, wordsOf, type TalkEvent, type TalkState } from "@/lib/talk";
import { canSpeak, recognitionCtor, speak, stopSpeaking, unlockSpeech } from "./voice";

/*
 * Talk: a conversation with RabbAI out loud, in the chat. The turn-taking is in lib/talk.ts; this
 * opens and closes the microphone and reads answers aloud, using only the browser's own speech
 * recognition and voices, as the microphone in the question box does (components/voice.ts).
 * Nothing is recorded, and RabbAI gets only the words.
 *
 * What browsers do, and what this does about it:
 * - Phones stop listening after each sentence, and some repeat words when asked to keep
 *   listening, so on a phone each sentence is heard on its own and the microphone opens again
 *   (keeping the words so far). On a computer it listens continuously.
 * - Some browsers stop listening after a quiet while, and some won't open the microphone again by
 *   themselves. When it keeps closing at once, or won't open, Talk waits for a tap; anything
 *   already said is still sent after the countdown.
 * - On iPhones, listening again after reading aloud is unreliable, so there each turn begins with a
 *   tap ("Your turn: tap to talk").
 * - The microphone is closed while RabbAI reads aloud, so it doesn't hear itself.
 * - Some phones never say that reading aloud ended, so a watch notices when the voice goes quiet.
 * - Every opening of the microphone has a number, and anything from an older one is ignored.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

/** iPhones and iPads (an iPad can say it is a Mac; it has a touch screen). */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Phones and tablets: their browsers listen for one sentence at a time. */
function isPhone(): boolean {
  return isIOS() || (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent));
}

/** Whether this browser can hold a conversation out loud: it can both listen and speak. */
export function talkSupported(): boolean {
  return recognitionCtor() !== null && canSpeak();
}

/** How often time is checked while the microphone is open. */
const TICK_MS = 200;
/** The microphone closing by itself this many times, quickly, with nothing heard: wait for a tap. */
const RESTARTS = { max: 4, withinMs: 8000 };

export interface TalkControls {
  state: TalkState;
  /** Turn Talk on (in a tap, so a phone lets it speak and listen). */
  start: () => void;
  /** Turn Talk off. */
  end: () => void;
  /** The big button: whatever it says it will do (lib/talk.ts, tapAction). */
  tap: () => void;
  keepTalking: () => void;
  sendNow: () => void;
  /** Close the microphone and stop reading, with a word for the person. */
  pause: (note: string | null) => void;
  /** The answer to what was sent, to read aloud; `id` is its message. */
  answer: (id: string, text: string) => void;
  /** No answer came, or there was nothing to read. */
  answerFailed: (note?: string) => void;
}

export function useTalk({ onSend, onSpeaking }: { onSend: (question: string) => boolean; onSpeaking?: (id: string | null) => void }): TalkControls {
  const [state, setState] = useState<TalkState>(TALK_OFF);
  const stateRef = useRef<TalkState>(TALK_OFF);
  const onSendRef = useRef(onSend);
  const onSpeakingRef = useRef(onSpeaking);
  useEffect(() => {
    onSendRef.current = onSend;
    onSpeakingRef.current = onSpeaking;
  }, [onSend, onSpeaking]);

  const rec = useRef<Recognition | null>(null);
  const micSession = useRef(0);
  const restarts = useRef<number[]>([]);
  const speakSession = useRef(0);
  const speakWatch = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Whether the next opening of the microphone comes from a tap (a phone may refuse one that doesn't). */
  const fromTap = useRef(false);
  // `dispatch` and the microphone call each other; a ref breaks the loop.
  const dispatchRef = useRef<(e: TalkEvent) => void>(() => undefined);

  const closeMic = useCallback(() => {
    micSession.current += 1;
    const r = rec.current;
    rec.current = null;
    if (r) {
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
    }
  }, []);

  const stopReading = useCallback(() => {
    speakSession.current += 1;
    if (speakWatch.current) clearInterval(speakWatch.current);
    speakWatch.current = null;
    stopSpeaking();
    onSpeakingRef.current?.(null);
  }, []);

  /** Open the microphone. `carry` is what was already heard this turn, kept when it reopens. */
  const openMic = useCallback(
    (carry: string) => {
      const dispatch = dispatchRef.current;
      const tap = fromTap.current;
      fromTap.current = false;
      const Ctor = recognitionCtor();
      if (!Ctor) {
        dispatch({ type: "micLost", note: "This browser can't listen. You can type instead.", now: Date.now() });
        return;
      }
      closeMic();
      const mine = ++micSession.current;
      const r: Recognition = new Ctor();
      r.lang = "en-US";
      r.continuous = !isPhone();
      r.interimResults = true;
      r.maxAlternatives = 1;

      let settled = carry ? `${carry} ` : "";
      let heardAny = false;
      r.onresult = (e: any) => {
        if (mine !== micSession.current) return;
        let hearing = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) settled += `${res[0].transcript} `;
          else hearing += res[0].transcript;
        }
        heardAny = true;
        dispatchRef.current({ type: "heard", settled, hearing, now: Date.now() });
      };
      r.onerror = (e: any) => {
        if (mine !== micSession.current) return;
        const code = String(e?.error ?? "");
        // Silence and our own stopping aren't problems: the microphone opens again (onend).
        if (code === "no-speech" || code === "aborted") return;
        micSession.current += 1;
        rec.current = null;
        const note =
          code === "not-allowed" || code === "service-not-allowed"
            ? tap
              ? "RabbAI needs permission to use your microphone. You can allow it in your browser's settings."
              : null // a phone that won't reopen the microphone by itself: just tap to talk
            : code === "audio-capture"
              ? "No microphone was found."
              : code === "network"
                ? "Talking needs an internet connection."
                : "The microphone stopped. Tap to talk again.";
        dispatchRef.current({ type: "micLost", note, now: Date.now() });
      };
      r.onend = () => {
        if (mine !== micSession.current) return;
        rec.current = null;
        const s = stateRef.current;
        if (!micOpen(s.phase)) return;
        // The browser stopped listening by itself (phones do after every sentence): listen on,
        // keeping what was said. If it keeps stopping at once with nothing heard, wait for a tap.
        const now = Date.now();
        restarts.current = restarts.current.filter((t) => now - t < RESTARTS.withinMs);
        if (!heardAny && restarts.current.length >= RESTARTS.max) {
          dispatchRef.current({ type: "micLost", note: null, now });
          return;
        }
        restarts.current.push(now);
        openMic(wordsOf(s));
      };

      rec.current = r;
      try {
        r.start();
      } catch {
        if (mine !== micSession.current) return;
        rec.current = null;
        dispatchRef.current({ type: "micLost", note: tap ? "The microphone couldn't start. Please try again, or type your question." : null, now: Date.now() });
      }
    },
    [closeMic],
  );

  /** What happens as Talk moves from one phase to the next. */
  const onChange = useCallback(
    (prev: TalkState, next: TalkState, e: TalkEvent) => {
      if (prev.phase === "speaking" && next.phase !== "speaking") stopReading();
      if (e.type === "listen") {
        restarts.current = [];
        openMic("");
      } else if (micOpen(prev.phase) && !micOpen(next.phase)) {
        closeMic();
      }
      if (next.phase === "answering" && prev.phase !== "answering") {
        if (!onSendRef.current(next.asked)) dispatchRef.current({ type: "pause", note: "That couldn't be sent just now. Tap to talk to try again." });
      }
      if (next.phase === "off") closeMic();
    },
    [openMic, closeMic, stopReading],
  );

  const dispatch = useCallback(
    (e: TalkEvent) => {
      const prev = stateRef.current;
      const next = talkReducer(prev, e);
      if (next === prev) return;
      stateRef.current = next;
      setState(next);
      onChange(prev, next, e);
    },
    [onChange],
  );
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  // Time, while the microphone is open: the pause, the countdown, the quiet.
  const open = micOpen(state.phase);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => dispatchRef.current({ type: "tick", now: Date.now() }), TICK_MS);
    return () => clearInterval(t);
  }, [open]);

  // Nothing listens or speaks while the page is away.
  useEffect(() => {
    const onHide = () => {
      const s = stateRef.current;
      if (document.hidden && (micOpen(s.phase) || s.phase === "speaking")) {
        dispatchRef.current({ type: "pause", note: "Paused while the page was away. Tap to talk." });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  // Leaving the page closes everything.
  useEffect(
    () => () => {
      micSession.current += 1;
      speakSession.current += 1;
      if (speakWatch.current) clearInterval(speakWatch.current);
      try {
        rec.current?.abort();
      } catch {
        /* nothing to stop */
      }
      if (stateRef.current.phase !== "off") stopSpeaking();
    },
    [],
  );

  const listenFromTap = useCallback(() => {
    fromTap.current = true;
    dispatchRef.current({ type: "listen", now: Date.now() });
  }, []);

  const start = useCallback(() => {
    // Inside the tap: a phone then lets the answer be read aloud later.
    unlockSpeech();
    stopSpeaking();
    onSpeakingRef.current?.(null);
    listenFromTap();
  }, [listenFromTap]);

  const end = useCallback(() => dispatchRef.current({ type: "off" }), []);
  const sendNow = useCallback(() => dispatchRef.current({ type: "sendNow" }), []);
  const pause = useCallback((note: string | null) => dispatchRef.current({ type: "pause", note }), []);

  const keepTalking = useCallback(() => {
    dispatchRef.current({ type: "keepTalking", now: Date.now() });
    // A phone may have stopped listening at the pause; this tap opens the microphone again.
    if (!rec.current && micOpen(stateRef.current.phase)) {
      fromTap.current = true;
      openMic(wordsOf(stateRef.current));
    }
  }, [openMic]);

  const tap = useCallback(() => {
    const { action } = tapAction(stateRef.current);
    if (action === "sendNow") sendNow();
    else if (action === "pause") pause("Paused. Tap to talk when you're ready.");
    else if (action === "interrupt" || action === "listen") {
      unlockSpeech();
      listenFromTap();
    }
  }, [sendNow, pause, listenFromTap]);

  const answer = useCallback(
    (id: string, text: string) => {
      if (stateRef.current.phase !== "answering") return;
      if (typeof document !== "undefined" && document.hidden) {
        dispatchRef.current({ type: "pause", note: "The answer is in the chat. Tap to talk to go on." });
        return;
      }
      dispatchRef.current({ type: "speak" });
      onSpeakingRef.current?.(id);
      const mine = ++speakSession.current;
      const done = () => {
        if (mine !== speakSession.current) return;
        speakSession.current += 1;
        if (speakWatch.current) clearInterval(speakWatch.current);
        speakWatch.current = null;
        onSpeakingRef.current?.(null);
        // Then it is their turn: RabbAI listens again, a moment after the voice stops (on an
        // iPhone, once they tap).
        setTimeout(() => {
          if (stateRef.current.phase !== "speaking") return;
          if (isIOS()) dispatchRef.current({ type: "pause", note: null });
          else dispatchRef.current({ type: "listen", now: Date.now() });
        }, TALK_TIMING.afterSpeechMs);
      };
      // Some phones never say that reading ended: watch for the voice going quiet. (Set up first:
      // an answer with nothing to read ends at once.)
      const began = Date.now();
      let quiet = 0;
      speakWatch.current = setInterval(() => {
        const synth = window.speechSynthesis;
        if (synth.speaking || synth.pending) {
          quiet = 0;
          return;
        }
        if (Date.now() - began > 1200 && ++quiet >= 2) done();
      }, 400);
      speak(text, done);
    },
    [],
  );

  const answerFailed = useCallback((note?: string) => {
    if (stateRef.current.phase !== "answering") return;
    dispatchRef.current({ type: "pause", note: note ?? "That answer didn't come through. Tap to talk to try again." });
  }, []);

  return { state, start, end, tap, keepTalking, sendNow, pause, answer, answerFailed };
}
