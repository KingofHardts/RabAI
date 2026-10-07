#!/usr/bin/env python3
"""Set up RabAI's translation library on Turso, and connect the app and the batch job to it.

RabAI's translation library keeps every translation RabAI makes (web/lib/library/translations.ts),
so a passage is translated once for everyone. It is its own database, "rabai-translations", in the
same Turso group as the testing library. Rebuilding the testing library replaces only
"rabai-library", so the translations are never lost. This script never deletes anything.

Runs in GitHub Actions (.github/workflows/translations.yml). Uses only the standard library and the
helpers in tools/library_upload.py.

Settings (GitHub Actions secrets):
  TURSO_API_TOKEN   required. A Turso Platform API token.
  TURSO_ORG         optional. The Turso organization; found from the token when there is one.
  VERCEL_TOKEN      optional, for the setup. When set, the app's Vercel settings are updated and
                    the app is redeployed.

Usage:
  python3 tools/translations_setup.py         Create the database if it is missing, make a token the
                                              app can write with, and (with VERCEL_TOKEN) set
                                              TRANSLATIONS_DATABASE_URL and TRANSLATIONS_AUTH_TOKEN
                                              on the Vercel project and redeploy.
  python3 tools/translations_setup.py --inbox For the inbox workflow: create the database the first
                                              time (connecting the app then), then the same as --env.
  python3 tools/translations_setup.py --env   For the batch job: make tokens that expire in a day
                                              (read-only for the testing library, read and write for
                                              the translation library) and hand them to the next
                                              steps through GITHUB_ENV.

Tokens are never printed. Each one is masked in the Actions log before it is used.
"""

import os
import sys

from library_upload import (
    DB_NAME as LIBRARY_DB,
    TURSO_API,
    ApiError,
    call,
    database_token,
    group_token,
    mask,
    redeploy,
    set_vercel_env,
    summary,
    turso_group,
    turso_org,
)

DB_NAME = "rabai-translations"
# Long enough for the longest batch run (the workflow stops at 6 hours).
RUN_TOKEN_EXPIRATION = "1d"


def hostname_of(token: str, org: str, name: str) -> str | None:
    try:
        info = call("GET", f"{TURSO_API}/organizations/{org}/databases/{name}", token)
    except ApiError as e:
        if e.status == 404:
            return None
        raise
    return info["database"]["Hostname"]


def ensure_database(token: str, org: str, group: str) -> tuple[str, bool]:
    """The translation library's hostname, creating an empty database when there is none."""
    hostname = hostname_of(token, org, DB_NAME)
    if hostname:
        return hostname, False
    created = call("POST", f"{TURSO_API}/organizations/{org}/databases", token, {"name": DB_NAME, "group": group})
    return created["database"]["Hostname"], True


def connect_app(token: str, org: str, url: str) -> None:
    """Give the app (on Vercel) the translation library's address and a token, and redeploy."""
    vercel = os.environ.get("VERCEL_TOKEN", "").strip()
    mask(vercel)
    if not vercel:
        summary("- No VERCEL_TOKEN secret, so the app was not connected. See web/README.md, "
                "\"RabAI's translation library\".")
        return
    # The app reads and writes this database (it keeps each new translation), so its token is
    # read and write, and it can reach only this database.
    app_token = database_token(token, org, DB_NAME, "full-access")
    scope = set_vercel_env(vercel, {"TRANSLATIONS_DATABASE_URL": url, "TRANSLATIONS_AUTH_TOKEN": app_token})
    redeploy(vercel, scope)


def setup(token: str, org: str) -> int:
    group = turso_group(token, org)
    hostname, created = ensure_database(token, org, group)
    url = f"libsql://{hostname}"
    summary("## RabAI's translation library")
    summary(f"- Database: `{url}` ({'created now, empty' if created else 'already there, kept as it is'}).")
    summary("- The app makes its tables the first time it uses it.")
    connect_app(token, org, url)
    return 0


def run_inbox(token: str, org: str) -> int:
    """For the inbox workflow: create the translation library the first time (and connect the app
    then), and hand this run its tokens like --env."""
    group = turso_group(token, org)
    hostname, created = ensure_database(token, org, group)
    if created:
        summary("## RabAI's translation library")
        summary(f"- Database `libsql://{hostname}` created now, empty.")
        connect_app(token, org, f"libsql://{hostname}")
    return run_env(token, org)


def run_env(token: str, org: str) -> int:
    path = os.environ.get("GITHUB_ENV")
    if not path:
        raise SystemExit("--env is for GitHub Actions (GITHUB_ENV is not set).")
    group = turso_group(token, org)
    library = hostname_of(token, org, LIBRARY_DB)
    if not library:
        raise SystemExit("There is no testing library yet. Run the \"Build the testing library\" workflow first.")
    translations = hostname_of(token, org, DB_NAME)
    if not translations:
        raise SystemExit("There is no translation library yet. Run this workflow once with mode \"setup\".")
    # A read-only group token for the testing library, a read and write token for the translation
    # library only. Both expire in a day.
    read = group_token(token, org, group, "read-only", RUN_TOKEN_EXPIRATION)
    write = database_token(token, org, DB_NAME, "full-access", RUN_TOKEN_EXPIRATION)
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"TURSO_DATABASE_URL=libsql://{library}\n")
        f.write(f"TURSO_AUTH_TOKEN={read}\n")
        f.write(f"TRANSLATIONS_DATABASE_URL=libsql://{translations}\n")
        f.write(f"TRANSLATIONS_AUTH_TOKEN={write}\n")
    print("Connected to the testing library and the translation library for this run.", flush=True)
    return 0


def main() -> int:
    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("Add the TURSO_API_TOKEN secret to the repository first (see web/README.md).")
    mask(token)
    org = turso_org(token)
    if "--inbox" in sys.argv:
        return run_inbox(token, org)
    return run_env(token, org) if "--env" in sys.argv else setup(token, org)


if __name__ == "__main__":
    sys.exit(main())
