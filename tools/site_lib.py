"""Shared pieces for copying an organization's website into a collection database.

- `Polite`: fetches one page at a time, with a pause between requests (the site's crawl-delay
  if it asks for more), and refuses addresses the site's robots.txt asks robots to leave alone.
- `paragraphs`: an article's HTML as reading paragraphs: text only, no images, video, scripts,
  forms or footnote marks.
- `Sink`: where the rows go: a local SQLite file, or a Turso database over HTTPS.

Uses only the standard library. Never prints an article's text: this runs in public GitHub
Actions logs.
"""

import base64
import gzip
import hashlib
import html
import json
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from html.parser import HTMLParser

USER_AGENT = "RabAIBot/1.0 (private Torah-learning tool, used with the site's written permission; +https://github.com/KingofHardts/RabAI)"
ROBOT_NAME = "RabAIBot"


# ---------------------------------------------------------------------------------------------
# Fetching


class Polite:
    """One request at a time, with a pause between them, within what robots.txt allows."""

    def __init__(self, home: str, pause: float = 1.5, extra_headers: dict | None = None):
        self.home = home
        self.pause = pause
        self.extra_headers = extra_headers or {}
        self.last = 0.0
        self.requests = 0
        self.robots = urllib.robotparser.RobotFileParser(urllib.parse.urljoin(home, "/robots.txt"))
        status, body, _ = self.get(urllib.parse.urljoin(home, "/robots.txt"), check_robots=False)
        self.robots.parse(body.decode("utf-8", "replace").splitlines() if status == 200 else [])
        delay = self.robots.crawl_delay(ROBOT_NAME) or self.robots.crawl_delay("*")
        if delay and float(delay) > self.pause:
            self.pause = float(delay)

    def allowed(self, url: str) -> bool:
        return self.robots.can_fetch(ROBOT_NAME, url)

    def get(self, url: str, check_robots: bool = True, timeout: int = 90, attempts: int = 4) -> tuple[int, bytes, dict]:
        """GET a URL. Returns (status, body, headers). Retries a refused or failed request a few times."""
        if check_robots and not self.allowed(url):
            raise PermissionError(f"robots.txt asks robots to leave {url} alone")
        status, body, headers = 0, b"", {}
        for attempt in range(attempts):
            wait = self.pause - (time.time() - self.last)
            if wait > 0:
                time.sleep(wait)
            self.last = time.time()
            self.requests += 1
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip", **self.extra_headers})
            try:
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    body = r.read()
                    if r.headers.get("Content-Encoding") == "gzip":
                        body = gzip.decompress(body)
                    return r.status, body, dict(r.headers)
            except urllib.error.HTTPError as e:
                status, headers = e.code, dict(e.headers or {})
                body = _error_body(e, headers)
                if e.code not in (429, 500, 502, 503, 504):
                    return status, body, headers
                retry_after = headers.get("Retry-After") or headers.get("retry-after")
                time.sleep(min(120, float(retry_after)) if (retry_after or "").isdigit() else 10 * (attempt + 1))
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
                status = 0
                time.sleep(10 * (attempt + 1))
        return status, body, headers


def _error_body(err: urllib.error.HTTPError, headers: dict) -> bytes:
    """The first few KB of an error page, for error_hint. Never printed whole."""
    try:
        raw = err.read()
        if header(headers, "Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        return raw[:4096]
    except Exception:  # noqa: BLE001 - only a hint
        return b""


def header(headers: dict, name: str) -> str | None:
    """A response header, whatever case the server wrote its name in."""
    want = name.lower()
    return next((v for k, v in (headers or {}).items() if k.lower() == want), None)


def error_hint(body: bytes) -> str:
    """A short, safe description of an error page: WordPress's error code, or the page's title."""
    text = body.decode("utf-8", "replace") if body else ""
    try:
        data = json.loads(text)
        if isinstance(data, dict) and data.get("code"):
            return str(data["code"])[:80]
    except ValueError:
        pass
    m = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
    return SPACES.sub(" ", html.unescape(m.group(1))).strip()[:80] if m else ""


# ---------------------------------------------------------------------------------------------
# Text

# Whole elements whose content is never text to keep.
SKIP = {"script", "style", "noscript", "iframe", "video", "audio", "object", "embed", "svg", "canvas",
        "form", "button", "select", "textarea", "input", "figure", "figcaption", "picture", "img",
        "sup", "nav", "template"}
BLOCKS = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "dd", "dt", "td", "th", "div", "section", "article", "tr"}
HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
SPACES = re.compile(r"[ \t   ​ ﻿]+")
BIDI = re.compile(r"[‎‏‪-‮⁦-⁩]")


class _Text(HTMLParser):
    """Collects block-level runs of text, each tagged with the kind of block it came from."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks: list[tuple[str, str]] = []  # (kind, text)
        self.buf: list[str] = []
        self.kind = "p"
        self.skip = 0
        self.stack: list[str] = []

    def flush(self):
        text = "".join(self.buf)
        text = BIDI.sub("", text)
        lines = [SPACES.sub(" ", line).strip() for line in text.split("\n")]
        text = "\n".join(line for line in lines if line)
        if text:
            self.blocks.append((self.kind, text))
        self.buf = []

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            if tag == "br" and not self.skip:
                self.buf.append("\n")
            return
        self.stack.append(tag)
        if tag in SKIP:
            self.skip += 1
            return
        if self.skip:
            return
        if tag in BLOCKS:
            self.flush()
            self.kind = "h" if tag in HEADINGS else "li" if tag == "li" else "p"

    def handle_endtag(self, tag):
        if tag in VOID or tag not in self.stack:
            return
        while self.stack:
            top = self.stack.pop()
            if top in SKIP:
                self.skip = max(0, self.skip - 1)
            elif not self.skip and top in BLOCKS:
                self.flush()
                self.kind = "p"
            if top == tag:
                break

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)

    def close(self):
        super().close()
        self.flush()


def paragraphs(html_text: str, max_chars: int = 2200) -> list[str]:
    """An article's HTML as reading paragraphs.

    A heading is kept with the paragraph after it, and the items of a list are kept together, so
    each passage reads on its own. A very long paragraph is split at a sentence end.
    """
    parser = _Text()
    parser.feed(html_text or "")
    parser.close()
    out: list[str] = []
    heading: list[str] = []
    items: list[str] = []

    def push(text: str):
        nonlocal heading
        if heading:
            text = "\n".join(heading + [text])
            heading = []
        out.extend(split_long(text, max_chars))

    def end_list():
        nonlocal items
        if items:
            push("\n".join(f"• {item}" for item in items))
            items = []

    for kind, text in parser.blocks:
        if kind != "li":
            end_list()
        if kind == "h":
            heading.append(text)
        elif kind == "li":
            items.append(text)
        else:
            push(text)
    end_list()
    if heading:
        out.append("\n".join(heading))
    return [p for p in out if re.search(r"\w", p)]


def split_long(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    out, rest = [], text
    while len(rest) > max_chars:
        cut = rest[:max_chars]
        end = max(cut.rfind(". "), cut.rfind("? "), cut.rfind("! "), cut.rfind("\n"))
        end = end + 1 if end > max_chars * 0.5 else max_chars
        out.append(rest[:end].strip())
        rest = rest[end:].strip()
    if rest:
        out.append(rest)
    return out


QUOTES = str.maketrans({"\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'", "\u2032": "'",
                        "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u201f": '"', "\u2033": '"'})
DASH = "\u2010\u2011\u2012\u2013\u2014\u2015\u2212"


def clean_title(raw: str) -> str:
    """A title as plain text, safe inside a library reference.

    A colon separates a reference's levels ("Genesis 1:1") and the app reads a long dash between
    numbers as a range ("Genesis 1:1\u20135"), so a colon becomes " - " and every kind of dash a
    plain hyphen. Curly quotes become straight ones, the way RabAI writes a reference back.
    """
    text = html.unescape(re.sub(r"<[^>]+>", "", raw or ""))
    text = BIDI.sub("", text).translate(QUOTES)
    text = SPACES.sub(" ", text).strip()
    text = re.sub(r"\s*:\s*", " - ", text)
    text = re.sub(rf"\s+[{DASH}-]+\s+", " - ", text)
    text = re.sub(rf"[{DASH}]", "-", text)
    return text[:180].strip() or "Untitled"


def site_label(home: str) -> str:
    """"https://www.chabad.org/" -> "Chabad.org"; "https://aish.com/" -> "Aish.com"."""
    host = urllib.parse.urlparse(home).hostname or home
    host = host[4:] if host.startswith("www.") else host
    return host[:1].upper() + host[1:]


def checksum(parts: list[str]) -> str:
    return hashlib.sha256("\n\n".join(parts).encode("utf-8")).hexdigest()[:32]


# ---------------------------------------------------------------------------------------------
# Where rows go


class Sink:
    """Runs statements against a collection database. Each batch is one transaction."""

    def query(self, sql: str, args: list | None = None) -> list[list]:
        raise NotImplementedError

    def batch(self, statements: list[tuple[str, list]]) -> None:
        raise NotImplementedError

    def script(self, sql: str) -> None:
        """Several statements separated by semicolons (for the schema)."""
        statements = [s.strip() for s in split_sql(sql) if s.strip()]
        self.batch([(s, []) for s in statements])


def split_sql(sql: str) -> list[str]:
    """Split a schema file into statements, leaving comments out."""
    lines = [line for line in sql.splitlines() if not line.strip().startswith("--")]
    text = "\n".join(re.sub(r"\s--.*$", "", line) for line in lines)
    return [s for s in text.split(";")]


class LocalSink(Sink):
    def __init__(self, path):
        self.con = sqlite3.connect(path)

    def query(self, sql, args=None):
        return [list(r) for r in self.con.execute(sql, args or [])]

    def batch(self, statements):
        try:
            self.con.execute("BEGIN")
            for sql, args in statements:
                self.con.execute(sql, args)
            self.con.execute("COMMIT")
        except Exception:
            self.con.execute("ROLLBACK")
            raise

    def close(self):
        self.con.close()


def _arg(value) -> dict:
    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "integer", "value": str(int(value))}
    if isinstance(value, int):
        return {"type": "integer", "value": str(value)}
    if isinstance(value, float):
        return {"type": "float", "value": value}
    if isinstance(value, bytes):
        return {"type": "blob", "base64": base64.b64encode(value).decode()}
    return {"type": "text", "value": str(value)}


def _value(cell: dict):
    kind = cell.get("type")
    if kind == "null":
        return None
    if kind == "integer":
        return int(cell["value"])
    if kind == "float":
        return float(cell["value"])
    if kind == "blob":
        return base64.b64decode(cell.get("base64", ""))
    return cell.get("value")


class TursoSink(Sink):
    """A Turso database over its HTTP interface (Hrana v2 pipeline). The token is never printed."""

    def __init__(self, hostname: str, token: str):
        self.url = f"https://{hostname}/v2/pipeline"
        self.token = token

    def _post(self, body: dict) -> dict:
        data = json.dumps(body).encode()
        last = None
        for attempt in range(5):
            req = urllib.request.Request(self.url, data=data, method="POST")
            req.add_header("Authorization", f"Bearer {self.token}")
            req.add_header("Content-Type", "application/json")
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    return json.loads(resp.read().decode() or "{}")
            except urllib.error.HTTPError as e:
                text = e.read().decode("utf-8", "replace")[:300]
                if e.code < 500 and e.code != 429:
                    raise RuntimeError(f"Turso answered HTTP {e.code}: {text}") from None
                last = RuntimeError(f"Turso answered HTTP {e.code}: {text}")
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
                last = e
            time.sleep(3 * (attempt + 1))
        raise last

    def query(self, sql, args=None):
        body = {"requests": [{"type": "execute", "stmt": {"sql": sql, "args": [_arg(a) for a in args or []]}}, {"type": "close"}]}
        out = self._post(body)["results"][0]
        if out.get("type") != "ok":
            raise RuntimeError(f"Turso refused a query: {json.dumps(out.get('error'))[:300]}")
        return [[_value(c) for c in row] for row in out["response"]["result"]["rows"]]

    def batch(self, statements):
        steps = [{"stmt": {"sql": "BEGIN"}}]
        for sql, args in statements:
            steps.append({"stmt": {"sql": sql, "args": [_arg(a) for a in args]}, "condition": {"type": "ok", "step": len(steps) - 1}})
        commit = len(steps)
        steps.append({"stmt": {"sql": "COMMIT"}, "condition": {"type": "ok", "step": commit - 1}})
        steps.append({"stmt": {"sql": "ROLLBACK"}, "condition": {"type": "not", "cond": {"type": "ok", "step": commit}}})
        out = self._post({"requests": [{"type": "batch", "batch": {"steps": steps}}, {"type": "close"}]})["results"][0]
        if out.get("type") != "ok":
            raise RuntimeError(f"Turso refused a batch: {json.dumps(out.get('error'))[:300]}")
        errors = out["response"]["result"].get("step_errors") or []
        failed = [(i, e) for i, e in enumerate(errors) if e]
        if failed:
            i, e = failed[0]
            raise RuntimeError(f"Turso refused step {i} of a batch: {json.dumps(e)[:300]}")
