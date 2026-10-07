import { createClient as createHttpClient } from "@libsql/client/http";
import type { Client, InValue } from "@libsql/client";
import { parseProfile, type LearnerProfile } from "../learner-profile";
import { MAX_CHATS, parseChats, type SavedChat } from "../saved-chats";
import { newId, sameCheck } from "./crypto";
import { chatIdShape, chatStamp, fitChat, jsonBytes, profileToStore, type ChatIndexEntry, type MergeMode } from "./merge";
import type { FeedbackRecord } from "./feedback";

/*
 * The people database, "rabai-people" (docs/learner-profiles.md, phase 2): accounts, sign-in
 * links, sessions, each person's profile and saved chats, and "Was this helpful?" feedback.
 *
 * What it never holds: an email address (only an HMAC of it, see crypto.ts), a sign-in or session
 * token (only a hash), or anything linking feedback to a person. It is never deleted as a whole;
 * a person's rows are deleted when they delete their account.
 */

export const PEOPLE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    email_check TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_links (
    token_check TEXT PRIMARY KEY,
    email_check TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS login_links_email ON login_links (email_check)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_check TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_person ON sessions (person_id)`,
  `CREATE TABLE IF NOT EXISTS profiles (
    person_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  // A deleted chat keeps its row, without its contents, so other devices learn it was deleted.
  `CREATE TABLE IF NOT EXISTS chats (
    person_id TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    bytes INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (person_id, id)
  )`,
  // Each device's first sign-in, so its counts are added to the account once even if it is sent twice.
  `CREATE TABLE IF NOT EXISTS device_joins (
    person_id TEXT NOT NULL,
    join_id TEXT NOT NULL,
    at INTEGER NOT NULL,
    PRIMARY KEY (person_id, join_id)
  )`,
  // Not linked to any person, and never stored with a profile.
  `CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    helpful INTEGER NOT NULL,
    reason TEXT,
    note TEXT,
    question TEXT,
    answer TEXT,
    sources TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS feedback_created ON feedback (created_at)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL
  )`,
];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A sign-in link works once, for this long. */
export const LINK_LIFETIME_MS = 15 * MINUTE;
/** A session lasts this long after it was last used. */
export const SESSION_LIFETIME_MS = 60 * DAY;
/** How often a session's last use is written down (and its 60 days restarted). */
const SESSION_REFRESH_MS = DAY;
/** How long a deleted chat's marker is kept for other devices to see. */
export const DELETED_CHAT_KEEP_MS = 90 * DAY;
/** The most one chat may take, and all of a person's chats together. */
export const MAX_CHAT_BYTES = 512 * 1024;
export const MAX_ACCOUNT_CHAT_BYTES = 3_000_000;

export interface SessionInfo {
  personId: string;
  /** True when the session's 60 days were restarted just now (the cookie should be renewed too). */
  refreshed: boolean;
}

export type LinkUse = { ok: true; emailCheck: string } | { ok: false; reason: "used" | "expired" | "unknown" };

export interface PeopleStore {
  createLoginLink(emailCheck: string, tokenCheck: string, now?: number): Promise<void>;
  useLoginLink(tokenCheck: string, now?: number): Promise<LinkUse>;
  findOrCreatePerson(emailCheck: string, now?: number): Promise<{ personId: string; created: boolean }>;
  createSession(personId: string, tokenCheck: string, now?: number): Promise<void>;
  sessionPerson(tokenCheck: string, now?: number): Promise<SessionInfo | null>;
  deleteSession(tokenCheck: string): Promise<void>;
  getProfile(personId: string): Promise<LearnerProfile | null>;
  /** Merge a device's copy into the account (merge.ts) and keep the result. */
  saveProfile(personId: string, incoming: LearnerProfile, opts?: { join?: boolean; joinId?: string; now?: number }): Promise<LearnerProfile>;
  chatIndex(personId: string, now?: number): Promise<{ live: ChatIndexEntry[]; deleted: string[] }>;
  getChats(personId: string, ids: string[]): Promise<SavedChat[]>;
  saveChats(personId: string, upsert: SavedChat[], remove: string[], now?: number): Promise<{ saved: number; skipped: number; removed: number }>;
  /** Everything kept for a person, for "Download my data". */
  exportData(personId: string): Promise<{ profile: LearnerProfile | null; chats: SavedChat[] }>;
  /** Delete everything kept for a person: account, sessions, profile, chats. */
  deleteAccount(personId: string): Promise<void>;
  /** Count one use of a limited action. False when the limit for this window is already reached. */
  hit(key: string, limit: number, windowMs: number, now?: number): Promise<boolean>;
  addFeedback(record: FeedbackRecord, now?: number): Promise<void>;
  feedbackSince(since: number): Promise<Array<FeedbackRecord & { id: string; createdAt: number }>>;
  /** Remove expired links, sessions, counters and old deletion markers. */
  cleanup(now?: number): Promise<void>;
}

export interface Exec {
  run(sql: string, args?: InValue[]): Promise<Record<string, unknown>[]>;
  /** Several writes that succeed or fail together. */
  batch(statements: Array<{ sql: string; args?: InValue[] }>): Promise<void>;
}

export function execFrom(client: Client | Promise<Client>): Exec {
  return {
    async run(sql, args = []) {
      const rs = await (await client).execute({ sql, args });
      return rs.rows.map((r) => ({ ...r }) as Record<string, unknown>);
    },
    async batch(statements) {
      await (await client).batch(statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })), "write");
    },
  };
}

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : Number(v ?? 0));
const parseJson = (v: unknown): unknown => {
  if (typeof v !== "string") return undefined;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
};

/** The store over any database client (an in-memory or local file in tests, Turso in the app). */
export function createPeopleStore(exec: Exec): PeopleStore {
  let ready: Promise<void> | null = null;
  const ensure = () =>
    (ready ??= (async () => {
      for (const sql of PEOPLE_SCHEMA) await exec.run(sql);
    })().catch((err) => {
      ready = null;
      throw err;
    }));

  const getProfile = async (personId: string) => {
    await ensure();
    const rows = await exec.run("SELECT data FROM profiles WHERE person_id = ?", [personId]);
    if (!rows.length) return null;
    return parseProfile(parseJson(rows[0].data) ?? null);
  };

  const liveChats = async (personId: string) => {
    const rows = await exec.run("SELECT id, data FROM chats WHERE person_id = ? AND deleted = 0", [personId]);
    return parseChats(rows.map((r) => parseJson(r.data)).filter(Boolean));
  };

  return {
    async createLoginLink(emailCheck, tokenCheck, now = Date.now()) {
      await ensure();
      await exec.run("INSERT INTO login_links (token_check, email_check, created_at, expires_at) VALUES (?, ?, ?, ?)", [
        tokenCheck,
        emailCheck,
        now,
        now + LINK_LIFETIME_MS,
      ]);
    },

    async useLoginLink(tokenCheck, now = Date.now()) {
      await ensure();
      // One statement, so a link can be used only once even if it is opened twice at the same moment.
      const rows = await exec.run(
        "UPDATE login_links SET used_at = ? WHERE token_check = ? AND used_at IS NULL AND expires_at > ? RETURNING token_check, email_check",
        [now, tokenCheck, now],
      );
      if (rows.length && sameCheck(String(rows[0].token_check), tokenCheck)) return { ok: true, emailCheck: String(rows[0].email_check) };
      const seen = await exec.run("SELECT used_at FROM login_links WHERE token_check = ?", [tokenCheck]);
      if (!seen.length) return { ok: false, reason: "unknown" };
      return { ok: false, reason: seen[0].used_at !== null && seen[0].used_at !== undefined ? "used" : "expired" };
    },

    async findOrCreatePerson(emailCheck, now = Date.now()) {
      await ensure();
      const id = newId();
      const rows = await exec.run(
        `INSERT INTO people (id, email_check, created_at, last_seen) VALUES (?, ?, ?, ?)
         ON CONFLICT(email_check) DO UPDATE SET last_seen = excluded.last_seen
         RETURNING id`,
        [id, emailCheck, now, now],
      );
      const personId = String(rows[0].id);
      return { personId, created: personId === id };
    },

    async createSession(personId, tokenCheck, now = Date.now()) {
      await ensure();
      await exec.run("INSERT INTO sessions (token_check, person_id, created_at, expires_at, last_seen) VALUES (?, ?, ?, ?, ?)", [
        tokenCheck,
        personId,
        now,
        now + SESSION_LIFETIME_MS,
        now,
      ]);
    },

    async sessionPerson(tokenCheck, now = Date.now()) {
      await ensure();
      const rows = await exec.run(
        "SELECT s.token_check, s.person_id, s.expires_at, s.last_seen FROM sessions s JOIN people p ON p.id = s.person_id WHERE s.token_check = ?",
        [tokenCheck],
      );
      if (!rows.length || !sameCheck(String(rows[0].token_check), tokenCheck)) return null;
      const r = rows[0];
      if (num(r.expires_at) <= now) {
        await exec.run("DELETE FROM sessions WHERE token_check = ?", [tokenCheck]);
        return null;
      }
      const personId = String(r.person_id);
      if (now - num(r.last_seen) < SESSION_REFRESH_MS) return { personId, refreshed: false };
      await exec.batch([
        { sql: "UPDATE sessions SET last_seen = ?, expires_at = ? WHERE token_check = ?", args: [now, now + SESSION_LIFETIME_MS, tokenCheck] },
        { sql: "UPDATE people SET last_seen = ? WHERE id = ?", args: [now, personId] },
      ]);
      return { personId, refreshed: true };
    },

    async deleteSession(tokenCheck) {
      await ensure();
      await exec.run("DELETE FROM sessions WHERE token_check = ?", [tokenCheck]);
    },

    getProfile,

    async saveProfile(personId, incoming, opts = {}) {
      await ensure();
      const now = opts.now ?? Date.now();
      const stored = await getProfile(personId);
      let mode: MergeMode = "sync";
      if (opts.join && opts.joinId) {
        const seen = await exec.run("SELECT 1 FROM device_joins WHERE person_id = ? AND join_id = ?", [personId, opts.joinId]);
        if (!seen.length) mode = "join";
      }
      const merged = profileToStore(stored, parseProfile(incoming), mode);
      const writes: Array<{ sql: string; args: InValue[] }> = [
        {
          sql: `INSERT INTO profiles (person_id, data, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(person_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
          args: [personId, JSON.stringify(merged), now],
        },
      ];
      if (mode === "join") {
        writes.push({ sql: "INSERT OR IGNORE INTO device_joins (person_id, join_id, at) VALUES (?, ?, ?)", args: [personId, opts.joinId!, now] });
      }
      await exec.batch(writes);
      return merged;
    },

    async chatIndex(personId, now = Date.now()) {
      await ensure();
      const rows = await exec.run("SELECT id, updated_at, deleted FROM chats WHERE person_id = ?", [personId]);
      const live: ChatIndexEntry[] = [];
      const deleted: string[] = [];
      for (const r of rows) {
        if (num(r.deleted)) {
          if (now - num(r.updated_at) < DELETED_CHAT_KEEP_MS) deleted.push(String(r.id));
        } else live.push({ id: String(r.id), stamp: num(r.updated_at) });
      }
      return { live, deleted };
    },

    async getChats(personId, ids) {
      await ensure();
      const wanted = [...new Set(ids.filter(chatIdShape))].slice(0, MAX_CHATS);
      if (!wanted.length) return [];
      const rows = await exec.run(
        `SELECT data FROM chats WHERE person_id = ? AND deleted = 0 AND id IN (${wanted.map(() => "?").join(",")})`,
        [personId, ...wanted],
      );
      return parseChats(rows.map((r) => parseJson(r.data)).filter(Boolean));
    },

    async saveChats(personId, upsert, remove, now = Date.now()) {
      await ensure();
      let saved = 0;
      let skipped = 0;
      const writes: Array<{ sql: string; args: InValue[] }> = [];
      for (const chat of parseChats(upsert)) {
        const fitted = chatIdShape(chat.id) ? fitChat(chat, MAX_CHAT_BYTES) : null;
        if (!fitted) {
          skipped++;
          continue;
        }
        // Kept only when it changed after what the account has (including a deletion).
        writes.push({
          sql: `INSERT INTO chats (person_id, id, data, updated_at, deleted, bytes) VALUES (?, ?, ?, ?, 0, ?)
                ON CONFLICT(person_id, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, deleted = 0, bytes = excluded.bytes
                WHERE excluded.updated_at > chats.updated_at`,
          args: [personId, fitted.id, JSON.stringify(fitted), chatStamp(fitted), jsonBytes(fitted)],
        });
        saved++;
      }
      const gone = [...new Set(remove.filter(chatIdShape))].slice(0, MAX_CHATS * 4);
      for (const id of gone) {
        // A deletion always wins over what is there now, whatever the devices' clocks say.
        writes.push({
          sql: `INSERT INTO chats (person_id, id, data, updated_at, deleted, bytes) VALUES (?, ?, NULL, ?, 1, 0)
                ON CONFLICT(person_id, id) DO UPDATE SET data = NULL, deleted = 1, bytes = 0, updated_at = MAX(excluded.updated_at, chats.updated_at + 1)`,
          args: [personId, id, now],
        });
      }
      if (writes.length) await exec.batch(writes);
      await trimChats(exec, personId, now);
      return { saved, skipped, removed: gone.length };
    },

    async exportData(personId) {
      await ensure();
      const [profile, chats] = await Promise.all([getProfile(personId), liveChats(personId)]);
      return { profile, chats };
    },

    async deleteAccount(personId) {
      await ensure();
      const person = await exec.run("SELECT email_check FROM people WHERE id = ?", [personId]);
      const writes: Array<{ sql: string; args: InValue[] }> = [
        { sql: "DELETE FROM chats WHERE person_id = ?", args: [personId] },
        { sql: "DELETE FROM profiles WHERE person_id = ?", args: [personId] },
        { sql: "DELETE FROM device_joins WHERE person_id = ?", args: [personId] },
        { sql: "DELETE FROM sessions WHERE person_id = ?", args: [personId] },
        { sql: "DELETE FROM people WHERE id = ?", args: [personId] },
      ];
      if (person.length) writes.push({ sql: "DELETE FROM login_links WHERE email_check = ?", args: [String(person[0].email_check)] });
      await exec.batch(writes);
    },

    async hit(key, limit, windowMs, now = Date.now()) {
      await ensure();
      const rows = await exec.run(
        `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count + 1 END,
           window_start = CASE WHEN rate_limits.window_start <= ? THEN excluded.window_start ELSE rate_limits.window_start END
         RETURNING count`,
        [key, now, now - windowMs, now - windowMs],
      );
      return num(rows[0]?.count) <= limit;
    },

    async addFeedback(record, now = Date.now()) {
      await ensure();
      // Kept to the hour, so the time can't tie a note to a moment someone was using the app.
      const hour = Math.floor(now / HOUR) * HOUR;
      await exec.run("INSERT INTO feedback (id, created_at, helpful, reason, note, question, answer, sources) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        newId(),
        hour,
        record.helpful ? 1 : 0,
        record.reasons.length ? JSON.stringify(record.reasons) : null,
        record.note || null,
        record.question || null,
        record.answer || null,
        record.sources.length ? JSON.stringify(record.sources) : null,
      ]);
    },

    async feedbackSince(since) {
      await ensure();
      const rows = await exec.run("SELECT * FROM feedback WHERE created_at >= ? ORDER BY created_at DESC", [since]);
      return rows.map((r) => {
        const reasons = parseJson(r.reason);
        const sources = parseJson(r.sources);
        return {
          id: String(r.id),
          createdAt: num(r.created_at),
          helpful: num(r.helpful) === 1,
          reasons: Array.isArray(reasons) ? reasons.filter((x): x is FeedbackRecord["reasons"][number] => typeof x === "string") : [],
          note: typeof r.note === "string" ? r.note : "",
          question: typeof r.question === "string" ? r.question : "",
          answer: typeof r.answer === "string" ? r.answer : "",
          sources: Array.isArray(sources) ? sources.filter((x): x is string => typeof x === "string") : [],
        };
      });
    },

    async cleanup(now = Date.now()) {
      await ensure();
      await exec.batch([
        { sql: "DELETE FROM login_links WHERE expires_at < ?", args: [now - DAY] },
        { sql: "DELETE FROM sessions WHERE expires_at < ?", args: [now] },
        { sql: "DELETE FROM rate_limits WHERE window_start < ?", args: [now - DAY] },
        { sql: "DELETE FROM chats WHERE deleted = 1 AND updated_at < ?", args: [now - DELETED_CHAT_KEEP_MS] },
      ]);
    },
  };
}

/** Keep at most MAX_CHATS chats and MAX_ACCOUNT_CHAT_BYTES per person: the oldest are marked deleted. */
async function trimChats(exec: Exec, personId: string, now: number) {
  const rows = await exec.run("SELECT id, bytes FROM chats WHERE person_id = ? AND deleted = 0 ORDER BY updated_at DESC", [personId]);
  let total = 0;
  const drop: string[] = [];
  rows.forEach((r, i) => {
    total += num(r.bytes);
    if (i >= MAX_CHATS || total > MAX_ACCOUNT_CHAT_BYTES) drop.push(String(r.id));
  });
  if (!drop.length) return;
  await exec.batch(
    drop.map((id) => ({
      sql: "UPDATE chats SET data = NULL, deleted = 1, bytes = 0, updated_at = MAX(?, updated_at + 1) WHERE person_id = ? AND id = ?",
      args: [now, personId, id],
    })),
  );
}

// ---------------------------------------------------------------------------
// Connecting

export function peopleDbUrl(env: Record<string, string | undefined> = process.env): string | null {
  return env.PEOPLE_DATABASE_URL || env.RABAI_PEOPLE_DB_URL || null;
}

let cached: { url: string; store: PeopleStore } | null = null;

/** The people database, or null when the app isn't connected to one. */
export function peopleStore(env: Record<string, string | undefined> = process.env): PeopleStore | null {
  const url = peopleDbUrl(env);
  if (!url) return null;
  if (cached?.url === url) return cached.store;
  const authToken = env.PEOPLE_AUTH_TOKEN || env.RABAI_PEOPLE_DB_TOKEN || undefined;
  const remote = /^(libsql|https?):\/\//.test(url);
  const client: Promise<Client> = remote
    ? Promise.resolve(createHttpClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken }))
    : import("@libsql/client").then((m) => m.createClient({ url, authToken }));
  const store = createPeopleStore(execFrom(client));
  cached = { url, store };
  return store;
}
