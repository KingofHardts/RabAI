"use client";

import { useEffect, useRef, useState } from "react";
import type { AccountApi, AccountState } from "./use-account";

/*
 * "Your account": sign in by email link, and once signed in: download, sign out, or delete
 * (docs/learner-profiles.md, phase 2). RabAI doesn't keep the email address, so it never shows it
 * once the link is sent.
 */

export default function AccountDialog({ state, api, onClose }: { state: AccountState; api: AccountApi; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<"signout" | "delete" | null>(null);
  const first = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    (first.current ?? closeRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !email.trim()) return;
    setPending(true);
    setError("");
    const result = await api.sendLink(email.trim());
    setPending(false);
    if ("ok" in result) setSentTo(email.trim());
    else setError(result.error);
  }

  async function act(kind: "signout" | "delete") {
    setPending(true);
    setError("");
    const ok = kind === "signout" ? await api.signOut() : await api.deleteAccount();
    setPending(false);
    setConfirm(null);
    if (!ok) {
      setError(kind === "signout" ? "Couldn't sign out just now. Please try again." : "Couldn't delete your account just now. Please try again in a moment.");
    }
  }

  const { status } = state;

  return (
    <div className="about-view" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <div className="about-card account-card">
        <div className="about-head">
          <h2 id="account-title">Your account</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        {state.ended && status === "signed-out" && (
          <p className="note">Your sign-in ended, so your chats were taken off this device. They are safe in your account: sign in again to see them.</p>
        )}

        {status === "loading" ? (
          <p className="muted">Checking…</p>
        ) : status === "unavailable" ? (
          <p className="note">Your account can&rsquo;t be reached just now. Everything is still kept on this device. Please try again later.</p>
        ) : status === "off" ? (
          <p className="muted">Accounts aren&rsquo;t switched on yet. Everything stays on this device.</p>
        ) : status === "signed-in" ? (
          <>
            <p className="account-lead">
              <strong>You&rsquo;re signed in.</strong> Your chats and what RabAI knows about you are kept in your account, and
              follow you to your other devices.
            </p>
            {state.syncError && (
              <p className="note">
                Couldn&rsquo;t save to your account just now. Your changes are kept on this device and will be saved when RabAI
                can reach your account.
              </p>
            )}
            <div className="account-actions">
              <a className="btn" href="/api/account/export" download="rabai-my-data.json">
                Download my data
              </a>
              {confirm === "signout" ? null : (
                <button type="button" className="btn" disabled={pending} onClick={() => setConfirm("signout")}>
                  Sign out
                </button>
              )}
            </div>
            {confirm === "signout" && (
              <div className="account-confirm" role="group" aria-label="Sign out">
                <p>
                  Sign out on this device? Your chats and what RabAI knows about you stay in your account, and are taken off this
                  device.
                </p>
                <div className="account-actions">
                  <button type="button" className="btn primary" disabled={pending} onClick={() => void act("signout")}>
                    {pending ? "Signing out…" : "Sign out"}
                  </button>
                  <button type="button" className="btn quiet" disabled={pending} onClick={() => setConfirm(null)}>
                    Stay signed in
                  </button>
                </div>
              </div>
            )}
            <section className="account-danger" aria-label="Delete your account">
              {confirm === "delete" ? (
                <div className="account-confirm">
                  <p>
                    <strong>Delete your account?</strong> This deletes your chats and everything RabAI knows about you, from your
                    account and from this device. It can&rsquo;t be undone.
                  </p>
                  <div className="account-actions">
                    <button type="button" className="btn danger" disabled={pending} onClick={() => void act("delete")}>
                      {pending ? "Deleting…" : "Delete my account"}
                    </button>
                    <button type="button" className="btn quiet" disabled={pending} onClick={() => setConfirm(null)}>
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn quiet danger-text" disabled={pending} onClick={() => setConfirm("delete")}>
                  Delete my account
                </button>
              )}
            </section>
          </>
        ) : sentTo ? (
          <div className="account-sent" role="status">
            <p>
              <strong>Check your email.</strong> We sent a sign-in link to <span className="account-email">{sentTo}</span>. It
              works once, for the next 15 minutes. Open it on the device you want to sign in on.
            </p>
            <p className="muted">Nothing there? Look in your spam folder, or wait a minute and try again.</p>
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                setSentTo(null);
                setError("");
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p className="account-lead">
              Sign in, and your chats and what RabAI knows about you follow you to your phone and your computer. There&rsquo;s no
              password: RabAI emails you a link.
            </p>
            <form className="account-form" onSubmit={send}>
              <label htmlFor="account-email">Your email</label>
              <input
                ref={first}
                id="account-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? "account-error" : "account-hint"}
              />
              <p id="account-hint" className="muted">
                Your address is used only to send the link. RabAI doesn&rsquo;t keep it.
              </p>
              <button className="btn primary" type="submit" disabled={pending || !email.trim()}>
                {pending ? "Sending…" : "Send me a link"}
              </button>
            </form>
          </>
        )}

        {error && (
          <p id="account-error" className="unlock-error" role="alert">
            {error}
          </p>
        )}

        <p className="account-foot">
          <a href="/privacy" target="_blank" rel="noopener">
            What RabAI keeps, and why
          </a>
        </p>
      </div>
    </div>
  );
}
