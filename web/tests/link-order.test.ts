import { test } from "node:test";
import assert from "node:assert/strict";
import {
  codeOf,
  commentaryBase,
  commentaryPrefixes,
  comparePlaces,
  isCommentaryOn,
  orderLinked,
  splitRef,
  type LinkPair,
} from "../lib/library/link-order";

/*
 * The links below are the shape of the library's own: the refs a seif of the Shulchan Aruch,
 * a halacha of the Rambam, a line of Gemara and a verse link to. They are names of places only.
 */

const pairs = (anchor: string, others: string[]): LinkPair[] => others.map((other) => ({ anchor, other }));

const OC = "Shulchan Arukh, Orach Chayim 671:2";
const OC_LINKS = [
  "Turei Zahav on Shulchan Arukh, Orach Chayim 671:1",
  "Ba'er Hetev on Shulchan Arukh, Orach Chayim 671:2",
  "Be'er HaGolah on Shulchan Arukh, Orach Chayim 671:2",
  "Be'er HaGolah on Shulchan Arukh, Orach Chayim 671:3",
  "Beur HaGra on Shulchan Arukh, Orach Chayim 671:2:1",
  "Biur Halacha 671:2:1",
  "Biur Halacha 671:2:2",
  "Kaf HaChayim on Shulchan Arukh, Orach Chayim 671:10:1",
  "Kaf HaChayim on Shulchan Arukh, Orach Chayim 671:11:1",
  "Kaf HaChayim on Shulchan Arukh, Orach Chayim 671:6:1",
  "Kaf HaChayim on Shulchan Arukh, Orach Chayim 671:7:1",
  "Magen Avraham 671:1",
  "Mishnah Berurah 671:10",
  "Mishnah Berurah 671:4",
  "Mishnah Berurah 671:5",
  "Mishnah Berurah 671:6",
  "Mishneh Torah, Scroll of Esther and Hanukkah 4:1",
  "Peninei Halakhah, Zemanim 12:2:4",
  "Sha'arei Teshuvah on Shulchan Arukh, Orach Chayim 671:2",
  "Shabbat 21b:3",
  "Shabbat 21b:4",
  "Magen Avraham 2:3",
];

test("a seif of Orach Chayim opens the Mishnah Berurah and Biur Halacha, then the Magen Avraham and Taz, then its sources", () => {
  const order = orderLinked(pairs(OC, OC_LINKS), [OC], 8);
  assert.deepEqual(order, [
    "Mishnah Berurah 671:4",
    "Biur Halacha 671:2:1",
    "Magen Avraham 671:1",
    "Turei Zahav on Shulchan Arukh, Orach Chayim 671:1",
    "Mishnah Berurah 671:5",
    "Biur Halacha 671:2:2",
    "Shabbat 21b:3",
    "Mishneh Torah, Scroll of Esther and Hanukkah 4:1",
  ]);
});

test("one long commentary can't crowd out the others, and the Be'er HaGolah comes last", () => {
  const order = orderLinked(pairs(OC, OC_LINKS), [OC], 40);
  const kaf = order.filter((r) => r.startsWith("Kaf HaChayim"));
  assert.equal(kaf[0], "Kaf HaChayim on Shulchan Arukh, Orach Chayim 671:6:1", "in reading order, 6 before 10");
  assert.ok(order.indexOf("Beur HaGra on Shulchan Arukh, Orach Chayim 671:2:1") < order.indexOf(kaf[1]), "the Gra before Kaf HaChayim's second line");
  assert.ok(order.slice(-2).every((r) => r.startsWith("Be'er HaGolah")), "Be'er HaGolah last");
  assert.ok(
    order.indexOf("Magen Avraham 2:3") > order.indexOf("Peninei Halakhah, Zemanim 12:2:4") - 1,
    "a commentary on another siman waits with the cross-references",
  );
});

test("Yoreh De'ah opens the Shach and Taz first; Even HaEzer the Chelkat Mechokek and Beit Shmuel; Choshen Mishpat the Sma and Shach", () => {
  const yd = "Shulchan Arukh, Yoreh De'ah 87:1";
  assert.deepEqual(
    orderLinked(
      pairs(yd, [
        "Ba'er Hetev on Shulchan Arukh, Yoreh De'ah 87:1",
        "Chullin 115b:18",
        "Pitchei Teshuva on Shulchan Arukh, Yoreh De'ah 87:1",
        "Turei Zahav on Shulchan Arukh, Yoreh De'ah 87:1",
        "Siftei Kohen on Shulchan Arukh, Yoreh De'ah 87:1:1",
      ]),
      [yd],
      3,
    ),
    ["Siftei Kohen on Shulchan Arukh, Yoreh De'ah 87:1:1", "Turei Zahav on Shulchan Arukh, Yoreh De'ah 87:1", "Pitchei Teshuva on Shulchan Arukh, Yoreh De'ah 87:1"],
  );
  const eh = "Shulchan Arukh, Even HaEzer 1:1";
  assert.deepEqual(
    orderLinked(pairs(eh, ["Yevamot 61b:15", "Ba'er Hetev on Shulchan Arukh, Even HaEzer 1:1", "Beit Shmuel 1:1", "Chelkat Mechokek 1:1"]), [eh], 2),
    ["Chelkat Mechokek 1:1", "Beit Shmuel 1:1"],
  );
  const cm = "Shulchan Arukh, Choshen Mishpat 1:1";
  assert.deepEqual(
    orderLinked(
      pairs(cm, ["Bava Kamma 84b:2", "Siftei Kohen on Shulchan Arukh, Choshen Mishpat 1:1:1", "Me'irat Einayim on Shulchan Arukh, Choshen Mishpat 1:1"]),
      [cm],
      3,
    ),
    ["Me'irat Einayim on Shulchan Arukh, Choshen Mishpat 1:1", "Siftei Kohen on Shulchan Arukh, Choshen Mishpat 1:1:1", "Bava Kamma 84b:2"],
  );
});

test("a halacha of the Rambam opens the Maggid Mishneh, Kessef Mishneh and Ra'avad, then the Gemara", () => {
  const mt = "Mishneh Torah, Sabbath 1:1";
  const order = orderLinked(
    pairs(mt, [
      "Ohr Sameach on Mishneh Torah, Sabbath 22:14:1",
      "Shabbat 153b:14",
      "Tzafnat Pa'neach on Mishneh Torah, Sabbath 1:1:1",
      "Migdal Oz on Mishneh Torah, Sabbath 1:1:1",
      "Hasagot HaRa'avad on Mishneh Torah, Sabbath 1:1:1",
      "Kessef Mishneh on Mishneh Torah, Sabbath 1:1:1",
      "Maggid Mishneh on Mishneh Torah, Sabbath 1:1:1",
      "Sefer Mitzvot Katan 281:1",
    ]),
    [mt],
    6,
  );
  assert.deepEqual(order.slice(0, 4), [
    "Maggid Mishneh on Mishneh Torah, Sabbath 1:1:1",
    "Kessef Mishneh on Mishneh Torah, Sabbath 1:1:1",
    "Hasagot HaRa'avad on Mishneh Torah, Sabbath 1:1:1",
    "Migdal Oz on Mishneh Torah, Sabbath 1:1:1",
  ]);
  assert.equal(order[4], "Shabbat 153b:14");
  assert.ok(!isCommentaryOn(mt, "Ohr Sameach on Mishneh Torah, Sabbath 22:14:1"), "a comment on another halacha is a cross-reference");
  assert.ok(isCommentaryOn(mt, "Kessef Mishneh on Mishneh Torah, Sabbath 1:1:1"));
});

test("the Rambam's commentaries are read by their refs, a halacha or a chapter at a time", () => {
  const prefixes = commentaryPrefixes("Mishneh Torah, Sabbath 1:1");
  assert.ok(prefixes.includes("Kessef Mishneh on Mishneh Torah, Sabbath 1:1:"));
  assert.ok(prefixes.includes("Maggid Mishneh on Mishneh Torah, Sabbath 1:1:"));
  assert.ok(commentaryPrefixes("Mishneh Torah, Sabbath 1").includes("Hasagot HaRa'avad on Mishneh Torah, Sabbath 1:"));
  assert.deepEqual(commentaryPrefixes("Genesis 1:1"), []);
  assert.equal(commentaryBase("Kessef Mishneh on Mishneh Torah, Sabbath 1:3:2"), "Mishneh Torah, Sabbath 1:3");
  assert.equal(commentaryBase("Rashi on Genesis 1:1:2"), null);
});

test("a line of Gemara opens Rashi and Tosafot, then the codes that rule on it, before an acharon's hundred comments", () => {
  const g = "Berakhot 2a:1";
  const reshimot = Array.from({ length: 30 }, (_, i) => `Reshimot Shiurim on Berakhot 2a:1:${i + 1}`);
  const order = orderLinked(
    pairs(g, [
      ...reshimot,
      "Rashi on Berakhot 2a:1:1",
      "Rashi on Berakhot 2a:1:2",
      "Tosafot on Berakhot 2a:1:1",
      "Mishneh Torah, Reading the Shema 1:9",
      "Shulchan Arukh, Orach Chayim 235:1",
      "Mishnah Berakhot 1:1",
      "Tosafot on Berakhot 40a:2",
      "Genesis 1:5",
    ]),
    [g],
    8,
  );
  assert.deepEqual(order.slice(0, 3), ["Rashi on Berakhot 2a:1:1", "Tosafot on Berakhot 2a:1:1", "Mishneh Torah, Reading the Shema 1:9"]);
  assert.ok(order.includes("Shulchan Arukh, Orach Chayim 235:1"));
  assert.ok(order.includes("Mishnah Berakhot 1:1"));
  assert.ok(order.filter((r) => r.startsWith("Reshimot")).length <= 2, "one book takes turns with the others");
  assert.ok(!isCommentaryOn(g, "Tosafot on Berakhot 40a:2"), "Tosafot on another daf is a cross-reference");
  assert.ok(!isCommentaryOn(g, "Mishneh Torah, Reading the Shema 1:9"), "a code that rules on the line is not a comment on it");
});

test("a verse opens Onkelos, Rashi, the Ramban, the Ibn Ezra and the Sforno; a commentary on a later verse is not on this one", () => {
  const v = "Genesis 1:1";
  const order = orderLinked(
    pairs(v, [
      "Or HaChaim on Genesis 1:27:3",
      "Or HaChaim on Genesis 18:1:2",
      "Kli Yakar on Genesis 1:1:1",
      "Sforno on Genesis 1:1:1",
      "Ibn Ezra on Genesis 1:1:1",
      "Ramban on Genesis 1:1:1",
      "Rashi on Genesis 1:1:1",
      "Onkelos Genesis 1:1",
      "Berakhot 2a:1",
    ]),
    [v],
    6,
  );
  assert.deepEqual(order, [
    "Onkelos Genesis 1:1",
    "Rashi on Genesis 1:1:1",
    "Ramban on Genesis 1:1:1",
    "Ibn Ezra on Genesis 1:1:1",
    "Sforno on Genesis 1:1:1",
    "Kli Yakar on Genesis 1:1:1",
  ]);
  assert.ok(!isCommentaryOn(v, "Or HaChaim on Genesis 18:1:2"), "Genesis 18 is not Genesis 1");
});

test("several anchors: each book is placed by its best link, and the anchors are never returned", () => {
  const order = orderLinked(
    [
      { anchor: OC, other: "Mishnah Berurah 671:4" },
      { anchor: "Shabbat 21b:5", other: "Rashi on Shabbat 21b:5:1" },
      { anchor: "Shabbat 21b:5", other: OC },
      { anchor: OC, other: "Shabbat 21b:5" },
    ],
    [OC, "Shabbat 21b:5"],
    10,
  );
  assert.deepEqual(order, ["Mishnah Berurah 671:4", "Rashi on Shabbat 21b:5:1"]);
});

test("refs, places and codes", () => {
  assert.deepEqual(splitRef("Mishnah Berurah 671:4"), { book: "Mishnah Berurah", place: "671:4" });
  assert.deepEqual(splitRef("Shabbat 21b:3"), { book: "Shabbat", place: "21b:3" });
  assert.deepEqual(splitRef("Jastrow, אֵל"), { book: "Jastrow, אֵל", place: "" });
  assert.ok(comparePlaces("671:4", "671:10") < 0);
  assert.ok(comparePlaces("21a:9", "21b:3") < 0);
  assert.ok(comparePlaces("1:1", "1:1:1") < 0);
  assert.equal(codeOf("Shulchan Arukh, Orach Chayim 671:2"), "oc");
  assert.equal(codeOf("Shulchan Arukh, Yoreh De'ah 87:1"), "yd");
  assert.equal(codeOf("Mishneh Torah, Sabbath 1:1"), "mt");
  assert.equal(codeOf("Mishnah Berurah 671:4"), null);
  assert.ok(isCommentaryOn(OC, "Mishnah Berurah 671:4"));
  assert.ok(!isCommentaryOn(OC, "Mishnah Berurah 1:1"), "the Mishnah Berurah on another siman is a cross-reference");
  assert.ok(isCommentaryOn(OC, "Ba'er Hetev on Shulchan Arukh, Orach Chayim 671:2"));
  assert.ok(!isCommentaryOn(OC, "Shabbat 21b:3"), "a source is not a commentary");
  assert.ok(isCommentaryOn("Shulchan Arukh, Yoreh De'ah 87:1", "Yad Avraham on Shulchan Arukh, Yoreh Deah 87:1"), "spelled without the apostrophe");
});
