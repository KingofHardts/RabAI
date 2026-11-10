import { test } from "node:test";
import assert from "node:assert/strict";
import { leadPrayer, serviceTimes } from "../lib/siddur/service-times";

const items = [
  { id: "shmaMGA", label: "Latest time for the morning Shema", time: "8:36 AM" },
  { id: "shma", label: "Latest time for the morning Shema", time: "9:12 AM" },
  { id: "tefillah", label: "Latest time for the morning Amidah (Shacharit)", time: "10:05 AM" },
  { id: "minchaGedola", label: "Earliest Mincha (mincha gedola)", time: "12:31 PM" },
  { id: "sunset", label: "Sunset (shkiah)", time: "4:45 PM" },
  { id: "tzeit", label: "Nightfall", time: "5:20 PM" },
];

test("names the day's own times for each service", () => {
  assert.equal(serviceTimes("Shacharit", items), "Shema by 9:12 (8:36 by the Magen Avraham), the Amidah by 10:05");
  assert.equal(serviceTimes("Mincha", items), "From 12:31 until sunset, 4:45");
  assert.equal(serviceTimes("Maariv", items), "From nightfall, 5:20");
});
test("says nothing without the times, or for a service it has no time for", () => {
  assert.equal(serviceTimes("Shacharit", undefined), "");
  assert.equal(serviceTimes("Musaf", items), "");
  assert.equal(serviceTimes("Maariv", [{ id: "sunset", label: "Sunset", time: "4:45 PM" }]), "");
});

test("follows the hour, and the Shema before sleep late at night", () => {
  assert.equal(leadPrayer(7, false, true), "Shacharit");
  assert.equal(leadPrayer(14, false, true), "Mincha");
  assert.equal(leadPrayer(17, true, true), "Maariv");
  assert.equal(leadPrayer(20, true, true), "Maariv");
  assert.equal(leadPrayer(23, true, true), "Bedtime Shema");
  assert.equal(leadPrayer(2, true, true), "Bedtime Shema");
  assert.equal(leadPrayer(23, true, false), "Maariv");
});
