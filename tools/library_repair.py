#!/usr/bin/env python3
"""Correct named books in the testing library in place, after a fix to how the build cleans text.

Run by the "Repair text in the library" workflow, after tools/library_plan.py has written
library/plan.json. For each book named (TITLES, separated by |), it reads the same Sefaria files
the build reads, cleans them with the build's own clean() (tools/library_build.py), and compares
each passage with the library's copy. A passage whose cleaned text differs is updated, with its
search entry, but only when REPAIR=write; otherwise it is a trial that prints counts.

This changes rows in place, so the library stays what a full rebuild from the same canon would
make, without a rebuild (each rebuild adds storage on Turso that stays). It prints counts and
references only, never a line of text, and masks the token it makes.

  TURSO_API_TOKEN   required. A Turso Platform API token (repo secret).
  TURSO_ORG         optional.
  TITLES            the books, separated by |, or * for every book in the plan
  LANGUAGE          optional: only editions in this language (en or he); with TITLES=* it is en
  REPAIR            "write" to update; anything else is a trial.
"""
from __future__ import annotations

import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import library_build as B  # noqa: E402
import library_upload as U  # noqa: E402
import sefaria_lib as S  # noqa: E402


def say(line: str) -> None:
    print(line, flush=True)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")


def expected(item: dict) -> dict:
    """ref -> cleaned text for one plan item, merged the way the build merges versions."""
    index = {}
    try:
        index = S.schema(item["title"]) or {}
    except Exception:  # noqa: BLE001 - the build uses the same schema when it has one
        index = {}
    merged: dict = {}
    for f in item["files"]:
        data = S.download(f["file"])
        for ref, raw in B.passages_of(item["title"], data, index):
            if ref in merged:
                continue
            text = B.clean(raw)
            if text and item.get("strip_brackets") == "angle":
                text = B.strip_angle(text)
                if text is None:
                    continue
            if text:
                merged[ref] = text
    return merged


def main() -> int:
    titles = [t.strip() for t in os.environ.get("TITLES", "").split("|") if t.strip()]
    language = os.environ.get("LANGUAGE", "").strip() or ("en" if titles == ["*"] else "")
    write = os.environ.get("REPAIR") == "write"
    token = os.environ.get("TURSO_API_TOKEN")
    if not titles or not token:
        say("Name the books (TITLES) and give TURSO_API_TOKEN.")
        return 1
    plan = json.loads((S.ROOT / "library" / "plan.json").read_text())
    if titles == ["*"]:
        titles = sorted({i["title"] for i in plan if i.get("title") and not i.get("lexicon") and (not language or i.get("language") == language)})
    org = os.environ.get("TURSO_ORG") or U.turso_org(token)
    info = U.call("GET", f"{U.TURSO_API}/organizations/{org}/databases/{U.DB_NAME}", token)
    host = info["database"]["Hostname"]
    print(f"::add-mask::{host}", flush=True)
    db_token = U.database_token(token, org, U.DB_NAME, "full-access" if write else "read-only", "1d")
    U.mask(db_token)

    def run(stmts: list) -> list:
        body = {"requests": [{"type": "execute", "stmt": s} for s in stmts] + [{"type": "close"}]}
        out = U.call("POST", f"https://{host}/v2/pipeline", db_token, body)
        results = out.get("results", [])
        for r in results[:-1]:
            if r.get("type") != "ok":
                raise SystemExit(f"The library refused a statement: {str(r.get('error'))[:200]}")
        return results

    def arg(v):
        return {"type": "integer", "value": str(v)} if isinstance(v, int) else {"type": "text", "value": v}

    say(f"## Repairing {len(titles)} book(s) {'(writing)' if write else '(trial: nothing is changed)'}")
    total_changed = 0
    for title in titles:
        items = [i for i in plan if i.get("title") == title and not i.get("lexicon") and not i.get("vowels_only") and (not language or i.get("language") == language)]
        if not items:
            say(f"- {title}: not in the plan.")
            continue
        for item in items:
            want = expected(item)
            res = run([{
                "sql": "SELECT p.id, p.ref, p.text FROM passages p JOIN titles t ON t.id = p.title_id "
                       "JOIN editions e ON e.id = p.edition_id WHERE t.title = ? AND e.name = ?",
                "args": [arg(title), arg(item["edition"])],
            }])
            rows = res[0]["response"]["result"]["rows"]
            have = {r[1]["value"]: (int(r[0]["value"]), r[2]["value"]) for r in rows}
            changed = [(ref, have[ref][0], have[ref][1], want[ref]) for ref in have if ref in want and want[ref] != have[ref][1]]
            missing = sum(1 for ref in have if ref not in want)
            # With every book, only the ones that change are listed.
            if changed or len(titles) <= 20:
                say(f"- {title} ({item['edition']}): {len(have)} passages in the library, {len(changed)} differ from the "
                    f"cleaned source, {missing} not found in the source.")
            total_changed += len(changed)
            if not write or not changed:
                continue
            for k in range(0, len(changed), 40):
                stmts = []
                for _ref, pid, old, new in changed[k:k + 40]:
                    stmts.append({"sql": "UPDATE passages SET text = ? WHERE id = ?", "args": [arg(new), arg(pid)]})
                    stmts.append({"sql": "INSERT INTO passages_fts (passages_fts, rowid, plain) VALUES ('delete', ?, ?)",
                                  "args": [arg(pid), arg(B.plain(old))]})
                    stmts.append({"sql": "INSERT INTO passages_fts (rowid, plain) VALUES (?, ?)", "args": [arg(pid), arg(B.plain(new))]})
                run(stmts)
                time.sleep(0.2)
            say(f"  - updated {len(changed)}.")
    say(f"Total: {total_changed} passages {'updated' if write else 'would be updated'}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
