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
| Aish | 48 Ways to Wisdom, plus articles and divrei Torah (letter drafted: [`outreach/aish.md`](outreach/aish.md)) |
| Chabad.org | Articles, Q&A, and their translations (letter drafted: [`outreach/chabad-org.md`](outreach/chabad-org.md)) |
| Koren / Maggid | The Talmud, A Reference Guide; Rav Soloveitchik volumes they publish; confirming the license of the Koren Yerushalmi files on Sefaria (Shekalim so far) |
| OU Press and the Toras HoRav Foundation | Rav Soloveitchik's works; Rav Aryeh Kaplan's NCSY titles |
| Moznaim | Rav Aryeh Kaplan's Handbook of Jewish Thought and other titles |
| Ktav | Rav Kaplan's "Immortality, Resurrection, and the Age of the Universe" and Soloveitchik titles (verify) |
| Feldheim | Strive for Truth! (Michtav MeEliyahu in English); Shemirat Shabbat KeHilchata in English; The Practical Talmud Dictionary (verify) |
| Mossad HaRav Kook | Da'at Mikra |
| ArtScroll/Mesorah (and Shaar Press) | Rav Twerski's books; the Schottenstein Talmud and Yerushalmi |
| Families and institutions of the poskim | Igrot Moshe (Rav Moshe Feinstein's family); Yabia Omer and Yechave Da'at (Rav Ovadia Yosef's family); Yalkut Yosef (Rav Yitzchak Yosef); Minchat Shlomo (Rav Shlomo Zalman Auerbach's family); Michtav MeEliyahu in Hebrew (the Dessler family); Shemirat Shabbat KeHilchata in Hebrew (the Neuwirth family); Alei Shur (Rav Wolbe's family, verify); Netivot Shalom (the Slonim institutions, verify); Kehillos Yaakov (the Kanievsky family); Kovetz Shiurim (Rav Elchonon Wasserman's family, verify); Chiddushei HaGriz (the Brisk family, verify) |

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
