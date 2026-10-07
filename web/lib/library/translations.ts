import { createClient as createHttpClient } from "@libsql/client/http";
import type { Client, InValue } from "@libsql/client";
import { wordsFingerprint } from "./daf";
import { passageWords, readKeptTranslation, type Translation } from "../engine/gloss";

/*
 * RabAI's translation library: every translation RabAI makes (lib/engine/translate.ts) is kept
 * here, so a passage is translated once for everyone, and a batch job can fill it ahead of time
 * (scripts/translate-library.ts). It is its own database, apart from the testing library, so a
 * rebuild of the testing library never loses it, and the app can write to it.
 *
 * Every translation here is RabAI's own and is labeled as not yet reviewed by the rabbinic board
 * wherever it is shown. Each row records the text it translated (a check value of its words), so
 * a translation of an older text is never shown beside a newer one.
 */

export const TRANSLATIONS_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS translations (
    ref TEXT PRIMARY KEY,
    he_check TEXT NOT NULL,
    general TEXT,
    words TEXT,
    readings TEXT,
    basis TEXT,
    model TEXT,
    made_by TEXT NOT NULL,
    made_on TEXT NOT NULL,
    review TEXT NOT NULL DEFAULT 'unreviewed',
    reviewed_by TEXT,
    reviewed_on TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS translation_jobs (
    batch_id TEXT PRIMARY KEY,
    made_on TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL,
    manifest TEXT NOT NULL,
    note TEXT
  )`,
];

/** How a translation came to be: a person tapped Translate, or the batch job made it. */
export type MadeBy = "request" | "batch";

export interface KeptTranslation {
  translation: Translation;
  /** The check value of the words it translated (wordsFingerprint of passageWords). */
  check: string;
  madeBy: MadeBy;
  madeOn: string;
  review: string;
}

/** A batch of requests sent to the model, and what each request is for. */
export interface TranslationJobRecord {
  batchId: string;
  madeOn: string;
  model: string;
  status: "submitted" | "collected" | "failed";
  /**
   * custom_id -> what the request was for, enough to put the answers back together: the passages
   * it translates (with the check value of the text sent), and which job it was ("group" for a
   * request of several passages, or the job key of a single passage: "g", "p0", ...).
   */
  manifest: Record<string, { key: string; general: boolean; words: boolean; passages: Array<{ ref: string; check: string }> }>;
  note?: string;
}

/** The check value that ties a translation to the exact text it translated. */
export function textCheck(he: string): string {
  return wordsFingerprint(passageWords(he));
}

export function translationsDbUrl(env: Record<string, string | undefined> = process.env): string | null {
  return env.RABAI_TRANSLATIONS_DB_URL || env.TRANSLATIONS_DATABASE_URL || null;
}

export interface TranslationStore {
  /** The kept translations for these refs. */
  get(refs: string[]): Promise<Map<string, KeptTranslation>>;
  /** Keep a translation (replacing what was kept for its ref). */
  put(t: Translation, check: string, madeBy: MadeBy): Promise<void>;
  /** Which of these refs already have a translation of their current text with what is wanted. */
  have(items: Array<{ ref: string; check: string }>, want: { general: boolean; words: boolean }): Promise<Set<string>>;
  addJob(job: TranslationJobRecord): Promise<void>;
  jobs(status?: TranslationJobRecord["status"]): Promise<TranslationJobRecord[]>;
  setJobStatus(batchId: string, status: TranslationJobRecord["status"], note?: string): Promise<void>;
}

interface Exec {
  run(sql: string, args?: InValue[]): Promise<Record<string, unknown>[]>;
}

function execFrom(client: Client | Promise<Client>): Exec {
  return {
    async run(sql, args = []) {
      const rs = await (await client).execute({ sql, args });
      return rs.rows.map((r) => ({ ...r }) as Record<string, unknown>);
    },
  };
}

const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v));
const parse = (v: unknown): unknown => {
  if (typeof v !== "string") return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
};

/** The store over any database client (a local file in tests and scripts, Turso in the app). */
export function createTranslationStore(exec: Exec): TranslationStore {
  let ready: Promise<void> | null = null;
  const ensure = () => (ready ??= (async () => {
    for (const sql of TRANSLATIONS_SCHEMA) await exec.run(sql);
  })().catch((err) => {
    ready = null;
    throw err;
  }));

  const rowToKept = (r: Record<string, unknown>): KeptTranslation | null => {
    const translation = readKeptTranslation({
      ref: r.ref,
      general: r.general ?? null,
      ...(r.words !== null && r.words !== undefined ? { words: parse(r.words) ?? null } : {}),
      readings: parse(r.readings),
      basis: parse(r.basis),
      model: r.model ?? undefined,
    });
    if (!translation) return null;
    return {
      translation,
      check: String(r.he_check),
      madeBy: r.made_by === "batch" ? "batch" : "request",
      madeOn: String(r.made_on),
      review: String(r.review ?? "unreviewed"),
    };
  };

  const getMany = async (refs: string[]) => {
    await ensure();
    const out = new Map<string, KeptTranslation>();
    const wanted = [...new Set(refs)];
    for (let i = 0; i < wanted.length; i += 200) {
      const chunk = wanted.slice(i, i + 200);
      const rows = await exec.run(`SELECT * FROM translations WHERE ref IN (${chunk.map(() => "?").join(",")})`, chunk);
      for (const r of rows) {
        const kept = rowToKept(r);
        if (kept) out.set(kept.translation.ref, kept);
      }
    }
    return out;
  };

  return {
    get: getMany,

    async put(t, check, madeBy) {
      await ensure();
      await exec.run(
        `INSERT INTO translations (ref, he_check, general, words, readings, basis, model, made_by, made_on)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ref) DO UPDATE SET he_check = excluded.he_check, general = excluded.general, words = excluded.words,
           readings = excluded.readings, basis = excluded.basis, model = excluded.model, made_by = excluded.made_by,
           made_on = excluded.made_on, review = 'unreviewed', reviewed_by = NULL, reviewed_on = NULL`,
        [
          t.ref,
          check,
          t.general,
          // NULL: not made yet. "null": made, but it didn't line up with the text.
          t.words === undefined ? null : JSON.stringify(t.words),
          json(t.readings),
          json(t.basis),
          t.model ?? null,
          madeBy,
          new Date().toISOString(),
        ],
      );
    },

    async have(items, want) {
      const kept = await getMany(items.map((i) => i.ref));
      const out = new Set<string>();
      for (const { ref, check } of items) {
        const k = kept.get(ref);
        if (!k || k.check !== check) continue;
        const generalOk = !want.general || k.translation.general !== null || k.translation.words !== undefined;
        const wordsOk = !want.words || k.translation.words !== undefined;
        if (generalOk && wordsOk) out.add(ref);
      }
      return out;
    },

    async addJob(job) {
      await ensure();
      await exec.run(
        "INSERT INTO translation_jobs (batch_id, made_on, model, status, manifest, note) VALUES (?, ?, ?, ?, ?, ?)",
        [job.batchId, job.madeOn, job.model, job.status, JSON.stringify(job.manifest), job.note ?? null],
      );
    },

    async jobs(status) {
      await ensure();
      const rows = await exec.run(
        `SELECT * FROM translation_jobs${status ? " WHERE status = ?" : ""} ORDER BY made_on`,
        status ? [status] : [],
      );
      return rows.map((r) => ({
        batchId: String(r.batch_id),
        madeOn: String(r.made_on),
        model: String(r.model),
        status: String(r.status) as TranslationJobRecord["status"],
        manifest: (parse(r.manifest) ?? {}) as TranslationJobRecord["manifest"],
        ...(typeof r.note === "string" ? { note: r.note } : {}),
      }));
    },

    async setJobStatus(batchId, status, note) {
      await ensure();
      await exec.run("UPDATE translation_jobs SET status = ?, note = ? WHERE batch_id = ?", [status, note ?? null, batchId]);
    },
  };
}

let cached: { url: string; store: TranslationStore } | null = null;

/** RabAI's translation library, or null when the app isn't connected to one. */
export function translationStore(env: Record<string, string | undefined> = process.env): TranslationStore | null {
  const url = translationsDbUrl(env);
  if (!url) return null;
  if (cached?.url === url) return cached.store;
  const authToken = env.RABAI_TRANSLATIONS_DB_TOKEN || env.TRANSLATIONS_AUTH_TOKEN || undefined;
  const remote = /^(libsql|https?):\/\//.test(url);
  const client: Promise<Client> = remote
    ? Promise.resolve(createHttpClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken }))
    : import("@libsql/client").then((m) => m.createClient({ url, authToken }));
  const store = createTranslationStore(execFrom(client));
  cached = { url, store };
  return store;
}
