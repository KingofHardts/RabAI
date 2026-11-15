/*
 * The chat home's "For today" (docs/ideas-2026-11.md, 7, 8, 10, 11, 13): ready questions for the
 * Shabbat table, a parsha question for the family, learning before an occasion, and reviewing what
 * was learned a few days ago or this week. Each is only a question sent through the usual checked
 * path; nothing here is Torah content. Pure, so it can be tested.
 */

export interface Occasion {
  id: string;
  label: string;
  /** Said in the question: "I'm going to {phrase} soon" / "I'm having {phrase}". */
  phrase: string;
}

/** Times a person might want to learn something first. */
export const OCCASIONS: Occasion[] = [
  { id: "sheva-brachot", label: "Sheva brachot", phrase: "I'm going to sheva brachot" },
  { id: "bris", label: "A bris", phrase: "I'm going to a bris" },
  { id: "bar-mitzvah", label: "A bar or bat mitzvah", phrase: "I'm going to a bar or bat mitzvah" },
  { id: "yahrzeit", label: "A yahrzeit", phrase: "A yahrzeit is coming up" },
  { id: "shiva", label: "A shiva visit", phrase: "I'm going to visit a shiva house" },
  { id: "siyum", label: "A siyum", phrase: "I'm going to a siyum" },
  { id: "chanukat-habayit", label: "A new home", phrase: "I'm going to a chanukat habayit (a new home)" },
  { id: "shabbat-guests", label: "Shabbat guests", phrase: "I'm having guests for Shabbat" },
];

export function occasionPrompt(o: Occasion): string {
  return `${o.phrase} soon. What should I learn beforehand? Give me three or four short texts to look at, with a line on what each teaches, so I can print them as a source sheet, and one thought I could share.`;
}

/** A two-minute dvar Torah for the Shabbat table, with a question for the children. */
export function shabbatTablePrompt(parsha?: string): string {
  return `Give me a two-minute dvar Torah on ${parsha ? `Parashat ${parsha}` : "this week's parsha"} to say at the Shabbat table: one clear idea from the texts, told simply, and one question to ask the children, with its answer.`;
}

/** A short question about the parsha for the family tonight, with the answer to keep until asked. */
export function parshaQuestionPrompt(parsha?: string): string {
  return `Give me one question about ${parsha ? `Parashat ${parsha}` : "this week's parsha"} to ask my family at dinner tonight: short and interesting, with a hint, and then the answer from the texts at the end.`;
}

export interface LearningItem {
  text: string;
  at?: string;
  last: number;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Something learned three to fourteen days ago and not reviewed since: the next review, as yeshivos
 * do chazara. Reviews are kept on the device as {text: when reviewed}.
 */
export function dueReview(learning: LearningItem[], reviewed: Record<string, number>, now = Date.now()): LearningItem | null {
  for (const l of learning) {
    const age = now - l.last;
    if (age < 3 * DAY || age > 14 * DAY) continue;
    if ((reviewed[l.text] ?? 0) >= l.last) continue;
    return l;
  }
  return null;
}

export function reviewPrompt(l: LearningItem, now = Date.now()): string {
  const days = Math.max(1, Math.round((now - l.last) / DAY));
  return `${days} days ago we learned ${l.text}${l.at && l.at !== l.text ? `, up to ${l.at}` : ""}. Let's review it: ask me two short questions on it, one at a time, and after each tell me how I did, from the texts.`;
}

/** What was learned or asked about in the last seven days, for "Review this week". */
export function weekItems(learning: LearningItem[], topics: Array<{ topic: string; last: number }>, now = Date.now()): string[] {
  const recent = (t: number) => now - t <= 7 * DAY;
  return [...learning.filter((l) => recent(l.last)).map((l) => l.text), ...topics.filter((t) => recent(t.last)).map((t) => t.topic)].slice(0, 6);
}

export function weekReviewPrompt(items: string[]): string {
  return `Let's do chazara on what I learned this week: ${items.join("; ")}. Ask me questions one at a time, a mix of easy and harder, tell me how I did after each, and at the end tell me what to go back over.`;
}
