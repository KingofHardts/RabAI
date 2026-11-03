/*
 * Learning with RabbAI as a chavrusa: the ways a person can choose for it to learn with them, how
 * deep to go, and what it is told about the session. What each way means is written in the core
 * premises ("Learning as a chavrusa"); the app only names the one chosen. Safe on the device.
 */

export const CHAVRUSA_STYLES = ["guide", "questioner", "partner", "deep", "page", "review"] as const;
export type ChavrusaStyle = (typeof CHAVRUSA_STYLES)[number];

export const CHAVRUSA_DEPTHS = ["light", "standard", "deep"] as const;
export type ChavrusaDepth = (typeof CHAVRUSA_DEPTHS)[number];

/** How each way of learning is named to the person, and to RabbAI (the name matches the core premises). */
export const STYLE_INFO: Record<ChavrusaStyle, { name: string; short: string; blurb: string }> = {
  guide: { name: "The guide", short: "Guide", blurb: "Walks you through it step by step, and checks you're with it." },
  questioner: { name: "The questioner", short: "Questioner", blurb: "Asks you questions and gives hints. Tells you the answer only after you try." },
  partner: { name: "The partner", short: "Partner", blurb: "Learns it with you, taking turns: you read and explain, it corrects and adds." },
  deep: { name: "The deep diver", short: "Deep diver", blurb: "Goes deep: the hard questions, the Rishonim and Acharonim, the reasons on each side." },
  page: { name: "Just the page", short: "Just the page", blurb: "Gemara, Rashi and Tosafot only, nothing beyond the page." },
  review: { name: "The reviewer", short: "Reviewer", blurb: "Goes over what you learned before and quizzes you until it's solid." },
};

export const DEPTH_INFO: Record<ChavrusaDepth, { name: string; blurb: string }> = {
  light: { name: "The main point", blurb: "The plain meaning, short and simple" },
  standard: { name: "Step by step", blurb: "Each line and the main commentaries" },
  deep: { name: "Every detail", blurb: "The questions, the answers, and the commentaries' views" },
};

/** What the person is learning with RabbAI in a chat. */
export interface ChavrusaSession {
  style: ChavrusaStyle;
  depth: ChavrusaDepth;
  /** What they are learning: a place in the library ("Berakhot 2a", "Genesis 23"), or a topic. */
  text?: string;
  /** The last line reached, as the library names it ("Berakhot 2a:5"). */
  at?: string;
}

const MAX_TEXT = 80;

/** A place or topic name: letters, numbers and a little punctuation, nothing that could be read as an instruction. */
function cleanPlace(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/[^\p{L}\p{M}\p{N} ,.'’:()-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

const oneOf = <T extends string>(values: readonly T[], v: unknown): T | undefined =>
  typeof v === "string" && (values as readonly string[]).includes(v) ? (v as T) : undefined;

/** A session sent by the device or kept with a chat, checked; anything malformed is dropped. */
export function parseChavrusa(raw: unknown): ChavrusaSession | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const style = oneOf(CHAVRUSA_STYLES, r.style);
  if (!style) return null;
  const depth = oneOf(CHAVRUSA_DEPTHS, r.depth) ?? "standard";
  const text = cleanPlace(r.text);
  const at = cleanPlace(r.at);
  return { style, depth, ...(text ? { text } : {}), ...(at ? { at } : {}) };
}

/** An amud of the Bavli ("Berakhot 2a", "Bava Metzia 59b"), or the amud a line is on. */
export function amudOf(ref: string | undefined): string | null {
  if (!ref) return null;
  const m = /^((?:[A-Z][\w'’]*\s)*?[A-Z][\w'’]*)\s(\d{1,3}[ab])(?::\d+)?$/.exec(ref.trim());
  return m ? `${m[1]} ${m[2]}` : null;
}

/** The line after a line ("Berakhot 2a:5" → "Berakhot 2a:6"), or null for anything else. */
export function nextLineRef(ref: string): string | null {
  const m = /^(.*\S):(\d+)$/.exec(ref.trim());
  return m ? `${m[1]}:${Number(m[2]) + 1}` : null;
}

/**
 * The furthest line of the session's text among the passages an answer cited, so the next session
 * picks up there. Only lines of the text itself count ("Berakhot 2a:5", not a Rashi on it).
 */
export function reachedLine(session: ChavrusaSession, citedRefs: string[]): string | undefined {
  const text = session.text?.trim();
  if (!text) return session.at;
  const lineNo = (ref: string) => {
    if (!ref.startsWith(`${text}:`)) return -1;
    const n = Number(ref.slice(text.length + 1).split(/[:-]/)[0]);
    return Number.isFinite(n) ? n : -1;
  };
  let best = session.at && lineNo(session.at) > 0 ? session.at : undefined;
  for (const r of citedRefs) if (lineNo(r) > (best ? lineNo(best) : 0)) best = r.split("-")[0];
  return best;
}

/** What RabbAI is told about the session, for its settings (the meaning of each way is in the core premises). */
export function chavrusaSettings(s: ChavrusaSession): string {
  const style = STYLE_INFO[s.style];
  const depth = DEPTH_INFO[s.depth];
  return [
    `This chat is a chavrusa session (see "Learning as a chavrusa"). The way the person chose: ${style.name} (${style.blurb}) Depth: ${depth.name.toLowerCase()} (${depth.blurb.toLowerCase()}).`,
    s.text ? `What you are learning together: ${s.text}.` : "",
    s.at ? `The last line you reached together: ${s.at}. Pick up from there unless they ask otherwise.` : "",
    s.style === "page" && amudOf(s.text) ? "Your documents are only this page's Gemara, Rashi and Tosafot, and the dictionaries: stay with them." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** The first message of a session, as the person says it. */
export function openingMessage(s: ChavrusaSession): string {
  if (s.style === "review") return s.text ? `Let's review ${s.text} together. Quiz me on it.` : "Let's review what I learned recently. Quiz me on it.";
  if (s.text) return s.at ? `Let's keep learning ${s.text} together, from where we stopped.` : `Let's learn ${s.text} together.`;
  return "Let's learn together. What should we learn?";
}

/** Short replies offered under a chavrusa's answer, for the way chosen. */
export function quickReplies(s: ChavrusaSession): string[] {
  const common = ["Next line", "Give me a hint", "Just tell me", "Where are we up to?"];
  if (s.style === "questioner") return ["Give me a hint", "Here's my answer…", "Just tell me", "Next line"];
  if (s.style === "partner") return ["Let me read the next line", "Did I get it right?", "Your turn", "Next line"];
  if (s.style === "deep") return ["Ask me the hard question", "What do the Rishonim say?", "Why does each side hold that?", "Next line"];
  if (s.style === "review") return ["Quiz me", "Another question", "Explain what I got wrong", "What should I go over again?"];
  return common;
}
