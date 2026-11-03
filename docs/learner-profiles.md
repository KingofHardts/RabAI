# Learner profiles: RabbAI learns each person over time

*Plan and first step, 2026-10-07. The maintainer asked for RabbAI to learn from each person, keep a
profile, and get smarter and more efficient over time, with the back end set up to do it
correctly. Nothing here changes what RabbAI teaches: the board decides Torah content.*

## The rule this rests on

A profile changes **how RabbAI explains**, never **what the Torah says**. It may choose the level,
the words, the examples and the length of an answer. It never changes the sources, the halacha
presented, or the core premises. For a question that depends on minhag (custom), RabbAI gives the
person's community's practice first and still says that others differ. The core premises say this
in "What you know about the person" (a draft for the board).

## What RabbAI keeps about a person

| Kind | What | Where it comes from |
|---|---|---|
| What they told RabbAI | name (optional), how much they have learned, how well they read Hebrew, community, what they want to learn, short or fuller answers | "About you" in settings |
| What RabbAI noticed | the books they read (up to 12), the words they looked up (up to 40; the ones looked up twice are the ones to practice), how often they asked for simpler or deeper answers, how many questions they asked | what they do in the app |
| What they learned with a chavrusa (2026-11-03) | up to 8 texts: the text, the last line reached, the way they chose (the guide, the questioner, and so on), how many sittings (a sitting is counted once, however many questions it has) | chavrusa sessions: the furthest line of the text that a checked answer cited |
| The Torah subjects they asked about (2026-11-03) | up to 16, three to six words each ("the times for the Shema"), counted when asked again | the planning step names the subject of each question; it leaves it empty for anything that isn't Torah learning, and never puts a name, a place or anything personal in it |

Only learning activity is noticed. RabbAI never keeps health, feelings, observance, family, or
anything else about a person's life, even when they mention it in a chat. A question itself is
never kept in the profile, only its subject in a few words.

The person sees all of it in **About you**, can change any of it, can forget what was noticed, can
forget everything, and can turn remembering off. With remembering off nothing is noticed and
nothing about them is sent with their questions.

## How it reaches RabbAI, efficiently

- The app sends the profile with each question. The server checks it (`parseProfile`: known values
  only, plain words, size limits) and turns it into at most eleven short lines (`profileSummary`).
- Those lines go in the request's last instruction block, after the cached core premises and app
  instructions. The cached part is the same for everyone, so a profile costs a few dozen tokens per
  question and doesn't break caching.
- The profile is a few kilobytes and updated by counting, never by re-reading old chats.

Code: `web/lib/learner-profile.ts`, `web/components/AboutYou.tsx`, `profile` in
`web/lib/engine/answer.ts` and `web/app/api/ask/route.ts`. Tests:
`web/tests/learner-profile.test.ts` and `web/tests/engine.test.ts`.

## Phases

### Phase 1: on the device (built)

There are no accounts yet, so the profile lives in the person's browser, like saved chats. It works
now, costs nothing, and keeps the person's data with them.

### Phase 2: accounts, so the profile follows the person (built 2026-10-07)

The maintainer chose (2026-10-07): sign-in by email link, remembering on from the start (with the
switch to turn it off), and "Was this helpful?" now.

- **Sign-in by email link** (no passwords), sent through Resend. The link page shows a Sign in
  button, and pressing it is what uses the link, so a mail program that opens links to check
  them can't use one up. The access lock still comes first: a link opened on a device that hasn't
  entered the access code asks for the code, then returns to the link.
- **The people database**, `rabai-people` on Turso, its own database beside the testing library
  (`web/lib/account/people.ts`). It holds no email address (only a keyed check of it), no token
  (only hashes), each person's profile and saved chats, and feedback that is never linked to a
  person. It also holds answers still being written (`answer_jobs`, 2026-10-16), so a person who
  leaves the page gets the answer when they come back: only the progress and the checked answer,
  under a hash of an id only the asking device has, deleted once the page has it or after a day.
  Never the question, a picture, or anything about the person.
- **First sign-in on a device:** what the device learned before is added to the account once;
  after that each change goes to the account and to the person's other devices. For chats, the
  copy changed last wins, and a deletion reaches every device. Forgetting, and turning
  remembering off, win over any older copy.
- **Signed in, an answer uses the account's profile.** The server still rebuilds the lines the
  model sees from a checked copy (`parseProfile`, `profileSummary`). The profile shapes only how
  RabbAI explains, never what the sources say.
- A privacy page (`/privacy`), and Download my data, Sign out and Delete my account.
- Setup: the "Accounts" section of `web/README.md`.
- The chavrusa mode keeps its progress in the profile itself (phase 4), so no separate
  `progress` table was needed.

### Phase 3: RabbAI gets better for everyone, with people in charge

Learning from many people must never let anyone change Torah content by using the app. So the
shared learning goes through people:

- **"Was this helpful?"** (built 2026-10-07) on each answer, with an optional reason (a source is wrong, too hard, too
  long, not what I asked, doesn't sound Orthodox). It is sent only when the person taps it, with
  the question and answer, never with their profile.
- **A weekly report for the maintainer and the board**: the questions asked most, answers marked
  unhelpful, questions where the library had no sources (which books to add next), and words many
  people look up (which to explain better).
- **What changes as a result**, always by a person: reference answers the board approves
  (`evals/questions.yaml`), books added to the canon, and edits to the core premises the board
  approves. Search can improve automatically from what people open after searching, because that
  changes only which passages are found first, never what they say.
- **Efficiency from what is learned**: common questions and their sources are found faster, and
  translations made once are kept for everyone (RabbAI's translation library).

### Phase 4: the chavrusa mode uses it (first part built 2026-11-03)

The maintainer asked (2026-11-03) for RabbAI to be a consistent chavrusa: one that remembers what
the person learned, with ways of learning to choose from and depth levels.

- **A session belongs to a chat.** "Learn with a chavrusa" (on the welcome screen, the printed
  page and the reader) asks what to learn, which way (the guide, the questioner, the partner, the
  deep diver, just the page, the reviewer) and how deep (the main point, step by step, every
  detail). The chat keeps the session with it (`chavrusa` in a saved chat), so reopening the chat
  carries on the same way.
- **Where they reached.** When a checked answer cites lines of the text being learned, the
  furthest one becomes the session's place (`reachedLine` in `web/lib/chavrusa.ts`; it never moves
  back, and a commentary's line doesn't count). The next question is sent with it, the library
  opens that line and the next one, and the profile remembers it (`learning`), so the welcome
  screen offers "Continue Berakhot 2a" in a new chat or on another device.
- **What RabbAI is told.** The way and depth by name (`chavrusaSettings`); what each way means is
  written in the core premises ("Learning as a chavrusa", a draft for the board). "Just the page"
  keeps the documents to that amud's Gemara, Rashi and Tosafot and the dictionaries.
- **Across chats.** The profile's lines tell RabbAI what the person has been learning with it and
  the subjects they asked about, so it can connect a new question to what they learned before.
- Still to come: which questions the person answered well, and a schedule for reviewing.

## Decisions for the maintainer

Answered 2026-10-07: sign-in by email link; remembering starts on, with a clear switch; build
"Was this helpful?" now. Still open: whether the weekly report should be sent automatically
(today the maintainer runs `web/scripts/feedback-report.ts` by hand).
