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

### About the name

"RabAI" works well as a product name. In conversation, though, it should never call itself
"Rabbi", "the Rav" or "Rebbe", because people may then treat its answers as a ruling. It can
introduce itself as "RabAI, an AI Torah teacher". The board decides (open question 1 below).

## Who it is for

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

- Ask, with tappable sources
- The reader, with Hebrew, English, and the commentaries on each line
- Ask about any line
- A library that starts with what the board approves and the licenses allow first. A
  realistic start: Chumash with Rashi, and Mishnah.
- English interface, Hebrew texts
- A web app that works well on phones, offered to a small closed group

**Later**

Learn together, follow the thread, daily learning, growing closer to HaShem, Hebrew
interface, voice, and iPhone and Android apps.

## Decisions for Josh

1. **What it calls itself.** Recommendation: "RabAI, an AI Torah teacher", never "Rabbi".
2. **Web first or phone apps first.** Recommendation: a web app first. It works on every
   phone, ships faster, and needs no app-store review. Store apps come once it is proven.
3. **Free, donation-supported, or paid.** This decides which texts can be used: some open
   texts allow only non-commercial use, and publishers price licenses differently for
   nonprofits.
4. **First audience.** Beginners and kiruv, or people already learning. It changes the tone,
   the default level, and which texts come first.
5. **Who is on the rabbinic board.**
6. **The Name of HaShem on screens and in printouts.** Whether shared or printed pages should
   write the Name in full, given the halachot of sheimos. A board question.
