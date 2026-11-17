// The 2026-11-17 audit (docs/davening-calendar-audit.md): Koren's printed Tachanun list, the Shabbat
// facts, Jerusalem's Purim and the day the rain phrase changes, on real dates.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HDate, months } from "@hebcal/core";
import { korenTachanun } from "../lib/calendar/tachanun";
import { daveningDay } from "../lib/calendar/davening";
import { appliesToday, readLine } from "../lib/siddur/lines";
import { DEFAULT_CUSTOMS, omerDayOf, planToday, tachanunToday } from "../lib/siddur/today";

const H = (d: number, m: number, y: number) => new HDate(d, m, y);

test("Tachanun follows Koren's printed list where Hebcal differs (checked against the sources)", () => {
  // The afternoon before Chanukah: no Tachanun at Minha; Shacharit as usual.
  assert.deepEqual([korenTachanun(H(24, months.KISLEV, 5787), false).shacharit, korenTachanun(H(24, months.KISLEV, 5787), false).mincha], [true, false]);
  // The day after Chanukah when Kislev has 30 days: Tachanun again.
  assert.equal(korenTachanun(H(3, months.TEVET, 5787), false).shacharit, true);
  // Shushan Purim Katan (Shulchan Aruch 697): no Tachanun.
  assert.equal(korenTachanun(H(15, months.ADAR_I, 5787), false).shacharit, false);
  // Minha the day before Erev Rosh HaShana: said.
  assert.equal(korenTachanun(H(28, months.ELUL, 5787), false).mincha, true);
  // Pesach Sheni: not said (a custom, so not every congregation).
  const ps = korenTachanun(H(14, months.IYYAR, 5787), false);
  assert.equal(ps.shacharit, false);
  assert.equal(ps.allCongs, false);
  // In Israel: through 12 Sivan, and through Rosh Chodesh Cheshvan.
  assert.equal(korenTachanun(H(12, months.SIVAN, 5787), true).shacharit, false);
  assert.equal(korenTachanun(H(13, months.SIVAN, 5787), true).shacharit, true);
  assert.equal(korenTachanun(H(27, months.TISHREI, 5787), true).shacharit, false);
  // Outside Israel those are customs the person chooses.
  const sivan = { ...daveningDay(H(10, months.SIVAN, 5787), false), notes: [] };
  assert.equal(tachanunToday(sivan, DEFAULT_CUSTOMS, "shacharit"), sivan.dow !== 6);
  assert.equal(tachanunToday(sivan, { ...DEFAULT_CUSTOMS, sivan12: true }, "shacharit"), false);
});

test("Shabbat: blessing the month, Av HaRachamim, Tzidkatcha", () => {
  const mev = daveningDay(H(27, months.CHESHVAN, 5787), false); // Shabbat before Rosh Chodesh Kislev
  assert.equal(mev.mevarchim, true);
  assert.equal(mev.avHarachamim, false);
  const plainShabbat = daveningDay(H(4, months.KISLEV, 5787), false);
  assert.equal(plainShabbat.mevarchim, false);
  assert.equal(plainShabbat.avHarachamim, true);
  assert.equal(plainShabbat.tzidkatcha, true);
  // Before Sivan, Av HaRachamim is said even on Shabbat Mevarchim (Koren).
  const sivan = daveningDay(H(29, months.IYYAR, 5787), false);
  assert.equal(sivan.mevarchim, true);
  assert.equal(sivan.avHarachamim, true);
  // Shabbat Zachor: not said.
  assert.equal(daveningDay(H(11, months.ADAR_II, 5787), false).avHarachamim, false);
  // The Shabbat before Rosh Elul blesses Elul; the Shabbat before Rosh HaShana blesses nothing.
  assert.equal(daveningDay(H(23, months.ELUL, 5787), false).mevarchim, false);
  // Erev Purim Katan afternoon: no Tzidkatcha.
  assert.equal(daveningDay(H(13, months.ADAR_I, 5787), false).tzidkatcha, false);
});

test("Jerusalem keeps Purim on the 15th; the rain phrase on the day it changes shows both", () => {
  const y = 5787;
  assert.equal(daveningDay(H(14, months.ADAR_II, y), true, false, true).purim, false);
  assert.equal(daveningDay(H(15, months.ADAR_II, y), true, false, true).purim, true);
  assert.equal(daveningDay(H(14, months.ADAR_II, y), true).purim, true);
  const sa = { ...daveningDay(H(22, months.TISHREI, y), false), notes: [] };
  assert.equal(appliesToday("mashiv", sa), undefined);
  assert.equal(appliesToday("mashiv", { ...daveningDay(H(23, months.TISHREI, y), false), notes: [] }), true);
});

test("the Omer count is found on Koren's Rosh Chodesh lines and in Sefaria's Hebrew-only counts", () => {
  const L = (he: string, en: string) => readLine("X 1", he, en, true);
  assert.equal(omerDayOf(L("ל בניסן, א׳ דראש חודש\n15. הַיּוֹם", "30 Nisan, 1st day Rosh Ḥodesh\n15. Today is the fifteenth day,")), 15);
  assert.equal(omerDayOf(L("כז באייר\n42. הַיּוֹם", "27 Iyar\n42.Today is the forty-second day,")), 42);
  assert.equal(omerDayOf(readLine("X 1", 'ט"ז ניסן\n1. הַיּוֹם יוֹם אֶחָד בָּעֹֽמֶר:', "", false)), 1);
  assert.equal(omerDayOf(readLine("X 1", 'ט"ז ניסן', "", false)), 1);
  assert.equal(omerDayOf(readLine("X 1", "א אייר", "", false)), 16);
});

test("Mizmor LeToda is folded without the psalm after it; Sefaria's unlabeled insertions follow the day", () => {
  const plain = { ...daveningDay(H(9, months.TISHREI, 5787), false), notes: [] }; // Erev Yom Kippur
  const K = (n: number, he: string, en: string) => readLine(`K ${n}`, he, en, true);
  const lines = [K(1, "", "The following psalm recalls the thanksgiving-offering in Temple times. It is not said on Erev Pesaḥ…"), K(2, "מִזְמוֹר לְתוֹדָה", "A psalm of thanksgiving."), K(3, "יְהִי כְבוֹד", "May the LORD's glory be for ever")];
  assert.deepEqual(planToday("Weekdays", "Pesukei DeZimra", lines, plain, DEFAULT_CUSTOMS).folds.map((f) => [f.from, f.to]), [[0, 2]]);
  const S = (he: string) => readLine("S 1", he, "", false);
  const ordinary = { ...daveningDay(H(17, months.CHESHVAN, 5787), false), notes: [] };
  const sef = [S("רְצֵה יְהוָה"), S("בשבת מוסיפים:"), S("רְצֵה וְהַחֲלִיצֵֽנוּ"), S("אֱלֹהֵֽינוּ וֵאלֹהֵי אֲבוֹתֵֽינוּ יַעֲלֶה וְיָבֹא"), S("עַל הַנִּסִּים"), S("וּבְנֵה יְרוּשָׁלַיִם")];
  assert.deepEqual(planToday("Berachot", "Birkat HaMazon", sef, ordinary, DEFAULT_CUSTOMS).folds.map((f) => [f.from, f.to]), [[1, 3], [3, 4], [4, 5]]);
});
