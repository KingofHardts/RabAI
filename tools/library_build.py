#!/usr/bin/env python3
"""Build the private testing library as one SQLite file: library/rabai-library.db.

Reads library/plan.json (from tools/library_plan.py), downloads each planned Sefaria file
(cached), and writes:

  passages      one row per passage (a verse, a line of Gemara, a seif...) per edition, with
                its Sefaria-style reference, the text, and which version and license it came from
  passages_fts  a full-text index over the passages, with Hebrew vowels and cantillation removed
  links         Sefaria's cross-references between passages, kept only where both ends are in
                this library (Rashi -> the verse, the Gemara -> the Mishnah, and so on)
  lexicon       the headwords of the dictionaries (Jastrow, Radak's Sefer HaShorashim), each
                entry stored as a passage ("Jastrow, אָב II") and linked to the lines it cites

Within one edition, a title's listed versions are merged passage by passage: the first listed
version that has a passage supplies it, and the row records which version that was.

Every passage belongs to the private testing library and is not yet approved by the board.
The app must say so whenever it shows one.

Usage: python3 tools/library_build.py [--out PATH] [--no-links]
"""

import concurrent.futures as cf
import csv
import html
import io
import json
import re
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sefaria_lib as S  # noqa: E402

PLAN = S.ROOT / "library" / "plan.json"
DEFAULT_OUT = S.ROOT / "library" / "rabai-library.db"
LINK_FILES = [f"links/links{i}.csv" for i in range(17)]
LABEL = "Private testing library. Not yet approved by the rabbinic board."

_SCHEMA = (S.ROOT / "tools" / "library_schema.sql").read_text()
SCHEMA_SQL, INDEX_SQL = _SCHEMA.split("-- @indexes")

# ---------------------------------------------------------------------------------------------
# Text cleaning

FOOTNOTE_RE = re.compile(r'<sup[^>]*class="footnote-marker"[^>]*>.*?</sup>\s*<i[^>]*class="footnote"[^>]*>.*?</i>', re.S)
FOOTNOTE_I_RE = re.compile(r'<i[^>]*class="footnote"[^>]*>.*?</i>', re.S)
SUP_RE = re.compile(r"<sup[^>]*>.*?</sup>", re.S)
BR_RE = re.compile(r"<br\s*/?>", re.I)
TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"[ \t ]+")
BIDI_RE = re.compile(r"[\u200e\u200f\u202a-\u202e\u2066-\u2069]")
HEBREW_MARKS_RE = re.compile(r"[֑-ׇֽֿׁׂׅׄ]")
HEBREW_SPACERS_RE = re.compile(r"[־׀׃׳״]")


def clean(text: str) -> str:
    """Sefaria text as plain reading text: no HTML, no translator footnotes."""
    text = FOOTNOTE_RE.sub("", text)
    text = FOOTNOTE_I_RE.sub("", text)
    text = SUP_RE.sub("", text)
    text = BR_RE.sub("\n", text)
    text = TAG_RE.sub("", text)
    text = html.unescape(text)
    text = BIDI_RE.sub("", text)
    text = SPACE_RE.sub(" ", text)
    return "\n".join(line.strip() for line in text.split("\n")).strip()


ANGLE_SPAN_RE = re.compile(r"<[^<>]*>")
EMPTY_STOP_RE = re.compile(r"([.:;,])(\s*[.:;,])+")


def strip_angle(text: str) -> str | None:
    """Remove an editor's additions set in angle brackets (canon: strip_brackets: angle).

    Only innermost, well-formed spans are removed. If any bracket is left over, the passage can't be
    separated cleanly and None is returned, so it is left out rather than quoted with the editor's words.
    """
    out = ANGLE_SPAN_RE.sub("", text)
    if "<" in out or ">" in out:
        return None
    out = EMPTY_STOP_RE.sub(r"\1", out)
    out = SPACE_RE.sub(" ", out)
    out = re.sub(r" +([.:;,])", r"\1", out)
    out = "\n".join(line.strip() for line in out.split("\n")).strip()
    return out or None


def plain(text: str) -> str:
    """What the search index sees: no vowels or cantillation, maqaf and sof pasuq as spaces."""
    text = HEBREW_SPACERS_RE.sub(" ", text)
    text = HEBREW_MARKS_RE.sub("", text)
    return text.lower()


# ---------------------------------------------------------------------------------------------
# References, as Sefaria writes them ("Genesis 1:1", "Berakhot 2a:3", "Tanya, Part I; ... 1:1")

UNKNOWN_ADDRESS_TYPES: dict = {}


def address(kind: str, i: int, offset: int = 0) -> str:
    if kind == "Talmud":
        n = i + offset
        return f"{n // 2 + 1}{'ab'[n % 2]}"
    if kind == "Folio":
        n = i + offset
        return f"{n // 4 + 1}{'abcd'[n % 4]}"
    if kind not in ("Integer", "Perek", "Pasuk", "Mishnah", "Halakhah", "Siman", "Seif", "Volume",
                    "Chapter", "Verse", "Paragraph", "Section", "Line", "Daf", "Year", "Aliyah",
                    "Parasha", "Piska", "Amud", "Gate", "Letter", "Book", "Psalm", "Midrash",
                    "Teshuva", "Part", "Halacha", "SeifKatan"):
        UNKNOWN_ADDRESS_TYPES[kind] = UNKNOWN_ADDRESS_TYPES.get(kind, 0) + 1
    return str(i + 1 + offset)


def offset_for(offsets, depth: int, parents: list) -> int:
    """index_offsets_by_depth: {"2": [o0, o1, ...], "3": [[...], ...]} (depth 1 has none)."""
    if not offsets:
        return 0
    value = offsets.get(str(depth))
    for p in parents:
        if not isinstance(value, list) or p >= len(value):
            return 0
        value = value[p]
    return value if isinstance(value, int) else 0


def walk_jagged(node: dict, text, prefix: str, out: list) -> None:
    """Append (ref, raw text) for every passage under a jagged-array node."""
    kinds = node.get("addressTypes") or ["Integer"] * int(node.get("depth") or 1)
    offsets = node.get("index_offsets_by_depth")

    def rec(value, depth, parents, parts):
        if isinstance(value, str):
            if value.strip():
                ref = prefix + (" " + ":".join(parts) if parts else "")
                out.append((ref, value))
            return
        if not isinstance(value, list):
            return
        kind = kinds[min(depth - 1, len(kinds) - 1)]
        for i, child in enumerate(value):
            part = address(kind, i, offset_for(offsets, depth, parents))
            rec(child, depth + 1, parents + [i], parts + [part])

    rec(text, 1, [], [])


def node_title(node: dict) -> str:
    if node.get("title"):
        return node["title"]
    for t in node.get("titles") or []:
        if t.get("lang") == "en" and t.get("primary"):
            return t["text"]
    return node.get("key") or ""


def walk_schema(node: dict, text, prefix: str, out: list, top: bool) -> None:
    if node.get("nodes"):
        if not isinstance(text, dict):
            return
        for child in node["nodes"]:
            name = "" if child.get("default") else node_title(child)
            sub = text.get(name)
            if sub is None and child.get("key") in text:
                sub = text.get(child["key"])
            if sub is None:
                continue
            child_prefix = prefix if child.get("default") else f"{prefix}, {name}"
            walk_schema(child, sub, child_prefix, out, False)
        return
    if node.get("nodeType", "JaggedArrayNode") == "JaggedArrayNode" or "depth" in node:
        walk_jagged(node, text, prefix, out)


def passages_of(title: str, data: dict, index: dict | None) -> list:
    """[(ref, raw text)] for one version file of a title, in reading order."""
    out: list = []
    text = data.get("text")
    node = (index or {}).get("schema")
    if node:
        walk_schema(node, text, title, out, True)
    elif isinstance(text, list):
        depth = len(data.get("sectionNames") or []) or 1
        kinds = ["Talmud" if n == "Daf" else "Integer" for n in data.get("sectionNames") or ["Integer"] * depth]
        walk_jagged({"depth": depth, "addressTypes": kinds}, text, title, out)
    return out


# ---------------------------------------------------------------------------------------------
# Dictionaries

# A dictionary's book title in the library and its Hebrew name.
LEXICON_TITLES = {
    "Jastrow Dictionary": ("Jastrow", "מילון יאסטרוב"),
    "Sefer HaShorashim": ("Sefer HaShorashim", "ספר השרשים"),
}
NON_HEBREW_RE = re.compile(r"[^א-ת ]+")


def lexicon_title(name: str) -> tuple:
    return LEXICON_TITLES.get(name, (name, name))


def headword_forms(entry: dict) -> list:
    """The forms a word in a text may take for this entry: the headword, its alternates and
    plural, without vowels, numbering (אָב II) or punctuation."""
    forms = [entry.get("headword") or ""]
    for key in ("alt_headwords", "plural_form"):
        value = entry.get(key)
        if isinstance(value, str):
            forms.append(value)
        elif isinstance(value, list):
            forms += [v for v in value if isinstance(v, str)]
    out = []
    for f in forms:
        word = NON_HEBREW_RE.sub(" ", plain(clean(f))).strip()
        word = re.sub(r"\s+", " ", word)
        if word and word not in out:
            out.append(word)
    return out


def entry_text(entry: dict) -> str:
    """One dictionary entry as reading text: the headword, its forms, then every sense."""
    parts = [entry.get("headword") or ""]
    alts = entry.get("alt_headwords")
    if alts:
        parts.append("(also " + ", ".join(a for a in (alts if isinstance(alts, list) else [alts]) if isinstance(a, str)) + ")")
    for key in ("language_code", "language_reference"):
        if isinstance(entry.get(key), str):
            parts.append(entry[key])

    def walk(value):
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, list):
            for v in value:
                walk(v)
        elif isinstance(value, dict):
            if isinstance(value.get("number"), (str, int)):
                parts.append(f"{value['number']})")
            for k, v in value.items():
                if k != "number":
                    walk(v)

    walk(entry.get("content"))
    return clean(" ".join(p for p in parts if p))


def dictionary_ref(ref: str, lexicon_titles: set) -> str:
    """'Jastrow, תְּפִלָּה 1' (a sense) -> 'Jastrow, תְּפִלָּה' (the entry)."""
    title = ref.split(",", 1)[0]
    return re.sub(r" \d+$", "", ref) if title in lexicon_titles else ref


# ---------------------------------------------------------------------------------------------
# Links

def link_start(ref: str) -> str:
    """The first passage of a reference or range: 'Exodus 1:1-6:1' -> 'Exodus 1:1'."""
    ref = ref.strip()
    m = re.match(r"^(.*?)\s([\d]+[ab]?(?::\d+[ab]?)*)(?:-[\d:ab]+)?$", ref)
    return f"{m.group(1)} {m.group(2)}" if m else ref


def first_passage(ref: str, refs: set):
    """A section reference ('Deuteronomy 23', 'Chullin 89b') points at its first passage."""
    for _ in range(3):
        if ref in refs:
            return ref
        ref = ref + (":1" if re.search(r"\d[ab]?$", ref) else " 1")
    return None


def load_links(con: sqlite3.Connection, titles: set, refs: set) -> int:
    count = 0
    seen = set()
    for name in LINK_FILES:
        raw = S.fetch(S.export_url(name)).decode("utf-8", "replace")
        for row in csv.reader(io.StringIO(raw)):
            if len(row) < 5 or row[0] == "Citation 1":
                continue
            if row[3] not in titles or row[4] not in titles:
                continue
            a, b = first_passage(link_start(row[0]), refs), first_passage(link_start(row[1]), refs)
            if not a or not b or (a, b) in seen:
                continue
            seen.add((a, b))
            con.execute("INSERT INTO links (a, b, kind) VALUES (?, ?, ?)", (a, b, row[2] or None))
            count += 1
        print(f"  {name}: {count} links so far", file=sys.stderr)
    return count


# ---------------------------------------------------------------------------------------------

def git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=S.ROOT, text=True).strip()
    except Exception:
        return "unknown"


def work_row(item: dict) -> tuple:
    """A works row: the work's standing and, for a debated work, its caution (canon)."""
    kinds = item.get("caution_kinds")
    return (
        item["work"], item["work_title"], item["category"], json.dumps(item["streams"]),
        item.get("standing") or "established", item.get("caution"), json.dumps(kinds) if kinds else None,
    )


def main() -> int:
    out_path = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else DEFAULT_OUT
    plan = json.loads(PLAN.read_text())
    lexicon_items = [item for item in plan if item.get("lexicon")]
    plan = [item for item in plan if not item.get("lexicon")]
    files = sorted({f["file"] for item in plan for f in item["files"]})
    print(f"Downloading {len(files)} files (cached)…", file=sys.stderr)
    started = time.time()
    with cf.ThreadPoolExecutor(12) as ex:
        list(ex.map(lambda name: (S.CACHE / "files" / name).exists() or S.download(name), files))
    print(f"  done in {time.time() - started:.0f}s", file=sys.stderr)

    titles_needed = sorted({item["title"] for item in plan})
    with cf.ThreadPoolExecutor(12) as ex:
        indexes = dict(zip(titles_needed, ex.map(S.schema, titles_needed)))

    tmp = out_path.with_suffix(".building")
    tmp.unlink(missing_ok=True)
    con = sqlite3.connect(tmp)
    con.executescript("PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF; PRAGMA page_size = 4096;")
    con.executescript(SCHEMA_SQL)

    work_rows, edition_ids, title_ids, version_ids = {}, {}, {}, {}
    stripped_out: dict = {}
    all_refs: set = set()
    seq = 0
    total = 0
    for item in plan:
        work_rows[item["work"]] = work_row(item)
        ekey = (item["work"], item["edition"])
        if ekey not in edition_ids:
            cur = con.execute(
                "INSERT INTO editions (work, name, language, approved) VALUES (?, ?, ?, ?)",
                (item["work"], item["edition"], item["language"], int(bool(item["approved"]))),
            )
            edition_ids[ekey] = cur.lastrowid
        index = indexes.get(item["title"]) or {}
        if item["title"] not in title_ids:
            cur = con.execute(
                "INSERT INTO titles (title, he_title, work, categories, depth, section_names) VALUES (?, ?, ?, ?, ?, ?)",
                (item["title"], index.get("heTitle"), item["work"], json.dumps(item["categories"]),
                 index.get("depth"), json.dumps(index.get("sectionNames"))),
            )
            title_ids[item["title"]] = cur.lastrowid

        merged: dict = {}
        order: list = []
        for f in item["files"]:
            vkey = (f["version"], f["license"], f["source"])
            if vkey not in version_ids:
                cur = con.execute("INSERT INTO versions (name, license, source) VALUES (?, ?, ?)", vkey)
                version_ids[vkey] = cur.lastrowid
            data = S.download(f["file"])
            for ref, raw in passages_of(item["title"], data, index):
                if ref in merged:
                    continue
                text = clean(raw)
                if text and item.get("strip_brackets") == "angle":
                    text = strip_angle(text)
                    if text is None:
                        stripped_out[item["work"]] = stripped_out.get(item["work"], 0) + 1
                        continue
                if not text:
                    continue
                merged[ref] = (text, version_ids[vkey])
                order.append(ref)
        if item.get("vowels_only"):
            # Only the vowels for another edition's words: kept apart from the passages, so it is
            # never searched or quoted.
            con.executemany("INSERT OR IGNORE INTO vowels (ref, version_id, text) VALUES (?, ?, ?)",
                            [(ref, merged[ref][1], merged[ref][0]) for ref in order])
            continue
        for ref in order:
            text, vid = merged[ref]
            seq += 1
            cur = con.execute(
                "INSERT INTO passages (ref, title_id, edition_id, version_id, seq, text) VALUES (?, ?, ?, ?, ?, ?)",
                (ref, title_ids[item["title"]], edition_ids[ekey], vid, seq, text),
            )
            con.execute("INSERT INTO passages_fts (rowid, plain) VALUES (?, ?)", (cur.lastrowid, plain(text)))
            all_refs.add(ref)
        total += len(order)
    # Dictionaries: each entry is a passage, its forms go in the lexicon table, and the lines it
    # cites are linked to it once every text is loaded.
    dictionary_links = []
    if lexicon_items:
        names = {item["lexicon"] for item in lexicon_items}
        print(f"Reading dictionaries: {', '.join(sorted(names))}…", file=sys.stderr)
        entries, records = S.lexicon_entries(names)
        for item in lexicon_items:
            name = item["lexicon"]
            title, he_title = lexicon_title(name)
            work_rows[item["work"]] = work_row(item)
            cur = con.execute(
                "INSERT INTO editions (work, name, language, approved, word_tool) VALUES (?, ?, ?, ?, ?)",
                (item["work"], item["edition"], item["language"], int(bool(item["approved"])), int(bool(item.get("word_tool_only")))),
            )
            edition_id = cur.lastrowid
            edition_ids[(item["work"], item["edition"])] = edition_id
            cur = con.execute(
                "INSERT INTO titles (title, he_title, work, categories, depth, section_names) VALUES (?, ?, ?, ?, ?, ?)",
                (title, he_title, item["work"], json.dumps(["Reference", "Dictionary"]), 1, json.dumps(["Entry"])),
            )
            title_ids[title] = cur.lastrowid
            record = records.get(name, {})
            vkey = (record.get("version_title") or name, item["license"], "Sefaria dictionary data")
            if vkey not in version_ids:
                version_ids[vkey] = con.execute("INSERT INTO versions (name, license, source) VALUES (?, ?, ?)", vkey).lastrowid
            count = 0
            for entry in entries.get(name, []):
                headword = (entry.get("headword") or "").strip()
                text = entry_text(entry)
                ref = f"{title}, {headword}"
                if not headword or not text or ref in all_refs:
                    continue
                seq += 1
                cur = con.execute(
                    "INSERT INTO passages (ref, title_id, edition_id, version_id, seq, text) VALUES (?, ?, ?, ?, ?, ?)",
                    (ref, title_ids[title], edition_id, version_ids[vkey], seq, text),
                )
                con.execute("INSERT INTO passages_fts (rowid, plain) VALUES (?, ?)", (cur.lastrowid, plain(text)))
                con.executemany("INSERT INTO lexicon (word, passage_id) VALUES (?, ?)",
                                [(w, cur.lastrowid) for w in headword_forms(entry)])
                all_refs.add(ref)
                dictionary_links += [(ref, r) for r in entry.get("refs") or [] if isinstance(r, str)]
                count += 1
            total += count
            print(f"  {title}: {count} entries", file=sys.stderr)

    con.executemany(
        "INSERT INTO works (id, title, category, streams, standing, caution, caution_kinds) VALUES (?, ?, ?, ?, ?, ?, ?)",
        list(work_rows.values()),
    )
    for work, count in sorted(stripped_out.items()):
        print(f"  {work}: left out {count} passages whose editor's additions couldn't be separated", file=sys.stderr)
    con.commit()
    print(f"Passages: {total} in {len(title_ids)} titles, {len(edition_ids)} editions", file=sys.stderr)
    if UNKNOWN_ADDRESS_TYPES:
        print(f"Address types read as numbers: {UNKNOWN_ADDRESS_TYPES}", file=sys.stderr)

    links = 0
    if "--no-links" not in sys.argv:
        print("Reading Sefaria's links…", file=sys.stderr)
        links = load_links(con, set(title_ids), all_refs)
    lexicon_titles = {lexicon_title(item["lexicon"])[0] for item in lexicon_items}
    seen = set()
    for entry_ref, cited in dictionary_links:
        target = first_passage(link_start(dictionary_ref(cited, lexicon_titles)), all_refs)
        if target and target != entry_ref and (entry_ref, target) not in seen:
            seen.add((entry_ref, target))
            con.execute("INSERT INTO links (a, b, kind) VALUES (?, ?, 'dictionary')", (entry_ref, target))
    links += len(seen)
    print(f"Dictionary links: {len(seen)}", file=sys.stderr)
    con.executescript(INDEX_SQL)

    try:
        export_date = S.fetch(S.EXPORT + "last_export.txt").decode().strip()
    except Exception:
        export_date = "unknown"
    meta = {
        "label": LABEL,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "canon_commit": git_commit(),
        "sefaria_export": export_date,
        "passages": str(total),
        "links": str(links),
        "titles": str(len(title_ids)),
        "editions": str(len(edition_ids)),
    }
    con.executemany("INSERT INTO meta VALUES (?, ?)", list(meta.items()))
    con.commit()
    con.execute("INSERT INTO passages_fts (passages_fts) VALUES ('optimize')")
    con.commit()
    con.execute("VACUUM")
    # Turso imports a SQLite file only in WAL mode with 4096-byte pages and no auto-vacuum.
    con.execute("PRAGMA journal_mode = WAL")
    con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    con.close()
    tmp.replace(out_path)
    print(f"Wrote {out_path} ({out_path.stat().st_size / 1e6:.0f} MB): {json.dumps(meta)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
