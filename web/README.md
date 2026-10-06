# RabAI web app

The first version of the app: ask RabAI a question, tap a source to open the text, and ask about
any line. Built for phones first, with a two-column layout on a computer.

**This is a private development build.** The texts in it were typed by the team for testing and
are not approved editions. Do not share the link publicly until the rabbinic board has approved
the first editions (see [`../docs/library-growth.md`](../docs/library-growth.md)).

## What it does

- **Ask.** RabAI answers from the passages it finds in the library, and every passage it relies
  on becomes a button.
- **Read.** Tapping a source opens the page or chapter with the cited line highlighted, in
  Hebrew, English, or both, with the commentaries under the line they explain.
- **Ask about a line.** Tap a line for: Explain this, Word by word, What do the commentaries say,
  Where is this used in halacha, or your own question.
- **Study words.** Turn it on in the reader and tap any word: its parts, its root, and every
  other place the root appears in the library (computed from the text, never typed by hand).
  Gemara phrases such as תנו רבנן are marked and explained. "Ask RabAI about this word" sends
  those passages along so RabAI can cite them.
- **Try it yourself.** "Let me try translating" on any line: RabAI checks the person's own
  translation gently.
- **Learn.** Browse the library, read a text, ask RabAI to learn it with you, review My words
  (saved only on the device), and the Gemara's key words. The "grow closer to HaShem" setting
  lives here, off unless the person turns it on.

## How an answer is made

1. **Safety check** (`lib/engine/safety.ts`). If a message suggests danger, crisis lines appear
   above the answer and the model is told to put safety first. It never blocks the question.
2. **Search** (`lib/library/index.ts`) finds up to 10 passages, keeping each commentary with
   its line.
3. **The model** (`lib/engine/answer.ts`) runs under the core premises from
   [`../prompts/core-premises.md`](../prompts/core-premises.md), copied into
   `lib/engine/core-premises.generated.ts` by `npm run sync:prompt`. Each passage is sent as a
   document with citations turned on.
4. **Citation check** (`lib/engine/citations.ts`). A citation is shown only if it points at a
   passage that was actually sent and its quoted words really appear there. Anything else is
   dropped.

Model settings: Claude Opus 5.5, adaptive thinking, effort `high`. **Server-side fallback is
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
| `RABAI_EFFORT` | `high` | How hard the model thinks: `low`, `medium`, `high`, `xhigh`, `max`. Higher is slower and costs more. |
| `RABAI_MODEL` | `claude-opus-5-5` | The model. |
| `RABAI_LIBRARY` | `development` | `approved` uses only board-approved, license-cleared editions. Empty until the board approves. |

Answers can take 20 to 60 seconds at `high`. The ask route allows up to 120 seconds, which
needs Vercel's Fluid compute; `vercel.json` turns it on.

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
