import { after, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { libraryMode } from "@/lib/library";
import { parseProfile } from "@/lib/learner-profile";
import { profileForAsk } from "@/lib/account/ask-profile";
import { anthropicClient, ask, LIMITS, LINE_ACTIONS, type AskInput, type AskResult, type LineAction, type Turn } from "@/lib/engine/answer";
import { jobCheck, jobShape, jobStore, noJobStore, runAnswer, type LiveEvent } from "@/lib/answer-jobs";
import { PICTURE_LIMITS, picturesSize, questionForPictures, readPictures, type QuestionPicture } from "@/lib/pictures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Thoughtful answers can take a while: an online lookup (up to 45 seconds, lib/engine/online.ts),
// then the answer, which streams. The project runs on Fluid compute, which allows 300 seconds.
// An answer keeps being written after the page that asked for it goes away (after(), below), for
// as long as this allows.
export const maxDuration = 300;

function parse(body: unknown): AskInput | string {
  if (!body || typeof body !== "object") return "Send a JSON body.";
  const b = body as Record<string, unknown>;

  let question = typeof b.question === "string" ? b.question : "";
  if (question.length > LIMITS.questionChars) return `Please keep questions under ${LIMITS.questionChars} characters.`;

  const action = typeof b.action === "string" ? (b.action as LineAction) : undefined;
  if (action && !LINE_ACTIONS.includes(action)) return "Unknown action.";

  const pictures = action ? [] : readPictures(b.pictures, PICTURE_LIMITS.perQuestion);
  if (typeof pictures === "string") return pictures;

  const focusRef = typeof b.focusRef === "string" ? b.focusRef.slice(0, 120) : undefined;
  if (action && !focusRef) return "An action needs a line to act on.";
  if (!question.trim() && !action && !pictures.length) return "Please ask a question.";
  if (action === "check" && !question.trim()) return "Type your translation first.";
  // Pictures sent without words get a plain question, which the history repeats.
  if (!question.trim() && pictures.length) question = questionForPictures(pictures.length);

  const word = typeof b.word === "string" ? b.word.trim().slice(0, LIMITS.wordChars) : undefined;
  if (action === "word" && !word) return "Which word?";

  const history: Turn[] = [];
  // Pictures from earlier in the chat: only the most recent few are sent again (the app does the
  // same), and they count toward the size limit with the question's own.
  let earlierPictures = 0;
  if (Array.isArray(b.history)) {
    const turns = b.history.slice(-LIMITS.historyTurns);
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (!t || typeof t !== "object") continue;
      const { role, text, pictures: raw } = t as Record<string, unknown>;
      if ((role !== "user" && role !== "assistant") || typeof text !== "string") continue;
      let kept: QuestionPicture[] = [];
      if (role === "user" && raw !== undefined && earlierPictures < PICTURE_LIMITS.inHistory) {
        const read = readPictures(raw, PICTURE_LIMITS.inHistory);
        if (typeof read === "string") return read;
        kept = read.slice(0, PICTURE_LIMITS.inHistory - earlierPictures);
        earlierPictures += kept.length;
      }
      history.unshift({ role, text: text.slice(0, LIMITS.historyChars), ...(kept.length ? { pictures: kept } : {}) });
    }
  }
  const allPictures = [...pictures, ...history.flatMap((t) => t.pictures ?? [])];
  if (picturesSize(allPictures) > PICTURE_LIMITS.totalChars) return "Those pictures are too large together. Please send fewer, or smaller ones.";

  const profile = b.profile && typeof b.profile === "object" ? parseProfile(b.profile) : undefined;
  return {
    question,
    action,
    focusRef,
    word,
    history,
    growth: b.growth === true,
    deep: b.deep === true,
    ...(pictures.length ? { pictures } : {}),
    ...(profile ? { profile } : {}),
  };
}

function failedAnswer(): AskResult {
  return {
    status: "error",
    blocks: [],
    sources: [],
    retrieved: [],
    safety: null,
    libraryMode: libraryMode(),
    droppedCitations: 0,
    notice: "Something went wrong reaching RabAI. Please try again in a moment.",
  };
}

/** How often a quiet live answer says it is still there, so no connection on the way gives up. */
const KEEP_ALIVE_MS = 15_000;

/**
 * A live answer, one JSON object per line: {"type":"status","text"} while RabAI looks and
 * reads, {"type":"text","text"} for each new piece of the answer, and finally
 * {"type":"done","result"} with the checked answer (or {"type":"stopped"} when the person stopped
 * it). Citations appear only in the final result, after the checker has passed them.
 *
 * With a job id (lib/answer-jobs.ts), the answer keeps being written when the page goes away, and
 * the page can pick it up later from /api/ask/job. Without one, nothing is kept.
 */
function liveAnswer(input: AskInput, jobId: string | null): Response {
  const check = jobId ? jobCheck(jobId) : `once-${randomBytes(12).toString("hex")}`;
  const answer = runAnswer(check, (hooks) => ask(input, anthropicClient(), undefined, undefined, hooks), {
    store: jobId ? jobStore() : noJobStore(),
    failed: failedAnswer,
  });
  // Keep this server writing the answer until it is done, even after the page has gone.
  after(() => answer.done);

  const encoder = new TextEncoder();
  let unlisten: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const end = () => {
        if (!open) return;
        open = false;
        if (ping) clearInterval(ping);
        unlisten?.();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const send = (event: LiveEvent | { type: "wait" }) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // The page went away. The answer goes on; the page can pick it up later.
          open = false;
          if (ping) clearInterval(ping);
          unlisten?.();
        }
      };
      unlisten = answer.listen((event) => {
        send(event);
        if (event.type === "done" || event.type === "stopped") end();
      });
      ping = setInterval(() => send({ type: "wait" }), KEEP_ALIVE_MS);
    },
    cancel() {
      if (ping) clearInterval(ping);
      unlisten?.();
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const parsed = parse(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 422 });
  // Signed in, the account's profile is used in place of the device's copy (lib/account/ask-profile.ts).
  const profile = await profileForAsk(request, parsed.profile);
  const input: AskInput = { ...parsed, profile };
  if (!profile) delete input.profile;
  const b = body as Record<string, unknown>;
  if (b.stream === true) {
    if (b.job !== undefined && !jobShape(b.job)) return NextResponse.json({ error: "That answer id isn't valid." }, { status: 422 });
    return liveAnswer(input, jobShape(b.job) ? b.job : null);
  }

  const result = await ask(input, anthropicClient());
  const status = result.status === "no_key" ? 503 : result.status === "error" ? 502 : 200;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
