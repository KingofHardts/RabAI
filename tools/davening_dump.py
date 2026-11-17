#!/usr/bin/env python3
"""Save the siddurim's sections from the live app to a file on the runner, for the davening audit.

Run by the "Check today's davening" workflow. It opens the live app with its access code (read
from Vercel and masked, as tools/health_check.py does), reads each siddur's sections through
/api/contents and /api/text (bare), and writes them to the path given (the runner's own disk,
never uploaded or printed). It prints only counts.
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

BOOKS = ["The Koren Shalem Siddur; Ashkenaz", "Siddur Ashkenaz", "Siddur Sefard", "Siddur Edot HaMizrach"]


def main() -> int:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "davening-dump"
    os.makedirs(out_dir, exist_ok=True)
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
            with opener.open(req, timeout=120) as resp:
                return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    status, _ = fetch("/api/unlock", {"code": code})
    if status != 200:
        print(f"The access code didn't open the app (HTTP {status}).")
        return 1
    for book in BOOKS:
        status, raw = fetch("/api/contents?book=" + urllib.parse.quote(book))
        sections = (json.loads(raw).get("sections") or []) if status == 200 else []
        dump: dict[str, list] = {}
        failed = 0
        for s in sections:
            st, body = fetch("/api/text?bare=1&ref=" + urllib.parse.quote(s))
            try:
                lines = json.loads(body).get("lines") or [] if st == 200 else []
            except ValueError:
                lines = []
            if not lines:
                failed += 1
                continue
            dump[s] = [{"ref": l.get("ref", ""), "he": l.get("he", ""), "en": l.get("en", "")} for l in lines]
        path = os.path.join(out_dir, book.replace(" ", "_").replace(";", "") + ".json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(dump, f, ensure_ascii=False)
        print(f"{book}: {len(dump)} sections read, {failed} couldn't be read")
    return 0


if __name__ == "__main__":
    sys.exit(main())
