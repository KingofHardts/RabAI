import { test } from "node:test";
import assert from "node:assert/strict";
import { bareWords, guideIndex, matchGuide } from "../lib/siddur/guide-match";

const guide = guideIndex([
  { ref: "A 1", he: "בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם", en: "Blessed are You, Adonoy our God, King of the Universe," },
  { ref: "A 2", he: "אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו", en: "Who sanctified us with His commandments" },
  { ref: "A 3", he: "וְצִוָּנוּ עַל נְטִילַת יָדָיִם:", en: "and commanded us concerning the washing of hands." },
  { ref: "A 4", he: "מוֹדֶה אֲנִי", en: "I give thanks" },
  { ref: "A 5", he: "בָּרוּךְ אַתָּה יְיָ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם", en: "(the same words again)" },
  { ref: "A 6", he: "שֶׁלֹּא עָשַׂנִי גּוֹי", en: "" },
]);

test("the Hebrew is compared by its letters, with the Name's spellings as one", () => {
  assert.deepEqual(bareWords("בָּר֣וּךְ אַתָּה֮ יְהוָ֒ה, אֱלֹקֵינוּ!"), bareWords("ברוך אתה יי אלהינו"));
});

test("a line of one siddur finds the other siddur's lines for the same words, in its own order", () => {
  const koren = "בָּרוּךְ אַתָּה יהוה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדָיִם.";
  assert.deepEqual(matchGuide(koren, guide).map((l) => l.ref), ["A 1", "A 2", "A 3"]);
  // Lines with the same Hebrew are given once; a line with no English is never a guide.
  assert.equal(guide.lines.length, 4);
  // A short guide line counts only when its words stand in the line as written.
  assert.deepEqual(matchGuide("מוֹדֶה אֲנִי לְפָנֶיךָ", guide).map((l) => l.ref), ["A 4"]);
  assert.deepEqual(matchGuide("אֲנִי מוֹדֶה לְפָנֶיךָ", guide), []);
  // Other words find nothing.
  assert.deepEqual(matchGuide("שִׁיר הַמַּעֲלוֹת לְדָוִד", guide), []);
});

test("a line is paired with the guide's lines only when they hold the same words, in order", async () => {
  const { pairWithGuide } = await import("../lib/siddur/guide-match");
  const koren = "בָּרוּךְ אַתָּה יהוה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ עַל נְטִילַת יָדָיִם.";
  assert.deepEqual(pairWithGuide(koren, guide)?.map((l) => l.ref), ["A 1", "A 2", "A 3"]);
  // A line with words the guide doesn't have is not paired.
  assert.equal(pairWithGuide("בָּרוּךְ אַתָּה יהוה אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, שֶׁעָשָׂה לִי כָּל צָרְכִּי", guide), null);
  // Nor is a line that shares only an opening formula.
  assert.equal(pairWithGuide("בָּרוּךְ אַתָּה יהוה הַמְּבָרֵךְ אֶת עַמּוֹ יִשְׂרָאֵל בַּשָּׁלוֹם", guide), null);
  // A line whose closing words no guide line covers is not paired, even when 9 words in 10 match.
  const long = "אֲשֶׁר יָצַר אֶת הָאָדָם בְּחָכְמָה וּבָרָא בוֹ נְקָבִים נְקָבִים חֲלוּלִים חֲלוּלִים גָּלוּי וְיָדוּעַ לִפְנֵי כִסֵּא כְבוֹדֶךָ שֶׁאִם יִפָּתֵחַ אֶחָד מֵהֶם אוֹ יִסָּתֵם אֶחָד מֵהֶם אִי אֶפְשָׁר לְהִתְקַיֵּם וְלַעֲמֹד לְפָנֶיךָ";
  const ay = guideIndex([{ ref: "B 1", he: long, en: "Who formed man…" }]);
  assert.deepEqual(pairWithGuide(long, ay)?.map((l) => l.ref), ["B 1"]);
  assert.equal(pairWithGuide(`${long} בָּרוּךְ אַתָּה`, ay), null);
});
