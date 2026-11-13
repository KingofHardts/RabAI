import { createHash } from "node:crypto";
import { CORE_PREMISES } from "./engine/core-premises.generated";
import type { AskResult } from "./engine/answer";
import { peopleExec, type Exec } from "./account/people";

/*
 * Kept answers to the suggested questions (the welcome's "Questions to try"). Server only.
 *
 * The first time a suggested question is asked in a fresh chat, its checked answer is kept; for a
 * week after, the same question tapped in a fresh chat gets that answer at once, marked as kept
 * (with the day it was written) and with "Ask again" for a fresh one. Kept is the checked answer
 * exactly as it was given, with its citations, as a restored saved chat is: nothing is rebuilt.
 *
 * Only a suggested question qualifies, only in a fresh chat with no pictures, no chavrusa and not
 * spoken in Talk, and the person's profile is not used for it (it is the same answer for
 * everyone). Kept under a hash of the question, the library, the model's instructions (so a change
 * to the core premises starts afresh) and, for a question that depends on the day, the date.
 * Nothing about the person is kept.
 */

export const KEPT_MS = 7 * 24 * 60 * 60 * 1000;

const INSTRUCTIONS = createHash("sha256").update(CORE_PREMISES).digest("hex").slice(0, 16);

/** A question whose answer depends on the day (this week's parsha, today's daf, the times). */
const DATED = /\b(today|tonight|tomorrow|this week|this shabbat|this month|parsha|parashat|daf|zmanim|omer|chanukah|purim|pesach|sukkot|shavuot|rosh hashanah|yom kippur|fast|holiday|when (?:is|does))\b/i;

export function keptKey(question: string, libraryMode: string, date: string): string {
  const q = question.replace(/\s+/g, " ").trim().toLowerCase();
  const day = DATED.test(q) ? date : "";
  return createHash("sha256").update(`rabai-kept-v1\u0000${INSTRUCTIONS}\u0000${libraryMode}\u0000${day}\u0000${q}`).digest("hex");
}

export interface Kept {
  result: AskResult;
  madeAt: number;
}

export interface KeptStore {
  get(key: string, now?: number): Promise<Kept | null>;
  put(key: string, result: AskResult, now?: number): Promise<void>;
}

/** What is kept of an answer: the checked answer, without anything only the asking page needed. */
export function forKeeping(result: AskResult): AskResult {
  const rest = { ...result };
  delete rest.kept;
  delete rest.timings;
  return rest;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS kept_answers (
    kept_key TEXT PRIMARY KEY,
    result TEXT NOT NULL,
    made_at INTEGER NOT NULL
  )`,
];

export function createKeptStore(exec: Exec): KeptStore {
  let ready: Promise<void> | null = null;
  const ensure = () =>
    (ready ??= (async () => {
      for (const sql of SCHEMA) await exec.run(sql);
    })().catch((err) => {
      ready = null;
      throw err;
    }));
  return {
    async get(key, now = Date.now()) {
      await ensure();
      const rows = await exec.run("SELECT result, made_at FROM kept_answers WHERE kept_key = ?", [key]);
      const r = rows[0];
      const madeAt = Number(r?.made_at ?? 0);
      if (!r || typeof r.result !== "string" || now - madeAt > KEPT_MS) return null;
      try {
        return { result: JSON.parse(r.result) as AskResult, madeAt };
      } catch {
        return null;
      }
    },
    async put(key, result, now = Date.now()) {
      await ensure();
      await exec.run(
        "INSERT INTO kept_answers (kept_key, result, made_at) VALUES (?, ?, ?) ON CONFLICT (kept_key) DO UPDATE SET result = excluded.result, made_at = excluded.made_at",
        [key, JSON.stringify(forKeeping(result)), now],
      );
      // Old ones go now and then.
      if (Math.random() < 0.05) await exec.run("DELETE FROM kept_answers WHERE made_at < ?", [now - KEPT_MS]);
    },
  };
}

export function memoryKeptStore(map = new Map<string, Kept>()): KeptStore {
  return {
    async get(key, now = Date.now()) {
      const k = map.get(key);
      return k && now - k.madeAt <= KEPT_MS ? k : null;
    },
    async put(key, result, now = Date.now()) {
      map.set(key, { result: forKeeping(result), madeAt: now });
    },
  };
}

const globalKept = globalThis as typeof globalThis & { __rabaiKept?: Map<string, Kept> };
let cached: { exec: Exec | null; store: KeptStore } | null = null;

export function keptStore(env: Record<string, string | undefined> = process.env): KeptStore {
  const exec = peopleExec(env);
  if (cached && cached.exec === exec) return cached.store;
  const store = exec ? createKeptStore(exec) : memoryKeptStore((globalKept.__rabaiKept ??= new Map()));
  cached = { exec, store };
  return store;
}

/** Whether an answer may be kept and given again: a clean answer with texts behind it. */
export function keepable(result: AskResult | undefined): result is AskResult {
  return !!result && result.status === "answered" && result.blocks.length > 0 && !result.safety && !result.practical;
}
