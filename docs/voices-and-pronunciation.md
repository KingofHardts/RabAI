# RabbAI's voice: how it says words, and how to choose or make a voice

Josh asked (2026-11-10) for three things: the voice should say "RabbAI" as "Rab", then the letters
A and I; it should put the emphasis in the right place in Hebrew words and say the rabbis' names
correctly; and he wants to understand how to use different voices and make a good one.

One limit, said plainly: nobody working on the code can hear the voice. Everything below was built
from the speech service's own guidance and checked on the text the voice is given, and the health
check measures whether the voice spells its marks out. Whether a word *sounds* right is for a
person to judge, which is why Settings now has a place to hear any word and fix it.

## How the voice is told to say a word

A speech voice reads English spelling. Left alone it says "Chazal" with the "ch" of "chair", and
guesses where the emphasis goes. RabbAI's app prepares the text before the voice gets it
(`web/lib/voice/`), in three ways:

1. **A list of words and names** (`web/lib/voice/lexicon.ts`, about 250 entries): the Name and
   common words, the books of the Chumash, the tractates, the Rishonim and Acharonim and their
   books, and the Sages. Each entry has the spellings found in answers and how to say the word:
   - a respelling, with the stressed part in capitals and "kh" for the throaty sound: `Tosafot` is
     `toh-sah-FOTE`, `Ritva` is `RIT-vah`;
   - the word's exact sounds, written in the International Phonetic Alphabet with a mark before
     the stressed part: `/ˌtoʊsɑˈfoʊt/`.
2. **Hebrew written with vowels** (a line of a siddur, a verse) is turned into English letters with
   its stress: `baRUKH aTAH … MElekh ha'oLAM`. The rules are the usual grammar: the last syllable
   is stressed, except in the kinds of words that stress the one before it (melekh, sefer, bayit,
   shamayim, lefanekha, Elokeinu, kidshanu, amarti, vayomer, laylah, and so on). Where a verse has
   the Torah's cantillation marks, the stress is read from them. It is a careful guess where the
   text doesn't mark it, and a few words will be wrong.
3. **"RabbAI"** is always given to the voice as `Rab AI`, which every voice reads as "Rab", then
   "A", "I".

Which form the voice gets depends on the voice:

| Voice | Names | Hebrew with vowels |
|---|---|---|
| RabbAI's usual voice (ElevenLabs' newest models, used for "Listen") | exact sounds | stress in capitals |
| Talk's quick voice | stress in capitals | stress in capitals |
| The device's own voices | respelled, no capitals (some of them spell capitals out) | respelled |

ElevenLabs says its newest models read exact sounds written between slashes correctly about 80 to
90 times in 100, and suggests capitals as the way to show stress to models that don't. That is why
names (a few per answer) get exact sounds, and long Hebrew passages get capitals.

**How names are said.** As they are usually said in English among people who learn: geh-MAH-rah,
RAHM-bahm, hah-LAH-khah, MISH-nah b'ROO-rah. A word written the Israeli way is said that way
(`Shabbat`: shah-BAHT, `Tosafot`: toh-sah-FOTE), and one written the Ashkenazi way that way
(`Shabbos`: SHAH-bis, `Tosfos`: TOHS-fos). If you would rather have the Israeli stress everywhere
(rahm-BAHM, ge-ma-RAH), say so and the list changes in one pass.

RabbAI's usual voice already says some well-known words well (Rashi, Mishnah, Shabbat, Torah), so
those are left to it; the list steps in for the ones it is likely to get wrong.

## Hearing a word, and fixing it yourself

**Settings, then "Pronunciation: how RabbAI says words".**

- **Try a word or a sentence.** Type anything (Hebrew with vowels works too) and press **Hear it**.
  Under the box you see exactly what the voice was given.
- **Where the stress falls.** Four choices, so you can listen and keep the one that sounds best:
  *Auto* (the table above), *Sounds* (exact sounds for Hebrew passages too), *Capitals* (capitals
  for everything), *Plain* (no stress shown, as it was before).
- **Fix a word yourself.** Type the word as it is written and how to say it, for example `Ritva`
  and `RIT-vah`. Press **Hear** until it sounds right, then **Save**. Tips: put the stressed part
  in CAPITALS; write "kh" for the throaty sound; "ah" as in father, "ee" as in see, "oo" as in
  food, "ay" as in day, "oh" as in go; hyphens between syllables. Your fixes are used at once, on
  that device only.
- **Copy my fixes** copies your list. Send it, and the words are added to the shared list for
  everyone.

When you hear a name said wrong while learning, that is the place to go.

## Choosing a voice

**Settings, then Voice.** With ElevenLabs set up, the list shows the account's voices, men's first,
and **Hear it** plays a sample. Each person's choice is kept on their own device. The default for
everyone is a kind, calm older man's voice (ElevenLabs' stock voice "Bill"), unless
`ELEVENLABS_VOICE_ID` in Vercel names another.

To add more voices to the list: in ElevenLabs, open **Voices**, then the **Voice Library**, and add
a voice to "My Voices". The app lists whatever stock and designed voices the account has. Voices
cloned from a real person are never listed, whatever the account holds.

## Making a voice (ElevenLabs Voice Design)

Voice Design makes a new, original voice from a written description. Nothing is recorded and
nobody is copied.

1. In ElevenLabs: **Voices**, **My Voices**, **Add a new voice**, **Voice Design**.
2. **Describe the voice by its qualities.** Say the age, the accent, the tone, the pace, and what
   it is for. The more exact the description, the better the result. For example:

   > An older man in his seventies with a warm, deep, gentle voice. He speaks slowly and kindly,
   > like a grandfather who is also a teacher, explaining an old text to a student across the
   > table. Comforting and reassuring, with a light Ashkenazi Jewish accent from a lifetime of
   > learning. Calm and close, never theatrical. Clear studio sound.

   Other directions worth trying, one change at a time: "a man in his fifties, clear and
   energetic, a teacher who loves his subject"; "an older woman, warm and steady, a teacher of
   many years"; "an Israeli accent" or "a soft British accent" in place of the accent above.
3. **Give it a preview text that sounds like RabbAI**, because the voice shapes itself to what it
   is asked to read. Use at least a few sentences, with the words it will meet:

   > Shalom, it's good to learn with you. Let's read this line slowly. Rashi asks a simple
   > question, and Tosafot answers it: the Gemara says Hashem gave Moshe Rabbeinu the whole
   > Torah. What do you think the Mishnah means here? Take your time.
4. ElevenLabs makes three versions. Listen to each. If none is right, change one thing in the
   description and try again: slower, older, warmer, less dramatic.
5. **Save** the one you like. It uses one of the account's voice slots.
6. It now appears in RabbAI's Settings under Voice. To make it the default for everyone, copy its
   ID in ElevenLabs (My Voices, the voice, "Copy voice ID") and set `ELEVENLABS_VOICE_ID` in Vercel
   (project `rab-ai`, Settings, Environment Variables), then redeploy.

What makes a voice good for this: it should stay calm over a long answer, sound close rather than
like an announcer, and be clear at a slow pace. Test each candidate in RabbAI itself, with the
"Try a word or a sentence" box and with a real answer, before making it the default, since a voice
can sound fine on one sentence and tire over a page.

**What is not allowed.** RabbAI's voice is never a copy or an imitation of a real person's voice:
no voice cloning, and no description that names or points at a real rabbi or speaker. Describe
qualities only.

## Different voices for different things

Today each person picks one voice, and Talk uses a quicker version of it. Possible next steps, if
wanted: a separate voice for Talk and for "Listen"; a voice for each way of learning with a
chavrusa (the questioner, the partner); a voice per language. Each is a small change once the
voices exist in the account.

## What the health check measures

"Is RabbAI working?" asks the voice for the same sentence with and without the marks (capitals,
and exact sounds) and compares how long the audio is. A voice that spelled the marks out letter by
letter would take much longer, and the check says so. It cannot tell whether a word sounds right.

## Sources (web searches on 2026-11-10; ElevenLabs' own pages could not be opened from the session)

- ElevenLabs, text to speech best practices (pronunciation, capitals, exact sounds between
  slashes): https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices
- ElevenLabs, prompting its v3 model: https://elevenlabs.io/docs/best-practices/prompting/eleven-v3
- ElevenLabs, Voice Design: https://elevenlabs.io/docs/eleven-creative/voices/voice-design
