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
| The Koren Shalem Siddur; Ashkenaz | 3,530 | about 104,600 |

Order: weekday Shacharit, then Mincha, Maariv, Shabbat, then the rest; Siddur Ashkenaz first.

## Jobs

| Job | Siddur and part | Lines sent | Kept | Unsure lines checked | Sealed file |
|---|---|---|---|---|---|
| 1 | Siddur Ashkenaz: weekday Shacharit, from Modeh Ani to the Half Kaddish after Yishtabach | 200 | 200 | 9 (4 words corrected) | 2026-11-10-1 |
| 2 | Siddur Ashkenaz: weekday Shacharit, from Barchu through the Amidah and Avinu Malkenu into Tachanun for Monday and Thursday | 200 | 200 | 8 (3 words corrected) | 2026-11-10-2 |
| 3 | Siddur Ashkenaz: the rest of weekday Shacharit (Tachanun, the Torah reading, Ashrei and Uva Letzion, the Song of the Day, Aleinu) and the start of Minchah | 200 | 200 | 8 (2 words corrected) | 2026-11-10-1 (third) |
| 4 | Siddur Ashkenaz: weekday Minchah (the Amidah, Avinu Malkenu, Tachanun, Aleinu) and the start of Maariv | 200 | 200 | 12 (none needed correcting) | 2026-11-10-3 |

## Totals

Siddur Ashkenaz: 800 of 1,549 lines. Koren: 0 of 3,530.

Notes for whoever goes on:
- Before `collect`, run `npx tsx scripts/words-join.ts <job folder>` and then
  `npx tsx scripts/words-check.ts <job folder>` (from `web/`). The app counts words joined by a
  makaf as one word; the first joins answer lines that split them, the second lists every passage
  where a word still has no English. `collect` alone keeps a list with up to 40% of its words
  empty, so don't rely on its count.
- Two lines of job 1 (the meditations before the tallit and tefillin) have no English in the
  library, so they also got a general translation, made without the Metsudah.
