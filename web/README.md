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
- **Read.** Tapping a source opens the page or chapter with the cited line highlighted, in
  Hebrew, English, or both, with the commentaries under the line they explain.
- **Tap a word.** In normal reading, tapping any Hebrew or Aramaic word shows what the
  library's dictionaries say about it (Jastrow and the Radak's Sefer HaShorashim in the testing
  library), each entry labeled with its dictionary, plus how the word breaks down: the letters
  in front ("and", "the", "from"), the ending, and for a conjugated word a guess at its root,
  marked as a guess, with what was changed. This uses no AI. When no dictionary has the word,
  "Ask RabAI about this word" becomes the main button; RabAI explains only when tapped.
  (`/api/word?w=` does the lookup.)
- **Ask about a line.** Tap a line for: Explain this, Word by word, What do the commentaries say,
  Where is this used in halacha, or your own question.
- **Study words.** Turn it on in the reader and tap any word: its parts, its root, and every
  other place the root appears in the library (computed from the text, never typed by hand).
  Gemara phrases such as תנו רבנן are marked and explained. "Ask RabAI about this word" sends
  those passages along so RabAI can cite them.
- **Try it yourself.** "Let me try translating" on any line: RabAI checks the person's own
  translation gently.
- **See the page.** A Gemara text in the testing library opens as the printed page: the
  Gemara in the middle, Rashi on the inner side and Tosafot on the outer side, wrapping around
  each other the way the Vilna Shas is set (Rashi moves sides between amud a and amud b). Every
  word can be tapped: the side panel shows that line's translation, the word's meanings from
  the dictionaries, the Rashi and Tosafot on that line (lightly shaded on the page), and
  questions to ask RabAI. "Show the flow" colors each line by what it does (question, answer,
  proof, challenge...), as RabAI's outline, labeled not yet reviewed; it runs only when asked
  and is kept on the device. The person can mark lines in four colors. The shape follows the
  printed page, but lines break where the screen breaks them. A link like `/?daf=Berakhot 2a`
  opens a page directly. (`/api/daf?ref=` and `/api/daf/outline`; the layout method is ported
  from the MIT-licensed daf-renderer, see `THIRD-PARTY-NOTICES.md`.)
- **Your chats.** Every conversation is saved as it goes, on this device only (there are no
  accounts yet). The Chats button lists them by category, with the person's own categories
  (Gemara, Halacha, or anything they name), each in its own color. Open one to pick it up,
  rename it, move it, or delete it (one at a time or all at once). A saved answer is the same
  checked answer the person saw; nothing is rewritten.
- **Learn.** Browse the library by shelf (Tanakh, Mishnah, Talmud, Halacha, Midrash, and so on),
  grouped the way learners know it: the six orders of the Mishnah and Talmud, the three parts of
  Tanakh, the books of the Mishneh Torah. Each book's card lists its commentaries in the library
  (Rishonim, then Acharonim). The book search forgives spelling and order: "Kidushin",
  "Gemara Kiddushin", "Kesubos", "Tosfos Kidushin", Hebrew names, part of a name, or a name with
  a page ("Kiddushin 40b") all work (`lib/library/catalog.ts`). Pick up where you left off (the
  last texts you opened), read a text, ask RabAI to learn it with you, review My words
  (saved only on the device), and the Gemara's key words. The "grow closer to HaShem" setting
  lives here, off unless the person turns it on.

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
