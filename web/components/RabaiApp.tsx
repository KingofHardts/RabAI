"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { AskResult, LineAction } from "@/lib/engine/answer";
import type { AnswerBlock } from "@/lib/engine/citations";
import type { LibraryMode } from "@/lib/library";
import { TESTING_LABEL } from "@/lib/library/testing-config";
import type { Token } from "@/lib/library/language";
import type { Passage, TranslationStatus, Work } from "@/lib/library/types";
import type { PhraseInfo, WordStudy } from "@/lib/library/word-study";
import { canSpeak, speak, stopSpeaking, unlockSpeech, useDictation } from "./voice";

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
  const [tryRef, setTryRef] = useState<string | null>(null);
  const [tryText, setTryText] = useState("");
  const [myWords, setMyWords] = useState<SavedWord[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [sections, setSections] = useState<SectionSummary[] | null>(null);
  const [bookFilter, setBookFilter] = useState("");
  const [glossary, setGlossary] = useState<PhraseInfo[]>([]);

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
    return () => stopSpeaking();
  }, []);

  const chooseMode = (m: Mode) => {
    setMode(m);
    store("rabai_mode", m);
  };

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
    [messages, pending, growth, libraryMode, dictation, setSpeaking, listen],
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
        {!root && !phrase && <p className="muted">This word isn’t in the word notes yet. RabAI can explain it.</p>}
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
          <button type="button" className="chip-btn" onClick={() => void askLine(p.ref, "word", "", heading)}>
            {heading === word ? "Ask RabAI about this word" : "Ask RabAI about this phrase"}
          </button>
          <button
            type="button"
            className="chip-btn"
            aria-pressed={saved}
            onClick={() =>
              saved
                ? removeWord(heading)
                : saveWord({ form: heading, gloss, root: root?.root, rootMeaning: root?.meaning, ref: p.ref })
            }
          >
            {saved ? "Saved to My words ✓" : "Save to My words"}
          </button>
        </div>
        <p className="fine-left">Word notes are written by the RabAI team for testing, until approved dictionaries replace them.</p>
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
                    onClick={() => setWordCard(wordCard?.ref === p.ref && wordCard.index === i ? null : { ref: p.ref, index: i })}
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
              {p.he}
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
        {answer && (
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
                    <AnswerBody blocks={answer.result.blocks} onOpen={(r) => void openReader(r)} />
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
        )}
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
          <div className="mode-switch" role="group" aria-label="Chat or learn">
            <button type="button" aria-pressed={mode === "chat"} onClick={() => chooseMode("chat")}>
              Chat
            </button>
            <button type="button" aria-pressed={mode === "learn"} onClick={() => chooseMode("learn")}>
              Learn
            </button>
          </div>
        </header>

        <div className="scroll" ref={scrollRef}>
          {mode === "chat" ? (
            <div className="thread" role="log" aria-live="polite" aria-relevant="additions">
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

        {mode === "chat" && (
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
              </div>
              {reader &&
                (reader.libraryMode === "development" ? (
                  <div className="dev-strip">
                    {DEV_NOTE} {studyMode ? "Tap any word to study it." : "Tap any line to ask about it."}
                  </div>
                ) : reader.libraryMode === "testing" ? (
                  <div className="dev-strip">
                    {TESTING_LABEL} {reader.work.edition ? `Hebrew: ${reader.work.edition}.` : ""} English:{" "}
                    {reader.work.translation.by}. {studyMode ? "Tap any word to study it." : "Tap any line to ask about it."}
                  </div>
                ) : (
                  <div className="edition">
                    {reader.work.title}: {reader.work.edition} English: {reader.work.translation.by}.{" "}
                    {studyMode ? "Tap any word to study it." : "Tap any line to ask about it."}
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
