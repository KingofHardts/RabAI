import { NextResponse } from "next/server";
import { currentSession, SESSION_COOKIE, sessionCookieOptions, type Session } from "./session";

/* Small helpers the account routes share. Server only. */

/** A JSON answer that browsers and proxies never keep. */
export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function setSessionCookie(res: NextResponse, request: Request, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
}

export function clearSessionCookie(res: NextResponse, request: Request): void {
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(request), maxAge: 0 });
}

export const NOT_SIGNED_IN = "You're not signed in.";
export const ACCOUNTS_OFF = "Accounts aren't switched on yet.";
export const ACCOUNT_UNAVAILABLE = "Your account can't be reached just now. Please try again in a moment.";
export const ELSEWHERE = "That request didn't come from RabAI.";

/** Log a failure without anything about the person in it. */
export function logFailure(what: string, err: unknown): void {
  console.error(`[rabai] ${what}:`, err instanceof Error ? err.message : err);
}

/** The signed-in person, or the answer to send when there isn't one (401) or it can't be checked (503). */
export async function requireSession(request: Request): Promise<Session | NextResponse> {
  try {
    const session = await currentSession(request);
    return session ?? json({ error: NOT_SIGNED_IN }, 401);
  } catch (err) {
    logFailure("checking the session failed", err);
    return json({ error: ACCOUNT_UNAVAILABLE }, 503);
  }
}
