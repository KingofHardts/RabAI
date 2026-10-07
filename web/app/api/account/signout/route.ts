import { tokenCheck, tokenShape } from "@/lib/account/crypto";
import { clearSessionCookie, ELSEWHERE, json, logFailure } from "@/lib/account/http";
import { peopleStore } from "@/lib/account/people";
import { readCookie, sameOrigin, SESSION_COOKIE } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/account/signout → end this browser's session. The account itself stays. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: ELSEWHERE }, 403);
  const token = readCookie(request, SESSION_COOKIE);
  const store = peopleStore();
  if (store && tokenShape(token)) {
    try {
      await store.deleteSession(tokenCheck(token));
    } catch (err) {
      // The cookie is cleared anyway, so this browser is signed out; the session would expire.
      logFailure("ending a session failed", err);
    }
  }
  const res = json({ ok: true });
  clearSessionCookie(res, request);
  return res;
}
