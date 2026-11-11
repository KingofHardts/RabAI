# The text and how it is laid out: 100 improvements

Josh asked (2026-11-11) for a hundred quality-of-life improvements to the text itself and how it
is laid out, especially the siddur's layouts ("interlinear or paragraph, and then the third one,
which I don't really understand"; "the spacing doesn't feel correct"), different typefaces, and
a more exact translation than the Koren siddur's ("the most accurate… emes").

The list was written after looking at every layout with the real library text, on a phone and on
a computer. **Built** means done on 2026-11-11. **Next** means small and planned. **Later** means
it needs more work. **Ask** means it needs a decision from Josh or the rabbinic board.

What was found first:
- On a computer every line sat at the left edge with empty space on the right: the rule that
  centers the reading column was overridden by the spacing rule.
- "Line by line" put a whole stanza of Hebrew above a whole stanza of English, so the reader had
  to match them up by eye.
- "Two panes" was always above and below, even on a wide screen.
- The layout button on a phone was only a symbol (≡, ¶, ⋮), and it cycled through three of the
  four layouts without saying what any of them was.
- Long instructions filled a phone's screen before the prayer began.
- The library's Metsudah English had parts of the translator's footnotes run into the
  translation ("My Master, it means 'my Master' … —Avudraham open my lips"): the build's
  footnote filter stopped at the first italic word inside a note.

## A. The four layouts (25)

1. The reading column is centered on a computer, at a comfortable width. **Built.**
2. Line by line pairs each Hebrew line with its own English directly under it. **Built.**
3. When the Hebrew and English aren't printed in the same number of lines, the whole Hebrew is
   given first and then its English, as before. **Built.**
4. Paragraph sets a prayer's Hebrew as one justified block, like a printed siddur. **Built.**
5. In Paragraph, the English follows below a thin rule, so the two are clearly apart. **Built.**
6. "Two panes" is now "Side by side": English on the left and Hebrew on the right on a wide
   screen, above and below on a phone, still scrolling together. **Built.**
7. The layout button opens a picker that names each layout, says in a sentence what it is, and
   shows a small drawing of it. **Built.**
8. All four layouts can be chosen from the bar (it used to cycle through three). **Built.**
9. On a phone the bar shows a short name (Lines, Paragraph, Words, Panes) beside the symbol, so
   the prayer's title keeps its room. **Built.**
10. The layout is also in the settings, with its sentence of explanation. **Built.**
11. Word by word: more room between words, and a thin line under each word's English. **Built.**
12. Word by word now has a translation for every line of the Koren siddur and Siddur Ashkenaz
    (4,933 lines, made 2026-11-11, guided by the Metsudah). **Built** (yesterday's translation
    work).
13. Word by word says it follows the Metsudah's English where it has the same words. **Built.**
14. Line by line with transliteration keeps the Hebrew, its transliteration and its English
    together. **Have.**
15. Side by side keeps a heading level in both columns. **Have.**
16. Remember each layout per siddur (one for Koren, another for Siddur Ashkenaz). **Later.**
17. A "Hebrew only, large" layout for davening without English, with the English a tap away
    under a line. **Next.**
18. In Side by side, tapping a line in one column marks the same line in the other. **Next.**
19. In Line by line, a faint line between pairs when the spacing is close. **Later.**
20. Swipe left or right on the text to change layout. **Later** (swipes move between prayers
    now).
21. Paragraph without line breaks inside a blessing, but a break between blessings. **Have.**
22. Word by word: tap a word to hear it said. **Later.**
23. Word by word: show the transliteration under each word when transliteration is on. **Have.**
24. Word by word: hide the English for a quiz, and show it on tap. **Later.**
25. A "compare two translations" layout: Hebrew, then Rabbi Sacks and the Metsudah under it.
    **Next.**

## B. Letters, sizes and spacing (20)

26. A choice of Hebrew letters: Frank Ruhl (classic), Noto Serif (clear vowels), David,
    Plain (without serifs), and the device's own. **Built.**
27. Each typeface shown as a sample (ברוך אתה) in the settings, in its own letters. **Built.**
28. A choice of English letters: Book, Classic (Garamond), Plain. **Built.**
29. Typefaces load only when chosen or when the settings are open, so the app stays light.
    **Built.**
30. Vowels on or off: "Letters only" for people who read without nekudot. **Built.**
31. The size of the English beside the Hebrew: smaller, same, larger. **Built.**
32. Space between lines: close, usual, roomy. **Built.**
33. Hebrew line height suited to vowels (1.8), English to reading (1.55). **Built.**
34. English lines break more evenly (no single word left alone on a line). **Built.**
35. Headings break evenly on two lines. **Built.**
36. Text size (four steps) stays, and now works with every typeface. **Have.**
37. The settings are grouped: Reading, Letters, What is shown, This siddur, On this device.
    **Built.**
38. A preview line at the top of the settings that changes as you choose. **Next.**
39. A Hebrew typeface with cantillation marks drawn well, for the Torah readings (Taamey
    Frank). **Later** (it isn't on Google Fonts; would be served with the app).
40. The God's-name form shown as the siddur prints it (יהוה or ה׳), as a choice. **Ask.**
41. Bold for words said aloud by the congregation. **Have** (responses are marked).
42. A dyslexia-friendly English typeface. **Later.**
43. Night reading: warmer, dimmer colours for Maariv. **Later** (dark mode exists).
44. Line numbers in the margin for study. **Later.**
45. Remember the letters and sizes in an account, across devices. **Later.**

## C. Translations and accuracy (20)

46. For the Koren siddur, a choice of English: Rabbi Sacks's (Koren's own) or the Metsudah
    Linear Siddur's (Rabbi Avrohom Davis, word for word). **Built.**
47. The Metsudah English is shown only where its siddur has the same Hebrew words, in the same
    order (at least 9 words in 10 shared, both ways). 678 of Koren's 3,384 lines pair this
    closely; the rest keep Rabbi Sacks's. **Built.**
48. A line given the Metsudah English is marked with a green edge, and the settings say what
    the edge means. **Built.**
49. A Metsudah speaker label ("Congregation and Chazzan:") is left out of the English; the Koren
    line shows its own. **Built.**
50. A Metsudah line is never shown in part: if one of its lines is missing, the line keeps
    Rabbi Sacks's English. **Built.**
51. Each siddur says in the settings what it is and whose English it has. **Built.**
52. The Metsudah's own siddurim (Siddur Ashkenaz; the Nusach Sefard linear siddurim for
    weekdays and Shabbat) are offered for the most literal English throughout. **Have.**
53. The translator's footnotes are removed whole from the library's English (the build's
    filter stopped at the first italic word inside a note). **Built** in the build, with a test.
54. The 455 lines in the library that still had leftover notes (Metsudah English in Siddur
    Ashkenaz, Siddur Sefard and the weekday Sefard Linear) are repaired in place by a new
    workflow, without a rebuild. **Built.**
55. Check every other English edition in the library for the same leftover notes and repair
    them the same way (the Metsudah Chumash is the likeliest). **Next.**
56. Pair more Koren lines with the Metsudah by also matching parts of a line (a stanza at a
    time). **Next.**
57. Pair the Koren siddur with the Nusach Sefard linear siddurim too, for the prayers Siddur
    Ashkenaz doesn't have (Shabbat day). **Next** (only where the words are the same; the
    nusach differs in places).
58. Show both translations at once for a line, on tap. **Next.**
59. The footnotes themselves, when wanted: a small marker that opens the translator's note.
    **Later** (the build would have to keep them apart instead of removing them).
60. Rabbi Sacks's commentary on the siddur (in the library) a tap away from a prayer. **Next.**
61. Say plainly which translation is the most literal: Metsudah, then word by word, then
    Rabbi Sacks. **Built** (in the settings).
62. RabbAI's word-by-word lists reviewed by the board. **Ask.**
63. Mark the words RabbAI's word-by-word list was unsure of. **Later.**
64. A request from the reader: "This word looks wrong", kept for the maintainer. **Next.**
65. ArtScroll or Koren's own literal editions, if a licence is ever given. **Ask.**

## D. Instructions, notes and marks (10)

66. A long instruction shows its first three lines and "Read all". **Built.**
67. "Ask about this" sits beside "Read all", smaller. **Built.**
68. "Just the prayers" still puts every instruction away. **Have.**
69. Instructions in a slightly smaller type than the prayers. **Have.**
70. A setting to keep every instruction open. **Next.**
71. Instructions folded to one line once you've seen them today. **Later.**
72. Bow, rise and step marks larger and coloured. **Have.**
73. A mark's explanation in one tap. **Have.**
74. Page references ("on page 134") in Koren's instructions explained as the printed siddur's.
    **Next.**
75. RabbAI's own notes (for siddurim without instructions) labelled as RabbAI's. **Have.**

## E. Moving through the text (10)

76. The bar's progress line shows how far through a service you are. **Have** (built
    2026-11-10).
77. Next and back between prayers in davening order. **Have.**
78. Jump to Barchu, Shema, Kedushah, Aleinu. **Have.**
79. Keep your place in each prayer when you change layout. **Next.**
80. A "back to where I was" after a jump. **Later.**
81. Search within the open prayer. **Later.**
82. Keyboard: arrow keys move between prayers on a computer. **Next.**
83. The bar hides while you scroll down on a phone. **Have.**
84. A slower scroll ("teleprompter") for davening hands-free. **Later.**
85. Open a line from an answer in the chat straight at that line, highlighted. **Next.**

## F. The Learn reader's text (15)

86. The same Hebrew typeface choice in the Learn reader. **Next.**
87. The reader's two panes side by side on a computer. **Have.**
88. Vowels on or off in the reader. **Next.**
89. English size beside the Hebrew in the reader. **Next.**
90. The reader's long English lines limited to a comfortable width. **Next.**
91. Commentary text (Rashi, Tosafot) in a distinct but readable size. **Have.**
92. A "text only" view without commentaries. **Have.**
93. Tap a word for its meaning. **Have.**
94. Line numbers in the reader. **Have** (section references).
95. The leftover-note repair for other books read in the reader (see 55). **Next.**
96. Copy a line with its reference. **Next.**
97. Share a line as an image. **Later.**
98. Print a prayer or a page cleanly. **Later.**
99. Read a line aloud from the reader. **Have.**
100. One place to change letters, sizes and spacing for both the siddur and the reader. **Later.**

## The counts

| Section | Built | Already there | Next | Later | Ask |
|---|---|---|---|---|---|
| A. Layouts (25) | 13 | 4 | 3 | 5 | 0 |
| B. Letters, sizes, spacing (20) | 11 | 2 | 1 | 5 | 1 |
| C. Translations and accuracy (20) | 9 | 1 | 6 | 2 | 2 |
| D. Instructions and marks (10) | 2 | 5 | 2 | 1 | 0 |
| E. Moving through the text (10) | 0 | 4 | 3 | 3 | 0 |
| F. The Learn reader (15) | 0 | 6 | 6 | 3 | 0 |
| All (100) | 35 | 22 | 21 | 19 | 3 |

## About the translations, plainly

- **The Metsudah Linear Siddur** (Rabbi Avrohom Davis, 1981) translates phrase by phrase and
  stays closest to the Hebrew. It is the best of the library's English for knowing what each
  phrase says.
- **Rabbi Jonathan Sacks's translation** in the Koren siddur is faithful and widely trusted, and
  written to read well in English, so it is freer: "O LORD, open my lips" where the Metsudah
  has "My Master, open my lips".
- **RabbAI's word by word** gives each Hebrew word its own English, following the Metsudah where
  it has the same words. It is RabbAI's, not yet reviewed by the rabbinic board.
