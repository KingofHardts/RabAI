# Translation inbox

Sealed batches of RabAI's own translations, made inside a Claude Code session
(`web/scripts/translate-here.ts`), on their way to RabAI's translation library.

Each `.sealed` file can be opened only by the "RabAI's translation inbox" workflow
(`.github/workflows/translations-inbox.yml`), whose private key stays in the translation library's
own database. The workflow checks every translation against the testing library's text, keeps it,
and removes the file. `public-key.pem` is the key used to seal files; the workflow writes it the
first time it runs.

Every translation here is RabAI's own and is labeled in the app as not yet reviewed by the
rabbinic board.
