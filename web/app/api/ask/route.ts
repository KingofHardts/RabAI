import { NextResponse } from "next/server";
import { anthropicClient, ask, LIMITS, LINE_ACTIONS, type AskInput, type LineAction, type Turn } from "@/lib/engine/answer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Thoughtful answers can take a while; the model call streams internally.
export const maxDuration = 120;

function parse(body: unknown): AskInput | string {
  if (!body || typeof body !== "object") return "Send a JSON body.";
  const b = body as Record<string, unknown>;

  const question = typeof b.question === "string" ? b.question : "";
  if (question.length > LIMITS.questionChars) return `Please keep questions under ${LIMITS.questionChars} characters.`;

  const action = typeof b.action === "string" ? (b.action as LineAction) : undefined;
  if (action && !LINE_ACTIONS.includes(action)) return "Unknown action.";

  const focusRef = typeof b.focusRef === "string" ? b.focusRef.slice(0, 120) : undefined;
  if (action && !focusRef) return "An action needs a line to act on.";
  if (!question.trim() && !action) return "Please ask a question.";
  if (action === "check" && !question.trim()) return "Type your translation first.";

  const word = typeof b.word === "string" ? b.word.trim().slice(0, LIMITS.wordChars) : undefined;
  if (action === "word" && !word) return "Which word?";

  const history: Turn[] = [];
  if (Array.isArray(b.history)) {
    for (const t of b.history.slice(-LIMITS.historyTurns)) {
      if (!t || typeof t !== "object") continue;
      const { role, text } = t as Record<string, unknown>;
      if ((role === "user" || role === "assistant") && typeof text === "string") {
        history.push({ role, text: text.slice(0, LIMITS.historyChars) });
      }
    }
  }

  return { question, action, focusRef, word, history, growth: b.growth === true };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const input = parse(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 422 });

  const result = await ask(input, anthropicClient());
  const status = result.status === "no_key" ? 503 : result.status === "error" ? 502 : 200;
  return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
}
