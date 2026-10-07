import { accountSettings } from "@/lib/account/config";
import { parseFeedback } from "@/lib/account/feedback";
import { ELSEWHERE, json, logFailure } from "@/lib/account/http";
import { peopleStore } from "@/lib/account/people";
import { ipKey, readJson, sameOrigin } from "@/lib/account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

/**
 * POST /api/feedback {helpful, reasons?, note?, question, answer, sources} → keep one "Was this
 * helpful?" answer. It is not linked to the person: this route never reads who is signed in, and
 * keeps only the fields parseFeedback builds (never a profile).
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: ELSEWHERE }, 403);
  const settings = accountSettings();
  const store = peopleStore();
  if (!settings.feedback || !store) return json({ error: "Feedback isn't switched on yet." }, 404);

  const body = await readJson(request, 64 * 1024);
  if (typeof body === "string") return json({ error: body }, 400);
  const record = parseFeedback(body.json);
  if (typeof record === "string") return json({ error: record }, 422);

  try {
    if (!(await store.hit(`feedback-ip:${ipKey(request, settings.secret)}`, 30, HOUR)) || !(await store.hit("feedback-all", 1000, HOUR))) {
      return json({ error: "Thank you. That's enough feedback for now; please try again later." }, 429);
    }
    await store.addFeedback(record);
    return json({ ok: true });
  } catch (err) {
    logFailure("saving feedback failed", err);
    return json({ error: "Your feedback couldn't be saved just now." }, 503);
  }
}
