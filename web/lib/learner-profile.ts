/*
 * What RabAI knows about the person it is learning with (docs/learner-profiles.md).
 *
 * Two parts, kept on the person's device, and in their account when they sign in
 * (lib/account/, which merges the copies with mergeProfiles in lib/account/merge.ts):
 * - What they told RabAI ("About you" in settings): how much they have learned, their community,
 *   how well they read Hebrew, how they like answers, what they want to learn.
 * - What RabAI noticed while they learned: the books and sections they read, the words they
 *   looked up, and whether they asked for simpler or deeper answers. Only learning activity is
 *   kept: never health, feelings, observance, or anything else about their life.
 *
 * The person can see all of it, change it, and turn remembering off. RabAI uses it only to choose
 * its level, words and examples, never to change what the Torah says (core premises, "What you
 * know about the person"). Pure functions only: the app reads and writes localStorage, and the
 * server builds the lines the model sees from a checked copy (profileSummary).
 */

export const PROFILE_KEY = "rabai_profile";

export const LEVELS = ["new", "some", "experienced", "advanced"] as const;
export const COMMUNITIES = ["ashkenazi", "sephardi", "chassidish", "mizrachi", "teimani", "other"] as const;
export const HEBREW = ["none", "some", "fluent"] as const;
export const ANSWER_LENGTHS = ["short", "fuller"] as const;
export const GOALS = ["read", "gemara", "chumash", "halacha", "daf-yomi", "mussar", "growth"] as const;

export type Level = (typeof LEVELS)[number];
export type Community = (typeof COMMUNITIES)[number];
export type HebrewReading = (typeof HEBREW)[number];
export type AnswerLength = (typeof ANSWER_LENGTHS)[number];
export type Goal = (typeof GOALS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  new: "New to learning",
  some: "Learned some",
  experienced: "Learn regularly",
  advanced: "Learned in yeshiva or seminary for years",
};
export const COMMUNITY_LABELS: Record<Community, string> = {
  ashkenazi: "Ashkenazi",
  sephardi: "Sephardi",
  chassidish: "Chassidish",
  mizrachi: "Edot HaMizrach",
  teimani: "Teimani (Yemenite)",
  other: "Other, or rather not say",
};
export const HEBREW_LABELS: Record<HebrewReading, string> = {
  none: "I don't read Hebrew yet",
  some: "I read some Hebrew",
  fluent: "I read Hebrew easily",
};
export const LENGTH_LABELS: Record<AnswerLength, string> = { short: "Short answers", fuller: "Fuller answers" };
export const GOAL_LABELS: Record<Goal, string> = {
  read: "Learn to read the texts",
  gemara: "Gemara",
  chumash: "Chumash and parsha",
  halacha: "Halacha",
  "daf-yomi": "Daf Yomi",
  mussar: "Mussar and middot",
  growth: "Growing closer to HaShem",
};

export interface StatedProfile {
  /** What to call them, if they want. */
  name?: string;
  level?: Level;
  community?: Community;
  hebrew?: HebrewReading;
  length?: AnswerLength;
  goals?: Goal[];
}

export interface ObservedProfile {
  /** Books opened, with how many times and when last. Newest first, at most MAX_BOOKS. */
  books: Array<{ title: string; count: number; last: number }>;
  /** Words looked up more than once are the ones to practice. At most MAX_WORDS. */
  words: Array<{ word: string; count: number; last: number }>;
  simpler: number;
  deeper: number;
  questions: number;
}

export interface LearnerProfile {
  v: 1;
  /** Remember what they learn. When off, nothing is noticed and nothing is sent. */
  remember: boolean;
  stated: StatedProfile;
  observed: ObservedProfile;
  updatedAt: number;
  /**
   * When each part last changed, so two copies (this device and the person's account) can be
   * merged without losing a change: what they told RabAI, the remember switch, and when they last
   * asked RabAI to forget what it noticed. 0 when never.
   */
  statedAt: number;
  rememberAt: number;
  observedSince: number;
}

export const MAX_BOOKS = 12;
export const MAX_WORDS = 40;
const MAX_NAME = 40;
const MAX_TITLE = 80;
const MAX_WORD = 30;

export function emptyProfile(): LearnerProfile {
  return {
    v: 1,
    remember: true,
    stated: {},
    observed: { books: [], words: [], simpler: 0, deeper: 0, questions: 0 },
    updatedAt: 0,
    statedAt: 0,
    rememberAt: 0,
    observedSince: 0,
  };
}

const oneOf = <T extends string>(values: readonly T[], v: unknown): T | undefined =>
  typeof v === "string" && (values as readonly string[]).includes(v) ? (v as T) : undefined;

/** Plain words only: no markup or line breaks can reach the model's instructions. */
export function cleanText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/[^\p{L}\p{M}\p{N} ,.'’:()-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

const count = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 1_000_000) : 0);
/** A time in milliseconds (Date.now()); counts above are capped lower, so times have their own check. */
const time = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.min(Math.floor(n), 4_102_444_800_000) : 0);

/** A profile from storage or from a request, with anything unexpected dropped. */
export function parseProfile(raw: unknown): LearnerProfile {
  const p = emptyProfile();
  if (!raw || typeof raw !== "object") return p;
  const r = raw as Record<string, unknown>;
  p.remember = r.remember !== false;
  const s = (r.stated ?? {}) as Record<string, unknown>;
  const name = cleanText(s.name, MAX_NAME);
  p.stated = {
    ...(name ? { name } : {}),
    ...(oneOf(LEVELS, s.level) ? { level: oneOf(LEVELS, s.level) } : {}),
    ...(oneOf(COMMUNITIES, s.community) ? { community: oneOf(COMMUNITIES, s.community) } : {}),
    ...(oneOf(HEBREW, s.hebrew) ? { hebrew: oneOf(HEBREW, s.hebrew) } : {}),
    ...(oneOf(ANSWER_LENGTHS, s.length) ? { length: oneOf(ANSWER_LENGTHS, s.length) } : {}),
  };
  if (Array.isArray(s.goals)) {
    const goals = [...new Set(s.goals.map((g) => oneOf(GOALS, g)).filter((g): g is Goal => !!g))];
    if (goals.length) p.stated.goals = goals;
  }
  const o = (r.observed ?? {}) as Record<string, unknown>;
  if (Array.isArray(o.books)) {
    p.observed.books = o.books
      .map((b) => (b && typeof b === "object" ? (b as Record<string, unknown>) : {}))
      .map((b) => ({ title: cleanText(b.title, MAX_TITLE), count: count(b.count), last: time(b.last) }))
      .filter((b) => b.title && b.count > 0)
      .slice(0, MAX_BOOKS);
  }
  if (Array.isArray(o.words)) {
    p.observed.words = o.words
      .map((w) => (w && typeof w === "object" ? (w as Record<string, unknown>) : {}))
      .map((w) => ({ word: cleanText(w.word, MAX_WORD), count: count(w.count), last: time(w.last) }))
      .filter((w) => w.word && w.count > 0)
      .slice(0, MAX_WORDS);
  }
  p.observed.simpler = count(o.simpler);
  p.observed.deeper = count(o.deeper);
  p.observed.questions = count(o.questions);
  p.updatedAt = time(r.updatedAt);
  // A profile kept before these times existed: its own last change stands in for them.
  p.statedAt = time(r.statedAt) || (Object.keys(p.stated).length ? p.updatedAt : 0);
  p.rememberAt = time(r.rememberAt) || (p.remember ? 0 : p.updatedAt);
  p.observedSince = time(r.observedSince);
  return p;
}

export type Activity =
  | { kind: "book"; title: string }
  | { kind: "word"; word: string }
  | { kind: "simpler" }
  | { kind: "deeper" }
  | { kind: "question" };

/** The profile after something the person did. Nothing changes when remembering is off. */
export function noticed(profile: LearnerProfile, a: Activity, now = Date.now()): LearnerProfile {
  if (!profile.remember) return profile;
  const o = profile.observed;
  const next: ObservedProfile = { ...o, books: o.books, words: o.words };
  if (a.kind === "book") {
    const title = cleanText(a.title, MAX_TITLE);
    if (!title) return profile;
    const found = o.books.find((b) => b.title === title);
    next.books = [{ title, count: (found?.count ?? 0) + 1, last: now }, ...o.books.filter((b) => b.title !== title)].slice(0, MAX_BOOKS);
  } else if (a.kind === "word") {
    const word = cleanText(a.word, MAX_WORD);
    if (!word) return profile;
    const found = o.words.find((w) => w.word === word);
    const entry = { word, count: (found?.count ?? 0) + 1, last: now };
    // Keep the words looked up most; among equals, the most recent.
    next.words = [entry, ...o.words.filter((w) => w.word !== word)]
      .sort((x, y) => y.count - x.count || y.last - x.last)
      .slice(0, MAX_WORDS);
  } else if (a.kind === "simpler") next.simpler = o.simpler + 1;
  else if (a.kind === "deeper") next.deeper = o.deeper + 1;
  else next.questions = o.questions + 1;
  return { ...profile, observed: next, updatedAt: now };
}

/** The person's own changes in "About you". */
export function withStated(profile: LearnerProfile, stated: StatedProfile, now = Date.now()): LearnerProfile {
  return { ...parseProfile({ ...profile, stated }), updatedAt: now, statedAt: now };
}

/** Turn remembering on or off. */
export function withRemember(profile: LearnerProfile, on: boolean, now = Date.now()): LearnerProfile {
  return { ...profile, remember: on, updatedAt: now, rememberAt: now };
}

/** Forget everything RabAI noticed, keeping what the person said about themselves. */
export function forgetNoticed(profile: LearnerProfile, now = Date.now()): LearnerProfile {
  return { ...profile, observed: emptyProfile().observed, updatedAt: now, observedSince: now };
}

/** Forget everything, including what the person said about themselves. Remembering stays as it was. */
export function forgetAll(profile: LearnerProfile, now = Date.now()): LearnerProfile {
  return { ...emptyProfile(), remember: profile.remember, rememberAt: profile.rememberAt, updatedAt: now, statedAt: now, observedSince: now };
}

/** The words looked up more than once: what to practice. */
export function practiceWords(profile: LearnerProfile, limit = 8): string[] {
  return profile.observed.words.filter((w) => w.count > 1).slice(0, limit).map((w) => w.word);
}

/**
 * The lines the model sees about the person, built on the server from a checked profile. Plain
 * facts only; empty when there is nothing, or when remembering is off.
 */
export function profileSummary(profile: LearnerProfile): string {
  if (!profile.remember) return "";
  const s = profile.stated;
  const o = profile.observed;
  const lines: string[] = [];
  if (s.name) lines.push(`Their name: ${s.name}.`);
  if (s.level) lines.push(`How much they have learned, in their words: ${LEVEL_LABELS[s.level].toLowerCase()}.`);
  if (s.hebrew) lines.push(`Hebrew: ${HEBREW_LABELS[s.hebrew].replace(/^I /, "they ")}.`);
  if (s.community && s.community !== "other") lines.push(`Their community: ${COMMUNITY_LABELS[s.community]}.`);
  if (s.goals?.length) lines.push(`What they want to learn: ${s.goals.map((g) => GOAL_LABELS[g].toLowerCase()).join(", ")}.`);
  if (s.length) lines.push(`They prefer ${LENGTH_LABELS[s.length].toLowerCase()}.`);
  const books = o.books.slice(0, 4).map((b) => b.title);
  if (books.length) lines.push(`Recently learning: ${books.join("; ")}.`);
  const practice = practiceWords(profile, 6);
  if (practice.length) lines.push(`Words they have looked up more than once: ${practice.join(", ")}.`);
  if (o.simpler + o.deeper >= 3) {
    if (o.simpler >= 2 * o.deeper) lines.push("They often ask for simpler explanations.");
    else if (o.deeper >= 2 * o.simpler) lines.push("They often ask to go deeper.");
  }
  if (!lines.length) return "";
  return [
    "About the person (their profile; use it only to choose your level, words, examples and length, never to change what the sources say):",
    ...lines.map((l) => `- ${l}`),
  ].join("\n");
}
