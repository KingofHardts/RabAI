#!/usr/bin/env python3
"""Check that RabAI is working, piece by piece, without printing any secret.

Runs in GitHub Actions (.github/workflows/health.yml), started by hand. It reports to the run's
summary:

1. Turso: the plan, whether reads or writes are blocked, this month's usage against the plan's
   limits, and each RabAI database.
2. Vercel: the latest production deploy, and which settings exist (names and kinds only).
3. The settings, used the way the app uses them. Each value is masked in the log before it is
   used, and none is ever printed:
   - the library, translation and website-collection databases each answer a small query (a
     collection reports its article count);
   - the Anthropic key answers a one-word request (a fraction of a cent).
4. The live app: the lock page answers, the access code opens it, the library lists its books and
   the articles' sections (with how many paragraphs the first articles of each open with), and one
   real question is answered (about the cost of one question in the app). Only whether each step
   worked is printed, never the answer, and never an article's title or words (only counts).

This repository is public, and so are its Actions logs: nothing here prints a key, a code, a
token, a question's answer or anything about a person.

Uses only the standard library and the helpers in tools/library_upload.py.
"""

import http.cookiejar
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
from datetime import datetime, timezone
import urllib.request

from library_upload import TURSO_API, VERCEL_API, VERCEL_PROJECT, ApiError, call, mask, summary, turso_org, vercel_scope

APP = "https://rab-ai-ecru.vercel.app"
DATABASES = ("rabai-library", "rabai-translations", "rabai-people")
SETTINGS = (
    "ANTHROPIC_API_KEY",
    "RABAI_ACCESS_CODE",
    "RABAI_PUBLIC",
    "RABAI_MODEL",
    "RABAI_LOOKUP_MODEL",
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
    "TRANSLATIONS_DATABASE_URL",
    "TRANSLATIONS_AUTH_TOKEN",
    "PEOPLE_DATABASE_URL",
    "PEOPLE_AUTH_TOKEN",
    "RABAI_AUTH_SECRET",
    "RESEND_API_KEY",
    "RABAI_MAIL_FROM",
    "RABAI_COLLECTION_DB_URLS",
)
QUESTION = "What is the first word of the Torah, and what does it mean?"

problems: list[str] = []


def problem(text: str) -> None:
    problems.append(text)
    summary(f"- **Problem:** {text}")


def plain(value) -> str:
    """A short, safe rendering of a field from an API's answer (numbers, words, yes/no)."""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, (int, float)):
        return f"{value:,}"
    text = str(value)
    return text if len(text) <= 60 else text[:57] + "..."


# ---------------------------------------------------------------------------------------------
# 1. Turso


def when_fields(d: dict) -> str:
    """The date-like fields of a Turso answer (when a period starts, ends or resets), as text."""
    words = ("period", "start", "end", "reset", "renew", "cycle", "date")
    found = {k: v for k, v in (d or {}).items() if isinstance(v, (str, int, float)) and not isinstance(v, bool)
             and any(w in k.lower() for w in words)}
    return ", ".join(f"{k} = {plain(v)}" for k, v in sorted(found.items()))


def check_turso() -> None:
    summary("## Turso (the databases)")
    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    mask(token)
    if not token:
        problem("No TURSO_API_TOKEN secret, so Turso couldn't be checked.")
        return
    org = turso_org(token)
    base = f"{TURSO_API}/organizations/{org}"

    try:
        info = call("GET", base, token).get("organization", {})
        shown = {k: v for k, v in info.items() if isinstance(v, (bool, int, float, str)) and any(
            w in k.lower() for w in ("block", "plan", "overage", "type", "timeline"))}
        summary("- Organization: " + (", ".join(f"{k} = {plain(v)}" for k, v in sorted(shown.items())) or "no details"))
        if info.get("blocked_reads") or info.get("blocked_writes"):
            problem("Turso has **blocked** this account's "
                    + " and ".join(w for w, k in (("reads", "blocked_reads"), ("writes", "blocked_writes")) if info.get(k))
                    + ". This usually means the free plan's monthly allowance is used up.")
    except ApiError as e:
        summary(f"- Organization details: not available ({e.status}).")

    quotas = {}
    try:
        sub = call("GET", f"{base}/subscription", token).get("subscription", {})
        plan_name = sub.get("plan") or sub.get("name")
        summary(f"- Plan: {plain(plan_name)}" + (f" (overages {plain(sub.get('overages'))})" if "overages" in sub else ""))
        dates = when_fields(sub)
        if dates:
            summary("- Billing: " + dates)
        plans = call("GET", f"{base}/plans", token).get("plans", [])
        for p in plans:
            if plan_name and p.get("name") == plan_name:
                quotas = p.get("quotas", {}) or {}
        if quotas:
            summary("- The plan's limits: " + ", ".join(f"{k} = {plain(v)}" for k, v in sorted(quotas.items())))
    except ApiError as e:
        summary(f"- Plan details: not available ({e.status}).")

    try:
        usage = call("GET", f"{base}/usage", token).get("organization", {})
        totals = usage.get("usage", {}) or {}
        summary("- Used this month: " + ", ".join(f"{k} = {plain(v)}" for k, v in sorted(totals.items())))
        dates = when_fields(usage) or when_fields(totals)
        if dates:
            summary("- Usage period (storage counts every database used in it, deleted ones too): " + dates)
        for key, quota_key in (("rows_read", "rowsRead"), ("rows_written", "rowsWritten"), ("storage_bytes", "storage")):
            used, limit = totals.get(key), quotas.get(quota_key)
            if isinstance(used, (int, float)) and isinstance(limit, (int, float)) and limit > 0:
                share = used / limit
                summary(f"  - {key}: {share:.0%} of the plan's limit")
                if share >= 1:
                    problem(f"Turso's monthly {key.replace('_', ' ')} is over the plan's limit ({plain(used)} of {plain(limit)}).")
    except ApiError as e:
        summary(f"- Usage: not available ({e.status}).")

    try:
        listed = call("GET", f"{base}/databases", token).get("databases", [])
        names = {d.get("Name") or d.get("name"): d for d in listed}
        collections = sorted(n for n in names if isinstance(n, str) and n.startswith("rabai-collection-"))
        for name in [*DATABASES, *collections]:
            d = names.get(name)
            if not d:
                summary(f"- Database `{name}`: not there.")
                if name != "rabai-people":
                    problem(f"The database `{name}` doesn't exist.")
                continue
            flags = {k: v for k, v in d.items() if isinstance(v, bool)}
            summary(f"- Database `{name}`: " + (", ".join(f"{k} = {plain(v)}" for k, v in sorted(flags.items())) or "there"))
            if d.get("block_reads") or d.get("block_writes"):
                problem(f"The database `{name}` is blocked for reads or writes.")
            if d.get("archived") or d.get("sleeping"):
                summary(f"  - `{name}` is asleep or archived; the first request wakes it.")
            try:
                used = call("GET", f"{base}/databases/{name}/usage", token).get("database", {})
                total = used.get("total", {}) or {}
                summary(f"  - `{name}` this month: " + ", ".join(f"{k} = {plain(v)}" for k, v in sorted(total.items())))
                for inst in used.get("instances", []) or []:
                    u = inst.get("usage", {}) or {}
                    summary(f"    - a copy ({plain(inst.get('type') or inst.get('region') or 'instance')}): storage_bytes = {plain(u.get('storage_bytes'))}")
            except ApiError as e:
                summary(f"  - `{name}` usage: not available ({e.status}).")
        groups = call("GET", f"{base}/groups", token).get("groups", [])
        for g in groups:
            summary(f"- Group `{g.get('name')}`: primary = {plain(g.get('primary'))}, locations = {', '.join(g.get('locations') or [])}")
    except ApiError as e:
        summary(f"- Databases: not listed ({e.status}).")


# ---------------------------------------------------------------------------------------------
# 2. Vercel


def vercel_settings() -> tuple[dict, str, str]:
    """The project's settings by name ({name: setting}), the project id and the API scope."""
    token = os.environ.get("VERCEL_TOKEN", "").strip()
    mask(token)
    summary("## Vercel (the app)")
    if not token:
        problem("No VERCEL_TOKEN secret, so Vercel couldn't be checked.")
        return {}, "", ""
    scope = vercel_scope(token)
    joiner = "&" if scope else "?"
    project = call("GET", f"{VERCEL_API}/v9/projects/{VERCEL_PROJECT}{scope}", token)
    project_id = project.get("id", "")

    deploys = call("GET", f"{VERCEL_API}/v6/deployments{scope}{joiner}projectId={project_id}&target=production&limit=3", token)
    for d in deploys.get("deployments", [])[:3]:
        meta = d.get("meta", {}) or {}
        sha = (meta.get("githubCommitSha") or "")[:7]
        state = d.get("state") or d.get("readyState")
        created = d.get("created")
        when = datetime.fromtimestamp(created / 1000, timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if isinstance(created, (int, float)) else "?"
        summary(f"- Production deploy: {plain(state)}, commit {sha or '?'}, made {when}")
    latest = (deploys.get("deployments") or [{}])[0]
    if (latest.get("state") or latest.get("readyState")) not in ("READY", None):
        problem(f"The latest production deploy is {latest.get('state') or latest.get('readyState')}, not READY.")

    envs = call("GET", f"{VERCEL_API}/v9/projects/{VERCEL_PROJECT}/env{scope}", token).get("envs", [])
    by_name: dict = {}
    for e in envs:
        if "production" in (e.get("target") or []):
            by_name[e.get("key")] = e
    for name in SETTINGS:
        e = by_name.get(name)
        summary(f"- `{name}`: " + (f"set ({e.get('type')})" if e else "not set"))
    for required in ("ANTHROPIC_API_KEY", "RABAI_ACCESS_CODE", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"):
        if required not in by_name:
            problem(f"`{required}` isn't set in Vercel for production.")
    return by_name, project_id, scope


def setting_value(by_name: dict, name: str, project_id: str, scope: str) -> str | None:
    """A setting's value, masked at once. None when it isn't set or can't be read (a "sensitive" one)."""
    e = by_name.get(name)
    if not e:
        return None
    token = os.environ["VERCEL_TOKEN"].strip()
    try:
        out = call("GET", f"{VERCEL_API}/v1/projects/{project_id}/env/{e['id']}{scope}", token)
    except ApiError:
        return None
    value = out.get("value")
    if not isinstance(value, str) or not value:
        return None
    mask(value)
    return value


# ---------------------------------------------------------------------------------------------
# 3. The settings, used as the app uses them


def check_database(label: str, url: str | None, token: str | None, count: str | None = None, full: bool = False) -> str | None:
    """Ask a database one small question with the app's own settings. `count` is an extra query
    whose single answer (names and numbers, never a database's text) is reported, in full when
    `full` is set, and returned."""
    if not url or not token:
        summary(f"- {label}: its settings couldn't be read here (they may be marked sensitive), so it wasn't tested.")
        return None
    host = url.split("://", 1)[-1].strip("/")
    stmts = [{"type": "execute", "stmt": {"sql": "SELECT count(*) FROM sqlite_master"}}]
    if count:
        stmts.append({"type": "execute", "stmt": {"sql": count}})
    body = {"requests": [*stmts, {"type": "close"}]}
    try:
        out = call("POST", f"https://{host}/v2/pipeline", token, body, attempts=2)
        first = out["results"][0]
        if first.get("type") == "ok":
            extra, answer = "", None
            if count and len(out["results"]) > 1 and out["results"][1].get("type") == "ok":
                try:
                    cell = out["results"][1]["response"]["result"]["rows"][0][0]
                    answer = cell.get("value") if isinstance(cell, dict) else cell
                    extra = f" ({answer if full else plain(answer)})"
                except (KeyError, IndexError, TypeError):
                    extra = ""
            summary(f"- {label}: answers with the app's own settings{extra}.")
            return None if answer is None else str(answer)
        else:
            err = (first.get("error") or {}).get("message", "unknown error")
            problem(f"{label} refused the app's query: {plain(err)}")
    except ApiError as e:
        problem(f"{label} refused the app's settings (HTTP {e.status}): {plain(str(e))}")
    except Exception as e:  # noqa: BLE001 - report any failure in plain words
        problem(f"{label} couldn't be reached: {plain(e)}")
    return None


def check_anthropic(key: str | None, model: str) -> None:
    if not key:
        summary("- Anthropic key: couldn't be read here (it may be marked sensitive), so it wasn't tested directly.")
        return
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps({"model": model, "max_tokens": 1, "messages": [{"role": "user", "content": "Say OK."}]}).encode(),
        method="POST",
    )
    req.add_header("x-api-key", key)
    req.add_header("anthropic-version", "2023-06-01")
    req.add_header("content-type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            summary(f"- Anthropic key, model `{model}`: works (HTTP {resp.status}).")
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode("utf-8", "replace")).get("error", {})
        except ValueError:
            err = {}
        problem(f"The Anthropic key was refused for `{model}` (HTTP {e.code}, {err.get('type', '?')}): {err.get('message', '')[:200]}")
    except Exception as e:  # noqa: BLE001
        problem(f"Anthropic couldn't be reached: {plain(e)}")


# ---------------------------------------------------------------------------------------------
# 4. The live app


def check_app(code: str | None, collections_expected: bool = False) -> None:
    summary("## The live app")
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    seen: dict = {}

    def fetch(path: str, body=None, timeout=60):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(APP + path, data=data, method="POST" if body is not None else "GET")
        if body is not None:
            req.add_header("Content-Type", "application/json")
        started = time.monotonic()
        try:
            with opener.open(req, timeout=timeout) as resp:
                seen.update(headers={k.lower(): v for k, v in resp.headers.items()}, seconds=time.monotonic() - started)
                try:
                    return resp.status, resp.read()
                except Exception as e:  # noqa: BLE001 - the stream was cut off
                    seen.update(cut=f"{type(e).__name__}: {e}"[:200])
                    partial = getattr(e, "partial", b"") or b""
                    return resp.status, partial
        except urllib.error.HTTPError as e:
            seen.update(headers={k.lower(): v for k, v in e.headers.items()}, seconds=time.monotonic() - started)
            return e.code, e.read()

    status, _ = fetch("/unlock")
    summary(f"- The lock page: HTTP {status}.")
    if status != 200:
        problem(f"The lock page answered HTTP {status}.")
        return
    if not code:
        summary("- The access code couldn't be read here (it may be marked sensitive), so the app wasn't opened.")
        return
    status, _ = fetch("/api/unlock", {"code": code})
    summary(f"- The access code: HTTP {status}" + (" (accepted)." if status == 200 else "."))
    if status != 200:
        problem(f"The access code in Vercel didn't open the app (HTTP {status}).")
        return

    status, raw = fetch("/api/library")
    try:
        lib = json.loads(raw)
        summary(f"- The library list: HTTP {status}, library = {plain(lib.get('libraryMode'))}, "
                f"{len(lib.get('sections') or []):,} books.")
        if lib.get("libraryMode") != "testing":
            problem("The app isn't connected to the testing library.")
        elif not lib.get("sections"):
            problem("The app is connected to the testing library, but it listed no books (the database didn't answer).")
        # The website collections: only counts are printed, never an article's title or words.
        shelves = [s for s in lib.get("articleShelves") or [] if isinstance(s, dict)]
        if shelves:
            sites = sorted({str(s.get("site")) for s in shelves})
            total = sum(int(s.get("count") or 0) for s in shelves)
            summary(f"- The articles: {len(shelves)} sections, {total:,} articles, from {', '.join(sites)}.")
            work = str(shelves[0].get("work") or "")
            status, raw = fetch("/api/articles?work=" + urllib.parse.quote(work))
            try:
                listed = json.loads(raw).get("articles") or []
                summary(f"- One section's list of articles: HTTP {status}, {len(listed)} listed.")
                if status != 200 or not listed:
                    problem(f"A section's list of articles answered HTTP {status} with {len(listed)} articles.")
            except ValueError:
                problem(f"A section's list of articles answered HTTP {status} with something that isn't JSON.")
            # How many paragraphs the first few articles of each section open with, the way the reader
            # opens them. One paragraph everywhere would mean articles are being read as one block.
            for shelf in shelves:
                status, raw = fetch("/api/articles?work=" + urllib.parse.quote(str(shelf.get("work") or "")))
                try:
                    listed = json.loads(raw).get("articles") or []
                except ValueError:
                    listed = []
                counts = []
                for article in listed[:3]:
                    status, raw = fetch("/api/text?ref=" + urllib.parse.quote(str(article.get("firstRef") or "")))
                    try:
                        counts.append(str(len(json.loads(raw).get("lines") or [])) if status == 200 else f"HTTP {status}")
                    except ValueError:
                        counts.append("not JSON")
                summary(f"  - {plain(shelf.get('title'))}: paragraphs in its first {len(counts)} articles: "
                        f"{', '.join(counts) or 'none listed'}.")
        elif collections_expected:
            problem("`RABAI_COLLECTION_DB_URLS` is set, but the app listed no articles.")
    except ValueError:
        problem(f"The library list answered HTTP {status} with something that isn't JSON.")

    status, raw = fetch("/api/account")
    summary(f"- The account check: HTTP {status}.")

    status, raw = fetch("/api/daf?ref=" + urllib.parse.quote("Berakhot 2a"))
    try:
        daf = json.loads(raw)
        lines = len(daf.get("gemara") or daf.get("lines") or [])
        summary(f"- The Gemara page (Berakhot 2a): HTTP {status}" + (f", {lines} lines of Gemara." if lines else "."))
        if status != 200:
            problem(f"The Gemara page answered HTTP {status}: {plain(daf.get('error', ''))}")
    except ValueError:
        problem(f"The Gemara page answered HTTP {status} with something that isn't JSON.")

    status, raw = fetch("/api/word?w=" + urllib.parse.quote("בראשית"))
    summary(f"- A word's meaning: HTTP {status}.")
    if status != 200:
        problem(f"A word's meaning answered HTTP {status}.")

    # "Translate this" on a Rashi already kept in the translation library (no model call when kept).
    status, raw = fetch("/api/translate", {"ref": "Rashi on Berakhot 2a:1:1", "context": [], "words": False}, timeout=180)
    try:
        tr = json.loads(raw)
        parts = [k for k in ("general", "words", "readings") if tr.get(k)]
        summary(f"- \"Translate this\": HTTP {status}" + (f", with {', '.join(parts)}." if parts else f": {plain(tr.get('error', ''))}"))
        if status != 200:
            problem(f"\"Translate this\" answered HTTP {status}: {plain(tr.get('error', ''))}")
    except ValueError:
        problem(f"\"Translate this\" answered HTTP {status} with something that isn't JSON.")

    # "Show the flow": RabAI's colored outline of a page (a model call, up to a few minutes).
    status, raw = fetch("/api/daf/outline", {"ref": "Berakhot 2a"}, timeout=330)
    try:
        out = json.loads(raw)
        lines = out.get("lines") or []
        phrases = sum(len(l.get("phrases") or []) for l in lines if isinstance(l, dict))
        summary(f"- \"Show the flow\" on Berakhot 2a: HTTP {status}, {len(lines)} lines, {phrases} phrases, "
                f"{seen.get('seconds', 0):.0f} seconds" + (f": {plain(out.get('error'))}" if out.get("error") else "."))
        if status != 200:
            problem(f"\"Show the flow\" answered HTTP {status}: {plain(out.get('error', ''))}")
    except ValueError:
        h = seen.get("headers", {})
        problem(f"\"Show the flow\" answered HTTP {status} with something that isn't JSON "
                f"(after {seen.get('seconds', 0):.0f} seconds, x-vercel-error = {h.get('x-vercel-error', 'none')}).")

    # The app asks for a live (streamed) answer: one JSON object per line.
    status, raw = fetch("/api/ask", {"question": QUESTION, "stream": True}, timeout=240)
    h = seen.get("headers", {})
    if status != 200:
        problem(f"Asking a question answered HTTP {status}.")
        return
    events = []
    for line in raw.decode("utf-8", "replace").splitlines():
        try:
            events.append(json.loads(line))
        except ValueError:
            continue
    done = next((e for e in events if isinstance(e, dict) and e.get("type") == "done"), None)
    statuses = sum(1 for e in events if isinstance(e, dict) and e.get("type") == "status")
    pieces = sum(1 for e in events if isinstance(e, dict) and e.get("type") == "text")
    if not done:
        summary(f"  - Answer details: {len(raw):,} bytes in {seen.get('seconds', 0):.0f} seconds, "
                f"content-type = {h.get('content-type', '?')}, x-vercel-error = {h.get('x-vercel-error', 'none')}"
                + (f", cut off ({seen['cut']})" if seen.get("cut") else ""))
        problem(f"A live answer never finished ({statuses} status lines, {pieces} pieces of text).")
        return
    r = done.get("result", {})
    summary(f"- A live answer: status = {plain(r.get('status'))}, {len(r.get('sources') or [])} sources cited, "
            f"{len(r.get('retrieved') or [])} passages read, {statuses} status lines, {pieces} pieces of text, "
            f"{seen.get('seconds', 0):.0f} seconds.")
    if r.get("status") not in ("answered",):
        problem(f"A live answer ended with status {plain(r.get('status'))}: {plain(r.get('notice'))}")


def check_browser(code: str | None, articles: bool = False) -> None:
    """Open the app in a real browser (tools/health_browser.cjs), when Playwright is installed."""
    pw = os.environ.get("PW_PATH")
    if not pw or not code:
        summary("- The browser test didn't run (no Playwright or no access code).")
        return
    env = {**os.environ, "RABAI_CODE": code, "APP": APP, "ARTICLES_EXPECTED": "1" if articles else ""}
    try:
        out = subprocess.run(["node", "tools/health_browser.cjs"], env=env, capture_output=True, text=True, timeout=400)
    except subprocess.TimeoutExpired:
        problem("The browser test took too long.")
        return
    for line in (out.stdout or "").splitlines():
        kind, _, text = line.partition(" ")
        if kind == "PROBLEM":
            problem(f"In the browser: {text}")
        elif kind == "OK":
            summary(f"- In the browser: {text}")
    if out.returncode != 0:
        problem(f"The browser test stopped with an error: {plain((out.stderr or '').strip().splitlines()[-1:] or '')}")


def main() -> int:
    summary("# Is RabAI working?")
    try:
        check_turso()
    except Exception as e:  # noqa: BLE001
        problem(f"Turso couldn't be checked: {plain(e)}")

    by_name, project_id, scope = {}, "", ""
    try:
        by_name, project_id, scope = vercel_settings()
    except Exception as e:  # noqa: BLE001
        problem(f"Vercel couldn't be checked: {plain(e)}")

    value = (lambda name: setting_value(by_name, name, project_id, scope)) if project_id else (lambda name: None)
    summary("## The settings, used the way the app uses them")
    check_database(
        "The library (`TURSO_*`)",
        value("TURSO_DATABASE_URL"),
        value("TURSO_AUTH_TOKEN"),
        # The printed-page layouts: how many amudim the app can show line for line.
        count="SELECT COUNT(*) || ' printed-page layouts, ' || COALESCE(SUM(json_extract(data, '$.placed_all')), 0)"
        " || ' shown as printed, ' || COALESCE(SUM(complete), 0) || ' with no word estimated' FROM daf_layout",
        full=True,
    )
    if "TRANSLATIONS_DATABASE_URL" in by_name:
        check_database("The translation library (`TRANSLATIONS_*`)", value("TRANSLATIONS_DATABASE_URL"), value("TRANSLATIONS_AUTH_TOKEN"))
    collection_urls = [u for u in re.split(r"[\s,]+", value("RABAI_COLLECTION_DB_URLS") or "") if u]
    for i, url in enumerate(collection_urls, 1):
        mask(url)
        answer = check_database(
            f"Website collection {i} (`RABAI_COLLECTION_DB_URLS`)",
            url,
            value("RABAI_COLLECTION_DB_TOKEN") or value("TURSO_AUTH_TOKEN"),
            # Per section: how many articles, and how many are one paragraph or under 400 characters
            # (a section of short teasers would show here). Then titles and paragraphs that have lost
            # their article's details (RabAI would not know they are articles): there should be none.
            # Only section names and numbers.
            count=(
                "SELECT (SELECT value FROM meta WHERE key = 'site') || ', ' || (SELECT COUNT(*) FROM articles)"
                " || ' articles; by section: ' || (SELECT group_concat(line, '; ') FROM ("
                "  SELECT w.title || ' ' || COUNT(*) || ' (' || SUM(x.n = 1) || ' one paragraph, '"
                "    || SUM(x.chars < 400) || ' under 400 characters)' AS line"
                "  FROM (SELECT e.work AS work, COUNT(p.id) AS n, SUM(length(p.text)) AS chars"
                "        FROM articles a JOIN editions e ON e.id = a.edition_id"
                "        JOIN passages p ON p.title_id = a.title_id GROUP BY a.title_id) x"
                "  JOIN works w ON w.id = x.work GROUP BY w.title ORDER BY w.title))"
                " || '; titles without an article: ' || (SELECT COUNT(*) FROM titles"
                "    WHERE id NOT IN (SELECT title_id FROM articles))"
                " || ', their paragraphs: ' || (SELECT COUNT(*) FROM passages"
                "    WHERE title_id NOT IN (SELECT title_id FROM articles))"
            ),
            full=True,
        )
        lost = re.search(r"titles without an article: (\d+)", answer or "")
        if lost and int(lost.group(1)):
            problem(f"Website collection {i} has {lost.group(1)} titles that lost their article's details; RabAI would "
                    "not know they are articles. The next run of the collection copy removes them.")
    if "RABAI_COLLECTION_DB_URLS" in by_name and not collection_urls:
        summary("- The website collections: their setting couldn't be read here, so they weren't tested.")
    key = value("ANTHROPIC_API_KEY")
    check_anthropic(key, value("RABAI_MODEL") or "claude-opus-5-5")
    check_anthropic(key, value("RABAI_LOOKUP_MODEL") or "claude-sonnet-5-5")

    code = value("RABAI_ACCESS_CODE")
    expected = "RABAI_COLLECTION_DB_URLS" in by_name
    try:
        check_app(code, expected)
    except Exception as e:  # noqa: BLE001
        problem(f"The live app couldn't be checked: {plain(e)}")
    summary("## The live app in a browser")
    check_browser(code, expected)

    summary("## Result")
    if problems:
        summary(f"{len(problems)} problem(s) found, listed above.")
    else:
        summary("Everything checked works.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
