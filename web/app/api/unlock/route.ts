import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACCESS_MAX_AGE, accessToken, codeMatches, gate } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WRONG_CODE_DELAY_MS = 800;

export async function POST(request: Request) {
  const g = gate();
  if (g.kind === "open") return NextResponse.json({ ok: true });
  if (g.kind === "closed") return NextResponse.json({ error: "RabAI isn't open yet." }, { status: 403 });

  let typed = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    if (typeof body.code === "string") typed = body.code.slice(0, 200);
  } catch {
    return NextResponse.json({ error: "Send the code as JSON." }, { status: 400 });
  }

  if (!(await codeMatches(typed, g.code))) {
    // A short pause makes guessing slow.
    await new Promise((r) => setTimeout(r, WRONG_CODE_DELAY_MS));
    return NextResponse.json({ error: "That code isn't right." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, await accessToken(g.code), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  return response;
}
