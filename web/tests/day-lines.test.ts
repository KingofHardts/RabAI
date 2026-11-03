import { test } from "node:test";
import assert from "node:assert/strict";
import { shabbatLine, soonLine, todayLine } from "../lib/calendar/day-lines";
import type { DaySummary } from "../lib/calendar/place";

const base: DaySummary = {
  date: "2026-11-03",
  civil: "Tuesday, November 3, 2026",
  hebrew: "23 Cheshvan 5787",
  hebrewHe: "כ״ג חשון תשפ״ז",
  afterSunset: false,
  todayIs: [],
  coming: [],
  shabbat: { candles: "4:41 pm", candlesDay: "Friday, November 6", ends: "5:40 pm", endsDay: "Saturday, November 7" },
  place: { name: "Baltimore", from: "set" },
};

test("the welcome says what day it is, and that the Hebrew date has moved on after sunset", () => {
  assert.equal(todayLine(base), "Tuesday, 23 Cheshvan 5787");
  assert.equal(todayLine({ ...base, afterSunset: true, hebrew: "24 Cheshvan 5787" }), "Tuesday night, 24 Cheshvan 5787");
});

test("Shabbat's times appear from Thursday, and say when Shabbat ends on Shabbat", () => {
  assert.equal(shabbatLine(base), null, "not on a Tuesday");
  assert.equal(shabbatLine({ ...base, date: "2026-11-05", civil: "Thursday, November 5, 2026" }), "Candles Friday 4:41 pm (Baltimore)");
  const friday = { ...base, date: "2026-11-06", civil: "Friday, November 6, 2026" };
  assert.equal(shabbatLine(friday), "Candle lighting today 4:41 pm (Baltimore)");
  assert.equal(shabbatLine({ ...friday, afterSunset: true }), "Shabbat Shalom · ends 5:40 pm (Baltimore)");
  assert.equal(shabbatLine({ ...base, date: "2026-11-07", civil: "Saturday, November 7, 2026" }), "Shabbat ends 5:40 pm (Baltimore)");
  assert.equal(
    shabbatLine({ ...base, date: "2026-11-05", civil: "Thursday, November 5, 2026", place: { name: "Ashburn", from: "approx" } }),
    "Candles Friday 4:41 pm (near Ashburn)",
  );
});

test("a fast in the next two days gives its name and times", () => {
  const fast: DaySummary = {
    ...base,
    date: "2026-12-19",
    civil: "Saturday, December 19, 2026",
    soon: { title: "Asara B’Tevet", date: "2026-12-20", day: "Sunday, December 20", kind: "fast", begins: { date: "2026-12-20", time: "5:56 am" }, ends: { date: "2026-12-20", time: "5:23 pm" } },
  };
  assert.equal(soonLine(fast), "Tomorrow: Asara B’Tevet · from 5:56 am · ends 5:23 pm");
  const yk: DaySummary = {
    ...base,
    date: "2027-10-10",
    civil: "Sunday, October 10, 2027",
    soon: { title: "Yom Kippur", date: "2027-10-11", day: "Monday, October 11", kind: "fast", begins: { date: "2027-10-10", time: "6:12 pm" }, ends: { date: "2027-10-11", time: "7:05 pm" } },
  };
  assert.equal(soonLine(yk), "Tomorrow: Yom Kippur · from tonight 6:12 pm · ends 7:05 pm");
  assert.equal(soonLine({ ...yk, date: "2027-10-11", civil: "Monday, October 11, 2027" }), "Today: Yom Kippur · ends 7:05 pm", "only its end once it has begun");
  assert.equal(soonLine({ ...base, soon: { title: "Rosh Hashana 5788", date: "2027-10-02", day: "Saturday, October 2", kind: "holiday" } }), "Saturday: Rosh Hashana 5788");
  assert.equal(soonLine(base), null);
});
