"use client";

import { useState } from "react";
import { textReport } from "@/lib/account/feedback";

/**
 * "Something in this text looks wrong?": a short note, kept for the maintainer to check against the
 * printed edition (lib/account/feedback.ts, textReport). Not linked to the person; changes nothing
 * in the library by itself.
 */
export default function TextReport({ refName, text, word }: { refName: string; text: string; word?: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"" | "sending" | "sent" | "failed">("");
  if (state === "sent") return <p className="fine-left text-report-done">Thank you. It&apos;s kept for the team to check against the printed book.</p>;
  if (!open)
    return (
      <button type="button" className="link text-report-open" onClick={() => setOpen(true)}>
        {word ? "This word looks wrong" : "Something in this text looks wrong?"}
      </button>
    );
  const send = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textReport({ ref: refName, text, word, note })),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  };
  return (
    <div className="text-report">
      <label className="fine-left" htmlFor={`tr-${refName}`}>
        {word ? `What looks wrong about “${word}”?` : "What looks wrong? A misspelled word, a missing line, the wrong translation…"}
      </label>
      <textarea id={`tr-${refName}`} rows={2} maxLength={900} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="text-report-actions">
        <button type="button" className="btn" disabled={state === "sending"} onClick={() => void send()}>
          Send
        </button>
        <button type="button" className="btn quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {state === "failed" && <p className="fine-left">It couldn&apos;t be sent just now. Please try again later.</p>}
      <p className="fine-left">Only this line and your note are sent, not who you are.</p>
    </div>
  );
}
