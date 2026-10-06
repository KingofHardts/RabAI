"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
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
import { parseAmud, type DafData } from "@/lib/library/daf";
import { OUTLINE_KINDS, OUTLINE_LABELS, type OutlineKind, type OutlineLine } from "@/lib/engine/outline";

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
}

/** How a word was read to find an entry: "מ + אימתי", "ו + חכם + ים". */
function readingText(found: WordEntry["found"]): string {
  return [found.prefix.map(([letter]) => letter).join(""), found.form, found.suffix].filter(Boolean).join(" + ");
}

/** A dictionary entry, shortened until the person asks for all of it. */
function EntryText({ entry }: { entry: WordEntry }) {
  const [open, setOpen] = useState(false);
  const long = entry.text.length > 260;
  const text = open || !long ? entry.text : `${entry.text.slice(0, 240).replace(/\s+\S*$/, "")} …`;
  return (
    <p className={`entry-text${entry.lang === "he" ? " he" : ""}`} lang={entry.lang} dir={entry.lang === "he" ? "rtl" : undefined}>
      {text}{" "}
      {long && (
        <button type="button" className="link" onClick={() => setOpen(!open)}>
          {open ? "Less" : "More"}
        </button>
      )}
    </p>
  );
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

const STARTERS = [
  "Why does the Torah start with Creation?",
  "Why do we add a Chanukah light each night?",
  "What did Hillel say about the whole Torah on one foot?",
  "I had a hard day. Can we talk?",
  "My friend and I had a falling out. How do I make it right?",
  "Help me read the first words of the Torah",
];

const ACTIONS: Array<{ id: LineAction; label: string }> = [
  { id: "explain", label: "Explain this" },
  { id: "words", label: "Word by word" },
  { id: "commentaries", label: "What do the commentaries say?" },
  { id: "halacha", label: "Where is this used in halacha?" },
];

const DEV_NOTE = "Development texts for testing. Not yet an approved edition or translation.";
/** How many books the Learn tab shows at once from the testing library. */
const BOOKS_SHOWN = 40;
const WORDS_KEY = "rabai_words";
/** The person's own marks on the page: a color for each line or comment they marked. */
const MARKS_KEY = "rabai_marks";
/** RabAI's outline of each page, kept so the same page is never outlined twice. */
const OUTLINE_KEY = "rabai_outline:";
const MARK_COLORS = [
  { id: "yellow", label: "Yellow" },
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "pink", label: "Pink" },
];
const MAX_SAVED_WORDS = 500;

/** The books whose English or Hebrew name holds every word typed, at most BOOKS_SHOWN of them. */
function filterSections(sections: SectionSummary[], filter: string): SectionSummary[] {
  const words = filter.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const hits = words.length
    ? sections.filter((s) => {
        const name = `${s.section} ${s.sectionHe} ${s.workTitle}`.toLowerCase();
        return words.every((w) => name.includes(w));
      })
    : sections;
  return hits.slice(0, BOOKS_SHOWN);
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
function bareWord(text: string): string {
  return text.replace(/^[\s"'״׳“”‘’()[\]{}.,;:!?׃־–—…]+|[\s"'״׳“”‘’()[\]{}.,;:!?׃־–—…]+$/g, "");
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
  const [lang, setLang] = useState<Lang>("both");

  const [readerRef, setReaderRef] = useState<string | null>(null);
  const [reader, setReader] = useState<ReaderData | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [lineAnswers, setLineAnswers] = useState<Record<string, LineAnswer>>({});
  const [lineQuestion, setLineQuestion] = useState("");

  // Word study
  const [studyMode, setStudyMode] = useState(false);
  const [wordCard, setWordCard] = useState<{ ref: string; index: number } | null>(null);
  const [wordInfo, setWordInfo] = useState<Record<string, WordLookup>>({});
  const [tryRef, setTryRef] = useState<string | null>(null);
  const [tryText, setTryText] = useState("");
  const [myWords, setMyWords] = useState<SavedWord[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [sections, setSections] = useState<SectionSummary[] | null>(null);
  const [bookFilter, setBookFilter] = useState("");
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
  const [dafPick, setDafPick] = useState<{ ref: string; index: number; word: string; part: "main" | "rashi" | "tosafot" } | null>(null);
  const [dafZoom, setDafZoom] = useState(1);
  const dafZoomChosen = useRef(false);
  const [dafQuestion, setDafQuestion] = useState("");
  const [outlines, setOutlines] = useState<Record<string, { lines: OutlineLine[]; model?: string }>>({});
  const [outlineState, setOutlineState] = useState<{ loading: boolean; error?: string } | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  const [marks, setMarks] = useState<Record<string, string>>({});

  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Settings and saved words live on this device only.
  useEffect(() => {
    setGrowth(readStored("rabai_growth", ["on", "off"] as const, "off") === "on");
    setLang(readStored("rabai_lang", ["he", "both", "en"] as const, "both"));
    setStudyMode(readStored("rabai_study", ["on", "off"] as const, "off") === "on");
    setMode(readStored("rabai_mode", ["chat", "learn"] as const, "chat"));
    setMyWords(readSavedWords());
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
  const openDaf = useCallback(async (ref: string) => {
    const at = parseAmud(ref);
    if (!at) return;
    // On a phone the page starts larger, so the Gemara can be read; it scrolls sideways.
    if (window.innerWidth < 640 && !dafZoomChosen.current) setDafZoom(1.5);
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
    if (!w || wordInfo[w]) return;
    setWordInfo((prev) => ({ ...prev, [w]: { loading: true } }));
    fetch(`/api/word?w=${encodeURIComponent(w)}`)
      .then((r) => r.json())
      .then((j: { available?: boolean; entries?: WordEntry[]; error?: string }) =>
        setWordInfo((prev) => ({ ...prev, [w]: j.error ? { loading: false, error: j.error } : { loading: false, available: j.available, entries: j.entries ?? [] } })),
      )
      .catch(() => setWordInfo((prev) => ({ ...prev, [w]: { loading: false, error: "The dictionaries couldn't be reached just now." } })));
  }, [dafPick, wordInfo]);

  useEffect(() => {
    if (!dafRef) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (dafPick) setDafPick(null);
      else closeDaf();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dafRef, dafPick]);

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

  useEffect(() => {
    if (!readerOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (wordCard) setWordCard(null);
      else closeReader();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readerOpen, closeReader, wordCard]);

  // Scroll the cited line into view and move focus into the sheet on phones.
  useEffect(() => {
    if (!reader?.focus || readerLoading) return;
    const el = readerBodyRef.current?.querySelector<HTMLElement>(`[data-ref="${CSS.escape(reader.focus)}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (window.matchMedia("(max-width: 979px)").matches) closeRef.current?.focus();
  }, [reader, readerLoading]);

  // Bring a line's answer into view when it starts and when it arrives.
  useEffect(() => {
    if (!selected || !lineAnswers[selected]) return;
    const el = readerBodyRef.current?.querySelector<HTMLElement>(`[data-answer-for="${CSS.escape(selected)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lineAnswers, selected]);

  // Keep an opened word card in view.
  useEffect(() => {
    if (!wordCard) return;
    const el = readerBodyRef.current?.querySelector<HTMLElement>(`[data-wordcard-for="${CSS.escape(wordCard.ref)}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [wordCard]);

  const chooseLang = (l: Lang) => {
    setLang(l);
    store("rabai_lang", l);
  };

  const toggleStudy = () => {
    const on = !studyMode;
    setStudyMode(on);
    setWordCard(null);
    store("rabai_study", on ? "on" : "off");
    if (on && lang === "en") chooseLang("both");
  };

  const askLine = useCallback(
    async (ref: string, action: LineAction | "ask", question = "", word?: string) => {
      setSelected(ref);
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
      .then((j: { available?: boolean; entries?: WordEntry[]; error?: string }) =>
        setWordInfo((prev) => ({ ...prev, [w]: j.error ? { loading: false, error: j.error } : { loading: false, available: j.available, entries: j.entries ?? [] } })),
      )
      .catch(() => setWordInfo((prev) => ({ ...prev, [w]: { loading: false, error: "The dictionaries couldn't be reached just now." } })));
  }, [wordCard, reader, wordInfo]);

  const tapWord = (ref: string, index: number) =>
    setWordCard(wordCard?.ref === ref && wordCard.index === index ? null : { ref, index });

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

  const renderEntries = (entries: WordEntry[]) => {
    const first = entries[0];
    return (
      entries.length > 0 && (
        <div className="entries">
          <p className="label-sm">From the dictionaries</p>
          {entries.map((e) => (
            <div key={e.ref} className={`entry ${e.dictionary.startsWith("Jastrow") ? "dict-jastrow" : "dict-radak"}`}>
              <div className="entry-head">
                <span className="dict-chip">{e.dictionary}</span>
                <span className="he" lang="he">
                  {e.headword}
                </span>
              </div>
              {first && readingText(e.found) !== readingText(first.found) && (
                <p className="entry-reading">
                  Another way to read the word:{" "}
                  <span className="he" lang="he">
                    {readingText(e.found)}
                  </span>
                  {e.found.guess ? " (a guess at its root)" : ""}
                </p>
              )}
              <EntryText entry={e} />
              {e.note && <p className="entry-note">{e.note}</p>}
            </div>
          ))}
        </div>
      )
    );
  };

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

  const renderWordCard = (p: Passage & { tokens: Token[] }) => {
    if (!reader || !wordCard || wordCard.ref !== p.ref) return null;
    const token = p.tokens[wordCard.index];
    if (!token) return null;
    const word = bareWord(token.text);
    const root = token.root ? reader.wordStudy.roots[token.root] : undefined;
    const phrase = token.phrase ? reader.wordStudy.phrases[token.phrase] : undefined;
    const elsewhere = [...new Set([...(root?.occurrences ?? []), ...(phrase?.occurrences ?? [])])].filter((r) => r !== p.ref);
    // A word inside a Gemara phrase is studied as the whole phrase, unless the word has its own root.
    const heading = phrase && !root ? phrase.phrase : word;
    const gloss = token.gloss ?? (phrase && !root ? phrase.meaning : undefined);
    const saved = isSaved(heading);
    const lookup = wordInfo[word];
    const entries = lookup?.entries ?? [];
    const first = entries[0];
    const teamNotes = !!(token.parts || root || phrase);
    return (
      <div className="wordcard" data-wordcard-for={p.ref} role="region" aria-label={`About ${heading}`}>
        <div className="wordcard-head">
          <span className="he" lang="he">
            {heading}
          </span>
          {gloss && <span className="gloss">{gloss}</span>}
          <button type="button" className="x" aria-label="Close word notes" onClick={() => setWordCard(null)}>
            ×
          </button>
        </div>
        {first && renderBreakdown(first)}
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
        {lookup?.loading && (
          <p className="muted">
            Looking it up in the dictionaries<span className="dots" />
          </p>
        )}
        {lookup?.error && <p className="muted">{lookup.error}</p>}
        {renderEntries(entries)}
        {lookup && !lookup.loading && !lookup.error && entries.length === 0 && !teamNotes && (
          <p className="muted">
            {lookup.available === false
              ? "This build has no dictionaries yet."
              : "None of the library’s dictionaries has this word yet."}{" "}
            RabAI can explain it.
          </p>
        )}
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
        <div className="follow">
          <button
            type="button"
            className={`chip-btn${!lookup?.loading && entries.length === 0 && !teamNotes ? " primary" : ""}`}
            onClick={() => void askLine(p.ref, "word", "", heading)}
          >
            {heading === word ? "Ask RabAI about this word" : "Ask RabAI about this phrase"}
          </button>
          <button
            type="button"
            className="chip-btn"
            aria-pressed={saved}
            onClick={() =>
              saved
                ? removeWord(heading)
                : saveWord({
                    form: heading,
                    gloss: gloss ?? (first ? `${first.text.slice(0, 90).replace(/\s+\S*$/, "")} … (${first.dictionary})` : undefined),
                    root: root?.root,
                    rootMeaning: root?.meaning,
                    ref: p.ref,
                  })
            }
          >
            {saved ? "Saved to My words ✓" : "Save to My words"}
          </button>
        </div>
        {teamNotes && (
          <p className="fine-left">Notes not marked with a dictionary are written by the RabAI team for testing.</p>
        )}
      </div>
    );
  };

  const renderLine = (p: Passage & { tokens: Token[] }, isCommentary: boolean, author?: string) => {
    const isSelected = selected === p.ref;
    const answer = lineAnswers[p.ref];
    const lineClass = `line${reader?.focus === p.ref ? " cited" : ""}${isSelected ? " selected" : ""}`;
    const label = (
      <>
        <span>{isCommentary ? (author ?? p.label) : p.label}</span>
        <span className="he" lang="he">
          {p.labelHe}
        </span>
      </>
    );
    return (
      <div key={p.ref} className={isCommentary ? "comm" : undefined}>
        {studyMode ? (
          <div className={`${lineClass} study`} data-ref={p.ref}>
            <span className="num">
              {label}
            </span>
            <span className="he words" lang="he">
              {p.tokens.map((t, i) => (
                <span key={i}>
                  {i > 0 && " "}
                  {bareWord(t.text) === "" ? (
                    t.text
                  ) : (
                  <button
                    type="button"
                    className={`w${t.root ? " known" : ""}${t.phrase ? " phr" : ""}`}
                    aria-pressed={wordCard?.ref === p.ref && wordCard.index === i}
                    onClick={() => tapWord(p.ref, i)}
                  >
                    {t.text}
                  </button>
                  )}
                </span>
              ))}
            </span>
            <span className="en">{p.en}</span>
            <button
              type="button"
              className="line-ask"
              aria-expanded={isSelected}
              onClick={() => {
                setSelected(isSelected ? null : p.ref);
                setLineQuestion("");
              }}
            >
              {isSelected ? "Hide questions" : "Ask about this line"}
            </button>
          </div>
        ) : (
          // A div rather than a button, so the words can be highlighted and asked about.
          <div
            role="button"
            tabIndex={0}
            data-ref={p.ref}
            className={lineClass}
            aria-expanded={isSelected}
            onClick={() => {
              if (hasHighlight()) return;
              setSelected(isSelected ? null : p.ref);
              setLineQuestion("");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              setSelected(isSelected ? null : p.ref);
              setLineQuestion("");
            }}
          >
            <span className="num">{label}</span>
            <span className="he" lang="he">
              {p.tokens.length
                ? p.tokens.map((t, i) => (
                    <span key={i}>
                      {i > 0 && " "}
                      {bareWord(t.text) === "" ? (
                        t.text
                      ) : (
                        <span
                          className={`w-tap${wordCard?.ref === p.ref && wordCard.index === i ? " on" : ""}`}
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
        )}
        {renderWordCard(p)}
        {isSelected && (
          <>
            <div className="actions" role="group" aria-label={`Ask about ${p.ref}`}>
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={answer?.action === a.id}
                  disabled={answer?.loading}
                  onClick={() => void askLine(p.ref, a.id)}
                >
                  {a.label}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={tryRef === p.ref}
                disabled={answer?.loading}
                onClick={() => {
                  setTryRef(tryRef === p.ref ? null : p.ref);
                  setTryText("");
                }}
              >
                Let me try translating
              </button>
            </div>
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
                <label htmlFor={`try-${p.ref}`}>
                  Write the line in your own words. Try it without looking at the English.
                </label>
                <textarea
                  id={`try-${p.ref}`}
                  value={tryText}
                  onChange={(e) => setTryText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="My translation…"
                />
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
                  placeholder="Or ask your own question about this line…"
                  maxLength={2000}
                />
                <button type="submit" disabled={!lineQuestion.trim() || answer?.loading}>
                  Ask
                </button>
              </form>
            )}
          </>
        )}
        {renderLineAnswer(p.ref)}
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

  const renderChatsPanel = () => {
    const words = chatFilter.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = words.length
      ? chats.filter((c) => words.every((w) => `${c.title} ${c.category}`.toLowerCase().includes(w)))
      : chats;
    return (
      <div className="chats-panel">
        <div className="chats-head">
          <h2>Your chats</h2>
          <div className="follow tight">
            <button type="button" className="chip-btn primary" onClick={startNewChat} disabled={pending}>
              New chat
            </button>
            <button type="button" className="chip-btn" onClick={() => setChatsOpen(false)}>
              Back
            </button>
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
                      {open && (
                        <div className="chat-tools">
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
                        </div>
                      )}
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

  const PART_LABEL = { main: "Gemara", rashi: "Rashi", tosafot: "Tosafot" } as const;

  const renderDafView = () => {
    const outline = daf ? outlines[daf.section] : undefined;
    const kinds: Record<string, string> = showOutline && outline ? Object.fromEntries(outline.lines.map((l) => [l.ref, l.kind])) : {};
    const pieces = daf ? [...daf.main, ...daf.rashi, ...daf.tosafot] : [];
    const picked = dafPick ? pieces.find((p) => p.ref === dafPick.ref) : undefined;
    const linked = new Set<string>();
    if (daf && dafPick && picked) {
      if (dafPick.part === "main") {
        for (const c of [...daf.rashi, ...daf.tosafot]) if (c.on === picked.ref) linked.add(c.ref);
      } else if (picked.on) linked.add(picked.on);
    }
    const word = dafPick ? bareWord(dafPick.word) : "";
    const lookup = word ? wordInfo[word] : undefined;
    const entries = lookup?.entries ?? [];
    const first = entries[0];
    const line = outline?.lines.find((l) => l.ref === picked?.ref);
    const answer = picked ? lineAnswers[picked.ref] : undefined;
    const partName = dafPick?.part === "main" ? "line" : "comment";
    const goToSource = (r: string) => {
      closeDaf();
      void openReader(r);
    };
    return (
      <div className="daf-view" role="dialog" aria-modal="true" aria-label={daf ? `${daf.section}, the page as printed` : "The page as printed"}>
        <div className="daf-bar">
          <button type="button" className="chip-btn" onClick={closeDaf}>
            ← Back
          </button>
          <div className="daf-title">
            {daf && (
              <span className="he" lang="he">
                {daf.labelHe}
              </span>
            )}
            <span>{dafRef}</span>
          </div>
          <div className="daf-tools">
            <button
              type="button"
              className="chip-btn"
              disabled={!daf?.prev || dafLoading}
              onClick={() => daf?.prev && void openDaf(daf.prev)}
              aria-label={daf?.prev ? `Previous page, ${daf.prev}` : "Previous page"}
            >
              ‹<span className="wide"> Back a page</span>
            </button>
            <button
              type="button"
              className="chip-btn"
              disabled={!daf || dafLoading}
              onClick={() => daf && void openDaf(daf.next)}
              aria-label={daf ? `Next page, ${daf.next}` : "Next page"}
            >
              <span className="wide">Next page </span>›
            </button>
            <div className="seg" role="group" aria-label="Page size">
              <button type="button" aria-label="Smaller page" disabled={dafZoom <= 1} onClick={() => {
                  dafZoomChosen.current = true;
                  setDafZoom((z) => Math.max(1, z - 0.5));
                }}>
                −
              </button>
              <button type="button" aria-label="Bigger page" disabled={dafZoom >= 3} onClick={() => {
                  dafZoomChosen.current = true;
                  setDafZoom((z) => Math.min(3, z + 0.5));
                }}>
                +
              </button>
            </div>
            <button
              type="button"
              className={`chip-btn${showOutline ? " primary" : ""}`}
              aria-pressed={showOutline}
              disabled={!daf || outlineState?.loading}
              onClick={() => void showFlow()}
            >
              {outlineState?.loading ? "Outlining…" : showOutline ? "Hide the flow" : "Show the flow"}
            </button>
          </div>
        </div>
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
          <div className="daf-main">
            {dafLoading ? (
              <p className="reader-state">
                Opening the page<span className="dots" />
              </p>
            ) : dafError ? (
              <p className="reader-state">{dafError}</p>
            ) : daf ? (
              <>
                <DafPage
                  data={daf}
                  zoom={dafZoom}
                  selectedRef={dafPick?.ref ?? null}
                  linkedRefs={linked}
                  activeWord={dafPick ? { ref: dafPick.ref, index: dafPick.index } : null}
                  kinds={kinds}
                  marks={marks}
                  onWord={(ref, index, w, part) => {
                    setDafPick(dafPick?.ref === ref && dafPick.index === index ? null : { ref, index, word: w, part });
                    setDafQuestion("");
                  }}
                />
                <p className="daf-note">
                  {daf.libraryLabel} Gemara: {daf.editions.main}. Rashi and Tosafot: {daf.editions.rashi}. The shape follows the
                  printed Vilna page, but the lines break where your screen breaks them. Tap any word.
                </p>
              </>
            ) : null}
          </div>
          {dafPick && picked && daf && (
            <aside className="daf-panel" aria-label={`About ${picked.ref}`}>
              <div className="daf-panel-head">
                <span className={`part-chip part-${dafPick.part}`}>{PART_LABEL[dafPick.part]}</span>
                <span className="daf-panel-ref">{picked.ref}</span>
                <button type="button" className="x" aria-label="Close" onClick={() => setDafPick(null)}>
                  ×
                </button>
              </div>
              {line && showOutline && (
                <p className={`kind-note k-${line.kind}`}>
                  <strong>{OUTLINE_LABELS[line.kind as OutlineKind]}.</strong> {line.note}{" "}
                  <span className="fine-inline">RabAI’s outline, not yet reviewed.</span>
                </p>
              )}
              <p className="he daf-panel-he" lang="he">
                {picked.he}
              </p>
              {picked.en ? (
                <>
                  <p className="daf-panel-en">{picked.en}</p>
                  {dafPick.part === "main" && daf.editions.mainEnglish && (
                    <p className="fine-left">Translation: {daf.editions.mainEnglish}.</p>
                  )}
                </>
              ) : (
                <p className="muted">No English translation of this {partName} is in the library yet. RabAI can explain it.</p>
              )}

              {word && (
                <div className="daf-word">
                  <p className="label-sm">The word you tapped</p>
                  <p className="he daf-word-he" lang="he">
                    {word}
                  </p>
                  {lookup?.loading && (
                    <p className="muted">
                      Looking it up in the dictionaries<span className="dots" />
                    </p>
                  )}
                  {lookup?.error && <p className="muted">{lookup.error}</p>}
                  {first && renderBreakdown(first)}
                  {renderEntries(entries)}
                  {lookup && !lookup.loading && !lookup.error && entries.length === 0 && (
                    <p className="muted">None of the library’s dictionaries has this word yet. RabAI can explain it.</p>
                  )}
                </div>
              )}

              <div className="follow">
                <button
                  type="button"
                  className={`chip-btn${word && lookup && !lookup.loading && !entries.length ? " primary" : ""}`}
                  disabled={answer?.loading || !word}
                  onClick={() => void askLine(picked.ref, "word", "", word)}
                >
                  Ask RabAI about this word
                </button>
                <button type="button" className="chip-btn" disabled={answer?.loading} onClick={() => void askLine(picked.ref, "explain")}>
                  Explain this {partName}
                </button>
                {dafPick.part === "main" && (
                  <button type="button" className="chip-btn" disabled={answer?.loading} onClick={() => void askLine(picked.ref, "commentaries")}>
                    What do Rashi and Tosafot say?
                  </button>
                )}
                {word && (
                  <button
                    type="button"
                    className="chip-btn"
                    aria-pressed={isSaved(word)}
                    onClick={() =>
                      isSaved(word)
                        ? removeWord(word)
                        : saveWord({
                            form: word,
                            gloss: first ? `${first.text.slice(0, 90).replace(/\s+\S*$/, "")} … (${first.dictionary})` : undefined,
                            ref: picked.ref,
                          })
                    }
                  >
                    {isSaved(word) ? "Saved to My words ✓" : "Save to My words"}
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
                  placeholder={`Or ask your own question about this ${partName}…`}
                  maxLength={2000}
                />
                <button type="submit" disabled={!dafQuestion.trim() || answer?.loading}>
                  Ask
                </button>
              </form>
              <div className="mark-row" role="group" aria-label={`Mark this ${partName}`}>
                <span>Mark this {partName}:</span>
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
              {renderLineAnswer(picked.ref, goToSource)}
            </aside>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`app mode-${mode}${readerOpen ? " with-reader" : ""}`}>
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
            {libraryMode === "development" && <span className="badge">Development build</span>}
            {libraryMode === "testing" && (
              <span className="badge" title={TESTING_LABEL}>
                Testing library
              </span>
            )}
          </div>
          <div className="top-actions">
            <button
              type="button"
              className={`chats-btn${chatsOpen && mode === "chat" ? " on" : ""}`}
              aria-pressed={chatsOpen && mode === "chat"}
              onClick={() => {
                const opening = !(chatsOpen && mode === "chat");
                setChatsOpen(opening);
                setChatTools(null);
                if (opening) chooseMode("chat");
              }}
            >
              <ChatsIcon />
              <span>Chats</span>
            </button>
            <div className="mode-switch" role="group" aria-label="Chat or learn">
              <button type="button" aria-pressed={mode === "chat"} onClick={() => chooseMode("chat")}>
                Chat
              </button>
              <button type="button" aria-pressed={mode === "learn"} onClick={() => chooseMode("learn")}>
                Learn
              </button>
            </div>
          </div>
        </header>

        <div className="scroll" ref={scrollRef}>
          {mode === "chat" && chatsOpen ? (
            renderChatsPanel()
          ) : mode === "chat" ? (
            <div className="thread" role="log" aria-live="polite" aria-relevant="additions">
              {currentChat && (
                <div className="chat-meta">
                  <span className={`dot ${categoryTone(currentChat.category)}`} aria-hidden="true" />
                  <span className="saved-note">Saved on this device</span>
                  {categoryPicker(currentChat)}
                  <button type="button" className="link" onClick={startNewChat} disabled={pending}>
                    New chat
                  </button>
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
                  {!connected && (
                    <p className="note">
                      This build isn’t connected to its AI model yet, so I can find sources but can’t answer. The setup
                      steps are in web/README.md.
                    </p>
                  )}
                  {messages.length === 0 && (
                    <>
                      <p className="label-sm">You could start with</p>
                      <div className="follow" style={{ marginTop: 0 }}>
                        {STARTERS.map((s) => (
                          <button key={s} type="button" className="chip-btn" onClick={() => void send(s)} disabled={pending}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="msg-user">
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className="msg-ai">
                    <div className="mark" aria-hidden="true">
                      ר
                    </div>
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
                              className="chip-btn listen"
                              aria-pressed={speakingId === `m${m.id}`}
                              onClick={() => listen(`m${m.id}`, plainAnswer(m.result))}
                            >
                              <SpeakerIcon /> {speakingId === `m${m.id}` ? "Stop" : "Listen"}
                            </button>
                          )}
                          {m.result.sources[0] && (
                            <button type="button" className="chip-btn" onClick={() => void openReader(m.result!.sources[0].ref)}>
                              Open {m.result.sources[0].ref}
                            </button>
                          )}
                          <button type="button" className="chip-btn" disabled={pending} onClick={() => void send("Tell me more.", { deep: true })}>
                            Tell me more
                          </button>
                          <button type="button" className="chip-btn" disabled={pending} onClick={() => void send("Can you say that more simply?")}>
                            Say it more simply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              )}

              {pending && (
                <div className="msg-ai">
                  <div className="mark" aria-hidden="true">
                    ר
                  </div>
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
          ) : (
            <div className="thread">
              <div className="msg-ai">
                <div className="mark" aria-hidden="true">
                  ר
                </div>
                <div className="body">
                  <p>Pick a text to read. Tap a line to ask about it, or highlight any words and ask about those.</p>
                  <p>
                    To learn the words themselves, turn on <strong>Study words</strong> and tap any word.
                  </p>
                </div>
              </div>

              {recent.length > 0 && (
                <div className="card">
                  <h3>Pick up where you left off</h3>
                  <div className="follow">
                    {recent.map((r) => (
                      <button
                        key={`${r.title}${r.page ? ":page" : ""}`}
                        type="button"
                        className="cite"
                        onClick={() => void (r.page ? openDaf(r.ref) : openReader(r.ref))}
                      >
                        {r.title}
                        {r.page ? " (the page)" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sections === null ? (
                <p className="thinking">
                  Opening the library<span className="dots" />
                </p>
              ) : sections.length === 0 ? (
                <p className="note">No texts are in the library yet. They appear here once the rabbinic board approves them.</p>
              ) : (
                <>
                {sections.length > BOOKS_SHOWN && (
                  <div className="card">
                    <label className="label-sm" htmlFor="book-filter">
                      Find a book ({sections.length} in the library)
                    </label>
                    <input
                      id="book-filter"
                      className="book-filter"
                      type="search"
                      value={bookFilter}
                      placeholder="Berakhot, Rashi on Genesis, Mishnah Berurah…"
                      onChange={(e) => setBookFilter(e.target.value)}
                    />
                    {libraryMode === "testing" && <p className="note">{TESTING_LABEL}</p>}
                  </div>
                )}
                {filterSections(sections, bookFilter).map((s) => (
                  <div key={s.section} className="card">
                    <div className="card-row">
                      <h3>{s.section}</h3>
                      <span className="he" lang="he">
                        {s.sectionHe}
                      </span>
                    </div>
                    <p>
                      {s.workTitle}
                      {s.lineCount > 0 ? ` · ${s.lineCount} ${s.lineCount === 1 ? "passage" : "passages"}` : ""}
                      {s.commentaryCount > 0 ? ` · ${s.commentaryCount} commentar${s.commentaryCount === 1 ? "y" : "ies"}` : ""}
                    </p>
                    <div className="follow">
                      <button type="button" className="chip-btn" onClick={() => void openReader(s.firstRef)}>
                        Read it
                      </button>
                      {(s.workId === "talmud-bavli" || s.workTitle === "Talmud Bavli") && parseAmud(s.firstRef) && (
                        <button type="button" className="chip-btn" onClick={() => void openDaf(s.firstRef)}>
                          See the page
                        </button>
                      )}
                      <button
                        type="button"
                        className="chip-btn"
                        disabled={pending}
                        onClick={() =>
                          void send(
                            `Let's learn ${s.section} together. Start at the beginning, one line at a time, and ask me what I think before you explain.`,
                          )
                        }
                      >
                        Learn it with RabAI
                      </button>
                    </div>
                  </div>
                ))}
                {sections.length > BOOKS_SHOWN && filterSections(sections, bookFilter).length === 0 && (
                  <p className="note">No book by that name yet. Try a shorter part of the name.</p>
                )}
                </>
              )}

              <div className="card">
                <h3>My words</h3>
                {myWords.length === 0 ? (
                  <p>Words you save while studying a text appear here, so you can review them. They stay on this device.</p>
                ) : (
                  <>
                    <p>
                      {myWords.length} {myWords.length === 1 ? "word" : "words"}, saved on this device. Try to remember each
                      one before you show its meaning.
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
                            <button
                              type="button"
                              className="link"
                              onClick={() => setRevealed((prev) => new Set(prev).add(w.form))}
                            >
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

              {glossary.length > 0 && (
                <div className="card">
                  <h3>The Gemara’s key words</h3>
                  <p>
                    A handful of Aramaic phrases carry the give and take of every sugya. Learn these and you can follow the
                    argument on any page.
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
              )}

              <div className="card">
                <label className="switch">
                  <input type="checkbox" checked={growth} onChange={(e) => toggleGrowth(e.target.checked)} />
                  <span>
                    <h3 style={{ margin: 0 }}>Help me grow closer to HaShem</h3>
                    <p>
                      Off unless you turn it on. When it’s on, RabAI may gently offer one small step at a time, never with
                      guilt. You can turn it off whenever you like.
                    </p>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {mode === "chat" && !chatsOpen && (
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
      </section>

      {dafRef && renderDafView()}

      {readerOpen && <button type="button" className="scrim" aria-label="Close the text" onClick={closeReader} tabIndex={-1} />}

      <aside className={`reader${readerOpen ? " open" : ""}`} aria-label="Source reader">
        {!readerRef ? null : (
          <>
            <div className="reader-head">
              <div className="reader-title">
                <h2>{reader?.section ?? readerRef}</h2>
                {reader && (
                  <span className="he" lang="he">
                    {reader.sectionHe}
                  </span>
                )}
                <button ref={closeRef} type="button" className="close" onClick={closeReader}>
                  Close
                </button>
              </div>
              <div className="reader-tools">
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
                <button type="button" className="study-toggle" aria-pressed={studyMode} onClick={toggleStudy}>
                  Study words
                </button>
                {reader?.libraryMode === "testing" && reader.work.id === "talmud-bavli" && parseAmud(reader.section) && (
                  <button type="button" className="study-toggle page-toggle" onClick={() => void openDaf(reader.section)}>
                    See the page
                  </button>
                )}
              </div>
              {reader &&
                (reader.libraryMode === "development" ? (
                  <div className="dev-strip">
                    {DEV_NOTE} {studyMode ? "Tap any word to study it." : "Tap a word for its meaning, or a line to ask about it."}
                  </div>
                ) : reader.libraryMode === "testing" ? (
                  <div className="dev-strip">
                    {TESTING_LABEL} {reader.work.edition ? `Hebrew: ${reader.work.edition}.` : ""} English:{" "}
                    {reader.work.translation.by}. {studyMode ? "Tap any word to study it." : "Tap a word for its meaning, or a line to ask about it."}
                  </div>
                ) : (
                  <div className="edition">
                    {reader.work.title}: {reader.work.edition} English: {reader.work.translation.by}.{" "}
                    {studyMode ? "Tap any word to study it." : "Tap a word for its meaning, or a line to ask about it."}
                  </div>
                ))}
            </div>
            <div className={`reader-body lang-${studyMode && lang === "en" ? "both" : lang}`} ref={readerBodyRef} data-askable="reader">
              {readerLoading ? (
                <p className="reader-state">
                  Opening the text<span className="dots" />
                </p>
              ) : readerError ? (
                <p className="reader-state">{readerError}</p>
              ) : reader ? (
                reader.lines.map((line) => (
                  <div key={line.ref}>
                    {renderLine(line, false)}
                    {line.commentaries.length > 0 && (
                      <div className="comms">
                        <div className="comms-label">On this line</div>
                        {line.commentaries.map((c) => renderLine(c, true, c.label))}
                      </div>
                    )}
                  </div>
                ))
              ) : null}
            </div>
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
