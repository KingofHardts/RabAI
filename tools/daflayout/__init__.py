"""Where each word of an amud sits on the printed Vilna page.

The library has the words of the Gemara, Rashi and Tosafot but not where the printed page breaks
their lines. This package reads that from a scan of the Romm Vilna printing (1880-86, public
domain): it finds the columns and lines on the scan (scan.py), reads each line with Tesseract
(read.py), and matches every printed line to the words it holds in the library's text (match.py).

The scan itself is never kept or shown. What comes out is, for each printed line, its box on the
page and the library words it holds, by passage and word number.
"""
