"""Where each word of a line is printed on it.

A line's words are known from the match (match.py); this finds where each one is printed. The
blobs of ink on the line are merged into runs; the gaps between runs are the spaces between words,
or gaps inside a word.

When Tesseract read the line's words (read.py), its word boxes tell which gaps are word spaces, and
the library's words are lined up with the printed ones by their letters. The library spells out what
the print abbreviates (the print's הקב״ה is "הקדוש ברוך הוא" in the library, א״ר is "אמר רבי", ר׳ is
"רבי"), and the print sometimes sets two words with no space between them, so several library words
can share one printed word: they share its place, each taking a part in proportion to its letters. A printed word the library doesn't have (a note's mark, a
reference) is left out.

Without Tesseract's words, the n-1 widest-fitting gaps are taken as the spaces: the choice that makes
each word about as wide as its letters would print, and leaves no wide gap inside a word.

When neither fits the words well, the line gets no word places and the app spreads its words evenly.

Pure Python, so the tests can run it without the scanning libraries.
"""

import math

# How wide each letter prints, roughly, in units of an ordinary letter (both scripts are close).
NARROW = {"י": 0.45, "ו": 0.45, "ן": 0.45, "ז": 0.55, "ג": 0.65, "נ": 0.65, "׳": 0.3, "״": 0.45,
          "'": 0.3, '"': 0.45, ":": 0.35, ".": 0.3, ",": 0.3, "(": 0.4, ")": 0.4, "-": 0.5, "־": 0.5}
WIDE = {"ש": 1.15, "ם": 1.05, "מ": 1.05, "ט": 1.05}
FINALS = str.maketrans("ךםןףץ", "כמנפצ")
SHORT_MARKS = "\"'״׳"  # the print marks every abbreviation and shortened word with one of these

MIN_SPACE = 0.12  # a word space is at least this many letter heights wide
MAYBE_SPACE = 0.25  # without a word box to go by, a gap this wide is always taken as a space
CLEAR_SPACE = 0.45  # a gap this wide (in letter heights) is a space even if Tesseract ran two words together
MOST_OFF = 2.0  # a word may print at most this many times wider or narrower than its letters say
WIDE_INSIDE = 0.45  # a gap this wide is not left inside a word
MOST_SHARED = 4  # the most library words one printed word (an abbreviation) can stand for
MEAN_COST = 0.45  # the most a line's words may differ from the printed ones, on average (0 to 1)
LEVEL = 0.2  # a short run whose top is this close (in letter heights) to the letters' tops is a letter


def letter_width(w):
    """A word's expected printed width, in ordinary letters."""
    total = 0.0
    for ch in w:
        if "֑" <= ch <= "ׇ":
            continue  # vowel points and cantillation take no width of their own
        if "א" <= ch <= "ת":
            total += WIDE.get(ch, NARROW.get(ch, 1.0))
        elif ch in NARROW:
            total += NARROW[ch]
    return total


def hebrew(w):
    """Letters only, final forms as regular ones."""
    return "".join(ch for ch in w if "א" <= ch <= "ת").translate(FINALS)


def ink_runs(blobs):
    """Merge blobs (x0, x1, height[, top]) into runs of ink [x0, x1, tallest, top], right to left.
    A run's top is its highest blob's top (None when the blobs don't say)."""
    runs = []
    for b in sorted(blobs, key=lambda s: -s[1]):
        x0, x1, h = b[:3]
        top = b[3] if len(b) > 3 else None
        if runs and x1 >= runs[-1][0]:
            r = runs[-1]
            r[0] = min(r[0], x0)
            r[2] = max(r[2], h)
            r[3] = None if top is None or r[3] is None else min(r[3], top)
        else:
            runs.append([x0, x1, h, top])
    return runs


def marks(runs, xh):
    """Which runs of ink are marks rather than letters: a colon or period, a note's asterisk or ring.

    A mark is narrow and short. So is a yud (and a geresh), but a yud hangs from the top of the
    line's letters, where a period or colon sits low and a note's mark is raised above them; so when
    the runs say where their tops are, a short run whose top is level with the letters' tops is a
    letter."""
    tops = sorted(r[3] for r in runs if r[3] is not None and 0.75 * xh <= r[2] <= 1.35 * xh)
    level = tops[len(tops) // 2] if tops else None
    out = []
    for r in runs:
        small = r[1] - r[0] < 0.5 * xh and r[2] < 0.8 * xh
        hangs = level is not None and r[3] is not None and abs(r[3] - level) <= LEVEL * xh
        out.append(small and not hangs)
    return out


def word_positions(blobs, words, xh, printed=None):
    """Each word's printed [x0, x1] (page pixels), right to left in reading order, or None.

    blobs: (x0, x1, height, top) of each blob of ink on the line (the top may be left out).
    words: the line's words in reading order.
    xh: the line's letter height. printed: Tesseract's words on the line, (text, x0, x1), if read.

    A small run of ink on its own (a colon or period set apart, the asterisk or ring that marks a
    note) joins the word beside it without counting as a gap inside that word, and is left out of
    the word's place."""
    # A "word" with no letters (the library's dash after a comment's opening words) isn't printed
    # as a word: it is placed in the space before the next word.
    kept = [k for k, w in enumerate(words) if hebrew(w)]
    runs = ink_runs(blobs)
    if not kept or not runs or xh <= 0:
        return None
    mark = marks(runs, xh)
    some = [words[k] for k in kept]
    found = (_aligned(runs, mark, some, xh, printed) if printed else None) or _by_gaps(runs, mark, some, xh)
    if found is None:
        return None
    at = dict(zip(kept, found))
    out = []
    for k in range(len(words)):
        if k in at:
            out.append(at[k])
            continue
        before = next((at[j] for j in range(k - 1, -1, -1) if j in at), None)
        after = next((at[j] for j in range(k + 1, len(words)) if j in at), None)
        x = after[1] if after else before[0]
        out.append([x, before[0] if before and after else x])
    return out


def _extent(runs, mark, a, b):
    """Where runs a to b (inclusive) print, leaving out marks at their ends."""
    while a < b and mark[a]:
        a += 1
    while b > a and mark[b]:
        b -= 1
    return [runs[b][0], runs[a][1]]


def _split(box, words):
    """One printed word's place shared by several library words, right to left, by their letters."""
    x0, x1 = box
    shares = [letter_width(w) or 1.0 for w in words]
    total = sum(shares)
    out, right = [], x1
    for s in shares:
        left = right - (x1 - x0) * s / total
        out.append([round(left), round(right)])
        right = left
    out[-1][0] = x0
    return out


# ---------------------------------------------------------------------------------------------
# With Tesseract's words


def similarity(a, b):
    """1 for the same letters, 0 for nothing alike (Levenshtein distance over the longer length)."""
    if not a or not b:
        return 0.0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return 1 - prev[-1] / max(len(a), len(b))


def within(a, b):
    """How well b, read from only part of a printed word, matches somewhere in a."""
    if len(b) >= len(a):
        return similarity(a, b)
    return max(similarity(a[i:i + len(b)], b) for i in range(len(a) - len(b) + 1))


def abbreviates(short, group):
    """Whether printed letters are a short form of these words: a start of each word, in order (הקבה
    is ה-ק of הקדוש, ב of ברוך, ה of הוא)."""
    seen = {}

    def fits(i, k):
        if (i, k) not in seen:
            if k == len(group):
                seen[(i, k)] = i == len(short)
            else:
                w = group[k]
                seen[(i, k)] = any(short[i:i + n] == w[:n] and fits(i + n, k + 1)
                                   for n in range(1, min(len(w), len(short) - i) + 1))
        return seen[(i, k)]

    return bool(short) and fits(0, 0)


def _chunks(runs, mark, xh, printed):
    """The printed words: runs of ink between word spaces, each with the letters Tesseract read there.
    A gap is a space when it is clearly wide, or when Tesseract put the ink on its two sides in
    different words."""
    # Of two word boxes that overlap, the wider is Tesseract's mistake (a box spanning several words):
    # trust only the others.
    def sane(i):
        _, a, b = printed[i]
        return b > a and not any(min(b, d) - max(a, c) > 0.3 * min(b - a, d - c) and b - a >= d - c
                                 for k, (_, c, d) in enumerate(printed) if k != i)

    good = [i for i in range(len(printed)) if sane(i)]

    def owner(r):
        best, k = 0.0, None
        for i in good:
            _, a, b = printed[i]
            o = min(r[1], b) - max(r[0], a)
            if o > best:
                best, k = o, i
        return k

    own = [owner(r) for r in runs]
    gaps = [(runs[j][0] - runs[j + 1][1]) / xh for j in range(len(runs) - 1)]
    # without a word box to go by, a gap well wider than this line's usual gap between letters is a
    # space (taking one too many only costs a word set across two pieces)
    usual = sorted(gaps)[len(gaps) // 2] if gaps else 0.0
    maybe = max(MIN_SPACE + 0.03, min(MAYBE_SPACE, 2.5 * usual))
    space = [False] * len(gaps)
    for j, gap in enumerate(gaps):
        if mark[j] or mark[j + 1]:
            continue
        if own[j] is None or own[j + 1] is None:
            space[j] = gap >= maybe
        else:
            space[j] = gap >= CLEAR_SPACE or (gap >= MIN_SPACE and own[j] != own[j + 1])
    # Marks between two letters (a period after a word, then the space before the next): the space
    # is the room between the letters, wherever the mark sits in it; it goes at the mark's wider
    # side, so the mark stays with the word it is set closer to. Marks at the line's end are set off
    # only by a clear space.
    m0 = 0
    while m0 < len(runs):
        if not mark[m0]:
            m0 += 1
            continue
        m1 = m0
        while m1 + 1 < len(runs) and mark[m1 + 1]:
            m1 += 1
        a, b = m0 - 1, m1 + 1  # the letters on each side, when there are any
        if a >= 0 and b < len(runs):
            room = sum(gaps[a:b])
            known = own[a] is not None and own[b] is not None
            if room >= CLEAR_SPACE or (known and own[a] != own[b] and room >= MIN_SPACE):
                space[max(range(a, b), key=lambda g: gaps[g])] = True
        elif a >= 0:
            space[a] = gaps[a] >= CLEAR_SPACE
        elif b < len(runs):
            space[m1] = gaps[m1] >= CLEAR_SPACE
        m0 = m1 + 1
    chunks, start = [], 0
    for j in range(len(gaps)):
        if space[j]:
            chunks.append((start, j))
            start = j + 1
    chunks.append((start, len(runs) - 1))
    # A word box that spans a space (Tesseract ran two printed words together) gives each of them
    # the letters that print over its ink there, in order.
    share = {}  # (chunk, box) -> that box's letters over that chunk
    for i in sorted({o for o in own if o is not None}):
        inks = [sum(runs[j][1] - runs[j][0] for j in range(a, b + 1) if own[j] == i) for a, b in chunks]
        held = [c for c, v in enumerate(inks) if v > 0]
        text = printed[i][0]
        if len(held) == 1:
            share[held[0], i] = text
            continue
        widths = [max(letter_width(ch), 0.3) for ch in text]
        total_ink, total_w = sum(inks), sum(widths) or 1.0
        ends, acc = [], 0.0
        for c in held:
            acc += inks[c] / total_ink
            ends.append(acc)
        pos = 0.0
        for ch, w in zip(text, widths):
            mid = (pos + w / 2) / total_w
            pos += w
            k = next((n for n, e in enumerate(ends) if mid <= e), len(held) - 1)
            share[held[k], i] = share.get((held[k], i), "") + ch
    out = []
    for c, (a, b) in enumerate(chunks):
        ids = []
        for j in range(a, b + 1):
            if own[j] is not None and own[j] not in ids:
                ids.append(own[j])
        raw = "".join(share.get((c, i), "") for i in ids)
        text = hebrew(raw)
        box = _extent(runs, mark, a, b)
        read = sum(runs[j][1] - runs[j][0] for j in range(a, b + 1) if own[j] is not None)
        ink = sum(runs[j][1] - runs[j][0] for j in range(a, b + 1))
        out.append({"text": text, "box": box, "short": any(ch in SHORT_MARKS for ch in raw),
                    "part": read < 0.75 * ink,  # Tesseract read only some of it
                    "small": all(mark[a:b + 1]) or (len(text) <= 1 and box[1] - box[0] < 1.2 * xh)})
    return out


def _aligned(runs, mark, words, xh, printed):
    """Line the library's words up with the printed words by their letters."""
    chunks = _chunks(runs, mark, xh, printed)
    lib = [hebrew(w) for w in words]
    n, m = len(lib), len(chunks)
    # how wide a letter prints on this line, for the printed words Tesseract couldn't read
    seen = sorted((c["box"][1] - c["box"][0]) / letter_width(c["text"]) for c in chunks if len(c["text"]) >= 2)
    unit = seen[len(seen) // 2] if seen else sum(c["box"][1] - c["box"][0] for c in chunks) / max(1.0, sum(letter_width(w) for w in words))

    def by_width(group, box):
        """For a printed word with no reading: how far its width is from these words'."""
        want = sum(letter_width(w) for w in group) * unit + (len(group) - 1) * 0.4 * xh
        return 0.25 + min(0.75, abs(math.log(max(1.0, box[1] - box[0]) / max(1.0, want))))

    def by_text(letters, chunk, group):
        """How far these letters are from a printed word's reading (and, when only some of it was
        read, from its width too)."""
        t = chunk["text"]
        if not chunk["part"]:
            return 1 - similarity(letters, t)
        return 0.5 * (1 - within(letters, t)) + 0.5 * by_width(group, chunk["box"])

    INF = math.inf
    best = [[INF] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]
    best[0][0] = 0.0
    for i in range(n + 1):
        for j in range(m + 1):
            c0 = best[i][j]
            if c0 == INF:
                continue

            def step(i2, j2, cost, how):
                if c0 + cost < best[i2][j2]:
                    best[i2][j2] = c0 + cost
                    back[i2][j2] = (i, j, how)

            if j < m:  # a printed word the library doesn't have
                step(i, j + 1, 0.15 if chunks[j]["small"] else 0.6, "skip")
            if i < n:  # a library word not found in print
                step(i + 1, j, 1.2, "lost")
            if i < n and j < m:
                t, short, box = chunks[j]["text"], chunks[j]["short"], chunks[j]["box"]
                if t:
                    c = by_text(lib[i], chunks[j], words[i:i + 1])
                    if short and lib[i].startswith(t) and len(t) < len(lib[i]):
                        c = min(c, 0.15)  # a word cut short: ר׳ for רבי, וגו׳ for וגומר
                else:
                    c = by_width(words[i:i + 1], box)
                step(i + 1, j + 1, c, "one")
                for g in range(2, MOST_SHARED + 1):
                    if i + g > n:
                        break
                    group = lib[i:i + g]
                    if t:
                        # the words printed with no space between them
                        c = by_text("".join(group), chunks[j], words[i:i + g]) + 0.1 * (g - 1)
                        if short:  # or an abbreviation of them
                            c = min(c, 0.1 * (g - 1) if abbreviates(t, group)
                                    else 1 - similarity("".join(w[0] for w in group), t) + 0.25 * (g - 1))
                    else:
                        c = by_width(words[i:i + g], box) + 0.1 * (g - 1)
                    step(i + g, j + 1, c, ("shared", g))
                if j + 1 < m:
                    t2 = t + chunks[j + 1]["text"]
                    c = 1 - similarity(lib[i], t2) if t2 else by_width(words[i:i + 1], [chunks[j + 1]["box"][0], box[1]])
                    step(i + 1, j + 2, c + 0.3, "two")
    if best[n][m] == INF or best[n][m] / n > MEAN_COST:
        return None
    out = [None] * n
    i, j = n, m
    while (i, j) != (0, 0):
        pi, pj, how = back[i][j]
        if how == "lost":
            return None
        if how == "one":
            out[pi] = chunks[pj]["box"]
        elif how == "two":
            out[pi] = [chunks[pj + 1]["box"][0], chunks[pj]["box"][1]]
        elif how != "skip":
            for k, box in enumerate(_split(chunks[pj]["box"], words[pi:i])):
                out[pi + k] = box
        i, j = pi, pj
    return [list(b) for b in out]


# ---------------------------------------------------------------------------------------------
# From the gaps alone


def _by_gaps(runs, mark, words, xh):
    n = len(words)
    want = [letter_width(w) for w in words]
    m = len(runs) - 1  # gaps; gap j lies between run j (right) and run j + 1 (left)
    if m < n - 1:
        return None
    gap = [(runs[j][0] - runs[j + 1][1]) / xh for j in range(m)]
    if n == 1:
        return [_extent(runs, mark, 0, m)]
    spaces = sorted(gap, reverse=True)[:n - 1]  # the widest gaps, for a first idea of the letters' width
    unit = (runs[0][1] - runs[-1][0] - sum(spaces) * xh) / sum(want)
    if unit <= 0:
        return None

    def width_cost(k, a, b):
        x0, x1 = _extent(runs, mark, a, b)
        r = (x1 - x0) / (want[k] * unit)
        return math.log(r) ** 2 if r > 0 else math.inf

    def inside(a, b):
        """The gaps a word from run a to run b would hold, beside no mark."""
        return [gap[j] for j in range(a, b) if not (mark[j] or mark[j + 1])]

    # the cost of the gaps inside a word from run a to run b is held[b] - held[a]
    held = [0.0]
    for j in range(m):
        held.append(held[-1] + (0.0 if mark[j] or mark[j + 1] else max(0.0, gap[j] - 0.1) ** 2 * 6))
    # a word holds at most about as many runs of ink as letters, and a few marks
    reach = [int(2 * want[k]) + 6 for k in range(n)]

    INF = math.inf
    # best[k][j]: words 0..k placed, word k ending at run j (so gap j is a word space, or j == m).
    best = [[INF] * (m + 1) for _ in range(n)]
    back = [[-1] * (m + 1) for _ in range(n)]
    for j in range(min(m + 1, reach[0])):
        best[0][j] = width_cost(0, 0, j) + held[j]
    for k in range(1, n):
        for j in range(k, m + 1):
            for i in range(max(k - 1, j - reach[k]), j):
                if best[k - 1][i] == INF or gap[i] < MIN_SPACE:
                    continue
                c = best[k - 1][i] + width_cost(k, i + 1, j) + held[j] - held[i + 1]
                if c < best[k][j]:
                    best[k][j] = c
                    back[k][j] = i
    if best[n - 1][m] == INF:
        return None
    ends = [m]
    for k in range(n - 1, 0, -1):
        ends.append(back[k][ends[-1]])
    ends = ends[::-1]  # ends[k]: the last run of word k
    out, start = [], 0
    for k, e in enumerate(ends):
        x0, x1 = _extent(runs, mark, start, e)
        if not (1 / MOST_OFF <= (x1 - x0) / (want[k] * unit) <= MOST_OFF):
            return None
        if any(g > WIDE_INSIDE for g in inside(start, e)):
            return None
        out.append([x0, x1])
        start = e + 1
    return out
