/*
 * Talking with RabbAI out loud (Talk): who speaks when. Only the turn-taking is here; the
 * microphone and the voices are in components/talk.ts, and both use only the browser's own
 * speech recognition and voices (components/voice.ts). Safe on the device.
 *
 * A turn: RabbAI listens, and what it hears shows as words. When the person pauses, a countdown
 * shows; when it runs out, what they said is sent as their question, unless they keep talking (or
 * press "Keep talking"), or they send it at once. The answer is read aloud as it is written, and
 * the person can cut in: with a tap, or (where the browser can listen while RabbAI speaks) by
 * starting to talk. Then RabbAI listens again. The microphone is closed while RabbAI answers, when
 * the person pauses it, and after a long quiet stretch; while RabbAI speaks it listens only for the
 * person cutting in.
 */

export const TALK_TIMING = {
  /** Quiet after the last word heard before the countdown starts. */
  pauseMs: 1400,
  /** The countdown, on screen, before what was said is sent. */
  countdownMs: 2500,
  /** Listening with nothing heard for this long closes the microphone. */
  silenceMs: 30_000,
  /** After the answer is read aloud, before the microphone opens, so it doesn't hear the end. */
  afterSpeechMs: 350,
} as const;

export type TalkPhase =
  /** Talk is off: the usual question box. */
  | "off"
  /** The microphone is open. */
  | "listening"
  /** The person paused: what they said is sent when the countdown runs out. */
  | "countdown"
  /** What they said was sent; RabbAI is writing the answer. */
  | "answering"
  /** RabbAI is reading its answer aloud. */
  | "speaking"
  /** The microphone is closed until the person taps to talk. */
  | "paused";

export interface TalkState {
  phase: TalkPhase;
  /** This turn's words: those the browser has settled, and those it is still hearing. */
  settled: string;
  hearing: string;
  /** When the microphone opened for this turn, and when the words last changed. */
  openedAt: number;
  changedAt: number;
  /** "Keep talking" was pressed: no countdown until more words come. */
  holding: boolean;
  /** When the countdown began. */
  countdownAt: number;
  /** What was sent this turn, shown while the answer comes. */
  asked: string;
  /** Why the microphone closed, in a few words for the person; null for an ordinary "your turn". */
  note: string | null;
  /** When the person cut in while RabbAI was speaking: the last words they heard, sent with their next question. */
  cutIn: string;
}

export const TALK_OFF: TalkState = {
  phase: "off",
  settled: "",
  hearing: "",
  openedAt: 0,
  changedAt: 0,
  holding: false,
  countdownAt: 0,
  asked: "",
  note: null,
  cutIn: "",
};

export type TalkEvent =
  /** Start a turn: Talk was turned on, the person tapped to talk, or the answer has been read. */
  | { type: "listen"; now: number }
  /** The browser heard something: everything this turn so far, settled and still being heard. */
  | { type: "heard"; settled: string; hearing: string; now: number }
  /** Time passes (a few times a second while the microphone is open). */
  | { type: "tick"; now: number }
  | { type: "keepTalking"; now: number }
  | { type: "sendNow" }
  /** The answer came (or its first sentence did), and is being read aloud. */
  | { type: "speak" }
  /**
   * The person cut in while RabbAI was speaking: `heard` is the last of what RabbAI said, and
   * `said` what the person has said so far (their turn starts with it).
   */
  | { type: "cutIn"; heard: string; said: string; now: number }
  /** The microphone can't stay open (the browser stopped it, or a phone won't reopen it by itself). */
  | { type: "micLost"; note: string | null; now: number }
  /** Close the microphone, or stop reading, and wait for a tap. */
  | { type: "pause"; note?: string | null }
  | { type: "off" };

/** Spaces tidied: one between words, none at the ends. */
function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** A turn's words, as one line. */
export function wordsOf(s: Pick<TalkState, "settled" | "hearing">): string {
  return tidy(`${s.settled} ${s.hearing}`);
}

/** Whether the microphone is open in this phase. */
export function micOpen(phase: TalkPhase): boolean {
  return phase === "listening" || phase === "countdown";
}

function send(s: TalkState): TalkState {
  return { ...s, phase: "answering", asked: wordsOf(s), settled: "", hearing: "", holding: false, countdownAt: 0, note: null };
}

/** What is kept of what RabbAI was saying when the person cut in: its last few sentences. */
export function lastHeard(text: string, max = 300): string {
  const t = tidy(text);
  if (t.length <= max) return t;
  const cut = t.slice(-max);
  const start = cut.search(/[.!?]\s+\S/);
  return start >= 0 && start < max - 40 ? cut.slice(start + 1).trim() : cut.trim();
}

function pause(s: TalkState, note: string | null): TalkState {
  return { ...s, phase: "paused", settled: "", hearing: "", holding: false, countdownAt: 0, note };
}

export const QUIET_NOTE = "I closed the microphone after a quiet stretch. Tap to talk when you're ready.";

export function talkReducer(s: TalkState, e: TalkEvent): TalkState {
  switch (e.type) {
    case "listen":
      return { ...s, phase: "listening", settled: "", hearing: "", openedAt: e.now, changedAt: e.now, holding: false, countdownAt: 0, note: null, cutIn: "" };

    case "cutIn":
      if (s.phase !== "speaking") return s;
      return {
        ...s,
        phase: "listening",
        settled: tidy(e.said),
        hearing: "",
        openedAt: e.now,
        changedAt: e.now,
        holding: false,
        countdownAt: 0,
        note: null,
        cutIn: lastHeard(e.heard),
      };

    case "heard": {
      if (!micOpen(s.phase)) return s;
      const next = { settled: tidy(e.settled), hearing: tidy(e.hearing) };
      if (next.settled === s.settled && next.hearing === s.hearing) return s;
      // The same words, only settled now: nothing new was said, so a countdown keeps going.
      if (wordsOf(next) === wordsOf(s)) return { ...s, ...next };
      return { ...s, ...next, phase: "listening", changedAt: e.now, holding: false, countdownAt: 0 };
    }

    case "tick": {
      if (s.phase === "listening") {
        const words = wordsOf(s);
        const quiet = e.now - s.changedAt;
        if (words && !s.holding && quiet >= TALK_TIMING.pauseMs) return { ...s, phase: "countdown", countdownAt: e.now };
        // After "Keep talking", a long quiet brings the countdown back rather than losing the words.
        if (words && s.holding && quiet >= TALK_TIMING.silenceMs) return { ...s, phase: "countdown", holding: false, countdownAt: e.now };
        if (!words && e.now - s.openedAt >= TALK_TIMING.silenceMs) return pause(s, QUIET_NOTE);
        return s;
      }
      if (s.phase === "countdown" && e.now - s.countdownAt >= TALK_TIMING.countdownMs) return send(s);
      return s;
    }

    case "keepTalking":
      if (!micOpen(s.phase)) return s;
      return { ...s, phase: "listening", holding: true, changedAt: e.now, countdownAt: 0 };

    case "sendNow":
      return micOpen(s.phase) && wordsOf(s) ? send(s) : s;

    case "speak":
      return s.phase === "answering" ? { ...s, phase: "speaking", note: null, cutIn: "" } : s;

    case "micLost":
      if (!micOpen(s.phase)) return s;
      // What they said is not lost: it is sent after the countdown, unless they tap to say more.
      if (wordsOf(s)) return s.phase === "countdown" ? s : { ...s, phase: "countdown", holding: false, countdownAt: e.now };
      return pause(s, e.note);

    case "pause":
      return s.phase === "off" ? s : pause(s, e.note ?? null);

    case "off":
      return TALK_OFF;
  }
}

/** Seconds left in a countdown, for the screen ("Sending in 2"). */
export function secondsLeft(s: TalkState, now: number): number {
  if (s.phase !== "countdown") return 0;
  return Math.max(0, Math.ceil((TALK_TIMING.countdownMs - (now - s.countdownAt)) / 1000));
}

/** What the big button does in each phase, and what it says. */
export function tapAction(s: TalkState): { action: "sendNow" | "pause" | "interrupt" | "listen" | "none"; label: string } {
  switch (s.phase) {
    case "listening":
      return wordsOf(s) ? { action: "sendNow", label: "Done: send it now" } : { action: "pause", label: "Pause the microphone" };
    case "countdown":
      return { action: "sendNow", label: "Done: send it now" };
    case "speaking":
      return { action: "interrupt", label: "Stop reading and talk" };
    case "paused":
      return { action: "listen", label: "Talk" };
    case "off":
      return { action: "listen", label: "Talk with RabbAI" };
    default:
      return { action: "none", label: "RabbAI is answering" };
  }
}
