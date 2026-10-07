"""Reading the library's text, and keeping the layouts, in a local library file or on Turso.

The layouts live in the library itself, in the table daf_layout (tools/library_schema.sql), so the
app reads them with the same connection it reads the text with. tools/library_upload.py copies the
table across when the library is rebuilt.
"""

import json
import sqlite3
import time
import urllib.error
import urllib.request

from .text import plain_text

TEXT_SQL = """SELECT p.ref, p.text, t.title, p.seq FROM passages p
  JOIN titles t ON t.id = p.title_id JOIN editions e ON e.id = p.edition_id
  WHERE t.title IN (?, ?, ?) AND e.language = 'he' AND p.seq > ? ORDER BY p.seq LIMIT ?"""

LAYOUT_TABLE = """CREATE TABLE IF NOT EXISTS daf_layout (
  section TEXT PRIMARY KEY, tractate TEXT NOT NULL, complete INTEGER NOT NULL, made_on TEXT NOT NULL, data TEXT NOT NULL)"""

PAGE = 2000


class LocalDb:
    def __init__(self, path):
        self.db = sqlite3.connect(path)

    def all(self, sql, args=()):
        return [list(r) for r in self.db.execute(sql, args).fetchall()]

    def run_many(self, statements):
        for sql, args in statements:
            self.db.execute(sql, args)
        self.db.commit()


class TursoDb:
    """Turso's HTTP API (a pipeline of statements), with only the standard library."""

    def __init__(self, hostname, token):
        self.url = f"https://{hostname}/v2/pipeline"
        self.token = token

    @staticmethod
    def _arg(v):
        if v is None:
            return {"type": "null"}
        if isinstance(v, bool):
            return {"type": "integer", "value": str(int(v))}
        if isinstance(v, int):
            return {"type": "integer", "value": str(v)}
        if isinstance(v, float):
            return {"type": "float", "value": v}
        return {"type": "text", "value": str(v)}

    def _pipeline(self, statements):
        body = {"requests": [{"type": "execute", "stmt": {"sql": s, "args": [self._arg(a) for a in args]}} for s, args in statements]
                + [{"type": "close"}]}
        data = json.dumps(body).encode()
        last = None
        for attempt in range(5):
            req = urllib.request.Request(self.url, data=data, method="POST")
            req.add_header("Authorization", f"Bearer {self.token}")
            req.add_header("Content-Type", "application/json")
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    out = json.loads(resp.read().decode())
                break
            except urllib.error.HTTPError as e:
                text = e.read().decode("utf-8", "replace")[:300]
                if e.code < 500 and e.code != 429:
                    raise RuntimeError(f"Turso answered HTTP {e.code}: {text}") from None
                last = RuntimeError(f"Turso answered HTTP {e.code}: {text}")
            except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                last = e
            time.sleep(3 * (attempt + 1))
        else:
            raise last
        results = []
        for r in out["results"][: len(statements)]:
            if r.get("type") != "ok":
                raise RuntimeError(f"Turso refused a statement: {json.dumps(r.get('error'))[:300]}")
            results.append(r["response"]["result"])
        return results

    def all(self, sql, args=()):
        res = self._pipeline([(sql, list(args))])[0]
        return [[c.get("value") for c in row] for row in res["rows"]]

    def run_many(self, statements):
        for i in range(0, len(statements), 20):
            self._pipeline(statements[i:i + 20])


def tractate_text(db, tractate):
    """Every amud's Hebrew Gemara, Rashi and Tosafot: {amud: {"main"|"rashi"|"tosafot": [{"ref", "he"}]}}.
    Like the app, only the first Hebrew edition of each passage is used."""
    titles = {tractate: "main", f"Rashi on {tractate}": "rashi", f"Tosafot on {tractate}": "tosafot"}
    out, seen = {}, set()
    last = -1
    while True:
        rows = db.all(TEXT_SQL, [*titles, last, PAGE])
        if not rows:
            break
        for ref, text, title, seq in rows:
            last = int(seq)
            if ref in seen:
                continue
            seen.add(ref)
            amud = ref[len(title) + 1:].split(":")[0]
            out.setdefault(amud, {"main": [], "rashi": [], "tosafot": []})[titles[title]].append({"ref": ref, "he": plain_text(text)})
        if len(rows) < PAGE:
            break
    return out


def save_layouts(db, records, made_on):
    stmts = [(LAYOUT_TABLE, [])]
    for rec in records:
        stmts.append(("INSERT OR REPLACE INTO daf_layout (section, tractate, complete, made_on, data) VALUES (?, ?, ?, ?, ?)",
                      [rec["section"], rec["tractate"], int(rec["complete"]), made_on, json.dumps(rec, ensure_ascii=False, separators=(",", ":"))]))
    db.run_many(stmts)
