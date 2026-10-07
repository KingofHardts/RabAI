"""Matching each printed line to the library's words.

For each text on the page (the Gemara, Rashi, Tosafot), every line's reading is placed in that
text's letters, and the lines are chained down the page in the order the text runs. Then each run
of lines is split at the word boundaries that make every line read best.

The Gemara in the library is divided exactly as the printed pages are, so a page's Gemara is its
own amud. A comment can start on one page and finish on the next, so Rashi and Tosafot are
matched against the end of the previous amud's and the start of the next amud's comments as well.
"""

import numpy as np
from rapidfuzz import fuzz
from rapidfuzz.distance import Indel

from .align import candidates, prefix_costs
from .text import letters, words_of
from .words import word_positions

PARTS = ("main", "rashi", "tosafot")
READING = {"main": "heb", "rashi": "heb_rashi", "tosafot": "heb_rashi"}
CONTEXT_WORDS = 120  # words of a neighboring amud's comments that may be printed on this page
LONGEST_OVERFLOW = 700  # the most of the previous amud's last comment that may run on to this page


class Stream:
    """One text's letters, from the end of the previous amud through the start of the next, with the
    word (passage ref, word number) each letter belongs to."""

    def __init__(self, prev, cur, nxt, dup=None):
        """dup: words the library has twice (dups.twins); passing over them costs nothing."""
        words = []
        for where, pieces in (("prev", prev), ("cur", cur), ("next", nxt)):
            ws = [(p["ref"], wi, w) for p in pieces for wi, w in enumerate(words_of(p["he"]))]
            if where == "prev":
                # The previous amud's last comment can run on to this page whole, however long it is.
                last = len(ws) - len(words_of(pieces[-1]["he"])) if pieces else 0
                ws = ws[max(0, len(ws) - LONGEST_OVERFLOW, min(last, len(ws) - CONTEXT_WORDS)):]
            if where == "next":
                ws = ws[:CONTEXT_WORDS]
            words += [(r, wi, w, where) for (r, wi, w) in ws]
        self.words = words
        chars, owner = [], []
        for k, (_, _, w, _) in enumerate(words):
            for ch in letters(w):
                chars.append(ch)
                owner.append(k)
        self.text = "".join(chars)
        self.owner = np.array(owner, dtype=int)
        dup = dup or {}
        counted = np.array([0 if (words[k][0], words[k][1]) in dup else 1 for k in owner], dtype=np.int64)
        self.counted = np.concatenate([[0], np.cumsum(counted)])  # letters that cost when skipped, up to each point

    def skipped(self, a, b):
        """How many letters between a and b cost something to pass over."""
        if b <= a:
            return 0
        a, b = max(0, a), min(len(self.text), b)
        return int(self.counted[b] - self.counted[a]) if b > a else 0

    def word_starts(self):
        o = self.owner
        return np.concatenate([[0], np.where(np.diff(o) != 0)[0] + 1, [len(o)]]) if len(o) else np.array([0])

    def word_at_letter(self, p):
        return int(self.owner[p]) if p < len(self.text) else len(self.words)


# ---------------------------------------------------------------------------------------------
# Pieces and where they could go


def pieces_of(lines):
    """The page's line pieces, numbered by printed row and read right to left within a row."""
    out = []
    for i, l in enumerate(lines):
        b = tuple(int(v) for v in l["box"])
        # the line's middle is where its letters are centred; a tall mark can stretch its box
        out.append({"i": i, "box": b, "core": tuple(int(v) for v in l.get("core", b)), "xh": l["xh"], "cy": float(l.get("cy", (b[1] + b[3]) / 2)),
                    "key": tuple(l.get("key", (i, i))),
                    "read": {m: letters(l["ocr"][m][0]) for m in ("heb", "heb_rashi")},
                    "conf": {m: l["ocr"][m][1] for m in ("heb", "heb_rashi")}})
    out.sort(key=lambda p: p["cy"])
    row, last = 0, None
    for p in out:
        if last is not None and p["cy"] - last > 0.4 * max(8.0, min(p["xh"] or 14, 14)):
            row += 1
        p["row"] = row
        last = p["cy"]
    out.sort(key=lambda p: (p["row"], -p["box"][2]))
    return out


def script_weight(p, part):
    """The Gemara is printed in square letters and the comments in Rashi script; a line read far better
    in the other script counts for less. (A comment's opening words are square, so this is a weight,
    not a rule.)"""
    d = p["conf"]["heb"] - p["conf"]["heb_rashi"]
    if part == "main":
        return float(np.clip(1 + (d + 5) / 30, 0.15, 1))
    return float(np.clip(1 - (d - 15) / 40, 0.15, 1))


def commentary_size(pieces):
    """How tall the commentaries' letters are on this page: the usual height in lines read better as
    Rashi script."""
    hs = [p["xh"] for p in pieces if p["xh"] and len(p["read"]["heb_rashi"]) >= 8 and p["conf"]["heb_rashi"] > p["conf"]["heb"]]
    return float(np.median(hs)) if len(hs) >= 5 else None


def column_sizes(pieces):
    """The usual letter height in each column (pieces between the same two gaps), over its fuller lines."""
    by = {}
    for p in pieces:
        if p["xh"] and len(p["read"]["heb_rashi"]) >= 8:
            by.setdefault(p["key"], []).append(p["xh"])
    return {k: float(np.median(v)) for k, v in by.items() if len(v) >= 3}


def size_weight(p, ref, cols):
    """The margins' notes (Ein Mishpat, Masoret HaShas, glosses) are set smaller than Rashi and Tosafot,
    which are smaller than the Gemara: a line in a column of letters far smaller than the commentaries'
    counts for little. Judged by the column as well as the line: a short piece of a line can be mostly
    small letters (י, ו), so a small line in a column of full-size letters keeps its weight; and a column
    can mix a few full-size lines with the margin's notes, so a line of full-size letters keeps its
    weight too."""
    if not ref:
        return 1.0

    def weight(h):
        return float(np.clip((h / ref - 0.72) / 0.13, 0.0, 1.0))

    size = cols.get(p["key"])
    return max(weight(p["xh"]) if p["xh"] else 0.0, weight(size) if size else 1.0)


def options(pieces, part, stream):
    """Where each piece could sit in this text (a few places, since the Gemara repeats itself)."""
    opts = {}
    ref, cols = commentary_size(pieces), column_sizes(pieces)
    for p in pieces:
        s = p["read"][READING[part]]
        if len(s) < 4:
            continue
        w = script_weight(p, part) * size_weight(p, ref, cols)
        if w <= 0:
            continue
        cs = candidates(s, stream.text, top=3, max_cost=0.5)
        if cs:
            opts[p["i"]] = [{"d0": a, "d1": b, "sim": 1 - c, "n": len(s), "w": w} for a, b, c in cs]
    return opts


def chain(pieces, opts, stream, exclude=(), look=250, jump=8.0):
    """The lines holding this text, in its order: each next line is lower on the page, or further left on
    the same printed row, or at the top of a column further left (a text that fills two columns runs down
    the right one, then on at the top of the left one). Two lines never share letters; skipped text,
    empty space and a jump to the next column cost a little.

    A printed line holds one stretch of text, but where the library has a stretch twice (dups.py) the
    best chain can run down the lines once for each copy. Then each such line is kept at one copy: the
    one that gives the better chain without the other."""
    seq, score = _chain(pieces, opts, stream, exclude, look, jump)
    for _ in range(8):
        seen, again = {}, set()
        for p, o in seq:
            if p["i"] in seen:
                again.add(p["i"])
            seen.setdefault(p["i"], []).append(o["d0"])
        if not again:
            break
        best = None
        for keep in (0, -1):
            trial = dict(opts)
            for i in again:
                at = sorted(seen[i])[keep]
                trial[i] = [o for o in opts[i] if o["d0"] == at]
            s2, c2 = _chain(pieces, trial, stream, exclude, look, jump)
            if best is None or c2 > best[2]:
                best = (trial, s2, c2)
        opts, seq, score = best
    return seq


def _chain(pieces, opts, stream, exclude, look, jump):
    states = []
    for p in pieces:
        if p["i"] in exclude:
            continue
        for o in opts.get(p["i"], []):
            states.append((p, o))
    if not states:
        return [], 0.0
    states.sort(key=lambda s: (s[1]["d0"], s[1]["d1"]))
    val = [o["n"] * o["sim"] ** 2 * o["w"] for _, o in states]
    best = list(val)
    prev = [-1] * len(states)
    for j, (pj, oj) in enumerate(states):
        for i in range(j - 1, max(-1, j - look), -1):
            pi, oi = states[i]
            if oi["d0"] >= oj["d0"] or pi["i"] == pj["i"]:
                continue
            left = pj["box"][2] <= pi["box"][0] + 6
            same_row = abs(pj["cy"] - pi["cy"]) <= 0.5 * max(pi["xh"], pj["xh"], 8) and left
            below = not same_row and pj["cy"] > pi["cy"] + 3
            up_left = not same_row and not below and left
            if not (same_row or below or up_left):
                continue
            over = max(0, oi["d1"] - oj["d0"])
            skip = stream.skipped(oi["d1"], oj["d0"])
            gap = max(0.0, pj["box"][1] - pi["box"][3] - 2.5 * max(pi["xh"], pj["xh"])) if below else 0.0
            # down into a column that doesn't share any width with this one, away across the page, is a
            # jump too (a short line's next line can start just past its end: that is no jump)
            away = max(pj["box"][0] - pi["box"][2], pi["box"][0] - pj["box"][2])
            aside = below and overlap_x(pi["box"], pj["box"]) == 0 and away > 4 * max(pi["xh"], pj["xh"], 8)
            c = best[i] + val[j] - 1.5 * over - 0.35 * skip - 0.04 * gap - (jump if up_left or aside else 0.0)
            if c > best[j]:
                best[j] = c
                prev[j] = i
    k = int(np.argmax(best))
    score = float(best[k])
    out = []
    while k >= 0:
        out.append(states[k])
        k = prev[k]
    return out[::-1], score


def column_fit(seq):
    """For each line of a chain, how much it shares the width of the chain's lines just before and
    after it on the page: high for a line of the text's own column."""
    out = {}
    for k, (p, _) in enumerate(seq):
        best = 0.0
        for j in (k - 1, k + 1):
            if 0 <= j < len(seq):
                q = seq[j][0]
                if abs(q["cy"] - p["cy"]) <= 3 * max(p["xh"], q["xh"], 8):
                    best = max(best, overlap_x(p["box"], q["box"]))
        out[p["i"]] = best
    return out


def overlap_x(a, b):
    return max(0, min(a[2], b[2]) - max(a[0], b[0])) / max(1, min(a[2] - a[0], b[2] - b[0]))


def covers(a, b):
    """How much of the wider of two boxes their shared width is."""
    return max(0, min(a[2], b[2]) - max(a[0], b[0])) / max(1, max(a[2] - a[0], b[2] - b[0]))


def overlap_y(a, b):
    return max(0, min(a[3], b[3]) - max(a[1], b[1])) / max(1, min(a[3] - a[1], b[3] - b[1]))


def fill_gaps(seq, pieces, part, claimed):
    """A printed line the reading made nothing of sits in a gap between two lines of the column; put it
    back, holding the text between them."""
    if len(seq) < 3:
        return seq
    pitch = float(np.median(np.diff([p["cy"] for p, _ in seq])))
    out = [seq[0]]

    def like(q, p):
        # a line of the same column: across most of its width, in letters of its size (not a margin note)
        return covers(q["box"], p["box"]) > 0.6 and 0.75 <= (q["xh"] or 1) / max(p["xh"] or 1, 1) <= 1.33

    for (pa, oa), (pb, ob) in zip(seq, seq[1:]):
        if pb["cy"] - pa["cy"] > 1.6 * pitch:
            between = [q for q in pieces if q["i"] not in claimed and pa["cy"] + 0.5 * pitch < q["cy"] < pb["cy"] - 0.5 * pitch
                       and (like(q, pa) or like(q, pb)) and len(q["read"][READING[part]]) >= 4]
            for q in sorted(between, key=lambda q: q["cy"]):
                out.append((q, {"d0": oa["d1"], "d1": ob["d0"], "sim": 0.0, "n": len(q["read"][READING[part]]), "filled": True}))
                claimed.add(q["i"])
        out.append((pb, ob))
    return out


def union(boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def merge_row(parts):
    """Pieces of one printed line, right to left."""
    parts = sorted(parts, key=lambda t: -t["box"][2])
    return {"pieces": parts, "s": "".join(t["s"] for t in parts), "xh": float(np.median([t["xh"] for t in parts])),
            "box": union([t["box"] for t in parts]), "core": union([t["core"] for t in parts]),
            "cy": float(np.mean([t["cy"] for t in parts]))}


def attach_leftovers(lines_by_part, leftovers, streams):
    """A short piece beside a line (an opening word set apart) joins it when it continues that line's text."""
    used = set()
    for p in leftovers:
        # Ornaments and specks read as a letter or two of nonsense; only real text joins a line.
        if len(p["s"]) < 3 or p["conf"] < 45:
            continue
        for part, ls in lines_by_part.items():
            st = streams[part]
            for L in ls:
                b = L["box"]
                if overlap_y(b, p["box"]) < 0.3 or not (0.6 * L["xh"] <= p["xh"] <= 1.7 * L["xh"]):
                    continue
                right = p["box"][0] >= b[2] - 5 and p["box"][0] - b[2] <= 6 * max(L["xh"], 10)
                left = p["box"][2] <= b[0] + 5 and b[0] - p["box"][2] <= 6 * max(L["xh"], 10)
                if not (right or left):
                    continue
                n = len(p["s"])
                ctx = st.text[max(0, L["d0"] - n - 4):L["d0"]] if right else st.text[L["d1"]:L["d1"] + n + 4]
                if ctx and fuzz.partial_ratio(p["s"], ctx) >= 80:
                    L["pieces"] = ([p] + L["pieces"]) if right else (L["pieces"] + [p])
                    L["s"] = "".join(q["s"] for q in L["pieces"])
                    L["box"] = union([q["box"] for q in L["pieces"]])
                    L["core"] = union([q["core"] for q in L["pieces"]])
                    if right:
                        L["d0"] = max(0, L["d0"] - n)
                    else:
                        L["d1"] = L["d1"] + n
                    used.add(p["i"])
                    break
            if p["i"] in used:
                break
    return used


# ---------------------------------------------------------------------------------------------
# Word breaks


def runs_of(lines, run_gap=60):
    """Lines whose text follows on directly, as runs of line numbers."""
    runs, cur = [], [0]
    for k in range(1, len(lines)):
        a, b = lines[k - 1], lines[k]
        # lines put back into one gap all carry the whole gap; they share it, in order
        same_gap = a["filled"] and b["filled"] and (a["d0"], a["d1"]) == (b["d0"], b["d1"])
        if same_gap or -run_gap <= b["d0"] - a["d1"] <= run_gap:
            cur.append(k)
        else:
            runs.append(cur)
            cur = [k]
    runs.append(cur)
    return runs


def first_guess(lines, run):
    """Letter positions of a run's line starts (and its last line's end): where the matching placed
    each line. A line the reading made nothing of shares the gap it fills with the others in that gap,
    by width."""
    ls = [lines[k] for k in run]
    guess = [float(l["d0"]) for l in ls] + [float(ls[-1]["d1"])]
    k = 0
    while k < len(ls):
        if not ls[k]["filled"]:
            k += 1
            continue
        j = k
        while j < len(ls) and ls[j]["filled"]:
            j += 1
        a = ls[k - 1]["d1"] if k > 0 else ls[k]["d0"]
        b = ls[j]["d0"] if j < len(ls) else ls[j - 1]["d1"]
        widths = np.array([max(1, l["box"][2] - l["box"][0]) for l in ls[k:j]], float)
        edges = a + (b - a) * np.concatenate([[0], np.cumsum(widths)]) / widths.sum()
        for i in range(k, j):
            guess[i] = float(edges[i - k])
        if j == len(ls):
            guess[j] = float(edges[-1])
        k = j
    return np.round(np.array(guess)).astype(int)


def word_breaks(lines, stream, W=40, drift=0.01, width_weight=0.3, whole=False):
    """Where each line starts and ends, as a (first word, past-last word) range per line. Within a run,
    every break sits at a word boundary near the first guess, chosen so the whole run reads best: each
    line's reading against its words, plus a nudge toward the share of letters its width suggests.

    whole: the stream is printed whole on this page, from its first line to its last (the Gemara of an
    amud). Then a few words left before the first line or after the last are that line's: often an
    abbreviation the printed line has in place of the library's full words (א"ר for אמר רבי)."""
    if not lines:
        return []
    ws = stream.word_starts()
    text = stream.text
    ranges = [None] * len(lines)
    runs = runs_of(lines)
    for r, run in enumerate(runs):
        guess = first_guess(lines, run)
        pin_start = whole and r == 0 and 0 < guess[0] <= 0.5 * len(lines[run[0]]["s"]) + 2
        pin_end = whole and r == len(runs) - 1 and 0 < len(text) - guess[-1] <= 0.5 * len(lines[run[-1]]["s"]) + 2
        if pin_start:
            guess[0] = 0
        if pin_end:
            guess[-1] = len(text)
        n = len(run)
        widths = np.array([max(1, lines[k]["box"][2] - lines[k]["box"][0]) for k in run], float)
        expect = widths * max(0, guess[-1] - guess[0]) / widths.sum()
        cands = []
        for t in guess:
            c = ws[(ws >= t - W) & (ws <= t + W)]
            if not len(c):
                c = ws[[int(np.argmin(np.abs(ws - t)))]]
            cands.append(np.unique(c))
        if pin_start:
            cands[0] = np.array([0])
        if pin_end:
            cands[n] = np.array([len(text)])
        f = drift * np.abs(cands[0] - guess[0]).astype(np.float64)
        back = []
        for k in range(n):
            q = lines[run[k]]["s"]
            nxt = cands[k + 1]
            best = np.full(len(nxt), np.inf)
            arg = np.zeros(len(nxt), int)
            for a, s in enumerate(cands[k]):
                if not np.isfinite(f[a]):
                    continue
                ok = nxt >= s
                if not ok.any():
                    continue
                pc = prefix_costs(q, text[s:int(nxt[ok].max())])
                cost = f[a] + pc[nxt[ok] - s] + width_weight * np.abs((nxt[ok] - s) - expect[k])
                idx = np.where(ok)[0]
                better = cost < best[idx]
                best[idx[better]] = cost[better]
                arg[idx[better]] = a
            back.append(arg)
            f = best + drift * np.abs(nxt - guess[k + 1])
        b = int(np.argmin(f))
        bounds = [int(cands[n][b])]
        for k in range(n - 1, -1, -1):
            b = int(back[k][b])
            bounds.append(int(cands[k][b]))
        bounds = bounds[::-1]
        words = [stream.word_at_letter(p) for p in bounds]
        start = opening_words(stream, words[0])
        if all(r is None or r[1] <= start or r[0] >= words[0] for r in ranges):
            words[0] = start
        for k, idx in enumerate(run):
            ranges[idx] = (words[k], words[k + 1])
    return ranges


def opening_words(stream, w, most=2):
    """The amud's first comment opens with its first word printed large, often in a frame (at a
    chapter's start, מתני' in a box), which the reading makes nothing of. When a run of lines starts a
    word or two into that comment, it starts with the comment."""
    first = next((k for k, x in enumerate(stream.words) if x[3] == "cur"), None)
    if first is None or not (first < w <= first + most):
        return w
    ref = stream.words[first][0]
    return first if all(stream.words[k][0] == ref for k in range(first, w + 1)) else w


def spans(stream, a, b):
    """Words a..b as [ref, first word, past-last word] runs, one per passage."""
    out = []
    for k in range(a, b):
        ref, wi, _, _ = stream.words[k]
        if out and out[-1][0] == ref and out[-1][2] == wi:
            out[-1][2] = wi + 1
        else:
            out.append([ref, wi, wi + 1])
    return out


# ---------------------------------------------------------------------------------------------
# The order the comments are printed in


def print_order(pieces, part, before, cur, after, dup, stream, opts, opening=16, min_score=85):
    """The library lists an amud's comments in the order of the Gemara words they explain; the page
    sometimes prints two of them the other way round. Where each comment's opening words are printed
    (in this text's own column) gives the page's order; when it differs, and the lines then chain
    better in it, match in the page's order."""
    if len(cur) < 2:
        return stream, opts
    seq, score = _chain(pieces, opts, stream, (), 250, 8.0)
    if not seq:
        return stream, opts
    column = [p["box"] for p, _ in seq]
    own = [p for p in pieces if len(p["read"][READING[part]]) >= 6
           and any(overlap_x(p["box"], b) > 0.6 and abs(p["box"][1] - b[1]) < 400 for b in column)]
    if not own:
        return stream, opts
    pitch = float(np.median([p["xh"] for p in own])) * 1.6

    def below(p):
        """The next line down in the same column."""
        under = [q for q in own if q["cy"] > p["cy"] + 0.5 * pitch and overlap_x(p["box"], q["box"]) > 0.5]
        return min(under, key=lambda q: q["cy"]) if under else None

    nexts = {p["i"]: below(p) for p in own}
    # Where each line comes in the text's reading order (down one column, then the next): its place in
    # the chain, or, for a line the chain skipped, the place of the chain's line just above it.
    place = {p["i"]: n for n, (p, _) in enumerate(seq)}
    for p in own:
        if p["i"] not in place:
            above = [(q, n) for n, (q, _) in enumerate(seq) if q["cy"] < p["cy"] and overlap_x(p["box"], q["box"]) > 0.5]
            if above:
                place[p["i"]] = max(above, key=lambda t: t[0]["cy"])[1] + 0.5

    def where(passage):
        head = letters(" ".join(words_of(passage["he"])[:6]))[:opening]
        if len(head) < 8:
            return None
        found = []
        for p in own:
            text = p["read"][READING[part]]
            # a comment's opening words often run on to the next line
            q = nexts[p["i"]]
            al = fuzz.partial_ratio_alignment(head, text + (q["read"][READING[part]] if q else ""))
            if al and al.score >= min_score and al.dest_start < len(text) and p["i"] in place:
                b = p["box"]
                found.append((al.score, place[p["i"]], -(b[2] - (b[2] - b[0]) * al.dest_start / max(1, len(text)))))
        if not found:
            return None
        top = max(f[0] for f in found)
        # A comment often repeats its opening words further on; where they first appear is where it starts.
        return min(f[1:] for f in found if f[0] >= top - 3)

    at = {k: w for k, w in ((k, where(p)) for k, p in enumerate(cur)) if w is not None}
    if len(at) < 2:
        return stream, opts
    found = sorted(at, key=lambda k: at[k])
    if found == sorted(found):
        return stream, opts
    # Comments whose opening wasn't found keep their place after the comment listed before them.
    it = iter(found)
    reordered = [cur[next(it) if k in at else k] for k in range(len(cur))]
    st2 = Stream(before, reordered, after, dup)
    op2 = options(pieces, part, st2)
    _, score2 = _chain(pieces, op2, st2, (), 250, 8.0)
    return (st2, op2) if score2 > score + 5 else (stream, opts)


# ---------------------------------------------------------------------------------------------
# One page


def raised_marks(comps, xh):
    """Small blobs set above a line's letters (a note's asterisk or ring, a reference letter, a geresh),
    grouped where they touch, right to left: lists of blobs (x0, y0, x1, y1, area, label). What each is
    is decided later, from its shape (furniture.mark_kind)."""
    sized = [c for c in comps if 0.75 * xh <= c[3] - c[1] <= 1.3 * xh]
    if len(sized) < 3:
        return []
    top = sorted(c[1] for c in sized)[len(sized) // 2]
    bottom = sorted(c[3] for c in sized)[len(sized) // 2]
    small = sorted((c for c in comps if c[3] - c[1] <= 0.8 * xh and c[1] < top - 0.15 * xh and c[3] < bottom - 0.25 * xh),
                   key=lambda c: -c[2])
    groups = []
    for c in small:
        if groups and min(d[0] for d in groups[-1]) - c[2] <= 1:
            groups[-1].append(tuple(int(v) for v in c))
        else:
            groups.append([tuple(int(v) for v in c)])
    return groups


BIG = 1.6  # a word whose letters are this many times the line's letter height is printed large


def big_words(ink, xs, xh):
    """The words printed larger than their line (a commentary's first words, a chapter's opening
    word), as {word number: (top, bottom)} of their letters. ink: the line's blobs (x0, x1, height,
    top); xs: each word's [x0, x1]."""
    out = {}
    for k, (x0, x1) in enumerate(xs):
        letters = [b for b in ink if b[0] >= x0 - 1 and b[1] <= x1 + 1 and b[2] >= 0.5 * xh]
        if not letters:
            continue
        # Most of the word's letters must be tall: a lamed's or a final letter's reach doesn't count.
        heights = sorted(b[2] for b in letters)
        if heights[(len(heights) - 1) // 2] < BIG * xh:
            continue
        tall = [b for b in letters if b[2] >= BIG * xh]
        h = sorted(b[2] for b in tall)[(len(tall) - 1) // 2]
        top = sorted(b[3] for b in tall)[(len(tall) - 1) // 2]
        out[k] = (int(top), int(top + h))
    return out


def layout(lines, prev, cur, nxt, dup=None):
    """Every printed line of each text on the page, with the words it holds.

    lines: the page's line pieces, each with "box", "xh" and "ocr" (see read.py).
    prev, cur, nxt: {"main"|"rashi"|"tosafot": [{"ref", "he"}, ...]} for the previous amud, this one
    and the next (prev may be None on a tractate's first page). dup: {part: words the library has twice}.
    Returns {part: [{"box", "xh", "spans", "agree", "filled", "where", "nwords"}, ...]} in reading order; "box"
    is the line's ordinary letters (see scan.finish_line)."""
    pieces = pieces_of(lines)
    dup = dup or {}
    streams, opts = {}, {}
    for part in PARTS:
        before = prev.get(part, []) if prev and part != "main" else []
        after = nxt.get(part, []) if nxt and part != "main" else []
        streams[part] = Stream(before, cur.get(part, []), after, dup.get(part))
        opts[part] = options(pieces, part, streams[part])
        if part != "main":
            streams[part], opts[part] = print_order(pieces, part, before, cur.get(part, []), after, dup.get(part),
                                                    streams[part], opts[part])
    exclude = {part: set() for part in PARTS}
    for _ in range(8):
        seqs = {part: chain(pieces, opts[part], streams[part], exclude[part]) for part in PARTS}
        fit = {part: column_fit(seq) for part, seq in seqs.items()}
        owner = {}
        conflict = False
        for part, seq in seqs.items():
            for p, o in seq:
                if p["i"] in owner and owner[p["i"]][0] != part:
                    other, oo = owner[p["i"]]
                    conflict = True
                    # The commentaries often quote the same words: the text it reads better as keeps it,
                    # and better still the text whose lines sit just above and below it.
                    mine = o["sim"] + 0.5 * fit[part][p["i"]]
                    theirs = oo["sim"] + 0.5 * fit[other][p["i"]]
                    loser = part if mine < theirs else other
                    exclude[loser].add(p["i"])
                    if loser == other:
                        owner[p["i"]] = (part, o)
                else:
                    owner[p["i"]] = (part, o)
        if not conflict:
            break
    # Should any conflict be left, each line stays only with the text that owns it.
    seqs = {part: [(p, o) for p, o in seq if owner[p["i"]][0] == part and owner[p["i"]][1] is o] for part, seq in seqs.items()}
    claimed = set(owner)
    lines_by_part = {}
    for part in PARTS:
        seq = fill_gaps(seqs[part], pieces, part, claimed)
        groups = []
        for p, o in seq:
            if groups:
                q, _ = groups[-1][-1]
                if abs(p["cy"] - q["cy"]) <= 0.5 * max(p["xh"], q["xh"], 8) and p["box"][2] <= q["box"][0] + 6:
                    groups[-1].append((p, o))
                    continue
            groups.append([(p, o)])
        ls = []
        for grp in groups:
            L = merge_row([{"i": p["i"], "s": p["read"][READING[part]], "xh": p["xh"], "box": p["box"], "core": p["core"], "cy": p["cy"]}
                           for p, _ in grp])
            L.update({"d0": grp[0][1]["d0"], "d1": grp[-1][1]["d1"], "filled": any(o.get("filled", False) for _, o in grp)})
            ls.append(L)
        lines_by_part[part] = ls
    leftovers = [{"i": p["i"], "s": p["read"]["heb"] if p["conf"]["heb"] >= p["conf"]["heb_rashi"] else p["read"]["heb_rashi"],
                  "xh": p["xh"], "box": p["box"], "core": p["core"], "cy": p["cy"], "conf": max(p["conf"].values())}
                 for p in pieces if p["i"] not in claimed]
    attach_leftovers(lines_by_part, leftovers, streams)
    result = {}
    for part in PARTS:
        st = streams[part]
        ls = lines_by_part[part]
        ranges = word_breaks(ls, st, whole=part == "main")
        out = []
        for k, L in enumerate(ls):
            a, b = ranges[k]
            if b <= a:
                continue
            words = st.words[a:b]
            agree = 1 - Indel.normalized_distance(L["s"], letters(" ".join(w[2] for w in words)))
            ink = [(c[0], c[2], c[3] - c[1], c[1]) for q in L["pieces"] for c in lines[q["i"]]["comps"]]
            read = [lines[q["i"]]["ocr"][READING[part]] for q in L["pieces"]]
            printed = sorted((w for r in read if len(r) > 2 for w in r[2]), key=lambda w: -w[2])
            xs = word_positions(ink, [w[2] for w in words], float(L["xh"]), printed)
            out.append({"box": [int(v) for v in L["core"]], "xh": round(float(L["xh"]), 1), "spans": spans(st, a, b),
                        "agree": round(float(agree), 3), "filled": bool(L["filled"]), "where": sorted({w[3] for w in words}),
                        "nwords": b - a, "xs": [[int(x0), int(x1)] for x0, x1 in xs] if xs else None,
                        "big": big_words(ink, xs, float(L["xh"])) if xs else None,
                        "raised": raised_marks([c for q in L["pieces"] for c in lines[q["i"]]["comps"]], float(L["xh"]))})
        # the next page's first word or two, printed under the last line, is a catchword
        if out and out[-1]["where"] == ["next"] and out[-1]["nwords"] <= 2:
            out.pop()
        result[part] = out
    return result
