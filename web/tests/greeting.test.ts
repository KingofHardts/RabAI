import { test } from "node:test";
import assert from "node:assert/strict";
import { dayWish, greeting, timeGreeting } from "../lib/greeting";
import type { DaySummary } from "../lib/calendar/place";

const day = (todayIs: string[], afterSunset = false): DaySummary => ({ date: "2026-11-10", civil: "Tuesday, November 10, 2026", hebrew: "30 Cheshvan 5787", hebrewHe: "", afterSunset, todayIs, coming: [] });

test("the greeting follows the time of day and the day itself", () => {
  assert.equal(timeGreeting(7), "Good morning");
  assert.equal(timeGreeting(14), "Good afternoon");
  assert.equal(timeGreeting(21), "Good evening");
  assert.equal(timeGreeting(2), "Good evening");
  assert.deepEqual(greeting({ hour: 8, weekday: 2, name: " Josh ", day: day(["Rosh Chodesh Kislev"]) }), { hello: "Good morning, Josh.", wish: "Chodesh tov." });
  assert.equal(dayWish(day(["Asara B’Tevet"]), 2), "Have an easy and meaningful fast.");
  assert.equal(dayWish(day(["Chanukah: 3 Candles"]), 2), "Chanukah sameach.");
  assert.equal(dayWish(day(["Sukkot II"]), 2), "Chag sameach.");
  // Friday by day, and the night after Shabbat.
  assert.equal(dayWish(day([]), 5), "Shabbat shalom.");
  assert.equal(dayWish(day([], true), 5), null);
  assert.equal(dayWish(day([], true), 6), "Shavua tov.");
  // An ordinary day, or no day yet: no wish.
  assert.equal(dayWish(day([]), 2), null);
  assert.equal(greeting({ hour: 9, weekday: 2, day: null }).wish, null);
});
