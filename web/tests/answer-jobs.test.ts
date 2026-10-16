import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { execFrom } from "../lib/account/people";
import {
  createJobStore,
  jobCheck,
  jobShape,
  JOB_KEEP_MS,
  JOB_LOST_MS,
  memoryJobStore,
  noJobStore,
  runAnswer,
  runningAnswer,
  type JobStore,
  type LiveEvent,
} from "../lib/answer-jobs";
import type { AskResult } from "../lib/engine/answer";

/* Answers that keep going when the person leaves the page (lib/answer-jobs.ts). */

const ID = "Zq3v9Kp2Lx8Wm4Rt6Yb1Nc7Hd";
const answered = (text = "Because we were told to."): AskResult => ({
  status: "answered",
  blocks: [{ text, citations: [] }],
  sources: [],
  retrieved: [],
  safety: null,
  libraryMode: "development",
  droppedCitations: 0,
});
const failed = (): AskResult => ({ ...answered(""), status: "error", blocks: [], notice: "Something went wrong." });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("an answer's id must be long and plain, and only its hash is kept", () => {
  assert.equal(jobShape(ID), true);
  assert.equal(jobShape("short"), false);
  assert.equal(jobShape(`${ID}/../x`), false);
  assert.equal(jobShape(42), false);
  const check = jobCheck(ID);
  assert.match(check, /^[0-9a-f]{64}$/);
  assert.notEqual(check, ID);
  assert.equal(jobCheck(ID), check);
});

for (const [name, make] of [
  ["the people database", () => createJobStore(execFrom(createClient({ url: ":memory:" })))],
  ["this server's memory", () => memoryJobStore()],
] as const) {
  test(`kept answers in ${name}: progress, stop, finish, remove, tidy`, async () => {
    const store: JobStore = make();
    const check = jobCheck(ID);
    assert.equal(await store.read(check), null);
    await store.start(check, 1000);
    await store.start(check, 2000); // a second start changes nothing
    let v = await store.read(check, 1500);
    assert.equal(v?.status, "running");
    assert.equal(v?.startedAt, 1000);

    assert.equal(await store.progress(check, ["Looking in the library"], "We say", 2000), false);
    v = await store.read(check, 2500);
    assert.deepEqual(v?.steps, ["Looking in the library"]);
    assert.equal(v?.text, "We say");

    await store.requestStop(check);
    assert.equal(await store.progress(check, ["Looking in the library"], "We say it", 3000), true, "a stop asked from another server is heard");

    await store.finish(check, "done", ["Looking in the library"], "We say it.", answered(), 4000);
    v = await store.read(check, 4500);
    assert.equal(v?.status, "done");
    assert.equal(v?.result?.blocks[0].text, "Because we were told to.");
    assert.equal(await store.progress(check, [], "late", 5000), false, "a finished answer takes no more progress");
    assert.equal((await store.read(check, 5000))?.text, "We say it.");

    await store.remove(check);
    assert.equal(await store.read(check), null);

    // An answer left "running" with no progress has stopped with its server.
    await store.start(check, 10_000);
    assert.equal((await store.read(check, 10_000 + JOB_LOST_MS + 1))?.status, "failed");
    // One no page came back for is deleted after a day.
    await store.tidy(10_000 + JOB_KEEP_MS + 1);
    assert.equal(await store.read(check), null);
  });
}

test("a live answer reports its progress, and is kept for a page that comes back", async () => {
  const store = memoryJobStore();
  const check = jobCheck(ID);
  const events: LiveEvent[] = [];
  const answer = runAnswer(
    check,
    async (hooks) => {
      hooks.onStatus?.("Looking in the library");
      hooks.onStatus?.("Looking in the library"); // the same note twice counts once
      hooks.onText?.("Because ");
      await sleep(30);
      hooks.onText?.("we were told to.");
      return answered();
    },
    { store, failed, flushMs: 5 },
  );
  answer.listen((e) => events.push(e));
  assert.equal(runningAnswer(check), answer, "a stop on this server reaches it at once");
  await answer.done;
  assert.deepEqual(
    events.map((e) => e.type),
    ["status", "text", "text", "done"],
  );
  assert.equal(runningAnswer(check), undefined);
  const kept = await store.read(check);
  assert.equal(kept?.status, "done");
  assert.equal(kept?.text, "Because we were told to.");
  assert.equal(kept?.result?.status, "answered");
});

test("a page that goes away doesn't stop the answer", async () => {
  const store = memoryJobStore();
  const check = jobCheck(`${ID}away`);
  const answer = runAnswer(
    check,
    async (hooks) => {
      hooks.onText?.("Part one. ");
      await sleep(20);
      hooks.onText?.("Part two.");
      return answered("Part one. Part two.");
    },
    { store, failed, flushMs: 5 },
  );
  const unlisten = answer.listen(() => {
    throw new Error("the page is gone");
  });
  unlisten();
  await answer.done;
  assert.equal((await store.read(check))?.result?.blocks[0].text, "Part one. Part two.");
});

test("stopping an answer keeps nothing of it", async () => {
  const store = memoryJobStore();
  const check = jobCheck(`${ID}stop`);
  let sawAbort = false;
  const answer = runAnswer(
    check,
    async (hooks) => {
      hooks.onText?.("Half an ans");
      await new Promise<void>((resolve) => hooks.signal.addEventListener("abort", () => resolve()));
      sawAbort = true;
      return failed();
    },
    { store, failed, flushMs: 5 },
  );
  const events: LiveEvent[] = [];
  answer.listen((e) => events.push(e));
  await sleep(20);
  answer.stop();
  await answer.done;
  assert.equal(sawAbort, true);
  assert.equal(events[events.length - 1].type, "stopped");
  const kept = await store.read(check);
  assert.equal(kept?.status, "stopped");
  assert.equal(kept?.text, "");
  assert.equal(kept?.result, undefined);
});

test("a stop asked on another server reaches the answer at its next progress", async () => {
  const store = memoryJobStore();
  const check = jobCheck(`${ID}other`);
  const answer = runAnswer(
    check,
    async (hooks) => {
      for (let i = 0; i < 50 && !hooks.signal.aborted; i++) {
        hooks.onText?.(`${i} `);
        await sleep(5);
      }
      return hooks.signal.aborted ? failed() : answered();
    },
    { store, failed, flushMs: 5 },
  );
  await sleep(15);
  await store.requestStop(check);
  await answer.done;
  assert.equal((await store.read(check))?.status, "stopped");
});

test("an answer that throws is kept as RabAI's note, and a store that fails doesn't stop the answer", async () => {
  const broken: JobStore = {
    ...noJobStore(),
    start: async () => {
      throw new Error("database down");
    },
    progress: async () => {
      throw new Error("database down");
    },
  };
  const events: LiveEvent[] = [];
  const answer = runAnswer(
    jobCheck(`${ID}broken`),
    async (hooks) => {
      hooks.onText?.("Still answering.");
      return answered("Still answering.");
    },
    { store: broken, failed, flushMs: 5 },
  );
  answer.listen((e) => events.push(e));
  await answer.done;
  assert.equal(events[events.length - 1].type, "done");

  const store = memoryJobStore();
  const check = jobCheck(`${ID}throws`);
  const thrown = runAnswer(
    check,
    async () => {
      throw new Error("model unreachable");
    },
    { store, failed, flushMs: 5 },
  );
  await thrown.done;
  const kept = await store.read(check);
  assert.equal(kept?.status, "done");
  assert.equal(kept?.result?.notice, "Something went wrong.");
});
