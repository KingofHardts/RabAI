# RabAI — rules for working in this repo

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
- Run `python3 tools/validate.py` before every commit. CI runs it too.
- Keep the docs in step with the data: a new tag value goes in `canon/vocabulary.yaml`, and a
  new decision goes in `docs/founding-spec.md`.

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
- Every citation shown to a person must pass `web/lib/engine/citations.ts`: it must point at a
  passage that was sent to the model, with its quoted words in that passage. Do not add a path
  that shows sources around it. A live (streamed) answer shows only text; citation buttons
  come with the final, checked answer.
- Word meanings (`/api/word`, the word card) come only from the library's dictionaries, each
  labeled with its dictionary. A guessed root is always shown as a guess, with what was changed.
  RabAI explains a word only when the person taps "Ask RabAI about this word"; never call the
  model when a word is tapped.
- The printed-page view (`web/components/DafPage.tsx`, `web/lib/library/daf.ts`,
  `/api/daf`) shows one amud of the Bavli with the Rashi and Tosafot on it, from the testing
  library. Its layout is ported from daf-renderer (MIT); keep `web/THIRD-PARTY-NOTICES.md`.
  "Show the flow" (`/api/daf/outline`, `web/lib/engine/outline.ts`) is RabAI's outline of the
  argument: run it only when the person asks, keep it on the device, and always label it as
  not yet reviewed by the rabbinic board (founding spec, open question 15).
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
- Saved chats and recent reading (`web/lib/saved-chats.ts`) live only in the person's browser.
  A restored answer is the checked answer exactly as it was shown; never rebuild or add
  citations when restoring one.
- Voice (`web/components/voice.ts`) uses only the browser's own speech recognition and voices.
  What the microphone hears goes into the text box and is never sent without the person
  pressing Ask. Sending or typing cancels listening, so late words can't land in an emptied box.
- Before committing app changes: `cd web && npm test && npm run typecheck`.
- **The online app stays locked** (`web/proxy.ts`, `web/lib/access.ts`): visitors need
  `RABAI_ACCESS_CODE`, and with no code set it stays closed. Never weaken the lock or add a way
  around it. Opening it to the public (`RABAI_PUBLIC=true`) is the maintainer's decision, made
  only after the board approves a launch.

## Where it runs

- **GitHub:** `KingofHardts/RabAI`, default branch `main`. CI is the "Validate" workflow
  (`.github/workflows/validate.yml`).
- **Vercel:** project `rab-ai` on the maintainer's personal Vercel account
  (`joshsgerhardt-5492`, Hobby plan), Root Directory `web`. Every push to `main` deploys.
  The live address is https://rab-ai-ecru.vercel.app.
- **Settings in Vercel:** `ANTHROPIC_API_KEY` and `RABAI_ACCESS_CODE` are required. The
  optional ones are listed in `web/README.md`, including `TURSO_DATABASE_URL` and
  `TURSO_AUTH_TOKEN` for the testing library. Never print, log, or commit their values, and
  never ask anyone to paste a key or code into a chat.
- **The testing library's hosting:** the "Build the testing library" workflow
  (`.github/workflows/library-build.yml`, run by hand) builds it and uploads it to Turso with
  `tools/library_upload.py`, using the repo secrets `TURSO_API_TOKEN` and, optionally,
  `VERCEL_TOKEN` and `TURSO_ORG`. The repo is public, so its Actions logs are public: mask any
  token made during a run (`::add-mask::`) and never echo one.
- **Checking a deploy:** Vercel reports each deploy on its commit
  (`https://api.github.com/repos/KingofHardts/RabAI/commits/<sha>/status`, context `Vercel`).
  Build and runtime logs need access to the maintainer's personal Vercel account; the
  maintainer reads them in the Vercel dashboard.
- **Keep it separate from Senior Stylist.** Don't use Senior Stylist's accounts, keys, data, or
  rules here. In particular:
  - Work on RabAI in a session that has only this repo. A session that also has Senior
    Stylist's repo loads Senior Stylist's rules.
  - The Vercel and Supabase connectors in the maintainer's Claude account belong to Senior
    Stylist. Never use them for RabAI. Check RabAI deploys through the GitHub commit status
    above.
  - Pushes from Claude's cloud sessions currently arrive as the `SeniorStylist` GitHub
    account, which has write access to this repo. That changes only if the maintainer moves
    Claude's GitHub connection; see "Where things stand".
- **Cloud sessions:** `.claude/hooks/session-start.sh` installs PyYAML and the app's packages, so
  the checks run right away.

## Where things stand (2026-10-06)

Moving RabAI off Senior Stylist:
- The maintainer is creating a RabAI cloud environment (Custom network access with the default
  list, plus `rab-ai-ecru.vercel.app` and `www.sefaria.org`) and will start RabAI sessions
  there with only this repo.
- GitHub: decided (maintainer, 2026-10-06) to keep `SeniorStylist` as a collaborator, so
  Claude's sessions keep pushing as that account.
- Chabad.org and Aish.com stay off the environment's allowed domains until they give written
  permission. The list affects only Claude's working sessions, not what the live app can reach.
- To confirm: `ANTHROPIC_API_KEY` in the `rab-ai` Vercel project should come from the
  maintainer's own Anthropic account, not Senior Stylist's.
- Vercel: the Vercel connector holds one account (Senior Stylist's), so RabAI uses a personal
  Vercel token stored on the RabAI environment as an API credential for `api.vercel.com`.
  Sessions call the Vercel API with `curl` and never see the token.

Open items:
- The testing library on Turso was rebuilt 2026-10-06 (run #2, commit `11bf8c9`): 1,117,614
  passages, 1,222 books, 92 editions, now including Pirkei Avot and Rashi on Rosh Hashanah.
- Still missing from the testing library because Sefaria lists no license: Esther Rabbah, and
  the Hebrew of the Ramban on Shemot (his English is there).
- Waiting on the maintainer's yes or no: an outside check that compares a claim against the
  library. Proposed design: automatic lookups only on trusted Orthodox sites; the open web
  only for a claim the person brings; outside content is never treated as a source.
- For the board: the core premises, including "Talking about anything" (open question 14 in
  the founding spec).
- Letters to Aish and Chabad.org are drafted in `docs/outreach/` and not yet sent.
- The repo stays public; the maintainer is fine with that.
- On iPhones, the browser's speech recognition can be unreliable. If it is, the fix is a
  transcription service on the server, which needs the maintainer's choice of provider.

Done 2026-10-06:
- Tap any word for its meaning (dictionaries, breakdown, root guesses; Ask RabAI only when
  asked).
- Saved chats with categories, and "pick up where you left off", on the device. Accounts, so
  chats follow the person between devices, come later.
- The Gemara page as printed, with tappable words, translations, linked Rashi and Tosafot,
  marks, and "Show the flow". Not yet exact: lines break where the screen breaks them, because
  the library has no record of the printed line breaks. Matching the print line for line needs
  either those line breaks (from scans) or correcting each page by hand, as Mercava did.

Next, as the maintainer asked (2026-10-06), roughly in this order:
1. **A chavrusa mode.** RabAI learns a daf with you on the printed page: points things out, asks
   you questions, and tracks what you've learned and where you need practice.
2. **More color** across the app, used to mean something (for example, sources, questions,
   your own words).

## Writing style for anything a user or a rav will read

Plain English. Translate Hebrew and Aramaic terms the first time unless the reader is clearly
comfortable with them. Respectful toward every Jewish community, and toward people who hold
other views.
