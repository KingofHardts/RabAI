"""Stretches of a commentary that the library has twice.

Sefaria's Tosafot sometimes carries a comment twice: once on its own, and again appended to the
comment before it (Tosafot on Berakhot 42b:1:1 holds its own two lines and then all 400 words of
42b:7:1). The page prints the words once. So a stretch of 12 or more words found in two different
passages is marked: the matcher may pass over one copy freely, and a word whose twin is placed on
a page counts as placed.

Only the commentaries are checked. The Gemara really does repeat itself (parallel passages), and
its text is clean.
"""

from collections import defaultdict

from .text import letters, words_of

RUN = 12


def twins(passages, run=RUN):
    """{(ref, word): {(ref, word), ...}} for words in a stretch of `run` or more words that appears in
    another passage too. `passages`: the commentary's passages in reading order, [{"ref", "he"}]."""
    words = [(p["ref"], i, letters(w)) for p in passages for i, w in enumerate(words_of(p["he"]))]
    starts = defaultdict(list)
    for k in range(len(words) - run + 1):
        starts[tuple(w[2] for w in words[k:k + run])].append(k)
    out = defaultdict(set)
    for ks in starts.values():
        if len(ks) < 2 or len({words[k][0] for k in ks}) < 2:
            continue
        for a in ks:
            for b in ks:
                if words[a][0] == words[b][0]:
                    continue
                for j in range(run):
                    out[words[a + j][:2]].add(words[b + j][:2])
    return dict(out)
