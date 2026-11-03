import { test } from "node:test";
import assert from "node:assert/strict";
import { QUIET_NOTE, secondsLeft, TALK_OFF, TALK_TIMING, talkReducer, tapAction, wordsOf, type TalkEvent, type TalkState } from "../lib/talk";

const { pauseMs, countdownMs, silenceMs } = TALK_TIMING;

/** Run events in order from a state. */
function run(start: TalkState, ...events: TalkEvent[]): TalkState {
  return events.reduce(talkReducer, start);
}

const listening = run(TALK_OFF, { type: "listen", now: 0 });

test("Talk listens, and a pause after words starts the countdown, which sends what was said", () => {
  assert.equal(listening.phase, "listening");
  let s = run(listening, { type: "heard", settled: "what does", hearing: " rashi say", now: 100 });
  assert.equal(wordsOf(s), "what does rashi say");
  assert.equal(run(s, { type: "tick", now: 100 + pauseMs - 1 }).phase, "listening", "not yet quiet long enough");
  s = run(s, { type: "tick", now: 100 + pauseMs });
  assert.equal(s.phase, "countdown");
  assert.equal(secondsLeft(s, 100 + pauseMs), Math.ceil(countdownMs / 1000));
  assert.equal(run(s, { type: "tick", now: 100 + pauseMs + countdownMs - 1 }).phase, "countdown");
  s = run(s, { type: "tick", now: 100 + pauseMs + countdownMs });
  assert.equal(s.phase, "answering");
  assert.equal(s.asked, "what does rashi say");
  assert.equal(wordsOf(s), "", "the words move into the question sent");
});

test("speaking again during the countdown keeps listening, and the countdown starts over", () => {
  const counting = run(listening, { type: "heard", settled: "what does", hearing: "", now: 0 }, { type: "tick", now: pauseMs });
  assert.equal(counting.phase, "countdown");
  const more = run(counting, { type: "heard", settled: "what does", hearing: "rashi", now: pauseMs + 500 });
  assert.equal(more.phase, "listening");
  assert.equal(run(more, { type: "tick", now: pauseMs + 500 + pauseMs - 1 }).phase, "listening");
  assert.equal(run(more, { type: "tick", now: pauseMs + 500 + pauseMs }).phase, "countdown");
});

test("words that only settle (no new words) don't stop the countdown", () => {
  const counting = run(listening, { type: "heard", settled: "", hearing: "what does rashi say", now: 0 }, { type: "tick", now: pauseMs });
  const settled = run(counting, { type: "heard", settled: "what does rashi say", hearing: "", now: pauseMs + 200 });
  assert.equal(settled.phase, "countdown");
  assert.equal(settled.countdownAt, counting.countdownAt);
  assert.equal(settled.settled, "what does rashi say");
});

test("Keep talking holds off the countdown until more words come; a long quiet brings it back", () => {
  const counting = run(listening, { type: "heard", settled: "the shema", hearing: "", now: 0 }, { type: "tick", now: pauseMs });
  const held = run(counting, { type: "keepTalking", now: pauseMs + 100 });
  assert.equal(held.phase, "listening");
  assert.equal(held.holding, true);
  assert.equal(run(held, { type: "tick", now: pauseMs + 100 + pauseMs * 5 }).phase, "listening", "no countdown while holding");
  const more = run(held, { type: "heard", settled: "the shema at night", hearing: "", now: pauseMs + 3000 });
  assert.equal(more.holding, false, "new words end the hold");
  assert.equal(run(more, { type: "tick", now: pauseMs + 3000 + pauseMs }).phase, "countdown");
  const quiet = run(held, { type: "tick", now: pauseMs + 100 + silenceMs });
  assert.equal(quiet.phase, "countdown", "the words are not lost after a long quiet");
});

test("Send now sends at once, but only when something was said", () => {
  assert.equal(run(listening, { type: "sendNow" }).phase, "listening");
  const s = run(listening, { type: "heard", settled: "hello", hearing: "", now: 10 }, { type: "sendNow" });
  assert.equal(s.phase, "answering");
  assert.equal(s.asked, "hello");
});

test("a long quiet with nothing said closes the microphone, with a note", () => {
  assert.equal(run(listening, { type: "tick", now: silenceMs - 1 }).phase, "listening");
  const s = run(listening, { type: "tick", now: silenceMs });
  assert.equal(s.phase, "paused");
  assert.equal(s.note, QUIET_NOTE);
});

test("the answer is read aloud, and then RabbAI listens again", () => {
  const answering = run(listening, { type: "heard", settled: "hi", hearing: "", now: 0 }, { type: "sendNow" });
  assert.equal(run(listening, { type: "speak" }).phase, "listening", "nothing to read before a question was sent");
  const speaking = run(answering, { type: "speak" });
  assert.equal(speaking.phase, "speaking");
  const again = run(speaking, { type: "listen", now: 9000 });
  assert.equal(again.phase, "listening");
  assert.equal(again.openedAt, 9000);
  assert.equal(wordsOf(again), "");
});

test("when the microphone is lost, words already said are still sent; with none, it waits for a tap", () => {
  const withWords = run(listening, { type: "heard", settled: "what is", hearing: "a kezayis", now: 0 }, { type: "micLost", note: "x", now: 50 });
  assert.equal(withWords.phase, "countdown");
  assert.equal(withWords.countdownAt, 50);
  assert.equal(run(withWords, { type: "tick", now: 50 + countdownMs }).asked, "what is a kezayis");
  const counting = run(listening, { type: "heard", settled: "a", hearing: "", now: 0 }, { type: "tick", now: pauseMs });
  assert.equal(run(counting, { type: "micLost", note: null, now: pauseMs + 10 }).countdownAt, counting.countdownAt, "a countdown keeps its time");
  const none = run(listening, { type: "micLost", note: "No microphone was found.", now: 5 });
  assert.equal(none.phase, "paused");
  assert.equal(none.note, "No microphone was found.");
  assert.equal(run(TALK_OFF, { type: "micLost", note: null, now: 1 }), TALK_OFF);
});

test("pausing and turning off", () => {
  const paused = run(listening, { type: "heard", settled: "hm", hearing: "", now: 0 }, { type: "pause", note: "Paused." });
  assert.equal(paused.phase, "paused");
  assert.equal(wordsOf(paused), "");
  assert.equal(paused.note, "Paused.");
  assert.equal(run(TALK_OFF, { type: "pause" }), TALK_OFF, "pausing does nothing when Talk is off");
  assert.deepEqual(run(paused, { type: "off" }), TALK_OFF);
  // Heard words after the microphone closed are ignored.
  assert.equal(run(paused, { type: "heard", settled: "late", hearing: "", now: 1 }), paused);
});

test("the big button says what a tap will do", () => {
  assert.equal(tapAction(TALK_OFF).action, "listen");
  assert.equal(tapAction(listening).action, "pause");
  assert.equal(tapAction(run(listening, { type: "heard", settled: "a", hearing: "", now: 0 })).action, "sendNow");
  const answering = run(listening, { type: "heard", settled: "a", hearing: "", now: 0 }, { type: "sendNow" });
  assert.equal(tapAction(answering).action, "none");
  assert.equal(tapAction(run(answering, { type: "speak" })).action, "interrupt");
  assert.equal(tapAction(run(listening, { type: "pause" })).action, "listen");
});
