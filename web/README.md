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
- **Learn.** Browse the library, read a text, or ask RabAI to learn it with you. The "grow closer
  to HaShem" setting lives here, off unless the person turns it on.

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

1. Sign in at vercel.com with the GitHub account that owns this repo and choose
   **Add New → Project → Import** `RabAI`.
2. Set **Root Directory** to `web`. Vercel detects Next.js.
3. Under **Environment Variables**, add `ANTHROPIC_API_KEY`. Create the key at
   console.anthropic.com (set up billing there first). Paste it only into Vercel, never into a
   chat or a file in the repo.
4. Deploy. Then, under **Settings → Deployment Protection**, keep the deployment private
   (Vercel Authentication) until the board approves a launch.

Optional settings:

| Variable | Default | What it does |
|---|---|---|
| `RABAI_EFFORT` | `high` | How hard the model thinks: `low`, `medium`, `high`, `xhigh`, `max`. Higher is slower and costs more. |
| `RABAI_MODEL` | `claude-opus-5-5` | The model. |
| `RABAI_LIBRARY` | `development` | `approved` uses only board-approved, license-cleared editions. Empty until the board approves. |

Answers can take 20 to 60 seconds at `high`. The ask route allows up to 120 seconds.

## Checks

```bash
npm test             # library, citation checking, safety, refusal and error handling
npm run typecheck
npm run check:prompt # fails if the core premises copy is out of date
npm run build
```

CI runs all of these on every push.

## Before a public launch

- Replace the development library with approved editions imported from the whitelist.
- Add rate limiting to `/api/ask` (each answer costs money).
- Have the board and a clinician review the safety patterns and crisis resources (US only today).
- Run the test set in [`../evals/questions.yaml`](../evals/questions.yaml) and have the board
  read the answers.
