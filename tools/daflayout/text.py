"""The library's words as the app shows them, so word numbers here match the page view's.

The app (web/lib/library/daf.ts plainText, web/components/DafPage.tsx) cleans a passage of markup
and splits it on JavaScript's whitespace; these functions do exactly the same.
"""

import re

# JavaScript's \s, which is not quite Python's.
JS_SPACE_CHARS = ("\t\n\v\f\r \u00a0\u1680" + "".join(chr(c) for c in range(0x2000, 0x200B))
                  + "\u2028\u2029\u202f\u205f\u3000\ufeff")
_SPACES = re.compile("[" + re.escape(JS_SPACE_CHARS) + "]+")
FINALS = str.maketrans("ךםןףץ", "כמנפצ")


def plain_text(t):
    """Mirrors plainText in web/lib/library/daf.ts."""
    t = re.sub(r"<br\s*/?>", " ", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace("&nbsp;", " ").replace("&amp;", "&")
    return _SPACES.sub(" ", t).strip(JS_SPACE_CHARS)


def words_of(text):
    """Mirrors wordsOf in web/components/DafPage.tsx: split on whitespace, drop empty pieces."""
    return [w for w in _SPACES.split(text) if w]


def letters(s):
    """Hebrew letters only, with final forms as regular ones: what a reading is compared on."""
    return re.sub(r"[^א-ת]", "", s).translate(FINALS)


def fingerprint(words):
    """A short check of a passage's words (FNV-1a, 32 bits, over the UTF-8 of the words joined by
    one space). The app computes the same; when they differ, the library's text has changed since
    the layout was made and the layout's word numbers can't be trusted for that passage."""
    h = 0x811C9DC5
    for b in " ".join(words).encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"
