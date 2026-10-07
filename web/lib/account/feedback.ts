/*
 * "Was this helpful?" (docs/learner-profiles.md, phase 3): what a thumbs up or down under an answer
 * sends. Only the question, the answer's text and the refs of the sources it cited. Never the
 * person's profile, their session or anything else about them: the record is built from these
 * fields alone, so anything else in a request is dropped.
 */

export const FEEDBACK_REASONS = ["source-wrong", "too-hard", "too-long", "not-what-i-asked", "not-orthodox"] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export const FEEDBACK_REASON_LABELS: Record<FeedbackReason, string> = {
  "source-wrong": "A source is wrong",
  "too-hard": "Too hard",
  "too-long": "Too long",
  "not-what-i-asked": "Not what I asked",
  "not-orthodox": "Doesn't sound Orthodox",
};

export const FEEDBACK_LIMITS = {
  note: 1000,
  question: 2000,
  answer: 20000,
  sources: 40,
  sourceRef: 200,
};

export interface FeedbackRecord {
  helpful: boolean;
  reasons: FeedbackReason[];
  note: string;
  question: string;
  answer: string;
  sources: string[];
}

/** Plain text, without control characters, cut to a length. */
function clean(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

/** A feedback record from a request, or a message saying what is wrong with it. */
export function parseFeedback(body: unknown): FeedbackRecord | string {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Send a JSON body.";
  const b = body as Record<string, unknown>;
  if (typeof b.helpful !== "boolean") return "Say whether the answer was helpful.";
  const answer = clean(b.answer, FEEDBACK_LIMITS.answer);
  if (!answer) return "Which answer is this about?";
  const reasons = Array.isArray(b.reasons)
    ? [...new Set(b.reasons.filter((r): r is FeedbackReason => typeof r === "string" && (FEEDBACK_REASONS as readonly string[]).includes(r)))]
    : [];
  const sources = Array.isArray(b.sources)
    ? [...new Set(b.sources.map((s) => clean(s, FEEDBACK_LIMITS.sourceRef)).filter(Boolean))].slice(0, FEEDBACK_LIMITS.sources)
    : [];
  return {
    helpful: b.helpful,
    // Reasons are for an answer that wasn't helpful.
    reasons: b.helpful ? [] : reasons,
    note: clean(b.note, FEEDBACK_LIMITS.note),
    question: clean(b.question, FEEDBACK_LIMITS.question),
    answer,
    sources,
  };
}
