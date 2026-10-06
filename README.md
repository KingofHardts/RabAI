# RabAI

A Torah learning assistant that answers from inside the Orthodox mesorah. It holds the
core premises of Orthodox Judaism as given, draws only on an approved library of sources,
presents disagreements within Orthodoxy honestly, and sends practical halachic questions to
a rav. For people who choose it, it also helps them build a stronger connection with HaShem.

**Status: founding spec, v0.1 draft.** Nothing here is approved yet. The canon, the core
premises, and the reference answers for sensitive questions all wait on the rabbinic board.

## What's in this repo

| Path | What it is |
|---|---|
| [`docs/founding-spec.md`](docs/founding-spec.md) | The four layers, the decisions behind them, and the open questions for the board |
| [`prompts/core-premises.md`](prompts/core-premises.md) | The core instructions the assistant runs under |
| [`canon/canon.yaml`](canon/canon.yaml) | The library: every work, tagged by author, era, stream, and edition |
| [`canon/excluded.yaml`](canon/excluded.yaml) | Editions and translations that stay out by default, and why |
| [`canon/vocabulary.yaml`](canon/vocabulary.yaml) | The allowed tag values |
| [`evals/questions.yaml`](evals/questions.yaml) | The test questions |
| [`docs/rabbinic-review.md`](docs/rabbinic-review.md) | How the board reviews and signs off |
| [`docs/approvals-log.md`](docs/approvals-log.md) | Every board decision, in order |
| [`docs/licensing.md`](docs/licensing.md) | What to check before any text goes into the library |
| [`docs/roadmap.md`](docs/roadmap.md) | Build phases, from spec to pilot |
| [`tools/validate.py`](tools/validate.py) | Checks the canon and test files, and prints the retrieval whitelist |

## The one rule that matters most

A work becomes searchable only when the board has approved it and its license has been
checked. `python3 tools/validate.py` prints the whitelist. Today it is empty, on purpose.

## Running the checks

```bash
pip install pyyaml
python3 tools/validate.py
```

CI runs the same check on every push.
