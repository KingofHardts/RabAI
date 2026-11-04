import { test } from "node:test";
import assert from "node:assert/strict";
import { transliterate } from "../lib/siddur/translit";

test("the blessing formula, in both pronunciations", () => {
  assert.equal(transliterate("בָּרוּךְ אַתָּה יהוה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם"), "Baruch atah Adonai eloheinu melech ha'olam");
  assert.equal(transliterate("בָּרוּךְ אַתָּה יהוה אֱלֹהֵֽינוּ מֶֽלֶךְ הָעוֹלָם", "ashkenazi"), "Boruch atoh Adonoy eloheinu melech ho'olom");
});

test("God's name is never sounded out, even with a letter before it", () => {
  assert.ok(!/y[eh]?hv/i.test(transliterate("שְׁמַע יִשְׂרָאֵל יהוה אֱלֹהֵֽינוּ יהוה אֶחָד")));
  assert.equal(transliterate("לַיהוה"), "Ladonai");
});

test("vowel letters, a sounded sheva, and a patach said before a final ches", () => {
  assert.equal(transliterate("מוֹדֶה אֲנִי לְפָנֶֽיךָ"), "Modeh ani l'fanecha");
  assert.equal(transliterate("מַשִּׁיב הָרֽוּחַ וּמוֹרִיד הַגֶּֽשֶׁם"), "Mashiv haruach umorid hageshem");
  assert.equal(transliterate("אֲשֶׁר קִדְּשָֽׁנוּ בְּמִצְוֺתָיו"), "Asher kid'shanu b'mitzvotav");
  // A taf without a dot is "s" in the Ashkenazi pronunciation.
  assert.equal(transliterate("יִתְגַּדַּל", "ashkenazi"), "Yisgadal");
});

test("the siddur's marks and cantillation are left out", () => {
  assert.equal(transliterate("▾מוֹדִים"), "Modim");
});

test("a kamatz in a closed syllable is a short o, unless marked long", () => {
  assert.equal(transliterate("בְּחָכְמָה", "sephardi"), "B'chochmah");
  assert.equal(transliterate("רִבּוֹן כָּל הַמַּעֲשִׂים", "sephardi"), "Ribon kol hama'asim");
  assert.equal(transliterate("וּבְכָל לְבָבְךָ", "sephardi"), "Uv'chol l'vavcha");
  assert.equal(transliterate("שָֽׁמְרוּ", "sephardi"), "Sham'ru");
});
