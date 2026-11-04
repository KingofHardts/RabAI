/*
 * The day's Tehillim (Psalms): the whole book each month, by the day of the Hebrew month, or each
 * week, by the day of the week, in the common divisions. Safe on the device.
 */

export interface TehillimPortion {
  /** "Psalms 1–9", "Psalm 119:1–96". */
  label: string;
  /** The chapters to open (119 is split across two days). */
  chapters: number[];
  /** For Psalm 119, the verses: "1-96". */
  verses?: string;
}

/** The monthly cycle: day of the Hebrew month -> its psalms. */
const MONTH: Array<[number, number, string?]> = [
  [1, 9], [10, 17], [18, 22], [23, 28], [29, 34], [35, 38], [39, 43], [44, 48], [49, 54], [55, 59],
  [60, 65], [66, 68], [69, 71], [72, 76], [77, 78], [79, 82], [83, 87], [88, 89], [90, 96], [97, 103],
  [104, 105], [106, 107], [108, 112], [113, 118], [119, 119, "1-96"], [119, 119, "97-176"], [120, 134], [135, 139], [140, 144], [145, 150],
];

/** The weekly cycle: Sunday to Shabbat. */
const WEEK: Array<[number, number]> = [[1, 29], [30, 50], [51, 72], [73, 89], [90, 106], [107, 119], [120, 150]];

function portion(from: number, to: number, verses?: string): TehillimPortion {
  const chapters = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const label = verses ? `Psalm ${from}:${verses.replace("-", "–")}` : from === to ? `Psalm ${from}` : `Psalms ${from}–${to}`;
  return { label, chapters, ...(verses ? { verses } : {}) };
}

/**
 * The psalms for a day of the Hebrew month (1–30). In a month of 29 days, the 29th also takes the
 * 30th day's psalms, so the book is finished.
 */
export function monthlyTehillim(dayOfMonth: number, monthLength = 30): TehillimPortion[] {
  const d = Math.min(30, Math.max(1, Math.round(dayOfMonth)));
  const days = d === 29 && monthLength === 29 ? [29, 30] : [d];
  return days.map((n) => portion(...MONTH[n - 1]));
}

/** The psalms for a day of the week (0 Sunday … 6 Shabbat). */
export function weeklyTehillim(dow: number): TehillimPortion {
  const [from, to] = WEEK[((dow % 7) + 7) % 7];
  return portion(from, to);
}
