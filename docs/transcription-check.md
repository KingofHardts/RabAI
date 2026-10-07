# Cross-check of two groups of texts in canon/canon.yaml

Prepared 2026-10-07, at the maintainer's request, to see how accurate two groups of digital
transcriptions are. Everything below was measured on Sefaria's public export
(storage.googleapis.com/sefaria-export). The measuring scripts and downloads stayed on the session's
computer and are not in the repo. The recommended notes were then written into `canon/canon.yaml`
for each edition, and Recanati on the Torah was marked `orthodox: review`. Nothing is approved; the
board decides.

**Later the same day:** every angle-bracket addition in Recanati turned out to be a translation
set right after the Aramaic it translates, so the library build now removes them
(`strip_brackets: angle` in the canon). Only well-formed brackets are removed, and the 30 of its
1,909 passages where a bracket is nested or never closed are left out, so the editor's words are
never quoted as Recanati's. The 23 places that still say "תרגום" are Recanati's own references to
the Targum. Recanati is back in the testing library (`orthodox: true`, proposed).

## The short version (for the maintainer)

**Kabbalah works transcribed by hebrew.grimoar.cz.** For seven of the eight works the transcriptions
look like careful copies of the traditional books, and nothing we found argues for pulling them. But
they could **not** be compared word by word: Sefaria has no second full copy of any of them, and the
sites that might have one (Hebrew Wikisource, HebrewBooks, Dicta, Sefaria's own website, and
grimoar.cz itself) were blocked from this machine. What we could check:

- *Pardes Rimonim*: all 32 gates are there, and the number of chapters in each gate matches the table
  of contents printed in the Koretz 1780 edition (288 chapters against the 287 that index counts).
- *Sha'ar HaKavanot*: Rabbi Shmuel Vital's introduction also appears in the Jerusalem 1872 printing
  of Sha'ar HaMitzvot. The two agree in about 97% of the words once the printing's abbreviations
  are written out (the transcription spells out "ס'" as "ספר", "הספרי'" as "הספרים", and so on).
  About 1% are real word differences.
- *Sha'arei Kedushah*: Part 4 stops after its opening lines with the printer's note that this part
  was never printed, as in the traditional printed editions.
- The other works have all their expected parts (Kalach Pitchei Chochmah: 138 openings; Sha'arei
  Orah: introduction and ten gates; Chesed LeAvraham: seven "springs"; Etz Chaim: 50 gates;
  Or Ne'erav: seven parts).
- Their share of "words found nowhere else in Sefaria" (a rough typo test) is low, 0.17-0.41%, about
  the same as or lower than the Jerusalem printings Sefaria scanned.
- These copies appear to come from modern typeset editions rather than straight from the old
  printings: they write
  out abbreviations and add Bible and Zohar references in parentheses, and some add corrections in
  square brackets next to the printed word in round brackets. That is normal in today's Torah
  editions.

**The one exception is Recanati on the Torah.** About a fifth of its words (22%) are a **modern
Hebrew translation of the Zohar passages Recanati quotes**, inserted in angle brackets
("<תרגום ללשון הקדש ...>") 4,321 times, in 44 of the 54 portions. That is not Recanati's text, and
RabAI could quote it as if it were. **Recommendation: mark it "review".**

Small faults to know about: one section of *Sha'ar Ma'amarei Razal* appears twice (14 paragraphs,
chapters 1 and 3 of the Midrashim section), one passage of *Sha'ar HaKavanot* appears twice, and
there are scattered typos (for example "נעששו" for "נעשו", about 19 times in Etz Chaim's 344,000
words).

Where the hebrew.grimoar.cz texts come from: the site is the Hebrew section of grimoar.cz, a Czech
library of esoteric texts ("Hebrejská knihovna kabalistických textů"). Sefaria's records name only
the page on that site, never a printing, and we could not reach the site to see whether it names its
sources. The Or Ne'erav record oddly points to the publisher of an English translation (KTAV).

**Mishneh Torah commentaries from the Friedberg Edition (46 works).** Keep them all. Again there is
no second copy on Sefaria for any of the 46 (every title on Sefaria has exactly one Hebrew version),
so no word-by-word check was possible. Instead each comment's opening words were looked up in the
Rambam's text (and the Kessef Mishneh, Maggid Mishneh, Lechem Mishneh and Ra'avad) at the same
chapter and halakhah. The Friedberg works pass this test as often as the Torat Emet texts and the
Warsaw 1881 printing do (median 84% against 67-92%), so the comments sit where they belong. Their
"words found nowhere else" rate is low (median 0.14%; Torat Emet and Warsaw 1881: about 0.1%).

What the Friedberg Edition is: Sefaria's records say only "Friedberg Edition" ("מהדורת פרידברג"),
source fjms.genizah.org (the Friedberg Jewish Manuscript Society), with no notes, and **nothing about
Warsaw 1881 or manuscripts**. (In the canon, "Warsaw, 1881" is the separate scanned printing of
Mishneh LaMelech, not the Friedberg text.) Web search shows the Bar-Ilan Responsa Project listing
Rambam material "in the Friedberg edition, Jerusalem 2006", and a Hebrew encyclopedia describing
*Otzar Mefarshei HaRambam, Friedberg Edition* as a collection of about 200 commentaries on the
Rambam. We could not reach fjms.genizah.org to read its own description. In the texts themselves
we found **no sign that printed readings were replaced by manuscript readings**: where an editor
corrected a word, the printed word is usually kept in round brackets beside the correction in square
brackets, and this happens rarely (about 1,400 times in 11.6 million words; median 1 per 10,000
words). Square brackets that are common
in some works (Ben Aryeh, Teshuvah MeYirah, Nachal Eitan) are the authors' own asides, written in
the first person.

Small things to know: in Even HaAzel about 13% of paragraphs are repeated under neighbouring
halakhot (a comment on several halakhot is attached to each one); the Kurkus/Radbaz commentary has
about 2,150 editor's footnotes giving Talmud page numbers, which the library build already drops;
Ma'aseh Rokeach has 23 leftover typesetting codes ("@04", "@50"); four works have a title or two
whose license Sefaria lists as unknown, and those titles are already left out.

Also worth knowing: Sefaria has Friedberg copies of Kessef Mishneh (11 hilchot), Lechem Mishneh
(30 hilchot) and the Ra'avad (3 hilchot) for exactly the hilchot the Torat Emet copies lack, but
every one of those Friedberg files has license "unknown", so they cannot fill the gaps.

## What could and could not be reached

- Reached: Sefaria's public export (all versions, including license "unknown"), the repo's existing
  Sefaria cache (read only), raw.githubusercontent.com, and web search result snippets.
- Blocked from this machine: hebrew.grimoar.cz, fjms.genizah.org, sefaria.org (website and API),
  he.wikisource.org, hebrewbooks.org, daat.ac.il, archive.org, hamichlol.org.il, and Dicta's text
  files (files.dicta.org.il). Dicta's library index lists a scan of *Machaneh Ephraim* (Warsaw 1878)
  that could check the "Chidushim of Machaneh Ephraim" commentary, if someone can download it.

## Group 1: the hebrew.grimoar.cz Kabbalah works

"Agreement" is the share of words that line up after removing vowels, punctuation and abbreviation
marks. "Unattested" is the share of a text's words (3+ letters) that appear in no other Sefaria
Hebrew file, a rough typo measure; for comparison the Jerusalem printings Sefaria scanned score
0.26-0.98%.

| Canon id | Sefaria title(s) | Canon's version | Independent version(s) compared | Word agreement | Segments missing | Kinds of differences | Recommendation |
|---|---|---|---|---|---|---|---|
| pardes-rimmonim | Pardes Rimmonim | "Pardes Rimonim" (grimoar; 393,861 words) | "Pardes Rimonim, Koretz, 1780." (Public Domain; holds only the author's introduction, the table of contents and the prayer, 6,133 words); "oi" (license none; a 173-word typing of Gate 8 ch. 1) | No shared body text with Koretz. "oi" sample: 100% (173/173 words, punctuation identical, so probably copied from the same digital source, not independent). Structure: 32/32 gates, chapters per gate match the Koretz table of contents (288 vs 287) | none found | Bible/Zohar references added in parentheses (43 per 10,000 words); corrections in [brackets] beside the original in (round brackets) (2 per 10,000), some marked נ"א (another reading); unattested 0.31% | **keep (true)**; keep listing the Koretz 1780 version for the front matter |
| ohr-neerav | Ohr Ne'erav | "Or Neerav -- grimoar" (20,808 words) | "Or Neerav, Furth 1701." (Public Domain; only the title page and approbations, 1,722 words) | No shared text, so no independent check possible | grimoar lacks the front matter; Fürth copy lacks the whole body | all 7 parts present; Sefaria's source link points to KTAV's English translation; unattested 0.28% | **keep (true)**, no independent check possible |
| ramchal-kabbalah | Kalach Pitchei Chokhmah | "Kalach Pitchei Chokhmah -- grimoar" (83,844 words) | none in Hebrew. Checked "Derech Etz Chayim - Wikisource": a separate essay, no shared passages | no independent check possible | none found (138 of 138 openings) | modern topic headings with bracketed ranges ("[א -ד]"); unattested 0.28% | **keep (true)**, no independent check possible |
| kitvei-arizal | Sefer Etz Chaim, Pri Etz Chaim, Sha'ar HaKavanot, Sha'ar HaPesukim, Sha'ar HaGilgulim, Sha'ar Ma'amarei Rashbi, Sha'ar Ma'amarei Razal, Sha'arei Kedusha (grimoar); plus Jerusalem 1863/1872/1909 printings | grimoar titles (1.41 million words) | Jerusalem 1872 (Sha'ar HaMitzvot, Public Domain, NLI scan): the shared introduction of Rabbi Shmuel Vital. Jerusalem 1909 (Sha'ar HaHakdamot): parallel passages with Etz Chaim and Pri Etz Chaim | Introduction: 88.6% strict, 97.1% allowing the printing's abbreviations and numeral letters (579 aligned words); about 1% real differences (דרכו/דבריו, אחרים/אחרות, תכנית/תבנית). Parallel passages with Sha'ar HaHakdamot: mostly 50-90%, but these are different editors' versions of the same teaching, so they do not measure copying | Sha'ar Ma'amarei Razal: one 14-paragraph section repeated (9% of its paragraphs); Sha'ar HaKavanot: one passage repeated | spelled-out abbreviations; glosses marked הגהה (traditional); scattered typos (e.g. "נעששו", 19 in Etz Chaim); unattested 0.17-0.41%. Structure matches: Etz Chaim 50 gates + Sha'ar HaKelalim; Pri Etz Chaim 30 gates; Sha'ar HaGilgulim 40 introductions with R. Shmuel Vital's additions; Sha'arei Kedushah part 4 ends with the printer's note as in the printings | **keep (true)**; note the repeated sections |
| beur-eser-sefirot | Beur Eser Sefirot | "Be'ur Eser S'firot - grimoar" (3,208 words) | none | no independent check possible | none found (12 sections) | corrections in [brackets] beside the original (9 per 10,000); unattested 0.30% | **keep (true)**, no independent check possible |
| chesed-leavraham | Chesed LeAvraham | "Chesed le-Avraham -- grimoar" (125,769 words) | none (the other two files are English: a community translation and one labelled "chat gpt") | no independent check possible | none found (introduction, 7 ma'ayanot, Breichat Avraham) | corrections in [brackets] beside the original (5.5 per 10,000); 2 repeated paragraphs; unattested 0.29% | **keep (true)**, no independent check possible |
| recanati-on-the-torah | Recanati on the Torah | "Recanati on the Torah" (grimoar; 269,400 words) | none | no independent check possible | none found (54 portions) | **22% of the words are a modern Hebrew translation of the Zohar quotations, in angle brackets (4,321 insertions in 44 portions)**, plus bracketed Zohar page references and Bible references; unattested 0.33% | **review**: modern material is mixed into the author's words, and RabAI cannot tell them apart |
| shaarei-orah | Sha'arei Orah | "Shaarei Orah, grimoar" (89,261 words) | none (Hebrew) | no independent check possible | none found (introduction + 10 gates, 3rd and 4th combined as in the printings) | Bible references added in parentheses (120 per 10,000 words); unattested 0.24% | **keep (true)**, no independent check possible |

## Group 2: the Friedberg Edition Mishneh Torah commentaries

There is no second Hebrew copy on Sefaria for any of the 46 works (Sefaria has one Hebrew version per
title for every Mishneh Torah commentary). So "word agreement" cannot be measured. Two internal
checks were run instead, the same way on texts whose source is known, for comparison:

1. **Opening-words test.** For each comment whose opening words (the dibbur hamatchil, usually in
   bold) are quoted, are at least 70% of those words found in the Rambam's halakhah with the same
   number (or in the Kessef Mishneh, Maggid Mishneh, Lechem Mishneh, Ra'avad or Mishneh LaMelech on
   it)? Shown as: same halakhah / a neighbouring halakhah / not found. "Not found" is not an error in
   itself: many comments quote a later commentator, or quote in their own words.
2. **Unattested words**: share of words that appear in no other Sefaria Hebrew file.

Comparison texts (same tests):

| Text | Source | Opening-words test (same / neighbour / not found) | Unattested |
|---|---|---|---|
| Kessef Mishneh | Torat Emet 363 (72 hilchot) | 66.9% / 1.9% / 31.2% (n=15,750) | 0.09% |
| Maggid Mishneh | ToratEmet | 78.6% / 2.1% / 19.3% (n=9,477) | 0.08% |
| Lechem Mishneh | ToratEmet (27 hilchot) | 87.9% / 2.1% / 9.9% (n=2,563) | 0.10% |
| Ra'avad's glosses | ToratEmet | 92.0% / 1.1% / 7.0% (n=1,965) | 0.11% |
| Mishneh LaMelech | Warsaw 1881 (NLI scan) | 90.7% / 0.5% / 8.8% (n=2,011) | 0.09% |
| Tzafnat Pa'neach | Warsaw-Piotrków 1903-08 (from fjms) | 70.7% / 2.4% / 26.9% (n=2,072) | 0.18% |
| Kessef Mishneh | Friedberg (11 other hilchot; license unknown) | 80.5% / 2.6% / 16.9% (n=687) | 0.05% |
| Lechem Mishneh | Friedberg (30 other hilchot; license unknown) | 87.6% / 0.9% / 11.5% (n=1,992) | 0.09% |

Across the 34 Friedberg works with at least 50 comments that quote opening words, the median is 84%
in the same halakhah (range 67-96%).

| Canon id | Sefaria title (titles) | Canon's version | Independent version compared | Word agreement | Segments missing | Opening-words test (same / neighbour / not found) | Unattested | Notable features | Recommendation |
|---|---|---|---|---|---|---|---|---|---|
| annotations-of-maharatz-chajes-on-mishneh-torah | Annotations of Maharatz Chajes (22 titles) | Friedberg Edition | none on Sefaria | n/a | none known | too few to test (43; 65.1%) | 0.0% | — | keep (true) |
| annotations-of-minchat-chinukh-on-mishneh-torah | Annotations of Minchat Chinukh (56 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 88.0% / 0.9% / 11.1% (n=117) | 0.05% | — | keep (true) |
| annotations-of-r-yeshaya-berlin-on-mishneh-torah | Annotations of R' Yeshaya Berlin (9 titles) | Friedberg Edition | none on Sefaria | n/a | none known | too few to test (4; 0.0%) | 0.04% | 12% of words in brackets; (X)[Y] 6.3/10k | keep (true) |
| annotations-of-r-zalman-of-vilna-on-mishneh-torah | Annotations of R' Zalman of Vilna (4 titles) | Friedberg Edition | none on Sefaria | n/a | none known | too few to test (4; 50.0%) | 0.0% | — | keep (true) |
| avodat-hamelekh-on-mishneh-torah | Avodat HaMelekh (6 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 91.9% / 0.2% / 7.9% (n=1103) | 0.15% | license: PD per Sefaria though <95 years old | keep (true) |
| ben-aryeh-on-mishneh-torah | Ben Aryeh (81 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 76.9% / 0.9% / 22.2% (n=117) | 0.08% | 30% of words in [square brackets] — the author's own asides (נ"ב, "ולענ"ד"); 2 titles license unknown | keep (true) |
| benei-ahuvah-on-mishneh-torah | Benei Ahuvah (3 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 94.0% / 1.5% / 4.5% (n=332) | 0.1% | — | keep (true) |
| benei-binyamin-on-mishneh-torah | Benei Binyamin (19 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 67.3% / 0.2% / 32.5% (n=416) | 0.65% | unattested 0.65% — almost all abbreviations | keep (true) |
| binah-leittim-on-mishneh-torah | Binah LeIttim (1 title) | Friedberg Edition | none on Sefaria | n/a | none known | 88.9% / 0.0% / 11.1% (n=72) | 0.1% | — | keep (true) |
| birkat-avraham-on-mishneh-torah | Birkat Avraham (17 titles) | Friedberg Edition | none on Sefaria | n/a | none known | n/a (not keyed to opening words) | 0.37% | 6% of paragraphs repeated | keep (true) |
| chemdat-yisrael-on-mishneh-torah | Chemdat Yisrael (1 title) | Friedberg Edition | none on Sefaria | n/a | none known | n/a (not keyed to opening words) | 0.31% | — | keep (true) |
| cheshek-shlomo-on-mishneh-torah | Cheshek Shlomo (11 titles) | Friedberg Edition | none on Sefaria | n/a | none known | too few to test (13; 69.2%) | 0.07% | — | keep (true) |
| chiddushei-rabbi-akiva-eiger-on-mishneh-torah | Chiddushei Rabbi Akiva Eiger (14 titles) | Friedberg Edition | none on Sefaria | n/a | none known | too few to test (28; 60.7%) | 0.12% | — | keep (true) |
| chidushei-mayim-chayim-on-mishneh-torah | Chidushei Mayim Chayim (4 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 83.6% / 0.0% / 16.4% (n=152) | 0.0% | — | keep (true) |
| chidushim-of-machaneh-ephraim-on-mishneh-torah | Chidushim of Machaneh Ephraim (40 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 75.0% / 0.0% / 25.0% (n=112) | 0.14% | — | keep (true) |
| commentary-of-mahari-kurkus-and-radbaz-on-mishneh-torah | Commentary of Mahari Kurkus and Radbaz (3 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 81.1% / 0.9% / 18.0% (n=228) | 0.4% | ~2,150 editor footnotes (Talmud page numbers) — removed by the build | keep (true) |
| divrei-shaul-edut-beyosef-on-mishneh-torah | Divrei Shaul Edut BeYosef (1 title) | Friedberg Edition | none on Sefaria | n/a | none known | 76.3% / 0.8% / 22.9% (n=118) | 0.07% | — | keep (true) |
| divrei-yirmiyahu-on-mishneh-torah | Divrei Yirmiyahu (21 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 83.9% / 0.9% / 15.1% (n=1494) | 0.21% | — | keep (true) |
| even-haazel-on-mishneh-torah | Even Ha'azel (61 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 84.6% / 11.1% / 4.3% (n=1678) | 0.14% | 13% of paragraphs repeated under neighbouring halakhot; author's addenda inserted in place (labelled) | keep (true) |
| haggahot-kevod-melakhim-on-mishneh-torah | Haggahot Kevod Melakhim (1 title) | Friedberg Edition | none on Sefaria | n/a | none known | 75.0% / 0.0% / 25.0% (n=76) | 0.39% | — | keep (true) |
| har-hamoriyah-on-mishneh-torah | Har HaMoriyah (15 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 80.0% / 3.3% / 16.7% (n=4740) | 0.14% | — | keep (true) |
| kiryat-sefer-on-mishneh-torah | Kiryat Sefer (82 titles) | Friedberg Edition | none on Sefaria | n/a | none known | n/a (not keyed to opening words) | 0.15% | — | keep (true) |
| kovetz-al-yad-hachazakah-on-mishneh-torah | Kovetz Al Yad HaChazakah (26 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 78.3% / 0.8% / 21.0% (n=1064) | 0.11% | — | keep (true) |
| lechem-shamayim-on-mishneh-torah | Lechem Shamayim (1 title) | Friedberg Edition | none on Sefaria | n/a | none known | 97.0% / 0.0% / 3.0% (n=33) | 0.33% | — | keep (true) |
| lev-shalem-on-mishneh-torah | Lev Shalem (22 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 96.0% / 0.0% / 4.0% (n=177) | 0.09% | — | keep (true) |
| maasai-lamelekh-on-mishneh-torah | Ma'asai LaMelekh (5 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 71.6% / 2.4% / 26.0% (n=842) | 0.55% | 5% of paragraphs repeated under neighbouring halakhot; many abbreviations | keep (true) |
| maaseh-rokeach-on-mishneh-torah | Maaseh Rokeach (69 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 84.7% / 1.0% / 14.2% (n=9677) | 0.18% | 23 stray typesetting codes (@04/@50); (X)[Y] corrections 4.3/10k | keep (true) |
| maharam-of-padua-on-mishneh-torah | Maharam of Padua (33 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 76.5% / 0.0% / 23.5% (n=51) | 0.08% | — | keep (true) |
| mekorei-harambam-lerashash-on-mishneh-torah | Mekorei HaRambam LeRashash (66 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 82.5% / 1.0% / 16.5% (n=97) | 0.19% | — | keep (true) |
| melekhet-shelomoh-on-mishneh-torah | Melekhet Shelomoh (54 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 89.7% / 1.3% / 9.0% (n=311) | 0.11% | (X)[Y] corrections 7.2/10k; 1 title license unknown | keep (true) |
| migdal-oz-on-mishneh-torah | Migdal Oz (52 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 71.9% / 14.3% / 13.9% (n=6621) | 0.12% | editor's source references in small type; 14% of comments land on a neighbouring halakhah (range comments, numbering) | keep (true) |
| nachal-eitan-on-mishneh-torah | Nachal Eitan (28 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 88.6% / 0.3% / 11.1% (n=369) | 0.09% | 15% of words in brackets — author's asides | keep (true) |
| ohr-sameach-on-mishneh-torah | Ohr Sameach (85 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 86.8% / 1.1% / 12.1% (n=2507) | 0.2% | 2.4% of words in brackets (author's asides); a few (X)[Y] corrections | keep (true) |
| peri-chadash-on-mishneh-torah | Peri Chadash (4 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 83.3% / 1.9% / 14.8% (n=108) | 0.0% | — | keep (true) |
| rishon-letzion-on-mishneh-torah | Rishon Letzion (3 titles) | Friedberg Edition | none on Sefaria | n/a | none known | too few to test (3; 66.7%) | 0.18% | (X)[Y] corrections 17.6/10k (small work) | keep (true) |
| seder-mishnah-on-mishneh-torah | Seder Mishnah (8 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 76.1% / 0.2% / 23.6% (n=444) | 0.22% | — | keep (true) |
| sefer-hamenucha-on-mishneh-torah | Sefer HaMenucha (3 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 69.2% / 0.0% / 30.8% (n=65) | 0.27% | 3.5% of paragraphs repeated | keep (true) |
| shaar-hamelekh-on-mishneh-torah | Sha'ar HaMelekh (66 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 81.3% / 1.6% / 17.2% (n=571) | 0.15% | — | keep (true) |
| shorshei-hayam-on-mishneh-torah | Shorshei HaYam (73 titles) | Friedberg Edition | none on Sefaria | n/a | none known | n/a (not keyed to opening words) | 0.21% | — | keep (true) |
| teshuvah-meyirah-on-mishneh-torah | Teshuvah MeYirah (51 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 85.6% / 1.8% / 12.6% (n=111) | 0.2% | 15% of words in brackets — author's asides | keep (true) |
| tziunei-maharan-on-mishneh-torah | Tziunei Maharan (81 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 90.7% / 0.3% / 9.0% (n=321) | 0.07% | — | keep (true) |
| yad-david-on-mishneh-torah | Yad David (36 titles) | Friedberg Edition | none on Sefaria | n/a | none known | too few to test (25; 80.0%) | 0.17% | (X)[Y] corrections 13.1/10k (small work) | keep (true) |
| yad-eitan-on-mishneh-torah | Yad Eitan (71 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 85.2% / 0.3% / 14.5% (n=366) | 0.05% | 1 title license unknown | keep (true) |
| yekar-tiferet-on-mishneh-torah | Yekar Tiferet (2 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 84.2% / 1.7% / 14.1% (n=361) | 0.09% | bracketed restored words; (X)[Y] 10.5/10k; 1 of 2 titles license unknown | keep (true) |
| yekhahen-peer-on-mishneh-torah | Yekhahen Pe'er (7 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 86.0% / 2.2% / 11.8% (n=93) | 0.07% | 7% of paragraphs repeated | keep (true) |
| yitzchak-yeranen-on-mishneh-torah | Yitzchak Yeranen (73 titles) | Friedberg Edition | none on Sefaria | n/a | none known | 87.4% / 1.3% / 11.3% (n=842) | 0.17% | (X)[Y] corrections 6.1/10k | keep (true) |

Notes on the "(X) [Y]" pattern: an editor's correction shown as the printed word in round brackets
followed by the corrected word in square brackets, e.g. Ohr Sameach "ממרס (בדמו) [בדם הפסח]",
Melekhet Shelomoh "אינו (מקבל טומאה) [מטמא אוכל]". The printed reading stays visible. The same
convention also appears in the Torat Emet Kessef Mishneh (0.4 per 10,000 words) and in the
grimoar Pardes Rimonim (2 per 10,000).

## How the checks were done

- Texts: Sefaria export JSON files, every Hebrew version of every title involved, including versions
  whose license is "unknown" (read only to compare).
- Normalizing: HTML and footnotes removed; vowels and cantillation removed; maqaf as a space;
  quotation marks and geresh/gershayim removed (so ע"כ = עכ); all other punctuation removed.
  A "loose" mode also ignored ו and י inside words and folded final letters.
- Agreement: word lists aligned with difflib.SequenceMatcher; agreement = 2 x matched words /
  (words in A + words in B). For the Arizal introduction a second, lenient score also counted as
  equal: a printed abbreviation against its written-out form (ס' / ספר, הספרי' / הספרים),
  plene/defective spelling, and dropped final letters.
- Passages that do not share references were found with 4-word anchors and then aligned.
- Structure: counted gates/chapters/parts and compared with the Koretz 1780 table of contents
  (Pardes) and with the traditional division of each book.
- Editorial material: counted parentheses, square brackets, angle brackets, footnotes, the
  "(X) [Y]" correction pattern, marks such as נ"א, צ"ל, הגהה, כ"י, and leftover codes; read samples.
- Repeated paragraphs: identical paragraphs of 12+ words within one work.
- The scripts and their results stayed on the session's computer; the method above is enough to
  repeat any check.

## Sources outside Sefaria's export (web search results; pages not opened)

- Grimoar.cz Hebrew section, "Hebrejská knihovna kabalistických textů": http://hebrew.grimoar.cz/
  (search snippet: part of Grimoar.cz, a library of "unrevised texts in pdf, doc and other formats").
- Bar-Ilan Responsa Project database list (snippet: Rambam material "in the Friedberg edition
  from Jerusalem, 2006"): https://www.responsa.co.il/books/books.en-US.html
- HaMichlol article "עז והדר" (snippet: "Otzar Mefarshei HaRambam, Friedberg Edition" is a
  collection of about 200 commentaries on the Rambam, in the Responsa Project and HyperBooks):
  https://www.hamichlol.org.il/%D7%A2%D7%96_%D7%95%D7%94%D7%93%D7%A8
- Dicta library index: https://raw.githubusercontent.com/Dicta-Israel-Center-for-Text-Analysis/Dicta-Library-Download/main/books.json
