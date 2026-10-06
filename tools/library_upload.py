#!/usr/bin/env python3
"""Upload the private testing library to Turso, and point the app at it.

Runs in GitHub Actions after tools/library_build.py (see .github/workflows/library-build.yml).
Uses only the standard library.

Settings (GitHub Actions secrets):
  TURSO_API_TOKEN   required. A Turso Platform API token.
  TURSO_ORG         optional. The Turso organization; found from the token when there is one.
  VERCEL_TOKEN      optional. When set, the app's Vercel settings are updated and the app is
                    redeployed, so no token ever has to be copied by hand.

What it does:
  1. Finds or creates a Turso group (in us-east-1, next to Vercel's default region).
  2. Replaces the database "rabai-library" with the new file. The database is down for the
     few minutes of the upload.
  3. Makes a read-only token for the group. A group token keeps working when the database is
     rebuilt, so the app's settings only change the first time.
  4. With VERCEL_TOKEN: sets TURSO_DATABASE_URL and TURSO_AUTH_TOKEN on the Vercel project
     "rab-ai" and starts a new production deploy.

Tokens are never printed. Each one is masked in the Actions log before it is used.

Usage: python3 tools/library_upload.py [--db PATH]
"""

import http.client
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "library" / "rabai-library.db"
DB_NAME = "rabai-library"
GROUP_NAME = "rabai"
# Next to Vercel's default region (Washington, D.C.). Older Turso accounts name it "iad".
LOCATIONS = ["aws-us-east-1", "iad"]
TURSO_API = "https://api.turso.tech/v1"
VERCEL_API = "https://api.vercel.com"
VERCEL_PROJECT = "rab-ai"


def mask(secret: str) -> None:
    """Hide a value in the GitHub Actions log from here on."""
    if secret and os.environ.get("GITHUB_ACTIONS"):
        print(f"::add-mask::{secret}", flush=True)


def summary(line: str) -> None:
    print(line, flush=True)
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line + "\n")


class ApiError(Exception):
    def __init__(self, status: int, body: str):
        super().__init__(f"HTTP {status}: {body[:300]}")
        self.status = status


def call(method: str, url: str, token: str, body=None, attempts: int = 4):
    data = None if body is None else json.dumps(body).encode()
    for attempt in range(attempts):
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode() or "{}"
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            text = e.read().decode("utf-8", "replace")
            if e.code < 500 and e.code != 429:
                raise ApiError(e.code, text) from None
            last = ApiError(e.code, text)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last = e
        time.sleep(3 * (attempt + 1))
    raise last


# ---------------------------------------------------------------------------------------------
# Turso


def turso_org(token: str) -> str:
    if os.environ.get("TURSO_ORG"):
        return os.environ["TURSO_ORG"].strip()
    orgs = call("GET", f"{TURSO_API}/organizations", token)
    orgs = orgs if isinstance(orgs, list) else orgs.get("organizations", [])
    personal = [o for o in orgs if o.get("type") == "personal"]
    chosen = personal or orgs
    if len(chosen) != 1:
        names = ", ".join(o.get("slug", "?") for o in orgs)
        raise SystemExit(f"Several Turso organizations ({names}). Add a TURSO_ORG secret naming the one to use.")
    return chosen[0]["slug"]


def turso_group(token: str, org: str) -> str:
    groups = call("GET", f"{TURSO_API}/organizations/{org}/groups", token).get("groups", [])
    names = [g["name"] for g in groups]
    if GROUP_NAME in names:
        return GROUP_NAME
    if names:
        return names[0]
    for location in LOCATIONS:
        try:
            call("POST", f"{TURSO_API}/organizations/{org}/groups", token, {"name": GROUP_NAME, "location": location})
            return GROUP_NAME
        except ApiError as e:
            if e.status >= 500 or location == LOCATIONS[-1]:
                raise
            print(f"Location {location} not accepted ({e.status}); trying the next.", flush=True)
    return GROUP_NAME


def replace_database(token: str, org: str, group: str) -> str:
    """Delete the old library database (if any) and create an empty one ready for upload."""
    base = f"{TURSO_API}/organizations/{org}/databases"
    try:
        call("DELETE", f"{base}/{DB_NAME}", token)
        print(f"Removed the previous {DB_NAME} database.", flush=True)
        time.sleep(5)
    except ApiError as e:
        if e.status != 404:
            raise
    created = call("POST", base, token, {"name": DB_NAME, "group": group, "seed": {"type": "database_upload"}})
    return created["database"]["Hostname"]


def database_token(token: str, org: str, name: str, access: str) -> str:
    query = urllib.parse.urlencode({"expiration": "never", "authorization": access})
    jwt = call("POST", f"{TURSO_API}/organizations/{org}/databases/{name}/auth/tokens?{query}", token)["jwt"]
    mask(jwt)
    return jwt


def group_token(token: str, org: str, group: str, access: str) -> str:
    query = urllib.parse.urlencode({"expiration": "never", "authorization": access})
    jwt = call("POST", f"{TURSO_API}/organizations/{org}/groups/{group}/auth/tokens?{query}", token)["jwt"]
    mask(jwt)
    return jwt


def upload(hostname: str, db_token: str, path: Path) -> None:
    """Stream the file to the new database's upload endpoint."""
    size = path.stat().st_size
    for attempt in range(3):
        conn = http.client.HTTPSConnection(hostname, timeout=1800)
        try:
            conn.putrequest("POST", "/v1/upload")
            conn.putheader("Authorization", f"Bearer {db_token}")
            conn.putheader("Content-Type", "application/octet-stream")
            conn.putheader("Content-Length", str(size))
            conn.endheaders()
            sent = 0
            with open(path, "rb") as f:
                while chunk := f.read(8 << 20):
                    conn.send(chunk)
                    sent += len(chunk)
                    if sent % (256 << 20) < (8 << 20):
                        print(f"  uploaded {sent / 1e6:.0f} of {size / 1e6:.0f} MB", flush=True)
            resp = conn.getresponse()
            body = resp.read().decode("utf-8", "replace")
            if 200 <= resp.status < 300:
                return
            print(f"Upload answered HTTP {resp.status}: {body[:300]}", flush=True)
        except (OSError, http.client.HTTPException) as e:
            print(f"Upload interrupted: {e}", flush=True)
        finally:
            conn.close()
        time.sleep(15 * (attempt + 1))
    raise SystemExit("The upload did not finish. Run the workflow again.")


def check(hostname: str, read_token: str) -> dict:
    """Ask the uploaded database for its own description."""
    body = {"requests": [{"type": "execute", "stmt": {"sql": "SELECT key, value FROM meta"}}, {"type": "close"}]}
    for attempt in range(10):
        try:
            out = call("POST", f"https://{hostname}/v2/pipeline", read_token, body, attempts=1)
            rows = out["results"][0]["response"]["result"]["rows"]
            return {r[0]["value"]: r[1]["value"] for r in rows}
        except Exception as e:  # the database can take a moment to come up after an upload
            last = e
            time.sleep(10)
    raise SystemExit(f"The uploaded library did not answer: {last}")


# ---------------------------------------------------------------------------------------------
# Vercel


def vercel_scope(token: str) -> str:
    """'' for a personal project, or '?teamId=…' when the project belongs to a team."""
    try:
        call("GET", f"{VERCEL_API}/v9/projects/{VERCEL_PROJECT}", token)
        return ""
    except ApiError as e:
        if e.status not in (403, 404):
            raise
    teams = call("GET", f"{VERCEL_API}/v2/teams", token).get("teams", [])
    for team in teams:
        scope = "?" + urllib.parse.urlencode({"teamId": team["id"]})
        try:
            call("GET", f"{VERCEL_API}/v9/projects/{VERCEL_PROJECT}{scope}", token)
            return scope
        except ApiError:
            continue
    raise SystemExit(f"The Vercel token can't see the project {VERCEL_PROJECT}.")


def update_vercel(token: str, url: str, read_token: str) -> None:
    scope = vercel_scope(token)
    joiner = "&" if scope else "?"
    env = [
        {"key": "TURSO_DATABASE_URL", "value": url, "type": "encrypted", "target": ["production", "preview"]},
        {"key": "TURSO_AUTH_TOKEN", "value": read_token, "type": "encrypted", "target": ["production", "preview"]},
    ]
    call("POST", f"{VERCEL_API}/v10/projects/{VERCEL_PROJECT}/env{scope}{joiner}upsert=true", token, env)
    summary("- Vercel settings updated: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (values not shown).")
    repo_id = os.environ.get("GITHUB_REPOSITORY_ID")
    if not repo_id:
        summary("- Redeploy the app in Vercel so it picks up the new settings.")
        return
    deploy = {
        "name": VERCEL_PROJECT,
        "project": VERCEL_PROJECT,
        "target": "production",
        "gitSource": {"type": "github", "repoId": int(repo_id), "ref": "main"},
    }
    try:
        out = call("POST", f"{VERCEL_API}/v13/deployments{scope}{joiner}forceNew=1", token, deploy)
        summary(f"- A new production deploy started ({out.get('id', 'id not reported')}).")
    except ApiError as e:
        summary(f"- Couldn't start a deploy ({e.status}). Redeploy the app in Vercel: Deployments, then Redeploy.")


# ---------------------------------------------------------------------------------------------


def main() -> int:
    path = Path(sys.argv[sys.argv.index("--db") + 1]) if "--db" in sys.argv else DB_PATH
    token = os.environ.get("TURSO_API_TOKEN", "").strip()
    if not token:
        raise SystemExit("Add the TURSO_API_TOKEN secret to the repository first (see web/README.md).")
    mask(token)
    vercel = os.environ.get("VERCEL_TOKEN", "").strip()
    mask(vercel)
    if not path.exists():
        raise SystemExit(f"No library file at {path}. Run tools/library_build.py first.")

    org = turso_org(token)
    group = turso_group(token, org)
    hostname = replace_database(token, org, group)
    upload_token = database_token(token, org, DB_NAME, "full-access")
    print(f"Uploading {path.stat().st_size / 1e6:.0f} MB to {hostname}…", flush=True)
    upload(hostname, upload_token, path)
    read_token = group_token(token, org, group, "read-only")
    meta = check(hostname, read_token)

    url = f"libsql://{hostname}"
    summary("## Testing library uploaded")
    summary(f"- Database: `{url}` (private; reading it needs a token)")
    summary(f"- {meta.get('passages', '?')} passages, {meta.get('titles', '?')} books, {meta.get('editions', '?')} editions, "
            f"{meta.get('links', '?')} links")
    summary(f"- Built {meta.get('built_at', '?')} from canon commit {meta.get('canon_commit', '?')}, "
            f"Sefaria export {meta.get('sefaria_export', '?')}")
    summary(f"- {meta.get('label', '')}")
    if vercel:
        update_vercel(vercel, url, read_token)
    else:
        summary("- No VERCEL_TOKEN secret, so the app's settings were not changed. See web/README.md, "
                "\"Connecting the testing library\".")
    return 0


if __name__ == "__main__":
    sys.exit(main())
