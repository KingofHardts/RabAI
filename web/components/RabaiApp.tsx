"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { AskResult, LineAction } from "@/lib/engine/answer";
import type { AnswerBlock } from "@/lib/engine/citations";
import type { LibraryMode } from "@/lib/library";
import { TESTING_LABEL } from "@/lib/library/testing-config";
import type { Token } from "@/lib/library/language";
import type { Passage, TranslationStatus, Work } from "@/lib/library/types";
import type { PhraseInfo, WordStudy } from "@/lib/library/word-study";
import type { WordEntry } from "@/lib/library/word-parts";
import {
  addRecent,
  categoriesFor,
  CHATS_KEY,
  cleanCategory,
  groupByCategory,
  parseChats,
  parseRecent,
  RECENT_KEY,
  serializeChats,
  upsertChat,
  whenLabel,
  type RecentReading,
  type SavedChat,
} from "@/lib/saved-chats";
import { canSpeak, speak, stopSpeaking, unlockSpeech, useDictation } from "./voice";
import DafPage from "./DafPage";
import DafPrinted from "./DafPrinted";
import LibraryShelves from "./LibraryShelves";
import ContentsGrid from "./ContentsGrid";
import DafColumn from "./DafColumn";
import { usePinchZoom } from "./use-pinch-zoom";
import WordCard, { DictRows, Folded, useWide, type CardTab, type CardTabInfo } from "./WordCard";
import type { CatalogBook } from "@/lib/library/catalog";
import { parseAmud, pieceWords, withoutPoints, type DafData } from "@/lib/library/daf";
import { OUTLINE_KINDS, OUTLINE_LABELS, type OutlineKind, type OutlineLine } from "@/lib/engine/outline";
import { readKeptTranslation, type GlossRow, type Translation } from "@/lib/engine/gloss";

// ---------------------------------------------------------------------------
// Types the screens use

interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text?: string;
  result?: AskResult;
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
  /** What RabAI is doing, while it works. */
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

type Mode = "chat" | "learn";

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
    ? `${a.form} is a word cut short, or a number written in letters. It isn't a word of its own, so the dictionaries don't list it. RabAI can say what it stands for here.`
    : `${a.form} is a short form (an abbreviation) for several words, not a word of its own, so it isn't looked up in the dictionaries. RabAI can say what it stands for here.`;
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

/** chatTools holds a chat's id while its menu is open in the list; this, for the open chat's own menu. */
const HEAD_TOOLS = "__head__";

const STARTERS: Array<{ label: string; items: string[] }> = [
  {
    label: "Ask about Torah",
    items: [
      "Why does the Torah start with Creation?",
      "Why do we add a Chanukah light each night?",
      "What did Hillel say about the whole Torah on one foot?",
      "Help me read the first words of the Torah",
    ],
  },
  { label: "Talk about life", items: ["I had a hard day. Can we talk?", "My friend and I had a falling out. How do I make it right?"] },
];

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
/** RabAI's outline of each page, kept so the same page is never outlined twice. */
const OUTLINE_KEY = "rabai_outline:";
/** RabAI's translations, kept on the device so the same passage is never translated twice. */
const TRANSLATIONS_KEY = "rabai_translations";
const MAX_KEPT_TRANSLATIONS = 60;
const TRANSLATE_FAILED = "RabAI couldn't translate this just now. Please try again.";
const MARK_COLORS = [
  { id: "yellow", label: "Yellow" },
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "pink", label: "Pink" },
];
const MAX_SAVED_WORDS = 500;

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
            <span className="gl-en" dir="ltr" lang="en" title={r.en === null ? "RabAI gave no English for this word." : undefined}>
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

function plainAnswer(result: AskResult | undefined): string {
  return result?.blocks.map((b) => b.text).join("") ?? "";
}

/** The word without punctuation at either end, for saving and asking. */
/** A tapped word without the punctuation around it. A geresh right after a letter (ר׳, וכו׳) is part of the word. */
function bareWord(text: string): string {
  const t = text.replace(/^[\s"'״׳“”‘’()[\]{}.,;:!?׃־–—…]+|[\s"'״“”‘’()[\]{}.,;:!?׃־–—…]+$/g, "");
  return /[א-ת\u0591-\u05C7]['׳]$/.test(t) ? t : t.replace(/['׳]+$/, "");
}

interface LiveHooks {
  onStatus?: (text: string) => void;
  onText?: (delta: string) => void;
}

/**
 * Ask RabAI. The answer arrives live: progress notes, then the text as it is written, then the
 * checked answer with its sources.
 */
async function postAsk(body: Record<string, unknown>, hooks: LiveHooks = {}): Promise<AskResult> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!(res.headers.get("content-type") ?? "").includes("ndjson") || !res.body) {
    const json = (await res.json().catch(() => null)) as (AskResult & { error?: string }) | null;
    if (!json) throw new Error("RabAI didn't answer. Please try again.");
    if (json.error && !json.status) throw new Error(json.error);
    return json;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AskResult | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    let event: { type?: string; text?: string; result?: AskResult };
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type === "status" && event.text) hooks.onStatus?.(event.text);
    else if (event.type === "text" && event.text) hooks.onText?.(event.text);
    else if (event.type === "done" && event.result) result = event.result;
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
  if (!result) throw new Error("The answer was cut off. Please try again.");
  return result;
}

// ---------------------------------------------------------------------------
// Rendering an answer: paragraphs of prose with source buttons where they are cited

function AnswerBody({ blocks, onOpen }: { blocks: AnswerBlock[]; onOpen: (ref: string) => void }) {
  const paragraphs: ReactNode[][] = [[]];
  let key = 0;
  for (const block of blocks) {
    const pieces = block.text.split(/\n{2,}/);
    pieces.forEach((piece, i) => {
      if (i > 0) paragraphs.push([]);
      const current = paragraphs[paragraphs.length - 1];
      piece.split("\n").forEach((line, j) => {
        if (j > 0) current.push(<br key={`br${key++}`} />);
        if (line) current.push(<span key={`t${key++}`}>{line}</span>);
      });
    });
    const current = paragraphs[paragraphs.length - 1];
    for (const c of block.citations) {
      current.push(" ");
      current.push(
        <button key={`c${key++}`} type="button" className="cite" onClick={() => onOpen(c.ref)} title={`Open ${c.ref}`}>
          {c.ref}
        </button>,
      );
    }
  }
  return (
    <>
      {paragraphs
        .filter((p) => p.some((n) => typeof n !== "string" || n.trim()))
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </>
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

/** The answer while it is being written: plain paragraphs and a blinking caret. */
function LiveText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>
          {p}
          {i === paragraphs.length - 1 && <span className="caret" aria-hidden="true" />}
        </p>
      ))}
    </>
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

function ChatsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v10H9l-5 4z" />
      <path d="M8 9h8M8 12h5" />
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
  const [pending, setPending] = useState(false);
  /** The answer being written right now, shown live. */
  const [live, setLive] = useState<{ status: string; text: string } | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [speechOk, setSpeechOk] = useState(false);
  /** True while the words in the box came from the microphone. */
  const spokenInput = useRef(false);
  const dictation = useDictation(
    useCallback((text: string) => {
      setInput(text);
      spokenInput.current = true;
    }, []),
  );
  const listening = dictation.state === "listening";
  const [growth, setGrowth] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Learn's screens: the library, My words, or the Gemara's key words. */
  const [learnView, setLearnView] = useState<"library" | "words" | "phrases">("library");
  const [lang, setLang] = useState<Lang>("both");

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
  const [glossary, setGlossary] = useState<PhraseInfo[]>([]);
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
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<string, { loading?: boolean; error?: string; result?: Translation }>>({});
  const [wordByWord, setWordByWord] = useState<Record<string, boolean>>({});

  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);
  const readerHeadRef = useRef<HTMLDivElement>(null);
  /** On a phone the reader's bar slides away while reading down, and comes back on the way up. */
  const [barHidden, setBarHidden] = useState(false);
  const [headHeight, setHeadHeight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Settings and saved words live on this device only.
  useEffect(() => {
    setGrowth(readStored("rabai_growth", ["on", "off"] as const, "off") === "on");
    setLang(readStored("rabai_lang", ["he", "both", "en"] as const, "both"));
    setReaderHint(readStored("rabai_reader_hint", ["seen", "new"] as const, "new") === "new");
    try {
      const kept = JSON.parse(window.localStorage.getItem("rabai_inline_comms") ?? "[]");
      if (Array.isArray(kept)) setInlineComms(kept.filter((x): x is string => typeof x === "string").slice(0, 20));
    } catch {
      /* nothing kept */
    }
    setMode(readStored("rabai_mode", ["chat", "learn"] as const, "chat"));
    setDafVowels(readStored("rabai_daf_vowels", ["on", "off"] as const, "off") === "on");
    setDafColumn(readStored("rabai_daf_column", ["on", "off"] as const, "off") === "on");
    setDafZoomHint(readStored("rabai_daf_zoom_hint", ["seen", "new"] as const, "new") === "new");
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

  // ---- saved chats ----
  const saveChats = useCallback((next: SavedChat[]) => {
    chatsRef.current = next;
    setChats(next);
    store(CHATS_KEY, serializeChats(next));
  }, []);

  // Save the conversation as it goes: after each answer, never mid-answer.
  useEffect(() => {
    if (pending || !chatId || !messages.length) return;
    const existing = chatsRef.current.find((c) => c.id === chatId);
    if (existing && existing.messages.length === messages.length) return;
    const now = Date.now();
    saveChats(
      upsertChat(chatsRef.current, {
        id: chatId,
        title: existing?.title ?? "",
        category: existing?.category ?? "",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages: messages.map(({ role, text, result }) => ({ role, text, result })),
      }),
    );
  }, [messages, pending, chatId, saveChats]);

  const updateChat = (id: string, change: Partial<Pick<SavedChat, "title" | "category">>) =>
    saveChats(chatsRef.current.map((c) => (c.id === id ? { ...c, ...change } : c)));

  const startNewChat = () => {
    if (pending) return;
    dictation.cancel();
    stopSpeaking();
    setSpeaking(null);
    setMessages([]);
    setChatId(null);
    setInput("");
    setChatsOpen(false);
    setChatTools(null);
    chooseMode("chat");
  };

  const openChat = (chat: SavedChat) => {
    if (pending) return;
    dictation.cancel();
    stopSpeaking();
    setSpeaking(null);
    setMessages(chat.messages.map((m) => ({ id: nextId.current++, ...m })));
    setChatId(chat.id);
    setInput("");
    setChatsOpen(false);
    setChatTools(null);
    chooseMode("chat");
  };

  const deleteChat = (id: string) => {
    saveChats(chatsRef.current.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setChatTools(null);
    if (id === chatId) {
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
  }, [reader]);

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
      try {
        const kept = JSON.parse(window.localStorage.getItem(`${OUTLINE_KEY}${section}`) ?? "null");
        if (kept && Array.isArray(kept.lines)) setOutlines((prev) => ({ ...prev, [section]: kept }));
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
      if (!res.ok) throw new Error(json.error ?? "RabAI couldn't outline this page just now.");
      const kept = { lines: json.lines as OutlineLine[], model: json.model as string | undefined };
      setOutlines((prev) => ({ ...prev, [daf.section]: kept }));
      store(`${OUTLINE_KEY}${daf.section}`, JSON.stringify(kept));
      setOutlineState(null);
    } catch (err) {
      setOutlineState({ loading: false, error: err instanceof Error ? err.message : "RabAI couldn't outline this page just now." });
      setShowOutline(false);
    }
  };

  /** RabAI's translation of a passage, asked for only when the person taps Translate or Word by word. */
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
    setCardTab("meaning");
    setDafQuestion("");
  };

  // On a phone, keep the tapped word in view above the card.
  useEffect(() => {
    if (wide || !dafPick) return;
    const main = document.querySelector<HTMLElement>(".daf-view .daf-main");
    const el = main?.querySelector<HTMLElement>(".dw.on");
    if (!main || !el) return;
    const r = el.getBoundingClientRect();
    const m = main.getBoundingClientRect();
    if (r.top < m.top || r.bottom > m.top + m.height * 0.45) main.scrollBy({ top: r.top - m.top - m.height * 0.2, behavior: "smooth" });
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

  useEffect(() => {
    if (!dafRef) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dafMenu) setDafMenu(null);
      else if (dafPick) setDafPick(null);
      else closeDaf();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dafRef, dafPick, dafMenu]);

  // Follow the conversation as it grows, unless the person has scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom || !live) el.scrollTo({ top: el.scrollHeight, behavior: live ? "auto" : "smooth" });
  }, [messages, pending, live]);

  // ---- reading aloud ----
  const speakingRef = useRef<string | null>(null);
  const setSpeaking = useCallback((id: string | null) => {
    speakingRef.current = id;
    setSpeakingId(id);
  }, []);
  /** Read an answer aloud, or stop if it is the one being read. */
  const listen = useCallback(
    (id: string, text: string) => {
      if (speakingRef.current === id) {
        stopSpeaking();
        setSpeaking(null);
        return;
      }
      setSpeaking(id);
      speak(text, () => {
        if (speakingRef.current === id) setSpeaking(null);
      });
    },
    [setSpeaking],
  );

  // ---- asking ----
  const send = useCallback(
    async (question: string, opts: { deep?: boolean; spoken?: boolean } = {}) => {
      const q = question.trim();
      if (!q || pending) return;
      dictation.cancel();
      stopSpeaking();
      setSpeaking(null);
      const history = messages
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.role === "user" ? (m.text ?? "") : plainAnswer(m.result) }))
        .filter((t) => t.text.trim());
      setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: q }]);
      if (!chatId) setChatId(`c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
      setChatsOpen(false);
      setInput("");
      spokenInput.current = false;
      setMode("chat");
      setPending(true);
      setLive({ status: "Thinking it through", text: "" });
      try {
        const result = await postAsk(
          { question: q, history, growth, deep: opts.deep === true },
          {
            onStatus: (text) => setLive((l) => (l ? { ...l, status: text } : l)),
            onText: (delta) => setLive((l) => (l ? { ...l, text: l.text + delta } : l)),
          },
        );
        const id = nextId.current++;
        setMessages((prev) => [...prev, { id, role: "ai", result }]);
        // A question asked out loud gets its answer read aloud.
        if (opts.spoken && result.status === "answered" && canSpeak()) listen(`m${id}`, plainAnswer(result));
      } catch (err) {
        const notice = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [
          ...prev,
          {
            id: nextId.current++,
            role: "ai",
            result: { status: "error", blocks: [], sources: [], retrieved: [], safety: null, libraryMode, droppedCitations: 0, notice },
          },
        ]);
      } finally {
        setPending(false);
        setLive(null);
      }
    },
    [messages, pending, growth, libraryMode, dictation, setSpeaking, listen, chatId],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input, { spoken: spokenInput.current });
  };
  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input, { spoken: spokenInput.current });
    }
  };
  const onComposerChange = (value: string) => {
    // Typing takes over from the microphone.
    if (listening) dictation.cancel();
    spokenInput.current = false;
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
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
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
    const body = readerBodyRef.current;
    body?.addEventListener("scroll", placeCard, { passive: true });
    window.addEventListener("resize", placeCard);
    return () => {
      body?.removeEventListener("scroll", placeCard);
      window.removeEventListener("resize", placeCard);
    };
  }, [wide, selected, placeCard]);

  // On a phone, keep what was tapped in view above the sheet: in the top part of the reader.
  useEffect(() => {
    const body = readerBodyRef.current;
    if (wide || !selected || !body) return;
    const anchor =
      (wordCard && body.querySelector<HTMLElement>(".w-tap.on")) || body.querySelector<HTMLElement>(`[data-ref="${CSS.escape(selected)}"]`);
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const b = body.getBoundingClientRect();
    const top = b.top + (barHidden ? 0 : headHeight);
    const target = top + Math.min(24, b.height * 0.05);
    if (r.top < top || r.bottom > b.top + b.height * 0.45) body.scrollBy({ top: r.top - target, behavior: "smooth" });
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
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lineAnswers, selected, reader]);

  const chooseLang = (l: Lang) => {
    setLang(l);
    store("rabai_lang", l);
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
            ? { question, focusRef: ref, growth }
            : { question, action, focusRef: ref, word, growth };
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
    [growth],
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
    if (mode !== "learn" || sections) return;
    fetch("/api/library")
      .then((r) => r.json())
      .then((j: { sections: SectionSummary[]; phrases?: PhraseInfo[] }) => {
        setSections(j.sections);
        setGlossary(j.phrases ?? []);
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
      void send(`Can you explain this part: “${quote}”?`);
    }
  };

  // Escape closes the settings menu.
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  const toggleGrowth = (on: boolean) => {
    setGrowth(on);
    store("rabai_growth", on ? "on" : "off");
  };

  // ---------------------------------------------------------------------------

  // Look up a tapped word in the library's dictionaries. No AI: RabAI explains a word only
  // when the person taps "Ask RabAI".
  useEffect(() => {
    if (!wordCard || !reader) return;
    const line = reader.lines.find((l) => l.ref === wordCard.ref) ?? reader.lines.flatMap((l) => l.commentaries).find((c) => c.ref === wordCard.ref);
    const token = line?.tokens[wordCard.index];
    const w = token ? bareWord(token.text) : "";
    if (!w || wordInfo[w]) return;
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
              {answer.status ?? (answer.action === "check" ? "RabAI is reading your translation" : "RabAI is looking at this line")}
              <span className="dots" />
            </p>
          ) : answer.error ? (
            <p>{answer.error}</p>
          ) : answer.result ? (
            <>
              {answer.result.safety && <SafetyCard result={answer.result} />}
              {answer.result.blocks.length > 0 ? (
                <AnswerBody blocks={answer.result.blocks} onOpen={onOpen} />
              ) : (
                <p>{answer.result.notice}</p>
              )}
              {speechOk && answer.result.status === "answered" && (
                <div className="follow tight">
                  <button
                    type="button"
                    className="chip-btn listen"
                    aria-pressed={speakingId === `l${p.ref}`}
                    onClick={() => listen(`l${p.ref}`, plainAnswer(answer.result))}
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
   * RabAI's own translation (made only when the person taps, and always labeled), and its word by
   * word under the library's words.
   */
  const renderTranslation = (o: {
    ref: string;
    en: string;
    by?: string;
    context: string[];
    active?: number;
    partName: string;
    onSource: (r: string) => void;
  }) => {
    const tr = translations[o.ref];
    const showWords = !!wordByWord[o.ref];
    return (
      <>
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
              <strong>RabAI’s translation.</strong> Not from the library, and not yet reviewed by the rabbinic board.
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
                <p className="muted">RabAI’s word-by-word list didn’t line up with the library’s words, so it isn’t shown.</p>
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
        {!lookup && /\s/.test(word) && <p className="muted">This stands for several words. RabAI can explain it.</p>}
        <DictRows entries={entries} />
        {lookup && !lookup.loading && !lookup.error && !lookup.abbreviation && entries.length === 0 && !hasNotes && (
          <p className="muted">
            {lookup.available === false ? "This build has no dictionaries yet." : "None of the library’s dictionaries has this word yet."} RabAI can
            explain it.
          </p>
        )}
        {lookup && !lookup.loading && (lookup.abbreviation || entries.length === 0) && (
          <div className="follow">
            <button type="button" className="chip-btn primary" onClick={onAsk}>
              Ask RabAI about this word
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
                  <button key={r} type="button" className="cite" onClick={() => void openReader(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="fine-left">Notes not marked with a dictionary are written by the RabAI team for testing.</p>
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
                <details key={c.ref} className="wc-piece">
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
                  {c.en && <p className="wc-piece-en">{c.en}</p>}
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
                  {heading === word ? "Ask RabAI about this word" : "Ask RabAI about this phrase"}
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

  const renderLine = (p: Passage & { tokens: Token[] }, isCommentary: boolean, author?: string) => {
    const isSelected = selected === p.ref;
    const lineClass = `line${reader?.focus === p.ref ? " cited" : ""}${isSelected ? " selected" : ""}`;
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
          <span className="num">
            <span>{isCommentary ? (author ?? p.label) : p.label}</span>
            <span className="he" lang="he">
              {p.labelHe}
            </span>
          </span>
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
        {!isSelected && renderLineAnswer(p.ref)}
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
    const shown = words.length
      ? chats.filter((c) => words.every((w) => `${c.title} ${c.category}`.toLowerCase().includes(w)))
      : chats;
    return (
      <div className={column ? "chats-col-inner" : "chats-panel"}>
        <div className="chats-head">
          <h2>{column ? "Chats" : "Your chats"}</h2>
          <div className="follow tight">
            <button type="button" className="btn primary" onClick={startNewChat} disabled={pending}>
              + New chat
            </button>
            {!column && (
              <button type="button" className="btn" onClick={() => setChatsOpen(false)}>
                Back
              </button>
            )}
          </div>
        </div>
        <p className="fine-left">Saved only on this device. Clearing your browser’s data removes them.</p>
        {chats.length > 6 && (
          <>
            <label className="sr-only" htmlFor="chat-filter">
              Find a chat
            </label>
            <input
              id="chat-filter"
              className="book-filter"
              placeholder="Find a chat"
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
                {g.chats.map((c) => {
                  const questions = c.messages.filter((m) => m.role === "user").length;
                  const open = chatTools === c.id;
                  return (
                    <li key={c.id} className={`chat-row${c.id === chatId ? " current" : ""}`}>
                      <div className="chat-row-main">
                        <button type="button" className="chat-open" onClick={() => openChat(c)} disabled={pending}>
                          <span className="chat-title">{c.title}</span>
                          <span className="chat-sub">
                            {whenLabel(c.updatedAt)} · {questions} {questions === 1 ? "question" : "questions"}
                            {c.id === chatId ? " · open now" : ""}
                          </span>
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
                  );
                })}
              </ul>
            </section>
          ))
        )}
        {chats.length > 1 &&
          (confirmDelete === "__all__" ? (
            <p className="confirm all">
              Delete all {chats.length} chats from this device?{" "}
              <button
                type="button"
                className="chip-btn danger"
                onClick={() => {
                  saveChats([]);
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
              Delete all chats on this device
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
    const kinds: Record<string, string> = showOutline && outline ? Object.fromEntries(outline.lines.map((l) => [l.ref, l.kind])) : {};
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
    const line = outline?.lines.find((l) => l.ref === picked?.ref);
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
          <button type="button" className="rb-btn" aria-expanded={dafMenu === "view"} onClick={() => setDafMenu(dafMenu === "view" ? null : "view")}>
            View
          </button>
          {dafMenu === "view" && (
            <div className="rb-menu daf-menu" role="group" aria-label="View">
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
                Show the flow (RabAI’s outline)
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
        {showOutline && outline && (
          <div className="daf-legend" aria-label="What the colors mean">
            {OUTLINE_KINDS.filter((k) => outline.lines.some((l) => l.kind === k)).map((k) => (
              <span key={k} className={`legend-chip k-${k}`}>
                {OUTLINE_LABELS[k]}
              </span>
            ))}
            <span className="legend-note">RabAI’s outline of the argument, not yet reviewed by the rabbinic board.</span>
          </div>
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
                    kinds,
                    marks,
                    onWord: (ref: string, index: number, w: string, part: "main" | "rashi" | "tosafot", printedAs?: string) => {
                      if (dafPick?.ref === ref && dafPick.index === index) return setDafPick(null);
                      // Another word of the same line keeps the open tab; a new line opens on the word's meaning.
                      if (dafPick?.ref !== ref) {
                        setCardTab("meaning");
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
                line && showOutline ? (
                  <p className={`kind-note k-${line.kind}`}>
                    <strong>{OUTLINE_LABELS[line.kind as OutlineKind]}.</strong> {line.note}{" "}
                    <span className="fine-inline">RabAI’s outline, not yet reviewed.</span>
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
                })}
              {dafTab === "commentary" && (
                <div className="wc-pieces">
                  {dafPick.part === "main" ? (
                    onLine.length ? (
                      onLine.map((c) => (
                        <details key={c.ref} className="wc-piece">
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
                          {c.en && <p className="wc-piece-en">{c.en}</p>}
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
                        Ask RabAI about this word
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
      </div>
    );
  };

  return (
    <div className={`app mode-${mode}${readerOpen ? " with-reader" : ""}${readerOpen && mode === "learn" ? " reader-full" : ""}`}>
      <section className="convo" aria-label={mode === "chat" ? "Conversation" : "Learn"}>
        <header className="top">
          <div className="brand">
            <div className="mark" aria-hidden="true">
              ר
            </div>
            <div>
              <h1>RabAI</h1>
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
              <span className="chats-label">Chats</span>
            </button>
            <div className="mode-switch" role="group" aria-label="Chat or learn">
              <button type="button" aria-pressed={mode === "chat"} onClick={() => chooseMode("chat")}>
                Chat
              </button>
              <button type="button" aria-pressed={mode === "learn"} onClick={() => chooseMode("learn")}>
                Learn
              </button>
            </div>
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
                <label className="switch">
                  <input type="checkbox" checked={growth} onChange={(e) => toggleGrowth(e.target.checked)} />
                  <span>
                    <strong>Help me grow closer to HaShem</strong>
                    <span className="muted">
                      Off unless you turn it on. When it’s on, RabAI may gently offer one small step at a time, never with
                      guilt.
                    </span>
                  </span>
                </label>
                <div className="settings-about">
                  <p>RabAI is an AI Torah teacher, not a rav. For your own situation, ask your rav.</p>
                  {libraryMode === "testing" && (
                    <p>{TESTING_LABEL}</p>
                  )}
                  {libraryMode === "development" && <p>{DEV_NOTE}</p>}
                  <p>Your chats, saved words, marks and recent reading stay on this device.</p>
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
          <div className="convo-main">
        <div className="scroll" ref={scrollRef}>
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
                    <button type="button" className="btn quiet new-chat" onClick={startNewChat} disabled={pending}>
                      + New chat
                    </button>
                  </div>
                  {chatTools === HEAD_TOOLS && <div className="chat-tools">{chatToolsFor(currentChat)}</div>}
                </div>
              )}
              <div className="msg-ai">
                <div className="mark" aria-hidden="true">
                  ר
                </div>
                <div className="body">
                  <p>
                    Shalom! I’m RabAI, an AI Torah teacher. Ask me anything, about Torah or about life.
                    {dictation.supported ? " Type, or tap the microphone and talk." : ""}
                  </p>
                  {libraryMode === "testing" && (
                    <p className="welcome-tag">
                      <span className="tag-gray">Testing library</span> Sources are not yet approved by the rabbinic board.
                    </p>
                  )}
                  {!connected && (
                    <p className="note">
                      This build isn’t connected to its AI model yet, so I can find sources but can’t answer. The setup
                      steps are in web/README.md.
                    </p>
                  )}
                  <p className="welcome-rav">RabAI is an AI Torah teacher, not a rav. For your own situation, ask your rav.</p>
                  {messages.length === 0 &&
                    STARTERS.map((g) => (
                      <div key={g.label} className="starters">
                        <p className="label-sm">{g.label}</p>
                        <div className="starter-grid">
                          {g.items.map((q) => (
                            <button key={q} type="button" className="starter" onClick={() => void send(q)} disabled={pending}>
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="msg-user">
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className="msg-ai bare">
                    <div className="body" data-askable="chat">
                      {m.result && <SafetyCard result={m.result} />}
                      {m.result && m.result.blocks.length > 0 && (
                        <AnswerBody blocks={m.result.blocks} onOpen={(r) => void openReader(r)} />
                      )}
                      {m.result?.notice && <p className="note">{m.result.notice}</p>}
                      {m.result?.status === "no_key" && m.result.retrieved.length > 0 && (
                        <div className="follow">
                          {m.result.retrieved.map((r) => (
                            <button key={r} type="button" className="cite" onClick={() => void openReader(r)}>
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                      {m.result?.status === "answered" && (
                        <div className="follow">
                          {speechOk && (
                            <button
                              type="button"
                              className="btn quiet listen"
                              aria-pressed={speakingId === `m${m.id}`}
                              onClick={() => listen(`m${m.id}`, plainAnswer(m.result))}
                            >
                              <SpeakerIcon /> {speakingId === `m${m.id}` ? "Stop" : "Listen"}
                            </button>
                          )}
                          <button type="button" className="btn quiet" disabled={pending} onClick={() => void send("Tell me more.", { deep: true })}>
                            Tell me more
                          </button>
                          <button type="button" className="btn quiet" disabled={pending} onClick={() => void send("Can you say that more simply?")}>
                            Say it more simply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}

              {pending && (
                <div className="msg-ai bare">
                  <div className="body">
                    {live?.text ? (
                      <LiveText text={live.text} />
                    ) : (
                      <p className="thinking">
                        {live?.status ?? "Thinking it through"}
                        <span className="dots" />
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
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
                            {w.gloss ?? "Ask RabAI about this word"}
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
                        See it in {g.occurrences[0]}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="fine-left">Written by the RabAI team for testing, until approved dictionaries replace these notes.</p>
            </div>
          ) : (
            <div className="thread learn-home">
              {sections === null ? (
                <p className="thinking">
                  Opening the library<span className="dots" />
                </p>
              ) : sections.length === 0 ? (
                <p className="note">No texts are in the library yet. They appear here once the rabbinic board approves them.</p>
              ) : (
                <LibraryShelves
                  books={catalogBooks}
                  label={libraryMode === "testing" ? TESTING_LABEL : undefined}
                  recent={recent}
                  pending={pending}
                  onRead={(ref) => void openReader(ref)}
                  onPage={(ref) => void openDaf(ref)}
                  onLearn={(title) =>
                    void send(
                      `Let's learn ${title} together. Start at the beginning, one line at a time, and ask me what I think before you explain.`,
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
                    </div>
                  }
                />
              )}
            </div>
          )}
        </div>

        {mode === "chat" && (!chatsOpen || chatsColumn) && (
          <div className="composer">
            <form onSubmit={onSubmit}>
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
                Ask RabAI
              </label>
              <textarea
                id="ask-input"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => onComposerChange(e.target.value)}
                onKeyDown={onComposerKey}
                placeholder={listening ? "Listening… speak your question" : "Ask anything…"}
                maxLength={2000}
                autoComplete="off"
              />
              <button className="send" type="submit" disabled={pending || !input.trim()}>
                Ask
              </button>
            </form>
            {(dictation.error || listening) && (
              <p className="voice-note" role={dictation.error ? "alert" : "status"}>
                {dictation.error ?? "Listening. Tap the microphone when you’re done, then press Ask."}
              </p>
            )}
            <p className="fine">RabAI is an AI Torah teacher, not a rav. For your own situation, ask your rav.</p>
          </div>
        )}
          </div>
        </div>
      </section>

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
                  <span className="rb-t">{reader?.section ?? readerRef}</span>
                  {reader && (
                    <span className="he" lang="he">
                      {reader.sectionHe}
                    </span>
                  )}
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
                </p>
              )}
              {reader && readerMenu === "about" && (
                <div className="rb-menu">
                  <p>
                    {reader.libraryMode === "testing" ? TESTING_LABEL : reader.libraryMode === "development" ? DEV_NOTE : null}
                  </p>
                  <p>
                    {reader.work.edition ? `Hebrew: ${reader.work.edition}. ` : ""}English: {reader.work.translation.by}.
                  </p>
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
            <div className={`reader-body lang-${lang}${selected && !wide ? " with-sheet" : ""}`} ref={readerBodyRef} data-askable="reader">
              {readerLoading ? (
                <p className="reader-state">
                  Opening the text<span className="dots" />
                </p>
              ) : readerError ? (
                <p className="reader-state">{readerError}</p>
              ) : reader ? (
                reader.lines.map((line) => {
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
                })
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
    </div>
  );
}
