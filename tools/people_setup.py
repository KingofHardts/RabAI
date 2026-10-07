#!/usr/bin/env python3
"""Set up the people database on Turso and connect the app to it, for accounts (phase 2 of
docs/learner-profiles.md) and "Was this helpful?".

The people database, "rabai-people", holds accounts (never an email address, only a keyed check of
it), sign-in links and sessions (only hashes of their tokens), each person's profile and saved
chats, and feedback (never linked to a person). It is its own database, in the same Turso group as
the testing library, so rebuilding the library never touches it. This script never deletes it.

Runs in GitHub Actions (.github/workflows/accounts.yml). Uses only the standard library and the
helpers in tools/library_upload.py.

Settings (GitHub Actions secrets):
  TURSO_API_TOKEN   required. A Turso Platform API token.
  TURSO_ORG         optional. The Turso organization; found from the token when there is one.
  VERCEL_TOKEN      optional, but needed to connect the app. When set, the app's Vercel settings are
                    updated and the app is redeployed.

What it sets on the Vercel project (values are never printed):
  PEOPLE_DATABASE_URL  the database's address.
  PEOPLE_AUTH_TOKEN    a token the app can read and write this one database with.
  RABAI_AUTH_SECRET    the key that turns email addresses into the stored check values. Made once:
                       if the project already has it, it is kept, because a new one would sign
                       everyone out and leave every account unreachable.

RESEND_API_KEY and RABAI_MAIL_FROM (the email service) are set by the maintainer by hand; see
web/README.md, "Accounts".

Usage:
  python3 tools/people_setup.py

Tokens and the secret are never printed. Each one is masked in the Actions log before it is used.
"""

import os
import secrets
import sys

from library_upload import (
    TURSO_API,
    VERCEL_API,
    VERCEL_PROJECT,
    ApiError,
    call,
    database_token,
    mask,
    redeploy,
    set_vercel_env,
    summary,
    turso_group,
    turso_org,
    vercel_scope,
)

DB_NAME = "rabai-people"
SECRET_KEY = "RABAI_AUTH_SECRET"


def hostname_of(token: str, org: str, name: str) -> str | None:
    try:
        info = call("GET", f"{TURSO_API}/organizations/{org}/databases/{name}", token)
    except ApiError as e:
        if e.status == 404:
            return None
        raise
    return info["database"]["Hostname"]


def ensure_database(token: str, org: str, group: str) -> tuple[str, bool]:
    """The people database's hostname, creating an empty database when there is none."""
    hostname = hostname_of(token, org, DB_NAME)
    if hostname:
        return hostname, False
    created = call("POST", f"{TURSO_API}/organizations/{org}/databases", token, {"name": DB_NAME, "group": group})
    return created["database"]["Hostname"], True


def vercel_has(vercel: str, scope: str, key: str) -> bool:
    """Whether the Vercel project already has a setting with this name. Reads names only, never values."""
    joiner = "&" if scope else "?"
    out = call("GET", f"{VERCEL_API}/v9/projects/{VERCEL_PROJECT}/env{scope}{joiner}decrypt=false", vercel)
    envs = out.get("envs", []) if isinstance(out, dict) else []
    return any(e.get("key") == key for e in envs)


def connect_app(token: str, org: str, url: str) -> None:
    """Give the app (on Vercel) the database's address, a token and the secret, and redeploy."""
    vercel = os.environ.get("VERCEL_TOKEN", "").strip()
    mask(vercel)
    if not vercel:
        summary("- No VERCEL_TOKEN secret, so the app was not connected. See web/README.md, \"Accounts\", "
                "for doing it by hand.")
        return
    scope = vercel_scope(vercel)
    # The app reads and writes this database, so its token is read and write, and it can reach only
    # this database.
    values = {"PEOPLE_DATABASE_URL": url, "PEOPLE_AUTH_TOKEN": database_token(token, org, DB_NAME, "full-access")}
    if vercel_has(vercel, scope, SECRET_KEY):
        summary(f"- {SECRET_KEY} is already set in Vercel and was kept (a new one would sign everyone out).")
    else:
        secret = secrets.token_hex(32)
        mask(secret)
        values[SECRET_KEY] = secret
        summary(f"- {SECRET_KEY} was made now (a long random key) and set in Vercel. It is not shown anywhere.")
    scope = set_vercel_env(vercel, values)
    redeploy(vercel, scope)


def main() -> int:
    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("Add the TURSO_API_TOKEN secret to the repository first (see web/README.md).")
    mask(token)
    org = turso_org(token)
    group = turso_group(token, org)
    hostname, created = ensure_database(token, org, group)
    url = f"libsql://{hostname}"
    summary("## The people database")
    summary(f"- Database: `{url}` ({'created now, empty' if created else 'already there, kept as it is'}).")
    summary("- The app makes its tables the first time it uses it.")
    connect_app(token, org, url)
    summary("- Next: set RESEND_API_KEY and RABAI_MAIL_FROM in Vercel by hand (web/README.md, \"Accounts\"). "
            "Until then, accounts stay off online, and \"Was this helpful?\" works.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
