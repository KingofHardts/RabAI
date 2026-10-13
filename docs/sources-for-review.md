# RabAI's sources: what it reads, and what it leaves out

*A list for the rabbinic board, made from RabAI's canon (`canon/canon.yaml` and the files beside it) by `tools/validate.py --write`. Do not edit it by hand: it is rewritten whenever the canon changes.*

RabAI answers from a library of Orthodox texts that its canon lists one edition at a time. **Nothing here is approved yet: the board decides what RabAI may use.** Until it does, RabAI runs as a private preview on the editions in Part 8, and every passage it shows from them is labeled "not yet approved by the rabbinic board".

Notes in this list are our best understanding, written for you to confirm. Where we were unsure of a fact, it says "(to confirm)".

## At a glance

- **RabAI reads 825 editions of 741 works.** None are approved by the board yet. Every book is listed in Part 8.
- **16 works are kept with a caution** that RabAI gives whenever it uses them (Part 1).
- **45 editions wait for your decision** and are not used until you decide (Part 2).
- **52 editions and collections are left out,** each with the reason (Part 3).
- **For halacha, RabAI opens a seif of the Shulchan Aruch with the commentaries printed around it,** the main ones first (Part 4).
- **RabAI may look things up on 26 trusted Orthodox websites,** and never searches 18 other sites (Part 5).
- **67 editions are wanted but not in the library yet:** 42 need a publisher's agreement, and 25 have no copy we may use yet (Part 6).

| Area | Works RabAI reads | Editions |
|---|---:|---:|
| [Tanakh and its commentaries](#tanakh-and-its-commentaries) | 94 | 112 |
| [Mishnah, Talmud and Midrash](#mishnah-talmud-and-midrash) | 174 | 187 |
| [Halacha](#halacha) | 254 | 265 |
| [Jewish thought, mussar and Chassidus](#jewish-thought-mussar-and-chassidus) | 146 | 173 |
| [Kabbalah](#kabbalah) | 34 | 38 |
| [Prayer](#prayer) | 18 | 28 |
| [Dictionaries and guides to learning](#dictionaries-and-guides-to-learning) | 11 | 12 |
| [Articles from organizations' websites](#articles-from-organizations-websites) | 10 | 10 |

## How to review

For each book or edition, please mark one of: keep, remove, keep with a caution, or a question, with a reason if you have one. Each entry carries a short id (for example `mishnah-berurah`) so your notes can be matched to the canon. Part 1, Part 2 and Part 3 need a decision. Part 4 asks whether RabAI opens the right commentaries, in the right order, for a halachic question. Part 8 is the whole library, for checking.

In the whole library, "core" marks a book from RabAI's founding list, the books it was built around. Halacha works name whose practice they record (Ashkenazi or Sephardi). Communities (Litvish, Chassidish, Chabad, Sephardi, Religious Zionist, Modern Orthodox, Torah im Derech Eretz) are the ones a work belongs to most; a work with none is shared by all.

## Contents

- [Part 1. Kept, with a caution](#part-1-kept-with-a-caution)
- [Part 2. Waiting for your decision](#part-2-waiting-for-your-decision)
- [Part 3. Left out, and why](#part-3-left-out-and-why)
- [Part 4. How RabAI opens the commentaries](#part-4-how-rabai-opens-the-commentaries)
- [Part 5. Websites RabAI may search](#part-5-websites-rabai-may-search)
- [Part 6. Not in the library yet](#part-6-not-in-the-library-yet)
- [Part 7. Earlier questions for the board](#part-7-earlier-questions-for-the-board)
- [Part 8. The whole library, book by book](#part-8-the-whole-library-book-by-book)

## Part 1. Kept, with a caution

These works stay in the library so that people can ask about them, but RabAI gives the caution below whenever it uses one, and never rests a halachic answer on it alone. Where Orthodox authorities rejected a work's main claims, RabAI presents them only as its author's claims, together with the answer those authorities gave. Please check each caution, and whether the work belongs in the library at all.

- **Ralbag on Tanakh** (רלב״ג). Ralbag, written c. 1325-1345, Provence, France. `ralbag-on-tanakh`
  - Why: Later authorities sharply criticized some of its views.
  - The caution RabAI gives: The Ralbag's commentary is printed in Mikraot Gedolot and widely learned, but later authorities sharply criticized some of his philosophical views.
- **Ralbag, Beur HaMilot on the Torah** (רלב"ג ביאור המלות). Ralbag, written c. 1326-1340. `ralbag-beur-hamilot`
  - Why: Later authorities sharply criticized some of its views.
  - The caution RabAI gives: By the Ralbag, whose commentary is printed in Mikraot Gedolot; later authorities sharply criticized some of his philosophical views.
- **Sefer HaYashar (the midrash on Bereishit to Shoftim)** (ספר הישר). Unknown, first printed in Venice, 1625. `sefer-hayashar-midrash`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Sefer HaYashar retells the history from Creation to the time of the Judges and presents itself as the "Book of the Upright" that the books of Joshua and Samuel mention. Who wrote it, and when, is unknown; it was first printed in 1625, and most scholars date it to the Middle Ages or later. Its stories carry less weight than the midrashim of the Sages.
- **Otzar Midrashim (J. D. Eisenstein's collection of shorter midrashim)** (אוצר מדרשים). Collected by Judah David Eisenstein, printed in New York, 1915. `otzar-midrashim`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: A collection of about two hundred shorter midrashim, gathered by J. D. Eisenstein and printed in 1915. Some are early and widely quoted; many are later works whose authors and dates are unknown, so a teaching found only here carries less weight than the midrashim of the Sages.
- **Issur VeHeter LeRashi** (איסור והיתר לרש"י). Rashi, written c. 990-1190. `issur-veheter-lerashi`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Carries Rashi's name, but it was put together in his school, by his students and later hands, so not every ruling in it is Rashi's own (to confirm).
- **Teshuvot Min HaShamayim** (שאלות ותשובות מן השמים). Jacob of Marvege, written c. 1270-1330, Marvejols, France. `teshuvot-min-hashamayim`
  - Why: It comes from an unusual source, such as answers received in dreams.
  - The caution RabAI gives: Answers that the Tosafist Rabbi Yaakov of Marvege recorded receiving in dreams. The Gemara teaches that halacha is not decided by a voice from heaven (Bava Metzia 59b), so they are read as what he recorded, not as rulings.
- **Rabbi Eliezer Berkovits on halacha and its renewal (HaHalakhah Kochah VeTafkidah, Tenai BeNissuin UVeGet, Jewish Women in Time and Torah, and on conversion)**. Rabbi Eliezer Berkovits, 1908-1992, Berlin, London, Sydney, Boston, Chicago and Jerusalem. `rabbi-eliezer-berkovits-on-halacha`
  - Why: Later authorities sharply criticized some of its views.
  - The caution RabAI gives: Rabbi Eliezer Berkovits was an Orthodox rabbi and philosopher, a student of the Seridei Esh. In these books he argued that halacha can and should respond to new circumstances, and he proposed solutions, such as a condition in the marriage to free women whose husbands refuse a get, and changes in women's roles, that most poskim did not accept. Present his proposals as his own, together with the reasons other poskim gave for rejecting them.
- **Milchamot HaShem (the Ralbag's Wars of the Lord)** (מלחמות השם לרלב״ג). Rabbi Levi ben Gershom (Ralbag), 1288-1344, Provence, France. `ralbag-milchamot-hashem`
  - Why: Later authorities sharply criticized some of its views.
  - The caution RabAI gives: The Ralbag was a great Rishon whose commentary on Tanakh is printed in Mikraot Gedolot. In this book of philosophy he held, among other things, that God knows the events of the world through their general order rather than each one as it happens, and that the world was formed from a matter that had always existed. Later authorities sharply rejected these views. Present them as his, together with the answers other Rishonim gave.
- **Kol HaTor** (קול התור). Attributed to Rabbi Hillel Rivlin of Shklov, recording the Vilna Gaon's teaching, first published in the 20th century. `kol-hator`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Kol HaTor presents itself as the Vilna Gaon's teaching about the redemption and the return to Eretz Yisrael, written down by his student Rabbi Hillel of Shklov. It was first published in the twentieth century, and historians and rabbis disagree about whether it faithfully records the Gaon's words. Present what it says as the book's claims, not as the Gaon's settled teaching.
- **Milchamot HaShem (Rabbi Yichya Qafih)** (מלחמות השם). Yichya Qafih, begun in 1914, printed in Jerusalem in 1931, Yemen. `milchamot-hashem-qafih`
  - Why: Orthodox authorities rejected its main claims; it is kept so they can be explained.
  - The caution RabAI gives: Rabbi Yichya Qafih's attack on the Zohar and on the Kabbalah of the Arizal, begun in 1914 and printed in Jerusalem in 1931. It argues that the Zohar is not the teaching of Rabbi Shimon bar Yochai but a much later book, and that Kabbalah is foreign to the Torah. Orthodox authorities rejected these claims: in 1914 Ashkenazi and Sephardi rabbis in Jerusalem signed a ban against those in Yemen who denied the Zohar, and the book was answered in defense of the Kabbalah (in Emunat Hashem; who wrote it is to be confirmed). The Zohar remains accepted across the Orthodox world as a holy book of the Torah's inner teaching. This book is kept so its claims can be understood together with why they were rejected; its claims are never presented as what the Torah teaches.
- **Sefer HaYashar (the mussar book)** (ספר הישר). written c. 1300, Spain. `sefer-hayashar-mussar`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Sometimes attributed to Rabbeinu Tam, but many consider its author unknown.
- **Tzava'at HaRivash** (צוואת הריב"ש). written c. 1730-1770. `tzavaat-harivash`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Teachings of the Baal Shem Tov and the Maggid of Mezritch as written down by students, so how exactly it records their words is uncertain, and some of its practices were questioned by other authorities. Chassidic communities hold it in high regard.
- **Sefer HaBahir** (ספר הבהיר). Attributed to Rabbi Nechunya ben HaKanah. `sefer-habahir`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Traditionally attributed to Rabbi Nechunya ben HaKanah and quoted by the Ramban and the kabbalists; it first circulated in the twelfth century, and its authorship is discussed (to confirm).
- **Mitpachat Sefarim (Rabbi Yaakov Emden)** (מטפחת ספרים). Yaakov Emden, written c. 1733-1767. `mitpachat-sefarim`
  - Why: A claim in it is disputed by many authorities.
  - The caution RabAI gives: Rabbi Yaakov Emden's attack on the Sabbatean movement, in which he argues that some passages of the Zohar were added later. Most later authorities and the kabbalists reject that claim and hold the Zohar to be the teaching of Rabbi Shimon bar Yochai.
- **The commentary on Sefer Yetzirah attributed to the Ramban** (רמב"ן). Moses ben Nachman (Ramban), written c. 1225-1265. `ramban-on-sefer-yetzirah`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Attributed to the Ramban; whether he wrote it is uncertain (to confirm).
- **Sefer HaKanah** (ספר הקנה). Attributed to Rabbi Nechunya ben HaKanah. `sefer-hakanah`
  - Why: Who wrote it is uncertain, or it is attributed.
  - The caution RabAI gives: Sefer HaKanah explains the mitzvot according to Kabbalah and is traditionally attributed to the Tanna Rabbi Nechunya ben HaKanah, but most scholars hold that it was written much later, in the Middle Ages, by an author whose name is unknown. Present its claims about its own origin as claims.

## Part 2. Waiting for your decision

Editions held out of the library until you decide: translations whose translators we could not identify, scholars' editions, and works whose fit with the mesorah we were unsure of. RabAI does not use them.

### Tanakh and its commentaries (waiting)

- **Targum on Ketuvim (Psalms, Proverbs, Job, the five megillot and Chronicles)** (תרגום). written c. 0-600. `targum-ketuvim`
  - Edition: Aramaic text of the Targum on Chronicles (Hebrew Wikisource)
  - Why it waits: Proposed 2026-10-13. The Targum on Chronicles was not printed in the early Mikraot Gedolot; it was first printed in the 17th and 18th centuries from manuscripts by Christian scholars (to confirm). Which edition Hebrew Wikisource typed is not stated, so it waits for the board (library question 9).
- **Targum Sheni on Esther** (תרגום שני). `targum-sheni-on-esther`
  - Edition: Aramaic text (Berlin, 1898)
  - Why it waits: For the board (library question 9). The second Aramaic targum on Esther, printed in the Mikraot Gedolot, but on Sefaria only in a scholar's edition (Berlin, 1898; editor to confirm). Sefaria lists no license; the printing is public domain by age. Paulus Cassel's English is in excluded.yaml.
- **Tafsir Rasag (Rav Saadia Gaon's Arabic translation of the Torah)**. Rav Saadia Gaon, 882-942, Babylonia. `tafsir-rasag`
  - Edition: Judeo-Arabic text in Hebrew letters (Paris, 1893)
  - Why it waits: For the board (library question 9). Joseph Derenbourg's scholarly edition, from the same editor as the Rambam's introduction to Seder Tahorot that the canon already holds back (to confirm). Arabic, not Hebrew, so RabAI could quote it only with care.
- **The commentary on Ezra and Nehemiah attributed to Rav Saadia Gaon**. Attributed to Rav Saadia Gaon. `saadia-gaon-on-ezra-nehemiah`
  - Edition: Hebrew text (Oxford, 1882)
  - Why it waits: For the board (library question 9). A scholar's edition, printed in Oxford in 1882 from a manuscript. It was long attributed to Rav Saadia Gaon, but Sefaria notes that scholars now credit it to someone else (to confirm).
- **Ibn Ezra on Tanakh** (אבן עזרא). Rabbi Avraham ibn Ezra, c. 1089-1164, Spain. `ibn-ezra-tanakh`
  - Edition: Ibn Ezra's Commentary on the Pentateuch, translated by H. Norman Strickman and Arthur M. Silver
  - Why it waits: On the founding list for the board to confirm the translators before their English is used.
  - About the work: Ibn Ezra's comment on Devarim 1:2 ("the secret of the twelve") is often quoted by Bible critics. Later commentators discuss how to understand it. The board decides how the assistant presents it.
- **Immanuel of Rome on Proverbs and Esther**. Immanuel ben Shlomo of Rome, 13th-14th century, Rome. `immanuel-of-rome-on-tanakh`
  - Edition: Hebrew text (Proverbs from the Naples printing of 1487; Esther from a Parma manuscript)
  - Why it waits: For the board. Immanuel of Rome is best known as a poet, and the Shulchan Aruch (Orach Chayim 307:16) names his book of poems among the books one may not read (to confirm). His commentary on Proverbs was among the first Hebrew books printed in Naples; his commentaries are not among those usually learned.
- **Rabbi Zerachiah ben Shealtiel Chen on Proverbs (Imrei Da'at) and Job (Tikvat Enosh)**. Rabbi Zerachiah ben Shealtiel Chen (Gracian), written in Rome, late 13th century, Barcelona and Rome. `zerahiah-hen-on-proverbs-and-job`
  - Edition: Hebrew text (Berlin, 1868, and Vienna, 1871)
  - Why it waits: For the board (library question 9). Philosophical commentaries in the Rambam's school, first printed from manuscripts by nineteenth-century scholars (editors to confirm). Sefaria lists no license; the printings are public domain by age.
- **Shadal on the Torah and Isaiah, and his Ohev Ger on Targum Onkelos** (שד״ל). Rabbi Shmuel David Luzzatto (Shadal), 1800-1865, Padua, Italy. `shadal-on-tanakh`
  - Edition: Hebrew text
  - Why it waits: For the board. Shadal taught at the rabbinical college of Padua and defended the Torah's divine origin against the Bible critics of his day, but he also took positions that drew strong objections: he denied that the Zohar is ancient and opposed the study of Kabbalah, sharply criticized the philosophy of the Rambam and Ibn Ezra, and engaged the critical scholarship of his time, especially in his commentary on Isaiah (all to confirm). Ohev Ger is a scholarly study of Targum Onkelos and its variant readings. Options: leave him out, take him in as a debated author with a caution, or take in only the Torah commentary.
- **Em LaMikra (Rabbi Eliyahu Benamozegh's commentary on the Torah)** (אם למקרא). Rabbi Eliyahu Benamozegh, printed 1862-1863, Livorno, Italy. `em-lamikra`
  - Edition: Hebrew text (Livorno, 1862-1863)
  - Why it waits: For the board. Rabbi Benamozegh was a rabbi and kabbalist in Livorno. His commentary drew on philology, archaeology and history, and on non-Jewish sources; the rabbis of Aleppo ordered copies of it burned, and the rabbis of Damascus followed them, while rabbis in Jerusalem agreed with the criticism but not with the burning. He answered his critics in a separate book, Tzori Gilead (all to confirm). Options: leave it out, or take it in as a debated work with a caution.
- **Rabbi Isaac Samuel Reggio's commentary on the Torah**. Rabbi Isaac Samuel Reggio (Yashar), printed 1821, Gorizia, Italy. `reggio-on-torah`
  - Edition: Hebrew text (Vienna, 1821)
  - Why it waits: For the board. Reggio was an Italian rabbi and scholar who belonged to the Haskalah, and Sefaria describes his commentary as "scientifically oriented" (to confirm his standing).
- **Footnotes to Kohelet, by Bruce Heitler**. Bruce Heitler. `footnotes-to-kohelet-heitler`
  - Edition: English text
  - Why it waits: For the board. We could not learn who the author is.
- **Karati Bekhol Lev (Rabbanit Dr. Michal Tikochinsky)** (קראתי בכל לב). Rabbanit Dr. Michal Tikochinsky, published 2022, Eretz Yisrael. `karati-bekhol-lev`
  - Edition: Hebrew text (Koren, 2022)
  - Why it waits: For the board. Essays on the weekly parasha that, as Sefaria describes them, draw on a wide range of Jewish and general sources. The board should confirm the author's standing.
- **Gevia Kesef (Rabbi Yosef ibn Kaspi)** (גביע כסף). Rabbi Yosef ibn Kaspi, written c. 1330-1340, Provence. `gevia-kesef`
  - Edition: English, translated by Basil Herring (Ktav, 1982)
  - Why it waits: For the board. Ibn Kaspi was a philosophical commentator in the Rambam's school whose rationalist views were criticized in his own time (to confirm). Rabbi Basil Herring, the translator, later served as executive vice president of the Rabbinical Council of America (to confirm). Sefaria's Hebrew has no license listed.

### Mishnah, Talmud and Midrash (waiting)

- **Midrashim found on Sefaria only in a modern scholar's edition (Sifrei Zuta, Ruth Rabbah, Yalkut Talmud Torah, Mishnat Rabbi Eliezer)**. `midrash-scholars-editions`
  - Edition: Hebrew text, scholars' editions
  - Why it waits: For the board (library question 9), like the Pesikta DeRav Kahana and Avot DeRabbi Natan B the canon already holds back. Sifrei Zuta (on Bamidbar) is rebuilt from quotations in later books (Leipzig, 1917, edited by H. S. Horovitz, to confirm). Ruth Rabbah here is Professor Myron Lerner's critical edition (1971); the canon already has the traditional Ruth Rabbah. The Yalkut Talmud Torah selections (Midrash Yelamdenu) were printed in Cincinnati in 1940 (editor to confirm). Mishnat Rabbi Eliezer, the midrash of the 32 rules, was printed in New York in 1934 by H. G. Enelow, a Reform rabbi (to confirm). The works themselves are ancient or medieval; the question is only about these editions.
- **Talmud Yerushalmi** (תלמוד ירושלמי). `talmud-yerushalmi`
  - Edition: The Jerusalem Talmud, translated by Heinrich W. Guggenheimer
  - Why it waits: On the founding list for the board to confirm. Published by an academic press, with the translator's own edition of the Hebrew/Aramaic text, which waits for the board too.
- **Talmud Yerushalmi** (תלמוד ירושלמי). `talmud-yerushalmi`
  - Edition: Hebrew/Aramaic text edited by Heinrich W. Guggenheimer
  - Why it waits: The only complete open Hebrew text of the Yerushalmi on Sefaria. An academic edition, so held for the board like the same editor's translation.
- **Midrash (Midrash Rabbah, Tanchuma, Mechilta, Sifra, Sifrei)** (מדרש). `midrash`
  - Edition: Soncino Midrash Rabbah (eds. H. Freedman and Maurice Simon) [English]
  - Why it waits: On the founding list for the board to confirm the translators before their English is used.
- **Midrash (Midrash Rabbah, Tanchuma, Mechilta, Sifra, Sifrei)** (מדרש). `midrash`
  - Edition: The Sefaria Midrash Rabbah (2022) [English]
  - Why it waits: Sefaria does not name the translators. Held until the board reviews it.
- **Mishnat Eretz Yisrael (a commentary on the Mishnah)** (משנת ארץ ישראל). Shmuel Safrai, Ze'ev Safrai and Chana Safrai, published 2008-2023, Eretz Yisrael. `mishnat-eretz-yisrael`
  - Edition: Hebrew text
  - Why it waits: For the board. A modern commentary by university scholars that, as Sefaria describes it, combines traditional explanation with academic history, set against life in Eretz Yisrael in the time of the Mishnah. The board should weigh its historical method before RabAI uses it (library question 9).
- **Heinrich Guggenheimer's notes on the Jerusalem Talmud**. Heinrich W. Guggenheimer. `guggenheimer-notes-on-yerushalmi`
  - Edition: English notes (De Gruyter, 1999-2015)
  - Why it waits: Held for the board together with the same scholar's translation and Hebrew text of the Yerushalmi (talmud-yerushalmi), which the canon already holds back.
- **The Jewish Spiritual Heroes (Gershom Bader's lives of the Tannaim and Amoraim)**. Gershom Bader, published 1940, New York. `jewish-spiritual-heroes`
  - Edition: English text (New York, 1940)
  - Why it waits: For the board. Biographies of the Sages, drawn mainly from the Talmud and midrash. We could not confirm the author's background.

### Halacha (waiting)

- **Hilchot Sefer Torah from the Cairo Genizah (Ginzei Mitzrayim)**. Unknown (once attributed to Rabbi Yehuda ben Barzilai of Barcelona). `ginzei-mitzrayim-hilkhot-sefer-torah`
  - Edition: Hebrew text (Oxford, 1897)
  - Why it waits: For the board (library question 9). A medieval work on writing a Torah scroll and other holy books, first printed from a Genizah manuscript by Elkan Adler in 1897, as Sefaria says (to confirm). Its author is uncertain.
- **Iggeret HaShabbat (Ibn Ezra's Sabbath Epistle)** (אגרת השבת). Rabbi Avraham ibn Ezra, written 1158-1159, London. `iggeret-hashabbat`
  - Edition: English (Ktav, 2009)
  - Why it waits: The translator is not named on Sefaria; it may be Rabbi H. Norman Strickman, whose translation of Ibn Ezra on the Torah the canon also holds for review (to confirm).
  - About the work: Ibn Ezra's defense of the tradition that the day, and Shabbat, begins in the evening, against a commentary that read the Torah otherwise.
- **Kitzur Shulchan Aruch** (קיצור שולחן ערוך). Rabbi Shlomo Ganzfried, 1804-1886. `kitzur-shulchan-aruch`
  - Edition: Code of Jewish Law, translated by Hyman E. Goldin (1927)
  - Why it waits: Possibly public domain. Hosted on Sefaria. Some rulings are better taken from later poskim.

### Jewish thought, mussar and Chassidus (waiting)

- **Moreh Nevuchim (Guide for the Perplexed)** (מורה נבוכים). Rabbi Moshe ben Maimon (Rambam), 1138-1204. `moreh-nevuchim`
  - Edition: The Guide for the Perplexed, translated by Michael Friedländer (1904)
  - Why it waits: Possibly public domain. The board decides on the translator.
  - About the work: Central to hashkafah, and to questions such as the reasons for korbanot (3:32).
- **Sefer HaIkkarim (Rabbi Yosef Albo)** (ספר העיקרים). Rabbi Yosef Albo, written 1425, Spain. `sefer-haikkarim`
  - Edition: Hebrew text (Isaac Husik's edition, Jewish Publication Society, 1929-1930)
  - Why it waits: For the board, and worth deciding soon: a classic Rishon on the principles of faith (the Torah's divine origin, God's existence, reward and punishment), close to the Thirteen Ikkarim the core premises rely on. On Sefaria it exists only in Isaac Husik's edition and translation; Husik was a university scholar (library questions 9 and 11; edition details to confirm). One option is to take in the Hebrew text without the editor's notes.
- **Sefer HaIkkarim (Rabbi Yosef Albo)** (ספר העיקרים). Rabbi Yosef Albo, written 1425, Spain. `sefer-haikkarim`
  - Edition: English, translated by Isaac Husik (Jewish Publication Society, 1929-1930)
  - Why it waits: For the board, and worth deciding soon: a classic Rishon on the principles of faith (the Torah's divine origin, God's existence, reward and punishment), close to the Thirteen Ikkarim the core premises rely on. On Sefaria it exists only in Isaac Husik's edition and translation; Husik was a university scholar (library questions 9 and 11; edition details to confirm). One option is to take in the Hebrew text without the editor's notes.
- **Sefer Yesodei HaTorah (Shadal on the foundations of belief)** (יסודי התורה לשד״ל). Rabbi Shmuel David Luzzatto (Shadal), written 1842 (printed 1880), Padua, Italy. `shadal-yesodei-hatorah`
  - Edition: Hebrew text (Lemberg, 1880)
  - Why it waits: For the board, together with Shadal's commentaries (shadal-on-tanakh).
- **Sefer Yesodei HaTorah (Shadal on the foundations of belief)** (יסודי התורה לשד״ל). Rabbi Shmuel David Luzzatto (Shadal), written 1842 (printed 1880), Padua, Italy. `shadal-yesodei-hatorah`
  - Edition: English, translated by Rabbi Shraga Silverstein
  - Why it waits: For the board, together with Shadal's commentaries (shadal-on-tanakh).
- **Rabbi Menashe ben Yisrael on the resurrection of the dead (in translation)**. Rabbi Menashe ben Yisrael, written 1636, Amsterdam. `menashe-ben-yisrael-on-resurrection`
  - Edition: English, translated by Walter Hilliger (2021)
  - Why it waits: For the board (library question 12). The book was written in Spanish; we don't know the translator. His Hebrew Nishmat Chayim is in the canon (nishmat-chayyim).
- **Works of Rav Soloveitchik (Halakhic Man, The Lonely Man of Faith, Kol Dodi Dofek, U-Vikkashtem mi-Sham, Shiurim LeZecher Abba Mari)**. Rabbi Joseph B. Soloveitchik, 1903-1993, United States. `rav-soloveitchik`
  - Edition: Halakhic Man, translated by Lawrence Kaplan
  - Why it waits: The work is Orthodox. The board confirms the translation.
- **Books of Rav Shimon Gershon Rosenberg (Rav Shagar)**. Rabbi Shimon Gershon Rosenberg (Rav Shagar), 1949-2007, Eretz Yisrael. `rav-shagar`
  - Edition: Hebrew text
  - Why it waits: For the board. Rav Shagar was a rosh yeshiva and a thinker in the Religious Zionist world whose engagement with postmodern philosophy is debated; the board should decide whether, and how, RabAI uses his books.
- **Mussar works found on Sefaria only in a modern scholar's edition (Menorat HaMaor of Rabbi Yisrael Alnaqua, Shekel HaKodesh, Yesod HaYirah, Mivchar HaPeninim)**. `mussar-scholars-editions`
  - Edition: Hebrew text, scholars' editions
  - Why it waits: For the board (library questions 9 and 12). Rabbi Yisrael Alnaqua's Menorat HaMaor (14th century; not Rabbi Yitzchak Aboab's better-known book of that name) exists on Sefaria only in H. G. Enelow's edition, and Enelow was a Reform rabbi (to confirm). Shekel HaKodesh (by Rabbi Yosef Kimchi, as Sefaria says) and Yesod HaYirah were edited and translated by Rabbi Sir Hermann Gollancz, whose background the board was already asked about. Mivchar HaPeninim, a book of maxims attributed to Rabbi Shlomo ibn Gabirol, was edited and translated by B. H. Ascher (background to confirm).
- **Mussar works found on Sefaria only in a modern scholar's edition (Menorat HaMaor of Rabbi Yisrael Alnaqua, Shekel HaKodesh, Yesod HaYirah, Mivchar HaPeninim)**. `mussar-scholars-editions`
  - Edition: English translations by the same editors
  - Why it waits: For the board (library questions 9 and 12). Rabbi Yisrael Alnaqua's Menorat HaMaor (14th century; not Rabbi Yitzchak Aboab's better-known book of that name) exists on Sefaria only in H. G. Enelow's edition, and Enelow was a Reform rabbi (to confirm). Shekel HaKodesh (by Rabbi Yosef Kimchi, as Sefaria says) and Yesod HaYirah were edited and translated by Rabbi Sir Hermann Gollancz, whose background the board was already asked about. Mivchar HaPeninim, a book of maxims attributed to Rabbi Shlomo ibn Gabirol, was edited and translated by B. H. Ascher (background to confirm).
- **The Mei HaShiloach and the introduction to the Beit Yaakov (Izhbitz and Radzin), in English**. Rabbi Mordechai Yosef Leiner of Izhbitz; Rabbi Gershon Chanokh Leiner of Radzin. `izhbitz-in-english`
  - Edition: English, translated by Betsalel Philip Edwards
  - Why it waits: For the board (library question 12), and on the work itself: the Mei HaShiloach is a classic of Chassidus whose teaching on free will and on the sins of great people was controversial (to confirm), and the Radziner Rebbe's tekhelet books are already a debated entry. Sefaria's Hebrew of both has no license listed.
- **BePardes HaChasidut VeHaKabbalah (Hillel Zeitlin)** (בפרדס החסידות והקבלה). Hillel Zeitlin, 1871-1942, Warsaw. `bepardes-hachasidut-vehakabbalah`
  - Edition: Hebrew text (Tel Aviv, 1997)
  - Why it waits: For the board. Essays introducing Chassidus and Kabbalah to modern readers, by a writer who returned to religious life and was murdered in the Warsaw ghetto (to confirm). Sefaria describes him as an early neo-Chassidic thinker.
- **Rabbi Moshe Narboni's commentary on the Guide for the Perplexed**. Rabbi Moshe Narboni, written c. 1354-1362, Provence and Spain. `narboni-on-the-guide`
  - Edition: Hebrew text (Vienna, 1852)
  - Why it waits: For the board. Narboni read the Rambam through the philosophy of Ibn Rushd, and some of his readings were criticized as going far beyond the Rambam (to confirm). Whether the canon should hold the other commentaries printed with the Guide (Efodi, Shem Tov, Asher Crescas) first is a related question.
- **Pinchas Polonsky's commentary on selected paragraphs of Rav Kook's Arpilei Tohar**. Pinchas Polonsky, published 2012, Beit El, Eretz Yisrael. `polonsky-on-arpilei-tohar`
  - Edition: English text
  - Why it waits: For the board. A modern explanation of Rav Kook; the board should confirm the author's standing.
- **Megillat Eifah (the Shach's account of the massacres of 1648)** (מגילת עיפה). Rabbi Shabbetai HaKohen (the Shach), written 1648-1651. `megillat-eifah`
  - Edition: Hebrew text (printed with Shevet Yehudah, Hanover, 1855)
  - Why it waits: For the board (library question 9): the Shach's own words, but printed as an appendix to a scholar's edition of Shevet Yehudah (Hanover, 1855; editor to confirm). Sefaria lists no license; the printing is public domain by age.
- **From Sinai to Ethiopia (Rabbi Dr. Sharon Shalom on the tradition of Ethiopian Jewry)**. Rabbi Dr. Sharon Shalom, published 2012 (English, 2016), Eretz Yisrael. `from-sinai-to-ethiopia`
  - Edition: English, translated by Jessica Setbon (Gefen, 2016)
  - Why it waits: For the board. A study of the customs of Beta Israel, kept apart from the rabbinic tradition for centuries, with a section setting them out as a code. Useful for describing that tradition; the board should decide how RabAI presents it beside halacha.

### Prayer (waiting)

- **Keter Malkhut (Rabbi Shlomo ibn Gabirol), Hebrew text** (כתר מלכות). Rabbi Shlomo ibn Gabirol, c. 1021-1058, Spain. `keter-malkhut-hebrew`
  - Edition: Hebrew text (Israel Davidson's edition, Philadelphia, 1923)
  - Why it waits: For the board (library question 9). Said on Yom Kippur in many communities. On Sefaria the Hebrew is Israel Davidson's scholarly edition (he taught at the Jewish Theological Seminary, to confirm); a machzor's text would be better. Israel Zangwill's English is already in excluded.yaml.

### Dictionaries and guides to learning (waiting)

- **Sefer HaBachur (Rabbi Eliyahu Bachur's Hebrew grammar)** (ספר הבחור). Rabbi Eliyahu Bachur (Elia Levita), 1469-1549, Italy and Germany. `sefer-habachur`
  - Edition: English, translated by Betzalel Avraham Feinstein (2026)
  - Why it waits: For the board (library question 12); see malbim-ayelet-hashachar-english.
  - About the work: A classic grammar of Hebrew, for teaching people to read the texts. Its author also taught Hebrew to Christian scholars, for which some rabbis of his time criticized him (to confirm).
- **The Malbim's Ayelet HaShachar, in English**. Rabbi Meir Leibush Weiser (Malbim). `malbim-ayelet-hashachar-english`
  - Edition: English, translated by Betzalel Avraham Feinstein (2021)
  - Why it waits: For the board (library question 12). The Malbim's 613 rules by which the Sages read the Torah, the introduction to his commentary on the Sifra. We don't know the translator, who has also put English of the Malbim on Nach on Sefaria. Sefaria's Hebrew has no license listed.
- **Gan Naul (Naftali Hertz Wessely on Hebrew synonyms)** (גן נעול). Naftali Hertz Wessely, 1725-1805. `gan-naul-wessely`
  - Edition: Hebrew text (Rishon LeZion, 2016)
  - Why it waits: For the board. A study of Hebrew roots and words of the same meaning in Tanakh. Its author was a leader of the Berlin Haskalah whose pamphlet Divrei Shalom VeEmet was condemned by the leading rabbis of his day (that pamphlet is in excluded.yaml).
- **Tribal Lands (the twelve tribes in their territories)**. Tamar Weissman, published 2015-2019. `tribal-lands`
  - Edition: English text
  - Why it waits: For the board. We could not confirm the author's background.

## Part 3. Left out, and why

These stay out of the library. RabAI never quotes them as authority, though it may describe their authors' views as other positions when someone asks. Many sit beside Orthodox editions on Sefaria, which is why the library lists editions one by one and never imports a whole collection.

### Left out; you may reconsider

- **The Holy Scriptures (JPS, 1917)** `jps-1917`
  - Why: Not an Orthodox translation. Produced by a non-denominational scholarly committee. Public domain, which makes it easy to import by mistake. Open question 2 in the founding spec covers public-domain translations like this one.
- **The Code of Maimonides (Yale Judaica Series)** `yale-judaica-mishneh-torah`
  - Why: An academic series with translators of mixed affiliation. Excluded as a whole. The board may approve individual volumes by Orthodox translators.
- **The Kuzari, translated by Hartwig Hirschfeld (1905)** `hirschfeld-kuzari-1905`
  - Why: An academic translation. Public domain. Excluded until the board decides on older translations by non-Orthodox translators.
- **Machine translations (AI and automatic translation tools)** `machine-translations`
  - Why: Written by a computer, not by a translator from inside the tradition. A model must never learn Torah from another model's guesses. Some are edited by a person (for example the 2026 Kli Yakar, made with Claude and edited by Rabbi Francis Nataf). The board may look at those one at a time.
- **Sifre on Deuteronomy, edited by Louis Finkelstein (JTS, 1969)** `sifre-finkelstein-jts`
  - Why: An academic critical edition from the Jewish Theological Seminary (Conservative). The library uses a traditional text of the Sifrei instead.
- **Academic translations of Midrash and Targum by scholars outside the tradition** `academic-translations-of-midrash-and-targum`
  - Why: Translations by Christian clergy and university scholars (for example J. W. Etheridge, John T. Townsend, Eveline van Staalduine-Sulman, Martin Jaffee). Their notes and choices are not from inside the mesorah.
- **Gifts for the Poor (Mishneh Torah), translated by Joseph B. Meszler (2003)** `meszler-gifts-for-the-poor`
  - Why: As far as we know the translator is a Reform rabbi. To confirm. If he is not, the board can look at the translation like any other.
- **The "McCaul Translation" of Radak on Zechariah** `mccaul-radak`
  - Why: Probably by Alexander McCaul, a Christian missionary, whose translation served his argument with Judaism. To confirm who the translator is.
- **Academic translations of Heikhalot, the minor tractates, Megillat Ta'anit, the Mekhilta and others** `academic-translations-other`
  - Why: Translations by university scholars outside the tradition (Morton Smith and Gershom Scholem, James Montgomery, Solomon Zeitlin, Jacob Lauterbach, Jonathan Brumberg-Kraus, Yitzhak Berger). Their notes and choices are not from inside the mesorah. Yitzhak Berger's Hebrew critical edition of Radak on Chronicles is not listed here; it waits on library question 9 (scholars' editions).
- **Keter Malkhut, translated by Israel Zangwill (JPS, 1923)** `keter-malkhut-zangwill`
  - Why: A literary translation by a writer outside the tradition.
- **The Ramban's letter to his son, as edited and translated by Solomon Schechter (Jewish Quarterly Review, 1892)** `ramban-letter-schechter`
  - Why: Edited and translated by Solomon Schechter, who later led the Jewish Theological Seminary (Conservative). Sefaria uses the same version name for his Hebrew text and his English, so this bars both. The board may prefer a traditional printing; see also Iggeret HaRamban in canon.yaml.
- **Translations that name no translator (Sefaria Responsa Anthology, Wikisource English)** `unattributed-translations`
  - Why: Nobody can say whose understanding of the text they carry, like the Sefaria Community Translation. Suggested in library question 13. "Iggeret HaGra -- Wikisource" is not listed because Sefaria uses the same name for the Hebrew text; the canon lists only the Hebrew. "The Sefaria Midrash Rabbah, 2022" also names no translator; the canon holds it for review.
- **Joseph I. Gorfinkle's editions (the Eight Chapters, 1912; Pirkei Avot, 1913)** `gorfinkle-translations`
  - Why: The editor studied at Hebrew Union College (Reform) and was rabbi of Sinai Temple in Mount Vernon, New York. Public domain, which makes it easy to import by mistake. Sefaria uses the Eight Chapters version name for both his Hebrew text and his English, so this bars both. The canon's Eight Chapters uses the Wikisource Hebrew instead.
- **Sefer HaYirah, translated by Rabbi Justin S. Kerber (2007)** `sefer-hayirah-kerber`
  - Why: As far as we know the translator is rabbi of B'nai Sholom in Quincy, Illinois, a Reform congregation. To confirm that this is the same Rabbi Justin Kerber.
- **The Zohar, translated by Harry Sperling, Maurice Simon and Paul P. Levertoff (Soncino Press, London, 1931-1934)** `soncino-zohar`
  - Why: Volumes III and IV (Exodus, and Leviticus chapters 1 to 11) were translated with Paul P. Levertoff, who was baptized in 1895 and worked for Christian missions to the Jews; one study describes his popularizing of Kabbalah as a missionizing tactic. Sefaria holds all five volumes as one version, so his part cannot be left out on its own. Volumes I, II and V (Genesis, and Leviticus 12 to Deuteronomy) are credited to Harry Sperling and Maurice Simon; Simon also co-edited the Soncino Midrash Rabbah, which the canon lists for review. If the board wants those volumes, the build needs a way to take only some sections of a version (the parashiyot of Genesis, and from Tazria on). The volume credits come from library catalog records and should be checked against the title pages (to confirm). The translation is partial: it leaves out the Idrot, most of the Ra'aya Mehemna and the addenda, about a third of the Zohar's paragraphs. Sefaria lists it as public domain, but volumes printed in 1931-1934 may be under US copyright until 2027-2030 (to confirm).
- **The Zohar: Pritzker Edition, translated by Daniel C. Matt and others (Stanford University Press, 2004-2017), with its Aramaic text** `pritzker-zohar`
  - Why: An academic translation, made from an Aramaic text that Professor Matt reconstructed from manuscripts in place of the printed text. Its notes and choices are not from inside the mesorah. Not on Sefaria's export as of 2026-10-07. Library question 9 (scholars' editions) covers the Aramaic text as well as the translation.
- **Short translations of single Zohar passages on Sefaria, by translators we could not identify** `zohar-english-fragments`
  - Why: Each is an excerpt of under 60 KB, by a translator who is unnamed or whom we could not identify, and Sefaria lists each with license unknown. "Français [fr]" is a French translation (Jean-Claude Sudre) filed as English. "Scholem, Gershom" is already barred (academic-translations-other), and David Mevorach Seidenberg's version by kabbalah-and-ecology. Three other short Zohar versions are not listed because Sefaria uses the same names on other books: "Ami Silver, 2020" (also on six Chassidut titles), Leonard Moskowitz's "The Soul of Life" (his Nefesh HaChayim, waiting on library question 12) and "Publicado em 5784, Saymon Pires da Silva [pt]" (Portuguese, on 140 titles). Ira Robinson may be the historian of that name (to confirm).
- **A New Israeli Commentary on Pirkei Avot, by Avigdor Shinan (2009)** `shinan-pirkei-avot`
  - Why: An academic commentary by a university professor, written to connect the text with Israeli culture rather than to explain it within the tradition.
- **Responsa in Wartime (1947) and Responsa to Chaplains (1953)** `wartime-chaplains-responsa`
  - Why: Answers from an interdenominational committee of Reform, Conservative and Orthodox rabbis for Jewish chaplains in the U.S. armed forces (to confirm the committee's members). Of historical interest, but not a source of halacha.
- **Rabbi Ezra of Gerona on Shir HaShirim, translated by Seth Brody (Western Michigan University, 1999)** `brody-ezra-of-gerona`
  - Why: An academic translation, from a university series. Its notes and choices are not from inside the mesorah.
- **Moreh Nevukhei HaZeman, by Nachman Krochmal (1851)** `krochmal-moreh-nevukhei-hazeman`
  - Why: A philosophy of Jewish history by a leading thinker of the Haskalah, who accepted the critical dating of parts of Tanakh, such as a later author for the second half of Yeshayahu and psalms from the time of the Chashmona'im (to confirm the passages). On Sefaria as "Warsaw, 1894", a version name too common to list here without barring other books.
- **Divrei Shalom VeEmet (Words of Peace and Truth), by Naftali Hertz Wessely (1782)** `wessely-divrei-shalom-veemet`
  - Why: A pamphlet of the Berlin Haskalah urging changes in Jewish education, which the leading rabbis of its day, among them Rabbi Yechezkel Landau (the Noda BiYehuda), condemned (to confirm). The Hebrew is on Sefaria as "Warsaw, 1886", a version name too common to list here. The same author's Gan Naul, a study of Hebrew words, is held for the board in canon.yaml (gan-naul-wessely).
- **Sifrei Zuta: Midrashah shel Lod, by Saul Lieberman (1968)** `lieberman-sifrei-zuta`
  - Why: An academic study by Professor Saul Lieberman of the Jewish Theological Seminary (Conservative), like his Tosefta Kifshutah, which the canon also leaves out. On Sefaria as "New York, 1968", a version name too common to list here.

### Left out

- **Tanakh, The Holy Scriptures (New JPS translation, 1985)** `njps-1985`
  - Why: Not an Orthodox translation.
- **The Contemporary Torah (JPS, 2006)** `contemporary-torah`
  - Why: A gender-sensitive adaptation of the 1985 JPS translation. Not an Orthodox translation.
- **Mishnah Yomit, translated by Dr. Joshua Kulp** `mishnah-yomit-kulp`
  - Why: The translator teaches at the Conservative Yeshiva in Jerusalem. On Sefaria this has been the default English Mishnah, so it gets pulled in by any whole-collection import. Confirm the current default before ingesting any Mishnah translation.
- **Mesillat Yesharim, translated by Mordecai M. Kaplan (JPS, 1936)** `mesillat-yesharim-kaplan-1936`
  - Why: The translator founded Reconstructionist Judaism. Approve an Orthodox translation of Mesillat Yesharim instead (see canon.yaml, ramchal).
- **Translations of Rav Kook by Ben Zion Bokser (Paulist Press)** `rav-kook-bokser`
  - Why: The translator was a Conservative rabbi. Use Orthodox translations, such as those by Rabbi Bezalel Naor.
- **User-created source sheets (Sefaria and similar sites)** `sefaria-source-sheets`
  - Why: Written by anyone, with no review. They often mix sources from every movement. Never index them.
- **Non-Orthodox Chumashim and commentaries (for example, Etz Hayim and the Plaut Torah commentary)** `non-orthodox-commentaries`
  - Why: Not Orthodox. Their views may be described as other positions, never cited as authority.
- **Academic biblical and Talmudic scholarship (for example, Documentary Hypothesis literature)** `academic-biblical-scholarship`
  - Why: Not a source of authority. The assistant may describe these theories accurately, labeled as academic theories, and present Orthodox responses to them.
- **Sefaria Community Translation (and other unattributed volunteer translations)** `sefaria-community-translation`
  - Why: Written by volunteers with no named translator and no review, so nobody can say whose understanding of the text it carries. The private testing library never uses it.
- **Translations from the Conservative Yeshiva (Daf Shevui and others)** `conservative-yeshiva-translations`
  - Why: Not Orthodox. Produced by a Conservative institution.
- **Orchot Tzaddikim, translated by Seymour J. Cohen (Ktav, 1982)** `orchot-tzaddikim-cohen`
  - Why: The translator was a Conservative rabbi. Approve an Orthodox translation instead.
- **Translations from Reform seminaries (for example HUC theses)** `reform-seminary-translations`
  - Why: Not Orthodox.
- **Translations from Kabbalah and Ecology by Rabbi Dr. David Mevorach Seidenberg** `kabbalah-and-ecology`
  - Why: Written from outside the Orthodox world, with its own theological program.
- **The Babylonian Talmud, translated by Michael L. Rodkinson** `rodkinson-talmud`
  - Why: An abridged, rearranged translation by a translator who broke with the tradition. Not a faithful translation of the Gemara.
- **Sefer HaYashar, translated by Seymour J. Cohen (1973)** `sefer-hayashar-cohen`
  - Why: The translator was a Conservative rabbi (see orchot-tzaddikim-cohen).
- **Sefer Yetzirah, translated by Isidor Kalisch (New York, 1877)** `sefer-yetzirah-kalisch`
  - Why: The translator was a Reform rabbi. Public domain, which makes it easy to import by mistake.
- **Siddur Sim Shalom** `siddur-sim-shalom`
  - Why: The Conservative movement's siddur. Its text and translation are not Orthodox.
- **Responsa and translations from Conservative and egalitarian institutions (Rabbi David Golinkin, Hadar)** `conservative-and-egalitarian-responsa`
  - Why: Not Orthodox. Sefaria places them beside the Mishneh Torah and Shulchan Arukh commentaries and the minor tractates.
- **Translations by Rabbi Mark B. Greenspan (Haggadah commentaries, Abudarham, Nachal Eshkol and others)** `greenspan-translations`
  - Why: The translator is a Conservative rabbi; he led the Oceanside Jewish Center, a Conservative congregation, from 1997 to 2024.
- **Translations by Rabbi Robert Alpert (Bartenura on the Mishnah, the Rambam on the Mishnah)** `alpert-translations`
  - Why: Not Orthodox: Sefaria itself names him a Conservative rabbi in one version title, and he teaches at the Academy for Jewish Religion, a non-Orthodox seminary. One more version, "Bartenura on Mishnah, trans. by Rabbi Robert Alpert, 2020" with a non-breaking space after "Rabbi", is barred by the first name below, since names are compared without spaces or punctuation.
- **Tzav VeZeruz (the Piaseczno Rebbe), translated by Aubrey Glazer (2025)** `tzav-vezeruz-glazer`
  - Why: The translator received his rabbinic ordination from the Jewish Theological Seminary (Conservative).
- **The Zohar with the Sulam commentary in English, published by the Kabbalah Centre (ed. Michael Berg)** `kabbalah-centre-zohar`
  - Why: Orthodox authorities have repeatedly criticized the Kabbalah Centre; in the UK the Chief Rabbi, the London Beth Din and the United Synagogue warned synagogues that it is outside their authority (to confirm the date). Not on Sefaria's export.
- **The Torah: A Women's Commentary (CCAR Press and Women of Reform Judaism, 2008)** `torah-womens-commentary`
  - Why: Published by the Reform movement's rabbinical association and its women's organization. Not Orthodox.
- **The Legends of the Jews, by Louis Ginzberg (1909-1938)** `ginzberg-legends-of-the-jews`
  - Why: A retelling of midrashim by Professor Louis Ginzberg of the Jewish Theological Seminary (Conservative). It is not itself a source; the library holds the midrashim.
- **Dirshuni I and II (new midrash by Israeli women writers, 2009 and 2018)** `dirshuni`
  - Why: New midrashim written today by writers from across the denominations, many on feminist themes. Not part of the tradition's texts.
- **Kol Dodi Dofek, Hebrew "reconstructed from the English"** `kol-dodi-dofek-reconstructed-hebrew`
  - Why: Not Rav Soloveitchik's own Hebrew (which is copyrighted) but a translation back into Hebrew from an English translation. The canon lists David Z. Gordon's English instead (rav-soloveitchik).
- **The Improvement of the Moral Qualities (Ibn Gabirol), translated by Stephen S. Wise (1902)** `improvement-of-moral-qualities-wise`
  - Why: The translator was a leading Reform rabbi.
- **Sefer HaYashar (the midrash), translated by Edward B. M. Browne (1876)** `sefer-hayashar-midrash-browne`
  - Why: The translator was a Reform rabbi in America (to confirm). The canon lists the Hebrew (sefer-hayashar-midrash).
- **Targum Sheni on Esther, translated by Paulus Cassel (1888)** `cassel-targum-sheni`
  - Why: Translated with notes by Paulus Cassel, who left Judaism for Christianity; his book also discusses Mithra and Zoroaster. Not from inside the mesorah.

## Part 4. How RabAI opens the commentaries

When RabAI opens a text, it opens the commentaries printed with it in this order, each book giving a line or two before the next is opened. For a question of halacha it starts from the seif of the Shulchan Aruch, keeps the Mechaber's ruling and the Rema's gloss apart, and names which layer each point comes from. It also opens the same siman in the Tur, the Beit Yosef and the Aruch HaShulchan, the halacha in the Rambam, and, for Sephardic practice, the Kaf HaChayim and the Ben Ish Chai. For a practical question it explains the positions and tells the person to ask their rav. Is this the right order? Are the right commentaries named first?

This order is a draft, waiting for your review.

### A seif of the Shulchan Aruch, Orach Chayim

1. First: Mishnah Berurah; Biur Halacha.
2. Next: Magen Avraham; the Taz (Turei Zahav).
3. Then the sources of the ruling: the Gemara, the Rambam, the Tur, the Beit Yosef, the Yerushalmi and the Rif.
4. Later: the Vilna Gaon's commentary (Beur HaGra); Sha'arei Teshuvah; Rabbi Akiva Eiger; Kaf HaChayim; Machatzit HaShekel; Peri Megadim.
5. Then any other commentary printed with it, and last the cross-references.

### A seif of the Shulchan Aruch, Yoreh De'ah

1. First: the Shach (Siftei Kohen); the Taz (Turei Zahav).
2. Next: Pitchei Teshuva; Rabbi Akiva Eiger; the Vilna Gaon's commentary (Beur HaGra).
3. Then the sources of the ruling: the Gemara, the Rambam, the Tur, the Beit Yosef, the Yerushalmi and the Rif.
4. Later: Nekudot HaKesef; Peri Megadim; Kaf HaChayim; Kereti; Peleti.
5. Then any other commentary printed with it, and last the cross-references.

### A seif of the Shulchan Aruch, Even HaEzer

1. First: Chelkat Mechokek; Beit Shmuel.
2. Next: the Taz (Turei Zahav); Pitchei Teshuva; the Vilna Gaon's commentary (Beur HaGra).
3. Then the sources of the ruling: the Gemara, the Rambam, the Tur, the Beit Yosef, the Yerushalmi and the Rif.
4. Later: Rabbi Akiva Eiger; Beit Meir; Ezer MiKodesh.
5. Then any other commentary printed with it, and last the cross-references.

### A seif of the Shulchan Aruch, Choshen Mishpat

1. First: the Sma (Me'irat Einayim); the Shach (Siftei Kohen).
2. Next: Ketzot HaChoshen; Netivot HaMishpat, Beurim; Netivot HaMishpat, Hidushim; the Taz (Turei Zahav); Pitchei Teshuva; the Vilna Gaon's commentary (Beur HaGra).
3. Then the sources of the ruling: the Gemara, the Rambam, the Tur, the Beit Yosef, the Yerushalmi and the Rif.
4. Later: Urim VeTumim, Urim; Urim VeTumim, Tumim; Rabbi Akiva Eiger; Chatam Sofer.
5. Then any other commentary printed with it, and last the cross-references.

### A halacha of the Rambam's Mishneh Torah

1. First: Maggid Mishneh; Kessef Mishneh; the Ra'avad's glosses (Hasagot HaRa'avad).
2. Next: Lechem Mishneh; Mishneh LaMelech; Migdal Oz; Commentary of Mahari Kurkus and Radbaz.
3. Then the Rambam's sources: the Gemara, the Yerushalmi, the Tosefta and the halachic midrashim, and the Rif.
4. Later: Ohr Sameach; Sha'ar HaMelekh; Even Ha'azel; Tzafnat Pa'neach; Avodat HaMelekh; Kiryat Sefer. With the later commentaries, the later codes that rule with him or against him: the Tur and the Shulchan Aruch.
5. Then any other commentary printed with it, and last the cross-references.

### A line of the Gemara (Talmud Bavli)

1. First: Rashi; Tosafot.
2. Then the codes that rule on the line (the Ein Mishpat: the Rambam, the Shulchan Aruch and the Tur), the mishnah it explains, and the Rif.
3. Next: Rabbeinu Chananel; Chiddushei Ramban; Rashba; Ritva; Ran; Rosh; Tosafot HaRosh; Meiri; Shita Mekubetzet.
4. Later: the Maharsha (Chidushei Halachot); the Maharsha (Chidushei Agadot); Maharam; Penei Yehoshua; Rashash.
5. Then any other commentary printed with it, and last the cross-references.

### A mishnah

1. First: Bartenura; Rambam; Tosafot Yom Tov.
2. Next: Tiferet Yisrael (Yachin); Tiferet Yisrael (Boaz); Melekhet Shelomoh; Tosafot Rabbi Akiva Eiger; Ikar Tosafot Yom Tov.
3. Then any other commentary printed with it, and last the cross-references.

### A verse of the Torah

1. First: Onkelos; Rashi; Ramban; Ibn Ezra; Sforno.
2. Next: Rashbam; Or HaChaim; Kli Yakar; the Ba'al HaTurim (Kitzur Ba'al HaTurim); the Netziv (Haamek Davar); Chizkuni; Rabbeinu Bahya; Siftei Chakhamim; Targum Yonatan (Targum Jonathan); Malbim; Radak.
3. Then any other commentary printed with it, and last the cross-references.

### A verse of Nevi'im or Ketuvim

1. First: Rashi; Radak; Metzudat David; Metzudat Zion.
2. Next: Malbim; Ibn Ezra; Ralbag; Abarbanel.
3. Then any other commentary printed with it, and last the cross-references.

## Part 5. Websites RabAI may search

When the library doesn't cover a question, or for a practical halacha question, RabAI may look online. A page it finds is never a source: RabAI opens the texts the page relies on in its own library, checks the page against them, and rests its answer on the texts. It keeps nothing it finds.

This list waits for your review.

### The only sites RabAI searches about Torah, halacha or belief

- **Din Online** (dinonline.org): Rabbis' answers to halacha questions, with sources
- **Halachipedia** (halachipedia.com): Summaries of halacha topics with their sources
- **Torah.org** (torah.org): Halacha series and Torah articles (Project Genesis)
- **Ohr Somayach** (ohr.edu): Ask the Rabbi, halacha and Torah articles
- **Rabbi Yirmiyohu Kaganoff** (rabbikaganoff.com): Halacha articles with sources
- **Kollel Iyun HaDaf** (dafyomi.co.il): Daf Yomi insights, summaries and questions
- **Orthodox Union** (ou.org): Halacha, kashrus and Torah articles
- **OU Torah** (outorah.org): Halacha and Torah articles
- **YU Torah** (yutorah.org): Shiurim and articles from Yeshiva University's rabbis
- **TorahWeb** (torahweb.org): Articles by roshei yeshiva of Yeshiva University
- **Aish** (aish.com): Ask the Rabbi, Torah and Jewish thought (written permission, canon/permissions.yaml)
- **Chabad.org** (chabad.org): Halacha, Torah, customs and zmanim (written permission, canon/permissions.yaml)
- **Ask the Rav** (asktherav.com): Chabad rabbis' answers to halacha questions
- **Shulchan Aruch HaRav (Rabbi Yaakov Goldstein)** (shulchanaruchharav.com): Halacha summaries following the Alter Rebbe's Shulchan Aruch
- **Yeshivat Har Etzion** (etzion.org.il): Shiurim and articles (the Virtual Beit Midrash)
- **Yeshiva.org.il** (yeshiva.org.il): Halacha questions and answers, in Hebrew
- **Yeshiva.co** (yeshiva.co): Halacha questions and answers, in English
- **Daily Halacha (Rabbi Eli Mansour)** (dailyhalacha.com): Sephardi halacha
- **Halacha Yomit** (halachayomit.co.il): Halacha following the rulings of Rav Ovadia Yosef
- **Star-K** (star-k.org): Kashrus guidance and halacha articles
- **OU Kosher** (oukosher.org): Kashrus guidance and product questions
- **Chicago Rabbinical Council** (crcweb.org): Kashrus guidance
- **AskCRC** (askcrc.org): Kashrus questions and answers
- **Kof-K** (kof-k.org): Kashrus guidance
- **OK Kosher** (ok.org): Kashrus guidance
- **MyZmanim** (myzmanim.com): Zmanim (halachic times) for a place and date

### Never searched, even for everyday facts

- **TheTorah.com** (thetorah.com): Academic Bible criticism
- **Union for Reform Judaism** (reformjudaism.org): A non-Orthodox movement
- **Hebrew Union College** (huc.edu): A non-Orthodox movement's seminary
- **The Rabbinical Assembly** (rabbinicalassembly.org): A non-Orthodox movement
- **United Synagogue of Conservative Judaism** (uscj.org): A non-Orthodox movement
- **Jewish Theological Seminary** (jtsa.edu): A non-Orthodox movement's seminary
- **Reconstructing Judaism** (reconstructingjudaism.org): A non-Orthodox movement
- **ALEPH** (aleph.org): A non-Orthodox movement
- **My Jewish Learning** (myjewishlearning.com): Presents every movement's views side by side
- **Sefaria** (sefaria.org): Hosts non-Orthodox editions and community source sheets; RabAI reads its whitelisted editions through the library instead
- **Mi Yodeya** (judaism.stackexchange.com): Anonymous community answers
- **Bible Odyssey** (bibleodyssey.org): Academic Bible criticism
- **Got Questions** (gotquestions.org): Christian teaching about the Bible
- **Bible Gateway** (biblegateway.com): Christian Bible translations
- **Bible Hub** (biblehub.com): Christian Bible commentary
- **Blue Letter Bible** (blueletterbible.org): Christian Bible commentary
- **Jews for Jesus** (jewsforjesus.org): Christian missionary organization
- **One for Israel** (oneforisrael.org): Christian missionary organization

## Part 6. Not in the library yet

Editions the canon wants but RabAI can't use yet: copyrighted translations that need the publisher's agreement, and texts with no copy we may use (no open license yet, or a typing still to be found).

### Needs the publisher's agreement

- **Tanakh**: The Stone Edition Tanach [English]. `tanakh`
- **Tanakh**: The Living Torah (Rav Aryeh Kaplan) — Chumash only [English]. `tanakh`
- **Rashi on Tanakh**: Sapirstein Edition Rashi [English]. `rashi-tanakh`
- **Sforno on the Torah**: Sforno, translated by Rabbi Raphael Pelcovitz. `sforno-torah`
- **Da'at Mikra**: Hebrew text. `daat-mikra`
- **Mishnah**: Yad Avraham Mishnah [English]. `mishnah`
- **Talmud Bavli**: Schottenstein Edition Talmud [English]. `talmud-bavli`
- **Talmud Yerushalmi**: Schottenstein Edition Talmud Yerushalmi [English]. `talmud-yerushalmi`
- **Midrash (Midrash Rabbah, Tanchuma, Mechilta, Sifra, Sifrei)**: Kleinman Edition Midrash Rabbah [English]. `midrash`
- **Rambam's Commentary on the Mishnah, including the introduction to Perek Chelek (the Thirteen Ikkarim)**: Hebrew translation from the Arabic by Rabbi Yosef Kafih. `rambam-perush-hamishnah`
- **Kehillos Yaakov**: Hebrew text. `kehillos-yaakov`
- **Shulchan Aruch HaRav**: English translation. `shulchan-aruch-harav`
- **Mishnah Berurah**: Mishnah Berurah, English (ed. Rabbi Aharon Feldman). `mishnah-berurah`
- **The Brisker method (Chiddushei Rabbeinu Chaim HaLevi on the Rambam; Chiddushei HaGriz)**: Hebrew texts. `brisk`
- **Igrot Moshe**: Hebrew text. `igrot-moshe`
- **Yabia Omer**: Hebrew text. `yabia-omer`
- **Minchat Shlomo and other works of Rav Shlomo Zalman Auerbach**: Hebrew text. `rav-shlomo-zalman-auerbach`
- **Yechave Da'at**: Hebrew text. `yechave-daat`
- **Yalkut Yosef**: Hebrew text. `yalkut-yosef`
- **Shemirat Shabbat KeHilchata**: Hebrew text. `shmirat-shabbat-khilchata`
- **Shemirat Shabbat KeHilchata**: English translation. `shmirat-shabbat-khilchata`
- **The Kuzari**: The Kuzari — In Defense of the Despised Faith, translated by Rabbi N. Daniel Korobkin. `kuzari`
- **Works of Rav Samson Raphael Hirsch (The Nineteen Letters, Horeb, the Hirsch Chumash, Collected Writings)**: The Nineteen Letters (ed. Rabbi Joseph Elias) [English]. `rav-hirsch`
- **Works of Rav Samson Raphael Hirsch (The Nineteen Letters, Horeb, the Hirsch Chumash, Collected Writings)**: The Hirsch Chumash, translated by Rabbi Daniel Haberman. `rav-hirsch`
- **Works of Rav Kook (Orot, Orot HaTeshuvah, Olat Re'iyah, Igrot HaRe'iyah)**: Translations by Rabbi Bezalel Naor (e.g., Orot). `rav-kook`
- **Works of Rav Soloveitchik (Halakhic Man, The Lonely Man of Faith, Kol Dodi Dofek, U-Vikkashtem mi-Sham, Shiurim LeZecher Abba Mari)**: The Lonely Man of Faith [English]. `rav-soloveitchik`
- **Works of Rav Soloveitchik (Halakhic Man, The Lonely Man of Faith, Kol Dodi Dofek, U-Vikkashtem mi-Sham, Shiurim LeZecher Abba Mari)**: OU Press / Toras HoRav Foundation volumes [English]. `rav-soloveitchik`
- **Works of Rav Aryeh Kaplan (Handbook of Jewish Thought; Immortality, Resurrection, and the Age of the Universe; and others)**: English originals. `rav-aryeh-kaplan`
- **Shaarei Teshuvah (The Gates of Repentance)**: The Gates of Repentance, translated by Rabbi Shraga Silverstein. `shaarei-teshuvah`
- **Works of the Ramchal (Mesillat Yesharim, Derech Hashem, Da'at Tevunot)**: Mesillat Yesharim, translated by Rabbi Shraga Silverstein. `ramchal`
- **Works of the Ramchal (Mesillat Yesharim, Derech Hashem, Da'at Tevunot)**: Derech Hashem, translated by Rabbi Aryeh Kaplan. `ramchal`
- **Michtav MeEliyahu**: Hebrew text. `michtav-meeliyahu`
- **Michtav MeEliyahu**: Strive for Truth!, translated by Rabbi Aryeh Carmell. `michtav-meeliyahu`
- **48 Ways to Wisdom**: 48 Ways (Aish.com series and book) [English]. `rav-noah-weinberg-48-ways`
- **Alei Shur**: Hebrew text. `alei-shur`
- **Works of Rabbi Dr. Abraham J. Twerski**: English originals. `rav-twerski`
- **Rebbe Nachman's teachings on hisbodedut (Likutei Moharan; Outpouring of the Soul)**: Outpouring of the Soul, translated by Rabbi Aryeh Kaplan. `rebbe-nachman-hisbodedut`
- **Netivot Shalom**: Hebrew text. `netivot-shalom`
- **Siddur (Nusach Ashkenaz, Sefard, Edot HaMizrach, Ari)**: Koren Siddur [English]. `siddur`
- **Siddur (Nusach Ashkenaz, Sefard, Edot HaMizrach, Ari)**: ArtScroll Siddur [English]. `siddur`
- **English guides to learning Gemara (The Talmud, A Reference Guide; The Practical Talmud Dictionary)**: The Talmud, A Reference Guide [English]. `talmud-reference-english`
- **English guides to learning Gemara (The Talmud, A Reference Guide; The Practical Talmud Dictionary)**: The Practical Talmud Dictionary [English]. `talmud-reference-english`

### No copy we may use yet

- **Tanakh**: Masoretic text, Hebrew (Koren / Breuer edition, based on the Aleppo Codex). `tanakh`
- **Tanakh**: Judaica Press Tanakh (as published on Chabad.org with Rashi) [English]. `tanakh`
- **Ramban on the Torah**: Hebrew text (Chavel edition). `ramban-torah`
- **Works of Rav David Zvi Hoffmann (his commentaries and his answer to the Graf-Wellhausen hypothesis; Melamed LeHo'il)**: Hebrew and German originals and Hebrew translations. `rav-dz-hoffmann`
- **Mishnah**: Mishnayot Kehati, English. `mishnah`
- **Mishnah**: Steinsaltz Mishnah [English]. `mishnah`
- **Talmud Bavli**: Soncino Talmud (ed. Rabbi Isidore Epstein) [English]. `talmud-bavli`
- **Talmud Yerushalmi**: Hebrew/Aramaic text, standard. `talmud-yerushalmi`
- **Kovetz Shiurim and Kovetz He'aros**: Hebrew text. `kovetz-shiurim`
- **Shaarei Yosher**: Hebrew text. `shaarei-yosher`
- **The Radziner Rebbe's books on tekhelet (Sefunei Temunei Chol, Petil Tekhelet, Ein HaTekhelet)**: Hebrew text (Bnei Brak 1999 reprint on Sefaria). `radziner-tekhelet`
- **Moreh Nevuchim (Guide for the Perplexed)**: Hebrew translation by Rabbi Yosef Kafih. `moreh-nevuchim`
- **Derashot HaRan**: Hebrew text. `derashot-haran`
- **Nefesh HaChaim**: Nefesh HaChaim, translated by Rabbi Avraham Yaakov Finkel. `nefesh-hachaim`
- **Works of Rav Samson Raphael Hirsch (The Nineteen Letters, Horeb, the Hirsch Chumash, Collected Writings)**: Horeb, translated by Dayan Isidor Grunfeld. `rav-hirsch`
- **Works of the Ramchal (Mesillat Yesharim, Derech Hashem, Da'at Tevunot)**: Hebrew text. `ramchal`
- **Chochmah U'Mussar**: Hebrew text. `chochmah-umussar`
- **Shivchei HaRan and Sichot HaRan**: Hebrew text. `rabbi-nachmans-wisdom`
- **Likutei Tefilot (Rebbe Natan of Breslov)**: Hebrew text. `likutei-tefilot`
- **Likkutei Etzot (Rebbe Nachman's advice, gathered by Rebbe Natan)**: Hebrew text. `likkutei-etzot`
- **Sha'ar HaYichud (the Mitteler Rebbe)**: Hebrew text. `shaar-hayichud-mitteler-rebbe`
- **Mareh Yechezkel on the Torah**: Hebrew text. `mareh-yechezkel-on-torah`
- **Sefer HaZohar**: Aramaic text of the Sulam edition (Rabbi Yehuda Ashlag, Jerusalem, 1945-1955). `zohar`
- **Sefer HaZohar**: Aramaic text as printed (Mantua 1558-1560, or Vilna 1882), from a typing still to be found. `zohar`
- **Classic works on the method of the Talmud (Mevo HaTalmud, Halichot Olam, Yad Malachi)**: Hebrew texts. `talmud-method-classics`

## Part 7. Earlier questions for the board

Notes in this list that mention a "library question" refer to these, from our comparison of the library with Mercava's catalog (docs/library-comparison.md, section 3, where each is set out in full). Notes that mention an "open question" refer to the board's questions on the rest of RabAI, in the founding spec (docs/founding-spec.md), among them the default halachic baseline, women's voices, and reference works by authors outside Orthodoxy.

### Kabbalah

1. How should RabAI treat Kabbalah?
2. The Zohar itself isn't on Mercava's list as transcribed, and Sefaria has no openly licensed Hebrew of it (the Sulam edition and the others are marked "unknown").
3. Mitpachat Sefarim is Rabbi Yaakov Emden's attack on the Sabbatean movement, and in it he disputes how old parts of the Zohar are.

### Debated authors and works

4. The Ralbag (Rabbi Levi ben Gershom): his Tanach commentary is printed in Mikraot Gedolot, but later authorities sharply criticized some of his philosophy.
5. Rabbi Yosef ibn Yahya (Bologna, 1538): his writings are described as controversial, but we couldn't check the details here.
6. Teshuvot Min HaShamayim, answers a Tosafist recorded receiving in dreams: how should RabAI present them?
7. The Radziner Rebbe's tekhelet (Ein HaTekhelet, Ptil Tekhelet): his identification of the tekhelet dye was not accepted by many authorities.

### Works whose author is uncertain

8. Sefer HaYashar (the mussar book) is sometimes attributed to Rabbeinu Tam; many consider the author unknown.

### Scholars' editions of Torah texts

9. Texts that exist on Sefaria only in a scholar's edition.
10. Solomon Buber's editions of midrash.

### Translations

11. Translations by non-Orthodox translators (founding spec, open question 2).
12. Translators whose background we don't know.
13. Anonymous and machine translations.

### Modern and copyrighted works

14. Works on Mercava's list that Sefaria doesn't have (most likely under copyright): Kitzur Shulchan Aruch Yalkut Yosef and Otzar Dinim LaIsha VeLaBat (Rabbi Yitzchak Yosef, as far as we know), Siddur Tehilat Hashem (the Chabad siddur), Kochvei Ohr (Rabbi Yitzchak Blazer, as far as we know), Shuvah Yisrael, the Aleppo Haggadah, Ta'amei HaMikra, Hakdamah LaZohar, and one entry under Rabbi Yom Tov Lipmann Heller we couldn't identify.
15. Modern works that are openly licensed, each needing approval as an edition: B'Mareh HaBazak (Eretz Hemdah, CC-BY), Piskei Challah (Oraita edition, CC0), Motar Kinnim (Modiin 2017, CC-BY), Kav HaYashar (Metsudah 2007, CC-BY), Hadran for Tanakh (Rabbi Yona Reiss, license unknown).

## Part 8. The whole library, book by book

Every book RabAI reads, in the order of a beit midrash's shelves and, within each area, of the generations. These are published Orthodox editions, each listed in the canon by name. RabAI quotes and cites only these. Every citation it shows is checked against the passage it came from, and every passage carries its edition's name.

### Tanakh and its commentaries

The Torah, Nevi'im and Ketuvim, the Targumim, and the commentaries on them.

#### Tanakh

- **Tanakh** (תנ״ך). core. `tanakh`
  - Reads: Miqra according to the Masorah (digital Hebrew text on Sefaria). Open digital Hebrew text (Wikisource, CC-BY-SA). It follows the Aleppo Codex, filling its gaps by Rav Mordechai Breuer's method, the text Koren prints. The board confirms.
  - Reads: The Koren Jerusalem Bible (Harold Fisch) [English]
  - Reads: Metsudah Chumash and Tanach series, translated by Rabbi Avrohom Davis
  - Reads: Tanakh according to Rashi, translated by Rabbi Shraga Silverstein

#### The Targumim, the ancient translations

*Tannaim (to about 200 CE)*

- **Targum Onkelos** (תרגום אונקלוס). `targum-onkelos`
  - Reads: Aramaic text, standard Mikraot Gedolot
  - Reads: Targum Onkelos in English, from the Metsudah Chumash (2009)
- **Targum Yonatan on Nevi'im** (תרגום יונתן). Yonatan ben Uziel (attributed). `targum-yonatan`
  - Reads: Hebrew text

*Amoraim (about 200-500 CE)*

- **Targum on Ketuvim (Psalms, Proverbs, Job, the five megillot and Chronicles)** (תרגום). written c. 0-600. `targum-ketuvim`
  - Reads: Aramaic text, Mikraot Gedolot
  - Waiting for your decision: Aramaic text of the Targum on Chronicles (Hebrew Wikisource) (Part 2).
- **Targum Yonatan on the Torah** (תרגום יונתן). written c. 150-250, Eretz Yisrael. `targum-yonatan-torah`
  - Reads: Hebrew text
  - Note: The Targum on the Torah known as Targum Yonatan (Targum Yerushalmi I). Many authorities hold that its attribution to Yonatan ben Uziel is a printer's error; the board may want the assistant to say "attributed to".
- **Targum Yerushalmi (the fragment Targum) on the Torah** (תרגום ירושלמי). written c. 380-1180. `targum-yerushalmi`
  - Reads: Hebrew text

#### Commentaries

*Geonim (about 600-1040)*

- **Rav Saadia Gaon on the Torah** (רס״ג על התורה). Saadia Gaon, Babylonia. `saadia-gaon-on-torah`
  - Reads: Rav Saadia Gaon on the Torah, translated by Rabbi Eliyahu Munk (HaChut HaMeshulash)
  - Note: English only for now. The Hebrew of the commentary on Genesis on Sefaria is a 1984 New York scholar's edition and waits on library question 9.

*Rishonim (about 1040-1550)*

- **Rashi on Tanakh** (רש״י). Rabbi Shlomo Yitzchaki (Rashi), 1040-1105, France. core. `rashi-tanakh`
  - Reads: Hebrew text, standard Mikraot Gedolot
  - Reads: Pentateuch with Rashi, translated by M. Rosenbaum and A. M. Silbermann (1929-34). Possibly public domain. Hosted on Sefaria. Confirm.
  - Reads: Metsudah Chumash/Rashi [English]
  - Reads: Rashi on Nach, translated by Rabbi A. J. Rosenberg
- **Ramban on the Torah** (רמב״ן על התורה). Rabbi Moshe ben Nachman (Ramban), 1194-1270, Spain. core. `ramban-torah`
  - Reads: Commentary on the Torah, translated by Rabbi Charles B. Chavel
  - Reads: Hebrew text, standard (digital editions on Sefaria)
- **Ibn Ezra on Tanakh** (אבן עזרא). Rabbi Avraham ibn Ezra, c. 1089-1164, Spain. core. `ibn-ezra-tanakh`
  - Reads: Hebrew text, standard Mikraot Gedolot
  - Waiting for your decision: Ibn Ezra's Commentary on the Pentateuch, translated by H. Norman Strickman and Arthur M. Silver (Part 2).
  - Note: Ibn Ezra's comment on Devarim 1:2 ("the secret of the twelve") is often quoted by Bible critics. Later commentators discuss how to understand it. The board decides how the assistant presents it.
- **Sforno on the Torah** (ספורנו). Rabbi Ovadia Sforno, c. 1475-1550, Italy. core. `sforno-torah`
  - Reads: Hebrew text, standard Mikraot Gedolot
  - Reads: Sforno, translated by Rabbi Eliyahu Munk (HaChut HaMeshulash)
- **Radak on Tanakh** (רד״ק). Rabbi David Kimchi, c. 1160-1235. `radak`
  - Reads: Hebrew text. Only Genesis and Psalms have openly licensed Hebrew so far; the rest of Nach on Sefaria ("Radak on Nach") lists no license. Yitzhak Berger's critical edition of Chronicles is left out (library question 9).
  - Reads: Radak on Bereshit, translated by Rabbi Eliyahu Munk (HaChut HaMeshulash)
- **Abarbanel on the Torah** (אברבנאל). Isaac Abarbanel, written c. 1483-1513, Italy. `abarbanel-on-torah`
  - Reads: Hebrew text
  - Note: The Abarbanel's commentary on Nach is on Sefaria only in a 1960 Tel Aviv printing whose license is unknown, so only the Torah is listed.
- **Ateret Zekeinim (Abarbanel)** (עטרת זקנים). Isaac Abarbanel, written c. 1465-1475, Lisbon, Portugal. `ateret-zekeinim`
  - Reads: Hebrew text
- **Ba'al HaTurim on the Torah** (בעל הטורים). Jacob ben Asher, written c. 1280-1340, Toledo, Spain. `baal-haturim`
  - Reads: Hebrew text
- **Bekhor Shor on the Torah** (בכור שור). Yosef Bekhor Shor, written c. 1145-1195, France. `bekhor-shor`
  - Reads: Hebrew text. This work survives only in manuscripts; the Hebrew here was printed from them by 19th- and 20th-century scholars (see the version names). A scholar's edition of a Rishon's own words; question 9 of docs/library-comparison.md asks the board how to treat such editions.
- **Chizkuni on the Torah** (חזקוני). Chizkiah ben Manoach (Chizkuni), written c. 1220-1260, France. `chizkuni`
  - Reads: Hebrew text
  - Reads: Chizkuni, translated by Rabbi Eliyahu Munk
- **Da'at Zekenim (the Tosafists on the Torah)** (דעת זקנים). The Tosafists, written c. 1100-1300, France, Germany, Italy and England. `daat-zekenim`
  - Reads: Hebrew text
  - Reads: Da'at Zekenim, translated by Rabbi Eliyahu Munk
- **Hadar Zekenim (the Tosafists on the Torah)** (הדר זקנים). The Tosafists, written c. 1250-1300, France. `hadar-zekenim`
  - Reads: Hebrew text
- **Riva on the Torah** (ריב"א). Yehudah ben Eliezer. `riva-on-torah`
  - Reads: Hebrew text
- **The Rosh on the Torah** (רא"ש). Rabbenu Asher ben Yechiel (Rosh), written c. 1275-1325. `rosh-on-torah`
  - Reads: Hebrew text
  - Note: Attributed to the Rosh.
- **Bartenura on the Torah (Amar Neka)** (ברטנורא על התורה). Ovadiah Bartenura, written c. 1535. `bartenura-on-torah`
  - Reads: Hebrew text
- **Rabbeinu Bachya on the Torah** (רבנו בחיי). Bachya ben Asher, written c. 1290-1310, Spain. `rabbeinu-bahya-on-torah`
  - Reads: Hebrew text
  - Reads: Rabbeinu Bachya, translated by Rabbi Eliyahu Munk
- **Rabbeinu Chananel on the Torah** (רבינו חננאל). Chananel ben Chushiel (Rabbeinu Chananel), written c. 1005-1055, Kairouan. `rabbeinu-chananel-on-torah`
  - Reads: Hebrew text. Gathered from quotations in later works by Abraham Berliner (Migdal Chananel, Berlin, 1876).
  - Reads: Rabbeinu Chananel, translated by Rabbi Eliyahu Munk (HaChut HaMeshulash)
- **Rashbam on the Torah** (רשב"ם). Rashbam, written c. 1120-1160, France. `rashbam-on-torah`
  - Reads: Hebrew text
  - Reads: Rashbam, translated by Rabbi Eliyahu Munk (HaChut HaMeshulash)
- **Rabbi Yosef ibn Yahya on Esther and Daniel** (יוסף אבן יחיא). Yosef ben David ibn Yahya, 1494-1539 (some give 1534), Florence, Bologna and Imola, Italy. `joseph-ibn-yahya-on-ketuvim`
  - Reads: Hebrew text (first printing, Bologna 1538)
  - Note: Library question 5. The 1538 printing covers the five megillot, Tehillim, Mishlei, Iyov, Daniel, Ezra and Chronicles; Sefaria has only Esther and Daniel. We found no Orthodox authority who condemned the commentary: the Chida lists it in Shem HaGedolim as printed in Mikraot Gedolot, and it was reprinted in the Amsterdam Mikraot Gedolot "Kehillot Moshe" (1724) (both to confirm). What we did find: auction catalogues say Church censors cut passages from copies of the 1538 printing (to confirm), and on Daniel 8:14 he calculates that the redemption would come around the year 5700 (1939-1940), a date that passed; the Gemara discourages such calculations (Sanhedrin 97b). The "controversial" label may come from his son Gedaliah's chronicle Shalshelet HaKabbalah, which historians call unreliable (to confirm). The board decides whether a caution is needed.
- **Ralbag on Tanakh** (רלב״ג). Ralbag, written c. 1325-1345, Provence, France. `ralbag-on-tanakh`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Debated: the Ralbag's commentary is printed in Mikraot Gedolot, but some of his philosophical views were sharply criticized by later authorities. Library question 4: include him, and if so, whether to note when his view is a minority one.
- **Ralbag, Beur HaMilot on the Torah** (רלב"ג ביאור המלות). Ralbag, written c. 1326-1340. `ralbag-beur-hamilot`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Debated; see ralbag-on-tanakh (library question 4).
- **Tur HaArokh (Rabbi Yaakov ben Asher on the Torah)** (הטור הארוך). Jacob ben Asher, written c. 1280-1340. `tur-haarokh`
  - Reads: Hebrew text
  - Reads: Tur on the Torah, translated by Rabbi Eliyahu Munk
- **Toledot Yitzchak on the Torah** (תולדות יצחק). Isaac Karo, written c. 1475-1535. `toledot-yitzchak`
  - Reads: Hebrew text
- **Tzror HaMor on the Torah** (צרור המור). Abraham Saba, written c. 1460-1510. `tzror-hamor-on-torah`
  - Reads: Hebrew text
- **Eshkol HaKofer on Ruth** (אשכול הכופר). Abraham Saba. `eshkol-hakofer-on-ruth`
  - Reads: Hebrew text
- **Meiri on Tehillim** (מאירי). Menachem Meiri, written c. 1270-1315, Provence. `meiri-on-psalms`
  - Reads: Hebrew text. The 1936 Jerusalem printing, the first from manuscript. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Mizrachi (on Rashi)** (מזרחי). Eliyahu Mizrachi (Re'em), written c. 1475-1525, Constantinople. `mizrachi-on-rashi`
  - Reads: Hebrew text
- **Ramban on Job** (רמב״ן על איוב). Rabbi Moshe ben Nachman (Ramban), 1194-1270, Spain. `ramban-on-job`
  - Reads: Hebrew text (Rabbi Chaim Dov Chavel's edition, Mossad Harav Kook). From the Ramban's writings as Rabbi Chavel edited them (Mossad Harav Kook, Jerusalem, 1963), as Sefaria's version title says (to confirm).
- **Commentary on Shir HaShirim by Rabbi Ezra of Gerona (printed as the Ramban's)** (פירוש שיר השירים). Rabbi Ezra ben Shlomo of Gerona, 13th century, Gerona, Spain. `ezra-of-gerona-on-shir-hashirim`
  - Reads: Hebrew text, from Chamesh Megillot (Warsaw, 1875)
  - Note: A kabbalistic commentary. Older printings give it as the Ramban's commentary on Shir HaShirim; it is now generally credited to Rabbi Ezra of Gerona, a kabbalist of the Ramban's circle (to confirm). Seth Brody's English (an academic translation) is in excluded.yaml.

*Acharonim (about 1550-1900)*

- **Ohr HaChaim on the Torah** (אור החיים). Rabbi Chaim ibn Attar, 1696-1743, Morocco and Eretz Yisrael. core. `ohr-hachaim-torah`
  - Reads: Hebrew text, standard Mikraot Gedolot
  - Reads: Or HaChayim, translated by Rabbi Eliyahu Munk
- **Malbim on Tanakh** (מלבי״ם). Rabbi Meir Leibush Weiser (Malbim), 1809-1879, Eastern Europe. core. `malbim-tanakh`
  - Reads: Hebrew text
  - Note: The Malbim wrote largely against the Haskalah's reading of the Torah, which makes him directly useful for "other views" questions. English translations are partial; find Orthodox ones.
- **Metzudat David and Metzudat Tzion on Nach** (מצודת דוד; מצודת ציון). Rabbi David Altschuler and Rabbi Yechiel Hillel Altschuler, 18th century. `metzudot`
  - Reads: Hebrew text
  - Note: The standard plain-meaning commentary on Nach.
- **Kli Yakar on the Torah** (כלי יקר). Rabbi Shlomo Ephraim Luntschitz, 1550-1619. `kli-yakar`
  - Reads: Hebrew text
  - Note: A favorite source for divrei Torah.
- **Ha'amek Davar on the Torah** (העמק דבר). Rabbi Naftali Tzvi Yehuda Berlin (the Netziv), 1816-1893. Litvish. `haamek-davar`
  - Reads: Hebrew text
- **Meshech Chochmah on the Torah** (משך חכמה). Rabbi Meir Simcha of Dvinsk, 1843-1926. Litvish. `meshech-chochmah`
  - Reads: Hebrew text
- **Minchat Shai on Tanakh** (מנחת שי). Yedidiah Norzi, written c. 1526. `minchat-shai`
  - Reads: Hebrew text
- **Shelom Esther** (שלום אסתר). Yitzhak ben Mordekhai Gershon, written c. 1560-1580. `shelom-esther`
  - Reads: Hebrew text
- **Yesha Elohim on Esther** (ישע אלהים). Avraham ben Yitzchak Tsahalan, written c. 1555-1585. `yesha-elohim-on-esther`
  - Reads: Hebrew text
- **Aderet Eliyahu (the Vilna Gaon on the Torah)** (אדרת אליהו). Vilna Gaon, written c. 1740-1800, Vilna. `aderet-eliyahu`
  - Reads: Hebrew text
- **Aderet Eliyahu (Rabbi Yosef Chaim of Baghdad)** (אדרת אליהו (ר' יוסף חיים)). Yosef Hayyim, written c. 1860-1900, Baghdad, Iraq. Sephardi. `aderet-eliyahu-ben-ish-chai`
  - Reads: Hebrew text
- **Torat Moshe (the Alshich on the Torah)** (אלשיך). Moses Alshekh, written c. 1540-1590. `alshich-on-torah`
  - Reads: Hebrew text
- **The Alshich on Nach** (אלשיך). Moses Alshekh. `alshich-on-nach`
  - Reads: Hebrew text
  - Note: Marot HaTzoveot on the early prophets has no license listed on Sefaria; those titles are skipped.
- **Avi Ezer (on Ibn Ezra)** (אבי עזר). Shlomo ben Eliezer Lipmann, written c. 1760-1800, Posen. `avi-ezer`
  - Reads: Hebrew text
- **Nachal Kedumim (the Chida on the Torah)** (נחל קדומים). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `chida-nachal-kedumim`
  - Reads: Hebrew text
- **Nachal Eshkol (the Chida on the five megillot)** (נחל אשכול). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `chida-nachal-eshkol`
  - Reads: Hebrew text
- **Nachal Sorek (the Chida)** (נחל שורק). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `chida-nachal-sorek`
  - Reads: Hebrew text
- **Penei David (the Chida on the Torah)** (פני דוד). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `chida-penei-david`
  - Reads: Hebrew text
- **Rosh David (the Chida on the Torah)** (ראש דוד). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `chida-rosh-david`
  - Reads: Hebrew text
- **Tzaverei Shalal (the Chida on the Haggadah and Torah)** (צוארי שלל). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `chida-tzaverei-shalal`
  - Reads: Hebrew text. The 1965 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Divrei David (the Taz on Rashi)** (דברי דוד). David HaLevi Segal. `divrei-david`
  - Reads: Hebrew text
- **HaKtav VeHaKabalah** (הכתב והקבלה). Yaakov Tzvi Mecklenburg, written c. 1829-1839. `haktav-vehakabalah`
  - Reads: Hebrew text
- **Harchev Davar (the Netziv)** (הרחב דבר). Naphtali Tzvi Yehudah Berlin (Netziv), written c. 1840-1880, Valozhyn. Litvish. `harchev-davar`
  - Reads: Hebrew text
- **Rabbi Yaakov Lorberbaum on the five megillot (Imrei Yosher, Megillat Setarim and others)** (מגילות - ר׳ יעקב מליסא). Yaakov Lorberbaum, written c. 1770-1790, Kalush. `lorberbaum-on-megillot`
  - Reads: Hebrew text
- **Nachalat Ya'akov (on Rashi)** (נחלת יעקב). Yaakov Lorberbaum. `nachalat-yaakov-on-rashi`
  - Reads: Hebrew text
- **Malbim, Beur HaMilot on Nach** (מלבי"ם באור המילות). Meir Leibush Weisser (Malbim), written c. 1844-1874. `malbim-beur-hamilot`
  - Reads: Hebrew text
- **Rishon LeTzion (the Or HaChaim on Nach)** (ראשון לציון). Chaim Ibn Attar (Ohr HaChaim). Sephardi. `rishon-letzion-or-hachaim`
  - Reads: Hebrew text
- **Siftei Chakhamim (on Rashi)** (שפתי חכמים). Shabbetai ben Joseph Bass, written c. 1660-1680. `siftei-chakhamim`
  - Reads: Hebrew text
  - Reads: Sifsei Chachomim Chumash, translated by Rabbi Avrohom Davis
- **Ahavat Yehonatan (on the haftarot)** (אהבת יהונתן). Jonathan Eybeschutz. `ahavat-yehonatan`
  - Reads: Hebrew text
- **Tiferet Yehonatan on the Torah** (תפארת יהונתן). Jonathan Eybeschutz. `tiferet-yehonatan`
  - Reads: Hebrew text
- **Alon Bakhut on Eichah** (אלון בכות). Jonathan Eybeschutz. `alon-bakhut-on-lamentations`
  - Reads: Hebrew text
- **Ba'alei Brit Avram** (בעלי ברית אברם). Abraham Azulai, written c. 1618-1622, Gaza. `baalei-brit-avram`
  - Reads: Hebrew text
- **Beit HaLevi on the Torah** (בית הלוי על התורה). Joseph Dov HaLevi Soloveitchik, written c. 1845-1885. Litvish. `beit-halevi-on-torah`
  - Reads: Hebrew text
- **Chanukat HaTorah** (חנוכת התורה). Heschel of Cracow. Chassidish. `chanukat-hatorah`
  - Reads: Hebrew text
- **Chatam Sofer on the Torah** (חתם סופר). Moses Sofer (Chatam Sofer), written c. 1785-1835. `chatam-sofer-on-torah`
  - Reads: Hebrew text
- **Eretz Chemdah (Malbim)** (ארץ חמדה). Meir Leibush Weisser (Malbim). `eretz-chemdah`
  - Reads: Hebrew text
- **Iggeret Shmuel on Ruth** (אגרת שמואל). Samuel de Uçeda, written c. 1560-1600, Safed/Constantinople. `iggeret-shmuel-on-ruth`
  - Reads: Hebrew text
- **Lechem Dim'ah on Eichah** (לחם דמעה). Samuel de Uçeda. `lechem-dimah-on-eikhah`
  - Reads: Hebrew text
- **Levush HaOrah (on Rashi)** (לבוש האורה). Mordechai Jaffe. `levush-haorah`
  - Reads: Hebrew text
- **Maskil LeDavid (on Rashi)** (משכיל לדוד). David Pardo. `maskil-ledavid`
  - Reads: Hebrew text
- **Megalleh Amukkot on the Torah** (מגלה עמוקות). Nathan Nota Spira. `megalleh-amukkot-on-torah`
  - Reads: Hebrew text
- **Mekhir Yayin (the Rema on Esther)** (מחיר יין). Moses Isserles (Rema), written c. 1555, Szydłów, Poland. `mekhir-yayin-on-esther`
  - Reads: Hebrew text
- **Menot HaLevi (Rabbi Shlomo Alkabetz on Esther)** (מנות הלוי). Shlomo HaLevi Alkabetz. `menot-halevi-on-esther`
  - Reads: Hebrew text
- **Minchat Ani on the Torah** (מנחת עני). Yaakov Ettlinger. `minchat-ani-on-torah`
  - Reads: Hebrew text
- **Minei Targuma (on Targum Onkelos)** (מיני תרגומא). Isaiah Berlin, written c. 1751-1799. `minei-targuma-on-torah`
  - Reads: Hebrew text
- **Netinah LaGer (on Targum Onkelos)** (נתינה לגר). Nathan Marcus Adler. `netinah-lager`
  - Reads: Hebrew text
- **Od Yosef Chai (derashot)** (עוד יוסף חי; דרשות). Yosef Hayyim. Sephardi. `od-yosef-chai`
  - Reads: Hebrew text
- **Siftei Kohen on the Torah** (שפתי כהן). Mordechai Kohen. `siftei-kohen-on-torah`
  - Reads: Hebrew text
- **Tevat Gome** (תיבת גמא). Joseph ben Meir Teomim, written c. 1782, Frankfurt an der Oder. `tevat-gome`
  - Reads: Hebrew text
- **Tze'enah Ure'enah** (צאינה וראינה). Jacob ben Isaac Ashkenazi, written c. 1590-1616. `tzeenah-ureenah`
  - Reads: Hebrew text
  - Note: The classic Yiddish Torah reader. Only short sections of the text are on Sefaria.
- **Yeriot Shlomo on the Torah (Maharshal)** (יריעות שלמה). Maharshal, written c. 1530-1570. `yeriot-shlomo-on-torah`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Mechokekei Yehudah (Karnei Ohr and Yahel Ohr on Ibn Ezra)** (מחוקקי יהודה). Yehuda Leib Krinsky. `mechokekei-yehudah`
  - Reads: Hebrew text
- **Torah Temimah** (תורה תמימה). Barukh HaLevi Epstein, written c. 1898-1902, Pinsk, Belarus. `torah-temimah`
  - Reads: Hebrew text
- **Pardes Yosef on the Torah** (פרדס יוסף). Yosef Patzanovski. `pardes-yosef`
  - Reads: Hebrew text
- **Rabbi Avraham Remer's commentaries on Joshua, Judges and Samuel (MeAvur HaAretz, Ish Leshivto, Ish Kilvavo)** (מעבור הארץ; איש לשבטו; איש כלבבו). Rabbi Avraham Remer, published 1995-2006, Beit El, Eretz Yisrael. Religious Zionist. `rabbi-avraham-remer-on-nach`
  - Reads: Hebrew text
- **Birkat Asher on the Torah** (ברכת אשר). Rabbi Asher Wassertheil, published 2010-2012, Jerusalem. `birkat-asher-on-torah`
  - Reads: Hebrew text
  - Note: A commentary on the Torah that concentrates on explaining Rashi. Sefaria describes the author as an editor of Shemirat Shabbat KeHilchatah (to confirm).
- **Rabbi Chaim Jachter's books on Tanakh (Yonah, Ruth, Daniel and Melachim)**. Rabbi Chaim Jachter (with Binyamin Jachter on Yonah), published 2018-2022, Teaneck, New Jersey. Modern Orthodox. `rabbi-chaim-jachter-on-tanakh`
  - Reads: English text. Rabbi Jachter teaches Tanakh and halacha at the Torah Academy of Bergen County and serves on a beit din (to confirm).
- **Redeeming Relevance in the Torah (Genesis, Exodus, Deuteronomy)**. Rabbi Francis Nataf, published 2006-2015. Modern Orthodox. `redeeming-relevance`
  - Reads: English text. Essays on the Torah. The canon already treats Rabbi Nataf's translations as Orthodox.

### Mishnah, Talmud and Midrash

The Oral Torah: the Mishnah and Tosefta, the Talmud Bavli and Yerushalmi, the Midrash, and their commentaries.

#### The texts

*Tannaim (to about 200 CE)*

- **Mishnah** (משנה). Compiled by Rabbi Yehuda HaNasi. core. `mishnah`
  - Reads: Hebrew text, standard (Vilna). The printed text is public domain. Check the license of the digital source.
  - Reads: The William Davidson Edition, English (Koren, Rabbi Adin Even-Israel Steinsaltz). On Sefaria for the tractates that have Gemara. The board confirms it is the Koren Steinsaltz translation.
  - Reads: The Mishnah with Bartenura, translated by Rabbi Shraga Silverstein
- **Tosefta** (תוספתא). Rabbi Chiya and Rabbi Oshaya (by tradition), written c. 190-230, Eretz Yisrael. `tosefta`
  - Reads: Hebrew text as printed in the Vilna Shas (Mechon Mamre transcription)
  - Note: Saul Lieberman's critical edition of the Tosefta and his Tosefta Kifshutah (Jewish Theological Seminary), which Sefaria also hosts, are left out on purpose.
- **The minor tractates of the Talmud** (מסכתות קטנות). written c. 650-950, Eretz Yisrael and Babylonia. `minor-tractates`
  - Reads: Hebrew text, Vilna Shas
  - Reads: The Minor Tractates of the Talmud, translated under Rabbi Abraham Cohen
  - Note: Avot DeRabbi Natan, Kallah, Derekh Eretz, Soferim, Semachot and the rest, as printed after Seder Nezikin in the Vilna Shas. The second version of Avot DeRabbi Natan exists on Sefaria only in Solomon Schechter's 1887 edition; it is left out for the board to decide.
- **Seder Olam Rabbah** (סדר עולם רבה). written c. 200-500, Eretz Yisrael and Babylonia. `seder-olam-rabbah`
  - Reads: Hebrew text
- **Midrash Tannaim on Devarim (gathered by Rabbi David Zvi Hoffmann)** (מדרש תנאים על ספר דברים). `midrash-tannaim-on-deuteronomy`
  - Reads: Hebrew text

*Amoraim (about 200-500 CE)*

- **Talmud Bavli** (תלמוד בבלי). Redacted by Rav Ashi and Ravina. core. `talmud-bavli`
  - Reads: Vilna Shas, Hebrew/Aramaic. The printed text is public domain. Check the license of the digital source.
  - Reads: Vilna Shas, Hebrew/Aramaic, vocalized (William Davidson Edition) (used only to show the vowels). Vowels only. The same text with nikud, used to show vowels on the Vilna Shas words when a reader turns them on (the Gemara page's vowels switch). Never searched or quoted.
  - Reads: The William Davidson Talmud (Koren Noé, Rabbi Adin Even-Israel Steinsaltz) [English]. Hosted on Sefaria under a non-commercial license. Commercial use needs a separate agreement.
- **Talmud Yerushalmi** (תלמוד ירושלמי). core. `talmud-yerushalmi`
  - Reads: Hebrew/Aramaic text of the first printing (Venice, 1523). The Bomberg printing, the basis of every later edition. Public domain by age. Sefaria's digital copy lists its license as unknown, so it enters the testing library on the age of the printing alone (founding spec, "Testing library").
  - Reads: Koren Talmud Yerushalmi, Hebrew/Aramaic (William Davidson digital edition). Steinsaltz's vowelled and punctuated text. Only Shekalim is on Sefaria so far, and its file lists the license as unknown, so the plan skips it until that is confirmed.
  - Reads: Koren Talmud Yerushalmi, English (William Davidson digital edition, Rabbi Adin Even-Israel Steinsaltz). Only Shekalim is on Sefaria so far, and its file lists the license as unknown, so the plan skips it until that is confirmed. Until then RabAI translates the Yerushalmi itself and says so.
  - Waiting for your decision: The Jerusalem Talmud, translated by Heinrich W. Guggenheimer (Part 2).
  - Waiting for your decision: Hebrew/Aramaic text edited by Heinrich W. Guggenheimer (Part 2).
- **Midrash (Midrash Rabbah, Tanchuma, Mechilta, Sifra, Sifrei)** (מדרש). core. `midrash`
  - Reads: Hebrew texts, standard editions
  - Reads: Sifra, Sifrei and Mechilta, translated by Rabbi Shraga Silverstein
  - Waiting for your decision: Soncino Midrash Rabbah (eds. H. Freedman and Maurice Simon) [English] (Part 2).
  - Waiting for your decision: The Sefaria Midrash Rabbah (2022) [English] (Part 2).
- **Tanna DeBei Eliyahu (Rabbah and Zuta)** (תנא דבי אליהו). written c. 968-984, Babylonia, Italy and Eretz Yisrael. `tanna-debei-eliyahu`
  - Reads: Hebrew text

*Geonim (about 600-1040)*

- **Aggadat Bereshit** (אגדת בראשית). `aggadat-bereshit`
  - Reads: Hebrew text. Edited from manuscripts by Solomon Buber (19th century). The maintainer has said Buber's midrash editions are fine for the testing library.
- **Midrash Shmuel** (מדרש שמואל). written c. 400-1000, Constantinople. `midrash-shmuel`
  - Reads: Hebrew text. Edited from manuscripts by Solomon Buber (19th century). The maintainer has said Buber's midrash editions are fine for the testing library.
- **Midrash Tehillim (Shocher Tov)** (מדרש תהילים). written c. 1050-1450, Narbonne. `midrash-tehillim`
  - Reads: Hebrew text
- **Midrash Mishlei** (מדרש משלי). written c. 800-1000. `midrash-mishlei`
  - Reads: Hebrew text (Solomon Buber's edition). Solomon Buber's edition (Vilna, 1893), as typed by Hebrew Wikisource volunteers. The maintainer said Buber's midrash editions are fine for the testing library.
  - Note: Sefaria's only Hebrew of this midrash is Buber's edition. Its other Hebrew version, from the Bar-Ilan Responsa Project, is not openly licensed.
- **Pesikta Rabbati** (פסיקתא רבתי). written c. 600-900, Eretz Yisrael. `pesikta-rabbati`
  - Reads: Hebrew text
- **Pirkei DeRabbi Eliezer** (פרקי דרבי אליעזר). written c. 630-1030, Eretz Yisrael and Babylonia. `pirkei-derabbi-eliezer`
  - Reads: Hebrew text
  - Reads: Pirke de Rabbi Eliezer, translated by Rabbi Gerald Friedlander. The translation without Rabbi Friedlander's footnotes. Rabbi Gerald Friedlander (1871-1923) studied at Jews' College and was minister of the Western Synagogue in London; he was known for defending Orthodox teaching against Liberal Judaism (to confirm). Sefaria also has his annotated edition; its notes draw on academic scholarship of the time, so it is left out until the board looks at it.
- **Seder Olam Zutta** (סדר עולם זוטא). written c. 504-1104, Babylonia. `seder-olam-zutta`
  - Reads: Hebrew text
- **Sifrei DeAggadeta on Esther** (ספרי דאגדתא על מגילת אסתר). Edited by Solomon Buber, Lviv. `sifrei-aggadah-on-esther`
  - Reads: Hebrew text. Edited from manuscripts by Solomon Buber (19th century). The maintainer has said Buber's midrash editions are fine for the testing library.

*Rishonim (about 1040-1550)*

- **Ein Yaakov** (עין יעקב). Rabbi Yaakov ibn Chaviv, c. 1460-1516. `ein-yaakov`
  - Reads: Hebrew text
  - Reads: En Jacob, translated by Rabbi S. H. Glick. Rabbi Samuel Hirsch Glick (c. 1884-1929) was a congregational rabbi in Chicago (Tiferet Zion) and supervised kosher slaughtering there (to confirm).
  - Note: The aggadah of the Talmud, gathered in one work.
- **Ein Yaakov (Hebrew of the Glick edition)** (עין יעקב). Rabbi Yaakov ibn Chaviv, Chicago. `ein-yaakov-glick`
  - Reads: Hebrew text. The Hebrew text from S. H. Glick's edition (1916-1921).
  - Reads: En Jacob, translated by Rabbi S. H. Glick. Rabbi Samuel Hirsch Glick (c. 1884-1929) was a congregational rabbi in Chicago (Tiferet Zion) and supervised kosher slaughtering there (to confirm). His translation and footnotes, without the classic commentaries.
  - Note: The same work as ein-yaakov; Sefaria keeps this edition as a separate title.
- **Midrash Aggadah** (מדרש אגדה). written c. 1020-1220, France. `midrash-aggadah`
  - Reads: Hebrew text. Edited from manuscripts by Solomon Buber (19th century). The maintainer has said Buber's midrash editions are fine for the testing library.
- **Midrash Sekhel Tov** (מדרש שכל טוב). Menachem ben Shlomo, written c. 1139, Italy. `midrash-sekhel-tov`
  - Reads: Hebrew text. Edited from manuscripts by Solomon Buber (19th century). The maintainer has said Buber's midrash editions are fine for the testing library.
- **Yalkut Shimoni on the Torah** (ילקוט שמעוני על התורה). written c. 1100. `yalkut-shimoni-on-torah`
  - Reads: Hebrew text
  - Note: Yalkut Shimoni on Nach has no license listed on Sefaria; it is not listed.
- **Midrash Lekach Tov (Pesikta Zutrata) on the Torah, Esther and Ruth** (מדרש לקח טוב). Tobiah ben Eliezer, written c. 1105-1115. `midrash-lekach-tov`
  - Reads: Hebrew text. Edited from manuscripts by Solomon Buber (19th century). The maintainer has said Buber's midrash editions are fine for the testing library.
  - Note: Lekach Tov on Kohelet, Eichah and Shir HaShirim is on Sefaria only in early-20th-century scholars' editions (Berlin 1904; London 1908, edited by a Christian Hebraist); those titles are left out for the board (library question 9).
- **Sefer HaYashar (the midrash on Bereishit to Shoftim)** (ספר הישר). Unknown, first printed in Venice, 1625. `sefer-hayashar-midrash`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text (Livorno, 1870)
  - Note: Not the mussar book of the same name (sefer-hayashar-mussar). Edward B. M. Browne's English (1876) is in excluded.yaml.
- **Yalkut Shimoni on Nach, in English (selections)** (ילקוט שמעוני). `yalkut-shimoni-on-nach-english`
  - Reads: English, translated by Rabbi Mike Feuer (Jerusalem Anthology). A few passages only. Rabbi Mike Feuer also translated the Olat Re'iyah the canon lists (rav-kook). Sefaria's Hebrew of Yalkut Shimoni on Nach has no license listed.

*20th and 21st centuries*

- **Otzar Midrashim (J. D. Eisenstein's collection of shorter midrashim)** (אוצר מדרשים). Collected by Judah David Eisenstein, printed in New York, 1915. `otzar-midrashim`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text (New York, 1915)
  - Note: Eisenstein also compiled the encyclopedia Otzar Yisrael and Otzar Dinim UMinhagim. The board may prefer to take in only some of the midrashim in the collection.

#### Commentaries

*Rishonim (about 1040-1550)*

- **Major Rishonim on the Talmud (Rashi, Tosafot, Ramban, Rashba, Ritva, Ran, Meiri)** (ראשונים על הש״ס). core. `rishonim-shas`
  - Reads: Hebrew texts, standard editions
  - Note: Mostly untranslated. Split into one entry per Rishon if the board wants to approve them separately.
- **Rambam's Commentary on the Mishnah, including the introduction to Perek Chelek (the Thirteen Ikkarim)** (פירוש המשנה לרמב״ם). Rabbi Moshe ben Maimon (Rambam), 1138-1204. `rambam-perush-hamishnah`
  - Reads: Hebrew translation printed in the Vilna Shas
  - Reads: The Rambam's Introduction to the Mishnah, translated by Rabbi Francis Nataf
  - Note: Strongly recommended. The Thirteen Ikkarim the core premises rely on are stated here. The introduction to Seder Tahorot on Sefaria is Joseph Derenbourg's scholarly edition (Berlin 1889) and is left out for now (library question 9).
- **Bartenura on the Mishnah** (ברטנורא). Rabbi Ovadia of Bartenura, c. 1445-1515. `bartenura`
  - Reads: Hebrew text
  - Note: The standard commentary printed with the Mishnah.
- **HaMaor on the Rif** (המאור). Zerachiah HaLevi of Gerona, written c. 1130-1170, Provence, France. `baal-hamaor-on-rif`
  - Reads: Hebrew text
- **Ha'atakat Teshuvat HaRif on the Rif** (העתקת פירוש הרי"ף). Rif, written c. 1085-1105, North Africa. `haatakat-teshuvat-harif-on-rif`
  - Reads: Hebrew text
- **Hagahot MeAlfas Yashan on the Rif** (הגהות מאלפס ישן). `hagahot-mealfas-yashan-on-rif`
  - Reads: Hebrew text
- **Hasagot HaRa'avad on the Rif** (השגות הראב"ד). Ra'avad, written c. 1135-1195, Provence, France. `hasagot-haraavad-on-rif`
  - Reads: Hebrew text
- **Katuv Sham on the Rif** (כתוב שם). Ra'avad, written c. 1135-1195, Provence, France. `katuv-sham-on-rif`
  - Reads: Hebrew text
- **Milchemet Hashem on the Rif** (מלחמת השם). Moses ben Nachman (Ramban), written c. 1212, Girona, Spain. `milchemet-hashem-on-rif`
  - Reads: Hebrew text
- **Nimukei Yosef on the Rif** (נימוקי יוסף). Yosef ibn Habib, written c. 1330-1410, Spain. `nimukei-yosef-on-rif`
  - Reads: Hebrew text
- **Ran on the Rif** (ר"ן). Nissim of Gerona (Ran), written c. 1315-1375, Barcelona, Spain. `ran-on-rif`
  - Reads: Hebrew text
- **Sefer HaZekhut on the Rif** (ספר הזכות). Moses ben Nachman (Ramban), written c. 1185-1265. `sefer-hazekhut-on-rif`
  - Reads: Hebrew text
- **Rabbeinu Yonah on Berakhot (on the Rif)** (רבינו יונה). Rabbeinu Yonah Gerondi, written c. 1220-1300, Girona, Spain. `rabbeinu-yonah-on-berakhot`
  - Reads: Hebrew text
- **Rabbeinu Yehonatan of Lunel on Eruvin** (רבינו יהונתן מלוניל). Rabbenu Yehonatan of Lunel, written c. 1145-1205, Lunel. `rabbeinu-yehonatan-of-lunel-on-eruvin`
  - Reads: Hebrew text
- **Rabbeinu Efrayim on Bava Kamma** (רבינו אפרים). Rabbenu Ephraim, written c. 1065-1115, Algeria. `rabbeinu-efrayim-on-bava-kamma`
  - Reads: Hebrew text
- **Rashbam on the Talmud** (רשב"ם). Rashbam, written c. 1115-1165, France. `rashbam-on-shas`
  - Reads: Hebrew text
- **The Rosh's commentary on Nedarim, Nazir and Tamid** (פירוש הרא"ש). Rabbenu Asher ben Yechiel (Rosh), written c. 1275-1325. `commentary-of-the-rosh-on-shas`
  - Reads: Hebrew text
- **Ktav Yad Rashi on the Talmud** (כתב יד רש"י). Rashi, written c. 1065-1115, France. `ktav-yad-rashi-on-shas`
  - Reads: Hebrew text
- **The Mordechai on Bava Batra** (מרדכי על בבא בתרא). Mordechai, written c. 1270-1300, Germany. `mordechai-on-shas`
  - Reads: Hebrew text
- **Chiddushei HaRa'ah on the Talmud** (חדושי הרא"ה). Aharon HaLevi (Ra'ah). `chiddushei-haraah-on-shas`
  - Reads: Hebrew text. The 1956 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Piskei Tosafot on the Talmud** (פסקי תוספות). written c. 1250-1350. `piskei-tosafot-on-shas`
  - Reads: Hebrew text
- **Rabbeinu Chananel on the Talmud** (רבינו חננאל). Chananel ben Chushiel (Rabbeinu Chananel), written c. 1005-1055, Kairouan, Tunisia. `rabbeinu-chananel-on-shas`
  - Reads: Hebrew text
- **Rabbeinu Gershom on the Talmud** (רבינו גרשום). Gershom ben Yehudah, written c. 980-1020, Mainz, Germany; Metz, France. `rabbeinu-gershom-on-shas`
  - Reads: Hebrew text
- **Rav Nissim Gaon on the Talmud** (רב ניסים גאון). Nissim Gaon, written c. 995-1055, North Africa. `rav-nissim-gaon-on-shas`
  - Reads: Hebrew text
- **Ri Migash on the Talmud** (ר"י מיגאש). Joseph Ibn Migash (Ri Migash), written c. 1100-1141. `ri-migash-on-shas`
  - Reads: Hebrew text
- **Tosafot HaRosh on the Talmud** (תוספות הרא"ש). Rabbenu Asher ben Yechiel (Rosh), written c. 1275-1325. `tosafot-harosh-on-shas`
  - Reads: Hebrew text. One title uses a 1952 New York printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Tosafot Ri HaZaken on the Talmud** (תוספות ר"י הזקן). Isaac ben Samuel of Dampierre (Ri HaZaken), written c. 1130-1170, France. `tosafot-ri-hazaken-on-shas`
  - Reads: Hebrew text
- **Tosafot Rid on the Talmud** (תוספות רי"ד). Isaiah d'Trani, written c. 1200-1250, Trani, Italy. `tosafot-rid-on-shas`
  - Reads: Hebrew text. One title uses a 1931 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Tosafot Shantz on the Talmud** (תוספות שאנץ). Samson ben Abraham of Sens, written c. 1170-1220, France. `tosafot-shantz-on-shas`
  - Reads: Hebrew text
- **Tosafot Yeshanim on the Talmud** (תוספות ישנים). The Tosafists, written c. 1200-1400, France. `tosafot-yeshanim-on-shas`
  - Reads: Hebrew text
- **Yad Ramah on the Talmud** (יד רמה). Meir Abulafia, written c. 1204-1244. `yad-ramah-on-shas`
  - Reads: Hebrew text
- **Chiddushei HaRambam on Rosh Hashanah** (חידושי הרמב"ם). Moses ben Maimon (Rambam). `chiddushei-harambam-on-rosh-hashanah`
  - Reads: Hebrew text
  - Note: Attributed to the Rambam.
- **The Mefaresh on Tamid** (מפרש). `mefaresh-on-tamid`
  - Reads: Hebrew text
- **Tosafot Chad Mikamei on Yevamot** (תוספות חד מקמאי). written c. 1150-1250. `tosafot-chad-mikamei-on-yevamot`
  - Reads: Hebrew text
- **Rashi on Pirkei Avot** (רש"י). Rashi, written c. 1065-1115. `rashi-on-mishnah`
  - Reads: Hebrew text
- **Rabbeinu Yonah on Pirkei Avot** (רבינו יונה). Rabbeinu Yonah Gerondi, written c. 1200-1260. `rabbeinu-yonah-on-mishnah`
  - Reads: Hebrew text
- **Rash MiShantz on the Mishnah** (ר"ש משאנץ). Samson ben Abraham of Sens, written c. 1180-1220. `rash-mishantz-on-mishnah`
  - Reads: Hebrew text
- **Magen Avot (the Rashbatz on Pirkei Avot)** (מגן אבות). Shimon ben Tzemach Duran, written c. 1390-1440, Algiers. `magen-avot-on-avot`
  - Reads: Hebrew text
- **Rabbeinu Shemaiah on Mishnah Middot** (רבינו שמעיה על משנה מדות). Shemaiah of Sossoines, written c. 1085-1135, France. `r-shemaiah-on-mishnah-middot`
  - Reads: Hebrew text
- **The Ra'avad on the Mishnah (Demai, Eduyot, Kinnim)** (ראב"ד). Ra'avad. `raavad-on-mishnah`
  - Reads: Hebrew text
- **The Ra'avad on the Sifra** (ראב"ד). Ra'avad. `raavad-on-sifra`
  - Reads: Hebrew text
- **The commentary attributed to Rashi on Midrash Rabbah** (רש"י). Rashi, written c. 1065-1115, France. `rashi-on-midrash-rabbah`
  - Reads: Hebrew text
  - Note: Printed under Rashi's name in the Vilna Midrash Rabbah; the attribution is doubtful.

*Acharonim (about 1550-1900)*

- **Classic Acharonim on Shas (Maharsha, Pnei Yehoshua, Rabbi Akiva Eiger)** (מהרש״א; פני יהושע; רבי עקיבא איגר). Rabbi Shmuel Eidels; Rabbi Yaakov Yehoshua Falk; Rabbi Akiva Eiger, 1555-1631; 1680-1756; 1761-1837. `acharonim-shas-classic`
  - Reads: Hebrew texts (printed in or alongside the Vilna Shas)
- **Tosafot Yom Tov on the Mishnah** (תוספות יום טוב). Rabbi Yom Tov Lipmann Heller, 1578-1654. `tosafot-yom-tov`
  - Reads: Hebrew text
- **Tiferet Yisrael on the Mishnah** (תפארת ישראל). Rabbi Yisrael Lipschitz, 1782-1860. `tiferet-yisrael`
  - Reads: Hebrew text
- **Binyan Yehoshua on the minor tractates** (בנין יהושע). Joshua Falk of Lisa, written c. 1835-1855. `binyan-yehoshua-on-minor-tractates`
  - Reads: Hebrew text
- **Commentary of Chida on the minor tractates** (פי׳ החיד״א). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. `commentary-of-chida-on-minor-tractates`
  - Reads: Hebrew text
- **Gra's Nuschah on the minor tractates** (נוסחת הגר״א). Vilna Gaon, written c. 1730-1770, Vilna. `gras-nuschah-on-minor-tractates`
  - Reads: Hebrew text
- **Haggahot on the minor tractates** (הגהות). written c. 1873-1883. `haggahot-on-minor-tractates`
  - Reads: Hebrew text
- **Haggahot R' Yeshaya Berlin on the minor tractates** (הגהות הגרי״ב). Isaiah Berlin, written c. 1751-1799. `haggahot-r-yeshaya-berlin-on-minor-tractates`
  - Reads: Hebrew text
- **Haggahot Ya'avetz on the minor tractates** (הגהות יעב"ץ). Yaakov Emden, written c. 1727-1773. `haggahot-yaavetz-on-minor-tractates`
  - Reads: Hebrew text
- **Haggahot and Marei Mekomot on the minor tractates** (הגהות ומראה מקומות). written c. 1873-1883. `haggahot-and-marei-mekomot-on-minor-tractates`
  - Reads: Hebrew text
- **Kisse Rahamim on the minor tractates** (כסא רחמים). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. `kisse-rahamim-on-minor-tractates`
  - Reads: Hebrew text
- **Lev Hakhamim on the minor tractates** (לב חכמים). Benjamin Katzenellenbogen, written c. 1720-1780. `lev-hakhamim-on-minor-tractates`
  - Reads: Hebrew text
- **Mesorat HaShas on the minor tractates** (מסורת הש״ס). Joshua Boaz, written c. 1523-1557, Italy. `mesorat-hashas-on-minor-tractates`
  - Reads: Hebrew text
- **Mitzpeh Etan on the minor tractates** (מצפה איתן). Avraham Maskil LeEitan, written c. 1814-1846. `mitzpeh-etan-on-minor-tractates`
  - Reads: Hebrew text
- **Nachalat Ya'akov on the minor tractates** (נחלת יעקב). Jacob Naumberg, written c. 1769-1793. `nachalat-yaakov-on-minor-tractates`
  - Reads: Hebrew text
- **New Nuschah on the minor tractates** (נוסחא חדשה). `new-nuschah-on-minor-tractates`
  - Reads: Hebrew text
- **Nuschaot from Manuscripts on the minor tractates** (נוסחאות כ״י). `nuschaot-from-manuscripts-on-minor-tractates`
  - Reads: Hebrew text
- **Rishon Letzion on the minor tractates** (ראשון לציון). Isaiah Berlin, written c. 1750-1800. `rishon-letzion-on-minor-tractates`
  - Reads: Hebrew text
- **Tumat Yesharim on the minor tractates** (תומת ישרים). Benjamin Motal, written c. 1608-1622, Salonica / Thessaloniki. `tumat-yesharim-on-minor-tractates`
  - Reads: Hebrew text
- **Chiddushei Anshei Shem on the Rif** (חידושי אנשי שם). Nathan Nota Spira, written c. 1610-1630, Krakow, Poland. `chiddushei-anshei-shem-on-rif`
  - Reads: Hebrew text
- **Hagahot Chavot Yair on the Rif** (הגהות חוות יאיר). Yair Chaim Bacharach, written c. 1680-1700. `hagahot-chavot-yair-on-rif`
  - Reads: Hebrew text
- **Hagahot HaBach on the Rif** (הגהות הב"ח). Yoel ben Shmuel Sirkes, written c. 1585-1615. `hagahot-habach-on-rif`
  - Reads: Hebrew text
- **Shiltei HaGiborim on the Rif** (שלטי הגיבורים). Joshua Boaz, written c. 1520-1550, Italy. `shiltei-hagiborim-on-rif`
  - Reads: Hebrew text
- **Divrey Chamudot on the Rosh** (דברי חמודות). Yom Tov Lipmann Heller (Tosefot Yom Tov), written c. 1602-1628, Prague. `divrey-chamudot-on-rosh`
  - Reads: Hebrew text
- **Korban Netanel on the Rosh** (קרבן נתנאל). Nathaniel Weil, written c. 1745-1755, Mühringen. `korban-netanel-on-rosh`
  - Reads: Hebrew text
- **Maadaney Yom Tov on the Rosh** (מעדני יום טוב). Yom Tov Lipmann Heller (Tosefot Yom Tov), written c. 1602-1628, Prague. `maadaney-yom-tov-on-rosh`
  - Reads: Hebrew text
- **Pilpula Charifta on the Rosh** (פילפולא חריפתא). Yom Tov Lipmann Heller (Tosefot Yom Tov), written c. 1600-1626, Prague. `pilpula-charifta-on-rosh`
  - Reads: Hebrew text
- **Tiferet Shmuel on the Rosh** (תפארת שמואל). Aharon Shmuel Kaidanover, written c. 1645-1675, Kraków. `tiferet-shmuel-on-rosh`
  - Reads: Hebrew text
- **Ben Yehoyada on the Talmud** (בן יהוידע). Yosef Hayyim, written c. 1860-1900, Baghdad, Iraq. Sephardi. `ben-yehoyada-on-shas`
  - Reads: Hebrew text
- **Benayahu on the Talmud (the Ben Ish Chai)** (בניהו). Yosef Hayyim (the Ben Ish Chai), written c. 1860-1900, Baghdad, Iraq. Sephardi. `benayahu-on-shas`
  - Reads: Hebrew text
  - Note: The Ben Ish Chai's commentary on the aggadah of the Talmud, the companion to Ben Yehoyada. Sefaria has 12 tractates of it.
- **Chidushei Chatam Sofer on the Talmud** (חידושי חתם סופר). Moses Sofer (Chatam Sofer), written c. 1785-1835. `chidushei-chatam-sofer-on-shas`
  - Reads: Hebrew text
- **Chokhmat Shlomo on the Talmud** (חכמת שלמה). Maharshal, written c. 1530-1570. `chokhmat-shlomo-on-shas`
  - Reads: Hebrew text
- **Gilyon HaShas on the Talmud** (גליון הש"ס). Akiva Eiger, written c. 1798-1832, Posen. `gilyon-hashas-on-shas`
  - Reads: Hebrew text
- **Haggahot Ya'avetz on the Talmud** (הגהות יעב"ץ). Yaakov Emden, written c. 1725-1775. `haggahot-yaavetz-on-shas`
  - Reads: Hebrew text
- **Maharam Schiff on the Talmud** (מהר"ם שיף). Meir ben Jacob Ha-Kohen Schiff, written c. 1627-1643, Frankfurt am Main, Germany. `maharam-schiff-on-shas`
  - Reads: Hebrew text
- **Marit HaAyin on the Talmud** (מראית העין). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `marit-haayin-on-shas`
  - Reads: Hebrew text. The 1960 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Petach Einayim on the Talmud** (פתח עינים). Hayyim Joseph David Azulai (Chida), written c. 1750-1790. Sephardi. `petach-einayim-on-shas`
  - Reads: Hebrew text. The 1959 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Shita Mekubetzet on the Talmud** (שיטה מקובצת). Rabbi Betzalel Ashkenazi (compiler), 16th century, Egypt and Eretz Yisrael. `shita-mekubetzet-on-shas`
  - Reads: Hebrew text
- **Tzelach on the Talmud** (צל"ח). Yechezkel Landau (Noda BiYehudah). `tziyyun-lenefesh-chayyah-on-shas`
  - Reads: Hebrew text
- **Be'er Sheva on the Talmud** (באר שבע). Yissachar Eilenburg. `beer-sheva-on-shas`
  - Reads: Hebrew text
- **Chiddushei HaRim on the Talmud** (חידושי הרי"מ). Yitzchak Meir Rotenberg-Alter, written c. 1816. Chassidish. `chiddushei-harim-on-shas`
  - Reads: Hebrew text
- **Gevurat Ari on the Talmud** (גבורת ארי). Aryeh Leib Gunzburg. `gevurat-ari-on-shas`
  - Reads: Hebrew text
- **Yam shel Shelomoh on the Talmud** (ים של שלמה). Maharshal. `yam-shel-shelomoh-on-shas`
  - Reads: Hebrew text
- **Haflaah on Ketubot** (הפלאה על כתובות). Pinchas Horowitz, written c. 1755-1785, Frankfurt am Main, Germany. `haflaah-on-ketubot`
  - Reads: Hebrew text
- **Arukh LaNer** (ערוך לנר). Yaakov Ettlinger. `arukh-laner`
  - Reads: Hebrew text
- **Amudei Yerushalayim on the Jerusalem Talmud** (עמודי ירושלים). Yisrael Eisenstein. `amudei-yerushalayim-on-jerusalem-talmud`
  - Reads: Hebrew text. The 1969-1970 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Beur HaGra on the Jerusalem Talmud** (ביאור הגר"א). Vilna Gaon. `beur-hagra-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Chiddushei Ridbaz on the Jerusalem Talmud** (חידושי רידב"ז). Yaakov Dovid Wilovsky. `chiddushei-ridbaz-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Chidushei Chatam Sofer on the Jerusalem Talmud** (חידושי חתם סופר). Moses Sofer (Chatam Sofer). `chidushei-chatam-sofer-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Chidushei Rabbi Eliyahu of Greiditz on the Jerusalem Talmud** (חידושי מהר"א גריידץ). `chidushei-rabbi-eliyahu-of-greiditz-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Haggahot RaDO on the Jerusalem Talmud** (הגהות רד"א). `haggahot-rado-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Haggahot Rabbi Menachem di Lonzano on the Jerusalem Talmud** (הגהות מהר"ם די לונזאנו). Menachem di Lonzano. `haggahot-rabbi-menachem-di-lonzano-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Haggahot YaFeM on the Jerusalem Talmud** (הגהות יפ"מ). `haggahot-yafem-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Kikar LaAden on the Jerusalem Talmud** (ככר לאדן). `kikar-laaden-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Korban HaEdah on the Jerusalem Talmud** (קרבן העדה). David Frankel. `korban-haedah-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Mareh HaPanim on the Jerusalem Talmud** (מראה הפנים). Moshe Margalit. `mareh-hapanim-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Noam Yerushalmi** (נועם ירושלמי). `noam-yerushalmi`
  - Reads: Hebrew text
- **Penei Moshe on the Jerusalem Talmud** (פני משה). Moshe Margalit. `penei-moshe-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Sheyarei Korban on the Jerusalem Talmud** (שיירי קרבן). David Frankel. `sheyarei-korban-on-jerusalem-talmud`
  - Reads: Hebrew text
- **Tosafot HaRid on the Jerusalem Talmud** (תוספות הרי"ד). Yaakov Dovid Wilovsky. `tosafot-harid-on-jerusalem-talmud`
  - Reads: Hebrew text
- **The Vilna Gaon on the Mishnah (Shenot Eliyahu, Eliyahu Rabbah and others)** (גר"א). Vilna Gaon, written c. 1730-1770, Vilna. `gra-on-mishnah`
  - Reads: Hebrew text
- **Haggahot Ya'avetz on the Mishnah** (הגהות יעב"ץ). Yaakov Emden, written c. 1725-1775. `haggahot-yaavetz-on-mishnah`
  - Reads: Hebrew text
- **Hon Ashir on the Mishnah** (הון עשיר). Immanuel Hai ben Avraham Ricchi, written c. 1710-1740. `hon-ashir-on-mishnah`
  - Reads: Hebrew text
- **Ikar Tosafot Yom Tov on the Mishnah** (עיקר תוספות יום טוב). Meshulam Katz; Yom Tov Lipmann Heller (Tosefot Yom Tov), written c. 1785. `ikar-tosafot-yom-tov-on-mishnah`
  - Reads: Hebrew text
- **Lechem Shamayim on the Mishnah** (לחם שמים). Yaakov Emden, written c. 1722-1728. `lechem-shamayim-on-mishnah`
  - Reads: Hebrew text. Most titles use a 1978 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Marit HaAyin on the Mishnah** (מראית העין). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `marit-haayin-on-mishnah`
  - Reads: Hebrew text. The 1960 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Melekhet Shelomoh on the Mishnah** (מלאכת שלמה). Solomon Adeni, written c. 1590-1620, Hebron. `melekhet-shelomoh-on-mishnah`
  - Reads: Hebrew text
- **Petach Einayim on the Mishnah** (פתח עינים). Hayyim Joseph David Azulai (Chida), written c. 1750-1790. Sephardi. `petach-einayim-on-mishnah`
  - Reads: Hebrew text. The 1959 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use. Some titles carry another license (unknown); those files are skipped.
- **Rashash on the Mishnah** (רש״ש). Shmuel Strashun, written c. 1832-1852, Vilna. `rashash-on-mishnah`
  - Reads: Hebrew text
- **Tosafot Rabbi Akiva Eiger on the Mishnah** (תוספות רבי עקיבא איגר). Akiva Eiger, written c. 1785-1835. `tosafot-rabbi-akiva-eiger-on-mishnah`
  - Reads: Hebrew text
- **Yesh Seder LaMishnah (Rabbi Isaiah Berlin on the Mishnah)** (יש סדר למשנה). Isaiah Berlin, written c. 1751-1799. `yesh-seder-lamishnah-on-mishnah`
  - Reads: Hebrew text
- **Midrash Shmuel on Pirkei Avot** (מדרש שמואל על אבות). Samuel de Uçeda, written c. 1530-1570. `midrash-shmuel-on-avot`
  - Reads: Hebrew text
- **Pirkei Moshe on Pirkei Avot** (פרקי משה). Moses Almosnino, written c. 1535-1565, Salonica / Thessaloniki. `pirkei-moshe-on-avot`
  - Reads: Hebrew text
- **Zeroa Yamin (on the Mishnah)** (זרוע ימין). Hayyim Joseph David Azulai (Chida), written c. 1770-1790. Sephardi. `zeroa-yamin-on-mishnah`
  - Reads: Hebrew text
- **Solomon Buber's notes on Midrash Aggadah** (הערות ותיקונים על מדרש אגדה). Solomon Buber, written c. 1888-1894, Lemberg, Galicia. `buber-notes-on-midrash-aggadah`
  - Reads: Hebrew text
  - Note: Library question 10 asks whether Buber's notes should be used as well as his texts.
- **Solomon Buber's notes on Midrash Mishlei** (הערות בובר על מדרש משלי). Solomon Buber, printed 1893, Lemberg, Galicia. `buber-notes-on-midrash-mishlei`
  - Reads: Hebrew text
  - Note: Library question 10 asks whether Buber's notes should be used as well as his texts.
- **Beur HaRadal on Pirkei DeRabbi Eliezer** (ביאור הרד"ל). David Luria. `beur-haradal-on-pirkei-derabbi-eliezer`
  - Reads: Hebrew text
- **Par Echad on Pirkei DeRabbi Eliezer** (פר אחד). Hayyim Palache. Sephardi. `par-echad-on-pirkei-derabbi-eliezer`
  - Reads: Hebrew text
- **The Vilna Gaon on Seder Olam Rabbah** (גר"א). Vilna Gaon, written c. 1730-1770, Vilna. `vilna-gaon-on-seder-olam-rabbah`
  - Reads: Hebrew text
- **Rabbi Yaakov Emden on Seder Olam Rabbah** (יעב"ץ). Yaakov Emden, written c. 1740-1760. `yaakov-emden-on-seder-olam-rabbah`
  - Reads: Hebrew text
- **Meir Ayin on Seder Olam Rabbah** (מאיר עין). Yerucham Meïr Leiner, written c. 1896-1904. `meir-ayin-on-seder-olam-rabbah`
  - Reads: Hebrew text
- **Rabbi David Zvi Hoffmann's notes on the Mekhilta of Rabbi Shimon bar Yochai** (הערות שוליים). David Zvi Hoffmann, written c. 1895-1905. `hoffmann-notes-on-mekhilta-drashbi`
  - Reads: Hebrew text
- **Solomon Buber's notes on Midrash Lekach Tov** (הערות ותיקונים). Solomon Buber, written c. 1882-1886, Lemberg, Galicia. `buber-notes-on-midrash-lekach-tov`
  - Reads: Hebrew text
  - Note: Library question 10 asks whether Buber's notes should be used as well as his texts.
- **Beur HaRe'em on Midrash Lekach Tov** (באור הרא"ם). Aaron Moses Padua of Karlin, written c. 1835-1865. `beur-hareem-on-midrash-lekach-tov`
  - Reads: Hebrew text
- **Chidushei HaRadal on Midrash Rabbah** (חידושי הרד״ל). `chidushei-haradal-on-midrash-rabbah`
  - Reads: Hebrew text
- **Etz Yosef on Midrash Rabbah** (עץ יוסף). Chanokh Zundel ben Yosef, written c. 1807-1833, Białystok. `etz-yosef-on-midrash-rabbah`
  - Reads: Hebrew text
- **Maharzu Hakatzar on Midrash Rabbah** (מהרז"ו הקצר). Zev Wolf Einhorn, written c. 1810-1830, Grodno, Belarus. `maharzu-hakatzar-on-midrash-rabbah`
  - Reads: Hebrew text
- **Matnot Kehunah on Midrash Rabbah** (מתנות כהונה). Issachar Berman ben Naphtali Ha-Kohen, written c. 1584, Poland. `matnot-kehunah-on-midrash-rabbah`
  - Reads: Hebrew text
- **Mishnat DeRabbi Eliezer on Midrash Rabbah** (משנת דרבי אליעזר). Eliezer bar Yehudah of Pintshov, written c. 1703-1727. `mishnat-derabbi-eliezer-on-midrash-rabbah`
  - Reads: Hebrew text
- **Perush Maharzu on Midrash Rabbah** (פירוש מהרז״ו). Zev Wolf Einhorn, written c. 1810-1830, Grodno, Belarus. `perush-maharzu-on-midrash-rabbah`
  - Reads: Hebrew text
- **Yedei Moshe on Midrash Rabbah** (ידי משה). Yaakov Moshe Ashkenazi, written c. 1650-1700. `yedei-moshe-on-midrash-rabbah`
  - Reads: Hebrew text
- **Yefeh Anaf on Midrash Rabbah** (יפה ענף). Shmuel Yaffe Ashkenazi, written c. 1560-1580, Constantinople. `yefeh-anaf-on-midrash-rabbah`
  - Reads: Hebrew text
- **Yefeh Kol on Midrash Rabbah** (יפה קול). Shmuel Yaffe Ashkenazi, written c. 1560-1580, Constantinople. `yefeh-kol-on-midrash-rabbah`
  - Reads: Hebrew text
- **Yefeh To'ar on Midrash Rabbah** (יפה תואר). Shmuel Yaffe Ashkenazi, written c. 1560-1580, Constantinople. `yefeh-toar-on-midrash-rabbah`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Ohr LaYesharim on the Jerusalem Talmud** (אור לישרים). Rabbi Yehoshua Buch (Machon HaYerushalmi). `ohr-layesharim`
  - Reads: Hebrew text (Machon HaYerushalmi). A contemporary Hebrew commentary that explains the Yerushalmi line by line, on twelve tractates so far. Shared on Sefaria by Machon HaYerushalmi under a non-commercial license. Reviewers confirm the details.
  - Note: Explains the Yerushalmi's plain meaning, which helps RabAI translate the Yerushalmi accurately where no English translation is available.
- **Dor Revi'i on Chullin** (דור רביעי). Moshe Shmuel Glasner. `dor-revii-on-chullin`
  - Reads: Hebrew text
  - Note: Rabbi Glasner's introduction makes an argument about why the Oral Torah was not to be written down that later authorities have discussed (to confirm). The commentary itself is classic lomdus; the board may want to read the introduction before approving.
- **Beur Reuven on Bava Kamma** (ביאור ראובן). Reuven Agushewitz, written c. 1925-1955. Litvish. `beur-reuven-on-bava-kamma`
  - Reads: Hebrew text. The 1955 New York printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Sha'arei Torat Eretz Yisrael (on the Jerusalem Talmud)** (שערי תורת ארץ ישראל). Zev Wolf Rabinowitz. `shaarei-torat-eretz-yisrael`
  - Reads: Hebrew text. The 1940 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Reshimot Shiurim (Rav Soloveitchik's shiurim on the Talmud)** (רשימות שיעורים). Rabbi Joseph B. Soloveitchik (notes of his shiurim), New York. Modern Orthodox. `reshimot-shiurim`
  - Reads: Hebrew text. Published in New York, 1989-2016, under an open license on Sefaria (library question 15). The volumes on Kiddushin, Horayot and Sanhedrin carry no license on Sefaria and are not included.
  - Note: See also rav-soloveitchik.
- **Motar Kinnim (on Mishnah Kinnim)** (מותר קנים על משנה קינים). Yitzchak Aizik Safrin of Komarna, written c. 1830-1870, Komarno, Ukraine. `motar-kinnim`
  - Reads: Hebrew text. A modern work (Modiin, 2017) under an open license. The board approves modern works one at a time.
- **The Chafetz Chaim on the Sifra** (חפץ חיים). Israel Meir Kagan (Chafetz Chaim). Litvish. `chafetz-chaim-on-sifra`
  - Reads: Hebrew text
- **Rabbi Adin Even-Israel Steinsaltz's Hebrew explanation of the Talmud, and his introductions to the Talmud and the Mishneh Torah** (ביאור הרב שטיינזלץ). Rabbi Adin Even-Israel Steinsaltz, 1937-2020, Jerusalem. `steinsaltz-hebrew-explanation-of-the-talmud`
  - Reads: Hebrew (the William Davidson digital edition, Koren). His explanation of every line of the Gemara in plain Hebrew, his introductions to each tractate and chapter, and his introductions to the books of the Mishneh Torah. The canon already uses his English translation of the Talmud (the William Davidson Edition).
  - Reads: English introductions to the Talmud (the William Davidson digital edition, Koren)
  - Note: For the board to know: in 1989 some leading Charedi rabbis criticized several of Rabbi Steinsaltz's books, and some Charedi communities do not use his Talmud edition (which books, and what was said, to confirm). His Talmud commentary is widely used in yeshivot and schools, and the canon already holds his translation.
- **Rabbi Abraham Cohen's notes to his English translation of Berakhot (Cambridge, 1921)**. Rabbi Abraham Cohen, 1887-1957, England. `abraham-cohen-notes-on-berakhot`
  - Reads: English text. Rabbi Abraham Cohen, author of Everyman's Talmud, also directed the Soncino translation of the minor tractates that the canon already lists (to confirm).

#### The history of the mesorah

*Geonim (about 600-1040)*

- **Iggeret Rav Sherira Gaon** (אגרת רב שרירא גאון). Rav Sherira Gaon. `iggeret-rav-sherira-gaon`
  - Reads: Hebrew/Aramaic text. The text as printed in Seder HaChachamim (Oxford, 1888). Public domain.
  - Note: The classical account of how the Mishnah and Talmud were transmitted. Needed for questions about who wrote the Talmud.

*Acharonim (about 1550-1900)*

- **Shem HaGedolim, Ma'arechet Sefarim (the Chida), with Rabbi Menachem Mendel Krengel's notes and Kuntres Peleitat Sefarim** (שם הגדולים). Hayyim Joseph David Azulai (Chida). `shem-hagedolim`
  - Reads: Hebrew text
- **Seder HaDorot** (סדר הדורות). Yechiel Heilprin, written c. 1722. `seder-hadorot`
  - Reads: Hebrew text

### Halacha

The codes, the commentaries on them, the responsa, and practical handbooks.

#### Codes

*Geonim (about 600-1040)*

- **Halakhot Gedolot** (הלכות גדולות). Attributed to Rav Shimon Kayyara, written c. 760-920, Babylonia. Ashkenazi and Sephardi practice. `halakhot-gedolot`
  - Reads: Hebrew text
- **Sefer HaMitzvot of Rav Saadia Gaon** (ספר המצוות לרס"ג). Saadia Gaon, written c. 918-942. Ashkenazi and Sephardi practice. `sefer-hamitzvot-of-rasag`
  - Reads: Hebrew text
- **Sheiltot of Rav Achai Gaon** (שאילתות דרב אחאי גאון). Achai Gaon, written c. 705-745, Eretz Yisrael. Ashkenazi and Sephardi practice. `sheiltot-drav-achai`
  - Reads: Hebrew text

*Rishonim (about 1040-1550)*

- **Rif (Hilchot HaRif)** (רי״ף). Rabbi Yitzchak Alfasi, 1013-1103, North Africa and Spain. core · Ashkenazi and Sephardi practice. `rif`
  - Reads: Hebrew text, standard (printed in the Vilna Shas)
- **Rosh (Piskei HaRosh)** (רא״ש). Rabbeinu Asher ben Yechiel, c. 1250-1327, Germany and Spain. core · Ashkenazi and Sephardi practice. `rosh`
  - Reads: Hebrew text, standard (printed in the Vilna Shas)
- **Mishneh Torah** (משנה תורה). Rabbi Moshe ben Maimon (Rambam), 1138-1204, Spain and Egypt. core · Ashkenazi and Sephardi practice. `mishneh-torah`
  - Reads: Hebrew text (e.g., the Shabsai Frankel edition, or the standard Vilna text)
  - Reads: Mishneh Torah, translated by Rabbi Eliyahu Touger. Published on Chabad.org. Permission needed for our use.
  - Reads: Mishneh Torah (Sefer HaMadda), translated by Rabbi Simon Glazer. Covers the introduction and the Book of Knowledge only. Rabbi Simon Glazer (1876-1938), born in Kovno, served Orthodox congregations in the United States and Canada, was president of the Council of Orthodox Rabbis of the United States and Canada, and helped found the Agudath HaRabbanim (to confirm).
- **Arba'ah Turim** (ארבעה טורים). Rabbi Yaakov ben Asher, c. 1269-1343, Spain. core · Ashkenazi and Sephardi practice. `tur`
  - Reads: Hebrew text, standard
- **Piskei Recanati** (פסקי רקנאטי). Menachem Recanati. Ashkenazi and Sephardi practice. `piskei-recanati`
  - Reads: Hebrew text
- **Abudarham** (אבודרהם). David Abudarham, written c. 1330-1340, Seville, Spain. Sephardi practice · Sephardi. `abudarham`
  - Reads: Hebrew text
- **Avodat HaKodesh (the Rashba)** (עבודת הקדש). Shlomo ibn Adret (Rashba), written c. 1270-1310, Barcelona, Spain. Ashkenazi and Sephardi practice. `avodat-hakodesh-rashba`
  - Reads: Hebrew text
- **Ba'alei HaNefesh** (בעלי הנפש). Ra'avad. Ashkenazi and Sephardi practice. `baalei-hanefesh`
  - Reads: Hebrew text
- **Bedikat HaSakin** (משפטי בדיקת הסכין לרבי' יונה זצ"ל). Rabbeinu Yonah Gerondi, written c. 1210-1260. Ashkenazi and Sephardi practice. `bedikat-hasakin`
  - Reads: Hebrew text
- **Dina DeGarmei** (דינא דגרמי). Moses ben Nachman (Ramban), written c. 1225-1265. Ashkenazi and Sephardi practice. `dina-degarmei`
  - Reads: Hebrew text
- **HaAgur** (האגור). Jacob Landau. Ashkenazi practice. `haagur`
  - Reads: Hebrew text
- **Hilkhot Niddah of the Ramban** (הלכות נדה לרמב"ן). Moses ben Nachman (Ramban). Ashkenazi and Sephardi practice. `hilkhot-niddah-of-the-ramban`
  - Reads: Hebrew text
- **Issur V'Heter L'Rabbeinu Yerucham** (איסור והיתר לרבנו ירוחם). Rabbenu Yeruham, written c. 1240-1440, Germany. Ashkenazi and Sephardi practice. `issur-vheter-lrabbeinu-yerucham`
  - Reads: Hebrew text
- **Issur VeHeter HaArokh** (איסור והיתר הארוך). Ashkenazi practice. `issur-veheter-haarokh`
  - Reads: Hebrew text
- **Issur VeHeter LeRashi** (איסור והיתר לרש"י). Rashi, written c. 990-1190. Ashkenazi practice. `issur-veheter-lerashi`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text. The Berlin 1936 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
  - Note: Attributed to Rashi's school.
- **Kol Bo** (כל בו). written c. 1250-1450. Ashkenazi and Sephardi practice. `kol-bo`
  - Reads: Hebrew text
- **Leket Yosher** (לקט יושר). Rabbi Yosef ben Moshe (student of the Terumat HaDeshen). Ashkenazi and Sephardi practice. `leket-yosher`
  - Reads: Hebrew text
- **Likkutei HaPardes** (לקוטי הפרדס). Rashi, written c. 1100-1300, Troyes, France. Ashkenazi practice. `likkutei-hapardes`
  - Reads: Hebrew text
- **Machzor Vitry** (מחזור ויטרי). Simchah of Vitry, written c. 1055-1105, Vitry-sur-Seine. Ashkenazi practice. `machzor-vitry`
  - Reads: Hebrew text
- **Ohr Zarua** (אור זרוע). Yitzchak ben Moshe of Vienna, written c. 1240-1280. Ashkenazi practice. `ohr-zarua`
  - Reads: Hebrew text
- **Piskei Challah** (פסקי חלה). Shlomo ibn Adret (Rashba), written c. 1270-1310, Barcelona, Spain. Ashkenazi and Sephardi practice. `piskei-challah`
  - Reads: Hebrew text
- **Seder Troyes** (סדר טרוייש). written c. 1250-1300, Troyes, France. Ashkenazi and Sephardi practice. `seder-troyes`
  - Reads: Hebrew text
- **Sefer HaItim** (ספר העיתים). Yehuda ben Barzillai, written c. 1085-1135, Barcelona, Spain. Sephardi practice · Sephardi. `sefer-haitim`
  - Reads: Hebrew text
- **Sefer HaMachkim** (ספר המחכים). Natan ben Yehuda, written c. 1200-1300. Ashkenazi practice. `sefer-hamachkim`
  - Reads: Hebrew text
- **Sefer HaMakhria** (ספר המכריע). Isaiah d'Trani, Trani, Italy. Ashkenazi and Sephardi practice. `sefer-hamakhria`
  - Reads: Hebrew text
- **Sefer HaOrah** (ספר האורה). Rashi, written c. 1100-1300, Troyes, France. Ashkenazi practice. `sefer-haorah`
  - Reads: Hebrew text
- **Sefer HaTerumah** (ספר התרומה). Barukh ben Isaac of Worms, written c. 1190-1210, Worms. Ashkenazi practice. `sefer-haterumah`
  - Reads: Hebrew text
- **Sela HaMachlakot on Ba'alei HaNefesh** (סלע המחלקות). Zerachiah HaLevi of Gerona. Ashkenazi and Sephardi practice. `sela-hamachlakot-on-baalei-hanefesh`
  - Reads: Hebrew text
- **Sha'ar HaMayim HaAroch** (שער המים הארוך). Shlomo ibn Adret (Rashba), written c. 1270-1310, Barcelona, Spain. Ashkenazi and Sephardi practice. `shaar-hamayim-haaroch`
  - Reads: Hebrew text
- **Sha'ar HaMayim HaKatzar** (שער המים הקצר). Shlomo ibn Adret (Rashba), written c. 1270-1310, Barcelona, Spain. Ashkenazi and Sephardi practice. `shaar-hamayim-hakatzar`
  - Reads: Hebrew text
- **Shibbolei HaLeket** (שבלי הלקט). Zedekiah ben Abraham HaRofei. Ashkenazi and Sephardi practice. `shibbolei-haleket`
  - Reads: Hebrew text
- **Siddur Rashi** (סידור רש"י). Rashi, written c. 1080-1120, Troyes, France. Ashkenazi practice. `siddur-rashi`
  - Reads: Hebrew text
- **Tashbetz Katan** (תשב"ץ קטן). Shimshon ben Tzadok. Ashkenazi practice. `tashbetz-katan`
  - Reads: Hebrew text
- **Torat HaBayit HaAroch** (תורת הבית הארוך). Shlomo ibn Adret (Rashba), written c. 1270-1310, Barcelona, Spain. Ashkenazi and Sephardi practice. `torat-habayit-haaroch`
  - Reads: Hebrew text
- **Torat HaBayit HaKatzar** (תורת הבית הקצר). Shlomo ibn Adret (Rashba), written c. 1270-1310, Barcelona, Spain. Ashkenazi and Sephardi practice. `torat-habayit-hakatzar`
  - Reads: Hebrew text
- **Sefer HaParnas** (ספר הפרנס). written c. 1250-1350. Ashkenazi practice. `sefer-haparnas`
  - Reads: Hebrew text
  - Note: Includes the short notes printed with it in the Vilna 1891 edition (the Radal's and the publisher's).
- **Sefer HaMitzvot (the Rambam)** (ספר המצוות). Moses ben Maimon (Rambam), written c. 1167-1179, Fustat, Egypt. Ashkenazi and Sephardi practice. `sefer-hamitzvot-rambam`
  - Reads: Hebrew text
- **Sefer Mitzvot Gadol (the Semag)** (ספר מצוות גדול). Moses of Coucy, written c. 1243-1247. Ashkenazi and Sephardi practice. `sefer-mitzvot-gadol`
  - Reads: Hebrew text
- **Sefer Mitzvot Katan (the Semak)** (ספר מצוות קטן). Isaac of Corbeil, written c. 1263-1277. Ashkenazi practice. `sefer-mitzvot-katan`
  - Reads: Hebrew text
- **Sefer Yereim** (ספר יראים). Eliezer of Metz, written c. 1135-1165. Ashkenazi and Sephardi practice. `sefer-yereim`
  - Reads: Hebrew text

*Acharonim (about 1550-1900)*

- **Shulchan Aruch with the glosses of the Rema** (שולחן ערוך עם הגהות הרמ״א). Rabbi Yosef Karo (Mechaber); Rabbi Moshe Isserles (Rema), 1488-1575; 1530-1572, Eretz Yisrael; Poland. core · Ashkenazi and Sephardi practice · Sephardi. `shulchan-aruch`
  - Reads: Hebrew text, standard
  - Reads: The laws of salting meat, summarized by Rabbi Ari Enkin [English]. A short English summary of the laws of salting meat in Yoreh De'ah, not a full translation. Rabbi Ari Enkin received semicha from Yeshiva Gedola of Montreal and yadin-yadin ordination, was a congregational rabbi in Canada, and teaches halacha in Israeli yeshivot; he was the halacha editor of Torah Musings (to confirm).
  - Note: Tag every retrieved passage as Mechaber or Rema. The Mechaber is the baseline for Sephardi practice. The Rema records Ashkenazi practice.
- **Aruch HaShulchan** (ערוך השולחן). Rabbi Yechiel Michel Epstein, 1829-1908, Lithuania. core · Ashkenazi practice · Litvish. `aruch-hashulchan`
  - Reads: Hebrew text
- **Shulchan Aruch HaRav** (שולחן ערוך הרב). Rabbi Schneur Zalman of Liadi. Ashkenazi practice · Chassidish · Chabad. `shulchan-aruch-harav`
  - Reads: Hebrew text
- **Sefer Chafetz Chaim and Shemirat HaLashon** (חפץ חיים; שמירת הלשון). Rabbi Yisrael Meir Kagan (Chafetz Chaim). Ashkenazi and Sephardi practice · Litvish. `chafetz-chaim`
  - Reads: Hebrew text. Shemirat HaLashon's Hebrew is Torat Emet's text, by its written permission (canon/permissions.yaml).
  - Reads: Chafetz Chaim and Shemirat HaLashon, translated by Rabbi Shraga Silverstein
- **Arukh HaShulchan HeAtid** (ערוך השולחן העתיד). Yechiel Michel Epstein, written c. 1875-1905, Novogrudok. Ashkenazi practice · Litvish. `arukh-hashulchan-heatid`
  - Reads: Hebrew text. The Tel Aviv 1938 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Ahavat Chesed** (אהבת חסד). Israel Meir Kagan (Chafetz Chaim). Ashkenazi and Sephardi practice · Litvish. `ahavat-chesed`
  - Reads: Hebrew text
- **Geder Olam** (גדר עולם). Israel Meir Kagan (Chafetz Chaim), written c. 1861-1889, Radun. Ashkenazi and Sephardi practice · Litvish. `geder-olam`
  - Reads: Hebrew text
- **Gevurat Anashim** (גבורת אנשים). Shabbetai ben Meir Hakohen, written c. 1840-1860. Ashkenazi and Sephardi practice. `gevurat-anashim`
  - Reads: Hebrew text
- **Maaseh Rav (the customs of the Vilna Gaon)** (מעשה רב). Sa'adiah ben Natan Neta, written c. 1809-1813, Safed. Ashkenazi practice · Litvish. `maaseh-rav`
  - Reads: Hebrew text
- **Mateh Efrayim** (מטה אפרים). Ephraim Zalman Margoliot, written c. 1795-1825, Brody. Ashkenazi practice. `mateh-efrayim`
  - Reads: Hebrew text
- **Od Yosef Chai (halachot)** (עוד יוסף חי; הלכות). Yosef Hayyim, written c. 1865-1909, Baghdad. Sephardi practice · Sephardi. `od-yosef-chai-halakhot`
  - Reads: Hebrew text
- **Sha'arei Ephraim** (שערי אפרים). Ephraim Zalman Margoliot, written c. 1780-1820, Brody. Ashkenazi practice. `shaarei-ephraim`
  - Reads: Hebrew text. The Iršava 1932 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Simlah Chadashah** (שמלה חדשה). Alexander Sender Schorr. Ashkenazi practice. `simlah-chadashah`
  - Reads: Hebrew text
- **Avodat HaKodesh (the Chida's halachic booklets)** (עבודת הקודש). Hayyim Joseph David Azulai (Chida), written c. 1751-1781. Sephardi practice · Sephardi. `avodat-hakodesh-chida`
  - Reads: Hebrew text
- **Hilkhot Talmud Torah (Shulchan Arukh HaRav)** (הלכות תלמוד תורה). Shneur Zalman of Liadi, written c. 1760-1810. Ashkenazi practice · Chassidish · Chabad. `hilkhot-talmud-torah-shulchan-arukh-harav`
  - Reads: Hebrew text
- **Sefer Charedim** (ספר חרדים). Elazar ben Moshe Azikri. Ashkenazi and Sephardi practice. `sefer-charedim`
  - Reads: Hebrew text
- **Kitzur Sefer Haredim (an abridgment of Rabbi Elazar Azikri's Sefer Charedim)** (קיצור ספר חרדים). Ashkenazi and Sephardi practice. `kitzur-sefer-haredim`
  - Reads: Hebrew text
- **Derekh Pikudekha** (דרך פקודך). Tzvi Elimelekh Shapira of Dinov, written c. 1824. Ashkenazi and Sephardi practice · Chassidish. `derekh-pikudekha`
  - Reads: Hebrew text

#### Commentaries on the codes

*Rishonim (about 1040-1550)*

- **Birkat Avraham on the Mishneh Torah** (ברכת אברהם). Avraham ben HaRambam, written c. 1195-1245, Fustat, Egypt. Ashkenazi and Sephardi practice. `birkat-avraham-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and its comments are essays, not keyed to the Rambam's opening words, so the check against the Mishneh Torah does not apply; 0.37% of its words appear nowhere else in Sefaria (Torat Emet and Warsaw 1881 texts: about 0.1%).
- **Commentary of Mahari Kurkus and Radbaz on the Mishneh Torah** (באורי מהר"י קורקוס והרדב"ז). David ben Solomon ibn (Abi) Zimra; Yosef Kurkus, written c. 1460-1560. Ashkenazi and Sephardi practice. `commentary-of-mahari-kurkus-and-radbaz-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 81.1% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.4% of its words appear nowhere else in Sefaria. It carries about 2,150 editor's footnotes giving Talmud page numbers; the library build already leaves footnotes out.
- **Migdal Oz on the Mishneh Torah** (מגדל עוז). Shem Tov ben Avraham ibn Gaon, written c. 1298-1322, Spain. Ashkenazi and Sephardi practice. `migdal-oz-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 71.9% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.12% of its words appear nowhere else in Sefaria. Its source references in small type (for example "(דף נ"ט)") come from a modern editor.
- **Sefer HaMenucha on the Mishneh Torah** (ספר המנוחה). Rabbenu Manoach, written c. 1290-1350, Provence, France. Ashkenazi and Sephardi practice. `sefer-hamenucha-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 69.2% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.27% of its words appear nowhere else in Sefaria.
- **Bedek HaBayit** (בדק הבית). Aharon HaLevi (Ra'ah), written c. 1293, Barcelona, Spain. Ashkenazi and Sephardi practice. `bedek-habayit`
  - Reads: Hebrew text
- **Mishmeret HaBayit** (משמרת הבית). Shlomo ibn Adret (Rashba), written c. 1293, Barcelona, Spain. Ashkenazi and Sephardi practice. `mishmeret-habayit`
  - Reads: Hebrew text
- **The Ramban's glosses on the Rambam's Sefer HaMitzvot** (השגות הרמב"ן). Moses ben Nachman (Ramban), written c. 1220-1270. Ashkenazi and Sephardi practice. `hasagot-haramban-on-sefer-hamitzvot`
  - Reads: Hebrew text
- **Haggahot Rabbeinu Peretz on the Semak** (הגהות רבנו פרץ על ספר מצוות קטן). Peretz ben Elijah of Corbeil, written c. 1230-1290. Ashkenazi practice. `haggahot-rabbeinu-peretz-on-semak`
  - Reads: Hebrew text
- **Zohar HaRakia (the Rashbatz on the Azharot)** (זוהר הרקיע). Shimon ben Tzemach Duran, written c. 1370-1430, Algiers. Ashkenazi and Sephardi practice. `zohar-harakia`
  - Reads: Hebrew text
- **The Peirush on the Mishneh Torah (Hilchot Yesodei HaTorah and Hilchot Teshuvah)** (פירוש על משנה תורה). Unknown. Ashkenazi and Sephardi practice. `peirush-on-mishneh-torah`
  - Reads: Hebrew text (Torat Emet). The commentary of unknown authorship printed beside these sections of the Mishneh Torah (era and authorship to confirm). Sefaria lists no license; the text is Torat Emet's, in by their written permission (canon/permissions.yaml).

*Acharonim (about 1550-1900)*

- **Mishnah Berurah** (משנה ברורה). Rabbi Yisrael Meir Kagan (Chafetz Chaim), 1838-1933, Lithuania. core · Ashkenazi practice · Litvish. `mishnah-berurah`
  - Reads: Hebrew text, standard
- **Kaf HaChaim** (כף החיים). Rabbi Yaakov Chaim Sofer, 1870-1939. Sephardi practice · Sephardi. `kaf-hachaim`
  - Reads: Hebrew text
- **Ketzos HaChoshen and Nesivos HaMishpat** (קצות החושן; נתיבות המשפט). Rabbi Aryeh Leib Heller; Rabbi Yaakov Lorberbaum of Lissa, c. 1745-1813; 1760-1832. Ashkenazi practice. `ketzos-nesivos`
  - Reads: Hebrew texts
  - Note: On Choshen Mishpat. Their back-and-forth is a foundation of the yeshiva method of learning.
- **Beit Yosef (on the Tur)** (בית יוסף). Joseph Karo, written c. 1522-1542, Adrianople/Safed. Ashkenazi and Sephardi practice. `beit-yosef`
  - Reads: Hebrew text
- **Bayit Chadash (the Bach) on the Tur** (ב"ח). Yoel ben Shmuel Sirkes, written c. 1585-1635, Poland. Ashkenazi practice. `bach-on-tur`
  - Reads: Hebrew text
- **Darkhei Moshe (the Rema on the Tur)** (דרכי משה). Moses Isserles (Rema), written c. 1545-1565. Ashkenazi practice. `darkhei-moshe`
  - Reads: Hebrew text
- **Drisha (on the Tur)** (דרישה). Joshua Falk, written c. 1590-1620, Poland. Ashkenazi practice. `drisha`
  - Reads: Hebrew text
- **Prisha (on the Tur)** (פרישה). Joshua Falk, written c. 1590-1620, Poland. Ashkenazi practice. `prisha`
  - Reads: Hebrew text
- **Ateret Zekenim on the Shulchan Arukh** (עטרת זקנים). Menachem Mendel Auerbach, written c. 1620-1680. Ashkenazi practice. `ateret-zekenim-on-shulchan-arukh`
  - Reads: Hebrew text
- **Ba'er Hetev on the Shulchan Arukh** (באר היטב). Yehudah ben Shimon Ashkenazi, written c. 1665-1705. Ashkenazi practice. `baer-hetev-on-shulchan-arukh`
  - Reads: Hebrew text
- **Be'er HaGolah on the Shulchan Arukh** (באר הגולה). Moses Rivkes, written c. 1662-1666, Amsterdam. Ashkenazi and Sephardi practice. `beer-hagolah-on-shulchan-arukh`
  - Reads: Hebrew text
- **Beit Shmuel on the Shulchan Arukh** (בית שמואל). Samuel ben Uri Shraga Phoebus, written c. 1684-1694, Szydłów, Poland. Ashkenazi practice. `beit-shmuel-on-shulchan-arukh`
  - Reads: Hebrew text
- **Beur HaGra (the Vilna Gaon) on the Shulchan Arukh** (ביאור הגר"א). Vilna Gaon, written c. 1748-1798. Ashkenazi practice. `beur-hagra-on-shulchan-arukh`
  - Reads: Hebrew text
- **The Chatam Sofer's glosses on the Shulchan Arukh** (חתם סופר). Moses Sofer (Chatam Sofer), written c. 1785-1835. Ashkenazi practice. `chatam-sofer-on-shulchan-arukh`
  - Reads: Hebrew text
- **Chelkat Mechokek on the Shulchan Arukh** (חלקת מחוקק). Moses ben Isaac Judah Lima, written c. 1628-1658, Vilna. Ashkenazi practice. `chelkat-mechokek-on-shulchan-arukh`
  - Reads: Hebrew text
- **Chiddushei Hilkhot Niddah on the Shulchan Arukh** (חדושי הלכות נדה). Jonathan Eybeschutz, written c. 1714-1764. Ashkenazi practice. `chiddushei-hilkhot-niddah-on-shulchan-arukh`
  - Reads: Hebrew text
- **Chok Yaakov on the Shulchan Arukh** (חק יעקב). Jacob Reischer, written c. 1690-1696. Ashkenazi practice. `chok-yaakov-on-shulchan-arukh`
  - Reads: Hebrew text
- **Chokhmat Shlomo on the Shulchan Arukh** (חכמת שלמה). Shlomo Kluger, written c. 1820-1870. Ashkenazi practice. `chokhmat-shlomo-on-shulchan-arukh`
  - Reads: Hebrew text
- **Dagul MeRevava on the Shulchan Arukh** (דגול מרבבה). Yechezkel Landau (Noda BiYehudah), written c. 1750-1790. Ashkenazi practice. `dagul-merevava-on-shulchan-arukh`
  - Reads: Hebrew text
- **Eliyah Rabbah (on Orach Chayim)** (אליה רבה). Eliyahu Spira, written c. 1680-1710. Ashkenazi practice. `eliyah-rabbah-on-shulchan-arukh`
  - Reads: Hebrew text
- **Eshel Avraham on the Shulchan Arukh** (אשל אברהם). Abraham David Wahrmann, written c. 1795-1835. Ashkenazi practice. `eshel-avraham-on-shulchan-arukh`
  - Reads: Hebrew text
- **Hagahot Imrei Barukh on the Shulchan Arukh** (הגהות אמרי ברוך). Barukh Frankel-Teomim, written c. 1780-1830. Ashkenazi practice. `hagahot-imrei-barukh-on-shulchan-arukh`
  - Reads: Hebrew text
- **Kereti on the Shulchan Arukh** (כרתי). Jonathan Eybeschutz, written c. 1714-1764. Ashkenazi practice. `kereti-on-shulchan-arukh`
  - Reads: Hebrew text
- **Levushei Serad on the Shulchan Arukh** (לבושי שרד). David Solomon Eibeschutz, written c. 1770-1810. Ashkenazi practice. `levushei-serad-on-shulchan-arukh`
  - Reads: Hebrew text
- **Machatzit HaShekel (on the Magen Avraham)** (מחצית השקל). Samuel Kolin, written c. 1755-1805, Boskovice. Ashkenazi practice. `machatzit-hashekel-on-shulchan-arukh`
  - Reads: Hebrew text
- **Magen Avraham on the Shulchan Arukh** (מגן אברהם). Abraham Abele Gombiner, written c. 1665-1671, Leszno, Poland. Ashkenazi practice. `magen-avraham-on-shulchan-arukh`
  - Reads: Hebrew text
- **Me'irat Einayim on the Shulchan Arukh** (מאירת עיניים). Joshua Falk, written c. 1570-1610, Lemberg. Ashkenazi practice. `meirat-einayim-on-shulchan-arukh`
  - Reads: Hebrew text
- **Nekudot HaKesef on the Shulchan Arukh** (נקודות הכסף). Shabbetai ben Meir Hakohen, written c. 1646. Ashkenazi practice. `nekudot-hakesef-on-shulchan-arukh`
  - Reads: Hebrew text
- **Peleti on the Shulchan Arukh** (פלתי). Jonathan Eybeschutz, written c. 1714-1764. Ashkenazi practice. `peleti-on-shulchan-arukh`
  - Reads: Hebrew text
- **Pitchei Teshuva on the Shulchan Arukh** (פתחי תשובה). Tzvi Hirsh Eisenstadt, written c. 1830-1836. Ashkenazi practice. `pitchei-teshuvah-on-shulchan-arukh`
  - Reads: Hebrew text
- **Peri Megadim on Shulchan Arukh, Yoreh De'ah** (פרי מגדים). Joseph ben Meir Teomim, written c. 1758-1772. Ashkenazi practice. `pri-megadim-on-shulchan-arukh`
  - Reads: Hebrew text
- **Rabbi Akiva Eiger's glosses on the Shulchan Arukh** (הגהות רבי עקיבא איגר). Akiva Eiger, written c. 1785-1835. Ashkenazi practice. `rabbi-akiva-eiger-on-shulchan-arukh`
  - Reads: Hebrew text
- **Sha'arei Teshuvah on the Shulchan Arukh** (שערי תשובה). Chaim Mordekhai Margulies, written c. 1800-1820. Ashkenazi practice. `shaarei-teshuvah-on-shulchan-arukh`
  - Reads: Hebrew text
- **Siftei Kohen (the Shakh) on the Shulchan Arukh** (שפתי כהן). Shabbetai ben Meir Hakohen, written c. 1641-1645. Ashkenazi practice. `siftei-kohen-on-shulchan-arukh`
  - Reads: Hebrew text
- **Tiferet Yisrael on Shulchan Arukh, Yoreh De'ah** (תפארת ישראל). Ashkenazi practice. `tiferet-yisrael-on-shulchan-arukh`
  - Reads: Hebrew text
  - Note: Sefaria's index names Rabbi Yonatan Eybeschutz as the author but places the work in Danzig; reviewers to confirm the author.
- **Torat HaShlamim on the Shulchan Arukh** (תורת השלמים). Jacob Reischer, written c. 1683-1689. Ashkenazi practice. `torat-hashlamim-on-shulchan-arukh`
  - Reads: Hebrew text
- **Turei Zahav (the Taz) on the Shulchan Arukh** (טורי זהב). David HaLevi Segal, written c. 1635-1645, Ostroh. Ashkenazi practice. `turei-zahav-on-shulchan-arukh`
  - Reads: Hebrew text
- **Urim VeTumim (on Choshen Mishpat)** (אורים ותומים, אורים). Jonathan Eybeschutz, written c. 1714-1764. Ashkenazi practice. `urim-vetumim-on-shulchan-arukh`
  - Reads: Hebrew text
- **Yad Ephraim on the Shulchan Arukh** (יד אפרים). Ephraim Zalman Margoliot, written c. 1790-1820, Brody. Ashkenazi practice. `yad-ephraim-on-shulchan-arukh`
  - Reads: Hebrew text
- **Beit Meir on Shulchan Arukh, Even HaEzer** (בית מאיר). Meir Posner, written c. 1767-1787. Ashkenazi practice. `beit-meir-on-shulchan-arukh-even-haezer`
  - Reads: Hebrew text
- **Ezer MiKodesh on Shulchan Arukh, Even HaEzer** (עזר מקודש). Abraham David Wahrmann, written c. 1795-1835. Ashkenazi practice. `ezer-mikodesh-on-shulchan-arukh-even-haezer`
  - Reads: Hebrew text
- **Kessef HaKodashim on Shulchan Arukh, Choshen Mishpat** (כסף הקדשים). Abraham David Wahrmann, written c. 1795-1835. Ashkenazi practice. `kessef-hakodashim-on-shulchan-arukh-choshen-mishpat`
  - Reads: Hebrew text
- **Kol Yaakov on Shulchan Arukh** (קול יעקב). Yaakov Chaim Sofer. Sephardi practice · Sephardi. `kol-yaakov-on-shulchan-arukh`
  - Reads: Hebrew text. The 1910 Jerusalem printing, included as public domain by age.
- **Mateh Yehonatan on Shulchan Arukh, Yoreh De'ah** (מטה יהונתן). Jonathan Eybeschutz, written c. 1714-1764. Ashkenazi practice. `mateh-yehonatan-on-shulchan-arukh-yoreh-deah`
  - Reads: Hebrew text
- **Netiv Chayim on Shulchan Arukh, Orach Chayim** (נתיב חיים). Nathaniel Weil, written c. 1719-1769. Ashkenazi practice. `netiv-chayim-on-shulchan-arukh-orach-chayim`
  - Reads: Hebrew text
- **Yad Avraham on Shulchan Arukh, Yoreh Deah** (יד אברהם). Avraham Maskil LeEitan, written c. 1814-1846. Ashkenazi practice. `yad-avraham-on-shulchan-arukh-yoreh-deah`
  - Reads: Hebrew text
- **Yad Ephraim on Shulchan Arukh, Orach Chayim** (יד אפרים). Ephraim Zalman Margoliot, written c. 1790-1820, Brody. Ashkenazi practice. `yad-ephraim-on-shulchan-arukh-orach-chayim`
  - Reads: Hebrew text
- **Peri Megadim on Shulchan Arukh, Orach Chayim** (פרי מגדים). Joseph ben Meir Teomim. Ashkenazi practice. `peri-megadim-on-orach-chayim`
  - Reads: Hebrew text
- **Annotations of Maharatz Chajes on the Mishneh Torah** (חידושים ומקורים מהר"ץ חיות). Zvi Hirsch Chajes, written c. 1825-1855. Ashkenazi and Sephardi practice. `annotations-of-maharatz-chajes-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and it is too short to check reliably against the Mishneh Torah (43 comments quote opening words, 65.1% of them found in the same halakhah); every one of its words also appears elsewhere in Sefaria.
- **Annotations of Minchat Chinukh on the Mishneh Torah** (חידושים ומקורים מבעל מנחת חינוך). Joseph Babad, written c. 1825-1855. Ashkenazi and Sephardi practice. `annotations-of-minchat-chinukh-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 88.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.05% of its words appear nowhere else in Sefaria.
- **Annotations of Rabbi Yeshaya Berlin on the Mishneh Torah** (חידושים והגהות הגרי"ב). Isaiah Berlin, written c. 1751-1799. Ashkenazi and Sephardi practice. `annotations-of-r-yeshaya-berlin-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and it is too short to check reliably against the Mishneh Torah (4 comments quote opening words, 0.0% of them found in the same halakhah); 0.04% of its words appear nowhere else in Sefaria.
- **Annotations of Rabbi Zalman of Vilna on the Mishneh Torah** (חידושים ומקורים מהרב זלמן מווילנא). Ashkenazi and Sephardi practice. `annotations-of-r-zalman-of-vilna-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and it is too short to check reliably against the Mishneh Torah (4 comments quote opening words, 50.0% of them found in the same halakhah); every one of its words also appears elsewhere in Sefaria.
- **Avodat HaMelekh on the Mishneh Torah** (עבודת המלך). Menachem Mendel Krakowski, written c. 1870-1930. Ashkenazi and Sephardi practice. `avodat-hamelekh-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 91.9% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.15% of its words appear nowhere else in Sefaria. Sefaria lists it as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Ben Aryeh on the Mishneh Torah** (בן אריה). Zev ben Aryeh, written c. 1825-1855. Ashkenazi and Sephardi practice. `ben-aryeh-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 76.9% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.08% of its words appear nowhere else in Sefaria. Sefaria lists 2 of its 81 titles with an unknown license; those are left out.
- **Benei Ahuvah on the Mishneh Torah** (בני אהובה). Jonathan Eybeschutz, written c. 1714-1764. Ashkenazi and Sephardi practice. `benei-ahuvah-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 94.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.1% of its words appear nowhere else in Sefaria.
- **Benei Binyamin on the Mishneh Torah** (בני בנימין). Eliyahu David Rabinowitz-Teomim, written c. 1845-1905. Ashkenazi and Sephardi practice. `benei-binyamin-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 67.3% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.65% of its words appear nowhere else in Sefaria.
- **Binah LeIttim on the Mishneh Torah** (בינה לעתים). Jonathan Eybeschutz, written c. 1714-1764. Ashkenazi and Sephardi practice. `binah-leittim-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 88.9% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.1% of its words appear nowhere else in Sefaria.
- **Chemdat Yisrael on the Mishneh Torah** (חמדת ישראל). Meir Dan Plotsky, written c. 1890-1930. Ashkenazi and Sephardi practice. `chemdat-yisrael-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and its comments are numbered essays, not keyed to the Rambam's opening words, so the check against the Mishneh Torah does not apply; 0.31% of its words appear nowhere else in Sefaria (Torat Emet and Warsaw 1881 texts: about 0.1%).
- **Cheshek Shlomo on the Mishneh Torah** (חשק שלמה). Shlomo HaKohen, written c. 1850-1900, Vilna. Ashkenazi and Sephardi practice. `cheshek-shlomo-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and it is too short to check reliably against the Mishneh Torah (13 comments quote opening words, 69.2% of them found in the same halakhah); 0.07% of its words appear nowhere else in Sefaria.
- **Chiddushei Rabbi Akiva Eiger on the Mishneh Torah** (חידושי רבי עקיבא איגר). Akiva Eiger, written c. 1785-1835. Ashkenazi and Sephardi practice. `chiddushei-rabbi-akiva-eiger-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and it is too short to check reliably against the Mishneh Torah (28 comments quote opening words, 60.7% of them found in the same halakhah); 0.12% of its words appear nowhere else in Sefaria.
- **Chidushei Mayim Chayim on the Mishneh Torah** (חידושי מים חיים). Hezekiah da Silva, written c. 1676-1696, Jerusalem. Ashkenazi and Sephardi practice. `chidushei-mayim-chayim-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 83.6% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and every one of its words also appears elsewhere in Sefaria.
- **Chidushim of Machaneh Ephraim on the Mishneh Torah** (חידושים מהגאון בעל מחנה אפרים). Ephraim Navon, written c. 1705-1735. Ashkenazi and Sephardi practice. `chidushim-of-machaneh-ephraim-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 75.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.14% of its words appear nowhere else in Sefaria.
- **Divrei Shaul Edut BeYosef on the Mishneh Torah** (דברי שאול - עדות ביוסף). Yosef Shaul Nathanson, written c. 1835-1875, Lemberg, Galicia. Ashkenazi and Sephardi practice. `divrei-shaul-edut-beyosef-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 76.3% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.07% of its words appear nowhere else in Sefaria.
- **Divrei Yirmiyahu on the Mishneh Torah** (דברי ירמיהו). Jeremiah Löw, written c. 1834-1874. Ashkenazi and Sephardi practice. `divrei-yirmiyahu-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 83.9% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.21% of its words appear nowhere else in Sefaria.
- **Har HaMoriyah on the Mishneh Torah** (הר המוריה). Meir Yonah Brancki, written c. 1840-1890. Ashkenazi and Sephardi practice. `har-hamoriyah-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 80.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.14% of its words appear nowhere else in Sefaria.
- **The Ra'avad's glosses (hasagot) on the Mishneh Torah** (השגות הראב"ד). Ra'avad, written c. 1175-1195, Provence, France. Ashkenazi and Sephardi practice. `hasagot-haraavad-on-mishneh-torah`
  - Reads: Hebrew text. The Torat Emet text. Some titles carry no license on Sefaria; Torat Emet's written permission (canon/permissions.yaml) covers them.
  - Reads: English, from Rabbi Simon Glazer's Mishneh Torah. The Ra'avad's glosses on the Book of Knowledge, as Rabbi Simon Glazer translated them with his Mishneh Torah. Rabbi Glazer (1876-1938) served Orthodox congregations in the United States and Canada and helped found the Agudath HaRabbanim (to confirm).
- **Kessef Mishneh on the Mishneh Torah** (כסף משנה). Joseph Karo, written c. 1545-1575, Nikopol. Ashkenazi and Sephardi practice. `kessef-mishneh-on-mishneh-torah`
  - Reads: Hebrew text. The Torat Emet text. Some titles carry no license on Sefaria; Torat Emet's written permission (canon/permissions.yaml) covers them.
- **Kiryat Sefer on the Mishneh Torah** (קרית ספר). Moshe ben Yosef di Trani, written c. 1539-1551, Safed. Ashkenazi and Sephardi practice. `kiryat-sefer-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and its comments are arranged by the count of mitzvot, not by the Rambam's opening words, so the check against the Mishneh Torah does not apply; 0.15% of its words appear nowhere else in Sefaria (Torat Emet and Warsaw 1881 texts: about 0.1%).
- **Kovetz Al Yad HaChazakah on the Mishneh Torah** (קובץ על היד החזקה). Menahem Nahum Trebitsch, written c. 1825-1835. Ashkenazi and Sephardi practice. `kovetz-al-yad-hachazakah-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 78.3% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.11% of its words appear nowhere else in Sefaria.
- **Lechem Mishneh on the Mishneh Torah** (לחם משנה). Abraham de Boton, written c. 1568-1588, Salonica / Thessaloniki. Ashkenazi and Sephardi practice. `lechem-mishneh-on-mishneh-torah`
  - Reads: Hebrew text. The Torat Emet text. Some titles carry no license on Sefaria; Torat Emet's written permission (canon/permissions.yaml) covers them.
- **Lechem Shamayim on the Mishneh Torah** (לחם שמים). Yaakov Emden, written c. 1727-1773. Ashkenazi and Sephardi practice. `lechem-shamayim-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 97.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.33% of its words appear nowhere else in Sefaria.
- **Lev Shalem on the Mishneh Torah** (לב שלם). Shlomo Shalem, written c. 1757-1773, Amsterdam. Ashkenazi and Sephardi practice. `lev-shalem-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 96.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.09% of its words appear nowhere else in Sefaria.
- **Ma'asai LaMelekh on the Mishneh Torah** (מעשי למלך). Yeshaya Zilberstein, written c. 1897-1913, Waitzen. Ashkenazi and Sephardi practice. `maasai-lamelekh-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 71.6% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.55% of its words appear nowhere else in Sefaria.
- **Maaseh Rokeach on the Mishneh Torah** (מעשה רקח). Mas'ud Hai Rakkach, written c. 1718-1742, Tripoli, Libya. Ashkenazi and Sephardi practice. `maaseh-rokeach-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 84.7% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.18% of its words appear nowhere else in Sefaria. 23 stray typesetting codes (@04, @50) are left in the text.
- **Maggid Mishneh on the Mishneh Torah** (מגיד משנה). Vidal of Tolosa, written c. 1310-1360, Girona, Catalonia, Spain. Ashkenazi and Sephardi practice. `maggid-mishneh-on-mishneh-torah`
  - Reads: Hebrew text. The Torat Emet text. Some titles carry no license on Sefaria; Torat Emet's written permission (canon/permissions.yaml) covers them.
- **Maharam of Padua on the Mishneh Torah** (הגהות מהר"ם פדווא). Maharam of Padua, written c. 1530-1550, Padua. Ashkenazi and Sephardi practice. `maharam-of-padua-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 76.5% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.08% of its words appear nowhere else in Sefaria.
- **Mekorei HaRambam LeRashash on the Mishneh Torah** (מקורי הרמב"ם לרש"ש). Shmuel Strashun, written c. 1832-1852, Vilna. Ashkenazi and Sephardi practice. `mekorei-harambam-lerashash-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 82.5% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.19% of its words appear nowhere else in Sefaria.
- **Melekhet Shelomoh on the Mishneh Torah** (מלאכת שלמה). Shlomo Chakim, written c. 1775-1835, Izmir / Smyrna. Ashkenazi and Sephardi practice. `melekhet-shelomoh-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 89.7% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.11% of its words appear nowhere else in Sefaria. It has some editor's corrections in square brackets beside the printed word in round brackets (about 7 per 10,000 words). Sefaria lists 1 of its 54 titles with an unknown license; those are left out.
- **Mishneh LaMelech on the Mishneh Torah** (משנה למלך). Judah Rosanes, written c. 1675-1715, Constantinople. Ashkenazi and Sephardi practice. `mishneh-lamelech-on-mishneh-torah`
  - Reads: Hebrew text. The Warsaw 1881 printing.
- **Nachal Eitan on the Mishneh Torah** (נחל איתן). Avraham Maskil LeEitan, written c. 1808-1848, Minsk. Ashkenazi and Sephardi practice. `nachal-eitan-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 88.6% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.09% of its words appear nowhere else in Sefaria.
- **Ohr Sameach on the Mishneh Torah** (אור שמח). Meir Simha HaKohen Dvinsk, written c. 1883-1901, Daugavpils / Dvinsk. Ashkenazi and Sephardi practice. `ohr-sameach-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 86.8% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.2% of its words appear nowhere else in Sefaria.
- **Peri Chadash on the Mishneh Torah** (פרי חדש). Hezekiah da Silva, written c. 1687-1697. Ashkenazi and Sephardi practice. `peri-chadash-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 83.3% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and every one of its words also appears elsewhere in Sefaria.
- **Rishon LeTzion (the Or HaChaim) on the Mishneh Torah** (ראשון לציון). Chaim Ibn Attar (Ohr HaChaim), written c. 1718-1742, Salé, Morocco; Livorno. Ashkenazi and Sephardi practice. `rishon-letzion-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and it is too short to check reliably against the Mishneh Torah (3 comments quote opening words, 66.7% of them found in the same halakhah); 0.18% of its words appear nowhere else in Sefaria. It has several editor's corrections in square brackets beside the printed word in round brackets.
- **Seder Mishnah on the Mishneh Torah** (סדר משנה). Benjamin Zev Wolf Boskowitz, written c. 1782-1818. Ashkenazi and Sephardi practice. `seder-mishnah-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 76.1% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.22% of its words appear nowhere else in Sefaria.
- **Sha'ar HaMelekh on the Mishneh Torah** (שער המלך). Isaac Nunis-Bilmonte, written c. 1730-1770, Izmir / Smyrna. Ashkenazi and Sephardi practice. `shaar-hamelekh-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 81.3% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.15% of its words appear nowhere else in Sefaria.
- **Shorshei HaYam on the Mishneh Torah** (שורשי הים). Yitzchak Mayo, written c. 1775-1805, Izmir / Smyrna. Ashkenazi and Sephardi practice. `shorshei-hayam-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and its comments are arranged by topic ("shoresh"), not by the Rambam's opening words, so the check against the Mishneh Torah does not apply; 0.21% of its words appear nowhere else in Sefaria (Torat Emet and Warsaw 1881 texts: about 0.1%).
- **Teshuvah MeYirah on the Mishneh Torah** (קונטרס תשובה מיראה). Eliyahu David Rabinowitz-Teomim, written c. 1855-1905. Ashkenazi and Sephardi practice. `teshuvah-meyirah-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 85.6% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.2% of its words appear nowhere else in Sefaria.
- **Tzafnat Pa'neach (the Rogatchover Gaon) on the Mishneh Torah** (צפנת פענח). Joseph Rosen, written c. 1886-1906, Daugavpils / Dvinsk. Ashkenazi and Sephardi practice. `tzafnat-paneach-on-mishneh-torah`
  - Reads: Hebrew text. The Warsaw-Piotrkow printing of 1903-1908.
- **Tziunei Maharan on the Mishneh Torah** (ציוני מהר"ן). Nachum Asch, written c. 1875-1881, Ozorków. Ashkenazi and Sephardi practice. `tziunei-maharan-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 90.7% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.07% of its words appear nowhere else in Sefaria.
- **Yad David on the Mishneh Torah** (יד דוד). Ashkenazi and Sephardi practice. `yad-david-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, and it is too short to check reliably against the Mishneh Torah (25 comments quote opening words, 80.0% of them found in the same halakhah); 0.17% of its words appear nowhere else in Sefaria. It has several editor's corrections in square brackets beside the printed word in round brackets.
- **Yad Eitan on the Mishneh Torah** (יד איתן). Avraham Maskil LeEitan, written c. 1808-1848. Ashkenazi and Sephardi practice. `yad-eitan-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 85.2% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.05% of its words appear nowhere else in Sefaria. Sefaria lists 1 of its 71 titles with an unknown license; those are left out.
- **Yekar Tiferet on the Mishneh Torah** (יקר תפארת). David ben Solomon ibn (Abi) Zimra, written c. 1507-1573. Ashkenazi and Sephardi practice. `yekar-tiferet-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 84.2% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.09% of its words appear nowhere else in Sefaria. Its text has many bracketed words that an editor restored (about 10 bracketed corrections per 10,000 words). Sefaria lists 1 of its 2 titles with an unknown license; those are left out.
- **Yekhahen Pe'er on the Mishneh Torah** (יכהן פאר). Chanokh Tzvi HaKohen Levin, written c. 1895-1935, Poland. Ashkenazi and Sephardi practice. `yekhahen-peer-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 86.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.07% of its words appear nowhere else in Sefaria.
- **Yitzchak Yeranen on the Mishneh Torah** (יצחק ירנן). Elyakim ben Isaac Gaṭigno, written c. 1740-1780, Izmir / Smyrna. Ashkenazi and Sephardi practice. `yitzchak-yeranen-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 87.4% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.17% of its words appear nowhere else in Sefaria. It has some editor's corrections in square brackets beside the printed word in round brackets (about 6 per 10,000 words).
- **Shev Shmateta** (שב שמעתתא). Aryeh Leib Heller, written c. 1765-1805. Ashkenazi and Sephardi practice. `shev-shmateta`
  - Reads: Hebrew text
  - Reads: Shev Shmateta, translated by Rabbi Francis Nataf
- **Netiv Chesed on Ahavat Chesed** (נתיב חסד). Israel Meir Kagan (Chafetz Chaim), written c. 1855-1875, Radun. Ashkenazi and Sephardi practice · Litvish. `netiv-chesed-on-ahavat-chesed`
  - Reads: Hebrew text
- **Be'er Mayim Chaim (the Chafetz Chaim's own notes on Chafetz Chaim)** (באר מים חיים). Israel Meir Kagan (Chafetz Chaim), written c. 1857-1873, Radun. Ashkenazi and Sephardi practice · Litvish. `beer-mayim-chaim-on-chafetz-chaim`
  - Reads: Hebrew text
- **Lishkat HaSofer (on Keset HaSofer)** (לשכת הסופר). Shlomo Ganzfried, written c. 1855-1865, Ungvar. Ashkenazi practice. `lishkat-hasofer`
  - Reads: Hebrew text
- **Megillat Esther on Sefer HaMitzvot** (מגילת אסתר). Isaac Leon ibn Tzur, written c. 1495-1545, Ancona, Italy. Ashkenazi and Sephardi practice. `megillat-esther-on-sefer-hamitzvot`
  - Reads: Hebrew text
- **Marganita Tava on Sefer HaMitzvot** (מרגניתא טבא). Aryeh Leib Zitel Segal Horowitz, written c. 1830-1844, Minsk. Ashkenazi and Sephardi practice. `marganita-tava-on-sefer-hamitzvot`
  - Reads: Hebrew text
- **Kinaat Sofrim on Sefer HaMitzvot** (קנאת סופרים). Chananya Kazis, written c. 1650-1700. Ashkenazi and Sephardi practice. `kinaat-sofrim-on-sefer-hamitzvot`
  - Reads: Hebrew text
- **Lev Sameach (on Sefer HaMitzvot)** (לב שמח). Abraham Allegri, written c. 1645-1655. Ashkenazi and Sephardi practice. `lev-sameach-on-sefer-hamitzvot`
  - Reads: Hebrew text
- **Rabbi Yerucham Fishel Perla's commentary on Rav Saadia Gaon's Sefer HaMitzvot** (ביאור על ספר המצוות לרס"ג). Yerucham Fishel Perla, written c. 1915. Ashkenazi and Sephardi practice. `perla-on-sefer-hamitzvot-of-rasag`
  - Reads: Hebrew text
- **Brit Moshe (on the Semag)** (ברית משה). Moshe Aaron Weisz, written c. 1905, Kisvárda. Ashkenazi and Sephardi practice. `brit-moshe`
  - Reads: Hebrew text
- **Haggahot Chadashot on the Semak** (הגהות חדשות על ספר מצוות קטן). Yehoshua Tzeitlin, written c. 1765-1805. Ashkenazi practice. `haggahot-chadashot-on-semak`
  - Reads: Hebrew text
- **Toafot Re'em (on Sefer Yereim)** (תועפות ראם). Abraham Abba Schiff, written c. 1891, Minsk. Ashkenazi and Sephardi practice. `toafot-reem`
  - Reads: Hebrew text
- **Minchat Chinukh** (מנחת חינוך). Joseph Babad, written c. 1859-1869. Ashkenazi and Sephardi practice · Litvish. `minchat-chinukh`
  - Reads: Hebrew text
- **Haamek Sheilah (the Netziv on the Sheiltot)** (העמק שאלה). Naphtali Tzvi Yehudah Berlin (Netziv), written c. 1840-1860. Ashkenazi and Sephardi practice · Litvish. `haamek-sheilah`
  - Reads: Hebrew text
- **Sheilat Shalom (on the Sheiltot)** (שאילת שלום). Isaiah Berlin, written c. 1764-1786. Ashkenazi and Sephardi practice. `sheilat-shalom-on-sheiltot`
  - Reads: Hebrew text
- **Brit Olam (the Chida on Sefer Chasidim)** (ברית עולם). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Ashkenazi and Sephardi practice. `brit-olam-on-sefer-chasidim`
  - Reads: Hebrew text
- **Perush Kadmon on Sefer Chasidim** (פירוש קדמון). David Greenhut, written c. 1660-1700. Ashkenazi practice. `perush-kadmon-on-sefer-chasidim`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Even Ha'azel on the Mishneh Torah** (אבן האזל). Isser Zalman Meltzer, written c. 1935-1955, Jerusalem. Ashkenazi and Sephardi practice · Litvish. `even-haazel-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 84.6% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.14% of its words appear nowhere else in Sefaria. About 13% of its paragraphs are repeated under neighbouring halakhot (a comment on several halakhot is attached to each), and the author's addenda are inserted in place under labels such as "השמטות ומלואים".
- **Haggahot Kevod Melakhim on the Mishneh Torah** (הגהות כבוד מלכים). Zev Wolf Leiter, written c. 1934-1946, Pittsburgh, PA. Ashkenazi and Sephardi practice. `haggahot-kevod-melakhim-on-mishneh-torah`
  - Reads: Hebrew text. Friedberg Edition (Friedberg Jewish Manuscript Society): Sefaria names no printing for it and has no second copy to compare word by word, so it was checked against the Mishneh Torah: 75.0% of its comments open with words found in the same halakhah (Torat Emet and Warsaw 1881 texts: 67-92%), and 0.39% of its words appear nowhere else in Sefaria.

#### Responsa (teshuvot)

*Geonim (about 600-1040)*

- **Responsa of the Geonim (Teshuvot HaGeonim; Sha'arei Teshuvah; Toratan shel Rishonim)** (תשובות הגאונים). The Geonim, Babylonia. Ashkenazi and Sephardi practice. `teshuvot-hageonim`
  - Reads: Hebrew text
  - Note: Three printed collections. Abraham Harkavy's 1887 edition from Genizah manuscripts, which Sefaria also hosts, is left out for the board (library question 9).

*Rishonim (about 1040-1550)*

- **Responsa of the Maharach Or Zarua** (תשובות מהר"ח אור זרוע). Maharach Ohr Zarua, written c. 1260-1300. Ashkenazi practice. `maharach-or-zarua-responsa`
  - Reads: Hebrew text
- **Sefer HaTashbetz (responsa of the Rashbatz)** (ספר התשב"ץ). Shimon ben Tzemach Duran, written c. 1384-1444, Algiers. Ashkenazi and Sephardi practice · Sephardi. `sefer-hatashbetz`
  - Reads: Hebrew text
- **Terumat HaDeshen** (תרומת הדשן). Israel Isserlin, written c. 1440-1460, Wiener Neustadt. Ashkenazi practice. `terumat-hadeshen`
  - Reads: Hebrew text
- **Responsa of the Ran** (שו"ת הר"ן). Nissim of Gerona (Ran). Ashkenazi and Sephardi practice. `teshuvot-haran`
  - Reads: Hebrew text
- **Responsa of the Rashbash** (תשובות הרשב"ש). Shlomo ben Shimon Duran, written c. 1435-1465. Ashkenazi and Sephardi practice · Sephardi. `teshuvot-harashbash`
  - Reads: Hebrew text
- **Responsa of the Ri Migash** (תשובות הר"י מיגאש). Joseph Ibn Migash (Ri Migash), written c. 1100-1140. Ashkenazi and Sephardi practice. `teshuvot-hari-migash`
  - Reads: Hebrew text
- **Responsa of the Rivash** (תשובות הריב"ש). Isaac ben Sheshet Perfet, written c. 1350-1400. Ashkenazi and Sephardi practice. `teshuvot-harivash`
  - Reads: Hebrew text
- **Responsa of the Rosh** (תשובות הרא"ש). Rabbenu Asher ben Yechiel (Rosh), written c. 1275-1325. Ashkenazi and Sephardi practice. `teshuvot-harosh`
  - Reads: Hebrew text
- **Responsa of the Maharam of Rothenburg** (תשובות מהר"ם). Meir ben Barukh (Maharam) of Rothenburg, written c. 1240-1290. Ashkenazi practice. `teshuvot-maharam`
  - Reads: Hebrew text
- **Responsa of the Maharik** (שו"ת מהרי"ק). Joseph Colon (Maharik), written c. 1440-1480. Ashkenazi and Sephardi practice. `teshuvot-maharik`
  - Reads: Hebrew text
- **Responsa of the Maharil** (שו"ת מהרי"ל). Yaakov Levi Moelin, written c. 1385-1425. Ashkenazi practice. `teshuvot-maharil`
  - Reads: Hebrew text
- **Teshuvot Min HaShamayim** (שאלות ותשובות מן השמים). Jacob of Marvege, written c. 1270-1330, Marvejols, France. Ashkenazi and Sephardi practice. `teshuvot-min-hashamayim`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Debated (library question 6): answers that the Tosafist Rabbi Yaakov of Marvege recorded receiving in dreams. The board decides how RabAI presents them.
- **The Rambam's responsa and letters** (תשובות ואגרות הרמב״ם). Moses ben Maimon (Rambam), Egypt. Ashkenazi and Sephardi practice. `teshuvot-vigrot-harambam`
  - Reads: Hebrew text
- **Responsa of the Rashba** (שו״ת הרשב״א). Shlomo ibn Adret (Rashba), Barcelona. Ashkenazi and Sephardi practice. `teshuvot-harashba`
  - Reads: Hebrew text
- **Chazeh HaTenufa** (חזה התנופה). Moshe of Brussels, written c. 1310-1370. Ashkenazi and Sephardi practice. `chazeh-hatenufa`
  - Reads: Hebrew text
- **Iggeret HaShabbat (Ibn Ezra's Sabbath Epistle)** (אגרת השבת). Rabbi Avraham ibn Ezra, written 1158-1159, London. Ashkenazi and Sephardi practice. `iggeret-hashabbat`
  - Reads: Hebrew text (Ktav, 2009)
  - Waiting for your decision: English (Ktav, 2009) (Part 2).
  - Note: Ibn Ezra's defense of the tradition that the day, and Shabbat, begins in the evening, against a commentary that read the Torah otherwise.

*Acharonim (about 1550-1900)*

- **Responsa of the Chasam Sofer** (שו״ת חתם סופר). Rabbi Moshe Sofer, 1762-1839. Ashkenazi practice. `shut-chasam-sofer`
  - Reads: Hebrew text
- **Admat Kodesh** (אדמת קודש). Nissim Chaim Moshe Mizrachi. Ashkenazi and Sephardi practice · Sephardi. `admat-kodesh`
  - Reads: Hebrew text
- **Avkat Rokhel (responsa of Rabbi Yosef Karo)** (אבקת רוכל). Joseph Karo. Ashkenazi and Sephardi practice · Sephardi. `avkat-rokhel`
  - Reads: Hebrew text
- **Be'er Sheva (responsa)** (באר שבע). Yissachar Eilenburg. Ashkenazi practice. `beer-sheva-responsa`
  - Reads: Hebrew text
- **Be'er Yitzchak** (באר יצחק). Rabbi Yitzchak Elchanan Spektor. Ashkenazi practice · Litvish. `beer-yitzchak`
  - Reads: Hebrew text
- **Binyan Olam** (בנין עולם). Yitzchak Isaac Chaver. Ashkenazi practice. `binyan-olam`
  - Reads: Hebrew text
- **Binyan Tziyon** (בנין ציון). Yaakov Ettlinger, written c. 1832-1868, Altona. Ashkenazi practice. `binyan-tziyon`
  - Reads: Hebrew text
- **Chakham Tzvi** (חכם צבי). Zvi Ashkenazi, written c. 1688-1712, Amsterdam. Ashkenazi practice. `chakham-tzvi`
  - Reads: Hebrew text
- **Responsa of the Chiddushei HaRim** (שו"ת חידושי הרי"מ). Yitzchak Meir Rotenberg-Alter. Ashkenazi practice · Chassidish. `chiddushei-harim-responsa`
  - Reads: Hebrew text
- **Divrei Rivot** (דברי ריבות). Yitzchak Adarbi. Ashkenazi and Sephardi practice · Sephardi. `divrei-rivot`
  - Reads: Hebrew text
- **HaElef Lekha Shlomo** (האלף לך שלמה). Shlomo Kluger, written c. 1825-1875. Ashkenazi practice. `haelef-lekha-shlomo`
  - Reads: Hebrew text. The Biłgoraj 1933 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Halakhot Ketanot** (הלכות קטנות). Jacob Chagiz. Ashkenazi and Sephardi practice. `halakhot-ketanot`
  - Reads: Hebrew text
- **Chavot Yair** (חוות יאיר). Yair Chaim Bacharach, written c. 1678-1698. Ashkenazi practice. `havot-yair`
  - Reads: Hebrew text
- **Kerakh shel Romi** (כרך של רומי). Rome. Ashkenazi and Sephardi practice. `kerakh-shel-romi`
  - Reads: Hebrew text
  - Note: Sefaria names no single author. As far as we know these are the responsa of Rabbi Yisrael Moshe Chazan, rabbi of Rome in the mid-1800s, printed after his death (to confirm).
- **Mateh Levi** (מטה לוי). Marcus Horowitz, written c. 1879-1891. Ashkenazi practice · Torah im Derech Eretz. `mateh-levi`
  - Reads: Hebrew text
- **Melammed Lehoil** (מלמד להועיל). David Zvi Hoffmann, Berlin. Ashkenazi practice · Torah im Derech Eretz. `melammed-lehoil`
  - Reads: Hebrew text. The Frankfurt 1926-1932 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Noda BiYehudah** (נודע ביהודה). Yechezkel Landau (Noda BiYehudah), written c. 1733-1793, Prague. Ashkenazi practice. `noda-biyehudah`
  - Reads: Hebrew text
- **Responsa of the Maharam of Padua** (שו"ת מהר"ם פדוואה). Maharam of Padua. Ashkenazi and Sephardi practice. `responsa-maharam-of-padua`
  - Reads: Hebrew text
- **Responsa of the Maharashdam** (שו"ת מהרשד"ם). Samuel de Medina, written c. 1530-1590. Ashkenazi and Sephardi practice · Sephardi. `responsa-maharashdam`
  - Reads: Hebrew text
- **Rav Pe'alim (responsa of the Ben Ish Chai)** (שו"ת רב פעלים). Yosef Hayyim, written c. 1860-1900, Baghdad, Iraq. Sephardi practice · Sephardi. `responsa-rav-pealim`
  - Reads: Hebrew text
- **Responsa of the Rema** (שאלות ותשובות רמ"א). Moses Isserles (Rema), written c. 1540-1570, Krakow, Poland. Ashkenazi practice. `responsa-of-rema`
  - Reads: Hebrew text
- **Sha'agat Aryeh HaChadashot** (שאגת אריה החדשות). Aryeh Leib Gunzburg. Ashkenazi practice. `shaagat-aryeh-hachadashot`
  - Reads: Hebrew text
- **She'ilat Yaavetz** (שאילת יעבץ). Yaakov Emden, written c. 1728-1748, Altona. Ashkenazi practice. `sheilat-yaavetz`
  - Reads: Hebrew text
- **Teshuvah MeAhavah (part I)** (תשובה מאהבה חלק א). Elazar Fleckeles, written c. 1775-1825. Ashkenazi practice. `teshuva-meahava`
  - Reads: Hebrew text
- **Responsa of the Bach** (תשובות בית חדש). Yoel ben Shmuel Sirkes, written c. 1600-1640, Poland. Ashkenazi practice. `teshuvot-bayit-chadash`
  - Reads: Hebrew text. One version is a 1959 Jerusalem printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Responsa of the Maharit** (שו"ת מהרי"ט). Yosef Trani, written c. 1570-1630. Ashkenazi and Sephardi practice · Sephardi. `teshuvot-maharit`
  - Reads: Hebrew text
- **Responsa of the Maharshal** (תשובות מהרש"ל). Maharshal, written c. 1543-1573. Ashkenazi practice. `teshuvot-maharshal`
  - Reads: Hebrew text
- **Responsa of the Maharsham** (שו״ת מהרש״ם). Shalom Mordechai Schwadron (Maharsham). Ashkenazi practice. `teshuvot-maharsham`
  - Reads: Hebrew text
- **Meshiv Davar (responsa of the Netziv)** (תשובות משיב דבר). Naphtali Tzvi Yehudah Berlin (Netziv). Ashkenazi practice · Litvish. `teshuvot-meshiv-davar`
  - Reads: Hebrew text
- **Responsa of Rabbi Akiva Eiger** (שו״ת רבי עקיבא איגר). Akiva Eiger. Ashkenazi practice. `teshuvot-rabbi-akiva-eiger`
  - Reads: Hebrew text. The HaChadashot volume is a Budapest 1938 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Torat Netanel** (תורת נתנאל). Nathaniel Weil, written c. 1719-1769. Ashkenazi practice. `torat-netanel`
  - Reads: Hebrew text. A Modiin Illit 2009 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Responsa of the Radbaz** (שו״ת הרדב״ז). David ben Solomon ibn (Abi) Zimra, Egypt and Eretz Yisrael. Ashkenazi and Sephardi practice · Sephardi. `teshuvot-haradbaz`
  - Reads: Hebrew text
- **Shoel uMeshiv** (שואל ומשיב). Yosef Shaul Nathanson, Lemberg. Ashkenazi practice. `shoel-umeshiv`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Rav Moshe Feinstein's responsa on care of the critically ill (Hebrew, from Rabbi Moshe Tendler's selection)** (תשובות רפואיות). Rabbi Moshe Feinstein, New York. Ashkenazi practice · Litvish. `igrot-moshe-care-of-the-critically-ill`
  - Reads: Hebrew text. The Hebrew of the responsa as printed in Rabbi Moshe David Tendler's bilingual selection.
  - Reads: Care of the Critically Ill, translated by Rabbi Moshe David Tendler. Rabbi Moshe David Tendler was a rosh yeshiva at Yeshiva University's rabbinical school (RIETS) and Rav Moshe Feinstein's son-in-law.
  - Note: A small selection from Igrot Moshe; the full work is the igrot-moshe entry above.
- **Mishpetei Uziel** (משפטי עוזיאל). Ben-Zion Meir Hai Uziel, written c. 1900-1950, Jerusalem. Sephardi practice · Sephardi · Religious Zionist. `mishpetei-uziel`
  - Reads: Hebrew text
- **Rabbi Yitzchak Nissim's Yein HaTov and LaKelal VeLaPerat** (יין הטוב; לכלל ולפרט). Rabbi Yitzchak Nissim, Jerusalem. Sephardi practice · Sephardi. `rav-yitzchak-nissim-responsa`
  - Reads: Hebrew text
- **B'Mareh HaBazak (Eretz Hemdah)** (שו״ת במראה הבזק). Eretz Hemdah Institute, Jerusalem. Ashkenazi and Sephardi practice · Religious Zionist. `bmareh-habazak`
  - Reads: Hebrew text. A modern work under an open license (library question 15). Two volumes carry no license on Sefaria and are not included.
- **Nishmat HaBayit (responsa on family purity and women's health)** (נשמת הבית). The Yoatzot Halacha of Nishmat, published 2017, Jerusalem. Ashkenazi and Sephardi practice · Modern Orthodox. `nishmat-habayit`
  - Reads: Hebrew text (Maggid, 2017)
  - Note: Answers written by Nishmat's halachic advisers, reviewed by rabbis who supervise the program (to confirm who). Some poskim do not accept women serving as halachic advisers; the board may want to note that.
- **Rabbi Yehuda Herzl Henkin's Responsa Benei Banim and Chibbah Yeteirah on the Torah** (שו״ת בני בנים; חבה יתרה). Rabbi Yehuda Herzl Henkin, published 1981-2005, Jerusalem. Ashkenazi practice · Modern Orthodox · Religious Zionist. `rabbi-yehuda-herzl-henkin`
  - Reads: Hebrew text
  - Reads: Responsa on Contemporary Jewish Women's Issues (the author's own English, Ktav, 2003)
  - Note: Rabbi Henkin, a grandson of Rabbi Yosef Eliyahu Henkin, was a posek in Jerusalem. Some of his rulings on women's questions were disputed by other poskim (which, to confirm). Chibbah Yeteirah, his comments on the Torah, is printed with Benei Banim.
- **Badei HaAron on Shevi'it (Rabbi Re'em HaCohen's responsa on the shemittah year)** (בדי הארון, שביעית). Rabbi Re'em HaCohen, published 2015, Otniel, Eretz Yisrael. Ashkenazi and Sephardi practice · Religious Zionist. `badei-haaron-sheviit`
  - Reads: Hebrew text. Rabbi Re'em HaCohen is rosh yeshiva of Yeshivat Otniel (to confirm).

#### Practical halacha

*Acharonim (about 1550-1900)*

- **Kitzur Shulchan Aruch** (קיצור שולחן ערוך). Rabbi Shlomo Ganzfried, 1804-1886. Ashkenazi practice. `kitzur-shulchan-aruch`
  - Reads: Hebrew text
  - Reads: Kitzur Shulchan Aruch, translated by Rabbi Avrohom Davis
  - Waiting for your decision: Code of Jewish Law, translated by Hyman E. Goldin (1927) (Part 2).
- **Ben Ish Chai** (בן איש חי). Rabbi Yosef Chaim of Baghdad, 1835-1909, Baghdad. Sephardi practice · Sephardi. `ben-ish-chai`
  - Reads: Hebrew text
- **Chayei Adam and Chochmat Adam (with Nishmat Adam and Binat Adam)** (חיי אדם; חכמת אדם). Rabbi Avraham Danzig, 1748-1820. Ashkenazi practice. `chayei-adam`
  - Reads: Hebrew text
- **Keset HaSofer** (קסת הסופר). Shlomo Ganzfried, written c. 1835, Brezovica, Slovenia. Ashkenazi practice. `keset-hasofer`
  - Reads: Hebrew text
- **Seder HaYom** (סדר היום). Moshe ben Machir, Ein Zaytun. Ashkenazi and Sephardi practice. `seder-hayom`
  - Reads: Hebrew text
- **Ta'amei HaMinhagim** (טעמי המנהגים). Avraham Yitzchak Sperling. Ashkenazi practice. `taamei-haminhagim`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Peninei Halakha** (פניני הלכה). Rabbi Eliezer Melamed. Ashkenazi and Sephardi practice · Religious Zionist. `peninei-halakha`
  - Reads: Peninei Halakha, English edition
  - Reads: Peninei Halakha, Hebrew
  - Note: Presents Ashkenazi and Sephardi practice side by side.
- **Gray Matter (Rabbi Chaim Jachter on contemporary halachic questions)**. Rabbi Chaim Jachter, published 2000-2012, Teaneck, New Jersey. Ashkenazi practice · Modern Orthodox. `gray-matter`
  - Reads: English text. Essays that review the halachic literature on questions of the day. Volume IV has no license listed on Sefaria yet and stays out until it does. Practical questions still go to a person's own rav.
- **Sefer Puah (halacha and medicine: family life, family purity and fertility)** (ספר פוע״ה). Rabbi Gavriel Goldman and Rabbi Menachem Burstein (Machon Puah), published 2014-2024, Jerusalem. Ashkenazi and Sephardi practice. `sefer-puah`
  - Reads: Hebrew text
  - Note: From Machon Puah, which advises couples on fertility questions according to halacha (to confirm). On these questions RabAI always sends a person to their rav.

#### Other works

*Rishonim (about 1040-1550)*

- **Sefer Chasidim** (ספר חסידים). Yehuda HeChasid, written c. 1140-1200, Germany. Ashkenazi practice. `sefer-chasidim`
  - Reads: Hebrew text
- **Shulchan Shel Arba** (שלחן של ארבע). Bachya ben Asher, written c. 1290-1340, Saragossa. Ashkenazi and Sephardi practice. `shulchan-shel-arba`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Rabbinic Authority: The Vision and the Reality (Rabbi A. Yehuda Warburg)**. Rabbi A. Yehuda Warburg, published 2013. Ashkenazi and Sephardi practice · Modern Orthodox. `rabbinic-authority-warburg`
  - Reads: English text (Urim, 2013). On the scope of a rabbi's and a beit din's authority, by a dayan (to confirm). Only the first volume has a license listed on Sefaria; the others stay out until they do.
- **Rabbi Eliezer Berkovits on halacha and its renewal (HaHalakhah Kochah VeTafkidah, Tenai BeNissuin UVeGet, Jewish Women in Time and Torah, and on conversion)**. Rabbi Eliezer Berkovits, 1908-1992, Berlin, London, Sydney, Boston, Chicago and Jerusalem. Ashkenazi and Sephardi practice · Modern Orthodox. `rabbi-eliezer-berkovits-on-halacha`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text (Mossad Harav Kook)
  - Reads: English text
  - Note: Rabbi Berkovits studied under Rabbi Yechiel Yaakov Weinberg (the Seridei Esh) (to confirm). Debated: his halachic proposals were not accepted by most poskim of his time; the board decides whether to keep these in the library with this caution or leave them out. His books of philosophy are a separate entry (rabbi-eliezer-berkovits).

### Jewish thought, mussar and Chassidus

Hashkafah, the works of mussar, and the works of Chassidus.

#### Jewish thought (hashkafah)

*Geonim (about 600-1040)*

- **HaEmunot VeHaDeot (Rav Saadia Gaon)** (האמונות והדעות). Saadia Gaon, written c. 922-942, Baghdad, Iraq. `haemunot-vehadeot`
  - Reads: Hebrew text

*Rishonim (about 1040-1550)*

- **The Kuzari** (ספר הכוזרי). Rabbi Yehuda HaLevi, c. 1075-1141, Spain. core. `kuzari`
  - Reads: Hebrew (Ibn Tibbon translation from the Arabic; or Rabbi Yosef Kafih's translation). On Sefaria: Rabbi Yehudah ibn Tibbon's translation (Project Ben-Yehuda).
- **Moreh Nevuchim (Guide for the Perplexed)** (מורה נבוכים). Rabbi Moshe ben Maimon (Rambam), 1138-1204. `moreh-nevuchim`
  - Reads: Hebrew translation by Rabbi Shmuel ibn Tibbon
  - Waiting for your decision: The Guide for the Perplexed, translated by Michael Friedländer (1904) (Part 2).
  - Note: Central to hashkafah, and to questions such as the reasons for korbanot (3:32).
- **Sefer HaChinuch** (ספר החינוך). `sefer-hachinuch`
  - Reads: Hebrew text. On Sefaria, the Vilna 1923 printing (with the Minchat Chinuch) has only the author's introduction and opening letter. The 613 mitzvot come from Torat Emet's text, by Torat Emet's written permission (canon/permissions.yaml).
  - Reads: Sefer HaChinuch, translated by Rabbi Francis Nataf
  - Note: Lists all 613 mitzvot with their reasons. Useful for "why do we do this" questions.
- **Akeidat Yitzchak** (עקידת יצחק). Isaac Arama, written c. 1455-1495. `akeidat-yitzchak`
  - Reads: Hebrew text
  - Reads: Akeidat Yitzchak, translated by Rabbi Eliyahu Munk
- **Derashot HaRan** (דרשות הר"ן). Nissim of Gerona (Ran), written c. 1320-1370, Barcelona, Spain. `derashot-haran`
  - Reads: Derashot HaRan, translated by Rabbi Shraga Silverstein
- **Shemonah Perakim (the Rambam's Eight Chapters)** (שמונה פרקים). Moses ben Maimon (Rambam), written c. 1157-1165, Egypt. `eight-chapters`
  - Reads: Hebrew text
  - Note: Joseph Gorfinkle's 1912 edition (Hebrew and English), which Sefaria also hosts, is excluded: he studied at Hebrew Union College and led a Reform congregation. See excluded.yaml.
- **Minchat Kenaot** (מנחת קנאות). Abba Mari of Lunel, written c. 1304, Montpellier. `minchat-kenaot`
  - Reads: Hebrew text
- **Or Hashem (Rabbi Chasdai Crescas)** (אור ה'). Hasdai Crescas, written c. 1399-1409, Barcelona, Spain. `ohr-hashem`
  - Reads: Hebrew text
- **Milot HaHigayon (the Rambam's Treatise on Logic)** (מילות הגיון). Moses ben Maimon (Rambam), written c. 1151-1161. `treatise-on-logic`
  - Reads: Hebrew text
- **Yesod Mora VeSod HaTorah (Ibn Ezra)** (יסוד מורא וסוד תורה). Abraham ibn Ezra, written c. 1158. `yesod-mora`
  - Reads: Hebrew text. A transcription of the Jerusalem 1931 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Sha'ar HaGemul (the Ramban)** (שער הגמול - רמב''ן). Moses ben Nachman (Ramban), written c. 1250-1270. `shaar-hagemul`
  - Reads: Hebrew text
- **Milchamot HaShem (the Ralbag's Wars of the Lord)** (מלחמות השם לרלב״ג). Rabbi Levi ben Gershom (Ralbag), 1288-1344, Provence, France. `ralbag-milchamot-hashem`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text (Leipzig, 1866)
  - Note: Not Rabbi Yichya Qafih's Milchamot HaShem (milchamot-hashem-qafih). Debated like the Ralbag's commentary (ralbag-on-tanakh, library question 4). Among those who answered his views were Rabbi Chasdai Crescas and Don Yitzchak Abarbanel (to confirm).

*Acharonim (about 1550-1900)*

- **Works of the Maharal (Gur Aryeh, Netzach Yisrael, Derech Chaim, Tiferet Yisrael, Be'er HaGolah, Ohr Chadash, the Drashot)** (מהר״ל מפראג). Rabbi Yehuda Loew of Prague (Maharal), c. 1520-1609, Prague. core. `maharal`
  - Reads: Hebrew text
- **Nefesh HaChaim** (נפש החיים). Rabbi Chaim of Volozhin, 1749-1821, Lithuania. core · Litvish. `nefesh-hachaim`
  - Reads: Hebrew text
- **Works of Rav Samson Raphael Hirsch (The Nineteen Letters, Horeb, the Hirsch Chumash, Collected Writings)**. Rabbi Samson Raphael Hirsch, 1808-1888, Germany. core · Torah im Derech Eretz. `rav-hirsch`
  - Reads: The Hirsch Chumash, translated by Isaac Levy. Judaica Press, 1989. On Sefaria under CC-BY-NC.
  - Reads: The Nineteen Letters, translated by Rabbi Bernard Drachman (1899)
  - Reads: Iggerot Tzafun, Hebrew translation of the Nineteen Letters (Vilna 1890). A Hebrew translation of Rav Hirsch's German; Sefaria does not name the translator, so the board may want to confirm it.
- **Beit Elohim (the Mabit)** (בית אלהים). Moshe ben Yosef di Trani. `beit-elohim`
  - Reads: Hebrew text
- **Imrei Binah (the Ben Ish Chai)** (אמרי בינה). Yosef Hayyim, written c. 1860-1900, Baghdad, Iraq. Sephardi. `imrei-binah`
  - Reads: Hebrew text
- **Matteh Dan (the Kuzari HaSheni)** (מטה דן). David Nieto. Sephardi. `matteh-dan`
  - Reads: Hebrew text
- **Midrash HaIttamari** (מדרש האתמרי). Eliyahu HaKohen of Smyrna. `midrash-haittamari`
  - Reads: Hebrew text
- **Parashat Derakhim (the Mishneh LaMelech)** (פרשת דרכים). Judah Rosanes. `parashat-derakhim`
  - Reads: Hebrew text. A Jerusalem 2005 edition under an open license.
- **Torat HaOlah (the Rema)** (תורת העולה). Moses Isserles (Rema), written c. 1560-1570. `torat-haolah`
  - Reads: Hebrew text
- **The Ramchal's Ma'amar HaIkkarim, Sefer HaHiggayon and Sefer HaMelitzah** (מאמר העיקרים; ספר ההגיון; ספר המליצה). Moses Chaim Luzzatto (Ramchal). `ramchal-shorter-works`
  - Reads: Hebrew text. Sefer HaHiggayon and Sefer HaMelitzah come from Jerusalem printings of 1948 and 1949 (from Project Ben-Yehuda). Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Kol HaTor** (קול התור). Attributed to Rabbi Hillel Rivlin of Shklov, recording the Vilna Gaon's teaching, first published in the 20th century. `kol-hator`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text (Hebrew Wikisource)
  - Note: Library question 8 (works whose author is uncertain). Among those who questioned its authenticity is the historian Immanuel Etkes (to confirm). The English on Sefaria names no translator and is left out.
- **Nishmat Chayim (Rabbi Menashe ben Yisrael on the soul)** (נשמת חיים). Rabbi Menashe ben Yisrael, 1604-1657, Amsterdam. `nishmat-chayyim`
  - Reads: Hebrew text (Warsaw, 1876)
  - Note: On the soul and its survival after death, from the sources of the Sages and the kabbalists.

*20th and 21st centuries*

- **Works of Rav Kook (Orot, Orot HaTeshuvah, Olat Re'iyah, Igrot HaRe'iyah)** (הרב קוק). Rabbi Avraham Yitzchak HaKohen Kook, 1865-1935, Eretz Yisrael. core · Religious Zionist. `rav-kook`
  - Reads: Hebrew text
  - Reads: Olat Re'iyah, translated by Rabbi Mike Feuer. Rabbi Mike Feuer received semicha from Yeshivat Sulam Yaakov and teaches Chassidut, Rav Kook and halacha in Jerusalem (to confirm). Sefaria's Hebrew of Olat Re'iyah has no license listed, so only this English is in the testing library for it.
  - Note: Ben Zion Bokser's translations are excluded. See excluded.yaml.
- **Works of Rav Soloveitchik (Halakhic Man, The Lonely Man of Faith, Kol Dodi Dofek, U-Vikkashtem mi-Sham, Shiurim LeZecher Abba Mari)**. Rabbi Joseph B. Soloveitchik, 1903-1993, United States. core · Modern Orthodox. `rav-soloveitchik`
  - Reads: Kol Dodi Dofek, translated by David Z. Gordon (Yeshiva University, 2006). Proposed 2026-10-13. Published by Yeshiva University, edited by Rabbi Jeffrey Woolf (to confirm). The Hebrew on Sefaria is a translation back from the English, not the Rav's own words, and is in excluded.yaml.
  - Waiting for your decision: Halakhic Man, translated by Lawrence Kaplan (Part 2).
- **Covenant & Conversation and other works of Rabbi Jonathan Sacks**. Rabbi Lord Jonathan Sacks, 1948-2020, United Kingdom. Modern Orthodox. `rabbi-sacks-covenant-conversation`
  - Reads: Covenant & Conversation essays [English]
  - Reads: The weekly Torah essay collections, holiday essays and Haggadah essays [English]. Essays in Ethics, Lessons in Leadership, Studies in Spirituality, I Believe and Judaism's Life-Changing Ideas (each "a weekly reading of the Jewish Bible", gathered from his weekly Covenant & Conversation essays), Ceremony and Celebration (his introductions to the festivals) and the essays from his Haggadah.
  - Note: Widely read English Torah thought. The board may want to approve specific works rather than all of them, since a few positions in his writings drew criticism.
- **Em HaBanim Semeichah** (אם הבנים שמחה). Yisachar Shlomo Teichtal. Religious Zionist. `em-habanim-semecha`
  - Reads: Hebrew text. The Budapest 1943 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
  - Note: Written in Budapest during the war by a Chassidic rav, arguing for joining the return to the Land of Israel. It is one side of a disagreement within Orthodoxy; RabAI presents it as that view, beside the others (founding spec, principle 3).
- **Works of Rabbi Moshe Avigdor Amiel** (כתבי הרב משה אביגדור עמיאל). Moshe Amiel, Antwerp and Tel Aviv. Religious Zionist. `rav-amiel`
  - Reads: Hebrew text. Sefaria lists these printings (1933-2014) as public domain; the author died in 1946. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Rav Kook's Midbar Shur, Middot HaRe'iyah, Musar Avikha and Ma'amar HaDor** (מדבר שור; מידות הראי״ה; מוסר אביך; מאמר הדור). Abraham Isaac HaCohen Kook, Eretz Yisrael. Religious Zionist. `rav-kook-shorter-works`
  - Reads: Hebrew text. Musar Avikha is the Jerusalem 1946 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Milchamot HaShem (Rabbi Yichya Qafih)** (מלחמות השם). Yichya Qafih, begun in 1914, printed in Jerusalem in 1931, Yemen. Sephardi. `milchamot-hashem-qafih`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text. The author's own text, from Hebrew Wikisource (CC-BY-SA, 0.8 MB: his introduction and ten chapters). Rabbi Qafih was a Yemenite rabbi and teacher of halacha; the debate is over this book's claims, not over the edition (to confirm with the board).
  - Note: Moved from excluded.yaml on 2026-10-10 by the maintainer's direction: RabAI may discuss it, with all the caution the Orthodox community gives it, and explain why the community rejected it. Unlike Mitpachat Sefarim, which questions some passages of the Zohar, it rejects the Zohar as a whole. On Sefaria under Kabbalah as "The Wars of God"; its version is named simply "ויקיטקסט" (Wikisource). The history in the caution comes from secondary accounts found in a web search (Wikipedia's articles on the book and on Rabbi Qafih, the Posen Library, Sefaria's topic page on him), which differ on details: the board should confirm it.
- **More books of Rabbi Jonathan Sacks (in English, and in Hebrew translation)**. Rabbi Lord Jonathan Sacks, 1948-2020, United Kingdom. Modern Orthodox. `rabbi-sacks-more-books`
  - Reads: English text (Maggid)
  - Reads: Hebrew translations (Maggid and others). Translated into Hebrew, most by Tsur Ehrlich. Radical Then, Radical Now was published in Hebrew by the Shalem Center (2007; translator to confirm).
  - Note: Rabbi Sacks's books that the earlier entry (rabbi-sacks-covenant-conversation) doesn't cover. For the board: when The Dignity of Difference first appeared in English (2002), some Charedi rabbis objected to passages about other faiths, and Rabbi Sacks rewrote them for the second edition (2003). Which edition this Hebrew translation follows is to confirm.
- **Books of Jewish thought by Rabbi Eliezer Berkovits**. Rabbi Eliezer Berkovits, 1908-1992. Modern Orthodox. `rabbi-eliezer-berkovits`
  - Reads: English text
  - Reads: Hebrew text
  - Note: Philosophy and theology, among them his books on faith in the face of the Holocaust (With God in Hell) and the crises of his time (Crisis and Faith), his critique of the non-Orthodox thinkers of his day (Major Themes in Modern Philosophies of Judaism, and on Martin Buber), and his study of logic in halacha (Torat HaHiggayon BaHalakhah). His proposals for changing halachic practice are a separate, debated entry (rabbi-eliezer-berkovits-on-halacha).
- **Rav Kook's introduction to Shabbat HaAretz, and selections from Shemonah Kevatzim in English** (הרב קוק). Rabbi Avraham Yitzchak HaKohen Kook, 1865-1935, Eretz Yisrael. Religious Zionist. `rav-kook-more-works`
  - Reads: Hebrew, the introduction to Shabbat HaAretz. Rav Kook's introduction to his book on the laws of shemittah, as published by Hazon (New York, 2014). The rest of Shabbat HaAretz on Sefaria (Jerusalem, 1937) has no license listed.
  - Reads: Shemonah Kevatzim (selections), translated by Rabbi Mike Feuer. Translated by the same Rabbi Mike Feuer as the Olat Re'iyah in rav-kook.
- **Yeshivat Otniel on the shemittah year (Adam Min HaAdamah; Penei Shevi'it Nekabelah)**. Yeshivat Otniel; Rabbi Elchanan Cherlow, published 2008-2014, Otniel, Eretz Yisrael. Religious Zionist. `yeshivat-otniel-shemittah`
  - Reads: Hebrew text
  - Note: Essays on the meaning of shemittah and the Jubilee year, from the yeshiva's rabbis and students.
- **Zakhor VeShamor (Rabbi Yoel Bin-Nun on the Jewish calendar)** (זכור ושמור). Rabbi Yoel Bin-Nun, published 2015, Alon Shevut, Eretz Yisrael. Religious Zionist. `zakhor-veshamor`
  - Reads: Hebrew text
  - Note: On the festivals and the calendar, between nature and history. Some rabbis have criticized Rabbi Bin-Nun's approach to Tanakh study (to confirm); this book is on the calendar.

#### Mussar

*Rishonim (about 1040-1550)*

- **Chovot HaLevavot (Duties of the Heart)** (חובות הלבבות). Rabbeinu Bachya ibn Paquda, 11th century, Spain. core. `chovot-halevavot`
  - Reads: Hebrew (Ibn Tibbon translation from the Arabic)
  - Reads: Duties of the Heart, translated by Rabbi Moses Hyamson
  - Reads: Duties of the Heart, translated by Rabbi Yosef Sebag. Rabbi Yosef Sebag studied in yeshivas under Rabbi Dov Schwartzman, Rabbi Nachman Bulman and Rabbi Nissan Kaplan, and worked from Rabbi Moses Hyamson's translation (to confirm).
- **Shaarei Teshuvah (The Gates of Repentance)** (שערי תשובה). Rabbeinu Yonah of Gerona, died 1263, Spain. `shaarei-teshuvah`
  - Reads: Hebrew text
  - Reads: The Gates of Repentance, translated by Rabbi Francis Nataf
- **Orchot Tzaddikim (The Ways of the Righteous)** (אורחות צדיקים). Anonymous, 15th century, Germany. `orchot-tzaddikim`
  - Reads: Hebrew text
  - Note: Find an Orthodox English translation. The board should confirm the translator of any edition proposed.
- **Bechinat Olam** (בחינת עולם). Yedayah HaPenini, written c. 1300-1340. `bechinat-olam`
  - Reads: Hebrew text
- **Iggeret HaRamban** (אגרת הרמב"ן). Moses ben Nachman (Ramban), written c. 1267, Acre. `iggeret-haramban`
  - Reads: Hebrew text
- **Kad HaKemach (Rabbeinu Bachya)** (כד הקמח). Bachya ben Asher, written c. 1290-1340, Saragossa. `kad-hakemach`
  - Reads: Hebrew text
- **Ma'alot HaMiddot** (מעלות המדות). Yechiel ben Yekutiel. `maalot-hamiddot`
  - Reads: Hebrew text
- **Sefer HaYashar (the mussar book)** (ספר הישר). written c. 1300, Spain. `sefer-hayashar-mussar`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Debated (library question 8): sometimes attributed to Rabbeinu Tam; many consider the author unknown. Rabbi Seymour J. Cohen's English is barred in excluded.yaml.
- **Sefer HaYirah (Rabbeinu Yonah)** (ספר היראה). Rabbeinu Yonah Gerondi. `sefer-hayirah`
  - Reads: Hebrew text
- **Orchot Chaim (the Rosh)** (אורחות חיים להרא"ש). Rabbenu Asher ben Yechiel (Rosh), written c. 1293-1327, Rhineland. `orchot-chaim-harosh`
  - Reads: Hebrew text

*Acharonim (about 1550-1900)*

- **Works of the Ramchal (Mesillat Yesharim, Derech Hashem, Da'at Tevunot)** (רמח״ל). Rabbi Moshe Chaim Luzzatto (Ramchal), 1707-1746, Italy, Amsterdam, Eretz Yisrael. core. `ramchal`
  - Reads: Derech Hashem, translated by Rabbi Francis Nataf
  - Reads: Mesillat Yesharim (Path of the Just), translated by Rabbi Yosef Sebag. Rabbi Yosef Sebag studied in yeshivas under Rabbi Dov Schwartzman, Rabbi Nachman Bulman and Rabbi Nissan Kaplan (to confirm).
  - Reads: Hebrew text, digital editions on Sefaria. Mesillat Yesharim from Sefaria's vocalized edition; Derech Hashem from a manuscript (Ets Haim, 1896).
  - Note: The 1936 JPS translation of Mesillat Yesharim is excluded. See excluded.yaml.
- **Or Yisrael** (אור ישראל). Rabbi Yisrael Salanter (compiled by Rabbi Yitzchak Blazer), 1810-1883. Litvish. `or-yisrael`
  - Reads: Hebrew text
  - Note: The letters of the founder of the mussar movement. An English translation by Rabbi Irving Greenberg and Rabbi Justin Pines (2020) is on Sefaria; it is left out until the board confirms the translators.
- **Tomer Devorah (the Ramak)** (תומר דבורה). Moses Cordovero (Ramak), written c. 1546-1570, Safed. `tomer-devorah`
  - Reads: Hebrew text
- **Ahavat David (the Chida)** (אהבת דוד). Hayyim Joseph David Azulai (Chida), written c. 1768-1792. Sephardi. `ahavat-david`
  - Reads: Hebrew text
- **Cheshbon HaNefesh** (חשבון הנפש). Menachem Mendel Lefin. `cheshbon-hanefesh`
  - Reads: Hebrew text
  - Note: For the board: the author, Rabbi Menachem Mendel Lefin, was associated with the early Haskalah; the book was later reprinted and taught in the Mussar movement.
- **Iggeret HaGra (the Vilna Gaon's letter)** (אגרת הגר"א). Vilna Gaon, written c. 1730-1770, Vilna. Litvish. `iggeret-hagra`
  - Reads: Hebrew text
  - Note: Sefaria's English carries the same version name as the Hebrew and names no translator; it is left out.
- **Kav HaYashar** (קב הישר). Tzvi Hirsch Kaidanover, written c. 1665-1705. `kav-hayashar`
  - Reads: Hebrew text
  - Reads: Kav HaYashar, translated by Metsudah
- **Pele Yoetz** (פלא יועץ). Eliezer Papo, written c. 1815-1823, Silistra, Bulgaria. Sephardi. `pele-yoetz`
  - Reads: Hebrew text
- **Sefer HaChaim (Rabbi Chaim of Friedberg)** (ספר החיים). Chaim ben Betzalel of Friedberg, written c. 1578. `sefer-hachaim-friedberg`
  - Reads: Hebrew text
- **Shenei Luchot HaBerit (the Shelah)** (שני לוחות הברית). Isaiah Horowitz (Shelah), written c. 1611-1631, Eretz Yisrael. `shenei-luchot-haberit`
  - Reads: Hebrew text
  - Reads: Shenei Luchot HaBerit, translated by Rabbi Eliyahu Munk
- **Shevet Musar** (שבט מוסר). Eliyahu HaKohen of Smyrna, written c. 1712. `shevet-musar`
  - Reads: Hebrew text
- **Ya'arot Devash** (יערות דבש). Jonathan Eybeschutz. `yaarot-devash`
  - Reads: Hebrew text
- **Yesod VeShoresh HaAvodah** (יסוד ושורש העבודה). Alexander Ziskind of Grodno, written c. 1769-1781, Grodno, Belarus. `yesod-veshoresh-haavodah`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Shorter mussar works of the Chafetz Chaim** (קונטרסים של החפץ חיים). Israel Meir Kagan (Chafetz Chaim), Radun. Litvish. `chafetz-chaim-shorter-works`
  - Reads: Hebrew text
  - Reads: Anticipating Redemption (Ma'amar Tzipita LeYeshuah), translated by Rabbis Amiram and Yehudah Markel. Rabbis Amiram and Yehudah Markel translate Chabad and other Chassidic classics into English, among them the Mitteler Rebbe's The Gateway to Understanding (to confirm). Sefaria lists no license on its Hebrew of Tzipita LeYeshuah (Torat Emet's text); it is in by Torat Emet's written permission (canon/permissions.yaml).
- **Ma'amar Mezakeh HaRabim (Novardok)** (מאמר מזכה הרבים). Yosef Yozel Horowitz, written c. 1894-1916, Novogrudok. Litvish. `maamar-mezakeh-harabim`
  - Reads: Hebrew text
- **Ohr HaTzafun (the Alter of Slabodka)** (אור הצפון). Nosson Tzvi Finkel, written c. 1928, Kaunas. Litvish. `ohr-hatzafun`
  - Reads: Hebrew text
- **Sichot Avodat Levi (Rabbi Yaakov Yitzchak Ruderman)** (שיחות עבודת לוי). Yaakov Yitzchok Ruderman, written c. 1945-1995, Baltimore, MD, USA. Litvish. `sichot-avodat-levi`
  - Reads: Hebrew text. A Baltimore 2018 edition under an open license. The board approves modern works one at a time.
- **Books of Dr. Erica Brown (on the Three Weeks, the Days of Awe, and leadership in Bamidbar)**. Dr. Erica Brown, published 2011-2013. Modern Orthodox. `dr-erica-brown`
  - Reads: English text (Maggid). Dr. Brown directs a center at Yeshiva University named for Rabbi Sacks (to confirm).

#### Chassidus

*Acharonim (about 1550-1900)*

- **Tanya (Likkutei Amarim)** (תניא). Rabbi Schneur Zalman of Liadi (the Alter Rebbe), 1745-1812, White Russia. core · Chassidish · Chabad. `tanya`
  - Reads: Hebrew text
  - Reads: Tanya, bilingual edition (trans. Nissan Mindel, Nissan Mangel, Zalman Posner, Jacob Immanuel Schochet) [English]
- **Rebbe Nachman's teachings on hisbodedut (Likutei Moharan; Outpouring of the Soul)** (התבודדות). Rebbe Nachman of Breslov, 1772-1810, Ukraine. Chassidish. `rebbe-nachman-hisbodedut`
  - Reads: Likutei Moharan, Hebrew text
  - Reads: Likutey Moharan, translated by Moshe Mykoff
  - Note: Speaking to HaShem in your own words, daily. Open question 12 asks the board how far to include this.
- **Sfas Emes on the Torah** (שפת אמת). Rabbi Yehudah Aryeh Leib Alter of Ger, 1847-1905. Chassidish. `sfas-emes`
  - Reads: Hebrew text
  - Note: One of the most learned works of Chassidus on the parsha.
- **Kedushas Levi** (קדושת לוי). Rabbi Levi Yitzchak of Berditchev, 1740-1809. Chassidish. `kedushas-levi`
  - Reads: Hebrew text
  - Reads: Kedushat Levi, translated by Rabbi Eliyahu Munk
- **Noam Elimelech** (נועם אלימלך). Rabbi Elimelech of Lizhensk, 1717-1787. Chassidish. `noam-elimelech`
  - Reads: Hebrew text
- **Maggid Devarav LeYaakov (the Maggid of Mezritch)** (מגיד דבריו ליעקב). Dov Baer of Mezeritch [Maggid of Mezeritch], written c. 1760-1780. Chassidish. `maggid-devarav-leyaakov`
  - Reads: Hebrew text
- **Me'or Einayim** (מאור עינים). Menachem Nachum of Chernobyl, written c. 1763-1797, Chernobyl. Chassidish. `meor-einayim`
  - Reads: Hebrew text
- **Peri HaAretz** (פרי הארץ). Menachem Mendel of Vitebsk, written c. 1752-1788. Chassidish. `peri-haaretz`
  - Reads: Hebrew text
- **Toldot Yaakov Yosef** (תולדות יעקב יוסף). Jacob Joseph of Polonne, written c. 1780, Polonne, Ukraine. Chassidish. `toldot-yaakov-yosef`
  - Reads: Hebrew text
- **Ben Porat Yosef** (בן פורת יוסף). Jacob Joseph of Polonne, written c. 1760-1780, Polonne, Ukraine. Chassidish. `ben-porat-yosef`
  - Reads: Hebrew text. The Eichen edition (Jerusalem, 2011), under an open license.
- **Tzofnat Paneach (Rabbi Yaakov Yosef of Polonne)** (צפנת פענח). Jacob Joseph of Polonne. Chassidish. `tzofnat-paneach-polonne`
  - Reads: Hebrew text. The Eichen edition (Jerusalem, 2011), under an open license.
- **Tzava'at HaRivash** (צוואת הריב"ש). written c. 1730-1770. Chassidish. `tzavaat-harivash`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Reads: The Way of the Baal Shem Tov, adapted by Rabbis Amiram and Yehudah Markel [English]. Rabbis Amiram and Yehudah Markel translate Chabad and other Chassidic classics into English, among them the Mitteler Rebbe's The Gateway to Understanding (to confirm). An adaptation rather than a line-by-line translation, as its title says.
  - Note: Debated (library question 8): teachings of the Baal Shem Tov and the Maggid of Mezritch gathered by students, and long discussed by other authorities.
- **Chayei Moharan** (חיי מוהר"ן). Nathan Sternhartz, written c. 1810-1830. Chassidish. `chayei-moharan`
  - Reads: Hebrew text
- **Sefer HaMiddot (Rebbe Nachman)** (ספר המדות). Nachman of Breslov, written c. 1810. Chassidish. `sefer-hamiddot`
  - Reads: Hebrew text
- **Sippurei Maasiyot (Rebbe Nachman's stories)** (סיפורי מעשיות). Nathan Sternhartz, written c. 1803-1817. Chassidish. `sippurei-maasiyot`
  - Reads: Hebrew text
- **Shivchei HaRan and Sichot HaRan** (שבחי הר״ן; שיחות הר״ן). Nathan Sternhartz. Chassidish. `rabbi-nachmans-wisdom`
  - Reads: Rabbi Nachman's Wisdom, translated by Rabbi Aryeh Kaplan
- **Likutei Halakhot (Rebbe Natan of Breslov)** (ליקוטי הלכות). Nathan Sternhartz (Rebbe Natan of Breslov), written c. 1814-1844. Chassidish. `likutei-halakhot`
  - Reads: Hebrew text, Breslov Research Institute edition. Only the beginning of the work so far: Rebbe Natan's introduction and the opening of Orach Chaim, with vowels. Sefaria's other Hebrew (from Or HaGanuz) has no license listed.
  - Reads: Likutey Halakhot, translated by Moshe Mykoff with Dov Grant
- **Likutei Tefilot (Rebbe Natan of Breslov)** (ליקוטי תפילות). Nathan Sternhartz (Rebbe Natan of Breslov), written c. 1810-1820. Chassidish. `likutei-tefilot`
  - Reads: The Fiftieth Gate, the Breslov Research Institute's translation. Translated, as far as we know, by Rabbi Avraham Greenbaum (to confirm).
- **Likkutei Etzot (Rebbe Nachman's advice, gathered by Rebbe Natan)** (ליקוטי עצות). Nachman of Breslov; gathered by Nathan Sternhartz, printed 1816. Chassidish. `likkutei-etzot`
  - Reads: Advice, the Breslov Research Institute's translation. Translated, as far as we know, by Rabbi Avraham Greenbaum (to confirm).
- **Derekh Mitzvotekha (the Tzemach Tzedek)** (דרך מצותיך). Menachem Mendel Schneersohn (Third Lubavitcher Rebbe), written c. 1813-1827. Chassidish · Chabad. `derekh-mitzvotekha`
  - Reads: Hebrew text
- **Sha'ar HaYichud (the Mitteler Rebbe)** (נר מצוה ותורה אור; שער היחוד). Dov Ber Schneuri (the Mitteler Rebbe, second Lubavitcher Rebbe), printed 1820. Chassidish · Chabad. `shaar-hayichud-mitteler-rebbe`
  - Reads: The Gate of Unity, translated by Rabbi Amiram Markel. Rabbis Amiram and Yehudah Markel translate Chabad and other Chassidic classics into English, among them the Mitteler Rebbe's The Gateway to Understanding (to confirm).
- **Likkutei Torah (the Alter Rebbe)** (לקוטי תורה). Shneur Zalman of Liadi, written c. 1796-1812. Chassidish · Chabad. `likkutei-torah`
  - Reads: Hebrew text
  - Note: Includes Kehot's source references, printed with the text.
- **Torah Ohr (the Alter Rebbe)** (תורה אור). Shneur Zalman of Liadi. Chassidish · Chabad. `torah-ohr`
  - Reads: Hebrew text
  - Note: Includes Kehot's source references, printed with the text.
- **Sod Yesharim (the Radziner Rebbe)** (סוד ישרים). Gershon Chanokh Leiner of Radzin, written c. 1859-1889, Radzyń Podlaski. Chassidish. `sod-yesharim`
  - Reads: Hebrew text
- **Works of Rabbi Tzadok HaKohen of Lublin (Peri Tzadik, Tzidkat HaTzadik, Resisei Layla and others)** (כתבי רבי צדוק הכהן מלובלין). Tzadok HaKohen of Lublin, Lublin. Chassidish. `rabbi-tzadok-hakohen`
  - Reads: Hebrew text
- **Agra DeKala** (אגרא דכלה). Tzvi Elimelekh Shapira of Dinov, written c. 1801-1841. Chassidish. `agra-dekala`
  - Reads: Hebrew text. A Brooklyn 1993 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Arvei Nachal** (ערבי נחל). David Solomon Eibeschutz, written c. 1780-1810. Chassidish. `arvei-nachal`
  - Reads: Hebrew text. A Jerusalem 1991 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Avodat Yisrael (the Kozhnitzer Maggid)** (עבודת ישראל). Israel Hopstein of Kozhnitz, written c. 1750-1810, Kozienice, Poland. Chassidish. `avodat-yisrael`
  - Reads: Hebrew text
- **Sefer Baal Shem Tov on the Torah, with Mekor Mayim Chayim** (ספר בעל שם טוב על התורה). Teachings of the Ba'al Shem Tov (compiled). Chassidish. `baal-shem-tov-al-hatorah`
  - Reads: Hebrew text. The Lodz 1938 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
  - Reads: Baal Shem Tov: mystical teachings on the weekly Torah portion, by Rabbi Eliezer Shore [English]. Rabbi Eliezer Shore teaches Chassidic thought in Jerusalem, including at Yeshivat Bat Ayin, and wrote his doctorate at Bar-Ilan University on Rebbe Nachman of Breslov (to confirm).
- **Bat Ayin** (בת עין). Avraham Dov Baer of Ovruch. Chassidish. `bat-ayin`
  - Reads: Hebrew text. A Jerusalem 2001 edition under an open license.
- **Beit Aharon (Karlin)** (בית אהרן). Aaron Ben Asher Perlow of Karlin, written c. 1830-1870, Karlin, Belarus. Chassidish. `beit-aharon`
  - Reads: Hebrew text
- **Beit Yisrael (Ruzhin)** (בית ישראל (רוז'ין)). Chassidish. `beit-yisrael-ruzhin`
  - Reads: Hebrew text
- **Bnei Yissaschar** (בני יששכר). Tzvi Elimelekh Shapira of Dinov, written c. 1820-1840. Chassidish. `bnei-yissaschar`
  - Reads: Hebrew text
- **Chanah Ariel** (חנה אריאל). Yitzchak Eizik Epstein. Chassidish. `chanah-ariel`
  - Reads: Hebrew text
- **Chayyim VaChesed (Amdur)** (חיים וחסד). Chaim Chaykl Levin of Amdur. Chassidish. `chayyim-vachesed`
  - Reads: Hebrew text. A Hamesorah edition (c. 2005) under an open license.
- **Chiddushei HaRim on the Torah** (חידושי הרי"מ על התורה). Yitzchak Meir Rotenberg-Alter, written c. 1825-1865. Chassidish. `chiddushei-harim-on-torah`
  - Reads: Hebrew text
- **Darkhei Yesharim** (דרכי ישרים). Menachem Mendel of Premishlan, written c. 1764. Chassidish. `darkhei-yesharim`
  - Reads: Hebrew text
- **Degel Machaneh Ephraim** (דגל מחנה אפרים). Moshe Chaim Ephraim of Sudilkov, written c. 1770-1800. Chassidish. `degel-machaneh-ephraim`
  - Reads: Hebrew text
- **Divrei Emet (the Chozeh of Lublin)** (דברי אמת). Jacob Isaac Horowitz, written c. 1770-1810. Chassidish. `divrei-emet-chozeh`
  - Reads: Hebrew text
- **Imrei Shefer (Ropshitz)** (אמרי שפר). Naftali Tzvi Horowitz. Chassidish. `imrei-shefer`
  - Reads: Hebrew text
- **Irin Kadishin (Ruzhin)** (עירין קדישין). Yisrael Friedman. Chassidish. `irin-kadishin`
  - Reads: Hebrew text
- **Keter Shem Tov** (כתר שם טוב). Ba'al Shem Tov, written c. 1877-1883. Chassidish. `keter-shem-tov`
  - Reads: Hebrew text
- **Maor VaShemesh** (מאור ושמש). Kalonymus Kalman Epstein, written c. 1817-1823. Chassidish. `maor-vashemesh`
  - Reads: Hebrew text
- **Mareh Yechezkel on the Torah** (מראה יחזקאל על התורה). Yechezkel Panet, written c. 1800-1840. Chassidish. `mareh-yechezkel-on-torah`
  - Reads: Mareh Yechezkel, translated by Rabbi Francis Nataf
- **Midrash Pinchas (Rabbi Pinchas of Koretz)** (מדרש פנחס). Pinchas Shapiro, Ukraine. Chassidish. `midrash-pinchas`
  - Reads: Hebrew text. The Biłgoraj 1930 printing.
- **Ohev Yisrael (the Apter Rav)** (אוהב ישראל). Avraham Yehoshua Heschel, written c. 1770-1820. Chassidish. `ohev-yisrael`
  - Reads: Hebrew text
- **Ohr HaMeir** (אור המאיר). Zev Wolf of Zhitomyr. Chassidish. `ohr-hameir`
  - Reads: Hebrew text
- **Ohr LaShamayim** (אור לשמים). Meir Halevi Rotenberg. Chassidish. `ohr-lashamayim`
  - Reads: Hebrew text. A Jerusalem 2013 edition under an open license.
- **Sha'arei HaAvodah and Sha'arei HaYichud VeHaEmunah (Rabbi Aharon HaLevi of Staroselye)** (שערי העבודה; שערי היחוד והאמונה). Aaron HaLevi Horowitz. Chassidish · Chabad. `shaarei-avodah`
  - Reads: Hebrew text. Jerusalem 1990 printings. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Sidduro Shel Shabbat** (סדורו של שבת). Chaim Tyrer of Czernowitz, written c. 1770-1810. Chassidish. `sidduro-shel-shabbat`
  - Reads: Hebrew text
- **Tiferet Shlomo (Radomsk)** (תפארת שלמה). Shlomo Hakohen Rabinowicz, written c. 1825-1865, Radomsko, Poland. Chassidish. `tiferet-shlomo`
  - Reads: Hebrew text
- **Yakar MiPaz** (יקר מפז). Israel Hopstein of Kozhnitz, written c. 1750-1810, Kozienice, Poland. Chassidish. `yakar-mipaz`
  - Reads: Hebrew text
- **Yismach Moshe** (ישמח משה). Moshe Teitelbaum of Ujhel, written c. 1790-1840. Chassidish. `yismach-moshe`
  - Reads: Hebrew text
- **Yosher Divrei Emet** (יושר דברי אמת). Meshullam Feivush Heller, written c. 1777-1792, Galicia. Chassidish. `yosher-divrei-emet`
  - Reads: Hebrew text. A Monsey 1993 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Zera Kodesh (Ropshitz)** (זרע קודש). Naftali Tzvi Horowitz, Ropczyce. Chassidish. `zera-kodesh`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Shem MiShmuel** (שם משמואל). Rabbi Shmuel Bornsztain of Sochatchov, 1855-1926. Chassidish. `shem-mishmuel`
  - Reads: Hebrew text
- **Works of the Piaseczno Rebbe (Chovat HaTalmidim, Hakhsharat HaAvrechim, Mevo HaShe'arim and others)** (כתבי האדמו״ר מפיאסצנה). Kalonymus Kalman Shapira, Piaseczno and Warsaw. Chassidish. `piaseczno-rebbe`
  - Reads: Hebrew text. Chovat HaTalmidim is the Warsaw 1932 printing; three works come from manuscripts saved in the Ringelblum archive. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
  - Reads: Chovat HaTalmidim, translated by Rabbi Francis Nataf
- **Flames of Faith (an introduction to Chassidic thought)**. Rabbi Zev Reichman, published 2014. Chassidish. `flames-of-faith`
  - Reads: English text (Kodesh Press, 2014)

#### Commentaries on these works

*Rishonim (about 1040-1550)*

- **Efodi on the Guide for the Perplexed** (אפודי). Isaac ben Moses HaLevi (Efodi). `efodi-on-guide`
  - Reads: Hebrew text
- **Asher Crescas on the Guide for the Perplexed** (קרשקש). Asher ben Abraham Crescas, written c. 1400-1440, Provence, France. `crescas-on-guide`
  - Reads: Hebrew text
- **Shem Tov on the Guide for the Perplexed** (שם טוב). Shem Tov ibn Joseph ibn Shem Tov, written c. 1484-1492, Spain. `shem-tov-on-guide`
  - Reads: Hebrew text
- **Abarbanel on the Guide for the Perplexed** (אברבנאל). Isaac Abarbanel, written c. 1492-1508, Venice. `abarbanel-on-guide`
  - Reads: Hebrew text
- **Kimcha Davshuna on Pesach Haggadah** (קמחא דאבישונא). Johanan Treves, written c. 1520-1540. `kimcha-davshuna-on-pesach-haggadah`
  - Reads: Hebrew text
- **The Ritva on the Haggadah** (ריטב"א). Ritva, written c. 1280-1320, Spain. `commentary-of-ritva-on-pesach-haggadah`
  - Reads: Hebrew text
- **Shibbolei HaLeket on the Haggadah** (שבלי הלקט). Zedekiah ben Abraham HaRofei, written c. 1240-1280. `shibolei-haleket-on-pesach-haggadah`
  - Reads: Hebrew text
- **Zevach Pesach (Abarbanel on the Haggadah)** (זבח פסח). Isaac Abarbanel, written c. 1496, Monopoli. `zevach-pesach-on-pesach-haggadah`
  - Reads: Hebrew text

*Acharonim (about 1550-1900)*

- **Pat Lechem (on Chovot HaLevavot)** (פת לחם). Chaim Avraham Katz, written c. 1760-1800. `pat-lechem-on-duties-of-the-heart`
  - Reads: Hebrew text
  - Reads: English, from Rabbi Yosef Sebag's Duties of the Heart. The passages of this commentary that Rabbi Yosef Sebag translated alongside his Duties of the Heart. Rabbi Sebag studied in yeshivas under Rabbi Dov Schwartzman, Rabbi Nachman Bulman and Rabbi Nissan Kaplan (to confirm).
- **Marpeh LaNefesh (on Chovot HaLevavot)** (מרפא לנפש). Raphael ben Zechariah Mendel, written c. 1734-1774. `marpeh-lanefesh-on-duties-of-the-heart`
  - Reads: Hebrew text
  - Reads: English, from Rabbi Yosef Sebag's Duties of the Heart. The passages of this commentary that Rabbi Yosef Sebag translated alongside his Duties of the Heart. Rabbi Sebag studied in yeshivas under Rabbi Dov Schwartzman, Rabbi Nachman Bulman and Rabbi Nissan Kaplan (to confirm).
- **Ephod Bad on Pesach Haggadah** (אפוד בד). Benjamin David Rabinowitz, written c. 1840-1870. `ephod-bad-on-pesach-haggadah`
  - Reads: Hebrew text
- **Kos Eliyahu on Pesach Haggadah** (כוס אליהו על הגדה של פסח). Rabbi Eliyahu Ben Harush, written c. 1840-1880, Sefrou. Sephardi. `kos-eliyahu-on-pesach-haggadah`
  - Reads: Hebrew text. The Djerba 1938 printing. Sefaria lists this printing as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use.
- **Tevele Bondi on Pesach Haggadah** (טעבעלה באנדי על הגדה של פסח). Tevele Bondi, written c. 1820-1880, Frankfurt am Main, Germany. `tevele-bondi-on-pesach-haggadah`
  - Reads: Hebrew text
- **Maaseh Nissim on Pesach Haggadah** (מעשה ניסים). Yaakov Lorberbaum, written c. 1789-1801, Kalush. `maaseh-nissim-on-pesach-haggadah`
  - Reads: Hebrew text
- **Marbeh Lesaper on Pesach Haggadah** (מרבה לספר). Yedidiah Tiah Weil, written c. 1750-1790. `marbeh-lesaper-on-pesach-haggadah`
  - Reads: Hebrew text
- **Naftali Seva Ratzon on Pesach Haggadah** (נפתלי שבע רצון). Naftali ben Shimon Hertz Ginzburg, written c. 1670-1710. `naftali-seva-ratzon-on-pesach-haggadah`
  - Reads: Hebrew text
- **Peirush Hafla'ah on Pesach Haggadah** (פירוש הפלאה). Pinchas Horowitz, written c. 1755-1785, Frankfurt am Main, Germany. `peirush-haflaah-on-pesach-haggadah`
  - Reads: Hebrew text
- **Midrash BeChiddush on Pesach Haggadah** (מדרש בחדוש). Reggio. `midrash-bechiddush-on-pesach-haggadah`
  - Reads: Hebrew text
- **Tov HaLevanon (on Chovot HaLevavot)** (טוב הלבנון). Rabbi Yisrael ben Moshe HaLevi of Zamosc, written c. 1730-1770. `tov-halevanon-on-duties-of-the-heart`
  - Reads: Hebrew text
  - Reads: English, from Rabbi Yosef Sebag's Duties of the Heart. The passages of this commentary that Rabbi Yosef Sebag translated alongside his Duties of the Heart, as for Pat Lechem (pat-lechem-on-duties-of-the-heart).

*20th and 21st centuries*

- **Rabbi Jonathan Sacks's commentary on the Siddur, the Mahzorim and the Haggadah**. Rabbi Jonathan Sacks, London. Modern Orthodox. `rabbi-sacks-on-the-siddur-and-mahzor`
  - Reads: Rabbi Sacks's commentary (English, Koren)
- **Rabbi Yehoshua Hartman's notes on the works of the Maharal** (הערות הרב יהושע הרטמן על ספרי המהר״ל). Rabbi Yehoshua David Hartman, published 1997-2023, Jerusalem. `rabbi-hartman-notes-on-the-maharal`
  - Reads: Hebrew text (Machon Yerushalayim). The footnotes of Machon Yerushalayim's editions of the Maharal, which the canon already uses for the Maharal's own words (maharal). They trace his sources and explain him at length. Those on Netzach Yisrael, the Derashat Shabbat HaGadol, the Derush al HaTorah and the second part of Gevurot Hashem have no license listed on Sefaria yet and stay out until they do.

#### History

- **Letter to the Ten Lost Tribes (from the Vilna Gaon's students in Tzfat)** (אגרת אל עשרת השבטים). Yisrael ben Shmuel of Shklov, written c. 1830, Safed. `letter-to-the-ten-lost-tribes`
  - Reads: Hebrew text
- **Shivchei HaBesht** (שבחי הבעש"ט). Dov Baer ben Samuel, written c. 1780-1810. Chassidish. `shivchei-habesht`
  - Reads: Hebrew text

### Kabbalah

Sefer Yetzirah, the Zohar and its commentaries, the Arizal, and the works built on them. RabAI presents them as what the kabbalists teach.

#### The texts

*Tannaim (to about 200 CE)*

- **Sefer Yetzirah (with the Vilna Gaon's version)** (ספר יצירה). Attributed to Avraham Avinu (by tradition). `sefer-yetzirah`
  - Reads: Hebrew text
  - Note: The Warsaw 1884 printing with its commentaries. Isidor Kalisch's 1877 English is barred in excluded.yaml. Kabbalah waits on library questions 1 to 3 (how RabAI treats Kabbalah).
- **Sefer HaBahir** (ספר הבהיר). Attributed to Rabbi Nechunya ben HaKanah. `sefer-habahir`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Debated (library question 8): traditionally attributed to Rabbi Nechunya ben HaKanah. Kabbalah waits on library questions 1 to 3 (how RabAI treats Kabbalah).
- **Sefer HaZohar** (ספר הזהר). Attributed to Rabbi Shimon bar Yochai. `zohar`
  - Reads: Aramaic text, vocalized (Torat Emet's Zohar Menukad). On Sefaria as "Vocalized Zohar, Israel 2013" (14.9 MB; every section of the Zohar and the three volumes of addenda). Its Idra Zuta matches Torat Emet's "Zohar Menukad" word for word (9,099 of 9,099 words), so the file appears to be Torat Emet's vocalized Zohar. Sefaria lists its license as unknown; it is in the testing library by Torat Emet's written permission (canon/permissions.yaml, reported by the maintainer on 2026-10-10). Who vocalized it is not known (to confirm), nor whether Torat Emet holds its rights or distributes it by someone else's leave; settle both before a public launch. It is a modern edition, not a copy of an old printing: vowels, punctuation, about 1,100 "other reading" notes (נ"א) and about 15,000 Bible and cross-references in parentheses.
  - Note: Library question 2. The main Zohar on Sefaria is the title "Zohar", arranged by parasha (with the Idra Rabba, Idra Zuta and Sifra DiTzniuta as sections, and the Ra'aya Mehemna and the other inserted tracts inside the parashiyot). None of its Hebrew files has an open license on Sefaria; the vocalized text is in by Torat Emet's written permission. Torat Emet's Hebrew translation of the Zohar ("Hebrew Translation" on Sefaria) is left out until its translator is known and the board has seen it. The only open English, Soncino's (1931-1934), is in excluded.yaml (soncino-zohar). Kabbalah waits on library questions 1 to 3.
- **Zohar Chadash** (זוהר חדש). Attributed to Rabbi Shimon bar Yochai. `zohar-chadash`
  - Reads: Hebrew text
  - Note: Sefaria has no openly licensed Hebrew of the Zohar itself (library question 2). Kabbalah waits on library questions 1 to 3 (how RabAI treats Kabbalah).
- **Tikkunei Zohar** (תקוני הזהר). Attributed to Rabbi Shimon bar Yochai. `tikkunei-zohar`
  - Reads: Hebrew text
  - Note: Kabbalah waits on library questions 1 to 3 (how RabAI treats Kabbalah).

*Acharonim (about 1550-1900)*

- **Maggid Meisharim (Rabbi Yosef Karo)** (מגיד מישרים). Joseph Karo, written c. 1545-1575, Safed. `maggid-meisharim`
  - Reads: Hebrew text

#### Works of Kabbalah

*Rishonim (about 1040-1550)*

- **Be'ur Eser Sefirot (Rabbi Azriel of Gerona)** (ביאור עשר ספירות). Azriel of Gerona, written c. 1175-1235, Gerona, Catalonia, Spain. `beur-eser-sefirot`
  - Reads: Hebrew text. A short digital transcription from hebrew.grimoar.cz (twelve sections). No other copy exists on Sefaria to compare it with, and a modern editor added a few corrections in square brackets beside the original words in round brackets.
- **Sha'arei Orah (Rabbi Yosef Gikatilla)** (שערי אורה). Joseph Gikatilla, written c. 1260-1300, Spain. `shaarei-orah`
  - Reads: Hebrew text. A digital transcription from hebrew.grimoar.cz with the introduction and all ten gates (the third and fourth combined, as in the printings). No other copy exists on Sefaria to compare it with, and its Bible references in parentheses were added by a modern editor.
  - Reads: Gates of Light, translated by Rabbis Amiram and Yehudah Markel. Rabbis Amiram and Yehudah Markel translate Chabad and other Chassidic classics into English, among them the Mitteler Rebbe's The Gateway to Understanding (to confirm).

*Acharonim (about 1550-1900)*

- **Pardes Rimonim (the Ramak)** (פרדס רמונים). Moses Cordovero (Ramak), written c. 1548, Safed. `pardes-rimmonim`
  - Reads: Hebrew text. A digital transcription from hebrew.grimoar.cz. All 32 gates are present and the chapter counts match the table of contents printed in the Koretz 1780 edition (288 chapters against the 287 that index counts), but no second full copy exists to compare word by word; the Bible and Zohar references in parentheses and a few bracketed corrections were added by a modern editor.
- **Or Ne'erav (the Ramak)** (אור נערב). Moses Cordovero (Ramak), written c. 1550-1570, Safed. `ohr-neerav`
  - Reads: Hebrew text. The main text is a digital transcription (hebrew.grimoar.cz) with all seven parts. It could not be compared word by word: Sefaria's only other copy, the Fürth 1701 printing, holds just the title page and approbations, which the transcription lacks.
- **The Ramchal's Kabbalah writings (Kalach Pitchei Chochmah, Derech Etz Chaim, Asarah Perakim)** (קל״ח פתחי חכמה; דרך עץ חיים; עשרה פרקים). Moses Chaim Luzzatto (Ramchal). `ramchal-kabbalah`
  - Reads: Hebrew text. Kalach Pitchei Chochmah is a digital transcription from hebrew.grimoar.cz with all 138 openings. No other Hebrew copy exists on Sefaria to compare it with, and its topic headings (with ranges such as [א-ד]) were added by a modern editor.
  - Reads: 138 Openings of Wisdom (Kalach Pitchei Chochmah), translated by Rabbi Avraham Greenbaum. Rabbi Avraham Greenbaum, ordained in Jerusalem in 1988, teaches Chassidut and Kabbalah through the Azamra Institute and has translated many works of Rebbe Nachman of Breslov (to confirm).
- **The Arizal's teachings as written by Rabbi Chaim Vital (Etz Chaim, Pri Etz Chaim, the Shemonah She'arim and Sha'arei Kedushah)** (כתבי האר״י). Rabbi Chaim Vital, Safed. `kitvei-arizal`
  - Reads: Hebrew text. Eight titles are digital transcriptions from hebrew.grimoar.cz; three are Jerusalem printings of 1863-1909. Where the same text appears in both (Rabbi Shmuel Vital's introduction), the transcription agrees with the 1872 printing in about 97% of words once the printing's abbreviations are written out; one section of Sha'ar Ma'amarei Razal and one passage of Sha'ar HaKavanot appear twice.
  - Reads: Sha'arei Kedushah (Gates of Holiness), translated by Rabbi Amiram Markel. Rabbis Amiram and Yehudah Markel translate Chabad and other Chassidic classics into English, among them the Mitteler Rebbe's The Gateway to Understanding (to confirm).
  - Note: Kabbalah waits on library questions 1 to 3 (how RabAI treats Kabbalah).
- **Chesed LeAvraham** (חסד לאברהם). Abraham Azulai, written c. 1618-1622, Gaza. `chesed-leavraham`
  - Reads: Hebrew text. A digital transcription from hebrew.grimoar.cz with the introduction, all seven "springs" (ma'ayanot) and Breichat Avraham. No other copy exists on Sefaria to compare it with, and a modern editor added a few corrections in square brackets beside the original words in round brackets.
- **Mitpachat Sefarim (Rabbi Yaakov Emden)** (מטפחת ספרים). Yaakov Emden, written c. 1733-1767. `mitpachat-sefarim`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Debated (library question 3): Rabbi Yaakov Emden's attack on the Sabbatean movement, in which he disputes how old parts of the Zohar are. The board decides whether and how RabAI presents that view.
- **Shomer Emunim (Rabbi Yosef Ergas)** (שומר אמונים). Joseph ben Emanuel Ergas. `shomer-emunim-ergas`
  - Reads: Hebrew text
- **Shuvi Shuvi HaShulamit (the Ben Ish Chai)** (שובי שובי השולמית). Yosef Hayyim. Sephardi. `shuvi-shuvi-hashulamit`
  - Reads: Hebrew text

#### Commentaries

*Geonim (about 600-1040)*

- **Rav Saadia Gaon on Sefer Yetzirah** (רס״ג על ספר יצירה). Saadia Gaon, written c. 918-942. `rasag-on-sefer-yetzirah`
  - Reads: Hebrew text

*Rishonim (about 1040-1550)*

- **The commentary on Sefer Yetzirah printed under the Ra'avad's name** (ראב"ד). Yosef ben Sholom Ashkenazi, written c. 1280-1340, Spain. `raavad-on-sefer-yetzirah`
  - Reads: Hebrew text
  - Note: Sefaria's index attributes it to Rabbi Yosef ben Shalom Ashkenazi; it is printed under the Ra'avad's name.
- **The commentary on Sefer Yetzirah attributed to the Ramban** (רמב"ן). Moses ben Nachman (Ramban), written c. 1225-1265. `ramban-on-sefer-yetzirah`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Attributed to the Ramban (library question 8).
- **Recanati on the Torah** (רקנאטי על התורה). Menachem Recanati, written c. 1250-1290. `recanati-on-the-torah`
  - Reads: Hebrew text (an editor's additions removed). A digital transcription (hebrew.grimoar.cz) into which a modern editor inserted Hebrew translations of the Zohar passages Recanati quotes, in angle brackets: about 22% of its words. The library build removes them (strip_brackets), and leaves out the 30 of its 1,909 passages where they can't be separated cleanly (docs/transcription-check.md). Reviewers may want to compare it with a printed edition.
- **Sefer HaKanah** (ספר הקנה). Attributed to Rabbi Nechunya ben HaKanah. `sefer-hakanah`
  - Kept with a caution (Part 1).
  - Reads: Hebrew text
  - Note: Library question 8 (works whose author is uncertain), like Sefer HaBahir, which is attributed to the same Tanna. Which printing Sefaria's text copies is to confirm.

*Acharonim (about 1550-1900)*

- **The Vilna Gaon on Sefer Yetzirah** (גר"א). Vilna Gaon, written c. 1730-1770, Vilna. Litvish. `hagra-on-sefer-yetzirah`
  - Reads: Hebrew text
- **Pri Yitzchak on Sefer Yetzirah** (פרי יצחק). Yitzchak bar Yekutiel Zalman, written c. 1782-1798, Mahilyow / Mogilov. `pri-yitzhak-on-sefer-yetzirah`
  - Reads: Hebrew text
- **The Vilna Gaon's commentary on Sifra DeTzniuta** (ביאור הגר"א). Vilna Gaon, written c. 1740-1770. Litvish. `beur-hagra-on-sifra-detzniuta`
  - Reads: Hebrew text
- **Yahel Ohr (the Vilna Gaon on the Zohar)** (יהל אור). Vilna Gaon. Litvish. `yahel-ohr-on-zohar`
  - Reads: Hebrew text
- **Ketem Paz on the Zohar** (כתם פז). Shimon Lavi, written c. 1561-1571, Tripoli, Libya. Sephardi. `ketem-paz-on-zohar`
  - Reads: Hebrew text
- **Mikdash Melekh on the Zohar (with the Ramaz's commentary)** (מקדש מלך). Shalom Buzaglo. Sephardi. `mikdash-melekh-on-zohar`
  - Reads: Hebrew text
- **Ohr HaChammah on the Zohar** (אור החמה). Abraham Azulai, written c. 1599-1639. `ohr-hachammah-on-zohar`
  - Reads: Hebrew text
- **Ma'aseh Rokeach on the Mishnah** (מעשה רוקח על המשנה). Elazar Rokeach of Amsterdam, written c. 1685-1735. `maaseh-rokeach-on-mishnah`
  - Reads: Hebrew text
- **Megaleh Amukot on Parashat VaEtchanan** (מגלה עמוקות על פרשת ואתחנן). Nathan Nota Spira, written c. 1607-1633, Krakow, Poland. `megalleh-amukkot-on-vaetchanan`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Talmud Eser HaSefirot with Ohr Penimi, and Matan Torah (Rabbi Yehuda Ashlag)** (תלמוד עשר הספירות; אור פנימי; מתן תורה). Rabbi Yehuda Leib HaLevi Ashlag (the Baal HaSulam), 1885-1954, Jerusalem. `ashlag-talmud-eser-hasefirot`
  - Reads: Hebrew text. Talmud Eser HaSefirot explains the Arizal's teaching from Etz Chaim, with Rabbi Ashlag's own commentary Ohr Penimi. Sefaria lists the Jerusalem printing (1956-1966) as public domain although it is less than 95 years old; that is enough for private testing, but worth confirming before any public use. Matan Torah is his short essays on the giving of the Torah and on love of one's fellow Jew.
  - Note: The author of the Sulam commentary on the Zohar (zohar). The English translations on Sefaria (the Sefaria Sulam, Vital Transformation, and others) are not listed; their translators would need the board's view (library question 12).

#### Other works

- **Peri Etz Hadar (the Tu BiShvat seder)** (פרי עץ הדר). written c. 1600-1700, Safed. `peri-etz-hadar`
  - Reads: Hebrew text
  - Note: The English by Aharon Varady and Miles Krassen is left out until the board confirms the translators.
- **Reshit Chochmah** (ראשית חכמה). Elijah de Vidas. `reshit-chokhmah`
  - Reads: Hebrew text. A Hamesorah edition (Jerusalem, 2005) under an open license.
- **Klalei Hatchalat HaChochmah (an introduction to Kabbalah)** (כללי התחלת החכמה). Rabbi Aryeh Leib Lipkin, written c. 1887-1893 (as Sefaria gives). `klalei-hatchalat-hachochmah`
  - Reads: Hebrew text (Hebrew Wikisource)
  - Reads: The Beginning of Wisdom, translated by Rabbi Amiram Markel and Michoel Tzvi Wolkenfeld. Rabbis Amiram and Yehudah Markel translate Chabad and other Chassidic and kabbalistic classics into English; the canon already lists several of their translations.
  - Note: Sefaria gives the author as Aryeh Leib Lifkin; who he was, and when he wrote, is to confirm.

### Prayer

The siddur, the machzor, selichot and kinnot, the Haggadah, and the piyyutim.

*Geonim (about 600-1040)*

- **The Pesach Haggadah** (הגדה של פסח). `pesach-haggadah`
  - Reads: Hebrew text
  - Reads: The Koren Haggadah, translated by Rabbi Jonathan Sacks
  - Note: The older public-domain English Haggadot on Sefaria are left out until the board knows their translators.
- **Perek Shirah** (פרק שירה). `perek-shirah`
  - Reads: Hebrew text
- **Seder Ma'amadot** (סדר מעמדות). `seder-maamadot`
  - Reads: Hebrew text

*Rishonim (about 1040-1550)*

- **The Azharot of Rabbi Shlomo ibn Gabirol** (אזהרות לרבי שלמה אבן גבירול). Solomon ibn Gabirol. `azharot-ibn-gabirol`
  - Reads: Hebrew text

*Acharonim (about 1550-1900)*

- **Selichot (Edot HaMizrach)** (סליחות נוסח עדות המזרח). Sephardi. `selichot-edot-hamizrach`
  - Reads: Hebrew text
  - Reads: Selichot Edot HaMizrach, translated by Rabbi Francis Nataf
- **Selichot (Ashkenaz: Lita and Polin)** (סליחות נוסח אשכנז). `selichot-ashkenaz`
  - Reads: Hebrew text. The Chabad-nusach version Sefaria also keeps under this title is not listed, so the nusachim don't mix.
  - Reads: The Metsudah Selichos, translated by Rabbi Avrohom Davis
- **Kinnot for Tisha B'Av (Ashkenaz)** (קינות לתשעה באב (אשכנז)). `kinnot-ashkenaz`
  - Reads: Hebrew text
- **Lecha Dodi** (לְכָה דוֹדִי). Shlomo HaLevi Alkabetz, written c. 1525-1575. `lekha-dodi`
  - Reads: Hebrew text
- **Shalom Aleichem** (שלום עליכם). Prague. `shalom-aleichem`
  - Reads: Hebrew text
- **Yedid Nefesh** (ידיד נפש). Rabbi Elazar Azikri. `yedid-nefesh`
  - Reads: Hebrew text
- **Leshon Chachamim (the Ben Ish Chai)** (לשון חכמים). Yosef Hayyim, written c. 1885-1905, Baghdad. Sephardi. `leshon-chakhamim`
  - Reads: Hebrew text
- **Ma'aneh Lashon (Chabad)** (מענה לשון חב"ד). Lubavitch. Chassidish · Chabad. `maaneh-lashon-chabad`
  - Reads: Hebrew text
- **Ma'avar Yabok** (מעבר יבק). Aaron Berakhiah of Modena. `maavar-yabbok`
  - Reads: Hebrew text

*20th and 21st centuries*

- **Siddur (Nusach Ashkenaz, Sefard, Edot HaMizrach, Ari)** (סידור). `siddur`
  - Reads: The Metsudah Siddur, Hebrew (Nusach Ashkenaz)
  - Reads: The Metsudah Linear Siddur, translated by Rabbi Avrohom Davis
  - Reads: Siddur Ashkenaz, Sefard and Edot HaMizrach (Torat Emet). The Torat Emet digital text. Sefaria lists it as public domain on Siddur Edot HaMizrach and Siddur Sefard, and lists no license on Siddur Ashkenaz, which is in by Torat Emet's written permission (canon/permissions.yaml).
  - Reads: The Authorised Daily Prayer Book, translated by Rabbi Simeon Singer. Singer's Siddur, the standard prayer book of the United Synagogue in Britain for generations. Rabbi Simeon Singer (1846-1906) was minister of the New West End Synagogue in London.
- **The Koren Shalem Siddur (Ashkenaz)** (סידור קורן השלם). Translation and commentary by Rabbi Jonathan Sacks, Jerusalem. `koren-siddur`
  - Reads: Hebrew text
  - Reads: The Koren Siddur, translated by Rabbi Jonathan Sacks
  - Note: The canon's siddur entry lists the Koren Siddur as a wished-for edition; Sefaria keeps the Koren texts as separate titles, so they have their own entry here.
- **The Koren Rosh HaShana and Yom Kippur Mahzorim (Ashkenaz)** (מחזור קורן). Translation and commentary by Rabbi Jonathan Sacks, Jerusalem. `koren-mahzorim`
  - Reads: Hebrew text
  - Reads: The Koren Mahzorim, translated by Rabbi Jonathan Sacks
- **The Metsudah Linear Siddur, Nusach Sefard (weekday and Shabbat)** (סידור ספרד). Translated by Rabbi Avrohom Davis, New York. Chassidish. `metsudah-siddur-sefard-linear`
  - Reads: Hebrew text
  - Reads: The Metsudah Linear Siddur, Nusach Sefard, translated by Rabbi Avrohom Davis
- **The Metsudah Machzor for Rosh Hashanah and Yom Kippur (Ashkenaz)** (מחזור אשכנז). Translated by Rabbi Avrohom Davis, New York. `metsudah-machzor-ashkenaz`
  - Reads: Hebrew text
  - Reads: The Metsudah Machzor, translated by Rabbi Avrohom Davis

### Dictionaries and guides to learning

Dictionaries of the Hebrew and Aramaic of the texts, grammar, and guides to the method of the Talmud.

#### Hebrew and Tanakh

*Geonim (about 600-1040)*

- **Machberet Menachem** (מחברת מנחם). Menachem ben Saruk, 10th century. `machberet-menachem`
  - Reads: Hebrew text. The London 1854 printing. Public domain.
  - Note: An early dictionary of Biblical Hebrew, arranged by root. Rashi often cites it by name ("Menachem"), so it lets RabAI show where Rashi's explanation of a word comes from.

*Rishonim (about 1040-1550)*

- **Sefer HaShorashim** (ספר השרשים). Rabbi David Kimchi (Radak), 1160-1235. `radak-sefer-hashorashim`
  - Reads: Hebrew text. The Berlin 1847 printing (ed. Biesenthal and Lebrecht), digitized in Sefaria's dictionary data. Public domain by age.
  - Note: The Radak's dictionary of the roots of Biblical Hebrew, by a Rishon. The backbone for teaching roots: learn a root once and recognize it across Tanakh, the siddur, and the Mishnah.
- **Sefat Yeter (Ibn Ezra)** (שפת יתר). Abraham ibn Ezra, written c. 1140-1142, Lucca, Italy. `sefat-yeter`
  - Reads: Hebrew text
- **Sefer HaBachur (Rabbi Eliyahu Bachur's Hebrew grammar)** (ספר הבחור). Rabbi Eliyahu Bachur (Elia Levita), 1469-1549, Italy and Germany. `sefer-habachur`
  - Reads: Hebrew text (Isny, 1542, and Mantua, 1556)
  - Waiting for your decision: English, translated by Betzalel Avraham Feinstein (2026) (Part 2).
  - Note: A classic grammar of Hebrew, for teaching people to read the texts. Its author also taught Hebrew to Christian scholars, for which some rabbis of his time criticized him (to confirm).

#### The Talmud and Midrash

*Rishonim (about 1040-1550)*

- **HeAruch** (הערוך). Rabbi Natan ben Yechiel of Rome, about 1035-1106. `aruch`
  - Reads: Hebrew text, Lublin 1883 printing. An earlier printing, without the notes Alexander Kohut added in his Aruch HaShalem. The board decides which edition to use; this one is public domain and is used for testing.
  - Note: The classic dictionary of the words of the Talmud and Midrash, written by a Rishon. The first place RabAI looks for the meaning of a word in the Gemara.
- **Darkhei HaTalmud** (דרכי התלמוד). Isaac Canpanton, written c. 1400-1460. `darkhei-hatalmud`
  - Reads: Hebrew text

*Acharonim (about 1550-1900)*

- **Mevo HaTalmud (Rabbi Zvi Hirsch Chajes)** (מבוא התלמוד). Rabbi Zvi Hirsch Chajes, written c. 1835-1845, Zhovkva. `mevo-hatalmud-chajes`
  - Reads: Hebrew text
- **Hafla'ah SheBa'arachin (Rabbi Yeshaya Berlin on the Arukh)** (הפלאה שבערכין). Isaiah Berlin, written c. 1840-1890, Breslau, Prussia. `haflaah-shebaarakhin`
  - Reads: Hebrew text
- **The Chida's Midbar Kedemot, Devash LeFi and Ayin Zokher** (מדבר קדמות; דבש לפי; עין זוכר). Hayyim Joseph David Azulai (Chida). Sephardi. `chida-encyclopedic-works`
  - Reads: Hebrew text

*20th and 21st centuries*

- **A Dictionary of the Targumim, the Talmud Babli and Yerushalmi, and the Midrashic Literature**. Marcus Jastrow, 1829-1903. `jastrow`
  - Reads: The original edition (1886-1903) [English] (used only for what words mean). The London 1903 printing, digitized in Sefaria's dictionary data. Public domain by age. In the private testing library as a word tool only (Josh, 2026-10-06): RabAI may use it for what a word means, never for history or belief.
  - Note: The standard English dictionary of Talmudic Aramaic and Hebrew, used widely in yeshivos and by English-speaking learners. Its author was not Orthodox: he is generally counted among the founders of what became Conservative Judaism (reviewers confirm). Proposed for word meanings only, never as a source for history or belief, with the Aruch, Rashi and Targum preferred wherever they differ. The board decides (founding spec, open question 13).

#### Other works

- **Two works of the Tosafot Yom Tov: Derush Chiddushei HaLevanah and Tzurat Beit HaMikdash** (דרוש חדושי הלבנה; צורת בית המקדש). Yom Tov Lipmann Heller (Tosefot Yom Tov), Prague. `tosafot-yom-tov-shorter-works`
  - Reads: Hebrew text
  - Reads: Translated by Rabbi Eliyahu Touger

### Articles from organizations' websites

Teachers' explanations for today's readers, copied by the organization's written permission. RabAI never treats them as sources: only the texts confirm a point.

- **Aish.com: Ask the Rabbi**. Aish.com's rabbis. For people new to observance. `aish-ask-the-rabbi`
  - Reads: Aish.com, Ask the Rabbi (English)
  - Note: Questions people sent to Aish.com, each with a rabbi's written answer, filed by topic (God and spirituality, holidays and Shabbat, mitzvot, lifecycle, the Bible, Jews and non-Jews). Left out: the Arab-Israeli conflict and Israel today (politics), and the video answers.
- **Aish.com: The weekly Torah portion**. Many writers (Aish.com). For people new to observance. `aish-torah-portion`
  - Reads: Aish.com, The weekly Torah portion (English)
  - Note: Aish.com's columns on the weekly parsha, for beginners, intermediate learners, and parents and children: among them Rabbi Frand, the Shem MiShmuel, What's Bothering Rashi?, Mayanot, M'oray Ha'Aish, The Guiding Light, Covenant and Conversation (Rabbi Jonathan Sacks) and Shabbat Shalom Weekly. For the board: who writes the column "Blogging the Bible" (550 articles) is to be confirmed. Left out: coloring pages and the video and audio columns.
- **Aish.com: Judaism 101**. Many writers (Aish.com). For people new to observance. `aish-judaism-101`
  - Reads: Aish.com, Judaism 101 (English)
  - Note: Aish.com's introductions to the mitzvot, the lifecycle (birth, bar and bat mitzvah, weddings, mourning) and the Torah, written for people new to Jewish practice.
- **Aish.com: The laws of blessings and of Shabbat**. Aish.com. For people new to observance. `aish-halacha-series`
  - Reads: Aish.com, Laws of Blessings and Laws of Shabbat (English)
  - Note: Two series on practical halacha, marked advanced on Aish.com: the laws of blessings and the laws of Shabbat. Practical questions still go to a person's own rabbi.
- **Aish.com: Shabbat**. Many writers (Aish.com). For people new to observance. `aish-shabbat`
  - Reads: Aish.com, Shabbat (English)
  - Note: Aish.com's guide to Shabbat: how to keep it, from Friday night to Havdalah, and essays on its meaning. Left out: its recipes and songs.
- **Aish.com: The holidays**. Many writers (Aish.com). For people new to observance. `aish-holidays`
  - Reads: Aish.com, The holidays (English)
  - Note: Aish.com's guides to the holidays and fast days: how to keep them and essays on their meaning, from Elul through Tisha B'Av. Left out: recipes, crafts and games, the videos, and Israel's national days (Yom HaAtzmaut, Yom HaZikaron, Yom Yerushalayim), whose observance differs between Orthodox communities; the board may add them.
- **Aish.com: Jewish thought**. Many writers (Aish.com). For people new to observance. `aish-jewish-thought`
  - Reads: Aish.com, Jewish thought (English)
  - Note: Rabbi Noah Weinberg's 48 Ways to Wisdom and his other teachings, Aish.com's philosophy section (the big questions), prayer and Kabbalah, and spiritual practices.
- **Aish.com: Personal growth and relationships**. Many writers (Aish.com). For people new to observance. `aish-personal-growth`
  - Reads: Aish.com, Personal growth and relationships (English)
  - Note: Articles on personal growth, dating, marriage and raising children, many by rabbis and teachers and some by other writers. For the board: these are the least formal of Aish.com's sections; keep, narrow or drop them.
- **Aish.com: Crash Course in Jewish History**. Rabbi Ken Spiro. For people new to observance. `aish-crash-course-history`
  - Reads: Aish.com, Crash Course in Jewish History (English)
  - Note: Rabbi Ken Spiro's Crash Course in Jewish History, from Avraham to the present, as Aish.com publishes it.
- **Aish.com: Learn Hebrew**. Aish.com. For people new to observance. `aish-learn-hebrew`
  - Reads: Aish.com, Learn Hebrew (English)
  - Note: Aish.com's series for learning to read Hebrew.
