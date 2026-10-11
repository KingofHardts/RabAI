#!/usr/bin/env python3
"""Map a Torah organization's website before copying any of it: its sitemaps, its sections, and
how an article page is built.

Run by the "Map a source's website" workflow (.github/workflows/site-map.yml), because Claude's
working sessions can't reach these sites. The workflow's log is public, so this prints only
structure: addresses, counts, page titles, author names, and the names of the tags that hold an
article. It never prints an article's text.

We have the site's written permission for private use (canon/permissions.yaml). We still copy
politely: one request at a time, a pause between requests (longer if the site asks for one), and
nothing the site's robots.txt asks robots to leave alone.

Usage: python3 tools/site_map.py aish|chabad|torahanytime [--samples N] [--max-sitemaps N] [--feeds]

--feeds also looks for a site's own feeds (RSS) and interface addresses, and checks whether each
answers a robot or shows it the site's bot check. For a site whose pages show every robot a check,
it also counts how many of its article pages the Internet Archive has kept (counts only, nothing
read from them).
"""

import gzip
import json
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from html.parser import HTMLParser

SITES = {
    "aish": {"home": "https://aish.com/", "hosts": {"aish.com", "www.aish.com"}},
    "chabad": {"home": "https://www.chabad.org/", "hosts": {"www.chabad.org", "chabad.org"}},
    "torahanytime": {"home": "https://www.torahanytime.com/", "hosts": {"www.torahanytime.com", "torahanytime.com"}},
}
USER_AGENT = "RabAIBot/1.0 (private Torah-learning tool, used with the site's written permission; +https://github.com/KingofHardts/RabAI)"
ROBOT_NAME = "RabAIBot"
SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
KEEP_PER_SECTION = 40  # sample addresses kept per section while counting

pause = 1.5  # seconds between requests; raised to the site's crawl-delay if it asks for more
_last = 0.0


def fetch(url: str, timeout: int = 30) -> tuple[int, bytes, str, dict]:
    """GET a URL politely. Returns (status, body, final URL, headers)."""
    global _last
    wait = pause - (time.time() - _last)
    if wait > 0:
        time.sleep(wait)
    _last = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            if r.headers.get("Content-Encoding") == "gzip" or url.endswith(".gz"):
                try:
                    body = gzip.decompress(body)
                except OSError:
                    pass
            return r.status, body, r.geturl(), dict(r.headers)
    except urllib.error.HTTPError as e:
        try:
            body = e.read(200000)
        except Exception:  # noqa: BLE001
            body = b""
        if (e.headers or {}).get("Content-Encoding") == "gzip":
            try:
                body = gzip.decompress(body)[:20000]
            except OSError:
                pass
        return e.code, body[:20000], url, dict(e.headers or {})
    except Exception as e:  # noqa: BLE001 - report and carry on
        print(f"  (could not fetch {url}: {type(e).__name__})")
        return 0, b"", url, {}


def blocked_hint(status: int, headers: dict, body: bytes) -> str:
    """Say when a response looks like a bot wall rather than the page, and which kind."""
    low = body[:20000].decode("utf-8", "replace").lower()
    mitigated = headers.get("cf-mitigated") or headers.get("Cf-Mitigated")
    if mitigated or "just a moment" in low or "cf-chl" in low or "challenge-platform" in low:
        return f" (a Cloudflare challenge page{', cf-mitigated: ' + mitigated if mitigated else ''})"
    if "error code: 1020" in low or "error 1020" in low or "access denied" in low:
        return " (a Cloudflare firewall rule blocked us: error 1020, access denied)"
    if "attention required" in low or "sorry, you have been blocked" in low:
        return " (Cloudflare blocked us: 'Sorry, you have been blocked')"
    if status in (403, 429, 503):
        return f" (the site refused or slowed us; ray {headers.get('cf-ray') or headers.get('CF-RAY') or '?'})"
    return ""


def read_robots(site: dict) -> tuple[urllib.robotparser.RobotFileParser, list[str]]:
    global pause
    url = urllib.parse.urljoin(site["home"], "/robots.txt")
    status, body, _, headers = fetch(url)
    print(f"robots.txt: HTTP {status}{blocked_hint(status, headers, body)}")
    rp = urllib.robotparser.RobotFileParser(url)
    lines = body.decode("utf-8", "replace").splitlines()
    rp.parse(lines)
    delay = rp.crawl_delay(ROBOT_NAME) or rp.crawl_delay("*")
    if delay and float(delay) > pause:
        pause = float(delay)
    disallowed = [ln.split(":", 1)[1].strip() for ln in lines if ln.lower().startswith("disallow:") and ln.split(":", 1)[1].strip()]
    print(f"  crawl-delay asked for: {delay}; pause used: {pause}s; disallow lines: {len(disallowed)}")
    for d in disallowed[:30]:
        print(f"    disallow {d}")
    maps = rp.site_maps() or []
    print(f"  sitemaps listed: {len(maps)}")
    return rp, maps


def section_of(url: str, depth: int) -> str:
    parts = [x for x in urllib.parse.urlparse(url).path.split("/") if x]
    return "/" + "/".join(parts[:depth])


def walk_sitemaps(start: list[str], site: dict, max_maps: int) -> tuple[dict, Counter, Counter, dict]:
    """Read the sitemaps (following sitemap indexes) and count the pages they list by section.

    Keeps only counts and a small random sample of addresses per section, so a site with
    millions of pages fits in memory.
    """
    rng = random.Random(0)
    queue, seen, per_map = list(start), set(), {}
    by1, by2, samples = Counter(), Counter(), defaultdict(list)
    per_file: dict[str, list[str]] = {}
    while queue and len(seen) < max_maps:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        status, body, _, headers = fetch(url)
        if status != 200 or not body:
            per_map[url] = f"HTTP {status}{blocked_hint(status, headers, body)}"
            continue
        try:
            root = ET.fromstring(body)
        except ET.ParseError:
            per_map[url] = "not XML"
            continue
        locs = [e.text.strip() for e in root.iter(f"{SITEMAP_NS}loc") if e.text]
        if root.tag.endswith("sitemapindex"):
            queue.extend(locs)
            per_map[url] = f"index of {len(locs)} sitemaps"
            continue
        here = 0
        for loc in locs:
            if urllib.parse.urlparse(loc).hostname not in site["hosts"]:
                continue
            here += 1
            by1[section_of(loc, 1)] += 1
            key = section_of(loc, 2)
            by2[key] += 1
            kept = samples[key]
            if len(kept) < KEEP_PER_SECTION:
                kept.append(loc)
            else:  # reservoir sample, so the kept addresses are spread over the whole section
                j = rng.randrange(by2[key])
                if j < KEEP_PER_SECTION:
                    kept[j] = loc
        per_map[url] = f"{here} pages"
        mine = [loc for loc in locs if urllib.parse.urlparse(loc).hostname in site["hosts"]]
        if mine:
            per_file[url] = [mine[0], mine[len(mine) // 2], mine[-1]]
    if queue:
        print(f"  (stopped after {len(seen)} sitemaps; {len(queue)} more were listed)")
    return per_map, by1, by2, samples, per_file


class Shape(HTMLParser):
    """Counts a page's tags, where its paragraphs sit, and its metadata. Keeps no text."""

    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = Counter()
        self.p_paths = Counter()
        self.h1_paths = Counter()
        self.stack: list[str] = []
        self.title = ""
        self._in_title = False
        self.meta = {}
        self.ld: list[str] = []
        self._in_ld = False
        self._in_code = 0  # inside <script> or <style>, which isn't visible text
        self.scripts = Counter()
        self.lang = ""
        self.canonical = ""
        self.text_len = 0
        self.same_site_links = Counter()

    @staticmethod
    def label(tag, a):
        cls = ".".join(a.get("class", "").split()[:2])
        return tag + (f".{cls}" if cls else "") + (f"#{a['id']}" if a.get("id") else "")

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        self.tags[tag] += 1
        if tag == "html":
            self.lang = a.get("lang", "")
        if tag == "p":
            self.p_paths[" > ".join(self.stack[-4:])] += 1
        if tag == "h1":
            self.h1_paths[" > ".join(self.stack[-3:])] += 1
        if tag == "title":
            self._in_title = True
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key in ("author", "article:author", "og:type", "article:section", "article:published_time", "og:site_name"):
                self.meta[key] = a.get("content", "")[:80]
        if tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href", "")[:160]
        if tag in ("script", "style"):
            self._in_code += 1
        if tag == "script":
            self.scripts[a.get("id") or a.get("type") or "(inline or src)"] += 1
            if a.get("type") == "application/ld+json":
                self._in_ld = True
        if tag not in self.VOID:
            self.stack.append(self.label(tag, a))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i].split(".")[0].split("#")[0] == tag:
                del self.stack[i:]
                break
        if tag == "title":
            self._in_title = False
        if tag in ("script", "style"):
            self._in_code = max(0, self._in_code - 1)
        if tag == "script":
            self._in_ld = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif self._in_ld:
            self.ld.append(data)
        elif not self._in_code:
            self.text_len += len(data.strip())


def ld_summary(chunks: list[str]) -> list[str]:
    """The types in a page's structured data, and which fields they fill (never their values)."""
    out = []
    for chunk in chunks:
        try:
            data = json.loads(chunk)
        except ValueError:
            continue
        items = data if isinstance(data, list) else data.get("@graph", [data]) if isinstance(data, dict) else []
        for item in items:
            if isinstance(item, dict):
                fields = sorted(k for k in item if k in ("author", "headline", "datePublished", "articleSection", "inLanguage", "articleBody", "keywords"))
                out.append(f"{item.get('@type')} {fields}")
    return out


def links_by_section(body: bytes, base: str, site: dict) -> Counter:
    class Links(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.found = Counter()

        def handle_starttag(self, tag, attrs):
            if tag != "a":
                return
            href = dict(attrs).get("href") or ""
            url = urllib.parse.urljoin(base, href)
            if urllib.parse.urlparse(url).hostname in site["hosts"]:
                self.found[section_of(url, 1)] += 1

    parser = Links()
    parser.feed(body.decode("utf-8", "replace"))
    return parser.found


def sample(url: str, rp) -> None:
    if not rp.can_fetch(ROBOT_NAME, url):
        print(f"- {url}\n    skipped: robots.txt asks robots to leave it alone")
        return
    status, body, final, headers = fetch(url)
    moved = f", moved to {final}" if final != url else ""
    print(f"- {url}\n    HTTP {status}, {len(body):,} bytes{moved}{blocked_hint(status, headers, body)}")
    if status != 200:
        return
    shape = Shape()
    shape.feed(body.decode("utf-8", "replace"))
    print(f"    title: {' '.join(shape.title.split())[:120]}")
    print(f"    lang: {shape.lang!r}; canonical: {shape.canonical}")
    print(f"    metadata: {shape.meta}")
    print(f"    structured data: {ld_summary(shape.ld)[:6]}")
    print(f"    scripts: {dict(shape.scripts.most_common(6))}")
    print(f"    tags: p={shape.tags['p']}, h1={shape.tags['h1']}, h2={shape.tags['h2']}, h3={shape.tags['h3']}, "
          f"article={shape.tags['article']}, blockquote={shape.tags['blockquote']}, li={shape.tags['li']}, table={shape.tags['table']}")
    print(f"    where the h1 sits: {shape.h1_paths.most_common(2)}")
    print("    where the paragraphs sit:")
    for path, count in shape.p_paths.most_common(4):
        print(f"      {count:4d}  {path}")
    print(f"    visible text, characters (not shown): {shape.text_len:,}")


EXTRA_PROBES = {
    # Status codes only, to see whether the whole site or only some pages refuse us.
    "chabad": [
        "https://www.chabad.org/sitemap.xml",
        "https://www.chabad.org/library/article_cdo/aid/1",
        "https://www.chabad.org/parshah/default_cdo/jewish/Parshah.htm",
        "https://www.chabad.org/dailystudy/default_cdo/jewish/Daily-Study.htm",
    ],
}


FEED_TYPES = ("application/rss+xml", "application/atom+xml", "application/feed+json")
# Addresses that look like a site's own interface, as they appear in its pages and scripts.
API_RE = re.compile(r"""(https?://[A-Za-z0-9.-]+\.[a-z]{2,}(?:/[A-Za-z0-9._~%-]*)*)|["'`](/(?:api|graphql|v[0-9])[/?][A-Za-z0-9._~/%-]*)""")
API_WORDS = re.compile(r"api|graphql|/v[0-9]+/|wp-json|lecture|speaker|shiur", re.I)
# Pictures, styles, fonts and media files are not interfaces, even when their address says "lecture".
NOT_AN_INTERFACE = re.compile(r"\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|woff2?|ttf|mp3|mp4|m4a|webm)(?:$|[?#])|/thumbnails?/", re.I)


def feed_links(body: bytes, base: str) -> list[str]:
    """The feeds a page names in its head (<link rel="alternate" type="application/rss+xml">), and
    the links whose address mentions rss or feed."""

    class Feeds(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.found: list[str] = []

        def handle_starttag(self, tag, attrs):
            a = dict(attrs)
            href = a.get("href") or ""
            if not href:
                return
            url = urllib.parse.urljoin(base, href)
            if tag == "link" and (a.get("type") or "").lower() in FEED_TYPES:
                self.found.append(url)
            elif tag == "a" and re.search(r"(^|[/_.-])(rss|feeds?)([/_.-]|$)", urllib.parse.urlparse(url).path, re.I):
                self.found.append(url)

    parser = Feeds()
    parser.feed(body.decode("utf-8", "replace"))
    return list(dict.fromkeys(parser.found))


def unarchive(url: str) -> str:
    """An address as the site has it, from the Internet Archive's copy of it."""
    m = re.match(r"https?://web\.archive\.org/web/[0-9a-z_]+/(https?://.+)$", url)
    return m.group(1) if m else url


def check_feed(url: str, rp) -> None:
    """Whether a feed answers a robot, and how many items it lists (counts only)."""
    if not rp.can_fetch(ROBOT_NAME, url):
        print(f"  feed {url}: robots.txt asks robots to leave it alone")
        return
    status, body, final, headers = fetch(url)
    kind = headers.get("Content-Type") or headers.get("content-type") or "?"
    items = ""
    if status == 200 and body:
        try:
            root = ET.fromstring(body)
            n = sum(1 for e in root.iter() if e.tag.split("}")[-1] in ("item", "entry"))
            full = sum(1 for e in root.iter() if e.tag.split("}")[-1] in ("encoded", "content"))
            items = f"; {n} items, {full} with a full-text field"
        except ET.ParseError:
            items = "; not XML"
    moved = f", moved to {final}" if final != url else ""
    print(f"  feed {url}: HTTP {status}, {kind}{moved}{blocked_hint(status, headers, body)}{items}")


def probe_feeds(name: str, site: dict, home_status: int, home_headers: dict, home_body: bytes, home_final: str, rp) -> None:
    """A site's own feeds and interface addresses, and whether they answer a robot.

    When the home page shows robots a check, the feeds are looked for in the Internet Archive's
    copy of the home page instead (addresses only), and then asked for from the site itself.
    """
    print("\nfeeds and interfaces (addresses, status codes and counts only):")
    blocked = home_status != 200 or bool(blocked_hint(home_status, home_headers, home_body))
    feeds = feed_links(home_body, home_final) if home_body and not blocked else []
    if blocked:
        archived = "https://web.archive.org/web/2025/" + site["home"]
        status, body, final, headers = fetch(archived, timeout=60)
        print(f"  the Internet Archive's copy of the home page: HTTP {status}{blocked_hint(status, headers, body)}")
        if status == 200:
            feeds += [unarchive(u) for u in feed_links(body, final)]
    feeds = [u for u in dict.fromkeys(feeds) if urllib.parse.urlparse(u).hostname in site["hosts"]]
    print(f"  feeds named: {len(feeds)}")
    for url in feeds[:12]:
        check_feed(url, rp)
    for url in FEED_GUESSES.get(name, []):
        if url not in feeds:
            check_feed(url, rp)
    # Interface addresses named in the home page and its own scripts (never their contents).
    apis: list[str] = []
    if home_body and not blocked:
        text = home_body.decode("utf-8", "replace")
        title = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
        print(f"  home page: {len(text):,} characters; title: {' '.join((title.group(1) if title else '').split())[:100]!r}")
        print(f"  frameworks seen: {[w for w in ('__NEXT_DATA__', '_next/static', 'ng-version', 'data-reactroot', '__NUXT__', 'wp-content', 'window.__INITIAL_STATE__') if w in text]}")
        scripts = [urllib.parse.urljoin(home_final, x) for x in re.findall(r"""<script[^>]+src=["']([^"']+)["']""", text)]
        hosts = Counter(urllib.parse.urlparse(x).hostname for x in scripts)
        print(f"  scripts on the home page, by host: {dict(hosts.most_common(8))}")
        domain = ".".join(sorted(site["hosts"], key=len)[0].split(".")[-2:])
        bodies = [text]
        own = [x for x in scripts if (urllib.parse.urlparse(x).hostname or "").endswith(domain)]
        for src in own[:12]:
            if rp.can_fetch(ROBOT_NAME, src):
                status, body, _, _ = fetch(src)
                if status == 200:
                    bodies.append(body.decode("utf-8", "replace"))
        print(f"  scripts read for addresses: {len(bodies) - 1}")
        # The app's own pages, as its scripts name them ("/lectures/", "/speakers/[slug]"): counts only.
        routes = Counter()
        for b in bodies[1:]:
            for r in ROUTE_RE.findall(b):
                if not NOT_AN_INTERFACE.search(r) and not r.startswith(("/_next", "/static")):
                    routes[re.sub(r"/[0-9]+(?=/|$)", "/<n>", r.rstrip("/") or "/")] += 1
        print(f"  the app's own page addresses named in its scripts (most common 40): {dict(routes.most_common(40))}")
        for b in bodies:
            for full, rel in API_RE.findall(b):
                a = full or rel
                if API_WORDS.search(a) and not NOT_AN_INTERFACE.search(a):
                    apis.append(a)
    apis = list(dict.fromkeys(a.rstrip("/") for a in apis))
    print(f"  interface addresses named in the home page and its scripts: {len(apis)}")
    for a in apis[:40]:
        print(f"    {a}")
    for url in PAGE_GUESSES.get(name, []):
        sample(url, rp)
    if DATA_PAGES.get(name):
        print("\nthe pages' own data (field names, kinds of links and media hosts only):")
        for url in DATA_PAGES[name]:
            page_data(url, rp)
    if blocked:
        archive_coverage(name)


ARCHIVE_PREFIXES = {
    "chabad": ["chabad.org/library/article_cdo/aid/", "chabad.org/parshah/article_cdo/aid/", "chabad.org/holidays/"],
}
PAGE_GUESSES = {
    # Pages to look at the shape of when a site has no sitemap (structure only).
    "torahanytime": ["https://www.torahanytime.com/speakers", "https://www.torahanytime.com/lectures/300000"],
}
# Pages whose data the site sends inside the page (a Next.js app's own data), looked at for the
# names of their fields, the kinds of addresses they link to, and their media hosts (never values).
DATA_PAGES = {
    "torahanytime": [
        "https://www.torahanytime.com/lectures/300000",
        "https://www.torahanytime.com/",
        "https://www.torahanytime.com/speakers",
        "https://www.torahanytime.com/search?q=kiddushin",
    ],
}
ROUTE_RE = re.compile(r"""["'`](/[a-z][a-z0-9-]*(?:/(?:[a-z0-9-]+|\[[a-zA-Z.]+\]|\$\{[^}]{1,30}\}))*/?)["'`?]""")
KEY_RE = re.compile(r'\\?"([A-Za-z_][A-Za-z0-9_]{1,40})\\?":')
PATH_RE = re.compile(r'(?:href=|\\?"href\\?":|\\?"url\\?":|\\?")\\?"?(/[a-z][a-z0-9-]*(?:/[A-Za-z0-9_.-]+)?)')
MEDIA_RE = re.compile(r"https?://([A-Za-z0-9.-]+)/[^\s\"'<>\\]*\.(mp3|mp4|m4a|m3u8|webm|ogg)", re.I)


def page_data(url: str, rp) -> None:
    """The names of the fields a page's own data carries, the kinds of links in it, and its media hosts."""
    if not rp.can_fetch(ROBOT_NAME, url):
        print(f"- {url}: robots.txt asks robots to leave it alone")
        return
    status, body, _, headers = fetch(url)
    print(f"- {url}: HTTP {status}{blocked_hint(status, headers, body)}")
    if status != 200:
        return
    text = body.decode("utf-8", "replace")
    keys = Counter(KEY_RE.findall(text))
    print(f"    field names in the page's data (most common 60): {[k for k, _ in keys.most_common(60)]}")
    paths = Counter("/".join(p.split("/")[:2]) + ("/<id>" if p.count("/") > 1 and p.split("/")[2].isdigit() else ("/<name>" if p.count("/") > 1 else "")) for p in PATH_RE.findall(text))
    print(f"    kinds of links: {dict(paths.most_common(25))}")
    records = {k: keys.get(k, 0) for k in ("lecture_title", "title", "speaker_name_last", "date_created", "desc", "transcript", "subcategories")}
    print(f"    how often a few lecture fields appear (counts only): {records}")
    media = Counter(f"{h} (.{ext})" for h, ext in MEDIA_RE.findall(text))
    print(f"    media hosts: {dict(media.most_common(8))}")
FEED_GUESSES = {
    # Addresses to try even if no page names them (status codes and item counts only).
    "chabad": ["https://www.chabad.org/tools/rss/default.xml", "https://www.chabad.org/rss.xml", "https://www.chabad.org/feed"],
    "torahanytime": ["https://www.torahanytime.com/feed", "https://www.torahanytime.com/rss"],
}


def archive_coverage(name: str) -> None:
    """How many distinct pages under each prefix the Internet Archive has kept (counts only)."""
    for prefix in ARCHIVE_PREFIXES.get(name, []):
        q = urllib.parse.urlencode({"url": prefix, "matchType": "prefix", "collapse": "urlkey", "filter": "statuscode:200", "fl": "urlkey", "limit": "5000"})
        status, body, _, headers = fetch(f"https://web.archive.org/cdx/search/cdx?{q}", timeout=120)
        lines = [ln for ln in body.decode("utf-8", "replace").splitlines() if ln.strip()] if status == 200 else []
        more = " (the first 5,000 looked at; there are more)" if len(lines) >= 5000 else ""
        print(f"  the Internet Archive keeps {len(lines):,} distinct pages under {prefix}{more}; HTTP {status}")


def probe_wordpress(site: dict) -> None:
    """A WordPress site's REST interface: its routes, how many posts it serves, and its categories.

    Prints names, numbers and field names only; never a post's text.
    """
    base = site["home"].rstrip("/") + "/wp-json"
    status, body, _, headers = fetch(base + "/")
    print(f"\nWordPress interface {base}/: HTTP {status}{blocked_hint(status, headers, body)}")
    if status == 200:
        try:
            info = json.loads(body)
            routes = sorted(info.get("routes", {}))
            print(f"  namespaces: {info.get('namespaces')}")
            print(f"  wp/v2 routes ({len([r for r in routes if r.startswith('/wp/v2/')])}):")
            for r in routes:
                if r.startswith("/wp/v2/") and "(?P" not in r:
                    print(f"    {r}")
        except ValueError:
            print("  (not JSON)")
    status, body, _, headers = fetch(base + "/wp/v2/posts?per_page=3&_fields=id,date,modified,link,title,categories,tags,author,type,content")
    total = headers.get("X-WP-Total") or headers.get("x-wp-total")
    print(f"posts: HTTP {status}{blocked_hint(status, headers, body)}; total {total}; pages of 3: {headers.get('X-WP-TotalPages') or headers.get('x-wp-totalpages')}")
    if status == 200:
        try:
            for post in json.loads(body):
                content = (post.get("content") or {}).get("rendered") or ""
                print(f"  post {post.get('id')}: {post.get('link')}; title: {(post.get('title') or {}).get('rendered', '')[:100]!r}; "
                      f"author id {post.get('author')}; categories {post.get('categories')}; date {post.get('date')}; "
                      f"content: {len(content):,} characters of HTML (not shown), <p> {content.count('<p')}, "
                      f"<h2> {content.count('<h2')}, <blockquote> {content.count('<blockquote')}, <img> {content.count('<img')}, "
                      f"<iframe> {content.count('<iframe')}")
        except ValueError:
            print("  (not JSON)")
    page, cats = 1, []
    while page <= 10:
        status, body, _, headers = fetch(base + f"/wp/v2/categories?per_page=100&page={page}&_fields=id,name,slug,parent,count")
        if status != 200:
            print(f"categories page {page}: HTTP {status}{blocked_hint(status, headers, body)}")
            break
        try:
            batch = json.loads(body)
        except ValueError:
            break
        if not batch:
            break
        cats += batch
        page += 1
    if cats:
        by_id = {c["id"]: c for c in cats}

        def path(c):
            parts, seen = [], set()
            while c and c["id"] not in seen:
                seen.add(c["id"])
                parts.append(c["name"])
                c = by_id.get(c.get("parent"))
            return " > ".join(reversed(parts))

        print(f"categories: {len(cats)} (path, slug, posts)")
        for c in sorted(cats, key=path):
            print(f"  {c['count']:6d}  {path(c)}  [{c['slug']}, id {c['id']}]")
    # Where the article's real author is kept, and how the category filter counts subcategories.
    def keys_of(value, depth=0):
        if isinstance(value, dict) and depth < 2:
            return {k: keys_of(v, depth + 1) for k, v in value.items()}
        return type(value).__name__

    status, body, _, headers = fetch(base + "/wp/v2/posts?per_page=2")
    if status == 200:
        try:
            posts = json.loads(body)
            for post in posts:
                y = post.get("yoast_head_json") or {}
                graph = (y.get("schema") or {}).get("@graph") or []
                schema_authors = [g.get("author", {}).get("name") for g in graph if isinstance(g, dict) and isinstance(g.get("author"), dict)]
                people = [g.get("name") for g in graph if isinstance(g, dict) and g.get("@type") == "Person"]
                print(f"post {post.get('id')} fields: {sorted(post)}")
                print(f"  yoast_head_json fields: {sorted(y)}")
                print(f"  yoast author: {y.get('author')!r}; schema Article author: {schema_authors}; schema people: {people}")
                print(f"  acf: {keys_of(post.get('acf')) if post.get('acf') else None}; meta: {keys_of(post.get('meta')) if post.get('meta') else None}")
                print(f"  links: {sorted((post.get('_links') or {}))}")
        except ValueError:
            print("  (not JSON)")
    status, body, _, headers = fetch(base + "/wp/v2/posts?per_page=1&_fields=id,yoast_head_json.author")
    print(f"nested _fields (yoast_head_json.author): HTTP {status}; body {body[:200]!r}")
    status, body, _, headers = fetch(base + "/wp/v2/authors?per_page=1")
    if status == 200:
        try:
            item = json.loads(body)[0]
            print(f"authors item fields: {sorted(item)}; acf: {keys_of(item.get('acf')) if item.get('acf') else None}; title: {(item.get('title') or {}).get('rendered')!r}")
        except (ValueError, IndexError):
            pass
    if cats:
        def descendants(cid):
            out, frontier = {cid}, [cid]
            while frontier:
                nxt = [c["id"] for c in cats if c.get("parent") in frontier]
                out.update(nxt)
                frontier = nxt
            return out

        for slug in ("ask-the-rabbi", "torah-portion", "holidays"):
            top = next((c for c in cats if c["slug"] == slug), None)
            if not top:
                continue
            ids = sorted(descendants(top["id"]))
            for label, q in (("the category alone", str(top["id"])), (f"with its {len(ids) - 1} subcategories", ",".join(map(str, ids)))):
                status, body, _, headers = fetch(base + f"/wp/v2/posts?per_page=1&_fields=id&categories={q}")
                print(f"posts in {slug}, {label}: HTTP {status}; total {headers.get('X-WP-Total') or headers.get('x-wp-total')}")
    for kind in ("parsha", "holiday", "authors", "author", "daily_quotes", "spirituality"):
        status, body, _, headers = fetch(base + f"/wp/v2/{kind}?per_page=1&_fields=id,link,type")
        print(f"route /wp/v2/{kind}: HTTP {status}; total {headers.get('X-WP-Total') or headers.get('x-wp-total')}")


def main() -> int:
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    if name not in SITES:
        print(__doc__)
        return 2
    samples_per = int(sys.argv[sys.argv.index("--samples") + 1]) if "--samples" in sys.argv else 3
    max_maps = int(sys.argv[sys.argv.index("--max-sitemaps") + 1]) if "--max-sitemaps" in sys.argv else 400
    site = SITES[name]
    print(f"# {name}: {site['home']}")
    status, body, final, headers = fetch(site["home"])
    moved = f", moved to {final}" if final != site["home"] else ""
    print(f"home page: HTTP {status}{moved}{blocked_hint(status, headers, body)}; server: {headers.get('Server', '?')}")
    if body:
        print("links on the home page, by section:")
        for section, count in links_by_section(body, final, site).most_common(40):
            print(f"  {count:5d}  {section}")
    rp, maps = read_robots(site)
    if not maps:
        maps = [urllib.parse.urljoin(site["home"], p) for p in ("/sitemap.xml", "/sitemap_index.xml")]
    per_map, by1, by2, kept, per_file = walk_sitemaps(maps, site, max_maps)
    print(f"\nsitemaps read: {len(per_map)}")
    for url, what in list(per_map.items())[:80]:
        print(f"  {url}: {what}")
    if len(per_map) > 80:
        print(f"  ... and {len(per_map) - 80} more")
    print(f"\npages listed on this site: {sum(by1.values()):,}")
    for label, counts in (("first part", by1), ("first two parts", by2)):
        print(f"\nlargest sections by the {label} of the address:")
        for section, count in counts.most_common(60):
            print(f"  {count:8,}  {section}")
    print("\nsample pages from the largest sections (structure only):")
    for section, _ in by2.most_common(6):
        urls = kept[section]
        for url in urls[:samples_per]:
            sample(url, rp)
    # One page from each kind of sitemap file, spread over the numbered ones (post-sitemap,
    # post-sitemap17, ...), so a site whose articles sit at flat addresses is sampled too.
    kinds: dict[str, list[str]] = defaultdict(list)
    for url in per_file:
        stem = urllib.parse.urlparse(url).path.rstrip("/").rsplit("/", 1)[-1]
        kinds[stem.rstrip("0123456789.xmlgz").rstrip("-_") or stem].append(url)
    print("\nsample pages from each kind of sitemap (structure only):")
    for kind, files in sorted(kinds.items()):
        picks = [files[0], files[len(files) // 2], files[-1]][: max(1, samples_per)] if len(files) > 2 else files[:1]
        for f in dict.fromkeys(picks):
            print(f"[{kind}] from {f}")
            sample(per_file[f][1], rp)
    if "--wordpress" in sys.argv:
        probe_wordpress(site)
    if "--feeds" in sys.argv:
        probe_feeds(name, site, status, headers, body, final, rp)
    for url in EXTRA_PROBES.get(name, []):
        status, body, final, headers = fetch(url)
        print(f"probe {url}: HTTP {status}{blocked_hint(status, headers, body)}" + (f", moved to {final}" if final != url else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
