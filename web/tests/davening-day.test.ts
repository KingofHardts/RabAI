import { test } from "node:test";
import assert from "node:assert/strict";
import { HDate, months } from "@hebcal/core";
import { daveningDay, daveningNotes, mashivSeason, talUmatarSeason } from "../lib/calendar/davening";

const civil = (y: number, m: number, d: number) => new HDate(new Date(y, m - 1, d));

test("the rain phrases follow the Koren siddur's dates", () => {
  // Mashiv HaRuach: from Shemini Atzeret until Pesach.
  assert.equal(mashivSeason(new HDate(21, months.TISHREI, 5787)), false);
  assert.equal(mashivSeason(new HDate(22, months.TISHREI, 5787)), true);
  assert.equal(mashivSeason(new HDate(14, months.NISAN, 5787)), true);
  assert.equal(mashivSeason(new HDate(15, months.NISAN, 5787)), false);
  assert.equal(mashivSeason(new HDate(1, months.TISHREI, 5787)), false, "Rosh HaShana is before the season");
  // Outside Israel: from December 5th; December 6th before a civil leap year (2027 isn't, 2028 is).
  assert.equal(talUmatarSeason(civil(2026, 12, 4), false), false);
  assert.equal(talUmatarSeason(civil(2026, 12, 5), false), true);
  assert.equal(talUmatarSeason(civil(2027, 12, 5), false), false, "2028 is a leap year, so it starts December 6th");
  assert.equal(talUmatarSeason(civil(2027, 12, 6), false), true);
  assert.equal(talUmatarSeason(civil(2027, 2, 1), false), true, "the winter that began in December");
  assert.equal(talUmatarSeason(civil(2026, 11, 4), false), false, "November is before the season");
  // In Israel: from the 7th of Cheshvan.
  assert.equal(talUmatarSeason(new HDate(6, months.CHESHVAN, 5787), true), false);
  assert.equal(talUmatarSeason(new HDate(7, months.CHESHVAN, 5787), true), true);
  assert.equal(talUmatarSeason(new HDate(1, months.TISHREI, 5787), true), false);
});

test("Rosh Chodesh, Chanukah, Tachanun and Hallel", () => {
  const rc = daveningDay(new HDate(1, months.KISLEV, 5787), false);
  assert.ok(rc.roshChodesh);
  assert.equal(rc.hallel, 1);
  assert.ok(!rc.tachanun.shacharit);
  const ch = daveningDay(new HDate(26, months.KISLEV, 5787), false);
  assert.ok(ch.chanukah);
  assert.equal(ch.hallel, 2);
  assert.ok(daveningNotes(ch).some((n) => /Al HaNissim/.test(n)));
  const plain = daveningDay(new HDate(23, months.CHESHVAN, 5787), false);
  assert.ok(!plain.roshChodesh && !plain.chanukah);
  if (plain.dow !== 6) assert.ok(plain.tachanun.shacharit);
  assert.equal(plain.hallel, 0);
});

test("the Omer is counted from the night after the first day of Pesach", () => {
  assert.equal(daveningDay(new HDate(14, months.NISAN, 5787), false).omerTonight, undefined);
  assert.equal(daveningDay(new HDate(15, months.NISAN, 5787), false).omerTonight, 1);
  // After sunset on the 15th, the Hebrew day is already the 16th; tonight is still day 1.
  assert.equal(daveningDay(new HDate(16, months.NISAN, 5787), false, true).omerTonight, 1);
  assert.equal(daveningDay(new HDate(5, months.SIVAN, 5787), false, true).omerTonight, 49);
  assert.equal(daveningDay(new HDate(5, months.SIVAN, 5787), false).omerTonight, undefined);
});

test("a fast day, and Yom Kippur is not counted as an Aneinu fast", () => {
  const tevet = daveningDay(new HDate(10, months.TEVET, 5787), false);
  assert.ok(tevet.fast);
  assert.ok(daveningNotes(tevet).some((n) => /Aneinu/.test(n)));
  const yk = daveningDay(new HDate(10, months.TISHREI, 5787), false);
  assert.ok(!yk.fast && yk.yomTov);
});
