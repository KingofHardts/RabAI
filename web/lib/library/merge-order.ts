/*
 * One reading order from several. Each edition of a book was numbered in turn when the library was
 * built, so a section or line that exists in only one language (the Koren siddur's English Preface,
 * or its instructions between the prayers) would otherwise sort after everything in the other
 * language. Safe on the device.
 */

/**
 * The orders merged: the longest one as it is, and each item the others add placed right after the
 * item it follows there (or first, if nothing comes before it).
 */
export function mergeOrders(lists: string[][]): string[] {
  const sorted = [...lists].filter((l) => l.length).sort((a, b) => b.length - a.length);
  if (!sorted.length) return [];
  const result = [...new Set(sorted[0])];
  for (const list of sorted.slice(1)) {
    let at = new Map(result.map((x, i) => [x, i]));
    let cursor = -1;
    for (const item of list) {
      const here = at.get(item);
      if (here !== undefined) {
        cursor = here;
        continue;
      }
      result.splice(cursor + 1, 0, item);
      cursor += 1;
      at = new Map(result.map((x, i) => [x, i]));
    }
  }
  return result;
}

/** The numbers in a ref after its section ("…, The Amida 14" -> [14]; "Berakhot 2a:4" -> [4]), for ordering lines. */
export function lineNumbers(ref: string, section: string): number[] | null {
  if (!ref.startsWith(section)) return null;
  const rest = ref.slice(section.length);
  const nums = rest.match(/\d+/g);
  return nums ? nums.map(Number) : null;
}

/** Compares two lines of one section by their numbers; null when either has none. */
export function compareLines(a: string, b: string, section: string): number | null {
  const x = lineNumbers(a, section);
  const y = lineNumbers(b, section);
  if (!x || !y) return null;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}
