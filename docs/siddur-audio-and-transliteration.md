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
- **RabbAI's own voice** for reading answers aloud, when a speech service is set up (see "Setting up
  the voice" below). Without one, the app uses the device's voices and prefers a man's voice. Either
  way, Hebrew words and rabbis' names are respelled so the voice says them right, Hebrew with vowels
  is read in English letters, and God's names are said as in learning ("Hashem", "Elokim").

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

Two services can give RabbAI its own voice. Both read English well; for Hebrew, ElevenLabs' newer
models (v3, v4) list Hebrew among their languages, while OpenAI says its voices are tuned for
English. **Recommended: ElevenLabs**, with an original voice made in its Voice Design.

1. In ElevenLabs, open Voice Design and describe the voice by its qualities, never a real person.
   A description that fits: *"An older man in his seventies with a warm, deep, gentle voice. He
   speaks slowly and thoughtfully, like a kind teacher explaining an old text to a student across
   the table. A light Ashkenazi Jewish accent from a lifetime of learning. Calm, never theatrical."*
   Listen to the previews with a sentence like "Rashi asks, and Tosafot answers: the Gemara says
   Hashem gave Moshe Rabbeinu the whole Torah," and save the one that sounds right.
2. Copy the new voice's ID, and create an API key.
3. In Vercel (project `rab-ai`, Settings, Environment Variables), add `ELEVENLABS_API_KEY` and
   `ELEVENLABS_VOICE_ID`. Optional: `ELEVENLABS_MODEL` (default `eleven_v3`).
4. Redeploy. In RabbAI's Settings, the Voice choice shows "RabbAI's voice"; it is the default.

The other choice is OpenAI's speech model: add `OPENAI_API_KEY` (and optionally
`OPENAI_TTS_VOICE`, default `ash`, and `OPENAI_TTS_MODEL`, default `gpt-4o-mini-tts`). Its voice
takes the description in `web/lib/voice/provider.ts`. One search result showed the model marked as
deprecated on OpenAI's page; check before choosing it. With both set, `RABAI_VOICE_PROVIDER`
chooses.

Costs: both charge for the length of the text read. Only answers someone chooses to hear (or that
Talk reads) are sent, in pieces of up to 1,200 characters.

Words the voice says wrong can be added to `web/lib/voice/lexicon.ts`.

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
- ElevenLabs models and Hebrew: [Models](https://elevenlabs.io/docs/overview/models),
  [Eleven v3](https://elevenlabs.io/blog/eleven-v3),
  [a Hebrew text-to-speech comparison](https://github.com/danielrosehill/Hebrew-TTS-Providers).
- OpenAI speech: [Text to speech guide](https://developers.openai.com/api/docs/guides/text-to-speech),
  [gpt-4o-mini-tts](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts).
