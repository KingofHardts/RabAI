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
  that shows sources around it.
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
  Build and runtime logs need a Vercel connection to the maintainer's personal account.
- **Keep it separate from Senior Stylist.** Don't use Senior Stylist's accounts, keys, data, or
  rules here.
- **Cloud sessions:** `.claude/hooks/session-start.sh` installs PyYAML and the app's packages, so
  the checks run right away.

## Pinned for later (2026-10-06)

The maintainer will finish this setup on a computer and wants exact, step-by-step directions
then:

- Give RabAI its own Claude Code cloud environment, started from this repo, so sessions load
  only RabAI's rules. Under Network access, add `rab-ai-ecru.vercel.app` so the live site can
  be tested.
- Connect the Vercel connector to the personal Vercel account, unless doing so would remove
  Senior Stylist's Vercel connection.
- The repo stays public; the maintainer is fine with that.

## Writing style for anything a user or a rav will read

Plain English. Translate Hebrew and Aramaic terms the first time unless the reader is clearly
comfortable with them. Respectful toward every Jewish community, and toward people who hold
other views.
