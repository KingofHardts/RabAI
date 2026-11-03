import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { calendarInfo, calendarNoteForLookup, calendarSettings, candleMinutesFor, dafRef, daySummary, yearAhead } from "../lib/calendar/calendar";
import { asksAboutCalendar, parsePlace, parsePrefs, parseWhenAndWhere, placeFromHeaders, whenForRequest, type Place } from "../lib/calendar/place";
import { calendarNotes, planRequest } from "../lib/engine/answer";
import { loadLibrary } from "../lib/library/index";

const BALTIMORE: Place = { lat: 39.36, lon: -76.7, name: "Baltimore, Maryland", tz: "America/New_York", from: "set" };
const JERUSALEM: Place = { lat: 31.77, lon: 35.21, name: "Jerusalem", tz: "Asia/Jerusalem", il: true, from: "set" };

/** A moment given as a civil time in a time zone with a fixed offset, e.g. "2026-11-03T14:00-05:00". */
const at = (iso: string) => new Date(iso);

test("today's date, Hebrew date and parsha come from the person's own day", () => {
  const info = calendarInfo({ now: at("2026-11-03T14:00:00-05:00"), place: BALTIMORE });
  assert.equal(info.today.civil, "Tuesday, November 3, 2026");
  assert.equal(info.today.hebrew, "23 Cheshvan 5787");
  assert.equal(info.today.afterSunset, false);
  assert.equal(info.parsha?.name, "Chayei Sara");
  assert.equal(info.parsha?.day, "Saturday, November 7");
  assert.equal(info.parsha?.ref, "Genesis 23:1");
  assert.match(info.parsha?.range ?? "", /^Genesis 23:1–25:18$/);
  assert.ok(info.parsha?.special?.some((s) => /Mevarchim/.test(s)), "Shabbat Mevarchim Kislev is named");
  assert.ok(info.upcoming.some((u) => u.kind === "roshchodesh" && u.date === "2026-11-10"), "Rosh Chodesh Kislev is coming");
  assert.ok(!/[֑-ׇ]/.test(info.parsha?.he ?? ""), "the Hebrew name has no vowel points");
});

test("Shabbat times are worked out for the person's place", () => {
  const info = calendarInfo({ now: at("2026-11-03T14:00:00-05:00"), place: BALTIMORE });
  assert.equal(info.shabbat?.candlesDay, "Friday, November 6");
  assert.equal(info.shabbat?.candles, "4:41 pm");
  assert.equal(info.shabbat?.candleMins, 18);
  assert.equal(info.shabbat?.ends, "5:40 pm");
  assert.equal(info.shabbat?.rabbeinuTam, "6:10 pm");
  const shma = info.zmanim?.items.filter((z) => z.id === "shma" || z.id === "shmaMGA") ?? [];
  assert.equal(shma.length, 2, "both the Magen Avraham's and the Vilna Gaon's latest Shema are given");
  // A different havdalah choice changes when Shabbat ends.
  const fixed = calendarInfo({ now: at("2026-11-03T14:00:00-05:00"), place: BALTIMORE, prefs: { havdalah: "72" } });
  assert.equal(fixed.shabbat?.ends, fixed.shabbat?.rabbeinuTam);
});

test("after sunset the Hebrew date moves on, and Jerusalem lights candles 40 minutes before sunset", () => {
  const info = calendarInfo({ now: at("2026-11-03T21:15:00+02:00"), place: JERUSALEM });
  assert.equal(info.today.afterSunset, true);
  assert.equal(info.today.hebrew, "24 Cheshvan 5787");
  assert.equal(info.shabbat?.candleMins, 40);
  assert.equal(candleMinutesFor({ ...JERUSALEM, lat: 32.08, lon: 34.78, name: "Tel Aviv" }), 20);
  assert.equal(candleMinutesFor(BALTIMORE, { candleMins: 22 }), 22);
});

test("once Shabbat is over, this week's parsha is next week's", () => {
  // Saturday, November 7, 2026, before and after Shabbat ends in Baltimore (5:40 pm).
  const before = calendarInfo({ now: at("2026-11-07T15:00:00-05:00"), place: BALTIMORE });
  assert.equal(before.parsha?.name, "Chayei Sara");
  assert.equal(before.parshaNext?.name, "Toldot");
  assert.equal(before.shabbat?.endsDay, "Saturday, November 7");
  const after = calendarInfo({ now: at("2026-11-07T19:30:00-05:00"), place: BALTIMORE });
  assert.equal(after.parsha?.name, "Toldot");
  assert.equal(after.parshaNext, undefined);
  assert.equal(after.shabbat?.candlesDay, "Friday, November 13");
});

test("a fast's beginning and end are in the coming days, with times", () => {
  const info = calendarInfo({ now: at("2026-12-18T12:00:00-05:00"), place: BALTIMORE });
  const fast = info.upcoming.filter((u) => u.kind === "fast" && u.date === "2026-12-20");
  assert.ok(fast.some((u) => /^Asara B['’]Tevet$/.test(u.title)), "Asara B'Tevet is named");
  assert.ok(fast.some((u) => /^Fast begins \(Asara B['’]Tevet\)$/.test(u.title) && u.time === "5:56 am"), JSON.stringify(fast));
  assert.ok(fast.some((u) => /^Fast ends \(Asara B['’]Tevet\)$/.test(u.title) && u.time === "5:23 pm"), JSON.stringify(fast));
  const settings = calendarSettings(info, { times: true });
  assert.match(settings, /Fast ends \(Asara B['’]Tevet\) 5:23 pm/);
});

test("without a place, RabbAI has the date but says it needs the place for times", () => {
  const info = calendarInfo({ now: at("2026-11-03T14:00:00-05:00"), tz: "America/New_York" });
  assert.equal(info.today.hebrew, "23 Cheshvan 5787");
  assert.equal(info.zmanim, undefined);
  assert.equal(info.shabbat, undefined);
  const settings = calendarSettings(info, { times: true });
  assert.match(settings, /doesn't know where the person is/);
  assert.match(settings, /The Hebrew date changes at sunset/);
  // Without being asked about times, nothing about times is said.
  assert.doesNotMatch(calendarSettings(info), /zmanim|doesn't know where/);
});

test("the lookup step is told the date, the parsha and today's daf", () => {
  const info = calendarInfo({ now: at("2026-11-03T14:00:00-05:00"), place: BALTIMORE });
  const note = calendarNoteForLookup(info);
  assert.match(note, /^Today is Tuesday, November 3, 2026 \(23 Cheshvan 5787\)\./);
  assert.match(note, /This week's parsha is Chayei Sara, Genesis 23:1–25:18\./);
  assert.match(note, /Today's Daf Yomi is Bekhorot 46\./);
  assert.equal(dafRef("Bechorot 46"), "Bekhorot 46a");
  assert.equal(dafRef("Berachot 2"), "Berakhot 2a");
  assert.equal(dafRef("not a daf"), undefined);
});

test("the year ahead lists the holidays and fasts with their dates", () => {
  const year = yearAhead({ now: at("2026-11-03T14:00:00-05:00"), tz: "America/New_York" });
  assert.ok(year.some((y) => y.title === "Chanukah: 1 Candle" && y.date === "2026-12-04"), "Chanukah's first candle");
  assert.ok(year.some((y) => /^Tish['’]a B['’]Av$/.test(y.title)), "Tisha B'Av");
  assert.ok(year.some((y) => /^Tu B['’]Av$/.test(y.title)), "Tu B'Av");
  assert.ok(year.some((y) => /Yom Kippur/.test(y.title)), "Yom Kippur");
});

test("a place from the device is checked and kept to two decimal places", () => {
  assert.deepEqual(parsePlace({ lat: 39.36789, lon: -76.70123, name: " Home\n", from: "device" }), {
    lat: 39.37,
    lon: -76.7,
    name: "Home",
    from: "device",
  });
  assert.equal(parsePlace({ lat: 120, lon: 0, from: "set" }), null);
  assert.equal(parsePlace({ lat: 1, lon: 2, from: "approx" }), null, "the device can't claim an approximate place");
  assert.equal(parsePlace("Baltimore"), null);
  assert.equal(parsePlace({ lat: 1, lon: 2, from: "set", tz: "Not/AZone" })?.tz, undefined);
  assert.deepEqual(parsePrefs({ candleMins: 19, havdalah: "50", custom: "chabad" }), { havdalah: "50", custom: "chabad" });
  assert.deepEqual(parseWhenAndWhere({ tz: "Europe/London", approx: false }), { tz: "Europe/London", approx: false });
});

test("with no place set, the approximate area of the connection is used, unless turned off", () => {
  const headers = new Headers({
    "x-vercel-ip-latitude": "39.29",
    "x-vercel-ip-longitude": "-76.61",
    "x-vercel-ip-city": "Baltimore",
    "x-vercel-ip-country-region": "MD",
    "x-vercel-ip-country": "US",
    "x-vercel-ip-timezone": "America/New_York",
  });
  const approx = placeFromHeaders(headers);
  assert.deepEqual(approx, { lat: 39.29, lon: -76.61, name: "Baltimore, MD", tz: "America/New_York", from: "approx" });
  assert.equal(whenForRequest({}, headers).place?.from, "approx");
  assert.equal(whenForRequest({ approx: false }, headers).place, undefined);
  assert.equal(whenForRequest({ approx: false }, headers).tz, "America/New_York", "the time zone still comes through");
  // A place the person set wins, and a device location takes the device's time zone.
  const set = whenForRequest({ tz: "America/Chicago", place: { lat: 41.88, lon: -87.63, name: "Chicago", from: "device" } }, headers);
  assert.equal(set.place?.name, "Chicago");
  assert.equal(set.place?.tz, "America/Chicago");
  assert.equal(whenForRequest({ place: { ...JERUSALEM, il: undefined } }, new Headers()).place?.il, true, "Jerusalem time means Israel");
  assert.equal(placeFromHeaders(new Headers()), null);
});

test("questions about dates and times are recognized", () => {
  for (const q of [
    "What time does Shabbat come in this week?",
    "when is candle lighting",
    "Until what time is the fast tomorrow?",
    "what's this week's parsha",
    "Give me a dvar torah on the parsha of the week",
    "what is today's daf",
    "When is sof zman krias shema?",
    "When is Chanukah this year?",
  ]) {
    assert.ok(asksAboutCalendar(q), q);
  }
  for (const q of ["What does Rashi say on Bereishit 1:1?", "Explain the machloket about tefillin on Chol HaMoed in the Gemara", "Who wrote the Mishnah Berurah?"]) {
    assert.ok(!asksAboutCalendar(q), q);
  }
});

test("RabbAI gets the calendar with every answer, and the times only when they're asked for", () => {
  const info = calendarInfo({ now: at("2026-11-03T14:00:00-05:00"), place: BALTIMORE });
  const timesQuestion = calendarNotes(info, { question: "When does Shabbat start this week?", history: [] }, false);
  assert.equal(timesQuestion.times, true);
  assert.ok(timesQuestion.year?.length);
  const other = calendarNotes(info, { question: "What does Rashi say here?", history: [] }, false);
  assert.equal(other.times, false);
  assert.equal(calendarNotes(info, { question: "", history: [], action: "explain" }, true).times, false, "never for a line action");

  const lib = loadLibrary();
  const { params } = planRequest({ question: "When does Shabbat start this week?", history: [] }, lib, { model: "m", effort: "medium", maxTokens: 1000 }, undefined, {
    calendar: timesQuestion,
  });
  const system = JSON.stringify(params.system);
  assert.match(system, /This week's parsha, read on Saturday, November 7: Chayei Sara/);
  assert.match(system, /candle lighting Friday, November 6 at 4:41 pm/);
});

test("the calendar library never reaches the device", () => {
  // @hebcal/core is GPL; it runs only on the server. No client file may import it, or the server-only
  // calendar module that does.
  const roots = ["app", "components", "lib"];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(tsx?|jsx?)$/.test(name)) {
        const text = readFileSync(path, "utf8");
        const client = /^\s*["']use client["']/m.test(text);
        if (client && /@hebcal|calendar\/calendar/.test(text)) offenders.push(path);
      }
    }
  };
  const web = fileURLToPath(new URL("..", import.meta.url));
  for (const r of roots) walk(join(web, r));
  assert.deepEqual(offenders, []);
  assert.doesNotMatch(readFileSync(join(web, "lib/calendar/place.ts"), "utf8"), /@hebcal/);
});

test("the day summary gives a fast coming in the next two days, with its times", () => {
  // Asara B'Tevet 5787 is Sunday, December 20, 2026; the day before, it is "tomorrow".
  const info = calendarInfo({ now: at("2026-12-19T12:00:00-05:00"), place: BALTIMORE });
  const day = daySummary(info);
  assert.equal(day.date, "2026-12-19");
  assert.equal(day.soon?.kind, "fast");
  assert.match(day.soon?.title ?? "", /Tevet/);
  assert.equal(day.soon?.begins?.date, "2026-12-20");
  assert.match(day.soon?.begins?.time ?? "", /am$/);
  assert.equal(day.soon?.ends?.date, "2026-12-20");
  assert.match(day.soon?.ends?.time ?? "", /pm$/);
  // Nothing within two days of an ordinary Tuesday in Cheshvan.
  assert.equal(daySummary(calendarInfo({ now: at("2026-11-03T14:00:00-05:00"), place: BALTIMORE })).soon, undefined);
});
