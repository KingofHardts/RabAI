import { test } from "node:test";
import assert from "node:assert/strict";
import { firstSense } from "../lib/library/entry-summary";

/* The first meaning of a dictionary entry is cut from the dictionary's own text (Jastrow's style). */

const J = (headword: string, text: string) => firstSense({ headword, text, lang: "en" });

test("the etymology in front is left out and the meaning stops where the sources begin", () => {
  assert.equal(J("עָרַב I", "עָרַב I (b. h.; cmp. אָרַב) [to insert, press into, interweave,] 1)) to mix, confuse. Yalk. Deut. 808 עָרְבוּ"), "to mix, confuse.");
  assert.equal(J("בַּיִת", "בַּיִת (b. h.; cmp. preced.), constr. בֵּית, pl. בָּתִּים. 1)) house, household, home. Yoma 11ᵇ ב׳ מיוחד"), "house, household, home.");
  assert.equal(J("עֶרֶב", "עֶרֶב (b. h.) sunset, evening. Ber. I, 1 מאימתי"), "sunset, evening.");
});

test("a numbered sense is found past labeled sub-meanings in the etymology", () => {
  assert.equal(
    J("אָמַר I", "אָמַר I (b. h.; √אם, v. אֵם) (a) to join, knot; b) to heap up; d) to exchange. [As to Assyr. to see.]) 1)) to speak, think, say. Ber. 3ᵇ"),
    "to speak, think, say.",
  );
});

test("Jastrow's short forms don't end the meaning; a question mark or &c. can", () => {
  assert.equal(J("אִמַּר", "אִמַּר lamb, v. אִימַּר."), "lamb, v. אִימַּר.");
  assert.equal(J("טֶבֶל", "טֶבֶל v. Tebel. Dem. I"), "see Tebel.");
  assert.equal(J("אֵימָת", "אֵימָת (b. h.) when? Ḥull. 17ᵃ"), "when?");
  assert.equal(J("x", "x to set aside tithes &c. Y. Dem."), "to set aside tithes &c.");
  assert.equal(J("x", "x to boast (cmp. Ps. XCIV, 4). Sot. IX"), "to boast (cmp. Ps. XCIV, 4).");
});

test("long text is clipped at a word boundary, and Hebrew entries show their start", () => {
  const long = J("x", `x ${"word ".repeat(60)}`);
  assert.ok(long.length <= 142 && long.endsWith("…"));
  assert.equal(firstSense({ headword: "ערב", text: "ערב [הִתְפָּעֵל] וּבְשִׂמְחָתוֹ", lang: "he" }), "[הִתְפָּעֵל] וּבְשִׂמְחָתוֹ");
});

test("a sense marker inside the etymology's parentheses still starts the meaning", () => {
  assert.equal(
    firstSense({ headword: "אָכַל", lang: "en", text: "אָכַל (b. h.; √אך to rub, 1)) to gnaw, eat, consume. Inf. in Y. freq. לוֹכַל = לֶאֱכוֹל. Ber. I, 1; a. v. fr." }),
    "to gnaw, eat, consume.",
  );
});

test("an entry that only points elsewhere says where; unbalanced parentheses leave nothing behind", () => {
  assert.equal(firstSense({ headword: "וויתירה", lang: "en", text: "וויתירה , Y. Keth. IV, end, 29ᵇ, v. וָתַר" }), "see וָתַר");
  assert.equal(firstSense({ headword: "מֹרֶךְ", lang: "en", text: "מֹרֶךְ v. מוֹרֶךְ" }), "see מוֹרֶךְ");
  assert.equal(firstSense({ headword: "מרמר", lang: "en", text: "מרמר , Y. B. Bath. X, 17ᶜ some ed., read: מִדְּמַר, v. מֵר I" }), "see מֵר I");
  assert.equal(
    firstSense({ headword: "קֵינַי", lang: "en", text: "קֵינַי (also קֵינַיי, קִי׳) (v. קוּן; cmp. תובל קין Gen. IV, 2 2)) artist, esp. metal-worker, silversmith. Targ. Gen." }),
    "artist, esp. metal-worker, silversmith.",
  );
});
