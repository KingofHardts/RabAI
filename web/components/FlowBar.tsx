"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { pieceWords } from "@/lib/library/daf";
import { OUTLINE_LABELS, phraseId, type FlowStep, type OutlineKind } from "@/lib/engine/outline-phrases";

/*
 * Going through the flow phrase by phrase, at the bottom of the page view. It shows the current
 * phrase's kind, RabAI's note on it (tan, labeled as RabAI's) and the library's English for it, and
 * rings the phrase on the page and scrolls it into view.
 *
 * It sits below the page, not over it, so on a phone it never covers the words it is about.
 * Keys, while the bar has focus: the left arrow is the next phrase (Hebrew runs to the left), the
 * right arrow the one before; Home and End go to the first and last; Escape closes it.
 */

export interface FlowBarProps {
  steps: readonly FlowStep[];
  index: number;
  /** The kind being shown alone, if any: then only its phrases are stepped through. */
  only: OutlineKind | null;
  /** The library's Gemara line, by reference: its words and its English. */
  text: (ref: string) => { he: string; en: string } | undefined;
  /** Whose English the library has, for the label. */
  englishBy?: string;
  onMove: (index: number) => void;
  onClose: () => void;
}

export default function FlowBar({ steps, index, only, text, englishBy, onMove, onClose }: FlowBarProps) {
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
  const first = index <= 0;
  const last = index >= steps.length - 1;

  // Opening the bar brings the keys to it.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, []);

  // Ring the current phrase on the page and bring it into view (the bar is below the page, so it
  // never hides it).
  const id = step ? phraseId(step) : "";
  useEffect(() => {
    if (!id) return;
    const el = document.querySelector<HTMLElement>(`.daf-view [data-phrase="${CSS.escape(id)}"]`);
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", inline: "nearest", behavior: still ? "auto" : "smooth" });
  }, [id]);

  if (!step) return null;
  const { phrase, line } = step;
  const go = (i: number) => {
    if (i >= 0 && i < steps.length && i !== index) onMove(i);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.metaKey || e.ctrlKey) return;
    const to: Record<string, number | undefined> = {
      ArrowLeft: index + 1,
      ArrowDown: index + 1,
      ArrowRight: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: steps.length - 1,
    };
    if (e.key === "Escape") {
      e.preventDefault();
      // This Escape closes the bar only, not the card or the page behind it.
      e.stopPropagation();
      onClose();
      return;
    }
    const i = to[e.key];
    if (i === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    go(i);
  };
  const lib = text(step.ref);
  const words = pieceWords(lib?.he ?? "").slice(phrase.from, phrase.to).join(" ");
  const label = OUTLINE_LABELS[phrase.kind];
  const note = phrase.note || line.note;
  const of = `${index + 1} of ${steps.length}`;
  const what = only ? ` ${OUTLINE_LABELS[only].toLowerCase()} phrases` : " phrases";
  const english = phrase.en ?? lib?.en ?? "";

  return (
    <section className="flow-bar" aria-label="Step through the flow, phrase by phrase" onKeyDown={onKeyDown}>
      {/* What a screen reader hears on each step: the kind, RabAI's note, and where it is. */}
      <p className="sr-only" aria-live="polite">
        {`${label}: ${note}. ${of}${what}, ${step.ref}. RabAI’s outline, not yet reviewed by the rabbinic board.`}
      </p>
      <div className="flow-top">
        <span className={`flow-kind k-${phrase.kind}`}>{label}</span>
        <span className="flow-count" aria-hidden="true">
          {of}
          <span className="flow-wide">
            {what} · {step.ref}
          </span>
        </span>
        <div className="flow-nav" role="group" aria-label="Move through the phrases">
          <button
            type="button"
            ref={nextRef}
            className="rb-btn flow-move"
            aria-disabled={last}
            aria-keyshortcuts="ArrowLeft"
            onClick={() => go(index + 1)}
          >
            <span aria-hidden="true">‹ </span>Next
          </button>
          <button type="button" className="rb-btn flow-move" aria-disabled={first} aria-keyshortcuts="ArrowRight" onClick={() => go(index - 1)}>
            Back<span aria-hidden="true"> ›</span>
          </button>
        </div>
        <button type="button" className="wc-x flow-x" aria-label="Close the step-through" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="flow-body">
        <p className="he flow-he" lang="he" dir="rtl">
          {words}
        </p>
        <div className="flow-note">
          <p className="flow-by">
            <strong>RabAI’s outline</strong>, not yet reviewed by the rabbinic board
          </p>
          <p>
            <strong>{label}.</strong> {note}
          </p>
        </div>
        <div className="flow-en">
          <p className="flow-by" title={englishBy}>
            {phrase.en ? "The library’s English, matched to this phrase by RabAI" : english ? "The library’s English for the whole line" : "The library’s English"}
            {englishBy && english ? <span className="flow-wide"> · {englishBy}</span> : null}
          </p>
          <p className="flow-en-text">{english || "The library has no English for this line."}</p>
        </div>
      </div>
    </section>
  );
}
