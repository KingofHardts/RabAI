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
  printedRefs,
  readPrinted,
  wordsFingerprint,
  type DafPart,
  type DafPiece,
  sideColumn,
  splitOpening,
  TOP_LINES,
  type DafMeasure,
  vowelWords,
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

test("a passage's words check the same as the layout tool's", () => {
  // tools/daflayout/tests checks the same value.
  assert.equal(wordsFingerprint(["שלום", "עולם"]), "dbd9eeb4");
  assert.notEqual(wordsFingerprint(["שלום", "עולם"]), wordsFingerprint(["שלום", "עולם", "x"]));
});

test("a stored layout is used only when it fits the text exactly", () => {
  const pieces = new Map<string, DafPiece & { part: DafPart }>([
    ["Berakhot 2a:1", { ref: "Berakhot 2a:1", he: "א ב ג", en: "", part: "main" }],
    ["Rashi on Berakhot 2a:1:1", { ref: "Rashi on Berakhot 2a:1:1", he: "ד ה", en: "", part: "rashi" }],
  ]);
  const good = {
    v: 1,
    section: "Berakhot 2a",
    complete: true,
    refs: ["Berakhot 2a:1", "Rashi on Berakhot 2a:1:1"],
    checks: [wordsFingerprint(["א", "ב", "ג"]), wordsFingerprint(["ד", "ה"])],
    lines: {
      main: [[100, 200, 500, 230, 20, [0, 0, 2]], [100, 240, 300, 270, 20, [0, 2, 3]]],
      rashi: [[600, 200, 800, 220, 14, [1, 0, 2]]],
      tosafot: [],
    },
  };
  const p = readPrinted(good, pieces, "Berakhot 2a");
  assert.ok(p);
  assert.deepEqual(p.estimated, []);
  assert.deepEqual(p.area, [94, 194, 806, 276]);
  assert.equal(p.lines.length, 3);
  assert.deepEqual(p.lines[1], { part: "main", box: [100, 240, 300, 270], letter: 20, spans: [["Berakhot 2a:1", 2, 3]] });
  assert.deepEqual(printedRefs(good), good.refs);

  // Every word placed, a few by estimate: used, with the estimates listed.
  const guessed = readPrinted({ ...good, complete: false, placed_all: true, estimated: [0, 2, 3] }, pieces, "Berakhot 2a");
  assert.deepEqual(guessed?.estimated, ["Berakhot 2a:1#2"]);
  assert.equal(readPrinted({ ...good, estimated: [0, 2, 4] }, pieces, "Berakhot 2a"), null);

  // Another page, a layout with words left over, or a text that changed since: not used.
  assert.equal(readPrinted(good, pieces, "Berakhot 2b"), null);
  assert.equal(readPrinted({ ...good, complete: false }, pieces, "Berakhot 2a"), null);
  assert.equal(readPrinted({ ...good, complete: false, placed_all: false }, pieces, "Berakhot 2a"), null);
  assert.equal(readPrinted({ ...good, checks: [wordsFingerprint(["א", "ב"]), good.checks[1]] }, pieces, "Berakhot 2a"), null);
  // A word number past the passage's end, or a passage that isn't here.
  const past = { ...good, lines: { ...good.lines, rashi: [[600, 200, 800, 220, 14, [1, 0, 3]]] } };
  assert.equal(readPrinted(past, pieces, "Berakhot 2a"), null);
  const missing = new Map(pieces);
  missing.delete("Rashi on Berakhot 2a:1:1");
  assert.equal(readPrinted(good, missing, "Berakhot 2a"), null);
  assert.equal(readPrinted("nonsense", pieces, "Berakhot 2a"), null);

  // The heading comes along when it is well formed, and widens the page to hold it; a bad one is
  // left off without losing the page.
  assert.deepEqual(p.heading, []);
  const headed = readPrinted({ ...good, heading: [["4", 760, 150, 780, 170], ["ברכות", 300, 150, 400, 180]] }, pieces, "Berakhot 2a");
  assert.deepEqual(headed?.heading, [
    { text: "4", box: [760, 150, 780, 170] },
    { text: "ברכות", box: [300, 150, 400, 180] },
  ]);
  assert.deepEqual(headed?.area, [94, 144, 806, 276]);
  // A line's big words come along with its word places, when well formed.
  const bigLine = [100, 200, 500, 230, 20, [0, 0, 2], [450, 500, 300, 440], [0, 190, 240]];
  const tall = readPrinted({ ...good, lines: { ...good.lines, main: [bigLine, good.lines.main[1]] } }, pieces, "Berakhot 2a");
  assert.deepEqual(tall?.lines[0].big, [[0, 190, 240]]);
  for (const bad of [[2, 190, 240], [0, 240, 190], [0, 190]]) {
    const row = [...bigLine.slice(0, 7), bad];
    const p2 = readPrinted({ ...good, lines: { ...good.lines, main: [row, good.lines.main[1]] } }, pieces, "Berakhot 2a");
    assert.equal(p2?.lines[0].big, undefined);
  }
  for (const bad of [[["<b>", 1, 2, 3, 4]], [["ברכות", 400, 150, 300, 180]], [["ברכות", 1, 2]], "ברכות"]) {
    assert.deepEqual(readPrinted({ ...good, heading: bad }, pieces, "Berakhot 2a")?.heading, []);
  }
});

test("a line's word places are used only when they fit the line", () => {
  const pieces = new Map<string, DafPiece & { part: DafPart }>([["Berakhot 2a:1", { ref: "Berakhot 2a:1", he: "א ב ג", en: "", part: "main" }]]);
  const withPlaces = (places: unknown) => ({
    v: 1,
    section: "Berakhot 2a",
    complete: true,
    refs: ["Berakhot 2a:1"],
    checks: [wordsFingerprint(["א", "ב", "ג"])],
    lines: { main: [[100, 200, 500, 230, 20, [0, 0, 3], places]], rashi: [], tosafot: [] },
  });
  const good = readPrinted(withPlaces([400, 500, 250, 380, 100, 230]), pieces, "Berakhot 2a");
  assert.deepEqual(good?.lines[0].words, [[400, 500], [250, 380], [100, 230]]);
  // The wrong number of places, a word left of the line, or words out of order: the line is kept,
  // its words spread evenly.
  for (const bad of [[400, 500, 250, 380], [400, 500, 250, 380, 20, 230], [100, 230, 250, 380, 400, 500], "x"]) {
    const p = readPrinted(withPlaces(bad), pieces, "Berakhot 2a");
    assert.ok(p);
    assert.equal(p.lines[0].words, undefined);
  }
});

test("vowels are laid on the library's own words, letter by letter", () => {
  const v = vowelWords("מאימתי קורין את שמע בערבין. משעה", "מֵאֵימָתַי קוֹרִין – אֶת שְׁמַע בָּעֲרָבִין? מִשָּׁעָה");
  assert.deepEqual(v, ["מֵאֵימָתַי", "קוֹרִין", "אֶת", "שְׁמַע", "בָּעֲרָבִין.", "מִשָּׁעָה"]);
  // Each word keeps exactly its own letters and punctuation: only points are added.
  for (const [i, w] of "מאימתי קורין את שמע בערבין. משעה".split(" ").entries())
    assert.equal(v![i].replace(/[\u0591-\u05C7]/g, ""), w);
  // A word the vocalized copy spells differently gets no vowels; the rest still line up.
  assert.deepEqual(vowelWords("אמר רבי יוחנן", "אָמַר רַ׳ יוֹחָנָן"), ["אָמַר", "", "יוֹחָנָן"]);
  assert.equal(vowelWords("אמר", "שָׁלוֹם"), undefined);
});
