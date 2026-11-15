import { test } from "node:test";
import assert from "node:assert/strict";
import type { DaySummaryDavening } from "../lib/calendar/place";
import { readLine } from "../lib/siddur/lines";
import { parsePrefs } from "../lib/siddur/prefs";
import { isMournersKaddish, kaddishHeading, lineRole, parseShulToday, withShulToday, zimunFolds } from "../lib/siddur/situations";
import { lamenatzeachToday, planToday, DEFAULT_CUSTOMS } from "../lib/siddur/today";

const L = (n: number, he: string, en: string) => readLine(`K, Giving Thanks, X ${n}`, he, en, true);

const weekday = {
  dow: 2,
  israel: false,
  tachanun: { shacharit: true, mincha: true, allCongs: true },
  notes: [],
} as unknown as DaySummaryDavening;

test("eating alone sets aside the zimmun, from its heading to the next", () => {
  const lines = [
    L(1, "שִׁיר הַמַּעֲלוֹת", "A song of ascents."),
    L(2, "סדר הזימון", "ZIMMUN / INVITATION"),
    L(3, "רַבּוֹתַי, נְבָרֵךְ.", "Leader Gentlemen, let us say grace."),
    L(4, "בָּרוּךְ הוּא וּבָרוּךְ שְׁמוֹ.", "Blessed be He, and blessed be His name."),
    L(5, "ברכת הזן", "BLESSING OF NOURISHMENT"),
    L(6, "בָּרוּךְ אַתָּה", "Blessed are You"),
  ];
  assert.equal(lines[1].kind, "heading");
  assert.deepEqual(zimunFolds(lines).map((f) => [f.from, f.to]), [[1, 4]]);
});

test("no Tachanun in shul today applies to today's date only, and says why", () => {
  const shul = parseShulToday({ date: "2026-11-17", reason: "bris" });
  assert.ok(shul);
  const today = withShulToday(weekday, "2026-11-17", shul)!;
  assert.equal(today.tachanun.shacharit, false);
  assert.equal(today.tachanun.mincha, false);
  const plan = planToday("Weekdays", "Tahanun", [], today, DEFAULT_CUSTOMS);
  assert.equal(plan.whole, "No Tachanun today (a bris today)");
  // Tomorrow it is the usual again.
  assert.equal(withShulToday(weekday, "2026-11-18", shul)!.tachanun.shacharit, true);
  assert.equal(parseShulToday({ date: "x", reason: "bris" }), null);
  assert.equal(parseShulToday({ date: "2026-11-17", reason: "party" }), null);
});

test("in a house of mourning, Lamenatzeach and the verse 'As for Me' are left out, as Koren says", () => {
  const mourning = withShulToday(weekday, "2026-11-17", { date: "2026-11-17", reason: "mourning" })!;
  assert.equal(lamenatzeachToday(weekday, DEFAULT_CUSTOMS), true);
  assert.equal(lamenatzeachToday(mourning, DEFAULT_CUSTOMS), false);
  const lines = [
    readLine("K, Weekdays, C 7", "", "In a house of mourning and on Tisha B’Av omit the verse beginning “As for Me” and continue with “You are the Holy One.”", true),
    readLine("K, Weekdays, C 8", "וּבָא לְצִיּוֹן גּוֹאֵל", "“A redeemer will come to Zion,”", true),
    readLine("K, Weekdays, C 9", "וַאֲנִי זֹאת בְּרִיתִי אוֹתָם, אָמַר יהוה", "“As for Me, this is My covenant with them,” says the LORD.", true),
    readLine("K, Weekdays, C 10", "וְאַתָּה קָדוֹשׁ", "You are the Holy One", true),
  ];
  assert.deepEqual(planToday("Weekdays", "Conclusion of the Service", lines, mourning, DEFAULT_CUSTOMS).folds.map((f) => [f.from, f.to]), [[2, 3]]);
  assert.deepEqual(planToday("Weekdays", "Conclusion of the Service", lines, weekday, DEFAULT_CUSTOMS).folds, []);
});

test("the mourner's and leader's lines are found by the siddur's own labels", () => {
  assert.equal(lineRole("Mourner"), "mourner");
  assert.equal(lineRole("אבל"), "mourner");
  assert.equal(lineRole("Leader"), "leader");
  assert.equal(lineRole('ש"ץ'), "leader");
  assert.equal(lineRole("Cong."), null);
  assert.ok(isMournersKaddish("MOURNER’S KADDISH"));
  assert.ok(isMournersKaddish("Kaddish DeRabbanan"));
  assert.ok(!isMournersKaddish("FULL KADDISH"));
  assert.ok(kaddishHeading(readLine("K, Weekdays, C 35", "קדיש יתום", "MOURNER’S KADDISH", true)));
});

test("the new settings are read back and checked", () => {
  const p = parsePrefs({ meal: "alone", kaddish: true, leading: true, pinned: ["a", "a", 3, "b"], shul: { date: "2026-11-17", reason: "groom" } });
  assert.equal(p.meal, "alone");
  assert.equal(p.kaddish, true);
  assert.equal(p.leading, true);
  assert.deepEqual(p.pinned, ["a", "b"]);
  assert.deepEqual(p.shul, { date: "2026-11-17", reason: "groom" });
  const d = parsePrefs({});
  assert.equal(d.meal, "three");
  assert.equal(d.kaddish, false);
  assert.deepEqual(d.pinned, []);
  assert.equal(d.shul, null);
});
