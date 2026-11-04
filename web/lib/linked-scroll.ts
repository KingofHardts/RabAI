/*
 * Two panes that scroll together: the Hebrew above and the English below, each line in both (the
 * reader's "two panes"). The pane being scrolled leads; the other moves to the same line, and as
 * far into it, so the two stay at the same place even though one language takes more room than
 * the other and so scrolls at a different speed. Safe on the device.
 *
 * The reading point moves from the top edge of a pane (at the top of the text) to its bottom edge
 * (at the end), so both panes start at their tops and end at their bottoms together.
 */

export interface PaneItem {
  /** Where the line starts and how tall it is, in the pane's scrolling content. */
  top: number;
  height: number;
}

export interface PaneMetrics {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  items: PaneItem[];
}

export interface ReadingPoint {
  /** The line at the reading point. */
  index: number;
  /** How far into that line, from 0 to 1. */
  fraction: number;
  /** How far down the pane is scrolled, from 0 (top) to 1 (end). */
  along: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The last line that starts at or before a point. */
function itemAt(items: PaneItem[], y: number): number {
  let lo = 0;
  let hi = items.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].top <= y) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/** Where the person is reading in a pane. */
export function readingPoint(p: PaneMetrics): ReadingPoint {
  const max = Math.max(0, p.scrollHeight - p.clientHeight);
  const along = max > 0 ? clamp(p.scrollTop / max, 0, 1) : 0;
  if (!p.items.length) return { index: 0, fraction: 0, along };
  const y = p.scrollTop + p.clientHeight * along;
  const index = itemAt(p.items, y);
  const item = p.items[index];
  const fraction = item.height > 0 ? clamp((y - item.top) / item.height, 0, 1) : 0;
  return { index, fraction, along };
}

/** The scroll position that puts the same line, as far into it, at the same place in the other pane. */
export function matchingScrollTop(target: PaneMetrics, point: ReadingPoint): number {
  const max = Math.max(0, target.scrollHeight - target.clientHeight);
  if (max === 0 || !target.items.length) return 0;
  if (point.along >= 0.999) return max;
  if (point.along <= 0.001 && point.index === 0 && point.fraction === 0) return 0;
  const item = target.items[Math.min(point.index, target.items.length - 1)];
  const y = item.top + point.fraction * item.height;
  // The reading point in the other pane sits at y = s + h * (s / max); solve for s.
  return clamp((y * max) / (max + target.clientHeight), 0, max);
}
