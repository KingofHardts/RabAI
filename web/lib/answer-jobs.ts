import { createHash } from "node:crypto";
import type { AskHooks, AskResult } from "./engine/answer";
import { peopleExec, type Exec } from "./account/people";

/*
 * Answers that keep going when the person leaves the page (founding spec, "Answers that wait for
 * you"). Server only.
 *
 * When the app asks a question, it names the answer with a long random id it chose itself. The
 * answer is then written on the server whether or not the page stays open: what RabAI is doing,
 * the text so far, and at the end the checked answer are kept under a hash of that id, so the page
 * can come back and pick them up. The page removes the answer as soon as it has it; anything left
 * over is deleted after a day.
 *
 * What is kept: the progress notes, the answer's text and the checked answer. Never the question,
 * never a picture, and nothing about the person. Only someone holding the id (the device that
 * asked) can read it, and only a hash of the id is stored.
 *
 * Where: the people database when the app has one (table answer_jobs), or this server's memory
 * when it doesn't (enough for one computer; a page that comes back to another server then finds
 * nothing, and asks again).
 */

/** What an answer's id looks like. The device makes it: at least 128 random bits. */
export const JOB_ID_RE = /^[A-Za-z0-9_-]{22,64}$/;
/** How long an answer is kept when no page comes back for it. */
export const JOB_KEEP_MS = 24 * 60 * 60 * 1000;
/**
 * An answer still "being written" with no progress for this long has stopped with its server
 * (an answer may run 300 seconds, route.ts).
 */
export const JOB_LOST_MS = 6 * 60 * 1000;
/** How often progress is written down while an answer is being written. */
export const FLUSH_MS = 1000;

export type JobStatus = "running" | "done" | "stopped" | "failed";

export interface JobView {
  status: JobStatus;
  /** Notes on what RabAI is doing, such as "Looking in the library". */
  steps: string[];
  /** The answer's text so far (live text, without citations). */
  text: string;
  /** The checked answer, when it is done. */
  result?: AskResult;
  startedAt: number;
  updatedAt: number;
}

/** What a live answer sends: progress, text, and finally the checked answer (or that it stopped). */
export type LiveEvent =
  | { type: "status"; text: string }
  | { type: "text"; text: string }
  | { type: "done"; result: AskResult }
  | { type: "stopped" };

export function jobShape(id: unknown): id is string {
  return typeof id === "string" && JOB_ID_RE.test(id);
}

/** The stored stand-in for an answer's id. */
export function jobCheck(id: string): string {
  return createHash("sha256").update(`rabai-answer-v1\u0000${id}`).digest("hex");
}

export interface JobStore {
  start(check: string, now?: number): Promise<void>;
  /** Write down progress. True when the person asked to stop. */
  progress(check: string, steps: string[], text: string, now?: number): Promise<boolean>;
  finish(check: string, status: Exclude<JobStatus, "running">, steps: string[], text: string, result: AskResult | null, now?: number): Promise<void>;
  read(check: string, now?: number): Promise<JobView | null>;
  requestStop(check: string): Promise<void>;
  remove(check: string): Promise<void>;
  /** Delete answers no page came back for. */
  tidy(now?: number): Promise<void>;
}

/** An answer kept "running" with no progress for too long is reported as having failed. */
export function settled(view: JobView, now = Date.now()): JobView {
  if (view.status === "running" && now - view.updatedAt > JOB_LOST_MS) return { ...view, status: "failed" };
  return view;
}

// ---------------------------------------------------------------------------
// Stores

const JOB_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS answer_jobs (
    job_check TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    steps TEXT NOT NULL DEFAULT '[]',
    text TEXT NOT NULL DEFAULT '',
    result TEXT,
    stop INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS answer_jobs_updated ON answer_jobs (updated_at)`,
];

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : Number(v ?? 0));
const STATUSES: JobStatus[] = ["running", "done", "stopped", "failed"];

function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string") return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

/** The store over the people database (or any SQLite-shaped database, in tests). */
export function createJobStore(exec: Exec): JobStore {
  let ready: Promise<void> | null = null;
  const ensure = () =>
    (ready ??= (async () => {
      for (const sql of JOB_SCHEMA) await exec.run(sql);
    })().catch((err) => {
      ready = null;
      throw err;
    }));
  return {
    async start(check, now = Date.now()) {
      await ensure();
      await exec.run(
        "INSERT INTO answer_jobs (job_check, status, steps, text, result, stop, started_at, updated_at) VALUES (?, 'running', '[]', '', NULL, 0, ?, ?) ON CONFLICT (job_check) DO NOTHING",
        [check, now, now],
      );
    },
    async progress(check, steps, text, now = Date.now()) {
      await ensure();
      const rows = await exec.run(
        "UPDATE answer_jobs SET steps = ?, text = ?, updated_at = ? WHERE job_check = ? AND status = 'running' RETURNING stop",
        [JSON.stringify(steps), text, now, check],
      );
      return rows.length > 0 && num(rows[0].stop) === 1;
    },
    async finish(check, status, steps, text, result, now = Date.now()) {
      await ensure();
      await exec.run("UPDATE answer_jobs SET status = ?, steps = ?, text = ?, result = ?, updated_at = ? WHERE job_check = ?", [
        status,
        JSON.stringify(steps),
        text,
        result ? JSON.stringify(result) : null,
        now,
        check,
      ]);
    },
    async read(check, now = Date.now()) {
      await ensure();
      const rows = await exec.run("SELECT status, steps, text, result, started_at, updated_at FROM answer_jobs WHERE job_check = ?", [check]);
      if (!rows.length) return null;
      const r = rows[0];
      const status = STATUSES.includes(r.status as JobStatus) ? (r.status as JobStatus) : "failed";
      const result = parseJson<AskResult | null>(r.result, null);
      return settled(
        {
          status,
          steps: parseJson<string[]>(r.steps, []).filter((s) => typeof s === "string"),
          text: typeof r.text === "string" ? r.text : "",
          ...(result ? { result } : {}),
          startedAt: num(r.started_at),
          updatedAt: num(r.updated_at),
        },
        now,
      );
    },
    async requestStop(check) {
      await ensure();
      await exec.run("UPDATE answer_jobs SET stop = 1 WHERE job_check = ?", [check]);
    },
    async remove(check) {
      await ensure();
      await exec.run("DELETE FROM answer_jobs WHERE job_check = ?", [check]);
    },
    async tidy(now = Date.now()) {
      await ensure();
      await exec.run("DELETE FROM answer_jobs WHERE updated_at < ?", [now - JOB_KEEP_MS]);
    },
  };
}

interface MemoryJob {
  view: JobView;
  stop: boolean;
}

/** The store in this server's memory, for an app without the people database. */
export function memoryJobStore(jobs = new Map<string, MemoryJob>()): JobStore {
  return {
    async start(check, now = Date.now()) {
      if (!jobs.has(check)) jobs.set(check, { view: { status: "running", steps: [], text: "", startedAt: now, updatedAt: now }, stop: false });
    },
    async progress(check, steps, text, now = Date.now()) {
      const job = jobs.get(check);
      if (!job || job.view.status !== "running") return false;
      job.view = { ...job.view, steps: [...steps], text, updatedAt: now };
      return job.stop;
    },
    async finish(check, status, steps, text, result, now = Date.now()) {
      const job = jobs.get(check);
      if (!job) return;
      job.view = { ...job.view, status, steps: [...steps], text, ...(result ? { result } : {}), updatedAt: now };
    },
    async read(check, now = Date.now()) {
      const job = jobs.get(check);
      return job ? settled(job.view, now) : null;
    },
    async requestStop(check) {
      const job = jobs.get(check);
      if (job) job.stop = true;
    },
    async remove(check) {
      jobs.delete(check);
    },
    async tidy(now = Date.now()) {
      for (const [check, job] of jobs) if (job.view.updatedAt < now - JOB_KEEP_MS) jobs.delete(check);
    },
  };
}

/** For a live answer no page will come back for (no id was given): nothing is kept. */
export function noJobStore(): JobStore {
  return {
    start: async () => {},
    progress: async () => false,
    finish: async () => {},
    read: async () => null,
    requestStop: async () => {},
    remove: async () => {},
    tidy: async () => {},
  };
}

const globalJobs = globalThis as unknown as { __rabaiAnswerJobs?: Map<string, MemoryJob>; __rabaiRunning?: Map<string, RunningAnswer> };

let cachedStore: { exec: Exec | null; store: JobStore } | null = null;

/** Where answers are kept while they are written: the people database, or this server's memory. */
export function jobStore(env: Record<string, string | undefined> = process.env): JobStore {
  const exec = peopleExec(env);
  if (cachedStore && cachedStore.exec === exec) return cachedStore.store;
  const store = exec ? createJobStore(exec) : memoryJobStore((globalJobs.__rabaiAnswerJobs ??= new Map()));
  cachedStore = { exec, store };
  return store;
}

// ---------------------------------------------------------------------------
// Running an answer

export interface RunningAnswer {
  /** Settles when the answer is finished (or stopped) and written down. Never rejects. */
  done: Promise<void>;
  /** Hear what happens next. Returns a function that stops listening. */
  listen(fn: (event: LiveEvent) => void): () => void;
  /** What has happened so far, for a page that asks while the answer is still being written here. */
  view(): JobView;
  /** Stop writing the answer. */
  stop(): void;
}

/** Answers being written on this server, so a stop reaches them at once. */
const running = (globalJobs.__rabaiRunning ??= new Map<string, RunningAnswer>());

export function runningAnswer(check: string): RunningAnswer | undefined {
  return running.get(check);
}

let lastTidy = 0;

/**
 * Write an answer, keeping its progress under `check` so a page can come back for it.
 *
 * @param work Writes the answer. It is given hooks for progress and a signal that is aborted when
 *   the person stops the answer.
 * @param failed The answer to keep when the work itself throws.
 */
export function runAnswer(
  check: string,
  work: (hooks: AskHooks & { signal: AbortSignal }) => Promise<AskResult>,
  opts: { store?: JobStore; failed: () => AskResult; now?: () => number; flushMs?: number },
): RunningAnswer {
  const store = opts.store ?? jobStore();
  const flushMs = opts.flushMs ?? FLUSH_MS;
  const now = opts.now ?? Date.now;
  const controller = new AbortController();
  const listeners = new Set<(e: LiveEvent) => void>();
  const steps: string[] = [];
  let text = "";
  const startedAt = now();
  let updatedAt = startedAt;
  let status: JobStatus = "running";
  let result: AskResult | undefined;
  let storeOk = true;

  const emit = (event: LiveEvent) => {
    for (const fn of [...listeners]) {
      try {
        fn(event);
      } catch {
        /* a page that went away */
      }
    }
  };
  const storeFailed = (err: unknown) => {
    if (storeOk) console.warn("[rabai] keeping the answer for a returning page failed:", err instanceof Error ? err.message : err);
    storeOk = false;
  };

  // Progress is written down at most once a second, and once more at the end.
  let timer: ReturnType<typeof setTimeout> | null = null;
  let writing: Promise<void> = Promise.resolve();
  const flush = () => {
    timer = null;
    const snapshot = { steps: [...steps], text };
    writing = writing
      .then(() => store.progress(check, snapshot.steps, snapshot.text, now()))
      .then((stopAsked) => {
        if (stopAsked && !controller.signal.aborted) controller.abort();
      })
      .catch(storeFailed);
  };
  const flushSoon = () => {
    updatedAt = now();
    if (!timer && status === "running") timer = setTimeout(flush, flushMs);
  };

  const answer: RunningAnswer = {
    done: Promise.resolve(),
    listen(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    view: () => ({ status, steps: [...steps], text, ...(result ? { result } : {}), startedAt, updatedAt }),
    stop: () => controller.abort(),
  };
  running.set(check, answer);

  answer.done = (async () => {
    if (now() - lastTidy > 10 * 60 * 1000) {
      lastTidy = now();
      void store.tidy(now()).catch(storeFailed);
    }
    await store.start(check, startedAt).catch(storeFailed);
    let final: AskResult;
    try {
      final = await work({
        signal: controller.signal,
        onStatus: (t) => {
          if (steps[steps.length - 1] === t) return;
          steps.push(t);
          emit({ type: "status", text: t });
          flushSoon();
        },
        onText: (delta) => {
          text += delta;
          emit({ type: "text", text: delta });
          flushSoon();
        },
      });
    } catch (err) {
      if (!controller.signal.aborted) console.error("[rabai] answer failed:", err instanceof Error ? err.message : err);
      final = opts.failed();
    }
    if (timer) clearTimeout(timer);
    timer = null;
    await writing;
    // An answer that ended in a note ("couldn't search the library just now") is done too: the
    // page shows the note. "failed" is kept for an answer whose server stopped (settled()).
    const stopped = controller.signal.aborted;
    status = stopped ? "stopped" : "done";
    if (!stopped) result = final;
    updatedAt = now();
    // A stopped answer keeps no text: only a finished, checked answer is ever shown as an answer.
    await store.finish(check, status, steps, stopped ? "" : text, stopped ? null : final, updatedAt).catch(storeFailed);
    running.delete(check);
    emit(status === "stopped" ? { type: "stopped" } : { type: "done", result: final });
    listeners.clear();
  })();
  return answer;
}
