import { test } from "node:test";
import assert from "node:assert/strict";
import { HDate, months } from "@hebcal/core";
import { applyChange, customsFor, describeChange, parseCustoms, parseSettingChange } from "../lib/siddur/tradition";
import { customBehind } from "../lib/siddur/tradition-learn";
import { atService, festivalHebrew, mashivAt } from "../lib/siddur/festivals";
import { dayForService, serviceOfSection } from "../lib/siddur/service-day";
import { tachanunToday, vihiNoamToday } from "../lib/siddur/today";
import { daveningDay, daveningNotes } from "../lib/calendar/davening";
import { mapAnswer } from "../lib/engine/citations";
import { createReadFilter } from "../lib/engine/live-sources";

const day = (d: number, m: number, y: number, il = false, afterSunset = false) => {
  const dv = daveningDay(new HDate(d, m, y), il, afterSunset);
  return { ...dv, notes: daveningNotes(dv) };
};

test("each tradition starts from its own customs", () => {
  assert.equal(customsFor("ashkenaz").dew, false);
  assert.equal(customsFor("sefard").dew, true);
  assert.equal(customsFor("edot").vihiNoamAlways, true);
  assert.equal(customsFor("edot").yizkor, false);
  assert.equal(customsFor("chabad").chabadDays, true);
  assert.equal(customsFor("ashkenaz").ledavid, "shemini-atzeret");
  assert.equal(customsFor("chabad").ledavid, "hoshana-raba");
});

test("stored customs are read safely, keeping the older settings", () => {
  const c = parseCustoms({ modernDays: true, sivan12: true, nonsense: 3, ledavid: "sometimes" });
  assert.equal(c.nusach, "ashkenaz");
  assert.equal(c.modernDays, true);
  assert.equal(c.sivan12, true);
  assert.equal(c.ledavid, "shemini-atzeret");
  assert.equal(parseCustoms({ nusach: "sefard" }).viduyDaily, true);
  assert.equal(parseCustoms(null).nusach, "ashkenaz");
});

test("RabbAI's offered change is only ever a real setting", () => {
  assert.deepEqual(parseSettingChange("nusach=sefard"), { key: "nusach", value: "sefard" });
  assert.deepEqual(parseSettingChange("pesachSheni=false"), { key: "pesachSheni", value: false });
  assert.deepEqual(parseSettingChange("ledavid=all-year"), { key: "ledavid", value: "all-year" });
  assert.equal(parseSettingChange("nusach=reform"), null);
  assert.equal(parseSettingChange("today=false"), null);
  assert.equal(parseSettingChange("pesachSheni=maybe"), null);
  assert.match(describeChange({ key: "nusach", value: "edot" }), /Sephardi/);
  // A new tradition resets the customs to its own.
  assert.equal(applyChange({ ...customsFor("ashkenaz"), pesachSheni: false }, { key: "nusach", value: "edot" }).pesachSheni, true);
});

test("an answer's [[daven …]] becomes a checked offer and never shows as text", () => {
  const mapped = mapAnswer([{ type: "text", text: "I can set that for you.\n[[daven pesachSheni=false]]\n[[daven nusach=martian]]\nDone.", citations: null }], [], []);
  assert.deepEqual(mapped.settings, ["pesachSheni=false"]);
  assert.ok(!mapped.blocks.some((b) => /\[\[/.test(b.text)));
  // While the answer is written, the marker is dropped.
  let shown = "";
  const f = createReadFilter({ canRead: () => null, onText: (t) => (shown += t), onRead: () => undefined });
  f.push("Sure.\n[[da");
  f.push("ven nusach=sefard]]\nThere.");
  f.flush();
  assert.ok(!shown.includes("[["), shown);
  assert.match(shown, /There\./);
});

test("customs decide Tachanun on the days communities differ", () => {
  // Pesach Sheni (14 Iyar 5787): left out by Koren's list; said by those who say it.
  const ps = day(14, months.IYYAR, 5787);
  assert.equal(tachanunToday(ps, customsFor("ashkenaz"), "shacharit"), false);
  assert.equal(tachanunToday(ps, { ...customsFor("ashkenaz"), pesachSheni: false }, "shacharit"), true);
  // 19 Kislev: Chabad leaves it out, from the Mincha before.
  const k19 = day(19, months.KISLEV, 5787);
  const k18 = day(18, months.KISLEV, 5787);
  if (k19.dow !== 6 && k18.dow !== 6 && k18.dow !== 5) {
    assert.equal(tachanunToday(k19, customsFor("ashkenaz"), "shacharit"), true);
    assert.equal(tachanunToday(k19, customsFor("chabad"), "shacharit"), false);
    assert.equal(tachanunToday(k18, customsFor("chabad"), "mincha"), false);
    assert.equal(tachanunToday(k18, customsFor("chabad"), "shacharit"), true);
  }
  // No Tachanun at Mincha in a shul that davens near sunset.
  const plain = day(20, months.CHESHVAN, 5787);
  assert.equal(tachanunToday(plain, { ...customsFor("ashkenaz"), noMinchaTachanun: true }, "mincha"), false);
});

test("Vihi No'am: left out before a festival week by Ashkenazim, said by Sephardim", () => {
  // Find a Motza'ei Shabbat with a festival in the coming week, and one without.
  let withYt: ReturnType<typeof day> | null = null;
  let without: ReturnType<typeof day> | null = null;
  for (let hd = new HDate(1, months.TISHREI, 5787); hd.abs() < new HDate(1, months.TISHREI, 5788).abs(); hd = hd.next()) {
    if (hd.getDay() !== 0) continue;
    const d = day(hd.getDate(), hd.getMonth(), hd.getFullYear(), false, true);
    if (!d.motzaei || d.tishaBav) continue;
    if (d.yomTovAhead.some((k) => k <= 5)) withYt ??= d;
    else without ??= d;
  }
  assert.ok(withYt && without);
  assert.equal(vihiNoamToday(withYt!, customsFor("ashkenaz")).said, false);
  assert.equal(vihiNoamToday(withYt!, customsFor("edot")).said, true);
  assert.equal(vihiNoamToday(without!, customsFor("ashkenaz")).said, true);
});

test("the rain phrase changes at Musaf: the service decides", () => {
  const sa = day(22, months.TISHREI, 5787);
  assert.equal(mashivAt(sa, "shacharit"), false);
  assert.equal(mashivAt(sa, "musaf"), true);
  assert.equal(mashivAt(sa, "mincha"), true);
  const p1 = day(15, months.NISAN, 5787);
  assert.equal(mashivAt(p1, "shacharit"), true);
  assert.equal(mashivAt(p1, "musaf"), false);
  assert.equal(atService(p1, "mincha")!.rainChange, undefined);
  assert.equal(atService(p1, "mincha")!.mashivHaruach, false);
});

test("a service belongs to its own day: Ma'ariv tonight, a late Mincha the day that ends", () => {
  const today = day(29, months.CHESHVAN, 5787);
  const tonight = day(30, months.CHESHVAN, 5787, false, true);
  const summary = { davening: today, daveningTonight: tonight };
  assert.equal(dayForService(summary, "maariv"), tonight);
  assert.equal(dayForService(summary, "mincha"), today);
  assert.equal(dayForService(summary, "shacharit"), today);
  assert.equal(serviceOfSection("The Koren Shalem Siddur; Ashkenaz, Weekdays, Ma'ariv for Weekdays"), "maariv");
  assert.equal(serviceOfSection("The Koren Shalem Siddur; Ashkenaz, Festivals, Amida for Yom Tov"), "shared");
  assert.equal(serviceOfSection("Siddur Sefard, Holidays, Yom Tov Musaf Amidah"), "musaf");
  assert.equal(serviceOfSection("The Koren Shalem Siddur; Ashkenaz, Weekdays, Counting of the Omer"), "maariv");
});

test("Siddur Sefard's Hebrew directions name the day's offering", () => {
  const c = customsFor("sefard");
  assert.equal(festivalHebrew("ליום א' וב' דפסח:", day(15, months.NISAN, 5787), c, "musaf")?.said, true);
  assert.equal(festivalHebrew("ליום א' וב' דפסח:", day(17, months.NISAN, 5787), c, "musaf")?.said, false);
  // Outside Israel each day of Chol HaMoed Sukkot says two days' offerings.
  const dia18 = day(18, months.TISHREI, 5787);
  assert.equal(festivalHebrew('ביום שני דחוה"מ סוכות באר"י:', dia18, c, "musaf")?.said, true);
  assert.equal(festivalHebrew('ביום שלישי דחוה"מ סוכות באר"י:', dia18, c, "musaf")?.said, true);
  assert.equal(festivalHebrew('ביום ראשון דחוה"מ סוכות באר"י:', dia18, c, "musaf")?.said, false);
  assert.equal(festivalHebrew("למנחה:", day(15, months.NISAN, 5787), c, "shacharit")?.said, false);
});

test("opening what a custom left out asks about the custom", () => {
  const ps = day(14, months.IYYAR, 5787);
  const q = customBehind("No Tachanun today (Pesach Sheni)", ps, customsFor("ashkenaz"));
  assert.equal(q?.key, "pesachSheni");
  assert.equal(q?.value, false);
  assert.equal(customBehind("No Tachanun today (Rosh Chodesh)", day(1, months.KISLEV, 5787), customsFor("ashkenaz")), null);
  assert.equal(customBehind("Left out when a festival falls in the coming week", ps, customsFor("ashkenaz"))?.key, "vihiNoamAlways");
});
