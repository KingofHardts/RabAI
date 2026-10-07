# Printed-page layouts (`tools/daf_layout.py`)

The app's Gemara page shows each amud line for line as the Vilna Shas prints it, so a word found on
a line of a printed Gemara is in the same place in RabAI. The library has the words of the Gemara,
Rashi and Tosafot, but not where the printed lines break. This tool reads that from scans of the
Romm Vilna printing.

## What it does

For each amud of the Bavli:

1. Downloads Sefaria's scan of the Romm Vilna page (1880-86, public domain) from
   `https://storage.googleapis.com/manuscripts.sefaria.org/vilna-romm/`. Niddah has no scans there.
2. Finds the printed lines and which column each belongs to (`scan.py`).
3. Reads each line twice with Tesseract: once with the Hebrew model for the square letters of the
   Gemara, once with a Rashi-script model for the commentaries (`read.py`). A label printed at the
   end of a commentary's line (תורה אור, where those notes begin beside it) is taken out of the line
   and kept with its place, so the line is matched to its own words (`furniture.py`).
4. Matches every line to the words it holds in the library's Gemara, Rashi and Tosafot, and where
   each line's words begin and end (`match.py`). The reading only has to be close: it is used to
   find the library's words, never shown.
5. Finds where each of a line's words is printed on it (`words.py`). The line's ink is split into
   printed words at the spaces, using Tesseract's word boxes to tell a space from a wide gap inside a
   word. A small mark (a period, a colon, a note's asterisk) goes with the word it is set closer to;
   a yud is as small as a period, but it hangs from the top of the letters, so it is kept as a
   letter. The library's words are then lined up with the printed words by their letters. Where the
   print abbreviates (הקב״ה for "הקדוש ברוך הוא") or sets two words with no space between them, the
   library's words share the printed word's place. Where Tesseract read two printed words as one,
   they are split at the gap that fits them best. A printed word the library doesn't have (a note's
   mark) is left out.

   Where the print abbreviates or cuts a word short and the library spells it out (ק״ש for "קריאת
   שמע", ואב״א for "ואיבעית אימא", ר׳ for "רבי"), the short form is kept, so the app can show it
   as printed. It is kept only when the scan settles it: its letters are exactly what Tesseract
   read there and are the library's own (each word's first letter, then more of its letters in
   order; a cut word is its start), the mark is where the print puts it (״ before the last letter,
   ׳ at the end), the printed word is about as wide as the short form rather than the full words,
   and, for a cut word, the ink shows a ׳ (a small mark hanging from the top of the letters) or the
   printed word is far too narrow for the whole word, since Tesseract sometimes reads a last ר as a
   ׳. A short form Tesseract ran together with a whole word (א״ר יוסי read as one) is split from it
   at their gap. Anything else is left as the library spells it. When the words don't line up well, the line gets no word places and the app
   spreads its words evenly across the printed line. A word whose letters are mostly much taller
   than its line's (a commentary's first words, the word that opens a Mishnah or a chapter) has its
   letters' height kept too, so the app draws it at its printed size. The marks set above the text
   that point to a note (an asterisk, a small ring) are found by their shape, kept with their
   places, and taken out of the words' places (`furniture.py`); a small reference letter or a geresh
   is not named this way, and is left out.
6. Places each word once across the whole tractate, because a comment can start on one amud and end
   on the next (`reconcile` in `daf_layout.py`).
7. Finds the page's heading, the line above the text that names the chapter and the tractate, with
   the daf's number in Hebrew letters (amud a) or the page's number in figures (amud b)
   (`furniture.py`). The words are known: the chapter names come from Sefaria's index of the
   tractate (`alts`, "Chapters"). The scan only says where each one is printed: the heading's large
   letters are grouped into words, read with Tesseract, and lined up with the words expected. A
   heading that doesn't line up is left out rather than guessed.

What is kept, per amud, is each line's box on the page, its letters' height, the library words it
holds (passage ref and word numbers) and, when found, where each of them is printed on the line and
which of them the print sets as a short form, plus a check of each passage's words, and the
heading's words, the labels and the note marks with their places. The scans themselves are
never committed, stored, or shown. The app shows the printed layout only for an amud where every
word of its Gemara, Rashi and Tosafot was placed ("placed_all"); otherwise it falls back to its
flowing layout. An amud is "complete" when, in addition, no word was placed by estimate.

Three kinds of uncertain words are placed but marked "estimated" (the app underlines them with dots
and says so):

- a word two lines both claimed, kept on the line that read it better;
- a run of at most six words no line claimed, put on the line of the word before it, or of the word
  after it when that line is less full;
- every word on a line that reads too little like the words matched to it.

Such an amud is "placed_all" but not "complete". Longer unplaced runs leave the amud on the flowing
layout.

The layouts go in the testing library, table `daf_layout` (`tools/library_schema.sql`). They are not
built from Sefaria's text, so `tools/library_upload.py` copies them from the old library when the
library is rebuilt. If a passage's words change in a rebuild, its check no longer matches and the app
ignores that amud's layout until it is made again.

## Running it

In GitHub Actions: "Make the printed-page layouts" (`.github/workflows/daf-layout.yml`), run by hand.
It splits the Shas into shards that run side by side, and writes to the library on Turso.

Locally, against a built library file:

```
python3 tools/daf_layout.py --db library/rabai-library.db --tractate Berakhot \
    --out layouts.jsonl --store --cache ~/.cache/rabai-vilna
```

An amud that takes more than five minutes is stopped and reported as failed, so one bad scan can't
hold up a run. `--pages 2a,2b` limits a run to some amudim, for testing. Use the system Python on Ubuntu 24.04 with
these packages:

```
sudo apt-get install tesseract-ocr tesseract-ocr-heb python3-tesserocr \
    python3-numpy python3-scipy python3-pil python3-rapidfuzz
```

Then make a folder with both models and point `TESSDATA` at it:

- `heb.traineddata` from `/usr/share/tesseract-ocr/5/tessdata/` (the `tesseract-ocr-heb` package).
- `heb_rashi.traineddata`, the Rashi-script model from the KleiKodesh project (Apache License 2.0):
  `https://raw.githubusercontent.com/KleiKodesh/kleikodeshproject/493d1d59a2e07b422edcce1af1a6c7429945c2b8/KitveiHakodesh/vue-frontend/public/tesseract/heb_rashi.traineddata`,
  sha256 `c3bdf2c4188e037838e027de419e6e8ca663f1168fef3d09df1a3a46afab6c50`.
  The model is downloaded when the tool runs and never committed.

Tests: `python3 -m unittest discover -s tools/daflayout/tests` (they need no scans or models).
