# RabAI web app

The first version of the app: ask RabAI a question, tap a source to open the text, and ask about
any line. Built for phones first, with a two-column layout on a computer.

**This is a private development build.** The texts in it were typed by the team for testing and
are not approved editions. Do not share the link publicly until the rabbinic board has approved
the first editions (see [`../docs/library-growth.md`](../docs/library-growth.md)).

## What it does

- **Chat and Learn.** A switch at the top flips between talking with RabAI (about Torah or
  anything else) and learning texts. The text panel appears only once a source is opened.
- **Ask.** RabAI answers from the passages it finds in the library, and every passage it relies
  on becomes a button. Answers are short and plain; "Tell me more" asks for a fuller one, and
  "Say it more simply" for a simpler one. The answer appears as it is written.
- **Talk.** The microphone button types what you say into the box (the browser's own speech
  recognition); you read it and press Ask. A question asked out loud gets its answer read
  aloud, and every answer has a Listen button (the browser's own voices). Nothing is recorded
  or sent anywhere else.
- **Highlight and ask.** Highlight any words in an answer or a text, and an "Ask about this"
  button appears.
- **Read.** Tapping a source opens the page or chapter with the cited line highlighted: beside
  the answer when it comes from a chat (on a computer), and on the whole screen when it comes
  from Learn or on a phone, with "← Library" or "← Chat" to go back. On a phone the bar slides
  away while reading down and comes back on the way up. One bar holds everything: the title (tap it for the book's contents, `/api/contents?book=`), arrows to
  the previous and next chapter or amud, "Page" for the printed Gemara page, and **Aa** for the
  language (Hebrew, English, or both) and which commentators to show under every line. The other
  commentaries fold into a count on each line ("6 comments"); tapping it opens them in the card.
  Under the bar, one line says the text is from the testing library and not yet approved by the
  rabbinic board, with the editions one tap away.
- **Tap a word.** Tapping any Hebrew or Aramaic word opens a card beside it (a short sheet at
  the bottom on a phone) with the word first, then tabs: **Meaning**, **Translation**,
  **Commentary**, **Ask**. Meaning shows what the library's dictionaries say (Jastrow and the
  Radak's Sefer HaShorashim in the testing library): one row per entry with its dictionary's
  name, its notice in a few words (Jastrow: "Not Orthodox · word meanings only"), and the
  entry's first meaning on one line, cut from the dictionary's own text; a tap opens the whole
  entry with the full notice. Above the tabs, how the word breaks down: the letters in front
  ("and", "the", "from"), the ending, and for a conjugated word a guess at its root, marked as a
  guess, with what was changed. The arrows beside the word move to the next or previous word.
  This uses no AI. When no dictionary has the word, "Ask RabAI about this word" becomes the main
  button; RabAI explains only when tapped. (`/api/word?w=` does the lookup.) Where the team's
  word notes cover a word, the card also shows its parts, its root and every other place the
  root appears in the library (computed from the text, never typed by hand), and Gemara phrases
  such as תנו רבנן are explained; "Ask RabAI about this word" sends those passages along so
  RabAI can cite them.
- **Ask about a line.** Tap a line (not a word) for the same card on its Ask tab: Explain
  this, Word by word, What do the commentaries say, Where is this used in halacha, or your own
  question. The answer appears in the card; the text never moves.
- **Try it yourself.** "Let me try translating" on any line: RabAI checks the person's own
  translation gently.
- **See the page.** A Gemara text in the testing library opens as the printed page: the
  Gemara in the middle, Rashi on the inner side and Tosafot on the outer side, wrapping around
  each other the way the Vilna Shas is set (Rashi moves sides between amud a and amud b). Every
  word can be tapped: the same card opens in a side panel (a sheet on a phone), with the word
  and its meanings first, then the line's translation, the Rashi and Tosafot on that line
  (lightly shaded on the page) or the line a comment explains, and questions to ask RabAI; the
  line's Hebrew and its four mark colors sit at the bottom. The tapped word is solid blue and its
  line a soft tint; a mark is a highlighter stroke along the bottom of the words. On a phone the
  page opens fitted to the screen: pinch to zoom, or double-tap a spot to zoom into it (and again
  to see the whole page). "The Gemara alone, larger" (under View) sets just the Gemara in one
  column; its Rashi and Tosafot stay in the card. "Show the flow" colors each phrase by what it does (question, answer,
  proof, challenge...), as RabAI's outline, labeled not yet reviewed; it runs only when asked
  and is kept on the device. RabAI names each phrase by the numbers of the library's own words,
  never by retyping them, and gives a phrase English only when it is an exact stretch of the
  library's English for the line. The legend's colors are filters (show only the questions, say),
  and "Step through" goes phrase by phrase in a bar below the page: the phrase is ringed on the
  page, with its kind, RabAI's note, and the library's English for it (or for the whole line).
  When the library has no English for a line, a Rashi or a Tosafot,
  "Translate this" gives RabAI's own translation, and "Word by word" sets RabAI's English under
  each of the library's words, with the tapped word outlined. Both are labeled as RabAI's, not
  from the library and not yet reviewed. They are made from the library's own sources (the line
  a comment explains with its Orthodox English, the other commentaries on that line, and the
  dictionaries), and "Other readings" lists another way a given source reads a phrase, with its
  words quoted and checked like a citation. Each translation is kept in RabAI's translation
  library, so a passage is translated once for everyone (see below), and on the device
  (`/api/translate`). The person can mark lines in four colors. The shape follows the
  printed page, but lines break where the screen breaks them. A link like `/?daf=Berakhot 2a`
  opens a page directly. (`/api/daf?ref=` and `/api/daf/outline`; the layout method is ported
  from the MIT-licensed daf-renderer, see `THIRD-PARTY-NOTICES.md`.)
- **Your chats.** Every conversation is saved as it goes, on this device only (there are no
  accounts yet). On a computer they are a column beside the conversation; on a phone the Chats
  button lists them. They are grouped by category, with the person's own categories (Gemara,
  Halacha, or anything they name), each in its own color. Open one to pick it up, rename it,
  move it, or delete it (one at a time or all at once); the open chat's name and a ⋯ menu for the
  same sit at the top of the conversation. A saved answer is the same checked answer the person
  saw; nothing is rewritten.
- **Learn.** The library's home: "Continue" cards for the last texts opened (line by line or as
  the printed page), a search box that stays at the top, then the shelves: Tanakh, Mishnah,
  Talmud, Halacha, Midrash and Prayer, with "More" for the rest (on a computer, a list down the
  left). Books are grouped the way learners know them: the six orders of the Mishnah and Talmud,
  the three parts of Tanakh, the books of the Mishneh Torah. A book opens its own page: continue
  where you left off or start, a grid of its pages or chapters (a Bavli tractate's dafim can open
  line by line or as the printed page), and its commentaries in the library (Rishonim, then
  Acharonim). The book search forgives spelling and order: "Kidushin", "Gemara Kiddushin",
  "Kesubos", "Tosfos Kidushin", Hebrew names, part of a name, or a name with a page
  ("Kiddushin 40b") all work (`lib/library/catalog.ts`). My words (saved only on the device) and
  the Gemara's key words each have their own screen.
- **Settings** (the gear at the top): "Help me grow closer to HaShem", off unless the person
  turns it on, "About you", and a note on what RabAI is and where things are kept.
- **About you.** The person can tell RabAI how much they have learned, how well they read Hebrew,
  their community and what they want to learn, and see what RabAI has noticed while they learn
  (the books they read, the words they look up more than once). RabAI uses it only to pitch its
  explanations, never to change what the sources say. It stays on the device, and the person can
  change it, forget it, or turn remembering off. See `docs/learner-profiles.md`.

## How an answer is made

1. **Safety check** (`lib/engine/safety.ts`). If a message suggests danger, crisis lines appear
   above the answer and the model is told to put safety first. It never blocks the question.
2. **Finding sources.** With the private testing library (`lib/library/testing.ts`), a quick
   model call (`lib/engine/lookup.ts`) names the places a lamdan would open for the question:
   the verse, the Gemara, the Rambam, the Shulchan Aruch. It may name only books the library
   holds. The app opens those places, follows Sefaria's cross-references (commentaries first),
   and searches the library for the key words in Hebrew and English, up to 24 passages. When
   a passage has no English (much of the Yerushalmi), it adds up to 8 dictionary entries for
   its words (Jastrow, the Radak's Sefer HaShorashim), so RabAI can translate it and say the
   translation is its own. With
   the development texts, `lib/library/index.ts` searches them in memory, up to 10 passages.
3. **The model** (`lib/engine/answer.ts`) runs under the core premises from
   [`../prompts/core-premises.md`](../prompts/core-premises.md), copied into
   `lib/engine/core-premises.generated.ts` by `npm run sync:prompt`. Each passage is sent as a
   document with citations turned on.
4. **Citation check** (`lib/engine/citations.ts`). A citation is shown only if it points at a
   passage that was actually sent and its quoted words really appear there. Anything else is
   dropped.

Model settings: Claude Opus 5.5, adaptive thinking, effort `medium` for everyday answers and
`high` when the person taps "Tell me more". The answer streams to the screen as it is written
(`/api/ask` with `"stream": true` sends one JSON object per line: `status`, `text`, then
`done` with the checked answer); citations appear only after the check. When the lookup step
decides a message needs no sources (small talk, a practical task), nothing is searched. **Server-side fallback is
on** (`fallbacks: "default"`): if the model declines a request, Anthropic re-runs it on its
recommended fallback model inside the same call. If the whole chain declines, the person sees a
kind message instead of a partial answer.

## Run it on your computer

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

Without an API key the app still runs: it shows which passages it found, but can't answer.
To get answers locally, create `web/.env.local` (never commit it) with:

```
ANTHROPIC_API_KEY=your-key
```

## Put it online (Vercel)

The live app is at https://rab-ai-ecru.vercel.app (locked with an access code).

1. Get an Anthropic API key at console.anthropic.com. Set up billing there first, and set a
   monthly spend limit (Settings → Limits) so a mistake can't run up a large bill.
2. At vercel.com, sign in with the GitHub account that owns this repo and choose
   **Import Project → Import**. When Vercel asks for GitHub access, give it this repository
   only.
3. Pick `RabAI`, then set **Root Directory** to `web`. Vercel detects Next.js.
4. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY`: the key from step 1. Paste it only into Vercel, never into a chat or
     a file in the repo.
   - `RABAI_ACCESS_CODE`: a code of your choosing, such as a few words. Share it only with the
     people testing RabAI.
5. Deploy, open the link, enter the access code, and ask one of the starter questions.

### Keeping it private

The app locks itself online (`proxy.ts`, `lib/access.ts`):

- With `RABAI_ACCESS_CODE` set, visitors must enter the code first. Their browser remembers it
  for 30 days. Changing the code signs everyone out.
- With no code set, the app stays closed. Forgetting the code never leaves it public.
- `RABAI_PUBLIC=true` opens it to everyone. Set it only after the rabbinic board approves a
  launch.
- On your own computer there is no lock unless you set a code.

Vercel's free (Hobby) plan can't hide the main web address behind a Vercel login, so this
code is the lock. Search engines are already told not to list the site.

Optional settings:

| Variable | Default | What it does |
|---|---|---|
| `RABAI_EFFORT` | `medium` | How hard the model thinks: `low`, `medium`, `high`, `xhigh`, `max`. Higher is slower and costs more. |
| `RABAI_MODEL` | `claude-opus-5-5` | The model. |
| `RABAI_LIBRARY` | automatic | `testing` when a library database is set, `development` otherwise. `approved` uses only board-approved, license-cleared editions (empty until the board approves). |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | none | The private testing library and a read-only token for it. The build workflow sets them (see below). `RABAI_LIBRARY_DB_URL` and `RABAI_LIBRARY_DB_TOKEN` also work, for example `file:../library/rabai-library.db` on your computer. |
| `RABAI_LOOKUP_MODEL` | `claude-sonnet-5-5` | The quick model that decides where to look. |
| `RABAI_OUTLINE_FIXTURE` | none | On your computer only: a file holding a saved outline reply, used in place of the model for "Show the flow" (`{section}` in the name stands for the page, as in `/tmp/outline-{section}.txt`). The reply is checked exactly like a real one. Ignored on Vercel and in a production build. |

Answers can take 20 to 60 seconds at `high`. The ask route allows up to 120 seconds, which
needs Vercel's Fluid compute; `vercel.json` turns it on.

## Connecting the testing library

The testing library is about 1.2 GB: 92 Orthodox editions and dictionaries with open licenses
or in the public domain, over a million passages, and Sefaria's cross-references between them. It is too big for Vercel, so it lives in
a private Turso database (a hosted SQLite service with a free plan). A GitHub workflow builds it
and uploads it. Every passage is labeled "not yet approved by the rabbinic board", and the app
stays locked.

Setting it up once (a phone browser works):

1. **Turso.** Sign up at [turso.tech](https://turso.tech) (the free plan is enough). In the
   Turso dashboard, open Settings, then API Tokens, and create a token. Copy it; it goes only
   into GitHub in the next step.
2. **GitHub.** In the repository, open Settings, then Secrets and variables, then Actions, and
   add a secret named `TURSO_API_TOKEN` with that token.
3. **Vercel (recommended).** In Vercel, open Account Settings, then Tokens, and create a token
   scoped to the account that holds `rab-ai`, with an expiry date. Add it to GitHub as a second
   secret, `VERCEL_TOKEN`. With it, the workflow puts the database address and a read-only
   token straight into Vercel and redeploys, so no token is ever copied by hand.
4. **Build.** In GitHub, open Actions, then "Build the testing library", then Run workflow.
   It usually takes under an hour. The run's summary shows what was loaded. When it
   finishes, the app's header says "Testing library".

Without `VERCEL_TOKEN`: in the Turso dashboard, open the `rabai-library` database, create a
read-only token, and add `TURSO_DATABASE_URL` (the `libsql://` address in the run's summary) and
`TURSO_AUTH_TOKEN` to Vercel yourself, then redeploy. A database token stops working when the
library is rebuilt, so this step repeats after each build.

Rebuild after changing `canon/canon.yaml` or `canon/excluded.yaml`: run the workflow again. The
database is replaced, so the library is unavailable for the few minutes of the upload.

On your own computer (needs `pip install pyyaml pymongo`):
`python3 tools/library_plan.py && python3 tools/library_build.py` writes
`library/rabai-library.db` (gitignored), and `RABAI_LIBRARY_DB_URL=file:../library/rabai-library.db`
in `web/.env.local` uses it.

## RabAI's translation library

Every translation RabAI makes is kept in its own database, `rabai-translations`, in the same
Turso group as the testing library. A passage is translated once and then served to everyone
from there, without calling the model. Rebuilding the testing library never touches it. Each
row records the exact text it translated (a check value of its words), so a translation is
never shown beside a text that has changed since; what it was made from; which model made it;
and a review status, "unreviewed" until the rabbinic board reviews it. Without it, the app
still translates when asked and keeps the result on the device.

It can also be filled ahead of time, at half the price of translating live, with the
"RabAI's translation library" workflow (Actions, then Run workflow):

1. **Once:** add a GitHub secret `ANTHROPIC_API_KEY` (a key from your own Anthropic account,
   with a monthly spend limit set there). Then run the workflow with mode **setup**. It creates
   the database and, with `VERCEL_TOKEN`, connects the app (`TRANSLATIONS_DATABASE_URL`,
   `TRANSLATIONS_AUTH_TOKEN`) and redeploys. Setup spends nothing.
2. **estimate** counts the passages without English in the books you name and prices them.
   It spends nothing.
3. **fill** translates up to `limit` passages that aren't in the library yet, and never more
   than `max_dollars` by the estimate. It waits for the batch (usually under an hour) and keeps
   the results; if the batch is still running when it stops, run **collect** later. Each run's
   summary shows what it really cost, and later estimates use that measured cost.

Choose books by title (`Rashi on Berakhot`), by pattern (`Tosafot on %`), or by canon work id.
Estimated costs with the default model, for the general translation only (word by word roughly
doubles it; the faster model is about half):

| Books | Hebrew words without English | Estimate |
|---|---|---|
| Rashi on Berakhot | 45,000 | about $8 |
| Tosafot on Berakhot | 34,000 | about $6 |
| Rashi on the whole Bavli | 2.2 million | about $400 |
| Tosafot on the whole Bavli | 2.3 million | about $420 |
| Everything in the library without English | 44 million | about $8,000 |

These are estimates from counting the requests; a small fill first gives the real number.

### Translating inside a Claude Code session (no API spend)

The library can also be filled by Claude in a Claude Code session, on the maintainer's Claude
plan instead of the API. The requests and the checks are the same as a batch fill; only the step
that calls the API is replaced (`scripts/translate-here.ts`):

1. `send` writes the requests for the chosen books to `library/session-translations/` on the
   session's computer (never committed: it holds the library's texts).
2. Claude answers each request in the session, following the request's own instructions.
3. `collect` checks the answers exactly like a batch fill and keeps them in a translation library
   on that computer.
4. `seal` seals them with the inbox's public key into `translations-inbox/`, and the push starts
   the "RabAI's translation inbox" workflow (`.github/workflows/translations-inbox.yml`). Only that
   workflow can open the files (its private key stays in the translation library's database), so
   unreviewed translations are never public. It checks each translation against the testing
   library's text again, keeps it, and removes the file.

The inbox workflow's first run creates the translation library if it isn't there yet, connects the
app to it, and writes `translations-inbox/public-key.pem`. It never calls a model and spends
nothing.

## Accounts and "Was this helpful?"

With an account, a person's chats and what RabAI knows about them ("About you") follow them to
every device they sign in on. Sign-in is by a link sent to their email; there are no passwords.
Without accounts switched on, the app works exactly as before, with everything kept on the device.

What the people database (`rabai-people`, on Turso) keeps, and what it never keeps:
- No email address. Only a keyed check of it (an HMAC made with `RABAI_AUTH_SECRET`), so the same
  address finds the same account but the stored value can't be turned back into the address.
- Sign-in links and sessions only as hashes. A link works once, for 15 minutes.
- Each person's profile and saved chats. "Your account" (the gear, then Your account) has
  Download my data, Sign out and Delete my account; deleting removes everything kept for them.
- "Was this helpful?" feedback: the question, the answer, the sources it cited and the reason
  given. It is never linked to a person or a profile. It changes nothing by itself: the
  maintainer and the board read it and decide (docs/learner-profiles.md, phase 3).

Setting it up once:

1. **The database.** In GitHub, open Actions, then "Accounts (the people database)", then Run
   workflow. It uses the `TURSO_API_TOKEN` and `VERCEL_TOKEN` secrets the testing library already
   uses. It creates the database (never deleting it), puts `PEOPLE_DATABASE_URL`,
   `PEOPLE_AUTH_TOKEN` and `RABAI_AUTH_SECRET` into Vercel, and redeploys. From then on,
   "Was this helpful?" works. (Without `VERCEL_TOKEN`: create a full-access token for the
   `rabai-people` database in the Turso dashboard, and add the database's `libsql://` address,
   that token, and a random `RABAI_AUTH_SECRET` of at least 32 characters to Vercel yourself.)
2. **Email.** Create an account at [resend.com](https://resend.com) (the free plan sends 3,000
   emails a month, up to 100 a day). Under Domains, add a domain you own and add the DNS records
   it shows; Resend sends to other people's addresses only from a verified domain. Under API
   Keys, create a key with sending access.
3. **Vercel.** Add `RESEND_API_KEY` (that key) and `RABAI_MAIL_FROM` (for example
   `RabAI <signin@your-domain>`), then redeploy. Sign-in then appears under the gear, Your
   account.

| Setting | Needed for | What it is |
| --- | --- | --- |
| `PEOPLE_DATABASE_URL`, `PEOPLE_AUTH_TOKEN` | both | The people database; set by the workflow. |
| `RABAI_AUTH_SECRET` | sign-in | At least 32 characters; set once by the workflow. Never change it: a new one leaves every account unreachable. |
| `RESEND_API_KEY`, `RABAI_MAIL_FROM` | sign-in | The mail service and the sender's address. |
| `RABAI_APP_URL` | optional | The address emailed links point at. On the live site they point at its production address by default. |

To read the feedback, on your own computer only (never in GitHub Actions, whose logs are public):
create a read-only token for `rabai-people` in the Turso dashboard, then from `web/` run
`PEOPLE_DATABASE_URL=libsql://… PEOPLE_AUTH_TOKEN=… npx tsx scripts/feedback-report.ts --days 7`.

On your own computer, with no mail settings, a sign-in link is printed to the server's log
instead of being emailed (never on Vercel).

## Checks

```bash
npm test             # library, citation checking, safety, refusal and error handling
npm run typecheck
npm run check:prompt # fails if the core premises copy is out of date
npm run build
```

CI runs all of these on every push.

## Before a public launch

- Replace the development library with approved editions imported from the whitelist, and the
  team's word notes (`lib/library/dev-lexicon.ts`) with entries from approved dictionaries.
- Add rate limiting to `/api/ask` (each answer costs money), then remove the access code.
- Check Vercel's plan terms before accepting donations: the free Hobby plan is for
  non-commercial use.
- Have the board and a clinician review the safety patterns and crisis resources (US only today).
- Run the test set in [`../evals/questions.yaml`](../evals/questions.yaml) and have the board
  read the answers.
