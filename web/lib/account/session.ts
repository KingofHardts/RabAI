import { accountSettings, type AccountSettings } from "./config";
import { ipCheck, tokenCheck, tokenShape } from "./crypto";
import { peopleStore, SESSION_LIFETIME_MS, type PeopleStore } from "./people";

/*
 * Who is signed in, for the server (docs/learner-profiles.md, phase 2). The browser holds the
 * session token in an httpOnly cookie; the database holds only its hash.
 */

export const SESSION_COOKIE = "rabai_session";

type Env = Record<string, string | undefined>;

/** A cookie's value from a request, or undefined. */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== name) continue;
    const value = part.slice(i + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

export interface Session {
  store: PeopleStore;
  settings: AccountSettings;
  personId: string;
  /** The token from the cookie, to delete the session on sign-out. */
  token: string;
  refreshed: boolean;
}

/**
 * The signed-in person, or null when accounts are off, there is no cookie, or the session is
 * unknown or expired. Throws when the people database can't be reached, so a caller can tell
 * "not signed in" from "couldn't check".
 */
export async function currentSession(request: Request, env: Env = process.env, store?: PeopleStore | null): Promise<Session | null> {
  const settings = accountSettings(env);
  if (!settings.enabled) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!tokenShape(token)) return null;
  const people = store ?? peopleStore(env);
  if (!people) return null;
  const found = await people.sessionPerson(tokenCheck(token));
  if (!found) return null;
  return { store: people, settings, personId: found.personId, token, refreshed: found.refreshed };
}

/** Settings for the session cookie. */
export function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure: isHttps(request),
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_LIFETIME_MS / 1000),
  };
}

export function isHttps(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Whether a request that changes something came from RabAI's own pages. A browser always says
 * where a form or fetch came from; a request from another site is refused, so no other site can
 * sign someone in or out, or change their account.
 */
export function sameOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** The address a request came from, for rate limits. Never stored as is (see ipCheck). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** A rate-limit key for the request's address. */
export function ipKey(request: Request, secret: string | null): string {
  return ipCheck(clientIp(request), secret ?? "rabai-no-secret");
}

/** Read a JSON body of at most `maxBytes`. A message (a string) when it is too big or not JSON. */
export async function readJson(request: Request, maxBytes: number): Promise<{ json: unknown } | string> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return "That's too much to send at once.";
  let text: string;
  try {
    text = await request.text();
  } catch {
    return "Send a JSON body.";
  }
  if (new TextEncoder().encode(text).length > maxBytes) return "That's too much to send at once.";
  try {
    return { json: JSON.parse(text) as unknown };
  } catch {
    return "Send a JSON body.";
  }
}
