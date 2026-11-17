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

- **Festivals, the night and Vihi No'am** (second round, below): every festival service at each
  service, the one-day festival prayers, Ma'ariv before sunset with tonight's day, and Vihi No'am
  for Ashkenaz and Sephardi custom.
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

## Second round (2026-11-17): festivals, the night, Vihi No'am, and traditions

Josh asked for the festival services, an early Ma'ariv and Vihi No'am, "according to different
traditions", with settings the person can change, or tell RabbAI to change, and a siddur that
learns what they keep.

### Which day a service belongs to

- **Ma'ariv belongs to the coming night.** Before sunset the app gives the Daven tab tonight's day
  as well (`daveningTonight`), and Ma'ariv, the Omer, Kabbalat Shabbat, the Shema before sleep and
  the evening Kiddush read it: an early Ma'ariv on the afternoon before Rosh Chodesh shows Ya'aleh
  VeYavo. Shulchan Aruch HaRav treats an early Ma'ariv as already the next day (once it is said,
  Ya'aleh VeYavo and Al HaNissim are no longer added in bentching for the day before:
  [Birkat HaMazon on Rosh Chodesh](https://shulchanaruchharav.com/halacha/birchas-hamazon-on-rosh-chodesh/)).
- **Mincha belongs to the day that is ending:** after sunset the app also gives that day
  (`daveningEarlier`), so a late Mincha on Erev Rosh Chodesh has no Ya'aleh VeYavo
  ([Torah Musings, Mincha after sunset](https://www.torahmusings.com/2018/04/minchah-after-sunset/)).
- The Omer after an early Ma'ariv: the custom is to wait for nightfall and count with a blessing
  (Shulchan Aruch 489:3, Mishnah Berurah 489:34; [OU Torah](https://outorah.org/p/122717),
  [Shulchan Aruch HaRav](https://shulchanaruchharav.com/?p=2082)). Ma'ariv of Motza'ei Shabbat is
  not said before Shabbat ends by custom ([Torah Musings](https://www.torahmusings.com/2025/01/davening-maariv-early-on-motzaei-shabbat/)).
- The festival Amidah is printed once for Ma'ariv, Shacharit and Mincha: it follows the service the
  person came from, or the time of day, and a switch above it ("Showing it for: Ma'ariv ·
  Shacharit · Mincha") changes it.

### The festivals

Checked every day of Pesach, Shavuot, Sukkot and Shemini Atzeret in 5787 and 5788, in and outside
Israel, at each service, for Koren and Sefaria's Siddur Sefard and Edot HaMizrach (480 services):
- the festival's own name only (Matzot, Shavuot, Sukkot, Shemini Atzeret) in "You have given us"
  and Ya'aleh VeYavo;
- the rain phrase by service on the day it changes: from Musaf of Shemini Atzeret and until Musaf
  of the first day of Pesach; "He causes the dew to fall" in Israel, and outside it by Sefard,
  Chabad and Sephardi custom (Rema 114:3, [Shulchan Aruch HaRav 114](https://shulchanaruchharav.com/?p=9964));
- Vatodienu in Ma'ariv after Shabbat; Sim Shalom in Shacharit (in Israel also at Shabbat Mincha),
  Shalom Rav in Mincha and Ma'ariv; the Kedusha for the service;
- Musaf's offering for the day: the first or last days of Pesach, Shavuot, the first days of
  Sukkot, each day of Chol HaMoed Sukkot (outside Israel the day's and the next, in Israel one),
  Hoshana Raba and Shemini Atzeret; the festive Kedusha on Yom Tov, Shabbat and Hoshana Raba;
- the prayers of one day: Yizkor (the last day of Pesach, Shavuot's second day, Yom Kippur and
  Shemini Atzeret), Tal (the first day of Pesach), Geshem (Shemini Atzeret), Akdamut, Hakafot, the
  lulav (not on Shabbat), Hoshanot by day.
- On Yom Tov, the Shabbat Amidah and Musaf are put away for the festival's own.

The day's Hoshana (which of the six is said each day) depends on the day of the week Sukkot began
and on custom, and is not yet chosen for the person.

### Vihi No'am

Left out (with Ve'atah Kadosh) on Motza'ei Shabbat when a full Yom Tov falls from Sunday through
Friday of the coming week (Rema 295; Friday counts, a Yom Tov on the next Shabbat doesn't; Purim,
Chanukah and Erev Pesach don't count). On Tisha B'Av Ve'atah Kadosh is said after Eicha instead.
Sephardim say it every week (Birkei Yosef, Kaf HaChaim). Sources:
[OU Torah](https://outorah.org/p/4896/), [Torah Musings](https://www.torahmusings.com/2018/06/vayehi-noam/),
[Shulchan Aruch HaRav](https://shulchanaruchharav.com/halacha/vayehi-noam/),
[Halacha Moment (Sephardi)](https://www.halachamoment.com/post/arvit-of-motzaei-shabbat-vihi-noam),
[Jewish Press](https://www.jewishpress.com/judaism/halacha-hashkafa/the-vihi-noam-prayer/2021/12/08/).
Checked every Motza'ei Shabbat of two years, for Ashkenaz and for Sephardi custom.

### Traditions (lib/siddur/tradition.ts)

Four traditions start from their own customs; every custom can be changed by the person. The
defaults, with the sources found (A = Ashkenaz, S = Sefard, C = Chabad, E = Sephardi):

| Custom | A | S | C | E | Sources |
|---|---|---|---|---|---|
| "He causes the dew to fall" outside Israel | no | yes | yes | yes | Rema 114:3; [Shulchan Aruch HaRav](https://shulchanaruchharav.com/?p=9964) |
| Viduy before Tachanun every day | no | yes | yes | yes | [Etzion](https://www.etzion.org.il/en/node/31157) |
| No Tachanun on Pesach Sheni | yes (Koren) | yes | yes | yes | [Ohr Somayach](https://ohr.edu/12103) |
| No Tachanun 9–12 Sivan, and to the end of Tishrei (outside Israel) | no (Koren prints it) | yes | yes | yes | [Shulchan Aruch HaRav](https://shulchanaruchharav.com/article/tachanun-during-sivan); [OU, Sephardic practice](https://www.ou.org/holidays/halacha-according-to-the-sephardic-practice-aseret-yemei-teshuvah/) |
| No Tachanun on 10 and 19–20 Kislev, 12–13 Tammuz | no | no | yes | no | [Sefer HaMinhagim](https://sichos-in-english.org/books/sefer-haminhagim/16.htm) |
| Ein Keloheinu and Pitum HaKetoret every day | no (outside Israel) | yes | yes | yes | [Peninei Halakha](https://ph.yhb.org.il/en/02-23-05/) |
| LeDavid HaShem Ori until | Shemini Atzeret | Hoshana Raba | Hoshana Raba | all year | [Shulchan Aruch HaRav](https://shulchanaruchharav.com/?p=2203) |
| Lamenatze'ach left out on every day without Tachanun | no | no | no | yes | Kaf HaChaim 131; [Peninei Halakha](https://ph.yhb.org.il/en/02-23-01) |
| Mizmor LeToda on Erev Pesach, Pesach and Erev Yom Kippur | no | no | no | yes | [Shulchan Aruch HaRav](https://shulchanaruchharav.com/?p=91123) |
| Av HaRachamim | yes | yes | yes | no (Hashkavah) | [Wikipedia summary](https://en.wikipedia.org/wiki/Av_HaRachamim) |
| Pirkei Avot | to Rosh HaShana | to Rosh HaShana | to Rosh HaShana | to Shavuot | [OU Torah](https://outorah.org/p/50778) |
| Barekhi Nafshi in winter | yes | yes | no | no | Rema 292:2 |
| Vihi No'am before a festival week | no | no | no | yes | above |
| Yizkor | yes | yes | yes | no (Hashkavah) | [Jewish Virtual Library](https://www.jewishvirtuallibrary.org/hazkarat-neshamot) |
| Akdamut | yes | yes | no | no | [Chabad.org](https://www.chabad.org/library/article_cdo/aid/2836587/jewish/Akdamot.htm) |
| Hoshanot on Shabbat | yes | yes | no | no | [OU, Sephardic practice](https://www.ou.org/holidays/halacha-according-to-the-sephardic-practice-tefillot-of-sukkot/); [Chabad.org](https://www.chabad.org/library/article_cdo/aid/2337565/jewish/All-About-Hoshanot.htm) |
| Hallel in shul on the Seder night | no | yes | yes | yes | Shulchan Aruch 487:4; [Jewish Link](https://jewishlink.news/hallel-in-shul-the-first-night-of-pesach-ashkenazim-adopt-sephardic-practice/) |
| A blessing over half Hallel | yes | yes | yes | no | Shulchan Aruch 422:2; [Kol Torah](https://koltorah.org/halachah/chatzi-hallel-by-rabbi-chaim-jachter) |
| Avinu Malkeinu on fast days | yes | yes | yes | no | low confidence, a setting |

The person chooses a tradition the first time they open the Daven tab ("How do you daven?"), or
"Not sure: start with Ashkenaz and learn as I go"; it opens that tradition's siddur (Chabad: Siddur
Sefard, the closest in the library). The siddur learns: when the person opens something a custom
left out, it asks ("Do you say Tachanun on Pesach Sheni?") and remembers only on "Yes, remember
it". In the chat, RabbAI may offer a change ([[daven KEY=VALUE]], checked against the real settings)
as a "Change it" button, with Undo; nothing changes until the person taps it. Still to do: the
Hallel blessing and the Seder-night Hallel are settings without lines to fold yet, and Teimani
(Baladi and Shami) is left out until a Tiklal is in hand.

## Not covered yet (said plainly)

- **Rosh HaShana and Yom Kippur** themselves: the app sends people to a machzor (the Amidot, Musaf
  and Ne'ila are entirely different), as the sources advise. The Ten Days' additions in the
  daily siddur are covered.
- **The day's Hoshana** on each day of Sukkot (above), and the Torah reading sections by day.
- The customs that differ (Pesach Sheni, 9–12 Sivan, the end of Tishrei, Yom HaAtzma'ut) follow Koren
  unless the person changes them; a rav or the board may want a different default.
