# Rabbinic review

The board is one to three Orthodox rabbanim. Nothing ships without them. This page says what
they approve, how they review it, and how approvals are recorded.

## What the board approves

| Item | Where it lives | What approval means |
|---|---|---|
| The core premises | `prompts/core-premises.md` | The text the assistant runs under is correct and complete |
| Each work in the canon | `canon/canon.yaml` | The work belongs in the library |
| Each edition or translation | `canon/canon.yaml` (`editions`) | This specific edition may be quoted |
| Exclusions | `canon/excluded.yaml` | This edition stays out |
| Reference answers for sensitive questions | `evals/questions.yaml` | This is what a good answer looks like |
| The open questions | `docs/founding-spec.md` | A decision on each |

## Sensitive areas that always need sign-off

- **Halacha l'maaseh.** Anything that may guide what a person actually does.
- **Kiruv conversations.** Tone and approach with people new to observance.
- **Emotional crises and safety.** Grief, despair, abuse, and anything touching pikuach nefesh.
- **Personal status.** Jewish identity, conversion, and marriage.

Every test question marked `sensitivity: high` needs a reference answer the board has
approved before release.

## How a review works

The board does not need to use GitHub.

1. The maintainer sends the board a readable copy (a shared document or PDF) of the item under
   review, with any questions.
2. The board marks it up: approve, change, or reject, with a reason.
3. The maintainer makes the change in this repository and records the approval:
   - in the file itself (`status: approved`, `approved_by`, `approved_on`), and
   - as a line in `docs/approvals-log.md`.
4. `python3 tools/validate.py` confirms the files are consistent.

## Release checklist

Before each release, the maintainer confirms:

- [ ] The core premises in use match the last approved version.
- [ ] Every work in the retrieval index is approved and has an approved, license-cleared edition.
- [ ] All 30+ test questions were run, and the results were reviewed.
- [ ] Every `high` sensitivity question passed, compared against its approved reference answer.
- [ ] Any failure was fixed, or the board accepted it in writing.
- [ ] Crisis resources were checked and still work.

## Reviewing a sample answer

For each answer, the reviewer checks:

1. Is it true to the mesorah?
2. Are the sources real, quoted correctly, and from approved editions?
3. Where Orthodox views differ, are they all presented fairly and labeled?
4. For practical halacha, does it send the person to their rav, with enough guidance to ask well?
5. Is the tone warm and respectful, including toward people who hold other views?
6. Is anything missing that a rav would want said?
