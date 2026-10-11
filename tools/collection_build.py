#!/usr/bin/env python3
"""Copy the website sections the canon lists into that site's collection database.

A website section is a canon edition with `site:` (tools/validate.py): it names the site's
written permission (canon/permissions.yaml) and which part of the site belongs to it. All the
sections resting on one permission go into one database, "rabai-collection-<permission>", read
by the app beside the testing library (web/lib/library/collections.ts). Each article becomes a
title ("Aish.com, Why We Light Candles") and each paragraph a passage, with the article's
address, author and dates kept in the `articles` table (tools/collection_schema.sql).

A WordPress site (`site.from: wordpress`) is read through its own REST interface: whole
articles, a hundred at a time, far lighter on the site than loading its pages. Requests go one
at a time with a pause, and only to addresses robots.txt allows. An article that sits in two
sections goes to the first one the canon lists. The next run reads only what changed since the
last one (unless --full).

Nothing here prints an article's text: the GitHub Actions log is public. With --turso the rows
go straight into Turso and nowhere else; the database is private and is never an artifact.

Usage:
  python3 tools/collection_build.py <permission-id> --out PATH   # a trial into a local SQLite file
  python3 tools/collection_build.py <permission-id> --turso      # into Turso (needs TURSO_API_TOKEN)
Options:
  --limit N     at most N articles per section (a trial)
  --full        read every article again, not only those changed since the last run
"""

import json
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import library_build as B  # noqa: E402  (plain(): what the search index sees)
import site_lib as L  # noqa: E402
import validate as V  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PER_PAGE = 100
FLUSH_EVERY = 20  # articles per database transaction
LABEL = "Private testing library. Not yet approved by the rabbinic board."


def db_name(permission: str) -> str:
    return f"rabai-collection-{permission}"


# ---------------------------------------------------------------------------------------------
# The schema


def schema_statements() -> list[str]:
    """The testing library's tables (made idempotent) and the collection's own."""
    core = (ROOT / "tools" / "library_schema.sql").read_text().replace("-- @indexes", "")
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


class WordPress:
    """A WordPress site's REST interface: categories, authors and posts."""

    def __init__(self, polite: L.Polite, home: str):
        self.polite = polite
        self.base = home.rstrip("/") + "/wp-json/wp/v2"
        self._categories: list[dict] | None = None
        self.authors: dict[int, str] = {}

    def get_json(self, path: str) -> tuple[object, dict]:
        status, body, headers = self.polite.get(self.base + path)
        if status != 200:
            raise RuntimeError(f"{self.base + path.split('?')[0]} answered HTTP {status}")
        return json.loads(body), headers

    def categories(self) -> list[dict]:
        if self._categories is None:
            out, page = [], 1
            while True:
                batch, headers = self.get_json(f"/categories?per_page=100&page={page}&_fields=id,name,slug,parent")
                out += batch
                if page >= int(headers.get("X-WP-TotalPages") or headers.get("x-wp-totalpages") or 1):
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
            except RuntimeError:
                return  # a site without an authors list: the article keeps the site's name
            for a in batch:
                self.authors[a["id"]] = unescape(a.get("name") or "").strip()

    def posts(self, include: set[int], exclude: set[int], after: str | None):
        """Posts in these categories, least recently changed first, each with its page's position."""
        params = {
            "categories": ",".join(map(str, sorted(include))),
            "orderby": "modified",
            "order": "asc",
            "per_page": str(PER_PAGE),
            "_fields": "id,link,date_gmt,modified,modified_gmt,title,content,categories,authors,meta.footnotes",
        }
        if exclude:
            params["categories_exclude"] = ",".join(map(str, sorted(exclude)))
        if after:
            params["modified_after"] = after
        page = 1
        while True:
            params["page"] = str(page)
            query = urllib.parse.urlencode(params, safe=",")
            batch, headers = self.get_json(f"/posts?{query}")
            total_pages = int(headers.get("X-WP-TotalPages") or headers.get("x-wp-totalpages") or 1)
            yield batch, page, total_pages
            if page >= total_pages or not batch:
                return
            page += 1


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
        self.unsaved: list[str] = []  # new articles whose title ids aren't known until the next flush
        self.claimed: dict[str, int] = {}  # article address -> the edition that took it in this run
        self.rank: dict[int, int] = {}  # edition id -> its place in the canon (an article goes to the first)
        self.by_url: dict[str, dict] = {}
        self.titles: set[str] = set()
        self.editions: dict[tuple[str, str], int] = {}

    def load(self) -> None:
        for title_id, url, check, title, edition_id in self.sink.query(
            "SELECT a.title_id, a.url, a.checksum, t.title, "
            "(SELECT p.edition_id FROM passages p WHERE p.title_id = a.title_id LIMIT 1) "
            "FROM articles a JOIN titles t ON t.id = a.title_id"
        ):
            self.by_url[url] = {"title_id": title_id, "checksum": check, "title": title, "edition_id": edition_id}
        self.titles = {r[0] for r in self.sink.query("SELECT title FROM titles")}

    def work_and_edition(self, section: dict) -> int:
        kinds = section.get("caution_kinds")
        self.sink.batch([(
            "INSERT OR REPLACE INTO works (id, title, category, streams, standing, caution, caution_kinds) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [section["work"], section["title"], section["category"], json.dumps(section["streams"]),
             section.get("standing") or "established", section.get("caution"), json.dumps(kinds) if kinds else None],
        )])
        key = (section["work"], section["edition"])
        rows = self.sink.query("SELECT id FROM editions WHERE work = ? AND name = ?", list(key))
        if not rows:
            self.sink.batch([("INSERT INTO editions (work, name, language, approved) VALUES (?, ?, ?, ?)",
                              [section["work"], section["edition"], section["language"], int(bool(section["approved"]))])])
            rows = self.sink.query("SELECT id FROM editions WHERE work = ? AND name = ?", list(key))
        self.editions[key] = rows[0][0]
        return rows[0][0]

    def title_for(self, url: str, name: str) -> str:
        """The article's title in the library: the one it has, or a new one no other article uses."""
        if url in self.by_url:
            return self.by_url[url]["title"]
        base = f"{self.site}, {name}"
        title, n = base, 2
        while title in self.titles:
            title, n = f"{base} ({n})", n + 1
        self.titles.add(title)
        return title

    def put(self, *, url, site_id, name, work, edition_id, categories, author, published, modified, section, paras) -> str:
        """Queue an article's rows. Returns 'new', 'changed' or 'same'."""
        check = L.checksum([name, author or "", section or "", *paras])
        old = self.by_url.get(url)
        if old and old["checksum"] == check and old["edition_id"] == edition_id:
            return "same"
        title = self.title_for(url, name)
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        stmts: list[tuple[str, list]] = []
        if old:
            for pid, text in self.sink.query("SELECT id, text FROM passages WHERE title_id = ?", [old["title_id"]]):
                stmts.append(("INSERT INTO passages_fts (passages_fts, rowid, plain) VALUES ('delete', ?, ?)", [pid, B.plain(text)]))
            stmts.append(("DELETE FROM passages WHERE title_id = ?", [old["title_id"]]))
            stmts.append(("UPDATE titles SET work = ?, categories = ? WHERE id = ?", [work, json.dumps(categories), old["title_id"]]))
        else:
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
            f"INSERT OR REPLACE INTO articles (title_id, url, site, site_id, author, published, modified, section, fetched_on, checksum) "
            f"VALUES ({title_id}, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [title, url, self.site, str(site_id), author, published, modified, section, now, check],
        ))
        self.pending += stmts
        self.pending_articles += 1
        self.by_url[url] = {"title_id": old["title_id"] if old else None, "checksum": check, "title": title, "edition_id": edition_id}
        if not old:
            self.unsaved.append(url)
        if self.pending_articles >= FLUSH_EVERY:
            self.flush()
        return "changed" if old else "new"

    def flush(self) -> None:
        if self.pending:
            self.sink.batch(self.pending)
            # New articles' title ids, for a later change in the same run.
            for url in self.unsaved:
                info = self.by_url[url]
                rows = self.sink.query("SELECT id FROM titles WHERE title = ?", [info["title"]])
                info["title_id"] = rows[0][0] if rows else None
        self.pending, self.pending_articles, self.unsaved = [], 0, []

    def state(self, key: str) -> str | None:
        rows = self.sink.query("SELECT value FROM crawl_state WHERE key = ?", [key])
        return rows[0][0] if rows else None

    def set_state(self, key: str, value: str) -> None:
        self.sink.batch([("INSERT OR REPLACE INTO crawl_state (key, value) VALUES (?, ?)", [key, value])])


def copy_wordpress(col: Collection, wp: WordPress, section: dict, edition_id: int, limit: int, full: bool) -> dict:
    site = section["site"]
    include = wp.resolve(site["include"])
    exclude = wp.resolve(site.get("exclude") or []) if site.get("exclude") else set()
    key = f"{section['work']}|{section['edition']}|modified"
    after = None if full else col.state(key)
    if after:
        # WordPress compares in whole seconds; start one second early so nothing at the same moment is missed.
        try:
            after = (datetime.fromisoformat(after) - timedelta(seconds=1)).isoformat(timespec="seconds")
        except ValueError:
            after = None
    counts = {"new": 0, "changed": 0, "same": 0, "no text": 0, "another section": 0, "excluded": 0}
    seen = 0
    for batch, page, pages in wp.posts(include, exclude, after):
        wp.author_names({a for post in batch for a in post.get("authors") or [] if isinstance(a, int)})
        last = None
        for post in batch:
            last = post.get("modified") or last
            cats = set(post.get("categories") or [])
            if cats & exclude:
                counts["excluded"] += 1
                continue
            url = post.get("link") or ""
            stored = (col.by_url.get(url) or {}).get("edition_id")
            if col.claimed.get(url, edition_id) != edition_id or (
                stored in col.rank and stored != edition_id and col.rank[stored] < col.rank[edition_id]
            ):
                counts["another section"] += 1
                continue
            paras = L.paragraphs((post.get("content") or {}).get("rendered") or "") + footnotes(post.get("meta"))
            if not paras:
                counts["no text"] += 1
                continue
            col.claimed[url] = edition_id
            name = L.clean_title((post.get("title") or {}).get("rendered") or "")
            authors = [wp.authors.get(a, "") for a in post.get("authors") or [] if isinstance(a, int)]
            author = " and ".join(a for a in authors if a) or None
            mine = sorted(cats & include, key=lambda c: -len(wp.path(c)))
            path = wp.path(mine[0]) if mine else ""
            result = col.put(
                url=url, site_id=post.get("id"), name=name, work=section["work"], edition_id=edition_id,
                categories=[col.site] + [p for p in path.split(" > ") if p], author=author,
                published=post.get("date_gmt"), modified=post.get("modified_gmt"), section=path, paras=paras,
            )
            counts[result] += 1
            seen += 1
            if limit and seen >= limit:
                break
        col.flush()
        if last and not limit:
            col.set_state(key, last)
        print(f"  page {page} of {pages}: {sum(counts.values())} articles so far", flush=True)
        if limit and seen >= limit:
            break
    return counts


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
        U.summary("- No VERCEL_TOKEN secret, so the app doesn't know about this collection yet. See web/README.md, \"Collections\".")
        return
    U.mask(vercel)
    dbs = U.call("GET", f"{U.TURSO_API}/organizations/{turso['org']}/databases", turso["token"]).get("databases", [])
    urls = sorted(f"libsql://{d['Hostname']}" for d in dbs if str(d.get("Name", "")).startswith("rabai-collection-"))
    scope = U.set_vercel_env(vercel, {"RABAI_COLLECTION_DB_URLS": ",".join(urls)})
    U.redeploy(vercel, scope)


def usage_bytes(turso: dict) -> int | None:
    import library_upload as U

    try:
        out = U.call("GET", f"{U.TURSO_API}/organizations/{turso['org']}/databases/{turso['name']}/usage", turso["token"])
        return int(((out.get("database") or {}).get("usage") or {}).get("storage_bytes") or 0)
    except Exception:  # noqa: BLE001 - only a report
        return None


# ---------------------------------------------------------------------------------------------


def main() -> int:
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__)
        return 2
    permission = args[0]
    limit = int(args[args.index("--limit") + 1]) if "--limit" in args else 0
    full = "--full" in args
    sections = sections_for(permission)
    if not sections:
        raise SystemExit(f"The canon lists no website sections for the permission '{permission}'.")
    granted = V.load_permissions()[permission]
    homes = {s["site"]["home"] for s in sections}
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
    print(f"# {label}: {len(sections)} sections; {len(col.by_url)} articles already copied; pause {polite.pause}s", flush=True)
    totals = {}
    ids = [col.work_and_edition(section) for section in sections]
    col.rank = {eid: i for i, eid in enumerate(ids)}
    for section, edition_id in zip(sections, ids):
        if section["site"]["from"] != "wordpress":
            print(f"- {section['title']}: reading a site's pages is not built yet; skipped")
            continue
        print(f"- {section['title']} ({section['edition']})", flush=True)
        counts = copy_wordpress(col, wp, section, edition_id, limit, full)
        totals[section["title"]] = counts
        print(f"  {json.dumps(counts)}", flush=True)
    col.flush()

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

    print(f"\n## {label} collection")
    print(f"- Articles: {meta['articles']}; paragraphs: {meta['passages']}; text: {text_bytes / 1e6:.1f} MB")
    print(f"- Requests to the site: {polite.requests}")
    for title, counts in totals.items():
        print(f"- {title}: " + ", ".join(f"{v} {k}" for k, v in counts.items() if v))
    if turso:
        size = usage_bytes(turso)
        print(f"- Database: {turso['name']} ({'created now' if turso['created'] else 'updated'}); storage {size / 1e6:.0f} MB" if size else f"- Database: {turso['name']}")
        if turso["created"] or "--connect" in args:
            connect_app(turso)
    elif isinstance(sink, L.LocalSink):
        sink.con.execute("INSERT INTO passages_fts (passages_fts) VALUES ('optimize')")
        sink.con.commit()
        out = Path(args[args.index("--out") + 1])
        sink.close()
        print(f"- Local file: {out.stat().st_size / 1e6:.0f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
