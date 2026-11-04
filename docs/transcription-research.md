# A transcription service for Talk (research, 2026-11-04)

On iPhones, Safari's own speech recognition is unreliable, so Talk asks for a tap on every turn
(founding spec, "Talking out loud"). A transcription service on the server would make it work the
same everywhere. This compares the services worth considering and recommends one. Nothing is
built yet: sending a person's voice to an outside service is a new decision, for the maintainer.

## What RabbAI needs

- **English full of Hebrew and Aramaic.** People say "what does Tosafos say about kezayis", in
  Ashkenazi or Sephardi pronunciation, and sometimes a whole sentence in Hebrew. The service has
  to handle a switch between languages mid-sentence, and accept a list of words to expect
  (Rashi, Tosafos, Shulchan Aruch, Mishnah Berurah, mincha, brachos ...).
- **Words while the person speaks** (streaming), fast enough for a conversation.
- **A key that never reaches the browser.** The app's server makes a short-lived, one-use key for
  each conversation; the phone sends its audio straight to the service with it. (Vercel's
  functions can't hold a live audio connection open themselves.)
- **Privacy.** No training on the audio, and nothing kept after the words come back.
- **Price** per hour of talking.

## The services

"To confirm" marks what the search didn't settle. Prices and accuracy figures below are from the services' own pages and from roundups, as found by
web search on 2026-11-04 (the services' documentation sites weren't reachable from this session).
None has an independent test of English mixed with Hebrew, so the choice should be confirmed with
a short test on our own recordings.

| Service | Hebrew mixed into English | Words to expect | Short-lived browser key | Kept / training | Price, streaming |
|---|---|---|---|---|---|
| **Soniox** (v5 real-time) | Yes, says it follows switches mid-sentence, Hebrew included | Yes (context and terms) | Yes: one-use temporary keys, made by our server | No training; nothing kept unless asked | about **$0.12 an hour** |
| **ElevenLabs** (Scribe v2 Realtime) | Hebrew among 90+ languages; switching not stated | Yes, up to 1,000 terms (about $0.05 an hour extra) | Yes: one-use tokens (to confirm) | Zero retention on enterprise plans (to confirm) | about $0.39 an hour, plus terms |
| **AssemblyAI** (Universal-3 Pro streaming) | Hebrew listed with switching in its newest models | Yes, about 100 terms | Yes: temporary tokens (to confirm) | To confirm | about $0.45 an hour |
| **Deepgram** (Nova-3 / Flux) | Hebrew only as a separate Hebrew model (February 2026); its switching model covers 10 languages | Yes (keyterms) | Short-lived grants (to confirm) | Opt out of model improvement per request | about $0.26–0.47 an hour |
| **OpenAI** (gpt-4o-transcribe, Realtime) | Good multilingual accuracy | A written prompt | Yes: ephemeral keys | Kept up to 30 days for abuse checks unless zero retention is granted | about $0.36 an hour |
| Google (Chirp), Microsoft (Azure) | Yes | Yes | Harder to set up for a browser | To confirm | about $1 an hour |

Independent leaderboards (Artificial Analysis) rank ElevenLabs Scribe v2 among the most accurate
for recorded audio, with Deepgram among the best in speed for live audio. Soniox doesn't appear in
their live-audio ranking yet.

## Recommendation

**Soniox**, with **ElevenLabs Scribe v2 Realtime** as the second choice.

Soniox is the only service that says plainly it follows a switch from English to Hebrew in the
middle of a sentence, which is how people talk about Torah. It takes a list of words to expect,
gives one-use keys made for the browser, keeps nothing and trains on nothing, and costs about a
third of the others (an hour of Talk is about 12 cents). Its accuracy claims are its own, so
before building, record ten typical questions (Torah words in Ashkenazi and Sephardi
pronunciation, one sentence in Hebrew) and run them through Soniox and ElevenLabs. If ElevenLabs
is clearly better on those, use it; it is the most accurate in the independent tests, at about
three times the price.

## What building it would take

1. The maintainer opens a Soniox account and adds its key to Vercel as `SONIOX_API_KEY` (never in
   a chat or the repo).
2. A small route (`/api/talk/key`) makes a one-use key for one conversation, behind the access
   code like the rest of the app.
3. Talk records with the microphone and sends the audio straight to Soniox with that key, with
   RabbAI's list of Torah words; the words it returns go into Talk's existing turn-taking
   (`web/lib/talk.ts`) unchanged. When the setting is missing, Talk keeps using the browser's own
   recognition.
4. The founding spec, the privacy page and the CLAUDE.md voice rule change to say that, in Talk,
   the person's voice goes to the transcription service and nothing is kept.
