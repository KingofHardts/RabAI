# Learner profiles: RabAI learns each person over time

*Plan and first step, 2026-10-07. The maintainer asked for RabAI to learn from each person, keep a
profile, and get smarter and more efficient over time, with the back end set up to do it
correctly. Nothing here changes what RabAI teaches: the board decides Torah content.*

## The rule this rests on

A profile changes **how RabAI explains**, never **what the Torah says**. It may choose the level,
the words, the examples and the length of an answer. It never changes the sources, the halacha
presented, or the core premises. For a question that depends on minhag (custom), RabAI gives the
person's community's practice first and still says that others differ. The core premises say this
in "What you know about the person" (a draft for the board).

## What RabAI keeps about a person

| Kind | What | Where it comes from |
|---|---|---|
| What they told RabAI | name (optional), how much they have learned, how well they read Hebrew, community, what they want to learn, short or fuller answers | "About you" in settings |
| What RabAI noticed | the books they read (up to 12), the words they looked up (up to 40; the ones looked up twice are the ones to practice), how often they asked for simpler or deeper answers, how many questions they asked | what they do in the app |

Only learning activity is noticed. RabAI never keeps health, feelings, observance, family, or
anything else about a person's life, even when they mention it in a chat.

The person sees all of it in **About you**, can change any of it, can forget what was noticed, can
forget everything, and can turn remembering off. With remembering off nothing is noticed and
nothing about them is sent with their questions.

## How it reaches RabAI, efficiently

- The app sends the profile with each question. The server checks it (`parseProfile`: known values
  only, plain words, size limits) and turns it into at most nine short lines (`profileSummary`).
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

### Phase 2: accounts, so the profile follows the person (needs the maintainer's choices)

To follow a person between their phone and their computer, RabAI needs sign-in. Proposed:

- **Sign-in by email link** (no passwords), through a mail service such as Resend, or "Sign in
  with Google". Either needs an account the maintainer creates; nobody pastes keys into a chat.
- **A database for people**, `rabai-people` on Turso (small: a few kilobytes per person):
  - `people (id, email_hash, created_at, last_seen)`
  - `profiles (person_id, stated, observed, updated_at)`, the same shape as on the device
  - `chats (person_id, id, title, category, messages, updated_at)` for saved chats
  - `progress (person_id, ref, kind, at)` for what they learned and practiced, for the chavrusa mode
- On first sign-in, what is on the device is copied up once; after that the server copy is the
  one used, and the device keeps a cached copy for speed and offline use.
- A privacy notice before launch, and "Download my data" and "Delete my account" buttons.

### Phase 3: RabAI gets better for everyone, with people in charge

Learning from many people must never let anyone change Torah content by using the app. So the
shared learning goes through people:

- **"Was this helpful?"** on each answer, with an optional reason (a source is wrong, too hard, too
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
  translations made once are kept for everyone (RabAI's translation library).

### Phase 4: the chavrusa mode uses it

The planned chavrusa mode (learning a daf together) reads the profile and the progress table:
where the person is, which words to practice, which questions they answered well, and what to
review.

## Decisions for the maintainer

1. Sign-in: email link (recommended) or Google.
2. Whether remembering starts on (as built now, with a clear switch) or asks first.
3. Whether to build "Was this helpful?" now; it needs only a small table in an existing database.
