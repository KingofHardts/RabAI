# Research for the November 2026 changes: times, learning with a chavrusa, and how the app feels

Josh asked (2026-11-03) for a long list of things at once: RabbAI should read a photo of a Gemara
page, remember what a person learned so it is a consistent chavrusa (learning partner), talk by
voice like ChatGPT's voice mode, offer different ways and depths of learning, draw on a wider range
of Orthodox sources, know this week's parsha, give Shabbat and fast times for the person's place
from the best authority, rotate its opening questions, make the word card on a phone smoother,
show Rashi and Tosafot with the translation under the Hebrew, and be renamed RabbAI. He also asked
for a deep look at how chavrusas learn and at good design, and at least fifty improvements built
from it.

This document records what we read, what we concluded, and what was built. The October study of
how the app should feel is in [`ui-feel.md`](ui-feel.md), and the earlier study of the reading
screens is in [`ui-research.md`](ui-research.md).

## How this was read

The working session could not open most of these pages (its network refused them), so everything
below was seen **only through web search summaries, not read in full**. Treat the details as
reported, not checked. Where a summary said its own result was uncertain, that is noted.

None of this is a source for Torah content. What RabbAI teaches comes from the canon, and the
rabbinic board decides what is in it.

## Dates and times (zmanim)

### What we read

- **Hebcal**, the calendar most Jewish calendar sites use, and its documentation:
  [zmanim (halachic times)](https://www.hebcal.com/home/1663/zmanim-halachic-times),
  [developer APIs](https://www.hebcal.com/home/developer-api),
  [the Zmanim class](https://hebcal.github.io/api/core/classes/Zmanim.html),
  [how accurate candle-lighting times are](https://www.hebcal.com/home/94/how-accurate-are-candle-lighting-times),
  and the [2020 year-end update](https://www.hebcal.com/home/1548/hebcal-2020-year-end-updates).
  As reported:
  - Candle lighting is 18 minutes before sunset by default; Jerusalem 40 minutes; Haifa and
    Zikhron Ya'akov 30. A person may choose another number.
  - Shabbat ends (havdalah) by default at nightfall with the sun 8.5° below the horizon ("three
    small stars"), the default since 2020. Fixed times are offered too: 42, 50 or 72 minutes
    (72 for Rabbeinu Tam).
  - Minor fasts begin at dawn (the sun 16.1° below) and end at nightfall for three medium stars
    (7.083° below). Tisha B'Av begins at sunset and ends at 7.083°. Yom Kippur begins at
    candle-lighting time and ends at havdalah time.
  - Differences of a minute or two from other calendars are expected.
  - Some of these defaults were seen in the documentation of a
    [separate Python library](https://hebrewcal.readthedocs.io/en/latest/guide/religious-times.html)
    that matches Hebcal, not on Hebcal's own pages.
- **KosherJava**, whose calculations Hebcal's come from:
  [its comparison with other sites](https://kosherjava.com/2007/04/19/calculation-of-zmanim-vs-other-sites/)
  (from 2007), [its notes on accuracy](https://kosherjava.com/tag/zmanim-accuracy/),
  [version 3.0.0](https://kosherjava.com/2026/10/25/kosherjava-zmanim-library-3-0-0-released/)
  (October 2026), and [the Baal HaTanya's zmanim](https://kosherjava.com/2018/11/27/baal-hatanya-zmanim-added-to-kosherjava/).
  As reported:
  - The air bends the sun's light, and how much varies, so any calculated time can be off by up
    to about two minutes; height above sea level adds to that. Precision in seconds is
    meaningless.
  - The calculators themselves agree within seconds. In 2007 KosherJava and MyZmanim were three
    seconds apart for one place.
  - The place matters much more: coordinates rounded to whole degrees can move times by about
    four minutes; two decimal places are plenty.
  - Many poskim consider times measured by the sun's angle the most accurate, since they keep the
    same amount of light across seasons and places.
  - Chabad calendars follow the Baal HaTanya's zmanim, and Chabad.org gives no seconds.

### What we concluded

There is no single "most accurate" source to pick. The well-known calculators agree within
seconds; the real uncertainty is the air and the place. So RabbAI:

- works the times out on the server with Hebcal, never by itself;
- uses the person's place: one they choose, their device's location if they allow it, or else
  the area of their internet connection, which it says is approximate;
- follows the common calendars' defaults, and offers the other customs (other candle-lighting
  minutes, a fixed havdalah time, Chabad's times);
- shows minutes, never seconds, says not to cut it close, and sends people to their shul's
  calendar and their rav for their community's practice.

The decision is recorded in [`founding-spec.md`](founding-spec.md), "Dates and times"; open
question 20 asks the board about the defaults.

## Learning with a chavrusa

### What we read

- **Orit Kent's research on havruta** (learning in pairs), from recordings of real pairs
  learning: the [Brandeis Mandel Center's guide](https://www.brandeis.edu/mandel/jewish-values/teaching-havruta/teaching-practices-skills-havruta.html),
  her article [A Theory of Havruta Learning](https://scholarworks.brandeis.edu/esploro/outputs/journalArticle/A-Theory-of-Havruta-Learning/9924073016701921),
  Hadar's [havruta routines](https://hadar.org/learn/pedagogy-partnership/resources-educators/havruta-routines),
  and the book [A Philosophy of Havruta](https://www.jstor.org/stable/jj.36309383) (Holzer and
  Kent, 2013). As reported, good learning partners use three pairs of practices:
  - **listening and articulating**: hearing your partner's reading closely, and saying clearly
    what you understand;
  - **wondering and focusing**: opening questions up, and narrowing back to the text (focusing
    "prevents wondering from becoming wandering");
  - **supporting and challenging**: building up your partner's idea, and testing it, seeking to
    understand an idea whether or not you agree with it.

  Kent writes that these are practices that can be taught, not a fixed recipe.
- **How yeshivas learn with a chavrusa**: [Wikipedia on chavrusa](https://en.wikipedia.org/wiki/Chavrusa),
  [Yeshivat Har Etzion on the chavruta](https://www.etzion.org.il/en/shiur-29-rabbinical-views-pedagogy-part-ii-chavruta),
  [a guide to connecting Gemara to psak halacha](https://kashrut.org/wp-content/uploads/2025/05/Connecting-Gemara-to-Psak-Halacha.pdf),
  and shiurim on review such as [Chazara: Day 2](https://www.yutorah.org/lectures/729523). As
  reported:
  - Partners prepare for the shiur and review it together, in set sessions (sedarim).
  - The usual order is the Gemara with Rashi first, then Tosafot, without stopping to settle
    every detail of Rashi on the first pass.
  - Review (chazara) is essential: there is no substitute for it.
  - The searches found nothing on the read-aloud-and-translate method itself, or on how to raise
    and answer questions (kashya and teretz).
- **AI tutors that ask instead of tell**: [SocraticAI](https://arxiv.org/abs/2512.03501)
  (December 2025), [a study protocol](https://arxiv.org/abs/2504.06294v1) (April 2025),
  [an ACL 2026 paper on step-by-step help](https://aclanthology.org/2026.acl-long.325.pdf), and a
  [news summary of an EPFL study](https://neuronfeed.com/news/socratic-ai-tutors-outperform-prompt-training-approach-in-programming-education-).
  As reported, the good ones give hints in steps, don't give the answer away, and keep track of
  where the learner is. In the EPFL study, students learned more from the questioning tutor,
  though they found it slower. The evidence is early, the EPFL figures couldn't be checked against
  the paper, and nothing was found on AI tutors combined with spaced review.

### What we concluded

RabbAI's ways of learning (the founding spec's "Learning as a chavrusa", and the core premises'
section for the board) follow these practices:

- **The partner** takes turns reading and explaining: listening and articulating.
- **The questioner** asks and gives hints, and tells the answer only after the person tries:
  wondering, and challenging, as the tutoring studies suggest.
- **The guide** explains a step at a time and checks the person is with it: supporting.
- **Just the page** keeps to the Gemara, Rashi and Tosafot on the amud: focusing.
- **The reviewer** quizzes the person on what they learned: chazara.
- Every way has **"Sum up what we learned"** (articulating) and, outside a session, **"Quiz me on
  this"** under an answer (review).
- The session keeps the line reached, so each question picks up from there and the person can
  continue another day; "About you" lists what they learned, each with Continue.
- The core premises already put Rashi before Tosafot, as the yeshivas do.

## The word card on a phone, and other sheets

### What we read

Vaul, the drawer many web apps use for sheets: [its documentation](https://monetr.github.io/vaul/),
[snap points](https://monetr.github.io/vaul/documentation/snap-points),
[a scrollable example](https://vue-vaul.netlify.app/examples), and
[a port of its release logic](https://github.com/unovue/reka-ui/pull/2591). As reported, a sheet
rests at set heights, and on letting go it settles at the nearest one, unless the finger was
moving fast, in which case the direction decides. It can be dragged by its handle only, and parts
marked "no drag" never move it. The searches did not confirm the exact motion curve, or how Vaul
decides to start a drag only when the text inside is scrolled to the top.

### What we concluded and built

The word card on a phone (`web/components/use-sheet-drag.ts`) rests at half or full height. The
handle or the top of the card drags it; the text drags it too at half height, and at full height
when scrolled to the top. On letting go it goes where the finger was heading, and a quick flick
wins. Below half it closes. It settles along the curve `cubic-bezier(0.32, 0.72, 0, 1)`, a curve
widely used for phone-like sheets (not confirmed by these sources; chosen by feel and checked on a
phone). When the page is zoomed in with two fingers, the card stays its normal size at the bottom
of the screen.

## Touch, motion and access

- **How big a button must be.** [WCAG 2.5.8](https://silktide.com/accessibility-guide/the-wcag-standard/2-5/input-modalities/2-5-8-target-size-minimum/)
  asks for at least 24 by 24 pixels, and 2.5.5 (the stricter level) for 44 by 44; Apple's
  guidelines say 44 points and Google's 48 (these two seen in
  [secondary](https://www.boia.org/blog/are-your-pointer-targets-large-enough-for-accessibility)
  [sources](https://specification.website/spec/accessibility/touch-target-size/), and there was
  [debate](https://github.com/w3c/wcag/issues/1721) about whether 44 should be the usual
  level). **We built:** on touch screens, small buttons are at least 44 pixels tall and chips 40;
  a link inside a sentence stays as it is.
- **Motion.** Smooth scrolling should be off for people whose device asks for less motion
  ([Osvaldas Adomavičius](https://osvaldas.info/you-probably-dont-need-behaviour-smooth-in-scrollintoview/),
  [Front-End Checklist](https://frontendchecklist.io/rules/accessibility/anchor-smooth-scroll)).
  **We built:** every smooth scroll in the app checks that setting first, and the loading shapes
  don't pulse.
- **Adding RabbAI to a phone's home screen.** A browser fetches an app's manifest without its
  cookies unless the link asks for them, even on the same site
  ([MDN](https://developer.mozilla.org/en/HTML/CORS_settings_attributes),
  [CrafterCMS](https://docs.craftercms.org/en/4.0/developers/cook-books/how-tos/web-app-manifest-use-credentials.html),
  [a Stack Overflow question](https://stackoverflow.com/questions/51777346)). **We built:** the
  manifest is linked by hand with `crossorigin="use-credentials"`, so it reaches people who have
  entered the access code, and the lock on the private app is unchanged.

## Voice

### What we read

- **ChatGPT's voice mode.** As reported by [MacRumors](https://www.macrumors.com/2025/11/26/chatgpt-voice-mode-update-seamless-chat/)
  (November 2025) and [WebProNews](https://www.webpronews.com/the-death-of-the-overlay-how-openais-integrated-voice-mode-signals-the-end-of-static-computing),
  voice moved into the conversation itself, instead of a separate screen that left the chat, which
  is easier to follow. [Neowin](https://www.neowin.net/amp/openai-announces-new-improvements-for-chatgpt-advanced-voice-mode/)
  reports that cutting in too early is a known problem, and that OpenAI worked on letting people
  pause to gather their thoughts. A [feature request](https://community.openai.com/t/feature-request-smart-real-time-voice-text-hybrid-mode-with-interruptive-control/1250967)
  asks for a mix of voice and text. Another product, Vox, shows what was heard as captions, keeps a
  transcript, and lets a person interrupt. Nothing was found on how ChatGPT decides that someone
  has finished speaking.
- **Speech recognition in an iPhone's browser.** As reported by developers
  ([lilting.ch](https://lilting.ch/en/articles/ios-webspeech-api-tips),
  [WebReflection](https://webreflection.medium.com/taming-the-web-speech-api-ef64f5a245e1),
  [a forum thread](https://chat.skool.com/quantum-quill-lyceum-1116/ios-safari-speechrecognition-audio-playback-loop-breaks-after-first-cycle),
  [Stack Overflow](https://stackoverflow.com/questions/75498609)): continuous listening is
  unreliable on iPhones. Listening stops by itself (after about ten seconds, one says), sometimes
  hears nothing on the first try, and doesn't always report that it stopped. Switching between
  listening and speaking aloud breaks the loop after the first turn. Pressing to talk is steadier,
  and recording on the device with transcription on a server is the dependable alternative.

### What we concluded

- A voice conversation belongs in the chat: what RabbAI hears appears as words, and its answer is
  shown as text as well as read aloud.
- It should wait through a pause rather than cut in, show plainly when it is about to send, and let
  the person keep talking or send at once.
- On iPhones the browser's own recognition can't be relied on for a back-and-forth. RabbAI should
  fall back to pressing to talk there, and a transcription service on the server would make it
  dependable. That needs Josh's choice of provider.

## What was built

From this request, before the list below: the rename to RabbAI; dates, the parsha, holidays, fasts
and zmanim for the person's place; opening questions that change; the word card that follows the
finger; Rashi and Tosafot with the translation under the Hebrew; and learning with a chavrusa,
with its ways, depths and memory.

Then the list. Where a planned item turned out to exist already, another took its place.

**The welcome**

1. "Shalom, {name}!" when the person has given a name and remembering is on.
2. Shabbat's times when they matter soon: candle lighting from Thursday, "Shabbat Shalom" and when
   it ends on Friday night, the end on Shabbat, with the place (and "near" when approximate).
3. A fast or holiday in the next two days, with when a fast begins and ends.
4. After sunset, the next Hebrew date: "Tuesday night, 24 Cheshvan".
5. "Other questions" shows a new set of opening questions.
6. On a phone, the invitation to learn with a chavrusa is one short row.
7. On a phone, the testing note fits on one line.

**Asking**

8. A question not yet sent is kept for each chat, through switching chats and reloading.
9. The box's prompt fits the moment: listening, a picture attached, or a chavrusa session.
10. On a computer, the up arrow in an empty box brings back the last question.
11. Without a connection, a note says so and Ask waits.
12. On a computer, "/" puts the cursor in the box.

**Answers**

13. "Quiz me on this" under an answer.
14. On a phone, Share sends an answer through the phone's share sheet.
15. Copy includes the sources and says the answer is from RabbAI, an AI, not a rav, and from the
    testing library when it is.
16. Hebrew in an answer is set in the Hebrew typeface and marked as Hebrew; a mostly Hebrew
    paragraph reads right to left.
17. A text size setting.
18. The browser tab shows the open chat's name, or the page open.
19. "Edit and ask again" on the last question. (Planned: "Jump to the latest", which the app
    already had.)

**Chats**

20. Search your chats (by name, category, or anything said).
21. Chavrusa sessions are marked in the list, with the text and line.
22. Chats are grouped by date (today, yesterday, this week, earlier).
23. Copy a whole chat, with its sources.

**Chavrusa**

24. "Sum up what we learned" in every way but the reviewer's.
25. The bar shows "line 4 of 28" for an amud.
26. Starting a session from the reader begins at the line you are on.
27. "About you" has Continue beside each text learned.
28. On a phone, the quick replies step aside while you type. (Planned: the replies in one row that
    scrolls sideways, which they already were.)

**The word card**

29. Hear the word, when the device has a Hebrew voice.
30. A citation shows its quoted words when you point at it. (Planned: arrow keys between words,
    which the card already had.)
31. A list of keyboard shortcuts ("?"). (Planned: announcing the card's handle, which it already
    did.)
32. The first time, a tip says you can tap another word.

**The printed page**

33. One short row for the testing note, and the zoom tip goes away by itself.
34. On a computer, the arrow keys turn the page.
35. On a phone, the page's name takes two short lines, nothing cut off.

**Learn**

36. The shapes of the shelves while the library opens.
37. Today's Daf Yomi (opens the page as printed) and this week's parsha, one tap each.

**Settings**

38. Settings grouped under small headings.
39. "Your place" shows this Shabbat's times.
40. A reading speed for Listen: slower, usual, faster.

**Feel and access**

41. RabbAI can be added to a phone's home screen, with its own icon.
42. Links and menus show the focus ring.
43. On touch screens, small buttons are at least 44 pixels tall.
44. "Copied" is announced to screen readers.
45. A clear button for a long question (it also stops listening). (Planned: room for the iPhone's
    home bar, which the app already had.)
46. No smooth scrolling when the device asks for less motion.
47. Scrolling inside a dialog never moves the page behind it.
48. Esc closes the shortcuts list, a picture, and the chats screen on a phone.

**Pictures**

49. An answer that cites the Gemara offers "See {amud} as printed".

**Voice**

50. Talk: a conversation out loud, in the chat. While the question box is empty, Ask becomes
    Talk.
51. A pause sends what was said after a countdown on screen; "Keep talking" holds it, and a tap
    on the microphone sends it at once.
52. The answer is read aloud at the chosen speed, and a tap stops it and listens. On an iPhone,
    each turn begins with a tap, as the research suggested.
53. A choice of voice in Settings, with a short sample when you pick one.
