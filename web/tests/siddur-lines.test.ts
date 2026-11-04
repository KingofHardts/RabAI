import { test } from "node:test";
import assert from "node:assert/strict";
import { appliesToday, conditionOf, phrases, readLine, segments, withoutHebrewOpening } from "../lib/siddur/lines";
import type { DaySummaryDavening } from "../lib/calendar/place";

const today: DaySummaryDavening = {
  dow: 3, israel: false, roshChodesh: false, chanukah: false, purim: false, fast: false, tishaBav: false, tenDays: false,
  shabbatShuva: false, cholHamoed: false, yomTov: false, tachanun: { shacharit: true, mincha: true, allCongs: true }, hallel: 0,
  mashivHaruach: true, talUmatar: false, notes: [],
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
