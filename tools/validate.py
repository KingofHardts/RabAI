#!/usr/bin/env python3
"""Check the canon and the test questions, and print the retrieval whitelist.

Usage:
    python3 tools/validate.py              # check everything and print a summary
    python3 tools/validate.py --whitelist  # print only the whitelist, as JSON
    python3 tools/validate.py --testing    # print only the private testing list, as JSON

Exits with status 1 if any check fails.

The whitelist is the set of editions the library may contain: the work is approved, the
edition is approved, the edition is Orthodox, and its license is cleared.

The testing list is what the private, locked testing library may hold before the board
approves anything (Josh's decision, 2026-10-06; founding spec, "Testing library"): editions
of canon works marked orthodox: true, not needing a publisher's agreement, mapped to an exact
Sefaria version whose license allows private, non-commercial use, and not excluded. Every
passage from it is labeled as not yet approved by the board.

Two refinements (founding spec, "Testing library"):
- A version may be public domain by age: `printed: <year>` names the printing it was
  digitized from, which must be at least PUBLIC_DOMAIN_YEARS old. The plan tool then accepts
  the file even when Sefaria lists its license as unknown.
- A dictionary edition may be marked `word_tool_only: true` (orthodox: review): RabAI may use
  it for what words mean, never for history or belief. Only dictionaries (sefaria_lexicon) may
  carry it.
"""

import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
QUESTION_ID_RE = re.compile(r"^T\d{2,3}$")
LANGUAGES = {"he", "en"}
ORTHODOX_VALUES = {True, False, "review"}
# How a work names its titles in Sefaria's table of contents (see tools/sefaria_lib.py).
SEFARIA_KEYS = {"re", "not", "root", "cat", "under"}
# Licenses (as Sefaria writes them, normalized) that allow private, non-commercial testing.
TESTING_LICENSES = {"publicdomain", "pd", "cc0", "ccby", "ccbysa", "ccbync", "ccbyncsa"}
# A printing this many years old or more is in the public domain in the US.
PUBLIC_DOMAIN_YEARS = 96
VERSION_KEYS = {"version", "license", "note", "printed"}
LEXICON_KEYS = {"name", "license", "printed"}


def printed_ok(value) -> bool:
    """A printing year old enough to be public domain."""
    return isinstance(value, int) and value <= date.today().year - PUBLIC_DOMAIN_YEARS


def norm_license(value) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def licenses_open(value) -> bool:
    """A recorded license; several may be joined with '/' when titles differ."""
    parts = [p for p in str(value or "").split("/") if p.strip()]
    return bool(parts) and all(norm_license(p) in TESTING_LICENSES for p in parts)


def version_key(name) -> str:
    """Sefaria's export drops some punctuation from version names, so compare loosely."""
    return re.sub(r"[\W_]+", "", str(name).lower())

errors: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def load(relative: str):
    with open(ROOT / relative, encoding="utf-8") as f:
        return yaml.safe_load(f)


def check_value(where: str, field: str, value, allowed) -> None:
    if value not in allowed:
        fail(f"{where}: {field} '{value}' is not one of {sorted(map(str, allowed))}")


def check_approval(where: str, item: dict) -> None:
    if item.get("status") == "approved":
        for field in ("approved_by", "approved_on"):
            if not item.get(field):
                fail(f"{where}: approved but missing {field}")


def check_canon(vocab: dict, canon: dict) -> dict:
    works = canon.get("works") or []
    by_id: dict = {}
    for index, work in enumerate(works):
        wid = work.get("id")
        where = f"canon.yaml work {wid or f'#{index + 1}'}"
        if not wid or not ID_RE.match(str(wid)):
            fail(f"{where}: id must be lowercase words joined by hyphens")
        if wid in by_id:
            fail(f"{where}: duplicate id")
        by_id[wid] = work

        for field in ("title", "era", "category", "kind", "status"):
            if not work.get(field):
                fail(f"{where}: missing {field}")
        check_value(where, "era", work.get("era"), vocab["era"])
        check_value(where, "category", work.get("category"), vocab["category"])
        check_value(where, "kind", work.get("kind"), vocab["kind"])
        check_value(where, "status", work.get("status"), vocab["status"])

        streams = work.get("streams") or []
        if not streams:
            fail(f"{where}: needs at least one stream")
        for stream in streams:
            check_value(where, "stream", stream, vocab["stream"])
        if "chabad" in streams and "chassidish" not in streams:
            fail(f"{where}: tag chabad works as chassidish too")

        if work.get("category") == "halacha":
            check_value(where, "minhag", work.get("minhag"), vocab["minhag"])

        check_approval(where, work)

        sefaria = work.get("sefaria")
        if sefaria is not None:
            if not isinstance(sefaria, dict) or not (set(sefaria) <= SEFARIA_KEYS):
                fail(f"{where}: sefaria may only have the keys {sorted(SEFARIA_KEYS)}")
            elif not (sefaria.get("re") or sefaria.get("cat") or sefaria.get("under")):
                fail(f"{where}: sefaria needs 're', 'cat' or 'under'")
            else:
                for field in ("re", "not"):
                    if sefaria.get(field):
                        try:
                            re.compile(sefaria[field])
                        except re.error as e:
                            fail(f"{where}: sefaria {field} is not a valid pattern ({e})")

        editions = work.get("editions") or []
        if not editions:
            fail(f"{where}: needs at least one edition")
        for edition in editions:
            ewhere = f"{where}, edition '{edition.get('name', '?')}'"
            if not edition.get("name"):
                fail(f"{ewhere}: missing name")
            check_value(ewhere, "language", edition.get("language"), LANGUAGES)
            check_value(ewhere, "orthodox", edition.get("orthodox"), ORTHODOX_VALUES)
            check_value(ewhere, "status", edition.get("status"), vocab["status"])
            check_value(ewhere, "license", edition.get("license"), vocab["license"])
            check_approval(ewhere, edition)
            versions = edition.get("sefaria_versions")
            if versions is not None:
                if not work.get("sefaria"):
                    fail(f"{ewhere}: lists sefaria_versions but the work has no sefaria titles")
                if not isinstance(versions, list) or not versions:
                    fail(f"{ewhere}: sefaria_versions must be a non-empty list")
                    versions = []
                seen_versions = set()
                for v in versions:
                    if not isinstance(v, dict) or not v.get("version") or set(v) - VERSION_KEYS:
                        fail(f"{ewhere}: each sefaria_versions item needs 'version' and 'license' (and may have 'note', 'printed')")
                        continue
                    if "printed" in v and not (printed_ok(v["printed"]) and norm_license(v.get("license")) == "publicdomain"):
                        fail(f"{ewhere}: version '{v['version']}': 'printed' must be a year at least "
                             f"{PUBLIC_DOMAIN_YEARS} years ago, with license 'Public Domain'")
                    if version_key(v["version"]) in seen_versions:
                        fail(f"{ewhere}: version '{v['version']}' is listed twice")
                    seen_versions.add(version_key(v["version"]))
                    if not licenses_open(v.get("license")):
                        fail(f"{ewhere}: version '{v['version']}' has license '{v.get('license')}', which does not allow testing; leave it out")
            lexicon = edition.get("sefaria_lexicon")
            if lexicon is not None:
                if versions is not None:
                    fail(f"{ewhere}: use sefaria_versions or sefaria_lexicon, not both")
                if not isinstance(lexicon, dict) or not lexicon.get("name") or set(lexicon) - LEXICON_KEYS:
                    fail(f"{ewhere}: sefaria_lexicon needs 'name' and 'license' (and may have 'printed')")
                elif not licenses_open(lexicon.get("license")):
                    fail(f"{ewhere}: dictionary license '{lexicon.get('license')}' does not allow testing")
                elif "printed" in lexicon and not (printed_ok(lexicon["printed"]) and norm_license(lexicon.get("license")) == "publicdomain"):
                    fail(f"{ewhere}: dictionary 'printed' must be a year at least {PUBLIC_DOMAIN_YEARS} years ago, with license 'Public Domain'")
            if "word_tool_only" in edition:
                if edition["word_tool_only"] is not True:
                    fail(f"{ewhere}: word_tool_only is either true or left out")
                elif not isinstance(lexicon, dict) or work.get("kind") != "reference":
                    fail(f"{ewhere}: only a dictionary (kind: reference, with sefaria_lexicon) may be a word tool")
            if edition.get("status") == "approved":
                if edition.get("orthodox") is not True:
                    fail(f"{ewhere}: only editions marked orthodox: true can be approved")
                if work.get("status") != "approved":
                    fail(f"{ewhere}: approved edition of a work that is not approved")
    return by_id


def check_excluded(excluded: dict, canon_ids: dict) -> set:
    """Check excluded.yaml and return the Sefaria versions it bars."""
    seen = set()
    barred: set = set()
    for item in excluded.get("excluded") or []:
        eid = item.get("id")
        where = f"excluded.yaml {eid}"
        if not eid or not ID_RE.match(str(eid)):
            fail(f"{where}: id must be lowercase words joined by hyphens")
        if eid in seen:
            fail(f"{where}: duplicate id")
        if eid in canon_ids:
            fail(f"{where}: same id as a canon work")
        seen.add(eid)
        for field in ("title", "reason"):
            if not item.get(field):
                fail(f"{where}: missing {field}")
        if not isinstance(item.get("board_may_reconsider"), bool):
            fail(f"{where}: board_may_reconsider must be true or false")
        for version in item.get("sefaria_versions") or []:
            barred.add(version_key(version))
    for wid, work in canon_ids.items():
        for edition in work.get("editions") or []:
            for v in edition.get("sefaria_versions") or []:
                if isinstance(v, dict) and version_key(v.get("version")) in barred:
                    fail(f"canon.yaml work {wid}: edition '{edition.get('name')}' uses the excluded Sefaria version '{v.get('version')}'")
    return barred


def check_questions(vocab: dict, questions: dict, canon_ids: dict) -> list:
    items = questions.get("questions") or []
    seen = set()
    for item in items:
        qid = item.get("id")
        where = f"questions.yaml {qid}"
        if not qid or not QUESTION_ID_RE.match(str(qid)):
            fail(f"{where}: id must look like T01")
        if qid in seen:
            fail(f"{where}: duplicate id")
        seen.add(qid)
        check_value(where, "area", item.get("area"), vocab["eval_area"])
        check_value(where, "sensitivity", item.get("sensitivity"), vocab["sensitivity"])
        for field in ("question", "trap"):
            if not item.get(field):
                fail(f"{where}: missing {field}")
        if not item.get("must"):
            fail(f"{where}: needs at least one 'must'")
        if not isinstance(item.get("must_not", []), list):
            fail(f"{where}: must_not must be a list")
        for source in item.get("sources") or []:
            if source not in canon_ids:
                fail(f"{where}: source '{source}' is not a canon id")
        if (
            item.get("sensitivity") == "high"
            and item.get("approved_by")
            and not item.get("reference_answer")
        ):
            fail(f"{where}: approved high-sensitivity question needs a reference_answer")
    return items


PARTNER_STATUS = {"not_contacted", "contacted", "in_talks", "agreed", "declined"}
PARTNER_KIND = {"organization", "publisher", "library"}


def check_partners(vocab: dict, partners: dict) -> list:
    items = partners.get("partners") or []
    seen = set()
    for item in items:
        pid = item.get("id")
        where = f"partners.yaml {pid}"
        if not pid or not ID_RE.match(str(pid)):
            fail(f"{where}: id must be lowercase words joined by hyphens")
        if pid in seen:
            fail(f"{where}: duplicate id")
        seen.add(pid)
        for field in ("name", "offers"):
            if not item.get(field):
                fail(f"{where}: missing {field}")
        check_value(where, "kind", item.get("kind"), PARTNER_KIND)
        check_value(where, "status", item.get("status"), PARTNER_STATUS)
        for stream in item.get("streams") or []:
            check_value(where, "stream", stream, vocab["stream"])
    return items


def whitelist(canon_ids: dict) -> list:
    entries = []
    for wid, work in canon_ids.items():
        if work.get("status") != "approved":
            continue
        for edition in work.get("editions") or []:
            if (
                edition.get("status") == "approved"
                and edition.get("orthodox") is True
                and edition.get("license") == "cleared"
            ):
                entries.append(
                    {
                        "work": wid,
                        "title": work.get("title"),
                        "edition": edition.get("name"),
                        "language": edition.get("language"),
                        "category": work.get("category"),
                        "streams": work.get("streams"),
                        "minhag": work.get("minhag"),
                    }
                )
    return entries


def testing(canon_ids: dict, barred: set) -> list:
    entries = []
    for wid, work in canon_ids.items():
        if work.get("status") not in ("draft", "proposed", "approved"):
            continue
        for edition in work.get("editions") or []:
            versions = [v for v in edition.get("sefaria_versions") or [] if isinstance(v, dict)] if work.get("sefaria") else []
            lexicon = edition.get("sefaria_lexicon") if isinstance(edition.get("sefaria_lexicon"), dict) else None
            word_tool = edition.get("word_tool_only") is True and lexicon is not None and work.get("kind") == "reference"
            if (
                (edition.get("orthodox") is True or (word_tool and edition.get("orthodox") == "review"))
                and edition.get("license") in ("verify", "cleared")
                and edition.get("status") != "excluded"
                and (versions or lexicon)
                and all(version_key(v.get("version")) not in barred for v in versions)
                and all(licenses_open(v.get("license")) for v in versions)
                and (lexicon is None or licenses_open(lexicon.get("license")))
            ):
                entries.append(
                    {
                        "work": wid,
                        "title": work.get("title"),
                        "edition": edition.get("name"),
                        "language": edition.get("language"),
                        "sefaria": work.get("sefaria"),
                        "sefaria_versions": versions,
                        "sefaria_lexicon": lexicon,
                        "word_tool_only": word_tool,
                        "approved": work.get("status") == "approved" and edition.get("status") == "approved",
                        "category": work.get("category"),
                        "streams": work.get("streams"),
                    }
                )
    return entries


def main() -> int:
    vocab = load("canon/vocabulary.yaml")
    canon_ids = check_canon(vocab, load("canon/canon.yaml"))
    barred = check_excluded(load("canon/excluded.yaml"), canon_ids)
    questions = check_questions(vocab, load("evals/questions.yaml"), canon_ids)
    partners = check_partners(vocab, load("canon/partners.yaml"))
    allowed = whitelist(canon_ids)
    test_list = testing(canon_ids, barred)

    for flag, listing in (("--whitelist", allowed), ("--testing", test_list)):
        if flag in sys.argv:
            if errors:
                print("\n".join(errors), file=sys.stderr)
                return 1
            print(json.dumps(listing, ensure_ascii=False, indent=2))
            return 0

    works = list(canon_ids.values())
    editions = [e for w in works for e in (w.get("editions") or [])]
    print(f"Canon: {len(works)} works, {len(editions)} editions")
    print("  works by status:   " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(w.get('status') for w in works).items())))
    print("  works by category: " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(w.get('category') for w in works).items())))
    print("  edition licenses:  " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(e.get('license') for e in editions).items())))
    print(f"Test questions: {len(questions)}")
    print("  by sensitivity:    " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(q.get('sensitivity') for q in questions).items())))
    print(f"Partners: {len(partners)}")
    print("  by status:         " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(p.get('status') for p in partners).items())))
    print(f"Retrieval whitelist: {len(allowed)} editions")
    if not allowed:
        print("  (empty until the board approves works and editions and their licenses are cleared)")
    print(f"Testing library: {len(test_list)} editions (private, labeled not yet approved by the board)")

    if errors:
        print(f"\n{len(errors)} problem(s):", file=sys.stderr)
        for message in errors:
            print(f"  - {message}", file=sys.stderr)
        return 1
    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
