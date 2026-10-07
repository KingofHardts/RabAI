import { NextResponse } from "next/server";
import { accountSettings } from "@/lib/account/config";
import { newToken, tokenCheck, tokenShape } from "@/lib/account/crypto";
import { logFailure, setSessionCookie } from "@/lib/account/http";
import { peopleStore } from "@/lib/account/people";
import { ipKey, readCookie, sameOrigin, SESSION_COOKIE } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

/** Back to the sign-in page with a reason it didn't work. */
function failed(request: Request, reason: string) {
  return NextResponse.redirect(new URL(`/account/signin?error=${encodeURIComponent(reason)}`, request.url), 303);
}

/**
 * POST /api/account/signin (the "Sign in" button on /account/signin) → use the emailed link once,
 * make the account if this is the first sign-in, start a session, and go home. The link page only
 * shows the button: pressing it is what signs in, so a mail program that opens links to check them
 * can't use the link up.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return failed(request, "elsewhere");
  const settings = accountSettings();
  const store = peopleStore();
  if (!settings.enabled || !settings.secret || !store) return failed(request, "off");
  if (Number(request.headers.get("content-length") ?? "0") > 4096) return failed(request, "invalid");

  let token: unknown;
  try {
    token = (await request.formData()).get("token");
  } catch {
    return failed(request, "invalid");
  }
  if (!tokenShape(token)) return failed(request, "invalid");

  try {
    if (!(await store.hit(`signin-ip:${ipKey(request, settings.secret)}`, 30, HOUR))) return failed(request, "busy");
    const used = await store.useLoginLink(tokenCheck(token));
    if (!used.ok) return failed(request, used.reason);
    const { personId } = await store.findOrCreatePerson(used.emailCheck);
    const session = newToken();
    await store.createSession(personId, tokenCheck(session));

    // A session this browser had before (perhaps for another account) ends now.
    const old = readCookie(request, SESSION_COOKIE);
    if (tokenShape(old)) await store.deleteSession(tokenCheck(old)).catch(() => undefined);

    const res = NextResponse.redirect(new URL("/?signedin=1", request.url), 303);
    setSessionCookie(res, request, session);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    logFailure("signing in failed", err);
    return failed(request, "trouble");
  }
}
