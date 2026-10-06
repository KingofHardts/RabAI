/*
 * The access code that keeps a deployment private until the rabbinic board approves a launch.
 *
 * - On your computer (no VERCEL variable): open, so development needs no code.
 * - Online with RABAI_ACCESS_CODE set: anyone who enters the code may use the app.
 * - Online with no code set: closed. Forgetting the code must never leave the app public,
 *   because every answer costs money and the library is not approved yet.
 * - RABAI_PUBLIC=true opens it to everyone. Set it only after the board approves a launch.
 *
 * The browser keeps a hash of the code, never the code itself. Changing the code signs
 * everyone out.
 */

export const ACCESS_COOKIE = "rabai_access";
export const ACCESS_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Gate = { kind: "open" } | { kind: "code"; code: string } | { kind: "closed" };

type Env = Record<string, string | undefined>;

export function gate(env: Env = process.env): Gate {
  if (env.RABAI_PUBLIC === "true") return { kind: "open" };
  const code = env.RABAI_ACCESS_CODE?.trim();
  if (code) return { kind: "code", code };
  if (env.VERCEL) return { kind: "closed" };
  return { kind: "open" };
}

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** What the browser stores once the right code is entered. */
export function accessToken(code: string): Promise<string> {
  return sha256(`rabai-access-v1:${normalize(code)}`);
}

function normalize(code: string): string {
  return code.trim().toLowerCase();
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Whether a typed code is the right one. Spaces at either end and letter case are ignored. */
export async function codeMatches(typed: string, code: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(normalize(typed)), sha256(normalize(code))]);
  return sameText(a, b);
}

/** Whether a stored cookie value was made from the current code. */
export async function tokenValid(token: string | undefined, code: string): Promise<boolean> {
  if (!token) return false;
  return sameText(token, await accessToken(code));
}

/** Where to send someone after they unlock: only paths on this site. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
