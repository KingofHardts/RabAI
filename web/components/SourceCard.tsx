"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LivePassage } from "@/lib/engine/live-sources";

/*
 * The text on screen while RabbAI talks about it: the passage it is quoting (or the line it is
 * reading aloud with the person), above the answer, with the words it is talking about marked.
 * The words shown are the library's own (lib/engine/live-sources.ts); the marks come from the
 * model's own citations, checked on the server, and from the lines it reads.
 */

/** Something the answer did with a passage: quoted these words, or read the whole line. */
export interface SourceMark {
  ref: string;
  kind: "cite" | "read";
  quote?: string;
  /** Where in the answer's text it came (for lines read, where the line goes). */
  at: number;
  /** Where in the spoken text it came, and (for a line read) where its reading ends. */
  sAt: number;
  sEnd?: number;
}

/** The piece of the answer being read aloud now, in the spoken text. */
export interface SpokenSpan {
  start: number;
  end: number;
}

/**
 * Which mark the answer is on now: while it is read aloud, the one in the piece being spoken (a
 * line being read wins); otherwise the latest.
 */
export function activeMark(marks: SourceMark[], spoken?: SpokenSpan | null): SourceMark | null {
  if (!marks.length) return null;
  if (spoken) {
    const read = marks.find((m) => m.kind === "read" && m.sAt < spoken.end && (m.sEnd ?? m.sAt) > spoken.start);
    if (read) return read;
    const before = marks.filter((m) => m.sAt < spoken.end);
    return before.length ? before[before.length - 1] : null;
  }
  return marks[marks.length - 1];
}

/** The place of `quote` in `text`, spaces counted loosely; null when it isn't there. */
export function findSpan(text: string, quote: string): [number, number] | null {
  const q = quote.trim();
  if (!q || !text) return null;
  const exact = text.indexOf(q);
  if (exact >= 0) return [exact, exact + q.length];
  // Collapse runs of space in both, remembering where each character came from.
  const map: number[] = [];
  let squashed = "";
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) {
      if (squashed.endsWith(" ") || !squashed) continue;
      squashed += " ";
    } else squashed += text[i];
    map.push(i);
  }
  const sq = q.replace(/\s+/g, " ");
  const at = squashed.indexOf(sq);
  if (at < 0) return null;
  return [map[at], map[at + sq.length - 1] + 1];
}

/** Text with the given spans marked; `on` is the span the answer is on now. */
function marked(text: string, spans: Array<[number, number]>, on: [number, number] | null): ReactNode[] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  const out: ReactNode[] = [];
  let i = 0;
  merged.forEach(([a, b], k) => {
    if (a > i) out.push(text.slice(i, a));
    const live = on !== null && on[0] < b && on[1] > a;
    out.push(
      <mark key={k} className={live ? "src-q on" : "src-q"}>
        {text.slice(a, b)}
      </mark>,
    );
    i = b;
  });
  if (i < text.length) out.push(text.slice(i));
  return out;
}

/** Where a quote falls in a passage: in its Hebrew, its English, or both (a quote of the whole). */
export function spansIn(p: LivePassage, quotes: string[]): { he: Array<[number, number]>; en: Array<[number, number]> } {
  const he: Array<[number, number]> = [];
  const en: Array<[number, number]> = [];
  for (const q of quotes) {
    for (const part of q.split(/\n{2,}/)) {
      const h = findSpan(p.he, part);
      if (h) he.push(h);
      else {
        const e = findSpan(p.en, part);
        if (e) en.push(e);
      }
    }
  }
  return { he, en };
}

/** "Rashi on Berakhot 2a:1:1" → "Rashi, Berakhot 2a" for a tab. */
function tabName(p: LivePassage): string {
  const m = /^(.+?) on (.+?)(?::\d+)*$/.exec(p.ref);
  if (m) return `${m[1]}, ${m[2].replace(/:\d+$/, "")}`;
  return p.ref;
}

function LibraryNote({ p }: { p: LivePassage }) {
  return (
    <p className="src-note">
      {p.library === "testing" ? "From the testing library, not yet approved by the rabbinic board." : p.library === "development" ? "A development text, for testing." : "From RabbAI's library."}
      {p.caution ? ` ${p.caution}` : ""}
    </p>
  );
}

/**
 * The passages above an answer, one at a time, with tabs when there are several. It follows the
 * answer (the passage being quoted or read now) until the person picks a tab themselves.
 */
export function SourceCard({
  passages,
  marks,
  spoken,
  live,
  onOpen,
}: {
  passages: LivePassage[];
  marks: SourceMark[];
  /** The piece being read aloud now: the card follows it. */
  spoken?: SpokenSpan | null;
  /** The answer is still being written: the card follows its latest quote. */
  live?: boolean;
  onOpen: (ref: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [folded, setFolded] = useState(false);
  const box = useRef<HTMLElement | null>(null);
  // A line read with the person shows where it is read, in the answer (ReadLine), not up here.
  const readRefs = new Set(marks.filter((m) => m.kind === "read").map((m) => m.ref));
  const own = passages.filter((x) => !readRefs.has(x.ref));
  // A finished answer that isn't being read aloud marks its quotes, none of them "now".
  const now = spoken || live ? activeMark(marks, spoken) : null;
  const followed = now && own.some((x) => x.ref === now.ref) ? now.ref : undefined;
  const shownRef = picked && own.some((x) => x.ref === picked) ? picked : (followed ?? own[0]?.ref);
  const p = own.find((x) => x.ref === shownRef) ?? own[0];
  const { he, en, onHe, onEn, whole } = useMemo(() => {
    if (!p) return { he: [], en: [], onHe: null, onEn: null, whole: false };
    const mine = marks.filter((m) => m.ref === p.ref);
    const quotes = mine.filter((m) => m.kind === "cite" && m.quote).map((m) => m.quote!);
    const spans = spansIn(p, quotes);
    const live = now && now.ref === p.ref ? now : null;
    const onSpans = live?.kind === "cite" && live.quote ? spansIn(p, [live.quote]) : { he: [], en: [] };
    return {
      he: spans.he,
      en: spans.en,
      onHe: onSpans.he[0] ?? null,
      onEn: onSpans.en[0] ?? null,
      // A line being read is marked whole.
      whole: live?.kind === "read",
    };
  }, [p, marks, now]);
  // Keep the words being talked about in view inside the card's text, without moving the page.
  const onKey = `${p?.ref}|${now?.kind === "cite" ? now.quote : ""}`;
  useEffect(() => {
    const mark = box.current?.querySelector<HTMLElement>(".src-q.on");
    const scroller = mark?.closest<HTMLElement>(".src-he, .src-en");
    if (!mark || !scroller || scroller.scrollHeight <= scroller.clientHeight) return;
    const top = mark.offsetTop - scroller.offsetTop;
    if (top < scroller.scrollTop || top + mark.offsetHeight > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTo({ top: Math.max(0, top - scroller.clientHeight / 3), behavior: "smooth" });
    }
  }, [onKey]);
  if (!p) return null;
  return (
    <section ref={box} className={`src-card${whole ? " reading" : ""}${folded ? " folded" : ""}`} aria-label="The text RabbAI is talking about">
      <div className="src-top">
        {own.length > 1 ? (
          <div className="src-tabs" role="tablist" aria-label="Texts in this answer">
            {own.map((x) => (
              <button
                key={x.ref}
                type="button"
                role="tab"
                aria-selected={x.ref === p.ref}
                className={`src-tab${x.ref === p.ref ? " on" : ""}${now?.ref === x.ref ? " live" : ""}`}
                onClick={() => setPicked(x.ref === picked ? null : x.ref)}
                title={x.ref}
              >
                {tabName(x)}
              </button>
            ))}
          </div>
        ) : (
          <p className="src-title" title={p.ref}>
            {p.ref}
          </p>
        )}
        <button type="button" className="src-fold" onClick={() => setFolded((f) => !f)} aria-expanded={!folded}>
          {folded ? "Show the text" : "Hide"}
        </button>
      </div>
      {!folded && (
        <>
          {p.he && (
            <p className={`src-he${whole ? " whole" : ""}`} dir="rtl" lang="he">
              {marked(p.he, he, onHe)}
            </p>
          )}
          {p.en && <p className={`src-en${whole ? " whole" : ""}`}>{marked(p.en, en, onEn)}</p>}
          <div className="src-foot">
            <LibraryNote p={p} />
            <button type="button" className="src-open" onClick={() => onOpen(p.ref)}>
              Open in the reader
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * A line RabbAI reads aloud with the person, where it reads it in the answer: the library's own
 * words, with the words RabbAI quotes from it marked (and the one it is on now, brighter).
 */
export function ReadLine({
  passage,
  refName,
  live,
  marks = [],
  now,
  onOpen,
}: {
  passage?: LivePassage;
  refName: string;
  live?: boolean;
  /** What the answer did with its passages (SourceCard): the quotes from this line are marked. */
  marks?: SourceMark[];
  /** The mark the answer is on now, if any. */
  now?: SourceMark | null;
  onOpen: (ref: string) => void;
}) {
  if (!passage)
    return (
      <p className="read-line missing">
        <button type="button" className="cite" onClick={() => onOpen(refName)}>
          {refName}
        </button>
      </p>
    );
  const quotes = marks.filter((m) => m.ref === passage.ref && m.kind === "cite" && m.quote).map((m) => m.quote!);
  const spans = spansIn(passage, quotes);
  const on = now && now.ref === passage.ref && now.kind === "cite" && now.quote ? spansIn(passage, [now.quote]) : { he: [], en: [] };
  return (
    <blockquote className={`read-line${live ? " on" : ""}`}>
      <button type="button" className="read-ref" onClick={() => onOpen(passage.ref)} title={`Open ${passage.ref}`}>
        {passage.ref}
      </button>
      {passage.he && (
        <p className="read-he" dir="rtl" lang="he">
          {marked(passage.he, spans.he, on.he[0] ?? null)}
        </p>
      )}
      {passage.en && <p className="read-en">{marked(passage.en, spans.en, on.en[0] ?? null)}</p>}
    </blockquote>
  );
}

/** What is said aloud for a line RabbAI reads: its English, or its Hebrew and then its English. */
export function readingText(p: LivePassage, original: boolean): string {
  const en = p.en.trim();
  const he = p.he.trim();
  if (original && he) return en ? `${he}\n${en}` : he;
  return en || he;
}
