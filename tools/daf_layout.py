#!/usr/bin/env python3
"""Find where every word of the Bavli sits on the printed Vilna page, for the app's page view.

For each amud, downloads Sefaria's scan of the Romm Vilna printing (1880-86, public domain),
finds the printed lines on it, reads each line, and matches it to the words it holds in the
library's Gemara, Rashi and Tosafot (tools/daflayout/). A tractate is done in order, so a comment
that starts on one page and ends on the next is placed once, where it is printed.

What is kept, per amud, is each printed line's box on the page and the library words it holds
(passage ref and word numbers), never the scan or any text. An amud is "complete" when every word
of its Gemara, Rashi and Tosafot was placed on its page or a neighbor's; the app shows the page
line for line only then.

Needs Tesseract with Hebrew (apt: tesseract-ocr tesseract-ocr-heb python3-tesserocr), the
Rashi-script model (see tools/daflayout/README.md), numpy, scipy, Pillow and rapidfuzz.

Usage:
  python3 tools/daf_layout.py --db library/rabai-library.db --tractate Berakhot [--pages 2a,2b]
        [--out layouts.jsonl] [--store] [--workers 4] [--cache DIR]
  python3 tools/daf_layout.py --turso --shard 3/20 --store     (in GitHub Actions)

--turso reads the text from the library on Turso and --store writes the layouts there, with a
token made from the TURSO_API_TOKEN secret (masked in the log, never printed).
"""

import argparse
import json
import multiprocessing as mp
import os
import re
import signal
import sys
import time
import traceback
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# One thread per worker for the math libraries: the workers already use every core, and a math
# library's thread pool doesn't survive being forked into a worker (the worker then spins forever).
for _var in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_var, "1")

TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))

from daflayout.dups import twins  # noqa: E402
from daflayout.store import LocalDb, TursoDb, save_layouts, tractate_text  # noqa: E402
from daflayout.text import fingerprint, letters, words_of  # noqa: E402

SCANS = "https://storage.googleapis.com/manuscripts.sefaria.org/vilna-romm/"
LISTING = "https://storage.googleapis.com/storage/v1/b/manuscripts.sefaria.org/o"
VERSION = 1
PARTS = ("main", "rashi", "tosafot")
MAX_GUESS = 6  # the most words in a row placed by estimate
DOUBTFUL = 0.5  # a line that reads this little like the words matched to it holds them only by estimate
PAGE_LIMIT = 300  # seconds for one amud; a page that takes longer is reported as failed


def amud_key(a):
    m = re.fullmatch(r"(\d+)([ab])", a)
    return (int(m.group(1)), m.group(2)) if m else (10**6, a)


def scans_for(tractate):
    """The amudim Sefaria has a Vilna scan of, for one tractate."""
    prefix = f"vilna-romm/{tractate.replace(' ', '_')}_"
    found, token = {}, None
    while True:
        q = {"prefix": prefix, "fields": "items(name),nextPageToken", "maxResults": "1000"}
        if token:
            q["pageToken"] = token
        with urllib.request.urlopen(f"{LISTING}?{urllib.parse.urlencode(q)}", timeout=60) as r:
            out = json.loads(r.read().decode())
        for item in out.get("items", []):
            m = re.fullmatch(re.escape(prefix) + r"(\d+[ab])\.jpg", item["name"])
            if m:
                found[m.group(1)] = item["name"].split("/", 1)[1]
        token = out.get("nextPageToken")
        if not token:
            return found


def fetch_scan(name, cache):
    path = Path(cache) / name
    if not path.exists() or path.stat().st_size == 0:
        url = SCANS + urllib.parse.quote(name)
        for attempt in range(4):
            try:
                with urllib.request.urlopen(url, timeout=120) as r:
                    data = r.read()
                break
            except OSError:
                if attempt == 3:
                    raise
                time.sleep(5 * (attempt + 1))
        tmp = path.with_suffix(".part")
        tmp.write_bytes(data)
        tmp.replace(path)
    return path


# ---------------------------------------------------------------------------------------------
# One page (runs in a worker process)

_reader = None


def _init_worker():
    global _reader
    os.environ.setdefault("OMP_THREAD_LIMIT", "1")
    from daflayout.read import Reader
    _reader = Reader()


class PageTooLong(Exception):
    pass


def _too_long(signum, frame):
    raise PageTooLong(f"stopped after {PAGE_LIMIT} seconds")


def heading_of(g, ink, res, choices, amud):
    """The page's heading (tools/daflayout/furniture.py), found above the lines matched to text."""
    import numpy as np
    from daflayout.furniture import find_heading
    from daflayout.scan import components
    tops = [L["box"][1] for part in PARTS for L in res[part]]  # the box of each line's ordinary letters
    xhs = [L["xh"] for L in res["main"] if L["xh"]]
    if not choices or not tops or not xhs:
        return []
    top = min(tops)
    lab, comps = components(ink[: top + 5])
    return find_heading(comps, top, float(np.median(xhs)), choices, lambda blobs: _reader.read_blobs(g, lab, blobs), amud)


def page_task(job):
    from daflayout.match import layout
    from daflayout.scan import find_lines, load
    section, scan, prev, cur, nxt, dup, choices = job
    signal.signal(signal.SIGALRM, _too_long)
    signal.alarm(PAGE_LIMIT)
    try:
        t = time.time()
        g, ink = load(scan)
        lab, lines = find_lines(g, ink)
        _reader.read(g, lab, lines)
        res = layout(lines, prev, cur, nxt, dup)
        try:
            heading = heading_of(g, ink, res, choices, section[-1])
        except Exception as e:  # the heading is extra; a page never fails over it
            print(f"  {section}: no heading ({type(e).__name__}: {e})", flush=True)
            heading = []
        return {"section": section, "size": [int(g.shape[1]), int(g.shape[0])], "parts": res, "heading": heading,
                "seconds": round(time.time() - t, 1)}
    except Exception as e:  # one bad page never stops a tractate
        return {"section": section, "error": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()[-800:]}
    finally:
        signal.alarm(0)


# ---------------------------------------------------------------------------------------------
# A whole tractate


def reconcile(tractate, results, text, twin):
    """Each word placed once, on one line: where two pages (or two lines) claim the same word, the line
    that reads it better keeps it. A few words no line read (a run of up to MAX_GUESS words) go on the
    line of the word beside them in the text, and are marked as estimates. Each page is complete when
    every word of its amud was placed by the reading itself (for a stretch the library has twice, one
    copy is enough), nothing on it is an estimate, and none of its lines lost a word to another line.
    Every word placed, estimates included, is "placed_all": the app shows those pages too, with the
    estimates marked."""
    ok = [r for r in results if "error" not in r]
    claims = {}
    for r in ok:
        for part in PARTS:
            for L in r["parts"][part]:
                for ref, a, b in L["spans"]:
                    for w in range(a, b):
                        claims.setdefault((ref, w), []).append((L["agree"], r["section"] == section_of(ref, tractate), id(L)))
    keep = {k: max(v)[2] for k, v in claims.items()}
    estimated = {k for k, v in claims.items() if len({c[2] for c in v}) > 1}
    where = {}
    for r in ok:
        r["kept"], r["trimmed"] = {}, {part: 0 for part in PARTS}
        for part in PARTS:
            out = []
            for L in r["parts"][part]:
                words, at, xs, tall, big, k = [], {}, iter(L.get("xs") or []), {}, L.get("big") or {}, 0
                for ref, a, b in L["spans"]:
                    for w in range(a, b):
                        x = next(xs, None)
                        if x is not None:
                            at[(ref, w)] = x
                        if k in big or str(k) in big:
                            tall[(ref, w)] = big.get(k, big.get(str(k)))
                        k += 1
                        if keep[(ref, w)] == id(L):
                            words.append((ref, w))
                        else:
                            r["trimmed"][part] += 1
                if words:
                    line = {**L, "words": words, "at": at, "tall": tall}
                    out.append(line)
                    for k in words:
                        where[k] = line
            r["kept"][part] = out

    he = {p["ref"]: p["he"] for a in text.values() for part in PARTS for p in a[part]}
    split = {}

    def word(ref, w):
        if ref not in split:
            split[ref] = words_of(he.get(ref, ""))
        return split[ref][w] if w < len(split[ref]) else ""

    def excused(k):
        return bool(twin.get(k, set()) & where.keys())

    def density(L):
        """Letters per pixel of a line's width: the fuller of two lines has less room for more."""
        return sum(len(letters(word(ref, w))) for ref, w in L["words"]) / max(1, L["box"][2] - L["box"][0])

    done = {r["section"] for r in ok}
    for amud, parts in text.items():
        if f"{tractate} {amud}" not in done:
            continue
        for part in PARTS:
            for p in parts[part]:
                n = len(words_of(p["he"]))
                w = 0
                while w < n:
                    if (p["ref"], w) in where or excused((p["ref"], w)):
                        w += 1
                        continue
                    a = w
                    while w < n and (p["ref"], w) not in where and not excused((p["ref"], w)):
                        w += 1
                    if w - a > MAX_GUESS:
                        continue
                    before, after = where.get((p["ref"], a - 1)), where.get((p["ref"], w))
                    run = [(p["ref"], x) for x in range(a, w)]
                    if before is not None and (after is None or after is before or density(before) <= density(after)):
                        line, at = before, before["words"].index((p["ref"], a - 1)) + 1
                    elif after is not None:
                        line, at = after, after["words"].index((p["ref"], w))
                    else:
                        continue
                    line["words"][at:at] = run
                    for k in run:
                        where[k] = line
                        estimated.add(k)

    # A line whose reading is far from the words matched to it (the scan was hard to read there, or the
    # match went wrong): its words are only estimates.
    doubtful = {}
    for r in ok:
        doubtful[r["section"]] = {part: 0 for part in PARTS}
        for part in PARTS:
            for L in r["kept"][part]:
                if L["agree"] < DOUBTFUL and sum(len(letters(word(ref, w))) for ref, w in L["words"]) >= 8:
                    doubtful[r["section"]][part] += 1
                    estimated.update(L["words"])

    records = []
    for r in ok:
        amud = r["section"].rsplit(" ", 1)[1]
        missing = {part: sum(1 for p in text[amud][part] for w in range(len(words_of(p["he"])))
                             if (p["ref"], w) not in where and not excused((p["ref"], w))) for part in PARTS}
        refs = sorted({ref for part in PARTS for L in r["kept"][part] for ref, _ in L["words"]})
        index = {ref: i for i, ref in enumerate(refs)}
        lines, guesses = {}, []
        for part in PARTS:
            lines[part] = []
            for L in r["kept"][part]:
                flat = []
                for ref, w in L["words"]:
                    if flat and flat[-3] == index[ref] and flat[-1] == w:
                        flat[-1] = w + 1
                    else:
                        flat += [index[ref], w, w + 1]
                    if (ref, w) in estimated:
                        if guesses and guesses[-3] == index[ref] and guesses[-1] == w:
                            guesses[-1] = w + 1
                        else:
                            guesses += [index[ref], w, w + 1]
                row = [*L["box"], L["xh"], flat]
                # where each word is printed on the line, when the scan showed every one of them
                xs = [L["at"].get(k) for k in L["words"]]
                if xs and all(xs):
                    row.append([v for x in xs for v in x])
                    # words printed larger than the line: [word number on the line, top, bottom, ...]
                    tall = [v for i, k in enumerate(L["words"]) if k in L["tall"] for v in (i, *L["tall"][k])]
                    if tall:
                        row.append(tall)
                lines[part].append(row)
        placed_all = not any(missing.values())
        records.append({
            "v": VERSION,
            "section": r["section"],
            "tractate": tractate,
            "scan": r["scan"],
            "size": r["size"],
            "refs": refs,
            "checks": [fingerprint(words_of(he[ref])) for ref in refs],
            "lines": lines,
            "heading": r.get("heading", []),
            "estimated": guesses,
            "missing": missing,
            "trimmed": r["trimmed"],
            "doubtful": doubtful[r["section"]],
            "placed_all": placed_all,
            "complete": placed_all and not guesses and not any(r["trimmed"].values()),
        })
    return records


def section_of(ref, tractate):
    """'Rashi on Berakhot 2a:3:1' -> 'Berakhot 2a'."""
    m = re.search(re.escape(tractate) + r" (\d+[ab])", ref)
    return f"{tractate} {m.group(1)}" if m else ""


def chapters_of(tractate):
    """The tractate's Hebrew name and its chapters, [(number, Hebrew name, first amud, last amud)], from
    Sefaria's index of it (amudim counted 2a = 4, 2b = 5, ...). None when the index can't be had."""
    try:
        import sefaria_lib
        record = sefaria_lib.schema(tractate)
    except Exception:
        return None
    if not record:
        return None
    out = []
    for node in record.get("alts", {}).get("Chapters", {}).get("nodes", []):
        m = re.search(r" (\d+)([ab])(?::[\d]+)?(?:-(?:(\d+)([ab]))?(?::?\d+)?)?$", node.get("wholeRef", ""))
        if not m or not node.get("heTitle") or not node.get("numeric_equivalent"):
            continue
        first = 2 * int(m.group(1)) + (m.group(2) == "b")
        last = 2 * int(m.group(3)) + (m.group(4) == "b") if m.group(3) else first
        out.append((int(node["numeric_equivalent"]), node["heTitle"], first, last))
    return record.get("heTitle"), out


def heading_choices(chapters, amud):
    """The headings an amud can have (furniture.expected), from chapters_of."""
    from daflayout.furniture import expected
    if not chapters or not chapters[0]:
        return []
    he, chs = chapters
    daf, side = amud_key(amud)
    k = 2 * daf + (side == "b")
    return expected(he, [(n, name) for n, name, a, b in chs if a <= k <= b], daf, side)


def run_tractate(tractate, db, pool, cache, pages=None):
    text = tractate_text(db, tractate)
    chapters = chapters_of(tractate)
    scans = scans_for(tractate)
    order = sorted((a for a in text if a in scans and text[a]["main"]), key=amud_key)
    if pages:
        order = [a for a in order if a in pages]
    keys = sorted(text, key=amud_key)
    twin = {}
    dup = {}
    for part in ("rashi", "tosafot"):
        tw = twins([p for a in keys for p in text[a][part]])
        twin.update(tw)
        dup[part] = set(tw)
    jobs = []
    for a in order:
        k = keys.index(a)
        prev = text[keys[k - 1]] if k > 0 else None
        nxt = text[keys[k + 1]] if k + 1 < len(keys) else None
        path = fetch_scan(scans[a], cache)
        near = {part: {w for w in dup[part] if section_of(w[0], tractate) in {f"{tractate} {x}" for x in keys[max(0, k - 1):k + 2]}}
                for part in dup}
        jobs.append((f"{tractate} {a}", str(path), prev, text[a], nxt, near, heading_choices(chapters, a)))
    results = []
    for res in pool.imap(page_task, jobs, chunksize=1):
        res["scan"] = scans[res["section"].rsplit(" ", 1)[1]]
        if "error" in res:
            print(f"  {res['section']}: FAILED {res['error']}", flush=True)
        results.append(res)
    records = reconcile(tractate, results, text, twin)
    failed = [r["section"] for r in results if "error" in r]
    return records, failed


# ---------------------------------------------------------------------------------------------


def turso_connection(write):
    """The library on Turso, with a database token made from TURSO_API_TOKEN (masked, never printed)."""
    import library_upload as U

    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("TURSO_API_TOKEN is not set.")
    U.mask(token)
    org = U.turso_org(token)
    info = U.call("GET", f"{U.TURSO_API}/organizations/{org}/databases/{U.DB_NAME}", token)
    hostname = info["database"]["Hostname"]
    db_token = U.database_token(token, org, U.DB_NAME, "full-access" if write else "read-only", expiration="1d")
    return TursoDb(hostname, db_token)


def shard_of(tractates, db, shard):
    """Split the tractates into n groups of about equal length; return group i (1-based)."""
    i, n = (int(x) for x in shard.split("/"))
    sizes = {t: db.all("SELECT count(*) FROM passages p JOIN titles t ON t.id = p.title_id WHERE t.title = ?", [t])[0][0] for t in tractates}
    groups = [[] for _ in range(n)]
    load = [0] * n
    for t in sorted(tractates, key=lambda t: -int(sizes[t])):
        k = load.index(min(load))
        groups[k].append(t)
        load[k] += int(sizes[t])
    return groups[i - 1]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--db", help="a local library file (library/rabai-library.db)")
    ap.add_argument("--turso", action="store_true", help="read the library on Turso")
    ap.add_argument("--tractate", action="append", default=[], help="a tractate, or several separated by commas")
    ap.add_argument("--shard", help="i/n: this run's share of all the tractates")
    ap.add_argument("--pages", help="only these amudim, like 2a,2b (for testing)")
    ap.add_argument("--out", help="also write the layouts to this JSON-lines file")
    ap.add_argument("--store", action="store_true", help="save the layouts in the library (table daf_layout)")
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 2)
    ap.add_argument("--cache", default=str(Path.home() / ".cache" / "rabai-vilna"), help="where scans are downloaded")
    args = ap.parse_args()
    if bool(args.db) == bool(args.turso):
        raise SystemExit("Say where the library is: --db PATH or --turso.")
    db = turso_connection(args.store) if args.turso else LocalDb(args.db)
    bavli = [r[0] for r in db.all("SELECT title FROM titles WHERE work = 'talmud-bavli' ORDER BY id")]
    asked = [t.strip() for a in args.tractate for t in a.split(",") if t.strip()]
    tractates = asked or bavli
    unknown = [t for t in tractates if t not in bavli]
    if unknown:
        raise SystemExit(f"Not tractates of the Bavli in this library: {', '.join(unknown)}")
    if args.shard:
        tractates = shard_of(tractates, db, args.shard)
        print(f"Shard {args.shard}: {', '.join(tractates) or 'nothing to do'}", flush=True)
    pages = set(args.pages.split(",")) if args.pages else None
    Path(args.cache).mkdir(parents=True, exist_ok=True)
    made_on = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out = open(args.out, "a", encoding="utf-8") if args.out else None
    summary, broken = [], []
    with mp.Pool(args.workers, initializer=_init_worker) as pool:
        for tractate in tractates:
            t0 = time.time()
            print(f"{tractate}…", flush=True)
            try:
                records, failed = run_tractate(tractate, db, pool, args.cache, pages)
            except Exception as e:  # one tractate never stops the others
                line = f"{tractate}: FAILED ({type(e).__name__}: {str(e)[:200]})"
                print(line, flush=True)
                summary.append(line)
                broken.append(tractate)
                continue
            if out:
                for rec in records:
                    out.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")
                out.flush()
            if args.store and records:
                save_layouts(db, records, made_on)
            done = sum(r["complete"] for r in records)
            line = (f"{tractate}: {len(records)} amudim, {done} complete, {len(failed)} failed "
                    f"({(time.time() - t0) / 60:.1f} min)")
            print(line, flush=True)
            summary.append(line)
    if out:
        out.close()
    step = os.environ.get("GITHUB_STEP_SUMMARY")
    if step and summary:
        with open(step, "a", encoding="utf-8") as f:
            f.write(f"## Printed-page layouts{f' (shard {args.shard})' if args.shard else ''}\n" + "".join(f"- {s}\n" for s in summary))
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
