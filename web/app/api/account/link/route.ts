import { accountSettings } from "@/lib/account/config";
import { emailCheck, newToken, tokenCheck, validEmail } from "@/lib/account/crypto";
import { ACCOUNT_UNAVAILABLE, ACCOUNTS_OFF, ELSEWHERE, json, logFailure } from "@/lib/account/http";
import { MailError, sendSignInEmail } from "@/lib/account/mail";
import { peopleStore } from "@/lib/account/people";
import { ipKey, readJson, sameOrigin } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
/** Sign-in emails to one address in an hour. */
const PER_ADDRESS = 5;
/** Sign-in emails from one network address in an hour. */
const PER_IP = 20;

/**
 * POST /api/account/link {email} → email a sign-in link. The answer is the same whether or not the
 * address has an account (there is no difference: the first sign-in makes one), and the address is
 * used only to send the email. Only an HMAC of it is stored.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: ELSEWHERE }, 403);
  const settings = accountSettings();
  const store = peopleStore();
  if (!settings.enabled || !settings.secret || !store) return json({ error: ACCOUNTS_OFF }, 404);

  const body = await readJson(request, 4096);
  if (typeof body === "string") return json({ error: body }, 400);
  const email = (body.json as { email?: unknown } | null)?.email;
  if (!validEmail(email)) return json({ error: "Please check the email address." }, 422);

  try {
    if (!(await store.hit(`link-ip:${ipKey(request, settings.secret)}`, PER_IP, HOUR))) {
      return json({ error: "Too many sign-in emails were asked for from here. Please try again in an hour." }, 429);
    }
    const check = emailCheck(email, settings.secret);
    // Over the limit for this address: answer the same way, without sending, so nobody can learn
    // from the answer that someone else has been asking for this address.
    if (await store.hit(`link-email:${check}`, PER_ADDRESS, HOUR)) {
      const token = newToken();
      await store.createLoginLink(check, tokenCheck(token));
      const link = `${settings.appUrl ?? new URL(request.url).origin}/account/signin?token=${token}`;
      if (settings.mail) await sendSignInEmail(email.trim(), link, settings.mail);
      else if (settings.devLinks) console.log(`[rabai] Sign-in link (shown only in local development): ${link}`);
    }
    void store.cleanup().catch((err) => logFailure("tidying the people database failed", err));
    return json({ ok: true });
  } catch (err) {
    if (err instanceof MailError) {
      logFailure("sending a sign-in email failed", err);
      return json({ error: "We couldn't send the email just now. Please try again in a few minutes." }, 502);
    }
    logFailure("making a sign-in link failed", err);
    return json({ error: ACCOUNT_UNAVAILABLE }, 503);
  }
}
