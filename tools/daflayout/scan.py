"""The columns and lines of a scanned Vilna page.

A page is a few texts set in columns: the Gemara in the middle, Rashi and Tosafot beside it and
under it, notes in the margins. The columns are found from the blank gaps between them; within a
column, the lines are found from where its letters sit.
"""

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

TARGET_LETTER = 14.0     # every threshold below expects letters about this tall, in pixels


def otsu(g):
    hist = np.bincount(g.ravel().astype(np.int64), minlength=256).astype(float)
    p = hist / hist.sum()
    om = np.cumsum(p)
    mu = np.cumsum(p * np.arange(256))
    sb = (mu[-1] * om - mu) ** 2 / (om * (1 - om) + 1e-12)
    return int(np.argmax(sb))


def normalize(g):
    """Stretch the scan so its darkest ink is black and its paper white; scans vary a lot."""
    lo, paper = np.percentile(g, 1), np.percentile(g, 50)
    if paper - lo < 40:
        return g
    return np.clip((g - lo) * 255.0 / (paper - lo), 0, 255).astype(np.int16)


def body_height(ink):
    """The usual height of a letter on the page."""
    lab, n = ndi.label(ink, structure=np.ones((3, 3), bool))
    objs = ndi.find_objects(lab)
    hs = np.array([sl[0].stop - sl[0].start for sl in objs])
    areas = ndi.sum(ink, lab, index=np.arange(1, n + 1))
    ok = (areas > 20) & (hs > 6) & (hs < 60)
    return float(np.median(hs[ok])) if ok.any() else TARGET_LETTER


def load(path):
    """The scan in grey, contrast-stretched and scaled so its letters are the size every threshold
    expects. Returns (grey, ink) arrays; their size is the page's coordinate space."""
    im = Image.open(path).convert("L")
    if im.width > 2000:
        im = im.resize((1530, round(im.height * 1530 / im.width)), Image.LANCZOS)
    g = normalize(np.asarray(im).astype(np.int16))
    t = min(otsu(g) + 25, 200)
    s = TARGET_LETTER / body_height(g < t)
    if abs(s - 1) > 0.2:
        im = Image.fromarray(g.astype(np.uint8))
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        g = np.asarray(im).astype(np.int16)
    return g, g < t


# ---------------------------------------------------------------------------------------------
# The gaps between columns


def channel_map(ink, H=56, tol=2, maxw=75, minh=80):
    """Narrow vertical strips that stay blank for a few lines up and down: gaps between columns."""
    h, w = ink.shape
    c = np.vstack([np.zeros((1, w), np.int32), np.cumsum(ink, axis=0, dtype=np.int32)])
    ys = np.arange(h)
    lo = np.clip(ys - H // 2, 0, h)
    hi = np.clip(ys + H // 2, 0, h)
    white = (c[hi] - c[lo]) <= tol
    wd = white.copy()
    wd[:, 1:-1] = white[:, :-2] & white[:, 1:-1] & white[:, 2:]
    narrow = np.zeros_like(wd)
    for y in range(h):
        d = np.diff(np.concatenate([[0], wd[y].astype(np.int8), [0]]))
        s = np.where(d == 1)[0]
        e = np.where(d == -1)[0]
        k = (e - s <= maxw) & (s > 0) & (e < w)
        for a, b in zip(s[k], e[k]):
            narrow[y, a:b] = True
    lab, _ = ndi.label(narrow)
    chans = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl[0].stop - sl[0].start < minh:
            continue
        m = lab[sl] == i
        if np.median(m.sum(1)) < 6:
            continue  # a white river inside a column, not a gap between columns
        centers = np.array([sl[1].start + np.mean(np.where(row)[0]) if row.any() else np.nan for row in m])
        chans.append({"y0": sl[0].start, "y1": sl[0].stop, "x": float(np.nanmedian(centers)), "cx": centers,
                      "ys": np.arange(sl[0].start, sl[0].stop)})
    return chans


def barrier_segments(chans, gap=160, dx=10):
    """Channels as vertical segments; pieces of one broken channel become one segment."""
    n = len(chans)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(n):
            a, b = chans[i], chans[j]
            if b["y0"] > a["y1"] and b["y0"] - a["y1"] <= gap and abs(b["x"] - a["x"]) <= dx:
                parent[find(j)] = find(i)
    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(chans[i])
    segs = []
    for g in groups.values():
        ys = np.concatenate([c["ys"] for c in g])
        cx = np.concatenate([c["cx"] for c in g])
        segs.append({"x": float(np.nanmedian(cx)), "y0": int(ys.min()), "y1": int(ys.max())})
    return drop_slivers(segs)


def drop_slivers(segs, near=60, short=160, margin=20):
    """No column is narrower than a few words. A short gap close beside a long one (the blank beside a
    big opening letter, set into the text next to a column's edge) is not the edge of a column."""
    keep = []
    for s in segs:
        h = s["y1"] - s["y0"]
        sliver = h < short and any(
            t is not s and abs(t["x"] - s["x"]) < near and t["y1"] - t["y0"] > h
            and t["y0"] - margin <= s["y0"] and s["y1"] <= t["y1"] + margin for t in segs)
        if not sliver:
            keep.append(s)
    return keep


def extend_ends(segs, ink):
    """The channel test looks a few lines up and down, so a channel stops short of where its gap
    really ends. Follow each one up and down while the gap itself is still blank."""
    h = ink.shape[0]
    for s in segs:
        x = int(round(s["x"]))
        band = ink[:, max(0, x - 1):x + 2].any(1)
        y = s["y1"]
        while y + 1 < h and not band[y + 1]:
            y += 1
        s["y1"] = y
        y = s["y0"]
        while y - 1 >= 0 and not band[y - 1]:
            y -= 1
        s["y0"] = y
    return segs


def row_profile(ink, y0, y1, x0, x1):
    band = ink[y0:y1, max(0, x0):max(0, x1)]
    if band.size == 0:
        return None
    p = band.sum(1).astype(float)
    return p if p.std() > 0 else None


def join_gutters(segs, ink, dx=12, max_gap=900, wide=(25, 200), near=(8, 60), max_corr=0.45, max_near=0.3, min_ratio=0.35):
    """Small notes printed between two columns (verse sources, cross-references) can block the
    channel test for a long stretch. Two pieces of channel at the same x are one gap between columns
    when there is text on both sides of the stretch between them and it runs in different lines on
    the two sides: the rows don't line up, close to the gap or further out. A line printed across
    would line up."""

    def profiles(x, y0, y1, band):
        return row_profile(ink, y0, y1, x - band[1], x - band[0]), row_profile(ink, y0, y1, x + band[0], x + band[1])

    def corr(a, b):
        return float(np.corrcoef(a, b)[0, 1])

    segs = sorted(segs, key=lambda s: s["y0"])
    changed = True
    while changed:
        changed = False
        for i, a in enumerate(segs):
            for j, b in enumerate(segs):
                if i == j or abs(a["x"] - b["x"]) > dx or not (0 < b["y0"] - a["y1"] <= max_gap):
                    continue
                x = int(round((a["x"] + b["x"]) / 2))
                y0, y1 = a["y1"], b["y0"]
                L, R = profiles(x, y0, y1, wide)
                nL, nR = profiles(x, y0, y1, near)
                if L is None or R is None or nL is None or nR is None:
                    continue
                if min(L.mean(), R.mean()) < min_ratio * max(L.mean(), R.mean()):
                    continue  # text on one side only
                if corr(L, R) > max_corr or corr(nL, nR) > max_near:
                    continue
                a["y1"] = b["y1"]
                a["x"] = (a["x"] + b["x"]) / 2
                del segs[j]
                changed = True
                break
            if changed:
                break
    return segs


def extend_through_notes(segs, ink, step=12, win=48, ahead=6, wide=(25, 200), near=(8, 60), max_corr=0.45,
                         max_near=0.3, min_ratio=0.35, limit=900):
    """A gap between columns that notes fill (verse sources printed between Rashi and the Gemara, one
    beside every other line) shows no blank channel at all where the notes are. Follow each gap up and
    down past its blank part while the text on its two sides still runs in different lines; stop where
    the lines on both sides line up (a line printed across) or one side has no text. Two columns' lines
    can happen to line up for a line or two, so a short stretch that looks aligned is passed over when
    the text beyond it runs apart again."""
    h = ink.shape[0]

    def corr(a, b):
        return float(np.corrcoef(a, b)[0, 1])

    def apart(x, y0, y1):
        if y0 < 0 or y1 > h:
            return False
        L, R = row_profile(ink, y0, y1, x - wide[1], x - wide[0]), row_profile(ink, y0, y1, x + wide[0], x + wide[1])
        nL, nR = row_profile(ink, y0, y1, x - near[1], x - near[0]), row_profile(ink, y0, y1, x + near[0], x + near[1])
        if L is None or R is None or nL is None or nR is None:
            return False
        if min(L.mean(), R.mean()) < min_ratio * max(L.mean(), R.mean()):
            return False
        return corr(L, R) <= max_corr and corr(nL, nR) <= max_near

    def reach(x, start, sign):
        """How far the gap goes on from `start`, upward (sign -1) or downward (+1)."""
        edge = start
        while abs(edge - start) < limit:
            nxt = None
            for k in range(1, ahead + 1):
                e = edge + sign * k * step
                if apart(x, min(e, e - sign * win), max(e, e - sign * win)):
                    nxt = e
                    break
            if nxt is None:
                return edge
            edge = nxt
        return edge

    for s in segs:
        x = int(round(s["x"]))
        s["y0"], s["y1"] = max(0, reach(x, s["y0"], -1)), min(h - 1, reach(x, s["y1"], 1))
    return segs


# ---------------------------------------------------------------------------------------------
# Lines


def components(ink):
    """Connected blobs of ink: letters, mostly. Each is (x0, y0, x1, y1, area, label)."""
    lab, n = ndi.label(ink, structure=np.ones((3, 3), bool))
    objs = ndi.find_objects(lab)
    areas = ndi.sum(ink, lab, index=np.arange(1, n + 1))
    comps = []
    for i, sl in enumerate(objs):
        comps.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop, int(areas[i]), i + 1))
    return lab, comps


def column_key(segs, cx, cy, w):
    """Which column a point is in: the nearest gap on its left and on its right at that height."""
    left, right = (-1, 0.0), (-2, float(w))
    for k, s in enumerate(segs):
        if s["y0"] <= cy <= s["y1"]:
            if cx > s["x"] > left[1]:
                left = (k, s["x"])
            if cx < s["x"] < right[1]:
                right = (k, s["x"])
    return (left[0], right[0])


def merge_overlapping(lines):
    """Two pieces of one column on the same printed line (their letters centred at about the same
    height, side by side or crossing) are one line the clustering split. Boxes are not compared: a tall
    mark such as a bracket can stretch a line's box into the next line."""
    changed = True
    while changed:
        changed = False
        for i in range(len(lines)):
            for j in range(i + 1, len(lines)):
                a, b = lines[i], lines[j]
                if a["key"] != b["key"]:
                    continue
                A, B = a["box"], b["box"]
                if abs(a["cy"] - b["cy"]) < 0.6 * max(a["xh"], b["xh"], 8) and min(A[2], B[2]) - max(A[0], B[0]) > -4:
                    a["comps"] = a["comps"] + b["comps"]
                    finish_line(a)
                    del lines[j]
                    changed = True
                    break
            if changed:
                break
    return lines


STRAY = 6  # the most letters a piece split off by its letters' height alone can have


def stray_tall_letters(a, b):
    """A few tall letters (a lamed's top, a final letter's tail) whose middles fall past where a gap
    between columns ends come out as a piece of their own, taller than the line they belong to. They
    stand on that line's baseline (or hang from its top)."""
    few, line = (a, b) if a["xh"] > b["xh"] else (b, a)
    if few["n"] > STRAY or line["n"] <= few["n"]:
        return False
    # among the line's letters, not beside them (a piece of the next column's line, say)
    F, L = few["box"], line["box"]
    if max(F[0], L[0]) - min(F[2], L[2]) > 0.5 * line["xh"]:
        return False
    tol = max(3.0, 0.2 * line["xh"])
    return abs(few["core"][3] - line["core"][3]) <= tol or abs(few["core"][1] - line["core"][1]) <= tol


def stray_bits(a, b):
    """A few small letters of a line (yuds, a lamed and the letter it stands over) whose middles sit
    a little higher than the rest can come out as a piece of their own, inside the line's span and
    within its height: shorter than the line, so stray_tall_letters doesn't take them."""
    few, line = (a, b) if a["n"] < b["n"] else (b, a)
    if few["n"] > STRAY:
        return False
    F, L = few["box"], line["box"]
    tol = 0.5 * line["xh"]
    if F[0] < L[0] - tol or F[2] > L[2] + tol:
        return False
    top, bottom = line["core"][1] - 0.2 * line["xh"], line["core"][3] + 0.2 * line["xh"]
    return all(top <= (c[1] + c[3]) / 2 <= bottom for c in few["comps"])


def merge_across(lines, segs):
    """Where a gap between columns ends partway through a printed line (at the top of the Gemara's
    column, under the commentaries' top lines), the line's letters fall on both sides of the gap's end
    and come out as two pieces of different columns. Pieces at the same height, with letters of the
    same size, that cross or stand a word's space apart are one line, unless a gap between columns
    runs the whole height of the line between them."""
    changed = True
    while changed:
        changed = False
        for i in range(len(lines)):
            for j in range(i + 1, len(lines)):
                a, b = lines[i], lines[j]
                if a["key"] == b["key"] or not a["xh"] or not b["xh"]:
                    continue
                small, big = sorted((a["xh"], b["xh"]))
                if abs(a["cy"] - b["cy"]) >= 0.5 * big:
                    continue
                if big > 1.3 * small and not (stray_tall_letters(a, b) or stray_bits(a, b)):
                    continue
                A, B = a["box"], b["box"]
                gap = max(A[0], B[0]) - min(A[2], B[2])
                if gap > 0.9 * small:
                    continue
                if gap > -4:
                    g0, g1 = min(A[2], B[2]) - 4, max(A[0], B[0]) + 4
                    top, bottom = max(A[1], B[1]), min(A[3], B[3])
                    if any(g0 <= sg["x"] <= g1 and sg["y0"] <= top and sg["y1"] >= bottom for sg in segs):
                        continue
                keep, drop = (a, b) if a["n"] >= b["n"] else (b, a)
                keep["comps"] = keep["comps"] + drop["comps"]
                finish_line(keep)
                lines.remove(drop)
                changed = True
                break
            if changed:
                break
    return lines


def finish_line(line):
    """A line's box, letter height and middle. "core" is the box of its ordinary letters: a bracket or a
    big opening word can reach above or below the line itself."""
    cs = line["comps"]
    line["box"] = (min(c[0] for c in cs), min(c[1] for c in cs), max(c[2] for c in cs), max(c[3] for c in cs))
    sized = [c[3] - c[1] for c in cs if c[4] >= 12]
    line["xh"] = float(np.median(sized)) if sized else 0.0
    line["cy"] = float(np.median([(c[1] + c[3]) / 2 for c in cs]))
    line["n"] = len(cs)
    ordinary = [c for c in cs if c[4] >= 12 and c[3] - c[1] <= 1.5 * max(line["xh"], 6)] or cs
    line["core"] = (line["box"][0], min(c[1] for c in ordinary), line["box"][2], max(c[3] for c in ordinary))


def find_lines(g, ink):
    """Every printed line on the page, as a piece of one column: its box, letter height and blobs."""
    h, w = ink.shape
    segs = extend_through_notes(join_gutters(extend_ends(barrier_segments(channel_map(ink)), ink), ink), ink)
    lab, comps = components(ink)
    groups = {}
    for c in comps:
        x0, y0, x1, y1, a, _ = c
        if a < 3 or y1 - y0 > 70 or x1 - x0 > 160:
            continue  # specks; frames, rules and ornaments
        groups.setdefault(column_key(segs, (x0 + x1) / 2, (y0 + y1) / 2, w), []).append(c)
    lines = []
    for key, cs in groups.items():
        sized = [c for c in cs if c[4] >= 12 and (c[3] - c[1]) >= 5]
        if not sized:
            continue
        mh = float(np.median([c[3] - c[1] for c in sized]))
        normal = [c for c in sized if 0.5 * mh <= (c[3] - c[1]) <= 1.5 * mh]
        if not normal:
            continue
        normal_ids = {c[5] for c in normal}
        others = [c for c in cs if c[5] not in normal_ids]
        normal.sort(key=lambda c: (c[1] + c[3]) / 2)
        cur = [normal[0]]
        clusters = [cur]
        for c in normal[1:]:
            cy = (c[1] + c[3]) / 2
            if cy - np.median([(d[1] + d[3]) / 2 for d in cur[-12:]]) > max(4.0, 0.45 * mh):
                cur = [c]
                clusters.append(cur)
            else:
                cur.append(c)
        mine = [{"key": key, "comps": cl, "cy": float(np.median([(d[1] + d[3]) / 2 for d in cl]))} for cl in clusters]
        mine.sort(key=lambda l: l["cy"])
        centers = np.array([l["cy"] for l in mine])
        for c in others:
            hh = c[3] - c[1]
            if hh > 1.5 * mh:
                # a big opening word spans lines: it belongs to the first line it reaches. Big letters that
                # reach no line (a page heading) belong to none.
                inside = np.where((centers >= c[1] - 2) & (centers <= c[3] + 2))[0]
                if not len(inside):
                    continue
                k = int(inside[0])
            else:
                k = int(np.argmin(np.abs(centers - (c[1] + c[3]) / 2)))
                if abs(centers[k] - (c[1] + c[3]) / 2) > 1.2 * mh:
                    continue
            mine[k]["comps"].append(c)
        lines.extend(mine)
    for l in lines:
        finish_line(l)
    lines = merge_overlapping([l for l in lines if l["n"] >= 3])
    lines = merge_overlapping(merge_across(lines, segs))
    return lab, lines
