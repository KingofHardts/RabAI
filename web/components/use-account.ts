"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseProfile, type LearnerProfile } from "@/lib/learner-profile";
import { parseChats, type SavedChat } from "@/lib/saved-chats";
import { chatStamp, jsonBytes, mergeChatLists, mergeProfiles, profileToSend, reconcileChats, type ChatIndexEntry } from "@/lib/account/merge";

/*
 * The device's side of an account (docs/learner-profiles.md, phase 2).
 *
 * - On opening, it asks the server who is signed in. Signed in, it brings this device and the
 *   account into step: the first time on this device it adds the device's profile and chats to the
 *   account ("join"); after that it keeps them in step ("sync"). The account's copy is the one used
 *   for answers; the device keeps a copy for speed and for when it's offline.
 * - Changes are sent a moment after they happen (a few at a time), and again on the next opening if
 *   sending failed. With remembering off, only that switch is sent about the profile.
 * - Signing out, deleting the account, or a sign-in that has ended takes the account's chats and
 *   profile off this device.
 * Without accounts switched on nothing here does anything, and the app keeps everything on the
 * device as before.
 */

/** Which account this device's copy belongs to: a label from the server, never the email address. */
const ACCOUNT_KEY = "rabai_account";
/** The id of this device's first sign-in, so a repeated first sign-in counts once. */
const JOIN_KEY = "rabai_account_join";
/** The profile changed here and the account hasn't been told yet. */
const PROFILE_DIRTY_KEY = "rabai_profile_dirty";
/** Chats deleted here that the account hasn't been told about yet. */
const DELETED_KEY = "rabai_chats_deleted";

const PUSH_DELAY_MS = 2500;
/** The most sent to the account in one request; bigger saves are split. */
const MAX_PUSH_BYTES = 900_000;

export type AccountStatus = "loading" | "off" | "signed-out" | "signed-in" | "unavailable";

export interface AccountState {
  status: AccountStatus;
  /** "Was this helpful?" can be sent. */
  feedback: boolean;
  /** The last attempt to save to the account failed; changes are kept here and sent later. */
  syncError: boolean;
  /** The sign-in ended, so the account's chats were taken off this device. */
  ended: boolean;
  /** Arrived from an emailed link just now. */
  justSignedIn: boolean;
}

export interface AccountHost {
  getProfile: () => LearnerProfile;
  /** Replace the device's profile (state and storage) without sending it anywhere. */
  setProfile: (p: LearnerProfile) => void;
  getChats: () => SavedChat[];
  /** Replace the device's chats (state and storage) without sending them anywhere. */
  setChats: (c: SavedChat[]) => void;
  /** Take the account's chats and profile off this device. */
  clearDevice: () => void;
}

export interface AccountApi {
  profileChanged(): void;
  /** Remembering was turned on or off: tell the account right away. */
  rememberChanged(): void;
  chatsChanged(prev: SavedChat[], next: SavedChat[]): void;
  deleteAllChats(): void;
  sendLink(email: string): Promise<{ ok: true } | { error: string }>;
  signOut(): Promise<boolean>;
  deleteAccount(): Promise<boolean>;
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage can be unavailable */
  }
}
function readList(key: string): string[] {
  try {
    const v = JSON.parse(read(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 500) : [];
  } catch {
    return [];
  }
}
function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function postJson(url: string, body: unknown, keepalive = false): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive });
}

/** Chats in groups small enough to send in one request each. */
function batches(chats: SavedChat[]): SavedChat[][] {
  const out: SavedChat[][] = [];
  let group: SavedChat[] = [];
  let size = 0;
  for (const c of chats) {
    const n = jsonBytes(c);
    if (group.length && size + n > MAX_PUSH_BYTES) {
      out.push(group);
      group = [];
      size = 0;
    }
    group.push(c);
    size += n;
  }
  if (group.length) out.push(group);
  return out;
}

export function useAccount(host: AccountHost): { state: AccountState; api: AccountApi } {
  const [state, setState] = useState<AccountState>({ status: "loading", feedback: false, syncError: false, ended: false, justSignedIn: false });
  const hostRef = useRef(host);
  useEffect(() => {
    hostRef.current = host;
  }, [host]);
  const status = useRef<AccountStatus>("loading");
  const setStatus = (s: AccountStatus) => {
    status.current = s;
    setState((prev) => ({ ...prev, status: s }));
  };
  const setSyncError = (syncError: boolean) => setState((prev) => (prev.syncError === syncError ? prev : { ...prev, syncError }));

  // Changes waiting to be sent.
  const profileVersion = useRef(0);
  const pendingChats = useRef(new Set<string>());
  const pendingDeletes = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushing = useRef<Promise<void> | null>(null);
  /** Whether this page was opened from an emailed link, read once (the address is then tidied). */
  const arrivedSignedIn = useRef<boolean | null>(null);

  /** Send the profile; adopt what the account answers. */
  const pushProfile = useCallback(async (opts: { join?: boolean; joinId?: string } = {}) => {
    const version = profileVersion.current;
    const res = await postJson("/api/account/profile", { profile: profileToSend(hostRef.current.getProfile()), ...opts });
    if (!res.ok) throw new Error(`profile ${res.status}`);
    const data = (await res.json()) as { profile?: unknown };
    const merged = mergeProfiles(hostRef.current.getProfile(), parseProfile(data.profile));
    hostRef.current.setProfile(merged);
    if (profileVersion.current === version) write(PROFILE_DIRTY_KEY, null);
  }, []);

  /** Send chats and deletions. */
  const pushChats = useCallback(async (upsert: SavedChat[], remove: string[], deleteAll = false) => {
    const groups = batches(upsert);
    if (!groups.length) groups.push([]);
    for (let i = 0; i < groups.length; i++) {
      const first = i === 0;
      if (!groups[i].length && !(first && (remove.length || deleteAll))) continue;
      const res = await postJson("/api/account/chats", { upsert: groups[i], ...(first ? { delete: remove, deleteAll } : {}) });
      if (!res.ok) throw new Error(`chats ${res.status}`);
    }
  }, []);

  /** Send whatever is waiting. */
  const flush = useCallback(async () => {
    if (status.current !== "signed-in") return;
    if (flushing.current) {
      await flushing.current;
      return flush();
    }
    const run = (async () => {
      const ids = [...pendingChats.current];
      const removed = [...pendingDeletes.current];
      pendingChats.current.clear();
      try {
        if (read(PROFILE_DIRTY_KEY)) await pushProfile();
        if (ids.length || removed.length) {
          const chats = hostRef.current.getChats().filter((c) => ids.includes(c.id));
          await pushChats(chats, removed);
          for (const id of removed) pendingDeletes.current.delete(id);
          write(DELETED_KEY, JSON.stringify([...pendingDeletes.current]));
        }
        setSyncError(false);
      } catch {
        // Kept here; sent again with the next change or the next opening.
        for (const id of ids) pendingChats.current.add(id);
        setSyncError(true);
      }
    })();
    flushing.current = run;
    try {
      await run;
    } finally {
      flushing.current = null;
    }
  }, [pushProfile, pushChats]);

  const schedule = useCallback(
    (delay = PUSH_DELAY_MS) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, delay);
    },
    [flush],
  );

  // Bring this device and the account into step when the app opens.
  useEffect(() => {
    let cancelled = false;
    // Deletions a page closed before sending.
    for (const id of readList(DELETED_KEY)) pendingDeletes.current.add(id);
    (async () => {
      if (arrivedSignedIn.current === null) {
        const url = new URL(window.location.href);
        arrivedSignedIn.current = url.searchParams.get("signedin") === "1";
        if (arrivedSignedIn.current) {
          url.searchParams.delete("signedin");
          window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        }
      }
      const justSignedIn = arrivedSignedIn.current;
      let data: {
        enabled?: boolean;
        feedback?: boolean;
        signedIn?: boolean | null;
        account?: string;
        profile?: unknown;
        chats?: ChatIndexEntry[];
        deletedChats?: string[];
      };
      try {
        const res = await fetch("/api/account", { cache: "no-store" });
        data = await res.json();
        if (!res.ok || typeof data.signedIn !== "boolean") throw new Error(String(res.status));
      } catch {
        // Couldn't check: change nothing on this device.
        if (!cancelled) setStatus("unavailable");
        return;
      }
      if (cancelled) return;
      setState((prev) => ({ ...prev, feedback: data.feedback === true, justSignedIn }));
      const marker = read(ACCOUNT_KEY);
      if (!data.enabled || !data.signedIn || !data.account) {
        if (marker && data.enabled) {
          // This device held a signed-in account's copy, and the sign-in has ended.
          hostRef.current.clearDevice();
          setState((prev) => ({ ...prev, ended: true }));
        }
        // Nothing here is waiting for an account. (With accounts switched off, a device that was
        // signed in keeps its copy, and the marker, until they are back.)
        if (data.enabled || !marker) forgetDevice();
        pendingChats.current.clear();
        pendingDeletes.current.clear();
        return setStatus(data.enabled ? "signed-out" : "off");
      }

      if (marker && marker !== data.account) {
        // The copy here belongs to another account: it is not mixed into this one.
        hostRef.current.clearDevice();
        forgetDevice();
        pendingChats.current.clear();
        pendingDeletes.current.clear();
      }
      const joining = read(ACCOUNT_KEY) !== data.account;
      let joinId: string | undefined;
      if (joining) {
        joinId = read(JOIN_KEY) ?? randomId();
        write(JOIN_KEY, joinId);
      }

      try {
        // The profile.
        const server = data.profile ? parseProfile(data.profile) : null;
        if (joining || read(PROFILE_DIRTY_KEY) || !server) {
          await pushProfile(joining ? { join: true, joinId } : {});
        } else {
          hostRef.current.setProfile(mergeProfiles(hostRef.current.getProfile(), server));
        }

        // The chats: drop what was deleted, fetch what is newer in the account, send what is newer here.
        const deleted = [...(data.deletedChats ?? []), ...pendingDeletes.current];
        const plan = reconcileChats(hostRef.current.getChats(), data.chats ?? [], deleted);
        let merged = plan.keep;
        for (let i = 0; i < plan.fetch.length; i += 20) {
          const ids = plan.fetch.slice(i, i + 20);
          const res = await fetch(`/api/account/chats?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
          if (!res.ok) throw new Error(`chats ${res.status}`);
          merged = mergeChatLists(merged, parseChats(((await res.json()) as { chats?: unknown }).chats));
        }
        if (cancelled) return;
        hostRef.current.setChats(parseChats(merged));
        const removed = [...pendingDeletes.current];
        await pushChats(plan.push, removed);
        pendingDeletes.current.clear();
        write(DELETED_KEY, null);
        write(ACCOUNT_KEY, data.account);
        write(JOIN_KEY, null);
        setSyncError(false);
      } catch {
        setSyncError(true);
      }
      if (cancelled) return;
      setStatus("signed-in");
      // Anything changed while this ran.
      if (pendingChats.current.size || read(PROFILE_DIRTY_KEY)) schedule(0);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once, when the app opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send what is waiting before the page is closed or put away.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden" || status.current !== "signed-in") return;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      const ids = [...pendingChats.current];
      const removed = [...pendingDeletes.current];
      const dirty = !!read(PROFILE_DIRTY_KEY);
      if (!ids.length && !removed.length && !dirty) return;
      // keepalive lets a small request finish after the page is gone; anything bigger waits for next time.
      if (dirty) void postJson("/api/account/profile", { profile: profileToSend(hostRef.current.getProfile()) }, true).catch(() => undefined);
      const chats = hostRef.current.getChats().filter((c) => ids.includes(c.id));
      if ((chats.length || removed.length) && jsonBytes(chats) < 60_000) {
        void postJson("/api/account/chats", { upsert: chats, delete: removed }, true).catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const api = useMemo<AccountApi>(
    () => ({
      profileChanged() {
        if (status.current !== "signed-in" && status.current !== "loading") return;
        profileVersion.current++;
        write(PROFILE_DIRTY_KEY, "1");
        if (status.current === "signed-in") schedule();
      },
      rememberChanged() {
        if (status.current !== "signed-in" && status.current !== "loading") return;
        profileVersion.current++;
        write(PROFILE_DIRTY_KEY, "1");
        if (status.current === "signed-in") schedule(0);
      },
      chatsChanged(prev, next) {
        if (status.current !== "signed-in" && status.current !== "loading") return;
        const before = new Map(prev.map((c) => [c.id, chatStamp(c)]));
        const now = new Set(next.map((c) => c.id));
        for (const c of next) if (before.get(c.id) !== chatStamp(c)) pendingChats.current.add(c.id);
        for (const id of before.keys()) {
          if (!now.has(id)) {
            pendingDeletes.current.add(id);
            pendingChats.current.delete(id);
          }
        }
        write(DELETED_KEY, JSON.stringify([...pendingDeletes.current]));
        if (status.current === "signed-in") schedule();
      },
      deleteAllChats() {
        if (status.current !== "signed-in") return;
        pendingChats.current.clear();
        void pushChats([], [...pendingDeletes.current], true)
          .then(() => {
            pendingDeletes.current.clear();
            write(DELETED_KEY, null);
            setSyncError(false);
          })
          .catch(() => setSyncError(true));
      },
      async sendLink(email) {
        try {
          const res = await postJson("/api/account/link", { email });
          if (res.ok) return { ok: true };
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          return { error: data.error ?? "Something went wrong. Please try again." };
        } catch {
          return { error: "Couldn't reach RabAI. Check your connection and try again." };
        }
      },
      async signOut() {
        try {
          // Send what is waiting first, so nothing done here is lost.
          await flush();
          const res = await postJson("/api/account/signout", {});
          if (!res.ok) return false;
        } catch {
          return false;
        }
        hostRef.current.clearDevice();
        forgetDevice();
        pendingChats.current.clear();
        pendingDeletes.current.clear();
        setStatus("signed-out");
        return true;
      },
      async deleteAccount() {
        try {
          const res = await fetch("/api/account", { method: "DELETE" });
          if (!res.ok) return false;
        } catch {
          return false;
        }
        hostRef.current.clearDevice();
        forgetDevice();
        pendingChats.current.clear();
        pendingDeletes.current.clear();
        setStatus("signed-out");
        return true;
      },
    }),
    [schedule, flush, pushChats],
  );

  return { state, api };
}

/** This device no longer holds an account's copy. */
function forgetDevice() {
  write(ACCOUNT_KEY, null);
  write(JOIN_KEY, null);
  write(PROFILE_DIRTY_KEY, null);
  write(DELETED_KEY, null);
}
