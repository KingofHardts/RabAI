# 100 ways to make RabbAI faster, and better to talk with

Josh asked (2026-11-04) for answers that come much faster without losing their care and
correctness, for short natural turns, and for a real back-and-forth he can interrupt, like learning
with a chavrusa. This list has 100 ways to get there, grouped by where the time goes. Each says what
it is, and where it stands:

- **Built** — done on 2026-11-04 (this round).
- **Next** — worth building soon; no decision needed.
- **Later** — worth it, but bigger, or costs storage or money.
- **Josh** — needs Josh's decision (privacy or cost).
- **Board** — changes Torah content or what RabbAI is told; the rabbinic board decides.

## Where an answer's time goes today

An ordinary answer runs these steps one after another:

1. **The lookup step.** A quick model reads the question and a catalog of every book in the library
   (about 230,000 characters) and names the places to open. A few seconds, longer when the catalog
   isn't cached.
2. **The library.** The places are opened, their commentaries followed, and the question's words
   searched. Usually one to three seconds.
3. **Online, sometimes.** For a practical question, trusted sites are searched and the texts they
   rely on are opened. Up to 45 seconds.
4. **The answer.** The answering model reads the instructions (about 47,000 characters), the texts
   (often 25 to 35 of them) and the question, thinks, and writes. The thinking comes before the
   first word.
5. **The voice.** Until today, the voice waited for the whole answer before reading it.

The health check of 2026-11-04 measured about 16 seconds for an ordinary answer on a phone. From
this round on, every answer reports how long each step took, and the health check prints it.

## A. Measure first

1. **Each answer times its steps** (lookup step, library, online, first words, whole answer), and
   the health check prints them. **Built.**
2. **The health check times a follow-up in Talk**, to see the quick path work. **Built.**
3. **Time to the first word heard** in Talk, measured in the browser check (what a person actually
   waits for). **Next.**
4. **Keep a week of timings** (numbers only, never questions) to see slow days and slow steps.
   **Next.**
5. **A speed budget per step**, so the health check flags a step that grows slow (for example,
   lookup step over 4 seconds, first words over 6). **Next.**

## B. Faster thinking

6. **Conversation turns use a faster model.** Talk and chavrusa turns go to Claude Sonnet 5.5,
   ordinary questions stay on Claude Opus 5.5. (`RABAI_TALK_MODEL` changes it.) **Built.**
7. **Conversation turns think briefly** (low effort), so the first words come sooner.
   (`RABAI_TALK_EFFORT`.) **Built.**
8. **"Go deeper" still thinks hard** on the strongest model. **Built** (unchanged).
9. **Short turns have a short budget**, so a turn can't run on. **Built.**
10. **Choose the model by how hard the question is**: the lookup step already reads the question;
    it can also say "simple" or "needs care", and a simple question gets the faster model even
    outside Talk. **Next.**
11. **Practical halacha always gets the careful model**, whatever else changes. **Next** (a guard
    for item 10).
12. **Fewer documents for a conversation turn** (at most 16), so there is less to read before
    answering. **Built** (quick follow-ups).
13. **Trim long passages** to the sentences around the words searched for, so the model reads less.
    **Next.**
14. **A shorter core premises**: the instructions are about 47,000 characters, read before every
    answer. A tightened version would be faster to read and think with. **Board.**
15. **Try Claude Haiku for the lookup step** on simple questions, measured against the current one
    for the places it names. **Later.**
16. **Re-run at higher effort only when the citation check drops a citation**, so most answers
    stay quick and a weak one is redone carefully. **Later.**
17. **Stop the model writing past the point** in a conversation: a turn ends when it has made one
    point. **Built** (the instructions).

## C. Caching (reading once, using many times)

18. **The instructions are cached for an hour**, not five minutes, so a person who comes back after
    a few minutes doesn't wait for them to be read again. (`RABAI_CACHE_TTL`.) **Built.**
19. **The lookup step's catalog is cached for an hour** too. **Built.**
20. **Warm the caches before the first question**: when someone starts Talk or a chavrusa session,
    or begins to type, the server reads the instructions and the catalog ahead of time (at most
    every ten minutes). Nothing about the person is sent. **Built.**
21. **Cache the conversation itself**: in a chavrusa session, the same page's texts come every turn;
    sending them once, in a cached part of the conversation, would make each turn quicker and
    cheaper. **Next.**
22. **Cache plans for the opening questions** the app itself suggests (not people's own
    questions), so tapping one starts at once. **Next.**
23. **Cache answers to line actions** ("Explain this line", "Word by word") for the same line and
    the same library, since they don't depend on the person. The cached answer is the checked one,
    shown as it was. **Next** (a decision on how long to keep them: **Josh**).
24. **Keep the most-opened texts in the server's memory** (the day's daf, this week's parsha, the
    Shema), so they open without a trip to the database. **Next.**
25. **Keep the catalog in one stored row**, so a fresh server reads it in one step instead of
    gathering it from 10,000 titles. **Next** (with the next library rebuild).
26. **Prepare the day's learning each morning**: today's daf, parsha and halacha opened and cached
    early. **Later.**
27. **A browser cache for texts already read** (the offline worker does this for the reader).
    **Built** earlier.

## D. The lookup step

28. **Skip it for a short follow-up in a conversation**: RabbAI opens the sources of the answer just
    before, the line the session is on, and the next line, and searches the question's words. A
    question that names a new book, asks halacha or needs the calendar still goes through it.
    **Built.**
29. **Send the last answer's sources with each question**, so a follow-up knows where it is.
    **Built.**
30. **Start the lookup step while the person is still talking**: in Talk, the pause and the
    countdown take about four seconds; planning on what they said so far, and starting over only if
    they keep talking, would hide most of the lookup step. **Next.**
31. **Run the online lookup at the same time as the lookup step** for questions that clearly need
    it (practical questions), instead of after it. **Next.**
32. **A shorter catalog**: book names grouped by shelf, without every section title, so the lookup
    step reads a quarter as much. **Next** (measure that it still names places as well).
33. **Two-stage planning**: first the shelf (Gemara, halacha, Chumash, machshava), then that shelf's
    books. **Later.**
34. **An alias list** for names and abbreviations (רש"י, Rashi, R. Shlomo Yitzchaki; משנ"ב, MB,
    Mishnah Berurah), so both the lookup step and the search find books by any name. **Next.**
35. **Let the answering model ask for more** when the sources don't cover a follow-up (one more
    library trip only when needed), instead of always planning first. **Later.**
36. **A smaller online lookup in conversation**: fewer searches, a shorter time limit. **Next.**
37. **Plan from the page you're on**: in the reader or the printed page, the line in focus is
    opened at once, while the lookup step adds the rest. **Built** earlier (focus line first).
38. **Remember what was opened in a session** on the device, so the next turn can reuse it.
    **Built** (the sources sent back each turn).
39. **Measure the lookup step's fallbacks** (cut off, unreadable) in the health check. **Built**
    earlier.

## E. The library: a faster filing system

40. **A sugya index**: one entry per sugya with its places (Gemara, Rishonim, codes), built from the
    links the library already has, so "where is this discussed" is one lookup. **Next.**
41. **A halacha chain index**: each seif of the Shulchan Aruch with its Mishnah Berurah, Biur
    Halacha, Tur, Beit Yosef, Rambam and Gemara, stored together. **Next.**
42. **A verse index**: each verse with its meforshim, Targum and the Midrashim on it, together.
    **Next.**
43. **A topic index** from the canon's works and their sections (Shabbat, kashrut, tefillah,
    teshuvah), so a topic opens its central places at once. **Later** (built from the library's
    own structure; any outside topic data needs its license checked).
44. **Hebrew search that ignores vowels and cantillation**, and finds a word with its prefixes
    (ו, ה, ב, ל, מ, ש, כ). **Next.**
45. **Full-text search tuned for speed** (the library's search table, with phrase search and a
    rank), so a search returns the best few in one step. **Next.**
46. **Each line stored with its neighbours**, so opening a line brings the lines around it without
    another trip. **Later** (with a rebuild).
47. **Passages split into sentences** for tighter quotes and citations, and smaller documents.
    **Later.**
48. **Each passage's length stored**, so the documents fit a budget without measuring each time.
    **Next.**
49. **A small "core" library** (Tanakh, Mishnah, Bavli with Rashi and Tosafot, the Rambam, the
    Shulchan Aruch with the Mishnah Berurah) in its own fast database, and the long tail apart.
    **Later.**
50. **The core library inside the server** (a local copy kept in step with Turso), read in
    microseconds. **Later** (size and the cost of the copy).
51. **A search by meaning** (embeddings) for the English texts, so a question finds a passage that
    uses other words. **Later** (it costs storage; the primary texts alone would be a few hundred
    MB).
52. **Weights on links**: which commentaries matter most on each sugya, from how often they are
    cited, so the best ones open first. **Later.**
53. **Who comments on each tractate**, so following commentaries looks only where there are some.
    **Next.**
54. **Batch the library's queries** into one trip to the database instead of several. **Next.**
55. **Put the database near the server**: check that Turso's region is the same as Vercel's, since
    every trip between them adds time. **Next** (a check).
56. **Keep the database connection open** between questions on the same server. **Built** earlier.
57. **Read the dictionaries only for words that need them** (already only for texts with no
    English). **Built** earlier.
58. **Fewer articles when the texts are plenty.** **Built** earlier.
59. **Prepare the next line's sources** in a chavrusa session while the person is reading or
    answering, so "next line" is instant. **Next.**

## F. Streaming and the app

60. **Answers stream word by word** to the screen. **Built** earlier.
61. **Show what RabbAI is opening** ("Opening Berakhot 2a, Rashi, Tosafot") while it looks, so the
    wait feels like learning, not waiting. **Next.**
62. **Show the first sources found** before the answer starts. **Later.**
63. **The answer keeps being written if the page leaves.** **Built** earlier.
64. **A question said while the answer is still being written** waits and is sent right after it,
    instead of being refused. **Built.**
65. **Remember the last answer's sources on the device** for the next question. **Built.**
66. **Load the heavy parts of the app only when needed** (the printed page, the siddur), so the
    chat opens faster. **Later.**

## G. Voice: hearing RabbAI sooner

67. **Read the answer while it is written**: the first sentence is read as soon as it exists, and
    the rest follows a sentence or a paragraph at a time. **Built.**
68. **Questions asked out loud** (the microphone, then Ask) are read the same way. **Built.**
69. **Each spoken piece is sent with the text just before it**, so the voice carries on smoothly.
    **Built.**
70. **The next piece is fetched while the current one plays**, so there are no gaps. **Built.**
71. **Use ElevenLabs' streaming endpoint** and start playing the audio as it arrives, instead of
    when a sentence's audio is complete. **Built in part** (2026-11-05): Talk asks for the streamed
    audio, so it leaves the service sooner; playing it while it downloads is **Later** (iPhones
    need care with silent mode).
72. **A fast voice model for conversation** (ElevenLabs Flash, about 75 ms) for English turns, and
    the fuller model when Hebrew letters are read. **Built** (2026-11-05) for every Talk turn
    (Hebrew is read in English letters, so Flash reads it too); "Listen" keeps the fuller model.
    How it sounds: **Josh**.
73. **Feed the words to the voice as they come** (ElevenLabs' input streaming), so speaking begins
    mid-sentence. **Later.**
74. **Cache the sound of common phrases** ("Shalom", "Let's look at Rashi") so they play at once.
    **Later.**
75. **The device's voice is a fallback** if the service is slow or down, mid-answer. **Built.**

## H. A conversation you can interrupt

76. **Cut in by talking**: while RabbAI speaks, the microphone listens for the person (not on
    iPhones, which can't listen while they speak). Words that match what RabbAI is saying are its
    own voice and are ignored. A setting turns it off. **Built.**
77. **Cut in with a tap**, everywhere. **Built** (it now remembers where RabbAI stopped).
78. **RabbAI knows where you cut in**: the next question carries the last words you heard, and
    RabbAI answers what you said without starting over. **Built.**
79. **Short words count** ("wait", "hold on", "but"), so a quick interruption works. **Built.**
80. **A shorter pause before sending** what you said (it was 1.4 seconds of quiet, then a 2.5-second
    countdown). **Built** (2026-11-05): about a second in all, with a setting for the long pause.
81. **Knowing when you're done by your words**, not only by the quiet (a sentence that sounds
    finished sends sooner; "and…" waits). **Built** (2026-11-05), with word lists; a model that
    judges it is **Later**.
82. **A server-side transcription service** (Soniox or ElevenLabs Scribe, compared in
    `docs/transcription-research.md`): reliable on iPhones, so Talk works there without a tap each
    turn, and it can be taught Hebrew names. It would send the person's voice to the service.
    **Josh.**
83. **Echo cancellation** on the microphone while RabbAI speaks, so cutting in works on speakers as
    well as with earphones. **Next.**
84. **Ignore small sounds** ("mm-hm") as agreement, not an interruption. **Built** (only a stop word
    or three new words count).
85. **When cut in on, stop the answer being written** if it isn't needed, to save time and cost.
    **Later.**
86. **Hands-free on iPhone** after a transcription service (item 82). **Later.**

## I. Sounding like a person

87. **Talking like a person**: one point, then stop; answer what they said; spoken words; one
    question at a time; no lecture. New section in the core premises. **Built** (draft for the
    **Board**).
88. **Short turns in a conversation**: usually two to four sentences, under about sixty words.
    **Built** (draft for the **Board**).
89. **Talk turns are one to three sentences.** **Built** (draft for the **Board**).
90. **Each chavrusa way has its own voice**: the guide, the questioner, the partner, the deep diver,
    just the page, the reviewer. **Built** (draft for the **Board**).
91. **A teacher when you ask to be taught**: the big idea first, then a step at a time, checking you
    follow. **Built** (draft for the **Board**).
92. **No restating the question, no summary at the end.** **Built.**
93. **Remember how the person likes to learn** (the learner profile already does: shorter, deeper,
    more Hebrew). **Built** earlier.
94. **A voice for each chavrusa way**: a different voice per way (the questioner, the partner),
    from the voices list. **Later.**
95. **"Shorter" and "Explain more" buttons** under an answer, which change the next turn. **Next.**
96. **The health check flags a long spoken answer** (over 120 words, was 220). **Built.**
97. **Review real conversations** (with permission) for turns that run on, and tune the
    instructions. **Board.**

## J. Learning every day

98. **Pick up where you stopped**, even across devices. **Built** earlier.
99. **A daily session reminder** at a time the person chooses. **Later.**
100. **A review at the start of a sitting** of what was learned last time (chazara), one question
     at a time. **Built** earlier (the reviewer), and **Next** as an automatic first turn.

## What was built this round (2026-11-04)

Items 1, 2, 6–9, 12, 17–20, 28, 29, 38, 64, 65, 67–70, 75–79, 84, 87–92, 96. They also fixed a
problem found on the way: in Talk, RabbAI's own voice (from the speech service) was cut off after
about two seconds, because Talk watched only the device's voice.

## Sources (from web searches on 2026-11-04)

- Prompt caching and pre-warming: Anthropic's prompt caching documentation (the one-hour cache and
  `max_tokens: 0` warm-up).
- Voice agents: [Latency budgets for voice AI](https://www.twig.so/blog/voice-ai-agents-latency-budget-800ms);
  [Deepgram's voice agent architecture guide](https://deepgram.com/blog/voice-agent-architecture-stt-llm-tts-pipeline-design);
  [Barge-in and turn-taking](https://futureagi.com/blog/voice-ai-barge-in-turn-taking-2026/);
  [Voice agent latency benchmarks](https://www.softwareseni.com/voice-agent-latency-solved-enough-for-production-benchmarks-and-architecture-tradeoffs);
  [How realtime voice agents work](https://www.softwareseni.com/how-realtime-voice-agents-work-and-why-latency-drives-vendor-choice/);
  [Latency engineering for voice agents](https://simbavoice.ai/resources/ai-voice-agent-response-time).
- ElevenLabs models: [Models](https://elevenlabs.io/docs/overview/models),
  [Which model to use](https://help.elevenlabs.io/hc/en-us/articles/17883183930129-What-models-do-you-offer-and-what-is-the-difference-between-them),
  [Request stitching](https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/request-stitching).
- Retrieval: [Redis on RAG at scale](https://redis.io/blog/rag-at-scale/);
  [HedraRAG](https://arxiv.org/pdf/2507.09138);
  [Production RAG pipelines](https://hackernoon.com/designing-production-ready-rag-pipelines-tackling-latency-hallucinations-and-cost-at-scale).
