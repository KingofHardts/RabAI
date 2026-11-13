import { test } from "node:test";
import assert from "node:assert/strict";
import { cycleRef } from "../lib/calendar/calendar";

test("each cycle's portion today opens where it starts in the library", () => {
  const cases: Array<[string, string, string | undefined]> = [
    ["dafYomi", "Bechorot 56", "Bekhorot 56a"],
    ["dafWeekly", "Nazir 17", "Nazir 17a:1"],
    ["dirshuAmudYomi", "Sukkah 14b", "Sukkah 14b:1"],
    ["mishnaYomi", "Oholot 18:2-3", "Mishnah Oholot 18:2"],
    ["mishnaYomi", "Avot 1:1-2", "Pirkei Avot 1:1"],
    ["perekYomi", "Pesachim 10", "Mishnah Pesachim 10:1"],
    ["perekYomi", "Avot 3", "Pirkei Avot 3:1"],
    ["pirkeiAvotSummer", "Pirkei Avot 3", "Pirkei Avot 3:1"],
    ["nachYomi", "Ezekiel 10", "Ezekiel 10:1"],
    ["psalms", "Psalms 18-22", "Psalms 18:1"],
    ["tanakhYomi", "Samuel Seder 7 (I Samuel 12:22-14:22)", "I Samuel 12:22"],
    ["rambam1", "Forbidden Foods 3", "Mishneh Torah, Forbidden Foods 3:1"],
    ["rambam3", "Agents and Partners 8-10", "Mishneh Torah, Agents and Partners 8:1"],
    ["kitzurShulchanAruch", "Kitzur Shulchan Arukh 21:3-8", "Kitzur Shulchan Arukh 21:3"],
    ["arukhHaShulchanYomi", "Orach Chaim 372:29-373:3", "Arukh HaShulchan, Orach Chaim 372:29"],
    ["dirshuDafHalacha", "Daf HaYomi B'Halacha: Chazarah Mishnah Berurah 447:9-448:3", "Mishnah Berurah 447:9"],
    ["dirshuDafHalacha", "Chazarah Mishnah Berurah 488-489:4", "Mishnah Berurah 488:1"],
    ["chofetzChaim", "Hilchos LH 7.9", undefined],
    ["yerushalmi-vilna", "Yerushalmi Sanhedrin 25", undefined],
  ];
  for (const [id, text, want] of cases) assert.equal(cycleRef(id, text), want, `${id}: ${text}`);
});
