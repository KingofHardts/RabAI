# What other siddur apps do, and what RabbAI's siddur does now

Written 2026-11-15, at Josh's request: look again at the other siddur apps, find what they have
that we don't, and build what makes ours the best. The first round (2026-11-04) is in
`docs/siddur-features.md`; this page adds what that round missed and what was built now.

## What was looked at

The App Store, Google Play and the makers' own sites couldn't be opened from this session (the
network doesn't reach them), so what follows comes from search results that quote the listings and
reviews. It is a fair picture of what each app says it does, not a test of each one.

- **ArtScroll Smart Siddur.** Shows only the day's prayers, interlinear Hebrew and English, tap a
  phrase for its translation, zmanim, a luach, search, and settings for a house of mourning.
  Reviewers praise the content and complain of bugs and slow starts.
- **The Koren Tefilla app.** Three nusachim, the prayers of the day by the calendar, Rabbi Sacks's
  commentary, word by word or line by line, audio preparations, and **modes: davening with a
  minyan, as the chazzan, at a simcha or in mourning, and by place**. Reviewers found missing text
  and asked for dark mode and shortcuts to particular prayers.
- **YidKit.** A home screen that changes with the time of day, a smart siddur that shows or hides
  sections by the day, a full Tanach, and an Apple Watch app.
- **Siddur Torah Ohr (Chabad, Shafeh).** One button that knows which prayer is needed, shows only
  what applies to you, inserts in their place, Kiddush Levana, Me'ein Shalosh, daily Tehillim, and
  the verse for one's name at the end of the Amidah.
- **Chabad's Linear and Annotated siddurim.** Zmanim, a Jerusalem compass, and a **tefillin
  mirror**.
- **RustyBrick's SiddurApp.** Nusach choices, zmanim, a minyan finder, Hallel added on the right
  days, and bentching that **asks when the meal began** when you bentch after sunset.
- **Siddur One.** Knows the day, bentching for a bris, Sheva Brachot and the holidays, and the
  occasional prayers (Hoshanot, Bedikat Chametz, Hatavat Chalom).
- **Tefilor, Esh Siddur, Siddur Pro, Am Hazak.** Compass, reminders, Tefillat HaDerech, Kiddush
  Levana, and an Omer counter with reminders.
- **What reviewers ask for again and again:** complete, correct text; transliteration; more text
  sizes; an interlinear edition; dark mode; working offline; shortcuts to the prayers they use; and
  apps that work with a screen reader.

## Where RabbAI's siddur already leads

Most of what the other apps advertise was built in the first two rounds: the prayer for now, the
day's changes, only what is said today (now hidden, not folded: Josh's decision of 2026-11-15),
Israel or outside it, three nusachim, Rabbi Sacks's translation, the Metsudah's word-for-word
English beside it, word by word under each word, transliteration in two pronunciations, tap any
word for its meaning, the siddur's own instructions and marks, the laws it cites opened in place,
commentaries on each line, "Explain it" from RabbAI, dark mode, working offline, zmanim, the Omer,
Tehillim, yahrzeits, reminders, the compass, a minyan finder link and "Which bracha?".

No other app found lets you ask about a line and get an answer checked against the sources, or
opens the commentaries on the line you are saying.

## Built in this round

1. **Only what you say today** (Josh's request). In today's davening, what isn't said today is left
   out, with a note at the top of each prayer that says how many parts were left out and brings
   them back. "Today's, others folded" and "Everything" are the other choices. A prayer you open
   yourself is always shown.
2. **Davening with a minyan or alone** (the Koren app's minyan mode). Alone, the parts the siddur's
   own instructions say need a minyan are left out: Kaddish, Barchu, Kedushah and the leader's
   repetition, the Torah reading.
3. **"I'm leading"** (the Koren app's chazzan mode). The lines the siddur gives the Leader are
   marked with a bar, so they are easy to find.
4. **"I'm saying Kaddish"** (for a mourner or a yahrzeit). Every Mourner's and Rabbis' Kaddish is
   marked "You say this" and starred in "Jump to", and the mourner's lines are marked.
5. **No Tachanun in my shul today** (ArtScroll's house-of-mourning setting, and more). A groom, a
   bris, or a house of mourning: Tachanun is left out for today only, and tomorrow it goes back by
   itself. In a house of mourning, the Koren siddur's own instructions also leave out Lamenatzeach
   and the verse "As for Me" in Uva LeTzion, and those are left out too. (On Tisha B'Av that verse
   is now left out as well, as the same instruction says.)
6. **Bentching alone or with three.** Alone, the zimmun is left out.
7. **Pinned prayers** (Koren reviewers' "shortcuts to particular tefilos"). "Jump to" has "Pin to
   the Daven home"; pinned prayers appear as tiles on the Daven home, up to twelve.
8. **A tefillin mirror** (Chabad's apps). The front camera shown as a mirror, under the Daven
   home's tools. Nothing is recorded or sent, and the camera turns off when it is closed.
9. **Headings read properly.** "Mourner's Kaddish", not "Mourner'S Kaddish"; "Blessing of Land",
   not "Blessing Of Land".

## Next: worth building, once the board has seen the rule

These change what is said, so the halacha should be the board's before they are built.

- **Bentching after sunset** (RustyBrick asks when the meal began). A meal begun on Shabbat, Rosh
  Chodesh or a festival keeps its additions in bentching after nightfall. The app would ask "Did
  the meal begin before sunset?" when you bentch then.
- **A house of mourning, fully.** Beyond Tachanun and what Koren names: Hallel on Rosh Chodesh,
  Birkat Kohanim and other customs differ by community. Today only Koren's own instructions are
  applied.
- **The 30 days after the rain phrases change.** In the first 30 days, whether to repeat the Amidah
  when unsure if Mashiv HaRuach or VeTen Tal UMatar was said. A short note during those days.
- **The Omer, missed a day.** A "counted tonight" check is easy; what to say when a day was missed
  (counting on without the blessing) is a ruling, so the note waits for the board.
- **The verse for your name** at the end of the Amidah (Siddur Torah Ohr). The traditional lists
  differ; which list to use is the board's choice.

## Later

- **Me'ein Shalosh by food** (choose grain, wine, fruit and see the right words). It needs the
  siddur's alternatives read reliably.
- **Bentching for a bris and Sheva Brachot** as their own choices: the Koren siddur has them as
  separate sections already, reached from the outline; a setting could open them directly.
- **A screen-reader pass** over the Daven tab.
- **Watch and home-screen widgets.** Only with a native app.
- **Audio** of the prayers: waiting for recordings (`docs/siddur-audio-and-transliteration.md`).
