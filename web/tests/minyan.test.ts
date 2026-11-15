import { test } from "node:test";
import assert from "node:assert/strict";
import { readLine } from "../lib/siddur/lines";
import { minyanFolds, minyanWhole } from "../lib/siddur/minyan";
import { parsePrefs } from "../lib/siddur/prefs";

const L = (n: number, he: string, en: string) => readLine(`K, Weekdays, X ${n}`, he, en, true);

test("davening alone leaves out what the siddur says is only with a minyan", () => {
  const lines = [
    L(1, "", "The following prayer, said by mourners, requires the presence of a minyan."),
    L(2, "יִתְגַּדַּל וְיִתְקַדַּשׁ שְׁמֵהּ רַבָּא", "Mourner: Magnified and sanctified may His great name be"),
    L(3, "יְהֵא שְׁמֵהּ רַבָּא מְבָרַךְ", "May His great name be blessed"),
    L(4, "", "The following blessing and response are said only in the presence of a minyan."),
    L(5, "בָּרְכוּ אֶת ה׳ הַמְבֹרָךְ", "Leader: BLESS the LORD, the blessed One."),
    L(6, "", "The Shema must be said with intense concentration."),
    L(7, "שְׁמַע יִשְׂרָאֵל", "Listen, Israel"),
  ];
  const folds = minyanFolds(lines);
  assert.deepEqual(
    folds.map((f) => [f.from, f.to]),
    [
      [0, 3],
      [3, 5],
    ],
  );
  assert.ok(folds.every((f) => f.reason === "Said only with a minyan"));
  // The Shema and its instruction stay.
  assert.ok(!folds.some((f) => f.from <= 5 && f.to > 5));
});

test("a Kaddish line the leader says, and the Torah reading, are only with a minyan", () => {
  const lines = [L(1, "וּבָא לְצִיּוֹן גּוֹאֵל", "A redeemer will come to Zion"), L(2, "יִתְגַּדַּל וְיִתְקַדַּשׁ", "Leader: Magnified and sanctified"), L(3, "", "On Mondays and Thursdays…")];
  assert.deepEqual(minyanFolds(lines).map((f) => [f.from, f.to]), [[1, 2]]);
  assert.equal(minyanWhole("Reading of the Torah"), "Said only with a minyan");
  assert.equal(minyanWhole("The Amida"), null);
});

test("the new settings are read back: only today's is the usual, and with a minyan", () => {
  const p = parsePrefs({});
  assert.equal(p.notToday, "hide");
  assert.equal(p.minyan, "minyan");
  assert.equal(parsePrefs({ notToday: "fold", minyan: "alone" }).minyan, "alone");
  assert.equal(parsePrefs({ notToday: "x" }).notToday, "hide");
});
