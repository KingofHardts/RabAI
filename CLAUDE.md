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
- **Two tiers.** A work marked `standing: debated` in the canon (uncertain author, unusual source,
  disputed claim, criticized views) stays in the library with a plain-English `caution`. The build
  carries it to every passage, RabAI is told it with the passage, and the app shows it beside the
  text. Never drop a caution, and never let RabAI rest a halachic answer on a debated book alone.
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
  own interface, one request at a time with a pause, within robots.txt, as RabAIBot; never get
  around a site's protections (a Cloudflare check means asking the site to let RabAIBot through).
  Nothing it copies is printed in a log, committed, or kept as an artifact. Every reference in a
  collection starts with the site's name ("Aish.com, ..."), so `combineStores` sends it to that
  database. Articles are added after the texts (`LOOKUP_LIMITS.articles`) and RabAI is told each
  is a teacher's explanation, not a primary source and never a ruling (`articleContext`). The
  Learn tab lists them by section (`ArticleShelves.tsx`, `/api/articles`). Keep
  `collectionClients` refusing a public app, like `testingClient`.
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
  not yet reviewed by the rabbinic board (founding spec, open question 15). It colors phrases,
  which the model names only by the library's word numbers, and a phrase's English is shown only
  when it is an exact stretch of the library's English for the line (`outline-phrases.ts`).
- "Translate this" and "Word by word" on the page view (`/api/translate`,
  `web/lib/engine/translate.ts`, `web/lib/engine/gloss.ts`) are RabAI's own translation: run
  them only when the person taps (or in a batch the maintainer runs), and always label them as
  not from the library and not yet reviewed by the rabbinic board (founding spec, open question
  16). The Hebrew in a word-by-word list always comes from the library's text; the model's list
  only attaches English to it.
- A translation is made only from the library's own sources (`translate-sources.ts`: the line a
  comment explains with its Orthodox English, other commentaries on that same line, the
  dictionaries). An "other reading" is shown only when its source was given and its quoted words
  are in that source (`checkReadings` in `gloss.ts`, the same idea as `citations.ts`).
- RabAI's translation library (`web/lib/library/translations.ts`, database `rabai-translations`)
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
- The learner profile (`web/lib/learner-profile.ts`, "About you") shapes only how RabAI explains,
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
- Voice (`web/components/voice.ts`) uses only the browser's own speech recognition and voices.
  What the microphone hears goes into the text box and is never sent without the person
  pressing Ask. Sending or typing cancels listening, so late words can't land in an emptied box.
- Accounts (`web/lib/account/`, people database `rabai-people`) carry a person's profile and
  chats between devices; setup is in `web/README.md`, "Accounts". Never store an email address
  (only `emailCheck`), a sign-in link or a session token (only their hashes). Never change
  `RABAI_AUTH_SECRET` once set: every account would become unreachable. Never delete the people
  database; a person's rows go only when they delete their account. "Was this helpful?" feedback
  is never linked to a person or a profile, and changes nothing by itself: people read it and
  decide. Emailed links point only at the app's own address (`appUrl` in `config.ts`).
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
  `TRANSLATIONS_AUTH_TOKEN` for RabAI's translation library. Never print, log, or commit their
  values, and never ask anyone to paste a key or code into a chat.
- **The testing library's hosting:** the "Build the testing library" workflow
  (`.github/workflows/library-build.yml`, run by hand) builds it and uploads it to Turso with
  `tools/library_upload.py`, using the repo secrets `TURSO_API_TOKEN` and, optionally,
  `VERCEL_TOKEN` and `TURSO_ORG`. The repo is public, so its Actions logs are public: mask any
  token made during a run (`::add-mask::`) and never echo one.
- **RabAI's translation library:** the "RabAI's translation library" workflow
  (`.github/workflows/translations.yml`, run by hand) creates the database and connects the app
  (`tools/translations_setup.py`), estimates costs, and fills it in batches. Filling needs the
  repo secret `ANTHROPIC_API_KEY` as well as the Turso and Vercel ones.
- **Is it working?** The "Is RabAI working?" workflow (`.github/workflows/health.yml`, run by
  hand) checks every piece from GitHub: Turso's plan, usage and databases, the Vercel deploys and
  settings (names only), and the live app, by request and in a real browser on a phone and a
  computer (`tools/health_check.py`, `tools/health_browser.cjs`). It prints no secrets and no
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

## Where things stand (2026-10-11)

Moving RabAI off Senior Stylist:
- The maintainer is creating a RabAI cloud environment (Custom network access with the default
  list, plus `rab-ai-ecru.vercel.app` and `www.sefaria.org`) and will start RabAI sessions
  there with only this repo.
- GitHub: decided (maintainer, 2026-10-06) to keep `SeniorStylist` as a collaborator, so
  Claude's sessions keep pushing as that account.
- Chabad.org and Aish.com gave written permission (reported by the maintainer, 2026-10-10;
  `canon/permissions.yaml`), so they may be added to the environment's allowed domains. The
  list affects only Claude's working sessions, not what the live app can reach.
- To confirm: `ANTHROPIC_API_KEY` in the `rab-ai` Vercel project should come from the
  maintainer's own Anthropic account, not Senior Stylist's.
- Vercel: the Vercel connector holds one account (Senior Stylist's), so RabAI uses a personal
  Vercel token stored on the RabAI environment as an API credential for `api.vercel.com`.
  Sessions call the Vercel API with `curl` and never see the token.

Open items:
- The testing library on Turso was rebuilt 2026-10-07 (run #4, commit `8aa2fd7`): 3,006,539
  passages, 5,445 books, 765 editions, 4,064 MB, with the debated books' cautions. Rebuild to add
  Torat Emet's texts (35 files, about 34 MB of Sefaria's JSON, by its permission), Milchamot
  HaShem and Rabbi Yosef ibn Yahya. It has no printed-page layouts yet: the "Make the
  printed-page layouts" workflow has never been run.
- **Turso is on the Developer plan (upgraded 2026-10-10): 9 GB, with overages off,** so going
  past 9 GB blocks every write again. Storage counts every database used in the month, deleted
  ones included: 8.1 GB were used by 2026-10-10, leaving under 1 GB until Turso's usage period
  resets (its dashboard shows the date). A rebuild of the testing library adds about its size
  (4.1 GB) to the period's count, so it waits for the reset, or for the maintainer to turn
  overages on. Batch canon changes into one rebuild, and check a collection's estimated size
  before writing it.
- Recanati on the Torah is back, with the modern Hebrew translation of its Zohar quotations
  removed by the build (`strip_brackets: angle`; 30 of 1,909 passages left out).
- Torat Emet, Aish.com and Chabad.org gave written permission (reported by the maintainer,
  2026-10-10; `canon/permissions.yaml`): complete access, for private use only, not public for
  now (`public: false`). Their emails' own words aren't on file yet. Torat Emet's vocalized Zohar
  (Zohar Menukad) enters the library at the next rebuild. Its Hebrew translation of the Zohar stays out (translator unknown), as does the Sulam's
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
- Translating inside a Claude Code session works end to end (40 Rashi comments imported on
  2026-10-07). It uses the session's plan, not the API, but takes a lot of it (about 540,000
  tokens for 728 Hebrew words), so it suits chosen books, not all of Shas.
- Still missing because Sefaria lists no license on their files: 24 files, among them the Hebrew
  of the Ramban on Shemot (`python3 tools/library_plan.py` lists them). The maintainer reported on
  2026-10-10 that Sefaria is adding license labels. Sefaria's export (last made 2026-10-01) is
  what the build reads; its daily database backup shows a new label first.
- Waiting on the maintainer's yes or no: an outside check that compares a claim against the
  library. Proposed design: automatic lookups only on trusted Orthodox sites; the open web
  only for a claim the person brings; outside content is never treated as a source.
- For the board: the core premises, including "Talking about anything" (open question 14 in
  the founding spec).
- Aish.com and Chabad.org couldn't send exports, so their articles are copied from their
  websites, section by section through the canon (website collections, above), never a whole
  site at once. Aish.com's ten sections are in the canon for the board; Chabad.org shows robots a
  Cloudflare check, so it waits until Chabad.org lets RabAIBot through
  (`docs/permissions-plan.md`). Keep the access code to a small circle while these permissions are
  private only.
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
