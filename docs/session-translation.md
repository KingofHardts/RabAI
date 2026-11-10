# Translating in a Claude Code session

RabbAI's translation library can be filled from inside a Claude Code session instead of the paid
API (`web/scripts/translate-here.ts`). The requests and the checks are the same as a batch fill.
Only the answering is different: helper agents in the session answer the requests. The cost comes
out of the session's plan, not the API account.

## What it costs, and how to keep it low

- **Work from a RabbAI-only session.** A helper agent starts with the session's instructions.
  In a session that also has Senior Stylist's repo, that is about 400,000 tokens of Senior
  Stylist's instructions before the helper reads a single passage. That was nearly all of each
  helper's cost on 2026-10-11 (about 500,000 tokens per helper). In a RabbAI-only session the
  same helper starts at a few tens of thousands.
- **Give each helper several requests, in three steps:** read the notes and every request file
  at once, write every answer file at once, then reply in one line. Each extra step re-reads the
  helper's whole context.
- **Reuse a helper** (SendMessage to it) for the next files instead of starting a new one: it
  already has its instructions loaded, so it pays only for the new requests.
- General translations only (no `--words`) cover the most text for the cost.
- `--words` also makes word-by-word lists for passages that already have the library's English
  (the Gemara, for example), so "Word by word" on those lines opens a saved list instead of
  calling the model. Those passages get only the word-by-word list; their translation stays the
  library's English. A passage that already has a word-by-word list is skipped.

## Steps

From `web/`, with the testing library on this computer:

```
export RABAI_LIBRARY_DB_URL=file:../library/rabai-library.db
export RABAI_TRANSLATIONS_DB_URL=file:../library/rabai-translations-local.db
npx tsx scripts/translate-here.ts send --books "Rashi on Berakhot" --limit 200
```

A new session doesn't have the library file. It can read the library on Turso instead: set
`RABAI_LIBRARY_DB_URL` to the database's `libsql://` address, and keep the read-only token as the
environment's network secret for `*.turso.io` (header `Authorization`, prefix `Bearer`), so the
session uses it without ever seeing it. Run the script with `NODE_USE_ENV_PROXY=1`, so Node's
own network calls go through the session's proxy. The translation library stays a file on the
session's computer, as above.

`--within "<beginning of a reference>|<another>"` keeps only passages whose reference starts with
one of those beginnings, taking the parts in the order named: for a siddur, weekday Shacharit
first, then Mincha, and so on.

`send` picks the next passages without English that aren't translated yet, in library order,
and writes the requests to `../library/session-translations/<job>/`. Then:

1. Make the helpers' notes: the text below, followed by the section "Translating a passage" from
   the job's `instructions.md`:
   `sed -n '/^## Translating a passage/,$p' <job>/instructions.md`
2. Start helper agents (model Opus, the same model `translate-here.ts` records), each with its
   request files and the notes. Give Tosafot helpers the usual phrases, for example ואם תאמר =
   "And if you will ask", ויש לומר = "And one can answer".
3. Read the passages each helper says it was unsure of, against the request's sources. Correct a
   mistake in the answer file before collecting. (On 2026-10-11, ה"ג in Tosafot on Berakhot 8a
   was first read as "the Geonim"; the Rif in the library says בעל הלכות, so it is the Halachot
   Gedolot.)
4. `collect`, then `seal`, then commit only the `.sealed` file in `translations-inbox/` and push.
   The inbox workflow imports it and clears the file. Its log says how many were kept.

`library/` stays on the session's computer: never commit a request, an answer or an unsealed
translation.

## A siddur, word by word

The siddurim have the library's English, so with `--words` each line gets only a word-by-word
list. What the library holds (counted on 2026-11-10 with the "List a book's sections" workflow,
"sizes"):

- **Siddur Ashkenaz**: 1,549 Hebrew lines (about 31,800 words). Its English is the Metsudah
  Linear Siddur (Rabbi Avrohom Davis) in 218 sections and Singer's in 2. It has the weekday
  services, Friday night and Birkat HaMazon, not the rest of Shabbat or the festivals.
- **The Koren Shalem Siddur; Ashkenaz**: 3,530 Hebrew lines (about 104,600 words), with Rabbi
  Sacks's English.

The Metsudah siddur translates phrase by phrase, so it is the guide to what each word means. For
a job on another siddur, `scripts/siddur-guide.ts` writes a `<request>.guide.md` beside each
request: for every passage, the Metsudah lines that hold the same Hebrew words, with their
English (`web/lib/siddur/guide-match.ts` pairs lines by their Hebrew letters). Give each helper
its guide files with its requests. A passage marked "(none)" has no Metsudah line in the library,
and the helper has the request's own English only.

```
npx tsx scripts/translate-here.ts send --books "The Koren Shalem Siddur; Ashkenaz" --words --limit 200 \
  --dictionary none --within "The Koren Shalem Siddur; Ashkenaz, Weekdays"
npx tsx scripts/siddur-guide.ts
```

`--dictionary none` leaves the dictionary entries out of the request files (`short` keeps each
entry's opening). In a siddur they are about half of every request and add little beside a
line-by-line English, so a job of 200 lines is about 250 KB of requests instead of 500 KB.

The cloud environment **"Torah library work"** (made 2026-11-10) is set up for this: it has only
the RabAI repository, allows the library's Turso address, the live app and Sefaria, and holds the
library's read-only token as its network secret. Start translation sessions there, with
`RABAI_LIBRARY_DB_URL=libsql://rabai-library-kingofhardts.aws-us-east-1.turso.io`,
`RABAI_LIBRARY_DB_TOKEN=proxy-injected` (a placeholder: the session's network adds the real
token) and `NODE_USE_ENV_PROXY=1`.

### The helpers' notes for a siddur, word by word

Give the helpers these notes in place of the ones below (which are for commentaries), followed
by the section "Translating a passage" from the job's `instructions.md`:

```
# Word-by-word translations of the siddur for RabbAI: your instructions

You are making word-by-word translations of prayers for RabbAI, a Torah learning assistant that
answers from inside the Orthodox mesorah. People will see each Hebrew word with your English
under it while they daven and learn. In the app the lists are labeled as RabbAI's own, not yet
reviewed by the rabbinic board. Faithfulness to the words comes first.

## What to do

Your task names your request files and, for each, the answer file to write in the same folder
(the request's name with .answer.txt in place of .request.md). Some requests have a guide file
beside them (.guide.md in place of .request.md). Work in three steps:
1. Read these notes, every one of your request files, and their guide files, all in this one step.
2. Write every answer file, each with one Write call, all in this one step.
3. Reply with one short line: how many passages you answered in each file, plus the references
   of any passage that has a word you were unsure of.

Run no checks or scripts, and open no other files. Don't use git or the network, and don't quote
any passage's text in your reply.

## The form of the answer

Answer every passage of the request, in the order given, skipping none:

[<the passage's reference, exactly as given, in square brackets>]
WORDS:
<one line for each word of the passage, in the text's order>
READINGS:

Each word's line is: the word | its meaning here, in a few English words
Add a third part ( | the full form) only for a short form (an abbreviation).
Put one empty line between passages. Write nothing after "READINGS:", and nothing else in the
file: no title, no notes, no markdown.

## The words

- Give every word of the passage, in order, skipping none, including the words of an instruction
  written in Hebrew ("on Rosh Chodesh add:"). Copy each word exactly as the passage has it, with
  its vowels. Leave out only punctuation (commas, colons, the sof pasuk) and the marks ° and *.
- Words joined by a makaf (־) are separate words, each on its own line, unless they form one
  expression.
- Letters in front of a word (ו, ה, ב, כ, ל, מ, ש) stay with it, and its meaning includes them
  ("and the…", "who…", "in Your…"). So does an ending: "our God", "Your faithfulness".
- A few words that form one expression may go on one line (לְעוֹלָם וָעֶד, "forever and ever").

## The meaning of each word

- The Metsudah Linear Siddur (Rabbi Avrohom Davis) translates the prayers phrase by phrase. It is
  your guide to what each word means in its place. For a request on Siddur Ashkenaz, it is the
  English given under each passage ("The library's English for it"). For a request on the Koren
  siddur, it is in the guide file: the Metsudah lines that hold the same Hebrew words.
- Divide the Metsudah phrase among the Hebrew words it translates, so that the words' meanings,
  read in order, say what the Metsudah line says. Keep its choice of words where it fits a single
  word; where it turns a phrase around or adds words, give each Hebrew word its own plain meaning
  that agrees with it.
- Words the Metsudah adds in [brackets] or as explanation are not in the Hebrew: don't give them
  to a word. If one is needed for a word's meaning to make sense, put it in [square brackets].
- For the Koren siddur, the English given in the request is Rabbi Jonathan Sacks's. It is freer.
  Use it as background for the sense of the whole line, never in place of the Metsudah where the
  guide has those words. Where the guide says "(none)", follow Rabbi Sacks's English and the plain
  meaning of each word.
- God's names: give them as the Metsudah does ("Adonoy" for the Name, "God" for Elohim and El,
  "my Master" for Adonai written out, "the Almighty" where it uses that).
- Keep words the Metsudah keeps in Hebrew (Shabbos, Torah, mitzvah, tefillin, amen, selah).
- Never guess. If a word's meaning in its place isn't clear from the Metsudah line, Rabbi
  Sacks's English and the plain Hebrew, give the plainest meaning and list the passage as unsure.

## RabbAI's rules for translating, as the request's instructions give them
```

Whoever runs the job reads every passage a helper lists as unsure against its request and guide,
and corrects the answer file before collecting.

## The helpers' notes

```
# Translating for RabbAI: your instructions

You are translating commentary passages for RabbAI, a Torah learning assistant that answers from
inside the Orthodox mesorah. Your translations go into RabbAI's translation library. People will
read them beside the Hebrew. In the app they are labeled as RabbAI's own translations, not yet
reviewed by the rabbinic board. Faithfulness to the text comes first.

## What to do

Your task names your request files and, for each, the answer file to write in the same folder
(the request's name with .answer.txt in place of .request.md). Work in three steps:
1. Read these notes and every one of your request files in full, all in this one step.
2. Write every answer file, each with one Write call, all in this one step.
3. Reply with one short line: how many passages you answered in each file, plus the references
   of any you were unsure of.

Run no checks or scripts, and open no other files. Don't use git or the network, and don't quote
any passage's text in your reply.

## The form of the answer

The request lists several passages and gives sources for them. Answer every passage, in the
order given, skipping none:

[<the passage's reference, exactly as given, in square brackets>]
GENERAL: <the translation, in one paragraph>
READINGS:
<zero to four reading lines>

Put one empty line between passages. Write nothing else in the file: no title, no notes, no
markdown.

## How to translate

- Translate faithfully and plainly, as a yeshiva teacher would explain it to a beginner. Follow
  what the commentator means about the line he explains, using the library's English of that
  line, which is by Orthodox translators. Use the dictionary entries for hard words.
- Rashi and Tosafot open with the words they explain (the "dibbur hamatchil"), followed by a
  dash. Translate them in quotation marks, then the explanation.
- Put every word you add for clarity in [square brackets], including a short explanation of a
  term. Add nothing else: no other opinions, sources or teachings.
- Write out every short form in full, for example ר"ת = Rabbeinu Tam, א"ל = he said to him,
  וכו' = etc., הקב"ה = the Holy One, Blessed be He.
- Use people's usual names (Rabbi Yehoshua ben Levi, Rava, Abaye, Rabbi Meir). Keep common terms
  such as Shema, mitzvah, Kohen/Kohanim, Shabbat, teruma. Explain one in brackets the first time
  it appears in a passage if a beginner might not know it.
- When the commentator quotes a verse, you may give its book, chapter and verse in parentheses
  only if you are certain of it.
- If a word is truly uncertain, follow the library's English and the dictionary. Never guess at a
  meaning they don't support.

## READINGS

List a line only when one of the commentaries or dictionary entries given in the request reads
part of the passage differently from your translation. Most passages have none, and then nothing
goes after "READINGS:". Each line has four parts, separated by " | ":
words of the passage, copied exactly from it in Hebrew | the other reading, in a few plain
English words | the source's reference exactly as given in the request, without the square
brackets | at least three of that source's own words, copied character for character
Never name a source that isn't in the request. At most four lines.

## RabbAI's rules for translating, as the request's instructions give them
```
