import { test } from "node:test";
import assert from "node:assert/strict";
import { shortPlace, shortRef } from "../lib/library/short-name";

test("long references are shortened to the book and the last part", () => {
  assert.equal(shortRef("Siddur Ashkenaz, Weekday, Shacharit, Pesukei Dezimra, Barukh She'amar 1"), "Siddur Ashkenaz · Barukh She'amar 1");
  assert.equal(shortRef("The Koren Shalem Siddur; Ashkenaz, Weekdays, The Amida 4"), "Koren Shalem Siddur; Ashkenaz · The Amida 4");
  for (const r of ["Genesis 1:3", "Berakhot 2a:4", "Shulchan Arukh, Orach Chayim 1:1", "Rashi on Genesis 1:1:1"]) assert.equal(shortRef(r), r);
  assert.equal(shortPlace("Weekday, Shacharit, Preparatory Prayers, Modeh Ani"), "Modeh Ani");
  assert.equal(shortPlace("2a"), "2a");
});
