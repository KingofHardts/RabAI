"""Aligning a line's reading to the library's text, letter by letter.

Tesseract confuses letters that look alike in print (ד and ר, ב and כ, ה ח and ת, ו ז י and נ...),
so those substitutions cost less than others.
"""

import numpy as np

CONFUSABLE = ["דר", "בכ", "החת", "וזינ", "סםמ", "טש", "עצ", "גנ", "כך", "פף", "צץ", "נן", "ךן"]


def cost_table():
    letters = [chr(c) for c in range(ord("א"), ord("ת") + 1)]
    idx = {ch: i for i, ch in enumerate(letters)}
    C = np.ones((len(letters) + 1, len(letters) + 1), np.float32)
    np.fill_diagonal(C, 0)
    for group in CONFUSABLE:
        for a in group:
            for b in group:
                if a != b:
                    C[idx[a], idx[b]] = 0.6
    return idx, C


IDX, COST = cost_table()


def codes(s):
    return np.array([IDX.get(ch, len(IDX)) for ch in s], dtype=np.int32)


def align(q, t, gap=1.0):
    """Map each letter of q to a letter of t (free to skip text at both ends of t). Returns an array
    of t positions, -1 where q's letter has no partner."""
    n, m = len(q), len(t)
    if n == 0 or m == 0:
        return np.full(n, -1)
    qc, tc = codes(q), codes(t)
    D = np.zeros((n + 1, m + 1), np.float32)
    P = np.zeros((n + 1, m + 1), np.int8)  # 0 diagonal, 1 up (skip a letter of q), 2 left (skip one of t)
    D[1:, 0] = np.arange(1, n + 1) * gap
    P[1:, 0] = 1
    ar = np.arange(m + 1, dtype=np.float32) * gap
    for i in range(1, n + 1):
        diag = D[i - 1, :-1] + COST[qc[i - 1], tc]
        up = D[i - 1, 1:] + gap
        T = np.empty(m + 1, np.float32)
        T[0] = D[i - 1, 0] + gap
        T[1:] = np.minimum(diag, up)
        pt = np.empty(m + 1, np.int8)
        pt[0] = 1
        pt[1:] = np.where(diag <= up, 0, 1)
        run = np.minimum.accumulate(T - ar) + ar  # skipping letters of t (left moves)
        D[i] = run
        P[i] = np.where(run < T - 1e-6, 2, pt)
    j, i = int(np.argmin(D[n])), n
    out = np.full(n, -1)
    while i > 0:
        p = 1 if j == 0 else P[i, j]
        if p == 0:
            out[i - 1] = j - 1
            i -= 1
            j -= 1
        elif p == 1:
            i -= 1
        else:
            j -= 1
    return out


def candidates(q, t, top=3, max_cost=0.5, gap=1.0):
    """The best places in t where q could sit, as (start, end, cost per letter), best first and not
    overlapping. The Gemara repeats itself, so a line can have more than one."""
    n, m = len(q), len(t)
    if n == 0 or m == 0:
        return []
    qc, tc = codes(q), codes(t)
    D = np.zeros((n + 1, m + 1), np.float32)
    S = np.zeros((n + 1, m + 1), np.int32)  # where in t the best path to here started
    S[0] = np.arange(m + 1)
    D[1:, 0] = np.arange(1, n + 1) * gap
    ar = np.arange(m + 1, dtype=np.float32) * gap
    idx = np.arange(m + 1)
    for i in range(1, n + 1):
        diag = D[i - 1, :-1] + COST[qc[i - 1], tc]
        up = D[i - 1, 1:] + gap
        T = np.empty(m + 1, np.float32)
        T[0] = D[i - 1, 0] + gap
        T[1:] = np.minimum(diag, up)
        st = np.empty(m + 1, np.int32)
        st[0] = S[i - 1, 0]
        st[1:] = np.where(diag <= up, S[i - 1, :-1], S[i - 1, 1:])
        v = T - ar
        acc = np.minimum.accumulate(v)
        src = np.maximum.accumulate(np.where(v <= acc + 1e-6, idx, 0))
        D[i] = acc + ar
        S[i] = st[src]
    last = D[n] / n
    out = []
    for j in np.argsort(last):
        c = float(last[j])
        if c > max_cost or len(out) >= top:
            break
        s = int(S[n, j])
        if any(not (j <= a or s >= b) for a, b, _ in out):
            continue
        out.append((s, int(j), c))
    return out


def prefix_costs(q, t, gap=1.0):
    """The cost of reading q as t[:j], for every j: all of q is used, t starts at 0 and may stop anywhere."""
    n, m = len(q), len(t)
    ar = np.arange(m + 1, dtype=np.float32) * gap
    if n == 0:
        return ar.copy()
    if m == 0:
        return np.array([n * gap], np.float32)
    qc, tc = codes(q), codes(t)
    prev = ar.copy()
    for i in range(1, n + 1):
        T = np.empty(m + 1, np.float32)
        T[0] = prev[0] + gap
        T[1:] = np.minimum(prev[:-1] + COST[qc[i - 1], tc], prev[1:] + gap)
        prev = np.minimum.accumulate(T - ar) + ar
    return prev
