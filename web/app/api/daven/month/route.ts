import { NextResponse } from "next/server";
import { whenForRequest } from "@/lib/calendar/place";
import { luachMonth } from "@/lib/calendar/luach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A civil month of the Hebrew calendar for the Daven tab's Calendar (Israel or outside, by the person's place). */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const year = Number(body.year);
  const month = Number(body.month);
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || !Number.isInteger(month) || month < 1 || month > 12)
    return NextResponse.json({ error: "A year and month are needed." }, { status: 400 });
  try {
    const when = whenForRequest(body.when, request.headers);
    const il = Boolean(when.place?.il) || (!when.place && when.tz === "Asia/Jerusalem");
    return NextResponse.json({ ...luachMonth(year, month, il), israel: il }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.warn("[rabai] the month failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The calendar isn't available right now." }, { status: 500 });
  }
}
