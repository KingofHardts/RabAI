# Word-by-word translations of the siddur: progress

Josh asked (2026-11-10) for RabbAI's translation library to hold a word-by-word translation of
every line of Siddur Ashkenaz and of the Koren Shalem Siddur, made in Claude Code sessions (not
the API), with the Metsudah Linear Siddur (Rabbi Avrohom Davis) as the guide to each word's
meaning. How it is done: `docs/session-translation.md`, "A siddur, word by word".

This page is kept by the session doing the work: one row for each job, as its sealed file is
pushed. Counts only, never text.

What there is to do (counted from the live app on 2026-11-10):

| Siddur | Hebrew lines | Hebrew words |
|---|---|---|
| Siddur Ashkenaz | 1,549 | about 31,800 |
| The Koren Shalem Siddur; Ashkenaz | 3,385 (first counted as 3,530; see Totals) | about 97,400 |

Order: weekday Shacharit, then Mincha, Maariv, Shabbat, then the rest; Siddur Ashkenaz first.

## Jobs

| Job | Siddur and part | Lines sent | Kept | Unsure lines checked | Sealed file |
|---|---|---|---|---|---|
| 1 | Siddur Ashkenaz: weekday Shacharit, from Modeh Ani to the Half Kaddish after Yishtabach | 200 | 200 | 9 (4 words corrected) | 2026-11-10-1 |
| 2 | Siddur Ashkenaz: weekday Shacharit, from Barchu through the Amidah and Avinu Malkenu into Tachanun for Monday and Thursday | 200 | 200 | 8 (3 words corrected) | 2026-11-10-2 |
| 3 | Siddur Ashkenaz: the rest of weekday Shacharit (Tachanun, the Torah reading, Ashrei and Uva Letzion, the Song of the Day, Aleinu) and the start of Minchah | 200 | 200 | 8 (2 words corrected) | 2026-11-10-1 (third) |
| 4 | Siddur Ashkenaz: weekday Minchah (the Amidah, Avinu Malkenu, Tachanun, Aleinu) and the start of Maariv | 200 | 200 | 12 (none needed correcting) | 2026-11-10-3 |
| 5 | Siddur Ashkenaz: weekday Maariv (the Amidah, counting the Omer, Aleinu, the blessing of the moon, the Shema before sleep) | 200 | 200 | 13 (none needed correcting) | 2026-11-10-2 |
| 6 | Siddur Ashkenaz: the end of weekday Maariv (the Shema before sleep), Kabbalat Shabbat, and Shabbat Maariv up to the Omer | 200 | 200 | 6 (1 short form corrected) | 2026-11-10-1 |
| 7 | Siddur Ashkenaz: Friday night at home (blessing the children, Shalom Aleichem, Kiddush, the songs) | 200 | 200 | 14 (1 line corrected) | 2026-11-10-2 |
| 8 | Siddur Ashkenaz: the rest of the Friday-night songs, Bameh Madlikin, Birkat HaMazon, and Hallel for Rosh Chodesh (the last lines) | 149 | 149 | 15 (2 lines corrected) | 2026-11-10-1 |
| 9 | Koren: weekday morning from On Waking through the blessings, the offerings, and the start of Pesukei DeZimra | 200 | 200 | 16 (none needed correcting) | 2026-11-10-2 |
| 10 | Koren: weekday morning, the blessings of the Shema, the Amidah, Avinu Malkenu, Tachanun and the start of the Torah reading | 200 | 200 | 9 (none wrong; 6 slash forms tidied) | 2026-11-10-1 |
| 11 | Koren: weekday morning from the Torah reading to the end (the daily psalm, the readings after the service, personal prayers) and the start of weekday Minchah | 200 | 200 | 12 (1 word corrected) | 2026-11-10-1 |
| 12 | Koren: weekday Minchah (from the Amidah on) and weekday Maariv, into counting the Omer | 200 | 200 | 8 (1 word corrected) | 2026-11-11-1 |
| 13 | Koren: the end of counting the Omer, the Shema before sleep, candle lighting, Kabbalat Shabbat, and Shabbat Maariv through Kiddush | 200 | 200 | 9 (none needed correcting) | 2026-11-11-1 |
| 14 | Koren: the end of Shabbat Maariv, Kiddush and the songs of Friday night, and Shabbat morning from Pesukei DeZimra into the blessings of the Shema | 200 | 200 | 22 (none needed correcting) | 2026-11-11-1 |
| 15 | Koren: Shabbat morning (the Shema's blessings, the Amidah, the Torah reading, blessing the new month) into Musaf | 200 | 200 | 10 (none needed correcting) | 2026-11-11-1 |
| 16 | Koren: Shabbat Musaf (the Amidah, Ein Keloheinu, Aleinu, the Song of Glory, the daily psalm) and the Shabbat morning Kiddush and songs | 200 | 200 | 19 (none needed correcting) | 2026-11-11-1 |
| 17 | Koren: the end of the Shabbat morning songs, Shabbat Minchah, Barekhi Nafshi, and Ethics of the Fathers chapters 1 to 3 | 200 | 200 | 12 (1 word corrected) | 2026-11-11-1 |
| 18 | Koren: Ethics of the Fathers chapters 4 to 6, the third Shabbat meal, Maariv for the end of Shabbat, Havdalah, and the start of the festival blessings | 200 | 200 | 15 (none needed correcting) | 2026-11-11-1 |
| 19 | Koren: festivals (Hallel, Musaf for Rosh Chodesh, the lulav and the sukkah, the festival Amidah, Akdamut) | 200 | 200 | 18 (1 word corrected) | 2026-11-11-1 |
| 20 | Koren: festivals (the end of Akdamut, the festival Musaf, the priestly blessing, the prayers for dew and rain, the start of Hoshanot) | 200 | 200 | 20 (none needed correcting) | 2026-11-11-1 |
| 21 | Koren: Hoshanot (for Shabbat of Chol HaMoed and Hoshana Rabba), annulment of vows, Kiddush for Rosh HaShana, Kaparot, and the confession before Yom Kippur | 200 | 200 | 34 (none needed correcting; 2 short lines a helper skipped were written here) | 2026-11-11-1 |
| 22 | Koren: Chanukah, Yom HaZikaron and Yom HaAtzmaut additions, and Selichot for the fast days | 200 | 200 | 17 (1 word corrected) | 2026-11-11-1 |
| 23 | Koren: the end of Selichot, Grace after Meals, blessings on food and sights, and the cycle of life (Brit Milah, wedding blessings, prayers in illness). Job 22's count is corrected here: 199 of its lines were kept, and 199 of this job's, because one line of the library is an English instruction ("The Ark is closed.") with no Hebrew to translate | 200 | 199 | 12 (none needed correcting) | 2026-11-11-1 |
| 24 | Koren: the funeral service and prayers in a house of mourning, and the Torah readings for Mondays, Thursdays and Shabbat Minchah, Chanukah and fast days (most of these have no English in the library, so they also got a general translation) | 200 | 199 | 21 (3 words corrected; 21 general translations two helpers left out were added) | 2026-11-11-1 |
| 25 | Koren: the Torah readings for Purim, Pesach, Shavuot, Sukkot, Shemini Atzeret and Simchat Torah, and Berach Dodi (the last lines `send` offers) | 188 | 187 | 34 (12 words corrected) | 2026-11-11-1 |

## Totals

Finished on 2026-11-11.

| Siddur | Lines with a word-by-word list | What is left |
|---|---|---|
| Siddur Ashkenaz | 1,549 of 1,549 | nothing |
| The Koren Shalem Siddur; Ashkenaz | 3,384 | nothing that can be translated (see below) |

`send` now offers nothing for either siddur except one Koren line, "Selihot for the Seventeenth of
Tammuz 84": the library holds an English instruction ("The Ark is closed.") where its Hebrew
should be, so there is no Hebrew word to translate. The count of 3,530 Koren lines at the top was
too high: the library holds 3,385 Hebrew lines for Koren. The other 145 were the lines of
"Hoshanot for Shabbat Hol HaMo'ed" and "Hoshanot for Hoshana Raba" counted a second time, because
the app's "Hoshanot" section also returned theirs (their names begin with the same word). That
was a fault in the reader, fixed on 2026-11-11, and the "Ark is closed" line is now shown as the
English instruction it is.

Things to know:
- Before `collect`, run `npx tsx scripts/words-join.ts <job folder>` and then
  `npx tsx scripts/words-check.ts <job folder>` (from `web/`). The app counts words joined by a
  makaf as one word; the first joins answer lines that split them, the second lists every passage
  where a word still has no English. `collect` alone keeps a list with up to 40% of its words
  empty, so don't rely on its count. Every list sent here passed the check with no word empty.
- Lines with no English in the library also got RabbAI's own general translation, made without
  the Metsudah: in Siddur Ashkenaz about 155 lines (two meditations, the counting of the Omer,
  some Friday-night songs, Hallel for Rosh Chodesh); in Koren the Torah readings and a few others.
- The Metsudah guide covered about 1,400 of Koren's 3,384 lines: most of the weekday services and
  Friday night, little of Shabbat day, the festivals, Selichot or the Torah readings (the Metsudah
  text in the library doesn't have them). Those lines follow Rabbi Sacks's English and the plain
  Hebrew, and verses of the Torah follow Rashi.
- A guide often lists several Metsudah lines for one passage, some sharing only an opening
  formula (the start of a blessing). The helpers were told to use only the words that match.
- Corrected on 2026-11-11: in Koren's weekday Amidah, the healing prayer ("The Amida 37"), one
  word pair read "son of daughter of". The line was sent again with "son of / daughter of" and
  "to the sick man / to the sick woman", and the import replaced the earlier list.
- The "Sealed file" column is only a rough guide: the inbox clears each file after importing it,
  so the same file names were used again.
