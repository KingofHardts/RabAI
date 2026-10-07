"use client";

import { useId, useState } from "react";
import { FEEDBACK_REASONS, FEEDBACK_REASON_LABELS, FEEDBACK_LIMITS, type FeedbackReason } from "@/lib/account/feedback";

/*
 * "Was this helpful?" under a finished answer (docs/learner-profiles.md, phase 3). Sent only when
 * the person taps, with the question, the answer and the refs of the sources it cited. Never the
 * person's profile or anything about them.
 */

function Thumb({ down = false }: { down?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={down ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M7 10v11" />
      <path d="M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-8a2.6 2.6 0 0 1 4 3.9Z" />
    </svg>
  );
}

export default function AnswerFeedback({ question, answer, sources }: { question: string; answer: string; sources: string[] }) {
  const [mode, setMode] = useState<"ask" | "reasons" | "thanks">("ask");
  const [sending, setSending] = useState(false);
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const id = useId();

  async function send(helpful: boolean) {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only these fields. Nothing about the person goes with it.
        body: JSON.stringify({ helpful, reasons: helpful ? [] : reasons, note: helpful ? "" : note, question, answer, sources }),
      });
      if (res.ok) {
        setMode("thanks");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Your feedback couldn't be sent just now.");
      }
    } catch {
      setError("Couldn't reach RabAI. Please try again.");
    }
    setSending(false);
  }

  if (mode === "thanks") {
    return (
      <p className="helpful-thanks" role="status">
        Thank you. This helps make RabAI better.
      </p>
    );
  }

  const toggle = (r: FeedbackReason) => setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  return (
    <div className="helpful">
      {mode === "ask" ? (
        <div className="helpful-row" role="group" aria-labelledby={`${id}-q`}>
          <span className="helpful-q" id={`${id}-q`}>
            Was this helpful?
          </span>
          <button type="button" className="btn quiet" disabled={sending} onClick={() => void send(true)}>
            <Thumb /> Yes
          </button>
          <button type="button" className="btn quiet" disabled={sending} onClick={() => setMode("reasons")}>
            <Thumb down /> No
          </button>
        </div>
      ) : (
        <div className="helpful-reasons">
          <p className="helpful-q" id={`${id}-why`}>
            What wasn&rsquo;t right? (optional)
          </p>
          <div className="helpful-chips" role="group" aria-labelledby={`${id}-why`}>
            {FEEDBACK_REASONS.map((r) => (
              <button key={r} type="button" className="chip-btn" aria-pressed={reasons.includes(r)} onClick={() => toggle(r)}>
                {FEEDBACK_REASON_LABELS[r]}
              </button>
            ))}
          </div>
          <label className="helpful-note">
            <span>Anything else? (optional)</span>
            <textarea rows={2} maxLength={FEEDBACK_LIMITS.note} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <p className="muted helpful-fine">This goes with the question and the answer only, not with anything about you.</p>
          <div className="helpful-row">
            <button type="button" className="btn primary" disabled={sending} onClick={() => void send(false)}>
              {sending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              className="btn quiet"
              disabled={sending}
              onClick={() => {
                setMode("ask");
                setReasons([]);
                setNote("");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="unlock-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
