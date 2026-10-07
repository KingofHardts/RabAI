"use client";

import { useEffect, useRef, useState } from "react";
import {
  ANSWER_LENGTHS,
  COMMUNITIES,
  COMMUNITY_LABELS,
  GOALS,
  GOAL_LABELS,
  HEBREW,
  HEBREW_LABELS,
  LENGTH_LABELS,
  LEVELS,
  LEVEL_LABELS,
  practiceWords,
  type Goal,
  type LearnerProfile,
  type StatedProfile,
} from "@/lib/learner-profile";

/*
 * "About you": what the person tells RabAI about themselves, and everything RabAI has noticed
 * while they learned, which they can see, change, and forget (docs/learner-profiles.md).
 */

export default function AboutYou({
  profile,
  signedIn = false,
  onAccount,
  onStated,
  onRemember,
  onForgetNoticed,
  onForgetAll,
  onClose,
}: {
  profile: LearnerProfile;
  /** Signed in: this is kept in the person's account too. */
  signedIn?: boolean;
  /** Open "Your account" (only when accounts are switched on). */
  onAccount?: () => void;
  onStated: (stated: StatedProfile) => void;
  onRemember: (on: boolean) => void;
  onForgetNoticed: () => void;
  onForgetAll: () => void;
  onClose: () => void;
}) {
  const s = profile.stated;
  const o = profile.observed;
  const [confirmAll, setConfirmAll] = useState(false);
  const [name, setName] = useState(s.name ?? "");
  const first = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const set = (change: Partial<StatedProfile>) => onStated({ ...s, ...change });
  const toggleGoal = (g: Goal) => {
    const goals = new Set(s.goals ?? []);
    if (goals.has(g)) goals.delete(g);
    else goals.add(g);
    set({ goals: GOALS.filter((x) => goals.has(x)) });
  };
  const practice = practiceWords(profile, 12);

  return (
    <div className="about-view" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <div className="about-card">
        <div className="about-head">
          <h2 id="about-title">About you</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="muted">
          RabAI uses this to explain things at your level, with words and examples that fit you. It never changes what the
          sources say.{" "}
          {signedIn
            ? "It is kept in your account, so it follows you to your other devices, and you can change or forget any of it."
            : "It stays on this device, and you can change or forget any of it."}
          {!signedIn && onAccount && (
            <>
              {" "}
              <button type="button" className="link" onClick={onAccount}>
                Sign in to keep it on all your devices
              </button>
            </>
          )}
        </p>

        <label className="about-field">
          <span>What should RabAI call you? (optional)</span>
          <input
            ref={first}
            type="text"
            value={name}
            maxLength={40}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => set({ name: name.trim() || undefined })}
          />
        </label>

        <fieldset className="about-field">
          <legend>How much have you learned?</legend>
          {LEVELS.map((l) => (
            <label key={l} className="about-choice">
              <input type="radio" name="level" checked={s.level === l} onChange={() => set({ level: l })} />
              {LEVEL_LABELS[l]}
            </label>
          ))}
        </fieldset>

        <fieldset className="about-field">
          <legend>Reading Hebrew</legend>
          {HEBREW.map((h) => (
            <label key={h} className="about-choice">
              <input type="radio" name="hebrew" checked={s.hebrew === h} onChange={() => set({ hebrew: h })} />
              {HEBREW_LABELS[h]}
            </label>
          ))}
        </fieldset>

        <fieldset className="about-field">
          <legend>What would you like to learn?</legend>
          {GOALS.map((g) => (
            <label key={g} className="about-choice">
              <input type="checkbox" checked={!!s.goals?.includes(g)} onChange={() => toggleGoal(g)} />
              {GOAL_LABELS[g]}
            </label>
          ))}
        </fieldset>

        <label className="about-field">
          <span>Your community, for questions of minhag (custom)</span>
          <select value={s.community ?? ""} onChange={(e) => set({ community: (e.target.value || undefined) as StatedProfile["community"] })}>
            <option value="">Not set</option>
            {COMMUNITIES.map((c) => (
              <option key={c} value={c}>
                {COMMUNITY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <div className="about-field">
          <span>Answers</span>
          <div className="seg" role="group" aria-label="Answer length">
            {ANSWER_LENGTHS.map((l) => (
              <button key={l} type="button" aria-pressed={s.length === l} onClick={() => set({ length: s.length === l ? undefined : l })}>
                {LENGTH_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        <label className="switch">
          <input type="checkbox" checked={profile.remember} onChange={(e) => onRemember(e.target.checked)} />
          <span>
            <strong>Remember what I learn</strong>
            <span className="muted">The books you read and the words you look up, so RabAI can help you review and pick up where you are.</span>
          </span>
        </label>

        <section className="about-noticed" aria-label="What RabAI has noticed">
          <h3>What RabAI has noticed</h3>
          {!profile.remember ? (
            <p className="muted">
              Remembering is off. RabAI notices nothing and sends nothing about you with your questions
              {signedIn ? ", and saves nothing new about you to your account" : ""}.
            </p>
          ) : !o.books.length && !o.words.length && !o.questions ? (
            <p className="muted">Nothing yet. As you learn, the books you read and the words you look up show here.</p>
          ) : (
            <>
              {o.books.length > 0 && (
                <p>
                  <strong>Recently learning:</strong> {o.books.slice(0, 6).map((b) => b.title).join(", ")}
                </p>
              )}
              {practice.length > 0 && (
                <p>
                  <strong>Words you looked up more than once:</strong>{" "}
                  <span lang="he" dir="rtl">
                    {practice.join(", ")}
                  </span>
                </p>
              )}
              <p className="muted">
                {o.questions} question{o.questions === 1 ? "" : "s"} asked
                {o.simpler + o.deeper > 0 ? `; asked for simpler ${o.simpler} time${o.simpler === 1 ? "" : "s"} and deeper ${o.deeper} time${o.deeper === 1 ? "" : "s"}` : ""}.
              </p>
              <button type="button" className="btn quiet" onClick={onForgetNoticed}>
                Forget what RabAI noticed
              </button>
            </>
          )}
        </section>

        <div className="about-foot">
          {confirmAll ? (
            <>
              <span>Forget everything here, including what you told RabAI?</span>
              <button type="button" className="btn danger" onClick={() => { onForgetAll(); setConfirmAll(false); setName(""); }}>
                Forget it all
              </button>
              <button type="button" className="btn quiet" onClick={() => setConfirmAll(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className="btn quiet" onClick={() => setConfirmAll(true)}>
              Forget everything about me
            </button>
          )}
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
