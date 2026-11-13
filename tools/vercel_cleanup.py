#!/usr/bin/env python3
"""Delete old deploys of the `rab-ai` Vercel project, so they stop filling the account's storage.

Each deploy Vercel keeps holds its own copy of the app's server code, and Vercel counts all of them
against the account's function storage (it warned at 75% of 10 GB in November 2026). Run by the
"Delete old Vercel deploys" workflow, by hand or once a week.

Kept, always:
- the newest KEEP production deploys that were built (READY), the live one among them, so a bad
  deploy can still be rolled back to one of the last few;
- the newest KEEP_PREVIEW preview deploys;
- anything still building or queued.
Everything older is deleted, along with deploys that failed or were skipped (ERROR, CANCELED).

  VERCEL_TOKEN   required (repo secret).
  KEEP           production deploys to keep (default 10, at least 3).
  KEEP_PREVIEW   preview deploys to keep (default 3).
  DELETE         "yes" to delete; anything else is a trial that only counts.

Prints counts and dates only, never a token or an address of a deploy.
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from library_upload import VERCEL_API, VERCEL_PROJECT, ApiError, call, mask, summary, vercel_scope  # noqa: E402


def when(ms) -> str:
    return datetime.fromtimestamp(ms / 1000, timezone.utc).strftime("%Y-%m-%d") if isinstance(ms, (int, float)) else "?"


def plan(deploys: list[dict], keep: int, keep_preview: int) -> tuple[list[dict], list[dict]]:
    """(kept, deleted), newest first. Pure, for the tests."""
    deploys = sorted(deploys, key=lambda d: d.get("created") or 0, reverse=True)
    kept, gone = [], []
    prod = prev = 0
    for d in deploys:
        state = d.get("state") or d.get("readyState") or ""
        target = d.get("target") or "preview"
        if state in ("BUILDING", "QUEUED", "INITIALIZING"):
            kept.append(d)
        elif state == "READY" and target == "production" and prod < keep:
            prod += 1
            kept.append(d)
        elif state == "READY" and target != "production" and prev < keep_preview:
            prev += 1
            kept.append(d)
        else:
            gone.append(d)
    return kept, gone


def main() -> int:
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    mask(token)
    if not token:
        summary("No VERCEL_TOKEN secret, so nothing could be done.")
        return 1
    keep = max(3, int(os.environ.get("KEEP") or 10))
    keep_preview = max(0, int(os.environ.get("KEEP_PREVIEW") or 3))
    delete = os.environ.get("DELETE", "").strip().lower() == "yes"
    scope = vercel_scope(token)
    joiner = "&" if scope else "?"
    project = call("GET", f"{VERCEL_API}/v9/projects/{VERCEL_PROJECT}{scope}", token)
    pid = project.get("id", "")

    deploys: list[dict] = []
    until = None
    for _ in range(100):
        url = f"{VERCEL_API}/v6/deployments{scope}{joiner}projectId={pid}&limit=100" + (f"&until={until}" if until else "")
        page = call("GET", url, token)
        deploys += page.get("deployments", [])
        until = (page.get("pagination") or {}).get("next")
        if not until:
            break
    kept, gone = plan(deploys, keep, keep_preview)
    summary(f"## Old Vercel deploys {'(deleting)' if delete else '(trial: nothing is deleted)'}")
    summary(f"- {len(deploys)} deploys in all; keeping {len(kept)} (the newest {keep} built production deploys, "
            f"the newest {keep_preview} previews, and any still building).")
    if kept:
        summary(f"- Kept from {when(kept[-1].get('created'))} to {when(kept[0].get('created'))}.")
    if gone:
        states: dict[str, int] = {}
        for d in gone:
            s = d.get("state") or d.get("readyState") or "?"
            states[s] = states.get(s, 0) + 1
        summary(f"- {'Deleting' if delete else 'Would delete'} {len(gone)}, from {when(gone[-1].get('created'))} to "
                f"{when(gone[0].get('created'))} ({', '.join(f'{n} {s.lower()}' for s, n in sorted(states.items()))}).")
    if not delete or not gone:
        return 0
    done = failed = 0
    for d in gone:
        try:
            call("DELETE", f"{VERCEL_API}/v13/deployments/{d['uid']}{scope}", token)
            done += 1
        except ApiError as e:
            failed += 1
            if failed <= 3:
                summary(f"  - one couldn't be deleted (HTTP {e.status}).")
        time.sleep(0.3)
    summary(f"- Deleted {done}{f'; {failed} could not be' if failed else ''}.")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
