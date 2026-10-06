"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import type { AskResult, LineAction } from "@/lib/engine/answer";
import type { AnswerBlock } from "@/lib/engine/citations";
import type { LibraryMode } from "@/lib/library";
import type { Passage, TranslationStatus, Work } from "@/lib/library/types";

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
}
interface ReaderLine extends Passage {
  commentaries: ReaderCommentary[];
}
interface ReaderData {
  focus: string | null;
  libraryMode: LibraryMode;
  section: string;
  sectionHe: string;
  work: Work;
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
  result?: AskResult;
  error?: string;
}

const STARTERS = [
  "Why does the Torah begin with Creation and not with the first mitzvah?",
  "Why do we add a Chanukah light each night?",
  "What did Hillel tell the man who wanted the whole Torah on one foot?",
  "How can two opposite opinions both be “the words of the living God”?",
];

const ACTIONS: Array<{ id: LineAction; label: string }> = [
  { id: "explain", label: "Explain this" },
  { id: "words", label: "Word by word" },
  { id: "commentaries", label: "What do the commentaries say?" },
  { id: "halacha", label: "Where is this used in halacha?" },
];

const DEV_NOTE = "Development texts for testing. Not yet an approved edition or translation.";

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

function plainAnswer(result: AskResult | undefined): string {
  return result?.blocks.map((b) => b.text).join("") ?? "";
}

async function postAsk(body: Record<string, unknown>): Promise<AskResult> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as (AskResult & { error?: string }) | null;
  if (!json) throw new Error("RabAI didn't answer. Please try again.");
  if (json.error && !json.status) throw new Error(json.error);
  return json;
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

// ---------------------------------------------------------------------------
// The app

export default function RabaiApp({ libraryMode, connected }: { libraryMode: LibraryMode; connected: boolean }) {
  const [tab, setTab] = useState<"ask" | "learn">("ask");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
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

  const [sections, setSections] = useState<SectionSummary[] | null>(null);

  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Settings live on this device only.
  useEffect(() => {
    setGrowth(readStored("rabai_growth", ["on", "off"] as const, "off") === "on");
    setLang(readStored("rabai_lang", ["he", "both", "en"] as const, "both"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  // ---- asking ----
  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || pending) return;
      const history = messages
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", text: m.role === "user" ? (m.text ?? "") : plainAnswer(m.result) }))
        .filter((t) => t.text.trim());
      setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: q }]);
      setInput("");
      setTab("ask");
      setPending(true);
      try {
        const result = await postAsk({ question: q, history, growth });
        setMessages((prev) => [...prev, { id: nextId.current++, role: "ai", result }]);
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
      }
    },
    [messages, pending, growth, libraryMode],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };
  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
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
      if (e.key === "Escape") closeReader();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readerOpen, closeReader]);

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

  const chooseLang = (l: Lang) => {
    setLang(l);
    store("rabai_lang", l);
  };

  const askLine = useCallback(
    async (ref: string, action: LineAction | "ask", question = "") => {
      setLineAnswers((prev) => ({ ...prev, [ref]: { action, loading: true } }));
      try {
        const result = await postAsk(
          action === "ask" ? { question, focusRef: ref, growth } : { question: "", action, focusRef: ref, growth },
        );
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

  // ---- learn ----
  useEffect(() => {
    if (tab !== "learn" || sections) return;
    fetch("/api/library")
      .then((r) => r.json())
      .then((j: { sections: SectionSummary[] }) => setSections(j.sections))
      .catch(() => setSections([]));
  }, [tab, sections]);

  const toggleGrowth = (on: boolean) => {
    setGrowth(on);
    store("rabai_growth", on ? "on" : "off");
  };

  // ---------------------------------------------------------------------------

  const renderLine = (p: Passage, isCommentary: boolean, author?: string) => {
    const isSelected = selected === p.ref;
    const answer = lineAnswers[p.ref];
    return (
      <div key={p.ref} className={isCommentary ? "comm" : undefined}>
        <button
          type="button"
          data-ref={p.ref}
          className={`line${reader?.focus === p.ref ? " cited" : ""}${isSelected ? " selected" : ""}`}
          aria-expanded={isSelected}
          onClick={() => {
            setSelected(isSelected ? null : p.ref);
            setLineQuestion("");
          }}
        >
          <span className="num">
            <span>{isCommentary ? (author ?? p.label) : p.label}</span>
            <span className="he" lang="he">
              {p.labelHe}
            </span>
          </span>
          <span className="he" lang="he">
            {p.he}
          </span>
          <span className="en">{p.en}</span>
        </button>
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
            </div>
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
          </>
        )}
        {answer && (
          <div className="answer" aria-live="polite" data-answer-for={p.ref}>
            <div className="mark" aria-hidden="true">
              ר
            </div>
            <div>
              {answer.loading ? (
                <p className="thinking">
                  RabAI is looking at this line<span className="dots" />
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
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <section className="convo" aria-label="Conversation">
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
          </div>
          <div className="tabs" role="tablist" aria-label="Sections">
            <button className="tab" role="tab" aria-selected={tab === "ask"} onClick={() => setTab("ask")}>
              Ask
            </button>
            <button className="tab" role="tab" aria-selected={tab === "learn"} onClick={() => setTab("learn")}>
              Learn
            </button>
          </div>
        </header>

        <div className="scroll" ref={scrollRef}>
          {tab === "ask" ? (
            <div className="thread" role="log" aria-live="polite" aria-relevant="additions">
              <div className="msg-ai">
                <div className="mark" aria-hidden="true">
                  ר
                </div>
                <div className="body">
                  <p>
                    Shalom, and welcome. I’m RabAI, an AI Torah teacher. Ask me anything about Torah: a pasuk, a Gemara,
                    a halacha, a question you’ve always wondered about. I’ll answer from the sources and open them with
                    you, so you can see the words yourself.
                  </p>
                  <p>I’m a teacher, not a rav. For a question about your own situation, your rav is the one to ask.</p>
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
                    <div className="body">
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
                          {m.result.sources[0] && (
                            <button type="button" className="chip-btn" onClick={() => void openReader(m.result!.sources[0].ref)}>
                              Open {m.result.sources[0].ref}
                            </button>
                          )}
                          <button type="button" className="chip-btn" disabled={pending} onClick={() => void send("Could you explain that more simply?")}>
                            Explain more simply
                          </button>
                          <button type="button" className="chip-btn" disabled={pending} onClick={() => void send("Let's go deeper. What is the underlying idea?")}>
                            Go deeper
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
                    <p className="thinking">
                      RabAI is thinking it through<span className="dots" />
                    </p>
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
                  <p>Pick a text and we’ll learn it together. You can read it yourself, or ask me to go through it with you a line at a time.</p>
                </div>
              </div>

              {sections === null ? (
                <p className="thinking">
                  Opening the library<span className="dots" />
                </p>
              ) : sections.length === 0 ? (
                <p className="note">No texts are in the library yet. They appear here once the rabbinic board approves them.</p>
              ) : (
                sections.map((s) => (
                  <div key={s.section} className="card">
                    <div className="card-row">
                      <h3>{s.section}</h3>
                      <span className="he" lang="he">
                        {s.sectionHe}
                      </span>
                    </div>
                    <p>
                      {s.workTitle} · {s.lineCount} {s.lineCount === 1 ? "passage" : "passages"}
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
                ))
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

        <div className="composer">
          <form onSubmit={onSubmit}>
            <label htmlFor="ask-input" className="sr-only">
              Ask RabAI
            </label>
            <textarea
              id="ask-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKey}
              placeholder="Ask about Torah, halacha, or any text…"
              maxLength={2000}
              autoComplete="off"
            />
            <button className="send" type="submit" disabled={pending || !input.trim()}>
              Ask
            </button>
          </form>
          <p className="fine">RabAI is an AI Torah teacher, not a rav. For a question about your own situation, ask your rav.</p>
        </div>
      </section>

      {readerOpen && <button type="button" className="scrim" aria-label="Close the text" onClick={closeReader} tabIndex={-1} />}

      <aside className={`reader${readerOpen ? " open" : ""}`} aria-label="Source reader">
        {!readerRef ? (
          <div className="reader-empty">
            <span className="he" aria-hidden="true">
              מקורות
            </span>
            Tap any source in an answer and the text opens here, with its commentaries.
          </div>
        ) : (
          <>
            <div className="reader-head">
              <div className="reader-title">
                <h2>{reader?.section ?? readerRef}</h2>
                {reader && (
                  <span className="he" lang="he">
                    {reader.sectionHe}
                  </span>
                )}
                <button ref={closeRef} type="button" className="close close-phone" onClick={closeReader}>
                  Close
                </button>
              </div>
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
              {reader &&
                (reader.libraryMode === "development" ? (
                  <div className="dev-strip">{DEV_NOTE} Tap any line to ask about it.</div>
                ) : (
                  <div className="edition">
                    {reader.work.title}: {reader.work.edition} English: {reader.work.translation.by}. Tap any line to ask
                    about it.
                  </div>
                ))}
            </div>
            <div className={`reader-body lang-${lang}`} ref={readerBodyRef}>
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
    </div>
  );
}
