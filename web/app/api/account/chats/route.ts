import { NextResponse } from "next/server";
import { ACCOUNT_UNAVAILABLE, ELSEWHERE, json, logFailure, requireSession } from "@/lib/account/http";
import { chatIdShape } from "@/lib/account/merge";
import { readJson, sameOrigin } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The most a device sends at once; it splits bigger saves into several. */
const MAX_BODY = 1_500_000;
const MAX_IDS = 20;

/** GET /api/account/chats?ids=a,b,c → those saved chats from the account (up to 20 at a time). */
export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(chatIdShape).slice(0, MAX_IDS);
  try {
    return json({ chats: await session.store.getChats(session.personId, ids) });
  } catch (err) {
    logFailure("reading chats failed", err);
    return json({ error: ACCOUNT_UNAVAILABLE }, 503);
  }
}

/**
 * POST /api/account/chats {upsert?, delete?, deleteAll?} → keep chats in the account (each kept only
 * when it changed after the account's copy) and mark deleted ones, so the person's other devices
 * drop them too. Chats are checked with parseChats and kept within the account's limits.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: ELSEWHERE }, 403);
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;

  const body = await readJson(request, MAX_BODY);
  if (typeof body === "string") return json({ error: body }, body.startsWith("That's too much") ? 413 : 400);
  const b = (body.json ?? {}) as Record<string, unknown>;
  const upsert = Array.isArray(b.upsert) ? b.upsert : [];
  let remove = Array.isArray(b.delete) ? b.delete.filter(chatIdShape) : [];

  try {
    if (b.deleteAll === true) {
      const index = await session.store.chatIndex(session.personId);
      remove = [...remove, ...index.live.map((c) => c.id)];
    }
    const result = await session.store.saveChats(session.personId, upsert, remove);
    return json({ ok: true, ...result });
  } catch (err) {
    logFailure("saving chats failed", err);
    return json({ error: ACCOUNT_UNAVAILABLE }, 503);
  }
}
