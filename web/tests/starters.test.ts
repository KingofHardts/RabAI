import { test } from "node:test";
import assert from "node:assert/strict";
import { dayStarters, LIFE_STARTERS, pickStarters, TORAH_STARTERS } from "../lib/starters";
import type { DaySummary } from "../lib/calendar/place";

const DAY: DaySummary = {
  date: "2026-11-03",
  civil: "Tuesday, November 3, 2026",
  hebrew: "23 Cheshvan 5787",
  hebrewHe: "כ״ג חשון תשפ״ז",
  afterSunset: false,
  parsha: { name: "Chayei Sara", he: "חיי שרה", day: "Saturday, November 7" },
  daf: { text: "Bechorot 46", ref: "Bekhorot 46a" },
  todayIs: [],
  coming: [{ title: "Rosh Chodesh Kislev", day: "Tuesday, November 10", date: "2026-11-10", kind: "roshchodesh" }],
};

/** A fixed sequence standing in for Math.random. */
const seq = (seed: number) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

test("the suggested questions start with this week's parsha and today's daf", () => {
  const groups = pickStarters(DAY, { rand: seq(1), now: new Date(2026, 10, 3, 12) });
  assert.equal(groups[0].label, "For this week");
  assert.deepEqual(
    groups[0].items.map((s) => s.label),
    ["A short dvar Torah on Parashat Chayei Sara", "Learn today's daf with me: Bechorot 46"],
  );
  assert.match(groups[0].items[1].ask, /Bekhorot 46a/);
  assert.equal(groups[1].items.length, 3);
  assert.equal(groups[2].items.length, 2);
});

test("the other questions change from visit to visit", () => {
  const a = pickStarters(DAY, { rand: seq(1), now: new Date(2026, 10, 3, 12) })[1].items.map((s) => s.label);
  const b = pickStarters(DAY, { rand: seq(7), now: new Date(2026, 10, 3, 12) })[1].items.map((s) => s.label);
  assert.notDeepEqual(a, b);
  assert.ok(TORAH_STARTERS.length >= 30 && LIFE_STARTERS.length >= 10, "a large enough set to draw from");
  assert.equal(new Set(TORAH_STARTERS.map((s) => s.label)).size, TORAH_STARTERS.length, "no repeats");
});

test("a fast, Shabbat coming and holidays bring their own questions", () => {
  const fast = dayStarters({ ...DAY, todayIs: ["Asara B’Tevet"] }, "2026-12-20", 0);
  assert.match(fast[0].label, /When does Asara B’Tevet end today\?/);
  const thursday = dayStarters(DAY, "2026-11-05", 4);
  assert.ok(thursday.some((s) => /candle lighting this Friday/.test(s.label)));
  const soon = dayStarters({ ...DAY, coming: [{ title: "Erev Chanukah", day: "Thursday, December 3", date: "2026-12-03", kind: "holiday" }] }, "2026-11-28", 6);
  assert.match(soon[0].label, /get ready for Chanukah/);
  assert.equal(dayStarters(null, "2026-11-03", 2).length, 0);
  // Without the day, the Torah group has four questions and there is no "For this week".
  const plain = pickStarters(null, { rand: seq(3), now: new Date(2026, 10, 3, 12) });
  assert.equal(plain[0].label, "Ask about Torah");
  assert.equal(plain[0].items.length, 4);
});
