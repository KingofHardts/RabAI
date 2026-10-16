import { NextResponse } from "next/server";
import { jobCheck, jobShape, jobStore, runningAnswer, type JobView } from "@/lib/answer-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * An answer the page asked for and then left (lib/answer-jobs.ts). The page names it by the id it
 * chose when it asked:
 *   GET    ?id=…  what has happened so far: the progress, the text, and the checked answer when done
 *   POST   {"id": "…", "action": "stop"}  stop writing it
 *   DELETE ?id=…  the page has the answer; nothing more is kept
 */

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

function idFrom(request: Request): string | null {
  const id = new URL(request.url).searchParams.get("id");
  return jobShape(id) ? id : null;
}

function view(v: JobView) {
  return { status: v.status, steps: v.steps, text: v.status === "running" ? v.text : "", ...(v.result ? { result: v.result } : {}), startedAt: v.startedAt };
}

export async function GET(request: Request) {
  const id = idFrom(request);
  if (!id) return json({ error: "That answer id isn't valid." }, 422);
  const check = jobCheck(id);
  // Being written on this very server: the freshest copy.
  const here = runningAnswer(check);
  if (here) return json(view(here.view()));
  try {
    const kept = await jobStore().read(check);
    if (!kept) return json({ status: "unknown" }, 404);
    return json(view(kept));
  } catch (err) {
    console.warn("[rabai] reading a kept answer failed:", err instanceof Error ? err.message : err);
    return json({ error: "RabAI couldn't check on that answer just now." }, 503);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send a JSON body." }, 400);
  }
  const b = (body ?? {}) as Record<string, unknown>;
  if (!jobShape(b.id) || b.action !== "stop") return json({ error: "Send an answer id and \"stop\"." }, 422);
  const check = jobCheck(b.id);
  const here = runningAnswer(check);
  if (here) {
    here.stop();
    return json({ stopping: true });
  }
  try {
    await jobStore().requestStop(check);
    return json({ stopping: true });
  } catch (err) {
    console.warn("[rabai] stopping a kept answer failed:", err instanceof Error ? err.message : err);
    return json({ error: "RabAI couldn't stop that answer just now." }, 503);
  }
}

export async function DELETE(request: Request) {
  const id = idFrom(request);
  if (!id) return json({ error: "That answer id isn't valid." }, 422);
  try {
    await jobStore().remove(jobCheck(id));
  } catch (err) {
    console.warn("[rabai] removing a kept answer failed:", err instanceof Error ? err.message : err);
  }
  return json({ removed: true });
}
