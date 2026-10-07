/*
 * Whether accounts and "Was this helpful?" are switched on, from the app's settings
 * (docs/learner-profiles.md, phase 2; web/README.md lists them).
 *
 * - The people database (PEOPLE_DATABASE_URL, PEOPLE_AUTH_TOKEN) is needed for both.
 * - Sign-in also needs RABAI_AUTH_SECRET (at least 32 characters) and a way to send the link:
 *   Resend (RESEND_API_KEY and RABAI_MAIL_FROM). On a developer's own computer only (no VERCEL
 *   setting), the link is printed to the server's log instead, so sign-in can be tried without mail.
 * - Without them the app works exactly as before, with everything kept on the device.
 */

type Env = Record<string, string | undefined>;

export const MIN_SECRET_LENGTH = 32;

export interface AccountSettings {
  /** The people database is configured. */
  db: boolean;
  secret: string | null;
  mail: { apiKey: string; from: string } | null;
  /** Print sign-in links to the server log: only on a developer's computer, never on Vercel. */
  devLinks: boolean;
  /** Sign-in works. */
  enabled: boolean;
  /** "Was this helpful?" can be saved. */
  feedback: boolean;
  /** Where links in emails point, when it should not be the address the request came to. */
  appUrl: string | null;
}

export function accountSettings(env: Env = process.env): AccountSettings {
  const db = Boolean(env.PEOPLE_DATABASE_URL || env.RABAI_PEOPLE_DB_URL);
  const rawSecret = env.RABAI_AUTH_SECRET?.trim() ?? "";
  const secret = rawSecret.length >= MIN_SECRET_LENGTH ? rawSecret : null;
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RABAI_MAIL_FROM?.trim();
  const mail = apiKey && from ? { apiKey, from } : null;
  const devLinks = !mail && !env.VERCEL;
  // Emailed links point at RABAI_APP_URL, or on the live site at its production address, never at
  // whatever address a request claims to come to.
  const production = env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const appUrl = env.RABAI_APP_URL?.trim().replace(/\/+$/, "") || (production ? `https://${production}` : null);
  return {
    db,
    secret,
    mail,
    devLinks,
    enabled: db && !!secret && (!!mail || devLinks),
    feedback: db,
    appUrl: appUrl && /^https?:\/\/[^/\s]+$/.test(appUrl) ? appUrl : null,
  };
}
