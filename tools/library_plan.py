#!/usr/bin/env python3
"""Plan the private testing library: which Sefaria files each testing edition will use.

For every edition that `validate.py --testing` lists, this finds the Sefaria titles that
belong to its work (the work's `sefaria` matchers) and, for each title, the files of the
edition's listed versions, in order. Each file's own license and language are read from the
file and checked again: a file is used only if its license allows private, non-commercial
testing, its language matches the edition, and its version is not excluded. A version the
canon marks public domain by age (`printed: <year>`) is accepted when Sefaria lists its license
as unknown, and recorded as "Public Domain (printed <year>)".

Dictionaries (`sefaria_lexicon`) come from Sefaria's dictionary data instead of its text
files; the build reads them (tools/sefaria_lib.py, lexicon_entries).

Writes library/plan.json (gitignored) and prints a summary with the total size.

Usage: python3 tools/library_plan.py [--only work1,work2] [--refresh]
"""

import concurrent.futures as cf
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sefaria_lib as S  # noqa: E402
import validate as V  # noqa: E402

PLAN = S.ROOT / "library" / "plan.json"
HEADERS_CACHE = S.CACHE / "headers.json"


def testing_editions():
    vocab = V.load("canon/vocabulary.yaml")
    canon_ids = V.check_canon(vocab, V.load("canon/canon.yaml"))
    barred = V.check_excluded(V.load("canon/excluded.yaml"), canon_ids)
    if V.errors:
        raise SystemExit("validate.py reports problems; fix them first:\n  " + "\n  ".join(V.errors))
    return V.testing(canon_ids, barred), barred


def main() -> int:
    only = set(sys.argv[sys.argv.index("--only") + 1].split(",")) if "--only" in sys.argv else None
    refresh = "--refresh" in sys.argv
    editions, barred = testing_editions()
    if only:
        editions = [e for e in editions if e["work"] in only]

    listing = S.list_export(refresh)
    books = S.table_of_contents(refresh)
    index = S.folder_index(listing)
    by_title = S.titles_by_key(index)

    # 1. candidate files per edition and title, in the edition's version order
    candidates = []
    unmatched_titles = {}
    lexicons = []
    for ed in editions:
        if ed.get("sefaria_lexicon"):
            lexicons.append(ed)
            continue
        lang_dir = S.LANG_DIRS[ed["language"]]
        wanted = [(S.key(v["version"]), v) for v in ed["sefaria_versions"]]
        for book in books:
            if not S.matches(ed["sefaria"], book):
                continue
            folder = S.folder_for(book, index, by_title)
            if not folder:
                unmatched_titles.setdefault(ed["work"], []).append(book["title"])
                continue
            files = index[folder].get(lang_dir, {})
            chosen = [(files[k], v) for k, v in wanted if k in files]
            if chosen:
                candidates.append((ed, book, chosen))

    # 2. read every candidate file's header (cached by name and size)
    cache = json.loads(HEADERS_CACHE.read_text()) if HEADERS_CACHE.exists() and not refresh else {}
    need = sorted({f["file"] for _, _, chosen in candidates for f, _ in chosen} - {k for k in cache})
    sizes = {f["file"]: f["size"] for _, _, chosen in candidates for f, _ in chosen}
    if need:
        print(f"Reading {len(need)} file headers…", file=sys.stderr)
        with cf.ThreadPoolExecutor(16) as ex:
            for name, head in zip(need, ex.map(S.read_header, need)):
                cache[name] = {**head, "size": sizes[name]}
        HEADERS_CACHE.parent.mkdir(parents=True, exist_ok=True)
        HEADERS_CACHE.write_text(json.dumps(cache, ensure_ascii=False))

    # 3. keep only files whose own header passes every check
    plan, skipped = [], []
    for ed, book, chosen in candidates:
        files = []
        for info, listed in chosen:
            head = cache[info["file"]]
            reason = None
            license = head.get("license")
            by_age = listed.get("printed") and S.norm_license(license) in ("", "unknown", "none")
            if by_age:
                license = f"Public Domain (printed {listed['printed']})"
            elif not S.license_open(license):
                reason = f"license {head.get('license')!r}"
            elif (head.get("actualLanguage") or head.get("language")) not in S.ACTUAL_LANGUAGES[ed["language"]]:
                reason = f"language {head.get('actualLanguage')!r}"
            elif S.key(head.get("versionTitle")) != S.key(listed["version"]):
                reason = f"file says version {head.get('versionTitle')!r}"
            elif S.key(head.get("versionTitle")) in barred:
                reason = "version is excluded"
            if reason:
                skipped.append((ed["work"], book["title"], info["stem"], reason))
                continue
            files.append(
                {
                    "file": info["file"],
                    "size": info["size"],
                    "version": head.get("versionTitle"),
                    "license": license,
                    "source": head.get("versionSource"),
                }
            )
        if files:
            plan.append(
                {
                    "work": ed["work"],
                    "work_title": ed["title"],
                    "edition": ed["edition"],
                    "language": ed["language"],
                    "category": ed["category"],
                    "streams": ed["streams"],
                    "approved": ed["approved"],
                    "vowels_only": ed.get("vowels_only", False),
                    "title": book["title"],
                    "categories": book["cats"],
                    "files": files,
                }
            )

    # Dictionaries: one plan item each, read from Sefaria's dictionary data by the build.
    for ed in lexicons:
        lex = ed["sefaria_lexicon"]
        license = lex.get("license")
        if lex.get("printed"):
            license = f"{license} (printed {lex['printed']})"
        plan.append(
            {
                "work": ed["work"],
                "work_title": ed["title"],
                "edition": ed["edition"],
                "language": ed["language"],
                "category": ed["category"],
                "streams": ed["streams"],
                "approved": ed["approved"],
                "word_tool_only": ed.get("word_tool_only", False),
                "lexicon": lex["name"],
                "license": license,
            }
        )

    PLAN.parent.mkdir(parents=True, exist_ok=True)
    PLAN.write_text(json.dumps(plan, ensure_ascii=False, indent=1))

    # 4. summary
    by_work = {}
    for item in plan:
        if item.get("lexicon"):
            continue
        w = by_work.setdefault(item["work"], {"titles": set(), "files": 0, "bytes": 0, "langs": set()})
        w["titles"].add(item["title"])
        w["files"] += len(item["files"])
        w["bytes"] += sum(f["size"] for f in item["files"])
        w["langs"].add(item["language"])
    total = sum(w["bytes"] for w in by_work.values())
    print(f"{'work':34s} {'titles':>6s} {'files':>6s} {'MB':>7s}  languages")
    for wid, w in sorted(by_work.items(), key=lambda x: -x[1]["bytes"]):
        print(f"{wid:34s} {len(w['titles']):6d} {w['files']:6d} {w['bytes'] / 1e6:7.1f}  {','.join(sorted(w['langs']))}")
    print(f"\nTotal: {len(by_work)} works, {sum(len(i.get('files', [])) for i in plan)} files, {total / 1e6:.1f} MB of Sefaria JSON")
    for item in plan:
        if item.get("lexicon"):
            tool = ", word meanings only" if item.get("word_tool_only") else ""
            print(f"Dictionary: {item['lexicon']} ({item['work']}, {item['license']}{tool})")
    print(f"Skipped {len(skipped)} files that failed a check:")
    for work, title, stem, reason in skipped[:40]:
        print(f"  {work} | {title} | {stem} | {reason}")
    if len(skipped) > 40:
        print(f"  … and {len(skipped) - 40} more")
    if unmatched_titles:
        print("Titles with no folder in the export:", {k: v[:3] for k, v in unmatched_titles.items()})
    print(f"Wrote {PLAN.relative_to(S.ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
