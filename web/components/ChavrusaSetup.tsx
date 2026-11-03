"use client";

import { useEffect, useRef, useState } from "react";
import { CHAVRUSA_DEPTHS, CHAVRUSA_STYLES, DEPTH_INFO, STYLE_INFO, type ChavrusaDepth, type ChavrusaSession, type ChavrusaStyle } from "@/lib/chavrusa";

/*
 * "Learn with a chavrusa": the person chooses how RabbAI learns with them, how deep to go, and
 * what to learn. Nothing is sent until they press Start.
 */

export interface ChavrusaChoice {
  /** What to learn: a place in the library or a topic. */
  text: string;
  /** Shown on the button. */
  label: string;
  /** The line reached before, to continue from. */
  at?: string;
}

export default function ChavrusaSetup({
  initial,
  choices,
  onStart,
  onClose,
  onEnd,
}: {
  /** The way and depth chosen last time, and a text when opened from a page. */
  initial?: Partial<ChavrusaSession>;
  /** Quick choices of what to learn: the page open now, today's daf, where they stopped. */
  choices: ChavrusaChoice[];
  onStart: (s: ChavrusaSession) => void;
  onClose: () => void;
  /** Ending the open chat's session (shown when changing one). */
  onEnd?: () => void;
}) {
  const [style, setStyle] = useState<ChavrusaStyle>(initial?.style ?? "guide");
  const [depth, setDepth] = useState<ChavrusaDepth>(initial?.depth ?? "standard");
  const firstChoice = initial?.text ? choices.find((c) => c.text === initial.text) : choices[0];
  const [picked, setPicked] = useState<string>(initial?.text && !firstChoice ? "other" : (firstChoice?.text ?? "other"));
  const [other, setOther] = useState(initial?.text && !firstChoice ? initial.text : "");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choice = choices.find((c) => c.text === picked);
  const text = picked === "other" ? other.trim() : (choice?.text ?? "");
  const start = () => onStart({ style, depth, ...(text ? { text } : {}), ...(choice?.at ? { at: choice.at } : {}) });

  return (
    <div className="about-view" role="dialog" aria-modal="true" aria-labelledby="chavrusa-title">
      <div className="about-card chavrusa-card">
        <div className="about-head">
          <h2 id="chavrusa-title">Learn with a chavrusa</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} ref={closeRef}>
            ✕
          </button>
        </div>
        <p className="muted">
          RabbAI learns with you the way a chavrusa does: a piece at a time, from the text itself. Choose how you&apos;d like
          to learn.
        </p>

        <fieldset className="about-field">
          <legend>What to learn</legend>
          <div className="chav-texts">
            {choices.map((c) => (
              <label key={c.text} className="chav-pick">
                <input type="radio" name="chav-text" checked={picked === c.text} onChange={() => setPicked(c.text)} />
                <span>{c.label}</span>
              </label>
            ))}
            <label className="chav-pick">
              <input type="radio" name="chav-text" checked={picked === "other"} onChange={() => setPicked("other")} />
              <span>Something else</span>
            </label>
          </div>
          {picked === "other" && (
            <input
              type="text"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Berakhot 2a, Genesis 23, the laws of brachot…"
              maxLength={80}
              autoFocus
              enterKeyHint="go"
              onKeyDown={(e) => {
                if (e.key === "Enter" && other.trim()) start();
              }}
            />
          )}
        </fieldset>

        <fieldset className="about-field">
          <legend>How your chavrusa learns with you</legend>
          <div className="chav-styles">
            {CHAVRUSA_STYLES.map((s) => (
              <label key={s} className={`chav-style${style === s ? " on" : ""}`}>
                <input type="radio" name="chav-style" checked={style === s} onChange={() => setStyle(s)} />
                <strong>{STYLE_INFO[s].name}</strong>
                <span className="muted">{STYLE_INFO[s].blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="about-field">
          <legend>How deep</legend>
          <div className="chav-depths" role="radiogroup" aria-label="How deep">
            {CHAVRUSA_DEPTHS.map((d) => (
              <label key={d} className={`chav-depth${depth === d ? " on" : ""}`}>
                <input type="radio" name="chav-depth" checked={depth === d} onChange={() => setDepth(d)} />
                <strong>{DEPTH_INFO[d].name}</strong>
                <span className="muted">{DEPTH_INFO[d].blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="about-foot">
          {onEnd && (
            <button type="button" className="btn quiet danger-text chav-end" onClick={onEnd}>
              End the session
            </button>
          )}
          <button type="button" className="btn quiet" onClick={onClose}>
            {onEnd ? "Keep it as it is" : "Not now"}
          </button>
          <button type="button" className="btn primary" onClick={start} disabled={picked === "other" && !other.trim() && style !== "review"}>
            {onEnd ? "Save" : "Start learning"}
          </button>
        </div>
      </div>
    </div>
  );
}
