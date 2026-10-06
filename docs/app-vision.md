# RabAI — the app

**Draft v0.1.** This describes the product built on top of the founding spec. The founding
spec ([`founding-spec.md`](founding-spec.md)) still governs what RabAI may say. This page is
about what people can do with it and how it should feel.

## The idea in one sentence

A kind, deeply learned Torah teacher that answers from the Orthodox mesorah, opens the actual
sources in front of you, and learns them with you.

## How it should feel

**Like sitting with a wise, warm talmid chacham who has time for you.**

- **Unhurried and kind.** Patient with every question, including the ones people are
  embarrassed to ask. Never condescending, never preachy.
- **Timeless.** It speaks plainly and gracefully, the way a great teacher would have spoken a
  hundred years ago or a hundred years from now. No slang, no hype, no emoji. Every
  substantive point rests on a source.
- **Honest.** It is an AI and says so. It is a teacher, not anyone's rav. When a question
  needs a rav, it says so and helps the person ask well.

The look follows the feel: warm paper tones, a classic Hebrew serif, generous space, and a
reader that echoes the traditional printed page, with the text in the center and the
commentaries gathered around it.

### The voice: a kind rebbe

**Decided (Josh, 2026-10-06).** It calls itself **RabAI**, and it should feel as human and warm
as possible: like a kind rebbe who wants to help his students. It enjoys questions, notices
effort, speaks personally, and always ends with an invitation to keep learning.

One line it never crosses: it never pretends to be a person or a rabbi, and never invents a
life story. If someone asks, it says kindly that it is an AI. The full voice rules are in
[`prompts/core-premises.md`](../prompts/core-premises.md) under "How you speak".

## Who it is for

**Everyone (decided, Josh, 2026-10-06).** Beginners and experienced learners use the same app.
RabAI meets each person where they are: it notices their level from how they ask, answers
simply when it can't tell, and follows when someone asks for "simpler" or "deeper". People can
also set their level once in settings.

| Person | What they want |
|---|---|
| The curious beginner, often with no Hebrew | Honest answers without being judged, and a first taste of the texts |
| The working frum Jew with 15 minutes on the train | To learn something real, quickly, and pick up where they left off |
| The yeshiva or seminary student | Depth, precise references, and the commentaries side by side |
| The parent preparing a dvar Torah for the Shabbos table | A good idea, its sources, and a way to tell it to children |

## What people can do

### 1. Ask
A conversation. RabAI gives a short answer first, then the sources, then offers to go deeper.
Every source in an answer is a tappable chip, for example *Rashi on Bereishit 1:1*.

### 2. See the source
Tapping a source opens the **reader**:

- The original Hebrew or Aramaic, the English, or both side by side.
- The cited line highlighted, with the lines around it for context.
- The commentaries on that line gathered below it (Rashi, Ramban, Ibn Ezra, and so on), each
  one opening in place.
- The edition and translator named on every text.

### 3. Ask about any line
Select a word, a line or a passage, and RabAI offers:

- **Explain this**
- **Word by word**, translating and explaining each word
- **What do the commentaries say?**
- **Where is this used in halacha?**
- **Ask your own question**

The answer appears attached to that line, so the text stays in view.

### 4. Learn together (chavruta mode)
Pick a text: this week's parsha, a perek of Mishnah, a daf of Gemara, a siman of halacha.
RabAI goes through it line by line with you. It asks you what you think before it explains,
notices what you find hard, and adjusts to your level, with or without Hebrew.

### 5. Follow the thread
From any source, see where the idea goes next: a pasuk, then the Mishnah, the Gemara, the
Rambam, the Shulchan Aruch, and the Mishnah Berurah. "Trace this halacha from the Torah to
today" shows the chain as a path you can walk, one source at a time.

### 6. Daily learning
Parsha, Daf Yomi, Halacha Yomit, Rambam Yomi. RabAI offers to learn today's portion with you.

### 7. Growing closer to HaShem (only by choice)
Already specified in the founding spec: off unless the person chooses it, one small step at a
time, never guilt.

### 8. Keep and share
Save sources, add notes, build a personal source sheet, and share a source with someone. A
shared item always shows the source itself, not only RabAI's words about it.

## Guardrails people will notice

- Every substantive claim cites a source, and the source opens with one tap.
- Practical halacha shows the positions and ends with "ask your rav", plus what to ask.
- Safety comes first in any sign of danger.
- No ads. Conversations are private. Nothing a person says is used to train anything without
  their clear permission.

## How it works

1. **The app** (phone or web) sends the question.
2. **Safety check** first.
3. **Search the library.** Only the approved, license-cleared editions in the whitelist. Texts
   are stored at their natural units (a pasuk, a mishnah, a line of Gemara, a se'if), in
   Hebrew and English, with every commentary linked to the line it comments on.
4. **Write the answer.** The AI model runs under the core premises and may use only the
   passages it was given.
5. **Check the citations.** Every reference in the answer must be one of the passages that
   was retrieved. An answer that cites anything else is corrected before it is shown.
6. **Show it.** Each citation carries its exact reference, so tapping it opens the reader at
   the right line.

The links between texts (which Rashi goes on which pasuk, where a Gemara is cited in the
Rambam) may be available as open data, for example from Sefaria. Check the license, as with
everything else in `docs/licensing.md`.

## The first version

Small, excellent, and safe. Then grow.

**In the first version**

- A web app designed for phones first, with a full computer layout as well. On a computer the
  reader opens beside the conversation; on a phone it slides up from the bottom.
- Ask, with tappable sources
- The reader, with Hebrew, English, and the commentaries on each line
- Ask about any line
- A library that starts with what the board approves and the licenses allow first. A
  realistic start: Chumash with Rashi, and Mishnah.
- English interface, Hebrew texts
- Offered to a small closed group first

**Later**

Learn together, follow the thread, daily learning, growing closer to HaShem, Hebrew
interface, voice, and iPhone and Android apps.

## Decisions

**Made (Josh, 2026-10-06)**

1. **Name and voice.** RabAI, warm and personal like a kind rebbe, honest that it is an AI.
2. **Platform.** A web app built for phones first, with a full computer layout. iPhone and
   Android apps come later.
3. **Money.** Free to use, supported by donations. See "Free with donations" in
   [`licensing.md`](licensing.md) for what that means for the texts.
4. **Audience.** Everyone, with RabAI adapting to each person's level.

**Still open**

5. **Who is on the rabbinic board.**
6. **The Name of HaShem on screens and in printouts.** Whether shared or printed pages should
   write the Name in full, given the halachot of sheimos. A board question.
