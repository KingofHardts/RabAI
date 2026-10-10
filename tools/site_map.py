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

Usage: python3 tools/site_map.py aish|chabad [--samples N] [--max-sitemaps N]
"""

import gzip
import json
import random
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
            body = e.read(20000)
        except Exception:  # noqa: BLE001
            body = b""
        return e.code, body, url, dict(e.headers or {})
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
    for url in EXTRA_PROBES.get(name, []):
        status, body, final, headers = fetch(url)
        print(f"probe {url}: HTTP {status}{blocked_hint(status, headers, body)}" + (f", moved to {final}" if final != url else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
