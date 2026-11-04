import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyTehillim, weeklyTehillim } from "../lib/calendar/tehillim";
import { calendarFile, icsText } from "../lib/calendar/ics";
import { bearingToJerusalem, directionWords } from "../lib/geo/mizrach";
import { lawNumbersIn, lawRanges, prayerLinks } from "../lib/siddur/links";
import { bareLetters, noteFor } from "../lib/siddur/notes";
import { readLine } from "../lib/siddur/lines";

test("the day's Tehillim covers the whole book", () => {
  const all = new Set<string>();
  for (let d = 1; d <= 30; d++) for (const p of monthlyTehillim(d)) for (const c of p.chapters) all.add(`${c}${p.verses ?? ""}`);
  for (let c = 1; c <= 150; c++) if (c !== 119) assert.ok(all.has(String(c)), `Psalm ${c}`);
  assert.ok(all.has("1191-96") && all.has("11997-176"));
  assert.equal(monthlyTehillim(1)[0].label, "Psalms 1–9");
  assert.equal(monthlyTehillim(25)[0].label, "Psalm 119:1–96");
  // In a 29-day month the 29th finishes the book.
  assert.deepEqual(monthlyTehillim(29, 29).map((p) => p.label), ["Psalms 140–144", "Psalms 145–150"]);
  assert.equal(weeklyTehillim(6).label, "Psalms 120–150");
});

test("a calendar file has its events, escaped and with reminders", () => {
  const text = calendarFile("Omer", [{ uid: "omer-1", title: "Count the Omer: day 1, tonight", start: new Date(2027, 3, 22, 21, 0), alarmBefore: 0 }], new Date(Date.UTC(2027, 0, 1)));
  assert.match(text, /BEGIN:VCALENDAR\r\n/);
  assert.match(text, /DTSTART:20270422T210000/);
  assert.match(text, /SUMMARY:Count the Omer: day 1\\, tonight/);
  assert.match(text, /TRIGGER:-PT0M/);
  assert.equal(icsText("a;b,c\nd"), "a\;b\\,c\\nd");
});

test("the direction to Jerusalem", () => {
  // From New York, Jerusalem is to the east-northeast; from Jerusalem's north, south.
  const ny = bearingToJerusalem({ lat: 40.71, lon: -74.0 });
  assert.ok(ny > 50 && ny < 60, String(ny));
  assert.equal(directionWords(ny), "northeast");
  assert.ok(Math.abs(bearingToJerusalem({ lat: 32.8, lon: 35.2354 }) - 180) < 1);
});

test("an instruction's laws and the prayers it names", () => {
  assert.deepEqual(lawRanges("See laws 129–131."), [{ from: 129, to: 131, label: "Laws 129–131" }]);
  assert.deepEqual(lawRanges("See law 478a."), [{ from: 478, to: 478, label: "Law 478a" }]);
  assert.deepEqual(prayerLinks("On Rosh Ḥodesh, Ḥanukka, Ḥol HaMo’ed, say Hallel on page 732.").map((p) => p.name), ["Hallel"]);
  assert.deepEqual(
    lawNumbersIn("Laws of מַשִּׁיב הָרֽוּחַ\n129 One begins saying מַשִּׁיב הָרֽוּחַ in Musaf").map((x) => x.n),
    [129],
  );
});

test("a note goes before the line it names, by its opening words", () => {
  assert.equal(bareLetters("שְׁמַע ▾יִשְׂרָאֵל, יהוה"), "שמע ישראל יהוה");
  const shema = readLine("Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema, Shema 1", "שְׁמַע יִשְׂרָאֵל יהוה אֱלֹהֵינוּ יהוה אֶחָד", "Hear, O Israel", false);
  assert.equal(noteFor(shema)?.id, "shema");
  assert.equal(noteFor(readLine("M 2", "וְאָהַבְתָּ אֵת יהוה אֱלֹהֶיךָ", "You shall love", false)), null);
});

test("a yahrzeit from Adar of an ordinary year shows Adar II too in a leap year", async () => {
  const { yahrzeitDates } = await import("../lib/calendar/reminders");
  const r = yahrzeitDates("2020-03-15", false, new Date("2026-11-04T12:00:00"), 2);
  assert.ok(r);
  assert.equal(r.dates[0].hebrew, "19th of Adar I, 5787");
  assert.equal(r.dates[0].adarII?.date, "2027-03-28");
  assert.equal(r.dates[1].adarII, undefined);
});

test("a note appears only in the prayers it belongs to", () => {
  const baruchShem = (ref: string) => readLine(ref, "בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד", "Blessed be the name", false);
  assert.equal(noteFor(baruchShem("Siddur Ashkenaz, Weekday, Shacharit, Blessings of the Shema, Shema 2"))?.id, "baruch-shem");
  assert.equal(noteFor(baruchShem("Siddur Ashkenaz, Weekday, Shacharit, Preparatory Prayers, Tefillin 5")), null);
  const oseh = (ref: string) => readLine(ref, "עֹשֶׂה שָׁלוֹם בִּמְרוֹמָיו", "He who makes peace", false);
  assert.equal(noteFor(oseh("Siddur Ashkenaz, Weekday, Shacharit, Amidah, Concluding Passage 3"))?.id, "oseh-shalom");
  assert.equal(noteFor(oseh("Siddur Ashkenaz, Berachot, Birkat HaMazon 30")), null);
});
