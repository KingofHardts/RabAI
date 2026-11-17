import { NextResponse } from "next/server";
import { whenForRequest } from "@/lib/calendar/place";
import { luachDay } from "@/lib/calendar/luach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Any day's summary for the Daven tab's Times and Calendar: its times at the person's place, what
 * the day is, and the davening's changes. The place comes in the body, never kept or logged.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  if (!date) return NextResponse.json({ error: "A date is needed." }, { status: 400 });
  const y = Number(date.slice(0, 4));
  if (y < 1900 || y > 2200) return NextResponse.json({ error: "That date is out of range." }, { status: 400 });
  try {
    return NextResponse.json(luachDay(date, whenForRequest(body.when, request.headers)), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.warn("[rabai] the day's calendar failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The calendar isn't available right now." }, { status: 500 });
  }
}
