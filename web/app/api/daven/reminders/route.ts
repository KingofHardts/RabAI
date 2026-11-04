import { NextResponse } from "next/server";
import { whenForRequest } from "@/lib/calendar/place";
import { kiddushLevanaReminders, minchaReminders, yahrzeitDates } from "@/lib/calendar/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reminders for the Daven tab, which the device turns into a calendar file:
 * {"kind": "mincha", "when": {...}, "minutes": 30}, {"kind": "kiddush-levana", "from": 3 | 7},
 * {"kind": "yahrzeit", "date": "2020-03-05", "afterSunset": false}. The place comes in the body,
 * like the calendar's, and a yahrzeit is worked out from a date only (never a name). Nothing is kept.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as Record<string, unknown>;
  } catch {
    /* empty body */
  }
  const kind = body.kind;
  try {
    const when = whenForRequest(body.when, request.headers);
    if (kind === "mincha") {
      if (!when.place) return NextResponse.json({ error: "Set your place first, so the times are right for where you are." }, { status: 400 });
      const minutes = Math.min(120, Math.max(5, Number(body.minutes) || 30));
      return NextResponse.json({ items: minchaReminders(when.place, when.tz ?? "UTC", new Date(), 30, minutes) });
    }
    if (kind === "kiddush-levana") {
      return NextResponse.json({ items: kiddushLevanaReminders(when.tz ?? "UTC", new Date(), 6, body.from === 7 ? 7 : 3) });
    }
    if (kind === "yahrzeit") {
      const result = yahrzeitDates(String(body.date ?? ""), body.afterSunset === true);
      if (!result) return NextResponse.json({ error: "Give the date of the passing, in the past." }, { status: 400 });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Which reminder?" }, { status: 400 });
  } catch (err) {
    console.warn("[rabai] reminders failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The reminders aren't available right now." }, { status: 500 });
  }
}
