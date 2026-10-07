import { emptyProfile, MAX_BOOKS, MAX_WORDS, type LearnerProfile, type ObservedProfile } from "../learner-profile";
import { MAX_CHATS, type SavedChat } from "../saved-chats";

/*
 * How two copies of a person's data become one: the copy on a device and the copy in their account
 * (docs/learner-profiles.md, "Phase 2"). Pure functions, used on the server when a device sends its
 * copy and on the device when the account answers, so both sides settle on the same result.
 *
 * The profile
 * - What they told RabAI, and the remember switch: each comes from the copy where it changed last
 *   (statedAt, rememberAt). A tie on the switch keeps remembering off if either copy has it off.
 * - What RabAI noticed: forgetting wins. Only what was noticed after the latest "forget" in either
 *   copy is kept (observedSince). A copy that forgot earlier can still add a book or word it noticed
 *   after that, but counted once, since its older counts may be from before the forget; its other
 *   counts are left out.
 * - Counts are never added twice. Keeping a device in step with the account ("sync") takes the
 *   larger count for each book, word and tally: both copies grew from the same account copy, so
 *   the larger one already includes the smaller. The first time a device joins an account
 *   ("join") its counts were never in the account, so they are added. The server records each
 *   join, so a join sent twice is added once.
 *
 * Chats
 * - By id; the copy changed last wins (chatStamp). A chat deleted in one place stays deleted unless
 *   it changed somewhere else after the deletion.
 */

export type MergeMode = "join" | "sync";

type Item = { count: number; last: number };

function mergeItems<T extends Item>(
  key: (x: T) => string,
  lists: Array<{ items: T[]; current: boolean }>,
  since: number,
  mode: MergeMode,
): T[] {
  const out = new Map<string, T>();
  for (const { items, current } of lists) {
    for (const item of items) {
      // Noticed before the latest forget: forgotten.
      if (current ? item.last < since : item.last <= since) continue;
      // From a copy that forgot earlier, only "noticed again after the forget" is known for sure.
      const counted = current ? item.count : 1;
      const k = key(item);
      const seen = out.get(k);
      if (!seen) out.set(k, { ...item, count: counted });
      else out.set(k, { ...seen, count: mode === "join" ? seen.count + counted : Math.max(seen.count, counted), last: Math.max(seen.last, item.last) });
    }
  }
  return [...out.values()];
}

function mergeObserved(a: LearnerProfile, b: LearnerProfile, mode: MergeMode): { observed: ObservedProfile; since: number } {
  const since = Math.max(a.observedSince, b.observedSince);
  const copies = [a, b].map((p) => ({ p, current: p.observedSince === since }));
  const books = mergeItems(
    (x) => x.title,
    copies.map(({ p, current }) => ({ items: p.observed.books, current })),
    since,
    mode,
  )
    .sort((x, y) => y.last - x.last)
    .slice(0, MAX_BOOKS);
  const words = mergeItems(
    (x) => x.word,
    copies.map(({ p, current }) => ({ items: p.observed.words, current })),
    since,
    mode,
  )
    .sort((x, y) => y.count - x.count || y.last - x.last)
    .slice(0, MAX_WORDS);
  const tally = (k: "simpler" | "deeper" | "questions") => {
    const values = copies.filter((c) => c.current).map((c) => c.p.observed[k]);
    return mode === "join" ? values.reduce((s, v) => s + v, 0) : Math.max(0, ...values);
  };
  return { observed: { books, words, simpler: tally("simpler"), deeper: tally("deeper"), questions: tally("questions") }, since };
}

/**
 * One profile from two. `base` wins ties on what the person told RabAI (pass the account's copy as
 * base on the server, and the device's own copy as base on the device).
 */
export function mergeProfiles(base: LearnerProfile, other: LearnerProfile, mode: MergeMode = "sync"): LearnerProfile {
  const statedFrom = other.statedAt > base.statedAt ? other : base;
  const remember =
    other.rememberAt > base.rememberAt ? other.remember : base.rememberAt > other.rememberAt ? base.remember : base.remember && other.remember;
  const { observed, since } = mergeObserved(base, other, mode);
  return {
    v: 1,
    remember,
    stated: { ...statedFrom.stated, ...(statedFrom.stated.goals ? { goals: [...statedFrom.stated.goals] } : {}) },
    observed,
    updatedAt: Math.max(base.updatedAt, other.updatedAt),
    statedAt: Math.max(base.statedAt, other.statedAt),
    rememberAt: Math.max(base.rememberAt, other.rememberAt),
    observedSince: since,
  };
}

/**
 * What a device's copy says when nothing about the person is taken from it: only the switch, and
 * any forgetting (when it last forgot what RabAI noticed, and, if it holds nothing the person told
 * RabAI, when that was cleared). Times only; no books, words, counts or answers.
 */
function switchAndForgetting(p: LearnerProfile): LearnerProfile {
  return {
    ...emptyProfile(),
    remember: p.remember,
    rememberAt: p.rememberAt,
    observedSince: p.observedSince,
    statedAt: Object.keys(p.stated).length ? 0 : p.statedAt,
    updatedAt: Math.max(p.rememberAt, p.observedSince, Object.keys(p.stated).length ? 0 : p.statedAt),
  };
}

/**
 * What the account keeps when a device sends its copy. With remembering off (after the merge),
 * nothing new about the person is kept: only the switch changes, and forgetting still reaches the
 * account. Everything else stays as it was.
 */
export function profileToStore(stored: LearnerProfile | null, incoming: LearnerProfile, mode: MergeMode): LearnerProfile {
  const base = stored ?? emptyProfile();
  const merged = mergeProfiles(base, incoming, mode);
  if (merged.remember) return merged;
  const kept = mergeProfiles(base, switchAndForgetting(incoming), "sync");
  return { ...kept, remember: false, rememberAt: merged.rememberAt };
}

/**
 * What a device sends about the profile. With remembering off it sends only the switch and any
 * forgetting, so nothing it knows about the person leaves it.
 */
export function profileToSend(profile: LearnerProfile): LearnerProfile {
  return profile.remember ? profile : switchAndForgetting(profile);
}

// ---------------------------------------------------------------------------
// Chats

/** When anything about a chat last changed: a new message, or a new name or category. */
export function chatStamp(chat: Pick<SavedChat, "updatedAt"> & { changedAt?: number }): number {
  return Math.max(chat.updatedAt || 0, chat.changedAt || 0);
}

/** A chat id as the app makes them. Anything else is refused. */
export function chatIdShape(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

export interface ChatIndexEntry {
  id: string;
  stamp: number;
}

/**
 * What a device does with the account's list of chats: which of its own chats to drop (deleted in
 * the account), which to send up (newer here, or not in the account), and which to fetch (newer in
 * the account, or not on this device).
 */
export function reconcileChats(local: SavedChat[], index: ChatIndexEntry[], deleted: string[]) {
  const server = new Map(index.map((e) => [e.id, e.stamp]));
  const gone = new Set(deleted);
  const keep = local.filter((c) => !gone.has(c.id));
  const push = keep.filter((c) => {
    const s = server.get(c.id);
    return s === undefined || chatStamp(c) > s;
  });
  const mine = new Map(keep.map((c) => [c.id, chatStamp(c)]));
  const fetch = index.filter((e) => !gone.has(e.id) && (mine.get(e.id) ?? -1) < e.stamp).map((e) => e.id);
  return { keep, push, fetch };
}

/** Two lists of chats as one: by id, the copy changed last wins; newest first, at most MAX_CHATS. */
export function mergeChatLists(a: SavedChat[], b: SavedChat[]): SavedChat[] {
  const out = new Map<string, SavedChat>();
  for (const c of [...a, ...b]) {
    const seen = out.get(c.id);
    if (!seen || chatStamp(c) > chatStamp(seen)) out.set(c.id, c);
  }
  return [...out.values()].sort((x, y) => y.updatedAt - x.updatedAt).slice(0, MAX_CHATS);
}

/**
 * A chat that fits in `maxBytes` of JSON: its oldest messages are dropped until it does (a saved
 * answer is never changed, only left out). Null when even one message is too big.
 */
export function fitChat(chat: SavedChat, maxBytes: number): SavedChat | null {
  let messages = chat.messages;
  while (messages.length) {
    const c = { ...chat, messages };
    if (jsonBytes(c) <= maxBytes) return c;
    messages = messages.slice(1);
  }
  return null;
}

/** The size of a value as JSON, in bytes (UTF-8). Works on the server and in the browser. */
export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}
