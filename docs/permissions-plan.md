# Getting the works we don't have yet

Status on 2026-10-06, after loading everything the open licenses allow. The licensing rules are
in [`licensing.md`](licensing.md); the partners we plan to approach are in
[`../canon/partners.yaml`](../canon/partners.yaml). Contact details and signed agreements stay
in the maintainer's own records, not in this public repo.

## Found and loaded (private testing library)

- **Talmud Yerushalmi:** the first printing (Venice, 1523), public domain by age. There is no
  open Orthodox English translation, so RabAI translates the Yerushalmi itself, says the
  translation is its own, and is given Jastrow's and the Aruch's entries for the words of the
  line. Ohr LaYesharim (Machon HaYerushalmi), a Hebrew commentary on twelve tractates, is
  loaded alongside it.
- **HeAruch:** the Lublin 1883 printing, without Kohut's notes.
- **The Radak's Sefer HaShorashim:** the Berlin 1847 printing.
- **Machberet Menachem:** the London 1854 printing.
- **Jastrow's dictionary:** the 1903 printing, as a word tool only.
- **Iggeret Rav Sherira Gaon:** as printed in Seder HaChachamim (Oxford, 1888).

## Probably public domain, but no clean digital text yet

These need a typed text, not permission. Each still needs its copyright checked (the author's
death year and the first printing).

| Work | Why it is probably public domain |
|---|---|
| Rav David Zvi Hoffmann: Melamed LeHo'il and his German commentaries | He died in 1921; printed 1905-1932. (The later Hebrew translations of his commentaries are copyrighted.) |
| Shaarei Yosher (Rav Shimon Shkop) | Printed 1928; he died in 1939. |
| Or Yisrael (Rav Yisrael Salanter) | Printed 1900. |
| Mevo HaTalmud, Halichot Olam, Yad Malachi | Medieval and 18th-century works. |
| Chochmah U'Mussar (the Alter of Kelm) | He died in 1898, but it was first printed in 1957: check. |
| Chiddushei Rabbeinu Chaim HaLevi on the Rambam | Rav Chaim died in 1918; first printed 1936: check. |

Ways to get a text, best first:

1. **Ask Sefaria to add it.** Sefaria takes requests and digitizes public-domain books, usually
   releasing them as public domain or CC0, so they flow into our library automatically.
2. **Hebrew Wikisource** has many public-domain sefarim typed by volunteers (CC-BY-SA). Check
   each one.
3. **Scan and OCR** from public-domain scans (the National Library of Israel, archive.org).
   Dicta's tools read rabbinic Hebrew well; a person proofreads before anything is used.

## Under copyright: permission needed

Grouped by who to ask, so one conversation can cover several works. "(verify)" means we still
have to confirm who holds the rights.

| Who to ask | Works |
|---|---|
| Aish | 48 Ways to Wisdom, plus articles and divrei Torah. **Written OK received** (reported by the maintainer, 2026-10-10; `canon/permissions.yaml`, `aish`): complete access, private use only, not public for now. Put its wording on file here. Aish couldn't send an export, so its ten Torah sections (`canon/canon.yaml`, category `articles`) are copied from its website through its own interface (`tools/collection_build.py`). |
| Chabad.org | Articles, Q&A, and their translations. **Written OK received** (reported by the maintainer, 2026-10-10; `canon/permissions.yaml`, `chabad-org`): complete access, private use only, not public for now. Put its wording on file here; before any public use, texts it hosts by another publisher's permission (Judaica Press's Tanach, Moznaim's Mishneh Torah, to confirm) may need that publisher's OK. **One more thing to ask:** Chabad.org couldn't send an export, and its website shows every robot a Cloudflare check that a copying program can't pass (and shouldn't try to). Ask its web team to let RabAI's copier through: a Cloudflare rule that skips the check for requests whose user agent starts with `RabAIBot`, or one that skips it when a secret header they choose is present (they give the header's value to Josh, who adds it as a GitHub secret; it is never written in this repo). The copier keeps to their robots.txt and its 5-second pause between requests. A note for their web team is drafted in `docs/outreach/chabad-org-access.md`. |
| TorahAnytime | Recorded shiurim. Not yet asked. Audio and video would play from TorahAnytime; only text (titles, speakers, transcripts) would be stored. |
| Koren / Maggid | The Talmud, A Reference Guide; Rav Soloveitchik volumes they publish; confirming the license of the Koren Yerushalmi files on Sefaria (Shekalim so far) |
| OU Press and the Toras HoRav Foundation | Rav Soloveitchik's works; Rav Aryeh Kaplan's NCSY titles |
| Moznaim | Rav Aryeh Kaplan's Handbook of Jewish Thought and other titles |
| Ktav | Rav Kaplan's "Immortality, Resurrection, and the Age of the Universe" and Soloveitchik titles (verify) |
| Feldheim | Strive for Truth! (Michtav MeEliyahu in English); Shemirat Shabbat KeHilchata in English; The Practical Talmud Dictionary (verify) |
| Mossad HaRav Kook | Da'at Mikra |
| ArtScroll/Mesorah (and Shaar Press) | Rav Twerski's books; the Schottenstein Talmud and Yerushalmi |
| Families and institutions of the poskim | Igrot Moshe (Rav Moshe Feinstein's family); Yabia Omer and Yechave Da'at (Rav Ovadia Yosef's family); Yalkut Yosef (Rav Yitzchak Yosef); Minchat Shlomo (Rav Shlomo Zalman Auerbach's family); Michtav MeEliyahu in Hebrew (the Dessler family); Shemirat Shabbat KeHilchata in Hebrew (the Neuwirth family); Alei Shur (Rav Wolbe's family, verify); Netivot Shalom (the Slonim institutions, verify); Kehillos Yaakov (the Kanievsky family); Kovetz Shiurim (Rav Elchonon Wasserman's family, verify); Chiddushei HaGriz (the Brisk family, verify) |

## Requests from the license pass (2026-10-07)

The license pass went through every openly hosted text the canon still leaves out
(`docs/library-comparison.md`, "Update, later on 2026-10-07"). What it could bring in by an open
license or by age is now in the canon. What is left needs someone's word. Each request below
names the organization, what we would ask, why, and the exact titles and Sefaria version names.
Nothing has been sent; the maintainer decides who asks and when.

Most of these texts are traditional works long out of copyright. The question is usually not
the text but the digital copy: who typed it, from which printing, and on what terms. So the
cheapest requests are for a sentence: "you may use it" or "it copies the printing of
[city, year]". Either answer is enough for the testing library (the age rule in
`canon/canon.yaml` needs the printing named).

### Sefaria (one request covers the most)

**What to ask:** (1) the license, or the source printing, of the texts Sefaria digitized
itself and lists with no license; (2) whether files with no license inside an otherwise open
digital edition carry the same license as the rest of that edition; (3) whether texts copied
from Hebrew Wikisource may be labeled CC-BY-SA, as Wikisource is; (4) whether they would add
Solomon Buber's edition of Pesikta DeRav Kahana (Lyck, 1868), which is public domain; (5) the
licenses of their three Hebrew Zohar files ("Vocalized Zohar, Israel 2013", "Sulam Edition,
Jerusalem 1945" and "Hebrew Translation", title `Zohar`) and the Hebrew versions of the Idra
Zuta; (6) whether they would import a typing of the Mantua or Vilna printing of the Zohar, for
example Hebrew Wikisource's.

**Why:** these are central works, and one reply from Sefaria clears most of them at once.

- **Sefaria's own editions with no license listed:** Meiri on Shas ("Meiri on Shas", 28
  tractates, about 30 MB; note that much of the Meiri was first printed in the 20th century
  from manuscripts, so this may copy an edition that is still copyrighted, which is worth
  asking about); Radak on Nach ("Radak on Nach", 23 books); Ramban on Exodus ("Sefaria
  Vocalized Edition"); Mei HaShiloach ("Vocalized Edition"); Shita Mekubetzet on Ketubot;
  Yad Ramah on Bava Batra; the Sefard and Edot HaMizrach machzorim; Olat Re'iyah ("Rav Kook
  public files").
- **Gaps inside open digital editions** (same version name, most files public domain, a few
  with no license): the Friedberg Edition of the Mishneh Torah commentaries (49 of 1,435
  files: 30 halachot of Lechem Mishneh, 11 of Kessef Mishneh, 3 of the Ra'avad's glosses, and
  single files of Yekar Tiferet, Yad Eitan, Ben Aryeh and Melekhet Shelomoh); Torat Emet
  ("ToratEmet": 17 of 266 files, among them the Maggid Mishneh, Lechem Mishneh and Ra'avad on
  Divorce, Levirate Marriage, Sales, Neighbors and others; "Torat Emet 363": 5 of 151,
  Kessef Mishneh files); "Midrash Rabbah -- TE" (6 of 10; Vayikra, Bamidbar, Devarim and
  Esther Rabbah are the ones we have from nowhere else); On Your Way ("On Your Way": 4 of
  280, among them Ramban on Exodus and the Malbim on I Samuel; "On Your Way - new": 3 of 7,
  among them the Malbim on Isaiah and the Malbim's Beur HaMilot on Psalms).
- **Texts from Hebrew Wikisource listed with no license:** Avodat HaKodesh (Rabbi Meir ibn
  Gabbai), the Malbim's Ayelet HaShachar, Nefesh David on the Zohar, the Chabad weekday
  siddur, the Edot HaMizrach Yom Kippur machzor, Derashot HaRan ("wikisource"), the Meiri on
  Berakhot ("Wikisource"), Rav Kook's Orot HaTeshuvah and Ein Ayah.
- **Not on Sefaria at all:** Buber's Pesikta DeRav Kahana (Lyck, 1868). Sefaria has only
  Mandelbaum's 1987 Jewish Theological Seminary edition, which waits on library question 9.

### Torat Emet (toratemetfreeware.com)

**Answered (2026-10-10): yes, for private use.** The maintainer reported that Torat Emet gave
complete access to its texts, but not for public use for now. That covers the private testing
library; a public launch needs their further permission. The permission is recorded in [`canon/permissions.yaml`](../canon/permissions.yaml)
(`torat-emet`) and named on every version of Torat Emet's text in the canon, so its files with no
license on Sefaria now enter the testing library: Vayikra, Bamidbar, Devarim, Esther, Bereshit
and Shemot Rabbah, the Mishneh Torah sections, the Maggid Mishneh, Lechem Mishneh, Kessef Mishneh
and Ra'avad files listed above, Shemirat HaLashon and Tzipita LeYeshuah in Hebrew, the full Hebrew
of Sefer HaChinuch, Siddur Ashkenaz, Bartenura on Mikvaot, Shulchan Aruch Choshen Mishpat, and the
vocalized Zohar. Still to do: put the email's own words on file (copy them here), and ask which printing each
title was typed from. Torat Emet's Hebrew translation of the Zohar stays out until its
translator is known and the board has seen it. One Choshen Mishpat file that Sefaria credits to
Wikimedia Commons, not to Torat Emet, stays out.

**What we asked:** written permission to use their digital texts, and for each title which
printing it was typed from. **Why:** Sefaria's labels for their files are inconsistent (above),
and their Midrash Rabbah has added vowels, so it cannot be treated as a copy of an old printing.
**Titles:** Vayikra, Bamidbar, Devarim and Esther Rabbah ("Midrash Rabbah -- TE"); the Chafetz
Chaim's Shemirat HaLashon ("Shemirat HaLashon -- Torat Emet 370"; we have only its English);
the Maggid Mishneh, Lechem Mishneh, Kessef
Mishneh and Ra'avad files listed above; the Chafetz Chaim's Tzipita LeYeshuah ("Tzipita
L'Yeshuah -- Torat Emet"; its English is now in).

**The Zohar (added 2026-10-07):** the license of their vocalized Zohar ("Zohar Menukad", online
file f_01148), which is the file Sefaria calls "Vocalized Zohar, Israel 2013", and of their
Hebrew translation of the Zohar ("זוהר בתרגום עברי"); who vocalized and annotated the one and
translated the other. Also confirm the license of their texts that Sefaria labels "Public
Domain" (Zohar Chadash, Tikkunei Zohar - Vocalized, Sefer HaBahir, Midrash Tanchuma): their own
terms page appears to say CC BY-NC-SA 2.5, which is enough for private testing but not for a
public launch.

### The Sulam edition of the Zohar

**What to ask:** permission to use the Aramaic text of Rabbi Yehuda Ashlag's Sulam edition
(Sefaria: "Sulam Edition, Jerusalem 1945"). **Who:** whoever now holds its rights, still to be
identified.

### On Your Way (tora.ws)

**What to ask:** permission, and which printing each text copies. **Titles:** Ramban on
Exodus ("On Your Way"; the most important gap in the Ramban on the Torah), the Malbim on I
Samuel and Isaiah and on Psalms (Beur HaMilot), and Da'at Tevunot of the Ramchal ("ספר דעת
תבונות").

### The Friedberg Jewish Manuscript Society

**What to ask:** confirmation that the 49 Friedberg Edition files Sefaria lists with no license
are under the same terms as the rest of their edition (see the Sefaria list above). **Why:** it
completes the Lechem Mishneh and Kessef Mishneh on the Mishneh Torah.

### Mechon Mamre

**What to ask:** permission to use their Talmud Yerushalmi and Tosefta (Sefaria version
"Mechon-Mamre", 39 files with no license). **Why:** a second Hebrew text of the Yerushalmi beside
the Venice 1523 printing we have, and the Tosefta Tahorot. Low priority.

### Machon Yerushalayim

**What to ask:** written confirmation of the public-domain label Sefaria gives their Maharal
volumes with Rabbi Yehoshua Hartman's notes (1997-2023), and permission for Rabbi Hartman's
notes themselves (Sefaria titles "Notes by Rabbi Yehoshua Hartman on" Derashat Shabbat
HaGadol, Derush al HaTorah, Gevurot Hashem and Netzach Yisrael; about 13 MB, no license
listed). **Why:** recent publications labeled public domain should be confirmed before any
public use.

### Breslov: Breslov Research Institute, rabenubook.com, Or HaGanuz, Maleh Vigadish

**What to ask:** from the Breslov Research Institute, confirmation that CC-BY-NC covers a free
app with voluntary donations, and whether more of their Likutey Halakhot (Hebrew and English)
will be released; from the others, permission for their Hebrew texts. **Titles:** Shivchei
HaRan and Sichot HaRan ("rabenubook"), Likkutei Etzot ("Likutei Etzot - rabenubook.com"),
Likutei Halakhot (Or HaGanuz files), Likutei Tefilot ("Likutey Tefilos, Maleh Vigadish,
2021"). The English of all three works is now in, from the Breslov Research Institute.

### Sifrei Izhbitza-Radzin (Bnei Brak)

**What to ask:** permission for their editions. **Titles:** Beit Yaakov on the Torah ("Beit
Yaakov al HaTorah, Sifrei Izhbitza Radzin, Bnei Brak, 2006"), and Mei HaShiloach if Sefaria's
vocalized edition is theirs.

### Neirot Foundation

**What to ask:** permission for their Hebrew texts, and a line confirming who the Markels are
(their English is now in, marked "to confirm"). **Titles:** Sha'ar HaYichud of the Mitteler
Rebbe ("Neirot, 2023"), Kuntres HaHitpa'alut ("The Neirot Foundation, 2024").

### Kehot Publication Society

**What to ask:** permission for two vocalized texts Sefaria lists with no license. **Titles:**
Piskei HaSiddur and Seder Birkat HaNehenin ("Vocalized Edition - Kehot Publication Society").
Kehot's Derekh Mitzvotekha is already in under CC-BY-NC.

### Machon Eretz Hemdah and Yeshivat Har Bracha

**What to ask:** whether the volumes and translations Sefaria lists with no license are under
the same terms as their others. **Titles:** B'Mareh HaBazak volumes II and X ("Machon Eretz
Hemdah -- Vol. 2", "-- Vol. 10"); Peninei Halakhah, Women's Prayer, in English ("Peninei
Halakhah, English ed. Yeshivat Har Bracha").

### Metsudah Publications

**What to ask:** whether the few Metsudah files with no license are CC-BY like the rest of
Metsudah on Sefaria. **Titles:** the Metsudah Machzor for Yom Kippur (Hebrew and English,
paragraph edition), the Metsudah Selichos, Yedid Nefesh from the Metsudah Siddur, Seder
Ma'amadot, II Kings in the Metsudah Tanach series, and Numbers in the Shnayim Mikra Chumash.

### Senlake

**What to ask:** confirmation that their retypings are free to use and that they added nothing
of their own beyond typing. **Titles:** Benayahu ("Senlake edition 2019 based on Benayahu,
Jerusalem, 1905"; now in by age) and Ben Yehoyada (already in). Belt and braces only.

### Rav Kook's writings and Rav Soloveitchik's shiurim

**What to ask:** for Rav Kook's works, who holds the rights in the digital texts on Sefaria
("Rav Kook public files", the "Yehoshua Kahan collection", Wikisource) of Olat Re'iyah, Ein
Ayah, Orot HaTeshuvah and Shemonah Kevatzim (verify: the families and Machon HaRav Tzvi Yehuda
Kook). For Rav Soloveitchik, add Reshimot Shiurim (Kiddushin, Horayot, Sanhedrin; "Reshimot
Shiurim, Kiddushin, New York, 2022") to the OU Press and Toras HoRav request above.

### Mossad HaRav Kook

**What to ask:** add to the Da'at Mikra request: the Ramban's Torat HaAdam ("Mossad Harav
Kook, Jerusalem 1963", Rabbi Chavel's edition) and the Hebrew of Rav David Zvi Hoffmann's
commentaries on Exodus and Leviticus (2010, 2022).

### Not yet known who to ask

Abarbanel on the Prophets ("Abarbanel, Tel Aviv 1960"), Chomat Anakh (the Chida, "Jerusalem
1965"), Bereshit Rabbati ("Jerusalem, 1940", which we take to be Albeck's edition, also a scholar's
edition; to confirm),
Barukh SheAmar on the Haggadah ("Tel Aviv 1968"), and the Chida's Haggadah commentaries
("Jerusalem 1959"). These printings are too recent for the age rule.

## How to ask

1. **Start with the relationships.** Aish first, through Josh's connection; then Chabad.org.
   A yes from either is a strong reference for everyone else.
2. **Have the board in place first,** at least one rav who will put his name to it. Publishers
   and families will ask who stands behind the answers. The families of the poskim are best
   approached by a rav who knows them, not by a cold email.
3. **Ask for the least we need:**
   - use in the app only, never redistributed or shown in full;
   - short quotes in answers, always with the source named and a link to their page or book;
   - their text never changed, and never presented as their endorsement of an answer;
   - removal on request, at any time.
4. **Offer what helps them:** attribution and links that send learners to them, a private
   login to see how their content appears, and a way for them to flag anything.
5. **Settle the money question once.** RabAI is free with voluntary donations
   ([`licensing.md`](licensing.md)). Say so up front, and ask whether that fits their terms.
6. **Record every answer** in `canon/partners.yaml` (status only), and the edition's `notes`
   and `license` in `canon/canon.yaml` once permission is in writing.

## A short letter for publishers

> Shalom,
>
> I'm building RabAI, a free Torah learning app that answers questions from inside the
> Orthodox mesorah. Every answer rests on real sources: the app shows the exact words it
> relies on and links to them, and it never quotes a text it doesn't have. A board of
> Orthodox rabbanim approves every text before the app opens to the public.
>
> We would love to include [titles]. We'd use them only inside the app: short quotations in
> answers, always with the title and your name, and a link to where learners can get the
> book. We would never redistribute the text, change it, or suggest you endorse any answer,
> and we'd remove it whenever you ask. The app is free; we accept voluntary donations.
>
> Could we set up a short call? I'm happy to give you a private login so you can see exactly
> how your text would appear.
>
> With thanks,
> [Your name]
> [Phone and email]
