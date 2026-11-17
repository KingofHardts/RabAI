# The davening calendar audit (2026-11-17)

Josh asked for the calendar behind "today's davening" to be "as locked down and as tight as it can
be", checked against established Orthodox sources and not only left for the board, with several
passes. This page says what was checked, what was wrong, what the app follows now and why, and how
to run the check again. It is still RabbAI's reading of the siddur and the calendar, for the board
(founding spec, open question 23).

## How it is checked now

`web/scripts/audit-davening.ts`, run by the **"Check today's davening"** workflow
(`.github/workflows/davening-audit.yml`, by hand, after any change to `web/lib/siddur/today.ts` or
`web/lib/calendar/`):

- **Every day of two Hebrew years** (5787 and 5788), **outside Israel and in Israel**, through the
  same code the Daven tab uses, for **four siddurim**: Koren, and Sefaria's Siddur Ashkenaz, Sefard
  and Edot HaMizrach. 5,752 siddur-days in all.
- Each day is compared with **expectations written separately from the engine**: Ya'aleh VeYavo
  only on Rosh Chodesh and Chol HaMoed (and festivals in bentching); Al HaNissim only on Chanukah or
  Purim; Aneinu only on fast days; the Ten Days lines only then; exactly one psalm of the day;
  exactly one night's Omer count; one of the two opening psalms of bentching; Retzei only on
  Shabbat; Lamenatzeach, Mizmor LeToda, LeDavid, Avinu Malkenu, the Torah reading, Hallel, Tachanun,
  Av HaRachamim, Atah Yatzarta, Blessing the New Month, Pirkei Avot and Barekhi Nafshi each by its
  own rule.
- Each check prints how many lines it looked at, and the run fails if a check found nothing to look
  at, so a check can't pass by matching nothing. Breaking a rule on purpose makes the run fail (tried
  with Retzei, Lamenatzeach, Al HaNissim and the Omer).
- **Tachanun is compared with Hebcal** (an independent, widely used open-source calendar) on every
  day; each kind of difference was looked up in the sources below, and any new kind fails the run.
- The log holds section names, line numbers, dates and counts only, never the siddurs' text.
- Unit tests for each rule are in `web/tests/calendar-audit.test.ts`, `daven-today.test.ts` and
  `situations.test.ts`, and run on every commit.

## The passes, and what each found

### Pass 1: Tachanun, against the Koren siddur's own printed list and Hebcal

The app used Hebcal's `tachanun()`. The Koren siddur prints its own list (Minha for Weekdays):
"Taḥanun is not said on Erev Shabbat and Erev Yom Tov. It is also not said on … Rosh Ḥodesh,
Ḥanukka, Tu BiShvat, the 14th and 15th of Adar I, Purim and Shushan Purim, Yom HaAtzma'ut, Lag
BaOmer, Yom Yerushalayim, Tisha B'Av, Tu B'Av, and the preceding afternoons, the month of Nisan, the
14th of Iyar (Pesaḥ Sheni), from Rosh Ḥodesh Sivan through the day after Shavuot (in Israel through
12th of Sivan), and from Erev Yom Kippur through the day after Simḥat Torah (in Israel through Rosh
Ḥodesh Marḥeshvan)." The app now follows that list (`web/lib/calendar/tachanun.ts`). Where Hebcal
differed, the sources agree with Koren:

| Day | Hebcal | Koren (now the app) | Sources |
|---|---|---|---|
| 15 Adar I (Shushan Purim Katan) | said | not said | Shulchan Aruch OC 697:1 ([translation](https://kwx.liehendr.com/content/wikisource_en_all_maxi_2022-09/A/Translation%3AShulchan_Aruch/Orach_Chaim/697)); [OU Torah, Purim Katan](https://outorah.org/p/187744) |
| The day after Chanukah, when Kislev has 30 days (3 Tevet) | not said | said | Chanukah is eight days from 25 Kislev; there is no "isru chag" for Chanukah |
| Minha the day before Erev Rosh HaShana | not said | said | [Shulchan Aruch HaRav (Erev RH)](https://shulchanaruchharav.com/?p=2212); [OU Torah, All About Tachanun](https://outorah.org:443/p/171209) |
| Pesach Sheni | said | not said (a custom; marked "not every congregation") | [Sheilot](https://sheilot.com/en/answers/cycle-of-the-day/morning-prayer/Tachanun/view/6498); [Kol Torah](https://www.koltorah.org/halachah/omitting-tachanun-on-pesach-sheini-by-rabbi-howard-jachter) |
| Israel: 8–12 Sivan, and after Simchat Torah to Rosh Chodesh Cheshvan | said | not said | [Shulchan Aruch HaRav (Sivan)](https://shulchanaruchharav.com/?p=2061); [OU Torah, Days Tachanun is not recited](https://outorah.org/p/229903) |

The afternoon before Chanukah, Rosh Chodesh and the other days in Koren's first group has no
Tachanun at Minha ([OU Torah](https://outorah.org/p/229903); the Mishnah Berurah's reason, so that
Ya'aleh VeYavo is remembered at Ma'ariv: [Mishnah Berurah Yomi digest, 131](https://mishnaberurayomi.org/pdf_digest/Chelek_2/0303_Siman_131_Seif_5-7.pdf)).
Hebcal and Koren already agreed on those.

Two customs differ between communities outside Israel and are now **settings** (Daven settings,
"Your community's customs"), off by default as Koren prints: **no Tachanun through 12 Sivan**, and
**no Tachanun through the end of Tishrei**. Many communities keep both ([Shulchan Aruch HaRav,
Sivan](https://shulchanaruchharav.com/?p=31679); the end of Tishrei is "subject to local custom",
[OU Torah, citing Mishnah Berurah 131:36](https://outorah.org/p/229903)). Yom HaAtzma'ut and Yom
Yerushalayim stay a setting, as before.

### Pass 2: every conditional line of the Koren weekday services

Every instruction and line in the weekday services and bentching that names a time was listed and
run through the rules on every day. Fixed (beyond the 17 fixes of the morning of 2026-11-17):

- **The Omer:** on most nights, nine or ten other nights' counts were showing, because the count on
  the nights of Rosh Chodesh, Pesach Sheni, Lag BaOmer and Yom Yerushalayim is printed with the
  day's name ("30 Nisan, 1st day Rosh Ḥodesh 15. Today is…"), and one count is printed without a
  space ("42.Today"). Now exactly tonight's count shows.
- **Mizmor LeToda:** on Erev Pesach, Pesach and Erev Yom Kippur the fold also took "May the LORD's
  glory" after it, which is said every day. Now only the psalm.
- **Directions for other days** ("On fast days, turn to…", "On Motza'ei Shabbat…", "On Rosh Chodesh…
  say Hallel") are put away on days they don't apply to; they aren't counted as prayers left out.
- Long instructions printed over two lines were not matched by the rules at all (the line break
  stopped them). All rules now read an instruction as one line.

### Pass 3: Shabbat

The same check over every Shabbat found these showing every week:

- **Blessing the New Month** (now only on Shabbat Mevarchim, matched day for day against Hebcal's
  own Shabbat Mevarchim list).
- **Al HaNissim** in Shabbat Ma'ariv (Chanukah's and Jerusalem's Shushan Purim), and the Shabbat
  Shuva ending "who makes peace".
- **Mizmor LeToda**, said on Shabbat only on Hoshana Raba, Yom HaAtzma'ut and Yom Yerushalayim.
- **Av HaRachamim** (now left out on Shabbat Mevarchim except before Iyar and Sivan, on the four
  special Shabbatot, and when Tachanun wouldn't be said, as Koren prints it; [Peninei Halakha,
  Shabbat Mevarchim](https://ph.yhb.org.il/en/?p=5153) on the general rule; customs on Iyar and
  Sivan differ, [Shulchan Aruch HaRav](https://shulchanaruchharav.com/?p=36569)).
- **Tzidkatcha** at Minha (left out when Tachanun wouldn't be said at a weekday Minha).
- **Musaf of Shabbat Rosh Chodesh** ("Long ago You formed" instead of "You instituted the
  Sabbath"), which showed both.
- **Pirkei Avot**: all six chapters showed; now this week's chapter(s), by Hebcal's schedule (with
  the doubled chapters before Rosh HaShana). **Barekhi Nafshi** only from the Shabbat after Simchat
  Torah until before Shabbat HaGadol, as Koren says.
- The festival-only parts of Shabbat services (Yom Tov on a weekday, Hoshana Raba, the Torah
  service's festival verses) are put away on an ordinary Shabbat.

### Pass 4: Sefaria's siddurim

Siddur Ashkenaz, Sefard and Edot HaMizrach split prayers into many sections and print the day's
insertions without labels. Found and fixed:

- **Tachanun showed every day** in Siddur Ashkenaz and Sefard (their sections are named "Tachanun,
  Nefilat Apayim" and so on, which the rules didn't read). Now by the section's path, for Tachanun,
  Viduy (Sephardi: on Tachanun days), Avinu Malkeinu, the Torah reading, El Erech Apayim,
  Lamenatze'ach, Barchi Nafshi, LeDavid, the Omer and the Rosh Chodesh sections.
- **Ya'aleh VeYavo, Al HaNissim and Aneinu showed every day** in all three: now found by their Hebrew
  openings ("יעלה ויבא", "על הנסים", "עננו … עננו ביום צום").
- **The psalm of the day** showed all seven days (their labels are "On Sunday:", "בראשון בשבת:" and
  "מזמור ליום ראשון"); **the Omer** showed every night's count (Hebrew-only, or only the date).
- Bentching's "בשבת מוסיפים" (Retzei) showed every day.

### Also fixed in this audit

- **Jerusalem's Purim** is the 15th of Adar: when the place set is Jerusalem, Al HaNissim and the
  Torah reading follow Shushan Purim.
- **The day the rain phrase changes** (Shemini Atzeret and the first day of Pesach, at Musaf): both
  lines show, with the siddur's own instruction, instead of the wrong one before Musaf.
- **Bentching's "Migdol / Magdil"** follows Shabbat, festivals, Chol HaMoed and Rosh Chodesh.

## Not covered yet (said plainly)

- **Festival services** (Yom Tov, Rosh HaShana, Yom Kippur, Chol HaMoed Musaf) are not in the audit:
  the app sends people to a machzor for Rosh HaShana and Yom Kippur, and the festival Amidah's own
  insertions are not yet checked day by day.
- **Erev Rosh Chodesh Ma'ariv before sunset** (an early Ma'ariv) reads the day as still the day
  before, so Ya'aleh VeYavo would be hidden; after sunset it is right.
- **Vihi Noam** on Motza'ei Shabbat when a festival falls in the coming week.
- The customs that differ (Pesach Sheni, 9–12 Sivan, the end of Tishrei, Yom HaAtzma'ut) follow Koren
  unless the person changes them; a rav or the board may want a different default.
