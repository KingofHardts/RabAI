/*
 * Saved chats and recent reading, kept on the person's own device (there are no accounts yet).
 * Pure functions only: the app reads and writes localStorage, and these decide what is kept.
 *
 * A saved answer is the same checked answer the person saw. Nothing here creates or changes a
 * citation; restoring a chat only shows again what citations.ts already passed.
 */

import type { AskResult } from "./engine/answer";

export interface SavedMessage {
  role: "user" | "ai";
  text?: string;
  result?: AskResult;
}

export interface SavedChat {
  id: string;
  title: string;
  /** The person's own label, such as "Gemara" or "Shabbos". Empty when not sorted. */
  category: string;
  createdAt: number;
  updatedAt: number;
  messages: SavedMessage[];
}

export const CHATS_KEY = "rabai_chats";
export const MAX_CHATS = 60;
export const MAX_MESSAGES_PER_CHAT = 80;
/** Leave room in the browser's storage (about 5 MB) for everything else the app keeps. */
export const MAX_STORED_BYTES = 3_000_000;
export const MAX_TITLE = 70;
export const MAX_CATEGORY = 30;

/** Categories offered before the person makes their own. */
export const SUGGESTED_CATEGORIES = ["Gemara", "Chumash", "Halacha", "Life questions"];

/** A chat's title: the first question, cut at a word. */
export function titleFor(messages: SavedMessage[]): string {
  const first = messages.find((m) => m.role === "user" && m.text?.trim())?.text?.replace(/\s+/g, " ").trim() ?? "";
  if (!first) return "New chat";
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

function readMessage(m: unknown): SavedMessage | null {
  if (!m || typeof m !== "object") return null;
  const x = m as Record<string, unknown>;
  if (x.role === "user" && typeof x.text === "string") return { role: "user", text: x.text };
  if (x.role === "ai" && isResult(x.result)) return { role: "ai", result: x.result };
  return null;
}

/** Saved chats from storage, checked and newest first. Anything malformed is left out. */
export function parseChats(raw: unknown): SavedChat[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedChat[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    const x = c as Record<string, unknown>;
    if (typeof x.id !== "string" || !Array.isArray(x.messages)) continue;
    const messages = x.messages.map(readMessage).filter((m): m is SavedMessage => m !== null);
    if (!messages.length || out.some((o) => o.id === x.id)) continue;
    const updatedAt = typeof x.updatedAt === "number" ? x.updatedAt : 0;
    out.push({
      id: x.id,
      title: typeof x.title === "string" && x.title.trim() ? x.title.slice(0, MAX_TITLE + 1) : titleFor(messages),
      category: typeof x.category === "string" ? cleanCategory(x.category) : "",
      createdAt: typeof x.createdAt === "number" ? x.createdAt : updatedAt,
      updatedAt,
      messages: messages.slice(-MAX_MESSAGES_PER_CHAT),
    });
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
}

/** Save a chat's latest messages: it moves to the top, and the oldest chat beyond the limit goes. */
export function upsertChat(chats: SavedChat[], chat: Omit<SavedChat, "messages"> & { messages: SavedMessage[] }): SavedChat[] {
  const messages = chat.messages
    .filter((m) => (m.role === "user" ? !!m.text?.trim() : !!m.result))
    .map((m) => (m.result ? { role: m.role, result: trimResult(m.result) } : { role: m.role, text: m.text }))
    .slice(-MAX_MESSAGES_PER_CHAT);
  if (!messages.length) return chats;
  const saved: SavedChat = { ...chat, title: chat.title || titleFor(messages), category: cleanCategory(chat.category), messages };
  return [saved, ...chats.filter((c) => c.id !== chat.id)].slice(0, MAX_CHATS);
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
