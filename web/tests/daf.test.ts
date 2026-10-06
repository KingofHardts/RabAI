import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amudLabelHe,
  commentBase,
  computeSpacers,
  correctSpacers,
  hebrewNumeral,
  nextAmud,
  parseAmud,
  plainText,
  prevAmud,
  sideColumn,
  splitOpening,
  TOP_LINES,
  type DafMeasure,
} from "../lib/library/daf";

test("page numbers read as printed", () => {
  assert.equal(hebrewNumeral(2), "ב");
  assert.equal(hebrewNumeral(15), "טו");
  assert.equal(hebrewNumeral(16), "טז");
  assert.equal(hebrewNumeral(64), "סד");
  assert.equal(hebrewNumeral(176), "קעו");
  assert.equal(amudLabelHe("ברכות", { tractate: "Berakhot", daf: 2, amud: "a" }), "ברכות ב.");
  assert.equal(amudLabelHe("ברכות", { tractate: "Berakhot", daf: 2, amud: "b" }), "ברכות ב:");
});

test("pages before and after", () => {
  const a = parseAmud("Bava Metzia 21a:4");
  assert.deepEqual(a, { tractate: "Bava Metzia", daf: 21, amud: "a" });
  assert.deepEqual(prevAmud(a!), { tractate: "Bava Metzia", daf: 20, amud: "b" });
  assert.deepEqual(nextAmud(a!), { tractate: "Bava Metzia", daf: 21, amud: "b" });
  assert.equal(prevAmud({ tractate: "Berakhot", daf: 2, amud: "a" }), null);
  assert.deepEqual(nextAmud({ tractate: "Berakhot", daf: 2, amud: "b" }), { tractate: "Berakhot", daf: 3, amud: "a" });
  assert.equal(parseAmud("Genesis 1:1"), null);
});

test("a comment's opening words are told from the rest", () => {
  assert.deepEqual(splitOpening("עד סוף האשמורה הראשונה – שליש הלילה"), { opening: "עד סוף האשמורה הראשונה", rest: "שליש הלילה" });
  assert.equal(splitOpening("מאימתי קורין את שמע בערבין. משעה שהכהנים").opening, "מאימתי קורין את שמע בערבין.");
  assert.equal(splitOpening("שכל הלילה קרוי זמן שכיבה").opening, "");
  assert.equal(commentBase("Rashi on Berakhot 2a:1:3"), "Berakhot 2a:1");
  assert.equal(plainText("<b>מאימתי</b> קורין<br>את&nbsp;שמע"), "מאימתי קורין את שמע");
});

const base: Omit<DafMeasure, "mainHeight" | "innerHeight" | "outerHeight"> = {
  width: 600,
  mainShare: 0.5,
  topShare: 0.5,
  padH: 16,
  padV: 10,
  lineSide: 14,
};

test("the page takes the shape its texts call for", () => {
  // Little Gemara, much commentary: both commentaries wrap around it and run on below.
  const wrap = computeSpacers({ ...base, mainHeight: 100, innerHeight: 900, outerHeight: 1000 });
  assert.equal(wrap.start, TOP_LINES * 14);
  assert.equal(wrap.inner, 100);
  assert.equal(wrap.outer, 100);
  assert.ok(wrap.end > 0);

  // Much Gemara, little commentary: the Gemara wraps around both.
  const extend = computeSpacers({ ...base, mainHeight: 2000, innerHeight: 300, outerHeight: 350 });
  assert.equal(extend.end, 0);
  assert.ok(extend.inner < 300 && extend.outer < 350 && extend.inner > 0);

  // Rashi too short to share the top: Tosafot takes the top alone.
  const alone = computeSpacers({ ...base, mainHeight: 500, innerHeight: 30, outerHeight: 800 });
  assert.equal(alone.exception, 1);

  // No commentary: the Gemara fills the page.
  assert.deepEqual(computeSpacers({ ...base, mainHeight: 500, innerHeight: 0, outerHeight: 0 }), {
    start: 0,
    inner: 0,
    outer: 0,
    end: 0,
    exception: 0,
  });

  // Every height is a usable number.
  for (const m of [100, 400, 900, 2000])
    for (const i of [0, 40, 300, 1200])
      for (const o of [0, 40, 300, 1200]) {
        const s = computeSpacers({ ...base, mainHeight: m, innerHeight: i, outerHeight: o });
        for (const v of [s.start, s.inner, s.outer, s.end]) assert.ok(Number.isFinite(v) && v >= 0, `${m}/${i}/${o}: ${JSON.stringify(s)}`);
      }
  assert.equal(sideColumn(base), 134);
});

test("once drawn, the spacers move until no two texts share a place", () => {
  const d = { width: 600, padV: 10, mainColumn: 268, sideColumn: 134 };
  const s = { start: 60, inner: 500, outer: 500, end: 0, exception: 0 as const };
  // Rashi ran 30px past its column while the Gemara goes on: Rashi's column grows.
  const grown = correctSpacers(s, { ...d, mainBottom: 900, innerBottom: 60 + 20 + 500 + 30, outerBottom: 400 });
  assert.ok(grown && grown.inner > 500 && grown.outer === 500);
  // The Gemara ran past its column while Rashi goes on: the column grows so the Gemara fits.
  const fitMain = correctSpacers(s, { ...d, mainBottom: 60 + 500 + 10 + 40, innerBottom: 900, outerBottom: 300 });
  assert.ok(fitMain && fitMain.inner > 500);
  // Both commentaries run on full width below a short Gemara: the shared stretch grows.
  const shared = correctSpacers(s, { ...d, mainBottom: 300, innerBottom: 700, outerBottom: 760 });
  assert.ok(shared && shared.end > 0);
  // Everything fits: nothing moves.
  assert.equal(correctSpacers(s, { ...d, mainBottom: 900, innerBottom: 560, outerBottom: 560 }), null);
});
