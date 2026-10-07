import { lettersOf, pieceWords } from "../library/daf";

/*
 * RabAI's outline of an amud, read and checked: what each phrase of the Gemara does (asks,
 * answers, proves, challenges...), so the page can color the flow of the argument phrase by phrase.
 * This file has no model calls, so the app can use its types and checks on the device; outline.ts
 * asks the model.
 *
 * The outline is RabAI's reading of the text, not a source, and the app labels it as not yet
 * reviewed by the rabbinic board. Two rules keep it tied to the library:
 *   - A phrase is a run of the library's own words, named by their positions in the line
 *     (pieceWords, the same numbering the page and the word-by-word list use). The model never
 *     retypes the Aramaic.
 *   - A phrase's English is shown only when it is an exact stretch of the library's English for the
 *     line. RabAI may point at the library's English; it may not write it.
 */

export const OUTLINE_KINDS = ["mishnah", "question", "answer", "statement", "proof", "challenge", "resolution", "story"] as const;
export type OutlineKind = (typeof OUTLINE_KINDS)[number];

/** Plain-English names for the kinds, as the legend shows them. */
export const OUTLINE_LABELS: Record<OutlineKind, string> = {
  mishnah: "Mishnah",
  question: "Question",
  answer: "Answer",
  statement: "Statement",
  proof: "Proof",
  challenge: "Challenge",
  resolution: "Resolution",
  story: "Story",
};

/** One phrase of a line: a run of the line's words, what it does, and the library's English for it. */
export interface OutlinePhrase {
  /** The first word, counted in pieceWords of the line's Hebrew. */
  from: number;
  /** Just past the last word. */
  to: number;
  kind: OutlineKind;
  /** What the phrase does, in a few plain words (RabAI's). */
  note: string;
  /** The words of the library's English for the line that translate this phrase, when they checked. */
  en?: string;
}

export interface OutlineLine {
  ref: string;
  /** What the line does as a whole. */
  kind: OutlineKind;
  note: string;
  /** The line's phrases, in order. One phrase for the whole line when the model's phrases didn't check. */
  phrases: OutlinePhrase[];
  /** True when the phrases didn't check and the line is shown as one phrase. */
  whole?: boolean;
}

/** A Gemara line as the outline needs it: its reference, its words (without markup) and its English. */
export interface OutlineLineInput {
  ref: string;
  he: string;
  en: string;
}

/** What the device keeps for each page. A new version is never read as an old one. */
export const OUTLINE_VERSION = 2;
/** The device's key for a page's outline: versioned, so an old line-level outline is never read as phrases. */
export const outlineKey = (section: string) => `rabai_outline_v${OUTLINE_VERSION}:${section}`;

/** At most this many phrases in one line; more means the reply didn't follow the form. */
export const MAX_PHRASES = 40;
/** Below this share of the line's words in some phrase, the line is shown as one phrase. */
export const MIN_PHRASE_COVERAGE = 0.8;
const MAX_NOTE = 140;

const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const isKind = (k: unknown): k is OutlineKind => typeof k === "string" && (OUTLINE_KINDS as readonly string[]).includes(k);

/** A note as the page shows it: plain words on one line, short. */
export function cleanNote(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const text = squash(raw.replace(/[*_#`<>]/g, ""));
  if (text.length <= MAX_NOTE) return text;
  return `${text.slice(0, MAX_NOTE - 1).replace(/\s+\S*$/, "")}…`;
}

/**
 * The library's English for a phrase: the words RabAI quoted, if they are an exact stretch of the
 * line's English (spaces counted as one). Anything else gives nothing, so no English RabAI wrote
 * can be shown as the library's.
 */
export function phraseEnglish(quote: unknown, lineEn: string): string | undefined {
  if (typeof quote !== "string") return undefined;
  const q = squash(quote);
  if (!q || q.length > 1000 || !/\p{L}/u.test(q)) return undefined;
  return squash(lineEn).includes(q) ? q : undefined;
}

/** A phrase before it is checked: positions as `from`/`to` (past the end). */
interface Candidate {
  from: unknown;
  to: unknown;
  kind: unknown;
  note: unknown;
  en: unknown;
}

/**
 * The phrases of a line, if they check: each a run of the line's words, in order, not overlapping,
 * of a known kind, and together holding most of the line's words (a word with letters may be left
 * out, and then is left uncolored). Words with no letters (a colon, a dash) just after a phrase join
 * it. Null when they don't check.
 */
export function checkPhrases(list: readonly Candidate[], words: readonly string[], lineEn: string): OutlinePhrase[] | null {
  if (!list.length || list.length > MAX_PHRASES || !words.length) return null;
  const out: OutlinePhrase[] = [];
  let end = 0;
  for (const c of list) {
    const { from, to } = c;
    if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
    const [a, b] = [from as number, to as number];
    if (a < end || b <= a || b > words.length || !isKind(c.kind)) return null;
    const en = phraseEnglish(c.en, lineEn);
    out.push({ from: a, to: b, kind: c.kind, note: cleanNote(c.note), ...(en ? { en } : {}) });
    end = b;
  }
  const letters = words.map((w) => !!lettersOf(w));
  const total = letters.filter(Boolean).length;
  if (total) {
    const covered = out.reduce((n, p) => n + letters.slice(p.from, p.to).filter(Boolean).length, 0);
    if (covered / total < MIN_PHRASE_COVERAGE) return null;
  }
  // Words with no letters (a colon, a dash) just after a phrase belong with it; at the line's start,
  // with the phrase after them.
  while (out[0].from > 0 && !letters[out[0].from - 1]) out[0].from--;
  for (let i = 0; i < out.length; i++) {
    const next = i + 1 < out.length ? out[i + 1].from : words.length;
    while (out[i].to < next && !letters[out[i].to]) out[i].to++;
  }
  return out;
}

/** The model's phrases (first and last word, inclusive) as candidates. */
function modelPhrases(raw: unknown): Candidate[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((p) => {
    const r = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const first = r.first;
    const last = r.last;
    return { from: first, to: Number.isInteger(last) ? (last as number) + 1 : undefined, kind: r.kind, note: r.note, en: r.en };
  });
}

/** Phrases kept on the device (from, to) as candidates. */
function keptPhrases(raw: unknown): Candidate[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((p) => {
    const r = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    return { from: r.from, to: r.to, kind: r.kind, note: r.note, en: r.en };
  });
}

/**
 * One line of an outline, checked against the line's words and English. When its phrases don't
 * check, the line becomes one phrase of the line's own kind. Null when nothing usable is there.
 */
function checkLine(item: Record<string, unknown>, line: OutlineLineInput, form: "model" | "kept"): OutlineLine | null {
  const words = pieceWords(line.he);
  if (!words.length) return null;
  const candidates = form === "model" ? modelPhrases(item.phrases) : keptPhrases(item.phrases);
  const phrases = candidates ? checkPhrases(candidates, words, line.en) : null;
  const kind = isKind(item.kind) ? item.kind : phrases?.[0]?.kind;
  if (!kind) return null;
  const note = cleanNote(item.note);
  if (!phrases) return { ref: line.ref, kind, note, phrases: [{ from: 0, to: words.length, kind, note }], whole: true };
  const whole = item.whole === true && phrases.length === 1 && phrases[0].from === 0 && phrases[0].to === words.length;
  return { ref: line.ref, kind, note, phrases, ...(whole ? { whole: true } : {}) };
}

/** The JSON objects in a reply: one per line, or all inside {"lines": [...]}. */
function replyItems(text: string): Array<Record<string, unknown>> {
  const asObjects = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const whole = JSON.parse(text.slice(start, end + 1)) as unknown;
      if (whole && typeof whole === "object" && Array.isArray((whole as { lines?: unknown }).lines)) return asObjects((whole as { lines: unknown }).lines);
    } catch {
      /* one object per line, below */
    }
  }
  // One JSON object on each line: a reply cut short still gives the lines it finished.
  const out: Array<Record<string, unknown>> = [];
  for (const raw of text.split("\n")) {
    const a = raw.indexOf("{");
    const b = raw.lastIndexOf("}");
    if (a < 0 || b <= a) continue;
    try {
      const v = JSON.parse(raw.slice(a, b + 1)) as unknown;
      if (v && typeof v === "object" && !Array.isArray(v)) out.push(v as Record<string, unknown>);
    } catch {
      /* not a whole object */
    }
  }
  return out;
}

/** The outline from the model's reply: only the lines given, each once, checked, in page order. */
export function readOutline(text: string, lines: readonly OutlineLineInput[]): OutlineLine[] {
  const byRef = new Map(lines.map((l) => [l.ref, l]));
  const out: OutlineLine[] = [];
  for (const item of replyItems(text)) {
    const line = typeof item.ref === "string" ? byRef.get(item.ref) : undefined;
    if (!line || out.some((o) => o.ref === line.ref)) continue;
    const checked = checkLine(item, line, "model");
    if (checked) out.push(checked);
  }
  const order = lines.map((l) => l.ref);
  return out.sort((a, b) => order.indexOf(a.ref) - order.indexOf(b.ref));
}

/**
 * An outline kept on the device, checked again against the page as it is now: a line whose words or
 * English changed since is shown as one phrase, or left out. Null when it isn't a phrase outline.
 */
export function readKeptOutline(raw: unknown, lines: readonly OutlineLineInput[]): { lines: OutlineLine[]; model?: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== OUTLINE_VERSION || !Array.isArray(r.lines)) return null;
  const byRef = new Map(lines.map((l) => [l.ref, l]));
  const out: OutlineLine[] = [];
  for (const item of r.lines) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const line = typeof it.ref === "string" ? byRef.get(it.ref) : undefined;
    if (!line || out.some((o) => o.ref === line.ref)) continue;
    const checked = checkLine(it, line, "kept");
    if (checked) out.push(checked);
  }
  if (!out.length) return null;
  const order = lines.map((l) => l.ref);
  out.sort((a, b) => order.indexOf(a.ref) - order.indexOf(b.ref));
  return { lines: out, ...(typeof r.model === "string" ? { model: r.model } : {}) };
}

/** What the device keeps for a page's outline. */
export function keptOutline(outline: { lines: OutlineLine[]; model?: string }): string {
  return JSON.stringify({ v: OUTLINE_VERSION, ...outline });
}

// ---------------------------------------------------------------------------
// Showing the outline on the page.

/** Which phrase is meant: the line, and the phrase's number in it. */
export interface PhraseAt {
  ref: string;
  n: number;
}

/** What the page needs to color the flow. */
export interface FlowView {
  /** RabAI's phrases for each Gemara line, by its reference. */
  phrases: Readonly<Record<string, readonly OutlinePhrase[]>>;
  /** Color only this kind; null for every kind. */
  only: OutlineKind | null;
  /** The phrase being stepped through. */
  current: PhraseAt | null;
}

export const phraseId = (p: PhraseAt) => `${p.ref}#${p.n}`;

/**
 * The words from `from` to `to` in runs by phrase: each run is the words of one phrase (n is its
 * number in the line) or of none (n is -1).
 */
export function phraseRuns(phrases: readonly OutlinePhrase[] | undefined, from: number, to: number): Array<{ from: number; to: number; n: number }> {
  const out: Array<{ from: number; to: number; n: number }> = [];
  const add = (a: number, b: number, n: number) => {
    if (b <= a) return;
    const last = out[out.length - 1];
    if (last && last.n === n && last.to === a) last.to = b;
    else out.push({ from: a, to: b, n });
  };
  let at = from;
  (phrases ?? []).forEach((p, n) => {
    const a = Math.max(p.from, from);
    const b = Math.min(p.to, to);
    if (b <= a) return;
    add(at, a, -1);
    add(a, b, n);
    at = b;
  });
  add(at, to, -1);
  return out;
}

/** The number of the phrase holding a word, or -1. */
export function phraseOfWord(phrases: readonly OutlinePhrase[] | undefined, index: number): number {
  return (phrases ?? []).findIndex((p) => p.from <= index && index < p.to);
}

/** The class a phrase's words get: its kind's color (unless filtered out), and a ring when it is the current one. */
export function phraseClass(flow: FlowView, ref: string, n: number): string {
  const p = flow.phrases[ref]?.[n];
  if (!p) return "dphr";
  const colored = !flow.only || flow.only === p.kind;
  const current = flow.current?.ref === ref && flow.current.n === n;
  return `dphr${colored ? ` k-${p.kind}` : " faded"}${current ? " cur" : ""}`;
}

/** One step of the step-through: a phrase, with the line it is in. */
export interface FlowStep extends PhraseAt {
  phrase: OutlinePhrase;
  line: OutlineLine;
}

/** The phrases to step through, in page order: all of them, or only one kind's. */
export function flowSteps(lines: readonly OutlineLine[], only: OutlineKind | null = null): FlowStep[] {
  const out: FlowStep[] = [];
  for (const line of lines) line.phrases.forEach((phrase, n) => (!only || phrase.kind === only) && out.push({ ref: line.ref, n, phrase, line }));
  return out;
}

/** How many phrases of each kind the outline has, in the legend's order. */
export function kindCounts(lines: readonly OutlineLine[]): Array<[OutlineKind, number]> {
  const counts = new Map<OutlineKind, number>();
  for (const l of lines) for (const p of l.phrases) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
  return OUTLINE_KINDS.filter((k) => counts.has(k)).map((k) => [k, counts.get(k)!]);
}

/**
 * Where to stand in the steps after the filter changes: the step that was current if it still
 * shows, else the next one shown after it on the page, else the first.
 */
export function nearestStep(lines: readonly OutlineLine[], steps: readonly FlowStep[], current: PhraseAt | null): number {
  if (!steps.length) return -1;
  if (!current) return 0;
  const order = new Map(lines.map((l, i) => [l.ref, i]));
  const pos = (p: PhraseAt) => (order.get(p.ref) ?? 0) * 1000 + p.n;
  const at = pos(current);
  const i = steps.findIndex((s) => pos(s) >= at);
  return i < 0 ? steps.length - 1 : i;
}
