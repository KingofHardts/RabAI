/*
 * "Was this helpful?" (docs/learner-profiles.md, phase 3): what a thumbs up or down under an answer
 * sends. Only the question, the answer's text and the refs of the sources it cited. Never the
 * person's profile, their session or anything else about them: the record is built from these
 * fields alone, so anything else in a request is dropped.
 */

export const FEEDBACK_REASONS = ["source-wrong", "too-hard", "too-long", "not-what-i-asked", "not-orthodox", "text-wrong"] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
/** The reasons offered under an answer ("text-wrong" is sent from the reader and the siddur instead). */
export const ANSWER_REASONS: readonly FeedbackReason[] = ["source-wrong", "too-hard", "too-long", "not-what-i-asked", "not-orthodox"];

export const FEEDBACK_REASON_LABELS: Record<FeedbackReason, string> = {
  "source-wrong": "A source is wrong",
  "too-hard": "Too hard",
  "too-long": "Too long",
  "not-what-i-asked": "Not what I asked",
  "not-orthodox": "Doesn't sound Orthodox",
  "text-wrong": "A word in the text looks wrong",
};

/**
 * A report from the reader or the siddur that a word or line of the library's text looks wrong
 * (docs/text-layout-2026-11.md, 64), as a feedback record: the line's reference as its source, the
 * line's words as the "answer", the word and the person's note as the note. Kept for the
 * maintainer to check against the printed edition; it changes nothing by itself.
 */
export function textReport(r: { ref: string; text: string; word?: string; note?: string }) {
  const note = [r.word ? `Word: ${r.word}` : "", (r.note ?? "").trim()].filter(Boolean).join(" · ");
  return { helpful: false, reasons: ["text-wrong"], note: note.slice(0, FEEDBACK_LIMITS.note), question: "", answer: `${r.ref}\n${r.text}`.slice(0, FEEDBACK_LIMITS.answer), sources: [r.ref] };
}

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
