import type { Metadata } from "next";
import Link from "next/link";
import { accountSettings } from "@/lib/account/config";
import { tokenShape } from "@/lib/account/crypto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in · RabAI",
  // The link's token is in this page's address: never send it on to another site. ("no-referrer"
  // would also blank the Origin of the page's own Sign in button, which the server checks.)
  referrer: "same-origin",
};

const PROBLEMS: Record<string, string> = {
  used: "This link has already been used. Each link works once. You can ask for a new one in RabAI: the gear at the top, then Your account.",
  expired: "This link has expired. Links work for 15 minutes. You can ask for a new one in RabAI: the gear at the top, then Your account.",
  unknown: "This link isn't one RabAI can use. It may have been copied only in part. You can ask for a new one in RabAI.",
  invalid: "This link isn't complete. It may have been copied only in part. You can ask for a new one in RabAI.",
  busy: "There were too many tries from here. Please wait a little and try the link again.",
  off: "Accounts aren't switched on yet.",
  elsewhere: "That didn't come from this page. Please open the link from your email again.",
  trouble: "Something went wrong signing you in. Please try the link again in a moment.",
};

/**
 * Where an emailed sign-in link opens. It only shows a button: pressing it (a POST) is what uses the
 * link, so a mail program that opens links to scan them can't use it up.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const settings = accountSettings();
  const problem = error ? (PROBLEMS[error] ?? PROBLEMS.trouble) : !settings.enabled ? PROBLEMS.off : !tokenShape(token) ? PROBLEMS.invalid : null;

  return (
    <main className="unlock">
      <div className="unlock-card">
        <div className="brand signin">
          <div className="mark" aria-hidden="true">
            ר
          </div>
          <h1>Sign in to RabAI</h1>
        </div>
        {problem ? (
          <>
            <p role="alert">{problem}</p>
            <p className="unlock-links">
              <Link href="/">Back to RabAI</Link>
            </p>
          </>
        ) : (
          <>
            <p>Press the button to finish signing in on this device. Your chats and what RabAI knows about you will follow you here.</p>
            <form method="post" action="/api/account/signin" className="unlock-form">
              <input type="hidden" name="token" value={token} />
              <button className="send" type="submit">
                Sign in
              </button>
            </form>
            <p className="unlock-links">
              <Link href="/privacy">What RabAI keeps, and why</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
