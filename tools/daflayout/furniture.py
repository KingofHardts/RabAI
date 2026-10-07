"""The page's own heading: the line above the text that names the chapter and the tractate.

Every amud of the Vilna Shas opens with one line in large square letters: the chapter's name, the
word פרק and the chapter's number in words, and the tractate's name. Amud a also has the daf's
number in Hebrew letters at its left; amud b has the page's number in figures at its right (twice
the daf). For example, Berakhot 27a reads, right to left:

    תפלת השחר   פרק   רביעי   ברכות            כז

The words themselves are known (the chapter names are Sefaria's; see `expected`); what the scan
gives is where each one is printed. The heading's letters are found above the text, grouped into
words by the gaps between them, read with Tesseract, and lined up with the words expected. A
heading that doesn't line up well is left out rather than guessed.
"""

from rapidfuzz.distance import Indel

ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"]
TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"]
HUNDREDS = ["", "ק", "ר", "ש", "ת"]

# The chapter's number in words, as the heading spells it (the first spelling is the usual one).
ORDINALS = {
    1: ["ראשון"], 2: ["שני"], 3: ["שלישי"], 4: ["רביעי"], 5: ["חמישי"], 6: ["ששי", "שישי"],
    7: ["שביעי"], 8: ["שמיני"], 9: ["תשיעי"], 10: ["עשירי"],
    11: ["אחד עשר"], 12: ["שנים עשר"], 13: ["שלשה עשר", "שלושה עשר"], 14: ["ארבעה עשר"],
    15: ["חמשה עשר"], 16: ["ששה עשר"], 17: ["שבעה עשר"], 18: ["שמונה עשר"], 19: ["תשעה עשר"],
    20: ["עשרים"], 21: ["עשרים ואחד"], 22: ["עשרים ושנים"], 23: ["עשרים ושלשה"], 24: ["עשרים וארבעה"],
}

FINALS = str.maketrans("ךםןףץ", "כמנפצ")

TALL = 1.25        # the heading's letters are at least this many times the Gemara's letter height
MAX_TALL = 3.0     # and at most this (bigger ink above the text is an ornament or a frame)
ROW_MIN = 6        # the fewest letters a heading has
WORD_GAP = 0.35    # a gap wider than this (times the heading's letter height) is between two words
APART = 3.0      # the number stands at least this far (times the letter height) from the words
GOOD = 0.5         # how alike a word must read to the word expected, at least, to count as found
SKIP_INK = 0.8     # the cost of ink matched to no word
SKIP_WORD = 1.0    # the cost of a word expected but not found


def hebrew_number(n):
    """A number in Hebrew letters, as a daf is numbered: 27 -> כז, 15 -> טו, 16 -> טז."""
    out = ""
    while n >= 400:
        out += "ת"
        n -= 400
    out += HUNDREDS[n // 100]
    n %= 100
    if n == 15:
        return out + "טו"
    if n == 16:
        return out + "טז"
    return out + TENS[n // 10] + ONES[n % 10]


def expected(tractate_he, chapters, daf, amud):
    """The headings this amud can have: one for each chapter printed on it (the heading names the one
    the amud starts in, but the first may end at its top). Each is (words, number): the words in
    reading order, each a list of spellings, and the number printed beside them."""
    out = []
    for n, name in chapters:
        if n not in ORDINALS:
            continue
        words = [[w] for w in name.split()] + [["פרק"]]
        spellings = [s.split() for s in ORDINALS[n]]
        if all(len(s) == len(spellings[0]) for s in spellings):
            words += [[s[i] for s in spellings] for i in range(len(spellings[0]))]
        else:
            words += [[w] for w in spellings[0]]
        words += [[w] for w in tractate_he.split()]
        out.append((words, hebrew_number(daf) if amud == "a" else str(2 * daf)))
    return out


def letters(text):
    return "".join(ch for ch in text if "א" <= ch <= "ת").translate(FINALS)


def alike(read, word):
    a, b = letters(read), letters(word)
    if not a or not b:
        return 0.0
    return Indel.normalized_similarity(a, b)


# ---------------------------------------------------------------------------------------------
# Finding the heading's ink


def heading_row(comps, top, xh):
    """The heading's letters: the row of the tallest blobs above the text (top). Returns the row's
    blobs and its letter height, or ([], 0)."""
    tall = [c for c in comps if c[4] >= 12 and TALL * xh <= c[3] - c[1] <= MAX_TALL * xh and (c[1] + c[3]) / 2 < top]
    if len(tall) < ROW_MIN:
        return [], 0.0
    tall.sort(key=lambda c: (c[1] + c[3]) / 2)
    rows, cur = [], [tall[0]]
    for c in tall[1:]:
        if (c[1] + c[3]) / 2 - (cur[-1][1] + cur[-1][3]) / 2 > 0.4 * (c[3] - c[1]):
            rows.append(cur)
            cur = [c]
        else:
            cur.append(c)
    rows.append(cur)
    # The heading's letters are the tallest print above the text (a commentary's first line can have a
    # few tall letters too, and more of them).
    rows = [r for r in rows if len(r) >= ROW_MIN]
    if not rows:
        return [], 0.0
    height = lambda r: sorted(c[3] - c[1] for c in r)[len(r) // 2]  # noqa: E731
    row = max(rows, key=lambda r: (height(r), len(r)))
    return row, float(height(row))


def words_in(blobs, gap):
    """Blobs grouped into printed words, right to left: a word ends where a gap wider than `gap` is."""
    words = []
    for c in sorted(blobs, key=lambda c: -c[2]):
        if words and min(b[0] for b in words[-1]) - c[2] < gap:
            words[-1].append(c)
        else:
            words.append([c])
    return words


def box_of(blobs):
    return (min(c[0] for c in blobs), min(c[1] for c in blobs), max(c[2] for c in blobs), max(c[3] for c in blobs))


def split_at_gaps(blobs, k):
    """A group of blobs cut into k words at its k-1 widest gaps (right to left)."""
    cs = sorted(blobs, key=lambda c: -c[2])
    gaps = []
    left = cs[0][0]
    for i in range(1, len(cs)):
        gaps.append((left - cs[i][2], i))
        left = min(left, cs[i][0])
    cuts = sorted(i for _, i in sorted(gaps, reverse=True)[: k - 1])
    out, at = [], 0
    for i in cuts + [len(cs)]:
        out.append(cs[at:i])
        at = i
    return [p for p in out if p]


# ---------------------------------------------------------------------------------------------
# Lining up what was read with what is expected


def line_up(reads, words):
    """The best way to give the printed words (reads, right to left) the expected words: each printed
    word is one expected word, two printed words are one (a word broken by a wide gap), one printed
    word is two (two words printed close together), or a printed word or an expected word goes
    unmatched. Returns (cost, steps), steps as (kind, read index, word index, spelling)."""
    m, n = len(reads), len(words)
    INF = float("inf")
    best = [[(INF, None)] * (n + 1) for _ in range(m + 1)]
    best[0][0] = (0.0, None)

    def sim(text, j, take=1):
        if take == 1:
            return max((alike(text, s), s) for s in words[j])
        both = [a + " " + b for a in words[j] for b in words[j + 1]]
        return max((alike(text, s), s) for s in both)

    for i in range(m + 1):
        for j in range(n + 1):
            cost, _ = best[i][j]
            if cost == INF:
                continue

            def go(i2, j2, c, step):
                if c < best[i2][j2][0]:
                    best[i2][j2] = (c, step)

            if i < m:
                go(i + 1, j, cost + SKIP_INK, ("ink", i, None, None))
            if j < n:
                go(i, j + 1, cost + SKIP_WORD, ("missing", None, j, None))
            if i < m and j < n:
                s, sp = sim(reads[i], j)
                go(i + 1, j + 1, cost + 1 - s, ("one", i, j, sp))
            if i + 1 < m and j < n:
                s, sp = sim(reads[i] + reads[i + 1], j)
                go(i + 2, j + 1, cost + 1.05 - s, ("joined", i, j, sp))
            if i < m and j + 1 < n:
                s, sp = sim(reads[i], j, take=2)
                go(i + 1, j + 2, cost + 1.05 - s, ("split", i, j, sp))
    steps, i, j = [], m, n
    while (i, j) != (0, 0):
        cost, step = best[i][j]
        steps.append(step)
        kind = step[0]
        i -= {"ink": 1, "missing": 0, "one": 1, "joined": 2, "split": 1}[kind]
        j -= {"ink": 0, "missing": 1, "one": 1, "joined": 1, "split": 2}[kind]
    return best[m][n][0], steps[::-1]


def find_heading(comps, top, xh, choices, read, amud):
    """The heading's words on the page: [[text, left, top, right, bottom], ...] right to left, or []
    when the scan's heading doesn't line up with one of the expected headings (choices, from
    `expected`). comps: the page's blobs (x0, y0, x1, y1, area, label) above the text's top; xh: the
    Gemara's letter height; read(blobs) reads a printed word with Tesseract."""
    row, hh = heading_row(comps, top, xh)
    if not row:
        return []
    y0 = sorted(c[1] for c in row)[len(row) // 2]
    y1 = sorted(c[3] for c in row)[len(row) // 2]
    # Everything printed in the row: the tall letters, and the parts of letters, dots and figures
    # beside them (a ק's leg, a page number's smaller figures).
    band = [c for c in comps if c[4] >= 3 and c[1] < y1 + 0.3 * hh and c[3] > y0 - 0.3 * hh and (c[1] + c[3]) / 2 < top]
    groups = words_in(band, WORD_GAP * hh)
    tall_ids = {c[5] for c in row}

    # The figures on amud b, or the Hebrew number on amud a, stand apart from the words: find the run
    # of word groups (tall ones, close together) and what stands beside it.
    tall_groups = [g for g in groups if sum(c[5] in tall_ids for c in g) >= 1 and max(c[3] - c[1] for c in g) >= 0.8 * hh]
    if not tall_groups:
        return []
    runs, cur = [], [tall_groups[0]]
    for g in tall_groups[1:]:
        if min(c[0] for c in cur[-1]) - max(c[2] for c in g) > APART * hh:
            runs.append(cur)
            cur = [g]
        else:
            cur.append(g)
    runs.append(cur)
    words_run = max(runs, key=lambda r: sum(len(g) for g in r))
    right_edge = max(c[2] for g in words_run for c in g)
    left_edge = min(c[0] for g in words_run for c in g)
    reads = [read(g) for g in words_run]

    best = None
    for words, number in choices:
        cost, steps = line_up(reads, words)
        found = [s for s in steps if s[0] != "ink" and s[0] != "missing"]
        quality = [alike(reads[s[1]] if s[0] != "joined" else reads[s[1]] + reads[s[1] + 1], s[3]) for s in found]
        if best is None or cost < best[0]:
            best = (cost, steps, words, number, quality)
    cost, steps, words, number, quality = best
    found_words = sum(1 if s[0] in ("one", "joined") else 2 for s in steps if s[0] in ("one", "joined", "split"))
    stray = sum(1 for s in steps if s[0] == "ink")
    if found_words < len(words) - 1 or stray > 1 or not quality or sum(quality) / len(quality) < GOOD:
        return []

    out = []
    for kind, i, j, spelling in steps:
        if kind == "one":
            out.append([spelling, *box_of(words_run[i])])
        elif kind == "joined":
            out.append([spelling, *box_of(words_run[i] + words_run[i + 1])])
        elif kind == "split":
            for text, part in zip(spelling.split(" ", 1), split_at_gaps(words_run[i], 2)):
                out.append([text, *box_of(part)])
    # Every word sits on the row's letter line (the ascenders and descenders of a few letters aside).
    out = [[t, x0, y0, x1, y1] for t, x0, _, x1, _ in out]

    # The number: on amud a, the Hebrew number left of the words (its letters hang from the heading's
    # top, though a yud is short); on amud b, the figures right of them, smaller than the letters. Only
    # the group nearest the words is taken, and only when it is as wide as the number would print.
    def fits(g):
        b = box_of(g)
        marks = sum(1 for c in g if c[3] - c[1] >= 0.4 * hh)
        return 0.2 * len(number) * hh <= b[2] - b[0] <= 1.2 * len(number) * hh and marks <= 2 * len(number)

    # (specks of dirt aside)
    groups = [g for g in groups if max(c[3] - c[1] for c in g) >= 0.3 * hh]
    if amud == "a":
        # its letters hang from the heading's top (a lamed reaches above it)
        left = [g for g in groups if max(c[2] for c in g) < left_edge - APART * hh and max(c[3] - c[1] for c in g) >= 0.5 * hh
                and y0 - 0.5 * hh <= min(c[1] for c in g) <= y0 + 0.3 * hh]
        if left:
            g = max(left, key=lambda g: max(c[2] for c in g))
            if fits(g):
                b = box_of(g)
                out.append([number, b[0], y0, b[2], y1])
    else:
        right = [g for g in groups if min(c[0] for c in g) > right_edge + APART * hh]
        if right:
            g = min(right, key=lambda g: min(c[0] for c in g))
            if 0.5 * hh <= max(c[3] - c[1] for c in g) <= 0.95 * hh and fits(g):
                out.insert(0, [number, *box_of(g)])
    return out
