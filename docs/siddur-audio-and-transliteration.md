# Transliteration, recordings and RabbAI's voice: what to ask for

Josh asked (2026-11-04) for transliteration in the Daven tab, recordings of the prayers if we can
get the rights, and a natural voice that sounds like an older, wise teacher, with Hebrew words and
rabbis' names said correctly. This page lists what we found, what is built, and what Josh can ask
for. The publishers and sites below are leads to check, not confirmed offers: each needs a written
permission recorded in `canon/permissions.yaml` before anything of theirs enters the app.

## What is built now

- **Transliteration** in the Daven tab (Settings in the siddur: Transliteration, Israeli or
  Ashkenazi), made by RabbAI from the siddur's own vowels. It is labeled as RabbAI's and not yet
  reviewed by the board, and it can have small mistakes (a kamatz katan, a silent or sounded
  sheva). God's Name reads "Adonai" (Ashkenazi "Adonoy"), as it is said in prayer.
- **RabbAI's own voices** for reading answers aloud, when a speech service is set up (see "Setting
  up the voice" below): a choice of natural voices in Settings, with "Hear it", and a kind, calm
  older man's voice by default. Without one, the app uses the device's voices and prefers a man's
  voice. Either way, Hebrew words and rabbis' names are respelled where a voice would say them
  wrong, Hebrew with vowels is read in English letters, and God's names are said as in learning
  ("Hashem", "Elokim").

## Transliterated siddurim to ask about

A published transliteration, checked by its editors, would be better than RabbAI's own.

| Edition | Publisher | Notes |
|---|---|---|
| ArtScroll Transliterated Linear Siddur (weekday and Shabbat volumes) | Mesorah Publications (ArtScroll) | The transliteration follows the OU/NCSY system and is the one most used in American Orthodox shuls. Ask Mesorah for a license for private use first. |
| Siddur Tehillat Hashem, transliterated editions | Kehot Publication Society (Chabad) | Nusach Ari. Kehot sells transliterated siddurim; ask Kehot (or Chabad.org, which already gave permission for its site) whether that permission can cover a transliterated text. |
| Koren | Koren Publishers | The Koren siddur we use has no transliterated edition that we could find. Worth asking Koren whether one exists or is planned. |

Not suitable: the Open Siddur Project's texts are openly licensed (CC BY-SA by default), but most of
its contributions come from outside the Orthodox world, so they would need the board's review one
by one.

## Recordings of the prayers to ask about

We found no complete, openly licensed recording of the Orthodox davening in Nusach Ashkenaz.
Leads, all needing permission:

- **Chabad.org**: recordings of the Mourner's Kaddish and the Rabbis' Kaddish in Chabad, Ashkenaz
  and Sefardi versions. Chabad.org already gave permission for its site (private use), but its
  Cloudflare check blocks our copier; the recordings could be linked or sent to us.
- **The United Synagogue (UK)**: Orthodox, Ashkenazi recordings (High Holy Day services among
  them), copyrighted and available only with permission. A good lead for weekday davening too.
- **Mostly Music, "The Davening Collection"**: a commercial set of recordings; ask the producer.
- Not suitable: SiddurAudio.com and Hadar follow non-Orthodox practice.

If Josh gets a set of recordings, the Daven tab can play the recording for a prayer beside its text.

## Setting up the voice

RabbAI reads answers in a natural, human voice when a speech service is set up. Without one it
uses the phone's or computer's built-in voices, which sound robotic; that is what you hear today.

**Recommended: ElevenLabs.** Its voices sound the most human of the services we looked at, and its
newer models read Hebrew.

1. Make an ElevenLabs account at elevenlabs.io. The free plan is enough to try the voices; for
   everyday use, a paid plan (see Costs below).
2. Create an API key (in ElevenLabs: Developers, API Keys, Create). Allow **Text to Speech** and
   **Voices** (read access is enough). Copy the key.
3. In Vercel (project `rab-ai`, Settings, Environment Variables), add `ELEVENLABS_API_KEY` with
   that key. Redeploy.
4. In RabbAI's Settings, **Voice** now lists RabbAI's voices: men's voices first, then women's.
   The recommended one, a kind, calm older man's voice (ElevenLabs' stock voice "Bill" unless you
   choose another), is the default. Pick any voice and tap **Hear it**; each person's choice is
   kept on their own device.
5. Optional: to change the default for everyone, copy a voice's ID from ElevenLabs (My Voices, the
   voice, its ID) and add it in Vercel as `ELEVENLABS_VOICE_ID`.
6. Optional: design an original voice. In ElevenLabs, open Voice Design and describe the voice by
   its qualities, never a real person. A description that fits: *"An older man in his seventies
   with a warm, deep, gentle voice. He speaks slowly and kindly, like a grandfather who is also a
   teacher, explaining an old text to a student across the table. Comforting and reassuring, with
   a light Ashkenazi Jewish accent from a lifetime of learning. Calm, never theatrical."* Listen to
   the previews with a sentence like "Rashi asks, and Tosafot answers: the Gemara says Hashem gave
   Moshe Rabbeinu the whole Torah," and save the one that sounds right. It appears in RabbAI's
   list, and step 5 makes it the default.

Voices cloned from a particular person (ElevenLabs' instant and professional voice clones, and
its "iconic" voices) are never offered, even if the account has them: RabbAI's voice is never a
copy of a real person's voice. The stock voices ElevenLabs provides to every account, and voices
made with Voice Design, are offered.

The model is `eleven_v4` (ElevenLabs' newest, from September 2026); if it refuses a request, the
app uses `eleven_v3`. `ELEVENLABS_MODEL` chooses another (`eleven_multilingual_v2` is very steady
over long reading but does not read Hebrew letters).

What makes it sound natural: a middle "stability" setting (steady, but not flat); each piece of an
answer is sent with the end of the piece before it and the start of the piece after it, so the
voice carries on from one to the next instead of starting fresh (where the model takes this); and
only the words a natural voice would say wrong are respelled (the "ch" words, short names like
"Ran" and "Taz", and a few others in `web/lib/voice/lexicon.ts`).

**Costs.** ElevenLabs charges in credits, about one per character read for its main models. A
spoken answer is usually 800 to 2,000 characters. As reported in October 2026 (check ElevenLabs'
pricing page before choosing): the free plan has about 10,000 credits a month and no commercial
license (fine for trying the voices); Starter is about $6 a month for about 30,000; Creator is about
$22 a month for about 100,000, roughly 50 to 120 answers read aloud. Only answers someone asks to
hear (and answers in Talk) are sent.

**The other choice: OpenAI.** Cheaper, and its voices are natural in English, less so in Hebrew. Add
`OPENAI_API_KEY`. Settings then offers its voices: Cedar (the default), Ash, Onyx, Ballad, Echo
and Verse, and the women's voices Marin, Sage, Coral, Shimmer and Nova. It is told to speak as an
older, warm teacher (`web/lib/voice/provider.ts`). `OPENAI_TTS_VOICE` changes the default and
`OPENAI_TTS_MODEL` the model (`gpt-4o-mini-tts`). With both services set, `RABAI_VOICE_PROVIDER`
chooses.

**Without a service**, the app picks the device's best man's voice, a little slower and lower than
usual, and Settings lists the device's other voices.

How the voice says Hebrew words and names, how to hear and fix a word, and how to choose or
make a voice are in `docs/voices-and-pronunciation.md`.

## Sources (suggestions, from web searches on 2026-11-04)

- ArtScroll Transliterated Linear Siddur: [AbeBooks listing](https://www.abebooks.com/9781578191512/Siddur-ArtScroll-Transliterated-Linear-Weekday-1578191513/plp);
  [a Reddit thread on transliterated siddurim](https://reddit.fabiomanganiello.com/r/Judaism/comments/1gj9s33/transliterated_siddur);
  [ArtScroll's place in Orthodox shuls](https://jmoreliving.com/?p=38516).
- Kehot: [Kehot's store](https://store.kehotonline.com/products.asp?dept=320).
- Open Siddur Project license: [its policy page](https://opensiddur.org/?p=11058),
  [Wikipedia](https://www.Wikipedia.org/wiki/Open_Siddur_Project).
- Chabad.org Kaddish recordings: [Kaddish Recordings](https://www.chabad.org/library/article_cdo/aid/1107311/jewish/Kaddish-Recordings.htm).
- United Synagogue recordings: [High Holy Day services audio](https://theus.org.uk/high-holy-day-services-audio-recordings/).
- Mostly Music: [The Davening Collection](https://mostlymusic.com/blogs/news-updates/15606793-the-davening-collection).
- SiddurAudio.com: [the site](https://sidduraudio.com/); Hadar: [about the recordings](https://www.hadar.org/tefillah-music/about-recordings).
- ElevenLabs voices and settings: [List voices](https://elevenlabs.io/docs/api-reference/voices/search),
  [Default voices](https://elevenlabs.io/docs/voices/default-voices),
  [Eleven v4](https://elevenlabs.io/v4), [Best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices),
  [Stitching multiple requests](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching).
- ElevenLabs prices, as reported by others: [HappyRobot](https://www.happyrobot.ai/hub/elevenlabs-pricing),
  [Dupple](https://dupple.com/pricing/elevenlabs).
- ElevenLabs models and Hebrew: [Models](https://elevenlabs.io/docs/overview/models),
  [Eleven v3](https://elevenlabs.io/blog/eleven-v3),
  [a Hebrew text-to-speech comparison](https://github.com/danielrosehill/Hebrew-TTS-Providers).
- OpenAI speech: [Text to speech guide](https://developers.openai.com/api/docs/guides/text-to-speech),
  [gpt-4o-mini-tts](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts).
