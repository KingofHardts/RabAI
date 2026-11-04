# The siddur in RabbAI: 50 features

Written 2026-11-04, at Josh's request: research what the best printed siddurim and siddur apps
offer, list 50 features, and build the best ones. Each feature says whether it is **built** (in
the Daven tab now), **next** (worth building, no decision needed), or **needs a decision** (from
Josh or the rabbinic board, usually because it would add halacha or texts we don't yet have).

Josh's second round (2026-11-04) asked to build everything marked next, and the decisions on 16,
27, 38, 43, 46 and 50; the statuses below say what was built. Men's and women's wordings are now
labeled where they differ, and the decisions are recorded in the founding spec ("The Daven tab,
second round").

## What was looked at

- **Printed siddurim.**
  - The Koren Shalem Siddur, with Rabbi Sacks's translation, is in our testing library. It prints
    its instructions in the text: stand, feet together, three steps forward, and where to bow,
    rise on the toes and strike the chest, with marks for each. Its "Guide to the Reader"
    explains the marks.
  - The Koren Ani Tefilla and Magerman editions add layers of commentary and halacha.
  - Reviewers single out ArtScroll's instructions "on when to stand, bow, etc." and its laws
    section as its most useful features.
  - The Metsudah Linear siddur has a word-by-word layout; we have its Sefard editions.
- **Apps.**
  - The ArtScroll Smart Siddur "knows where you are, what the date is" and shows "just what you
    need to see for that day". Tapping a phrase gives translation and commentary, and it scrolls
    in sync.
  - The Koren Tefilla app opens straight to the right prayer and has three nusachim.
  - YidKit shows or hides sections by the day and adds zmanim, Tehillim and a minyan finder.
  - Siddur + Tehilim Anywhere: AutoSiddur by time of day, dark mode, a list of the sick for Tehillim.
  - RustyBrick's Siddur: zmanim, a Mizrach compass, a minyan database.
  - Siddur Pro: an Omer counter with reminders.
  - SiddurApp: a "Smart" view and a "Full" view.
  - Siddur Torah Ohr (Chabad): one "Daven" button that knows which prayer is needed.
  - Other apps add transliteration and Tehillim by name or by age.
- **Limits.** The App Store couldn't be reached from this session, so app details come from
  search summaries and reviews, not the listings themselves.

## The 50

### Finding your place, and the flow

1. **Opens to the prayer for now.** Shacharit, Mincha or Maariv by the hour; Kabbalat Shabbat on
   Friday night; the Shabbat services on Shabbat. **Built.**
2. **One continuous scroll.** The prayers flow one into the next within a part of the siddur, as
   in a printed siddur; between parts (weekdays to Shabbat) a button continues. **Built.**
3. **Swipe left or right** to the next or previous blessing or prayer. **Built.**
4. **A bar at the bottom**: back, where you are, next. **Built.**
5. **Each blessing is a stop** (Patriarchs, Divine Might, Holiness…), from the siddur's own
   headings. **Built.**
6. **Continue where you were**, on the Daven home. **Built.**
7. **Contents as an outline** by heading (Weekdays › The Amida), from the title at the top.
   **Built.**
8. **Find a prayer by any spelling** in Learn: Mincha, Minchah, bentching, Shacharis. It opens in
   the Daven tab. **Built.**
9. **Jump to the key points** of a service (Barchu, Shema, Amidah, Aleinu, Kaddish) from the bar.
   **Built** (2026-11-04): the place name at the top of the siddur lists the key points, starred, and the parts further on.
10. **A separate bookmark per service**, so Mincha doesn't lose your Shacharit place. **Built** (2026-11-04): each service remembers where you were, and the Daven home offers "Continue Shacharit".

### Knowing what is said today ("smart siddur")

11. **A "today" card**: the Hebrew date, Rosh Chodesh, Chanukah, Purim, a fast, the Ten Days,
    Hallel (half or whole), and whether Tachanun is said. From Hebcal. **Built.**
12. **The rain phrases** by the Koren siddur's own dates: Mashiv HaRuach from Shemini Atzeret;
    VeTen Tal UMatar from December 5th (6th before a civil leap year), or the 7th of Cheshvan in
    Israel. **Built.**
13. **Lines said only on some days are marked** "today" or "not today": On Rosh Chodesh, On
    Chanukah, Between Rosh HaShana and Yom Kippur, In winter… **Built.**
14. **The Omer**: tonight's count on the today card. **Built.**
15. **An Omer screen** with the blessing, the count in Hebrew and English, and a nightly reminder.
    **Built** (2026-11-04): an Omer card on the Daven home opens tonight's count, and a nightly reminder can be added to the calendar.
16. **Hide what isn't said today** (a "today only" view beside the full one). **Built** (2026-11-04, Josh's direction): "Today's davening" folds what isn't said today into a labeled line that opens with a tap; nothing is removed. Customs are settings. RabbAI's reading of the calendar, for the board (open question 23).
17. **Israel or outside Israel** from the place set in RabbAI. **Built.**
18. **Festival services** chosen automatically on Yom Tov and Chol HaMoed. **Built** (2026-11-04): on Yom Tov, Chol HaMoed and Rosh Chodesh the Daven home offers the right services (Hallel, Musaf).
19. **Reminders**: the Omer each night, the time for Kiddush Levana, Mincha before sunset.
    **Built** (2026-11-04): calendar files for the Omer, Mincha before sunset and Kiddush Levana.

### Instructions and halacha

20. **The siddur's own instructions, in their place**: stand with feet together, three steps,
    "If forgotten, repeat the Amida". From the Koren siddur, word for word. **Built.**
    (They used to fall to the end of each prayer; the order is now fixed.)
21. **Marks shown clearly**: ▾ bow, ▴ rise on the toes, ° strike the chest. **Built.**
22. **Tap a mark** to see the siddur's own explanation of it. **Built.**
23. **"Ask about this"** on any instruction or mark. It opens the question in the chat, where the
    answer is checked against the sources like any other. **Built.**
24. **Who says each line**: Leader, Congregation, Mourner, קהל, ש״ץ. **Built.**
25. **Where the leader begins aloud** (Koren's ◂). **Built.**
26. **"See laws 315–323" opens that law** in Koren's "Gates to Prayer". **Built** (2026-11-04): the laws open in a panel from the same siddur.
27. **Instructions for siddurim that don't print them** (the Metsudah siddurim). **Built** (2026-11-04): notes from `canon/davening-notes.yaml`, labeled as RabbAI's and limited to the prayers they belong to, for the board (open question 23).
28. **The congregation's responses highlighted** (Amen, Yehei Shmei Rabba, Kadosh). **Built** (2026-11-04).

### The text and its translation

29. **Rabbi Sacks's translation** (the Koren siddur) as the default. **Built.**
30. **Hebrew, both, or English**, one tap. **Built.**
31. **Koren's phrase-by-phrase lines** kept as printed. **Built.**
32. **Large type that follows the text-size setting.** **Built.**
33. **Hebrew above, English below in two panes**, scrolling together. **Built**, in the reader
    and (2026-11-04) in the Daven tab.
34. **Word by word** (interlinear), from the Metsudah Linear siddurim already in the library.
    **Built** (2026-11-04): word by word under each Hebrew word, from RabbAI's word-by-word lists, made when the person asks and labeled as not yet reviewed.
35. **Tap a word** for its meaning while davening. **Built**, in the reader and
    (2026-11-04) in the Daven tab itself.
36. **Commentary on a prayer**: Learn opens the prayer with its words and commentaries. **Built.**
37. **Nusach**: Ashkenaz (Koren or Metsudah), Sefard, Edot HaMizrach. **Built.**
38. **Transliteration.** **Built** (2026-11-04): Israeli or Ashkenazi, from the siddur's vowels, labeled as RabbAI's. A published transliteration would be better; candidates are in `docs/siddur-audio-and-transliteration.md`.

### Comfort while davening

39. **The screen stays on** while the siddur is open. **Built.**
40. **Nothing else on the screen**: the chat stays out of the way. **Built.**
41. **Night mode** for Maariv and Selichot. **Built** (2026-11-04): Light, Dark or Auto, with readable contrast in both.
42. **Works offline**, for travel and shuls without signal. **Built** (2026-11-04): "Keep this siddur on this device", and texts opened are kept.
43. **Audio** of the prayers in each nusach (the Koren Tefilla app). **Waiting for recordings**: leads for Josh to ask are in `docs/siddur-audio-and-transliteration.md`.

### Beyond the daily services

44. **Birkat HaMazon, blessings on food and sights, the Traveler's Prayer, Shema before sleep,
    Kiddush, Havdalah, candle lighting**, on the Daven home. **Built.**
45. **Times today** (latest Shema, Mincha, sunset) on the Daven home, once a place is set.
    **Built.**
46. **A bracha finder**: which blessing for this food. **Built** (2026-11-04): "Which bracha?" asks in the chat, where the answer is checked against the sources.
47. **Tehillim**: the day's portion, by day of the month or week, and a list of names for the sick.
    **Built** (2026-11-04).
48. **Kaddish and yahrzeit reminders.** **Built** (2026-11-04): yahrzeits kept on the device, with the coming dates as a calendar file; only the date is sent.
49. **A Mizrach compass** (the direction to Jerusalem). **Built** (2026-11-04).
50. **A minyan finder.** **Built as a link** (2026-11-04): a link to GoDaven, since we have no minyan database.
