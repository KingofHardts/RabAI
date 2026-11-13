import { NextResponse } from "next/server";
import { calendarInfo, daySummary } from "@/lib/calendar/calendar";
import { whenForRequest } from "@/lib/calendar/place";
import { testingStore } from "@/lib/library/testing";

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
    // A cycle's "Open" is offered only when the library has the line it starts at.
    if (summary.learning?.some((l) => l.ref)) {
      const store = testingStore();
      const refs = summary.learning.flatMap((l) => (l.ref ? [l.ref] : []));
      const found = store
        ? await Promise.race([
            store.exact(refs).then((rows) => new Set(rows.map((p) => p.ref))),
            new Promise<null>((r) => setTimeout(() => r(null), 2500)),
          ]).catch(() => null)
        : null;
      summary.learning = summary.learning.map((l) => (l.ref && !found?.has(l.ref) ? { id: l.id, label: l.label, text: l.text } : l));
    }
    return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.warn("[rabai] the calendar failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The calendar isn't available right now." }, { status: 500 });
  }
}
