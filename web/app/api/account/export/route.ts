import { NextResponse } from "next/server";
import { ACCOUNT_UNAVAILABLE, json, logFailure, requireSession } from "@/lib/account/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/account/export → everything kept in the account, as a file to download. */
export async function GET(request: Request) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const { profile, chats } = await session.store.exportData(session.personId);
    const data = {
      exportedOn: new Date().toISOString(),
      about:
        "Everything RabAI keeps in your account: what you told RabAI and what it noticed while you learned (your profile), and your saved chats. Your email address isn't kept, so it isn't here.",
      profile,
      chats,
    };
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rabai-my-data.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logFailure("exporting an account failed", err);
    return json({ error: ACCOUNT_UNAVAILABLE }, 503);
  }
}
