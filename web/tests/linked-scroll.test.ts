import { test } from "node:test";
import assert from "node:assert/strict";
import { matchingScrollTop, readingPoint, type PaneMetrics } from "../lib/linked-scroll";

/** A pane of lines with the given heights, 400 tall. */
function pane(heights: number[], scrollTop = 0, clientHeight = 400): PaneMetrics {
  let top = 0;
  const items = heights.map((h) => {
    const it = { top, height: h };
    top += h;
    return it;
  });
  return { scrollTop, clientHeight, scrollHeight: top, items };
}

// The Hebrew lines are short, the English ones twice as tall.
const he = [60, 80, 50, 100, 70, 90, 60, 80, 50, 100, 70, 90];
const en = he.map((h) => h * 2);

test("at the top, both panes are at the top; at the end, both are at the end", () => {
  assert.equal(matchingScrollTop(pane(en), readingPoint(pane(he, 0))), 0);
  const heMax = he.reduce((a, b) => a + b) - 400;
  const enMax = en.reduce((a, b) => a + b) - 400;
  assert.equal(matchingScrollTop(pane(en), readingPoint(pane(he, heMax))), enMax);
});

test("in the middle, the other pane shows the same line, as far into it", () => {
  const hePane = pane(he, 250);
  const point = readingPoint(hePane);
  const enTop = matchingScrollTop(pane(en), point);
  const enPoint = readingPoint(pane(en, enTop));
  assert.equal(enPoint.index, point.index);
  assert.ok(Math.abs(enPoint.fraction - point.fraction) < 0.05, `${enPoint.fraction} vs ${point.fraction}`);
});

test("the longer pane moves farther for the same step: they scroll at different speeds", () => {
  const a = matchingScrollTop(pane(en), readingPoint(pane(he, 200)));
  const b = matchingScrollTop(pane(en), readingPoint(pane(he, 260)));
  assert.ok(b - a > 60, `the English moved ${b - a} for 60 of Hebrew`);
  // And led from the English, the Hebrew moves less.
  const c = matchingScrollTop(pane(he), readingPoint(pane(en, 500)));
  const d = matchingScrollTop(pane(he), readingPoint(pane(en, 620)));
  assert.ok(d - c < 120 && d > c, `the Hebrew moved ${d - c} for 120 of English`);
});

test("a pane that doesn't scroll, or has no lines, stays put", () => {
  assert.equal(matchingScrollTop(pane([100, 100]), readingPoint(pane(he, 300))), 0);
  assert.equal(matchingScrollTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 900, items: [] }, readingPoint(pane(he, 300))), 0);
  assert.deepEqual(readingPoint({ scrollTop: 0, clientHeight: 400, scrollHeight: 400, items: [] }), { index: 0, fraction: 0, along: 0 });
});
