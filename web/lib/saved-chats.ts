/*
 * Saved chats and recent reading, kept on the person's own device, and saved chats also in their
 * account when they sign in (lib/account/). Pure functions only: the app reads and writes
 * localStorage, and these decide what is kept.
 *
 * A saved answer is the same checked answer the person saw. Nothing here creates or changes a
 * citation; restoring a chat only shows again what citations.ts already passed.
 */

import type { AskResult } from "./engine/answer";

/** A small preview of a picture sent with a question, kept with the chat on the device only. */
export interface SavedPicture {
  /** A small JPEG, as a data URL. */
  src: string;
  w: number;
  h: number;
}

/** An answer still being written (lib/answer-jobs.ts): its id and when it was asked for. */
export interface PendingAnswer {
  id: string;
  at: number;
}

export interface SavedMessage {
  role: "user" | "ai";
  text?: string;
  result?: AskResult;
  /** On a question: previews of the pictures sent with it (on this device). */
  pictures?: SavedPicture[];
  /** On a question whose previews stayed on another device: how many pictures it had. */
  pictureCount?: number;
  /** On an answer still being written. Kept on the device only, never in the account. */
  pending?: PendingAnswer;
}

export interface SavedChat {
  id: string;
  title: string;
  /** The person's own label, such as "Gemara" or "Shabbos". Empty when not sorted. */
  category: string;
  createdAt: number;
  updatedAt: number;
  /** When its name or category last changed, so the change reaches the person's other devices. */
  changedAt?: number;
  messages: SavedMessage[];
}

export const CHATS_KEY = "rabai_chats";
export const MAX_CHATS = 60;
export const MAX_MESSAGES_PER_CHAT = 80;
/** Leave room in the browser's storage (about 5 MB) for everything else the app keeps. */
export const MAX_STORED_BYTES = 3_000_000;
export const MAX_TITLE = 70;
export const MAX_CATEGORY = 30;
/** A picture preview, in data-URL characters, and how many one question may keep. */
export const MAX_PREVIEW_CHARS = 60_000;
export const MAX_PREVIEWS = 4;
const ANSWER_ID = /^[A-Za-z0-9_-]{22,64}$/;

/** Categories offered before the person makes their own. */
export const SUGGESTED_CATEGORIES = ["Gemara", "Chumash", "Halacha", "Life questions"];

/** A chat's title: the first question, cut at a word. */
export function titleFor(messages: SavedMessage[]): string {
  const first = messages.find((m) => m.role === "user" && m.text?.trim())?.text?.replace(/\s+/g, " ").trim() ?? "";
  if (!first) return messages.some((m) => m.role === "user" && (m.pictures?.length || m.pictureCount)) ? "A picture" : "New chat";
  if (first.length <= MAX_TITLE) return first;
  return `${first.slice(0, MAX_TITLE).replace(/\s+\S*$/, "")}…`;
}

export function cleanCategory(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_CATEGORY);
}

/** Keep what the chat shows; drop long lists the person never sees again. */
function trimResult(result: AskResult): AskResult {
  return {
    ...result,
    retrieved: result.retrieved.slice(0, 20),
    ...(result.lookedUp ? { lookedUp: result.lookedUp.slice(0, 20) } : {}),
  };
}

function isResult(r: unknown): r is AskResult {
  if (!r || typeof r !== "object") return false;
  const x = r as Record<string, unknown>;
  return (
    typeof x.status === "string" &&
    Array.isArray(x.blocks) &&
    x.blocks.every((b) => b && typeof (b as { text?: unknown }).text === "string" && Array.isArray((b as { citations?: unknown }).citations)) &&
    Array.isArray(x.sources) &&
    Array.isArray(x.retrieved)
  );
}

function readPictures(raw: unknown): SavedPicture[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is SavedPicture =>
        !!p &&
        typeof p.src === "string" &&
        /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.src) &&
        p.src.length <= MAX_PREVIEW_CHARS &&
        typeof p.w === "number" &&
        typeof p.h === "number",
    )
    .slice(0, MAX_PREVIEWS)
    .map((p) => ({ src: p.src, w: Math.round(p.w), h: Math.round(p.h) }));
}

/**
 * Where saved chats are read. On the device a chat keeps its picture previews and any answer still
 * being written; in the person's account it keeps neither (only how many pictures a question had).
 */
export type ChatPlace = "device" | "account";

function readMessage(m: unknown, place: ChatPlace): SavedMessage | null {
  if (!m || typeof m !== "object") return null;
  const x = m as Record<string, unknown>;
  if (x.role === "user" && typeof x.text === "string") {
    const pictures = readPictures(x.pictures);
    const count = Math.min(MAX_PREVIEWS, Math.max(pictures.length, typeof x.pictureCount === "number" && x.pictureCount > 0 ? Math.floor(x.pictureCount) : 0));
    if (!x.text.trim() && !count) return null;
    if (place === "account" || !pictures.length) return { role: "user", text: x.text, ...(count ? { pictureCount: count } : {}) };
    return { role: "user", text: x.text, pictures };
  }
  if (x.role === "ai" && isResult(x.result)) return { role: "ai", result: x.result };
  const pending = x.pending as Record<string, unknown> | undefined;
  if (place === "device" && x.role === "ai" && pending && typeof pending.id === "string" && ANSWER_ID.test(pending.id) && typeof pending.at === "number")
    return { role: "ai", pending: { id: pending.id, at: pending.at } };
  return null;
}

/** Saved chats from storage, checked and newest first. Anything malformed is left out. */
export function parseChats(raw: unknown, place: ChatPlace = "device"): SavedChat[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedChat[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const x = c as Record<string, unknown>;
    if (typeof x.id !== "string" || !Array.isArray(x.messages)) continue;
    const messages = x.messages.map((m) => readMessage(m, place)).filter((m): m is SavedMessage => m !== null);
    if (!messages.length || out.some((o) => o.id === x.id)) continue;
    const updatedAt = typeof x.updatedAt === "number" ? x.updatedAt : 0;
    out.push({
      id: x.id,
      title: typeof x.title === "string" && x.title.trim() ? x.title.slice(0, MAX_TITLE + 1) : titleFor(messages),
      category: typeof x.category === "string" ? cleanCategory(x.category) : "",
      createdAt: typeof x.createdAt === "number" ? x.createdAt : updatedAt,
      updatedAt,
      ...(typeof x.changedAt === "number" && Number.isFinite(x.changedAt) && x.changedAt > 0 ? { changedAt: x.changedAt } : {}),
      messages: messages.slice(-MAX_MESSAGES_PER_CHAT),
    });
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
}

/** Save a chat's latest messages: it moves to the top, and the oldest chat beyond the limit goes. */
export function upsertChat(chats: SavedChat[], chat: Omit<SavedChat, "messages"> & { messages: SavedMessage[] }): SavedChat[] {
  const messages = chat.messages
    .filter((m) => (m.role === "user" ? !!m.text?.trim() || !!m.pictures?.length || !!m.pictureCount : !!m.result || !!m.pending))
    .map((m): SavedMessage => {
      if (m.role === "ai") return m.result ? { role: "ai", result: trimResult(m.result) } : { role: "ai", pending: m.pending };
      return {
        role: "user",
        text: m.text ?? "",
        ...(m.pictures?.length ? { pictures: m.pictures.slice(0, MAX_PREVIEWS) } : m.pictureCount ? { pictureCount: m.pictureCount } : {}),
      };
    })
    .slice(-MAX_MESSAGES_PER_CHAT);
  if (!messages.length) return chats;
  const saved: SavedChat = { ...chat, title: chat.title || titleFor(messages), category: cleanCategory(chat.category), messages };
  return [saved, ...chats.filter((c) => c.id !== chat.id)].slice(0, MAX_CHATS);
}

/** The answers still being written, in every chat, newest first. */
export function pendingAnswers(chats: SavedChat[]): Array<{ chatId: string; pending: PendingAnswer }> {
  const out: Array<{ chatId: string; pending: PendingAnswer }> = [];
  for (const c of chats) for (const m of c.messages) if (m.pending) out.push({ chatId: c.id, pending: m.pending });
  return out.sort((a, b) => b.pending.at - a.pending.at);
}

/** A chat as the person's account keeps it: no picture previews, no answers still being written. */
export function chatForAccount(chat: SavedChat): SavedChat {
  return parseChats([chat], "account")[0] ?? { ...chat, messages: [] };
}

/** Chats grouped by category, the person's categories in A–Z order and unsorted chats last. */
export function groupByCategory(chats: SavedChat[]): Array<{ category: string; chats: SavedChat[] }> {
  const groups = new Map<string, SavedChat[]>();
  for (const c of chats) groups.set(c.category, [...(groups.get(c.category) ?? []), c]);
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([category, list]) => ({ category, chats: list }));
}

/** Every category in use, plus the suggested ones, without repeats. */
export function categoriesFor(chats: SavedChat[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [...chats.map((c) => c.category), ...SUGGESTED_CATEGORIES]) {
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

/** JSON for storage, dropping the oldest chats until it fits. */
export function serializeChats(chats: SavedChat[], maxBytes = MAX_STORED_BYTES): string {
  let keep = chats.slice(0, MAX_CHATS);
  let json = JSON.stringify(keep);
  while (json.length > maxBytes && keep.length > 1) {
    keep = keep.slice(0, -1);
    json = JSON.stringify(keep);
  }
  return json;
}

/** A short, readable date for the chat list: "Today", "Yesterday", or "Oct 3". */
export function whenLabel(time: number, now = Date.now()): string {
  const day = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const days = Math.round((day(now) - day(time)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(time);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}) });
}

// ---------------------------------------------------------------------------
// Recent reading: where the person was learning, so they can pick up there.

export interface RecentReading {
  ref: string;
  title: string;
  at: number;
  /** Opened as the printed page rather than line by line. */
  page?: boolean;
}

export const RECENT_KEY = "rabai_recent_reading";
export const MAX_RECENT = 8;

export function parseRecent(raw: unknown): RecentReading[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is RecentReading => !!r && typeof r.ref === "string" && typeof r.title === "string" && typeof r.at === "number")
    .map((r) => (r.page === true ? { ref: r.ref, title: r.title, at: r.at, page: true } : { ref: r.ref, title: r.title, at: r.at }))
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_RECENT);
}

/** Remember a place: one entry per book section and way of reading it, the newest first. */
export function addRecent(list: RecentReading[], entry: RecentReading): RecentReading[] {
  return [entry, ...list.filter((r) => r.title !== entry.title || !!r.page !== !!entry.page)].slice(0, MAX_RECENT);
}
