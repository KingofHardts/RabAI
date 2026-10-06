"""Shared helpers for reading Sefaria's public export (storage.googleapis.com/sefaria-export).

Used by the library plan and build tools. Reading the export decides nothing: canon.yaml and
the rabbinic board decide what enters the library, and each file's own license is checked
before it is used.

Downloads are cached under /library/sefaria-cache/ (gitignored, like all texts).
"""

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "library" / "sefaria-cache"
EXPORT = "https://storage.googleapis.com/sefaria-export/"
LIST_API = "https://storage.googleapis.com/storage/v1/b/sefaria-export/o"
HEADERS = {"User-Agent": "RabAI-library (https://github.com/KingofHardts/RabAI)"}

# Folder names the export uses for each edition language.
LANG_DIRS = {"he": "Hebrew", "en": "English"}
# What a file's actualLanguage may be for an edition in each language. Aramaic texts
# (Talmud, Targum) are filed under Hebrew.
ACTUAL_LANGUAGES = {"he": {"he", "arc"}, "en": {"en"}}

# Licenses (normalized) that allow private, non-commercial testing. Same list as validate.py.
OPEN_LICENSES = {"publicdomain", "pd", "cc0", "ccby", "ccbysa", "ccbync", "ccbyncsa"}


def norm_license(value) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def license_open(value) -> bool:
    return norm_license(value) in OPEN_LICENSES


def key(text: str) -> str:
    """A loose key for comparing titles and version names with file and folder names.
    The export drops some punctuation (":" and parentheses) from names."""
    return re.sub(r"[\W_]+", "", str(text).lower())


def fetch(url: str, *, headers: dict | None = None, attempts: int = 6, timeout: int = 120) -> bytes:
    last = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={**HEADERS, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise
            last = e
        except Exception as e:  # network hiccups through the proxy
            last = e
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"could not fetch {url}: {last}")


def export_url(name: str) -> str:
    return EXPORT + urllib.parse.quote(name)


def list_export(refresh: bool = False) -> list:
    """Every file under json/ in the export: [{name, size}]."""
    path = CACHE / "listing.json"
    if path.exists() and not refresh:
        return json.loads(path.read_text())
    items, token = [], None
    while True:
        query = {"prefix": "json/", "fields": "items(name,size),nextPageToken", "maxResults": "1000"}
        if token:
            query["pageToken"] = token
        page = json.loads(fetch(LIST_API + "?" + urllib.parse.urlencode(query)))
        items += [{"name": i["name"], "size": int(i["size"])} for i in page.get("items", [])]
        token = page.get("nextPageToken")
        if not token:
            break
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items))
    return items


def table_of_contents(refresh: bool = False) -> list:
    """Every title in Sefaria's table of contents: [{title, cats}]."""
    path = CACHE / "table_of_contents.json"
    if path.exists() and not refresh:
        toc = json.loads(path.read_text())
    else:
        toc = json.loads(fetch(EXPORT + "table_of_contents.json"))
        CACHE.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(toc))
    books: list = []

    def walk(nodes):
        for node in nodes:
            if "contents" in node:
                walk(node["contents"])
            elif node.get("title"):
                books.append({"title": node["title"], "cats": node.get("categories") or []})

    walk(toc)
    return books


def matches(spec: dict, book: dict) -> bool:
    """Whether a table-of-contents title belongs to a canon work, by the work's `sefaria`
    matchers: re (title pattern), not (title pattern to leave out), root (first category),
    cat (exact category paths), under (category path prefixes)."""
    if not spec:
        return False
    cats, title = book["cats"], book["title"]
    if spec.get("root") and (not cats or cats[0] != spec["root"]):
        return False
    if spec.get("cat") and not any(cats == list(p) for p in spec["cat"]):
        return False
    if spec.get("under") and not any(cats[: len(p)] == list(p) for p in spec["under"]):
        return False
    if spec.get("re") and not re.search(spec["re"], title):
        return False
    if spec.get("not") and re.search(spec["not"], title):
        return False
    return bool(spec.get("re") or spec.get("cat") or spec.get("under"))


def folder_index(listing: list) -> dict:
    """(categories..., title folder) -> {language folder: {version key: {name, size, file}}}"""
    index: dict = {}
    for item in listing:
        parts = item["name"].split("/")
        if len(parts) < 4 or parts[-1] == "merged.json":
            continue
        folder = tuple(parts[1:-2])
        stem = parts[-1][: -len(".json")]
        index.setdefault(folder, {}).setdefault(parts[-2], {})[key(stem)] = {
            "file": item["name"],
            "size": item["size"],
            "stem": stem,
        }
    return index


def folder_for(book: dict, index: dict, by_title: dict):
    """Find a title's folder in the export (titles drop ':' and parentheses there)."""
    want = tuple(book["cats"]) + (re.sub(r"[:()]", "", book["title"]),)
    if want in index:
        return want
    loose = [f for f in by_title.get(key(book["title"]), []) if list(f[:-1]) == book["cats"]]
    if len(loose) == 1:
        return loose[0]
    any_cat = by_title.get(key(book["title"]), [])
    return any_cat[0] if len(any_cat) == 1 else None


def titles_by_key(index: dict) -> dict:
    out: dict = {}
    for folder in index:
        out.setdefault(key(folder[-1]), []).append(folder)
    return out


def read_header(name: str) -> dict:
    """The metadata at the top of a version file (license, versionTitle, notes), read with a
    small range request so the whole text is not downloaded."""
    raw = fetch(export_url(name), headers={"Range": "bytes=0-6143"}).decode("utf-8", "replace")
    out = {}
    for field in ("license", "versionTitle", "versionSource", "actualLanguage", "language", "versionNotes"):
        m = re.search(r'"%s":\s*"((?:[^"\\]|\\.)*)"' % field, raw)
        out[field] = json.loads('"' + m.group(1) + '"') if m else None
    return out


def download(name: str) -> dict:
    """A whole version file, cached."""
    path = CACHE / "files" / name
    if not path.exists():
        data = fetch(export_url(name))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return json.loads(path.read_text(encoding="utf-8"))


def schema_names(refresh: bool = False) -> dict:
    """key(title) -> file name of every index record under schemas/ (spaces become '_')."""
    path = CACHE / "schema_listing.json"
    if path.exists() and not refresh:
        names = json.loads(path.read_text())
    else:
        names, token = [], None
        while True:
            query = {"prefix": "schemas/", "fields": "items(name),nextPageToken", "maxResults": "1000"}
            if token:
                query["pageToken"] = token
            page = json.loads(fetch(LIST_API + "?" + urllib.parse.urlencode(query)))
            names += [i["name"] for i in page.get("items", [])]
            token = page.get("nextPageToken")
            if not token:
                break
        CACHE.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(names))
    return {key(n[len("schemas/"):-len(".json")]): n for n in names if n.endswith(".json")}


_SCHEMA_NAMES: dict = {}


def schema(title: str) -> dict | None:
    """A title's full index record (schema with address types), cached."""
    if not _SCHEMA_NAMES:
        _SCHEMA_NAMES.update(schema_names())
    name = _SCHEMA_NAMES.get(key(title))
    if not name:
        return None
    path = CACHE / name
    if not path.exists():
        data = fetch(export_url(name))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    record = json.loads(path.read_text(encoding="utf-8"))
    return record if key(record.get("title", "")) == key(title) else None


# ---------------------------------------------------------------------------------------------
# Dictionaries (Jastrow, Radak's Sefer HaShorashim, ...)
#
# Sefaria keeps its dictionaries in its database, not in the text export. Its public database
# backup holds them in two collections, `lexicon` (one record per dictionary) and
# `lexicon_entry` (one record per headword). Only those two files are read from the backup.

MONGO_DUMP = "https://storage.googleapis.com/sefaria-mongo-backup/dump_small.tar.gz"
LEXICON_FILES = ("lexicon.bson", "lexicon_entry.bson")


def _fetch_lexicon_files() -> None:
    import tarfile

    folder = CACHE / "mongo"
    folder.mkdir(parents=True, exist_ok=True)
    last = None
    for attempt in range(4):
        found = set()
        try:
            req = urllib.request.Request(MONGO_DUMP, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=300) as resp, tarfile.open(fileobj=resp, mode="r|gz") as tar:
                for member in tar:
                    name = member.name.rsplit("/", 1)[-1]
                    if name in LEXICON_FILES and member.isfile():
                        data = tar.extractfile(member).read()
                        (folder / (name + ".part")).write_bytes(data)
                        (folder / (name + ".part")).replace(folder / name)
                        found.add(name)
                        if found == set(LEXICON_FILES):
                            return
            last = RuntimeError(f"the backup did not contain {sorted(set(LEXICON_FILES) - found)}")
        except Exception as e:  # network hiccups through the proxy
            last = e
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"could not read the dictionaries from Sefaria's backup: {last}")


def lexicon_entries(names: set, refresh: bool = False) -> tuple[dict, dict]:
    """Every entry of the named dictionaries, and each dictionary's own record.

    Returns ({dictionary name: [entry, ...]}, {dictionary name: record}). Needs the `bson`
    module (pip install pymongo).
    """
    from bson import decode_file_iter

    folder = CACHE / "mongo"
    if refresh or not all((folder / f).exists() for f in LEXICON_FILES):
        _fetch_lexicon_files()
    records = {}
    with open(folder / "lexicon.bson", "rb") as f:
        for d in decode_file_iter(f):
            if d.get("name") in names:
                d.pop("_id", None)
                records[d["name"]] = d
    entries: dict = {n: [] for n in names}
    with open(folder / "lexicon_entry.bson", "rb") as f:
        for d in decode_file_iter(f):
            if d.get("parent_lexicon") in names:
                d.pop("_id", None)
                entries[d["parent_lexicon"]].append(d)
    return entries, records
