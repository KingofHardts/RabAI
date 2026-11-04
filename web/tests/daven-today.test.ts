import { test } from "node:test";
import assert from "node:assert/strict";
import { readLine } from "../lib/siddur/lines";
import { DEFAULT_CUSTOMS, avinuMalkeinuToday, planToday, serviceOf, tachanunToday } from "../lib/siddur/today";
import type { DaySummaryDavening } from "../lib/calendar/place";

/** An ordinary Wednesday outside Israel, in winter. */
const plain: DaySummaryDavening = {
  dow: 3, israel: false, roshChodesh: false, chanukah: false, purim: false, fast: false, tishaBav: false, tenDays: false,
  shabbatShuva: false, cholHamoed: false, yomTov: false, tachanun: { shacharit: true, mincha: true, allCongs: true }, hallel: 0,
  mashivHaruach: true, talUmatar: true, notes: [], festival: null, erevPesach: false, erevYomKippur: false, adar1415: false,
  yomHaatzmaut: false, yomYerushalayim: false, isruChag: false, ledavid: false,
};
const roshChodesh: DaySummaryDavening = { ...plain, roshChodesh: true, hallel: 1, tachanun: { shacharit: false, mincha: false, allCongs: false } };

const K = (n: number, he: string, en: string) => readLine(`K ${n}`, he, en, true);

test("which service a section belongs to", () => {
  assert.equal(serviceOf("Minha for Weekdays"), "mincha");
  assert.equal(serviceOf("Ma'ariv for Weekdays"), "maariv");
  assert.equal(serviceOf("Tahanun"), "shacharit");
});

test("a whole prayer not said today folds as one", () => {
  assert.match(planToday("Weekdays", "Tahanun", [], roshChodesh, DEFAULT_CUSTOMS).whole ?? "", /No Tachanun today \(Rosh Chodesh\)/);
  assert.equal(planToday("Weekdays", "Tahanun", [], plain, DEFAULT_CUSTOMS).whole, undefined);
  assert.match(planToday("Weekdays", "Avinu Malkenu", [], plain, DEFAULT_CUSTOMS).whole ?? "", /Ten Days/);
  // The Torah is read on Monday, not on Wednesday.
  assert.ok(planToday("Weekdays", "Reading of the Torah", [], plain, DEFAULT_CUSTOMS).whole);
  assert.equal(planToday("Weekdays", "Reading of the Torah", [], { ...plain, dow: 1 }, DEFAULT_CUSTOMS).whole, undefined);
  assert.equal(planToday("Festivals", "Hallel", [], roshChodesh, DEFAULT_CUSTOMS).whole, undefined);
  assert.ok(planToday("Festivals", "Hallel", [], plain, DEFAULT_CUSTOMS).whole);
});

test("lines for another day fold, with the Koren siddur's own instruction", () => {
  const lines = [
    K(1, "", "On Mondays and Thursdays, when Taḥanun is said, begin with “He is compassionate” below."),
    K(2, "וְהוּא רַחוּם", "וְהוּא רַחוּם He is compassionate."),
    K(3, "וְעַתָּה", "וְעַתָּה And now, my LORD"),
    K(4, "נפילת אפיים", "LOWERING THE HEAD"),
    K(5, "", "On Sundays, Tuesdays, Wednesdays and Fridays, begin Taḥanun here."),
    K(6, "וַיֹּאמֶר דָּוִד", "David said to Gad"),
  ];
  const wed = planToday("Weekdays", "Tahanun", lines, plain, DEFAULT_CUSTOMS);
  assert.deepEqual(wed.folds.map((f) => [f.from, f.to]), [[0, 3]]);
  assert.equal(planToday("Weekdays", "Tahanun", lines, { ...plain, dow: 1 }, DEFAULT_CUSTOMS).folds.length, 0);
});

test("the psalm of the day: only today's is open", () => {
  const lines = [
    K(1, "", "One of the following psalms is said on the appropriate day of the week as indicated."),
    K(3, "הַיּוֹם יוֹם רִאשׁוֹן", "Sunday: Today is the first day of the week"),
    K(4, "לְדָוִד מִזְמוֹר", "לְדָוִד מִזְמוֹר A psalm of David."),
    K(5, "", "Mourner's Kaddish ( page 182)"),
    K(12, "הַיּוֹם יוֹם רְבִיעִי", "Wednesday: Today is the fourth day of the week"),
    K(13, "אֵל־נְקָמוֹת", "אֵל־נְקָמוֹת God of retribution"),
    K(14, "", "Mourner's Kaddish ( page 182)"),
    K(21, "", "On Rosh Ḥodesh, the following psalm is said:"),
    K(22, "בָּרְכִי נַפְשִׁי", "בָּרְכִי נַפְשִׁי Bless the LORD, my soul."),
    K(23, "", "Mourner's Kaddish ( page 182)"),
  ];
  const plan = planToday("Weekdays", "The Daily Psalm", lines, plain, DEFAULT_CUSTOMS);
  // Sunday's psalm (with its Kaddish note) and Rosh Chodesh's are folded; Wednesday's stays.
  assert.deepEqual(plan.folds.map((f) => [f.from, f.to]), [[1, 4], [7, 9]]);
  assert.match(plan.folds[0].reason, /Sunday/);
});

test("a line for one day folds by itself", () => {
  const lines = [
    K(64, "▾מוֹדִים", "▾מוֹדִים We give thanks"),
    K(65, "בחנוכה: עַל הַנִּסִּים", "On Ḥanukka: עַל הַנִּסִּים [We thank You also] for the miracles"),
    K(59, "אֱלֹהֵֽינוּ וֵאלֹהֵי אֲבוֹתֵֽינוּ, יַעֲלֶה וְיָבוֹא", "On Rosh Ḥodesh and Ḥol HaMo’ed, say:\nאֱלֹהֵֽינוּ Our God and God of our ancestors"),
  ];
  const plan = planToday("Weekdays", "The Amida", lines, plain, DEFAULT_CUSTOMS);
  assert.deepEqual(plan.folds.map((f) => [f.from, f.to]), [[1, 2], [2, 3]]);
  assert.deepEqual(planToday("Weekdays", "The Amida", lines, roshChodesh, DEFAULT_CUSTOMS).folds.map((f) => f.from), [1]);
});

test("Mincha's Tachanun folds to the Kaddish after it", () => {
  const lines = [
    K(96, "סדר תחנון", "TAḤANUN"),
    K(97, "", "Taḥanun is not said on Erev Shabbat and Erev Yom Tov."),
    K(99, "נפילת אפיים", "LOWERING THE HEAD"),
    K(100, "וַיֹּאמֶר דָּוִד", "David said to Gad"),
    K(111, "קדיש שלם", "FULL KADDISH"),
  ];
  assert.deepEqual(planToday("Weekdays", "Minha for Weekdays", lines, roshChodesh, DEFAULT_CUSTOMS).folds.map((f) => [f.from, f.to]), [[0, 4]]);
  assert.equal(planToday("Weekdays", "Minha for Weekdays", lines, plain, DEFAULT_CUSTOMS).folds.length, 0);
});

test("customs: the modern days, and Avinu Malkeinu", () => {
  const atzmaut: DaySummaryDavening = { ...plain, yomHaatzmaut: true, tachanun: { shacharit: true, mincha: true, allCongs: false } };
  assert.equal(tachanunToday(atzmaut, DEFAULT_CUSTOMS, "shacharit"), true);
  assert.equal(tachanunToday(atzmaut, { ...DEFAULT_CUSTOMS, modernDays: true }, "shacharit"), false);
  assert.equal(avinuMalkeinuToday({ ...plain, tenDays: true }, DEFAULT_CUSTOMS, "shacharit"), true);
  assert.equal(avinuMalkeinuToday({ ...plain, fast: true, tishaBav: true }, DEFAULT_CUSTOMS, "shacharit"), false);
  // Erev Yom Kippur: only when it is a Friday.
  const erev = { ...plain, tenDays: true, erevYomKippur: true, tachanun: { shacharit: false, mincha: false, allCongs: false } };
  assert.equal(avinuMalkeinuToday({ ...erev, dow: 5 }, DEFAULT_CUSTOMS, "shacharit"), true);
  assert.equal(avinuMalkeinuToday(erev, DEFAULT_CUSTOMS, "shacharit"), false);
});

test("the Omer: only tonight's count stays open", () => {
  const lines = [
    K(4, "בָּרוּךְ אַתָּה", "בָּרוּךְ Blessed are You"),
    K(5, "טז בניסן 1. הַיּוֹם יוֹם אֶחָד בָּעֹֽמֶר.", "16 Nisan 1. Today is the first day of the Omer."),
    K(6, "יז בניסן 2. הַיּוֹם שְׁנֵי יָמִים בָּעֹֽמֶר.", "17 Nisan 2. Today is the second day of the Omer."),
    K(7, "יח בניסן 3. הַיּוֹם שְׁלֹשָׁה יָמִים בָּעֹֽמֶר.", "18 Nisan 3. Today is the third day of the Omer."),
    K(54, "הָרַחֲמָן", "הָרַחֲמָן May the Compassionate One"),
  ];
  const plan = planToday("Weekdays", "Counting of the Omer", lines, { ...plain, omerTonight: 2 }, DEFAULT_CUSTOMS);
  assert.deepEqual(plan.folds.map((f) => [f.from, f.to]), [[1, 2], [3, 4]]);
});

test("a time over a passage of several lines folds the whole passage", () => {
  const alHanissim = K(65, "בחנוכה:\nעַל הַנִּסִּים וְעַל הַפֻּרְקָן\nבִּימֵי מַתִּתְיָֽהוּ", "On Ḥanukka: עַל הַנִּסִּים [We thank You also] for the miracles");
  // Two times in one line ("in winter … / in Israel in summer …") stay phrase by phrase.
  const seasons = K(10, "בחורף: מַשִּׁיב הָרֽוּחַ / בארץ ישראל בקיץ: מוֹרִיד הַטָּל", "In fall and winter: He makes the wind blow.\nIn Israel, in spring and summer: He causes the dew to fall.");
  const plan = planToday("Weekdays", "The Amida", [alHanissim, seasons], plain, DEFAULT_CUSTOMS);
  assert.deepEqual(plan.folds.map((f) => [f.from, f.to]), [[0, 1]]);
});
