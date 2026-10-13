#!/usr/bin/env python3
"""The list of RabAI's sources for the rabbinic board: what RabAI reads, and what it leaves out.

Made from the canon (canon/canon.yaml, canon/excluded.yaml, canon/reading-order.yaml and
canon/lookup-sites.yaml) by tools/validate.py, which writes it in two forms and fails when
either is out of date (Josh asked for a list he can give his rabbis to check, 2026-10-13):

    docs/sources-for-review.md            the list for the board, to read or print
    web/lib/sources/sources.generated.ts  the same list for the app: its Sources page, and RabAI's
                                          answer when someone asks what it reads and leaves out

Usage:
    python3 tools/validate.py --write              # check the canon, then regenerate both
    python3 tools/review_list.py --html <file>     # a printable page of the list

The list is organized the way a beit midrash shelves its books: Tanakh and its commentaries,
then the Oral Torah, halacha, Jewish thought, mussar and Chassidus, Kabbalah, prayer, the
dictionaries and guides to learning, and last the articles from organizations' websites. Within
each area the books stand in the order of the generations (Tannaim, Amoraim, Geonim, Rishonim,
Acharonim, our own time), and within a generation in the canon's own order.

Nothing in it is an approval: the board decides. The list only says what the canon holds now.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REVIEW_MD = "docs/sources-for-review.md"
SOURCES_TS = "web/lib/sources/sources.generated.ts"

ERA_ORDER = ["mikra", "tannaim", "amoraim", "geonim", "rishonim", "acharonim", "contemporary"]

# The areas, in the order of a beit midrash's shelves.
AREAS = [
    {
        "id": "tanakh",
        "title": "Tanakh and its commentaries",
        "about": "The Torah, Nevi'im and Ketuvim, the Targumim, and the commentaries on them.",
    },
    {
        "id": "oral-torah",
        "title": "Mishnah, Talmud and Midrash",
        "about": "The Oral Torah: the Mishnah and Tosefta, the Talmud Bavli and Yerushalmi, the Midrash, and their commentaries.",
    },
    {
        "id": "halacha",
        "title": "Halacha",
        "about": "The codes, the commentaries on them, the responsa, and practical handbooks.",
    },
    {
        "id": "thought",
        "title": "Jewish thought, mussar and Chassidus",
        "about": "Hashkafah, the works of mussar, and the works of Chassidus.",
    },
    {
        "id": "kabbalah",
        "title": "Kabbalah",
        "about": "Sefer Yetzirah, the Zohar and its commentaries, the Arizal, and the works built on them. RabAI presents them as what the kabbalists teach.",
    },
    {
        "id": "prayer",
        "title": "Prayer",
        "about": "The siddur, the machzor, selichot and kinnot, the Haggadah, and the piyyutim.",
    },
    {
        "id": "language",
        "title": "Dictionaries and guides to learning",
        "about": "Dictionaries of the Hebrew and Aramaic of the texts, grammar, and guides to the method of the Talmud.",
    },
    {
        "id": "articles",
        "title": "Articles from organizations' websites",
        "about": "Teachers' explanations for today's readers, copied by the organization's written permission. RabAI never treats them as sources: only the texts confirm a point.",
    },
]

# Within an area, groups by kind of book, in this order. "*" takes the kinds not named.
GROUPS = {
    "tanakh": [("text", "Tanakh"), ("targum", "The Targumim, the ancient translations"), ("commentary", "Commentaries"), ("*", "Other works")],
    "oral-torah": [
        ("text", "The texts"),
        ("commentary", "Commentaries"),
        ("history", "The history of the mesorah"),
        ("*", "Other works"),
    ],
    "halacha": [
        ("code", "Codes"),
        ("commentary", "Commentaries on the codes"),
        ("responsa", "Responsa (teshuvot)"),
        ("practical_halacha", "Practical halacha"),
        ("*", "Other works"),
    ],
    "thought": [
        ("philosophy", "Jewish thought (hashkafah)"),
        ("mussar", "Mussar"),
        ("chassidus", "Chassidus"),
        ("commentary", "Commentaries on these works"),
        ("history", "History"),
        ("*", "Other works"),
    ],
    "kabbalah": [("text", "The texts"), ("philosophy", "Works of Kabbalah"), ("commentary", "Commentaries"), ("*", "Other works")],
    "prayer": [("*", "")],
    "language": [("mikra_meforshim", "Hebrew and Tanakh"), ("torah_shebaal_peh", "The Talmud and Midrash"), ("*", "Other works")],
    "articles": [("*", "")],
}

STREAM_LABELS = {
    "shared": "",
    "litvish": "Litvish",
    "chassidish": "Chassidish",
    "chabad": "Chabad",
    "sephardi": "Sephardi",
    "religious_zionist": "Religious Zionist",
    "modern_orthodox": "Modern Orthodox",
    "torah_im_derech_eretz": "Torah im Derech Eretz",
    "kiruv": "For people new to observance",
}

MINHAG_LABELS = {"ashkenazi": "Ashkenazi practice", "sephardi": "Sephardi practice", "both": "Ashkenazi and Sephardi practice"}

# Where the commentaries on each kind of text are opened (canon/reading-order.yaml).
# What RabAI opens between the ranks of commentaries (web/lib/library/link-order.ts, tierOf).
SHULCHAN_ARUCH_SOURCES = "Then the sources of the ruling: the Gemara, the Rambam, the Tur, the Beit Yosef, the Yerushalmi and the Rif."
READING_BETWEEN = {
    "orach_chayim": SHULCHAN_ARUCH_SOURCES,
    "yoreh_deah": SHULCHAN_ARUCH_SOURCES,
    "even_haezer": SHULCHAN_ARUCH_SOURCES,
    "choshen_mishpat": SHULCHAN_ARUCH_SOURCES,
    "mishneh_torah": "Then the Rambam's sources: the Gemara, the Yerushalmi, the Tosefta and the halachic midrashim, and the Rif.",
    "gemara": "Then the codes that rule on the line (the Ein Mishpat: the Rambam, the Shulchan Aruch and the Tur), the mishnah it explains, and the Rif.",
}
# What comes after the later commentaries, where it isn't only "any other commentary".
READING_AFTER = {
    "mishneh_torah": "With the later commentaries, the later codes that rule with him or against him: the Tur and the Shulchan Aruch.",
}


def clean(text) -> str:
    """One line of plain text: the canon's folded YAML, with its whitespace collapsed."""
    return " ".join(str(text or "").split())


def area_of(work: dict) -> str:
    category, kind = work.get("category"), work.get("kind")
    if category == "articles":
        return "articles"
    if category == "kabbalah":
        return "kabbalah"
    if kind == "liturgy":
        return "prayer"
    if kind == "reference" and category != "halacha":
        return "language"
    return {"mikra_meforshim": "tanakh", "torah_shebaal_peh": "oral-torah", "halacha": "halacha"}.get(category, "thought")


def group_of(work: dict, area: str) -> tuple[int, str]:
    key = work.get("category") if area == "language" else work.get("kind")
    groups = GROUPS[area]
    for index, (kind, title) in enumerate(groups):
        if kind == key:
            return index, title
    return len(groups) - 1, groups[-1][1]


def edition_state(work_id: str, edition: dict, in_testing: set) -> str:
    """testing: in the private testing library. held: waiting for the board's decision (an
    edition the canon marks orthodox: review). needs_agreement: copyrighted, needs the
    publisher's license. no_copy: wanted, but there is no copy we may use yet."""
    if (work_id, edition.get("name")) in in_testing:
        return "testing"
    if edition.get("orthodox") == "review":
        return "held"
    if edition.get("license") == "needs_agreement":
        return "needs_agreement"
    return "no_copy"


def build(vocab: dict, canon_ids: dict, test_list: list, allowed: list, excluded: dict, sites: dict, reading: dict) -> dict:
    """Everything the list says, as plain data in display order."""
    in_testing = {(e["work"], e["edition"]) for e in test_list}
    by_key = {(e["work"], e["edition"]): e for e in test_list}
    approved = {(e["work"], e["edition"]) for e in allowed}
    canon_order = {wid: i for i, wid in enumerate(canon_ids)}

    works = []
    for wid, work in canon_ids.items():
        area = area_of(work)
        group_index, group = group_of(work, area)
        editions = []
        for edition in work.get("editions") or []:
            key = (wid, edition.get("name"))
            test = by_key.get(key, {})
            entry = {
                "name": clean(edition.get("name")),
                "language": edition.get("language"),
                "state": edition_state(wid, edition, in_testing),
                "approved": key in approved,
            }
            if test.get("word_tool_only"):
                entry["use"] = "words"
            elif test.get("vowels_only"):
                entry["use"] = "vowels"
            if edition.get("strip_brackets"):
                entry["cleaned"] = True
            if edition.get("notes"):
                entry["note"] = clean(edition["notes"])
            editions.append(entry)
        entry = {
            "id": wid,
            "title": clean(work.get("title")),
            "area": area,
            "group": group,
            "era": work.get("era"),
            "kind": work.get("kind"),
        }
        for field in ("hebrew", "author", "dates", "region"):
            if work.get(field):
                entry[field] = clean(work[field])
        streams = [STREAM_LABELS.get(s, s) for s in work.get("streams") or []]
        entry["streams"] = [s for s in streams if s]
        if work.get("category") == "halacha" and work.get("minhag"):
            entry["minhag"] = MINHAG_LABELS.get(work["minhag"], work["minhag"])
        entry["core"] = work.get("status") == "draft"
        entry["approved"] = work.get("status") == "approved"
        if work.get("standing") == "debated":
            entry["caution"] = clean(work.get("caution"))
            entry["cautionKinds"] = [clean(vocab["caution_kind"].get(k, k)) for k in work.get("caution_kinds") or []]
        if work.get("notes"):
            entry["note"] = clean(work["notes"])
        entry["editions"] = editions
        entry["_sort"] = (
            [a["id"] for a in AREAS].index(area),
            group_index,
            ERA_ORDER.index(work.get("era")) if work.get("era") in ERA_ORDER else len(ERA_ORDER),
            canon_order[wid],
        )
        works.append(entry)
    works.sort(key=lambda w: w["_sort"])
    for w in works:
        del w["_sort"]

    left_out = []
    for item in excluded.get("excluded") or []:
        row = {
            "id": item.get("id"),
            "title": clean(item.get("title")),
            "reason": clean(item.get("reason")),
            "mayReconsider": item.get("board_may_reconsider") is True,
        }
        if item.get("notes"):
            row["note"] = clean(item["notes"])
        left_out.append(row)

    known = reading.get("known_as") or {}
    texts = []
    for text in reading.get("texts") or []:
        ranks = []
        for rank, label in (("main", "First"), ("next", "Next"), ("later", "Later")):
            names = text.get(rank) or []
            if names:
                ranks.append({"rank": rank, "label": label, "names": [reading_name(n, known) for n in names]})
        row = {"id": text["id"], "title": clean(text["title"]), "ranks": ranks}
        if text["id"] in READING_BETWEEN:
            row["between"] = READING_BETWEEN[text["id"]]
        if text["id"] in READING_AFTER:
            row["after"] = READING_AFTER[text["id"]]
        texts.append(row)

    eras = {k: clean(v) for k, v in vocab["era"].items()}
    return {
        "questions": library_questions(),
        "areas": AREAS,
        "eras": eras,
        "works": works,
        "leftOut": left_out,
        "readingOrder": {"status": reading.get("status"), "texts": texts},
        "sites": {
            "status": sites["status"],
            "trusted": [{"name": s["name"], "domain": s["domain"], "offers": clean(s["offers"])} for s in sites["trusted"]],
            "notForWeb": [{"name": s["name"], "domain": s["domain"], "reason": clean(s["reason"])} for s in sites["not_for_web"]],
        },
    }


def plain(text: str) -> str:
    """Markdown emphasis and code marks removed."""
    return clean(re.sub(r"[*`]", "", text))


def library_questions() -> list:
    """The questions for the board in docs/library-comparison.md, section 3, which the canon's
    notes call "library question N": each one's number, its subsection, and its first sentence.
    The subsection for the maintainer (licensing, not Torah content) is left out."""
    path = ROOT / "docs/library-comparison.md"
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    try:
        start = next(i for i, line in enumerate(lines) if line.startswith("## 3. Questions for the board"))
    except StopIteration:
        return []
    out, section, current = [], "", None
    for line in lines[start + 1 :]:
        if line.startswith("## "):
            break
        if line.startswith("### "):
            section = plain(line[4:])
            current = None
            continue
        m = re.match(r"^(\d+)\. (.*)", line)
        if m:
            current = {"number": int(m.group(1)), "section": section, "text": m.group(2)}
            if not section.lower().startswith("for the maintainer"):
                out.append(current)
            continue
        if current is not None:
            if line.strip():
                current["text"] += " " + line.strip()
            else:
                current = None
    for q in out:
        text = plain(q["text"])
        first = re.match(r"^(.+?[.?])(?=\s+[A-Z(]|$)", text)
        q["text"] = first.group(1) if first else text
    return out


def reading_name(name: str, known: dict) -> str:
    """'Turei Zahav on Shulchan Arukh, Orach Chayim' -> 'the Taz (Turei Zahav)'."""
    base = name.split(" on ")[0]
    alias = known.get(base)
    return f"{alias} ({base})" if alias and alias != base else base


# ---------------------------------------------------------------------------
# Counting


def reads(edition: dict) -> bool:
    return edition["state"] == "testing"


def counts(data: dict) -> dict:
    works = data["works"]
    editions = [e for w in works for e in w["editions"]]
    return {
        "works": len(works),
        "readWorks": sum(1 for w in works if any(reads(e) for e in w["editions"])),
        "readEditions": sum(1 for e in editions if reads(e)),
        "approvedEditions": sum(1 for e in editions if e["approved"]),
        "cautioned": sum(1 for w in works if w.get("caution") and any(reads(e) for e in w["editions"])),
        "held": sum(1 for e in editions if e["state"] == "held"),
        "needsAgreement": sum(1 for e in editions if e["state"] == "needs_agreement"),
        "noCopy": sum(1 for e in editions if e["state"] == "no_copy"),
        "leftOut": len(data["leftOut"]),
        "trusted": len(data["sites"]["trusted"]),
        "notForWeb": len(data["sites"]["notForWeb"]),
    }


def plural(n: int, one: str, many: str | None = None) -> str:
    return f"{n:,} {one if n == 1 else (many or one + 's')}"


# ---------------------------------------------------------------------------
# The list for the board, in Markdown


def slug(heading: str) -> str:
    """The anchor GitHub gives a heading."""
    return re.sub(r"\s", "-", re.sub(r"[^\w\- ]", "", heading.lower()))


def work_line(w: dict) -> str:
    """'**Title** (Hebrew). Author, dates, region.' as one line."""
    title = f"**{w['title']}**" + (f" ({w['hebrew']})" if w.get("hebrew") else "")
    who = ", ".join(x for x in (w.get("author"), w.get("dates"), w.get("region")) if x)
    return title + (f". {who}." if who else ".")


def work_tags(w: dict) -> str:
    tags = []
    if w.get("core"):
        tags.append("core")
    if w.get("minhag"):
        tags.append(w["minhag"])
    tags.extend(w.get("streams") or [])
    return " · ".join(tags)


def edition_text(e: dict) -> str:
    name = e["name"]
    extra = []
    if e.get("use") == "words":
        extra.append("used only for what words mean")
    if e.get("use") == "vowels":
        extra.append("used only to show the vowels")
    if e.get("cleaned"):
        extra.append("an editor's additions removed")
    english = e.get("language") == "en" and not re.search(r"english|translat", name, re.I)
    return name + (" [English]" if english else "") + (f" ({'; '.join(extra)})" if extra else "")


def reading_steps(t: dict) -> list:
    """The order RabAI opens a text's commentaries in, as numbered steps."""
    ranks = {r["rank"]: "; ".join(r["names"]) for r in t["ranks"]}
    steps: list[str] = []
    if "main" in ranks:
        steps.append(f"First: {ranks['main']}.")
    if t["id"] == "gemara" and t.get("between"):
        steps.append(t["between"])
    if "next" in ranks:
        steps.append(f"Next: {ranks['next']}.")
    if t["id"] != "gemara" and t.get("between"):
        steps.append(t["between"])
    if "later" in ranks:
        steps.append(f"Later: {ranks['later']}." + (f" {t['after']}" if t.get("after") else ""))
    steps.append("Then any other commentary printed with it, and last the cross-references.")
    return steps


# The parts of the list, in order: the ones needing the board's decision first, the whole
# library, book by book, last.
PART_ORDER = ["caution", "waiting", "left-out", "commentaries", "websites", "not-yet", "questions", "library"]
PART_TITLES = {
    "caution": "Kept, with a caution",
    "waiting": "Waiting for your decision",
    "left-out": "Left out, and why",
    "commentaries": "How RabAI opens the commentaries",
    "websites": "Websites RabAI may search",
    "not-yet": "Not in the library yet",
    "questions": "Earlier questions for the board",
    "library": "The whole library, book by book",
}


def part_no(pid: str) -> str:
    """'Part 3'"""
    return f"Part {PART_ORDER.index(pid) + 1}"


def part_title(pid: str) -> str:
    """'Part 3. Left out, and why'"""
    return f"{part_no(pid)}. {PART_TITLES[pid]}"


# What each part says before its list, shared by the Markdown and the printable page.
PART_INTROS = {
    "caution": (
        "These works stay in the library so that people can ask about them, but RabAI gives the caution below whenever "
        "it uses one, and never rests a halachic answer on it alone. Where Orthodox authorities rejected a work's main "
        "claims, RabAI presents them only as its author's claims, together with the answer those authorities gave. "
        "Please check each caution, and whether the work belongs in the library at all."
    ),
    "waiting": (
        "Editions held out of the library until you decide: translations whose translators we could not identify, "
        "scholars' editions, and works whose fit with the mesorah we were unsure of. RabAI does not use them."
    ),
    "left-out": (
        "These stay out of the library. RabAI never quotes them as authority, though it may describe their authors' "
        "views as other positions when someone asks. Many sit beside Orthodox editions on Sefaria, which is why the "
        "library lists editions one by one and never imports a whole collection."
    ),
    "commentaries": (
        "When RabAI opens a text, it opens the commentaries printed with it in this order, each book giving a line or two "
        "before the next is opened. For a question of halacha it starts from the seif of the Shulchan Aruch, keeps the "
        "Mechaber's ruling and the Rema's gloss apart, and names which layer each point comes from. It also opens the "
        "same siman in the Tur, the Beit Yosef and the Aruch HaShulchan, the halacha in the Rambam, and, for Sephardic "
        "practice, the Kaf HaChayim and the Ben Ish Chai. For a practical question it explains the positions and tells "
        "the person to ask their rav. Is this the right order? Are the right commentaries named first?"
    ),
    "websites": (
        "When the library doesn't cover a question, or for a practical halacha question, RabAI may look online. A page "
        "it finds is never a source: RabAI opens the texts the page relies on in its own library, checks the page "
        "against them, and rests its answer on the texts. It keeps nothing it finds."
    ),
    "not-yet": (
        "Editions the canon wants but RabAI can't use yet: copyrighted translations that need the publisher's "
        "agreement, and texts with no copy we may use (no open license yet, or a typing still to be found)."
    ),
    "questions": (
        "Notes in this list that mention a \"library question\" refer to these, from our comparison of the library with "
        "Mercava's catalog (docs/library-comparison.md, section 3, where each is set out in full). Notes that mention an "
        "\"open question\" refer to the board's questions on the rest of RabAI, in the founding spec "
        "(docs/founding-spec.md), among them the default halachic baseline, women's voices, and reference works by "
        "authors outside Orthodoxy."
    ),
    "library": (
        "Every book RabAI reads, in the order of a beit midrash's shelves and, within each area, of the generations. "
        "These are published Orthodox editions, each listed in the canon by name. RabAI quotes and cites only these. "
        "Every citation it shows is checked against the passage it came from, and every passage carries its edition's "
        "name."
    ),
}


def intro(data: dict) -> list:
    """The opening paragraphs, as plain sentences (the renderers add the markup)."""
    return [
        "RabAI answers from a library of Orthodox texts that its canon lists one edition at a time. Nothing here is "
        "approved yet: the board decides what RabAI may use. Until it does, RabAI runs as a private preview on the "
        f"editions in {part_no('library')}, and every passage it shows from them is labeled \"not yet approved by the "
        "rabbinic board\".",
        "Notes in this list are our best understanding, written for you to confirm. Where we were unsure of a fact, it "
        "says \"(to confirm)\".",
    ]


def glance(data: dict) -> list:
    """The summary lines: (bold lead, rest)."""
    c = counts(data)
    approved = (
        f"{plural(c['approvedEditions'], 'edition is', 'editions are')} approved by the board so far."
        if c["approvedEditions"]
        else "None are approved by the board yet."
    )
    return [
        (f"RabAI reads {plural(c['readEditions'], 'edition')} of {plural(c['readWorks'], 'work')}.",
         f"{approved} Every book is listed in {part_no('library')}."),
        (f"{plural(c['cautioned'], 'work is', 'works are')} kept with a caution",
         f"that RabAI gives whenever it uses them ({part_no('caution')})."),
        (f"{plural(c['held'], 'edition waits', 'editions wait')} for your decision",
         f"and are not used until you decide ({part_no('waiting')})."),
        (f"{plural(c['leftOut'], 'edition or collection is', 'editions and collections are')} left out,",
         f"each with the reason ({part_no('left-out')})."),
        ("For halacha, RabAI opens a seif of the Shulchan Aruch with the commentaries printed around it,",
         f"the main ones first ({part_no('commentaries')})."),
        (f"RabAI may look things up on {plural(c['trusted'], 'trusted Orthodox website')},",
         f"and never searches {plural(c['notForWeb'], 'other site')} ({part_no('websites')})."),
        (f"{plural(c['needsAgreement'] + c['noCopy'], 'edition is', 'editions are')} wanted but not in the library yet:",
         f"{c['needsAgreement']} need a publisher's agreement, and {c['noCopy']} have no copy we may use yet "
         f"({part_no('not-yet')})."),
    ]


def how_to_review() -> list:
    return [
        "For each book or edition, please mark one of: keep, remove, keep with a caution, or a question, with a reason "
        "if you have one. Each entry carries a short id (for example mishnah-berurah) so your notes can be matched to "
        f"the canon. {part_no('caution')}, {part_no('waiting')} and {part_no('left-out')} need a decision. "
        f"{part_no('commentaries')} asks whether RabAI opens the right commentaries, in the right order, for a halachic "
        f"question. {part_no('library')} is the whole library, for checking.",
        "In the whole library, \"core\" marks a book from RabAI's founding list, the books it was built around. Halacha "
        "works name whose practice they record (Ashkenazi or Sephardi). Communities (Litvish, Chassidish, Chabad, "
        "Sephardi, Religious Zionist, Modern Orthodox, Torah im Derech Eretz) are the ones a work belongs to most; a "
        "work with none is shared by all.",
    ]


def area_rows(data: dict) -> list:
    """(area, works RabAI reads, editions) for the summary table."""
    rows = []
    for area in data["areas"]:
        ws = [w for w in data["works"] if w["area"] == area["id"] and any(reads(e) for e in w["editions"])]
        rows.append((area, len(ws), sum(1 for w in ws for e in w["editions"] if reads(e))))
    return rows


def markdown(data: dict) -> str:
    out: list[str] = []
    add = out.append

    def gap():
        if out and out[-1]:
            add("")

    add("# RabAI's sources: what it reads, and what it leaves out")
    add("")
    add(
        "*A list for the rabbinic board, made from RabAI's canon (`canon/canon.yaml` and the files beside it) by "
        "`tools/validate.py --write`. Do not edit it by hand: it is rewritten whenever the canon changes.*"
    )
    add("")
    for para in intro(data):
        add(para.replace("Nothing here is approved yet: the board decides what RabAI may use.",
                         "**Nothing here is approved yet: the board decides what RabAI may use.**"))
        add("")
    add("## At a glance")
    add("")
    for lead, rest in glance(data):
        add(f"- **{lead}** {rest}")
    add("")
    add("| Area | Works RabAI reads | Editions |")
    add("|---|---:|---:|")
    for area, works, editions in area_rows(data):
        add(f"| [{area['title']}](#{slug(area['title'])}) | {works:,} | {editions:,} |")
    add("")
    add("## How to review")
    add("")
    for para in how_to_review():
        add(para.replace("for example mishnah-berurah", "for example `mishnah-berurah`"))
        add("")
    add("## Contents")
    add("")
    for pid in PART_ORDER:
        add(f"- [{part_title(pid)}](#{slug(part_title(pid))})")
    add("")

    def md_caution():
        for w in data["works"]:
            if w.get("caution") and any(reads(e) for e in w["editions"]):
                add(f"- {work_line(w)} `{w['id']}`")
                add(f"  - Why: {'; '.join(w['cautionKinds'])}.")
                add(f"  - The caution RabAI gives: {w['caution']}")

    def md_waiting():
        for area in data["areas"]:
            rows = [(w, e) for w in data["works"] if w["area"] == area["id"] for e in w["editions"] if e["state"] == "held"]
            if not rows:
                continue
            gap()
            add(f"### {area['title']} (waiting)")
            add("")
            for w, e in rows:
                add(f"- {work_line(w)} `{w['id']}`")
                add(f"  - Edition: {edition_text(e)}")
                if e.get("note"):
                    add(f"  - Why it waits: {e['note']}")
                if w.get("note"):
                    add(f"  - {'About the work' if e.get('note') else 'Why it waits'}: {w['note']}")

    def md_left_out():
        for heading, reconsider in (("Left out; you may reconsider", True), ("Left out", False)):
            rows = [r for r in data["leftOut"] if r["mayReconsider"] is reconsider]
            if not rows:
                continue
            gap()
            add(f"### {heading}")
            add("")
            for r in rows:
                add(f"- **{r['title']}** `{r['id']}`")
                add(f"  - Why: {r['reason']}" + (f" {r['note']}" if r.get("note") else ""))

    def md_commentaries():
        if data["readingOrder"]["status"] != "approved":
            add("This order is a draft, waiting for your review.")
            add("")
        for t in data["readingOrder"]["texts"]:
            gap()
            add(f"### {t['title']}")
            add("")
            for i, step in enumerate(reading_steps(t), 1):
                add(f"{i}. {step}")

    def md_websites():
        s = data["sites"]
        if s["status"] != "approved":
            add("This list waits for your review.")
            add("")
        add("### The only sites RabAI searches about Torah, halacha or belief")
        add("")
        for site in s["trusted"]:
            add(f"- **{site['name']}** ({site['domain']}): {site['offers']}")
        add("")
        add("### Never searched, even for everyday facts")
        add("")
        for site in s["notForWeb"]:
            add(f"- **{site['name']}** ({site['domain']}): {site['reason']}")

    def md_not_yet():
        for heading, state in (("Needs the publisher's agreement", "needs_agreement"), ("No copy we may use yet", "no_copy")):
            rows = [(w, e) for w in data["works"] for e in w["editions"] if e["state"] == state]
            if not rows:
                continue
            gap()
            add(f"### {heading}")
            add("")
            for w, e in rows:
                add(f"- **{w['title']}**: {edition_text(e)}. `{w['id']}`")

    def md_questions():
        last = None
        for q in data["questions"]:
            if q["section"] != last:
                gap()
                add(f"### {q['section']}")
                add("")
                last = q["section"]
            add(f"{q['number']}. {q['text']}")

    def md_library():
        for area in data["areas"]:
            ws = [w for w in data["works"] if w["area"] == area["id"] and any(reads(e) for e in w["editions"])]
            if not ws:
                continue
            gap()
            add(f"### {area['title']}")
            add("")
            add(area["about"])
            last_group = last_era = None
            spans_eras = False
            for w in ws:
                if w["group"] != last_group:
                    gap()
                    if w["group"]:
                        add(f"#### {w['group']}")
                        add("")
                    last_group, last_era = w["group"], None
                    spans_eras = len({x["era"] for x in ws if x["group"] == w["group"]}) > 1
                if spans_eras and w["era"] != last_era:
                    gap()
                    add(f"*{data['eras'].get(w['era'], w['era'])}*")
                    add("")
                    last_era = w["era"]
                add(f"- {work_line(w)}" + (f" {work_tags(w)}." if work_tags(w) else "") + f" `{w['id']}`")
                if w.get("caution"):
                    add(f"  - Kept with a caution ({part_no('caution')}).")
                for e in w["editions"]:
                    if reads(e):
                        add(f"  - Reads: {edition_text(e)}" + (f". {e['note']}" if e.get("note") else ""))
                for e in w["editions"]:
                    if e["state"] == "held":
                        add(f"  - Waiting for your decision: {edition_text(e)} ({part_no('waiting')}).")
                if w.get("note"):
                    add(f"  - Note: {w['note']}")

    parts = {
        "caution": md_caution,
        "waiting": md_waiting,
        "left-out": md_left_out,
        "commentaries": md_commentaries,
        "websites": md_websites,
        "not-yet": md_not_yet,
        "questions": md_questions,
        "library": md_library,
    }
    for pid in PART_ORDER:
        gap()
        add(f"## {part_title(pid)}")
        add("")
        add(PART_INTROS[pid])
        add("")
        parts[pid]()
    return "\n".join(out).rstrip() + "\n"



# ---------------------------------------------------------------------------
# The same list for the app (web/lib/sources/sources.generated.ts)


def ts_module(data: dict) -> str:
    """One work per line, so a change to the canon shows as a change to its own line."""

    def dump(value) -> str:
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))

    lines = [
        "// Generated by tools/validate.py --write from the canon (tools/review_list.py). Do not edit by hand.",
        'import type { SourcesData } from "./types";',
        "",
        "export const SOURCES: SourcesData = {",
        f"  areas: {dump(data['areas'])},",
        f"  eras: {dump(data['eras'])},",
        "  works: [",
        *[f"    {dump(w)}," for w in data["works"]],
        "  ],",
        "  leftOut: [",
        *[f"    {dump(r)}," for r in data["leftOut"]],
        "  ],",
        f"  questions: {dump(data['questions'])},",
        f"  readingOrder: {dump(data['readingOrder'])},",
        f"  sites: {dump(data['sites'])},",
        "};",
    ]
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# A printable page (python3 tools/review_list.py --html <file>)


def load_data() -> dict:
    sys.path.insert(0, str(ROOT / "tools"))
    import validate as V

    vocab = V.load("canon/vocabulary.yaml")
    canon_ids = V.check_canon(vocab, V.load("canon/canon.yaml"))
    barred = V.check_excluded(V.load("canon/excluded.yaml"), canon_ids)
    sites = V.check_lookup_sites(vocab)
    reading = V.check_reading_order()
    if V.errors:
        raise SystemExit("validate.py reports problems; fix them first:\n  " + "\n  ".join(V.errors))
    return build(vocab, canon_ids, V.testing(canon_ids, barred), V.whitelist(canon_ids), V.load("canon/excluded.yaml"), sites, reading)


def main() -> int:
    if "--html" not in sys.argv or sys.argv.index("--html") + 1 >= len(sys.argv):
        print(__doc__.strip().split("Usage:")[1].split("The list")[0].rstrip(), file=sys.stderr)
        return 2
    target = Path(sys.argv[sys.argv.index("--html") + 1])
    from review_html import page  # noqa: E402  (beside this file)

    target.write_text(page(load_data(), counts), encoding="utf-8")
    print(f"Wrote {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
