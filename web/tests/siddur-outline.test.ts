import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryOf, davenOrder, displayName, movesTorahBlessings, placeInOutline, siddurOutline } from "../lib/siddur/outline";

/*
 * The siddur organized for davening: the blessings over the Torah before the morning blessings,
 * the names shown, and the outline. The section names are the siddurs' own headings.
 */

const koren = [
  "Preface",
  "Weekdays, On Waking",
  "Weekdays, Blessings Over the Torah",
  "Weekdays, Tallit",
  "Weekdays, Tefillin",
  "Weekdays, Preparation for Prayer",
  "Weekdays, Morning Blessings",
  "Weekdays, The Binding of Isaac",
  "Weekdays, Pesukei DeZimra",
  "Weekdays, The Amida",
  "Weekdays, Tahanun",
  "Weekdays, Minha for Weekdays",
  "Weekdays, Ma'ariv for Weekdays",
  "Weekdays, Shema before Sleep at Night",
  "Shabbat, Candle Lighting",
  "Shabbat, Kabbalat Shabbat",
  "Shabbat, Shaharit for Shabbat and Yom Tov",
  "Shabbat, Pesukei DeZimra",
  "Shabbat, Ethics of the Fathers 1",
  "Shabbat, Havdala at Home",
  "Festivals, Hallel",
  "Festivals, Candle Lighting for Hanukka",
  "Festivals, Selihot; All Days",
  "Giving Thanks, Birkat HaMazon; Grace after Meals",
  "Giving Thanks, Blessings on Pleasures, Sights and Sounds",
  "The Cycle of Life, Brit Mila",
  "Torah Readings, Weekly Portions for Mondays, Thursdays and Shabbat Minha",
  "Gates to Prayer, Daily Prayer",
].map((label) => ({ section: `Koren, ${label}`, label }));

const names = (list: Array<{ label: string }>) => list.map((s) => s.label.replace(/^Weekdays, /, ""));

test("the blessings over the Torah come between the preparation for prayer and the morning blessings", () => {
  const order = names(davenOrder(koren));
  const at = order.indexOf("Blessings Over the Torah");
  assert.equal(order[at - 1], "Preparation for Prayer");
  assert.equal(order[at + 1], "Morning Blessings");
  // Everything else keeps its place, and nothing is lost.
  assert.equal(order.length, koren.length);
  assert.deepEqual(order.filter((n) => n !== "Blessings Over the Torah"), names(koren).filter((n) => n !== "Blessings Over the Torah"));
  assert.equal(movesTorahBlessings(koren), true);
  // The person can keep the siddur's printed order.
  assert.deepEqual(davenOrder(koren, "as-printed"), koren);
});

test("a blessing moves with what is learned after it, and a siddur that has them in place is left alone", () => {
  const ashkenaz = ["Modeh Ani", "Tzitzit", "Torah Blessings", "Torah Study", "Tallit", "Ma Tovu", "Morning Blessings", "Akedah"].map((n) => ({
    label: `Weekday, Shacharit, Preparatory Prayers, ${n}`,
  }));
  assert.deepEqual(
    davenOrder(ashkenaz).map((s) => s.label.split(", ").pop()),
    ["Modeh Ani", "Tzitzit", "Tallit", "Ma Tovu", "Torah Blessings", "Torah Study", "Morning Blessings", "Akedah"],
  );
  const sefard = ["Weekday Shacharit, Morning Blessings", "Weekday Shacharit, Blessings on Torah", "Weekday Shacharit, Korbanot"].map((label) => ({ label }));
  assert.deepEqual(davenOrder(sefard), sefard);
  assert.equal(movesTorahBlessings(sefard), false);
  // Morning blessings in another part of the siddur are not a reason to move anything.
  const apart = ["Weekdays, Blessings Over the Torah", "Weekdays, Tallit", "Shabbat, Morning Blessings"].map((label) => ({ label }));
  assert.deepEqual(davenOrder(apart), apart);
});

test("names are shown in the app's spelling, and a name with a comma stays whole", () => {
  assert.equal(displayName("Minha for Weekdays"), "Mincha");
  assert.equal(displayName("Ma'ariv for Shabbat and Yom Tov"), "Maariv for Shabbat and Yom Tov");
  assert.equal(displayName("The Amida"), "The Amidah");
  assert.equal(displayName("Ethics of the Fathers 3"), "Pirkei Avot, chapter 3");
  assert.equal(displayName("Candle Lighting for Hanukka"), "Candle Lighting for Chanukah");
  assert.equal(displayName("Morning Blessings"), "Morning Blessings");
  const outline = siddurOutline(davenOrder(koren), true);
  const blessings = outline.find((c) => c.id === "blessings")!;
  assert.deepEqual(
    blessings.groups.flatMap((g) => g.items.map((i) => i.title)),
    ["Birkat HaMazon (Grace after Meals)", "Blessings on food, sights and sounds"],
  );
  assert.equal(outline.find((c) => c.id === "readings")!.count, 1);
});

test("the outline groups the weekday in its stages, in the order of the day", () => {
  const outline = siddurOutline(davenOrder(koren), true);
  assert.deepEqual(
    outline.map((c) => c.id),
    ["weekday", "shabbat", "holidays", "blessings", "life", "readings", "about"],
  );
  const weekday = outline[0];
  assert.deepEqual(
    weekday.groups.map((g) => g.title),
    ["Waking up and getting ready", "Morning blessings and offerings", "Pesukei DeZimra", "The Shema and the Amidah", "After the Amidah", "Afternoon", "Evening", "At night"],
  );
  assert.deepEqual(
    weekday.groups[1].items.map((i) => i.title),
    ["Blessings over the Torah", "Morning Blessings", "The Binding of Isaac"],
  );
  // Every section is in the outline exactly once.
  const all = outline.flatMap((c) => c.groups.flatMap((g) => g.items.map((i) => i.section)));
  assert.equal(all.length, koren.length);
  assert.equal(new Set(all).size, koren.length);
  const place = placeInOutline(outline, "Koren, Weekdays, Tahanun")!;
  assert.equal(place.item.title, "Tachanun");
  assert.equal(place.item.own, "Tahanun");
  assert.equal(place.group.title, "After the Amidah");
});

test("other siddurim keep their own headings, sorted into the same categories", () => {
  assert.equal(categoryOf("Weekday, Shacharit, Amidah, Patriarchs"), "weekday");
  assert.equal(categoryOf("Upon Arising, Modeh Ani"), "weekday");
  assert.equal(categoryOf("Shabbat Candle Lighting"), "shabbat");
  assert.equal(categoryOf("Rosh Hodesh, Hallel"), "holidays");
  assert.equal(categoryOf("Pesach Haggadah, Kadesh"), "holidays");
  assert.equal(categoryOf("Birchat HaMazon, Birchat HaMazon"), "blessings");
  const sefard = ["Upon Arising, Modeh Ani", "Weekday Shacharit, Morning Blessings", "Weekday Shacharit, Amidah", "Bedtime Shema", "Weekday Mincha, Amidah"].map((label) => ({ section: label, label }));
  const weekday = siddurOutline(sefard)[0];
  // A prayer with no heading stays between the headings around it.
  assert.deepEqual(
    weekday.groups.map((g) => g.title),
    ["Upon Arising", "Weekday Shacharit", "", "Weekday Mincha"],
  );
});
