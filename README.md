# RabAI

A Torah learning assistant that answers from inside the Orthodox mesorah. It holds the
core premises of Orthodox Judaism as given, draws only on an approved library of sources,
presents disagreements within Orthodoxy honestly, and sends practical halachic questions to
a rav. For people who choose it, it also helps them build a stronger connection with HaShem.

**Status: founding spec, v0.1 draft, plus a first development build of the app in
[`web/`](web/README.md).** Nothing here is approved yet. The canon, the core
premises, and the reference answers for sensitive questions all wait on the rabbinic board.

## What's in this repo

| Path | What it is |
|---|---|
| [`docs/app-vision.md`](docs/app-vision.md) | The app: how it should feel, what people can do, and the first version |
| [`docs/founding-spec.md`](docs/founding-spec.md) | The four layers, the decisions behind them, and the open questions for the board |
| [`prompts/core-premises.md`](prompts/core-premises.md) | The core instructions the assistant runs under |
| [`canon/canon.yaml`](canon/canon.yaml) | The library: every work, tagged by author, era, stream, and edition |
| [`canon/excluded.yaml`](canon/excluded.yaml) | Editions and translations that stay out by default, and why |
| [`canon/vocabulary.yaml`](canon/vocabulary.yaml) | The allowed tag values |
| [`evals/questions.yaml`](evals/questions.yaml) | The test questions |
| [`docs/rabbinic-review.md`](docs/rabbinic-review.md) | How the board reviews and signs off |
| [`docs/approvals-log.md`](docs/approvals-log.md) | Every board decision, in order |
| [`docs/library-growth.md`](docs/library-growth.md) | What the library is missing, and six ways to get more authentic sources |
| [`canon/partners.yaml`](canon/partners.yaml) | Organizations and publishers to approach, and where each conversation stands |
| [`docs/licensing.md`](docs/licensing.md) | What to check before any text goes into the library |
| [`docs/roadmap.md`](docs/roadmap.md) | Build phases, from spec to pilot |
| [`web/`](web/README.md) | The app itself (a development build): ask, read the sources, ask about any line |
| [`prototype/mockup.html`](prototype/mockup.html) | A clickable mockup of the app (sample content only). Open it in a browser. |
| [`tools/validate.py`](tools/validate.py) | Checks the canon and test files, and prints the retrieval whitelist |

## The one rule that matters most

A work becomes searchable only when the board has approved it and its license has been
checked. `python3 tools/validate.py` prints the whitelist. Today it is empty, on purpose.

## Running the checks

```bash
pip install pyyaml
python3 tools/validate.py
```

CI runs the same check on every push, plus the app's tests and build (see
[`web/README.md`](web/README.md)).
