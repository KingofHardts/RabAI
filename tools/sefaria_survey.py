#!/usr/bin/env python3
"""Report what Sefaria holds for each canon work: titles, editions, licenses and size.

Runs in GitHub Actions (the development sandbox cannot reach Sefaria). It reads only
metadata: the table of contents, the list of versions for sample titles, and each title's
shape (how many segments it has). It downloads no texts except one small probe.

The report is used to map each canon edition to an exact Sefaria version. Nothing here
approves anything: canon.yaml and the rabbinic board decide what enters the library.

Usage: python3 tools/sefaria_survey.py [--only id1,id2]
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
API = "https://www.sefaria.org"
HEADERS = {"User-Agent": "RabAI-library-survey (https://github.com/KingofHardts/RabAI)"}
PAUSE = 0.15


def get(url: str, *, attempts: int = 3):
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read()
                time.sleep(PAUSE)
                ctype = resp.headers.get("Content-Type", "")
                return resp.status, (json.loads(body) if "json" in ctype else body.decode("utf-8", "replace"))
        except urllib.error.HTTPError as e:
            if e.code in (404, 400):
                return e.code, None
            time.sleep(2 * (attempt + 1))
        except Exception:  # network hiccup
            time.sleep(2 * (attempt + 1))
    return 0, None


def q(title: str) -> str:
    return urllib.parse.quote(title.replace(" ", "_"), safe="_,'")


def walk(nodes, out):
    for node in nodes:
        if "contents" in node:
            walk(node["contents"], out)
        elif node.get("title"):
            out.append({"title": node["title"], "he": node.get("heTitle"), "cats": node.get("categories") or []})
    return out


def matches(entry: dict, book: dict) -> bool:
    if not entry.get("re") and not entry.get("cat"):
        return False
    if entry.get("root") and (not book["cats"] or book["cats"][0] != entry["root"]):
        return False
    if entry.get("cat"):
        paths = entry["cat"]
        if not any(book["cats"] == list(p) for p in paths):
            return False
    if entry.get("re") and not re.search(entry["re"], book["title"], re.IGNORECASE):
        return False
    return True


def segments(shape) -> int:
    if isinstance(shape, int):
        return shape
    if isinstance(shape, list):
        return sum(segments(x) for x in shape)
    if isinstance(shape, dict):
        return segments(shape.get("chapters", 0))
    return 0


def shape_of(title: str) -> int:
    status, data = get(f"{API}/api/shape/{q(title)}")
    if not data:
        return 0
    if isinstance(data, list):
        return sum(segments(d) for d in data)
    return segments(data)


def versions_of(title: str) -> list:
    status, data = get(f"{API}/api/texts/versions/{q(title)}")
    out = []
    for v in data or []:
        if not isinstance(v, dict):
            continue
        src = v.get("versionSource") or ""
        out.append(
            {
                "lang": v.get("actualLanguage") or v.get("language"),
                "title": v.get("versionTitle"),
                "license": v.get("license"),
                "source": urllib.parse.urlparse(src).netloc or src[:60],
            }
        )
    return out


def probes() -> None:
    print("\n######## PROBES ########")
    status, data = get(f"{API}/api/v3/texts/{q('Pirkei Avot')}?version=english")
    if isinstance(data, dict):
        vs = data.get("versions") or []
        print(f"v3 Pirkei Avot english: status {status}, keys {sorted(data)[:12]}, versions {len(vs)}")
        if vs:
            text = vs[0].get("text")
            print(f"   first version '{vs[0].get('versionTitle')}' text type {type(text).__name__} len {len(text) if text else 0}")
    else:
        print(f"v3 Pirkei Avot: status {status}")
    status, data = get(f"{API}/api/texts/{q('Pirkei Avot')}?context=0&commentary=0&pad=0")
    if isinstance(data, dict):
        print(f"v1 Pirkei Avot: keys {sorted(data)[:14]}; text len {len(data.get('text') or [])}; he len {len(data.get('he') or [])}")
    status, data = get(f"{API}/api/links/Genesis.1.1?with_text=0")
    if isinstance(data, list):
        cats = {}
        for link in data:
            c = link.get("category") or "?"
            cats[c] = cats.get(c, 0) + 1
        print(f"links Genesis 1:1: {len(data)} links by category {cats}")
    for url in (
        "https://api.github.com/repos/Sefaria/Sefaria-Export",
        "https://api.github.com/repos/Sefaria/Sefaria-Export/contents/",
        "https://storage.googleapis.com/sefaria-export/",
    ):
        status, data = get(url)
        if isinstance(data, dict):
            print(f"{url}: {status} pushed {data.get('pushed_at')} size {data.get('size')} branch {data.get('default_branch')} desc {data.get('description')}")
        elif isinstance(data, list):
            print(f"{url}: {status} entries {[d.get('name') for d in data][:30]}")
        else:
            print(f"{url}: {status} {str(data)[:400] if data else ''}")


def main() -> None:
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    probe_cfg = yaml.safe_load(open(ROOT / "tools/sefaria_probe.yaml", encoding="utf-8"))
    canon = {w["id"]: w for w in yaml.safe_load(open(ROOT / "canon/canon.yaml", encoding="utf-8"))["works"]}

    status, toc = get(f"{API}/api/index")
    if not isinstance(toc, list):
        print(f"Could not read Sefaria's table of contents (status {status}).")
        sys.exit(1)
    books = walk(toc, [])
    print(f"Sefaria table of contents: {len(books)} titles")

    grand = 0
    for wid, entry in probe_cfg.items():
        if only and wid not in only:
            continue
        entry = entry or {}
        work = canon.get(wid, {})
        found = [b for b in books if matches(entry, b)]
        print(f"\n== {wid} ({work.get('status', 'NOT IN CANON')}): {work.get('title', '')}")
        if not found:
            hint = (entry.get("hint") or "").lower()
            near = [b["title"] for b in books if hint and hint in b["title"].lower()][:12]
            print(f"   no match. titles containing '{entry.get('hint')}': {near}")
            continue
        total = 0
        for b in found:
            total += shape_of(b["title"])
        grand += total
        sample = [b["title"] for b in found]
        shown = sample if len(sample) <= 6 else sample[:4] + ["…"] + sample[-2:]
        print(f"   {len(found)} titles, {total} segments, category {found[0]['cats']}: {shown}")
        seen = set()
        for title in {found[0]["title"], found[len(found) // 2]["title"]}:
            for v in versions_of(title):
                key = (v["lang"], v["title"])
                if key in seen:
                    continue
                seen.add(key)
                print(f"   - {v['lang']} | {v['title']} | {v['license']} | {v['source']}")
    print(f"\nTOTAL segments across matched titles: {grand}")
    probes()


if __name__ == "__main__":
    main()
