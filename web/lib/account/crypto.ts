import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/*
 * The small pieces of cryptography accounts need (docs/learner-profiles.md, phase 2). Server only.
 *
 * - The email address is never stored. RabAI keeps an HMAC of it ("email check") made with a
 *   server secret, RABAI_AUTH_SECRET, so the same address finds the same account, and the stored
 *   value can't be turned back into the address or matched against a list of addresses without
 *   the secret.
 * - Sign-in links and sessions are long random tokens. Only a SHA-256 of each is stored, so a
 *   copy of the database can't be used to sign in.
 */

/** The longest email address the standards allow. */
export const MAX_EMAIL = 254;

/** An address as typed, made comparable: Unicode-normalized, trimmed and lowercased. */
export function normalizeEmail(email: string): string {
  return email.normalize("NFC").trim().toLowerCase();
}

/** Whether a typed address looks like one that can receive mail. Deliberately plain. */
export function validEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const e = normalizeEmail(email);
  if (e.length < 3 || e.length > MAX_EMAIL) return false;
  // No spaces, control characters or the characters that end a header or a link.
  if (/[\s\p{C}<>()[\]\\,;:"]/u.test(e)) return false;
  const at = e.lastIndexOf("@");
  if (at < 1 || at !== e.indexOf("@")) return false;
  const domain = e.slice(at + 1);
  return /^[^.@]+(\.[^.@]+)+$/.test(domain) && domain.length <= 253;
}

function hmac(secret: string, purpose: string, value: string): string {
  return createHmac("sha256", secret).update(`${purpose}\u0000${value}`).digest("hex");
}

/** The stored stand-in for an email address. */
export function emailCheck(email: string, secret: string): string {
  return hmac(secret, "rabai-email-v1", normalizeEmail(email));
}

/** A stand-in for a network address, for rate limits only. Short, and never the address itself. */
export function ipCheck(ip: string, secret: string): string {
  return hmac(secret, "rabai-ip-v1", ip.trim().toLowerCase()).slice(0, 32);
}

/**
 * A short, stable label for an account that the device can keep, to know whether the copy it holds
 * belongs to the account that is signed in now. It reveals nothing about the person.
 */
export function accountTag(personId: string, secret: string): string {
  return hmac(secret, "rabai-account-tag-v1", personId).slice(0, 24);
}

/** A new sign-in or session token: 32 random bytes, safe in a link. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What a token looks like: 43 characters of base64url. Anything else is refused before any lookup. */
export function tokenShape(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** The stored stand-in for a token. */
export function tokenCheck(token: string): string {
  return createHash("sha256").update(`rabai-token-v1\u0000${token}`).digest("hex");
}

/** Constant-time comparison of two hex checks of the same kind. */
export function sameCheck(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/** A random id for a person or a feedback row. */
export function newId(): string {
  return randomBytes(16).toString("hex");
}
