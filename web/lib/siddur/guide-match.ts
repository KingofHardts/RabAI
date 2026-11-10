/*
 * Finding, for a line of one siddur, the lines of another siddur that hold the same Hebrew words:
 * used when RabbAI's word-by-word translations are made, so the translator of a line of the Koren
 * siddur can be shown how the Metsudah linear siddur renders the same words. The match is by the
 * Hebrew letters only (vowels, cantillation and punctuation set aside, and the ways the Name is
 * written treated as one). It never changes any text: it only pairs lines.
 */

export interface GuideLine {
  ref: string;
  he: string;
  en: string;
}

const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

/** A line's words as bare letters, with the Name's spellings (יי, ה׳, יהוה, יְיָ) as one word. */
export function bareWords(he: string): string[] {
  return he
    .replace(/<[^>]*>/g, " ")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[^א-ת\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) =>
      w
        .replace(/[ךםןףץ]/g, (c) => FINALS[c])
        .replace(/^(יי|יהוה|ה|ד)$/, (x) => (x === "ה" || x === "ד" ? x : "יהוה"))
        .replace(/אלק/g, "אלה"),
    );
}

const pairs = (words: string[]) => words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`);

export interface GuideIndex {
  lines: Array<GuideLine & { words: string[]; pairs: string[] }>;
  byPair: Map<string, number[]>;
}

/** The guide siddur's lines, ready for matching. Lines with the same Hebrew are kept once. */
export function guideIndex(lines: GuideLine[]): GuideIndex {
  const seen = new Set<string>();
  const kept: GuideIndex["lines"] = [];
  for (const l of lines) {
    const words = bareWords(l.he);
    if (!words.length || !l.en.trim()) continue;
    const key = words.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push({ ...l, words, pairs: pairs(words) });
  }
  const byPair = new Map<string, number[]>();
  kept.forEach((l, i) => {
    for (const p of new Set(l.pairs)) {
      const at = byPair.get(p);
      if (at) at.push(i);
      else byPair.set(p, [i]);
    }
  });
  return { lines: kept, byPair };
}

/** Where a run of words begins inside a longer run, or -1. */
function runAt(hay: string[], needle: string[]): number {
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * The guide's lines whose words are found in this line, in the order they come in it. A guide line
 * counts when most of its word pairs (at least `share`) are in the line, or, for a guide line of
 * up to three words, when its words stand in the line as written. At most `max` lines.
 */
export function matchGuide(he: string, index: GuideIndex, share = 0.6, max = 14): GuideLine[] {
  const words = bareWords(he);
  if (words.length < 2) return [];
  const mine = new Set(pairs(words));
  const firstAt = new Map<string, number>();
  pairs(words).forEach((p, i) => {
    if (!firstAt.has(p)) firstAt.set(p, i);
  });
  const candidates = new Set<number>();
  for (const p of mine) for (const i of index.byPair.get(p) ?? []) candidates.add(i);
  const hits: Array<{ at: number; score: number; line: GuideLine; len: number }> = [];
  for (const i of candidates) {
    const g = index.lines[i];
    let at = -1;
    let score = 0;
    if (g.words.length <= 3) {
      at = runAt(words, g.words);
      if (at < 0 || g.words.length < 2) continue;
      score = 1;
    } else {
      const shared = g.pairs.filter((p) => mine.has(p));
      score = shared.length / g.pairs.length;
      if (score < share) continue;
      at = Math.min(...shared.map((p) => firstAt.get(p) ?? 0));
    }
    hits.push({ at, score, line: { ref: g.ref, he: g.he, en: g.en }, len: g.words.length });
  }
  // The best matches first when there are too many, then back in the line's own order.
  return hits
    .sort((a, b) => b.score - a.score || b.len - a.len)
    .slice(0, max)
    .sort((a, b) => a.at - b.at || b.len - a.len)
    .map((h) => h.line);
}
