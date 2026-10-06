"use client";

import { useState } from "react";

export default function UnlockForm({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || pending) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        window.location.assign(next);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Couldn't reach RabAI. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="unlock-form">
      <label htmlFor="access-code">Access code</label>
      <input
        id="access-code"
        type="password"
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        aria-describedby={error ? "access-error" : undefined}
      />
      {error ? (
        <p id="access-error" className="unlock-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="send" type="submit" disabled={pending || !code.trim()}>
        {pending ? "Checking…" : "Open RabAI"}
      </button>
    </form>
  );
}
