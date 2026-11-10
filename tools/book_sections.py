#!/usr/bin/env python3
"""Print a book's sections in the order the live app lists them (its table of contents).

Run by the "List a book's sections" workflow. It opens the live app with its access code (read
from Vercel and masked, as tools/health_check.py does) and asks /api/contents for each book. Only
section names are printed: headings, never a line of any text, and never a code or token.
"""
from __future__ import annotations

import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import health_check as hc  # noqa: E402


def main() -> int:
    books = [b.strip() for b in os.environ.get("BOOKS", "").split("|") if b.strip()]
    if not books:
        print("No books named (BOOKS, separated by |).")
        return 1
    by_name, project_id, scope = hc.vercel_settings()
    code = hc.setting_value(by_name, "RABAI_ACCESS_CODE", project_id, scope) if project_id else None
    if not code:
        print("The access code couldn't be read, so the app wasn't opened.")
        return 1
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def fetch(path: str, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(hc.APP + path, data=data, method="POST" if body is not None else "GET")
        if body is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with opener.open(req, timeout=90) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    status, _ = fetch("/api/unlock", {"code": code})
    if status != 200:
        print(f"The access code didn't open the app (HTTP {status}).")
        return 1
    if os.environ.get("LIBRARY_LIST") == "1":
        # The library's list of books as the Learn tab receives it: titles and categories only.
        status, raw = fetch("/api/library")
        print(f"\n## The library list (HTTP {status})")
        try:
            listing = json.loads(raw)
        except ValueError:
            listing = {}
        for b in listing.get("sections") or []:
            print("BOOK " + json.dumps([b.get("section"), b.get("sectionHe"), b.get("workTitle"), b.get("categories"), b.get("order")], ensure_ascii=False))
        for sh in listing.get("articleShelves") or []:
            print("SHELF " + json.dumps({k: v for k, v in sh.items() if k in ("site", "title", "name", "count", "section", "work")}, ensure_ascii=False))
    for book in books:
        status, raw = fetch("/api/contents?book=" + urllib.parse.quote(book))
        print(f"\n## {book} (HTTP {status})")
        try:
            sections = json.loads(raw).get("sections") or []
        except ValueError:
            sections = []
        prefix = book + ", "
        if os.environ.get("SIZES") != "1":
            for i, s in enumerate(sections, 1):
                name = s[len(prefix):] if isinstance(s, str) and s.startswith(prefix) else s
                print(f"{i}. {hc.plain(name)}")
            continue
        # How much text the book holds, and which editions it is read from: counts and edition
        # names only, never a line of the text. Used to plan a translation run.
        total = {"sections": 0, "lines": 0, "hebrew": 0, "english": 0, "words": 0}
        parts: dict[str, list[int]] = {}
        he_editions: dict[str, int] = {}
        en_editions: dict[str, int] = {}
        failed = 0
        for sec in sections:
            if not isinstance(sec, str):
                continue
            st, body = fetch("/api/text?bare=1&ref=" + urllib.parse.quote(sec))
            try:
                got = json.loads(body) if st == 200 else {}
            except ValueError:
                got = {}
            lines = got.get("lines") or []
            if not lines:
                failed += 1
                continue
            he = sum(1 for ln in lines if (ln.get("he") or "").strip())
            en = sum(1 for ln in lines if (ln.get("en") or "").strip())
            words = sum(len((ln.get("he") or "").split()) for ln in lines)
            total["sections"] += 1
            total["lines"] += len(lines)
            total["hebrew"] += he
            total["english"] += en
            total["words"] += words
            name = sec[len(prefix):] if sec.startswith(prefix) else sec
            part = ", ".join(name.split(", ")[:2])
            row = parts.setdefault(part, [0, 0, 0, 0])
            row[0] += len(lines)
            row[1] += he
            row[2] += en
            row[3] += words
            ed = got.get("edition") or {}
            if ed.get("he"):
                he_editions[ed["he"]] = he_editions.get(ed["he"], 0) + 1
            if ed.get("en"):
                en_editions[ed["en"]] = en_editions.get(ed["en"], 0) + 1
        print(f"- {total['sections']} sections read ({failed} couldn't be), {total['lines']:,} lines: {total['hebrew']:,} with Hebrew "
              f"({total['words']:,} Hebrew words), {total['english']:,} with English.")
        print("- Hebrew read from: " + ("; ".join(f"{hc.plain(k)} ({v} sections)" for k, v in sorted(he_editions.items(), key=lambda x: -x[1])) or "nothing"))
        print("- English read from: " + ("; ".join(f"{hc.plain(k)} ({v} sections)" for k, v in sorted(en_editions.items(), key=lambda x: -x[1])) or "nothing"))
        for part, (n, he, en, words) in parts.items():
            print(f"  - {hc.plain(part)}: {n:,} lines, {he:,} Hebrew ({words:,} words), {en:,} English")
    return 0


if __name__ == "__main__":
    sys.exit(main())
