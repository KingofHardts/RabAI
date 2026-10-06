# Roadmap

Each phase finishes before the next starts. The board's approval gates every phase.

## Phase 0 — Founding spec (now)

- [x] Core premises, draft
- [x] Canon list with tags, draft
- [x] Default exclusions
- [x] First 30 test questions
- [x] Growing closer to HaShem, by choice: rules, sources, and 6 more test questions
- [ ] Recruit the rabbinic board (one to three rabbanim)
- [ ] Board review of the spec, canon, and core premises
- [ ] Decisions on the twelve open questions in the founding spec

## Phase 1 — Canon approval and licensing

- Board approves works and editions, one by one.
- Contact publishers for every `needs_agreement` edition (see `docs/licensing.md`).
- Confirm license terms for every `verify` edition.
- Outcome: a whitelist of approved, cleared editions. `tools/validate.py` prints it.

## Phase 2 — Building the library

- Import only whitelisted editions, from their approved sources.
- Split each work at its natural units: pasuk, mishnah, sugya or amud, siman and se'if.
- Store each passage with its tags: work, author, era, stream, minhag, edition, and a precise
  reference.
- Import Hebrew and English side by side, so an answer can cite the original.

## Phase 3 — The answer engine

- Retrieval searches only the library.
- The model runs under the approved core premises.
- Every answer cites the passages it used. The model may not cite anything it was not given.
- Answers about practical halacha show positions and send the person to their rav.
- Safety handling runs before anything else.
- A growth setting, off by default, asked once at sign-up and changeable in settings.
- Saving personal goals and progress only when the person turns it on, with a way to see and
  delete them.

## Phase 4 — Testing

- Run every test question on every release.
- Grade answers against `must` and `must_not`, first automatically, then by people.
- The board reviews every `high` sensitivity answer against its approved reference answer.
- Grow the test set from real questions as they come in.

## Phase 5 — Pilot

- A small closed group of learners, for example through the Aish connection.
- A simple way for users to flag an answer, and for the board to see flagged answers.
- Expand only after the board is comfortable with what it sees.

## Decisions deliberately left open

- **Which AI model.** Choose in Phase 3, after the test set exists, by running candidates
  against it.
- **Where the library is stored.** Choose in Phase 2, based on its size and the licensing terms.
- **Hebrew-language users.** Supporting answers in Hebrew is a later decision.
