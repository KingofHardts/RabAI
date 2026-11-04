import { test } from "node:test";
import assert from "node:assert/strict";
import { appliesToday, conditionOf, genderPair, phrases, readLine, segments, withoutHebrewOpening } from "../lib/siddur/lines";
import type { DaySummaryDavening } from "../lib/calendar/place";

const today: DaySummaryDavening = {
  dow: 3, israel: false, roshChodesh: false, chanukah: false, purim: false, fast: false, tishaBav: false, tenDays: false,
  shabbatShuva: false, cholHamoed: false, yomTov: false, tachanun: { shacharit: true, mincha: true, allCongs: true }, hallel: 0,
  mashivHaruach: true, talUmatar: false, notes: [], festival: null, erevPesach: false, erevYomKippur: false, adar1415: false,
  yomHaatzmaut: false, yomYerushalayim: false, isruChag: false, ledavid: false,
};

test("headings, instructions and prayers", () => {
  const h = readLine("K 3", "אבות", "PATRIARCHS", true);
  assert.equal(h.kind, "heading");
  assert.deepEqual(h.heading, { en: "Patriarchs", he: "אבות" });
  assert.equal(readLine("K 7", "גבורות", "DIVINE MIGHT", true).heading?.en, "Divine Might");
  const i = readLine("K 30", "", "Strike the left side of the chest at °.", true);
  assert.equal(i.kind, "instruction");
  // In a siddur without printed instructions, an English line without Hebrew is just English.
  assert.equal(readLine("S 4", "", "Blessed are You.", false).kind, "prayer");
  assert.equal(readLine("K 4", "▾בָּרוּךְ אַתָּה", "▾בָּרוּךְ Blessed are You", true).kind, "prayer");
});

test("speakers and times are pulled out of a line, and the text is untouched", () => {
  const p = phrases("Cong. then Leader: Leader:Leader:▴Holy, ▴holy");
  assert.equal(p[0].tag?.text, "Cong. then Leader");
  assert.equal(p[0].tag?.kind, "role");
  assert.deepEqual(segments("▴Holy").map((s) => s.mark ?? s.text), ["rise", "Holy"]);
  const he = phrases('קהל then ש"ץ: ▴קָדוֹשׁ');
  assert.equal(he[0].tag?.kind, "role");
  const two = phrases("In fall and winter: He makes the wind blow and the rain fall.\nIn Israel, in spring and summer: He causes the dew to fall.");
  assert.equal(two[0].tag?.condition, "mashiv");
  assert.equal(two[1].tag?.condition, "moridHatal");
  const heb = phrases("בחורף: מַשִּׁיב הָרֽוּחַ וּמוֹרִיד הַגֶּֽשֶׁם\nבארץ ישראל בקיץ: מוֹרִיד הַטָּל");
  assert.equal(heb[0].tag?.condition, "mashiv");
  assert.equal(heb[1].tag?.condition, "moridHatal");
  const barech = phrases("בחורף: וְתֵן טַל וּמָטָר לִבְרָכָה\nבקיץ: וְתֵן בְּרָכָה");
  assert.equal(barech[0].tag?.condition, "talUmatar");
  assert.equal(barech[1].tag?.condition, "beracha");
  assert.equal(phrases("/בשבת שובה: הַמֶּֽלֶךְ")[0].tag?.condition, "shabbatShuva");
  // A sentence that only has a colon in it is not a speaker or a time.
  assert.equal(phrases("Rabbi Ḥananya ben Akashya said: The Holy One")[0].tag, undefined);
  assert.equal(conditionOf("On Rosh Ḥodesh and Ḥol HaMo’ed, say", ""), "roshChodeshOrCholHamoed");
  assert.equal(conditionOf("On Ḥanukka", ""), "chanukah");
});

test("which conditions hold today", () => {
  assert.equal(appliesToday("mashiv", today), true);
  assert.equal(appliesToday("talUmatar", today), false);
  assert.equal(appliesToday("beracha", today), true);
  assert.equal(appliesToday("moridHatal", today), false);
  assert.equal(appliesToday("roshChodesh", today), false);
  assert.equal(appliesToday("jerusalem", today), undefined);
  assert.equal(appliesToday("mashiv", undefined), undefined);
});

test("the opening Hebrew words before the English are left out when the Hebrew shows", () => {
  const segs = withoutHebrewOpening(segments("▾בָּרוּךְ Blessed are You, LORD"));
  assert.equal(segs.map((s) => s.text).join(""), "Blessed are You, LORD");
  assert.equal(withoutHebrewOpening(segments("Blessed are You")).map((s) => s.text).join(""), "Blessed are You");
});

test("a man's and a woman's wording, printed with a slash, are labeled", () => {
  // מוֹדֶה/מוֹדָה: the person praying, so "Men" and "Women".
  const modeh = segments("מוֹדֶה/מוֹדָה/ אֲנִי לְפָנֶֽיךָ");
  const alt = modeh.find((s) => s.alt === "gender");
  assert.ok(alt && alt.alt === "gender");
  assert.deepEqual(alt.options.map((o) => [o.label, o.text]), [["Men", "מוֹדֶה"], ["Women", "מוֹדָה"]]);
  assert.equal(modeh.map((s) => s.text).join(""), "מוֹדֶה/מוֹדָה/ אֲנִי לְפָנֶֽיךָ");
  // לַחוֹלֶה/לַחוֹלָה, בֶּן/בַּת: about someone else, so "For a man" and "For a woman".
  const sick = segments("לַחוֹלֶה/לַחוֹלָה בֶּן/בַּת");
  assert.deepEqual(sick.filter((s) => s.alt === "gender").map((s) => (s.alt === "gender" ? s.options[0].label : "")), ["For a man", "For a man"]);
  // Different words with a slash are not one word for a man and a woman (poems, lists).
  assert.equal(genderPair("אָבִי", "אִמִּי"), null);
  assert.equal(segments("אֲזַמֵּר בִּשְׁבָחִין / לְמֶעַל גּוֹ פִתְחִין").some((s) => s.alt), false);
  // The morning blessing: the English prints men's and women's lines, the Hebrew a slash.
  const line = readLine("K 5", "בָּרוּךְ אַתָּה\nשֶׁלֹּא עָשַֽׂנִי אִשָּׁה. / שֶׁעָשַֽׂנִי כִּרְצוֹנוֹ.", "Blessed are You,\nmen: who has not made me a woman.\nwomen: who has made me according to His will.", true);
  const he = line.he[1].segs[0];
  assert.ok(he.alt === "gender");
  assert.deepEqual(he.options.map((o) => o.label), ["Men", "Women"]);
  assert.equal(line.en[1].tag?.text, "Men");
  assert.equal(line.en[2].tag?.text, "Women");
});

test("words said only at some times are found inside a line", () => {
  const segs = segments("בָּרוּךְ אַתָּה יהוה, הָאֵל הַקָּדוֹשׁ./בעשרת ימי תשובה: הַמֶּֽלֶךְ הַקָּדוֹשׁ./");
  const w = segs.find((s) => s.alt === "when");
  assert.ok(w && w.alt === "when");
  assert.equal(w.condition, "tenDays");
  assert.equal(w.words, "הַמֶּֽלֶךְ הַקָּדוֹשׁ.");
  assert.equal(segs.map((s) => s.text).join(""), "בָּרוּךְ אַתָּה יהוה, הָאֵל הַקָּדוֹשׁ./בעשרת ימי תשובה: הַמֶּֽלֶךְ הַקָּדוֹשׁ./");
  const en = segments("the holy God. /Between Rosh HaShana and Yom Kippur: the holy King./");
  assert.equal(en.find((s) => s.alt === "when")?.alt === "when" && (en.find((s) => s.alt === "when") as { condition?: string }).condition, "tenDays");
});

test("one line with several times is split into a phrase for each", () => {
  const p = phrases("בחורף: מַשִּׁיב הָרֽוּחַ וּמוֹרִיד הַגֶּֽשֶׁם / בארץ ישראל בקיץ: מוֹרִיד הַטָּל");
  assert.deepEqual(p.map((x) => x.tag?.condition), ["mashiv", "moridHatal"]);
  const yv = phrases("בראש חודש: רֹאשׁ הַחֹֽדֶשׁ / בפסח: חַג הַמַּצּוֹת / בסוכות: חַג הַסֻּכּוֹת");
  assert.deepEqual(yv.map((x) => x.tag?.condition), ["roshChodesh", "pesach", "sukkot"]);
  assert.equal(yv[1].segs.map((s) => s.text).join("").trim(), "חַג הַמַּצּוֹת");
  // A time on its own line between slashes keeps none of the slashes in its words.
  const kaddish = phrases("/בעשרת ימי תשובה: לְעֵֽלָּא לְעֵֽלָּא מִכָּל בִּרְכָתָא/");
  assert.equal(kaddish[0].tag?.condition, "tenDays");
  assert.ok(!kaddish[0].segs.map((s) => s.text).join("").includes("/"));
});

test("the congregation's responses inside the leader's words are found", () => {
  const segs = segments("שְׁמֵהּ דְּקֻדְשָׁא בְּרִיךְ הוּא (קהל: בְּרִיךְ הוּא) לְעֵֽלָּא");
  const r = segs.find((s) => s.alt === "response");
  assert.ok(r && r.alt === "response");
  assert.equal(r.words, "בְּרִיךְ הוּא");
  assert.equal(segs.map((s) => s.text).join(""), "שְׁמֵהּ דְּקֻדְשָׁא בְּרִיךְ הוּא (קהל: בְּרִיךְ הוּא) לְעֵֽלָּא");
});
