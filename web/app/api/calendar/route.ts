import { NextResponse } from "next/server";
import { calendarInfo, daySummary } from "@/lib/calendar/calendar";
import { whenForRequest } from "@/lib/calendar/place";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Today for the person: the date, the Hebrew date, the parsha, today's daf, what today is, and,
 * at their place, this Shabbat's times. The place comes in the body (never the address), so it
 * stays out of logs, and nothing is kept.
 */
export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const raw = body && typeof body === "object" ? (body as Record<string, unknown>).when : undefined;
  try {
    const when = whenForRequest(raw, request.headers);
    const summary = daySummary(calendarInfo({ tz: when.tz, place: when.place, prefs: when.prefs }));
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.warn("[rabai] the calendar failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The calendar isn't available right now." }, { status: 500 });
  }
}
