# Our library compared with Mercava's catalog

*Prepared 2026-10-07 for the maintainer and the rabbinic board. Nothing in this document is
approved. It is a working comparison to help the board decide what to add.*

The maintainer asked three things about the book catalog of Mercava (themercava.com):

1. Do we have all of these in our library?
2. Do we have more than these?
3. Are these books good in terms of the Orthodox mesorah (the chain of Torah tradition) that
   RabAI follows?

This document answers the first two from our data, and gathers the third into questions for the
board. **The rabbinic board decides what is Torah content.** Everything below about a work's
author, its standing, or a translator's background is our best understanding, offered as a
suggestion for the board to confirm. Where we could not check something, we say so.

## How we checked

- **Mercava's list** was transcribed from the maintainer's screenshots of Mercava's catalog,
  shelf by shelf, using Mercava's names. Some shelves may be incomplete. For example, the
  Yerushalmi (Jerusalem Talmud) tab didn't show its contents, and the Tanach and Talmud
  pages probably show commentaries (such as Rashi and Tosafot) that aren't on the list.
- **Matching to Sefaria.** Each Mercava entry was matched by hand to the Sefaria title or
  titles it most likely means. One entry can be many Sefaria titles (for example, "Ibn Ezra"
  is 29 titles, one per book of Tanach).
- **"Ours"** has four values:
  - **In testing library**: the title is in our private testing library's plan
    (`library/plan.json`, built from `canon/canon.yaml` on 2026-10-07; it matches the hosted
    library rebuilt on 2026-10-06, run #2: 1,220 text titles plus 2 dictionaries).
  - **In canon only**: a work in `canon/canon.yaml` covers the title, but no file passed the
    checks (usually the license on Sefaria is unknown, or the canon doesn't list that version
    yet).
  - **Missing**: no work in our canon covers it.
  - **Not on Sefaria's export**: Sefaria's public export (dated 2026-10-01) has no such title,
    usually because the work is under copyright.
- **Licenses** were read from each Sefaria file's own header, the same way the library
  builder reads them. The Hebrew column lists only openly licensed versions (Public Domain,
  CC0, CC-BY, CC-BY-SA, CC-BY-NC, CC-BY-NC-SA). These allow private testing; public use of
  the "NC" (non-commercial) ones is a separate question in `docs/licensing.md`.
- **The English column** lists openly licensed English translations, and any non-Orthodox or
  machine translations worth flagging. Sefaria's anonymous "Community Translation" sits on
  nearly every title and is always barred by `canon/excluded.yaml`, so it is left out of the
  tables. "Used" means the testing library already uses that version.
- Statuses in our canon are only "draft" or "proposed". Nothing in the canon is approved yet.

## 1. Summary

### The numbers

We grouped Mercava's catalog into 291 entries (one row in the tables below each).

| | Main shelves (207 entries) | Commentary shelves (84 entries) | All (291) |
|---|---|---|---|
| Fully in our testing library | 42 | 7 | 49 |
| Partly in our testing library | 3 | 9 | 12 |
| In our canon only | 1 | 1 | 2 |
| Missing from our canon | 151 | 67 | 218 |
| Not on Sefaria's export | 10 | 0 | 10 |

Counted by Sefaria title instead, Mercava's entries cover **3,628 Sefaria titles**:

- **815 are in our testing library** (22%).
- **65 are in our canon but not yet in the library** (Radak on Nach, 9 books of Malbim,
  5 books of Ibn Ezra, Penei Yehoshua, 4 books of Midrash Rabbah, 3 works of Rav Kook, and a
  few single titles).
- **2,748 are missing.** 1,847 of these are commentaries on the Rambam's Mishneh Torah; set
  those aside and 901 titles are missing.

### What is solid

The core is there. We have every book of **Tanach**, the whole **Mishnah** (including Pirkei
Avot), the whole **Bavli** (Babylonian Talmud; plus Tamid, which Mercava's list leaves out),
the whole **Yerushalmi**, the **Mishneh Torah**, **Tur**, **Shulchan Arukh**, **Mishnah
Berurah**, **Aruch HaShulchan**, **Kitzur Shulchan Arukh**, **Shulchan Arukh HaRav**, the
**Rif**, **Rosh**, the Ramban, Rashba and Ritva on the Talmud, the **Maharsha** and
**Maharam**, **Tiferet Yisrael** (Yachin and Boaz), **Tosafot Yom Tov**, the Rambam's
commentary on the Mishnah, and core works of thought, mussar and Chasidut (Kuzari, Nefesh
HaChayim, Mesillat Yesharim, Sha'arei Teshuvah, Orchot Tzadikim, Tanya, Likutei Moharan, Shem
MiShmuel, the Maharal).

### The biggest gaps

1. **The Tosefta**: all 61 tractates missing. Hebrew is public domain for every tractate.
2. **Kabbalah**: none of Mercava's 16 Kabbalah entries is in our canon, and the founding spec
   has no rule yet on how RabAI treats Kabbalah (see the questions in section 3).
3. **The minor tractates** printed at the back of the Vilna Shas (Avot DeRabbi Natan,
   Soferim, Semachot, Kallah, Derekh Eretz and the rest), with their commentaries.
4. **The commentaries around the codes**: Taz, Shach, Magen Avraham, Be'er Heitev, Pitchei
   Teshuvah and the others on the Shulchan Arukh (we have 6 of 70 titles); Beit Yosef, Bach
   and the others on the Tur (0 of 5); Kesef Mishneh, Mishneh LaMelech and the others on the
   Mishneh Torah (0 of 1,847 titles).
5. **Responsa**: we have 2 of Mercava's 22 entries (missing the Noda BiYehudah, Rivash,
   Rashba, Radbaz, Maharik, Maharil, Tashbetz and more).
6. **Chasidut and mussar**: we have 3 of 24 Chasidut entries and 3 of 23 mussar entries
   (missing, for example, Bnei Yissaschar, Me'or Einayim, Rav Tzadok's works, Tomer Devorah,
   Kav HaYashar, Pele Yoetz, Ma'amar Torat HaBayit).
7. **Commentaries on the Talmud printed in the Vilna Shas** that we don't have yet:
   Rabbeinu Chananel, Shita Mekubetzet, Maharam Schiff, Chokhmat Shlomo, and the commentaries
   on the Rosh.
8. **Commentaries on Chumash and on Rashi**: Mizrachi, Siftei Chakhamim, Torah Temimah,
   Bekhor Shor, Tur HaArokh, Rabbeinu Chananel on the Torah, HaKtav VeHaKabalah, Aderet
   Eliyahu, Ralbag, and most of Radak.
9. **Liturgy beyond the siddur**: the Haggadah, Selichot, Kinnot and the Shabbat songs.

Almost all of these have Hebrew on Sefaria that is public domain or openly licensed. **English
is the bottleneck**: few of these works have an openly licensed English translation by a
translator our canon already treats as Orthodox.

### What we have that Mercava's list doesn't show

406 titles in our testing library aren't on Mercava's list as transcribed, plus two
dictionaries. The main ones: Rashi and Tosafot on the Talmud, Rabbi Akiva Eiger and the
Rashash on the Talmud, Bartenura on the Mishnah, Targum Onkelos and Targum Yonatan, Rashi on
all of Tanach, Ramban, Sforno, Or HaChaim, Kli Yakar and Ha'amek Davar on the Torah, the
Metzudot, the halachic midrashim (Mekhilta, Sifra, Sifrei), Chafetz Chaim and Shemirat
HaLashon, Chokhmat Adam, Ben Ish Hai, Kaf HaChayim, Peninei Halakhah, Duties of the Heart,
Derekh Hashem, the Guide for the Perplexed, Rav Hirsch on the Torah, Rabbi Sacks' Covenant and
Conversation, Sefat Emet, Kedushat Levi, Noam Elimelekh, and the dictionaries of Jastrow (for
word meanings only), Radak (Sefer HaShorashim), the Arukh and Menachem ibn Saruk. Section 4
lists them. Mercava probably shows some of these (Rashi and Tosafot, at least) beside its
texts even though the transcribed list doesn't name them.

### Are Mercava's books in keeping with the mesorah?

Our reading, for the board to confirm: **Mercava's list is overwhelmingly the classic
library of Orthodox Torah study**: Tanach, Mishnah, Talmud, Midrash, the codes and their
commentaries, responsa, and the classic works of mussar, Chasidut and Kabbalah. As far as we
can tell, no work on it comes from outside the Orthodox tradition. What needs the board's
attention is narrower:

- **Kabbalah as a whole**: whether RabAI quotes it, describes it, or refers people to a rav.
- **A few works and authors that later rabbis debated** (for example the Ralbag's
  philosophy, Rabbi Yaakov Emden's *Mitpachat Sefarim*, *Teshuvot Min HaShamayim*, the
  Radziner Rebbe's books on tekhelet) and **works whose author is uncertain** (*Sefer
  HaYashar*, *Tzava'at HaRivash*, *Sefer HaBahir*).
- **Scholars' editions** of some texts: on Sefaria, a few of Mercava's titles exist only in
  an academic edition (for example *Pesikta DeRav Kahana*, edited by Dov Mandelbaum and
  published by the Jewish Theological Seminary).
- **Translations, not texts.** The real risk is in the English. Sefaria offers, beside these
  texts, translations by Reform and Conservative rabbis, academics, probably a Christian
  missionary, and machines. Mercava may use different translations; we can't see which. Our canon only
  uses translations it lists by name, so none of these can enter by accident, but the board
  should rule on them (section 3).

### Easy fixes

About 40 more titles, and the Hebrew for 3 titles we now have only in English, are a
one-line canon change away: works already in our canon whose Sefaria versions aren't listed,
or whose title pattern misses Sefaria's spelling. Section 5 lists them first.

## 2. Shelf by shelf

One row per Mercava entry, in Mercava's order. Columns:

- **Sefaria title**: the title or titles we matched (exact Sefaria spelling, in `code`).
- **Ours**: in testing library, partly, in canon only, missing, or not on Sefaria's export
  (see "How we checked").
- **Hebrew on Sefaria**: for titles in our library, the version we use ("Used"); otherwise
  the openly licensed versions, and how many of the entry's titles each covers (for example
  "5/29").
- **English on Sefaria**: openly licensed English, plus flagged non-Orthodox or machine
  translations even when their license is unknown. "Barred" means `canon/excluded.yaml`
  already excludes it. Notes about a translator are for the board to confirm.
- **Note for the board**: what stands out. Notes about authors are our understanding, for the
  board to confirm.

### Tanach

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Torah (5 books) | `Genesis` to `Deuteronomy` (5 titles) | **In testing library** (5 titles) | Used: Miqra according to the Masorah (CC-BY-SA, 5/5) | Used: The Koren Jerusalem Bible (CC-BY-NC, 5/5); Metsudah Chumash, Metsudah Publications, 2009 (CC-BY, 5/5); The Rashi chumash by Rabbi Shraga Silverstein (CC-BY, 5/5) Also: Metsudah Chumash, Metsudah Publications, 2009 [with Onkelos translation] (CC-BY-NC, 5/5); THE JPS TANAKH: Gender-Sensitive Edition — barred (contemporary-torah); Tanakh: The Holy Scriptures, published by JPS — barred (njps-1985); +6 more | Same five books. JPS translations on Sefaria are barred. |
| Nevi'im (Prophets, 8 books) | 21 titles (Sefaria counts Samuel, Kings and each of the Twelve separately) | **In testing library** (21 titles) | Used: Miqra according to the Masorah (CC-BY-SA, 21/21) | Used: The Koren Jerusalem Bible (CC-BY-NC, 21/21); The Metsudah Tanach series, Lakewood, N.J (CC-BY, 4/21) Also: THE JPS TANAKH: Gender-Sensitive Edition — barred (contemporary-torah); Tanakh: The Holy Scriptures, published by JPS — barred (njps-1985); The Holy Scriptures: A New Translation (JPS 1917) — barred (jps-1917); +2 more | Mercava counts 8 books. |
| Ketuvim (Writings, 11 books) | 13 titles (Sefaria splits Ezra–Nehemiah and Chronicles) | **In testing library** (13 titles) | Used: Miqra according to the Masorah (CC-BY-SA, 13/13) | Used: The Koren Jerusalem Bible (CC-BY-NC, 13/13); The Rashi Ketuvim by Rabbi Shraga Silverstein (CC-BY, 13/13); The Metsudah Five Megillot, Lakewood, N.J., 2001 (CC-BY, 5/13) Also: THE JPS TANAKH: Gender-Sensitive Edition — barred (contemporary-torah); Tanakh: The Holy Scriptures, published by JPS — barred (njps-1985); The Holy Scriptures: A New Translation (JPS 1917) — barred (jps-1917); +8 more | Mercava counts 11 books. |

### Mishnah

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Seder Zeraim | 11 titles, e.g. `Mishnah Berakhot`, `Mishnah Peah` | **In testing library** (11 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 11/11); Torat Emet 357 (Public Domain, 11/11) | Used: William Davidson Edition - English (CC-BY-NC, 1/11); The Mishna with Obadiah Bartenura by Rabbi Shraga Silverstein (CC-BY, 1/11) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Open Mishnah (CC-BY-SA, 3/11); Eighteen Treatises from the Mishna (Public Domain, 2/11); +3 more | Our English covers only 1 of 11 Zeraim tractates. A public-domain English, *Eighteen Treatises from the Mishna* (Sola and Raphall, 1843), covers a few tractates; whether its translators suit us is a question for the board. |
| Seder Moed | 12 titles, e.g. `Mishnah Shabbat`, `Mishnah Eruvin` | **In testing library** (12 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 12/12); Torat Emet 357 (Public Domain, 12/12) | Used: William Davidson Edition - English (CC-BY-NC, 12/12); The Mishna with Obadiah Bartenura by Rabbi Shraga Silverstein (CC-BY, 12/12) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Eighteen Treatises from the Mishna (Public Domain, 8/12); Open Mishnah (CC-BY-SA, 8/12); +2 more |  |
| Seder Nashim | 7 titles, e.g. `Mishnah Yevamot`, `Mishnah Ketubot` | **In testing library** (7 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 7/7); Torat Emet 357 (Public Domain, 7/7) | Used: William Davidson Edition - English (CC-BY-NC, 7/7); The Mishna with Obadiah Bartenura by Rabbi Shraga Silverstein (CC-BY, 6/7) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Eighteen Treatises from the Mishnah (Public Domain, 2/7); Eighteen Treatises from the Mishna, by D. A. Sola and M. J. Raphall, [1843], at sacred-texts.com (Public Domain, 1/7); +1 more |  |
| Seder Nezikin | 9 titles, e.g. `Mishnah Bava Kamma`, `Mishnah Bava Metzia` | **In testing library** (9 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 9/9); Torat Emet 357 (Public Domain, 9/9) | Used: The Mishna with Obadiah Bartenura by Rabbi Shraga Silverstein (CC-BY, 9/9); William Davidson Edition - English (CC-BY-NC, 8/9) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Open Mishnah (CC-BY-SA, 6/9) |  |
| Seder Kodashim | 11 titles, e.g. `Mishnah Zevachim`, `Mishnah Menachot` | **In testing library** (11 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 11/11); Torat Emet 357 (Public Domain, 11/11) | Used: William Davidson Edition - English (CC-BY-NC, 9/11) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Open Mishnah (CC-BY-SA, 3/11); Eighteen Treatises from the Mishna (Public Domain, 1/11) | Our English covers 9 of 11 tractates. |
| Seder Tahorot | 12 titles, e.g. `Mishnah Kelim`, `Mishnah Oholot` | **In testing library** (12 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 12/12); Torat Emet 357 (Public Domain, 12/12) | Used: William Davidson Edition - English (CC-BY-NC, 1/12) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Open Mishnah (CC-BY-SA, 2/12); Eighteen Treatises from the Mishna (Public Domain, 1/12) | Our English covers only 1 of 12 Tahorot tractates. |
| Pirkei Avot | `Pirkei Avot` | **In testing library** | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain); Torat Emet 357 (Public Domain) | Used: The Mishna with Obadiah Bartenura by Rabbi Shraga Silverstein (CC-BY) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Open Mishnah (CC-BY-SA); The Saying of the Jewish Fathers: Gorfinkle 1913 (Public Domain) | In the plan and the hosted library since the 2026-10-06 rebuild. The older local copy of the library in this sandbox doesn't have it yet. Other English: Gorfinkle 1913 (Public Domain), translator's background for the board. |

### Talmud

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Bavli: Berakhot | `Berakhot` | **In testing library** | Used: William Davidson Edition - Aramaic (CC-BY-NC); Wikisource Talmud Bavli (CC-BY-SA) | Used: William Davidson Edition - English (CC-BY-NC) Also: Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY); Tractate Berakot by A. Cohen, Cambridge University Press, 1921 (Public Domain) | Also on Sefaria: A. Cohen's Berakhot (Cambridge 1921, Public Domain). |
| Bavli: Seder Moed (11 tractates) | 11 titles, e.g. `Shabbat`, `Eruvin` | **In testing library** (11 titles) | Used: William Davidson Edition - Aramaic (CC-BY-NC, 11/11); Wikisource Talmud Bavli (CC-BY-SA, 11/11) | Used: William Davidson Edition - English (CC-BY-NC, 11/11) Also: Rabbi Mike Feuer, Jerusalem Anthology (CC-BY, 8/11); Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); Daf Shevui — barred (conservative-yeshiva-translations); +5 more |  |
| Bavli: Shekalim | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Sefaria has no Bavli Shekalim; the Vilna Shas prints the Yerushalmi's Shekalim. See the Yerushalmi row. |
| Bavli: Seder Nashim (7) | 7 titles, e.g. `Yevamot`, `Ketubot` | **In testing library** (7 titles) | Used: William Davidson Edition - Aramaic (CC-BY-NC, 7/7); Wikisource Talmud Bavli (CC-BY-SA, 7/7) | Used: William Davidson Edition - English (CC-BY-NC, 7/7) Also: Wikisource Talmud (CC-BY-SA, 3/7); Daf Shevui — barred (conservative-yeshiva-translations); Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); +3 more |  |
| Bavli: Seder Nezikin (8) | 8 titles, e.g. `Bava Kamma`, `Bava Metzia` | **In testing library** (8 titles) | Used: William Davidson Edition - Aramaic (CC-BY-NC, 8/8); Wikisource Talmud Bavli (CC-BY-SA, 8/8) | Used: William Davidson Edition - English (CC-BY-NC, 8/8) Also: Wikisource Talmud (CC-BY-SA, 3/8); Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); Daf Shevui — barred (conservative-yeshiva-translations); +1 more |  |
| Bavli: Seder Kodashim (8, without Tamid) | 8 titles, e.g. `Zevachim`, `Menachot` | **In testing library** (8 titles) | Used: William Davidson Edition - Aramaic (CC-BY-NC, 8/8); Wikisource Talmud Bavli (CC-BY-SA, 8/8) | Used: William Davidson Edition - English (CC-BY-NC, 8/8) Also: Wikisource Talmud (CC-BY-SA, 5/8); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY, 4/8); Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology) | Mercava's list leaves out Tamid; we have it (37 tractates). |
| Bavli: Niddah | `Niddah` | **In testing library** | Used: William Davidson Edition - Aramaic (CC-BY-NC); Wikisource Talmud Bavli (CC-BY-SA) | Used: William Davidson Edition - English (CC-BY-NC) Also: Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) |  |
| Yerushalmi (tab; contents not shown) | 39 titles, e.g. `Jerusalem Talmud Berakhot`, `Jerusalem Talmud Peah` | **In testing library** (39 titles) | Used: Venice Edition (Public Domain (printed 1523), 39/39) | Not used: Guggenheimer's translation (CC-BY, 39/39), held in the canon as 'review'. Barred: Sefaria community translation; Schwab's French via DeepL (machine) | We use only the Venice 1523 printing. Guggenheimer's Hebrew text and English (CC-BY) are in the canon marked 'review' and wait for the board. |

### Halacha

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Mishneh Torah | 88 titles, e.g. `Mishneh Torah, Transmission of the Oral Law`, `Mishneh Torah, Positive Mitzvot` | **In testing library** (88 titles) | Used: Wikisource Mishneh Torah (CC-BY-SA, 88/88); Torat Emet 363 (Public Domain, 77/88); Torat Emet 370 (Public Domain, 2/88) | Used: Mishneh Torah, trans. by Eliyahu Touger. Jerusalem, Moznaim Pub. c1986-c2007 (CC-BY-NC, 86/88) Also: The Mishneh Torah by Maimonides. trans. by Moses Hyamson, 1937-1949 (Public Domain, 15/88); Sefaria Edition. Translated by R. Francis Nataf, 2019 (CC-BY, 10/88); Mishnah Torah, Yod ha-hazakah, trans. by Simon Glazer, 1927 (Public Domain, 8/88); +8 more | Other English on Sefaria: Hyamson 1937–49 (Public Domain, 15 of 88 sections), Nataf (CC-BY, 10), Glazer 1927 (Public Domain, 8). Possible alternates for the board. |
| Sefer Mitzvot Gadol | `Sefer Mitzvot Gadol` | **Missing** | Munkatch, 1901 (Public Domain) | No openly licensed English | Rabbi Moshe of Coucy, 13th century (the Semag). |
| Tur | `Tur` | **In testing library** | Used: Orach Chaim, Vilna, 1923 (Public Domain); Yoreh Deah, Vilna, 1923 (Public Domain); Even HaEzer, Vilna, 1923 (Public Domain); +3 more versions | No openly licensed English |  |
| Shulchan Arukh | 4 titles, e.g. `Shulchan Arukh, Orach Chayim`, `Shulchan Arukh, Yoreh De'ah` | **In testing library** (4 titles) | Used: Torat Emet Freeware Shulchan Aruch (Public Domain, 3/4); Torat Emet 357 (Public Domain, 2/4); Torat Emet 363 (Public Domain, 1/4); +4 more versions | Wikisource Shulchan Aruch (CC-BY-SA, 4/4); Code of Hebrew Law by Chaim N. Denburg, Montreal, 1955 (CC-BY, 2/4); Hilchot Kidushin, trans. by Steven H. Garten. HUC, 1975 (CC-BY, 1/4) — a Hebrew Union College (Reform) translation; excluded.yaml's 'reform-seminary-translations' covers it in spirit but doesn't list it by name; +9 more | Some English on Sefaria comes from Hebrew Union College (Reform). One is barred; Garten's *Hilchot Kidushin* is not barred by name. Denburg's 1955 translation (CC-BY): translator's background for the board. |
| Mishnah Berurah | `Mishnah Berurah` | **In testing library** | Used: On Your Way (Public Domain) | No openly licensed English |  |
| Kitzur Shulchan Aruch Yalkut Yosef | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria (copyrighted). The canon lists Yalkut Yosef as proposed, license 'needs agreement' with the publisher. |
| Issur veHeter leRashi | `Issur VeHeter LeRashi` | **Missing** | Isur ve-heter le-Rashi, Berlin 1936 (Public Domain) | No openly licensed English | Attributed to Rashi. Sefaria marks the Berlin 1936 printing Public Domain, but it is under 95 years old; the maintainer may want to check that. |
| Iggeret Hashabbat | `The Sabbath Epistle` | **Missing** | Iggeret haShabbat, KTAV Publishing House, 2009 (CC-BY) | The Sabbath epistle of Ibn Ezra, KTAV Publishing House, 2009 (CC-BY) | Ibn Ezra's letter defending that Shabbat begins at nightfall. Hebrew and English are a 2009 KTAV edition (CC-BY); the translator isn't named in the file. |
| Sefer Hasidim | `Sefer Chasidim` | **Missing** | Sefer Chassidim, Zhitomir, 1857 (Public Domain) | Medieval Jewish mysticism, translated by Sholom Alchanan Singer. Northbrook, Ill. Whitehall Co., 1971 (CC-BY) | Rabbi Yehudah HeChasid. Singer's 1971 English (CC-BY): translator's background for the board. |
| Issur V'Heter L'Rabbeinu Yerucham | `Issur V'Heter L'Rabbeinu Yerucham` | **Missing** | Wikitext -- Issur V'Heter L'Rabbeinu Yerucham (CC-BY-SA) | No openly licensed English |  |
| Sefer HaChinuch | `Sefer HaChinukh` | **In testing library** — English only | Not used. Available: Minchat Chinuch, Vilna, 1923. (Public Domain) | Used: Sefer HaChinukh, translated by R. Francis Nataf, Sefaria 2018 (CC0) | Easy fix: in the library only in English (Nataf). The canon's Hebrew edition lists no Sefaria version; 'Minchat Chinuch, Vilna, 1923.' (Public Domain) could be added. |
| Piskei Challah | `Piskei Challah` | **Missing** | Gerlitz edition, published by Oraita (CC0) | No openly licensed English | Sefaria attributes it to the Rashba. Modern Oraita edition, released CC0. |
| Sefer HaParnas | `Sefer HaParnas` | **Missing** | Sefer ha-Parnas, Vilna, 1891 (Public Domain) | No openly licensed English | Traditions and rulings of the Maharam of Rothenburg, collected by a student. |
| Shulchan Shel Arba | `Shulchan Shel Arba` | **Missing** | Shulchan Shel Arba, Warsaw 1878 (Public Domain) | Shulhan Shel Arba, translated by Jonathan Brumberg-Kraus, 2010 (CC-BY) — academic translation (board to check) | Rabbeinu Bachya on conduct at meals. The only English is an academic translation (Brumberg-Kraus, 2010) (board to confirm). |
| Kol Bo | `Kol Bo` | **Missing** | Kol Bo 1547 Venice Unknown Publisher (Public Domain) | No openly licensed English |  |
| Hilchos Talmud Torah | `Hilkhot Talmud Torah` | **Missing** | Wikisource (with changes) (CC-BY-SA); Wikisource (CC-BY-SA) | No openly licensed English | Rabbi Shneur Zalman of Liadi. |
| Shulchan Aruch HaRav | `Shulchan Arukh HaRav`, `Kuntres Acharon on Shulchan Arukh HaRav` | **In testing library** (2 titles) | Used: Kehot Publication Society (CC-BY-NC, 2/2); Vocalized Edition - Kehot Publication Society (CC-BY-NC, 1/2) | No openly licensed English |  |
| Mateh Efrayim | `Mateh Efrayim` | **Missing** | Mateh Efrayim, Warsaw, 1906 (Public Domain) | No openly licensed English |  |
| Simla Chadasha | `Simlah Chadashah` | **Missing** | Warsaw, 1891 (Public Domain) | No openly licensed English |  |
| Maaseh Rav | `Maaseh Rav` | **Missing** | From Wikitext (CC-BY-SA); Wikisource (CC-BY-SA) | No openly licensed English | The Vilna Gaon's personal practices, recorded by a student. |
| Keset HaSofer | `Keset HaSofer` | **Missing** | Keset Hasofer, Ungvar 1871 (Public Domain) | No openly licensed English | Rabbi Shlomo Ganzfried, on the laws of writing a Sefer Torah. The English on Sefaria (Jen Taylor Friedman) has no license stated; translator's background for the board. |
| Kitzur Shulchan Aruch | `Kitzur Shulchan Arukh` | **In testing library** | Used: Torat Emet 357 (Public Domain); On Your Way (Public Domain) | Used: Kitzur Shulchan Aruch, trans. Rabbi Avrohom Davis, Metsudah Pub., 1996 (CC-BY) |  |
| Gevurat Anashim | `Gevurat Anashim` | **Missing** | Gevurat Anashim, Warsaw, 1879 (Public Domain) | No openly licensed English | Sefaria attributes it to the Shach. A narrow case about divorce; mostly of interest to specialists. |
| Ein HaTechelet | `Ein HaTekhelet` | **Missing** | None with an open license (e.g. Ein HaTekhelet, B'nei Brak, 1999, license unknown) | No openly licensed English | The Radziner Rebbe's tekhelet, which many authorities did not accept. An 'edges' question for the board (open question 3). Hebrew license unknown (1999 printing). |
| Ptil Techelet | `Ptil Tekhelet` | **Missing** | None with an open license (e.g. Ptil Tekhelet, B'nei Brak, 1999, license unknown) | No openly licensed English | Same as Ein HaTekhelet. |
| Aruch HaShulchan | `Arukh HaShulchan` | **In testing library** | Used: Aruch HaShulchan, Vilna 1923-29 (Public Domain); Aruch HaShulchan, Choshen Mishpat. Vilna 1923-29 (Public Domain); Arukh HaShulchan, Orach Chayim -- Wikisource (CC-BY-SA); +1 more versions | Hupah veKiddushin, trans. by Norman T. Roman. HUC, 1975 (CC-BY) — a Hebrew Union College (Reform) translation; excluded.yaml's 'reform-seminary-translations' covers it in spirit but doesn't list it by name; Wikisource (CC-BY-SA) | English on Sefaria includes a Hebrew Union College (Reform) translation of one section, not barred by name. |
| Sefer HaMitzvot HaKatzar | `Sefer HaMitzvot HaKatzar` | **Missing** | None with an open license (e.g. Sefer HaMitzvot HaKatzar, Sefad 2004, license unknown) | No openly licensed English | The Chafetz Chaim, 20th century. Hebrew (2004) and Wengrov's English: license unknown, so permission needed. |
| Otzar Dinim La'Isha Ule'Bat | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria. A modern Sephardi work for women (by Rabbi Yitzchak Yosef, as far as we know (board to confirm)); would need permission from the publisher. |

### Midrash

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Midrash Rabbah | 10 titles, e.g. `Bereshit Rabbah`, `Shemot Rabbah` | **Partly**: 6 of 10 in testing library; 4 in canon only (Vayikra Rabbah, Bamidbar Rabbah, Devarim Rabbah, Esther Rabbah) | Used: Daat Bereshit Rabbah, Wikisource Bereshit Rabbah, Daat Shemot Rabbah, Midrash Rabbah -- TE (Public Domain) for 6 books. For Vayikra, Bamidbar, Devarim and Esther Rabbah the only Hebrew file is Midrash Rabbah -- TE with license *unknown* | The Sefaria Midrash Rabbah, 2022 (CC-BY, 10/10); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY, 9/10); Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); +3 more | Ruth, Shir HaShirim, Kohelet, Eikhah, Bereshit and Shemot Rabbah are in. The other 4 wait on a license: their only Hebrew file is marked unknown. If the board accepts that file is a copy of the old printed Vilna Midrash Rabbah, the canon's age rule (`printed:`) could bring them in. English: 'The Sefaria Midrash Rabbah, 2022' names no translator and is held as 'review'. |
| Midrash Mishlei | `Midrash Mishlei` | **Missing** | None with an open license (e.g. bar ilan responsa project, license unknown) | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) | Sefaria's text comes from the Bar-Ilan Responsa Project (license unknown). Buber's 1893 edition is old enough for the age rule if a public-domain copy is found. |
| Midrash Tanchuma | `Midrash Tanchuma` | **In testing library** | Used: Midrash Tanchuma -- Torat Emet (Public Domain) | Midrash Tanhuma-Yelammedenu, trans. Samuel A. Berman (CC-BY); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY); Townsend 1989 translation of Midrash Tanhuma, S. Buber Recension, edited and supplemented by R. Francis Nataf — barred (academic-translations-of-midrash-and-targum) | English on Sefaria: Berman (CC-BY), translator's background for the board; Townsend is barred. |
| Midrash Tanchuma (Buber Edition) | `Midrash Tanchuma Buber` | **In testing library** | Used: Midrash Tanhuma haKadum veHaYashan, S. Buber, 1885 (Public Domain) | Midrash Tanhuma, S. Buber Recension; trans. by John T. Townsend, 1989. — barred (academic-translations-of-midrash-and-targum) |  |
| Tanna DeVei Eliyahu Rabbah | `Tanna DeBei Eliyahu Rabbah` | **Missing** | OYW (segmentation according to Warsaw 1880) (Public Domain) | No openly licensed English | Hebrew Public Domain (OYW, after Warsaw 1880). Tanna DeBei Eliyahu Zuta is on Sefaria too. |
| Yalkut Shimoni on Torah | `Yalkut Shimoni on Torah` | **Missing** | Torat Emet (CC-BY-NC) | Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) | Hebrew CC-BY-NC (Torat Emet), fine for private testing. |
| Yalkut Shimoni on Nach | `Yalkut Shimoni on Nach` | **Missing** | None with an open license (e.g. Yalkut Shimoni on Nach, license unknown) | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) | Hebrew license unknown. |
| Derech Eretz Zuta | `Tractate Derekh Eretz Zuta` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) | Same text as the minor tractate below; one entry covers both. |
| Ein Yaakov | `Ein Yaakov` | **In testing library** | Used: Daat (Public Domain) | S.H. Glick. En Jacob: Agada of the Babylonian Talmud. New York, 1916-1921 (Public Domain) |  |
| Ein Yaakov (Glick Edition) | `Ein Yaakov (Glick Edition)` | **Missing** | En Jacob, translated by SH Glick, 1916 (Public Domain) | En Jacob, translated by SH Glick, 1916 (Public Domain) | A separate Sefaria title holding Glick's edition with its notes. We have Ein Yaakov (Daat Hebrew, Glick English). |
| Midrash Lekach Tov | 6 titles, e.g. `Midrash Lekach Tov`, `Midrash Lekach Tov on Ecclesiastes` | **Missing** | Open Hebrew for 6 of 6 titles. Most common: Midrash Lekach Tov on Torah, Vilna 1884 (Public Domain, 1/6); Tobia ben Elieser's Commentar zu Koheleth, Berlin 1904 (Public Domain, 1/6) | Google Translate (license unknown) — machine translation; excluded.yaml's 'machine-translations' covers it in spirit but doesn't list it by name | Rabbi Tuviah ben Eliezer, 11th–12th century. Editions by Buber and others, all Public Domain. English on Sefaria is Google Translate. |
| Midrash Tehillim | `Midrash Tehillim` | **Missing** | OYW (Public Domain) | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) |  |
| Pesikta D'Rav Kahanna | `Pesikta DeRav Kahana` | **Missing** | Pesikta de Rav Kahana according to an Oxford manuscript, Dov Mandelbaum ed., N.Y. 1987 (CC-BY) | Google Translate (license unknown) — machine translation; excluded.yaml's 'machine-translations' covers it in spirit but doesn't list it by name; Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) | Sefaria has only Mandelbaum's critical edition (Jewish Theological Seminary, 1962/1987, CC-BY). A question for the board, like the excluded Finkelstein Sifre: an academic edition of a Torah text. |
| Pesikta Rabbati | `Pesikta Rabbati` | **Missing** | OYW (Public Domain) | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) |  |
| Seder Olam Rabbah | `Seder Olam Rabbah` | **Missing** | Seder Olam, Warsaw 1904 (Public Domain) | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) |  |
| Mechilta DeRabbi Shimon Bar Yochai (halachic midrash) | `Mekhilta DeRabbi Shimon Ben Yochai` | **In testing library** | Used: Mechilta de-Rabbi Simon b. Jochai, Dr. D. Hoffman, Frankfurt 1905 (Public Domain) | Lauterbach (license unknown) — academic translation (board to check); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) | Rav David Tzvi Hoffmann's 1905 edition. English on Sefaria: only Lauterbach (academic, license unknown). We also have Mekhilta DeRabbi Yishmael, Sifra and Sifrei, which Mercava's list doesn't show. |

### Tosefta

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Seder Zeraim (11) | 11 titles, e.g. `Tosefta Berakhot`, `Tosefta Peah` | **Missing** | Open Hebrew for every tractate (11 of 11): one Mechon Mamre file per tractate, each with its own version name (for example `Tosefta B'rachot`, `Tosefta Yevamot -- Machon Mamre`), all Public Domain | No full English. Only a few passages (Rabbi Mike Feuer's Jerusalem Anthology, CC-BY) and barred or machine translations. Hebrew only for now | The whole Tosefta (61 tractates in the Vilna Shas arrangement) is missing from our canon. Sefaria also has Lieberman's edition and *Tosefta Kifshutah* (Jewish Theological Seminary); Mercava doesn't list those. |
| Seder Moed (12) | 12 titles, e.g. `Tosefta Shabbat`, `Tosefta Eruvin` | **Missing** | Open Hebrew for every tractate (12 of 12): one Mechon Mamre file per tractate, each with its own version name (for example `Tosefta B'rachot`, `Tosefta Yevamot -- Machon Mamre`), all Public Domain | No full English. Only a few passages (Rabbi Mike Feuer's Jerusalem Anthology, CC-BY) and barred or machine translations. Hebrew only for now |  |
| Seder Nashim (7) | 7 titles, e.g. `Tosefta Yevamot`, `Tosefta Ketubot` | **Missing** | Open Hebrew for every tractate (7 of 7): one Mechon Mamre file per tractate, each with its own version name (for example `Tosefta B'rachot`, `Tosefta Yevamot -- Machon Mamre`), all Public Domain | No full English. Only a few passages (Rabbi Mike Feuer's Jerusalem Anthology, CC-BY) and barred or machine translations. Hebrew only for now |  |
| Seder Nezikin (9) | 9 titles, e.g. `Tosefta Bava Kamma`, `Tosefta Bava Metzia` | **Missing** | Open Hebrew for every tractate (9 of 9): one Mechon Mamre file per tractate, each with its own version name (for example `Tosefta B'rachot`, `Tosefta Yevamot -- Machon Mamre`), all Public Domain | No full English. Only a few passages (Rabbi Mike Feuer's Jerusalem Anthology, CC-BY) and barred or machine translations. Hebrew only for now |  |
| Seder Kodashim (7, Mercava lists Keritot under Taharot) | 7 titles, e.g. `Tosefta Zevachim`, `Tosefta Chullin` | **Missing** | Open Hebrew for every tractate (7 of 7): one Mechon Mamre file per tractate, each with its own version name (for example `Tosefta B'rachot`, `Tosefta Yevamot -- Machon Mamre`), all Public Domain | No full English. Only a few passages (Rabbi Mike Feuer's Jerusalem Anthology, CC-BY) and barred or machine translations. Hebrew only for now | Mercava lists Keritot under Taharot. |
| Seder Taharot (15, with Keritot) | 15 titles, e.g. `Tosefta Keritot`, `Tosefta Kelim Kamma` | **Missing** | Open Hebrew for every tractate (15 of 15): one Mechon Mamre file per tractate, each with its own version name (for example `Tosefta B'rachot`, `Tosefta Yevamot -- Machon Mamre`), all Public Domain | No full English. Only a few passages (Rabbi Mike Feuer's Jerusalem Anthology, CC-BY) and barred or machine translations. Hebrew only for now |  |

### Kabbalah

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Sefer Yetzirah | `Sefer Yetzirah` | **Missing** | Sefer Yetzirah, Warsaw 1884 (Public Domain) | Sefer Yezirah, trans. by Isidor Kalisch. New York, 1877 (Public Domain) — Isidor Kalisch was a Reform rabbi; not listed in excluded.yaml | All of Mercava's Kabbalah shelf is missing from our canon. The founding spec has no rule yet on Kabbalah; see the questions below. The English on Sefaria (Kalisch, 1877) is by a Reform rabbi (board to confirm). |
| Sefer HaBahir | `Sefer HaBahir` | **Missing** | Torat Emet Sefer HaBahir (Public Domain); Wikisource Sefer HaBahir (CC-BY-SA) | Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology) | Attributed to Rabbi Nechunya ben HaKanah; historians dispute the attribution (board to confirm). |
| Tikkunei Zohar | `Tikkunei Zohar` | **Missing** | Constantinople, 1740 (CC-BY-NC); Tikkunei Zohar - Vocalized (Public Domain) | Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); Tiqqunei ha-Zohar, trans. by David Solomon. Margalya Press; Melbourne, 2024 (CC-BY-NC) | Hebrew: Constantinople 1740 (CC-BY-NC) or a vocalized text (Public Domain). English: David Solomon 2024 (CC-BY-NC), translator's background unknown. |
| Hechalot Rabbati | `Heikhalot Rabbati` | **Missing** | None with an open license (e.g. Wertheimer edition, license unknown) | Google translate (license unknown) — machine translation; excluded.yaml's 'machine-translations' covers it in spirit but doesn't list it by name; THE GREATER TREATISE CONCERNING THE PALACES OF HEAVEN, translated from the Hebrew and Aramaic by Morton Smith, corrected by Gershom Scholem, transcribed and edited with notes by Don Karr (license unknown) — academic translation (board to check) | Early mystical text. The only English is academic (Morton Smith, corrected by Gershom Scholem). |
| Be'ur Eser Sefirot | `Beur Eser Sefirot` | **Missing** | Be'ur Eser S'firot - grimoar (Public Domain) | No openly licensed English | Rabbi Azriel of Gerona, 13th century. |
| Avodat HaKodesh (Gabbai) | `Avodat HaKodesh (Ibn Gabbai)` | **Missing** | None with an open license (e.g. Avodat HaKodesh, license unknown) | No openly licensed English | Rabbi Meir ibn Gabbai, 16th century. |
| Shaarei Orah | `Sha'arei Orah` | **Missing** | Shaarei Orah, grimoar (Public Domain) | Gates of Light, trans. by Rabbi Amiram Markel and Rabbi Yehudah S. Markel, 2023 (CC-BY) | Rabbi Yosef Gikatilla. English by Rabbis Amiram and Yehudah Markel, 2023 (CC-BY). |
| Shaarei Tzedek | `Sha'arei Tzedek` | **Missing** | None with an open license (e.g. Shaarei Tzedek, license unknown) | No openly licensed English | Sefaria attributes it to Gikatilla. |
| Maggid Meisharim | `Maggid Meisharim` | **Missing** | Maggid Meisharim - Torat Emet (Public Domain) | No openly licensed English | Rabbi Yosef Karo's mystical diary. |
| Asara Perakim | `Asarah Perakim LeRamchal` | **Missing** | Assarah Perakim -- Torat Emet (Public Domain) | No openly licensed English | The Ramchal's summary of the Arizal's Etz Chaim. |
| Hakdamah LaZohar | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria's export. We can't tell which introduction Mercava means (the Zohar's own opening, or Rabbi Yehuda Ashlag's introduction?). |
| Ma'arechet HaElokut | `Ma'arekhet HaElokut` | **Missing** | None with an open license (e.g. Sefer Maarechet ha-Elohut, license unknown) | No openly licensed English |  |
| Megaleh Amukot | `Megalleh Amukkot on Parashat VaEtchanan`, `Megalleh Amukkot on Torah` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Megaleh Amukot, based on Krakow, 1637 edition (Public Domain, 1/2); Lublin, 1884 (Public Domain, 1/2) | No openly licensed English | Rabbi Natan Nata Shapira, 17th century. |
| Mitpachat Sefarim | `Mitpachat Sefarim` | **Missing** | מטפחת ספרים (CC-BY-SA) | No openly licensed English | Rabbi Yaakov Emden's polemic against the Sabbateans, which disputes the antiquity of parts of the Zohar. Hebrew CC-BY-SA. A sensitive work; the board decides how it may be used. |
| Sefer Yetzirah (Gra Version) | `Sefer Yetzirah Gra Version` | **Missing** | Sefer Yetzirah, Warsaw 1884 (Public Domain) | Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology); Sefer Yezirah, trans. by Isidor Kalisch. New York, 1877 (Public Domain) — Isidor Kalisch was a Reform rabbi; not listed in excluded.yaml | The Vilna Gaon's edition of the text. |
| Sha'ar HaGilgulim | `Sha'ar HaGilgulim` | **Missing** | Shaar HaGilgulim (Public Domain) | No openly licensed English | Rabbi Chaim Vital, from the Arizal's teaching, on reincarnation. |

### Prayer

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Siddur Ashkenaz | `Siddur Ashkenaz` | **In testing library** | Used: The Metsudah siddur, 1981 (CC-BY); The Metsudah siddur: a new linear siddur with English translation by Avrohom Davis, 1981 (CC-BY) | Used: Translation based on the Metsudah linear siddur, by Avrohom Davis, 1981 (CC-BY) Also: Mishnah Yomit by Dr. Joshua Kulp — barred (mishnah-yomit-kulp); Siddur Sim Shalom (license unknown) — the Conservative movement's siddur; not listed in excluded.yaml; The Standard Prayer Book, tr. by Simeon Singer, [1915] (Public Domain) | Other English on Sefaria: Singer's *Standard Prayer Book* (1915, Public Domain), used in Orthodox shuls in Britain (board to confirm). *Siddur Sim Shalom* (Conservative) is there too and is not in excluded.yaml. |
| Siddur Edot HaMizrach | `Siddur Edot HaMizrach` | **In canon only** | Torat Emet 357 (Public Domain) | Tanakh: The Holy Scriptures, published by JPS — barred (njps-1985) | Easy fix: the canon matches this title but lists no version for it. 'Torat Emet 357' (Public Domain) is available. |
| Siddur Sefard | `Siddur Sefard` | **In testing library** | Used: The Metsudah siddur, 1981 (CC-BY) | Used: Translation based on the Metsudah linear siddur, by Avrohom Davis, 1981 (CC-BY) |  |
| Siddur Tehilat Hashem | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria's export. The Chabad siddur (Kehot); would need permission. |
| Pesach Haggadah (Ashkenaz) | `Pesach Haggadah` | **Missing** | Pesach Haggadah (Public Domain) | A. Alexander 1787 (Public Domain); Chicago, 1879 (Public Domain); D. Levi, New York, 1837 (Public Domain); +6 more | Hebrew Public Domain. Several 18th–19th-century English translations are Public Domain; Koren 2013 is CC-BY-NC. The translators' backgrounds are for the board. |
| Pesach Haggadah (Aleppo) | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria's export. |
| Pesach Haggadah (Edot HaMizrach) | `Pesach Haggadah Edot Hamizrah` | **Missing** | None with an open license (e.g. Haggadah Shaliehsaboo Edition, license unknown) | No openly licensed English | Hebrew license unknown. |
| Shir HaKavod | `Shir HaKavod` | **Missing** | None with an open license (e.g. Davkawriter, license unknown) | No openly licensed English | Anim Zemirot, attributed to Rabbi Yehudah HeChasid. Hebrew license unknown. |
| Yedid Nefesh | `Yedid Nefesh` | **Missing** | Original version with nikkud (CC-BY-SA) | No openly licensed English | Attributed to Rabbi Elazar Azikri. |
| Shalom Alechem | `Shalom Aleichem` | **Missing** | Shalom Alechem (CC-BY-SA) | No openly licensed English |  |
| Linear Selichot Nusach Lita | `Selichot Nusach Lita Linear` | **Missing** | The Metsudah Selichos: Hebrew text, Metsudah Publications, 1986 (CC-BY) | The Metsudah Selichos: translated and annotated by Rabbi Avrohom Davis, Metsudah Publications, 1986 (CC-BY) | Metsudah, 1986 (CC-BY): Hebrew and English together. |
| Selichot Edot HaMizrach | `Selichot Edot HaMizrach` | **Missing** | Selichot Edot HaMizrach - Torat Emet (Public Domain) | Sefaria Edition 2020, Translated by Rabbi Francis Nataf (CC0) | English by Rabbi Francis Nataf (CC0). |
| Selichot Nusach Ashkenaz Lita | `Selichot Nusach Ashkenaz Lita` | **Missing** | Nusach Chabad -- Based on text from Wikisource (CC-BY-SA); Selichot Nusach Lita -- Wikisource (CC-BY-SA) | The Metsudah Selichos: translated and annotated by Rabbi Avrohom Davis, Metsudah Publications, 1986 (CC-BY) | English: Metsudah (CC-BY). |
| Selichot Nusach Polin | `Selichot Nusach Polin` | **Missing** | Selichot Nusach Polin -- Wikisource (CC-BY-SA) | No openly licensed English |  |
| Hadran | `Hadran` | **Missing** | None with an open license (e.g. Wikipedia Hadran, license unknown) | No openly licensed English |  |
| Hadran for Tanach | `Hadran for Tanakh` | **Missing** | None with an open license (e.g. Rav Yona Reiss's version, license unknown) | No openly licensed English | A modern Hadran by Rabbi Yona Reiss. License unknown. |
| Perek Shirah | `Perek Shirah` | **Missing** | Torat Emet 357 (Public Domain) | Perek Shirah, translation and adaptation by Aharon N. Varady and Rabbi Natan Slifkin (CC-BY-SA); Tanakh: The Holy Scriptures, published by JPS — barred (njps-1985) | English: Varady and Rabbi Natan Slifkin (CC-BY-SA); translators' backgrounds for the board. |
| Seder Ma'amadot | `Seder Ma'amadot` | **Missing** | סדר מעמדות (Public Domain) | No openly licensed English |  |
| Taamei Hamikra | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria's export as a separate title. |
| Tikkun HaKlali | `Tikkun HaKlali` | **Missing** | None with an open license (e.g. Tikkun HaKlali - rabenubook.com, license unknown) | Tikkun HaKlali - Wikisource (CC-BY-SA) | Rebbe Nachman's ten psalms. Hebrew license unknown. |
| Akdamut Milin | `Akdamut Milin` | **Missing** | None with an open license (e.g. According to the NLI Piyyut database, license unknown) | Birnbaum 1949 (Public Domain) | English: Birnbaum 1949 (Public Domain). |
| Unetaneh Tokef | `Unetaneh Tokef` | **Missing** | None with an open license (e.g. Goldshmidt with ms emendation, license unknown) | No openly licensed English |  |
| Keter Malchut | `Keter Malkhut` | **Missing** | Mahberet miShire Kodesh, I. Davidson. JPS, Philadelphia, 1923 (Public Domain) | Selected Religious Poems of Solomon Ibn Gabirol, trans. Israel Zangwill. JPS, Philadelphia, 1923 (Public Domain) — Israel Zangwill was a writer, not a rav (board to check) | Ibn Gabirol. The only open English is Israel Zangwill's (1923), a writer rather than a rav (board to confirm). |
| Kinnot for Tisha B'Av (Ashkenaz) | `Kinnot for Tisha B'Av (Ashkenaz)` | **Missing** | Kinnot for Tisha B'Av -- Wikisource (CC-BY-SA) | No openly licensed English |  |
| Lecha Dodi | `Lekha Dodi` | **Missing** | Wikisource (CC-BY-SA) | No openly licensed English |  |
| Yizkor | `Yizkor` | **Missing** | None with an open license (e.g. Public Domain, license unknown) | No openly licensed English |  |

### Jewish thought

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Derashot HaRan | `Derashot HaRan` | **Missing** | None with an open license (e.g. wikisource, license unknown) | Derashot HaRan, by Rabbi Shraga Silverstein (CC-BY) | English by Rabbi Shraga Silverstein (CC-BY), a translator the canon already uses. Hebrew license unknown. |
| Eight Chapters | `Eight Chapters` | **Missing** | The Eight Chapters of Maimonides on Ethics, by Joseph I Gorfinkle (Public Domain); Wikisource (Public Domain) | The Eight Chapters of Maimonides on Ethics, by Joseph I Gorfinkle (Public Domain) | The Rambam's introduction to Avot. Gorfinkle's 1912 edition (Public Domain) has Hebrew and English; translator's background for the board. |
| Sefer Kuzari | `Kuzari` | **In testing library** | Used: Sefer haKuzari - Project Ben-Yehuda (CC-BY-SA) | Kitab al Khazari, translated by Hartwig Hirschfeld, 1905 — barred (hirschfeld-kuzari-1905) | Hirschfeld's English is barred (open question 2). |
| Minhat Kenaot | `Minchat Kenaot` | **Missing** | Minhat Kenaot, Pressburg, 1838. (Public Domain) | No openly licensed English | Letters from the 14th-century dispute over studying philosophy. |
| Yesod Mora | `Yesod Mora VeSod HaTorah` | **Missing** | Yesod Mora; Hokhmat Yisra'el, Jerusalem 1931 (Public Domain) | No openly licensed English | Ibn Ezra. |
| Nefesh HaChaim | `Nefesh HaChayim` | **In testing library** | Used: Vilna, 1874 (Public Domain) | The Soul of Life, translated by Leonard Moskowitz, Teaneck, NJ 2012 [Rev. 1.5] (CC-BY-NC) | English: Moskowitz 2012 (CC-BY-NC), not in the canon yet; translator's background for the board. |
| Maharal | 16 titles, e.g. `Be'er HaGolah`, `Derashat Shabbat HaGadol` | **Partly**: 11 of 16 in testing library; 5 missing (Derashat Shabbat HaGadol, Derush al HaTorah, Drashot Maharal, Ohr Chadash, Derekh Chayyim) | Used: the Machon Yerushalayim editions with Rabbi Yehoshua D. Hartman's notes and Gur Aryeh (marked Public Domain on Sefaria; one is CC-BY-NC). The 5 missing titles also have Hartman editions marked Public Domain (Drashot Maharal: OYW, Public Domain) | Only Gur Aryeh has open English (Metsudah's 'Yalkut, Sifsei Chachomim' Chumash, CC-BY, 5 titles). Be'er HaGolah English on Sefaria is machine-made ('translated using AI'). Nataf and Greenspan translations exist with license not stated | Easy fix: the canon's pattern spells two titles differently from Sefaria ('Derekh Chaim', 'Or Chadash' vs. Sefaria's `Derekh Chayyim`, `Ohr Chadash`), and three titles aren't listed at all. |
| Rav Kook | 13 titles, e.g. `Commentary on Selected Paragraphs of Arpilei Tohar`, `Footnotes on Orot` | **Partly**: 2 of 13 in testing library; 3 in canon only (Olat Reiyah, Orot HaTeshuvah, Orot HaTorah); 8 missing (Commentary on Selected Paragraphs of Arpilei Tohar, Footnotes on Orot, For the Perplexed of the Generation, Ma'amar Hador, Midbar Shur…) | Used: Wikisource (CC-BY-SA) for Orot, Orot HaKodesh. Of the rest: Ma'amar HaDor, Orot HaTorah (Wikisource, CC-BY-SA), Midbar Shur, Middot HaRe'iyah, Musar Avikha (Public Domain) are open; Orot HaTeshuvah, Olat Re'iyah, Shemonah Kevatzim and others are *unknown* | Mussar Avicha; On Morals, Ethics, and Character Development. Trans. Joshua Gerstein, 2023 (CC-BY-NC, 1/13); Rabbi Mike Feuer, 2019 (CC-BY, 1/13); Selected Paragraphs from Arfilei Tohar, comm. Pinchas Polonsky (CC-BY-NC, 1/13); +1 more | Partly easy: Orot HaTorah has a CC-BY-SA file the canon doesn't list. Orot HaTeshuvah and Olat Re'iyah wait on a license. |
| Yom-Tov Lipman Heller | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not identified. Sefaria's *Megillat Eifah* is a different work, by the Shach. Perhaps Mercava means Rabbi Heller's autobiography *Megillat Eivah*? (a question). We have his Tosafot Yom Tov; three more of his works are under Commentaries on Talmud. |
| Nineteen Letters | `Nineteen Letters` | **In testing library** — English only | Not used. Available: Iggerot Tzfun, Vilna 1890 (Public Domain) | Used: Bernard Drachman translation, 1899 (Public Domain) | In the library only in English (Drachman, an Orthodox rabbi). Hebrew 'Iggerot Tzfun, Vilna 1890' (Public Domain) could be added. |
| Milot Higayon | `Treatise on Logic` | **Missing** | Milot Higayon, Warsaw, 1928 (CC-BY-SA) | No openly licensed English | Sefaria's title is `Treatise on Logic`. Written by the Rambam in his youth, on Aristotle's logic. |
| Vilna Gaon's students' letter to the Lost Tribes of Israel | `Letter to the Ten Lost Tribes of Israel` | **Missing** | Igeret haSheluha meHakme veRabane haAskenazim, Amsterdam 1831 (Public Domain) | No openly licensed English | Rabbi Yisrael of Shklov, 1830. |

### Chasidut

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Baal Shem Tov Al Hatorah | `Ba'al Shem Tov` | **Missing** | Sefer Baal Shem Tov. Lodz, 1938 (Public Domain) | Baal Shem Tov; mystical teachings on the weekly Torah portion; by Rabbi Eliezer Shore. 2012 (CC-BY-NC) | Anthology of the Baal Shem Tov's teachings, Lodz 1938 (Public Domain). English: Rabbi Eliezer Shore (CC-BY-NC). |
| Toldot Yaakov Yosef | `Toldot Yaakov Yosef` | **Missing** | Eichen edition. Jerusalem, 2011 (CC-BY-NC); Toldot Yaakov Yosef, Korets, 1780 (Public Domain) | No openly licensed English | The first Chasidic book printed (1780). |
| Tzavaat HaRivash | `Tzava'at HaRivash` | **Missing** | Warsaw, 1913 (Public Domain) | The Way of The Baal Shem Tov. Adapted into English by Rabbi Amiram Markel and Yehudah Shimon Markel, 2020 (CC-BY) | Teachings of the Baal Shem Tov and the Maggid, compiled by students; how much is the Besht's own words is debated (board to confirm). English: Markel 2020 (CC-BY). |
| Keter Shem Tov | `Keter Shem Tov` | **Missing** | Keter Shem Tov, Zalkevo 1794-5 (Public Domain) | No openly licensed English |  |
| Shivchei HaBesht | `Shivchei HaBesht` | **Missing** | Shivchei HaBesht, Kopyst 1815 (Public Domain) | No openly licensed English | Stories about the Baal Shem Tov. |
| Likutei Moharan | `Likutei Moharan` | **In testing library** | Used: Likutei Moharan - rabenubook.com (Public Domain); Likutei Moharan Tinyana - rabenubook.com (Public Domain) | Used: Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012 (CC-BY-NC); Likutey Moharan Volumes 12-15, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012 (CC-BY-NC) Also: Likutei Moharan (CC-BY-SA); Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology) |  |
| Chayei Moharan | `Chayei Moharan` | **Missing** | OYW (Public Domain) | No openly licensed English | Biography of Rebbe Nachman by Rebbe Natan. |
| Shivchei Haran | `Shivchei HaRan` | **Missing** | None with an open license (e.g. rabenubook, license unknown) | Rabbi Nachman's Wisdom, trans. Aryeh Kaplan, Jerusalem. Breslov Research Institute, 1973 (CC-BY-NC) | English: Rabbi Aryeh Kaplan's *Rabbi Nachman's Wisdom* (CC-BY-NC). Hebrew license unknown. |
| Sichot HaRan | `Sichot HaRan` | **Missing** | None with an open license (e.g. rabenubook, license unknown) | Rabbi Nachman's Wisdom, trans. Aryeh Kaplan, Jerusalem. Breslov Research Institute, 1973 (CC-BY-NC) | Same English as Shivchei HaRan. Hebrew license unknown. |
| Sippurei Maasiyot | `Sippurei Maasiyot` | **Missing** | OYW (Public Domain) | Tales of Rabbi Nachman -- Wikisource (CC-BY-SA) | Rebbe Nachman's tales. English: Wikisource (CC-BY-SA), translator not named. |
| Likutei Amarim (Tanya) | `Tanya` | **In testing library** | Used: Kehot Publication Society (CC-BY-NC) | Used: Kehot Publication Society (English Translation) (CC-BY-NC) |  |
| Rav Tzadok HaKohen (14 works: Pri Tzadik, Divrei Chalomot, Divrei Soferim, Et HaOchel, Kometz HaMincha, Likutei Maamarim, Machshavot Charutz, Poked Akarim, Resisei Layla, Sichat Malachei HaSharet, Sichat Shedim, Takanat HaShavin, Tzidkat HaTzadik, Yisrael Kedoshim) | 14 titles, e.g. `Peri Tzadik`, `Divrei Chalomot` | **Missing** | Open Hebrew for 14 of 14 titles. Most common: Pri Tzaddik, Lublin, 1901 (Public Domain, 1/14); R' Zadok -- Divrei Chalomot (Public Domain, 1/14) | No openly licensed English | All 14 of Rav Tzadok's works have Public Domain Hebrew on Sefaria. |
| Arvei Nachal | `Arvei Nachal` | **Missing** | Arvei Nachal, Jerusalem, 1991 (Public Domain) | No openly licensed English |  |
| Be'er Mayim Chaim | `Be'er Mayim Chaim` | **Missing** | None with an open license (e.g. Be'er Mayim Chaim, Jerusalem 1991., license unknown) | No openly licensed English | Hebrew license unknown. |
| Chiddushei HaRim on Torah | `Chiddushei HaRim on Torah` | **Missing** | Chidushei HaRim veGur Aryeh, Bilgoray, 1912 (Public Domain); Sefer HaZchut, in Chidushei HaRim on Gittin, Warsaw, 1877 (Public Domain) | No openly licensed English |  |
| Darchei Yesharim | `Darkhei Yesharim` | **Missing** | Darkhei Yesharim, Warsaw 1913. (Public Domain) | No openly licensed English |  |
| Bnei Yissaschar | `Bnei Yissaschar` | **Missing** | Bnei Yisaschar, Piotrkow 1883 (Public Domain) | No openly licensed English |  |
| Maggid Devarav leYaakov | `Maggid Devarav leYaakov` | **Missing** | Maggid Devarav leYa'akov, Koretz, 1781 (Public Domain) | No openly licensed English |  |
| Pri Haaretz | `Peri HaAretz` | **Missing** | Pri Haaretz -- wikisource (Public Domain); Pri Haaretz, Kopyst 1814 (Public Domain) | No openly licensed English |  |
| Maor VaShemesh | `Maor VaShemesh` | **Missing** | Maor Vashemesh, Breslau, 1842 (Public Domain) | No openly licensed English |  |
| Me'or Einayim | `Me'or Einayim` | **Missing** | Me'or Einayim -- OYW (Public Domain) | ChatGPT (license unknown) — machine translation; excluded.yaml's 'machine-translations' covers it in spirit but doesn't list it by name | The only English is ChatGPT. |
| Shaar HaEmunah Ve'Yesod HaChassidut | `Sha'ar HaEmunah VeYesod HaChasidut` | **Missing** | None with an open license (e.g. Shaar HaEmunah Ve'Yesod HaChassidut, 1996., license unknown) | The Introduction to the Beit Yaakov, Translated and Annotated by Betzalel Edwards (CC-BY) | The Radziner Rebbe. Hebrew license unknown; English by Betzalel Edwards (CC-BY). |
| Shem MiShmuel | `Shem MiShmuel` | **In testing library** | Used: Sefer Shem Mishmuel, Piotrkow, 1927-1934 (Public Domain) | No openly licensed English |  |
| Yismach Moshe | `Yismach Moshe` | **Missing** | Yismach Moshe, Sighet, 1898 (Public Domain) | No openly licensed English |  |

### Musar

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Sefer HaYashar | `Sefer HaYashar` | **Missing** | Torat Emet 357 (Public Domain) | Sefer Hayashar, trans. Seymour J. Cohen. 1973. (CC-BY) — by Rabbi Seymour J. Cohen, a Conservative rabbi; excluded.yaml lists only his 1982 Orchot Tzaddikim by name | Attributed by some to Rabbeinu Tam; most consider the author unknown (board to confirm). The English (Seymour J. Cohen, 1973) is by the same Conservative rabbi whose Orchot Tzaddikim is barred, but this version isn't barred by name. |
| Iggeret HaRamban | `Iggeret HaRamban` | **Missing** | HeWiki (CC-BY-SA) | No openly licensed English | The well-known letter recited weekly. |
| Shaarei Teshuvah | `Sha'arei Teshuvah` | **In testing library** | Used: Sefaria Vocalized Edition (Public Domain); Torat Emet (Public Domain) | Used: Sefaria 2020 Edition, Translated by R. Francis Nataf (CC0) |  |
| Orchot Chaim L'HaRosh | `Orchot Chaim L'HaRosh` | **Missing** | Orchot Chaim -- TE (Public Domain) | Orchot Chayim, trans. Reuven Brauner, 2014 (CC-BY) | English by Reuven Brauner (CC-BY); translator's background for the board. |
| Orchot Tzadikim | `Orchot Tzadikim` | **In testing library** | Used: Orchot Tzadikim -- Vocalized (CC-BY-SA); Torat Emet 357 (CC-BY-SA) | Orchot Tzaddikim, trans. Seymour J. Cohen [with corrections] (CC-BY) — by Rabbi Seymour J. Cohen, a Conservative rabbi; excluded.yaml lists only his 1982 Orchot Tzaddikim by name; Orchot Tzaddikim, trans. Seymour J. Cohen, Ktav Pub House, 1982 — barred (orchot-tzaddikim-cohen) | A second Seymour J. Cohen version ('with corrections') is on Sefaria and not barred by name. |
| Kad HaKemach | `Kad HaKemach` | **Missing** | Kad HaKemach, Warsaw 1872 (Public Domain) | No openly licensed English |  |
| Shekel HaKodesh | `Shekel HaKodesh` | **Missing** | Shekel Hakodesh, London 1919 (Public Domain) | Shekel Hakodesh, trans. Hermann Gollancz, London 1919 (Public Domain) | Rabbi Yosef Kimchi. Gollancz 1919 (Public Domain), Hebrew and English together; translator's background for the board. |
| Yesod HaYirah | `Yesod HaYirah` | **Missing** | Yesod hayirah, London 1919 (Public Domain) | Yesod hayirah, trans. Hermann Gollancz, London 1919 (Public Domain) | Same edition as Shekel HaKodesh. |
| Mesilat Yesharim | `Mesillat Yesharim` | **In testing library** | Used: Sefaria Vocalized Edition (Public Domain) | Path of the Just. Trans. Rabbi Yosef Sebag (CC-BY) | English on Sefaria: Rabbi Yosef Sebag (CC-BY), not in the canon yet. |
| Pele Yoetz | `Pele Yoetz` | **Missing** | Torat Emet (Public Domain) | No openly licensed English | Rabbi Eliezer Papo. |
| Kochvei Ohr | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria's export (Rabbi Yitzchak Blazer's collection, as far as we know (board to confirm)). |
| Marot Ha'Tzoveot | 6 titles, e.g. `Marot HaTzoveot on Joshua`, `Marot HaTzoveot on Judges` | **Missing** | None with an open license (e.g. Warsaw, 1862, license unknown) | No openly licensed English | The Alshich on the Early Prophets. Hebrew license unknown. Also counted under Commentaries on Tanach (Alshich). |
| Shuvah Yisrael | — | **Not on Sefaria's public export** | No Hebrew file | No openly licensed English | Not on Sefaria's export. |
| Iggeret HaGra | `Iggeret HaGra` | **Missing** | Iggeret HaGra -- Wikisource (Public Domain) | Iggeret HaGra -- Wikisource (CC-BY-SA) | The Vilna Gaon's letter to his family. |
| Kav HaYashar | `Kav HaYashar` | **Missing** | Kav HaYashar, Metsudah Publications, 2007 (CC-BY); Kav Hayashar. Frankfurt a.m., 1705 (Public Domain) | Kav HaYashar, trans. Metsudah Publications, 2007 (CC-BY) | Metsudah 2007 (CC-BY): Hebrew and English together. |
| Kitzur Sefer Haredim of Rabbi Elazar Azcari | `Kitzur Sefer Haredim of Rabbi Elazar Azcari` | **Missing** | קיצור ספר חרדים רבי אלעזר אזכרי (Public Domain) | No openly licensed English | Rabbi Avraham Danzig's summary of Sefer Charedim. |
| Iggeret HaRamban Li'vno | `Letter from Ramban to his Son` | **Missing** | Jewish Quaterly Review, 1892, Solomon Schechter (Public Domain) | Jewish Quaterly Review, 1892, Solomon Schechter (Public Domain) — Solomon Schechter later led the Jewish Theological Seminary (Conservative) | A different letter from the Iggeret HaRamban above. The only edition is Solomon Schechter's (1892, Public Domain); Schechter later led the Jewish Theological Seminary. |
| Ohr Yisrael | `Ohr Yisrael` | **Missing** | Ohr Yisrael, Vilna 1900 (Public Domain) | Ohr Yisrael, trans. Rabbi Irving Greenberg with Rabbi Justin Pines, 2020 (CC-BY-NC) | Rabbi Yisrael Salanter. English by 'Rabbi Irving Greenberg with Rabbi Justin Pines' (CC-BY-NC); we don't know which Irving Greenberg this is, so it is for the board. |
| Sefer Tomer Devorah | `Tomer Devorah` | **Missing** | Torat Emet (Public Domain) | Rabbi Dr. David Mevorach Seidenberg, from "Kabbalah and Ecology" — barred (kabbalah-and-ecology) | The Ramak. |
| Shevet Musar | `Shevet Musar` | **Missing** | Shevet Musar, Fiyorda, 1761 (Public Domain); Shevet Musar, Wilhermsdorf 1738 (CC-BY-SA) | No openly licensed English |  |
| Toras Habayis | `Ma'amar Torat HaBayit` | **Missing** | Piotrkow, 1907 (Public Domain) | No openly licensed English | The Chafetz Chaim. |
| Tzipita L'Yeshuah | `Ma'amar Tzipita LeYeshuah` | **Missing** | None with an open license (e.g. Tzipita L'Yeshuah -- Torat Emet, license unknown) | Anticipating Redemption, trans. by Rabbi Amiram Markel and Rabbi Yehudah S. Markel, 2023 (CC-BY) | The Chafetz Chaim. English: Markel 2023 (CC-BY). Hebrew license unknown. |
| Yaarot Devash | `Ya'arot Devash I`, `Ya'arot Devash II` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Yaarot Devash -- OYW (Public Domain, 1/2); Józefów, 1866 (Public Domain, 1/2) | No openly licensed English | Rabbi Yonatan Eybeschutz. |

### Responsa

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Iggeret Rav Sherira Gaon | `Epistle of Rav Sherira Gaon` | **In testing library** | Used: Seder HaChachamim. Oxford, 1888 (Public Domain) | No openly licensed English | Both Mercava and we have it. |
| Teshuvot HaGeonim | `Teshuvot HaGeonim` | **Missing** | Teshuvot HaGeonim, Nathan Coronel, 1871 (Public Domain) | No openly licensed English |  |
| Toratan shel Rishonim | `Toratan shel Rishonim` | **Missing** | Toratan shel Rishonim, Frankfurt am Main, 1881 (Public Domain) | No openly licensed English |  |
| Rashba | 6 titles, e.g. `Teshuvot haRashba part I`, `Teshuvot haRashba part IV` | **Missing** | Open Hebrew for 6 of 6 titles. Most common: Warsaw, 1868 (Public Domain, 2/6); Teshuvot haRashba I, Wien 1812 (Public Domain, 1/6) | Sefaria Responsa Anthology (CC-BY, 2/6) | Six volumes, mostly Public Domain printings. The 'Sefaria Responsa Anthology' English names no translator. |
| Rambam | `Iggerot HaRambam`, `Pe'er HaDor Teshuvot HaRambam`, `Teshuvot HaRambam` | **Missing** | Open Hebrew for 2 of 3 titles. Most common: Kobetz Teshuvot HaRambam, 1859 (Public Domain, 1/3); Leipzig: H.L. Shnuis, 1859 (Public Domain, 1/3) | Sefaria Responsa Anthology (CC-BY, 2/3); Iggeret Teiman (CC-BY-SA, 1/3) | Iggerot HaRambam includes Iggeret Teiman (English on Wikisource, CC-BY-SA). |
| Radbaz | 6 titles, e.g. `Teshuvot HaRadbaz Volume 1`, `Teshuvot HaRadbaz Volume 2` | **Missing** | Open Hebrew for 6 of 6 titles. Most common: Teshuvot HaRadbaz, Warsaw 1882 (Public Domain, 6/6) | Sefaria Responsa Anthology (CC-BY, 3/6) |  |
| Chazeh Hatenufa | `Chazeh Hatenufa` | **Missing** | Chaim Shaal, Lemberg, 1886 (Public Domain) | No openly licensed English |  |
| Maharam MiRothenburg | `Teshuvot Maharam` | **Missing** | Sefer She'elot uTeshuvot, Kremonah, 1557 (Public Domain); Shaarei Teshuvot, Maharam bar Barukh, Berlin, 1891 (Public Domain) | Rabbi Meir of Rothenburg, his life and his works, by Irving A. Agus. Philadelphia, 1947 (Public Domain); Sefaria Responsa Anthology (CC-BY) | English: Agus 1947 (Public Domain), a historian's selection. |
| Sefer HaTashbetz | `Sefer HaTashbetz` | **Missing** | Sefer ha-tashbetz, Lemberg, 1891 (Public Domain) | No openly licensed English |  |
| Shut min haShamayim | `Teshuvot Min HaShamayim` | **Missing** | Sheʾelot u-teshuvot Min ha-shamayim, Königsberg, 1858. (Public Domain) | No openly licensed English | Answers Rabbi Yaakov of Marvege recorded receiving in dreams. The board may want to say how RabAI presents it. |
| Teshuvot HaRashbash | `Teshuvot HaRashbash` | **Missing** | None with an open license (e.g. Teshuvot HaRashbash, Livorno, 1742, license unknown) | Sefaria Responsa Anthology (CC-BY) | Hebrew Livorno 1742, license unknown; old enough for the canon's age rule. |
| Teshuvot HaRi Migash | `Teshuvot HaRi Migash` | **Missing** | R. Yosef Ibn Migash Responsa, Warsaw, 1870 (Public Domain) | Sefaria Responsa Anthology (CC-BY) |  |
| Teshuvot HaRivash | `Teshuvot HaRivash` | **Missing** | Rivash Responsa, Vilna, 1879 (Public Domain) | No openly licensed English |  |
| Teshuvot Maharik | `Teshuvot Maharik` | **Missing** | Responsa Maharik, Warsaw 1884 (Public Domain) | No openly licensed English |  |
| Teshuvot Maharil | `Teshuvot Maharil` | **Missing** | She'elot uTeshuvot Maharil. Krakow, 1881 (Public Domain) | No openly licensed English |  |
| Teshuvot Rashi | `Teshuvot Rashi` | **Missing** | None with an open license (e.g. Teshuvot Rashi vol. I, New York, 1943, license unknown) | Sefaria Responsa Anthology (CC-BY) | Hebrew is a 1943 New York edition, license unknown, too recent for the age rule. |
| B'Mareh HaBazak | 10 titles, e.g. `B'Mareh HaBazak Volume I`, `B'Mareh HaBazak Volume II` | **Missing** | Open Hebrew for 8 of 10 titles. Most common: B'Mareh HaBazak Machon Eretz Hemdah (CC-BY, 2/10); B'Mareh HaBazak Machon Eretz Hemdah -- Vol. 1 (CC-BY, 1/10) | No openly licensed English | Modern responsa (Eretz Hemdah, CC-BY), a Religious Zionist institute. |
| Hakham Tzvi | `Chakham Tzvi` | **Missing** | None with an open license (e.g. Debrecen, 1942, license unknown) | Sefaria Responsa Anthology (CC-BY) | Hebrew license unknown (Debrecen 1942); an older printing would be needed. |
| Havot Yair | `Havot Yair` | **Missing** | Chavot Yair, Lemberg, 1896 (Public Domain) | Sefaria Responsa Anthology (CC-BY) |  |
| Noda BiYehudah | `Noda BiYehudah I`, `Noda BiYehudah II` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Noda BeYehuda Warsaw 1880 (Public Domain, 1/2); Noda Bi-Yehudah Part II; Warsaw, 1880 (Public Domain, 1/2) | Sefaria Responsa Anthology (CC-BY, 1/2) |  |
| Teshuvot Chatam Sofer | `Responsa Chatam Sofer` | **In testing library** | Used: Pressburg, 1855-1864 (Public Domain); Pressburg, 1855 [typed] (Public Domain) | No openly licensed English |  |
| Teshuvot Maharshal | `Teshuvot Maharshal` | **Missing** | Teshuvot Maharshal, Fürth, 1768 (Public Domain); Teshuvot Maharshal, Lublin, 1574 (Public Domain) | Sefaria Responsa Anthology (CC-BY); The Responsa of Solomon Luria, by Simon Hurwitz, N.Y., 1938 (Public Domain) | English: Simon Hurwitz 1938 (Public Domain); translator's background for the board. |

### Minor tractates

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Avot D'Rabbi Natan | `Avot DeRabbi Natan`, `Avot DeRabbi Natan, Recension B` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Schechter edition, Recension A, Vienna, 1887 (Public Domain, 1/2); Talmud Bavli, Vilna 1883 ed. (Public Domain, 1/2) | Avot DeRabbi Natan, trans. by David Kasher, 2019 (CC-BY, 1/2); The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY, 1/2) | Printed in the Vilna Shas. Soncino English (A. Cohen, 1965, CC-BY); the canon already treats Soncino's Talmud as Orthodox. Another English (David Kasher, 2019) for the board. |
| Tractate Avadim | `Tractate Avadim` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Gerim | `Tractate Gerim` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | Rabbi Ethan Tucker's translation (license unknown) — from Hadar (an egalitarian yeshiva); not listed in excluded.yaml; The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) | English also by Rabbi Ethan Tucker (Hadar), license unknown, not in excluded.yaml. |
| Kallah | `Tractate Kallah` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Kallah Rabbati | `Tractate Kallah Rabbati` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Kutim | `Tractate Kutim` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | James Montgomery (1907) (license unknown) — academic translation (board to check); James Montogmery (1907) (license unknown) — academic translation (board to check); The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) | English also by James Montgomery (1907), an academic, license unknown. |
| Mezuzah | `Tractate Mezuzah` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Sefer Torah | `Tractate Sefer Torah` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Semachot | `Tractate Semachot` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Soferim | `Tractate Soferim` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Tefillin | `Tractate Tefillin` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Tzitzit | `Tractate Tzitzit` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Megillat Taanit | `Megillat Ta'anit` | **Missing** | Warsaw, 1874 (Public Domain) | Megillat Taanit, trans. Solomon Zeitlin (license unknown) — academic translation (board to check); Rabbi Mike Feuer, Jerusalem Anthology (CC-BY) | Not part of the Vilna minor tractates. English: Zeitlin (academic), license unknown. |
| Tractate Derech Eretz Rabbah | `Tractate Derekh Eretz Rabbah` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |
| Tractate Derech Eretz Zuta | `Tractate Derekh Eretz Zuta` | **Missing** | Talmud Bavli, Vilna 1883 ed. (Public Domain) | The Minor Tractates of the Talmud, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY) |  |

### Reference

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Sefat Yeter | `Sefat Yeter` | **Missing** | Sefer Sefat Yeter, Warsaw 1895 (Public Domain) | No openly licensed English | Ibn Ezra, on grammar. |

### Commentaries on Tanach

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Aderet Eliyahu | `Aderet Eliyahu` | **Missing** | Aderet Eliyahu, Halberstadt, 1860 (Public Domain) | Yalkut, Sifsei Chachomim Chumash, Metsudah Publications, 2009 (CC-BY) | The Vilna Gaon on the Torah. |
| Alshich | 15 titles, e.g. `Marot HaTzoveot on Joshua`, `Marot HaTzoveot on Judges` | **Missing** | Open Hebrew for 9 of 15 titles. Most common: Alshich on Five Megillot, Warsaw, 1862 (Public Domain, 5/15); Romemot El, Warsaw 1875 (Public Domain). Marot HaTzoveot on Nevi'im (6 titles): Warsaw 1862, license *unknown* | No openly licensed English | Includes Marot HaTzoveot (also listed under Musar). |
| Avi Ezer | `Avi Ezer` | **Missing** | Avi Ezer (Public Domain) | No openly licensed English |  |
| Bartenura (on Torah) | `Bartenura on Torah` | **Missing** | Rabotenu Ba'ale ha-Tosafot, Warsaw, 1876 (Public Domain) | No openly licensed English | A supercommentary on Rashi. |
| Beit HaLevi on Torah | `Beit HaLevi on Torah` | **Missing** | Beit Halevi al HaTorah, Warsaw, 1884 (Public Domain) | No openly licensed English |  |
| Bechor Shor | `Bekhor Shor` | **Missing** | Bekhor Shor, Breslau, 1890 (Public Domain); Bekhor Shor, Breslau, 1900 (Public Domain) | No openly licensed English | Rabbi Yosef Bekhor Shor, a Tosafist. English (Munk) on Sefaria, license unknown. |
| Chomat Anach | 35 titles, e.g. `Chomat Anakh on Joshua`, `Chomat Anakh on Judges` | **Missing** | None with an open license (e.g. Chomat Anakh, Jerusalem 1965, license unknown) | No openly licensed English | The Chida. Hebrew license unknown (Jerusalem 1965). |
| HaKtav VeHaKabalah | `HaKtav VeHaKabalah` | **Missing** | HaKtav VeHaKabbalah, Frankfurt 1880 (Public Domain) | Yalkut, Sifsei Chachomim Chumash, Metsudah Publications, 2009 (CC-BY) | Rabbi Yaakov Tzvi Mecklenburg. |
| Ibn Ezra | 29 titles, e.g. `Ibn Ezra on Genesis`, `Ibn Ezra on Exodus` | **Partly**: 24 of 29 in testing library; 5 in canon only (Ibn Ezra on Isaiah, Ibn Ezra on Song of Songs, Ibn Ezra on Lamentations, Ibn Ezra on Ecclesiastes, Ibn Ezra on Esther) | Used: On Your Way (Public Domain, 5/29); Piotrkow, 1907-1911 (Public Domain, 2/29); Ibn Ezra on Hosea -- Daat (Public Domain, 1/29); +18 more versions | Ibn Ezra's commentary on the Pentateuch, tran. and annot. by H. Norman Strickman and Arthur M. Silver. Menorah Pub., 1988-2004 (CC-BY-NC, 5/29); Yalkut, Sifsei Chachomim Chumash, Metsudah Publications, 2009 (CC-BY, 5/29); Ibn Ezra on the Pentateuch - trans. by Jay F. Shachter (CC-BY, 2/29); +3 more | Easy fix: the 5 missing books have Public Domain Hebrew that the canon doesn't list (Friedländer 1877 for Isaiah, Kol Sason 1840 for Esther, Wikisource for the others). Friedländer's English on Isaiah is Public Domain; translator's background for the board. |
| Yaakov Lorberbaum | 5 titles, e.g. `Tzror HaMor on Song of Songs`, `Imrei Yosher on Ruth` | **Missing** | Open Hebrew for 5 of 5 titles. Most common: Alshich on Five Megillot, Warsaw, 1862 (Public Domain, 5/5) | No openly licensed English | Rabbi Yaakov of Lissa (author of the Netivot HaMishpat, which we have). |
| Yoseph ibn Yahya | `Joseph ibn Yahya on Esther`, `Joseph ibn Yahya on Daniel` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Perush Chamesh Megillot u-Ketuvim. Joseph ibn Yahya. Bologna: 1538 (Public Domain, 2/2) | No openly licensed English | Rabbi Yosef ibn Yahya (Bologna, 1538). Some later rabbis criticized his writings; we could not check the details here, so this is a question for the board. |
| Malbim | 38 titles, e.g. `Malbim on Genesis`, `Malbim on Exodus` | **Partly**: 28 of 38 in testing library; 9 in canon only (Malbim on I Samuel, Malbim on II Samuel, Malbim on I Kings, Malbim on II Kings, Malbim on Isaiah…); 1 missing (Malbim Ayelet HaShachar) | Used: several public-domain Vilna and Wikisource versions (28 books). The 9 canon-only books have `On Your Way` (Public Domain for 7; *unknown* for I Samuel and Isaiah). Ayelet HaShachar: Wikisource, *unknown* | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY, 7/38); Metsudah 'Yalkut, Sifsei Chachomim' (CC-BY, 2/38); Ayelet HaShachar, trans. Betzalel Avraham Feinstein, 2021 (CC-BY-NC); Malbim's Job, trans. Jeremy I. Pfeffer, Ktav 2003 (CC-BY). None of these is in the canon yet | Easy fix: the 9 canon-only books need 'On Your Way' added as a version (Public Domain on 7 of them). |
| Malbim Beur Hamilot | 16 titles, e.g. `Malbim Beur Hamilot on Isaiah`, `Malbim Beur Hamilot on Jeremiah` | **Missing** | Open Hebrew for 15 of 16 titles. Most common: On Your Way (Public Domain, 3/16); Malbim on Hosea--Wikisource (Public Domain, 1/16) | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY, 2/16) | The Malbim's word explanations. Mostly Public Domain. |
| Mechir Yayin on Esther | `Mekhir Yayin on Esther` | **Missing** | Mechir Yayin, Warsaw 1880 (Public Domain) | No openly licensed English | The Rema on Esther. |
| Minchat Shai | 35 titles, e.g. `Minchat Shai on Torah`, `Minchat Shai on Joshua` | **Missing** | Open Hebrew for 35 of 35 titles. Most common: Minchat Shai (Public Domain, 29/35); Arba'ah Ve'Esrim im Minhat Shai. Mantua, 1742-1744 (Public Domain, 5/35) | No openly licensed English | Rabbi Yedidiah Norzi, on the text and spelling of Tanach. |
| Mizrachi | `Mizrachi` | **Missing** | Four commentaries on Rashi. Warsaw, 1862 (Public Domain) | No openly licensed English | Supercommentary on Rashi. |
| Rabbeinu Chananel | 5 titles, e.g. `Rabbeinu Chananel on Genesis`, `Rabbeinu Chananel on Exodus` | **Missing** | Open Hebrew for 5 of 5 titles. Most common: Migdal Chananel, Berlin, 1876 (Public Domain, 5/5) | Eliyahu Munk, HaChut Hameshulash (CC-BY, 5/5) | English: Munk (CC-BY). |
| Radak | 25 titles, e.g. `Radak on Genesis`, `Radak on Joshua` | **Partly**: 1 of 25 in testing library — English only; 24 in canon only (Radak on Joshua, Radak on Judges, Radak on I Samuel, Radak on II Samuel, Radak on I Kings…) | Not used. Radak on Nach: the only full Hebrew file (`Radak on Nach`) has license *unknown*. Open exceptions: Genesis (Pressburg 1842; Berlin 1857; Ms. Guenzburg 495, all Public Domain), Psalms (Fürth 1843; Leipzig 1883, Public Domain), Chronicles (Berger critical edition, CC-BY-NC) | Used: Eliyahu Munk, HaChut Hameshulash (CC-BY, 1/25) Also: Rabbi Mike Feuer, Jerusalem Anthology (CC-BY, 4/25); The Commentary of Radak to Chronicles: A Translation with Introduction and Supercommentary, by Yitzhak Berger, Brown University, 2007 (CC-BY-NC, 2/25) — academic translation (board to check); McCaul Translation (Public Domain, 1/25) — probably Alexander McCaul's translation; McCaul was a Christian missionary (board to confirm); +2 more | Partly blocked: most Hebrew files have license unknown. Psalms and Genesis can come in now. |
| Ralbag | 17 titles, e.g. `Ralbag on Torah`, `Ralbag on Joshua` | **Missing** | Open Hebrew for 17 of 17 titles. Most common: On Your Way (Public Domain, 12/17); Perush al Hamesh Megillot, Konigsberg, 1860 (Public Domain, 4/17) | Rabbi Mike Feuer, Jerusalem Anthology (CC-BY, 2/17) | Ralbag's philosophy was criticized by later authorities. His Torah commentary is widely printed in Mikraot Gedolot. The board decides how RabAI uses him. |
| Ralbag Beur HaMilot | `Ralbag Beur HaMilot on Torah` | **Missing** | Ralbag on Torah, Venice, 1547 (Public Domain) | No openly licensed English |  |
| Riva | `Riva on Torah` | **Missing** | Rabotenu Ba'ale ha-Tosafot, Warsaw, 1876 (Public Domain) | No openly licensed English | A Tosafist's supercommentary on Rashi. |
| Saadia Gaon | 6 titles, e.g. `Saadia Gaon on Genesis`, `Saadia Gaon on Exodus` | **Missing** | Open Hebrew for 3 of 6 titles. Most common: Commentary on Ezra and Nehemiah, Oxford : Clarendon Press, 1882 (Public Domain, 2/6); Saadya's Commentary on Genesis, New York, 1984 (CC-BY, 1/6) | Eliyahu Munk, HaChut Hameshulash (CC-BY, 3/6) | Rav Saadia Gaon. English: Munk (CC-BY) for 3 books. |
| Ibn Ezra (Second Version) | `Second Version of Ibn Ezra on Esther`, `Ibn Ezra HaKatzar on Exodus` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Ibn Ezra's Commentary on the Book of Esther, London, 1850. (Public Domain, 1/2); Piotrkow, 1907-1911 (Public Domain, 1/2) | No openly licensed English |  |
| Siftei Chachamim | `Siftei Chakhamim`, `Siftei Chakhamim on Song of Songs` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Sifsei Chachomim Chumash, Metsudah Publications, 2009 (CC-BY, 1/2); Siftei Hakhamim (Public Domain, 1/2) | Sifsei Chachomim Chumash, Metsudah Publications, 2009 (CC-BY, 1/2) | Metsudah 2009 (CC-BY): Hebrew and English together. |
| Tevat Gome | `Tevat Gome` | **Missing** | Tevat Gome, Frankfurt an der Oder, 1782 (Public Domain) | No openly licensed English | The Pri Megadim's author. |
| Torah Temimah | 7 titles, e.g. `Torah Temimah on Torah`, `Torah Temimah on Psalms` | **Missing** | Open Hebrew for 7 of 7 titles. Most common: Torah Temimah, Vilna, 1904 (Public Domain, 6/7); On Your Way (Public Domain, 1/7) | Yalkut, Sifsei Chachomim Chumash, Metsudah Publications, 2009 (CC-BY, 1/7) | Rabbi Baruch HaLevi Epstein. |
| Tur HaAroch | `Tur HaArokh` | **Missing** | Perush al ha-Torah, Hanover, 1838 (Public Domain) | Tur on the Torah, trans. Eliyahu Munk (CC-BY) | The author of the Tur. English: Munk (CC-BY). |

### Commentaries on Mishnah

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Boaz | 58 titles, e.g. `Boaz on Mishnah Berakhot`, `Boaz on Mishnah Peah` | **In testing library** (58 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 58/58) | No openly licensed English |  |
| Gra | 13 titles, e.g. `Gra on Pirkei Avot`, `Eliyahu Rabbah on Mishnah Kelim` | **Missing** | Open Hebrew for 1 of 13 titles. Most common: Pirkei Avot with commentary of the Vilna Gaon, Vilna 1836 (Public Domain, 1/13) | No openly licensed English | Only Avot has open Hebrew; the others (Vilna 1901 printing) have license unknown. |
| Lechem Shamayim | 64 titles, e.g. `Lechem Shamayim, Introduction to Mishnah Commentary`, `Lechem Shamayim on Mishnah Berakhot` | **Missing** | Open Hebrew for 64 of 64 titles. Most common: Jerusalem, 1978 (PD, 63/64); Ets Avot, Lechem Shamayim; Krakow, 1883. (Public Domain, 1/64) | No openly licensed English | Rabbi Yaakov Emden. Jerusalem 1978 printing marked 'PD' on Sefaria; the maintainer may want to check that. |
| Melechet Shlomo | 63 titles, e.g. `Melekhet Shelomoh on Mishnah Berakhot`, `Melekhet Shelomoh on Mishnah Peah` | **Missing** | Open Hebrew for 63 of 63 titles. Most common: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 63/63) | No openly licensed English | Rabbi Shlomo Adeni. Printed in the Vilna Mishnah. |
| Midrash Shmuel on Avot | `Midrash Shmuel on Avot` | **Missing** | Midrash Shmuel, Warsaw, 1876 (Public Domain) | No openly licensed English |  |
| Motar Kinnim | `Motar Kinnim` | **Missing** | Al Gozalav Yerahef, Motar Kinnim by Rabbi Yitzhak Aizik of Komarno, Modiin 2017 (CC-BY) | No openly licensed English | Modern edition (Modiin 2017, CC-BY). |
| Petach Einayim | 25 titles, e.g. `Petach Einayim on Mishnah Peah`, `Petach Einayim on Mishnah Demai` | **Missing** | Open Hebrew for 24 of 25 titles. Most common: Petach Einayim, Jerusalem 1959 (Public Domain, 24/25) | No openly licensed English | The Chida. |
| Rabbeinu Shemaiah on Mishnah Middot | `R' Shemaiah on Mishnah Middot` | **Missing** | Talmud Bavli, Vilna, 1880. (Public Domain) | No openly licensed English |  |
| Rabbeinu Yonah | `Rabbeinu Yonah on Pirkei Avot` | **Missing** | Pirkei Avot, Berlin, 1848 (Public Domain) | No openly licensed English |  |
| Rambam | 66 titles, e.g. `Rambam Introduction to the Mishnah`, `Rambam on Mishnah Berakhot` | **Partly**: 63 of 66 in testing library; 3 missing (Rambam Introduction to the Mishnah, Rambam Introduction to Seder Kodashim, Rambam Introduction to Seder Tahorot) | Used: Vilna Edition (Public Domain, 34/66); Vilna edition (Public Domain, 29/66) | Rambam Introduction to the Mishnah, translation by Rabbi Francis Nataf, 2017 (CC0, 1/66) | Easy fix: the canon's pattern `^Rambam on ` misses the three introductions (Vilna, Public Domain). The Rambam's Introduction to the Mishnah also has Nataf's English (CC0). |
| Rash MiShantz | 21 titles, e.g. `Rash MiShantz on Mishnah Peah`, `Rash MiShantz on Mishnah Demai` | **Missing** | Open Hebrew for 21 of 21 titles. Most common: Talmud Bavli, Vilna, 1880. (Public Domain, 21/21) | No openly licensed English | Rabbeinu Shimshon of Sens. |
| Rashi | `Rashi on Avot` | **Missing** | Vilna Edition (Public Domain) | No openly licensed English |  |
| Magen Avot | `Magen Avot on Avot` | **Missing** | Magen Avot, Leipzig 1855 (Public Domain) | No openly licensed English | The Tashbetz on Avot. |
| Tosafot Yom Tov | 64 titles, e.g. `Tosafot Yom Tov on Mishnah Berakhot`, `Tosefot Yom Tov on Mishnah Peah` | **Partly**: 62 of 64 in testing library; 2 missing (Tosefot Yom Tov on Mishnah Peah, Tosafot Yom Tov Introduction to the Mishnah) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 62/64) | TYT Intro to Mishna Commentary (CC-BY, 1/64); Tosafot Yom Tov on Avot, trans. Dov Dukhovny, 2018 (CC-BY, 1/64) | Easy fix: one title is spelled `Tosefot Yom Tov on Mishnah Peah` on Sefaria, and the Introduction isn't matched. Both Vilna 1913, Public Domain. English on Avot: Dukhovny 2018 (CC-BY). |
| Yachin | 63 titles, e.g. `Yachin on Mishnah Berakhot`, `Yachin on Mishnah Peah` | **In testing library** (63 titles) | Used: Mishnah, ed. Romm, Vilna 1913 (Public Domain, 63/63) | No openly licensed English |  |
| Zeroa Yamin | `Zeroa Yamin` | **Missing** | Petah Einayim, Livorno, 1790 (Public Domain) | No openly licensed English | The Chida on Avot. |

### Commentaries on Talmud Bavli

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Beur Reuven on Bava Kamma | `Beur Reuven on Bava Kamma` | **Missing** | Beur Reuven, New York 1955 (Public Domain) | No openly licensed English | 20th century (New York 1955); Sefaria marks it Public Domain, which the maintainer may want to check. |
| Chidushei Agadot (Maharsha) | 37 titles, e.g. `Chidushei Agadot on Berakhot`, `Chidushei Agadot on Shabbat` | **Partly**: 36 of 37 in testing library; 1 in canon only (Chidushei Agadot on Rosh Hashanah) | Used: Vilna Edition (Public Domain, 36/37) | No openly licensed English | Rosh Hashanah's file has license unknown. |
| Chidushei Halachot (Maharsha) | 31 titles, e.g. `Chidushei Halachot on Berakhot`, `Chidushei Halachot on Shabbat` | **In testing library** (31 titles) | Used: Vilna Edition (Public Domain, 31/31) | No openly licensed English |  |
| Chochmat Shlomo | 19 titles, e.g. `Chokhmat Shlomo on Berakhot`, `Chokhmat Shlomo on Shabbat` | **Missing** | Open Hebrew for 19 of 19 titles. Most common: Vilna Edition (Public Domain, 19/19) | No openly licensed English | The Maharshal. |
| Divrey Chamudot | `Divrey Chamudot on Berakhot`, `Divrey Chamudot on Menachot`, `Divrey Chamudot on Niddah` | **Missing** | Open Hebrew for 3 of 3 titles. Most common: Vilna Edition (Public Domain, 3/3) | No openly licensed English | Rabbi Yom Tov Lipmann Heller, on the Rosh. |
| Korban Netanel | 13 titles, e.g. `Korban Netanel on Eruvin`, `Korban Netanel on Pesachim` | **Missing** | Open Hebrew for 13 of 13 titles. Most common: Vilna Edition (Public Domain, 13/13) | No openly licensed English |  |
| Maadanei Yom Tov | `Maadaney Yom Tov on Berakhot`, `Maadaney Yom Tov on Menachot`, `Maadaney Yom Tov on Niddah` | **Missing** | Open Hebrew for 3 of 3 titles. Most common: Vilna Edition (Public Domain, 3/3) | No openly licensed English | Rabbi Yom Tov Lipmann Heller, on the Rosh. |
| Maharam | 17 titles, e.g. `Maharam on Shabbat`, `Maharam on Eruvin` | **In testing library** (17 titles) | Used: Vilna Edition (Public Domain, 17/17) | No openly licensed English |  |
| Maharam Shif | 12 titles, e.g. `Maharam Schiff on Shabbat`, `Maharam Schiff on Eruvin` | **Missing** | Open Hebrew for 12 of 12 titles. Most common: Vilna Edition (Public Domain, 12/12) | No openly licensed English |  |
| Penei Yehoshua | 16 titles, e.g. `Penei Yehoshua on Berakhot`, `Penei Yehoshua on Shabbat` | **In canon only** (16 of 16 titles matched) | Open Hebrew for 16 of 16 titles. Most common: Penei Yehoshua, Warsaw 1861 (Public Domain, 16/16) | No openly licensed English | Easy fix: the canon matches all 16 but lists only 'Vilna Edition'; Sefaria's file is 'Penei Yehoshua, Warsaw 1861' (Public Domain). |
| Petach Einayim | 37 titles, e.g. `Petach Einayim on Berakhot`, `Petach Einayim on Shabbat` | **Missing** | Open Hebrew for 37 of 37 titles. Most common: Petach Einayim, Jerusalem 1959 (Public Domain, 37/37) | No openly licensed English | The Chida. |
| Pilpula Charifta | 6 titles, e.g. `Pilpula Charifta on Bava Metzia`, `Pilpula Charifta on Bava Batra` | **Missing** | Open Hebrew for 5 of 6 titles. Most common: Vilna Edition (Public Domain, 5/6) | No openly licensed English | Rabbi Yom Tov Lipmann Heller, on the Rosh. |
| Rabbeinu Chananel | 18 titles, e.g. `Rabbeinu Chananel on Shabbat`, `Rabbeinu Chananel on Eruvin` | **Missing** | Open Hebrew for 17 of 18 titles. Most common: Vilna Edition (Public Domain, 17/18) | No openly licensed English | Printed in the Vilna Shas. Shabbat's file has no license. |
| Ramban | 27 titles, e.g. `Chiddushei Ramban on Berakhot`, `Chiddushei Ramban on Shabbat` | **Partly**: 26 of 27 in testing library; 1 in canon only (Hilkhot HaRamban on Nedarim) | Used: Chiddushei HaRamban, Jerusalem 1928-29 (Public Domain, 26/27); Chiddushei HaRamban,  Prag, 1826 (Public Domain, 1/27) | No openly licensed English | Hilkhot HaRamban on Nedarim: license unknown. |
| Rashba | 19 titles, e.g. `Rashba on Berakhot`, `Rashba on Shabbat` | **In testing library** (19 titles) | Used: Gerlitz edition, published by Oraita (Public Domain, 18/19); Chidushei HaRashba. Warsaw 1883. (Public Domain, 1/19); Warsaw, 1861 (Public Domain, 1/19) | No openly licensed English |  |
| Rav Nissim Gaon | `Rav Nissim Gaon on Berakhot`, `Rav Nissim Gaon on Shabbat`, `Rav Nissim Gaon on Eruvin` | **Missing** | Open Hebrew for 2 of 3 titles. Most common: Vilna Edition (Public Domain, 2/3) | No openly licensed English | Printed in the Vilna Shas. |
| Rif | 25 titles, e.g. `Rif Berakhot`, `Rif Shabbat` | **In testing library** (25 titles) | Used: Vilna Edition (Public Domain, 25/25) | No openly licensed English |  |
| Ritva | 18 titles, e.g. `Ritva on Berakhot`, `Ritva on Eruvin` | **Partly**: 17 of 18 in testing library; 1 in canon only (Ritva on Nedarim) | Used: Chidushi HaRitva, Amsterdam, 1729. (Public Domain, 2/18); Chiddushei haRitva, Munkatch, 1908. (Public Domain, 2/18); Berakhah Meshuleshet, Warsaw, 1863. (Public Domain, 1/18); +12 more versions | No openly licensed English | Nedarim: license unknown. |
| Rosh | 27 titles, e.g. `Rosh on Berakhot`, `Rosh on Shabbat` | **In testing library** (27 titles) | Used: Vilna Edition (Public Domain, 27/27) | No openly licensed English |  |
| Shitah Mekubetzet | 9 titles, e.g. `Shita Mekubetzet on Berakhot`, `Shita Mekubetzet on Beitzah` | **Missing** | Open Hebrew for 8 of 9 titles. Most common: Vilna Ed (Public Domain, 6/9); Shita Mekubetzet (Public Domain, 1/9) | No openly licensed English | Rabbi Betzalel Ashkenazi's collection. |
| Tiferet Shmuel | 8 titles, e.g. `Tiferet Shmuel on Pesachim`, `Tiferet Shmuel on Sukkah` | **Missing** | Open Hebrew for 8 of 8 titles. Most common: Vilna Edition (Public Domain, 8/8) | No openly licensed English |  |
| Yad Ramah | `Yad Ramah on Sanhedrin`, `Yad Ramah on Bava Batra` | **Missing** | Open Hebrew for 1 of 2 titles. Most common: Yad Ramah Sanhedrin, Warsaw 1895 ed. (Public Domain, 1/2) | No openly licensed English | Rabbi Meir Abulafia. Bava Batra's file has license unknown. |

### Commentaries on Halacha

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Sheiltot d'Rav Achai Gaon (and its commentaries) | `Sheiltot d'Rav Achai Gaon`, `Haamek Sheilah on Sheiltot d'Rav Achai Gaon`, `Sheilat Shalom on Sheiltot d'Rav Achai Gaon` | **Missing** | Open Hebrew for 3 of 3 titles. Most common: Sheiltot d'Rav Achai Gaon; Vilna, 1861 (Public Domain, 3/3); The path of Torah, Urim 2009 (CC-BY, 1/3) | The path of Torah, introduction to Ha'amek she'elah. Trans. by Elchanan Greenman. Urim, 2009 (CC-BY, 1/3) | The first book written after the Talmud. Includes the Netziv's Haamek She'elah. |
| Sefer Mitzvot Katan (and its glosses) | `Sefer Mitzvot Katan`, `Haggahot Chadashot on Sefer Mitzvot Katan`, `Haggahot Rabbeinu Peretz on Sefer Mitzvot Katan` | **Missing** | Open Hebrew for 3 of 3 titles. Most common: Sefer Mitzvot Katan, Kopys, 1820 (Public Domain, 3/3) | No openly licensed English | The Semak, with its glosses. |
| Sefer HaParnas (glosses) | `Haggahot of Radal on Sefer HaParnas`, `Publisher's Haggahot on Sefer HaParnas` | **Missing** | Open Hebrew for 2 of 2 titles. Most common: Sefer ha-Parnas, Vilna, 1891 (Public Domain, 2/2) | No openly licensed English |  |
| Sefer HaMitzvot (Rambam, and its commentaries) | 6 titles, e.g. `Sefer HaMitzvot`, `Hasagot HaRamban on Sefer HaMitzvot` | **Missing** | Open Hebrew for 5 of 6 titles. Most common: Sefer HaMitzvot, Warsaw 1883 (Public Domain, 5/6); Sefer HaMitzvot, Warsaw 1883 new (Public Domain, 1/6) | No openly licensed English | The Rambam's count of the mitzvot, with the Ramban's comments and others. |
| Mishneh Torah (commentaries) | 1847 titles, e.g. `Annotations of Maharatz Chajes on Mishneh Torah, Foundations of the Torah`, `Annotations of Maharatz Chajes on Mishneh Torah, Human Dispositions` | **Missing** | Open Hebrew for 1,590 of 1,847 titles. Most common: Friedberg Edition (Public Domain, 1,435 titles); Warsaw, 1881 (Public Domain, 82) | Mishnah Torah, Yod ha-hazakah, trans. by Simon Glazer, 1927 (Public Domain, 5/1847); responsum from rabbi Golinkin (license unknown) — a Conservative responsum; not listed in excluded.yaml | A very large set (Kesef Mishneh, Maggid Mishneh, Lechem Mishneh, Raavad and many more). Most are Friedberg Edition, Public Domain. |
| Toafot Re'em | `Toafot Re'em` | **Missing** | Sefer Yereim HaShalem, Vilna, 1892-1901 (Public Domain) | No openly licensed English |  |
| Shulchan Aruch (commentaries) | 70 titles, e.g. `Ateret Zekenim on Shulchan Arukh, Orach Chayim`, `Ba'er Hetev on Shulchan Arukh, Orach Chayim` | **Partly**: 6 of 70 in testing library; 64 missing (Ateret Zekenim on Shulchan Arukh, Orach Chayim, Ba'er Hetev on Shulchan Arukh, Orach Chayim, Ba'er Hetev on Shulchan Arukh, Yoreh De'ah, Ba'er Hetev on Shulchan Arukh, Even HaEzer, Ba'er Hetev on Shulchan Arukh, Choshen Mishpat…) | Used: Shulhan Arukh, Hoshen ha-Mishpat, Lemberg, 1898 (Public Domain, 2/70); Kaf Hachayim, Orach Chayim vol. I-IV, Jerusalem 1910-1933 (Public Domain, 1/70); Kaf Hachayim, Orach Chayim vol. V-VIII, Jerusalem 1910-1933 (Public Domain, 1/70); +3 more versions | Hadar Egalitarianism Tshuva (license unknown) — from Hadar (an egalitarian yeshiva); not listed in excluded.yaml | We have 6 of 70: Mishnah Berurah, Kaf HaChayim (2), Ketzot HaChoshen, Netivot HaMishpat (2). Missing: Taz, Magen Avraham, Shach, Be'er Heitev, Pitchei Teshuvah and the rest, mostly Public Domain Lemberg printings. English on Sefaria includes a Hadar responsum, not barred. |
| Tur (commentaries) | 5 titles, e.g. `Bach`, `Beit Yosef` | **Missing** | Open Hebrew for 5 of 5 titles. Most common: Tur Choshen Mishpat: Vilna, 1923 (Public Domain, 5/5); Tur Even HaEzer, Vilna, 1923 (Public Domain, 5/5) | No openly licensed English | Bach, Beit Yosef, Darkhei Moshe, Drisha, Prisha (Vilna 1923, Public Domain). |

### Commentaries on Midrash

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Buber footnotes | `Buber footnotes on Midrash Mishlei` | **Missing** | None with an open license (e.g. מדרש משלי - בובר, license unknown) | No openly licensed English | Solomon Buber's notes. License unknown. |
| Gra (on Seder Olam Rabbah) | `Vilna Gaon on Seder Olam Rabbah` | **Missing** | Seder Olam, Warsaw 1904 (Public Domain) | No openly licensed English |  |
| Meir Ayin | `Meir Ayin on Seder Olam Rabbah` | **Missing** | Seder Olam, Warsaw 1904 (Public Domain) | No openly licensed English | Sefaria attributes it to Yerucham Meir Leiner (about 1900). |
| Notes and Corrections on Midrash Aggadah | `Notes and Corrections on Midrash Aggadah` | **Missing** | Midrash Aggadah, ed. Buber, Vienna, 1894. (Public Domain) | No openly licensed English | Solomon Buber, Vienna 1894. |
| Yaakov Emden (on Seder Olam Rabbah) | `Yaakov Emden on Seder Olam Rabbah` | **Missing** | Seder Olam, Warsaw 1904 (Public Domain) | No openly licensed English |  |

### Commentaries on Kabbalah

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Gra (on Sefer Yetzirah) | `HaGra on Sefer Yetzirah Gra Version` | **Missing** | Sefer Yetzirah, Warsaw 1884 (Public Domain) | No openly licensed English |  |
| Pri Yitzhak | `Pri Yitzhak on Sefer Yetzirah Gra Version` | **Missing** | Sefer Yetzirah, Warsaw 1884 (Public Domain) | No openly licensed English |  |
| Ramban (on Sefer Yetzirah) | `Ramban on Sefer Yetzirah` | **Missing** | Ramban on Sefer Yetzirah, Warsaw 1884 (Public Domain) | No openly licensed English | Attributed to the Ramban (board to confirm). |
| Saadia Gaon (on Sefer Yetzirah) | `Rasag on Sefer Yetzirah` | **Missing** | Rasage on Sefer Yetzirah, Warsaw 1884 (Public Domain) | No openly licensed English | Rav Saadia Gaon. |

### Commentaries on Chasidut

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| Mekor Mayim Chayim on Baal Shem Tov | `Mekor Mayim Chayim on Baal Shem Tov` | **Missing** | Sefer Baal Shem Tov. Lodz, 1938 (Public Domain) | No openly licensed English |  |

### Commentaries on the minor tractates

| Mercava's name | Sefaria title | Ours | Hebrew on Sefaria (open license) | English on Sefaria | Note for the board |
|---|---|---|---|---|---|
| All 16 (Binyan Yehoshua, Commentary of Chida, Gra's Nuschah, Haggahot, Haggahot and Marei Mekomot, Haggahot R' Yeshaya Berlin, Haggahot Ya'avetz, Kisse Rahamim, Lev Hachamim, Mesorat HaShas, Mitzpeh Etan, Nahalat Yaakov, New Nuschah, Nuschaot from Manuscripts, Rishon Letzion, Tumat Yesharim) | 48 titles, e.g. `Binyan Yehoshua on Avot D'Rabbi Natan`, `Kisse Rahamim on Tractate Kallah` | **Missing** | Open Hebrew for all 48 titles: Talmud Bavli, Vilna 1883 ed. (Public Domain); Kisse Rahamim also Livorno, 1803 (Public Domain) | No openly licensed English | 'New Nuschah' and 'Nuschaot from Manuscripts' are text versions printed in the Vilna Shas, not academic editions. |

## 3. Questions for the board

Each question changes what we add. Where a fact below is uncertain, it is marked as a question
or "(to confirm)".

### Kabbalah

1. **How should RabAI treat Kabbalah?** Mercava has a whole Kabbalah shelf (Sefer Yetzirah,
   Sefer HaBahir, Tikkunei Zohar, Heikhalot Rabbati, Gikatilla, Rabbi Yosef Karo's *Maggid
   Meisharim*, the Ramchal, Rabbi Chaim Vital's *Sha'ar HaGilgulim* and more). Our canon has
   none, and the founding spec says nothing about Kabbalah. Options: quote it like any other
   source; describe it only ("the kabbalists teach…") and send deeper questions to a rav; or
   leave it out. Related works already near our canon: *Tomer Devorah* (the Ramak) and the
   Ramchal's *Derekh Hashem*, which we have.
2. **The Zohar itself** isn't on Mercava's list as transcribed, and Sefaria has no openly
   licensed Hebrew of it (the Sulam edition and the others are marked "unknown"). The only
   open English is Soncino's 1933 translation (Public Domain, partial). If the board wants
   the Zohar, it needs a license or another source.
3. ***Mitpachat Sefarim*** is Rabbi Yaakov Emden's attack on the Sabbatean movement, and in
   it he disputes how old parts of the Zohar are. Should RabAI have it, and if so how should it
   present that view?

### Debated authors and works

4. **The Ralbag** (Rabbi Levi ben Gershom): his Tanach commentary is printed in Mikraot
   Gedolot, but later authorities sharply criticized some of his philosophy. Add his
   commentaries (17 titles, Public Domain)? With a note when his view is a minority one?
5. **Rabbi Yosef ibn Yahya** (Bologna, 1538): his writings are described as controversial,
   but we couldn't check the details here. Is his commentary suitable?
6. ***Teshuvot Min HaShamayim***, answers a Tosafist recorded receiving in dreams: how should
   RabAI present them?
7. **The Radziner Rebbe's tekhelet** (*Ein HaTekhelet*, *Ptil Tekhelet*): his identification
   of the tekhelet dye was not accepted by many authorities. Is this an "edge" for open
   question 3 of the founding spec?

### Works whose author is uncertain

8. ***Sefer HaYashar*** (the mussar book) is sometimes attributed to Rabbeinu Tam; many
   consider the author unknown. ***Tzava'at HaRivash*** collects teachings of the Baal Shem
   Tov and the Maggid of Mezeritch through students. ***Sefer HaBahir*** is traditionally
   attributed to Rabbi Nechunya ben HaKanah. The Ramban's commentary on Sefer Yetzirah and
   *Issur VeHeter LeRashi* are attributed. Should RabAI say "attributed to" in such cases?

### Scholars' editions of Torah texts

9. **Texts that exist on Sefaria only in a scholar's edition.** The canon already excludes
   Finkelstein's Sifre (Jewish Theological Seminary). Similar cases on Mercava's list:
   - *Pesikta DeRav Kahana*: only Dov Mandelbaum's edition (Jewish Theological Seminary,
     1962/1987, CC-BY).
   - *Avot DeRabbi Natan*, second version (Recension B): only Solomon Schechter's 1887
     edition. Schechter later led the Jewish Theological Seminary. (The first version is
     also in the Vilna Shas.)
   - *Radak on Chronicles*: a critical edition by Yitzhak Berger (CC-BY-NC).
   - *Rambam's Introduction to Seder Tahorot*: only "Commentarie de Maimonide sur la
     Mischnah Seder Tohorot, Berlin 1889", which looks like a scholar's edition (to confirm).
   - *Saadia Gaon on Genesis*: a 1984 New York edition (CC-BY).
   - Not on Mercava's list but on Sefaria: Saul Lieberman's Tosefta and *Tosefta Kifshutah*
     (Jewish Theological Seminary).

   Rule options: allow the text but not the editor's notes; allow only when no traditional
   edition exists; or exclude.
10. **Solomon Buber's editions of midrash.** Buber was a 19th-century scholar who edited
    midrash from manuscripts. We already use his Midrash Tanchuma in the testing library.
    Mercava also has his notes (*Buber footnotes on Midrash Mishlei*, *Notes and Corrections
    on Midrash Aggadah*) and editions of *Midrash Lekach Tov*. Allow his texts? His notes?

### Translations

11. **Translations by non-Orthodox translators** (founding spec, open question 2). These sit
    on Sefaria beside Mercava's titles and are **not** listed in `canon/excluded.yaml`, either
    because no entry covers them or because an entry covers them in spirit but not by name:
    - Rabbi Seymour J. Cohen (Conservative): *Sefer HaYashar* (1973), and a second version of
      his *Orchot Tzaddikim* ("with corrections"). Only his 1982 Orchot Tzaddikim is listed.
    - Hebrew Union College (Reform) translations: Garten's *Hilchot Kidushin* (Shulchan
      Arukh) and Roman's *Hupah veKiddushin* (Aruch HaShulchan). Only Brahms's is listed.
    - Isidor Kalisch (a Reform rabbi): *Sefer Yetzirah*, 1877.
    - *Siddur Sim Shalom* (Conservative) under Siddur Ashkenaz.
    - A responsum by Rabbi Golinkin (Conservative) and a Hadar responsum on egalitarianism,
      under the Mishneh Torah and Shulchan Arukh commentaries; Rabbi Ethan Tucker's (Hadar)
      Tractate Gerim.
    - Joseph B. Meszler's *Gifts for the Poor* (Mishneh Torah). As far as we know he is a
      Reform rabbi (to confirm).
    - "McCaul Translation" of Radak, probably by Alexander McCaul, a Christian missionary (to
      confirm).
    - Academics: Morton Smith and Gershom Scholem (*Heikhalot Rabbati*), James Montgomery
      (*Tractate Kutim*), Solomon Zeitlin (*Megillat Ta'anit*), Jacob Lauterbach (Mekhilta),
      Jonathan Brumberg-Kraus (*Shulchan Shel Arba*), Yitzhak Berger (Radak on Chronicles).
    - Israel Zangwill, a writer, for *Keter Malkhut*; Solomon Schechter for the Ramban's
      letter to his son.

    Proposed for the maintainer: list these in `excluded.yaml` by name, so the intent is
    written down. Our library builder only uses versions the canon lists, so none of them can
    enter by accident today.
12. **Translators whose background we don't know.** Each would need the board's view before
    its English is used: Gorfinkle (Eight Chapters; Pirkei Avot), Hermann Gollancz (Shekel
    HaKodesh, Yesod HaYirah), Sholom Alchanan Singer (Sefer Chasidim), Chaim N. Denburg
    (Shulchan Arukh, 1955), Reuven Brauner (Orchot Chaim, Mishneh Torah sections), Samuel A.
    Berman (Midrash Tanchuma), Leonard Moskowitz (Nefesh HaChayim), Simon Hurwitz (Maharshal),
    Irving Agus (Maharam), Aharon Varady and Rabbi Natan Slifkin (Perek Shirah), David Kasher
    (Avot DeRabbi Natan), Sola and Raphall (Mishnah, 1843), "Rabbi Irving Greenberg with Rabbi
    Justin Pines" (Ohr Yisrael; we don't know which Irving Greenberg this is), David Solomon
    (Tikkunei Zohar), Jen Taylor Friedman (Keset HaSofer), the early English Haggadah
    translators, and Simeon Singer's *Standard Prayer Book* (1915). Translators the canon
    already treats as Orthodox (Metsudah's Rabbi Avrohom Davis, Rabbi Shraga Silverstein,
    Rabbi Eliyahu Munk, Rabbi Francis Nataf, Soncino) cover only a few of Mercava's titles.
    The translations by Rabbis Amiram and Yehudah Markel (2020–2023; Chabad, as far as we
    know) and Rabbi Aryeh Kaplan's *Rabbi Nachman's Wisdom* are also open, and not yet in the
    canon.
13. **Anonymous and machine translations.** The "Sefaria Responsa Anthology" and "The Sefaria
    Midrash Rabbah, 2022" name no translator (the canon holds the second for review).
    Wikisource translations (Tales of Rabbi Nachman, Iggeret HaGra) also name none. Several
    titles have only machine English ("Google Translate", "ChatGPT", "translated using AI").
    We suggest treating unnamed and machine translations like the barred community
    translation, and listing them in `excluded.yaml`.

### Modern and copyrighted works

14. **Works on Mercava's list that Sefaria doesn't have** (most likely under copyright):
    *Kitzur Shulchan Aruch Yalkut Yosef* and *Otzar Dinim LaIsha VeLaBat* (Rabbi Yitzchak
    Yosef, as far as we know), *Siddur Tehilat Hashem* (the Chabad siddur), *Kochvei Ohr*
    (Rabbi Yitzchak Blazer, as far as we know), *Shuvah Yisrael*, the Aleppo Haggadah, *Ta'amei
    HaMikra*, *Hakdamah LaZohar*, and one entry under Rabbi Yom Tov Lipmann Heller we couldn't
    identify. Which of these are worth asking the publishers for (`docs/permissions-plan.md`)?
15. **Modern works that are openly licensed**, each needing approval as an edition: *B'Mareh
    HaBazak* (Eretz Hemdah, CC-BY), *Piskei Challah* (Oraita edition, CC0), *Motar Kinnim*
    (Modiin 2017, CC-BY), *Kav HaYashar* (Metsudah 2007, CC-BY), *Hadran for Tanakh* (Rabbi
    Yona Reiss, license unknown).

### For the maintainer (licensing, not Torah content)

16. **Public-domain labels on recent printings.** Sefaria marks some printings under 95 years
    old as Public Domain: *Issur VeHeter LeRashi* (Berlin 1936), *Yesod Mora* (Jerusalem 1931),
    *Ba'al Shem Tov* (Lodz 1938), *Beur Reuven* (New York 1955), *Petach Einayim* (Jerusalem
    1959), *Lechem Shamayim* (Jerusalem 1978), *Arvei Nachal* (Jerusalem 1991), and the
    Machon Yerushalayim Maharal editions with Rabbi Hartman's notes (1997–2023), which we
    already use for testing. Sefaria's label is enough for private testing; before any public
    use, it may be worth confirming.
17. **Unknown licenses that block whole works**: Radak on Nach, four books of Midrash Rabbah,
    the Ra'avad's glosses and the Maggid Mishneh on the Mishneh Torah, Rav Kook's *Orot
    HaTeshuvah* and *Olat Re'iyah*, the Chida's *Chomat Anakh*, the Alshich's *Marot
    HaTzoveot*, the Zohar. For a file that copies an old printing, the canon's age rule
    (`printed:`) can bring it in once someone confirms which printing it copies.

## 4. What we have that Mercava's list doesn't show

All of these are in our testing library (406 titles) and aren't on Mercava's list as
transcribed. Mercava may show some of them beside its texts (Rashi and Tosafot on the Talmud
almost certainly).

| Area | What we have | Titles |
|---|---|---|
| Talmud | Rashi and Tosafot on the Bavli | 72 |
| Talmud | Rabbi Akiva Eiger, Rashash | 62 |
| Talmud | Meiri (Eruvin), Ran (Nedarim) | 2 |
| Talmud | Bavli Tamid | 1 |
| Talmud | Ohr LaYesharim on the Yerushalmi | 12 |
| Mishnah | Bartenura | 63 |
| Tanach | Targum Onkelos, Targum Yonatan on Nevi'im | 26 |
| Tanach | Rashi on all of Tanach | 39 |
| Tanach | Ramban, Sforno, Or HaChaim, Kli Yakar, Ha'amek Davar on the Torah | 25 |
| Tanach | Metzudat David and Metzudat Zion | 62 |
| Tanach | Meshekh Chokhmah; Rav Hirsch on the Torah (English) | 2 |
| Midrash | Mekhilta DeRabbi Yishmael, Sifra, Sifrei Bamidbar, Sifrei Devarim | 4 |
| Halacha | Chafetz Chaim and Shemirat HaLashon, Chokhmat Adam, Ben Ish Hai | 4 |
| Halacha | Peninei Halakhah | 19 |
| Thought | Duties of the Heart, Derekh Hashem, the Guide for the Perplexed | 3 |
| Thought | Rabbi Sacks, *Covenant and Conversation* (English) | 5 |
| Chasidut | Sefat Emet, Kedushat Levi, Noam Elimelekh | 3 |
| Reference | Sefer HeArukh, Machberet Menachem | 2 |
| Dictionaries | Jastrow (word meanings only), Radak's Sefer HaShorashim | 2 |

## 5. Suggested next additions

All of these are **suggestions for the board**. None is approved, and each edition still needs
the board's approval before any public use. English is suggested only where the canon already
treats the translator as Orthodox; otherwise it says "Hebrew only for now".

### First: easy fixes to works already in our canon

These change a version list or a title pattern in `canon/canon.yaml`. No new work is added.

| Work in canon | What to change | Sefaria titles gained | Hebrew version (license) |
|---|---|---|---|
| `acharonim-shas-classic` (Penei Yehoshua) | add the version | 16 `Penei Yehoshua on …` | Penei Yehoshua, Warsaw 1861 (Public Domain) |
| `malbim-tanakh` | add the version | 7: `Malbim on II Samuel`, `I Kings`, `II Kings`, `Jeremiah`, `Ezekiel`, `Psalms`, `Esther` | On Your Way (Public Domain) |
| `ibn-ezra-tanakh` | add 5 versions | `Ibn Ezra on Isaiah`, `Song of Songs`, `Lamentations`, `Ecclesiastes`, `Esther` | Ibn Ezra on Isaiah, by M. Friedlander; Society of Hebrew Literature, London 1877; Ibn Ezra's commentary on the Canticles; Ibn Ezra on Lamentations -- Wikisource; Wikisource (Ecclesiastes); Kol Sason, Krotoschin, 1840 (all Public Domain) |
| `maharal` | fix the pattern ('Derekh Chaim' → `Derekh Chayyim`, 'Or Chadash' → `Ohr Chadash`), add 3 titles and their versions | `Derekh Chayyim`, `Ohr Chadash`, `Derashat Shabbat HaGadol`, `Derush al HaTorah`, `Drashot Maharal` | the Machon Yerushalayim editions with Rabbi Hartman's notes, and OYW for Drashot Maharal (Public Domain) |
| `tosafot-yom-tov` | widen the pattern | `Tosefot Yom Tov on Mishnah Peah`, `Tosafot Yom Tov Introduction to the Mishnah` | Mishnah, ed. Romm, Vilna 1913 (Public Domain) |
| `rambam-perush-hamishnah` | widen the pattern | `Rambam Introduction to the Mishnah`, `Rambam Introduction to Seder Kodashim` (and Seder Tahorot, see question 9) | Vilna Edition / Vilna edition (Public Domain). English for the Introduction: Rabbi Francis Nataf, 2017 (CC0) |
| `sefer-hachinuch` | give the Hebrew edition a version | `Sefer HaChinukh` (now English only) | Minchat Chinuch, Vilna, 1923. (Public Domain) |
| `rav-hirsch` | give the Nineteen Letters a Hebrew version | `Nineteen Letters` (now English only) | Iggerot Tzfun, Vilna 1890 (Public Domain) |
| `siddur` | add the version | `Siddur Edot HaMizrach` | Torat Emet 357 (Public Domain) |
| `rav-kook` | add the version | `Orot HaTorah` | Orot HaTorah -- Wikisource (CC-BY-SA) |
| `radak` | give the Hebrew edition versions | `Radak on Psalms`, and Hebrew for `Radak on Genesis` (now English only) | Derekh Mesilah, Furth 1843 and The Psalms with Qimchi's Longer Commentary, Leipzig, 1883; Presburg : A. Schmid, 1842 and Ha-Techiyah vol. ii, Berlin, 1857 (all Public Domain) |

Together: about 40 more titles, plus Hebrew for 3 titles we have only in English. Before
editing, check each version against the library planner's output; a generic version name such
as "Wikisource" may also match files on other titles of the same work.

### Then, ranked

Ranked by how central the work is to learning, how clean its Hebrew license is, and how many
titles it brings. All are Hebrew only for now unless English is named.

| Rank | Addition | Exact Sefaria titles | Hebrew version (license) | English |
|---|---|---|---|---|
| 1 | **Tosefta** | 61 titles, `Tosefta Berakhot` through `Tosefta Oktsin` | one Mechon Mamre file per tractate (Public Domain) | Hebrew only for now |
| 2 | **Shulchan Arukh commentaries** | `Turei Zahav on Shulchan Arukh, …` (4), `Siftei Kohen on Shulchan Arukh, …` (2), `Magen Avraham`, `Beit Shmuel`, `Chelkat Mechokek`, `Ba'er Hetev on Shulchan Arukh, …` (4), `Pitchei Teshuva on Shulchan Arukh, …` (3), `Sha'arei Teshuvah on Shulchan Arukh, Orach Chayim`, `Be'er HaGolah on …` (4), `Beur HaGra on …` (4), `Rabbi Akiva Eiger on Shulchan Arukh, …` (4), `Biur Halacha`, `Machatzit HaShekel on Orach Chayim` | the Lemberg printings of 1886–1898 (Maginei Eretz, Ashlei Ravrevei, Apei Ravrevei, Shulhan Arukh Hoshen ha-Mishpat), Vilna 1876, Magen Avraham, Torat Emet 357, Biur Halacha (all Public Domain) | Hebrew only for now |
| 3 | **Tur commentaries** | `Beit Yosef`, `Bach`, `Darkhei Moshe`, `Prisha`, `Drisha` | the four Tur files, e.g. Tur Orach Chaim, Vilna, 1923 and Tur Choshen Mishpat: Vilna, 1923 (Public Domain) | Hebrew only for now |
| 4 | **Mishneh Torah commentaries**, the main ones | `Kessef Mishneh on Mishneh Torah, …` (83), `Mishneh LaMelech on …` (82), `Migdal Oz on …` (52), `Lechem Mishneh on …` (57, about half open), `Ohr Sameach on …` (84), `Kiryat Sefer on …` (82) | Torat Emet 363, Friedberg Edition, Warsaw, 1881 (Public Domain). The Ra'avad's glosses and the Maggid Mishneh are mostly "unknown" (question 17) | Hebrew only for now |
| 5 | **Talmud commentaries printed in or beside the Vilna Shas** | `Rabbeinu Chananel on …` (18), `Shita Mekubetzet on …` (9), `Rav Nissim Gaon on …` (3), `Maharam Schiff on …` (12), `Chokhmat Shlomo on …` (19), `Yad Ramah on Sanhedrin`; on the Rosh: `Korban Netanel on …` (13), `Maadaney Yom Tov on …` (3), `Divrey Chamudot on …` (3), `Pilpula Charifta on …` (6), `Tiferet Shmuel on …` (8) | Vilna Edition; Vilna Ed (Shita Mekubetzet); Yad Ramah Sanhedrin, Warsaw 1895 ed. (all Public Domain; a few tractates' files have no license) | Hebrew only for now |
| 6 | **Minor tractates** and their commentaries | `Avot DeRabbi Natan`, `Tractate Soferim`, `Tractate Semachot`, `Tractate Kallah`, `Tractate Kallah Rabbati`, `Tractate Derekh Eretz Rabbah`, `Tractate Derekh Eretz Zuta`, `Tractate Avadim`, `Tractate Gerim`, `Tractate Kutim`, `Tractate Mezuzah`, `Tractate Sefer Torah`, `Tractate Tefillin`, `Tractate Tzitzit`; 48 commentary titles (Binyan Yehoshua, Nahalat Yaakov, Haggahot HaGra and others) | Talmud Bavli, Vilna 1883 ed. (Public Domain) | *The Minor Tractates of the Talmud*, trans. A. Cohen, London: Soncino Press, 1965 (CC-BY). The canon treats Soncino's Talmud as Orthodox; the board to confirm this volume |
| 7 | **Mishnah commentaries in the Vilna Mishnah** | `Melekhet Shelomoh on Mishnah …` (63), `Rash MiShantz on Mishnah …` (21), `R' Shemaiah on Mishnah Middot`, `Rashi on Avot`, `Rabbeinu Yonah on Pirkei Avot`, `Midrash Shmuel on Avot`, `Magen Avot on Avot`, `Gra on Pirkei Avot`, `Zeroa Yamin` | Mishnah, ed. Romm, Vilna 1913; Talmud Bavli, Vilna, 1880.; Vilna Edition; Pirkei Avot, Berlin, 1848; Midrash Shmuel, Warsaw, 1876; Magen Avot, Leipzig 1855; Pirkei Avot with commentary of the Vilna Gaon, Vilna 1836; Petah Einayim, Livorno, 1790 (all Public Domain) | Hebrew only for now |
| 8 | **Rishonim on the Torah and commentaries on Rashi** | `Siftei Chakhamim`, `Mizrachi`, `Tur HaArokh`, `Rabbeinu Chananel on Genesis` … `Deuteronomy`, `Bekhor Shor`, `Riva on Torah`, `Bartenura on Torah` | Sifsei Chachomim Chumash, Metsudah Publications, 2009 (CC-BY); Four commentaries on Rashi. Warsaw, 1862; Perush al ha-Torah, Hanover, 1838; Migdal Chananel, Berlin, 1876; Bekhor Shor, Breslau, 1890; Rabotenu Ba'ale ha-Tosafot, Warsaw, 1876 (Public Domain) | Siftei Chakhamim: Metsudah 2009 (CC-BY). Tur HaArokh and Rabbeinu Chananel: Rabbi Eliyahu Munk (CC-BY). Others Hebrew only for now |
| 9 | **Acharonim on the Torah and Tanach** | `Torah Temimah on Torah` and 6 more, `HaKtav VeHaKabalah`, `Aderet Eliyahu`, `Beit HaLevi on Torah`, `Minchat Shai on …` (35), `Malbim Beur Hamilot on …` (16), `Mekhir Yayin on Esther`, `Avi Ezer`, `Tevat Gome` | Torah Temimah, Vilna, 1904; HaKtav VeHaKabbalah, Frankfurt 1880; Aderet Eliyahu, Halberstadt, 1860; Beit Halevi al HaTorah, Warsaw, 1884; Minchat Shai; On Your Way and Wikisource (Beur Hamilot); Mechir Yayin, Warsaw 1880 (all Public Domain) | Hebrew only for now |
| 10 | **Midrash** | `Midrash Tehillim`, `Pesikta Rabbati`, `Tanna DeBei Eliyahu Rabbah` (and Zuta), `Seder Olam Rabbah` with `Vilna Gaon on Seder Olam Rabbah` and `Yaakov Emden on Seder Olam Rabbah`, `Yalkut Shimoni on Torah`, `Midrash Lekach Tov` (6) | OYW (Public Domain); Seder Olam, Warsaw 1904 (Public Domain); Torat Emet (CC-BY-NC, Yalkut Shimoni); Midrash Lekach Tov on Torah, Vilna 1884 and others (Public Domain) | Hebrew only for now |
| 11 | **Halacha classics** | `Sefer Mitzvot Gadol`, `Sefer Mitzvot Katan` (with 2 glosses), `Sefer HaMitzvot` (with `Hasagot HaRamban on Sefer HaMitzvot` and 4 more), `Sheiltot d'Rav Achai Gaon` (with `Haamek Sheilah`), `Kol Bo`, `Mateh Efrayim`, `Keset HaSofer`, `Hilkhot Talmud Torah`, `Maaseh Rav`, `Simlah Chadashah`, `Shulchan Shel Arba`, `Sefer Chasidim` | Munkatch, 1901; Sefer Mitzvot Katan, Kopys, 1820; Sefer HaMitzvot, Warsaw 1883; Sheiltot d'Rav Achai Gaon; Vilna, 1861; Kol Bo 1547 Venice; Mateh Efrayim, Warsaw, 1906; Keset Hasofer, Ungvar 1871; Warsaw, 1891; Shulchan Shel Arba, Warsaw 1878; Sefer Chassidim, Zhitomir, 1857 (Public Domain); Wikisource (CC-BY-SA) for Hilkhot Talmud Torah and Maaseh Rav | Hebrew only for now |
| 12 | **Responsa** | `Noda BiYehudah I`, `Noda BiYehudah II`, `Teshuvot HaRivash`, `Teshuvot haRashba part I` and 5 more, `Teshuvot HaRadbaz Volume 1` … `6`, `Teshuvot Maharik`, `Teshuvot Maharil`, `Teshuvot HaRi Migash`, `Sefer HaTashbetz`, `Havot Yair`, `Teshuvot Maharam`, `Teshuvot Maharshal`, `Teshuvot HaGeonim`, `Toratan shel Rishonim`, `Chazeh Hatenufa` | Noda BeYehuda Warsaw 1880; Rivash Responsa, Vilna, 1879; Warsaw, 1868 (Rashba); Teshuvot HaRadbaz, Warsaw 1882; Responsa Maharik, Warsaw 1884; She'elot uTeshuvot Maharil. Krakow, 1881; R. Yosef Ibn Migash Responsa, Warsaw, 1870; Sefer ha-tashbetz, Lemberg, 1891; Chavot Yair, Lemberg, 1896; Sefer She'elot uTeshuvot, Kremonah, 1557; Teshuvot Maharshal, Fürth, 1768; Teshuvot HaGeonim, Nathan Coronel, 1871; Toratan shel Rishonim, Frankfurt am Main, 1881; Chaim Shaal, Lemberg, 1886 (all Public Domain) | Hebrew only for now |
| 13 | **Mussar** | `Ma'amar Torat HaBayit`, `Tomer Devorah`, `Pele Yoetz`, `Orchot Chaim L'HaRosh`, `Iggeret HaRamban`, `Iggeret HaGra`, `Kav HaYashar`, `Shevet Musar`, `Kad HaKemach`, `Kitzur Sefer Haredim of Rabbi Elazar Azcari`, `Ya'arot Devash I`, `Ya'arot Devash II` | Piotrkow, 1907; Torat Emet; Orchot Chaim -- TE; Iggeret HaGra -- Wikisource; Shevet Musar, Fiyorda, 1761; Kad HaKemach, Warsaw 1872; Józefów, 1866 (all Public Domain); HeWiki (CC-BY-SA); Kav HaYashar, Metsudah Publications, 2007 (CC-BY) | Kav HaYashar: Metsudah 2007 (CC-BY). Others Hebrew only for now. (Also: Rabbi Yosef Sebag's *Path of the Just* for Mesillat Yesharim, CC-BY, awaits the board) |
| 14 | **Chasidut** | Rav Tzadok's 14 works (`Peri Tzadik`, `Tzidkat HaTzadik`, `Resisei Layla` and the rest), `Bnei Yissaschar`, `Me'or Einayim`, `Maor VaShemesh`, `Toldot Yaakov Yosef`, `Maggid Devarav leYaakov`, `Keter Shem Tov`, `Chiddushei HaRim on Torah`, `Yismach Moshe`, `Darkhei Yesharim`, `Peri HaAretz`, `Sippurei Maasiyot`, `Chayei Moharan`, `Shivchei HaBesht`, `Tzava'at HaRivash` (see question 8) | Pri Tzaddik, Lublin, 1901 and the other Public Domain files; Bnei Yisaschar, Piotrkow 1883; Me'or Einayim -- OYW; Maor Vashemesh, Breslau, 1842; Toldot Yaakov Yosef, Korets, 1780; Maggid Devarav leYa'akov, Koretz, 1781; Keter Shem Tov, Zalkevo 1794-5; Chidushei HaRim veGur Aryeh, Bilgoray, 1912; Yismach Moshe, Sighet, 1898; Darkhei Yesharim, Warsaw 1913.; Pri Haaretz, Kopyst 1814; OYW; Shivchei HaBesht, Kopyst 1815; Warsaw, 1913 (all Public Domain) | Hebrew only for now (the Markels' *Tzava'at HaRivash*, CC-BY, awaits the board) |
| 15 | **Liturgy** | `Pesach Haggadah`, `Selichot Nusach Lita Linear`, `Selichot Edot HaMizrach`, `Selichot Nusach Ashkenaz Lita`, `Selichot Nusach Polin`, `Kinnot for Tisha B'Av (Ashkenaz)`, `Lekha Dodi`, `Yedid Nefesh`, `Shalom Aleichem`, `Perek Shirah`, `Seder Ma'amadot` | Pesach Haggadah (Public Domain); The Metsudah Selichos: Hebrew text, Metsudah Publications, 1986 (CC-BY); Selichot Edot HaMizrach - Torat Emet (Public Domain); Wikisource and other CC-BY-SA versions (Selichot Ashkenaz and Polin, Kinnot, Lekha Dodi, Yedid Nefesh, Shalom Aleichem); Torat Emet 357 (Public Domain, Perek Shirah); סדר מעמדות (Public Domain) | Selichot Nusach Lita: Metsudah, Rabbi Avrohom Davis, 1986 (CC-BY). Selichot Edot HaMizrach: Rabbi Francis Nataf (CC0). Others Hebrew only for now |
| 16 | **Jewish thought and reference** | `Eight Chapters`, `Minchat Kenaot`, `Treatise on Logic`, `Letter to the Ten Lost Tribes of Israel`, `Sefat Yeter`, `Derashot HaRan`, `Yesod Mora VeSod HaTorah` | Wikisource (Public Domain); Minhat Kenaot, Pressburg, 1838.; Milot Higayon, Warsaw, 1928 (CC-BY-SA); Igeret haSheluha meHakme veRabane haAskenazim, Amsterdam 1831; Sefer Sefat Yeter, Warsaw 1895 (Public Domain); Yesod Mora (Jerusalem 1931, see question 16). Derashot HaRan's Hebrew is "unknown" | Derashot HaRan: Rabbi Shraga Silverstein (CC-BY), a translator the canon already uses. Others Hebrew only for now |
| 17 | **Kabbalah** | Mercava's 16 entries | Public Domain for most (see the Kabbalah table) | Only after the board answers questions 1 to 3 |

Not ranked, because they wait on the board's answers above: the Ralbag (question 4), Yosef ibn
Yahya (5), Teshuvot Min HaShamayim (6), the tekhelet books (7), Pesikta DeRav Kahana and other
scholars' editions (9 and 10), and the modern openly licensed works (15).
