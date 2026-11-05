# RabbAI — rules for working in this repo

A Torah learning assistant that answers from inside the Orthodox mesorah. Read
`docs/founding-spec.md` before changing anything.

## Rules

- **Integrity of the mesorah comes first.** When anything conflicts with faithfulness to the
  Orthodox texts and tradition, faithfulness wins (`docs/founding-spec.md`, "The first
  principle").
- **The board decides what is Torah content.** Never mark a work, edition, core-premise
  change, or reference answer as `approved` yourself. Only record approvals the maintainer
  reports from the rabbinic board, with `approved_by` and `approved_on`, plus a line in
  `docs/approvals-log.md`.
- **Whitelist editions, never collections.** Never import a whole library (for example, all of
  Sefaria). Each edition is listed in `canon/canon.yaml` on its own. Check
  `canon/excluded.yaml` before adding any translation.
- **Retrieval reads only the whitelist** that `python3 tools/validate.py --whitelist` prints.
  The one exception is the private testing library (`--testing`, founding spec "Testing
  library"): Orthodox editions mapped to an exact Sefaria version with an open license, each
  passage labeled "not yet approved by the board". It is never public.
- **Licensed texts are never committed.** The top-level `/library/` folder is gitignored.
- **Do not invent sources.** Citations in this repo are suggestions for reviewers to confirm,
  and must say so until a reviewer has.
- **Two tiers.** A work marked `standing: debated` in the canon (uncertain author, unusual source,
  disputed claim, criticized views) stays in the library with a plain-English `caution`. The build
  carries it to every passage, RabbAI is told it with the passage, and the app shows it beside the
  text. Never drop a caution, and never let RabbAI rest a halachic answer on a debated book alone.
  A debated book whose main claims Orthodox authorities rejected (caution kind `rejected_views`,
  such as Milchamot HaShem) is presented only as its author's claims, together with the answer
  Orthodox authorities gave, and never framed as a kabbalist's teaching.
- **Written permissions** from rights holders are recorded once in `canon/permissions.yaml` and
  named on each version they cover (`permission: <id>`). The build applies one only to files from
  the holder's own sites, or versions it names under `also` with the reason. Record only a
  permission the maintainer reports, and never treat one as a board approval.
- An edition marked `strip_brackets: angle` has an editor's additions removed when the library is
  built; a passage where they can't be separated cleanly is left out, never quoted with them.
- Run `python3 tools/validate.py` before every commit. CI runs it too.
- Keep the docs in step with the data: a new tag value goes in `canon/vocabulary.yaml`, and a
  new decision goes in `docs/founding-spec.md`.
- After changing `canon/canon.yaml`, `canon/excluded.yaml`, `canon/reading-order.yaml` (the order
  RabbAI opens the commentaries in), `canon/lookup-sites.yaml` or `canon/davening-notes.yaml`, run
  `python3 tools/validate.py --write` and commit what it regenerates: the sources list the board
  reviews (`docs/sources-for-review.md`) and the app's copies
  (`web/lib/sources/sources.generated.ts`, `web/lib/library/reading-order.generated.ts`,
  `web/lib/engine/lookup-sites.generated.ts`, `web/lib/siddur/davening-notes.generated.ts`). The
  validator fails when one is out of date.
- RabbAI's manner is described by qualities, never by a person: never name a living rabbi in the
  model's instructions, never have RabbAI speak in a real rabbi's name or say what one would
  think, and never quote one unless a source it was given has the words
  (`docs/character-notes.md`).

## The app (`web/`)

- The model's instructions come only from `prompts/core-premises.md`. After editing it, run
  `cd web && npm run sync:prompt` and commit the regenerated
  `web/lib/engine/core-premises.generated.ts`. CI fails if the two differ.
- `web/lib/library/dev-library.ts` holds typed development texts for testing. Every entry stays
  `library: "development"`. Never mark one approved, and never present it as an approved
  edition. Approved texts come from the whitelist import.
- `web/lib/library/dev-lexicon.ts` holds the team's word notes for testing. Never type where a
  word appears; those connections are computed from the library (`language.ts`).
- The private testing library (`web/lib/library/testing.ts`) is one database built by
  `tools/library_plan.py` and `tools/library_build.py` from the editions in
  `python3 tools/validate.py --testing`. Its schema is `tools/library_schema.sql`; keep the
  builder and the reader in step with it. Every passage it returns carries
  `source.library: "testing"`, and the app labels it "not yet approved by the rabbinic board"
  wherever it appears. Never make the built file public: no commits, no build artifacts.
  Dictionaries (Jastrow, Sefer HaShorashim) come from Sefaria's database backup
  (`lexicon_entries` in `tools/sefaria_lib.py`, needs `pymongo`). A dictionary marked
  `word_tool_only` (Jastrow) is used only for what words mean, and every entry says so.
- Website collections (`web/lib/library/collections.ts`, databases `rabai-collection-<permission>`)
  hold articles copied from a site that gave written permission, section by section as the canon
  lists them (`site:` editions, category `articles`), by `tools/collection_build.py` and the
  "Copy a website's sections (collections)" workflow. The copier reads only through the site's
  own interface (and, for a section marked `site.page`, each article's own page, keeping only its
  article box), one request at a time with a pause, within robots.txt, as RabAIBot; never get
  around a site's protections (a Cloudflare check means asking the site to let RabAIBot through).
  Nothing it copies is printed in a log, committed, or kept as an artifact. Every reference in a
  collection starts with the site's name ("Aish.com, ..."), so `combineStores` sends it to that
  database. A collection's paragraphs are read only together with their article's row (an inner
  join in `rowSelect`), so none can reach RabbAI looking like a book of the library; keep it so. Articles are added after the texts (`LOOKUP_LIMITS.articles`) and RabbAI is told each
  is a teacher's explanation, not a source and never a ruling, and that only the texts confirm a
  point (`articleContext`). Under an answer the app shows the articles it used under their own
  heading, apart from the texts (`TeacherNotes`); never show an article as one of the sources. The
  Learn tab lists them by section (`ArticleShelves.tsx`, `/api/articles`). Keep
  `collectionClients` refusing a public app, like `testingClient`.
- Every citation shown to a person must pass `web/lib/engine/citations.ts`: it must point at a
  passage that was sent to the model, with its quoted words in that passage. Do not add a path
  that shows sources around it. Citation buttons come with the final, checked answer. While an
  answer is written, the passages above it and the words marked on them come only from citations
  that pass the same check (`verifiedCitation`), and the lines it reads only from a read marker
  (`[[read REF]]`) naming one of the texts it was given (`web/lib/engine/live-sources.ts`); the
  words shown are always the library's, never the model's copy. They are kept only as part of the
  checked answer (`card`; saved chats keep a shortened copy).
- Word meanings (`/api/word`, the word card) come only from the library's dictionaries, each
  labeled with its dictionary. A guessed root is always shown as a guess, with what was changed.
  RabbAI explains a word only when the person taps "Ask RabbAI about this word"; never call the
  model when a word is tapped.
- The printed-page view (`web/components/DafPage.tsx`, `web/lib/library/daf.ts`,
  `/api/daf`) shows one amud of the Bavli with the Rashi and Tosafot on it, from the testing
  library. Its layout is ported from daf-renderer (MIT); keep `web/THIRD-PARTY-NOTICES.md`.
  "Show the flow" (`/api/daf/outline`, `web/lib/engine/outline.ts`) is RabbAI's outline of the
  argument: run it only when the person asks, keep it on the device, and always label it as
  not yet reviewed by the rabbinic board (founding spec, open question 15). It colors phrases,
  which the model names only by the library's word numbers, and a phrase's English is shown only
  when it is an exact stretch of the library's English for the line (`outline-phrases.ts`).
- "Translate this" and "Word by word" on the page view (`/api/translate`,
  `web/lib/engine/translate.ts`, `web/lib/engine/gloss.ts`) are RabbAI's own translation: run
  them only when the person taps (or in a batch the maintainer runs), and always label them as
  not from the library and not yet reviewed by the rabbinic board (founding spec, open question
  16). The Hebrew in a word-by-word list always comes from the library's text; the model's list
  only attaches English to it.
- A translation is made only from the library's own sources (`translate-sources.ts`: the line a
  comment explains with its Orthodox English, other commentaries on that same line, the
  dictionaries). An "other reading" is shown only when its source was given and its quoted words
  are in that source (`checkReadings` in `gloss.ts`, the same idea as `citations.ts`).
- RabbAI's translation library (`web/lib/library/translations.ts`, database `rabai-translations`)
  keeps each translation tied to the exact text it translated (`textCheck`); never show one
  beside a text whose check differs. Never set a translation's `review` to anything but
  `unreviewed` yourself; only record a review the maintainer reports from the board. Never
  delete the database. Batch fills (`web/scripts/translate-library.ts`, workflow
  `.github/workflows/translations.yml`) spend money: only the maintainer runs them, always with
  a spending limit.
- Translations can also be made inside a Claude Code session (`web/scripts/translate-here.ts`):
  the same requests and the same checks as a batch fill, answered in the session instead of by
  the API. They reach the shared translation library only as sealed files in
  `translations-inbox/` (`web/lib/library/inbox-seal.ts`), which only the inbox workflow
  (`.github/workflows/translations-inbox.yml`) can open. Never commit an unsealed translation or
  a request file; `library/session-translations/` stays on the session's computer.
- The learner profile (`web/lib/learner-profile.ts`, "About you") shapes only how RabbAI explains,
  never what the sources say. It keeps learning activity only, never anything else about a
  person's life. The person can see, change and forget all of it, and turn remembering off; with
  it off, nothing is noticed or sent. The server always rebuilds the lines the model sees from a
  checked copy (`parseProfile`, `profileSummary`), placed after the cached instructions. See
  `docs/learner-profiles.md`.
- When the library has a layout for an amud that places every word (table `daf_layout`, made by
  `tools/daf_layout.py` from Sefaria's Vilna scans; see `tools/daflayout/README.md`), the page
  is drawn line for line as printed (`web/components/DafPrinted.tsx`, `readPrinted` in
  `daf.ts`). Keep the scans out of the repo, the library and the app: only line boxes, word
  numbers, and each word's place on its line are stored. `readPrinted` refuses a layout that
  leaves any word unplaced or whose word checks don't match the library's text; keep that check.
  Words the scan didn't settle (listed in the layout's `estimated`) are drawn with a dotted
  underline and a note; never show them unmarked. A printed short form (ק״ש, ר׳) is shown only when
  its letters come from the library's own words in that place: `readPrinted` checks this
  (`shortForms` in `daf.ts`, the same test as `abbreviates` in `tools/daflayout/words.py`); keep
  the two in step. Keep the word splitting in
  `tools/daflayout/text.py` identical to the app's (both have tests on the same check value).
  The layouts are made by the "Make the printed-page layouts" workflow
  (`.github/workflows/daf-layout.yml`, run by hand), and `tools/library_upload.py` carries
  them over when the library is rebuilt.
- The page's vowels switch reads the library's `vowels` table, filled from editions marked
  `vowels_only` in the canon (a vocalized copy of another edition). Never search or quote a
  vowels-only edition; `vowelWords` in `daf.ts` only adds points to the library's own words.
- Saved chats and recent reading (`web/lib/saved-chats.ts`) live in the person's browser, and
  saved chats also in their account when they are signed in.
  A restored answer is the checked answer exactly as it was shown; never rebuild or add
  citations when restoring one.
- Voice (`web/components/voice.ts`) uses only the browser's own speech recognition.
  Outside Talk, what the microphone hears goes into the text box and is never sent without the
  person pressing Ask. Sending or typing cancels listening, so late words can't land in an emptied
  box.
- Answers are read in RabbAI's own voice (`/api/speak`, `web/lib/voice/`; founding spec "RabbAI's
  voice") when a speech service is set up, else with the device's voices. Only the text being read
  is sent to the service (with the end and start of the pieces around it), after the answer is
  checked: never the question, a picture or anything about the person, and the text is never
  logged or kept. People choose among the service's voices in Settings (`web/lib/voice/voices.ts`);
  the default is a kind, warm older man's voice. Talk's turns are read with the service's quick
  model (`fast`, `ELEVENLABS_TALK_MODEL`); "Listen" keeps the usual one. Only the service's stock
  voices and voices designed from a description are offered: never clone or imitate a real
  person's voice, and keep
  cloned voices out of the list. Natural voices get only the respellings they need
  (`respell(text, "natural")`). Reading aloud is learning, so
  God's names are said as in learning ("Hashem", "Elokim"; `namesForLearning` in
  `speech-text.ts`): keep that in every voice path (open question 24). Words a voice says wrong go
  in `web/lib/voice/lexicon.ts`; short names that are also English words ("Ran", "Tur") are marked
  `exact`.
- Talk (`web/components/talk.ts`, its turn-taking in `web/lib/talk.ts`; founding spec "Talking out
  loud" and "Learning like a real chavrusa") is a conversation out loud that the person turns on
  themselves. It sends what they said only after a pause and a visible ring they can stop (short
  after a finished-sounding phrase, longer after "and" or "um", or long with a countdown when
  Settings asks). While RabbAI thinks, the microphone may stay open (not on iPhones) only to hear
  the person go on, which takes the question back; it is closed when something covers the chat,
  when the page is hidden, and after a long quiet, and while RabbAI speaks it listens only for the
  person cutting in. Its questions go through the usual path (`send` in `RabaiApp.tsx`), so the answers
  are checked like any other. The answer is read aloud as it is written, a sentence at a time
  (`speakLive` in `components/voice.ts`): only the text already shown live on the screen is read,
  and the sources still come with the final, checked answer. The person can cut in with a tap, or
  by talking (not on iPhones; Settings can turn it off): while RabbAI speaks, the microphone
  listens only for a cut-in and ignores words that match what RabbAI is saying (`isCuttingIn` in
  `components/talk.ts`). The next question carries the last words they heard (`interrupted`). The
  model is told only that the person is talking (`TALKING_SETTING`) and where they cut in
  (`interruptedSetting`); how to answer is in the core premises.
- Speed (`docs/faster-rabbai.md`, founding spec "Faster answers, and short natural turns"): a
  conversation's turns (Talk, chavrusa) use `RABAI_TALK_MODEL` (Claude Sonnet 5.5) at low effort,
  ordinary questions the strongest model. A short follow-up in a conversation skips the lookup step
  and opens the sources of the answer before (`quickFollowUp` and `retrieveFollowUp` in
  `lookup.ts`); anything that names a new book, asks halacha or needs the calendar must still go
  through the lookup step (keep `NEW_LOOK` broad), so a practical question keeps its lookup and the
  rav note. The instructions and the catalog are cached for an hour, and warmed before a first
  question (`lib/engine/warm.ts`, `/api/ask/warm`): a warm-up sends only the instructions, never
  anything about the person. Each answer reports `timings` for the health check; never show them
  to the person or log a question with them.
- Pictures with a question (`web/lib/pictures.ts`, founding spec "Pictures with a question"): at
  most four, made smaller on the device, and checked by their own bytes on the server (never by
  the kind they claim). The server never keeps a picture: not in the answer store, not in an
  account (which keeps only how many there were), never in a log. A picture is never a source,
  and RabbAI never identifies people in one (core premises, "Pictures the person sends").
- Answers that wait for you (`web/lib/answer-jobs.ts`, `/api/ask/job`, founding spec "Answers
  that wait for you"): `/api/ask` keeps writing an answer after the page leaves (`after()`), and
  keeps only its progress and the checked answer, under a hash of a random id the asking device
  chose. Never the question, a picture, or anything about the person. It is deleted when the page
  has the answer, or after a day. A stopped answer keeps nothing. The page saves the question with
  a placeholder the moment it is asked, and an answer picked up later is the checked answer
  exactly as kept (the same rule as restoring a saved chat). The id stays on the device: never put
  it in an account copy of a chat (`chatForAccount` strips it).
- Accounts (`web/lib/account/`, people database `rabai-people`) carry a person's profile and
  chats between devices; setup is in `web/README.md`, "Accounts". Never store an email address
  (only `emailCheck`), a sign-in link or a session token (only their hashes). Never change
  `RABAI_AUTH_SECRET` once set: every account would become unreachable. Never delete the people
  database; a person's rows go only when they delete their account. "Was this helpful?" feedback
  is never linked to a person or a profile, and changes nothing by itself: people read it and
  decide. Emailed links point only at the app's own address (`appUrl` in `config.ts`).
- Looking things up online (`web/lib/engine/online.ts`, founding spec "Looking things up
  online"): for anything about Torah, halacha or belief, the search reaches only the trusted
  sites in `canon/lookup-sites.yaml`; for everyday facts, the wider web minus that file's
  `not_for_web` sites. The list is `status: proposed` until the board approves it. After editing
  it, run `python3 tools/validate.py --write` and commit what it regenerates (the validator fails
  if they differ). A page reaches the model only as its own words (the cited sentences and a
  little around them), never the search model's summary, and is never kept. A page is never a
  source: the texts it relies on are opened in the library and are what confirm a point, and the
  app lists pages under their own heading (`OnlineNotes`), never among the texts. `onlineSetting` turns lookups off when
  `RABAI_PUBLIC=true`; keep that guard. A line action in the reader never looks anything up.
- An answer to a practical halacha question (`practical` in the lookup plan) always shows the
  note to ask one's rav (`RavNote`). Never remove it; its wording is the board's (open
  question 9).
- What RabbAI says about its own sources comes only from the generated sources list
  (`web/lib/sources`). When the lookup plan marks a question as about RabbAI's library
  (`library`, or `asksAboutLibrary` without the planner), RabbAI is given the list
  (`libraryOverview`, the same for every such question, so it is cached) and the books the
  question names (`libraryDetails`), and the app links to the Sources page (`app/sources`) under
  the answer. Never import `lib/sources/index.ts` into a client component: the list is large, and
  the page's search box uses only `lib/sources/fold.ts`.
- The Daven tab (`web/components/Siddur.tsx`, founding spec "Finding prayers, and the siddur as a
  siddur") shows the library's siddur text word for word. Its instructions and marks are the
  siddur's own (`web/lib/siddur/lines.ts` only finds them; never add an instruction of our own). Its
  "today" notes and today/not-today marks (`web/lib/calendar/davening.ts`) are RabbAI's reading of
  the calendar, always labeled as not yet reviewed by the board (open question 23). "Today's
  davening" (`web/lib/siddur/today.ts`) folds what isn't said today into a labeled line that opens
  with a tap; it never removes a line (Josh's decision; the board confirms, open question 23).
  "Ask about this" goes through the usual checked path (`send`).
- For siddurim that don't print instructions, the only notes on how to daven come from
  `canon/davening-notes.yaml` (status `proposed`; each labeled as RabbAI's, not yet reviewed, with
  its suggested sources). A note that could match a line in another prayer is limited with `in` /
  `not_in` (words in the prayer's name). Transliteration (`web/lib/siddur/translit.ts`) is
  RabbAI's, from the siddur's vowels, and always labeled so.
- The Daven tools keep names (Tehillim names, yahrzeits) only on the device; the server gets only a
  place or a date (`/api/daven/reminders`), never a name. Reminders are calendar files the person
  adds themselves.
- Working offline (`web/public/sw.js`, `web/lib/offline.ts`): the service worker keeps only the
  app's code files, its pages, and library texts read with GET (`/api/text`, `/api/contents`,
  `/api/library`, `/api/word`), on the device. Never let it keep anything sent with POST, a
  question, an answer, or an account call, and never serve a kept copy while the network answers
  (only when it fails). It runs only in a built app. `/sw.js` is outside the lock because it holds
  no data; keep its cache names in step with `lib/offline.ts`.
- A book's lines are ordered by their numbers within a section, and its sections by each
  edition's order merged (`web/lib/library/merge-order.ts`), never by the library's build number
  (`seq`) alone: the build numbers each edition in turn, so a section or line found in one
  language only (Koren's English instructions and Preface) would fall to the end.
- Before committing app changes: `cd web && npm test && npm run typecheck`.
- **The online app stays locked** (`web/proxy.ts`, `web/lib/access.ts`): visitors need
  `RABAI_ACCESS_CODE`, and with no code set it stays closed. Never weaken the lock or add a way
  around it. Opening it to the public (`RABAI_PUBLIC=true`) is the maintainer's decision, made
  only after the board approves a launch. A public app uses only approved texts: `libraryMode`
  and `testingClient` refuse the testing library when `RABAI_PUBLIC=true`, because it holds texts
  allowed for private use only. Keep that guard.

## Where it runs

- **GitHub:** `KingofHardts/RabAI`, default branch `main`. CI is the "Validate" workflow
  (`.github/workflows/validate.yml`).
- **Vercel:** project `rab-ai` on the maintainer's personal Vercel account
  (`joshsgerhardt-5492`, Hobby plan), Root Directory `web`. Every push to `main` deploys.
  The live address is https://rab-ai-ecru.vercel.app.
- **Settings in Vercel:** `ANTHROPIC_API_KEY` and `RABAI_ACCESS_CODE` are required. The
  optional ones are listed in `web/README.md`, including `TURSO_DATABASE_URL` and
  `TURSO_AUTH_TOKEN` for the testing library, and `TRANSLATIONS_DATABASE_URL` and
  `TRANSLATIONS_AUTH_TOKEN` for RabbAI's translation library. Never print, log, or commit their
  values, and never ask anyone to paste a key or code into a chat.
- **The testing library's hosting:** the "Build the testing library" workflow
  (`.github/workflows/library-build.yml`, run by hand) builds it and uploads it to Turso with
  `tools/library_upload.py`, using the repo secrets `TURSO_API_TOKEN` and, optionally,
  `VERCEL_TOKEN` and `TURSO_ORG`. The repo is public, so its Actions logs are public: mask any
  token made during a run (`::add-mask::`) and never echo one.
- **RabbAI's translation library:** the "RabbAI's translation library" workflow
  (`.github/workflows/translations.yml`, run by hand) creates the database and connects the app
  (`tools/translations_setup.py`), estimates costs, and fills it in batches. Filling needs the
  repo secret `ANTHROPIC_API_KEY` as well as the Turso and Vercel ones.
- **Is it working?** The "Is RabbAI working?" workflow (`.github/workflows/health.yml`, run by
  hand) checks every piece from GitHub: Turso's plan, usage and databases, the Vercel deploys and
  settings (names only), and the live app, by request and in a real browser on a phone and a
  computer (`tools/health_check.py`, `tools/health_browser.cjs`), including the Daven tab (today's
  folds in the Amidah, dark-mode contrast), the offline worker and whether RabbAI's voice is set up. It prints no secrets and no
  answer text. This session can't reach the live app; run the workflow instead.
- **Website collections:** the "Copy a website's sections (collections)" workflow
  (`.github/workflows/collections.yml`, run by hand) copies a site's canon sections into its own
  Turso database. Without "write" it is a trial that prints counts (and, with a limit, the whole
  collection's estimated size); check that estimate against Turso's storage before writing.
- **Checking a deploy:** Vercel reports each deploy on its commit
  (`https://api.github.com/repos/KingofHardts/RabAI/commits/<sha>/status`, context `Vercel`).
  Build and runtime logs need access to the maintainer's personal Vercel account; the
  maintainer reads them in the Vercel dashboard.
- **Keep it separate from Senior Stylist.** Don't use Senior Stylist's accounts, keys, data, or
  rules here. In particular:
  - Work on RabbAI in a session that has only this repo. A session that also has Senior
    Stylist's repo loads Senior Stylist's rules.
  - The Vercel and Supabase connectors in the maintainer's Claude account belong to Senior
    Stylist. Never use them for RabbAI. Check RabbAI deploys through the GitHub commit status
    above.
  - Pushes from Claude's cloud sessions currently arrive as the `SeniorStylist` GitHub
    account, which has write access to this repo. That changes only if the maintainer moves
    Claude's GitHub connection; see "Where things stand".
- **Cloud sessions:** `.claude/hooks/session-start.sh` installs PyYAML and the app's packages, so
  the checks run right away.

## Where things stand (2026-11-05)

Done 2026-11-05, at Josh's request ("a good, fluent conversation", "pulls up the source and live
highlights what it's talking about", "read a line and then talk about that line", "100 aspects of
a chavrusa"):
- `docs/chavrusa-learning.md`: 100 things a real chavrusa does, from the research on havruta
  learning, each marked built, next, later, or waiting.
- The text on the table: while an answer is written, the passages it quotes appear above it and the
  words it quotes are marked, each from a checked citation; when it is read aloud, the mark follows
  the voice (`components/SourceCard.tsx`, `lib/engine/live-sources.ts`).
- Reading a line together: RabbAI writes `[[read REF]]` and the app shows and reads that line from
  the library where it comes in the answer (English, or Hebrew and English, in Settings). The core
  premises gain "Reading the text together" (open question 26, for the board).
- Talk: a finished-sounding phrase is sent after about a second, "and…" waits longer, Settings can
  bring back the long pause; going on while RabbAI thinks takes the question back and adds to it.
- Talk's voice uses ElevenLabs' quick model, streamed, so the first words come sooner.

Done 2026-11-04 (third round), at Josh's request ("respond a lot faster", "a good back and forth
like a chavrusa that you can interrupt", "shorter answers", "find 100 ways"):
- `docs/faster-rabbai.md`: 100 ways to make RabbAI faster and better to talk with, each marked built,
  next, later, or waiting for Josh or the board.
- Faster: conversation turns on Claude Sonnet 5.5 at low effort; short follow-ups skip the lookup
  step and reuse the last answer's sources; one-hour caches, warmed ahead of the first question;
  each answer timed for the health check (which now also times a follow-up in Talk).
- Talk reads the answer while it is written, and the person can cut in by tap or by talking;
  RabbAI is told where they cut in. A question said while the last answer is still being written
  waits for it. Fixed: RabbAI's own voice was cut off after two seconds in Talk.
- The core premises gain "Talking like a person", a voice for each chavrusa way and a teacher's
  way (open question 25, for the board).
- On a conversation's turn the app repeats the length in a short note after the question (marked as
  the app's note), asking for about forty words: the live check measured turns of 117 and 98 words
  without it and 53 to 72 with it. It flags a Talk turn over 90 words.
- Live check, after all of this: a Talk follow-up skipped the lookup step and started in 1.5 to 2
  seconds (3 seconds whole); a first Talk question 5 to 7 seconds; an ordinary question 11 to 17
  seconds; a practical question with online lookup 28 to 34 seconds to first words.

Done 2026-11-04 (second round), at Josh's request ("everything we said next", plus decisions):
- The Daven tab: men's and women's wordings labeled where they differ, with a setting for one;
  "Today's davening" folds what isn't said today (Tachanun, the Torah reading, other days' psalms,
  other nights of the Omer, Al HaNissim…), with customs as settings; layouts (line by line,
  paragraph, word by word under each word, two panes) one tap away; transliteration (Israeli or
  Ashkenazi, from the siddur's vowels); guide notes for siddurim without printed instructions
  (`canon/davening-notes.yaml`); Koren's law references open the laws; tap a word; jump to Barchu,
  Shema, Kedushah, Aleinu; a bookmark per service; responses marked; festival services offered.
- Tools on the Daven home: the Omer, Tehillim (monthly or weekly, names for a refuah),
  reminders for Mincha and Kiddush Levana, yahrzeits (both Adars in a leap year), facing
  Jerusalem, "which bracha?" (asked in the chat), and a link to find a minyan.
- Light, Dark or Auto, with readable text in both (the dark-on-dark translation Josh saw is fixed).
- The siddur works offline ("Keep this siddur on this device").
- RabbAI's own voice: a speech service through `/api/speak` (ElevenLabs or OpenAI), with Hebrew
  read in English letters, names respelled, and God's names said as in learning. It waits for a
  key in Vercel (`docs/siddur-audio-and-transliteration.md`, "Setting up the voice"); until then the
  device's voice is used, now preferring a man's, calmer voice.
- Leads for a published transliteration and for recordings of the prayers, for Josh to ask:
  `docs/siddur-audio-and-transliteration.md`.

Done 2026-11-04, at Josh's request:
- The Learn search finds prayers inside the siddurs ("Mincha", "bentching"), "davening" (the day's
  three prayers and the siddurs) and "zmanim" (today's times, once a place is set)
  (`lib/library/prayer-find.ts`). Long section lists show as an outline (`contents-tree.ts`).
- A Daven tab beside Chat and Learn: the siddur used as a siddur. The Koren siddur (Rabbi Sacks's
  translation) is offered first. Prayers flow as you scroll; swipe or the bottom bar moves between
  blessings. Koren's instructions and its bow, rise and strike-the-chest marks show in place and
  can be asked about. A card lists today's changes (Hebcal), and lines said only on some days are
  marked "today" or "not today" (open question 23). Siddurs opened from Learn or a search open
  there. The 50 features researched are in `docs/siddur-features.md`.
- Fixed the order of the davening: Koren's English-only instructions had fallen to the end of each
  prayer, and its Preface after its last section. Fixed the overlapping text in the reader's
  left margin: a siddur line's whole path had been printed where its number goes.
- Long names are shortened everywhere ("Siddur Ashkenaz · Barukh She'amar 1"), with the full
  reference in the tooltip (`lib/library/short-name.ts`).
- Two panes: Hebrew above, English below, scrolling together line for line
  (`lib/linked-scroll.ts`, `components/use-linked-scroll.ts`).
- Found what fills Turso's extra storage (old deleted library copies; see Open items) and
  compared transcription services (`docs/transcription-research.md`).

Done 2026-11-03, at Josh's request (his brother's suggestions):
- Renamed RabAI to RabbAI everywhere people see it (the repo, database and code names stay).
- Dates and times: RabbAI knows the civil and Hebrew date, this week's parsha, the coming holidays
  and fasts, and today's daily learning, and gives zmanim for the person's place from Hebcal
  (KosherJava's calculations) with the common calendars' defaults (founding spec "Dates and
  times", open question 20). A question on "this week's parsha" opens its verses with their
  meforshim even if the planner misses (`parshaRefsFor`).
- Opening questions change with each visit and with the calendar.
- Learning with a chavrusa: six ways, three depths, and memory of what was learned and where they
  stopped, across chats and devices (open question 21).
- Talk: a conversation out loud, as in ChatGPT's voice mode (open question 22). On iPhones each
  turn starts with a tap; a transcription service on the server would make it dependable there,
  which needs Josh's choice of provider.
- Pictures: a photo of a page of a sefer finds the page; handwritten notes are read as the
  person's own; an answer about the Gemara offers "See … as printed".
- The word card on a phone follows the finger, and Rashi and Tosafot show the translation under
  the Hebrew.
- 53 smaller improvements from research, listed with what was read in
  `docs/research-2026-11.md`.
- Wider sources: the canon already holds the classic parsha commentaries, the Midrash, the
  Chassidic and mussar works and the codes (794 works), and the planner now opens them for a dvar
  Torah. RabbAI may offer a thought of its own, built on and cited to the texts (core premises
  "Your own thinking", for the board).
- The "Is RabbAI working?" check also asks for a dvar Torah on this week's parsha and one question
  as if spoken in Talk, and says for each question whether the lookup step planned it. Its first
  run found the planner's replies cut off: its 800-token cap counted the model's thinking, and the
  longer planning instructions went past it, so a practical question lost the online lookup and
  the rav note. The cap is now 4,000, and a plan that falls back says why (`lookupFallback`).

Moving RabbAI off Senior Stylist:
- The maintainer is creating a RabbAI cloud environment (Custom network access with the default
  list, plus `rab-ai-ecru.vercel.app` and `www.sefaria.org`) and will start RabbAI sessions
  there with only this repo.
- GitHub: decided (maintainer, 2026-10-06) to keep `SeniorStylist` as a collaborator, so
  Claude's sessions keep pushing as that account.
- Chabad.org and Aish.com gave written permission (reported by the maintainer, 2026-10-10;
  `canon/permissions.yaml`), so they may be added to the environment's allowed domains. The
  list affects only Claude's working sessions, not what the live app can reach.
- To confirm: `ANTHROPIC_API_KEY` in the `rab-ai` Vercel project should come from the
  maintainer's own Anthropic account, not Senior Stylist's.
- Vercel: the Vercel connector holds one account (Senior Stylist's), so RabbAI uses a personal
  Vercel token stored on the RabbAI environment as an API credential for `api.vercel.com`.
  Sessions call the Vercel API with `curl` and never see the token.

Done 2026-10-16, at Josh's request:
- Pictures with a question: RabbAI reads up to four (photo, paste, or drag), and the planning step
  reads them too. The core premises' "Pictures the person sends" and open question 19 are for the
  board.
- Answers that wait for you: leaving, reloading or closing the page no longer loses an answer.
  The server keeps writing it and the app picks it up when it comes back. Stop stops it on the
  server too and puts the question back in the box.
- A pass over how the chat feels, written up with its sources in `docs/ui-feel.md`: the question
  stays at the top while the answer is written, Copy and Try again, a "you can leave" note, chats
  that show "Answering" and "New answer", a New chat button on phones, and tidier bars.
- The "Is RabbAI working?" check now asks with a picture, leaves a question halfway and comes back
  for it, and reloads the phone's page while it answers. All three passed on 2026-10-16 (the
  answer left after 1 second was finished and picked up 63 seconds later).

Done 2026-10-13, at Josh's request:
- The library expanded: 67 more works in the canon as proposed, 13 more entries in
  `excluded.yaml` with the reasons. 37 of the works (45 editions) entered the testing library with
  the rebuild of 2026-10-14; the other 30 wait for the board, a publisher's agreement, or a copy
  we may use.
- Halacha answers read a seif with the commentaries printed around it, in the order in
  `canon/reading-order.yaml` (proposed, for the board).
- The sources list for the rabbis (`docs/sources-for-review.md`, also published as a private
  page and a PDF for Josh to share), made from the canon and checked on every commit. RabbAI can
  answer "what sources do you use, and what do you leave out?", and the app has a Sources page
  (the gear, then "RabbAI's sources").
- A draft character section for the board, "The kind of teacher you are", inspired by Rav
  Yitzchak Berkovits as Josh asked (`docs/character-notes.md`, open question 18).

Open items:
- The testing library on Turso was rebuilt 2026-10-14 from canon commit 7156d8d: 3,277,762
  passages, 5,599 books, 813 editions, 4,432 MB (on 2026-10-11 it was 3,031,757 passages, 5,470
  books, 768 editions, 4,212 MB). The canon lists 815 editions for it besides the website
  sections; the two Koren Yerushalmi editions are skipped until Sefaria's Shekalim file lists a
  license. The "Is RabbAI working?" check passed everything afterwards (library, articles, Sources
  page, Gemara page, words, translations, the flow, three answers including "which books do you
  use?" answered from the sources list, on a phone and a computer). Its one problem was the
  expected storage overage (below). The "Make the printed-page layouts" workflow ran on
  2026-10-11 for all of Shas: 5,206 amudim have a layout, 4,436 place every word (drawn as
  printed), and 2,115 of those have no estimated word; the rebuild kept all of them. Sefaria has
  no scans of Niddah, and files Nazir's under "Nazit" (`SCAN_ALIASES` in `tools/daf_layout.py`).
- **Turso is on the Developer plan (upgraded 2026-10-10): 9 GB, with overages on since
  2026-10-11** (about $0.75 per GB over 9 GB in a month), so going past 9 GB costs money but no
  longer blocks writes. Storage counts every database used in the month, deleted ones included;
  Turso counts 17.15 GB (about 8.2 GB over, roughly $6 a month) while the four databases hold
  4.72 GB. The "What Turso counts as storage" workflow (`tools/turso_storage.py`, 2026-11-04)
  showed the other 12.43 GB belongs to no database Turso lists, never changes, and is the same
  for any date range: it matches the library copies deleted by the rebuilds of 7 and 11 October,
  which Turso still counts. It isn't books in use. `docs/outreach/turso-storage-support.md` has
  the note for Josh to send Turso. Until Turso fixes it, each rebuild adds about 4.5 GB that
  stays: batch canon changes into one rebuild, and check a collection's estimated size before
  writing it.
- Recanati on the Torah is back, with the modern Hebrew translation of its Zohar quotations
  removed by the build (`strip_brackets: angle`; 30 of 1,909 passages left out).
- Torat Emet, Aish.com and Chabad.org gave written permission (reported by the maintainer,
  2026-10-10; `canon/permissions.yaml`): complete access, for private use only, not public for
  now (`public: false`). Their emails' own words aren't on file yet. Torat Emet's vocalized Zohar
  (Zohar Menukad) entered the library with the 2026-10-11 rebuild. Its Hebrew translation of the Zohar stays out (translator unknown), as does the Sulam's
  Aramaic (rights holder unknown).
- Milchamot HaShem (Rabbi Yichya Qafih) is in the canon as a debated book whose claims Orthodox
  authorities rejected (maintainer's direction, 2026-10-10). The board should confirm the
  history in its caution.
- License requests for the texts still left out are listed by organization in
  `docs/permissions-plan.md`; none are sent yet.
- Learner profiles: phase 1 (on the device) and phase 2 (accounts, "Was this helpful?") are
  built. The "Accounts (the people database)" workflow ran on 2026-10-11: the people database
  exists, `RABAI_AUTH_SECRET` is set in Vercel (never change it), and "Was this helpful?" is
  saved. Sign-in stays off online until the maintainer sets up Resend with a verified domain
  (`web/README.md`, "Accounts").
- Translating inside a Claude Code session works end to end (`docs/session-translation.md`).
  Rashi and Tosafot on Berakhot 2a-13a (chapter 1, 604 comments) are translated and imported
  (2026-10-07 and 2026-10-11). Kiddushin, the tractate the maintainer is learning, is done:
  all of it, 2a-82b (7,075 passages), was translated on 2026-10-11 and 2026-10-12 and sent through the inbox: Rashi and Tosafot with a general
  translation and word by word, and the Gemara lines word by word only, since they have
  Steinsaltz's English. `send --words` makes word-by-word lists even for lines that have the
  library's English, `--pages 5a-5b` picks amudim, and anything already in the shared library is
  skipped. It uses the session's plan, not the API. In a session that also has Senior Stylist's
  repo, every helper agent starts with about 400,000 tokens of Senior Stylist's instructions,
  which is nearly all of its cost (about 600,000 tokens a helper, measured 2026-10-12), so
  translate from a RabbAI-only session, and reuse helpers instead of starting new ones.
- Still missing because Sefaria lists no license on their files: 24 files, among them the Hebrew
  of the Ramban on Shemot (`python3 tools/library_plan.py` lists them). The maintainer reported on
  2026-10-10 that Sefaria is adding license labels. Sefaria's export (last made 2026-10-01) is
  what the build reads; its daily database backup shows a new label first. The backup of
  2026-10-11 had no label changes yet.
- For the board: the core premises, including "Talking about anything" (open question 14 in
  the founding spec).
- Aish.com and Chabad.org couldn't send exports, so their articles are copied from their
  websites, section by section through the canon (website collections, above), never a whole
  site at once. Aish.com's ten sections (in the canon for the board) were copied on 2026-10-11:
  11,259 articles in 8 shelves (two sections hold only articles already in others), database
  `rabai-collection-aish` (163 MB on Turso), and the app reads it. Ask the Rabbi's interface
  gives only each reader's question, so its answers are read from each article's own page
  (`site.page`; 1,055 of 1,056 re-copied that way on 2026-10-11). Chabad.org shows robots a
  Cloudflare check on every page, sitemap and feed (only its magazine RSS feed answers, with
  recent items and no full text), so it waits until Chabad.org lets RabAIBot through
  (`docs/outreach/chabad-org-access.md` has the exact rule to ask for). Chabad.org said on
  2026-10-11 that it can't change the check; never get around it, and ask whoever runs its
  Cloudflare settings instead. Keep the access code to a small circle while these permissions are
  private only.
- Under an answer, the app shows the articles it used under their own heading, apart from the
  texts, and RabbAI is told that only the texts confirm a point (core premise drafted 2026-10-11,
  for the board).
- TorahAnytime gave permission (reported 2026-10-11; `canon/permissions.yaml`, private use). Its
  site has no sitemap, feed or search a robot can use; speaker pages (`/speakers/<id>`) list
  about 30 shiurim in the page's own data, while topic, category and series pages load their
  lists in the browser (`tools/site_map.py`, "Map a source's website"). Nothing is copied yet:
  the plan is a "Shiurim on this daf" list (title, speaker, date, a link that plays on
  TorahAnytime), best from a data feed TorahAnytime could send.
- Looking things up online (Josh's direction, 2026-10-13) is built: RabbAI searches the trusted
  Orthodox sites in `canon/lookup-sites.yaml` (or the wider web for everyday facts), opens the
  texts the pages rely on in the library, checks the pages against them, and shows an "ask your
  rav" note under practical halacha answers. The sites list, the core premises' "Looking things
  up" and the note's wording wait for the board (open questions 9 and 17). It needs web search
  allowed in the maintainer's Anthropic organization (on unless someone turned it off). The "Is
  RabbAI working?" workflow asks one practical question and reports whether the lookup ran.
- The repo stays public; the maintainer is fine with that.
- RabbAI's own voices: Josh set up ElevenLabs (Creator plan, 2026-11-04; `ELEVENLABS_API_KEY` in
  Vercel). Settings offers the service's voices (men's first, with "Hear it"), defaulting to a kind
  older man's voice. The steps, costs and a Voice Design description are in
  `docs/siddur-audio-and-transliteration.md`. That page also lists
  publishers to ask for a transliterated siddur and for recordings of the prayers. For the board:
  open questions 23 (folding, the davening notes) and 24 (the voice, God's names when reading).
- The health check of 2026-11-04 passed everything except Turso's storage (above) and, about once
  in four runs, the dvar Torah question's lookup plan, which couldn't be read (reason `unreadable`:
  the reply came, its JSON didn't parse; the answer still named the parsha and cited its texts).
  The plan reader now also tries each complete object in the reply, and forgives trailing commas
  and curly quotes. If it still recurs, the next step is the reply's shape (never its text, which
  echoes the question).
- On iPhones, the browser's speech recognition can be unreliable. The fix is a transcription
  service; `docs/transcription-research.md` (2026-11-04) compares them and recommends Soniox,
  with ElevenLabs Scribe v2 Realtime second, after a short test on our own recordings. Building it
  needs the maintainer's choice and a key in Vercel.

Done 2026-10-06:
- Tap any word for its meaning (dictionaries, breakdown, root guesses; Ask RabbAI only when
  asked).
- Saved chats with categories, and "pick up where you left off", on the device. Accounts, so
  chats follow the person between devices, come later.
- The Gemara page as printed, with tappable words, translations, linked Rashi and Tosafot,
  marks, and "Show the flow". Not yet exact: lines break where the screen breaks them, because
  the library has no record of the printed line breaks. Matching the print line for line needs
  either those line breaks (from scans) or correcting each page by hand, as Mercava did.

Next, as the maintainer asked (2026-10-06): **more color** across the app, used to mean
something (for example, sources, questions, your own words). (The chavrusa mode he asked for then
was built on 2026-11-03.)

## Writing style for anything a user or a rav will read

Plain English. Translate Hebrew and Aramaic terms the first time unless the reader is clearly
comfortable with them. Respectful toward every Jewish community, and toward people who hold
other views.
