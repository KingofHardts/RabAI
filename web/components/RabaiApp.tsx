"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { AskResult, LineAction } from "@/lib/engine/answer";
import type { AnswerBlock, AnswerSource } from "@/lib/engine/citations";
import type { LibraryMode } from "@/lib/library";
import { TESTING_LABEL } from "@/lib/library/testing-config";
import { CautionBanner, CautionTag } from "./CautionNote";
import type { Token } from "@/lib/library/language";
import type { ArticleShelf, Passage, TranslationStatus, Work } from "@/lib/library/types";
import type { PhraseInfo, WordStudy } from "@/lib/library/word-study";
import type { WordEntry } from "@/lib/library/word-parts";
import {
  addRecent,
  categoriesFor,
  chatMatches,
  dateBucket,
  CHATS_KEY,
  cleanCategory,
  groupByCategory,
  parseChats,
  parseRecent,
  pendingAnswers,
  RECENT_KEY,
  serializeChats,
  upsertChat,
  whenLabel,
  type PendingAnswer,
  type RecentReading,
  type SavedChat,
  type SavedMessage,
  type SavedPicture,
} from "@/lib/saved-chats";
import { PICTURE_LIMITS, questionForPictures, type QuestionPicture } from "@/lib/pictures";
import {
  DEVICE_BEST,
  canSpeak,
  englishVoices,
  OWN_VOICE,
  ownVoices,
  type OwnVoices,
  VOICE_SAMPLE,
  setHebrewPronunciation,
  setPreferredVoice,
  setSpeechRate,
  speak,
  speakLive,
  stopSpeaking,
  unlockSpeech,
  useDictation,
  type LiveSpeech,
} from "./voice";
import { setCutInByVoice, useTalk, type TalkControls } from "./talk";
import { countdownMs, micOpen, tapAction, wordsOf, type TalkPace } from "@/lib/talk";
import type { LiveCite, LivePassage, LiveRead } from "@/lib/engine/live-sources";
import { activeMark, ReadLine, readingText, SourceCard, type SourceMark, type SpokenSpan } from "./SourceCard";
import DafPage from "./DafPage";
import DafPrinted from "./DafPrinted";
import LibraryShelves from "./LibraryShelves";
import Siddur from "./Siddur";
import { siddurOrder } from "@/lib/library/prayer-find";
import { shortRef } from "@/lib/library/short-name";
import ArticleShelves from "./ArticleShelves";
import ContentsGrid from "./ContentsGrid";
import DafColumn from "./DafColumn";
import { usePinchZoom } from "./use-pinch-zoom";
import WordCard, { DictRows, Folded, useWide, type CardTab, type CardTabInfo } from "./WordCard";
import AboutYou from "./AboutYou";
import YourPlace, { placeSummary } from "./YourPlace";
import ChavrusaSetup, { type ChavrusaChoice } from "./ChavrusaSetup";
import { amudOf, openingMessage, quickReplies, reachedLine, sessionLabel, STYLE_INFO, DEPTH_INFO, type ChavrusaSession } from "@/lib/chavrusa";
import { deviceWhen, loadPlaceSettings, savePlaceSettings, type PlaceSettings } from "@/lib/calendar/device";
import type { DaySummary } from "@/lib/calendar/place";
import { pickStarters, type StarterGroup } from "@/lib/starters";
import { shabbatLine, soonLine, todayLine } from "@/lib/calendar/day-lines";
import AccountDialog from "./AccountDialog";
import AnswerFeedback from "./AnswerFeedback";
import { useAccount, type AccountApi } from "./use-account";
import {
  PROFILE_KEY,
  emptyProfile,
  forgetAll,
  forgetNoticed,
  noticed,
  parseProfile,
  withRemember,
  withStated,
  type Activity,
  type LearnerProfile,
} from "@/lib/learner-profile";
import { placeBooks, type CatalogBook } from "@/lib/library/catalog";
import { useLinkedScroll } from "./use-linked-scroll";
import { registerServiceWorker } from "@/lib/offline";
import { parseAmud, pieceWords, withoutPoints, type DafData } from "@/lib/library/daf";
import {
  OUTLINE_LABELS,
  OUTLINE_VERSION,
  flowSteps,
  keptOutline,
  kindCounts,
  nearestStep,
  outlineKey,
  phraseOfWord,
  readKeptOutline,
  type FlowView,
  type OutlineKind,
  type OutlineLine,
  type PhraseAt,
} from "@/lib/engine/outline-phrases";
import FlowLegend from "./FlowLegend";
import FlowBar from "./FlowBar";
import { readKeptTranslation, type GlossRow, type Translation } from "@/lib/engine/gloss";

// ---------------------------------------------------------------------------
// Types the screens use

interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text?: string;
  result?: AskResult;
  /** The answer was written live, so it is already on screen: it doesn't slide in again. */
  streamed?: boolean;
  /** On a question: previews of the pictures sent with it. */
  pictures?: SavedPicture[];
  /** On a question whose previews stayed on another device. */
  pictureCount?: number;
  /** On an answer still being written (lib/answer-jobs.ts). */
  pending?: PendingAnswer;
  /** The answer was finished while the person was away from the page. */
  away?: boolean;
}

/** A picture in the box, ready to send: what RabbAI reads, and the preview the chat keeps. */
interface Attached {
  key: string;
  full: QuestionPicture;
  preview: SavedPicture;
  /** The picture as chosen, while it is in the box, to make it smaller if several don't fit together. */
  file?: File;
}

/** An answer being written, as far as this page knows it. */
interface LiveJob {
  steps: string[];
  text: string;
  /** The passages on screen while it is written, and what the answer did with them (SourceCard). */
  passages?: LivePassage[];
  marks?: SourceMark[];
  /** Picked up again after the person left the page and came back. */
  resumed?: boolean;
}

/** What a chat keeps of a message (the rest is for this screen only). */
function toSaved(m: ChatMessage): SavedMessage {
  if (m.role === "ai") return m.result ? { role: "ai", result: m.result } : { role: "ai", pending: m.pending };
  return { role: "user", text: m.text ?? "", ...(m.pictures?.length ? { pictures: m.pictures } : m.pictureCount ? { pictureCount: m.pictureCount } : {}) };
}

/** A short signature of a chat's messages, to tell whether anything was added or changed. */
function chatSignature(ms: SavedMessage[]): string {
  return ms
    .map((m) =>
      m.role === "user"
        ? `u${(m.text ?? "").length}.${m.pictures?.length ?? m.pictureCount ?? 0}`
        : m.pending
          ? `p${m.pending.id}`
          : `a${m.result?.status}.${m.result?.blocks.length}.${m.result?.blocks[0]?.text.length ?? 0}`,
    )
    .join("|");
}

/** A long random id for an answer, made on the device (lib/answer-jobs.ts). */
function newAnswerId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** How long a page keeps checking on an answer it left before calling it lost. */
const ANSWER_GIVE_UP_MS = 8 * 60 * 1000;
/** The chat open in this tab, so a reload comes back to it. */
const OPEN_CHAT_KEY = "rabai_open_chat";
/** Said when an answer couldn't be picked up again. */
const LOST_NOTICE = "This answer didn't finish. Please try again.";
const TEXT_SIZES = ["normal", "large", "larger"] as const;
type TextSize = (typeof TEXT_SIZES)[number];
/** Light or dark: following the device, or chosen (night mode). Set before paint by app/layout.tsx. */
const THEMES = ["system", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];
const TEXT_SCALE: Record<TextSize, number> = { normal: 1, large: 1.15, larger: 1.3 };

/** Questions typed but not yet sent, per chat, for this tab (kept through a reload, gone with the tab). */
const DRAFTS_KEY = "rabai_drafts";

function readDrafts(): Record<string, string> {
  try {
    const d = JSON.parse(window.sessionStorage.getItem(DRAFTS_KEY) ?? "{}");
    return d && typeof d === "object" ? (d as Record<string, string>) : {};
  } catch {
    return {};
  }
}
/** The unsent question kept for a chat (null: a new chat). */
function draftFor(id: string | null): string {
  const d = readDrafts()[id ?? "new"];
  return typeof d === "string" ? d : "";
}
function keepDraft(id: string | null, text: string) {
  try {
    const d = readDrafts();
    const key = id ?? "new";
    if (text.trim()) d[key] = text.slice(0, 2000);
    else delete d[key];
    window.sessionStorage.setItem(DRAFTS_KEY, JSON.stringify(d));
  } catch {
    /* storage can be unavailable; the draft simply isn't kept */
  }
}

interface ReaderCommentary extends Passage {
  author: string;
  translation?: { by: string; status: TranslationStatus };
  tokens: Token[];
}
interface ReaderLine extends Passage {
  tokens: Token[];
  commentaries: ReaderCommentary[];
}
interface ReaderData {
  focus: string | null;
  libraryMode: LibraryMode;
  /** The book, and the sections before and after this one in it. */
  book?: string;
  prev?: string;
  next?: string;
  section: string;
  sectionHe: string;
  work: Work;
  wordStudy: WordStudy;
  lines: ReaderLine[];
}

interface SectionSummary {
  section: string;
  sectionHe: string;
  workId: string;
  workTitle: string;
  firstRef: string;
  lineCount: number;
  commentaryCount: number;
  /** Sefaria's category path (testing library), for placing the book on a shelf. */
  categories?: string[];
  order?: number;
}

type Lang = "he" | "both" | "en";

interface LineAnswer {
  action: LineAction | "ask";
  loading: boolean;
  /** What RabbAI is doing, while it works. */
  status?: string;
  /** The answer's text as it is being written. */
  live?: string;
  result?: AskResult;
  error?: string;
}

/** Text the person highlighted, and where to show the button to ask about it. */
interface Highlight {
  text: string;
  top: number;
  left: number;
  where: "chat" | "reader";
  /** The line it came from, in the reader. */
  ref?: string;
}

type Mode = "chat" | "learn" | "daven";

/** A line's own number for the margin: "Genesis 1:3" -> "3", "…, Modeh Ani 2" -> "2", "Berakhot 2a:5" -> "5". */
function lineNumber(label: string): string {
  const last = label.split(":").pop() ?? label;
  return last.match(/(\d+[ab]?)\s*$/)?.[1] ?? (last.length <= 4 ? last : "");
}

/** What the library's dictionaries have for a tapped word. */
interface WordLookup {
  loading: boolean;
  /** False when this build has no dictionaries (the development texts). */
  available?: boolean;
  entries?: WordEntry[];
  error?: string;
  /** Set when the word is a printed short form (א״ל, ר׳) or a verse number (ל״ד:כ״ה); none is looked up. */
  abbreviation?: { kind: "gershayim" | "geresh" | "verse"; form: string; numbers?: number[] };
}

/** What to say about a printed short form, which no dictionary here lists. */
function shortFormNote(a: NonNullable<WordLookup["abbreviation"]>): string {
  if (a.kind === "verse" && a.numbers?.length === 2) return `${a.form} is a chapter and verse written in Hebrew letters: chapter ${a.numbers[0]}, verse ${a.numbers[1]}.`;
  if (a.kind === "verse") return `${a.form} is a reference written in Hebrew letters: ${a.numbers?.join(":")}.`;
  return a.kind === "geresh"
    ? `${a.form} is a word cut short, or a number written in letters. It isn't a word of its own, so the dictionaries don't list it. RabbAI can say what it stands for here.`
    : `${a.form} is a short form (an abbreviation) for several words, not a word of its own, so it isn't looked up in the dictionaries. RabbAI can say what it stands for here.`;
}

/** A word the person chose to keep. Saved only on this device. */
interface SavedWord {
  form: string;
  gloss?: string;
  root?: string;
  rootMeaning?: string;
  ref: string;
  savedAt: number;
}

/**
 * On a phone, scroll so what was tapped sits in the part of the screen the word sheet leaves open
 * (the top half), also when the page is zoomed in with two fingers.
 */
function keepAboveSheet(scroller: HTMLElement, el: HTMLElement, topInset = 0) {
  const vv = window.visualViewport;
  const r = el.getBoundingClientRect();
  const s = scroller.getBoundingClientRect();
  const viewTop = Math.max(s.top + topInset, vv ? vv.offsetTop : 0);
  const viewH = vv ? vv.height : window.innerHeight;
  const openBottom = (vv ? vv.offsetTop : 0) + viewH * 0.46;
  if (r.top >= viewTop && r.bottom <= openBottom) return;
  const target = viewTop + Math.min(24, Math.max(0, openBottom - viewTop) * 0.15);
  scroller.scrollBy({ top: r.top - target, behavior: smoothOrNot() });
}

/** chatTools holds a chat's id while its menu is open in the list; this, for the open chat's own menu. */
const HEAD_TOOLS = "__head__";

const ACTIONS: Array<{ id: LineAction; label: string }> = [
  { id: "explain", label: "Explain this" },
  { id: "words", label: "Word by word" },
  { id: "commentaries", label: "What do the commentaries say?" },
  { id: "halacha", label: "Where is this used in halacha?" },
];

const DEV_NOTE = "Development texts for testing. Not yet an approved edition or translation.";
/** How many books the Learn tab shows at once from the testing library. */
const WORDS_KEY = "rabai_words";
/** The person's own marks on the page: a color for each line or comment they marked. */
const MARKS_KEY = "rabai_marks";
/** RabbAI's translations, kept on the device so the same passage is never translated twice. */
const TRANSLATIONS_KEY = "rabai_translations";
const MAX_KEPT_TRANSLATIONS = 60;
const TRANSLATE_FAILED = "RabbAI couldn't translate this just now. Please try again.";
const MARK_COLORS = [
  { id: "yellow", label: "Yellow" },
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "pink", label: "Pink" },
];
const MAX_SAVED_WORDS = 500;

/** Smooth scrolling, unless the person's device asks for less motion. */
function smoothOrNot(): ScrollBehavior {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage can be unavailable; the setting simply won't persist */
  }
}

function readKeptTranslations(): Record<string, Translation> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(TRANSLATIONS_KEY) ?? "[]");
    const out: Record<string, Translation> = {};
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const t = readKeptTranslation(item);
        if (t && !out[t.ref]) out[t.ref] = t;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Keeps a translation on the device, newest first; the oldest go when there are too many. */
function keepTranslation(t: Translation) {
  let list: unknown[] = [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(TRANSLATIONS_KEY) ?? "[]");
    if (Array.isArray(raw)) list = raw.filter((x) => !x || typeof x !== "object" || (x as { ref?: unknown }).ref !== t.ref);
  } catch {
    /* start a fresh list */
  }
  store(TRANSLATIONS_KEY, JSON.stringify([t, ...list].slice(0, MAX_KEPT_TRANSLATIONS)));
}

/** A word-by-word translation: each of the library's words (or a short expression) over its English. */
function Interlinear({ rows, active }: { rows: GlossRow[]; active?: number }) {
  return (
    <div className="interlinear" dir="rtl">
      {rows.map((r) => {
        const on = active !== undefined && active >= r.at && active < r.at + r.n;
        return (
          <span key={r.at} className={`gl${r.en === null ? " none" : ""}${on ? " on" : ""}`}>
            <span className="gl-he he" lang="he">
              {r.he}
            </span>
            {r.expanded && (
              <span className="gl-full he" lang="he">
                {r.expanded}
              </span>
            )}
            <span className="gl-en" dir="ltr" lang="en" title={r.en === null ? "RabbAI gave no English for this word." : undefined}>
              {r.en ?? "—"}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function readSavedWords(): SavedWord[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(WORDS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((w): w is SavedWord => w && typeof w.form === "string" && typeof w.ref === "string")
      .slice(0, MAX_SAVED_WORDS);
  } catch {
    return [];
  }
}

/**
 * Ask the server to warm RabbAI's caches (app/api/ask/warm), so the first question is quick: when
 * the person starts Talk or a chavrusa session, or begins to type. At most every twenty minutes from
 * a device; nothing about the person is sent.
 */
function warmUp(kind: "talk" | "ask"): void {
  try {
    const key = `rabai_warm_${kind}`;
    const last = Number(window.localStorage.getItem(key) ?? 0);
    if (Date.now() - last < 20 * 60_000) return;
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* storage can be unavailable: warm anyway */
  }
  void fetch("/api/ask/warm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) }).catch(() => undefined);
}

/** The answer as plain text, for Copy, Share and feedback: a line it read is quoted with its reference. */
function plainAnswer(result: AskResult | undefined): string {
  return (
    result?.blocks
      .map((b) => {
        if (!b.read) return b.text;
        const p = result.card?.find((x) => x.ref === b.read);
        return `\n“${(p?.en || p?.he || "").trim()}” (${b.read})\n`;
      })
      .join("") ?? ""
  );
}

/** The answer as RabbAI sees it in the conversation: a line it read stays a read marker. */
function historyAnswer(result: AskResult | undefined): string {
  return result?.blocks.map((b) => (b.read ? `\n[[read ${b.read}]]\n` : b.text)).join("") ?? "";
}

/** Whether a line RabbAI reads aloud is said in its Hebrew too, before the English (Settings). */
let readLinesInOriginal = false;

/** The line being read aloud now, if the voice is on one. */
function liveReadOf(marks: SourceMark[], spoken?: SpokenSpan | null): string | null {
  if (!spoken) return null;
  const m = marks.find((x) => x.kind === "read" && x.sAt < spoken.end && (x.sEnd ?? x.sAt) > spoken.start);
  return m?.ref ?? null;
}

/**
 * What a finished answer did with its passages, worked out from the answer itself (for one picked
 * up later or restored from a saved chat): where each quote and line read falls in what is read
 * aloud (spokenAnswer), so the text can follow the voice there too.
 */
function marksOf(result: AskResult | undefined): SourceMark[] {
  if (!result?.card?.length) return [];
  const marks: SourceMark[] = [];
  let at = 0;
  let sAt = 0;
  for (const b of result.blocks) {
    if (b.read) {
      const p = result.card.find((x) => x.ref === b.read);
      const said = p ? readingText(p, readLinesInOriginal) : "";
      marks.push({ ref: b.read, kind: "read", at, sAt: sAt + 1, sEnd: sAt + 1 + said.length });
      sAt += p ? said.length + 2 : 0;
      continue;
    }
    at += b.text.length;
    sAt += b.text.length;
    for (const c of b.citations) {
      if (c.article || c.online || !result.card.some((p) => p.ref === c.ref)) continue;
      marks.push({ ref: c.ref, kind: "cite", quote: c.quote, at, sAt: Math.max(0, sAt - b.text.length) });
    }
  }
  return marks;
}

/** The answer as it is read aloud: a line it read is said from the library's own words. */
function spokenAnswer(result: AskResult | undefined): string {
  return (
    result?.blocks
      .map((b) => {
        if (!b.read) return b.text;
        const p = result.card?.find((x) => x.ref === b.read);
        return p ? `\n${readingText(p, readLinesInOriginal)}\n` : "";
      })
      .join("") ?? ""
  );
}

/** An answer as plain text with the texts it cited listed under it, for Copy and Share. */
function answerToShare(result: AskResult | undefined, testing: boolean): string {
  const refs: string[] = [];
  for (const b of result?.blocks ?? []) for (const c of b.citations) if (!c.article && !c.online && !refs.includes(c.ref)) refs.push(c.ref);
  const lines = [plainAnswer(result).trim()];
  if (refs.length)
    lines.push("", testing ? "Sources (RabbAI's testing library, not yet approved by the rabbinic board):" : "Sources:", ...refs.map((r) => `• ${r}`));
  lines.push("", "From RabbAI, an AI Torah teacher, not a rav.");
  return lines.join("\n");
}

/** A whole chat as plain text: each question and answer, with the texts each answer cited. */
function chatToShare(chat: { title: string; messages: Array<{ role: "user" | "ai"; text?: string; result?: AskResult }> }, testing: boolean): string {
  const parts = [chat.title, ""];
  for (const m of chat.messages) {
    if (m.role === "user" && m.text) parts.push(`You: ${m.text}`, "");
    else if (m.role === "ai" && m.result?.status === "answered") {
      const one = answerToShare(m.result, testing).replace(/\n\nFrom RabbAI, an AI Torah teacher, not a rav\.$/, "");
      parts.push(`RabbAI: ${one}`, "");
    }
  }
  parts.push("From RabbAI, an AI Torah teacher, not a rav.");
  return parts.join("\n");
}

/** A run of Hebrew inside a line of English: Hebrew letters, with the spaces, marks and abbreviations between them. */
const HEBREW_RUN = /[\u05D0-\u05EA](?:[\u0591-\u05F4\s"',.:;!?()\-]*[\u05D0-\u05EA\u0591-\u05C7\u05F3\u05F4])?/g;

/** A line with its Hebrew set in the Hebrew typeface and marked as Hebrew, so it reads and is spoken correctly. */
function withHebrew(line: string, nextKey: () => number): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(HEBREW_RUN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(line.slice(last, at));
    out.push(
      <span key={`he${nextKey()}`} lang="he" dir="rtl" className="he-run">
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/** Mostly Hebrew: more than twice as many Hebrew letters as Latin ones. */
function mostlyHebrew(text: string): boolean {
  const he = (text.match(/[\u05D0-\u05EA]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  return he > 0 && he > 2 * en;
}

/** The person's question that an answer replied to: the last message of theirs before it. */
function questionBefore(messages: ChatMessage[], id: number): string {
  const i = messages.findIndex((m) => m.id === id);
  for (let j = i - 1; j >= 0; j--) if (messages[j].role === "user") return messages[j].text ?? "";
  return "";
}

/** The word without punctuation at either end, for saving and asking. */
/** A tapped word without the punctuation around it. A geresh right after a letter (ר׳, וכו׳) is part of the word. */
/** The book a section belongs to: "Rashi on Berakhot 2a" -> "Rashi on Berakhot", "Genesis 1" -> "Genesis". */
function bookOfSection(section: string): string {
  return section.replace(/\s+\d+[ab]?(?::\S*)?$/, "").trim() || section;
}

function bareWord(text: string): string {
  const t = text.replace(/^[\s"'״׳“”‘’()[\]{}.,;:!?׃־–—…]+|[\s"'״“”‘’()[\]{}.,;:!?׃־–—…]+$/g, "");
  return /[א-ת\u0591-\u05C7]['׳]$/.test(t) ? t : t.replace(/['׳]+$/, "");
}

interface LiveHooks {
  onStatus?: (text: string) => void;
  onText?: (delta: string) => void;
  onPassage?: (passage: LivePassage) => void;
  onCite?: (cite: LiveCite) => void;
  onRead?: (read: LiveRead) => void;
}

/** A request RabbAI refused before it began (too long, a picture it can't read, the app locked). */
class AskRefused extends Error {}

/**
 * Read a live answer: progress notes, then the text as it is written, then the checked answer
 * with its sources (or word that it was stopped). Returns what the stream ended with; null when
 * it ended early, as when the connection dropped.
 */
async function readLive(res: Response, hooks: LiveHooks = {}): Promise<{ result: AskResult } | { stopped: true } | null> {
  if (!(res.headers.get("content-type") ?? "").includes("ndjson") || !res.body) {
    const json = (await res.json().catch(() => null)) as (AskResult & { error?: string }) | null;
    if (res.status === 413) throw new AskRefused("Those pictures are too large together. Please send fewer, or smaller ones.");
    if (!json) throw new Error("RabbAI didn't answer. Please try again.");
    if (json.error && !json.status) throw new AskRefused(json.error);
    return { result: json };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let end: { result: AskResult } | { stopped: true } | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    let event: { type?: string; text?: string; result?: AskResult; passage?: LivePassage; cite?: LiveCite; read?: LiveRead };
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type === "status" && event.text) hooks.onStatus?.(event.text);
    else if (event.type === "text" && event.text) hooks.onText?.(event.text);
    else if (event.type === "passage" && event.passage) hooks.onPassage?.(event.passage);
    else if (event.type === "cite" && event.cite) hooks.onCite?.(event.cite);
    else if (event.type === "read" && event.read) hooks.onRead?.(event.read);
    else if (event.type === "done" && event.result) end = { result: event.result };
    else if (event.type === "stopped") end = { stopped: true };
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      handle(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  handle(buffer + decoder.decode());
  return end;
}

/**
 * Ask RabbAI about a line in the reader: a short answer, shown live, not kept if the page goes away.
 */
async function postAsk(body: Record<string, unknown>, hooks: LiveHooks = {}): Promise<AskResult> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true, when: deviceWhen() }),
  });
  const end = await readLive(res, hooks);
  if (!end || !("result" in end)) throw new Error("The answer was cut off. Please try again.");
  return end.result;
}

/**
 * A picture the person chose, made ready to send: turned upright, at most 1568 pixels on its
 * longest side (as much as RabbAI reads), as a JPEG small enough to send, and a small preview for
 * the chat. Pictures with transparent parts get a white background.
 */
async function preparePicture(file: File, targetChars = PICTURE_LIMITS.targetChars): Promise<{ full: QuestionPicture; preview: SavedPicture }> {
  const source = await loadPicture(file);
  const draw = (scale: number, quality: number) => {
    const w = Math.max(1, Math.round(source.width * scale));
    const h = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This picture couldn't be prepared on this device.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source.image, 0, 0, w, h);
    return { url: canvas.toDataURL("image/jpeg", quality), w, h };
  };
  const longest = Math.max(source.width, source.height);
  // As large as RabbAI can read it (small print needs it), and no larger.
  let scale = Math.min(1, PICTURE_LIMITS.longSide / longest, Math.sqrt(PICTURE_LIMITS.maxPixels / (source.width * source.height)));
  let quality = 0.86;
  let full: ReturnType<typeof draw>;
  let small: ReturnType<typeof draw>;
  try {
    full = draw(scale, quality);
    // Within its share of the request: a little less quality first (text stays sharp), then smaller.
    for (let i = 0; i < 10 && full.url.length > targetChars; i++) {
      if (quality > 0.7) quality -= 0.08;
      else scale *= 0.85;
      full = draw(scale, quality);
    }
    small = draw(Math.min(1, PICTURE_LIMITS.previewSide / longest), 0.6);
  } finally {
    source.close();
  }
  return {
    full: { mediaType: "image/jpeg", data: full.url.slice(full.url.indexOf(",") + 1) },
    preview: { src: small.url, w: small.w, h: small.h },
  };
}

/**
 * The pictures in the box, fitted together into one request: when they are too large together,
 * each is made a little smaller from the original the person chose.
 */
async function fitPictures(list: Attached[]): Promise<Attached[]> {
  const budget = Math.floor(PICTURE_LIMITS.totalChars * 0.92);
  const total = list.reduce((n, a) => n + a.full.data.length, 0);
  if (total <= budget) return list;
  const share = Math.floor(budget / list.length);
  return Promise.all(
    list.map(async (a) => {
      if (a.full.data.length <= share || !a.file) return a;
      const ready = await preparePicture(a.file, share);
      return { ...a, full: ready.full };
    }),
  );
}

async function loadPicture(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name)) {
    throw new Error("That file isn't a picture. Please choose a photo or a screenshot.");
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    // Some browsers read more kinds of pictures through an image element.
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("This picture can't be opened here. A screenshot of it, or a JPEG, will work.");
  }
}

// ---------------------------------------------------------------------------
// Rendering an answer: paragraphs of prose with source buttons where they are cited

function AnswerBody({
  blocks,
  onOpen,
  card,
  liveRead,
  marks,
  now,
}: {
  blocks: AnswerBlock[];
  onOpen: (ref: string) => void;
  /** The passages shown with the answer (AskResult.card): the lines it read come from here. */
  card?: LivePassage[];
  /** The line being read aloud now. */
  liveRead?: string | null;
  /** What the answer did with its passages, and the mark it is on now (while read aloud). */
  marks?: SourceMark[];
  now?: SourceMark | null;
}) {
  type Para = { nodes: ReactNode[]; text: string };
  const items: Array<Para | { read: string }> = [{ nodes: [], text: "" }];
  const para = (): Para => {
    const last = items[items.length - 1];
    if ("nodes" in last) return last;
    const fresh = { nodes: [], text: "" };
    items.push(fresh);
    return fresh;
  };
  let key = 0;
  const nextKey = () => key++;
  for (const block of blocks) {
    // A line read aloud with the person: the library's own words, between the paragraphs.
    if (block.read) {
      items.push({ read: block.read });
      continue;
    }
    const pieces = block.text.split(/\n{2,}/);
    pieces.forEach((piece, i) => {
      if (i > 0) items.push({ nodes: [], text: "" });
      const current = para();
      current.text += piece;
      piece.split("\n").forEach((line, j) => {
        if (j > 0) current.nodes.push(<br key={`br${key++}`} />);
        if (line) current.nodes.push(<span key={`t${key++}`}>{withHebrew(line, nextKey)}</span>);
      });
    });
    const current = para();
    for (const c of block.citations) {
      // Articles and pages found online are shown under their own headings below the answer
      // (TeacherNotes, OnlineNotes), apart from the texts.
      if (c.article || c.online) continue;
      current.nodes.push(" ");
      current.nodes.push(
        <button
          key={`c${key++}`}
          type="button"
          className="cite"
          onClick={() => onOpen(c.ref)}
          title={c.quote ? `“${c.quote.length > 160 ? `${c.quote.slice(0, 160)}…` : c.quote}” (open ${c.ref})` : `Open ${c.ref}`}
        >
          {shortRef(c.ref)}
        </button>,
      );
    }
  }
  return (
    <>
      {items.map((item, i) => {
        if ("read" in item)
          return (
            <ReadLine
              key={`r${i}`}
              refName={item.read}
              passage={card?.find((p) => p.ref === item.read)}
              live={liveRead === item.read}
              marks={marks}
              now={now}
              onOpen={onOpen}
            />
          );
        if (!item.nodes.some((n) => typeof n !== "string" || n.trim())) return null;
        const rtl = mostlyHebrew(item.text);
        return (
          <p key={i} {...(rtl ? { dir: "rtl", lang: "he", className: "he-para" } : {})}>
            {item.nodes}
          </p>
        );
      })}
    </>
  );
}

/**
 * The articles an answer used, under their own heading: explanations by today's teachers from
 * trusted Orthodox websites, never sources (core premises, "Articles by today's teachers").
 */
function TeacherNotes({ sources, onOpen }: { sources: AnswerSource[]; onOpen: (ref: string) => void }) {
  const articles = sources.filter((s) => s.article);
  if (!articles.length) return null;
  return (
    <div className="teachers">
      <p className="label-sm">From today&apos;s teachers: explanations, not sources</p>
      {!sources.some((s) => !s.article && !s.online) && (
        <p className="note">None of the texts was cited for this answer. Check it against the texts, or ask your rav.</p>
      )}
      <div className="follow">
        {articles.map((s) => (
          <button key={s.ref} type="button" className="cite article" onClick={() => onOpen(s.ref)} title={`Open ${s.ref}`}>
            {s.article!.site}: {s.article!.title}
            {s.article!.author ? `, ${s.article!.author}` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The pages RabbAI looked up online for an answer, under their own heading: from the trusted
 * Orthodox sites (canon/lookup-sites.yaml) or, for everyday facts, the web. Never sources: each
 * opens on its own site, and the texts they were checked against open in the reader.
 */
function OnlineNotes({ result, onOpen }: { result: AskResult; onOpen: (ref: string) => void }) {
  const o = result.online;
  // A saved chat is read back from storage, so check the shape before showing it.
  if (!o || !Array.isArray(o.pages) || !Array.isArray(o.checked)) return null;
  const where = o.kind === "torah" ? "trusted Orthodox websites" : "the web";
  const pages = o.pages.filter((p) => typeof p.url === "string" && /^https?:\/\//.test(p.url));
  if (o.status !== "found" || !pages.length) {
    return (
      <p className="online-quiet">
        {o.status === "failed" ? `RabbAI couldn't look this up on ${where} just now.` : `RabbAI looked on ${where} and found nothing more to add.`}
      </p>
    );
  }
  const used = pages.filter((p) => p.used);
  const others = pages.filter((p) => !p.used);
  // Pages from the trusted sites are checked against the texts; say so when none confirmed them.
  const textCited = result.sources.some((s) => !s.article && !s.online);
  const checked = o.checked.filter((r) => result.retrieved.includes(r));
  return (
    <div className="online-notes">
      <p className="label-sm">
        {o.kind === "torah" ? "Looked up on trusted Orthodox websites: explanations, not sources" : "Looked up on the web, for everyday facts"}
      </p>
      {o.kind === "torah" && used.length > 0 && !textCited && (
        <p className="note">None of the texts confirmed this, so it rests on the websites alone. Ask your rav before relying on it.</p>
      )}
      <ul className="online-pages">
        {[...used, ...others].map((page) => (
          <li key={page.ref} className={page.used ? "used" : undefined}>
            <a href={page.url} target="_blank" rel="noopener noreferrer">
              <span className="site">{page.site}</span>
              <span className="title">{page.title}</span>
              <span className="out" aria-hidden="true">
                ↗
              </span>
              <span className="sr-only"> (opens the website)</span>
            </a>
            {!page.used && <span className="unused">found, not used</span>}
          </li>
        ))}
      </ul>
      {o.kind === "torah" && checked.length > 0 && (
        <div className="checked">
          <p className="label-sm">Checked against</p>
          <div className="follow">
            {checked.map((r) => (
              <button key={r} type="button" className="cite" onClick={() => onOpen(r)} title={`Open ${r}`}>
                {shortRef(r)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Under a practical halacha answer: RabbAI explains, a rav decides (core premises, "Practical
 * halacha"). The wording is a draft for the rabbinic board (founding spec, open question 9).
 */
function RavNote() {
  return (
    <aside className="rav-note" aria-label="A note about practical halacha">
      <svg className="rav-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16v11H10l-5 4v-4H4z" />
        <path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4M12 14.2h0" />
      </svg>
      <p>
        <strong>For your own situation, ask your rav.</strong> RabbAI explains what the sources say, but it is not a rav and
        can&apos;t decide for you.
      </p>
    </aside>
  );
}

/**
 * Under an answer about RabbAI's own library: the full list, with what waits for the rabbinic
 * board and what is left out, and why (app/sources).
 */
function LibraryNote() {
  return (
    <p className="library-note">
      <a href="/sources" target="_blank" rel="noopener">
        See RabbAI&apos;s sources: every book it reads, what waits for the rabbinic board, and what it leaves out
      </a>
    </p>
  );
}

/** What RabbAI is doing while it works: each step as it happens, the earlier ones checked off. */
function WorkingSteps({ steps }: { steps: string[] }) {
  const shown = steps.length ? steps : ["Thinking it through"];
  return (
    <ol className="steps" aria-label="What RabbAI is doing">
      {shown.map((step, i) => {
        const current = i === shown.length - 1;
        return (
          <li key={`${i}-${step}`} className={current ? "current" : "done"} aria-current={current ? "step" : undefined}>
            <span className="tick" aria-hidden="true">
              {current ? "" : "✓"}
            </span>
            <span>
              {step}
              {current && <span className="dots" />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SafetyCard({ result }: { result: AskResult }) {
  if (!result.safety) return null;
  return (
    <div className="care" role="alert">
      <strong>{result.safety.title}</strong>
      <ul>
        {result.safety.lines.map((l) => (
          <li key={l.href}>
            {l.label}: <a href={l.href}>{l.action}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The answer while it is being written: plain paragraphs and a blinking caret, with the lines it
 * reads aloud shown where it reads them, in the library's own words.
 */
function LiveText({
  text,
  marks = [],
  passages = [],
  onOpen,
  liveRead,
  now,
}: {
  text: string;
  marks?: SourceMark[];
  passages?: LivePassage[];
  onOpen?: (ref: string) => void;
  liveRead?: string | null;
  now?: SourceMark | null;
}) {
  const reads = marks.filter((m) => m.kind === "read").sort((a, b) => a.at - b.at);
  const pieces: Array<{ text: string } | { read: string }> = [];
  let from = 0;
  for (const r of reads) {
    const at = Math.min(Math.max(r.at, from), text.length);
    pieces.push({ text: text.slice(from, at) }, { read: r.ref });
    from = at;
  }
  pieces.push({ text: text.slice(from) });
  const out: ReactNode[] = [];
  pieces.forEach((piece, k) => {
    const last = k === pieces.length - 1;
    if ("read" in piece) {
      out.push(
        <ReadLine
          key={`r${k}`}
          refName={piece.read}
          passage={passages.find((p) => p.ref === piece.read)}
          live={liveRead === piece.read}
          marks={marks}
          now={now}
          onOpen={onOpen ?? (() => undefined)}
        />,
      );
      return;
    }
    const paragraphs = piece.text.replace(/^\n+/, "").split(/\n{2,}/);
    paragraphs.forEach((para, i) => {
      if (!para.trim() && !(last && i === paragraphs.length - 1)) return;
      out.push(
        <p key={`${k}.${i}`}>
          {para}
          {last && i === paragraphs.length - 1 && <span className="caret" aria-hidden="true" />}
        </p>,
      );
    });
  });
  return <>{out}</>;
}

/** How long an answer has been on its way before the page says it's fine to leave. */
const LEAVE_HINT_MS = 7000;

/**
 * An answer still being written: what RabbAI is doing, then the words as they come. After a few
 * seconds it says the person can leave; the answer will be here when they come back.
 */
function PendingView({ job, at, onOpen, spoken }: { job?: LiveJob; at: number; onOpen: (ref: string) => void; spoken?: SpokenSpan | null }) {
  const [canLeave, setCanLeave] = useState(() => Date.now() - at > LEAVE_HINT_MS);
  useEffect(() => {
    if (canLeave) return;
    const t = setTimeout(() => setCanLeave(true), Math.max(0, LEAVE_HINT_MS - (Date.now() - at)));
    return () => clearTimeout(t);
  }, [at, canLeave]);
  return (
    <>
      {job?.passages?.length ? <SourceCard passages={job.passages} marks={job.marks ?? []} spoken={spoken} live onOpen={onOpen} /> : null}
      {job?.text || job?.marks?.some((m) => m.kind === "read") ? (
        <LiveText
          text={job.text}
          marks={job.marks}
          passages={job.passages}
          onOpen={onOpen}
          liveRead={liveReadOf(job.marks ?? [], spoken)}
          now={activeMark(job.marks ?? [], spoken)}
        />
      ) : (
        <WorkingSteps steps={job?.steps ?? []} />
      )}
      <div className="pending-foot">
        {(canLeave || job?.resumed) && (
          <p className="leave-hint">
            {job?.resumed
              ? "Still writing this answer. It will appear here when it's ready."
              : "You can leave this page. The answer will be here when you come back."}
          </p>
        )}
      </div>
    </>
  );
}

/** The pictures sent with a question, small, as the chat keeps them. */
function SentPictures({ pictures, count, onOpen }: { pictures?: SavedPicture[]; count?: number; onOpen: (p: SavedPicture) => void }) {
  if (pictures?.length)
    return (
      <div className={`sent-pics n${Math.min(pictures.length, 4)}`}>
        {pictures.map((p, i) => (
          <button key={i} type="button" className="sent-pic" aria-label={`Picture ${i + 1} you sent, larger`} onClick={() => onOpen(p)}>
            {/* A data URL kept with the chat: next/image adds nothing here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt="" width={p.w} height={p.h} />
          </button>
        ))}
      </div>
    );
  if (count)
    return (
      <p className="sent-pics-note">
        <PictureIcon /> {count === 1 ? "Sent with a picture" : `Sent with ${count} pictures`} (on another device)
      </p>
    );
  return null;
}

/** Copy an answer's words, for a note or a message to a friend. */
function CopyAnswer({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(t);
  }, [done]);
  if (typeof navigator === "undefined" || !navigator.clipboard) return null;
  return (
    <button
      type="button"
      className="btn quiet"
      onClick={() =>
        void navigator.clipboard
          .writeText(text)
          .then(() => setDone(true))
          .catch(() => undefined)
      }
    >
      <CopyIcon /> <span aria-live="polite">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

/** On a phone, the share sheet (messages, WhatsApp, email); elsewhere Copy does the job. */
function ShareAnswer({ text }: { text: string }) {
  const [can, setCan] = useState(false);
  useEffect(() => {
    setCan(typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);
  }, []);
  if (!can) return null;
  return (
    <button type="button" className="btn quiet" onClick={() => void navigator.share({ title: "From RabbAI", text }).catch(() => undefined)}>
      <ShareIcon /> Share
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v13" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

/** Copy a whole chat, questions and answers with their sources, to paste anywhere. */
function CopyChat({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 2000);
    return () => clearTimeout(t);
  }, [done]);
  if (typeof navigator === "undefined" || !navigator.clipboard) return null;
  return (
    <button type="button" className="chip-btn" onClick={() => void navigator.clipboard.writeText(text).then(() => setDone(true)).catch(() => undefined)}>
      <span aria-live="polite">{done ? "Copied" : "Copy the whole chat"}</span>
    </button>
  );
}

function PictureIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m21 16-5-5-8 8" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** Talk: a voice, as a few bars of sound. */
function TalkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
    </svg>
  );
}

/** The big Talk button while RabbAI speaks. */
function TalkSpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

/**
 * Talk: the conversation out loud, in place of the question box (components/talk.ts). The big
 * button does what it says; the words heard show as they come, and the answer appears in the chat.
 */
function TalkPanel({ talk, chavrusa, onEnd }: { talk: TalkControls; chavrusa: boolean; onEnd: () => void }) {
  const s = talk.state;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (s.phase !== "countdown") return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [s.phase, s.countdownAt]);
  const open = micOpen(s.phase);
  const words = wordsOf(s);
  const tap = tapAction(s);
  const status =
    s.phase === "listening"
      ? s.holding || s.added
        ? "Go on, I'm listening…"
        : words
          ? "Listening… tap the microphone when you're done."
          : chavrusa
            ? "Listening… go ahead."
            : "Listening… ask anything."
      : s.phase === "countdown"
        ? s.pace === "relaxed"
          ? `Sending in ${Math.max(1, Math.ceil((countdownMs(s.pace) - (Math.max(now, s.countdownAt) - s.countdownAt)) / 1000))}…`
          : "Sending…"
        : s.phase === "answering"
          ? talk.listensWhileThinking
            ? "RabbAI is thinking… if you weren't done, just go on."
            : "RabbAI is thinking…"
          : s.phase === "speaking"
            ? "RabbAI is speaking. Tap to stop and talk."
            : (s.note ?? "Your turn. Tap to talk.");
  return (
    <div className={`talk talk-${s.phase}`} role="group" aria-label="Talking with RabbAI">
      <button type="button" className="talk-orb" onClick={talk.tap} disabled={tap.action === "none"} aria-label={tap.label} title={tap.label} autoFocus>
        {s.phase === "countdown" && (
          <svg key={s.countdownAt} className="talk-ring" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="16.5" pathLength={100} style={{ animationDuration: `${countdownMs(s.pace)}ms` }} />
          </svg>
        )}
        {s.phase === "speaking" ? <TalkSpeakerIcon /> : <MicIcon />}
      </button>
      <div className="talk-body">
        <p className="talk-status" aria-live="polite">
          {status}
        </p>
        {open && words ? (
          <p className="talk-words">
            {s.settled} <span className="talk-hearing">{s.hearing}</span>
          </p>
        ) : s.phase === "answering" && s.asked ? (
          <p className="talk-words talk-asked">{s.asked}</p>
        ) : null}
        <div className="talk-actions">
          {s.phase === "countdown" && (
            <button type="button" className="btn quiet" onClick={talk.keepTalking}>
              Keep talking
            </button>
          )}
          <button type="button" className="btn quiet" onClick={onEnd}>
            End
          </button>
        </div>
      </div>
    </div>
  );
}

/** The three places in the app, each with its own picture: a conversation, an open book, a siddur with its ribbon. */
function ModeIcon({ mode }: { mode: "chat" | "learn" | "daven" }) {
  const common = { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (mode === "chat")
    return (
      <svg className="mode-icon" {...common}>
        <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12z" />
      </svg>
    );
  if (mode === "learn")
    return (
      <svg className="mode-icon" {...common}>
        <path d="M12 6.5C10.2 5.2 7.8 4.6 4 4.8v13c3.8-.2 6.2.4 8 1.7 1.8-1.3 4.2-1.9 8-1.7v-13c-3.8-.2-6.2.4-8 1.7z" />
        <path d="M12 6.5v13" />
      </svg>
    );
  return (
    <svg className="mode-icon" {...common}>
      <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14.5H7.5A1.5 1.5 0 0 1 6 18z" />
      <path d="M6 18a1.5 1.5 0 0 1 1.5-1.5h11" />
      <path d="M10.5 3.5v7l2-1.6 2 1.6v-7" />
    </svg>
  );
}

function ChatsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7" />
      <path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

/** Whether the person has highlighted some text (so a click is not a tap on the line). */
function hasHighlight(): boolean {
  const sel = typeof window !== "undefined" ? window.getSelection() : null;
  return !!sel && !sel.isCollapsed && sel.toString().trim().length > 0;
}

// ---------------------------------------------------------------------------
// The app

export default function RabaiApp({ libraryMode, connected }: { libraryMode: LibraryMode; connected: boolean }) {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  /** This chat is waiting for an answer (another chat may be too; they don't block each other). */
  const pending = messages.some((m) => !!m.pending);
  /** Answers being written, by their id: the steps RabbAI has taken and the text so far. */
  const [liveJobs, setLiveJobs] = useState<Record<string, LiveJob>>({});
  /** Pictures in the box, ready to send, and how many are still being prepared. */
  const [attached, setAttached] = useState<Attached[]>([]);
  const [preparing, setPreparing] = useState(0);
  /** Several pictures are being fitted into one request, just before sending. */
  const [fitting, setFitting] = useState(false);
  /** A short note under the box: a picture that couldn't be added, or an answer stopped. */
  const [composerNote, setComposerNote] = useState<string | null>(null);
  /** The size of the text in chat and the reader (Settings), and how fast answers are read aloud. */
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);
  const [readingRate, setReadingRate] = useState<"0.8" | "1" | "1.2">("1");
  useEffect(() => {
    document.documentElement.style.setProperty("--text-scale", String(TEXT_SCALE[textSize]));
  }, [textSize]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // The service worker keeps the app and opened siddur texts, so the Daven tab works offline.
  useEffect(() => registerServiceWorker(), []);
  /** Whether the device has a connection (Ask waits without one). */
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  /** Chats whose answer arrived while another chat was open. */
  const [freshChats, setFreshChats] = useState<Set<string>>(() => new Set());
  const pictureInputRef = useRef<HTMLInputElement>(null);
  /** A sent picture shown large. */
  const [pictureView, setPictureView] = useState<SavedPicture | null>(null);
  /** A picture is being dragged over the chat. */
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  /** The piece of an answer being read aloud now, so its text on screen can follow (SourceCard). */
  const [spokenAt, setSpokenAt] = useState<({ id: string } & SpokenSpan) | null>(null);
  /**
   * What each finished answer did with its passages while it was written (the quotes and the lines
   * it read, and where they fall in what is read aloud), by message. Kept for this visit only.
   */
  const [messageMarks, setMessageMarks] = useState<Record<string, SourceMark[]>>({});
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [speechOk, setSpeechOk] = useState(false);
  /** The voice chosen for reading aloud (empty for the device's best), and the device's English voices. */
  const [voiceName, setVoiceName] = useState("");
  const [voiceList, setVoiceList] = useState<Array<{ name: string; lang: string }>>([]);
  /** Whether RabbAI's own voice (a speech service) is set up. */
  const [ownVoiceList, setOwnVoiceList] = useState<OwnVoices | null>(null);
  const ownVoice = !!ownVoiceList?.available;
  const [hebrewSay, setHebrewSay] = useState<"sephardi" | "ashkenazi">("sephardi");
  /** Talk: whether the person can cut in by talking while RabbAI speaks (components/talk.ts). */
  const [cutIn, setCutIn] = useState(true);
  /** How quickly Talk sends what was said after a pause (Settings). */
  const [talkPace, setTalkPace] = useState<TalkPace>("quick");
  /** Whether a line RabbAI reads with the person is read aloud in its Hebrew too (Settings). */
  const [readOriginal, setReadOriginal] = useState(false);
  /** True while the words in the box came from the microphone. */
  const spokenInput = useRef(false);
  const dictation = useDictation(
    useCallback((text: string) => {
      setInput(text);
      spokenInput.current = true;
    }, []),
  );
  const listening = dictation.state === "listening";
  /** Talk: the conversation out loud (components/talk.ts), set once the hook is made below. */
  const talkRef = useRef<TalkControls | null>(null);
  const [growth, setGrowth] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** What RabbAI knows about the person: what they told it and what it noticed (on this device). */
  const [profile, setProfile] = useState<LearnerProfile>(emptyProfile);
  const profileRef = useRef<LearnerProfile>(emptyProfile());
  const [aboutOpen, setAboutOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  // The open chat's chavrusa session (lib/chavrusa), if it is one, and the setup panel when open.
  const [chavrusa, setChavrusaState] = useState<ChavrusaSession | null>(null);
  const chavrusaRef = useRef<ChavrusaSession | null>(null);
  const [chavrusaSetup, setChavrusaSetup] = useState<{ initial?: Partial<ChavrusaSession>; choices: ChavrusaChoice[] } | null>(null);
  // Where the person is, for the day's times; kept on this device only (lib/calendar/device.ts).
  const [placeSettings, setPlaceSettings] = useState<PlaceSettings>({ place: null, prefs: {}, approx: true });
  useEffect(() => setPlaceSettings(loadPlaceSettings()), []);
  const changePlace = useCallback((next: PlaceSettings) => {
    setPlaceSettings(next);
    savePlaceSettings(next);
  }, []);
  // Today for the person (the date, the parsha, today's daf), for the welcome and its questions.
  const [day, setDay] = useState<DaySummary | null>(null);
  const [dayTried, setDayTried] = useState(false);
  useEffect(() => {
    const ctrl = new AbortController();
    const done = () => setDayTried(true);
    const late = window.setTimeout(done, 2500);
    fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ when: deviceWhen() }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<DaySummary>) : null))
      .then((d) => {
        if (d) setDay(d);
        done();
      })
      .catch(() => {});
    return () => {
      ctrl.abort();
      window.clearTimeout(late);
    };
  }, [placeSettings]);
  // Suggested questions, drawn fresh each time a new chat opens; today's come first.
  const [starters, setStarters] = useState<StarterGroup[] | null>(null);
  const welcomeShown = messages.length === 0;
  /** The person's last question in the chat (it can be changed and asked again). */
  const lastUserIndex = messages.reduce((at, m, i) => (m.role === "user" ? i : at), -1);
  useEffect(() => {
    if (!welcomeShown) {
      setStarters(null);
      return;
    }
    if (!day && !dayTried) return;
    setStarters((cur) => {
      if (!cur) return pickStarters(day);
      // The day arrived after the questions were drawn: add today's, keep the rest.
      if (day && !cur.some((g) => g.label === "For this week")) {
        const today = pickStarters(day).find((g) => g.label === "For this week");
        return today ? [today, ...cur] : cur;
      }
      return cur;
    });
  }, [welcomeShown, day, dayTried]);
  /** The person's account, when they sign in (use-account.ts); set below, once the chats exist. */
  const accountRef = useRef<AccountApi | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  /** Something the person did that RabbAI may remember. Nothing happens when remembering is off. */
  const notice = useCallback((a: Activity) => {
    const next = noticed(profileRef.current, a);
    if (next === profileRef.current) return;
    profileRef.current = next;
    setProfile(next);
    store(PROFILE_KEY, JSON.stringify(next));
    accountRef.current?.profileChanged();
  }, []);

  /** Learn's screens: the library, My words, or the Gemara's key words. */
  const [learnView, setLearnView] = useState<"library" | "words" | "phrases" | "articles">("library");
  /** Which group of suggested questions the welcome shows. */
  const [starterTab, setStarterTab] = useState(0);
  const starterTabNow = Math.min(starterTab, Math.max(0, (starters?.length ?? 1) - 1));
  const [lang, setLang] = useState<Lang>("both");
  /** Hebrew in a pane above, the English in a pane below, scrolling together (use-linked-scroll.ts). */
  const [split, setSplit] = useState(false);
  /** A section to open in the Daven tab (its siddur), asked for from elsewhere in the app. */
  const [davenRequest, setDavenRequest] = useState<{ section: string; n: number } | null>(null);
  const paneHeRef = useRef<HTMLDivElement>(null);
  const paneEnRef = useRef<HTMLDivElement>(null);

  const [readerRef, setReaderRef] = useState<string | null>(null);
  const [reader, setReader] = useState<ReaderData | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [lineAnswers, setLineAnswers] = useState<Record<string, LineAnswer>>({});
  const [lineQuestion, setLineQuestion] = useState("");

  // Word study: the card for a tapped word or line, and which of its tabs is open.
  const [wordCard, setWordCard] = useState<{ ref: string; index: number } | null>(null);
  const [cardTab, setCardTab] = useState<CardTab>("meaning");
  /** The reader's open menu: the display choices (Aa), the book's contents, or the edition details. */
  const [readerMenu, setReaderMenu] = useState<"aa" | "contents" | "about" | null>(null);
  /** Commentators whose comments show under every line (by name); the others fold into a count. */
  const [inlineComms, setInlineComms] = useState<string[]>([]);
  const [readerHint, setReaderHint] = useState(false);
  const [cardPos, setCardPos] = useState<CSSProperties | undefined>(undefined);
  const wide = useWide();
  const [wordInfo, setWordInfo] = useState<Record<string, WordLookup>>({});
  const [tryRef, setTryRef] = useState<string | null>(null);
  const [tryText, setTryText] = useState("");
  const [myWords, setMyWords] = useState<SavedWord[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [sections, setSections] = useState<SectionSummary[] | null>(null);
  // The library's books for the shelves; a book without categories is placed by its work's name.
  const catalogBooks = useMemo<CatalogBook[]>(
    () =>
      (sections ?? []).map((s, i) => ({
        title: s.section,
        he: s.sectionHe,
        firstRef: s.firstRef,
        workTitle: s.workTitle,
        categories: s.categories ?? [],
        order: s.order ?? i,
      })),
    [sections],
  );
  /** The siddurs in the library, in the order the Daven tab offers them. */
  const siddurTitles = useMemo(
    () => siddurOrder(placeBooks(catalogBooks).filter((b) => b.shelf === "prayer" && !b.commentary).map((b) => b.title)),
    [catalogBooks],
  );
  const readerBilingual = !!reader?.lines.some((l) => l.he.trim() && l.en.trim());
  const splitOn = split && readerBilingual && !readerLoading && !readerError;
  useLinkedScroll(paneHeRef, paneEnRef, splitOn && readerOpen, reader);
  const [glossary, setGlossary] = useState<PhraseInfo[]>([]);
  const [articleShelves, setArticleShelves] = useState<ArticleShelf[]>([]);
  // Saved chats and recent reading, on this device only.
  const [chats, setChats] = useState<SavedChat[]>([]);
  const chatsRef = useRef<SavedChat[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatsOpen, setChatsOpen] = useState(false);
  const [chatTools, setChatTools] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<{ id: string; text: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState<{ id: string; text: string } | null>(null);
  const [recent, setRecent] = useState<RecentReading[]>([]);
  const recentRef = useRef<RecentReading[]>([]);
  const [chatFilter, setChatFilter] = useState("");
  // The Gemara page as printed.
  const [dafRef, setDafRef] = useState<string | null>(null);
  const [daf, setDaf] = useState<DafData | null>(null);
  const [dafLoading, setDafLoading] = useState(false);
  const [dafError, setDafError] = useState<string | null>(null);
  const [dafPick, setDafPick] = useState<{ ref: string; index: number; word: string; part: "main" | "rashi" | "tosafot"; printedAs?: string } | null>(null);
  const [dafZoom, setDafZoom] = useState(1);
  const [dafVowels, setDafVowels] = useState(false);
  /** The Gemara alone in one column, instead of the whole printed page. */
  const [dafColumn, setDafColumn] = useState(false);
  /** A one-time note on a phone: pinch or double-tap to zoom the page. */
  const [dafZoomHint, setDafZoomHint] = useState(false);
  const dafMainRef = useRef<HTMLDivElement>(null);
  const dafZoomChosen = useRef(false);
  const [dafQuestion, setDafQuestion] = useState("");
  const [dafMenu, setDafMenu] = useState<"view" | "contents" | null>(null);
  const [outlines, setOutlines] = useState<Record<string, { lines: OutlineLine[]; model?: string }>>({});
  const [outlineState, setOutlineState] = useState<{ loading: boolean; error?: string } | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  /** The flow's legend filter (one kind's color only), and the phrase being stepped through. */
  const [flowOnly, setFlowOnly] = useState<OutlineKind | null>(null);
  const [flowStep, setFlowStep] = useState<PhraseAt | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<string, { loading?: boolean; error?: string; result?: Translation }>>({});
  const translationsRef = useRef(translations);
  translationsRef.current = translations;
  const keptAsked = useRef(new Set<string>());
  /**
   * The translations already kept in RabbAI's translation library for these passages, so a Rashi
   * or Tosafot shows its translation right under the Hebrew. Only reads what is kept; never asks
   * the model (that waits for the person to tap "Translate").
   */
  const loadKept = useCallback(
    async (refs: string[]) => {
      if (libraryMode !== "testing") return;
      const want = [...new Set(refs)].filter((r) => r && !keptAsked.current.has(r) && !translationsRef.current[r]?.result);
      if (!want.length) return;
      for (const r of want) keptAsked.current.add(r);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refs: want, keptOnly: true }),
        });
        const json = (await res.json().catch(() => ({}))) as { translations?: unknown[] };
        const got = (Array.isArray(json.translations) ? json.translations : [])
          .map((t) => readKeptTranslation(t))
          .filter((t): t is Translation => !!t && want.includes(t.ref));
        if (!got.length) return;
        setTranslations((prev) => {
          const next = { ...prev };
          for (const t of got) if (!next[t.ref]?.result) next[t.ref] = { result: t };
          return next;
        });
        for (const t of got) keepTranslation(t);
      } catch {
        // Nothing kept is shown; "Translate" still works.
      }
    },
    [libraryMode],
  );
  const [wordByWord, setWordByWord] = useState<Record<string, boolean>>({});

  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);
  const readerHeadRef = useRef<HTMLDivElement>(null);
  /** On a phone the reader's bar slides away while reading down, and comes back on the way up. */
  const [barHidden, setBarHidden] = useState(false);
  /** Until when the reader is scrolling by itself (to a cited line), so the bar stays. */
  const autoScrollUntil = useRef(0);
  const [headHeight, setHeadHeight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // An unsent question is kept with its chat for this tab, so switching chats or reloading keeps it.
  const draftsReady = useRef(false);
  useEffect(() => {
    if (!draftsReady.current) {
      // After a reload: bring back what was being typed in the chat that opens.
      draftsReady.current = true;
      const kept = draftFor(chatIdRef.current);
      if (kept && !input) {
        setInput(kept);
        return;
      }
    }
    keepDraft(chatIdRef.current, input);
    // Only typing changes a draft; switching chats keeps and brings back drafts itself (showChat).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // Esc closes what is open on top: the shortcuts list, a sent picture, the chats screen on a phone.
  // (The chats are a column beside the chat on a computer; on a phone they are their own screen.)
  const chatsScreen = chatsOpen && !(mode === "chat" && wide && !readerOpen);
  useEffect(() => {
    if (!shortcutsOpen && !pictureView && !chatsScreen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (shortcutsOpen) setShortcutsOpen(false);
      else if (pictureView) setPictureView(null);
      else setChatsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcutsOpen, pictureView, chatsScreen]);

  // Ctrl/Cmd+Shift+O starts a new chat (as in other chat apps); "?" lists the keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (!!t.closest("input, textarea, select, [contenteditable=true]") || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        startNewChatRef.current();
        return;
      }
      // Alt+1, 2, 3: Chat, Learn, Daven.
      if (e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[123]$/.test(e.code)) {
        e.preventDefault();
        chooseModeRef.current((["chat", "learn", "daven"] as const)[Number(e.code.slice(5)) - 1]);
        return;
      }
      if (e.key === "?" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // On a computer, "/" puts the cursor in the question box, as on many sites.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || mode !== "chat") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest("input, textarea, select, [contenteditable=true]") || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const box = textareaRef.current;
      if (!box) return;
      e.preventDefault();
      box.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode]);

  // Settings and saved words live on this device only.
  useEffect(() => {
    setGrowth(readStored("rabai_growth", ["on", "off"] as const, "off") === "on");
    setTextSize(readStored("rabai_text_size", TEXT_SIZES, "normal"));
    setTheme(readStored("rabai_theme", THEMES, "system"));
    const rate = readStored("rabai_speech_rate", ["0.8", "1", "1.2"] as const, "1");
    setReadingRate(rate);
    setSpeechRate(Number(rate));
    try {
      const voice = window.localStorage.getItem("rabai_voice") ?? "";
      setVoiceName(voice);
      setPreferredVoice(voice);
    } catch {
      /* storage is unavailable */
    }
    const say = readStored("rabai_voice_hebrew", ["sephardi", "ashkenazi"] as const, "sephardi");
    setHebrewSay(say);
    setHebrewPronunciation(say);
    const cut = readStored("rabai_cut_in", ["on", "off"] as const, "on") === "on";
    setCutIn(cut);
    setCutInByVoice(cut);
    setTalkPace(readStored("rabai_talk_pace", ["quick", "relaxed"] as const, "quick"));
    const original = readStored("rabai_read_lines", ["english", "both"] as const, "english") === "both";
    setReadOriginal(original);
    readLinesInOriginal = original;
    setLang(readStored("rabai_lang", ["he", "both", "en"] as const, "both"));
    setSplit(readStored("rabai_split", ["on", "off"] as const, "off") === "on");
    setReaderHint(readStored("rabai_reader_hint", ["seen", "new"] as const, "new") === "new");
    try {
      const kept = JSON.parse(window.localStorage.getItem("rabai_inline_comms") ?? "[]");
      if (Array.isArray(kept)) setInlineComms(kept.filter((x): x is string => typeof x === "string").slice(0, 20));
    } catch {
      /* nothing kept */
    }
    setMode(readStored("rabai_mode", ["chat", "learn", "daven"] as const, "chat"));
    setDafVowels(readStored("rabai_daf_vowels", ["on", "off"] as const, "off") === "on");
    setDafColumn(readStored("rabai_daf_column", ["on", "off"] as const, "off") === "on");
    setDafZoomHint(readStored("rabai_daf_zoom_hint", ["seen", "new"] as const, "new") === "new");
    try {
      profileRef.current = parseProfile(JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "null"));
      setProfile(profileRef.current);
    } catch {
      /* nothing kept */
    }
    setMyWords(readSavedWords());
    setTranslations(Object.fromEntries(Object.entries(readKeptTranslations()).map(([ref, result]) => [ref, { result }])));
    setSpeechOk(canSpeak());
    try {
      chatsRef.current = parseChats(JSON.parse(window.localStorage.getItem(CHATS_KEY) ?? "[]"));
      setChats(chatsRef.current);
      recentRef.current = parseRecent(JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]"));
      const savedMarks = JSON.parse(window.localStorage.getItem(MARKS_KEY) ?? "{}");
      if (savedMarks && typeof savedMarks === "object" && !Array.isArray(savedMarks)) setMarks(savedMarks as Record<string, string>);
      setRecent(recentRef.current);
    } catch {
      /* nothing saved, or storage is unavailable */
    }
    return () => stopSpeaking();
  }, []);

  const chooseMode = (m: Mode) => {
    // Tapping Learn again goes back to the library.
    if (m === "learn") setLearnView("library");
    setMode(m);
    store("rabai_mode", m);
  };

  const chooseModeRef = useRef(chooseMode);
  chooseModeRef.current = chooseMode;

  /** The siddur a ref is in, if it is in one: a siddur opens for davening by default. */
  const siddurOf = (ref: string) => siddurTitles.find((t) => ref === t || ref.startsWith(`${t}, `));

  /** Opens the Daven tab at a section of a siddur. */
  const openDaven = (section: string) => {
    setReaderOpen(false);
    chooseMode("daven");
    setDavenRequest({ section, n: Date.now() });
  };

  // ---- saved chats ----
  /** Keep chats on this device only (also used when the account sends its copy). */
  const setChatsLocal = useCallback((next: SavedChat[]) => {
    chatsRef.current = next;
    setChats(next);
    store(CHATS_KEY, serializeChats(next));
  }, []);
  /** Keep chats, and send the change to the person's account when they are signed in. */
  const saveChats = useCallback(
    (next: SavedChat[]) => {
      const prev = chatsRef.current;
      setChatsLocal(next);
      accountRef.current?.chatsChanged(prev, next);
    },
    [setChatsLocal],
  );

  // ---- the person's account (use-account.ts): their profile and chats on every device ----
  const account = useAccount({
    getProfile: () => profileRef.current,
    setProfile: (p) => {
      profileRef.current = p;
      setProfile(p);
      store(PROFILE_KEY, JSON.stringify(p));
    },
    getChats: () => chatsRef.current,
    setChats: setChatsLocal,
    clearDevice: () => {
      profileRef.current = emptyProfile();
      setProfile(profileRef.current);
      setChatsLocal([]);
      try {
        window.localStorage.removeItem(PROFILE_KEY);
        window.localStorage.removeItem(CHATS_KEY);
      } catch {
        /* storage can be unavailable */
      }
      setMessages([]);
      setChatId(null);
    },
  });
  useEffect(() => {
    accountRef.current = account.api;
  }, [account.api]);
  const signedIn = account.state.status === "signed-in";
  const accountsOn = account.state.status !== "off" && account.state.status !== "loading";

  // Save the conversation as it goes: the question the moment it is asked (with a place kept for
  // its answer, so leaving the page never loses it), and the answer when it comes.
  useEffect(() => {
    if (!chatId || !messages.length) return;
    const saved = messages.map(toSaved);
    const existing = chatsRef.current.find((c) => c.id === chatId);
    if (existing && chatSignature(existing.messages) === chatSignature(saved)) return;
    const now = Date.now();
    saveChats(
      upsertChat(chatsRef.current, {
        id: chatId,
        title: existing?.title ?? "",
        category: existing?.category ?? "",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        ...(chavrusaRef.current ? { chavrusa: chavrusaRef.current } : {}),
        messages: saved,
      }),
    );
  }, [messages, chatId, saveChats]);

  /** Change or end the open chat's chavrusa session, and keep the change with the chat. */
  const setChatChavrusa = useCallback(
    (session: ChavrusaSession | null) => {
      chavrusaRef.current = session;
      setChavrusaState(session);
      const id = chatIdRef.current;
      if (!id || !chatsRef.current.some((c) => c.id === id)) return;
      saveChats(
        chatsRef.current.map((c) => {
          if (c.id !== id) return c;
          const { chavrusa: _old, ...rest } = c;
          void _old;
          return { ...rest, ...(session ? { chavrusa: session } : {}), changedAt: Date.now() };
        }),
      );
    },
    [saveChats],
  );

  /** The chat on screen, for answers that arrive later (they belong to the chat that asked). */
  const chatIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  /** The chat this tab had open is read once, when the app opens (until then it isn't touched). */
  const openChatRead = useRef(false);
  useEffect(() => {
    chatIdRef.current = chatId;
    if (!openChatRead.current) return;
    // A reload of this tab comes back to the chat that was open.
    try {
      if (chatId) window.sessionStorage.setItem(OPEN_CHAT_KEY, chatId);
      else window.sessionStorage.removeItem(OPEN_CHAT_KEY);
    } catch {
      /* storage can be unavailable */
    }
  }, [chatId]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  /** Where to bring the conversation after it changes: a question just asked, or a chat just opened. */
  const scrollTarget = useRef<number | "top" | null>("top");

  const updateChat = (id: string, change: Partial<Pick<SavedChat, "title" | "category">>) =>
    saveChats(chatsRef.current.map((c) => (c.id === id ? { ...c, ...change, changedAt: Date.now() } : c)));

  const showChat = (id: string | null, list: ChatMessage[], session: ChavrusaSession | null = null) => {
    talkRef.current?.end();
    keepDraft(chatIdRef.current, input);
    chavrusaRef.current = session;
    setChavrusaState(session);
    dictation.cancel();
    stopSpeaking();
    setSpeaking(null);
    chatIdRef.current = id;
    setChatId(id);
    setMessages(list);
    setInput(draftFor(id));
    setAttached([]);
    setComposerNote(null);
    setChatsOpen(false);
    setChatTools(null);
    // A chat opens at its last question, so the person sees it and the start of its answer.
    const lastQuestion = [...list].reverse().find((m) => m.role === "user");
    scrollTarget.current = lastQuestion ? lastQuestion.id : "top";
    if (id)
      setFreshChats((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    chooseMode("chat");
  };

  const startNewChat = () => showChat(null, []);
  const startNewChatRef = useRef(startNewChat);
  startNewChatRef.current = startNewChat;

  const openChat = (chat: SavedChat) =>
    showChat(
      chat.id,
      chat.messages.map((m) => ({ id: nextId.current++, ...m })),
      chat.chavrusa ?? null,
    );

  const deleteChat = (id: string) => {
    // An answer still being written for this chat isn't needed any more.
    for (const m of chatsRef.current.find((c) => c.id === id)?.messages ?? []) if (m.pending) cancelJob(m.pending.id);
    saveChats(chatsRef.current.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setChatTools(null);
    if (id === chatId) {
      chatIdRef.current = null;
      setMessages([]);
      setChatId(null);
    }
  };

  // Remember where the person was reading, so Learn can offer to pick up there.
  useEffect(() => {
    if (!reader || !reader.lines.length) return;
    const next = addRecent(recentRef.current, { ref: reader.focus ?? reader.lines[0].ref, title: reader.section, at: Date.now() });
    recentRef.current = next;
    setRecent(next);
    store(RECENT_KEY, JSON.stringify(next));
    notice({ kind: "book", title: bookOfSection(reader.section) });
  }, [reader, notice]);

  // ---- the Gemara page ----
  usePinchZoom(dafMainRef, {
    zoom: dafZoom,
    min: 1,
    max: 4,
    enabled: !!daf && !dafColumn,
    onZoom: (z) => {
      dafZoomChosen.current = true;
      setDafZoom(z);
      if (dafZoomHint) {
        setDafZoomHint(false);
        store("rabai_daf_zoom_hint", "seen");
      }
    },
  });
  const openDaf = useCallback(async (ref: string) => {
    const at = parseAmud(ref);
    if (!at) return;
    const section = `${at.tractate} ${at.daf}${at.amud}`;
    setDafRef(section);
    setDaf((d) => (d && d.section === section ? d : null));
    setDafPick(null);
    setDafQuestion("");
    setDafError(null);
    setFlowStep(null);
    setFlowOnly(null);
    setDafLoading(true);
    try {
      const res = await fetch(`/api/daf?ref=${encodeURIComponent(section)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "That page isn't available.");
      setDaf(json as DafData);
      // The address names the page, so it can be shared or reloaded.
      const url = new URL(window.location.href);
      url.searchParams.set("daf", section);
      window.history.replaceState(null, "", url);
      const next = addRecent(recentRef.current, { ref: section, title: section, at: Date.now(), page: true });
      recentRef.current = next;
      setRecent(next);
      store(RECENT_KEY, JSON.stringify(next));
      notice({ kind: "book", title: at.tractate });
      try {
        // Checked again against the page as it is now; an outline kept in the old, line-by-line form isn't read.
        const kept = readKeptOutline(JSON.parse(window.localStorage.getItem(outlineKey(section)) ?? "null"), (json as DafData).main);
        if (kept) setOutlines((prev) => ({ ...prev, [section]: kept }));
      } catch {
        /* no outline kept */
      }
    } catch (err) {
      setDaf(null);
      setDafError(err instanceof Error ? err.message : "That page isn't available.");
    } finally {
      setDafLoading(false);
    }
  }, []);

  const closeDaf = () => {
    setDafRef(null);
    setDafPick(null);
    setDafMenu(null);
    setOutlineState(null);
    setFlowStep(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("daf")) {
      url.searchParams.delete("daf");
      window.history.replaceState(null, "", url);
    }
  };

  // A link with ?daf=Berakhot 2a opens that page.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("daf");
    if (ref && parseAmud(ref)) void openDaf(ref);
  }, [openDaf]);

  const showFlow = async () => {
    if (!daf) return;
    if (outlines[daf.section]) {
      setShowOutline(!showOutline);
      setFlowStep(null);
      setFlowOnly(null);
      return;
    }
    setShowOutline(true);
    setOutlineState({ loading: true });
    try {
      const res = await fetch("/api/daf/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: daf.section }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "RabbAI couldn't outline this page just now.");
      // Checked on the device too: every phrase is the page's own words, every English the library's.
      const kept = readKeptOutline({ v: OUTLINE_VERSION, lines: json.lines, model: json.model }, daf.main);
      if (!kept) throw new Error("RabbAI couldn't outline this page just now.");
      setOutlines((prev) => ({ ...prev, [daf.section]: kept }));
      store(outlineKey(daf.section), keptOutline(kept));
      setOutlineState(null);
    } catch (err) {
      setOutlineState({ loading: false, error: err instanceof Error ? err.message : "RabbAI couldn't outline this page just now." });
      setShowOutline(false);
    }
  };

  /** RabbAI's translation of a passage, asked for only when the person taps Translate or Word by word. */
  const translate = async (ref: string, context: string[], openWords: boolean) => {
    if (openWords) setWordByWord((prev) => ({ ...prev, [ref]: true }));
    const have = translations[ref];
    // Ask only for what isn't here yet: the word-by-word list is made separately, when asked for.
    if (have?.loading || (have?.result && (!openWords || have.result.words !== undefined))) return;
    setTranslations((prev) => ({ ...prev, [ref]: { result: prev[ref]?.result, loading: true } }));
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, context, words: openWords }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? TRANSLATE_FAILED);
      const result = readKeptTranslation(json);
      if (!result || result.ref !== ref) throw new Error(TRANSLATE_FAILED);
      setTranslations((prev) => ({ ...prev, [ref]: { result } }));
      keepTranslation(result);
    } catch (err) {
      setTranslations((prev) => ({
        ...prev,
        [ref]: { result: prev[ref]?.result, error: err instanceof Error ? err.message : TRANSLATE_FAILED },
      }));
    }
  };

  /** The next or previous word of the tapped line or comment, as the page shows it. */
  const stepDafWord = (dir: 1 | -1) => {
    if (!dafPick) return;
    const page = document.querySelector(".daf-view .daf");
    if (!page) return;
    const byIndex = new Map<number, HTMLElement>();
    for (const el of page.querySelectorAll<HTMLElement>(`[data-ref="${CSS.escape(dafPick.ref)}"] [data-i]`)) {
      const i = Number(el.dataset.i);
      if (!byIndex.has(i)) byIndex.set(i, el);
    }
    const order = [...byIndex.keys()].sort((a, b) => a - b);
    const next = order[order.indexOf(dafPick.index) + dir];
    if (next === undefined) return;
    const el = byIndex.get(next)!;
    const short = el.dataset.short;
    setDafPick({ ...dafPick, index: next, word: withoutPoints(short ? (el.dataset.full ?? "") : (el.textContent ?? "")), printedAs: short });
  };

  /** Selects a line or comment on the page, starting at its first word. */
  const pickPiece = (ref: string, he: string, part: "main" | "rashi" | "tosafot") => {
    setDafPick({ ref, index: 0, word: withoutPoints(pieceWords(he)[0] ?? ""), part });
    setCardTab(part === "main" ? "meaning" : "translation");
    setDafQuestion("");
  };

  // On a phone, keep the tapped word in view above the card.
  useEffect(() => {
    if (wide || !dafPick) return;
    const main = document.querySelector<HTMLElement>(".daf-view .daf-main");
    const el = main?.querySelector<HTMLElement>(".dw.on");
    if (!main || !el) return;
    keepAboveSheet(main, el);
  }, [wide, dafPick]);

  const markPiece = (ref: string, color: string | null) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (color) next[ref] = color;
      else delete next[ref];
      store(MARKS_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Look up the word tapped on the page, as for a word tapped in the reader.
  useEffect(() => {
    const w = dafPick ? bareWord(dafPick.word) : "";
    if (!w || /\s/.test(w) || wordInfo[w]) return; // (a short form for several words has no one entry)
    notice({ kind: "word", word: w });
    setWordInfo((prev) => ({ ...prev, [w]: { loading: true } }));
    fetch(`/api/word?w=${encodeURIComponent(w)}`)
      .then((r) => r.json())
      .then((j: { available?: boolean; entries?: WordEntry[]; error?: string; abbreviation?: WordLookup["abbreviation"] }) =>
        setWordInfo((prev) => ({
          ...prev,
          [w]: j.error ? { loading: false, error: j.error } : { loading: false, available: j.available, entries: j.entries ?? [], abbreviation: j.abbreviation },
        })),
      )
      .catch(() => setWordInfo((prev) => ({ ...prev, [w]: { loading: false, error: "The dictionaries couldn't be reached just now." } })));
  }, [dafPick, wordInfo]);

  // The pages before and after, and the opener, for the page keys below.
  const dafPrevRef = useRef<string | undefined>(undefined);
  const dafNextRef = useRef<string | undefined>(undefined);
  const openDafRef = useRef(openDaf);
  dafPrevRef.current = daf?.prev ?? undefined;
  dafNextRef.current = daf?.next ?? undefined;
  openDafRef.current = openDaf;

  useEffect(() => {
    if (!dafRef) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      // The arrow keys turn the page, as the ‹ › buttons do (a word's card uses them for words).
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !dafPick && !dafMenu && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        if (t?.closest("input, textarea, select, [contenteditable=true]")) return;
        const to = e.key === "ArrowLeft" ? dafPrevRef.current : dafNextRef.current;
        if (to) {
          e.preventDefault();
          void openDafRef.current(to);
        }
        return;
      }
      if (e.key !== "Escape") return;
      if (dafMenu) setDafMenu(null);
      else if (dafPick) setDafPick(null);
      else if (flowStep) setFlowStep(null);
      else closeDaf();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dafRef, dafPick, dafMenu, flowStep]);

  // The zoom tip goes away by itself: once the page is zoomed, or after a while.
  useEffect(() => {
    if (!dafZoomHint || !daf) return;
    if (dafZoom !== 1) {
      setDafZoomHint(false);
      store("rabai_daf_zoom_hint", "seen");
      return;
    }
    const t = window.setTimeout(() => {
      setDafZoomHint(false);
      store("rabai_daf_zoom_hint", "seen");
    }, 9000);
    return () => window.clearTimeout(t);
  }, [dafZoomHint, dafZoom, daf]);

  // The browser tab says what is open: the printed page, or the chat's name.
  const baseTitle = useRef("RabbAI");
  const openChatTitle = chatId ? chats.find((c) => c.id === chatId)?.title : undefined;
  useEffect(() => {
    const t = daf ? `${daf.section} · RabbAI` : openChatTitle ? `${openChatTitle} · RabbAI` : "RabbAI";
    baseTitle.current = t;
    if (!document.hidden) document.title = t;
  }, [daf, openChatTitle]);

  const tailRef = useRef<HTMLDivElement>(null);
  /**
   * The person has moved away from the newest part of the chat (a button brings them back): while
   * an answer is written, its place is off the screen; otherwise the end of the chat is well below.
   */
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const measureAway = useCallback(() => {
    const el = scrollRef.current;
    const tail = tailRef.current;
    if (!el || !tail) return;
    const view = el.getBoundingClientRect();
    const live = el.querySelector<HTMLElement>(".msg-ai.live");
    let away: boolean;
    if (live) {
      const r = live.getBoundingClientRect();
      away = r.bottom < view.top + 40 || r.top > view.bottom - 40;
    } else away = tail.getBoundingClientRect().top - view.bottom > 240;
    setAwayFromLatest((prev) => (prev === away ? prev : away));
  }, []);
  const onThreadScroll = measureAway;
  const toLatest = useCallback(() => {
    const el = scrollRef.current;
    const tail = tailRef.current;
    if (!el) return;
    const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const view = el.getBoundingClientRect();
    const questions = el.querySelectorAll<HTMLElement>("[data-msg-user]");
    const last = questions[questions.length - 1];
    let top: number;
    // While an answer is written, its question goes back to the top, as when it was asked.
    if (el.querySelector(".msg-ai.live") && last) top = el.scrollTop + last.getBoundingClientRect().top - view.top - 12;
    else if (tail) top = el.scrollTop + tail.getBoundingClientRect().top - view.bottom + 24;
    else top = el.scrollHeight;
    el.scrollTo({ top: Math.max(0, top), behavior: still ? "auto" : "smooth" });
  }, []);

  /**
   * Room below the last question, so it can sit at the top of the screen with its answer growing
   * underneath, as in a book: the person reads from the start of the answer, and the screen never
   * moves under them while it is written.
   */
  const [tailRoom, setTailRoom] = useState(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const tail = tailRef.current;
    if (!el || !tail || mode !== "chat") return;
    const questions = el.querySelectorAll<HTMLElement>("[data-msg-user]");
    const last = questions[questions.length - 1];
    if (!last) {
      if (tailRoom) setTailRoom(0);
      return;
    }
    const top = last.getBoundingClientRect().top;
    const end = tail.getBoundingClientRect().top;
    const room = Math.max(0, Math.round(el.clientHeight - (end - top) - 24));
    if (Math.abs(room - tailRoom) > 2) setTailRoom(room);
    measureAway();
  });

  // Bring the conversation where it should be: a question just asked to the top, a chat just
  // opened at its last question, a new chat at the top. Nothing moves while an answer is written.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const want = scrollTarget.current;
    if (!el || want === null || mode !== "chat") return;
    if (want === "top") {
      scrollTarget.current = null;
      el.scrollTo({ top: 0 });
      return;
    }
    const node = el.querySelector<HTMLElement>(`[data-msg="${want}"]`);
    if (!node) return;
    scrollTarget.current = null;
    const top = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // After the room below is made (the effect above), so the question can reach the top.
    requestAnimationFrame(() => el.scrollTo({ top: Math.max(0, top), behavior: still ? "auto" : "smooth" }));
  }, [messages, mode, chatsOpen, tailRoom]);

  // ---- reading aloud ----
  const speakingRef = useRef<string | null>(null);
  const setSpeaking = useCallback((id: string | null) => {
    speakingRef.current = id;
    setSpeakingId(id);
    if (!id) setSpokenAt(null);
  }, []);
  /** Where the voice is in the answer it reads, for the text on screen to follow. */
  const followVoice = useCallback((id: string, start: number, end: number) => {
    if (speakingRef.current === id) setSpokenAt({ id, start, end });
  }, []);
  /** Read an answer aloud, or stop if it is the one being read. */
  const listen = useCallback(
    (id: string, text: string) => {
      const talk = talkRef.current;
      if (talk && (micOpen(talk.state.phase) || talk.state.phase === "speaking")) {
        // Listening by hand pauses Talk, so its microphone doesn't hear the answer being read.
        const readingThis = talk.state.phase === "speaking" && speakingRef.current === id;
        talk.pause(null);
        if (readingThis) return;
      }
      if (speakingRef.current === id) {
        stopSpeaking();
        setSpeaking(null);
        return;
      }
      setSpeaking(id);
      // Read a piece at a time, so the text on screen can follow the voice.
      speakLive(
        () => {
          if (speakingRef.current === id) setSpeaking(null);
        },
        (start, end) => followVoice(id, start, end),
      ).finish(text);
    },
    [setSpeaking, followVoice],
  );

  // ---- asking (answers keep being written when the page goes away: lib/answer-jobs.ts) ----
  const controllers = useRef(new Map<string, AbortController>());
  const watchers = useRef(new Map<string, ReturnType<typeof setTimeout> | null>());
  const settledJobs = useRef(new Set<string>());
  const spokenJobs = useRef(new Set<string>());
  /** Questions asked in Talk: their answers are read aloud, and then RabbAI listens again. */
  const talkJobs = useRef(new Set<string>());
  /** The Talk question whose answer is being read now (an earlier one the person cut in on is not). */
  const talkCurrent = useRef<string | null>(null);
  /** A Talk question said while the answer before it was still being written: sent when it is done. */
  const queuedTalk = useRef<{ q: string; cutIn: string } | null>(null);
  /**
   * Each live answer's text so far as it is read aloud (the lines it reads put in, in their own
   * words), so it can be read aloud as it is written.
   */
  const liveText = useRef(new Map<string, string>());
  /** What each live answer did with its passages so far (SourceCard), kept when it is done. */
  const liveMarks = useRef(new Map<string, SourceMark[]>());
  /** Answers to questions asked out loud, read as they are written (components/voice.ts). */
  const liveSpoken = useRef(new Map<string, LiveSpeech>());
  /** The pictures sent during this visit, by their preview: sent again with follow-up questions. */
  const sentPictures = useRef(new Map<string, QuestionPicture>());

  const dropLive = (jobId: string) =>
    setLiveJobs((prev) => {
      if (!(jobId in prev)) return prev;
      const next = { ...prev };
      delete next[jobId];
      return next;
    });

  const stopWatching = (jobId: string) => {
    const t = watchers.current.get(jobId);
    if (t) clearTimeout(t);
    watchers.current.delete(jobId);
  };

  /** Put something in place of a chat's placeholder for an answer (or remove it, with null). */
  const settleInChat = useCallback(
    (chat: string, jobId: string, make: (m: ChatMessage) => ChatMessage | null) => {
      if (chatIdRef.current === chat) {
        setMessages((prev) => prev.flatMap((m) => (m.pending?.id === jobId ? (make(m) ?? []) : [m])));
        return;
      }
      const saved = chatsRef.current.find((c) => c.id === chat);
      if (!saved || !saved.messages.some((m) => m.pending?.id === jobId)) return;
      const messages = saved.messages.flatMap((m) => {
        if (m.pending?.id !== jobId) return [m];
        const made = make({ id: 0, role: "ai", pending: m.pending });
        return made ? [toSaved(made)] : [];
      });
      saveChats(upsertChat(chatsRef.current, { ...saved, updatedAt: Date.now(), messages }));
    },
    [saveChats],
  );

  const errorResult = useCallback(
    (notice: string): AskResult => ({ status: "error", blocks: [], sources: [], retrieved: [], safety: null, libraryMode, droppedCitations: 0, notice }),
    [libraryMode],
  );

  /** An answer arrived: it takes its place in the chat that asked for it, open or not. */
  const finishJob = useCallback(
    (jobId: string, chat: string, result: AskResult, how: { streamed?: boolean; away?: boolean } = {}) => {
      if (settledJobs.current.has(jobId)) return;
      settledJobs.current.add(jobId);
      stopWatching(jobId);
      controllers.current.delete(jobId);
      dropLive(jobId);
      const open = chatIdRef.current === chat;
      const placeholder = open ? messagesRef.current.find((m) => m.pending?.id === jobId) : undefined;
      // The quotes and lines read stay with the answer, so its text keeps following the voice.
      const marks = liveMarks.current.get(jobId);
      liveMarks.current.delete(jobId);
      if (placeholder && marks?.length) setMessageMarks((prev) => ({ ...prev, [`m${placeholder.id}`]: marks }));
      settleInChat(chat, jobId, (m) => ({
        id: m.id,
        role: "ai",
        result,
        ...(how.streamed && result.blocks.length ? { streamed: true } : {}),
        ...(how.away ? { away: true } : {}),
      }));
      if (!open) setFreshChats((prev) => new Set(prev).add(chat));
      // A chavrusa session moves on to the furthest line the answer cited, and is remembered.
      const session = open ? chavrusaRef.current : (chatsRef.current.find((c) => c.id === chat)?.chavrusa ?? null);
      if (session && result.status === "answered") {
        const at = reachedLine(session, [
          ...result.sources.filter((x) => !x.article && !x.online).map((x) => x.ref),
          ...result.blocks.flatMap((b) => (b.read ? [b.read] : [])),
        ]);
        const next = at && at !== session.at ? { ...session, at } : session;
        if (next !== session) {
          if (open) setChatChavrusa(next);
          else saveChats(chatsRef.current.map((c) => (c.id === chat ? { ...c, chavrusa: next } : c)));
        }
        if (next.text) notice({ kind: "learned", text: next.text, ...(next.at ? { at: next.at } : {}), style: next.style });
      }
      // The Torah subject of the question, so RabbAI remembers what they learned (never their life).
      if (result.topic) notice({ kind: "topic", topic: result.topic });
      // The page has it now: nothing more is kept on the server.
      void fetch(`/api/ask/job?id=${encodeURIComponent(jobId)}`, { method: "DELETE" }).catch(() => undefined);
      // A question asked out loud gets its answer read aloud (already begun while it was written).
      const written = liveText.current.get(jobId) ?? "";
      liveText.current.delete(jobId);
      const reading = liveSpoken.current.get(jobId);
      liveSpoken.current.delete(jobId);
      if (spokenJobs.current.delete(jobId) && placeholder && result.status === "answered" && canSpeak()) {
        if (reading) reading.finish(written || spokenAnswer(result));
        else listen(`m${placeholder.id}`, spokenAnswer(result));
      } else if (reading) stopSpeaking();
      if (talkJobs.current.delete(jobId) && talkCurrent.current === jobId) {
        talkCurrent.current = null;
        if (placeholder && result.status === "answered") talkRef.current?.answer(`m${placeholder.id}`, written || spokenAnswer(result));
        else talkRef.current?.answerFailed(result.status === "answered" ? undefined : "RabbAI couldn't answer that just now; the note is in the chat. Tap to talk to go on.");
      }
      if (document.hidden) document.title = "Answered · RabbAI";
    },
    [settleInChat, listen, setChatChavrusa, saveChats, notice],
  );

  const failJob = useCallback(
    (jobId: string, chat: string, notice: string) => {
      if (settledJobs.current.has(jobId)) return;
      settledJobs.current.add(jobId);
      stopWatching(jobId);
      controllers.current.delete(jobId);
      dropLive(jobId);
      spokenJobs.current.delete(jobId);
      liveText.current.delete(jobId);
      liveMarks.current.delete(jobId);
      if (liveSpoken.current.has(jobId)) {
        liveSpoken.current.delete(jobId);
        stopSpeaking();
      }
      if (talkJobs.current.delete(jobId) && talkCurrent.current === jobId) {
        talkCurrent.current = null;
        talkRef.current?.answerFailed();
      }
      settleInChat(chat, jobId, (m) => ({ id: m.id, role: "ai", result: errorResult(notice) }));
    },
    [settleInChat, errorResult],
  );

  /** Put a question back in the box, with its pictures, to change or ask again. */
  const restoreToBox = (q: ChatMessage) => {
    setInput(q.text ?? "");
    const pics = (q.pictures ?? []).flatMap((p, i) => {
      const full = sentPictures.current.get(p.src);
      return full ? [{ key: `r${Date.now()}${i}`, full, preview: p }] : [];
    });
    setAttached(pics);
  };

  /** Take a question and its unanswered placeholder out of the open chat. */
  const takeBack = (jobId: string): ChatMessage | null => {
    const list = messagesRef.current;
    const i = list.findIndex((m) => m.pending?.id === jobId);
    if (i < 0) return null;
    const q = i > 0 && list[i - 1].role === "user" ? list[i - 1] : null;
    const rest = list.filter((_, k) => k !== i && !(q && k === i - 1));
    setMessages(rest);
    const chat = chatIdRef.current;
    if (!rest.length && chat) {
      saveChats(chatsRef.current.filter((c) => c.id !== chat));
      chatIdRef.current = null;
      setChatId(null);
    }
    return q;
  };

  /** RabbAI turned the request down before starting (too long, a picture it can't read). */
  const refuseJob = useCallback(
    (jobId: string, chat: string, message: string) => {
      if (chatIdRef.current !== chat) return failJob(jobId, chat, message);
      settledJobs.current.add(jobId);
      stopWatching(jobId);
      dropLive(jobId);
      spokenJobs.current.delete(jobId);
      const q = takeBack(jobId);
      if (q) restoreToBox(q);
      setComposerNote(message);
    },
    // takeBack and restoreToBox read refs and setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [failJob],
  );

  /** Stop writing an answer that is no longer wanted. Nothing of it is kept. */
  const cancelJob = (jobId: string) => {
    settledJobs.current.add(jobId);
    stopWatching(jobId);
    controllers.current.get(jobId)?.abort();
    controllers.current.delete(jobId);
    spokenJobs.current.delete(jobId);
    dropLive(jobId);
    void fetch("/api/ask/job", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: jobId, action: "stop" }) })
      .catch(() => undefined)
      .finally(() => void fetch(`/api/ask/job?id=${encodeURIComponent(jobId)}`, { method: "DELETE" }).catch(() => undefined));
  };

  /** Another tab of this app may have finished an answer: take the chat as it saved it. */
  const settledInStorage = (chat: string, jobId: string): boolean => {
    try {
      const stored = parseChats(JSON.parse(window.localStorage.getItem(CHATS_KEY) ?? "[]")).find((c) => c.id === chat);
      if (!stored || stored.messages.some((m) => m.pending?.id === jobId)) return false;
      settledJobs.current.add(jobId);
      stopWatching(jobId);
      dropLive(jobId);
      setChatsLocal(chatsRef.current.some((c) => c.id === chat) ? chatsRef.current.map((c) => (c.id === chat ? stored : c)) : [stored, ...chatsRef.current]);
      if (chatIdRef.current === chat) setMessages(stored.messages.map((m) => ({ id: nextId.current++, ...m })));
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Check on an answer the page isn't hearing live any more (the page was reloaded or closed, or
   * the connection dropped): its progress shows while it is written, and it takes its place when
   * it is done.
   */
  const watchJob = useCallback(
    (jobId: string, chat: string, at: number) => {
      if (watchers.current.has(jobId) || settledJobs.current.has(jobId)) return;
      watchers.current.set(jobId, null);
      let misses = 0;
      const again = (ms: number) => {
        if (watchers.current.has(jobId)) watchers.current.set(jobId, setTimeout(tick, ms));
      };
      const tick = async () => {
        if (!watchers.current.has(jobId) || settledJobs.current.has(jobId)) return;
        let res: Response;
        try {
          res = await fetch(`/api/ask/job?id=${encodeURIComponent(jobId)}`, { cache: "no-store" });
        } catch {
          return again(document.hidden ? 15_000 : 4000); // offline for now
        }
        if (res.status === 404) {
          if (settledInStorage(chat, jobId)) return;
          // Just asked, and not written down yet; or lost.
          if (++misses < 4 && Date.now() - at < 60_000) return again(2000);
          return failJob(jobId, chat, LOST_NOTICE);
        }
        if (!res.ok) return again(5000);
        const v = (await res.json().catch(() => null)) as { status?: string; steps?: string[]; text?: string; result?: AskResult } | null;
        if (!v) return again(5000);
        if (v.status === "running") {
          if (Date.now() - at > ANSWER_GIVE_UP_MS) return failJob(jobId, chat, LOST_NOTICE);
          setLiveJobs((prev) => ({ ...prev, [jobId]: { steps: v.steps ?? [], text: v.text ?? "", resumed: true } }));
          return again(document.hidden ? 6000 : 1200);
        }
        if (v.status === "done" && v.result) return finishJob(jobId, chat, v.result, { away: true });
        if (v.status === "stopped") return failJob(jobId, chat, "This answer was stopped. You can ask again.");
        return failJob(jobId, chat, LOST_NOTICE);
      };
      void tick();
    },
    // settledInStorage reads refs and setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [failJob, finishJob],
  );

  /** Ask for an answer and hear it live; if the connection drops, keep checking on it. */
  const streamJob = useCallback(
    async (jobId: string, chat: string, at: number, body: Record<string, unknown>) => {
      const ctrl = new AbortController();
      controllers.current.set(jobId, ctrl);
      setLiveJobs((prev) => ({ ...prev, [jobId]: { steps: [], text: "" } }));
      let streamed = false;
      const update = (change: (j: LiveJob) => LiveJob) =>
        setLiveJobs((prev) => (prev[jobId] && !settledJobs.current.has(jobId) ? { ...prev, [jobId]: change(prev[jobId]) } : prev));
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, stream: true, job: jobId, when: deviceWhen() }),
          signal: ctrl.signal,
        });
        // The passages it shows, and what is read aloud so far (the answer with its lines put in).
        const shown = new Map<string, LivePassage>();
        const marks: SourceMark[] = [];
        liveMarks.current.set(jobId, marks);
        const speech = () => liveText.current.get(jobId) ?? "";
        const speakSoFar = (soFar: string) => {
          liveText.current.set(jobId, soFar);
          const id = messagesRef.current.find((m) => m.pending?.id === jobId)?.id;
          if (id === undefined) return;
          // Read aloud as it is written: in Talk, and for a question asked out loud.
          if (talkJobs.current.has(jobId) && talkCurrent.current === jobId) talkRef.current?.answerText(`m${id}`, soFar);
          else if (spokenJobs.current.has(jobId) && canSpeak()) {
            let reading = liveSpoken.current.get(jobId);
            if (!reading && /[.!?;:]\s/.test(soFar)) {
              setSpeaking(`m${id}`);
              reading = speakLive(
                () => {
                  if (speakingRef.current === `m${id}`) setSpeaking(null);
                },
                (start, end) => followVoice(`m${id}`, start, end),
                { fast: true },
              );
              liveSpoken.current.set(jobId, reading);
            }
            reading?.update(soFar);
          }
        };
        const addMark = (mark: SourceMark) => {
          marks.push(mark);
          update((j) => ({ ...j, marks: [...marks] }));
        };
        const end = await readLive(res, {
          onStatus: (text) => update((j) => (j.steps[j.steps.length - 1] === text ? j : { ...j, steps: [...j.steps, text] })),
          onText: (delta) => {
            streamed = true;
            update((j) => ({ ...j, text: j.text + delta }));
            speakSoFar(speech() + delta);
          },
          onPassage: (passage) => {
            if (shown.has(passage.ref)) return;
            shown.set(passage.ref, passage);
            update((j) => ({ ...j, passages: [...(j.passages ?? []), passage] }));
          },
          onCite: (cite) => addMark({ ref: cite.ref, kind: "cite", quote: cite.quote, at: cite.at, sAt: speech().length }),
          onRead: (read) => {
            // The line is read aloud from the library's own words, where it comes in the answer.
            const p = shown.get(read.ref);
            const said = p ? readingText(p, readLinesInOriginal) : "";
            const before = speech();
            const sAt = before.length + 1;
            addMark({ ref: read.ref, kind: "read", at: read.at, sAt, sEnd: sAt + said.length });
            if (said) speakSoFar(`${before}\n${said}\n`);
          },
        });
        if (end && "result" in end) finishJob(jobId, chat, end.result, { streamed });
        else if (!end && !ctrl.signal.aborted) watchJob(jobId, chat, at); // cut off: the answer goes on
      } catch (err) {
        if (ctrl.signal.aborted) return;
        if (err instanceof AskRefused) return refuseJob(jobId, chat, err.message);
        watchJob(jobId, chat, at);
      } finally {
        controllers.current.delete(jobId);
      }
    },
    [finishJob, watchJob, refuseJob, setSpeaking, followVoice],
  );

  // When the app opens: pick up the answers that were still being written when it was last open.
  // A reload of this tab returns to the chat it had open; otherwise a chat waiting for an answer
  // opens by itself, so the person sees it arrive.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    const waiting = pendingAnswers(chatsRef.current);
    for (const w of waiting) watchJob(w.pending.id, w.chatId, w.pending.at);
    let reopen: string | null = null;
    try {
      reopen = window.sessionStorage.getItem(OPEN_CHAT_KEY);
    } catch {
      /* storage can be unavailable */
    }
    openChatRead.current = true;
    const chat =
      chatsRef.current.find((c) => c.id === reopen) ??
      (waiting.length && Date.now() - waiting[0].pending.at < ANSWER_GIVE_UP_MS ? chatsRef.current.find((c) => c.id === waiting[0].chatId) : undefined);
    if (chat) openChat(chat);
    // Runs once, after the saved chats are read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats]);

  // Coming back to the page: answers whose connection may have been dropped while it was away are
  // checked on (a phone often cuts a hidden page's connections), and the title is itself again.
  useEffect(() => {
    const onShow = () => {
      if (document.hidden) return;
      if (document.title !== baseTitle.current) document.title = baseTitle.current;
      for (const m of messagesRef.current) if (m.pending && !watchers.current.has(m.pending.id)) watchJob(m.pending.id, chatIdRef.current ?? "", m.pending.at);
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [watchJob]);

  /**
   * Ask a question. It is saved with its chat at once, with a place kept for the answer, which is
   * written whether or not the page stays open.
   *
   * @param opts.pictures Pictures from the box, sent with the question.
   * @param opts.fresh Start a new chat for it.
   * @param opts.base The conversation to ask in, when not the one on screen (Try again).
   */
  const send = useCallback(
    (
      question: string,
      opts: { deep?: boolean; spoken?: boolean; talk?: boolean; interrupted?: string; pictures?: Attached[]; fresh?: boolean; base?: ChatMessage[] } = {},
    ): boolean => {
      const q = question.trim();
      const pics = opts.pictures ?? [];
      if (!q && !pics.length) return false;
      const base = opts.fresh ? [] : (opts.base ?? messages);
      if (base.some((m) => m.pending)) return false; // this chat is still waiting for its answer
      dictation.cancel();
      stopSpeaking();
      setSpeaking(null);
      setComposerNote(null);

      // Earlier turns, with the most recent pictures sent again while this visit still has them.
      let room = PICTURE_LIMITS.inHistory;
      let size = pics.reduce((n, p) => n + p.full.data.length, 0);
      const history: Array<{ role: "user" | "assistant"; text: string; pictures?: QuestionPicture[] }> = [];
      const earlier = base.filter((m) => !m.pending).slice(-12);
      for (let i = earlier.length - 1; i >= 0; i--) {
        const m = earlier[i];
        if (m.role === "ai") {
          const t = historyAnswer(m.result);
          if (t.trim()) history.unshift({ role: "assistant", text: t });
          continue;
        }
        const count = m.pictures?.length ?? m.pictureCount ?? 0;
        let text = m.text?.trim() || (count ? questionForPictures(count) : "");
        const pictures: QuestionPicture[] = [];
        for (const p of m.pictures ?? []) {
          const full = sentPictures.current.get(p.src);
          if (!full || room <= 0 || size + full.data.length > PICTURE_LIMITS.totalChars * 0.95) continue;
          pictures.push(full);
          room--;
          size += full.data.length;
        }
        if (count > pictures.length) {
          text += `\n\n(${count === 1 ? "A picture was" : `${count} pictures were`} sent with this question${pictures.length ? "" : `; ${count === 1 ? "it isn't" : "they aren't"} available any more`}.)`;
        }
        if (text.trim() || pictures.length) history.unshift({ role: "user", text, ...(pictures.length ? { pictures } : {}) });
      }

      const jobId = newAnswerId();
      const at = Date.now();
      const chat = (!opts.fresh && chatIdRef.current) || `c${at.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      for (const p of pics) sentPictures.current.set(p.preview.src, p.full);
      const asked: ChatMessage = { id: nextId.current++, role: "user", text: q, ...(pics.length ? { pictures: pics.map((p) => p.preview) } : {}) };
      const placeholder: ChatMessage = { id: nextId.current++, role: "ai", pending: { id: jobId, at } };
      chatIdRef.current = chat;
      setChatId(chat);
      setMessages([...base, asked, placeholder]);
      scrollTarget.current = asked.id;
      setChatsOpen(false);
      setInput("");
      if (opts.pictures) setAttached([]);
      spokenInput.current = false;
      setMode("chat");
      notice({ kind: "question" });
      if (opts.talk) {
        talkJobs.current.add(jobId);
        talkCurrent.current = jobId;
      } else if (opts.spoken) spokenJobs.current.add(jobId);
      // The sources of the answer just before, so a short follow-up can go straight to them.
      const lastAnswer = [...base].reverse().find((m) => m.role === "ai" && m.result?.status === "answered")?.result;
      const lastRefs = lastAnswer
        ? [...new Set([...lastAnswer.sources.filter((x) => !x.article && !x.online).map((x) => x.ref), ...lastAnswer.retrieved])].slice(0, 12)
        : [];
      void streamJob(jobId, chat, at, {
        question: q,
        ...(pics.length ? { pictures: pics.map((p) => p.full) } : {}),
        history,
        growth,
        deep: opts.deep === true,
        profile: profileRef.current.remember ? profileRef.current : undefined,
        ...(chavrusaRef.current ? { chavrusa: chavrusaRef.current } : {}),
        ...(opts.talk ? { talking: true } : {}),
        ...(opts.talk && opts.interrupted ? { interrupted: opts.interrupted } : {}),
        ...(lastRefs.length ? { lastRefs } : {}),
      });
      return true;
    },
    [messages, growth, dictation, setSpeaking, notice, streamJob],
  );

  // Talk: what the person says is sent as their question, and the answer is read aloud.
  const talkSend = useCallback(
    (q: string, cutIn: string) => {
      // Said while the answer before is still being written (the person cut in): sent when it is done.
      if (messagesRef.current.some((m) => m.pending)) {
        queuedTalk.current = { q, cutIn };
        talkCurrent.current = null;
        return true;
      }
      return send(q, { talk: true, interrupted: cutIn });
    },
    [send],
  );
  useEffect(() => {
    const queued = queuedTalk.current;
    if (!queued || messages.some((m) => m.pending)) return;
    queuedTalk.current = null;
    if (!send(queued.q, { talk: true, interrupted: queued.cutIn })) talkRef.current?.answerFailed("That couldn't be sent just now. Tap to talk to try again.");
  }, [messages, send]);
  /** In Talk, the person went on talking while RabbAI thought: the question is taken back, to be sent again with more. */
  const talkRetract = () => {
    queuedTalk.current = null;
    const jobId = talkCurrent.current;
    talkCurrent.current = null;
    if (!jobId) return;
    talkJobs.current.delete(jobId);
    liveText.current.delete(jobId);
    liveMarks.current.delete(jobId);
    cancelJob(jobId);
    takeBack(jobId);
  };
  const talk = useTalk({ onSend: talkSend, onSpeaking: setSpeaking, onPiece: followVoice, onRetract: talkRetract });
  talkRef.current = talk;
  const setPaceOfTalk = talk.setPace;
  useEffect(() => setPaceOfTalk(talkPace), [talkPace, setPaceOfTalk]);
  const talkOn = talk.state.phase !== "off";
  /** Talk needs the browser to both listen and speak. */
  const talkOk = speechOk && dictation.supported;
  const pauseTalk = talk.pause;
  // Talk pauses when something covers the chat (the printed page, the reader on a phone, a dialog).
  const talkCovered =
    mode !== "chat" ||
    (chatsOpen && !(wide && !readerOpen)) ||
    !!dafRef ||
    (readerOpen && !wide) ||
    settingsOpen ||
    aboutOpen ||
    placeOpen ||
    shortcutsOpen ||
    !!chavrusaSetup;
  const talkLive = micOpen(talk.state.phase) || talk.state.phase === "speaking";
  useEffect(() => {
    if (talkCovered && talkLive) pauseTalk("Paused while something else was open. Tap to talk.");
  }, [talkCovered, talkLive, pauseTalk]);
  const startTalk = () => {
    warmUp("talk");
    if (listening) dictation.cancel();
    setComposerNote(null);
    talk.start();
  };
  const endTalk = () => {
    talk.end();
    if (wide) requestAnimationFrame(() => textareaRef.current?.focus());
  };

  /** Open "Learn with a chavrusa", with quick choices of what to learn. */
  const openChavrusaSetup = (initial?: Partial<ChavrusaSession>) => {
    const choices: ChavrusaChoice[] = [];
    const add = (c: ChavrusaChoice) => {
      if (c.text && !choices.some((x) => x.text === c.text)) choices.push(c);
    };
    if (daf) add({ text: daf.section, label: `This page: ${daf.section}` });
    if (readerOpen && reader?.section) {
      // Start at the line being read, when one is picked (or the line an answer opened).
      const line = [selected, reader.focus].find((r) => r?.startsWith(`${reader.section}:`));
      add({ text: reader.section, label: `What's open: ${reader.section}${line ? `, from ${line}` : ""}`, ...(line ? { at: line } : {}) });
    }
    const last = profile.remember ? profile.observed.learning[0] : undefined;
    if (last) add({ text: last.text, label: `Continue ${last.text}${last.at && last.at !== last.text ? ` (from ${last.at})` : ""}`, ...(last.at ? { at: last.at } : {}) });
    if (day?.daf?.ref) add({ text: day.daf.ref, label: `Today's Daf Yomi: ${day.daf.text}` });
    if (day?.parsha && !day.parsha.holiday) add({ text: `Parashat ${day.parsha.name}`, label: `This week's parsha: ${day.parsha.name}` });
    setChavrusaSetup({ initial: { style: last?.style ?? "guide", depth: "standard", ...initial }, choices });
  };

  /** How many lines the session's text has, for "line 4 of 28" (fetched once per text). */
  const [sessionLines, setSessionLines] = useState<{ text: string; n: number } | null>(null);
  const sessionText = chavrusa?.text;
  useEffect(() => {
    if (!sessionText || sessionLines?.text === sessionText) return;
    const ctrl = new AbortController();
    void fetch(`/api/text?ref=${encodeURIComponent(sessionText)}&count=1`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { section?: string; lines?: number } | null) => {
        if (j?.lines && j.section === sessionText) setSessionLines({ text: sessionText, n: j.lines });
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [sessionText, sessionLines?.text]);

  /** Start a chavrusa session in a new chat: RabbAI opens it the way the person chose. */
  const startChavrusa = (session: ChavrusaSession) => {
    warmUp("talk");
    setChavrusaSetup(null);
    if (dafRef) closeDaf();
    showChat(null, [], session);
    send(openingMessage(session), { fresh: true });
  };

  /** Stop the answer being written in this chat; the question goes back in the box. */
  const stopAnswer = () => {
    const placeholder = messages.find((m) => m.pending);
    if (!placeholder?.pending) return;
    const jobId = placeholder.pending.id;
    cancelJob(jobId);
    const q = takeBack(jobId);
    if (q) restoreToBox(q);
    setComposerNote("Stopped. Your question is back in the box, to change or ask again.");
    textareaRef.current?.focus();
  };

  /** Ask a question again, in place of an answer that didn't come. */
  const retry = (answer: ChatMessage) => {
    if (pending) return;
    const i = messages.indexOf(answer);
    const q = i > 0 && messages[i - 1].role === "user" ? messages[i - 1] : null;
    if (!q) return;
    const rest = messages.filter((_, k) => k !== i && k !== i - 1);
    const pictures = (q.pictures ?? []).flatMap((p, n) => {
      const full = sentPictures.current.get(p.src);
      return full ? [{ key: `t${Date.now()}${n}`, full, preview: p }] : [];
    });
    send(q.text ?? "", { base: rest, pictures });
  };

  // ---- the box: words, the microphone and pictures ----
  const addPictures = async (files: File[]) => {
    const room = PICTURE_LIMITS.perQuestion - attached.length - preparing;
    const chosen = files.filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(f.name));
    if (!chosen.length) {
      if (files.length) setComposerNote("That file isn't a picture. Please choose a photo or a screenshot.");
      return;
    }
    if (room <= 0) {
      setComposerNote(`You can send up to ${PICTURE_LIMITS.perQuestion} pictures with one question.`);
      return;
    }
    if (chosen.length > room) setComposerNote(`Only ${PICTURE_LIMITS.perQuestion} pictures fit with one question, so the first ${room} ${room === 1 ? "was" : "were"} added.`);
    else setComposerNote(null);
    const take = chosen.slice(0, room);
    setPreparing((n) => n + take.length);
    for (const file of take) {
      try {
        const ready = await preparePicture(file);
        setAttached((prev) => (prev.length < PICTURE_LIMITS.perQuestion ? [...prev, { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...ready, file }] : prev));
      } catch (err) {
        setComposerNote(err instanceof Error ? err.message : "That picture couldn't be added.");
      } finally {
        setPreparing((n) => Math.max(0, n - 1));
      }
    }
  };

  const submitBox = async () => {
    if (pending || preparing || fitting) return;
    let pictures = attached;
    if (pictures.length > 1) {
      setFitting(true);
      try {
        pictures = await fitPictures(pictures);
      } catch {
        setComposerNote("Those pictures are too large together. Please send fewer at a time.");
        return;
      } finally {
        setFitting(false);
      }
    }
    send(input, { spoken: spokenInput.current, pictures });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitBox();
  };
  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submitBox();
      return;
    }
    // In an empty box, the up arrow brings back your last question, to change and send again.
    if (e.key === "ArrowUp" && !input && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const last = [...messages].reverse().find((m) => m.role === "user" && m.text);
      if (!last?.text) return;
      e.preventDefault();
      setInput(last.text);
      const el = e.currentTarget;
      requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
    }
  };
  const onComposerChange = (value: string) => {
    // Typing takes over from the microphone.
    if (listening) dictation.cancel();
    spokenInput.current = false;
    if (composerNote) setComposerNote(null);
    setInput(value);
  };
  const toggleMic = () => {
    if (listening) {
      dictation.stop();
      return;
    }
    unlockSpeech();
    stopSpeaking();
    setSpeaking(null);
    dictation.start(input);
  };

  // Let the composer grow with the question.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ---- the reader ----
  const openReader = useCallback(
    async (ref: string) => {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setReaderOpen(true);
      setReaderRef(ref);
      setBarHidden(false);
      setReaderMenu(null);
      setSelected(null);
      setWordCard(null);
      setTryRef(null);
      setLineQuestion("");
      setReaderError(null);
      if (reader && reader.lines.some((l) => l.ref === ref || l.commentaries.some((c) => c.ref === ref))) {
        setReader({ ...reader, focus: ref });
        return;
      }
      setReaderLoading(true);
      try {
        const res = await fetch(`/api/text?ref=${encodeURIComponent(ref)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "That text isn't available.");
        setReader(json as ReaderData);
        setLineAnswers({});
      } catch (err) {
        setReader(null);
        setReaderError(err instanceof Error ? err.message : "That text isn't available.");
      } finally {
        setReaderLoading(false);
      }
    },
    [reader],
  );

  const closeReader = useCallback(() => {
    setReaderOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  const closeCard = useCallback(() => {
    setSelected(null);
    setWordCard(null);
    setBarHidden(false);
    setTryRef(null);
  }, []);

  useEffect(() => {
    if (!readerOpen || dafRef) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (readerMenu) setReaderMenu(null);
      else if (wordCard || selected) closeCard();
      else closeReader();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readerOpen, dafRef, closeReader, closeCard, wordCard, selected, readerMenu]);

  // Scroll the cited line into view and move focus into the sheet on phones.
  useEffect(() => {
    if (!reader?.focus || readerLoading) return;
    const el = readerBodyRef.current?.querySelector<HTMLElement>(`[data-ref="${CSS.escape(reader.focus)}"]`);
    autoScrollUntil.current = Date.now() + 1200;
    setBarHidden(false);
    el?.scrollIntoView({ block: "center", behavior: smoothOrNot() });
    if (window.matchMedia("(max-width: 979px)").matches) closeRef.current?.focus();
  }, [reader, readerLoading]);

  // On a computer the card opens beside what was tapped: below it, or above it when there is more
  // room there, inside the reader. On a phone it is a sheet at the bottom (no position needed).
  const placeCard = useCallback(() => {
    const body = readerBodyRef.current;
    if (!wide || !selected || !body) return setCardPos(undefined);
    const anchor =
      (wordCard && body.querySelector<HTMLElement>(".w-tap.on")) || body.querySelector<HTMLElement>(`[data-ref="${CSS.escape(selected)}"]`);
    if (!anchor) return setCardPos(undefined);
    const r = anchor.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    const width = Math.min(380, b.width - 24);
    const left = Math.max(b.left + 12, Math.min(r.left + r.width / 2 - width / 2, b.right - 12 - width));
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    setCardPos(
      below >= 340 || below >= above
        ? { top: r.bottom + 8, left, width, maxHeight: Math.max(220, below) }
        : { bottom: window.innerHeight - r.top + 8, left, width, maxHeight: Math.max(220, above) },
    );
  }, [wide, selected, wordCard]);

  useLayoutEffect(() => {
    placeCard();
  }, [placeCard, reader, lang]);

  useEffect(() => {
    if (!wide || !selected) return;
    const scrollers = [readerBodyRef.current, paneHeRef.current, paneEnRef.current].filter((el): el is HTMLDivElement => !!el);
    scrollers.forEach((el) => el.addEventListener("scroll", placeCard, { passive: true }));
    window.addEventListener("resize", placeCard);
    return () => {
      scrollers.forEach((el) => el.removeEventListener("scroll", placeCard));
      window.removeEventListener("resize", placeCard);
    };
  }, [wide, selected, placeCard, splitOn]);

  // On a phone, keep what was tapped in view above the sheet: in the top part of the reader.
  useEffect(() => {
    const body = readerBodyRef.current;
    if (wide || !selected || !body) return;
    const anchor =
      (wordCard && body.querySelector<HTMLElement>(".w-tap.on")) || body.querySelector<HTMLElement>(`[data-ref="${CSS.escape(selected)}"]`);
    if (!anchor) return;
    keepAboveSheet(body, anchor, barHidden ? 0 : headHeight);
    // Only when something new is tapped, not when the bar moves.
  }, [wide, selected, wordCard]);

  // The bar's height, so the text starts below it on a phone (where the bar floats over the text).
  useEffect(() => {
    const head = readerHeadRef.current;
    if (!head || !readerOpen) return;
    const measure = () => setHeadHeight(head.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, [readerOpen, readerRef]);

  // On a phone, reading down slides the bar away; scrolling up, or reaching the top, brings it back.
  useEffect(() => {
    const body = readerBodyRef.current;
    if (wide || !readerOpen || !body) return;
    let last = body.scrollTop;
    const onScroll = () => {
      const y = body.scrollTop;
      if (Date.now() < autoScrollUntil.current) {
        last = y;
        return;
      }
      if (y < 40 || last - y > 6) setBarHidden(false);
      else if (y - last > 6) setBarHidden(true);
      last = y;
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    return () => body.removeEventListener("scroll", onScroll);
  }, [wide, readerOpen, readerRef]);

  // Bring a line's answer into view when it starts and when it arrives (when it shows under the line).
  useEffect(() => {
    if (selected || !reader) return;
    const ref = Object.keys(lineAnswers).find((r) => lineAnswers[r]?.loading);
    if (!ref) return;
    const el = readerBodyRef.current?.querySelector<HTMLElement>(`[data-answer-for="${CSS.escape(ref)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: smoothOrNot() });
  }, [lineAnswers, selected, reader]);

  const chooseLang = (l: Lang) => {
    setLang(l);
    store("rabai_lang", l);
    chooseSplit(false);
  };

  const chooseSplit = (on: boolean) => {
    setSplit(on);
    store("rabai_split", on ? "on" : "off");
  };

  const toggleInline = (name: string) => {
    setInlineComms((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      store("rabai_inline_comms", JSON.stringify(next));
      return next;
    });
  };

  /** Opens the card on the comments of a line. */
  const openComments = (ref: string) => {
    setSelected(ref);
    setWordCard(null);
    setCardTab("commentary");
  };

  /** The book's table of contents, fetched once per book. */
  const openContents = () => setReaderMenu(readerMenu === "contents" ? null : "contents");

  const dismissHint = () => {
    setReaderHint(false);
    store("rabai_reader_hint", "seen");
  };

  const askLine = useCallback(
    async (ref: string, action: LineAction | "ask", question = "", word?: string) => {
      setSelected(ref);
      setCardTab("ask");
      setLineAnswers((prev) => ({ ...prev, [ref]: { action, loading: true } }));
      const update = (change: (a: LineAnswer) => LineAnswer) =>
        setLineAnswers((prev) => (prev[ref]?.loading ? { ...prev, [ref]: change(prev[ref]) } : prev));
      try {
        const body =
          action === "ask"
            ? { question, focusRef: ref, growth, profile: profileRef.current.remember ? profileRef.current : undefined }
            : { question, action, focusRef: ref, word, growth, profile: profileRef.current.remember ? profileRef.current : undefined };
        const result = await postAsk(body, {
          onStatus: (status) => update((a) => ({ ...a, status })),
          onText: (delta) => update((a) => ({ ...a, live: (a.live ?? "") + delta })),
        });
        setLineAnswers((prev) => ({ ...prev, [ref]: { action, loading: false, result } }));
      } catch (err) {
        setLineAnswers((prev) => ({
          ...prev,
          [ref]: { action, loading: false, error: err instanceof Error ? err.message : "Something went wrong." },
        }));
      }
    },
    [growth, notice],
  );

  // ---- my words ----
  const persistWords = (words: SavedWord[]) => {
    setMyWords(words);
    store(WORDS_KEY, JSON.stringify(words.slice(0, MAX_SAVED_WORDS)));
  };
  const isSaved = (form: string) => myWords.some((w) => w.form === form);
  const saveWord = (w: Omit<SavedWord, "savedAt">) => {
    if (isSaved(w.form)) return;
    persistWords([{ ...w, savedAt: Date.now() }, ...myWords]);
  };
  const removeWord = (form: string) => persistWords(myWords.filter((w) => w.form !== form));

  // ---- learn ----
  useEffect(() => {
    // The library list serves Learn, and the Daven tab finds its siddurs in it.
    if (mode === "chat" || sections) return;
    fetch("/api/library")
      .then((r) => r.json())
      .then((j: { sections: SectionSummary[]; phrases?: PhraseInfo[]; articleShelves?: ArticleShelf[] }) => {
        setSections(j.sections);
        setGlossary(j.phrases ?? []);
        setArticleShelves(j.articleShelves ?? []);
      })
      .catch(() => setSections([]));
  }, [mode, sections]);

  // ---- highlight any text and ask about it ----
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return setHighlight(null);
      const text = sel.toString().replace(/\s+/g, " ").trim();
      if (text.length < 2 || text.length > 800) return setHighlight(null);
      const range = sel.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
      const zone = el?.closest("[data-askable]");
      if (!zone || el?.closest("textarea, input")) return setHighlight(null);
      const start = range.startContainer;
      const startEl = start.nodeType === Node.ELEMENT_NODE ? (start as Element) : start.parentElement;
      const ref =
        startEl?.closest("[data-answer-for]")?.getAttribute("data-answer-for") ??
        startEl?.closest("[data-ref]")?.getAttribute("data-ref") ??
        undefined;
      const rect = range.getBoundingClientRect();
      // Nothing to point at when the highlighted words have scrolled out of sight.
      if ((!rect.width && !rect.height) || rect.bottom < 0 || rect.top > window.innerHeight) return setHighlight(null);
      setHighlight({
        text,
        // Below the highlight, where the phone's own copy menu doesn't cover it.
        top: Math.max(8, Math.min(rect.bottom + 10, window.innerHeight - 64)),
        left: Math.max(8, Math.min(rect.left + rect.width / 2 - 85, window.innerWidth - 178)),
        where: zone.getAttribute("data-askable") === "reader" ? "reader" : "chat",
        ref,
      });
    };
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(check, 250);
    };
    document.addEventListener("selectionchange", soon);
    document.addEventListener("scroll", soon, true);
    window.addEventListener("resize", soon);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", soon);
      document.removeEventListener("scroll", soon, true);
      window.removeEventListener("resize", soon);
    };
  }, []);

  const askAboutHighlight = () => {
    if (!highlight) return;
    const quote = highlight.text.length > 500 ? `${highlight.text.slice(0, 500)}…` : highlight.text;
    window.getSelection()?.removeAllRanges();
    setHighlight(null);
    if (highlight.where === "reader" && highlight.ref) {
      void askLine(highlight.ref, "ask", `What does this part mean: “${quote}”?`);
    } else {
      const q = `Can you explain this part: “${quote}”?`;
      if (pending) {
        setInput(q);
        setComposerNote("Your question is in the box. Ask it when this answer is done.");
      } else void send(q);
    }
  };

  // Escape closes the settings menu. While it is open, the device's voices are listed (some
  // browsers load them a moment later).
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const synth = canSpeak() ? window.speechSynthesis : null;
    const loadVoices = () => setVoiceList(englishVoices());
    loadVoices();
    void ownVoices().then(setOwnVoiceList);
    synth?.addEventListener?.("voiceschanged", loadVoices);
    return () => {
      document.removeEventListener("keydown", onKey);
      synth?.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, [settingsOpen]);

  const toggleGrowth = (on: boolean) => {
    setGrowth(on);
    store("rabai_growth", on ? "on" : "off");
  };

  // ---- what RabbAI knows about the person (lib/learner-profile.ts) ----
  const keepProfile = useCallback((next: LearnerProfile) => {
    if (next === profileRef.current) return;
    const rememberChanged = next.remember !== profileRef.current.remember;
    profileRef.current = next;
    setProfile(next);
    store(PROFILE_KEY, JSON.stringify(next));
    if (rememberChanged) accountRef.current?.rememberChanged();
    else accountRef.current?.profileChanged();
  }, []);

  // ---------------------------------------------------------------------------

  // Look up a tapped word in the library's dictionaries. No AI: RabbAI explains a word only
  // when the person taps "Ask RabbAI".
  useEffect(() => {
    if (!wordCard || !reader) return;
    const line = reader.lines.find((l) => l.ref === wordCard.ref) ?? reader.lines.flatMap((l) => l.commentaries).find((c) => c.ref === wordCard.ref);
    const token = line?.tokens[wordCard.index];
    const w = token ? bareWord(token.text) : "";
    if (!w || wordInfo[w]) return;
    notice({ kind: "word", word: w });
    setWordInfo((prev) => ({ ...prev, [w]: { loading: true } }));
    fetch(`/api/word?w=${encodeURIComponent(w)}`)
      .then((r) => r.json())
      .then((j: { available?: boolean; entries?: WordEntry[]; error?: string; abbreviation?: WordLookup["abbreviation"] }) =>
        setWordInfo((prev) => ({
          ...prev,
          [w]: j.error ? { loading: false, error: j.error } : { loading: false, available: j.available, entries: j.entries ?? [], abbreviation: j.abbreviation },
        })),
      )
      .catch(() => setWordInfo((prev) => ({ ...prev, [w]: { loading: false, error: "The dictionaries couldn't be reached just now." } })));
  }, [wordCard, reader, wordInfo]);

  /** Tapping a word opens the card on its meaning; tapping it again closes the card. */
  const tapWord = (ref: string, index: number) => {
    if (wordCard?.ref === ref && wordCard.index === index) return closeCard();
    setCardTab((t) => (selected === ref && t !== "meaning" ? t : "meaning"));
    setSelected(ref);
    setWordCard({ ref, index });
    setTryRef(null);
  };

  /** Tapping a line (not a word) opens the card for the whole line, on what can be asked. */
  const tapLine = (ref: string) => {
    if (selected === ref && !wordCard) return closeCard();
    setCardTab((t) => (selected === ref && t !== "meaning" ? t : "ask"));
    setSelected(ref);
    setWordCard(null);
    setLineQuestion("");
  };

  /** A line of the open text and, for a comment, the line it explains. */
  const readerItem = (ref: string) => {
    if (!reader) return null;
    for (const line of reader.lines) {
      if (line.ref === ref) return { p: line as Passage & { tokens: Token[] }, line, comment: null as ReaderCommentary | null };
      const comment = line.commentaries.find((c) => c.ref === ref);
      if (comment) return { p: comment as Passage & { tokens: Token[] }, line, comment };
    }
    return null;
  };

  /** The next or previous word of the same line, skipping marks that aren't words. */
  const stepReaderWord = (dir: 1 | -1) => {
    if (!wordCard) return;
    const item = readerItem(wordCard.ref);
    if (!item) return;
    let i = wordCard.index + dir;
    while (i >= 0 && i < item.p.tokens.length && bareWord(item.p.tokens[i].text) === "") i += dir;
    if (i >= 0 && i < item.p.tokens.length) setWordCard({ ref: wordCard.ref, index: i });
  };

  const renderBreakdown = (first: WordEntry) => (
    <>
      {(first.found.prefix.length > 0 || first.found.suffix || first.found.guess) && (
        <p className="breakdown">
          <span className="label-inline">How it breaks down:</span>{" "}
          {first.found.prefix.map(([letter, meaning]) => (
            <span key={letter} className="part">
              <span className="he" lang="he">
                {letter}
              </span>{" "}
              “{meaning}” +{" "}
            </span>
          ))}
          <span className="he" lang="he">
            {first.found.form}
          </span>
          {first.found.suffix && (
            <>
              {" "}
              with the ending{" "}
              <span className="he" lang="he">
                {first.found.suffix}
              </span>
              {first.found.suffixMeaning ? `, ${first.found.suffixMeaning}` : ""}
            </>
          )}
          .
        </p>
      )}
      {first.found.guess && (
        <p className="breakdown-guess">
          Probably a form of{" "}
          <span className="he" lang="he">
            {first.found.form}
          </span>
          : {first.found.guess.join("; ")}.
        </p>
      )}
    </>
  );

  const renderLineAnswer = (ref: string, onOpen: (r: string) => void = (r) => void openReader(r)) => {
    const answer = lineAnswers[ref];
    if (!answer) return null;
    const p = { ref };
    return (
      <div className="answer" aria-live="polite" data-answer-for={p.ref}>
        <div className="mark" aria-hidden="true">
          ר
        </div>
        <div>
          {answer.loading && answer.live ? (
            <LiveText text={answer.live} />
          ) : answer.loading ? (
            <p className="thinking">
              {answer.status ?? (answer.action === "check" ? "RabbAI is reading your translation" : "RabbAI is looking at this line")}
              <span className="dots" />
            </p>
          ) : answer.error ? (
            <p>{answer.error}</p>
          ) : answer.result ? (
            <>
              {answer.result.safety && <SafetyCard result={answer.result} />}
              {answer.result.blocks.length > 0 ? (
                <AnswerBody blocks={answer.result.blocks} card={answer.result.card} onOpen={onOpen} />
              ) : (
                <p>{answer.result.notice}</p>
              )}
              {speechOk && answer.result.status === "answered" && (
                <div className="follow tight">
                  <button
                    type="button"
                    className="chip-btn listen"
                    aria-pressed={speakingId === `l${p.ref}`}
                    onClick={() => listen(`l${p.ref}`, spokenAnswer(answer.result))}
                  >
                    <SpeakerIcon /> {speakingId === `l${p.ref}` ? "Stop" : "Listen"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  };

  /**
   * The Translation tab: the library's English with its translator, or, when the library has none,
   * RabbAI's own translation (made only when the person taps, and always labeled), and its word by
   * word under the library's words.
   */
  // A tapped line or comment, and the Rashi and Tosafot on it: load their kept translations so
  // each comment can show its English right under the Hebrew.
  const dafPickRef = dafPick?.ref;
  const dafPickPart = dafPick?.part;
  useEffect(() => {
    if (!dafPickRef || !daf) return;
    const refs = [dafPickRef];
    if (dafPickPart === "main") refs.push(...[...daf.rashi, ...daf.tosafot].filter((c) => c.on === dafPickRef).map((c) => c.ref));
    void loadKept(refs);
  }, [dafPickRef, dafPickPart, daf, loadKept]);
  useEffect(() => {
    if (!reader || !selected) return;
    const item = readerItem(selected);
    if (!item) return;
    void loadKept([item.p.ref, ...(item.line?.commentaries ?? []).map((c) => c.ref)]);
    // readerItem reads the reader, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reader, selected, loadKept]);

  /** Under a comment's Hebrew: its English from the library, or RabbAI's kept translation, or a button to make one. */
  const commentEnglish = (ref: string, en: string | undefined, context: string[]) => {
    if (en) return <p className="wc-piece-en">{en}</p>;
    const tr = translations[ref];
    if (tr?.result?.general)
      return (
        <div className="wc-piece-tr">
          <p className="wc-piece-en">{tr.result.general}</p>
          <p className="fine-left">RabbAI’s translation. Not from the library, and not yet reviewed by the rabbinic board.</p>
        </div>
      );
    return (
      <div className="follow">
        <button type="button" className="chip-btn" disabled={tr?.loading} onClick={() => void translate(ref, context, false)}>
          {tr?.loading ? "Translating…" : "Translate"}
        </button>
        {tr?.error && <span className="fine-left">{tr.error}</span>}
      </div>
    );
  };

  const renderTranslation = (o: {
    ref: string;
    en: string;
    by?: string;
    context: string[];
    active?: number;
    partName: string;
    onSource: (r: string) => void;
    /** The Hebrew, word by word, shown first with the translation directly under it. */
    heWords?: string[];
  }) => {
    const tr = translations[o.ref];
    const showWords = !!wordByWord[o.ref];
    return (
      <>
        {o.heWords && o.heWords.length > 0 && !(showWords && tr?.result?.words) && (
          <Folded className="tr-he" lines={6} lang="he">
            {o.heWords.map((w, i) => (
              <span key={i} className={i === o.active ? "tr-he-on" : undefined}>
                {i > 0 && " "}
                {w}
              </span>
            ))}
          </Folded>
        )}
        {o.en ? (
          <>
            <Folded className="tr-en" lines={8}>
              {o.en}
            </Folded>
            {o.by && <p className="fine-left">Translation: {o.by}.</p>}
          </>
        ) : !tr?.result?.general ? (
          <div className="tr-offer">
            <p className="muted">No English translation of this {o.partName} is in the library yet.</p>
            <button type="button" className="chip-btn primary" disabled={tr?.loading} onClick={() => void translate(o.ref, o.context, false)}>
              {tr?.loading ? "Translating…" : `Translate this ${o.partName}`}
            </button>
            {tr?.loading && <p className="fine-left">This can take up to half a minute.</p>}
          </div>
        ) : null}
        {tr?.error && <p className="daf-alert tr-alert">{tr.error}</p>}
        {(tr?.result?.general || (showWords && tr?.result)) && (
          <div className="rabai-tr">
            <p className="rabai-tr-label">
              <strong>RabbAI’s translation.</strong> Not from the library, and not yet reviewed by the rabbinic board.
            </p>
            {tr.result.general && !o.en && <p className="daf-panel-en">{tr.result.general}</p>}
            {showWords &&
              (tr.result.words === undefined ? (
                tr.loading && (
                  <p className="muted">
                    Translating word by word<span className="dots" />
                  </p>
                )
              ) : tr.result.words ? (
                <Interlinear rows={tr.result.words} active={o.active ?? -1} />
              ) : (
                <p className="muted">RabbAI’s word-by-word list didn’t line up with the library’s words, so it isn’t shown.</p>
              ))}
            {tr.result.readings && tr.result.readings.length > 0 && (
              <div className="tr-readings">
                <p className="label-sm">Other readings</p>
                <ul>
                  {tr.result.readings.map((r, i) => (
                    <li key={i}>
                      <span className="he" lang="he">
                        {r.phrase}
                      </span>
                      : {r.reading}{" "}
                      <button type="button" className="link tr-source" onClick={() => o.onSource(r.ref)}>
                        {r.ref}
                      </button>{" "}
                      <span className="he tr-quote" lang="he">
                        “{r.quote}”
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tr.result.basis && tr.result.basis.length > 0 && (
              <p className="tr-basis">Made from: {[...new Set(tr.result.basis.map((b) => b.label))].join("; ")}.</p>
            )}
          </div>
        )}
        {(o.en || tr?.result) && (
          <div className="follow tr-tools">
            <button
              type="button"
              className="chip-btn"
              aria-pressed={showWords && !!tr?.result}
              disabled={tr?.loading}
              onClick={() =>
                showWords && tr?.result ? setWordByWord((prev) => ({ ...prev, [o.ref]: false })) : void translate(o.ref, o.context, true)
              }
            >
              {tr?.loading ? "Translating…" : showWords && tr?.result ? "Hide word by word" : "Word by word"}
            </button>
          </div>
        )}
      </>
    );
  };

  /** What the dictionaries say about a tapped word, from the library only. */
  const renderMeaning = (word: string, onAsk: () => void, teamNotes: ReactNode = null) => {
    const lookup = wordInfo[word];
    const entries = lookup?.entries ?? [];
    const hasNotes = !!teamNotes;
    return (
      <>
        {teamNotes}
        {lookup?.loading && (
          <p className="muted">
            Looking it up in the dictionaries<span className="dots" />
          </p>
        )}
        {lookup?.error && <p className="muted">{lookup.error}</p>}
        {lookup?.abbreviation && !lookup.loading && <p className="muted">{shortFormNote(lookup.abbreviation)}</p>}
        {!lookup && /\s/.test(word) && <p className="muted">This stands for several words. RabbAI can explain it.</p>}
        <DictRows entries={entries} />
        {lookup && !lookup.loading && !lookup.error && !lookup.abbreviation && entries.length === 0 && !hasNotes && (
          <p className="muted">
            {lookup.available === false ? "This build has no dictionaries yet." : "None of the library’s dictionaries has this word yet."} RabbAI can
            explain it.
          </p>
        )}
        {lookup && !lookup.loading && (lookup.abbreviation || entries.length === 0) && (
          <div className="follow">
            <button type="button" className="chip-btn primary" onClick={onAsk}>
              Ask RabbAI about this word
            </button>
          </div>
        )}
      </>
    );
  };

  /** "Save to My words", for the word in the card. */
  const saveButton = (form: string, word: Omit<SavedWord, "savedAt" | "form">) => {
    const saved = isSaved(form);
    return (
      <button type="button" className="chip-btn quiet" aria-pressed={saved} onClick={() => (saved ? removeWord(form) : saveWord({ form, ...word }))}>
        {saved ? "Saved to My words ✓" : "☆ Save to My words"}
      </button>
    );
  };

  /** The card for a word or a line in the reader. */
  const renderReaderCard = () => {
    if (!reader || !selected) return null;
    const item = readerItem(selected);
    if (!item) return null;
    const { p, line, comment } = item;
    const token = wordCard && wordCard.ref === p.ref ? p.tokens[wordCard.index] : undefined;
    const word = token ? bareWord(token.text) : "";
    const root = token?.root ? reader.wordStudy.roots[token.root] : undefined;
    const phrase = token?.phrase ? reader.wordStudy.phrases[token.phrase] : undefined;
    const elsewhere = [...new Set([...(root?.occurrences ?? []), ...(phrase?.occurrences ?? [])])].filter((r) => r !== p.ref);
    // A word inside a Gemara phrase is studied as the whole phrase, unless the word has its own root.
    const heading = phrase && !root ? phrase.phrase : word;
    const gloss = token?.gloss ?? (phrase && !root ? phrase.meaning : undefined);
    const lookup = word ? wordInfo[word] : undefined;
    const first = lookup?.entries?.[0];
    const answer = lineAnswers[p.ref];
    const partName = comment ? "comment" : "line";
    const at = reader.lines.findIndex((l) => l.ref === line.ref);
    const context = comment ? [line.ref] : at > 0 ? [reader.lines[at - 1].ref] : [];
    const askWord = () => void askLine(p.ref, "word", "", heading);
    const tabs: CardTabInfo[] = [
      ...(token ? [{ id: "meaning" as const, label: "Meaning" }] : []),
      { id: "translation", label: "Translation" },
      ...(comment
        ? [{ id: "commentary" as const, label: "The line" }]
        : line.commentaries.length
          ? [{ id: "commentary" as const, label: "Commentary", count: line.commentaries.length }]
          : []),
      { id: "ask", label: "Ask" },
    ];
    const tab = tabs.some((t) => t.id === cardTab) ? cardTab : tabs[0].id;
    const teamNotes =
      token && (token.parts || root || phrase) ? (
        <div className="team-notes">
          {token.parts && <p className="parts">{token.parts}</p>}
          {root && (
            <p>
              Root{" "}
              <span className="he" lang="he">
                {root.root}
              </span>
              : {root.meaning}.{root.note ? ` ${root.note}` : ""}
            </p>
          )}
          {phrase &&
            (root ? (
              <p>
                Part of the phrase{" "}
                <span className="he" lang="he">
                  {phrase.phrase}
                </span>
                , “{phrase.meaning}”. {phrase.role}
              </p>
            ) : (
              <p>{phrase.role}</p>
            ))}
          {elsewhere.length > 0 && (
            <>
              <p className="label-sm">{root ? "This root also appears in" : "This phrase also appears in"}</p>
              <div className="follow tight">
                {elsewhere.map((r) => (
                  <button key={r} type="button" className="cite" onClick={() => void openReader(r)} title={r}>
                    {shortRef(r)}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="fine-left">Notes not marked with a dictionary are written by the RabbAI team for testing.</p>
        </div>
      ) : null;
    return (
      <WordCard
        variant={wide ? "popover" : "sheet"}
        style={wide ? cardPos : undefined}
        ariaLabel={token ? `About ${heading}` : `About ${p.ref}`}
        label={
          <>
            <span>{comment ? (comment.author ?? comment.label) : p.label}</span>{" "}
            <span className="he" lang="he">
              {p.labelHe}
            </span>
          </>
        }
        word={token ? heading : undefined}
        wordNote={gloss ? <span className="gloss">{gloss}</span> : undefined}
        breakdown={first && !lookup?.abbreviation ? renderBreakdown(first) : undefined}
        tabs={tabs}
        tab={tab}
        onTab={setCardTab}
        onNext={token ? () => stepReaderWord(1) : undefined}
        onPrev={token ? () => stepReaderWord(-1) : undefined}
        onClose={closeCard}
      >
        {tab === "meaning" && token && (
          <>
            {renderMeaning(word, askWord, teamNotes)}
            <div className="follow">
              {saveButton(heading, {
                gloss: gloss ?? (first ? `${first.text.slice(0, 90).replace(/\s+\S*$/, "")} … (${first.dictionary})` : undefined),
                root: root?.root,
                rootMeaning: root?.meaning,
                ref: p.ref,
              })}
            </div>
          </>
        )}
        {tab === "translation" &&
          renderTranslation({
            ref: p.ref,
            en: p.en,
            by: comment ? comment.translation?.by : reader.work.translation.by,
            context,
            active: token ? wordCard?.index : undefined,
            partName,
            onSource: (r) => void openReader(r),
            heWords: p.tokens.length ? p.tokens.map((t) => t.text) : pieceWords(p.he ?? ""),
          })}
        {tab === "commentary" &&
          (comment ? (
            <div className="wc-pieces">
              <div className="wc-piece">
                <p className="he wc-piece-he" lang="he">
                  {line.he}
                </p>
                {line.en && (
                  <Folded className="wc-piece-en" lines={4}>
                    {line.en}
                  </Folded>
                )}
                <button type="button" className="link" onClick={() => tapLine(line.ref)}>
                  Ask about this line
                </button>
              </div>
            </div>
          ) : (
            <div className="wc-pieces">
              {line.commentaries.map((c) => (
                <details key={c.ref} className="wc-piece" open={line.commentaries.length <= 2 || undefined}>
                  <summary>
                    <strong>{c.author ?? c.label}</strong>{" "}
                    <span className="he" lang="he">
                      {pieceWords(c.he).slice(0, 8).join(" ")}
                      {pieceWords(c.he).length > 8 ? " …" : ""}
                    </span>
                  </summary>
                  <p className="he wc-piece-he" lang="he">
                    {c.he}
                  </p>
                  {commentEnglish(c.ref, c.en, [line.ref])}
                  <button type="button" className="link" onClick={() => tapLine(c.ref)}>
                    Open this comment
                  </button>
                </details>
              ))}
            </div>
          ))}
        {tab === "ask" && (
          <>
            <div className="wc-asks" role="group" aria-label={`Ask about ${p.ref}`}>
              {token && (
                <button type="button" disabled={answer?.loading} onClick={askWord}>
                  {heading === word ? "Ask RabbAI about this word" : "Ask RabbAI about this phrase"}
                </button>
              )}
              {ACTIONS.map((a) => (
                <button key={a.id} type="button" aria-pressed={answer?.action === a.id} disabled={answer?.loading} onClick={() => void askLine(p.ref, a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="link"
              aria-pressed={tryRef === p.ref}
              disabled={answer?.loading}
              onClick={() => {
                setTryRef(tryRef === p.ref ? null : p.ref);
                setTryText("");
              }}
            >
              {tryRef === p.ref ? "Ask a question instead" : "Let me try translating"}
            </button>
            {tryRef === p.ref ? (
              <form
                className="try-line"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!tryText.trim()) return;
                  void askLine(p.ref, "check", tryText.trim());
                  setTryRef(null);
                }}
              >
                <label htmlFor={`try-${p.ref}`}>Write the {partName} in your own words. Try it without looking at the English.</label>
                <textarea id={`try-${p.ref}`} value={tryText} onChange={(e) => setTryText(e.target.value)} rows={3} maxLength={2000} placeholder="My translation…" />
                <button type="submit" disabled={!tryText.trim()}>
                  Check my translation
                </button>
              </form>
            ) : (
              <form
                className="ask-line"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (lineQuestion.trim()) void askLine(p.ref, "ask", lineQuestion.trim());
                }}
              >
                <label className="sr-only" htmlFor={`ask-${p.ref}`}>
                  Your own question about {p.ref}
                </label>
                <input
                  id={`ask-${p.ref}`}
                  value={lineQuestion}
                  onChange={(e) => setLineQuestion(e.target.value)}
                  placeholder={`Ask about this ${partName}…`}
                  maxLength={2000}
                />
                <button type="submit" disabled={!lineQuestion.trim() || answer?.loading}>
                  Ask
                </button>
              </form>
            )}
            {renderLineAnswer(p.ref)}
          </>
        )}
      </WordCard>
    );
  };

  /** At the end of a section: the next one, by its own short name ("Continue: Ashrei"). */
  const continueButton = () => {
    if (!reader?.next) return null;
    const nextName = reader.book && reader.next.startsWith(`${reader.book}, `) ? reader.next.slice(reader.book.length + 2).split(", ").pop() : reader.next;
    return (
      <div className="reader-continue">
        <button
          type="button"
          className="btn"
          disabled={readerLoading}
          onClick={() => void openReader(reader.next!)}
        >
          Continue: {nextName} <span aria-hidden="true">›</span>
        </button>
      </div>
    );
  };

  const renderLine = (p: Passage & { tokens: Token[] }, isCommentary: boolean, author?: string, opts?: { noAnswer?: boolean }) => {
    const isSelected = selected === p.ref;
    const lineClass = `line${reader?.focus === p.ref ? " cited" : ""}${isSelected ? " selected" : ""}${p.source?.article ? " article" : ""}`;
    return (
      <div key={p.ref} className={isCommentary ? "comm" : undefined}>
        {/* A div rather than a button, so the words can be highlighted and asked about. */}
        <div
          role="button"
          tabIndex={0}
          data-ref={p.ref}
          className={lineClass}
          aria-expanded={isSelected}
          onClick={() => {
            if (!hasHighlight()) tapLine(p.ref);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            tapLine(p.ref);
          }}
        >
          {isCommentary ? (
            <span className="num">
              <span>{author ?? p.label}</span>
              <CautionTag source={p.source} />
              <span className="he" lang="he">
                {p.labelHe}
              </span>
            </span>
          ) : (
            // The verse or line number sits in the margin; the book is named in the bar above.
            <span className="vnum" title={p.label}>
              {lineNumber(p.label)}
            </span>
          )}
          <span className="he" lang="he">
            {p.tokens.length
              ? p.tokens.map((t, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    {bareWord(t.text) === "" ? (
                      t.text
                    ) : (
                      <span
                        className={`w-tap${t.root ? " known" : ""}${wordCard?.ref === p.ref && wordCard.index === i ? " on" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!hasHighlight()) tapWord(p.ref, i);
                        }}
                      >
                        {t.text}
                      </span>
                    )}
                  </span>
                ))
              : p.he}
          </span>
          <span className="en">{p.en}</span>
        </div>
        {/* An answer shows in the card while it is open, and under its line after. */}
        {!isSelected && !opts?.noAnswer && renderLineAnswer(p.ref)}
      </div>
    );
  };

  // Each category in use gets its own color (in A–Z order), the same on every screen.
  const categoryNames = [...new Set(chats.map((c) => c.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const categoryTone = (name: string) => {
    const i = name ? categoryNames.indexOf(name) : -1;
    return i < 0 ? "tone-none" : `tone-${i % 6}`;
  };

  const categoryPicker = (chat: SavedChat) =>
    categoryDraft?.id === chat.id ? (
      <form
        className="category-new"
        onSubmit={(e) => {
          e.preventDefault();
          const name = cleanCategory(categoryDraft.text);
          if (name) updateChat(chat.id, { category: name });
          setCategoryDraft(null);
        }}
      >
        <label className="sr-only" htmlFor={`cat-${chat.id}`}>
          New category name
        </label>
        <input
          id={`cat-${chat.id}`}
          autoFocus
          maxLength={30}
          placeholder="Category name"
          value={categoryDraft.text}
          onChange={(e) => setCategoryDraft({ id: chat.id, text: e.target.value })}
        />
        <button type="submit" className="chip-btn">
          Save
        </button>
        <button type="button" className="chip-btn" onClick={() => setCategoryDraft(null)}>
          Cancel
        </button>
      </form>
    ) : (
      <label className="category-pick">
        <span>Category</span>
        <select
          value={chat.category}
          onChange={(e) => {
            if (e.target.value === "__new__") setCategoryDraft({ id: chat.id, text: "" });
            else updateChat(chat.id, { category: e.target.value });
          }}
        >
          <option value="">Not sorted</option>
          {categoriesFor(chats).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__new__">New category…</option>
        </select>
      </label>
    );

  /** Rename, move to a category, or delete one chat. */
  const chatToolsFor = (c: SavedChat) => (
    <>
      {renameDraft?.id === c.id ? (
        <form
          className="category-new"
          onSubmit={(e) => {
            e.preventDefault();
            const t = renameDraft.text.replace(/\s+/g, " ").trim().slice(0, 70);
            if (t) updateChat(c.id, { title: t });
            setRenameDraft(null);
          }}
        >
          <label className="sr-only" htmlFor={`name-${c.id}`}>
            Chat name
          </label>
          <input
            id={`name-${c.id}`}
            autoFocus
            maxLength={70}
            value={renameDraft.text}
            onChange={(e) => setRenameDraft({ id: c.id, text: e.target.value })}
          />
          <button type="submit" className="chip-btn">
            Save
          </button>
          <button type="button" className="chip-btn" onClick={() => setRenameDraft(null)}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" className="chip-btn" onClick={() => setRenameDraft({ id: c.id, text: c.title })}>
          Rename
        </button>
      )}
      {categoryPicker(c)}
      <CopyChat text={chatToShare(c, libraryMode === "testing")} />
      {confirmDelete === c.id ? (
        <span className="confirm">
          Delete this chat?{" "}
          <button type="button" className="chip-btn danger" onClick={() => deleteChat(c.id)}>
            Delete
          </button>
          <button type="button" className="chip-btn" onClick={() => setConfirmDelete(null)}>
            Keep it
          </button>
        </span>
      ) : (
        <button type="button" className="chip-btn" onClick={() => setConfirmDelete(c.id)}>
          Delete
        </button>
      )}
    </>
  );

  /**
   * The saved chats: the left column of Chat on a computer, the whole screen on a phone. "Saved
   * on this device" is said here, once.
   */
  const renderChatsPanel = (column = false) => {
    const words = chatFilter.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = words.length ? chats.filter((c) => chatMatches(c, words)) : chats;
    return (
      <div className={column ? "chats-col-inner" : "chats-panel"}>
        <div className="chats-head">
          <h2>{column ? "Chats" : "Your chats"}</h2>
          <div className="follow tight">
            <button type="button" className="btn primary" onClick={startNewChat}>
              + New chat
            </button>
            {!column && (
              <button type="button" className="btn" onClick={() => setChatsOpen(false)}>
                Back
              </button>
            )}
          </div>
        </div>
        {signedIn ? (
          <p className="fine-left">Saved in your account, on all your devices.</p>
        ) : (
          <p className="fine-left">
            Saved only on this device. Clearing your browser’s data removes them.
            {accountsOn && (
              <>
                {" "}
                <button type="button" className="link" onClick={() => setAccountOpen(true)}>
                  Sign in to keep them on all your devices
                </button>
              </>
            )}
          </p>
        )}
        {chats.length > 3 && (
          <>
            <label className="sr-only" htmlFor="chat-filter">
              Search your chats
            </label>
            <input
              id="chat-filter"
              className="book-filter"
              type="search"
              placeholder="Search your chats"
              value={chatFilter}
              onChange={(e) => setChatFilter(e.target.value)}
            />
          </>
        )}
        {chats.length === 0 ? (
          <p className="muted">No saved chats yet. Each conversation is saved here as you go.</p>
        ) : shown.length === 0 ? (
          <p className="muted">No chat matches that.</p>
        ) : (
          groupByCategory(shown).map((g) => (
            <section key={g.category || "_none"} className="chat-group">
              <h3 className={`group-name ${categoryTone(g.category)}`}>{g.category || "Not sorted"}</h3>
              <ul>
                {g.chats.map((c, ci) => {
                  const questions = c.messages.filter((m) => m.role === "user").length;
                  const open = chatTools === c.id;
                  // In a long list, a small label where the days change: Today, Yesterday, This week, Earlier.
                  const bucket = g.chats.length > 4 && !words.length ? dateBucket(c.updatedAt) : null;
                  const newBucket = bucket && (ci === 0 || dateBucket(g.chats[ci - 1].updatedAt) !== bucket);
                  return (
                    <Fragment key={c.id}>
                    {newBucket && <li className="chat-when" aria-hidden="true">{bucket}</li>}
                    <li className={`chat-row${c.id === chatId ? " current" : ""}`}>
                      <div className="chat-row-main">
                        <button type="button" className="chat-open" onClick={() => openChat(c)}>
                          <span className="chat-title">{c.title}</span>
                          <span className="chat-sub">
                            {whenLabel(c.updatedAt)} · {questions} {questions === 1 ? "question" : "questions"}
                            {c.id === chatId ? " · open now" : ""}
                          </span>
                          {c.chavrusa && <span className="chat-chav">{sessionLabel(c.chavrusa)}</span>}
                          {c.messages.some((m) => m.pending) ? (
                            <span className="chat-flag working">Answering</span>
                          ) : freshChats.has(c.id) ? (
                            <span className="chat-flag fresh">New answer</span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="chat-more"
                          aria-expanded={open}
                          aria-label={`Options for “${c.title}”`}
                          onClick={() => {
                            setChatTools(open ? null : c.id);
                            setConfirmDelete(null);
                            setRenameDraft(null);
                            setCategoryDraft(null);
                          }}
                        >
                          ⋯
                        </button>
                      </div>
                      {open && <div className="chat-tools">{chatToolsFor(c)}</div>}
                    </li>
                    </Fragment>
                  );
                })}
              </ul>
            </section>
          ))
        )}
        {chats.length > 1 &&
          (confirmDelete === "__all__" ? (
            <p className="confirm all">
              {signedIn ? `Delete all ${chats.length} chats, from your account and all your devices?` : `Delete all ${chats.length} chats from this device?`}{" "}
              <button
                type="button"
                className="chip-btn danger"
                onClick={() => {
                  if (signedIn) {
                    setChatsLocal([]);
                    account.api.deleteAllChats();
                  } else saveChats([]);
                  setConfirmDelete(null);
                  setMessages([]);
                  setChatId(null);
                }}
              >
                Delete all
              </button>
              <button type="button" className="chip-btn" onClick={() => setConfirmDelete(null)}>
                Keep them
              </button>
            </p>
          ) : (
            <button type="button" className="link delete-all" onClick={() => setConfirmDelete("__all__")}>
              {signedIn ? "Delete all chats" : "Delete all chats on this device"}
            </button>
          ))}
      </div>
    );
  };

  const currentChat = chatId ? chats.find((c) => c.id === chatId) : undefined;
  /** On a computer, the saved chats are a column beside the conversation. */
  const chatsColumn = mode === "chat" && wide && !readerOpen;

  const PART_LABEL = { main: "Gemara", rashi: "Rashi", tosafot: "Tosafot" } as const;

  const renderDafView = () => {
    const outline = daf ? outlines[daf.section] : undefined;
    const shownOutline = showOutline ? outline : undefined;
    const flow: FlowView | null = shownOutline
      ? { phrases: Object.fromEntries(shownOutline.lines.map((l) => [l.ref, l.phrases])), only: flowOnly, current: flowStep }
      : null;
    const steps = shownOutline ? flowSteps(shownOutline.lines, flowOnly) : [];
    const stepAt = flowStep ? steps.findIndex((s) => s.ref === flowStep.ref && s.n === flowStep.n) : -1;
    const chooseFlowOnly = (kind: OutlineKind | null) => {
      setFlowOnly(kind);
      if (!shownOutline || !flowStep) return;
      const next = flowSteps(shownOutline.lines, kind);
      const at = nearestStep(shownOutline.lines, next, flowStep);
      setFlowStep(at >= 0 ? { ref: next[at].ref, n: next[at].n } : null);
    };
    const toggleSteps = () => {
      if (flowStep) {
        setFlowStep(null);
        return;
      }
      // Start at the phrase of the word being looked at, if there is one.
      let at = 0;
      if (dafPick?.part === "main" && shownOutline) {
        const n = phraseOfWord(shownOutline.lines.find((l) => l.ref === dafPick.ref)?.phrases, dafPick.index);
        at = nearestStep(shownOutline.lines, steps, { ref: dafPick.ref, n: Math.max(0, n) });
      }
      if (steps[at]) setFlowStep({ ref: steps[at].ref, n: steps[at].n });
    };
    const closeSteps = () => {
      setFlowStep(null);
      // Back to the button that opened it, for the keyboard.
      requestAnimationFrame(() => document.querySelector<HTMLElement>(".daf-view .flow-step-btn")?.focus());
    };
    const pieces = daf ? [...daf.main, ...daf.rashi, ...daf.tosafot, ...(daf.printed?.extra ?? [])] : [];
    const picked = dafPick ? pieces.find((p) => p.ref === dafPick.ref) : undefined;
    const linked = new Set<string>();
    if (daf && dafPick && picked) {
      if (dafPick.part === "main") {
        for (const c of [...daf.rashi, ...daf.tosafot]) if (c.on === picked.ref) linked.add(c.ref);
      } else if (picked.on) linked.add(picked.on);
    }
    const word = dafPick ? bareWord(dafPick.word) : "";
    const lookup = word ? wordInfo[word] : undefined;
    const first = lookup?.entries?.[0];
    const line = shownOutline?.lines.find((l) => l.ref === picked?.ref);
    // What the phrase holding the tapped word does, in RabbAI's outline.
    const phrase = line && dafPick ? line.phrases[phraseOfWord(line.phrases, dafPick.index)] : undefined;
    const answer = picked ? lineAnswers[picked.ref] : undefined;
    const partName = dafPick?.part === "main" ? "line" : "comment";
    // Read a comment with the line it explains, and a line of Gemara with the line before it.
    const mainAt = picked && daf && dafPick?.part === "main" ? daf.main.findIndex((p) => p.ref === picked.ref) : -1;
    const trContext = !picked ? [] : dafPick?.part === "main" ? (mainAt > 0 && daf ? [daf.main[mainAt - 1].ref] : []) : picked.on ? [picked.on] : [];
    const goToSource = (r: string) => {
      closeDaf();
      void openReader(r);
    };
    // The comments printed on the tapped line, or the line a tapped comment explains.
    const onLine =
      daf && picked && dafPick?.part === "main"
        ? [
            ...daf.rashi.filter((c) => c.on === picked.ref).map((c) => ({ ...c, part: "rashi" as const })),
            ...daf.tosafot.filter((c) => c.on === picked.ref).map((c) => ({ ...c, part: "tosafot" as const })),
          ]
        : [];
    const explained = daf && picked?.on ? daf.main.find((m) => m.ref === picked.on) : undefined;
    const askDafWord = () =>
      picked && dafPick && void askLine(picked.ref, "word", "", dafPick.printedAs ? `${dafPick.printedAs} (${word})` : word);
    const dafTabs: CardTabInfo[] = [
      ...(word ? [{ id: "meaning" as const, label: "Meaning" }] : []),
      { id: "translation", label: "Translation" },
      dafPick?.part === "main"
        ? { id: "commentary", label: "Rashi & Tosafot", count: onLine.length }
        : { id: "commentary", label: "The Gemara" },
      { id: "ask", label: "Ask" },
    ];
    const dafTab = dafTabs.some((t) => t.id === cardTab) ? cardTab : dafTabs[0].id;
    return (
      <div className="daf-view" role="dialog" aria-modal="true" aria-label={daf ? `${daf.section}, the page as printed` : "The page as printed"}>
        <div className="daf-bar">
          <button type="button" className="rb-icon" aria-label="Back" onClick={closeDaf}>
            ←
          </button>
          <div className="daf-nav">
            <button
              type="button"
              className="rb-icon"
              disabled={!daf?.prev || dafLoading}
              onClick={() => daf?.prev && void openDaf(daf.prev)}
              aria-label={daf?.prev ? `Previous page, ${daf.prev}` : "Previous page"}
            >
              ‹
            </button>
            <button
              type="button"
              className="rb-title"
              aria-expanded={dafMenu === "contents"}
              aria-label={`${dafRef}: choose a page`}
              disabled={!daf}
              onClick={() => setDafMenu(dafMenu === "contents" ? null : "contents")}
            >
              {daf && (
                <span className="he" lang="he">
                  {daf.labelHe}
                </span>
              )}
              <span className="rb-t">{dafRef}</span>
              <span className="rb-caret" aria-hidden="true">
                ▾
              </span>
            </button>
            <button
              type="button"
              className="rb-icon"
              disabled={!daf || dafLoading}
              onClick={() => daf && void openDaf(daf.next)}
              aria-label={daf ? `Next page, ${daf.next}` : "Next page"}
            >
              ›
            </button>
          </div>
          <button
            type="button"
            className={`rb-btn flow-btn${showOutline ? " on" : ""}`}
            aria-pressed={showOutline}
            disabled={!daf || outlineState?.loading}
            onClick={() => void showFlow()}
          >
            {outlineState?.loading ? "Outlining…" : showOutline ? "Hide the flow" : "Show the flow"}
          </button>
          <button
            type="button"
            className="rb-btn chav-daf-btn"
            disabled={!daf}
            onClick={() => daf && openChavrusaSetup({ text: daf.section })}
            aria-label="Learn this page with a chavrusa"
          >
            Learn it
          </button>
          <button type="button" className="rb-btn" aria-expanded={dafMenu === "view"} onClick={() => setDafMenu(dafMenu === "view" ? null : "view")}>
            View
          </button>
          {dafMenu === "view" && (
            <div className="rb-menu daf-menu" role="group" aria-label="View">
              <button
                type="button"
                className="btn primary narrow-only chav-menu-btn"
                disabled={!daf}
                onClick={() => {
                  setDafMenu(null);
                  if (daf) openChavrusaSetup({ text: daf.section });
                }}
              >
                Learn this page with a chavrusa
              </button>
              <div className="view-row">
                <span>Page size</span>
                <div className="seg" role="group" aria-label="Page size">
                  <button type="button" aria-label="Smaller page" disabled={dafZoom <= 1 || dafColumn} onClick={() => {
                      dafZoomChosen.current = true;
                      setDafZoom((z) => Math.max(1, Math.ceil(z * 2 - 1.01) / 2));
                    }}>
                    −
                  </button>
                  <button type="button" aria-label="Bigger page" disabled={dafZoom >= 4 || dafColumn} onClick={() => {
                      dafZoomChosen.current = true;
                      setDafZoom((z) => Math.min(4, Math.floor(z * 2 + 1.01) / 2));
                    }}>
                    +
                  </button>
                </div>
              </div>
              <label className="rb-check">
                <input
                  type="checkbox"
                  checked={dafVowels}
                  disabled={!daf?.main.some((p) => p.vowels)}
                  onChange={() =>
                    setDafVowels((v) => {
                      store("rabai_daf_vowels", v ? "off" : "on");
                      return !v;
                    })
                  }
                />
                Vowels{" "}
                <span lang="he" dir="rtl">
                  נִקּוּד
                </span>
              </label>
              {daf && !daf.main.some((p) => p.vowels) && <p className="fine-left">The library has no vowels for this tractate yet.</p>}
              <label className="rb-check">
                <input
                  type="checkbox"
                  checked={dafColumn}
                  onChange={() =>
                    setDafColumn((v) => {
                      store("rabai_daf_column", v ? "off" : "on");
                      return !v;
                    })
                  }
                />
                The Gemara alone, larger
              </label>
              {dafColumn && <p className="fine-left">Rashi and Tosafot are in the card when you tap a word.</p>}
              <label className="rb-check narrow-only">
                <input type="checkbox" checked={showOutline} disabled={!daf || outlineState?.loading} onChange={() => void showFlow()} />
                Show the flow (RabbAI’s outline)
              </label>
            </div>
          )}
          {dafMenu === "contents" && daf && (
            <div className="rb-menu daf-menu rb-toc">
              <p className="label-sm">{daf.section.replace(/ \d+[ab]$/, "")}</p>
              <ContentsGrid
                book={daf.section.replace(/ \d+[ab]$/, "")}
                current={daf.section}
                loadingText="Listing the pages"
                onOpen={(sec) => {
                  setDafMenu(null);
                  void openDaf(sec);
                }}
              />
            </div>
          )}
        </div>
        {daf && (
          <p className="reader-label daf-label" title={daf.libraryLabel}>
            <span className="tag-gray">Testing library</span> Not yet approved by the rabbinic board.
          </p>
        )}
        {daf && !wide && !dafColumn && dafZoomHint && (
          <p className="reader-hint daf-hint">
            Pinch to zoom, or double-tap a spot. The Gemara alone, larger, is under View.{" "}
            <button
              type="button"
              className="link"
              onClick={() => {
                setDafZoomHint(false);
                store("rabai_daf_zoom_hint", "seen");
              }}
            >
              Got it
            </button>
          </p>
        )}
        {outlineState?.error && <p className="daf-alert">{outlineState.error}</p>}
        {shownOutline && (
          <FlowLegend counts={kindCounts(shownOutline.lines)} only={flowOnly} onOnly={chooseFlowOnly} stepping={!!flowStep} onStep={toggleSteps} />
        )}
        <div className={`daf-body${picked ? " with-panel" : ""}`}>
          <div className="daf-main" ref={dafMainRef}>
            {dafLoading ? (
              <p className="reader-state">
                Opening the page<span className="dots" />
              </p>
            ) : dafError ? (
              <p className="reader-state">{dafError}</p>
            ) : daf ? (
              <>
                {(() => {
                  const props = {
                    zoom: dafZoom,
                    vowels: dafVowels,
                    selectedRef: dafPick?.ref ?? null,
                    linkedRefs: linked,
                    activeWord: dafPick ? { ref: dafPick.ref, index: dafPick.index } : null,
                    flow,
                    marks,
                    onWord: (ref: string, index: number, w: string, part: "main" | "rashi" | "tosafot", printedAs?: string) => {
                      // While stepping through, a word of the Gemara moves the steps to its phrase.
                      const n = flowStep && part === "main" ? phraseOfWord(flow?.phrases[ref], index) : -1;
                      if (n >= 0 && steps.some((s) => s.ref === ref && s.n === n)) setFlowStep({ ref, n });
                      if (dafPick?.ref === ref && dafPick.index === index) return setDafPick(null);
                      // Another word of the same line keeps the open tab; a new line opens on the word's meaning.
                      if (dafPick?.ref !== ref) {
                        // A Rashi or a Tosafot opens on its Hebrew with the translation under it.
                        setCardTab(part === "main" ? "meaning" : "translation");
                        setDafQuestion("");
                      }
                      setDafPick({ ref, index, word: w, part, printedAs });
                    },
                  };
                  const printed = daf.printed;
                  if (dafColumn) return <DafColumn data={daf} {...props} />;
                  return printed ? <DafPrinted data={{ ...daf, printed }} {...props} /> : <DafPage data={daf} {...props} />;
                })()}
                {daf.printed && daf.printed.estimated.length > 0 && (
                  <p className="daf-note">
                    {daf.printed.estimated.length === 1 ? "One word" : `${daf.printed.estimated.length} words`} with a dotted underline{" "}
                    {daf.printed.estimated.length === 1 ? "is" : "are"} placed by estimate: the scan didn’t show for certain which line{" "}
                    {daf.printed.estimated.length === 1 ? "it is" : "they are"} on.
                  </p>
                )}
                <details className="daf-note daf-about">
                  <summary>About this page</summary>
                  <p>
                    {daf.libraryLabel} Gemara: {daf.editions.main}. Rashi and Tosafot: {daf.editions.rashi}.{" "}
                    {daf.printed
                      ? "Every line, and nearly every word on it, is where it is on the printed Vilna page, read from a scan of the Romm printing. Abbreviations are shown as the print has them; tap one for the words it stands for. Where the scan didn't settle one, the library's full words are set small in its place."
                      : "The shape follows the printed Vilna page, but the lines break where your screen breaks them."}
                  </p>
                </details>
              </>
            ) : null}
          </div>
          {dafPick && picked && daf && (
            <WordCard
              variant={wide ? "panel" : "sheet"}
              className="daf-card"
              ariaLabel={`About ${picked.ref}`}
              label={
                <>
                  <span className={`part-chip part-${dafPick.part}`}>{PART_LABEL[dafPick.part]}</span>{" "}
                  <span className="wc-ref">{picked.ref}</span>
                </>
              }
              word={word ? (dafPick.printedAs ?? word) : undefined}
              wordNote={
                dafPick.printedAs ? (
                  <>
                    Printed short for{" "}
                    <span className="he" lang="he">
                      {word}
                    </span>
                    .
                  </>
                ) : undefined
              }
              breakdown={first && !lookup?.abbreviation ? renderBreakdown(first) : undefined}
              aboveTabs={
                line ? (
                  <p className={`kind-note k-${(phrase ?? line).kind}`}>
                    <strong>{OUTLINE_LABELS[(phrase ?? line).kind]}.</strong> {phrase?.note || line.note}{" "}
                    <span className="fine-inline">RabbAI’s outline, not yet reviewed by the rabbinic board.</span>
                  </p>
                ) : undefined
              }
              tabs={dafTabs}
              tab={dafTab}
              onTab={setCardTab}
              onNext={() => stepDafWord(1)}
              onPrev={() => stepDafWord(-1)}
              onClose={() => setDafPick(null)}
              footer={
                <div className="wc-line">
                  <p className="label-sm">This {partName}</p>
                  <Folded className="he wc-line-he" lines={2} lang="he">
                    {picked.he}
                  </Folded>
                  <div className="mark-row" role="group" aria-label={`Mark this ${partName}`}>
                    <span>Mark it:</span>
                    {MARK_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`mark-dot mark-${c.id}`}
                        aria-label={c.label}
                        aria-pressed={marks[picked.ref] === c.id}
                        onClick={() => markPiece(picked.ref, marks[picked.ref] === c.id ? null : c.id)}
                      />
                    ))}
                    {marks[picked.ref] && (
                      <button type="button" className="link" onClick={() => markPiece(picked.ref, null)}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              }
            >
              {dafTab === "meaning" && word && (
                <>
                  {renderMeaning(word, askDafWord)}
                  <div className="follow">
                    {saveButton(word, {
                      gloss: first ? `${first.text.slice(0, 90).replace(/\s+\S*$/, "")} … (${first.dictionary})` : undefined,
                      ref: picked.ref,
                    })}
                  </div>
                </>
              )}
              {dafTab === "translation" &&
                renderTranslation({
                  ref: picked.ref,
                  en: picked.en,
                  by: dafPick.part === "main" ? daf.editions.mainEnglish : undefined,
                  context: trContext,
                  active: dafPick.index,
                  partName,
                  onSource: goToSource,
                  heWords: pieceWords(picked.he),
                })}
              {dafTab === "commentary" && (
                <div className="wc-pieces">
                  {dafPick.part === "main" ? (
                    onLine.length ? (
                      onLine.map((c) => (
                        <details key={c.ref} className="wc-piece" open={onLine.length <= 2 || undefined}>
                          <summary>
                            <span className={`part-chip part-${c.part}`}>{PART_LABEL[c.part]}</span>{" "}
                            <span className="he" lang="he">
                              {pieceWords(c.he).slice(0, 7).join(" ")}
                              {pieceWords(c.he).length > 7 ? " …" : ""}
                            </span>
                          </summary>
                          <p className="he wc-piece-he" lang="he">
                            {c.he}
                          </p>
                          {commentEnglish(c.ref, c.en, [picked.ref])}
                          <button type="button" className="link" onClick={() => pickPiece(c.ref, c.he, c.part)}>
                            Show on the page
                          </button>
                        </details>
                      ))
                    ) : (
                      <p className="muted">The library has no Rashi or Tosafot on this line.</p>
                    )
                  ) : explained ? (
                    <div className="wc-piece">
                      <p className="he wc-piece-he" lang="he">
                        {explained.he}
                      </p>
                      {explained.en && (
                        <Folded className="wc-piece-en" lines={5}>
                          {explained.en}
                        </Folded>
                      )}
                      <button type="button" className="link" onClick={() => pickPiece(explained.ref, explained.he, "main")}>
                        Show on the page
                      </button>
                    </div>
                  ) : (
                    <p className="muted">This comment isn’t linked to a line of the Gemara in the library.</p>
                  )}
                </div>
              )}
              {dafTab === "ask" && (
                <>
                  <div className="wc-asks" role="group" aria-label={`Ask about ${picked.ref}`}>
                    {word && (
                      <button type="button" disabled={answer?.loading} onClick={askDafWord}>
                        Ask RabbAI about this word
                      </button>
                    )}
                    <button type="button" disabled={answer?.loading} onClick={() => void askLine(picked.ref, "explain")}>
                      Explain this {partName}
                    </button>
                    {dafPick.part === "main" && (
                      <button type="button" disabled={answer?.loading} onClick={() => void askLine(picked.ref, "commentaries")}>
                        What do Rashi and Tosafot say?
                      </button>
                    )}
                  </div>
                  <form
                    className="ask-line"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (dafQuestion.trim()) void askLine(picked.ref, "ask", dafQuestion.trim());
                    }}
                  >
                    <label className="sr-only" htmlFor="daf-ask">
                      Your own question about {picked.ref}
                    </label>
                    <input
                      id="daf-ask"
                      value={dafQuestion}
                      onChange={(e) => setDafQuestion(e.target.value)}
                      placeholder={`Ask about this ${partName}…`}
                      maxLength={2000}
                    />
                    <button type="submit" disabled={!dafQuestion.trim() || answer?.loading}>
                      Ask
                    </button>
                  </form>
                  {renderLineAnswer(picked.ref, goToSource)}
                </>
              )}
            </WordCard>
          )}
        </div>
        {/* Below the page, never over it. On a phone the word card's sheet takes this place while it is open. */}
        {daf && stepAt >= 0 && !(picked && !wide) && (
          <FlowBar
            steps={steps}
            index={stepAt}
            only={flowOnly}
            text={(ref) => daf.main.find((p) => p.ref === ref)}
            englishBy={daf.editions.mainEnglish}
            onMove={(i) => setFlowStep({ ref: steps[i].ref, n: steps[i].n })}
            onClose={closeSteps}
          />
        )}
      </div>
    );
  };

  return (
    <div className={`app mode-${mode}${readerOpen ? " with-reader" : ""}${readerOpen && mode === "learn" ? " reader-full" : ""}`}>
      <section className="convo" aria-label={mode === "chat" ? "Conversation" : mode === "daven" ? "Daven" : "Learn"}>
        <header className="top">
          <div className="brand">
            <div className="mark" aria-hidden="true">
              ר
            </div>
            <div>
              <h1>RabbAI</h1>
              <div className="sub">An AI Torah teacher</div>
            </div>
            {libraryMode === "development" && (
              <span className="badge" title={DEV_NOTE}>
                <span className="wide">Development build</span>
                <span className="narrow">Dev</span>
              </span>
            )}
            {libraryMode === "testing" && (
              <span className="badge" title={TESTING_LABEL}>
                <span className="wide">Testing library</span>
                <span className="narrow">Testing</span>
              </span>
            )}
          </div>
          <div className="top-actions">
            <button
              type="button"
              className={`chats-btn${chatsOpen && mode === "chat" ? " on" : ""}`}
              aria-pressed={chatsOpen && mode === "chat"}
              onClick={() => {
                // On a computer the chats are a column beside the conversation.
                if (wide && !readerOpen) {
                  setChatsOpen(false);
                  return chooseMode("chat");
                }
                const opening = !(chatsOpen && mode === "chat");
                setChatsOpen(opening);
                setChatTools(null);
                if (opening) chooseMode("chat");
              }}
            >
              <ChatsIcon />
              <span className="chats-label">Your chats</span>
              {freshChats.size > 0 && <span className="fresh-dot" aria-label="A new answer is waiting" />}
            </button>
            {mode === "chat" && messages.length > 0 && !(chatsOpen && !chatsColumn) && (
              <button type="button" className="icon-btn new-chat-top" aria-label="New chat" title="New chat" onClick={startNewChat}>
                <NewChatIcon />
              </button>
            )}
            <nav
              className="mode-switch"
              aria-label="Chat, learn or daven"
              onKeyDown={(e) => {
                // The arrow keys move between the three, as in a row of tabs.
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const order: Mode[] = ["chat", "learn", "daven"];
                const next = order[(order.indexOf(mode) + (e.key === "ArrowRight" ? 1 : 2)) % 3];
                e.preventDefault();
                chooseMode(next);
                requestAnimationFrame(() => document.querySelector<HTMLElement>(`.mode-switch [data-mode="${next}"]`)?.focus());
              }}
            >
              {(
                [
                  ["chat", "Chat", "Ask and talk"],
                  ["learn", "Learn", "The library"],
                  ["daven", "Daven", "The siddur"],
                ] as const
              ).map(([m, label, hint]) => (
                <button
                  key={m}
                  type="button"
                  data-mode={m}
                  aria-pressed={mode === m}
                  aria-current={mode === m ? "page" : undefined}
                  title={`${label}: ${hint}`}
                  onClick={() => chooseMode(m)}
                >
                  <ModeIcon mode={m} />
                  <span className="mode-label">{label}</span>
                  {m === "chat" && mode !== "chat" && (pending || freshChats.size > 0) && (
                    <span className={`mode-dot${pending ? " busy" : ""}`} aria-label={pending ? "RabbAI is answering" : "A new answer is waiting"} />
                  )}
                </button>
              ))}
            </nav>
            <button
              type="button"
              className="icon-btn"
              aria-label="Settings"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <GearIcon />
            </button>
          </div>
          {settingsOpen && (
            <>
              <button type="button" className="menu-scrim" aria-label="Close settings" onClick={() => setSettingsOpen(false)} />
              <div className="settings-menu" role="dialog" aria-label="Settings">
                <p className="settings-group">Your learning</p>
                <label className="switch">
                  <input type="checkbox" checked={growth} onChange={(e) => toggleGrowth(e.target.checked)} />
                  <span>
                    <strong>Help me grow closer to HaShem</strong>
                    <span className="muted">
                      Off unless you turn it on. When it’s on, RabbAI may gently offer one small step at a time, never with
                      guilt.
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  className="settings-row"
                  onClick={() => {
                    setSettingsOpen(false);
                    setAboutOpen(true);
                  }}
                >
                  <strong>About you</strong>
                  <span className="muted">
                    {profile.remember ? "What you told RabbAI, and what it remembers of your learning" : "Remembering is off"}
                  </span>
                </button>
                {accountsOn && (
                  <button
                    type="button"
                    className="settings-row"
                    onClick={() => {
                      setSettingsOpen(false);
                      setAccountOpen(true);
                    }}
                  >
                    <strong>Your account</strong>
                    <span className="muted">
                      {signedIn
                        ? "Signed in. Download your data, sign out, or delete your account"
                        : "Sign in with your email to keep your learning on all your devices"}
                    </span>
                  </button>
                )}
                <p className="settings-group">Times and reading</p>
                <button
                  type="button"
                  className="settings-row"
                  onClick={() => {
                    setSettingsOpen(false);
                    setPlaceOpen(true);
                  }}
                >
                  <strong>Your place</strong>
                  <span className="muted">
                    {placeSummary(placeSettings)}
                    {day?.shabbat && placeSettings.place
                      ? `. This Shabbat: candles ${day.shabbat.candlesDay.split(",")[0]} ${day.shabbat.candles}, ends ${day.shabbat.ends}`
                      : ". For candle lighting, fasts and the day's times"}
                  </span>
                </button>
                <div className="settings-line">
                  <span id="text-size-label">Text size</span>
                  <div className="seg" role="radiogroup" aria-labelledby="text-size-label">
                    {TEXT_SIZES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={textSize === t}
                        className={textSize === t ? "on" : ""}
                        style={{ fontSize: `${14 * TEXT_SCALE[t]}px` }}
                        onClick={() => {
                          setTextSize(t);
                          store("rabai_text_size", t);
                        }}
                      >
                        {t === "normal" ? "A" : t === "large" ? "A+" : "A++"}
                        <span className="sr-only">{t === "normal" ? " usual size" : t === "large" ? " larger" : " largest"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-line">
                  <span id="theme-label">Light or dark</span>
                  <div className="seg" role="radiogroup" aria-labelledby="theme-label">
                    {THEMES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={theme === t}
                        className={theme === t ? "on" : ""}
                        onClick={() => {
                          setTheme(t);
                          store("rabai_theme", t);
                        }}
                      >
                        {t === "system" ? "Auto" : t === "light" ? "Light" : "Dark"}
                        {t === "system" && <span className="sr-only"> (follow the device)</span>}
                      </button>
                    ))}
                  </div>
                </div>
                {speechOk && (
                  <div className="settings-line">
                    <span id="reading-rate-label">Reading aloud</span>
                    <div className="seg" role="radiogroup" aria-labelledby="reading-rate-label">
                      {(["0.8", "1", "1.2"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          role="radio"
                          aria-checked={readingRate === r}
                          className={readingRate === r ? "on" : ""}
                          onClick={() => {
                            setReadingRate(r);
                            setSpeechRate(Number(r));
                            store("rabai_speech_rate", r);
                          }}
                        >
                          {r === "0.8" ? "Slower" : r === "1" ? "Usual" : "Faster"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {speechOk && (voiceList.length > 1 || ownVoice) && (
                  <div className="settings-line voice-line">
                    <label htmlFor="voice-pick">Voice</label>
                    <div className="voice-choose">
                      <select
                        id="voice-pick"
                        className="voice-pick"
                        value={
                          voiceName === DEVICE_BEST ||
                          voiceList.some((v) => v.name === voiceName) ||
                          (voiceName.startsWith(OWN_VOICE) && ownVoiceList?.voices.some((v) => `${OWN_VOICE}${v.id}` === voiceName && v.id !== ownVoiceList.defaultVoice))
                            ? voiceName
                            : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setVoiceName(v);
                          setPreferredVoice(v);
                          store("rabai_voice", v);
                          setSpeaking(null);
                          speak(VOICE_SAMPLE);
                        }}
                      >
                        {ownVoice && ownVoiceList ? (
                          (
                            [
                              ["men", "RabbAI's voices: men"],
                              ["women", "RabbAI's voices: women"],
                              ["other", "RabbAI's voices: others"],
                            ] as const
                          ).map(([group, label]) => {
                            const inGroup = ownVoiceList.voices.filter((v) => v.group === group);
                            if (!inGroup.length) return null;
                            return (
                              <optgroup key={group} label={label}>
                                {inGroup.map((v) => {
                                  const isDefault = v.id === ownVoiceList.defaultVoice;
                                  return (
                                    <option key={v.id} value={isDefault ? "" : `${OWN_VOICE}${v.id}`}>
                                      {v.name}
                                      {v.about ? ` (${v.about})` : ""}
                                      {isDefault ? ", recommended" : ""}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            );
                          })
                        ) : (
                          <option value="">The best on this device</option>
                        )}
                        {ownVoice ? (
                          <optgroup label="This device's voices">
                            <option value={DEVICE_BEST}>The best on this device</option>
                            {voiceList.map((v) => (
                              <option key={v.name} value={v.name}>
                                {v.name} ({v.lang})
                              </option>
                            ))}
                          </optgroup>
                        ) : (
                          voiceList.map((v) => (
                            <option key={v.name} value={v.name}>
                              {v.name} ({v.lang})
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        className="btn quiet voice-hear"
                        onClick={() => {
                          setSpeaking(null);
                          speak(VOICE_SAMPLE);
                        }}
                      >
                        Hear it
                      </button>
                    </div>
                  </div>
                )}
                {speechOk && (
                  <div className="settings-line">
                    <span id="hebrew-say-label">Hebrew read aloud</span>
                    <div className="seg" role="radiogroup" aria-labelledby="hebrew-say-label">
                      {(
                        [
                          ["sephardi", "Israeli"],
                          ["ashkenazi", "Ashkenazi"],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={hebrewSay === v}
                          className={hebrewSay === v ? "on" : ""}
                          onClick={() => {
                            setHebrewSay(v);
                            setHebrewPronunciation(v);
                            store("rabai_voice_hebrew", v);
                            setSpeaking(null);
                            speak(v === "ashkenazi" ? "Boruch Hashem. Gut Shabbos." : "Baruch Hashem. Shabbat shalom.");
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {talkOk && (
                  <div className="settings-line">
                    <span id="cut-in-label">In Talk, cut in by talking</span>
                    <div className="seg" role="radiogroup" aria-labelledby="cut-in-label">
                      {(
                        [
                          [true, "On"],
                          [false, "Off"],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={cutIn === v}
                          className={cutIn === v ? "on" : ""}
                          title={v ? "Start talking while RabbAI speaks, and it stops to listen (a tap always works)" : "Only a tap stops RabbAI while it speaks"}
                          onClick={() => {
                            setCutIn(v);
                            setCutInByVoice(v);
                            store("rabai_cut_in", v ? "on" : "off");
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {talkOk && (
                  <div className="settings-line">
                    <span id="talk-pace-label">In Talk, send what I said</span>
                    <div className="seg" role="radiogroup" aria-labelledby="talk-pace-label">
                      {(
                        [
                          ["quick", "Quickly"],
                          ["relaxed", "After a longer pause"],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={talkPace === v}
                          className={talkPace === v ? "on" : ""}
                          title={
                            v === "quick"
                              ? "A short pause sends it, as in a conversation (a pause after “and” waits longer)"
                              : "Waits longer, and counts down before sending, for when you think as you talk"
                          }
                          onClick={() => {
                            setTalkPace(v);
                            store("rabai_talk_pace", v);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {speechOk && (
                  <div className="settings-line">
                    <span id="read-lines-label">When RabbAI reads a line with you, read it in</span>
                    <div className="seg" role="radiogroup" aria-labelledby="read-lines-label">
                      {(
                        [
                          [false, "English"],
                          [true, "Hebrew and English"],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={readOriginal === v}
                          className={readOriginal === v ? "on" : ""}
                          onClick={() => {
                            setReadOriginal(v);
                            readLinesInOriginal = v;
                            store("rabai_read_lines", v ? "both" : "english");
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="settings-group">About RabbAI</p>
                <a className="settings-row" href="/sources" target="_blank" rel="noopener">
                  <strong>RabbAI&apos;s sources</strong>
                  <span className="muted">Every book it reads, what waits for the rabbinic board, and what it leaves out</span>
                </a>
                <button
                  type="button"
                  className="settings-row wide-pointer"
                  onClick={() => {
                    setSettingsOpen(false);
                    setShortcutsOpen(true);
                  }}
                >
                  <strong>Keyboard shortcuts</strong>
                  <span className="muted">Press ? anywhere to see them</span>
                </button>
                <div className="settings-about">
                  <p>RabbAI is an AI Torah teacher, not a rav. For your own situation, ask your rav.</p>
                  {libraryMode === "testing" && (
                    <p>{TESTING_LABEL}</p>
                  )}
                  {libraryMode === "development" && <p>{DEV_NOTE}</p>}
                  {signedIn ? (
                    <p>
                      Your chats and what RabbAI knows about you are kept in your account. Saved words, marks and recent reading
                      stay on this device.
                    </p>
                  ) : (
                    <p>Your chats, saved words, marks, recent reading and what RabbAI knows about you stay on this device.</p>
                  )}
                  <p>
                    <a href="/privacy" target="_blank" rel="noopener">
                      What RabbAI keeps, and why
                    </a>
                  </p>
                </div>
              </div>
            </>
          )}
        </header>

        <div className="convo-body">
          {chatsColumn && (
            <aside className="chats-col" aria-label="Your chats">
              {renderChatsPanel(true)}
            </aside>
          )}
          <div
            className={`convo-main${dragging ? " dragging" : ""}`}
            onDragEnter={(e) => {
              if (mode !== "chat" || !e.dataTransfer.types.includes("Files")) return;
              dragDepth.current++;
              setDragging(true);
            }}
            onDragOver={(e) => {
              if (mode === "chat" && e.dataTransfer.types.includes("Files")) e.preventDefault();
            }}
            onDragLeave={() => {
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (!dragDepth.current) setDragging(false);
            }}
            onDrop={(e) => {
              if (mode !== "chat" || !e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              dragDepth.current = 0;
              setDragging(false);
              void addPictures(Array.from(e.dataTransfer.files));
            }}
          >
            {dragging && (
              <div className="drop-here" aria-hidden="true">
                <PictureIcon /> Drop the picture to add it to your question
              </div>
            )}
        {mode === "daven" && (
          <Siddur
            siddurs={siddurTitles}
            ready={sections !== null}
            day={day}
            place={placeSettings.place}
            testing={libraryMode === "testing"}
            request={davenRequest}
            theme={theme}
            onTheme={(t) => {
              setTheme(t);
              store("rabai_theme", t);
            }}
            onAsk={(q) => {
              chooseMode("chat");
              void send(q, { fresh: true });
            }}
            onLearn={(sec) => void openReader(sec)}
            onPlace={() => setPlaceOpen(true)}
          />
        )}
        <div className="scroll" ref={scrollRef} onScroll={onThreadScroll} hidden={mode === "daven"}>
          {mode === "chat" && chatsOpen && !chatsColumn ? (
            renderChatsPanel()
          ) : mode === "chat" ? (
            <div className="thread" role="log" aria-live="polite" aria-relevant="additions">
              {currentChat && (
                <div className="chat-head">
                  <div className="chat-head-row">
                    <span className={`dot ${categoryTone(currentChat.category)}`} aria-hidden="true" />
                    <h2 className="chat-name">{currentChat.title}</h2>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="This chat: rename, category, delete"
                      aria-expanded={chatTools === HEAD_TOOLS}
                      onClick={() => {
                        setChatTools(chatTools === HEAD_TOOLS ? null : HEAD_TOOLS);
                        setConfirmDelete(null);
                        setRenameDraft(null);
                        setCategoryDraft(null);
                      }}
                    >
                      ⋯
                    </button>
                    <button type="button" className="btn quiet new-chat" onClick={startNewChat}>
                      + New chat
                    </button>
                  </div>
                  {chatTools === HEAD_TOOLS && <div className="chat-tools">{chatToolsFor(currentChat)}</div>}
                </div>
              )}
              {(account.state.justSignedIn && signedIn) || (account.state.ended && account.state.status === "signed-out") ? (
                <div className="account-notes">
                  {account.state.justSignedIn && signedIn && (
                    <p className="account-note" role="status">
                      You’re signed in. Your chats and what RabbAI knows about you now follow you to your other devices.
                    </p>
                  )}
                  {account.state.ended && account.state.status === "signed-out" && (
                    <p className="account-note">
                      Your sign-in ended, so your chats were taken off this device. They’re safe in your account.{" "}
                      <button type="button" className="link" onClick={() => setAccountOpen(true)}>
                        Sign in again
                      </button>
                    </p>
                  )}
                </div>
              ) : null}

              {messages.length === 0 && (
                <div className="msg-ai welcome">
                  <div className="mark" aria-hidden="true">
                    ר
                  </div>
                  <div className="body">
                    <p className="welcome-hi">
                      Shalom{profile.remember && profile.stated.name ? `, ${profile.stated.name}` : ""}. What shall we learn?
                    </p>
                    {day && (
                      <p className="welcome-today">
                        <span>{todayLine(day)}</span>
                        {day.parsha && <span>{day.parsha.holiday ? day.parsha.name : `Parashat ${day.parsha.name}`}</span>}
                        {day.todayIs[0] && !(day.soon?.date === day.date && day.soon.title === day.todayIs[0]) && <span>{day.todayIs[0]}</span>}
                      </p>
                    )}
                    {day && (shabbatLine(day) || soonLine(day)) && (
                      <p className="welcome-times">
                        {shabbatLine(day) && <span>{shabbatLine(day)}</span>}
                        {soonLine(day) && <span>{soonLine(day)}</span>}
                      </p>
                    )}
                    <p className="welcome-lead">Ask me anything, about Torah or about life.</p>
                    {libraryMode === "testing" && (
                      <p className="welcome-tag">
                        <span className="tag-gray">Testing library</span> Not yet approved by the rabbinic board.
                      </p>
                    )}
                    {!connected && (
                      <p className="note">
                        This build isn’t connected to its AI model yet, so I can find sources but can’t answer. The setup
                        steps are in web/README.md.
                      </p>
                    )}
                    <div className="ways" role="group" aria-label="Ways to begin">
                      <button type="button" className="way" onClick={() => requestAnimationFrame(() => textareaRef.current?.focus())}>
                        <span className="way-icon" aria-hidden="true">
                          <ModeIcon mode="chat" />
                        </span>
                        <span className="way-t">Ask a question</span>
                        <span className="way-sub">Torah, halacha, or life</span>
                      </button>
                      <button type="button" className="way way-learn" onClick={() => openChavrusaSetup()} aria-label="Start learning with a chavrusa">
                        <span className="way-icon" aria-hidden="true">
                          <ModeIcon mode="learn" />
                        </span>
                        <span className="way-t">Learn with a chavrusa</span>
                        <span className="way-sub">A text, a line at a time</span>
                      </button>
                      {talkOk && (
                        <button type="button" className="way" disabled={!online} onClick={startTalk}>
                          <span className="way-icon" aria-hidden="true">
                            <TalkIcon />
                          </span>
                          <span className="way-t">Talk out loud</span>
                          <span className="way-sub">A conversation you can interrupt</span>
                        </button>
                      )}
                      <button type="button" className="way" onClick={() => pictureInputRef.current?.click()}>
                        <span className="way-icon" aria-hidden="true">
                          <PictureIcon />
                        </span>
                        <span className="way-t">Send a picture</span>
                        <span className="way-sub">A page of a sefer, or your notes</span>
                      </button>
                    </div>
                    {profile.remember && profile.observed.learning[0] && (
                      <button
                        type="button"
                        className="welcome-continue"
                        onClick={() => {
                          const l = profile.observed.learning[0];
                          startChavrusa({ style: l.style ?? "guide", depth: "standard", text: l.text, ...(l.at ? { at: l.at } : {}) });
                        }}
                      >
                        <span className="wc-k">Pick up where you stopped</span>
                        <span className="wc-t">
                          {profile.observed.learning[0].text}
                          {profile.observed.learning[0].at && profile.observed.learning[0].at !== profile.observed.learning[0].text ? ` · from ${shortRef(profile.observed.learning[0].at)}` : ""}
                        </span>
                      </button>
                    )}
                    {starters && starters.length > 0 && (
                      <div className="starters-box">
                        <div className="starter-tabs" role="tablist" aria-label="Questions to try">
                          {starters.map((g, i) => (
                            <button key={g.label} type="button" role="tab" aria-selected={i === starterTabNow} className="starter-tab" onClick={() => setStarterTab(i)}>
                              {g.label.replace(/^For this week$/, "This week").replace(/^Ask about Torah$/, "Torah").replace(/^Talk about life$/, "Life")}
                            </button>
                          ))}
                        </div>
                        {starters.map((g, i) =>
                          i === starterTabNow ? (
                            <div key={g.label} className={`starters${g.label === "For this week" ? " starters-today" : ""}`} role="tabpanel" aria-label={g.label}>
                              <div className="starter-grid">
                                {g.items.map((q) => (
                                  <button key={q.label} type="button" className="starter" onClick={() => void send(q.ask)}>
                                    {q.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null,
                        )}
                      </div>
                    )}
                    <p className="welcome-rav">RabbAI is an AI Torah teacher, not a rav. For your own situation, ask your rav.</p>
                    {starters && starters.length > 0 && (
                      <button
                        type="button"
                        className="link starters-more"
                        onClick={() =>
                          setStarters((cur) => {
                            // Draw again until something changes (the week's own questions stay).
                            const key = (g: StarterGroup[] | null) => JSON.stringify(g?.map((x) => x.items.map((i) => i.label)));
                            let next = pickStarters(day);
                            for (let n = 0; n < 4 && key(next) === key(cur); n++) next = pickStarters(day);
                            return next;
                          })
                        }
                      >
                        <RefreshIcon /> Other questions
                      </button>
                    )}
                  </div>
                </div>
              )}

              {messages.length > 0 && (
                <p className="chat-rav">RabbAI is an AI Torah teacher, not a rav. For your own situation, ask your rav.</p>
              )}
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={m.id} className="msg-user" data-msg={m.id} data-msg-user="">
                    <SentPictures pictures={m.pictures} count={m.pictureCount} onOpen={setPictureView} />
                    {m.text ? <div className="msg-user-text">{m.text}</div> : null}
                    {m.text && i === lastUserIndex && !pending && (
                      <button
                        type="button"
                        className="link msg-edit"
                        onClick={() => {
                          setInput(m.text ?? "");
                          requestAnimationFrame(() => {
                            const el = textareaRef.current;
                            if (!el) return;
                            el.focus();
                            el.setSelectionRange(el.value.length, el.value.length);
                          });
                        }}
                      >
                        Edit and ask again
                      </button>
                    )}
                  </div>
                ) : m.pending ? (
                  <div key={m.id} className="msg-ai bare live" data-msg={m.id} aria-busy="true">
                    <div className="body">
                      <PendingView
                        job={liveJobs[m.pending.id]}
                        at={m.pending.at}
                        onOpen={(r) => void openReader(r)}
                        spoken={spokenAt?.id === `m${m.id}` ? spokenAt : null}
                      />
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className={`msg-ai bare${m.streamed ? " settled" : ""}`} data-msg={m.id}>
                    <div className="body" data-askable="chat">
                      {m.away && m.result?.status === "answered" && <p className="away-note">Answered while you were away</p>}
                      {m.result && <SafetyCard result={m.result} />}
                      {m.result?.card?.length ? (
                        <SourceCard
                          passages={m.result.card}
                          marks={messageMarks[`m${m.id}`] ?? marksOf(m.result)}
                          spoken={spokenAt?.id === `m${m.id}` ? spokenAt : null}
                          onOpen={(r) => void openReader(r)}
                        />
                      ) : null}
                      {m.result && m.result.blocks.length > 0 && (
                        <AnswerBody
                          blocks={m.result.blocks}
                          card={m.result.card}
                          liveRead={liveReadOf(messageMarks[`m${m.id}`] ?? marksOf(m.result), spokenAt?.id === `m${m.id}` ? spokenAt : null)}
                          marks={messageMarks[`m${m.id}`] ?? marksOf(m.result)}
                          now={spokenAt?.id === `m${m.id}` ? activeMark(messageMarks[`m${m.id}`] ?? marksOf(m.result), spokenAt) : null}
                          onOpen={(r) => void openReader(r)}
                        />
                      )}
                      {m.result?.status === "answered" && m.result.practical && <RavNote />}
                      {m.result?.status === "answered" && m.result.aboutLibrary && <LibraryNote />}
                      {m.result?.status === "answered" && (
                        <TeacherNotes sources={m.result.sources ?? []} onOpen={(r) => void openReader(r)} />
                      )}
                      {m.result?.status === "answered" &&
                        (() => {
                          // An answer from the Gemara (a photo of a daf, for one) offers its page as printed.
                          const amud = m.result.blocks
                            .flatMap((b) => b.citations)
                            .filter((c) => !c.article && !c.online)
                            .map((c) => amudOf(c.ref))
                            .find((a): a is string => !!a);
                          return amud ? (
                            <p className="open-printed">
                              <button type="button" className="chip-btn" onClick={() => void openDaf(amud)}>
                                <span aria-hidden="true">▤</span> See {amud} as printed
                              </button>
                            </p>
                          ) : null;
                        })()}
                      {m.result && (m.result.status === "answered" || m.result.status === "no_key") && (
                        <OnlineNotes result={m.result} onOpen={(r) => void openReader(r)} />
                      )}
                      {m.result?.notice && <p className="note">{m.result.notice}</p>}
                      {m.result?.status === "no_key" && m.result.retrieved.length > 0 && (
                        <div className="follow">
                          {m.result.retrieved.map((r) => (
                            <button key={r} type="button" className="cite" onClick={() => void openReader(r)} title={r}>
                              {shortRef(r)}
                            </button>
                          ))}
                        </div>
                      )}
                      {(m.result?.status === "error" || m.result?.status === "refused") && i === messages.length - 1 && i > 0 && messages[i - 1].role === "user" && (
                        <div className="follow">
                          <button type="button" className="btn" disabled={pending} onClick={() => retry(m)}>
                            Try again
                          </button>
                        </div>
                      )}
                      {m.result?.status === "answered" && (
                        <div className="follow answer-tools">
                          {speechOk && (
                            <button
                              type="button"
                              className="btn quiet listen"
                              aria-pressed={speakingId === `m${m.id}`}
                              onClick={() => listen(`m${m.id}`, spokenAnswer(m.result))}
                            >
                              <SpeakerIcon /> {speakingId === `m${m.id}` ? "Stop" : "Listen"}
                            </button>
                          )}
                          <CopyAnswer text={answerToShare(m.result, libraryMode === "testing")} />
                          <ShareAnswer text={answerToShare(m.result, libraryMode === "testing")} />
                          {i === messages.length - 1 && (
                            <span className="follow-more">
                              <button type="button" className="btn quiet" disabled={pending} onClick={() => { notice({ kind: "deeper" }); void send("Tell me more.", { deep: true }); }}>
                                Tell me more
                              </button>
                              <button type="button" className="btn quiet" disabled={pending} onClick={() => { notice({ kind: "simpler" }); void send("Can you say that more simply?"); }}>
                                Say it more simply
                              </button>
                              {!chavrusa && (
                                <button
                                  type="button"
                                  className="btn quiet"
                                  disabled={pending}
                                  onClick={() =>
                                    void send("Quiz me on what you just explained: ask me two or three short questions, one at a time, and tell me how I did.")
                                  }
                                >
                                  Quiz me on this
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                      {m.result?.status === "answered" && account.state.feedback && (
                        <AnswerFeedback
                          question={questionBefore(messages, m.id)}
                          answer={plainAnswer(m.result)}
                          sources={m.result.sources.map((s) => s.ref)}
                        />
                      )}
                    </div>
                  </div>
                ),
              )}
              <div ref={tailRef} className="tail" style={tailRoom ? { minHeight: tailRoom } : undefined} aria-hidden="true" />
            </div>
          ) : mode === "daven" ? null : learnView === "articles" ? (
            <ArticleShelves shelves={articleShelves} onRead={(ref) => void openReader(ref)} onBack={() => setLearnView("library")} />
          ) : learnView === "words" ? (
            <div className="thread learn-screen">
              <button type="button" className="link back-link" onClick={() => setLearnView("library")}>
                ← The library
              </button>
              <h2 className="screen-h">My words</h2>
              {myWords.length === 0 ? (
                <p className="muted">
                  Words you save while reading appear here, so you can review them. Tap a word in any text, then “Save to My
                  words”. They stay on this device.
                </p>
              ) : (
                <>
                  <p className="muted">
                    {myWords.length} {myWords.length === 1 ? "word" : "words"}, saved on this device. Try to remember each one
                    before you show its meaning.
                  </p>
                  <ul className="my-words">
                    {myWords.map((w) => (
                      <li key={w.form}>
                        <span className="he" lang="he">
                          {w.form}
                        </span>
                        {revealed.has(w.form) ? (
                          <span className="meaning">
                            {w.gloss ?? "Ask RabbAI about this word"}
                            {w.root ? ` · root ${w.root}${w.rootMeaning ? ` (${w.rootMeaning})` : ""}` : ""}
                          </span>
                        ) : (
                          <button type="button" className="link" onClick={() => setRevealed((prev) => new Set(prev).add(w.form))}>
                            Show meaning
                          </button>
                        )}
                        <span className="row-actions">
                          <button type="button" className="link" onClick={() => void openReader(w.ref)}>
                            {w.ref}
                          </button>
                          <button type="button" className="link" aria-label={`Remove ${w.form}`} onClick={() => removeWord(w.form)}>
                            Remove
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : learnView === "phrases" ? (
            <div className="thread learn-screen">
              <button type="button" className="link back-link" onClick={() => setLearnView("library")}>
                ← The library
              </button>
              <h2 className="screen-h">The Gemara’s key words</h2>
              <p className="muted">
                A handful of Aramaic phrases carry the give and take of every sugya. Learn these and you can follow the argument
                on any page.
              </p>
              <ul className="glossary">
                {glossary.map((g) => (
                  <li key={g.id}>
                    <span className="he" lang="he">
                      {g.phrase}
                    </span>
                    <span>
                      <strong>
                        {g.meaning}
                        {/[.?!]$/.test(g.meaning) ? "" : "."}
                      </strong>{" "}
                      {g.role}
                    </span>
                    {g.occurrences.length > 0 && (
                      <button type="button" className="cite" onClick={() => void openReader(g.occurrences[0])}>
                        See it in {shortRef(g.occurrences[0])}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="fine-left">Written by the RabbAI team for testing, until approved dictionaries replace these notes.</p>
            </div>
          ) : (
            <div className="thread learn-home">
              {sections === null ? (
                <div className="shelf-skeleton" aria-busy="true">
                  <p className="sr-only">Opening the library</p>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="sk-shelf" aria-hidden="true">
                      <span className="sk-line short" />
                      <div className="sk-row">
                        <span className="sk-card" />
                        <span className="sk-card" />
                        <span className="sk-card" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sections.length === 0 ? (
                <p className="note">No texts are in the library yet. They appear here once the rabbinic board approves them.</p>
              ) : (
                <LibraryShelves
                  books={catalogBooks}
                  label={libraryMode === "testing" ? TESTING_LABEL : undefined}
                  recent={recent}
                  pending={false}
                  onRead={(ref) => (siddurOf(ref) ? openDaven(ref) : void openReader(ref))}
                  onDaven={(ref) => openDaven(ref)}
                  onPage={(ref) => void openDaf(ref)}
                  day={day}
                  today={day && (day.daf?.ref || day.parsha?.ref) && (
                <section className="learn-today-wrap" aria-labelledby="lib-h-today">
                  <h2 id="lib-h-today" className="lib-h">
                    Today&apos;s learning
                  </h2>
                  <div className="learn-today" role="group" aria-label="Today">
                  {day.daf?.ref && (
                    <button type="button" className="learn-today-item" onClick={() => void openDaf(day.daf!.ref!)}>
                      <span className="label-sm">Today&apos;s Daf Yomi</span>
                      <strong>{day.daf.text}</strong>
                      <span className="muted">Open the page as printed</span>
                    </button>
                  )}
                  {day.parsha?.ref && !day.parsha.holiday && (
                    <button type="button" className="learn-today-item" onClick={() => void openReader(day.parsha!.ref!)}>
                      <span className="label-sm">This week&apos;s parsha</span>
                      <strong>{day.parsha.name}</strong>
                      <span className="muted">Read it with the commentaries</span>
                    </button>
                  )}
                </div>
                </section>
              )}
                  onPlace={() => setPlaceOpen(true)}
                  onLearn={(title) =>
                    void send(
                      `Let's learn ${title} together. Start at the beginning, one line at a time, and ask me what I think before you explain.`,
                      { fresh: true },
                    )
                  }
                  extras={
                    <div className="lib-rows">
                      <button type="button" className="lib-row" onClick={() => setLearnView("words")}>
                        <span className="lr-t">My words</span>
                        <span className="lr-sub">
                          {myWords.length ? `${myWords.length} saved · Review` : "Words you save while reading"}
                        </span>
                        <span className="lr-chev" aria-hidden="true">
                          ›
                        </span>
                      </button>
                      {glossary.length > 0 && (
                        <button type="button" className="lib-row" onClick={() => setLearnView("phrases")}>
                          <span className="lr-t">The Gemara’s key words</span>
                          <span className="lr-sub">{glossary.length} phrases that carry every sugya</span>
                          <span className="lr-chev" aria-hidden="true">
                            ›
                          </span>
                        </button>
                      )}
                      {articleShelves.length > 0 && (
                        <button type="button" className="lib-row" onClick={() => setLearnView("articles")}>
                          <span className="lr-t">Articles</span>
                          <span className="lr-sub">
                            {articleShelves.reduce((n, a) => n + a.count, 0).toLocaleString()} articles from{" "}
                            {[...new Set(articleShelves.map((a) => a.site))].join(" and ")}
                          </span>
                          <span className="lr-chev" aria-hidden="true">
                            ›
                          </span>
                        </button>
                      )}
                    </div>
                  }
                />
              )}
            </div>
          )}
          {mode === "chat" && !(chatsOpen && !chatsColumn) && awayFromLatest && messages.length > 0 && (
            <div className="jump-wrap">
              <button type="button" className="jump-latest" onClick={toLatest}>
                <span aria-hidden="true">↓</span> {pending ? "Back to the answer" : "Back to the latest"}
              </button>
            </div>
          )}
        </div>

        {mode === "chat" && (!chatsOpen || chatsColumn) && (
          <div className="composer">
            {chavrusa && (
              <div className="chav-bar" role="group" aria-label="Your chavrusa">
                <div className="chav-bar-row">
                  <span className="chav-badge">Chavrusa</span>
                  <span className="chav-what">
                    {STYLE_INFO[chavrusa.style].name}
                    {chavrusa.text ? ` · ${chavrusa.text}` : ""}
                    {chavrusa.at && chavrusa.text && chavrusa.at.startsWith(`${chavrusa.text}:`)
                      ? `, line ${chavrusa.at.slice(chavrusa.text.length + 1)}${sessionLines?.text === chavrusa.text ? ` of ${sessionLines.n}` : ""}`
                      : ""}
                    <span className="chav-depth-note"> · {DEPTH_INFO[chavrusa.depth].name}</span>
                  </span>
                  <span className="chav-bar-btns">
                    {amudOf(chavrusa.text) && (
                      <button
                        type="button"
                        className="chav-page-btn"
                        aria-label={`Open ${chavrusa.text} as printed`}
                        title="Open the page"
                        onClick={() => void openDaf(chavrusa.text!)}
                      >
                        ▤
                      </button>
                    )}
                    <button type="button" className="link" onClick={() => openChavrusaSetup(chavrusa)}>
                      Change
                    </button>
                  </span>
                </div>
                {!pending && !talkOn && messages.length > 0 && (
                  <div className="chav-replies">
                    {quickReplies(chavrusa).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="chip-btn"
                        onClick={() => {
                          if (r.endsWith("…")) {
                            setInput(`${r.slice(0, -1)}: `);
                            textareaRef.current?.focus();
                          } else void send(r);
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {talkOn && <TalkPanel talk={talk} chavrusa={!!chavrusa} onEnd={endTalk} />}
            {!talkOn && (attached.length > 0 || preparing > 0) && (
              <ul className="attach-row" aria-label="Pictures to send">
                {attached.map((a, i) => (
                  <li key={a.key} className="attach">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.preview.src} alt={`Picture ${i + 1}`} width={a.preview.w} height={a.preview.h} />
                    <button
                      type="button"
                      className="attach-x"
                      aria-label={`Remove picture ${i + 1}`}
                      onClick={() => setAttached((prev) => prev.filter((x) => x.key !== a.key))}
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {Array.from({ length: preparing }, (_, i) => (
                  <li key={`p${i}`} className="attach loading" aria-label="Getting a picture ready" />
                ))}
              </ul>
            )}
            {!talkOn && (
            <form onSubmit={onSubmit}>
              <input
                ref={pictureInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void addPictures(files);
                }}
              />
              <button
                type="button"
                className="pic-btn"
                aria-label="Add a picture"
                title="Add a picture"
                disabled={attached.length + preparing >= PICTURE_LIMITS.perQuestion}
                onClick={() => pictureInputRef.current?.click()}
              >
                <PictureIcon />
              </button>
              {dictation.supported && (
                <button
                  type="button"
                  className={`mic${listening ? " on" : ""}`}
                  aria-pressed={listening}
                  aria-label={listening ? "Stop listening" : "Speak your question"}
                  title={listening ? "Stop listening" : "Speak your question"}
                  onClick={toggleMic}
                >
                  <MicIcon />
                </button>
              )}
              <label htmlFor="ask-input" className="sr-only">
                Ask RabbAI
              </label>
              <textarea
                id="ask-input"
                ref={textareaRef}
                rows={1}
                onFocus={() => warmUp(chavrusaRef.current ? "talk" : "ask")}
                value={input}
                onChange={(e) => onComposerChange(e.target.value)}
                onKeyDown={onComposerKey}
                onPaste={(e) => {
                  const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
                  if (!files.length) return;
                  e.preventDefault();
                  void addPictures(files);
                }}
                placeholder={
                  listening
                    ? "Listening… speak your question"
                    : attached.length
                      ? attached.length > 1
                        ? "Ask about the pictures…"
                        : "Ask about the picture…"
                      : chavrusa
                        ? "Answer, or ask your chavrusa…"
                        : "Ask anything…"
                }
                maxLength={2000}
                autoComplete="off"
              />
              {input.length > 40 && !pending && (
                <button
                  type="button"
                  className="composer-clear"
                  aria-label="Clear the question box"
                  title="Clear"
                  onClick={() => {
                    if (listening) dictation.cancel();
                    setInput("");
                    textareaRef.current?.focus();
                  }}
                >
                  ×
                </button>
              )}
              {/* Two different buttons (keys), so the click that stops an answer can never also send the
                  question again: a reused button would become "submit" while the click is handled. */}
              {pending ? (
                <button
                  key="stop"
                  type="button"
                  className="send stop"
                  aria-label="Stop the answer"
                  onClick={(e) => {
                    e.preventDefault();
                    stopAnswer();
                  }}
                >
                  <span className="stop-sq" aria-hidden="true" /> Stop
                </button>
              ) : talkOk && !input.trim() && !attached.length && !preparing ? (
                <button
                  key="talk"
                  type="button"
                  className="send talk-start"
                  disabled={!online}
                  aria-label="Talk with RabbAI out loud"
                  title={online ? "Talk with RabbAI out loud" : "No connection right now"}
                  onClick={startTalk}
                >
                  <TalkIcon /> Talk
                </button>
              ) : (
                <button
                  key="ask"
                  className="send"
                  type="submit"
                  disabled={!online || preparing > 0 || fitting || (!input.trim() && !attached.length)}
                  title={online ? undefined : "No connection right now"}
                >
                  Ask
                </button>
              )}
            </form>
            )}
            {!online && (
              <p className="voice-note offline-note" role="status">
                You’re offline. Your question stays here, and Ask works again when the connection is back.
              </p>
            )}
            {composerNote && !listening && (
              <p className="voice-note" role="status">
                {composerNote}
              </p>
            )}
            {!talkOn && (dictation.error || listening) && (
              <p className="voice-note" role={dictation.error ? "alert" : "status"}>
                {dictation.error ?? "Listening. Tap the microphone when you’re done, then press Ask."}
              </p>
            )}
            <p className="fine">RabbAI is an AI Torah teacher, not a rav. For your own situation, ask your rav.</p>
          </div>
        )}
          </div>
        </div>
      </section>

      {pictureView && (
        <div className="pic-view" role="dialog" aria-modal="true" aria-label="Picture you sent" onClick={() => setPictureView(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(() => {
              const full = sentPictures.current.get(pictureView.src);
              return full ? `data:${full.mediaType};base64,${full.data}` : pictureView.src;
            })()}
            alt="The picture you sent"
          />
          <button type="button" className="pic-view-x" aria-label="Close the picture" autoFocus onClick={() => setPictureView(null)}>
            ✕
          </button>
        </div>
      )}

      {dafRef && renderDafView()}

      {readerOpen && <button type="button" className="scrim" aria-label="Close the text" onClick={closeReader} tabIndex={-1} />}

      <aside
        className={`reader${readerOpen ? " open" : ""}${barHidden && !readerMenu ? " bar-hidden" : ""}`}
        aria-label="Source reader"
        style={headHeight ? ({ ["--head-h" as string]: `${headHeight}px` } as CSSProperties) : undefined}
      >
        {!readerRef ? null : (
          <>
            <div className="reader-head" ref={readerHeadRef}>
              <div className="reader-bar">
                {wide && mode === "chat" ? (
                  <button ref={closeRef} type="button" className="rb-icon" aria-label="Close the text" onClick={closeReader}>
                    ✕
                  </button>
                ) : (
                  <button
                    ref={closeRef}
                    type="button"
                    className="rb-back"
                    aria-label={mode === "learn" ? "Back to the library" : "Back to the chat"}
                    onClick={closeReader}
                  >
                    <span aria-hidden="true">←</span>
                    <span className="rb-back-label">{mode === "learn" ? "Library" : "Chat"}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="rb-title"
                  aria-expanded={readerMenu === "contents"}
                  aria-label={`${reader?.section ?? readerRef}: contents`}
                  disabled={!reader?.book}
                  onClick={openContents}
                >
                  {(() => {
                    // A long section name ("Siddur Ashkenaz, Weekday, Shacharit, Preparatory
                    // Prayers, Modeh Ani") shows its last part as the title and the rest small.
                    const parts = reader?.book && reader.section.startsWith(`${reader.book}, `) ? reader.section.slice(reader.book.length + 2).split(", ") : [];
                    if (parts.length >= 2 && !reader?.work.article)
                      return (
                        <>
                          <span className="rb-crumb">{[reader!.book, ...parts.slice(0, -1)].join(" · ")}</span>
                          <span className="rb-t">{parts[parts.length - 1]}</span>
                        </>
                      );
                    return (
                      <span className="rb-t">
                        {/* An article's site is named in the credit line below, so the bar shows just its name. */}
                        {reader?.work.article && reader.section.startsWith(`${reader.work.article.site}, `)
                          ? reader.section.slice(reader.work.article.site.length + 2)
                          : (reader?.section ?? readerRef)}
                      </span>
                    );
                  })()}
                  {(() => {
                    if (!reader?.sectionHe || reader.sectionHe === reader.section) return null;
                    // With a long English name shortened to its last part, the Hebrew is shortened the
                    // same way, and left out when it says the same thing.
                    const he = reader.sectionHe.split(/,\s*/);
                    const en = reader.section.split(", ");
                    const short = reader.book && en.length >= 3 && he.length === en.length;
                    const text = short ? he[he.length - 1] : reader.sectionHe;
                    if (short && text === en[en.length - 1]) return null;
                    return (
                      <span className="he" lang="he">
                        {text}
                      </span>
                    );
                  })()}
                  {reader?.book && (
                    <span className="rb-caret" aria-hidden="true">
                      ▾
                    </span>
                  )}
                </button>
                <div className="rb-nav">
                  <button
                    type="button"
                    className="rb-icon"
                    disabled={!reader?.prev || readerLoading}
                    aria-label={reader?.prev ? `Previous: ${reader.prev}` : "Previous"}
                    onClick={() => reader?.prev && void openReader(reader.prev)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="rb-icon"
                    disabled={!reader?.next || readerLoading}
                    aria-label={reader?.next ? `Next: ${reader.next}` : "Next"}
                    onClick={() => reader?.next && void openReader(reader.next)}
                  >
                    ›
                  </button>
                </div>
                {reader?.libraryMode === "testing" && reader.work.id === "talmud-bavli" && parseAmud(reader.section) && (
                  <button type="button" className="rb-btn" onClick={() => void openDaf(reader.section)} title="See this page as printed">
                    <span aria-hidden="true">▤</span> Page
                  </button>
                )}
                {readerBilingual && (
                  <button
                    type="button"
                    className={`rb-icon rb-split${splitOn ? " on" : ""}`}
                    aria-pressed={splitOn}
                    aria-label="Hebrew above, English below, scrolling together"
                    title="Hebrew above, English below"
                    onClick={() => chooseSplit(!split)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                      <rect x="3" y="2.5" width="14" height="6.5" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                      <rect x="3" y="11" width="14" height="6.5" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className="rb-btn"
                  aria-expanded={readerMenu === "aa"}
                  aria-label="Display: language and commentaries"
                  onClick={() => setReaderMenu(readerMenu === "aa" ? null : "aa")}
                >
                  Aa
                </button>
              </div>
              {reader?.work.article && (
                <p className="reader-label article-credit">
                  {reader.work.article.author ? `By ${reader.work.article.author} · ` : ""}
                  {reader.work.article.site}
                  {/^\d{4}/.test(reader.work.article.published ?? "") ? `, ${reader.work.article.published!.slice(0, 4)}` : ""}
                  {" · "}
                  <a href={reader.work.article.url} target="_blank" rel="noopener noreferrer">
                    Read it on {reader.work.article.site}
                  </a>
                </p>
              )}
              {reader && (
                <p className="reader-label">
                  {reader.libraryMode === "testing" ? (
                    <>
                      <span className="tag-gray">Testing library</span> Not yet approved by the rabbinic board.
                    </>
                  ) : reader.libraryMode === "development" ? (
                    <>
                      <span className="tag-gray">Development texts</span> Not an approved edition.
                    </>
                  ) : (
                    <>{reader.work.title}</>
                  )}{" "}
                  <button
                    type="button"
                    className="link"
                    aria-expanded={readerMenu === "about"}
                    onClick={() => setReaderMenu(readerMenu === "about" ? null : "about")}
                  >
                    Editions
                  </button>
                  {!reader.work.article && (
                    <>
                      {" · "}
                      <button type="button" className="link" onClick={() => openChavrusaSetup({ text: reader.section })}>
                        Learn this with a chavrusa
                      </button>
                    </>
                  )}
                  {reader.book && siddurTitles.includes(reader.book) && (
                    <>
                      {" · "}
                      <button type="button" className="link" onClick={() => openDaven(reader.section)}>
                        Daven from this
                      </button>
                    </>
                  )}
                </p>
              )}
              {reader && readerMenu === "about" && (
                <div className="rb-menu">
                  <p>
                    {reader.libraryMode === "testing" ? TESTING_LABEL : reader.libraryMode === "development" ? DEV_NOTE : null}
                  </p>
                  {reader.work.article ? (
                    <p>
                      An article from {reader.work.article.site}&rsquo;s website, used by its written permission for private study only.
                      {reader.work.article.section ? ` Its section there: ${reader.work.article.section}.` : ""}
                    </p>
                  ) : (
                    <p>
                      {reader.work.edition ? `Hebrew: ${reader.work.edition}. ` : ""}English: {reader.work.translation.by}.
                    </p>
                  )}
                </div>
              )}
              {reader && readerMenu === "aa" && (
                <div className="rb-menu" role="group" aria-label="Display">
                  <p className="label-sm">Language</p>
                  <div className="seg" role="group" aria-label="Language">
                    <button type="button" aria-pressed={lang === "he"} onClick={() => chooseLang("he")} lang="he">
                      עברית
                    </button>
                    <button type="button" aria-pressed={lang === "both"} onClick={() => chooseLang("both")}>
                      Both
                    </button>
                    <button type="button" aria-pressed={lang === "en"} onClick={() => chooseLang("en")}>
                      English
                    </button>
                  </div>
                  {readerBilingual && (
                    <>
                      <p className="label-sm">Layout</p>
                      <div className="seg" role="group" aria-label="Layout">
                        <button type="button" aria-pressed={!splitOn} onClick={() => chooseSplit(false)}>
                          One column
                        </button>
                        <button type="button" aria-pressed={splitOn} onClick={() => chooseSplit(true)}>
                          Two panes
                        </button>
                      </div>
                      <p className="fine-left">Two panes: the Hebrew above and the English below. Scroll either one, and the other keeps your place.</p>
                    </>
                  )}
                  {(() => {
                    const names = [...new Set(reader.lines.flatMap((l) => l.commentaries.map((c) => c.author || c.label)))].sort((a, b) => a.localeCompare(b));
                    return names.length ? (
                      <>
                        <p className="label-sm">Show under each line</p>
                        <div className="rb-checks">
                          {names.map((n) => (
                            <label key={n} className="rb-check">
                              <input type="checkbox" checked={inlineComms.includes(n)} onChange={() => toggleInline(n)} />
                              {n}
                            </label>
                          ))}
                        </div>
                        <p className="fine-left">The others fold into a count on each line. Tap the count to read them.</p>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
              {reader && readerMenu === "contents" && (
                <div className="rb-menu rb-toc">
                  <p className="label-sm">{reader.book ?? reader.section}</p>
                  <ContentsGrid book={reader.book ?? ""} current={reader.section} onOpen={(sec) => void openReader(sec)} />
                </div>
              )}
              {reader && readerHint && (
                <p className="reader-hint">
                  Tap a word for its meaning, or a line to ask about it.{" "}
                  <button type="button" className="link" onClick={dismissHint}>
                    Got it
                  </button>
                </p>
              )}
            </div>
            <div
              className={`reader-body${splitOn ? " split" : ` lang-${lang}`}${selected && !wide ? " with-sheet" : ""}`}
              ref={readerBodyRef}
              data-askable="reader"
            >
              {readerLoading ? (
                <p className="reader-state">
                  Opening the text<span className="dots" />
                </p>
              ) : readerError ? (
                <p className="reader-state">{readerError}</p>
              ) : reader && splitOn ? (
                <>
                  <CautionBanner source={reader.lines[0]?.source} />
                  {/* Two panes: the Hebrew above, the English below, each line in both and in the
                      same order, kept at the same place as either is scrolled (use-linked-scroll). */}
                  <div className="pane pane-he lang-he" ref={paneHeRef} aria-label="Hebrew">
                    {reader.lines.map((line, i) => (
                      <div key={line.ref} data-i={i}>
                        {renderLine(line, false, undefined, { noAnswer: true })}
                        {line.commentaries.length > 0 && (
                          <button
                            type="button"
                            className="comm-count"
                            aria-label={`${line.commentaries.length === 1 ? "One comment" : `${line.commentaries.length} comments`} on ${line.label}`}
                            onClick={() => openComments(line.ref)}
                          >
                            {line.commentaries.length === 1 ? "1 comment" : `${line.commentaries.length} comments`} <span aria-hidden="true">›</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="pane-divider" aria-hidden="true" />
                  <div className="pane pane-en lang-en" ref={paneEnRef} aria-label="English">
                    {reader.lines.map((line, i) => (
                      <div key={line.ref} data-i={i}>
                        {line.en.trim() ? renderLine(line, false) : <p className="pane-none">No English for this line.</p>}
                      </div>
                    ))}
                    {continueButton()}
                  </div>
                </>
              ) : reader ? (
                <>
                <CautionBanner source={reader.lines[0]?.source} />
                {reader.lines.map((line) => {
                  // Comments fold into a count, except those the person chose to show, the one a
                  // source pointed at, and the one open in the card.
                  const shown = line.commentaries.filter(
                    (c) => inlineComms.includes(c.author || c.label) || c.ref === reader.focus || c.ref === selected,
                  );
                  const folded = line.commentaries.length - shown.length;
                  return (
                    <div key={line.ref}>
                      {renderLine(line, false)}
                      {folded > 0 && (
                        <button
                          type="button"
                          className="comm-count"
                          aria-label={`${folded === 1 ? "One comment" : `${folded} comments`} on ${line.label}`}
                          onClick={() => openComments(line.ref)}
                        >
                          {folded === 1 ? "1 comment" : `${folded} comments`} <span aria-hidden="true">›</span>
                        </button>
                      )}
                      {shown.length > 0 && <div className="comms">{shown.map((c) => renderLine(c, true, c.author || c.label))}</div>}
                    </div>
                  );
                })}
                {continueButton()}
                </>
              ) : null}
            </div>
            {renderReaderCard()}
          </>
        )}
      </aside>

      {highlight && (
        <button
          type="button"
          className="ask-highlight"
          style={{ top: highlight.top, left: highlight.left }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={askAboutHighlight}
        >
          Ask about this
        </button>
      )}

      {shortcutsOpen && (
        <div className="about-view" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" onClick={() => setShortcutsOpen(false)}>
          <div className="about-card shortcuts-card" onClick={(e) => e.stopPropagation()}>
            <div className="about-head">
              <h2 id="shortcuts-title">Keyboard shortcuts</h2>
              <button type="button" className="icon-btn" aria-label="Close" autoFocus onClick={() => setShortcutsOpen(false)}>
                ✕
              </button>
            </div>
            <dl className="shortcuts">
              <dt><kbd>/</kbd></dt><dd>Go to the question box</dd>
              <dt><kbd>Enter</kbd></dt><dd>Ask</dd>
              <dt><kbd>Shift</kbd> + <kbd>Enter</kbd></dt><dd>A new line in your question</dd>
              <dt><kbd>↑</kbd></dt><dd>In an empty box, bring back your last question</dd>
              <dt><kbd>Ctrl</kbd> or <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd></dt><dd>A new chat</dd>
              <dt><kbd>←</kbd> <kbd>→</kbd></dt><dd>The next or previous word in a word&apos;s card, or page as printed</dd>
              <dt><kbd>Esc</kbd></dt><dd>Close a card, a menu or the page</dd>
              <dt><kbd>Alt</kbd> + <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></dt><dd>Chat, Learn, Daven (or the arrow keys on the tabs)</dd>
              <dt><kbd>?</kbd></dt><dd>This list</dd>
            </dl>
          </div>
        </div>
      )}
      {aboutOpen && (
        <AboutYou
          profile={profile}
          signedIn={signedIn}
          onAccount={
            accountsOn
              ? () => {
                  setAboutOpen(false);
                  setAccountOpen(true);
                }
              : undefined
          }
          onContinue={(l) => {
            setAboutOpen(false);
            startChavrusa({ style: l.style ?? "guide", depth: "standard", text: l.text, ...(l.at ? { at: l.at } : {}) });
          }}
          onStated={(stated) => keepProfile(withStated(profileRef.current, stated))}
          onRemember={(on) => keepProfile(withRemember(profileRef.current, on))}
          onForgetNoticed={() => keepProfile(forgetNoticed(profileRef.current))}
          onForgetAll={() => keepProfile(forgetAll(profileRef.current))}
          onClose={() => setAboutOpen(false)}
        />
      )}

      {placeOpen && <YourPlace settings={placeSettings} onChange={changePlace} onClose={() => setPlaceOpen(false)} />}

      {chavrusaSetup && (
        <ChavrusaSetup
          initial={chavrusaSetup.initial}
          choices={chavrusaSetup.choices}
          onStart={(session) => {
            // Changing the way mid-session keeps the chat; otherwise a new chat starts.
            if (chavrusa && messages.length && session.text === chavrusa.text) {
              setChavrusaSetup(null);
              setChatChavrusa({ ...session, ...(chavrusa.at ? { at: chavrusa.at } : {}) });
            } else startChavrusa(session);
          }}
          onClose={() => setChavrusaSetup(null)}
          onEnd={
            chavrusa && messages.length
              ? () => {
                  setChavrusaSetup(null);
                  setChatChavrusa(null);
                }
              : undefined
          }
        />
      )}

      {accountOpen && <AccountDialog state={account.state} api={account.api} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
