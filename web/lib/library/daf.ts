/*
 * Helpers for showing one amud of the Bavli as printed: naming the page, finding the pages before
 * and after it, and telling Rashi's and Tosafot's opening words from the rest of the comment.
 * Pure functions, shared by the server route and the page.
 */

const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

/** A page number in Hebrew letters, as printed: 2 -> ב, 15 -> טו, 16 -> טז, 176 -> קעו. */
export function hebrewNumeral(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n >= 500) return String(n);
  const tail = n % 100;
  const tens = tail === 15 ? "ט" : tail === 16 ? "ט" : TENS[Math.floor(tail / 10)];
  const ones = tail === 15 ? "ו" : tail === 16 ? "ז" : ONES[tail % 10];
  return HUNDREDS[Math.floor(n / 100)] + tens + ones;
}

export interface AmudRef {
  tractate: string;
  daf: number;
  amud: "a" | "b";
}

/** "Berakhot 2a" -> { tractate: "Berakhot", daf: 2, amud: "a" }. A line ref works too. */
export function parseAmud(ref: string): AmudRef | null {
  const m = ref.trim().match(/^(.+?) (\d+)([ab])(?::.*)?$/);
  if (!m) return null;
  const daf = Number(m[2]);
  if (!daf) return null;
  return { tractate: m[1], daf, amud: m[3] as "a" | "b" };
}

export function amudRef(a: AmudRef): string {
  return `${a.tractate} ${a.daf}${a.amud}`;
}

/** The page before: 3a -> 2b, 2b -> 2a. A tractate starts at 2a. */
export function prevAmud(a: AmudRef): AmudRef | null {
  if (a.amud === "b") return { ...a, amud: "a" };
  return a.daf > 2 ? { ...a, daf: a.daf - 1, amud: "b" } : null;
}

export function nextAmud(a: AmudRef): AmudRef {
  return a.amud === "a" ? { ...a, amud: "b" } : { ...a, daf: a.daf + 1, amud: "a" };
}

/** How the page is named in Hebrew: "ברכות ב." for amud a and "ברכות ב:" for amud b. */
export function amudLabelHe(tractateHe: string, a: AmudRef): string {
  return `${tractateHe} ${hebrewNumeral(a.daf)}${a.amud === "a" ? "." : ":"}`;
}

/**
 * Rashi and Tosafot begin each comment with the words they explain (the dibbur hamatchil),
 * printed in bold. They end at the first dash, or else at the first period near the start.
 */
export function splitOpening(text: string): { opening: string; rest: string } {
  const dash = text.search(/\s[–—-]\s/);
  if (dash > 0 && dash <= 90) return { opening: text.slice(0, dash).trim(), rest: text.slice(dash).replace(/^\s[–—-]\s/, " ").trimStart() };
  const dot = text.indexOf(". ");
  if (dot > 0 && dot <= 70) return { opening: text.slice(0, dot + 1).trim(), rest: text.slice(dot + 1).trimStart() };
  return { opening: "", rest: text };
}

/** "Rashi on Berakhot 2a:1:3" -> "Berakhot 2a:1", the Gemara line it explains. */
export function commentBase(ref: string): string {
  const withoutAuthor = ref.replace(/^.+? on /, "");
  const parts = withoutAuthor.split(":");
  return parts.length >= 3 ? parts.slice(0, 2).join(":") : withoutAuthor;
}

/** Remove markup a source text may carry, keeping its words. */
export function plainText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** One piece of text on the page, as the page view needs it. */
export interface DafPiece {
  ref: string;
  he: string;
  en: string;
  /** For Rashi and Tosafot: the Gemara line the comment explains. */
  on?: string;
}

export interface DafData {
  section: string;
  tractate: string;
  tractateHe: string;
  daf: number;
  amud: "a" | "b";
  labelHe: string;
  prev: string | null;
  next: string;
  main: DafPiece[];
  rashi: DafPiece[];
  tosafot: DafPiece[];
  /** Which editions the page comes from, for the label under it. */
  editions: { main: string; mainEnglish: string; rashi: string; tosafot: string };
  libraryLabel: string;
}

// ---------------------------------------------------------------------------
// Laying out the page.
//
// The method is ported from daf-renderer by Dan Jutan and Shaun Regenbaum (MIT License,
// https://github.com/GT-Jewish-DH/daf-renderer; the notice is in web/THIRD-PARTY-NOTICES.md).
// The page is three layers of the same size, one for the Gemara and one for each commentary.
// Floating "spacers" in each layer keep its text out of the places the other two use. The
// spacers' heights come from how much room each text needs: the commentaries share the top four
// lines, then sit beside the Gemara, and whatever is longest runs on below.

/** The page's proportions, in pixels, and how tall each text is when set alone in its column. */
export interface DafMeasure {
  /** The whole page's width. */
  width: number;
  /** The Gemara column's share of the width, and the share each commentary takes on top. */
  mainShare: number;
  topShare: number;
  padH: number;
  padV: number;
  lineSide: number;
  /** The Gemara's height at the Gemara column's width (`mainColumn`). */
  mainHeight: number;
  /** Rashi's (inner) and Tosafot's (outer) heights at a side column's width (`sideColumn`). */
  innerHeight: number;
  outerHeight: number;
}

export interface DafSpacers {
  /** The commentaries' lines across the top, above the Gemara. */
  start: number;
  /** How far down each commentary runs beside the Gemara. */
  inner: number;
  outer: number;
  /** The half-width stretch below the Gemara, before text runs the full width. */
  end: number;
  /**
   * 0: the usual shape. 1: Rashi is too short to share the top, so Tosafot takes it alone.
   * 2: the other way around. 3: both are too short to fill the top; they sit above the Gemara.
   */
  exception: 0 | 1 | 2 | 3;
}

export function mainColumn(m: Pick<DafMeasure, "width" | "mainShare" | "padH">): number {
  return m.width * m.mainShare - 2 * m.padH;
}
/** A commentary's column beside the Gemara: its share of the page, less the gap between them. */
export function sideColumn(m: Pick<DafMeasure, "width" | "mainShare" | "padH">): number {
  return (m.width * (1 - m.mainShare)) / 2 - m.padH;
}

/** How many side lines the commentaries share across the top. */
export const TOP_LINES = 4.3;

export function computeSpacers(m: DafMeasure): DafSpacers {
  const midWidth = mainColumn(m);
  const sideWidth = sideColumn(m);
  const topWidth = m.width * m.topShare - m.padH;
  const start = TOP_LINES * m.lineSide;
  const topArea = 4 * m.lineSide * topWidth;

  const text = (name: "main" | "inner" | "outer", height: number, width: number, minusTop: boolean) => {
    const area = height * width - (minusTop ? topArea : 0);
    return { name, width, area, height: area / width, unadjustedHeight: (area + (minusTop ? topArea : 0)) / width };
  };
  const main = text("main", m.mainHeight, midWidth, false);
  const inner = text("inner", m.innerHeight, sideWidth, true);
  const outer = text("outer", m.outerHeight, sideWidth, true);

  // No commentary at all: the Gemara takes the whole page.
  if (m.innerHeight <= 0 && m.outerHeight <= 0) return { start: 0, inner: 0, outer: 0, end: 0, exception: 0 };
  // Too little commentary to fill the top: it sits in two halves above the Gemara.
  if (inner.height <= start && outer.height <= start) {
    const half = (h: number) => (h * sideWidth) / topWidth;
    return { start: Math.max(half(m.innerHeight), half(m.outerHeight), 0), inner: 0, outer: 0, end: 0, exception: 3 };
  }
  // One commentary too short to share the top: the other takes the top alone.
  if (inner.unadjustedHeight <= start) {
    return { start, inner: inner.unadjustedHeight, outer: (outer.area + topArea - m.width * 4 * m.lineSide) / sideWidth, end: 0, exception: 1 };
  }
  if (outer.unadjustedHeight <= start) {
    return { start, outer: outer.unadjustedHeight, inner: (inner.area + topArea - m.width * 4 * m.lineSide) / sideWidth, end: 0, exception: 2 };
  }

  const byHeight = [main, inner, outer].sort((a, b) => a.height - b.height);
  // The Gemara is shortest: both commentaries wrap around it.
  if (byHeight[0].name === "main") {
    const beside = main.area / midWidth;
    const sideArea = beside * sideWidth + sideWidth * m.padV;
    return { start, inner: beside, outer: beside, end: Math.max(0, (byHeight[1].area - sideArea) / topWidth), exception: 0 };
  }
  // Stairs: the shortest commentary and the Gemara form a block, and the longer commentary
  // steps down past it.
  const blockArea = main.area + byHeight[0].area;
  const blockWidth = midWidth + sideWidth;
  const blockHeight = blockArea / blockWidth;
  const stair = byHeight[1].name === "main" ? byHeight[2] : byHeight[1];
  if (blockHeight < stair.area / stair.width) {
    const smallest = byHeight[0];
    const spacers: DafSpacers = { start, inner: 0, outer: 0, end: 0, exception: 0 };
    const set = (name: string, v: number) => {
      if (name === "inner") spacers.inner = v;
      else if (name === "outer") spacers.outer = v;
    };
    set(smallest.name, smallest.height);
    set(stair.name, (blockArea - m.padH * (blockHeight - smallest.height)) / blockWidth);
    return spacers;
  }
  // The Gemara is longest: it wraps around both commentaries.
  return { start, inner: inner.height, outer: outer.height, end: 0, exception: 0 };
}

/** Where each text really ended once drawn, and the columns' real widths. */
export interface DafDrawn {
  width: number;
  padV: number;
  mainColumn: number;
  sideColumn: number;
  mainBottom: number;
  innerBottom: number;
  outerBottom: number;
}

/**
 * The spacers are an estimate from each text's area; once the page is drawn, a commentary can
 * run a line or two past its column (or the Gemara past its), and two texts then share the same
 * place. This moves the spacers so that cannot happen, and returns null when nothing needs to
 * move. Called a few times, it settles.
 */
export function correctSpacers(s: DafSpacers, d: DafDrawn): DafSpacers | null {
  const next: DafSpacers = { ...s };
  const slack = 1;
  const colEnd = (side: "inner" | "outer") => s.start + 2 * d.padV + s[side];
  const mainColEnd = (side: "inner" | "outer") => s.start + s[side] + d.padV;
  const bottom = { inner: d.innerBottom, outer: d.outerBottom };
  let changed = false;

  for (const side of ["inner", "outer"] as const) {
    const sideSpill = bottom[side] - colEnd(side);
    const mainPast = d.mainBottom - Math.min(colEnd(side), mainColEnd(side));
    if (sideSpill <= slack || mainPast <= slack) continue;
    if (d.mainBottom >= bottom[side]) {
      // The Gemara runs on longer: this commentary must finish beside it.
      const spillWidth = s.end > 0 && bottom[side] <= colEnd(side) + s.end ? d.width / 2 : d.width;
      next[side] = s[side] + Math.max(sideSpill * (spillWidth / d.sideColumn), 4);
    } else {
      // The commentary runs on longer: the Gemara must finish beside it.
      const mainSpill = d.mainBottom - mainColEnd(side);
      if (mainSpill > slack) next[side] = s[side] + Math.max(mainSpill * (d.width / d.mainColumn), 4);
      else continue;
    }
    changed = true;
  }

  // Below the Gemara, the commentaries share the width until the shorter one ends.
  const fullStart = (side: "inner" | "outer") => colEnd(side) + s.end;
  const innerPast = d.innerBottom - fullStart("inner");
  const outerPast = d.outerBottom - fullStart("outer");
  if (!changed && innerPast > slack && outerPast > slack && d.mainBottom < Math.min(d.innerBottom, d.outerBottom)) {
    next.end = s.end + Math.max(Math.min(innerPast, outerPast) * 2, 4);
    changed = true;
  }
  return changed ? next : null;
}
