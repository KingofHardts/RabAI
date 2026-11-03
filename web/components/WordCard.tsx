"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { WordEntry } from "@/lib/library/word-parts";
import { firstSense } from "@/lib/library/entry-summary";
import { useSheetDrag } from "./use-sheet-drag";
import { hasHebrewVoice, speakHebrew } from "./voice";

/*
 * The card that opens when a word or a line is tapped, in the reader and on the printed page
 * (docs/ui-research.md, 3.5). The word comes first, then tabs: Meaning (the library's
 * dictionaries), Translation, Commentary, Ask. Beside the word on a computer (a popover, or the
 * page's side panel); a short sheet at the bottom on a phone, which can be pulled up. It never
 * moves the text, and nothing in it calls the model until the person taps a button.
 */

export type CardTab = "meaning" | "translation" | "commentary" | "ask";

export interface CardTabInfo {
  id: CardTab;
  label: string;
  count?: number;
}

/** True on a computer-sized screen (980 pixels and wider), where the card sits beside the text. */
export function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 980px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el as HTMLElement).isContentEditable);

export interface WordCardProps {
  /** A small line at the top: what was tapped and where. */
  label: ReactNode;
  /** The tapped word, shown large. Left out when a whole line was tapped. */
  word?: string;
  /** Under the word: what a short form stands for, the team's gloss. */
  wordNote?: ReactNode;
  /** How the word breaks down (letters in front, the ending, a guessed root). */
  breakdown?: ReactNode;
  /** A line about the passage itself (the outline's note), above the tabs. */
  aboveTabs?: ReactNode;
  tabs: CardTabInfo[];
  tab: CardTab;
  onTab: (t: CardTab) => void;
  /** The next and previous word of the same line (Hebrew reads right to left: the next word is on the left). */
  onNext?: () => void;
  onPrev?: () => void;
  onClose: () => void;
  /** What the open tab shows. */
  children: ReactNode;
  footer?: ReactNode;
  variant: "popover" | "sheet" | "panel";
  style?: CSSProperties;
  ariaLabel: string;
  className?: string;
}

export default function WordCard(props: WordCardProps) {
  const { label, word, wordNote, breakdown, aboveTabs, tabs, tab, onTab, onNext, onPrev, onClose, children, footer, variant, style } = props;
  const isSheet = variant === "sheet";
  // On a phone the card is a sheet that follows the finger (components/use-sheet-drag.ts).
  const sheet = useSheetDrag({ enabled: isSheet, onClose });
  const close = isSheet ? sheet.close : onClose;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const setBody = useCallback(
    (el: HTMLDivElement | null) => {
      bodyRef.current = el;
      sheet.bodyRef.current = el;
    },
    [sheet.bodyRef],
  );
  const handlers = useRef({ onClose: close, onNext, onPrev });
  handlers.current = { onClose: close, onNext, onPrev };

  // Escape closes; the arrow keys move between words, as on the page (left is the next word in Hebrew).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // This Escape closes the card only, not the reader or page behind it.
        e.stopPropagation();
        handlers.current.onClose();
        return;
      }
      if (isTyping(document.activeElement) || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowLeft" && handlers.current.onNext) {
        e.preventDefault();
        handlers.current.onNext();
      } else if (e.key === "ArrowRight" && handlers.current.onPrev) {
        e.preventDefault();
        handlers.current.onPrev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A new tab starts at its top.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab, word]);

  const visible = tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;

  // Hear the word, when the device has a Hebrew voice (voices can arrive a moment after the page).
  const [canHear, setCanHear] = useState(false);
  useEffect(() => {
    const check = () => setCanHear(hasHebrewVoice());
    check();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.addEventListener?.("voiceschanged", check);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", check);
  }, []);

  // The first time someone opens a word, a one-line tip says the card follows the next word tapped.
  const [firstTime, setFirstTime] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem("rabai_tip_words")) return;
      window.localStorage.setItem("rabai_tip_words", "seen");
      setFirstTime(true);
    } catch {
      /* without storage, no tip */
    }
  }, []);

  const head = (
    <>
      <div className="wc-top">
        <div className="wc-label">{label}</div>
        <button type="button" className="wc-x" aria-label="Close" onClick={close}>
          ×
        </button>
      </div>
      {word && (
        <div className="wc-word">
          {onNext && (
            <button type="button" className="wc-step" aria-label="Next word" onClick={onNext}>
              ‹
            </button>
          )}
          <span className="he wc-he" lang="he">
            {word}
          </span>
          {canHear && (
            <button type="button" className="wc-hear" aria-label={`Hear ${word}`} title="Hear it" onClick={() => speakHebrew(word)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              </svg>
            </button>
          )}
          {onPrev && (
            <button type="button" className="wc-step" aria-label="Previous word" onClick={onPrev}>
              ›
            </button>
          )}
        </div>
      )}
      {wordNote && <div className="wc-note">{wordNote}</div>}
      {firstTime && word && <div className="wc-tip">Tip: tap any other word to look it up. The card follows you.</div>}
      {breakdown && <div className="wc-breakdown">{breakdown}</div>}
    </>
  );

  return (
    <section
      ref={isSheet ? sheet.sheetRef : undefined}
      className={`wc wc-${variant}${isSheet && sheet.snap === "full" ? " tall" : ""}${props.className ? ` ${props.className}` : ""}`}
      style={style}
      aria-label={props.ariaLabel}
      role={variant === "panel" ? "complementary" : "dialog"}
    >
      {isSheet ? (
        <>
          <button
            type="button"
            className="wc-handle"
            aria-label={sheet.snap === "full" ? "Make the card smaller" : "Make the card bigger"}
            onClick={sheet.toggle}
            {...sheet.handleProps}
          >
            <span aria-hidden="true" />
          </button>
          {/* The card's top can be dragged too, like the handle. */}
          <div className="wc-grab" {...sheet.handleProps}>
            {head}
          </div>
        </>
      ) : (
        head
      )}
      {aboveTabs}
      <div className="wc-tabs" role="tablist" aria-label="What to show">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`wc-tab-${t.id}`}
            aria-selected={visible === t.id}
            aria-controls="wc-panel"
            onClick={() => onTab(t.id)}
          >
            {t.label}
            {t.count ? <span className="wc-count">{t.count}</span> : null}
          </button>
        ))}
      </div>
      <div className="wc-body" ref={setBody} role="tabpanel" id="wc-panel" aria-labelledby={`wc-tab-${visible}`}>
        {children}
        {footer && <div className="wc-foot">{footer}</div>}
      </div>
    </section>
  );
}

/** A dictionary entry's whole text, folded when it is long. */
export function EntryText({ entry }: { entry: WordEntry }) {
  const [open, setOpen] = useState(false);
  const long = entry.text.length > 600;
  const text = open || !long ? entry.text : `${entry.text.slice(0, 560).replace(/\s+\S*$/, "")} …`;
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

const readingText = (f: WordEntry["found"]) => `${f.prefix.map(([l]) => l).join("")}${f.form}${f.suffix}`;

/**
 * The dictionaries' entries as short rows: which dictionary (with its notice, in a few words), the
 * headword, and the first meaning on one line, cut from the dictionary's own text. A tap opens the
 * whole entry, with the full notice.
 */
export function DictRows({ entries }: { entries: WordEntry[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!entries.length) return null;
  const first = entries[0];
  return (
    <ul className="dict-rows">
      {entries.map((e) => {
        const isOpen = open === e.ref;
        const kind = e.dictionary.startsWith("Jastrow") ? "dict-jastrow" : "dict-radak";
        return (
          <li key={e.ref} className={`dict-row ${kind}${isOpen ? " open" : ""}`}>
            <button type="button" className="dict-sum" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : e.ref)}>
              <span className="dict-line">
                <span className="dict-name">{e.dictionary}</span>
                {e.tag && <span className="dict-tag">{e.tag}</span>}
              </span>
              <span className={`dict-first${e.lang === "he" ? " he" : ""}`} dir={e.lang === "he" ? "rtl" : undefined}>
                <bdi className="he dict-head" lang="he" dir="rtl">
                  {e.headword}
                </bdi>
                {!isOpen && (
                  <>
                    {" "}
                    <span lang={e.lang}>{firstSense(e)}</span>
                  </>
                )}
              </span>
              <span className="dict-chev" aria-hidden="true">
                {isOpen ? "▴" : "▾"}
              </span>
            </button>
            {isOpen && (
              <div className="dict-full">
                {readingText(e.found) !== readingText(first.found) && (
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
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Text folded to a few lines, with "More" to read all of it. */
export function Folded({ children, lines = 4, className, lang }: { children: ReactNode; lines?: number; className?: string; lang?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el) setLong(el.scrollHeight > el.clientHeight + 2);
  }, [children]);
  return (
    <div className={`folded${className ? ` ${className}` : ""}`}>
      <div ref={ref} className={open ? "" : "clamp"} style={open ? undefined : ({ WebkitLineClamp: lines } as CSSProperties)} lang={lang}>
        {children}
      </div>
      {(long || open) && (
        <button type="button" className="link" onClick={() => setOpen(!open)}>
          {open ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
