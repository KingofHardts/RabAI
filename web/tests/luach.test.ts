import { test } from "node:test";
import assert from "node:assert/strict";
import { luachMonth, noonAt } from "../lib/calendar/luach";
import { personalInsert } from "../lib/siddur/personal";
import { readLine } from "../lib/siddur/lines";

test("a month of the calendar: Hebrew dates and what each day is", () => {
  // April 2027: Pesach begins on the evening of Wednesday, April 21 (15 Nisan 5787 is Thursday the 22nd).
  const m = luachMonth(2027, 4, false);
  assert.equal(m.days.length, 30);
  const p1 = m.days.find((d) => d.date === "2027-04-22")!;
  assert.match(p1.hebrew, /^15 Nisan/);
  assert.ok(p1.events.some((e) => e.kind === "holiday" && /Pesach/.test(e.title)));
  assert.ok(m.days.some((d) => d.events.some((e) => e.kind === "parsha")));
  assert.match(m.hebrewTitle, /Nisan/);
  // Israel keeps one day of Yom Tov at the end of Pesach: no "Pesach VIII".
  assert.ok(!luachMonth(2027, 4, true).days.some((d) => d.events.some((e) => /VIII/.test(e.title))));
});

test("noon at a place is that place's noon", () => {
  const ny = noonAt("2026-12-01", "America/New_York");
  assert.equal(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(ny), "12");
  const syd = noonAt("2026-12-01", "Australia/Sydney");
  assert.equal(new Intl.DateTimeFormat("en-US", { timeZone: "Australia/Sydney", day: "numeric" }).format(syd), "1");
});

test("a prayer one may add is marked as optional, by the siddur's own words", () => {
  const sick = readLine("K 36", "יְהִי רָצוֹן", "The following prayer for a sick person may be said here:\nMay it be Your will, O LORD my God", true);
  assert.equal(personalInsert(sick), "For someone who is ill");
  assert.equal(personalInsert(readLine("K 35", "רְפָאֵנוּ", "Heal us, LORD, and we shall be healed.", true)), null);
});
