# RabAI's screens: what other apps do, and a redesign plan

**Research and proposal, 2026-10-07. No code has changed.** This answers the maintainer's request
(2026-10-07): "Things are just kind of cluttered and spaced out, and it's kind of hard to
navigate, and things just don't fit well — like, I have to scroll down all the way to get to
these words. I want a deep dive on other online Gemara things or other translating things, and I
really want you to better the UI visually as well as in a utilitarian sense."

It has five parts:

1. [What other apps do](#1-what-other-apps-do)
2. [What is wrong with our screens now](#2-what-is-wrong-with-our-screens-now), worst first
3. [The redesign, screen by screen](#3-the-redesign-screen-by-screen)
4. [Visual direction](#4-visual-direction)
5. [What to build first](#5-what-to-build-first)

The app's rules do not change. The online app stays locked behind its access code. RabAI
explains a word only when the person asks. RabAI's own translations and outlines are always
labeled as not reviewed by the rabbinic board. Citations come only with the checked final
answer. Every passage from the private testing library stays labeled as not yet approved.
[Part 5](#rules-this-plan-keeps) checks the plan against each rule.

**The short version.** The single biggest problem is order: when you tap a word on the
printed page, the panel shows the whole line and its long English translation first, and the
word's meaning starts exactly at the bottom edge of the screen. The fix copied from the best
apps (Quran.com, Sefaria's apps, ArtScroll, STEPBible, Kindle) is to show a word's meaning next
to the word, short first and long on request, in a small card with tabs: **Meaning ·
Translation · Commentary · Ask**. The second problem is length: every commentary is printed in
full under every line, so Genesis 1 is 78,000 pixels tall on a computer. The best apps fold
commentaries into a count and open them on request. The third is navigation: our reader has no
"next chapter", no table of contents, and its tools sit on two or three rows of pills. The
best apps use one slim bar: back, title (tap for the table of contents), and one settings menu.

---

## 1. What other apps do

### How this research was done

The network in this working session blocks almost every outside website, including Sefaria,
Quran.com, Mercava, AlHaTorah, Dicta, the daf yomi sites, the Bible sites, and the app stores.
So the findings come from three places:

- **The source code of Sefaria and Quran.com**, read directly from their public repositories on
  GitHub (`Sefaria/Sefaria-Project` and `quran/quran.com-frontend-next`). This is the most
  reliable evidence here, because it shows exactly how their screens are built.
- **Search results**: help pages, reviews, articles, and app store descriptions quoted in
  search results. The links are listed at the end.
- **What RabAI's own maintainers already know** (CLAUDE.md mentions Mercava correcting each
  printed page by hand).

I could not look at any other app's screens with my own eyes. Where a finding comes only from
a description, it says so.

### Torah and Talmud apps

#### Sefaria (sefaria.org and its apps) — studied in its source code

The largest free Jewish library, and the source of our testing library.

- **One slim header, about 60 pixels.** Left: close (computer) or menu (phone). Center: the
  title, which is itself the button for the table of contents. Right: a save (bookmark) button
  and one **"Aa" menu** that holds every display choice: language (Hebrew, English, both),
  layout (side by side or one above the other), vowels, cantillation, punctuation, and text
  size. None of these are buttons on the screen. A thin colored line on top shows the text's
  category.
- **Continuous reading.** Scrolling down past the end of a chapter loads the next one, and
  scrolling up loads the one before. There are no "next page" buttons to find.
- **Commentaries are not printed under the text.** Each line has a small dot in the margin.
  The dot is darker when the line has more connections (commentaries, Talmud, Midrash). Tapping
  a line opens the **resource panel**: beside the text on a computer, at the bottom on the
  phone app. The panel lists categories with counts ("Commentary 14", "Talmud 3", "Halakhah 2"),
  shows the first few and folds the rest behind "More". Tap a category to see its books, tap a
  book to read its comment.
- **Dictionary.** On the web, highlight or double-click a word and the definition opens in the
  side panel. On the phone apps, a long press on any word shows the definition. Jastrow, Klein
  and BDB are linked to the Hebrew.
- **Worth copying:** the one-line header; the "Aa" menu; the title as table of contents;
  continuous scrolling; counts instead of full commentaries; "More" to fold long lists.
- **Worth avoiding:** the panel has more than twenty modes (sheets, web pages, topics,
  manuscripts, Torah readings, notes, share, feedback, advanced tools...). It is powerful and
  deep, and a first-time reader does not know that a double-click opens the dictionary.

#### Quran.com — studied in its source code

The closest relative outside Jewish texts: an ancient text read in its own language, with a
translation and a word-by-word gloss, used by learners of every level. Its word-by-word design
is widely considered the best of its kind.

- **The word's meaning appears next to the word.** By default, hovering (computer) or tapping
  (phone) a word shows a small popover right above it with the word's translation (and, if
  the reader wants, its pronunciation). Nothing moves on the page.
- **An optional inline mode** prints the gloss under every word, for beginners. The two can be
  mixed (inline translation, popover pronunciation). The default is the popover.
- **The popover has a door to more.** On the phone, the word popover carries an icon that
  opens **"study mode"**: a sheet for that one verse, with **tabs** (commentary, reflections,
  lessons, layers, readings, hadith), arrows to move to the **previous or next word** and the
  previous or next verse, and a back button that remembers where you came from.
- **One slim bar while reading.** It shows the chapter name (tap it for the chapter list), where
  you are (part, page), a **Translation / Reading** switch, and one settings button. Every
  other choice lives in a settings drawer. On phones the main navigation bar hides while you
  scroll, so the text gets the screen.
- **Worth copying:** popover by the word; tabs for deeper material; previous and next word;
  one switch for the reading mode; settings in one drawer; bars that get out of the way.
- **Worth avoiding:** its users ask in the feedback forum for hover and tap to behave the same
  everywhere (a filed bug: "can't hover to bring up translation per word"). Whatever we choose,
  a tap must always work.

#### The ArtScroll Digital Library (Schottenstein Talmud)

The best-known paid Talmud app. From its app store listing, reviews and articles.

- **Tap the Aramaic, get a pop-up.** On the printed Vilna page (the Vilna Shas: the classic
  printed layout of the Talmud), tapping a phrase opens a floating box with its translation.
  The reader chooses what the box shows: the English, Rashi, Tosafot, other margin
  commentaries, or ArtScroll's notes.
- **Page syncing and color mapping.** The Vilna page and the translation page stay in step, and
  matching parts are colored the same.
- **Choice of layout:** the full Vilna page with every margin commentary, or flowing text with
  vowels and punctuation and the commentaries at the bottom.
- **Hiding the translation behind a tap** was praised by a reviewer in *Jewish Action*: it pushes
  the learner to read the Aramaic first instead of leaning on the English.
- **Complaints:** slow and glitchy; "looks and feels ten years old"; following a link to
  another source sometimes leaves **no way back** to where you were reading. In one summary of
  137 reviews, about 60 percent were negative.
- **Worth copying:** the pop-up on the printed page; translation hidden until asked; the reader
  chooses what the pop-up shows. **Worth avoiding:** losing your place, and dated, heavy chrome.

#### Koren Talmud Bavli (Steinsaltz), app and digital edition

From the publisher's announcements and reviews. Side-by-side translation that stays in sync
with the Aramaic; a button that hides one language for single-language reading; zoom; the
Vilna page with vowels and punctuation. The translation itself sets the literal words in
**bold** and the explanation in plain type, so the reader can see which English words are in
the text. (Our testing library's English for the Bavli is this translation, the William Davidson
edition.) **Worth copying:** hide one language with one tap; show where the literal text ends
and the explanation begins, if our data ever marks it.

#### Mercava (themercava.com)

The site was blocked; this is from Prizmah, Herzog College and teacher guides. Mercava shows
the Talmud and Chumash in **tzurat hadaf** (the shape of the printed page) and lets students and
teachers mark it up: highlight, comment, draw flow charts, attach media and discussion, on any
device. A menu switches punctuation and nikud (vowel points) on and off. It has a teacher and
student mode and a way to learn with a chavruta (study partner). Our maintainers note that
Mercava corrected each printed page by hand to match the print. **Worth copying:** markup that
is the learner's own, kept apart from the text; switches for vowels and punctuation in one menu.

#### AlHaTorah.org (Mikraot Gedolot and word tools)

Blocked; from its user guide and a *Jewish Action* review. Mikraot Gedolot is the Bible printed
with its classic commentaries around it.

- Each verse sits in its own light gray box with the commentaries **the reader chose** under
  it, each commentary in its own small scrolling box.
- A **gear menu** picks which of more than forty commentaries show by default. Each verse has
  "Show additional commentaries" for the rest.
- **Click a word** (twice on a phone) for every verse in Tanakh with the same root.
- Commentaries can show in Rashi script or square letters; the controls switch between Hebrew
  and English.
- **Worth copying:** the reader picks which commentaries show; "more" per verse. **Worth
  avoiding:** small scroll boxes inside a scrolling page are hard to use on a phone.

#### Dicta

Blocked; from its tools page in search results. Dicta builds single-purpose tools: Nakdan adds
vowel points, an abbreviation expander spells out rabbinic short forms, a citation finder finds
quotations of the Bible and Talmud. **Worth copying:** treat a short form (ראשי תיבות, an
abbreviation) as its own clear, labeled step, as our word card already does.

#### Hachi Garsinan (Friedberg)

A scholarly site that sets every manuscript and early print of the Talmud side by side, with
the differences highlighted. Not a model for our main screens, but a reminder that a "compare"
view can be a separate, optional screen rather than clutter on the main one.

#### Daf yomi study sites (Kollel Iyun Hadaf, Daf Map, Talmud Navigator, All Daf)

Daf yomi is the practice of learning one daf (a page, both sides) of Talmud a day.

- **Kollel Iyun Hadaf (dafyomi.co.il)** gives each daf a "Point by Point" outline, background
  notes for hard lines, insights, and a review quiz with answers. It is text-heavy but very
  clear: one page per job.
- **The Daf Map** marks **six to eight points per page** with simple shapes and double
  underlines drawn on the daf, to show the flow of the sugya (the passage's argument). Its
  lesson for us is restraint: a few marks show the structure; color on every line hides it.
- **Talmud Navigator (Ohr Somayach)** lays the argument out in columns by level, with
  statements in blue and questions and challenges in yellow.
- **All Daf (Orthodox Union)** is a hub: the day's daf, many shiurim (lectures), audio at
  different speeds, a calendar. Learners come back daily, so "today's daf" sits first.
- **Worth copying:** an outline that names the steps of the argument; few colors with fixed
  meanings; "today" and "continue" first on the home screen.

### Word-by-word readers outside Jewish texts

#### STEPBible (Tyndale House, Cambridge)

From its user guide. A three-step ladder of detail:

1. **Hover** a word: a small quick-lexicon pop-up with the original word and a short gloss.
2. **Click** it: the **side panel** shows a quick definition, a longer summary of how the word
   is used in the Bible, and then the full lexicon entry.
3. Hover a **verse number**: every word of that verse with its meaning.

The quick pop-up can be turned off in Options. **Worth copying:** short first, longer on
request, full entry last; a "whole line, word by word" view on the line's number.

#### Blue Letter Bible

Every verse starts with a **Tools** button that opens the interlinear: a table of the verse's
words with their numbers in Strong's dictionary, the original word, pronunciation and grammar.
The number opens the dictionary page with every place the word appears. On the phone app, a
"C" button opens the same tools. **Worth copying:** every occurrence of a word in one tap.
**Worth avoiding:** everything sits one screen deeper behind buttons, and the look is dated.

#### BibleHub (interlinear)

Each word is a small stack: dictionary number, original word, pronunciation, English. Very
useful for study, very dense for reading. **Worth copying** for our "Word by word" view (we
already do this in RabAI's tan box). **Worth avoiding** as the default way to read.

#### Logos and Accordance

Both keep a fixed **information panel** that updates as the mouse moves over words ("Information
panel" in Logos, "Instant Details" in Accordance): the gloss and grammar at once, the full
dictionary entry with one key. **Worth copying** on a large computer screen: a panel that
always shows the last word tapped, so the person never hunts for it.

#### YouVersion (Bible app)

Tapping a verse brings up an **action bar at the bottom** that "stays out of the way of the
verses": highlight colors, bookmark, note, share, compare versions. Verses with notes or
highlights show a small mark. **Worth copying:** actions in one short bar at the bottom, not a
block of buttons inside the text.

### Language readers and translators

#### Readlang

Click a word and its translation appears **right above it**; drag across words to translate a
phrase; every looked-up word is saved as a flashcard with its sentence. Users who came from
LingQ praise how plain it is. **Worth copying:** the gloss above the word, phrase translation by
dragging, and saving words automatically into a review list (our "My words").

#### LingQ

Every unknown word is tinted blue, every word being learned yellow, with a side panel for the
word. Reviews call it **cluttered**: in one review survey, 27 percent of poor reviews named the
interface and 23 percent called it confusing; on phones, word counts, color panels, statistics
and audio controls "all compete for limited screen space". **Worth avoiding:** coloring the text
itself by status, and stacking controls around the reading area.

#### Kindle

A long press on a word shows a **small card at the bottom** with the dictionary meaning, and
tabs (or swipes) for Wikipedia and translation, plus "open the full dictionary". The page stays
where it is. **Worth copying** for phones: a short card at the bottom with tabs, the text still
visible above it.

#### Google Translate and DeepL

Two panes side by side, original and translation, the same size. In DeepL, clicking a word in
the translation opens a short list of alternatives in place. Google lists dictionary meanings
under the translation, by part of speech. **Worth copying:** original and translation as equal
partners, and alternatives in place rather than on another screen.

### What the best of them agree on

| Question | What the best apps do | Apps |
|---|---|---|
| Where does a word's meaning appear? | Next to the word: a popover on a computer, a short card at the bottom on a phone. More detail on request, in tabs or a side panel. | Quran.com, Sefaria app, ArtScroll, STEPBible, Kindle, Readlang |
| How much is shown first? | One short gloss. Then a summary. The full dictionary entry last. | STEPBible, Quran.com, Accordance |
| Where do commentaries go? | Folded into a count by each line; opened on request; the reader picks which ones show. | Sefaria, AlHaTorah, ArtScroll |
| How do you move through a book? | Continuous scrolling, or next and previous at a fixed place; the title opens the table of contents. | Sefaria, Quran.com |
| Where are the display settings? | In one menu ("Aa" or a gear), not on the screen. | Sefaria, Quran.com, AlHaTorah |
| How tall are the bars? | One row, about 50–60 pixels; on phones they hide while reading. | Sefaria, Quran.com |
| How is color used? | Few colors with fixed meanings; never color the whole text by status. | Daf Map, Talmud Navigator, Readlang (and LingQ as the warning) |
| What if you follow a link? | You can always get back to where you were reading. | Quran.com (the lesson of ArtScroll's complaints) |

---

## 2. What is wrong with our screens now

I ran the current production build on this computer with the local testing library and took
screenshots at a computer width (1300 pixels) and a phone width (390 pixels). Files are named
`desk-NN-...png` and `phone-NN-...png`; they are in this session's scratchpad folder
(`ui-research/`), not in the repo. The numbers below were measured in the browser. The build is
the one in `web/.next` from the morning of 2026-10-07; work in progress at the time (an "Other
readings" list in RabAI's translation box) adds more to the printed-page panel, which makes the
order of that panel matter even more.

Worst first.

### 1. The word's meaning is pushed below the screen (the printed page)

Tap a word on the printed Gemara page. The side panel opens with, in order: a "Gemara" chip and
the reference, the whole line in Hebrew, the line's English (for Berakhot 2a:1 this is a
200-word paragraph), "Word by word", and only then "The word you tapped" and the dictionaries.

- **Computer:** the panel is 797 pixels tall and 2,340 pixels long inside. "The word you tapped"
  starts at 860 pixels, the exact bottom of an 860-pixel window. The first dictionary entry
  starts at 999. Nothing about the word is visible until you scroll the panel.
  (`desk-19-daf-word.png`, scrolled: `desk-20-daf-word-scrolled.png`)
- **Phone:** the panel is a sheet 464 pixels tall. The word starts 800 pixels down inside it.
  (`phone-19-daf-word.png`)

This is exactly "I have to scroll down all the way to get to these words".

### 2. The reader's word card opens far from the word, and is taller than the screen

In the line-by-line reader, the word card appears **under the whole line and its English**, not
by the word.

- **Computer:** tapped word at 242 pixels from the top; card starts at 595; card is 660 pixels
  tall. (`desk-14-reader-word.png`)
- **Phone:** the card is 933 pixels tall, taller than the 844-pixel screen, and the page
  scrolls to it, so the tapped word itself goes out of sight under the header.
  (`phone-14-reader-word.png`)

The card also pushes everything below it down, so the page jumps every time a word is tapped.

### 3. Every commentary is printed in full under every line

The reader prints every commentary the library has, in full, under each line ("On this line").
There is no way to choose which ones, and no way to fold them.

| Text | Lines | Comments printed | Length on a computer | Length on a phone |
|---|---|---|---|---|
| Genesis 1 | 31 verses | 168 | 78,057 px | 135,545 px |
| Kiddushin 40b | 14 lines | 42 | 13,971 px | 22,593 px |

Verse 2 of Genesis begins **12,486 pixels below verse 1 on a phone**: about 24 screenfuls of the
reader's 512-pixel reading area, all of it commentary on verse 1. On a computer the gap is 6,731
pixels, about 10 screenfuls. (`desk-16-reader-genesis.png`, `phone-16-reader-genesis.png`)

### 4. You cannot move through a book in the reader

- The reader has **no next or previous** chapter or amud (one side of a daf), and no table of
  contents. The printed page has "Back a page" and "Next page"; the reader has neither.
- "Read it" on a book's card always opens the **first** chapter or daf. To open Kiddushin 40b you
  must know to type "kiddushin 40b" into the search box.
- The book card shows no list of chapters or dafs to pick from.

### 5. The Learn page is one very long column

- **Length:** 3,529 pixels on a computer, 4,751 on a phone. "My words" starts 1,793 and 2,489
  pixels down; the "grow closer to HaShem" switch is at the very bottom (3,497 and 4,735).
  (`desk-07-learn-full.png`, `phone-07-learn-full.png`)
- **12 shelf buttons** wrap onto three rows on a computer and run off the side on a phone.
  Six of them (Jewish thought, Musar, Chasidut, Responsa, Dictionaries, Commentaries) are rarely
  the first place a learner goes.
- The **Gemara's key words** list is always open and is about 800 pixels tall.
- On a 1300-pixel screen everything sits in a 680-pixel column; about 600 pixels of the width
  is empty. (`desk-06-learn-top.png`)
- A book's card opens **in the middle of the grid**, between two groups, which moves the rest of
  the grid down. (`desk-09-learn-bookcard.png`)

### 6. Bars and headers take too much of the screen

| Bar | Height now | Rows |
|---|---|---|
| Phone app header | 133 px | 2 (brand and badge; then Chats, Chat, Learn) |
| Phone composer and footnote | 113 px | 2 |
| Phone reader sheet head | 273 px | 3 to 4 (title; language, Study words; See the page; a five-line note) |
| Computer reader head | 192 px | 3 |
| Phone printed-page bar | 105 px | 2 |
| For comparison: Sefaria's reader header | about 60 px | 1 |

On a phone, the header and composer together use 246 of 844 pixels (29 percent) before any
content. In the phone reader, the head leaves 512 of 844 pixels for the text. (`phone-01-chat-empty.png`,
`phone-12-reader-gemara.png`, `phone-18-daf.png`)

### 7. While reading on a computer, half the screen is the wrong thing

Opening a text from Learn splits the screen in two: the Learn page (shelves and search) stays on
the left at full height, and the text gets the right half, 665 pixels wide. While you read,
the library is not what you need. (`desk-12-reader-gemara.png`)

### 8. Too many buttons, and the same words repeated

- Tapping a line in the reader adds **five pill buttons and a text box** under it ("Explain
  this", "Word by word", "What do the commentaries say?", "Where is this used in halacha?",
  "Let me try translating"). (`desk-13-reader-line-tapped.png`)
- The printed-page panel holds **ten or more controls**: Translate, Word by word, Ask RabAI
  about this word, Explain this line, What do Rashi and Tosafot say, Save to My words, a question
  box, four mark colors, and Clear.
- Each Jastrow entry repeats **"Its author was not Orthodox. RabAI uses it only for what words
  mean."** In `desk-20` the sentence appears three times in one card. (The rule that each entry
  says so stays; it can be said in fewer pixels. See 3.5.)
- The "Private testing library. Not yet approved by the rabbinic board." note appears as a large
  amber box in the library card, again in the reader (five lines on a phone, with the edition
  names), and as a badge in the header.
- A chat answer shows "Open Shabbat 21b:5" next to a "Shabbat 21b:5" source button that does the
  same thing. (`desk-05-chat-answer.png`)

### 9. Two ways to tap a word, and they look alike

Normal reading already lets you tap a word for its meaning. "Study words" is a second mode that,
in the testing library, does nearly the same thing, with a different look and an extra "Ask
about this line" button on every line. The Learn page tells people to "turn on Study words and
tap any word", though tapping already works. (`desk-15-reader-study.png`)

### 10. Dictionary entries are long, and the fitting one is not first

For בערבין ("in the evening") the panel shows five entries. The first is ערב II, "spiced, sweet";
then "bondsman, surety"; then "willow". Each is shown as a large box with about 250 characters of
Jastrow's dense, abbreviated text. A learner has to read three boxes to learn that none of them
is the meaning they want. (`desk-20-daf-word-scrolled.png`) The order comes from the lookup, not
the screen, but the screen can make five entries scannable in five short lines.

### 11. On a phone, the printed page is cut off

The printed page is drawn 537 pixels wide in a 358-pixel space. The outer 163 pixels (on amud
aleph, the Tosafot side) are off the left edge of the screen. You have to scroll sideways, and
nothing tells you to. (`phone-18-daf.png`)

### 12. The selected line is drawn as many separate boxes

Tapping a word outlines each piece of its line with a separate rounded box (`desk-19`), and the
linked Rashi and Tosafot get gray bars. On a dense page this reads as noise.

### 13. Styles don't match

- At least seven button looks: white pills, tinted pills, pale blue source chips, underlined
  links, the language segment, the "Study words" pill, and dashed badges.
- Amber means three different things: a warning ("not connected"), the testing label, and
  RabAI's own translation (tan). The Talmud shelf is a strong brown next to a blue accent.
- The RabAI mark (ר in a blue circle) sits beside every message, and on a phone its column takes
  13 percent of the width. (`phone-05-chat-answer.png`)
- Text sizes for small labels vary between 11.5 and 13.5 pixels; headings switch between the
  serif and the sans-serif.

### 14. Smaller things

- On a phone, the chat opens scrolled down, cutting off the top of the welcome message.
  (`phone-01-chat-empty.png`)
- "Chats" is a separate button next to the Chat / Learn switch, and opens a separate screen.
- The row above every chat ("Saved on this device · Category · New chat") is always visible.
- The long note under the printed page (edition names, how the layout was made, estimated
  words) is a paragraph that most readers will never read.

---

## 3. The redesign, screen by screen

Four ideas run through all of it:

1. **The thing you tapped comes first.** A word's meaning appears next to the word. A line's
   tools appear next to the line.
2. **Short first, more on request.** A one-line gloss before the dictionary entry; a count
   before the commentaries; a one-line label before the edition details.
3. **One place for each kind of control.** Moving through texts: the title and the arrows.
   Display choices: one "Aa" menu. Actions on what you tapped: the panel's tabs.
4. **Bars are one row.** On phones they hide while you read.

Sizes below are in CSS pixels.

### 3.1 The frame and navigation

**Computer (980 pixels and wider)**

One top bar, **52 pixels**, one row:

```
 ר RabAI      [ Chat | Learn ]                         Testing library ⓘ   ⚙
```

- The subtitle "An AI Torah teacher" moves to the welcome message.
- **Chats** becomes a list in a left column of the Chat screen (see 3.2), not a button.
- The testing badge becomes small gray text with an ⓘ that explains it. Every passage still
  carries its own label (see 3.4).
- ⚙ opens settings: "Help me grow closer to HaShem", voice, text size, light or dark. These
  move off the Learn page.

When a text is open, the screen has up to three columns:

```
┌──────────────┬──────────────────────────────────┬────────────────────┐
│ left column  │ the text (or the chat)           │ the panel           │
│ 280 px,      │ grows to fill                    │ 380 px, opens when │
│ can fold     │                                  │ something is tapped│
└──────────────┴──────────────────────────────────┴────────────────────┘
```

- **From Learn**, a text takes the middle. The left column shows the library (search, shelves,
  "continue"), folded to a 48-pixel strip of icons by default so the text gets the room.
- **From Chat**, a source opens beside the conversation as now, because seeing the answer and
  the source together is the point. The panel then opens over the source's right side.
- **Back** always returns to where you were. A source opened from an answer has "← Back to the
  answer" (the ArtScroll complaint).

**Phone (under 980 pixels)**

- A **48-pixel top bar** in one row: the RabAI mark, the Chat / Learn switch, and ⚙. The
  testing label becomes a small line under the welcome message and on each passage.
- A text opens **full screen** (not a sheet with the chat showing above it), with its own
  48-pixel bar (see 3.4). The bar slides away as you scroll down and returns when you scroll up.
- Things you tap open as a **short sheet at the bottom** (see 3.5), never as a block pushed into
  the text.

### 3.2 Chat

```
┌─ Chats ────────┬──────────── conversation ─────────────┐
│ + New chat     │  Shalom! I'm RabAI...                  │
│ Search         │                                       │
│ ● Halacha      │                   Why do we add a ... │
│   Chanukah...  │  The Gemara brings a dispute ...      │
│ ● Tanakh       │  [Shabbat 21b:5]                       │
│   First words  │  Beit Hillel say ... [S.A. 671:2]      │
│ ○ Not sorted   │  🔊  Tell me more · Say it more simply │
│   A hard day   │                                       │
│                │ ┌───────────────────────────────────┐ │
│                │ │ 🎤  Ask anything…            [Ask]│ │
│                │ └───────────────────────────────────┘ │
└────────────────┴───────────────────────────────────────┘
```

- **Chats live in the left column** on a computer, grouped by category with their colors, as
  now. On a phone, a ☰ in the chat bar opens the same list full screen.
- **The chat's name sits at the top of the conversation** with a ⋯ menu: rename, category,
  delete, new chat. The "Saved on this device · Category · New chat" row goes away; "saved on
  this device" is said once, in the chats list.
- **The RabAI mark appears once,** on the welcome message. Answers use the full width; on a
  phone this gives back 46 of 358 pixels.
- **Under an answer:** the Listen button as a small speaker icon, then "Tell me more" and "Say
  it more simply" as quiet text buttons. Drop "Open Shabbat 21b:5"; the source buttons in the
  answer already open it. Citation buttons still appear only with the checked, final answer.
- **Starters:** four short cards in two rows, two under "Ask about Torah" and two under "Talk
  about life", instead of six pills of different lengths.
- **Phone:** the chat opens at the top of the welcome message, not scrolled past it. The
  footnote "RabAI is an AI Torah teacher, not a rav" moves into the welcome message and the
  settings, so the composer is one row (about 64 pixels with the safe area).

### 3.3 Learn and the library

The Learn page becomes a short home screen with the library as its main part. Things that are
not about finding a text move to their own places.

**Order on a phone:**

1. **Continue** — a row of cards you can swipe, one per recent text: the title, its Hebrew name,
   and whether it was the printed page. One tap opens it where you left off. (Today's "Pick up
   where you left off" chips, made bigger and moved to the top.)
2. **Find a book** — the search box, which stays at the top as you scroll. Results as now; the
   "Open Kiddushin 40b" button becomes the first result row instead of a button above them.
3. **Shelves** — one row of the six main shelves: Tanakh, Mishnah, Talmud, Halacha, Midrash,
   Prayer, and **More** (Jewish thought, Musar, Chasidut, Responsa, Dictionaries, Commentaries).
4. **The shelf's books** — groups and tiles as now (the grouping by order and part is good).
5. **Two small rows at the end:** "My words · 3 saved · Review" and "The Gemara's key words ·
   17 phrases · Open". Each opens its own screen.

"Help me grow closer to HaShem" moves to settings (still off unless turned on). The intro text
("Pick a text to read. Tap a line...") goes; the reader teaches by doing (see the first-tap hint
in 3.4).

**On a computer:** the shelves become a **list down the left** (with their Hebrew names), and the
books fill a grid on the right, five across. Choosing a book opens **its own page** in that space
(with a "← Talmud" breadcrumb), instead of a card squeezed into the grid.

**A book's page:**

```
 ← Talmud · Seder Zeraim
 Berakhot  ברכות
 [ Continue at 5b ]   [ Start at 2a ]   [ Learn it with RabAI ]

 Dafim   2a 2b 3a 3b 4a 4b 5a 5b ... 64a                (Talmud)
 Chapters 1 2 3 4 5 ... 50                               (Tanakh)

 Commentaries in the library
   Rishonim (earlier authorities): Rashi · Tosafot · Ramban · Rashba · Ritva · Rif · Rosh
   Acharonim (later authorities): Rabbi Akiva Eiger · Maharsha · Rashash
```

- **A grid of dafim or chapters** to jump to. For the Bavli, each daf number opens the reader,
  and a small page icon beside the grid switches it to open the printed page instead.
- Commentaries stay grouped by era, as quiet text links instead of pill buttons.

### 3.4 The reader (line by line)

**Its bar, one row, 52 pixels on a computer and 48 on a phone:**

```
 ←   Kiddushin 40b  קידושין מ:  ▾          ‹  ›     📄    Aa
```

- **The title opens the table of contents** (the same daf or chapter grid as the book's page).
- **‹ and ›** go to the previous and next amud or chapter. Better still, later: keep scrolling
  and the next one loads below (Sefaria), with a thin divider and its title.
- **📄 (the page)** opens the printed page, for Bavli texts. It replaces "See the page".
- **Aa** holds the display choices: Hebrew / Both / English, text size, vowels, and which
  commentaries to show (see below). It replaces the language buttons and "Study words".

**One line about the edition, not five.** Under the bar, one gray line: "Testing library · not
yet approved by the rabbinic board · Hebrew: Vilna Shas · English: William Davidson ⓘ". On a
phone, only "Testing library · not yet approved by the rabbinic board ⓘ" shows, and ⓘ opens the
rest. The label stays on every screen that shows a passage; it just gets shorter.

**The text:**

- Hebrew at 24 pixels (phone 22), line height 1.75; English in the reading serif at 17 pixels
  (phone 16). Line padding 8 by 12 instead of 12 by 12.
- The line number moves into the margin (Sefaria style) instead of its own row above each line.
- **Commentaries fold into a count.** Each line gets a small marker at its end, for example
  `💬 3` (or a plain "3 comments"), when it has commentaries. Tapping it opens the panel on its
  **Commentary** tab, listing each commentator with the first line of the comment; tap one to
  read it all. In **Aa → Commentaries** the reader can choose one or two to show under every line
  (for example, Rashi on Chumash), the AlHaTorah idea. The default: none shown inline.
- **Tapping a word** opens the word card next to it (3.5). One mode for everyone; "Study words"
  goes away. The team's study notes (roots, phrases, "also appears in") show inside the word
  card whenever the text has them, and the dotted underline for known roots stays.
- **Tapping a line** (anywhere that is not a word) selects it with a thin accent bar on its
  start side, and opens the panel on the **Line** tab (see below). Nothing is pushed into the text.
- **A first-tap hint.** The first time someone opens the reader, one dismissible line under the
  bar says "Tap a word for its meaning, or a line to ask about it." It replaces the instructions
  in today's edition strip and on the Learn page.

**The Line tab** (in the panel on a computer, the sheet on a phone):

- Four buttons in a 2 by 2 grid: **Explain**, **Word by word**, **Commentaries**, **In halacha**
  ("Where is this used in halacha?").
- "Let me try translating" as a quiet text button under them.
- The question box: "Ask about this line…".
- The answer appears in the panel, under the buttons, with its own scroll. The text never moves.

### 3.5 The word card

This is the heart of the change, and the answer to "I have to scroll down all the way to get to
these words". The same card is used in the reader and on the printed page.

**On a computer: a popover beside the word.** It opens just below the tapped word (above it if
the word is low on the screen), with a small pointer to the word. Width 360 pixels; height grows
with what it shows, at most 60 percent of the window, scrolling inside.

```
            ┌──────────────────────────────────────────────┐
            │  בערבין           ‹  ›                    ✕  │
            │  ב "in" + ערבין                               │
            │  Meaning   Translation   Commentary   Ask     │
            │ ─────────                                     │
            │ ┃Jastrow · meanings only ⓘ   עָרִב II         │
            │ ┃spiced, sweet; pleasing.                  ▾  │
            │ ┃Jastrow · meanings only ⓘ   עָרֵב III        │
            │ ┃bondsman, surety.                         ▾  │
            │ ┃Jastrow · meanings only ⓘ   ערְבָּא          │
            │ ┃willow.                                   ▾  │
            │ ┃Radak, Sefer HaShorashim     ערב           ▾  │
            │                                               │
            │  ☆ Save to My words      ⤢ Open in the panel  │
            └──────────────────────────────────────────────┘
```

- **The word** (28 pixels) on the first line, with **‹ ›** to move to the previous or next word
  of the line without closing (Quran.com), and ✕.
- **The breakdown** on the second line: the letters in front with their meaning, the ending, and
  a guessed root marked "guess" with what was changed, as now.
- **Tabs: Meaning · Translation · Commentary · Ask.** The card opens on **Meaning**.
- **Meaning:** one row per dictionary entry, each showing its dictionary's colored edge and name,
  the headword, and the **first sense only, on one line** ("spiced, sweet; pleasing."). Tapping
  a row (▾) opens the full entry in place. Five entries take about five rows, not three screens.
  The first sense is cut from the dictionary's own text, never written by RabAI.
- **The Jastrow notice stays on every entry, in fewer words.** Today: "Its author was not
  Orthodox. RabAI uses it only for what words mean." under each entry. Proposed: the entry's
  label reads "Jastrow · meanings only", and ⓘ (or the open entry) shows the full sentence. The
  maintainer should confirm that this meets the rule that every Jastrow entry says so; if not,
  keep the full sentence, but as one short gray line on the open entry.
- **Translation:** the line's English from the library, with its translator named. If the
  library has none: "No English for this line in the library yet" and a **Translate** button
  (RabAI's, only when tapped), whose result appears in the tan box with its label "RabAI's
  translation. Not from the library, and not yet reviewed by the rabbinic board." "Word by word"
  sits here too, with the tapped word outlined, as now.
- **Commentary:** the Rashi and Tosafot (or the reader's commentaries) on this line, each folded
  to its opening words; tap to open. On the printed page each one has "Show on the page".
- **Ask:** "Ask RabAI about this word", "Explain this line", "What do the commentaries say?", and a
  question box. **Nothing is sent until the person taps a button.** When no dictionary has the
  word, the card opens on this tab with "Ask RabAI about this word" as the main button, as today.
- **Footer:** "Save to My words", and **"Open in the panel"**, which moves the card into the
  side panel for long study (STEPBible's ladder: quick look, then the full panel).
- **What the card does not do:** it does not move the text, and it does not call the model.
- **Keyboard:** Escape closes it; left and right arrows move between words while it is open.

**On a phone: a short sheet at the bottom.** Same content, same tabs.

```
 ┌──────────────────────────────────┐
 │  (the text, scrolled so the      │
 │   tapped word sits in the top    │
 │   third, still visible)          │
 │        ...  קורין את שמע [בערבין] │
 ├──────────────────────────────────┤  ← about 45% of the screen
 │  ───   (drag handle)             │
 │  בערבין        ‹ ›           ✕   │
 │  ב "in" + ערבין                   │
 │  Meaning  Translation  Comm.  Ask │
 │  ┃Jastrow · meanings only  עָרִב II│
 │  ┃spiced, sweet; pleasing.     ▾ │
 │  ┃Jastrow · meanings only  עָרֵב III│
 └──────────────────────────────────┘
```

- **It opens at about 45 percent of the screen** (Kindle's short card), showing the word, the
  breakdown, the tabs and the first two or three meanings. **Drag it up** to 90 percent for
  more; drag it down or tap the text to close.
- **The text scrolls so the tapped word sits in the top third,** above the sheet, so the word
  stays in view while you read its meaning.
- **Tapping another word** while the sheet is open updates the sheet in place.
- The tabs and buttons are at least 44 pixels tall.

### 3.6 The printed Gemara page and its panel

**The bar, one row:**

```
 ←   ‹  ברכות ב.  Berakhot 2a  ›            View ▾
```

- The arrows sit beside the title. The title opens a daf picker for the tractate.
- **View** holds: page size (− +), vowels (נִקּוּד), "Show the flow", and "What the colors mean".
  On a computer, "Show the flow" may also stay as its own button, because it is a main feature.
- Phone: 48 pixels, one row.

**The panel on a computer** (380 pixels, beside the page) uses the same tabs as the word card,
and **opens on the Meaning tab with the word at the top**:

```
 ┌ Gemara · Berakhot 2a:1 ─────────────── ✕ ┐
 │ בערבין          ‹ ›                       │
 │ ב "in" + ערבין                            │
 │ Meaning  Translation  Rashi & Tosafot  Ask│
 │ ┃Jastrow · meanings only   עָרִב II    ▾  │
 │ ┃spiced, sweet; pleasing.                 │
 │ ┃...                                      │
 │                                           │
 │ ── This line ──────────────────────────── │
 │ מאימתי קורין את שמע בערבין משעה ...  (2 lines,│
 │ "more")                                    │
 │ Mark this line  ● ● ● ●                    │
 └───────────────────────────────────────────┘
```

- **Measured goal:** with the window at 860 pixels, the word, its breakdown and the first three
  dictionary rows are visible with **no scrolling** (they fit in the top 400 pixels). Today they
  start at 860.
- **Translation** holds the line's English (folded to four lines with "more"), the translator's
  name, and "Translate this" and "Word by word" for RabAI's labeled translation.
- **Rashi & Tosafot** lists the comments on this line (or, for a comment, the line it explains),
  each folded, with "Show on the page".
- **Ask** holds "Ask RabAI about this word", "Explain this line", "What do Rashi and Tosafot
  say?" and the question box. The answer appears in this tab.
- The line's Hebrew and the four mark colors sit in a small "This line" section at the bottom of
  every tab, so marking needs no hunting.
- When the outline ("the flow") is on, the line's kind and note appear as one colored line under
  the word, with its label "RabAI's outline, not yet reviewed".

**On a phone,** the same panel is the short bottom sheet from 3.5, opening on Meaning.

**The page itself:**

- **Show the selected line as one soft tint** behind its words (like a highlighter), not a box
  around each piece. The tapped word gets the solid accent; the linked Rashi and Tosafot get a
  lighter tint.
- **Phone fit:** open the page **fit to the screen width**, the whole amud visible, with
  pinch-to-zoom and double-tap to zoom into the spot tapped. If the Rashi and Tosafot are too
  small to read at that size, offer a **"Gemara only"** column view in View, rather than cutting
  off the outer column without saying so.
- **The note under the page** (editions, how the layout was made, estimated words) folds into an
  "About this page ⓘ" link. The dotted underline for estimated words keeps its own one-line
  explanation, because the rules require those words to be marked.
- **Marks and the flow must not look alike.** The flow colors fill behind the text. The person's
  own marks become a colored bar in the page margin beside the line (and a colored underline in
  the line view), so both can be on at once.

### 3.7 Phones, all together

| Area | Height | What it holds |
|---|---|---|
| Top bar | 48 px + safe area | Mark, Chat / Learn, ⚙ (app); or ←, title, ‹ ›, Aa (reader) |
| Reading area | the rest | Text or chat |
| Composer (Chat) | about 64 px + safe area | 🎤, question box, Ask |
| Word or line sheet | about 45% when open, up to 90% | The word card or the Line tab |

- Bars hide while scrolling down and come back when scrolling up, in the reader and on the page.
- Every tap target is at least 44 by 44 pixels.
- Actions sit near the bottom, where the thumb is.
- Nothing scrolls sideways unless the person zoomed in.

---

## 4. Visual direction

The app vision already sets the feel: "warm paper tones, a classic Hebrew serif, generous space,
and a reader that echoes the traditional printed page". Today's cool gray and blue look more
like a settings screen than a sefer. This keeps the same fonts and moves the colors toward paper.

### Type

| Use | Font | Size (computer / phone) | Line height |
|---|---|---|---|
| Hebrew, reader text | Frank Ruhl Libre | 24 / 22 | 1.75 |
| Hebrew, commentary opened | Frank Ruhl Libre | 19 / 18 | 1.8 |
| Hebrew, the tapped word | Frank Ruhl Libre | 28 | 1.3 |
| Reading English and answers | Source Serif 4 | 17 / 17 | 1.6 |
| Interface text | IBM Plex Sans | 15 | 1.45 |
| Small labels | IBM Plex Sans | 13 (never smaller than 12) | 1.4 |
| Titles | Source Serif 4, semibold | 20 | 1.3 |
| The printed page | Romm Vilna and Mekorot Rashi, as now | scaled to the page | as printed |

Hebrew stays large because it is the point: the tapped word is the biggest text on the card. Use
one weight for Hebrew body text (never fake bold or slant, as the page already does); keep enough
line height for nikud and cantillation; keep Hebrew lines to about 40 characters on a computer
(a max width of about 34em) so the eye can find the next line.

### Spacing

Use one scale: **4, 8, 12, 16, 24, 32** pixels. Panels and cards: 16 inside. Between sections:
24. Between a label and its content: 8. Today's paddings run 2, 6, 10, 14, 18, 20 and 22; a single
scale is most of what makes a screen look calm.

### Color, with one meaning each

| Color | Means | Used for |
|---|---|---|
| Ink on warm paper (`#FBF8F1` page, `#FFFDF8` cards, `#1F1B16` ink) | The library's text | Reader and page backgrounds |
| Deep blue (today's `#22508C`) | Something you can do | Buttons, links, the selected word, focus |
| Teal (Jastrow), violet (Radak) | Which dictionary said this | Edge and label of each entry, as now |
| Tan (`#8A4B08` on `#FBF1E4`) | **RabAI's own words, not from the library** | RabAI's translations and word-by-word, the outline's label |
| Neutral gray tag | Not yet approved (testing library) | The testing label, kept on every passage |
| Amber | A warning | "Not connected", errors that need attention |
| Soft red | Safety | Crisis lines |
| The flow's pastels | The outline's kinds | Only on the page, only when "Show the flow" is on |
| The person's four mark colors | The person's own marks | Margin bars and underlines |
| Category tones | The person's chat categories | Dots in the chats list |

Two changes matter most. **Tan is kept only for RabAI's own words,** so a reader learns that tan
always means "RabAI said this, the library didn't". The testing label moves from amber to a
neutral gray tag, because it is a status, not a warning. **Shelf colors** become muted and appear
only as a thin edge on tiles, so a strong brown Talmud shelf doesn't fight the blue buttons.

### Density

Comfortable for reading, compact for controls. Text gets room; controls get fewer pixels. Three
button styles only:

1. **Primary:** filled blue, for the one main action on a screen ("Ask", "Translate this").
2. **Secondary:** a quiet outline or text button, for everything else.
3. **Source chip:** the pale blue chip for citations, and only for citations.

Use icons with labels on computers (🔊 Listen, ☆ Save) and icons alone only where the meaning
is universal (✕, ‹ ›, Aa).

### Dark mode

Keep it. The paper turns to a warm dark (`#1F1D18`, as the page already uses), and every color
role above keeps its meaning.

---

## 5. What to build first

Ordered by gain for the effort. Each item names the files it touches.

1. **Put the word first in the printed-page panel.** Move "The word you tapped", its breakdown
   and its entries to the top of the panel, fold the line's English to four lines with "more",
   and put the rest under tabs (Meaning, Translation, Rashi & Tosafot, Ask). This alone answers
   the maintainer's main complaint. Small.
   *Files:* `web/components/RabaiApp.tsx` (`renderDafView`), `web/app/globals.css` (`.daf-panel`).

2. **One shared word card, with short entries.** Build the card from 3.5 as its own component,
   used by the reader and the page: one-line first sense per entry, full entry on tap, ‹ › for
   the next word, tabs, "Open in the panel". Popover on a computer, short sheet on a phone. Shorten
   the repeated Jastrow notice once the maintainer confirms the wording. Medium.
   *Files:* new `web/components/WordCard.tsx`; `web/components/RabaiApp.tsx` (`renderWordCard`,
   `renderEntries`, `renderBreakdown`, the daf panel); `web/app/globals.css`.

3. **Fold commentaries in the reader.** Show a count at the end of each line and open the
   Commentary tab on tap; add "which commentaries to show" to the Aa menu (default none).
   Medium. *Files:* `web/components/RabaiApp.tsx` (`renderLine`, the reader body),
   `web/app/globals.css` (`.comms`, `.comm`). The `/api/text` data already has what is needed.

4. **Let people move through a book.** Add previous and next to the reader (the text route can
   return them as `/api/daf` already does), a table of contents from the title, and a daf or
   chapter grid on each book's page. Medium. *Files:* `web/app/api/text/route.ts`,
   `web/lib/library/` (the section list), `web/components/RabaiApp.tsx` (reader bar),
   `web/components/LibraryShelves.tsx` (book page), `web/lib/library/catalog.ts`.

5. **One-row bars, with an Aa menu and a View menu.** Rebuild the app header, the reader head
   and the page bar as single rows; move language, text size, vowels and commentaries into Aa;
   move zoom, vowels and the flow legend into View; shorten the testing label to one line with
   ⓘ (still on every passage). Medium. *Files:* `web/components/RabaiApp.tsx`,
   `web/app/globals.css`.

6. **Merge "Study words" into normal tapping.** One way to tap a word; the team's notes show in
   the card when they exist. Small. *Files:* `web/components/RabaiApp.tsx` (`studyMode`,
   `renderLine`), `web/README.md` (the "Study words" description), `docs/app-vision.md` (it lists
   "Study words" as a feature).

7. **Trim the Learn page.** "Continue" cards at the top, a sticky search box, six shelves and
   More, My words and the key words as their own screens, the growth switch in settings, and a
   book page instead of a card in the grid. Medium. *Files:* `web/components/RabaiApp.tsx` (the
   Learn branch), `web/components/LibraryShelves.tsx`, `web/app/globals.css`.

8. **Give reading the whole screen.** On a computer, a text opened from Learn takes the middle
   with the library folded into a left strip; on a phone, the reader is full screen with bars
   that hide on scroll, and a "Back to the answer" when opened from a chat. Medium.
   *Files:* `web/components/RabaiApp.tsx` (layout and `openReader`), `web/app/globals.css`
   (`.app`, `.reader`).

9. **Fit the printed page on phones.** Fit to width with pinch and double-tap zoom, a "Gemara
   only" view, one soft tint for the selected line, marks as margin bars. Medium to large.
   *Files:* `web/components/DafPrinted.tsx`, `web/components/DafPage.tsx`,
   `web/components/RabaiApp.tsx`, `web/app/globals.css`.

10. **Clean up the look.** One spacing scale, three button styles, the color roles above, the
    RabAI mark only on the welcome, warm paper backgrounds. Do this alongside items 1 to 5 so
    each screen is redone once. Medium. *Files:* `web/app/globals.css` first, then class names in
    `RabaiApp.tsx` and `LibraryShelves.tsx`.

11. **Chats in a column.** The chats list as the left column of Chat on a computer and a full
    screen list on a phone; the chat's name and ⋯ menu at the top of the conversation. Small to
    medium. *Files:* `web/components/RabaiApp.tsx` (`renderChatsPanel`, chat header).

12. **Better order for dictionary entries** (later, and not a screen change): put the entries
    whose reading matches the word's form most closely first. *Files:* `web/app/api/word/route.ts`,
    `web/lib/library/word-parts.ts`.

Items 1, 2 and 6 together remove the main complaint. Items 3, 4 and 5 remove most of the
clutter and the navigation problems. Every item should end with the existing checks
(`cd web && npm test && npm run typecheck`, and `python3 tools/validate.py`) and a look at the
phone and computer widths.

### Rules this plan keeps

- **The lock.** Nothing here touches `web/proxy.ts` or `web/lib/access.ts`. The app stays locked
  behind its access code.
- **RabAI explains a word only when asked.** The word card shows only the library's dictionaries
  and the team's notes. The Ask tab never sends anything by itself; the model is called only when
  the person taps "Ask RabAI about this word", another Ask button, or sends a question.
- **RabAI's words are always labeled.** Its translations and word-by-word lists keep the tan box
  and the label "not from the library, and not yet reviewed by the rabbinic board". The outline
  keeps "RabAI's outline, not yet reviewed". Tan is reserved for these, so the label and the
  color say the same thing. An always-on word-by-word line under every word (Quran.com's inline
  mode) is **not** proposed, because our word-by-word comes from RabAI and must be asked for one
  passage at a time.
- **Citations only with the checked answer.** The chat changes are layout only. A live answer
  still shows only text; source buttons arrive with the final, checked answer. Removing the
  duplicate "Open ..." button changes nothing about which citations appear.
- **The testing library's label.** Every passage keeps "not yet approved by the rabbinic board".
  It gets shorter and grayer, not hidden.
- **Dictionaries are labeled.** Every entry keeps its dictionary's name. The Jastrow notice stays on
  every Jastrow entry, in the shorter form only if the maintainer agrees it still "says so".
- **Estimated words on the printed page** keep their dotted underline and note.
- **The flow and RabAI's translations run only when tapped.** Moving "Show the flow" into the
  View menu and "Translate this" into the Translation tab changes where the buttons are, not
  when they run. Both stay on the device, as now.
- **What is kept stays where it is kept now.** Recent reading, chats, words, marks and outlines
  stay in the browser. RabAI's translations stay in its translation library and on the device.

---

## Sources

Read directly (public source code):

- Sefaria reader, panels and dictionary: [`ConnectionsPanel.jsx`](https://raw.githubusercontent.com/Sefaria/Sefaria-Project/master/static/js/ConnectionsPanel.jsx), [`ReaderPanel.jsx`](https://raw.githubusercontent.com/Sefaria/Sefaria-Project/master/static/js/ReaderPanel.jsx), [`ReaderDisplayOptionsMenu.jsx`](https://raw.githubusercontent.com/Sefaria/Sefaria-Project/master/static/js/ReaderDisplayOptionsMenu.jsx), [`TextRange.jsx`](https://raw.githubusercontent.com/Sefaria/Sefaria-Project/master/static/js/TextRange.jsx), [`TextColumn.jsx`](https://raw.githubusercontent.com/Sefaria/Sefaria-Project/master/static/js/TextColumn.jsx), [`LexiconBox.jsx`](https://raw.githubusercontent.com/Sefaria/Sefaria-Project/master/static/js/LexiconBox.jsx)
- Quran.com word popover, settings and study mode: [`QuranWord.tsx`](https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/src/components/dls/QuranWord/QuranWord.tsx), [`defaultSettings.ts`](https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/src/redux/defaultSettings/defaultSettings.ts), [`ContextMenu`](https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/src/components/QuranReader/ContextMenu/index.tsx), [`StudyModeModal`](https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/src/components/QuranReader/ReadingView/StudyModeModal/index.tsx)

From search results (the pages themselves were blocked in this session):

- Sefaria help: [How to access connections on the Sefaria Library app](https://help.sefaria.org/hc/en-us/articles/19815191391388-How-to-Access-Connections-on-the-Sefaria-Library-App), [An overview of reference tools](https://help.sefaria.org/hc/en-us/articles/18490898825884), [The Resource Panel](https://prod.sefaria.org.il/sheets/219447)
- Quran.com: [Simplifying word by word and audio settings](https://mapping.quran.com/product-updates/simplifying-word-by-word-and-audio-settings), [feedback: can't hover to bring up translation per word](https://feedback.quran.com/bugs/p/cant-hover-to-bring-up-translation-per-word)
- ArtScroll: [App Store listing](https://apps.apple.com/us/app/artscroll-digital-library/id536661409), ["The Starbucks Talmud", Jewish Action](https://jewishaction.com/books/reviews/the-starbucks-talmud/), [Rabbi Jason Miller on the digital Schottenstein](https://blog.rabbijason.com/2012/02/schottenstein-talmud-goes-digital-and.html), [user reviews summary](https://justuseapp.com/en/app/536661409/artscroll-digital-library/reviews)
- Koren and Steinsaltz: [Jewish Press on the Koren English Talmud](https://www.jewishpress.com/addendum/sponsored-posts/koren-publishers-introduces-new-english-talmud/2012/07/13), [Rabbi Michael Samuel, "A tale of two digitized Talmudic translations"](https://www.rabbimichaelsamuel.com/2013/11/a-tale-of-two-digitized-talmudic-translations-artscroll-and-the-steinsaltz-digital-talmud/)
- Mercava: [Prizmah](https://prizmah.org/knowledge/resource/mercava-app-online-interactive-texts), [Herzog College digital resources](https://tfozot.herzog.ac.il/digital_resources/mercava/)
- AlHaTorah: [User guide](https://alhatorah.org/About:User_Guide), ["Torah access reimagined", Jewish Action](https://jewishaction.com/books/reviews/torah-access-reimagined-al-hatorah-org/), [Mikraot Gedolot tutorial](https://mg.alhatorah.org/User_Guide)
- Digital Talmud layouts: [Ezra Brand, "From Print to Pixel", Seforim Blog](https://seforimblog.com/2023/06/from-print-to-pixel-digital-editions-of-the-talmud-bavli/), [The Future of the Talmud (daf-renderer), Georgia Tech](https://dilac.iac.gatech.edu/node/66.html)
- Dicta and Hachi Garsinan: [Seforim Blog guide to online resources, 2022](https://seforimblog.com/?p=5718), [Talk of the Town on Hachi Garsinan](https://thetalmud.blog/2016/06/19/we-read-thus-on-hachi-garsinan-and-learning-talmud-in-the-21st-century/)
- Daf yomi: [Kollel Iyun Hadaf](https://dafyomi.co.il/kollel/kollel.htm), [The Daf Map](https://thedafmap.com/), [Talmud Navigator](https://ohr.edu/talmudnavigator/index.htm), [All Daf](https://alldaf.org/about-all-daf)
- STEPBible: [Quick overview](https://stepweb.atlassian.net/wiki/display/SUG/Quick+overview), [Popup options while hovering](https://stepweb.atlassian.net/wiki/spaces/SUG/blog/2016/04/12/69074946/Popup+options+while+hovering)
- Blue Letter Bible: [Concordance help](https://www.blueletterbible.org/help/conc.cfm), [iPhone lexicon and concordance](https://www.blueletterbible.org/iPhone/man04_2c.cfm)
- Logos and Accordance: [Logos Information panel](https://wiki.logos.com/Information), [Accordance Instant Details](https://www.accordancefiles1.com/helpfiles/14-Win/win14/content/topics/03_ai/the_instant_details.htm)
- YouVersion: [Bible Buying Guide on the app update](https://biblebuyingguide.com/youversion-bible-app-significant-update/)
- Readlang and LingQ: [Readlang forum, "Came from LingQ"](https://forum.readlang.com/t/came-from-lingq-and-have-some-feedback/2699), [FluentU LingQ review](https://www.fluentu.com/blog/lingq-review/), [UX Planet on LingQ usability](https://uxplanet.org/lingq-language-learning-app-usability-3e6f08f3fc50)
- Kindle: [Dummies, using the Kindle dictionary](https://www.dummies.com/article/how-to-use-the-dictionary-on-your-kindle-paperwhite-157147), [TechCrunch on Kindle's dictionary, Wikipedia and Google lookups](https://techcrunch.com/2010/07/29/kindle-iphoneipad-app-now-smarter-with-a-dictionary-wikipedia-and-google)
- DeepL: [Alternatives](https://www.deepl.com/en/features/alternatives)
