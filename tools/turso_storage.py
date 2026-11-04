#!/usr/bin/env python3
"""What Turso counts as RabbAI's storage, piece by piece.

Turso's monthly storage figure (17.15 GB in October and again in November 2026) is far more than
the databases it lists (about 4.7 GB together). This prints, from Turso's own API, everything that
could be counted: the organization's usage (as Turso reports it, and for this month and last
month asked by date), every database in every group with each copy's storage, databases and
groups deleted in the last few days, and what is left unexplained.

It only reads. It prints names, dates and numbers, never a token, so it is safe in this public
repository's Actions logs.

Usage: TURSO_API_TOKEN=... python3 tools/turso_storage.py   (the "Turso storage" workflow)
"""

from __future__ import annotations

import datetime as dt
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from library_upload import TURSO_API, ApiError, call, mask, summary, turso_org  # noqa: E402

API_V3 = TURSO_API.rsplit("/v1", 1)[0] + "/v3"


def plain(v) -> str:
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, (int, float)):
        return f"{v:,}"
    return str(v)


def numbers(d: dict) -> str:
    """The numeric and yes/no fields of an answer, as text (never its strings, which could be ids or tokens)."""
    keep = {k: v for k, v in (d or {}).items() if isinstance(v, (int, float, bool))}
    return ", ".join(f"{k} = {plain(v)}" for k, v in sorted(keep.items())) or "(no numbers)"


def gb(n) -> str:
    return f"{n / 1e9:.2f} GB" if isinstance(n, (int, float)) else "?"


def month_start(day: dt.date) -> dt.date:
    return day.replace(day=1)


def main() -> int:
    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("No TURSO_API_TOKEN.")
    mask(token)
    org = turso_org(token)
    base = f"{TURSO_API}/organizations/{org}"
    summary("# What Turso counts as storage")

    # The organization: its plan, its period, and its id (the v3 API is addressed by id).
    org_id = None
    try:
        info = call("GET", base, token)
        o = info.get("organization", info)
        summary(f"- Organization fields (names only): {', '.join(sorted(o))}")
        summary(f"- Organization numbers: {numbers(o)}")
        org_id = o.get("id") or o.get("uuid") or o.get("organization_id")
    except ApiError as e:
        summary(f"- Organization: not available ({e.status}).")

    # Usage as Turso reports it, then asked by date for this month and last month.
    today = dt.datetime.now(dt.timezone.utc).date()
    this_month = month_start(today)
    last_month = month_start(this_month - dt.timedelta(days=1))
    org_storage = None
    for label, query in (
        ("as reported", ""),
        (f"from {this_month}", f"?from={this_month}T00:00:00Z&to={today + dt.timedelta(days=1)}T00:00:00Z"),
        (f"from {last_month} to {this_month}", f"?from={last_month}T00:00:00Z&to={this_month}T00:00:00Z"),
        (f"today only ({today})", f"?from={today}T00:00:00Z&to={today + dt.timedelta(days=1)}T00:00:00Z"),
    ):
        try:
            u = call("GET", f"{base}/usage{query}", token).get("organization", {})
            totals = u.get("usage", {}) or {}
            summary(f"- Organization usage, {label}: {numbers(totals)} (storage {gb(totals.get('storage_bytes'))})")
            dates = {k: v for k, v in u.items() if isinstance(v, str) and any(w in k for w in ("from", "to", "start", "end", "period"))}
            if dates:
                summary("  - its dates: " + ", ".join(f"{k} = {v}" for k, v in sorted(dates.items())))
            if not query:
                org_storage = totals.get("storage_bytes")
        except ApiError as e:
            summary(f"- Organization usage, {label}: not available ({e.status}).")

    # Every database in every group, with each copy's storage.
    listed_total = 0
    try:
        groups = call("GET", f"{base}/groups", token).get("groups", [])
        summary(f"- Groups: {', '.join(str(g.get('name')) for g in groups) or 'none'}")
        for g in groups:
            summary(f"  - `{g.get('name')}`: locations = {', '.join(g.get('locations') or [])}, numbers: {numbers(g)}")
        dbs = call("GET", f"{base}/databases", token).get("databases", [])
        summary(f"## The databases Turso lists ({len(dbs)})")
        for d in dbs:
            name = d.get("Name") or d.get("name")
            regions = d.get("regions") or []
            summary(f"- `{name}`: group = {d.get('group')}, regions = {', '.join(regions) or '?'}, "
                    f"type = {d.get('type')}, version = {d.get('version')}, numbers: {numbers(d)}")
            for query in ("", f"?from={this_month}T00:00:00Z"):
                try:
                    used = call("GET", f"{base}/databases/{name}/usage{query}", token).get("database", {})
                except ApiError as e:
                    summary(f"  - usage{' this month' if query else ''}: not available ({e.status})")
                    continue
                total = used.get("total") or {}
                summary(f"  - usage{' from ' + str(this_month) if query else ''}: total: {numbers(total)}")
                for inst in used.get("instances", []) or []:
                    u = inst.get("usage", {}) or {}
                    summary(f"    - copy ({inst.get('type') or 'instance'}{', ' + inst['region'] if inst.get('region') else ''}): {numbers(u)}")
                    if not query and isinstance(u.get("storage_bytes"), (int, float)):
                        listed_total += u["storage_bytes"]
    except ApiError as e:
        summary(f"- Databases: not listed ({e.status}).")

    # Databases and groups deleted in the last few days (Turso keeps them that long to restore).
    summary("## Deleted, still kept by Turso")
    if not org_id:
        summary("- The organization's id wasn't found, so deleted databases couldn't be listed.")
    else:
        for label, url in (
            ("Deleted databases", f"{API_V3}/organizations/{org_id}/databases?deleted=true"),
            ("Deleted groups", f"{API_V3}/organizations/{org_id}/deleted-groups"),
        ):
            try:
                answer = call("GET", url, token)
                items = answer.get("databases") or answer.get("groups") or answer.get("data") or []
                summary(f"- {label}: {len(items)}")
                for it in items:
                    if not isinstance(it, dict):
                        continue
                    name = it.get("Name") or it.get("name")
                    when = {k: v for k, v in it.items() if isinstance(v, str) and ("delet" in k.lower() or "creat" in k.lower())}
                    summary(f"  - `{name}`: " + ", ".join(f"{k} = {v}" for k, v in sorted(when.items())) + f"; numbers: {numbers(it)}")
            except ApiError as e:
                summary(f"- {label}: not available ({e.status}).")

    summary("## The difference")
    summary(f"- Turso counts {gb(org_storage)}; the databases it lists hold {gb(listed_total)} together.")
    if isinstance(org_storage, (int, float)):
        summary(f"- Not explained by a listed database: {plain(org_storage - listed_total)} bytes ({gb(org_storage - listed_total)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
