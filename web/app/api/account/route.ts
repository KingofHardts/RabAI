import { accountSettings } from "@/lib/account/config";
import { accountTag } from "@/lib/account/crypto";
import { ACCOUNT_UNAVAILABLE, clearSessionCookie, ELSEWHERE, json, logFailure, NOT_SIGNED_IN, setSessionCookie } from "@/lib/account/http";
import { currentSession, readCookie, sameOrigin, SESSION_COOKIE } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/account → whether accounts and feedback are switched on, whether this browser is signed
 * in, and, when it is: a short label for the account (so the device knows whose copy it holds), the
 * profile, and the list of saved chats (ids and when each last changed; the chats themselves come
 * from /api/account/chats). `signedIn: null` with status 503 means it couldn't be checked: the
 * device must change nothing then.
 */
export async function GET(request: Request) {
  const settings = accountSettings();
  const base = { enabled: settings.enabled, feedback: settings.feedback };
  if (!settings.enabled || !settings.secret) return json({ ...base, signedIn: false });

  try {
    const session = await currentSession(request);
    if (!session) {
      const res = json({ ...base, signedIn: false });
      if (readCookie(request, SESSION_COOKIE) !== undefined) clearSessionCookie(res, request);
      return res;
    }
    const [profile, index] = await Promise.all([session.store.getProfile(session.personId), session.store.chatIndex(session.personId)]);
    const res = json({
      ...base,
      signedIn: true,
      account: accountTag(session.personId, settings.secret),
      profile,
      chats: index.live,
      deletedChats: index.deleted,
    });
    if (session.refreshed) setSessionCookie(res, request, session.token);
    return res;
  } catch (err) {
    logFailure("checking the account failed", err);
    return json({ ...base, signedIn: null, error: ACCOUNT_UNAVAILABLE }, 503);
  }
}

/** DELETE /api/account → delete the account and everything kept for it, and sign out. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: ELSEWHERE }, 403);
  try {
    const session = await currentSession(request);
    if (!session) return json({ error: NOT_SIGNED_IN }, 401);
    await session.store.deleteAccount(session.personId);
    const res = json({ ok: true });
    clearSessionCookie(res, request);
    return res;
  } catch (err) {
    logFailure("deleting an account failed", err);
    return json({ error: ACCOUNT_UNAVAILABLE }, 503);
  }
}
