# Growing the library

How RabAI gets as many authentic, vetted Orthodox sources as possible, and what limits it today.

## Where the library stands

- **Nothing is approved yet.** The whitelist is empty until the board approves works and
  editions. That is a choice we made, not a technical limit.
- **The canon is a founding list.** It covers the core of Tanakh, the Oral Torah, halacha,
  and hashkafah and mussar. `python3 tools/validate.py` prints the current count.
- **English is the bottleneck.** Almost every classic sefer is available in Hebrew and is free
  to use. Most good Orthodox English translations are under copyright and need an agreement
  with the publisher.

## What is missing

| Area | Missing today | Examples |
|---|---|---|
| Nach | The standard Nach commentaries | Metzudot, Radak, Targum Yonatan |
| Mishnah | The standard Mishnah commentaries | Bartenura, Tosafot Yom Tov, Tiferet Yisrael |
| Aggadah | The Gemara's stories and teachings, gathered | Ein Yaakov |
| Parsha | The commentaries people use for a dvar Torah | Kli Yakar, Ha'amek Davar, Meshech Chochmah |
| Chassidus | The classic works on the parsha | Sfas Emes, Kedushas Levi, Noam Elimelech, Shem MiShmuel |
| Mussar | The mussar movement's own works | Or Yisrael, Chochmah U'Mussar |
| Halacha | More practical and responsa literature | Chayei Adam, Shu"t Chasam Sofer, English halacha handbooks |
| Divrei Torah | Modern English divrei Torah and articles | Partner organizations (below) |
| Shiurim | Recorded shiurim | Transcripts, with permission |
| Q&A | Archives of real questions answered by rabbanim | Partner organizations (below) |
| Language | Dictionaries of roots and words, for teaching people to read | Sefer HaShorashim (Radak), the Aruch, Machberet Menachem; Jastrow pending the board |

The classic works in this table are added to `canon/canon.yaml` as proposed.

## Six ways to get more

Ordered from fastest and cheapest to slowest and largest.

### 1. Classic Hebrew sefarim: free, and enormous

Seforim by authors who passed away long ago are in the public domain. That is most of the
mesorah: Tanakh and Targum, Mishnah and both Talmuds, the Rishonim, the Rambam, the Tur and
Shulchan Aruch, Mishnah Berurah, Aruch HaShulchan, and the classic works of mussar, Chassidus
and hashkafah. Thousands of volumes, at no cost.

Two cautions. A digital edition can carry its own license even when the printed text is
public domain, so check the license of the file we actually download. And the board still
approves each edition.

**RabAI reads Hebrew and Aramaic.** So it can learn from these sefarim and explain them in
English even where no approved English translation exists. Whenever it translates a passage
itself, the reader labels it as RabAI's translation, so nobody confuses it with a published
one, and the test set checks translation quality.

### 2. Open-licensed English

Some English translations are released under open licenses, many of them on Sefaria. Each
needs two checks: the translator must be Orthodox and approved by the board, and the license
must allow our use (see "Free with donations" in `licensing.md`).

### 3. Partner organizations: divrei Torah, articles, and Q&A

Orthodox organizations publish a great deal of Torah online for free. Examples to approach:
Aish (start here, given Josh's connection), Chabad.org, OU Torah, Torah.org, Ohr Somayach,
YUTorah, Yeshiva.org.il, the Peninei Halakha site, and The Rabbi Sacks Legacy.

What to offer them:

- RabAI is free and supported by donations. Their content is never sold.
- Every passage is credited to them by name, with a link back to their site.
- Their words are quoted as written and never altered.
- They can see how their content is used, and withdraw it at any time.
- It brings their Torah to people who would not have found it.

Each partner's own editorial standards are the first filter. The board approves each partner,
and spot-checks what comes in.

Track every conversation in [`canon/partners.yaml`](../canon/partners.yaml).

### 4. Publishers: the great English translations

ArtScroll/Mesorah, Koren, Feldheim, Kehot, Moznaim, Judaica Press, and Mossad HaRav Kook.
Start with one, prove the model, then approach the others. Koren is a reasonable first call,
since it already licenses its Talmud to Sefaria.

### 5. Large digital libraries

Some institutions hold vast digitized collections, for example the Bar-Ilan Responsa Project,
Otzar HaChochma, HebrewBooks.org (scans of public-domain seforim), AlHaTorah (digital Mikraot
Gedolot), and Dicta (an Israeli nonprofit building Hebrew text tools). These are larger,
slower agreements, for once RabAI has shown what it is.

Scanned seforim must be turned into searchable text first. That needs careful OCR and
proofreading, and Rashi script makes it harder.

### 6. Living rabbanim

Invite rabbanim to contribute divrei Torah and shiurim directly, through a contributors
program the board oversees. Recorded shiurim can be transcribed with the speaker's permission.

## How vetting keeps up

The board cannot read every page of a growing library, and it does not need to. It vets at the
level where trust actually lives:

| Level | What the board approves | Example |
|---|---|---|
| Classic sefer | The work and the edition | Mishnah Berurah, standard edition |
| Modern author | The author, or a series | Rav Aryeh Kaplan's books |
| Partner organization | The partner, then spot-checks | An organization's weekly parsha articles |
| Contributor | Each rabbi, then spot-checks | A rav who sends divrei Torah |

Signals the board can use, in the tradition's own terms:

- **Haskamos.** A sefer's approbations from recognized gedolim.
- **The author's standing** in an Orthodox community and among his peers.
- **The publisher** and its editorial standards.
- **Acceptance.** Whether the sefer is actually learned in yeshivos and quoted by poskim.

Two more safeguards:

- **Every passage keeps its label**: author, work, edition, and stream. RabAI says whose words
  it is quoting, and can give classic sources more weight than modern ones.
- **People can flag an answer.** Flags go to a review queue the board sees.

**Never in the library:** anonymous web pages, forums, comment sections, Wikipedia, or
content from anyone the board has not approved.

## Next steps

1. Board approves the first editions of the public-domain core.
2. Import those editions with their license details. The tools exist: the private testing
   library is built from Sefaria's public export by `tools/library_plan.py` and
   `tools/library_build.py` (GitHub Actions, "Build the testing library"), and the approved
   library will use the same tools on the whitelist.
3. Contact Aish about divrei Torah and articles, then Chabad.org. The letters are drafted in
   [`outreach/`](outreach/), and the plan for every work we still need is in
   [`permissions-plan.md`](permissions-plan.md).
4. Contact one publisher about an English translation.
