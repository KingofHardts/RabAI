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
  assert.equal(J("טֶבֶל", "טֶבֶל v. Tebel. Dem. I"), "v. Tebel.");
  assert.equal(J("אֵימָת", "אֵימָת (b. h.) when? Ḥull. 17ᵃ"), "when?");
  assert.equal(J("x", "x to set aside tithes &c. Y. Dem."), "to set aside tithes &c.");
  assert.equal(J("x", "x to boast (cmp. Ps. XCIV, 4). Sot. IX"), "to boast (cmp. Ps. XCIV, 4).");
});

test("long text is clipped at a word boundary, and Hebrew entries show their start", () => {
  const long = J("x", `x ${"word ".repeat(60)}`);
  assert.ok(long.length <= 142 && long.endsWith("…"));
  assert.equal(firstSense({ headword: "ערב", text: "ערב [הִתְפָּעֵל] וּבְשִׂמְחָתוֹ", lang: "he" }), "[הִתְפָּעֵל] וּבְשִׂמְחָתוֹ");
});
