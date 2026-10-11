#!/usr/bin/env python3
"""Copy the website sections the canon lists into that site's collection database.

A website section is a canon edition with `site:` (tools/validate.py): it names the site's
written permission (canon/permissions.yaml) and which part of the site belongs to it. All the
sections resting on one permission go into one database, "rabai-collection-<permission>", read
by the app beside the testing library (web/lib/library/collections.ts). Each article becomes a
title ("Aish.com, Why We Light Candles") and each paragraph a passage, with the article's
address, author and dates kept in the `articles` table (tools/collection_schema.sql).

A WordPress site (`site.from: wordpress`) is read through its own REST interface, far lighter on
the site than loading its pages, in two steps:
1. List each section's articles by number and date of last change only: no text, so a hundred
   at a time is quick for the site. An article in two sections goes to the first one the canon
   lists.
2. Fetch only the articles that are new, or changed since the copy we have, a few at a time.
   When the site struggles (a server error), ask for fewer at once; an article that still fails
   on its own is skipped and tried again on the next run.
Requests go one at a time with a pause, and only to addresses robots.txt allows. An article the
site no longer lists in any section is removed from the copy, unless that is suspiciously many at
once (then --prune).

Nothing here prints an article's text: the GitHub Actions log is public. With --turso the rows
go straight into Turso and nowhere else; the database is private and is never an artifact.

Usage:
  python3 tools/collection_build.py <permission-id> --out PATH   # a trial into a local SQLite file
  python3 tools/collection_build.py <permission-id> --turso      # into Turso (needs TURSO_API_TOKEN)
Options:
  --limit N     fetch at most N articles per section (a trial; the whole collection's size is estimated)
  --minutes N   stop fetching after N minutes; the next run continues where this one stopped
  --full        fetch every article again, not only new and changed ones
  --prune       remove the articles the site no longer lists, even when that is many of them
  --connect     point the app at every collection database (done anyway when one is created)
  --probe       try the listing query's parts one at a time on two sections, printing status codes only
"""

import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import library_build as B  # noqa: E402  (plain(): what the search index sees)
import site_lib as L  # noqa: E402
import validate as V  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LIST_SIZE = 100  # articles per listing request (numbers and dates only)
FETCH_START = 10  # articles per fetch request at first
FETCH_MAX = 25  # ... grown back to at most this many while the site copes
FLUSH_EVERY = 20  # articles per database transaction
GIVE_UP_AFTER = 8  # single articles failing in a row: the site is down, so stop
PRUNE_SHARE = 0.1  # more than this share of the copy gone at once looks like a problem on the site
ARTICLE_FIELDS = "id,link,date_gmt,modified_gmt,title,content,categories,authors,meta.footnotes"
STRUGGLING = {0, 500, 502, 503, 504, 520, 521, 522, 523, 524}  # 0: no answer in time
LABEL = "Private testing library. Not yet approved by the rabbinic board."


def db_name(permission: str) -> str:
    return f"rabai-collection-{permission}"


# ---------------------------------------------------------------------------------------------
# The schema


def schema_statements() -> list[str]:
    """The testing library's tables (made idempotent) and the collection's own."""
    core = (ROOT / "tools" / "library_schema.sql").read_text()
    core = re.sub(r"\bCREATE TABLE (?!IF NOT EXISTS)", "CREATE TABLE IF NOT EXISTS ", core)
    core = re.sub(r"\bCREATE VIRTUAL TABLE (?!IF NOT EXISTS)", "CREATE VIRTUAL TABLE IF NOT EXISTS ", core)
    core = re.sub(r"\bCREATE INDEX (?!IF NOT EXISTS)", "CREATE INDEX IF NOT EXISTS ", core)
    extra = (ROOT / "tools" / "collection_schema.sql").read_text()
    return [s.strip() for s in L.split_sql(core + "\n" + extra) if s.strip()]


# ---------------------------------------------------------------------------------------------
# The canon


def sections_for(permission: str) -> list[dict]:
    """The testing-library editions that are sections of this permission's site, in canon order."""
    vocab = V.load("canon/vocabulary.yaml")
    canon_ids = V.check_canon(vocab, V.load("canon/canon.yaml"))
    barred = V.check_excluded(V.load("canon/excluded.yaml"), canon_ids)
    if V.errors:
        raise SystemExit("validate.py reports problems; fix them first:\n  " + "\n  ".join(V.errors))
    return [e for e in V.testing(canon_ids, barred) if (e.get("site") or {}).get("permission") == permission]


# ---------------------------------------------------------------------------------------------
# WordPress


class SiteError(RuntimeError):
    """The site answered with an error (status 0: it didn't answer in time)."""

    def __init__(self, url: str, status: int, body: bytes):
        self.status = status
        hint = L.error_hint(body)
        what = f"answered HTTP {status}" if status else "didn't answer"
        super().__init__(f"{url} {what}" + (f" ({hint})" if hint else ""))


class WordPress:
    """A WordPress site's REST interface: categories, authors and posts."""

    def __init__(self, polite: L.Polite, home: str):
        self.polite = polite
        self.base = home.rstrip("/") + "/wp-json/wp/v2"
        self._categories: list[dict] | None = None
        self.authors: dict[int, str] = {}

    def get_json(self, path: str, attempts: int = 4) -> tuple[object, dict]:
        status, body, headers = self.polite.get(self.base + path, attempts=attempts)
        if status != 200:
            raise SiteError(self.base + path.split("?")[0], status, body)
        return json.loads(body), headers

    def categories(self) -> list[dict]:
        if self._categories is None:
            out, page = [], 1
            while True:
                batch, headers = self.get_json(f"/categories?per_page=100&page={page}&_fields=id,name,slug,parent")
                out += batch
                if page >= int(L.header(headers, "X-WP-TotalPages") or 1):
                    break
                page += 1
            self._categories = out
        return self._categories

    def resolve(self, slugs: list[str]) -> set[int]:
        """These categories' ids, each with all its subcategories."""
        cats = self.categories()
        by_slug = {c["slug"]: c for c in cats}
        missing = [s for s in slugs if s not in by_slug]
        if missing:
            raise SystemExit(f"These categories aren't on the site (any more): {', '.join(missing)}. Update canon/canon.yaml.")
        ids = {by_slug[s]["id"] for s in slugs}
        frontier = set(ids)
        while frontier:
            frontier = {c["id"] for c in cats if c.get("parent") in frontier} - ids
            ids |= frontier
        return ids

    def path(self, cid: int) -> str:
        """A category's place in the tree, by name: "Ask The Rabbi > Holidays & Shabbat"."""
        by_id = {c["id"]: c for c in self.categories()}
        parts, seen = [], set()
        c = by_id.get(cid)
        while c and c["id"] not in seen:
            seen.add(c["id"])
            parts.append(unescape(c["name"]))
            c = by_id.get(c.get("parent"))
        return " > ".join(reversed(parts))

    def author_names(self, ids: set[int]) -> None:
        """Look up the names of these authors (a taxonomy on Aish.com), a hundred at a time."""
        wanted = sorted(i for i in ids if i not in self.authors)
        for i in range(0, len(wanted), 100):
            chunk = wanted[i : i + 100]
            try:
                batch, _ = self.get_json(f"/authors?include={','.join(map(str, chunk))}&per_page=100&_fields=id,name")
            except SiteError:
                return  # a site without an authors list: the article keeps the site's name
            for a in batch:
                self.authors[a["id"]] = unescape(a.get("name") or "").strip()

    def listing(self, include: set[int], exclude: set[int]) -> tuple[dict[str, str], int]:
        """Every post in these categories but not the excluded ones: ({post id: when it last
        changed (GMT)}, how many were excluded), in id order.

        Only numbers, dates and categories, so a hundred at a time is light for the site. The
        excluded categories are dropped here rather than by the site: Aish.com's server fails that
        filter on a large section. Posts are counted off by `offset`, so the page size can shrink
        if the site struggles without losing place.
        """
        params = {"categories": ",".join(map(str, sorted(include))), "orderby": "id", "order": "asc",
                  "_fields": "id,modified_gmt,categories"}
        found: dict[str, str] = {}
        excluded = 0
        offset, size = 0, LIST_SIZE
        while True:
            params["offset"], params["per_page"] = str(offset), str(size)
            try:
                batch, headers = self.get_json("/posts?" + urllib.parse.urlencode(params, safe=","))
            except SiteError as e:
                if e.status in STRUGGLING and size > 10:
                    size //= 2
                    print(f"  the site struggled listing ({e}); asking for {size} at a time", flush=True)
                    continue
                raise
            for post in batch:
                if exclude & set(post.get("categories") or []):
                    excluded += 1
                else:
                    found[str(post["id"])] = str(post.get("modified_gmt") or "")
            offset += len(batch)
            total = L.header(headers, "X-WP-Total")
            if not batch or (total and total.isdigit() and offset >= int(total)) or (not total and len(batch) < size):
                return found, excluded

    def fetch(self, ids: list[str]) -> list[dict]:
        """These posts in full, by id."""
        params = {"include": ",".join(ids), "per_page": str(len(ids)), "_fields": ARTICLE_FIELDS}
        batch, _ = self.get_json("/posts?" + urllib.parse.urlencode(params, safe=","), attempts=2)
        return batch


def footnotes(meta) -> list[str]:
    """The block editor's footnotes (meta.footnotes, a JSON list), as "Note 1: ..." paragraphs."""
    raw = (meta or {}).get("footnotes") if isinstance(meta, dict) else None
    try:
        notes = json.loads(raw) if isinstance(raw, str) and raw.strip() else []
    except ValueError:
        return []
    out = []
    for n, note in enumerate(notes if isinstance(notes, list) else [], 1):
        text = " ".join(L.paragraphs(note.get("content") or "")) if isinstance(note, dict) else ""
        if text:
            out.append(f"Note {n}: {text}")
    return out


# ---------------------------------------------------------------------------------------------
# Writing articles


class Collection:
    """The rows of one collection database, written in small transactions."""

    def __init__(self, sink: L.Sink, site: str, license: str):
        self.sink = sink
        self.site = site
        self.license = license
        self.pending: list[tuple[str, list]] = []
        self.pending_articles = 0
        self.unsaved: set[str] = set()  # titles whose rows are queued but not yet written
        self.stored: dict[str, dict] = {}  # site's post id -> what the database holds for it
        self.titles: set[str] = set()
        self.no_text: dict[str, str] = {}  # post id -> its date, for posts that had no text to copy

    def load(self) -> None:
        for edition_id, url, site_id, modified, check, title in self.sink.query(
            "SELECT a.edition_id, a.url, a.site_id, a.modified, a.checksum, t.title "
            "FROM articles a JOIN titles t ON t.id = a.title_id"
        ):
            self.stored[str(site_id)] = {"edition_id": edition_id, "url": url, "modified": modified,
                                         "checksum": check, "title": title}
        self.titles = {r[0] for r in self.sink.query("SELECT title FROM titles")}
        self.no_text = json.loads(self.state("no_text") or "{}")

    def work_and_edition(self, section: dict) -> int:
        kinds = section.get("caution_kinds")
        self.sink.batch([(
            "INSERT OR REPLACE INTO works (id, title, category, streams, standing, caution, caution_kinds) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [section["work"], section["title"], section["category"], json.dumps(section["streams"]),
             section.get("standing") or "established", section.get("caution"), json.dumps(kinds) if kinds else None],
        )])
        key = [section["work"], section["edition"]]
        rows = self.sink.query("SELECT id FROM editions WHERE work = ? AND name = ?", key)
        if not rows:
            self.sink.batch([("INSERT INTO editions (work, name, language, approved) VALUES (?, ?, ?, ?)",
                              [section["work"], section["edition"], section["language"], int(bool(section["approved"]))])])
            rows = self.sink.query("SELECT id FROM editions WHERE work = ? AND name = ?", key)
        return rows[0][0]

    def new_title(self, name: str) -> str:
        """A title in the library no other article uses. An article keeps its first title for good,
        so the references people saved keep working."""
        base = f"{self.site}, {name}"
        title, n = base, 2
        while title in self.titles:
            title, n = f"{base} ({n})", n + 1
        self.titles.add(title)
        return title

    def _drop_rows(self, old: dict) -> list[tuple[str, list]]:
        """Statements removing an article's passages (and their search entries)."""
        if old["title"] in self.unsaved:
            self.flush()  # its rows must be in the database to be found
        stmts: list[tuple[str, list]] = []
        for pid, text in self.sink.query(
            "SELECT p.id, p.text FROM passages p JOIN titles t ON t.id = p.title_id WHERE t.title = ?", [old["title"]]
        ):
            stmts.append(("INSERT INTO passages_fts (passages_fts, rowid, plain) VALUES ('delete', ?, ?)", [pid, B.plain(text)]))
        stmts.append(("DELETE FROM passages WHERE title_id = (SELECT id FROM titles WHERE title = ?)", [old["title"]]))
        return stmts

    def put(self, *, url, site_id, name, work, edition_id, categories, author, published, modified, section, paras) -> str:
        """Queue an article's rows. Returns 'new', 'changed' or 'same'."""
        key = str(site_id)
        check = L.checksum([name, url, author or "", section or "", *paras])
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        old = self.stored.get(key)
        if old and old["checksum"] == check and old["edition_id"] == edition_id:
            if old["modified"] != modified:  # changed on the site, but not in anything we copy
                self._queue([("UPDATE articles SET modified = ?, fetched_on = ? WHERE title_id = (SELECT id FROM titles WHERE title = ?)",
                              [modified, now, old["title"]])])
                old["modified"] = modified
            return "same"
        stmts: list[tuple[str, list]] = []
        if old:
            title = old["title"]
            stmts += self._drop_rows(old)
            stmts.append(("UPDATE titles SET work = ?, categories = ? WHERE title = ?", [work, json.dumps(categories), title]))
            if old["url"] != url:
                stmts.append(("DELETE FROM versions WHERE name = ? AND license = ? AND source = ?", [self.site, self.license, old["url"]]))
        else:
            title = self.new_title(name)
            stmts.append(("INSERT INTO titles (title, he_title, work, categories, depth, section_names) VALUES (?, NULL, ?, ?, 1, ?)",
                          [title, work, json.dumps(categories), json.dumps(["Paragraph"])]))
        stmts.append(("INSERT OR IGNORE INTO versions (name, license, source) VALUES (?, ?, ?)", [self.site, self.license, url]))
        title_id = "(SELECT id FROM titles WHERE title = ?)"
        version_id = "(SELECT id FROM versions WHERE name = ? AND license = ? AND source = ?)"
        for n, text in enumerate(paras[:9999], 1):
            ref = f"{title} {n}"
            stmts.append((
                f"INSERT INTO passages (ref, title_id, edition_id, version_id, seq, text) VALUES (?, {title_id}, ?, {version_id}, {title_id} * 10000 + ?, ?)",
                [ref, title, edition_id, self.site, self.license, url, title, n, text],
            ))
            stmts.append(("INSERT INTO passages_fts (rowid, plain) VALUES ((SELECT id FROM passages WHERE ref = ?), ?)", [ref, B.plain(text)]))
        stmts.append((
            f"INSERT OR REPLACE INTO articles (title_id, edition_id, url, site, site_id, author, published, modified, section, fetched_on, checksum) "
            f"VALUES ({title_id}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [title, edition_id, url, self.site, key, author, published, modified, section, now, check],
        ))
        self.stored[key] = {"edition_id": edition_id, "url": url, "modified": modified, "checksum": check, "title": title}
        self.unsaved.add(title)
        self.no_text.pop(key, None)
        self._queue(stmts)
        return "changed" if old else "new"

    def remove(self, key: str) -> None:
        """Queue removing an article the site no longer lists."""
        old = self.stored.pop(key)
        stmts = self._drop_rows(old)
        stmts += [
            ("DELETE FROM articles WHERE title_id = (SELECT id FROM titles WHERE title = ?)", [old["title"]]),
            ("DELETE FROM titles WHERE title = ?", [old["title"]]),
            ("DELETE FROM versions WHERE name = ? AND license = ? AND source = ?", [self.site, self.license, old["url"]]),
        ]
        self.titles.discard(old["title"])
        self._queue(stmts)

    def _queue(self, stmts: list[tuple[str, list]]) -> None:
        self.pending += stmts
        self.pending_articles += 1
        if self.pending_articles >= FLUSH_EVERY:
            self.flush()

    def flush(self) -> None:
        if self.pending:
            self.sink.batch(self.pending)
        self.pending, self.pending_articles, self.unsaved = [], 0, set()

    def state(self, key: str) -> str | None:
        rows = self.sink.query("SELECT value FROM crawl_state WHERE key = ?", [key])
        return rows[0][0] if rows else None

    def set_state(self, key: str, value: str) -> None:
        self.sink.batch([("INSERT OR REPLACE INTO crawl_state (key, value) VALUES (?, ?)", [key, value])])


# ---------------------------------------------------------------------------------------------
# Copying a WordPress site


class Section:
    """One canon section of a WordPress site, with what its listing found."""

    def __init__(self, canon: dict, edition_id: int, wp: WordPress):
        self.canon = canon
        self.edition_id = edition_id
        site = canon["site"]
        self.include = wp.resolve(site["include"])
        self.exclude = wp.resolve(site["exclude"]) if site.get("exclude") else set()
        self.listed: dict[str, str] = {}
        self.mine: list[str] = []  # listed and not taken by an earlier section
        self.to_fetch: list[str] = []
        self.counts = {"listed": 0, "excluded": 0, "in an earlier section": 0, "unchanged": 0, "new": 0, "changed": 0,
                       "same": 0, "no text": 0, "gone": 0, "failed": 0, "not reached": 0}


def plan_section(col: Collection, sec: Section, claimed: dict[str, int], full: bool) -> None:
    """Which of a section's listed articles are its own, and which of those need fetching."""
    for key, modified in sec.listed.items():
        sec.counts["listed"] += 1
        if claimed.setdefault(key, sec.edition_id) != sec.edition_id:
            sec.counts["in an earlier section"] += 1
            continue
        sec.mine.append(key)
        old = col.stored.get(key)
        if full or not old or old["edition_id"] != sec.edition_id or old["modified"] != modified:
            if not full and not old and col.no_text.get(key) == modified:
                sec.counts["no text"] += 1  # nothing to copy last time, and unchanged since
                continue
            sec.to_fetch.append(key)
        else:
            sec.counts["unchanged"] += 1


class Fetcher:
    """Asks for a few articles at a time: fewer when the site struggles, more again when it copes."""

    def __init__(self, wp: WordPress, deadline: float | None):
        self.wp = wp
        self.size = FETCH_START
        self.streak = 0
        self.failing = 0
        self.deadline = deadline
        self.failed: list[str] = []

    def out_of_time(self) -> bool:
        return self.deadline is not None and time.time() > self.deadline

    def batches(self, ids: list[str]):
        """Yield (asked ids, posts the site returned) until done or out of time."""
        i = 0
        while i < len(ids):
            if self.out_of_time():
                return
            chunk = ids[i : i + self.size]
            try:
                posts = self.wp.fetch(chunk)
            except SiteError as e:
                if e.status not in STRUGGLING:
                    raise
                if len(chunk) > 1:
                    self.size = max(1, len(chunk) // 2)
                    self.streak = 0
                    print(f"  the site struggled ({e}); asking for {self.size} at a time", flush=True)
                    continue
                self.failed.append(chunk[0])
                self.failing += 1
                print(f"  post {chunk[0]} failed on its own ({e}); skipped for now", flush=True)
                if self.failing >= GIVE_UP_AFTER:
                    raise SystemExit(f"The site failed {self.failing} times in a row; stopping. Run again later.") from e
                i += 1
                continue
            self.failing = 0
            self.streak += 1
            if self.streak >= 10 and self.size < FETCH_MAX:
                self.size, self.streak = min(FETCH_MAX, self.size * 2), 0
            yield chunk, posts
            i += len(chunk)


def copy_section(col: Collection, wp: WordPress, sec: Section, fetcher: Fetcher, limit: int) -> None:
    """Fetch and write a section's new and changed articles."""
    ids = sec.to_fetch[:limit] if limit else sec.to_fetch
    asked = set(ids)
    done = 0
    for chunk, posts in fetcher.batches(ids):
        wp.author_names({a for post in posts for a in post.get("authors") or [] if isinstance(a, int)})
        returned = set()
        for post in posts:
            key = str(post.get("id"))
            returned.add(key)
            url = post.get("link") or ""
            modified = post.get("modified_gmt") or sec.listed.get(key) or ""
            paras = L.paragraphs((post.get("content") or {}).get("rendered") or "") + footnotes(post.get("meta"))
            if not paras or not url:
                sec.counts["no text"] += 1
                col.no_text[key] = sec.listed.get(key, modified)
                continue
            cats = set(post.get("categories") or [])
            name = L.clean_title((post.get("title") or {}).get("rendered") or "") or f"Article {key}"
            authors = [wp.authors.get(a, "") for a in post.get("authors") or [] if isinstance(a, int)]
            mine = sorted(cats & sec.include, key=lambda c: -len(wp.path(c)))
            path = wp.path(mine[0]) if mine else ""
            result = col.put(
                url=url, site_id=key, name=name, work=sec.canon["work"], edition_id=sec.edition_id,
                categories=[col.site] + [p for p in path.split(" > ") if p],
                author=" and ".join(a for a in authors if a) or None,
                published=post.get("date_gmt"), modified=modified, section=path, paras=paras,
            )
            sec.counts[result] += 1
        sec.counts["gone"] += len(set(chunk) - returned)  # unpublished between listing and fetching
        done += len(chunk)
        if done % 200 < len(chunk):
            print(f"  {done} of {len(ids)} fetched", flush=True)
    col.flush()
    failed = len([k for k in fetcher.failed if k in asked])
    sec.counts["failed"] = failed
    sec.counts["not reached"] = len(ids) - done - failed


def prune(col: Collection, sections: list[Section], claimed: dict[str, int], canon_editions: set[int], force: bool) -> tuple[int, str | None]:
    """Remove stored articles no section lists any more. Returns (removed, why some were kept)."""
    listed_editions = {s.edition_id for s in sections}
    gone = [k for k, old in col.stored.items()
            if k not in claimed and (old["edition_id"] in listed_editions or old["edition_id"] not in canon_editions)]
    if not gone:
        return 0, None
    if not force and len(gone) > max(25, PRUNE_SHARE * len(col.stored)):
        return 0, (f"{len(gone)} copied articles aren't listed on the site any more. That's a lot at once, so they were kept; "
                   "check the site, then run again with --prune to remove them.")
    for key in gone:
        col.remove(key)
    col.flush()
    return len(gone), None


def copy_site(col: Collection, wp: WordPress, canon_sections: list[dict], *, limit: int = 0, minutes: int = 0,
              full: bool = False, prune_all: bool = False) -> dict:
    """List every section, remove what the site dropped, then fetch what's new or changed."""
    started = time.time()
    # 1. List every section: numbers and dates only.
    sections: list[Section] = []
    claimed: dict[str, int] = {}
    canon_editions = set()
    for canon in canon_sections:
        edition_id = col.work_and_edition(canon)
        canon_editions.add(edition_id)
        if canon["site"]["from"] != "wordpress":
            print(f"- {canon['title']}: reading a site's pages is not built yet; skipped")
            continue
        sec = Section(canon, edition_id, wp)
        sec.listed, sec.counts["excluded"] = wp.listing(sec.include, sec.exclude)
        plan_section(col, sec, claimed, full)
        sections.append(sec)
        print(f"- {canon['title']}: {sec.counts['listed']} listed, {len(sec.mine)} its own, {len(sec.to_fetch)} to fetch", flush=True)

    # 2. Remove what the site no longer lists (only when every section was listed).
    removed, kept_note = 0, None
    if all(c["site"]["from"] == "wordpress" for c in canon_sections):
        removed, kept_note = prune(col, sections, claimed, canon_editions, prune_all)

    # 3. Fetch what's new or changed.
    fetcher = Fetcher(wp, started + minutes * 60 if minutes else None)
    for sec in sections:
        if sec.to_fetch and not fetcher.out_of_time():
            print(f"- Fetching {sec.canon['title']}: {len(sec.to_fetch[:limit] if limit else sec.to_fetch)} articles", flush=True)
        copy_section(col, wp, sec, fetcher, limit)
    col.set_state("no_text", json.dumps(col.no_text, sort_keys=True))
    return {"sections": sections, "fetcher": fetcher, "removed": removed, "kept_note": kept_note}


def probe(wp: WordPress, canon_sections: list[dict]) -> None:
    """Try the listing query's parts one at a time on the first two sections, to see which one the
    site can't answer. Prints only status codes, counts and times: no article text."""
    for canon in canon_sections[:2]:
        include = wp.resolve(canon["site"]["include"])
        exclude = wp.resolve(canon["site"]["exclude"]) if canon["site"].get("exclude") else set()
        top = {c["id"] for c in wp.categories() if c["slug"] in canon["site"]["include"]}
        ids = ",".join(map(str, sorted(include)))
        print(f"- {canon['title']}: {len(include)} categories included ({len(top)} named), {len(exclude)} excluded", flush=True)
        tries = [
            ("named categories only", {"categories": ",".join(map(str, sorted(top)))}),
            ("with subcategories", {"categories": ids}),
            ("+ _fields=id,modified_gmt,categories", {"categories": ids, "_fields": "id,modified_gmt,categories"}),
            ("+ orderby=id", {"categories": ids, "_fields": "id,modified_gmt", "orderby": "id", "order": "asc"}),
            ("+ offset=0", {"categories": ids, "_fields": "id,modified_gmt", "offset": "0"}),
            ("+ categories_exclude", {"categories": ids, "_fields": "id,modified_gmt", "categories_exclude": ",".join(map(str, sorted(exclude)))}),
            ("+ orderby=modified", {"categories": ids, "_fields": "id,modified_gmt", "orderby": "modified", "order": "asc"}),
        ]
        for label, params in tries:
            if label == "+ categories_exclude" and not exclude:
                continue
            params = {"per_page": "5", **params}
            start = time.time()
            status, body, headers = wp.polite.get(wp.base + "/posts?" + urllib.parse.urlencode(params, safe=","), attempts=1)
            hint = L.error_hint(body) if status != 200 else ""
            print(f"  {label}: HTTP {status}, total {L.header(headers, 'X-WP-Total')}, {time.time() - start:.1f}s"
                  + (f" ({hint})" if hint else ""), flush=True)


INSPECT_TAGS = ("p", "div", "br", "h2", "h3", "h4", "li", "blockquote", "section", "span")


def shape(path: str, value, depth: int = 0) -> list[str]:
    """Where a post keeps its text, without the text: each field's type and length, and for HTML
    its block tags, the class names on them, and how many paragraphs the copier reads from it."""
    if isinstance(value, dict):
        if depth >= 3:
            return [f"{path}: object with {len(value)} keys"]
        out = [] if not path else [f"{path}: object, keys {', '.join(sorted(map(str, value))[:25])}"]
        for key in sorted(value, key=str):
            out += shape(f"{path}.{key}" if path else str(key), value[key], depth + 1)
        return out
    if isinstance(value, list):
        inner = shape(f"{path}[0]", value[0], depth + 1) if value else []
        return [f"{path}: list of {len(value)}"] + inner[:12]
    if isinstance(value, str):
        if "<" not in value:
            return [f"{path}: text, {len(value)} characters"]
        counts = {t: len(re.findall("<" + t + r"[\s>/]", value)) for t in INSPECT_TAGS}
        tags = ", ".join(f"{t}={n}" for t, n in counts.items())
        classes = sorted({c for c in re.findall(r'class="([^"]{1,60})"', value)})[:12]
        return [f"{path}: HTML, {len(value)} characters; {tags}; paragraphs read: {len(L.paragraphs(value))}",
                f"{path}: classes {classes}"]
    return [f"{path}: {type(value).__name__}"]


def inspect(wp: WordPress, canon_sections: list[dict], which: str) -> None:
    """The shape of the three newest posts in one section, with every field the site sends (no
    `_fields`), to see where an article's text is kept. Prints names, lengths and counts only."""
    canon = next((c for c in canon_sections if which.lower() in f"{c.get('work', '')} {c['title']}".lower()), None)
    if not canon:
        raise SystemExit(f"No section of this site matches '{which}'.")
    include = wp.resolve(canon["site"]["include"])
    params = {"categories": ",".join(map(str, sorted(include))), "per_page": "3"}
    posts, _ = wp.get_json("/posts?" + urllib.parse.urlencode(params, safe=","), attempts=2)
    print(f"- {canon['title']}: the {len(posts)} newest posts, with all their fields", flush=True)
    for n, post in enumerate(posts, 1):
        print(f"  Post {n}:", flush=True)
        for line in shape("", post):
            print(f"    {line}", flush=True)


# ---------------------------------------------------------------------------------------------
# Turso


def turso_sink(permission: str):
    """Find or make the collection's database on Turso, and a write token for this run (masked)."""
    import library_upload as U

    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("Add the TURSO_API_TOKEN secret to the repository first (see web/README.md).")
    U.mask(token)
    org = U.turso_org(token)
    group = U.turso_group(token, org)
    name = db_name(permission)
    base = f"{U.TURSO_API}/organizations/{org}/databases"
    created = False
    try:
        info = U.call("GET", f"{base}/{name}", token)
    except U.ApiError as e:
        if e.status != 404:
            raise
        info = U.call("POST", base, token, {"name": name, "group": group})
        created = True
        time.sleep(5)
    hostname = info["database"]["Hostname"]
    write = U.database_token(token, org, name, "full-access", expiration="1d")
    return L.TursoSink(hostname, write), {"token": token, "org": org, "name": name, "hostname": hostname, "created": created}


def connect_app(turso: dict) -> None:
    """Tell the app where every collection database is (RABAI_COLLECTION_DB_URLS) and redeploy it."""
    import library_upload as U

    vercel = os.environ.get("VERCEL_TOKEN", "").strip()
    if not vercel:
        say("- No VERCEL_TOKEN secret, so the app doesn't know about this collection yet. See web/README.md, \"Collections\".")
        return
    U.mask(vercel)
    dbs = U.call("GET", f"{U.TURSO_API}/organizations/{turso['org']}/databases", turso["token"]).get("databases", [])
    urls = sorted(f"libsql://{d['Hostname']}" for d in dbs if str(d.get("Name", "")).startswith("rabai-collection-"))
    scope = U.set_vercel_env(vercel, {"RABAI_COLLECTION_DB_URLS": ",".join(urls)})
    U.redeploy(vercel, scope)
    say(f"- The app now reads {len(urls)} collection database(s); a redeploy was started.")


def usage_bytes(turso: dict) -> int | None:
    import library_upload as U

    try:
        out = U.call("GET", f"{U.TURSO_API}/organizations/{turso['org']}/databases/{turso['name']}/usage", turso["token"])
        return int(((out.get("database") or {}).get("usage") or {}).get("storage_bytes") or 0)
    except Exception:  # noqa: BLE001 - only a report
        return None


def say(line: str = "") -> None:
    """A line for the log, and for the run's summary page on GitHub."""
    print(line, flush=True)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")


# ---------------------------------------------------------------------------------------------


def option(args: list[str], name: str, default: int = 0) -> int:
    return int(args[args.index(name) + 1]) if name in args else default


def main() -> int:
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__)
        return 2
    started = time.time()
    permission = args[0]
    limit = option(args, "--limit")
    minutes = option(args, "--minutes")
    full = "--full" in args
    canon_sections = sections_for(permission)
    if not canon_sections:
        raise SystemExit(f"The canon lists no website sections for the permission '{permission}'.")
    granted = V.load_permissions()[permission]
    homes = {s["site"]["home"] for s in canon_sections}
    if len(homes) != 1:
        raise SystemExit(f"The sections of '{permission}' name more than one site ({', '.join(sorted(homes))}); give each its own permission.")
    home = homes.pop()
    label = L.site_label(home)
    license = f"Permission ({granted['holder']}, {granted['received']})"

    turso = None
    if "--turso" in args:
        sink, turso = turso_sink(permission)
    elif "--out" in args:
        sink = L.LocalSink(args[args.index("--out") + 1])
    else:
        raise SystemExit("Say where the rows go: --out PATH (a local file) or --turso.")
    for stmt in schema_statements():
        sink.batch([(stmt, [])])

    col = Collection(sink, label, license)
    col.load()
    polite = L.Polite(home)
    wp = WordPress(polite, home)
    if "--probe" in args:
        probe(wp, canon_sections)
        return 0
    if "--inspect" in args:
        inspect(wp, canon_sections, args[args.index("--inspect") + 1])
        return 0
    print(f"# {label}: {len(canon_sections)} sections in the canon; {len(col.stored)} articles already copied; "
          f"pause {polite.pause}s between requests", flush=True)

    run = copy_site(col, wp, canon_sections, limit=limit, minutes=minutes, full=full, prune_all="--prune" in args)
    sections, fetcher = run["sections"], run["fetcher"]
    removed, kept_note = run["removed"], run["kept_note"]

    meta = {
        "label": LABEL,
        "collection": permission,
        "site": label,
        "home": home,
        "ref_prefix": f"{label}, ",
        "holder": granted["holder"],
        "permission_received": str(granted["received"]),
        "public": "true" if granted.get("public") else "false",
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "canon_commit": B.git_commit(),
        "articles": str(sink.query("SELECT COUNT(*) FROM articles")[0][0]),
        "passages": str(sink.query("SELECT COUNT(*) FROM passages")[0][0]),
    }
    sink.batch([("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [k, v]) for k, v in meta.items()])
    text_bytes = sink.query("SELECT COALESCE(SUM(LENGTH(text)), 0) FROM passages")[0][0]
    whole = sum(len(s.mine) for s in sections)

    say(f"\n## {label} collection")
    say(f"- Articles copied: {meta['articles']} of the {whole} the canon's sections list; paragraphs: {meta['passages']}; "
        f"text: {text_bytes / 1e6:.1f} MB")
    say(f"- Requests to the site: {polite.requests}; minutes: {(time.time() - started) / 60:.0f}")
    for sec in sections:
        say(f"- {sec.canon['title']}: " + ", ".join(f"{v} {k}" for k, v in sec.counts.items() if v))
    if removed:
        say(f"- Removed {removed} articles the site no longer lists.")
    if kept_note:
        say(f"- {kept_note}")
    if fetcher.failed:
        say(f"- {len(fetcher.failed)} articles failed on the site and will be tried again next run (post ids: "
            f"{', '.join(fetcher.failed[:30])}{' ...' if len(fetcher.failed) > 30 else ''}).")
    left = sum(s.counts["not reached"] for s in sections)
    if left and not limit:
        say(f"- {left} articles weren't reached in the time allowed; the next run continues with them.")
    if turso:
        size = usage_bytes(turso)
        say(f"- Database: {turso['name']} ({'created now' if turso['created'] else 'updated'})"
            + (f"; storage {size / 1e6:.0f} MB" if size else ""))
        if turso["created"] or "--connect" in args:
            connect_app(turso)
    elif isinstance(sink, L.LocalSink):
        sink.con.execute("INSERT INTO passages_fts (passages_fts) VALUES ('optimize')")
        sink.con.commit()
        sink.con.execute("VACUUM")
        out = Path(args[args.index("--out") + 1])
        copied = int(meta["articles"])
        sink.close()
        size = out.stat().st_size
        say(f"- Local file: {size / 1e6:.1f} MB")
        if copied and whole > copied:
            say(f"- Estimated size with all {whole} articles: about {size * whole / copied / 1e6:.0f} MB "
                f"(from the {copied} copied here)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
