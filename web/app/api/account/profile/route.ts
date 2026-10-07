import { NextResponse } from "next/server";
import { ACCOUNT_UNAVAILABLE, ELSEWHERE, json, logFailure, requireSession } from "@/lib/account/http";
import { readJson, sameOrigin } from "@/lib/account/session";
import { parseProfile } from "@/lib/learner-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/profile {profile, join?, joinId?} → merge this device's copy of the profile into
 * the account (lib/account/merge.ts) and answer with the account's copy. `join` marks a device's
 * first sign-in, so its counts are added once (joinId makes a repeated join count once). The profile
 * is checked with parseProfile; with remembering off the device sends only that switch.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: ELSEWHERE }, 403);
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const body = await readJson(request, 64 * 1024);
  if (typeof body === "string") return json({ error: body }, 400);
  const b = (body.json ?? {}) as Record<string, unknown>;
  if (!b.profile || typeof b.profile !== "object") return json({ error: "Send the profile." }, 422);
  const joinId = typeof b.joinId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(b.joinId) ? b.joinId : undefined;

  try {
    const profile = await session.store.saveProfile(session.personId, parseProfile(b.profile), { join: b.join === true, joinId });
    return json({ profile });
  } catch (err) {
    logFailure("saving a profile failed", err);
    return json({ error: ACCOUNT_UNAVAILABLE }, 503);
  }
}
