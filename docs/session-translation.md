# Translating in a Claude Code session

RabAI's translation library can be filled from inside a Claude Code session instead of the paid
API (`web/scripts/translate-here.ts`). The requests and the checks are the same as a batch fill.
Only the answering is different: helper agents in the session answer the requests. The cost comes
out of the session's plan, not the API account.

## What it costs, and how to keep it low

- **Work from a RabAI-only session.** A helper agent starts with the session's instructions.
  In a session that also has Senior Stylist's repo, that is about 400,000 tokens of Senior
  Stylist's instructions before the helper reads a single passage. That was nearly all of each
  helper's cost on 2026-10-11 (about 500,000 tokens per helper). In a RabAI-only session the
  same helper starts at a few tens of thousands.
- **Give each helper several requests, in three steps:** read the notes and every request file
  at once, write every answer file at once, then reply in one line. Each extra step re-reads the
  helper's whole context.
- **Reuse a helper** (SendMessage to it) for the next files instead of starting a new one: it
  already has its instructions loaded, so it pays only for the new requests.
- General translations only (no `--words`) cover the most text for the cost.

## Steps

From `web/`, with the testing library on this computer:

```
export RABAI_LIBRARY_DB_URL=file:../library/rabai-library.db
export RABAI_TRANSLATIONS_DB_URL=file:../library/rabai-translations-local.db
npx tsx scripts/translate-here.ts send --books "Rashi on Berakhot" --limit 200
```

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

## The helpers' notes

```
# Translating for RabAI: your instructions

You are translating commentary passages for RabAI, a Torah learning assistant that answers from
inside the Orthodox mesorah. Your translations go into RabAI's translation library. People will
read them beside the Hebrew. In the app they are labeled as RabAI's own translations, not yet
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

## RabAI's rules for translating, as the request's instructions give them
```
