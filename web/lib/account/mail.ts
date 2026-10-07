/*
 * The sign-in email, sent through Resend's HTTP API (RESEND_API_KEY, from RABAI_MAIL_FROM). Plain
 * and short. The address is used only to send this one email; it is never stored.
 */

export function signInEmail(link: string): { subject: string; text: string; html: string } {
  const subject = "Your sign-in link for RabAI";
  const text = [
    "Shalom,",
    "",
    "Here is your link to sign in to RabAI:",
    link,
    "",
    "It works once, for the next 15 minutes. Open it on the device you want to sign in on.",
    "",
    "If you didn't ask for this, you can ignore this email. Nothing happens without the link.",
    "",
    "RabAI",
  ].join("\n");
  const safe = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html><html><body style="font-family: Georgia, serif; font-size: 17px; line-height: 1.6; color: #1F1B16; background: #FBF8F1; padding: 24px;">
<p>Shalom,</p>
<p>Here is your link to sign in to RabAI:</p>
<p><a href="${safe}" style="display: inline-block; background: #22508C; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 999px; font-family: Arial, sans-serif; font-size: 15px;">Sign in to RabAI</a></p>
<p style="font-size: 14px; color: #5b5346;">Or copy this address into your browser:<br>${safe}</p>
<p>It works once, for the next 15 minutes. Open it on the device you want to sign in on.</p>
<p>If you didn't ask for this, you can ignore this email. Nothing happens without the link.</p>
<p>RabAI</p>
</body></html>`;
  return { subject, text, html };
}

export class MailError extends Error {}

/** Send the sign-in link. Throws MailError when the mail service refuses or can't be reached. */
export async function sendSignInEmail(
  to: string,
  link: string,
  mail: { apiKey: string; from: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { subject, text, html } = signInEmail(link);
  let res: Response;
  try {
    res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${mail.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: mail.from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new MailError(`The mail service couldn't be reached (${err instanceof Error ? err.name : "error"}).`);
  }
  if (!res.ok) {
    // The service's answer names the problem (for example an unverified sending domain). Any email
    // address in it is blanked out, so the person's address never reaches a log.
    const detail = (await res.text().catch(() => ""))
      .replace(/[^\s"'<>@]+@[^\s"'<>@]+/g, "[address]")
      .replace(/\s+/g, " ")
      .slice(0, 200);
    throw new MailError(`The mail service answered ${res.status}: ${detail}`);
  }
}
