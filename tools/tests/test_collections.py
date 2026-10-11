"""Tests for website collections: the paragraph reader and the builder, against a fake WordPress site."""

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import collection_build as C  # noqa: E402
import site_lib as L  # noqa: E402
import validate as V  # noqa: E402


class ParagraphsTest(unittest.TestCase):
    def test_text_only_with_headings_kept_with_their_paragraph(self):
        html = (
            "<h2>Why Light Candles?</h2><p>The <em>Sages</em> said&nbsp;so.<sup>1</sup></p>"
            "<figure><img src='x'><figcaption>A photo</figcaption></figure>"
            "<ul><li>First</li><li>Second <a href='#'>item</a></li></ul>"
            "<p>One<br>two</p><script>alert(1)</script><p>  </p><iframe src='v'></iframe>"
        )
        self.assertEqual(L.paragraphs(html), ["Why Light Candles?\nThe Sages said so.", "• First\n• Second item", "One\ntwo"])

    def test_a_long_paragraph_is_split_at_a_sentence(self):
        parts = L.paragraphs("<p>" + "This is a sentence. " * 300 + "</p>", max_chars=500)
        self.assertGreater(len(parts), 1)
        self.assertTrue(all(len(p) <= 500 for p in parts))
        self.assertTrue(all(p.endswith(".") for p in parts[:-1]))

    def test_titles_never_carry_a_colon(self):
        self.assertEqual(L.clean_title("PODCAST: Why <b>Jews</b>&#8217; Success"), "PODCAST – Why Jews’ Success")
        self.assertEqual(L.site_label("https://www.chabad.org/"), "Chabad.org")
        self.assertEqual(L.site_label("https://aish.com/"), "Aish.com")


CATEGORIES = [
    {"id": 1, "name": "Ask The Rabbi", "slug": "ask-the-rabbi", "parent": 0},
    {"id": 2, "name": "Shabbat", "slug": "shabbat-atr", "parent": 1},
    {"id": 3, "name": "Holidays", "slug": "holidays", "parent": 0},
    {"id": 9, "name": "Current", "slug": "current", "parent": 0},
]


def post(pid, title, cats, html, modified, authors=(7,), footnotes=None):
    return {
        "id": pid, "link": f"https://example.org/{pid}/", "date_gmt": "2020-01-01T00:00:00", "modified": modified,
        "modified_gmt": modified, "title": {"rendered": title}, "content": {"rendered": html}, "categories": cats,
        "authors": list(authors), "meta": {"footnotes": json.dumps(footnotes or [])},
    }


class FakeSite:
    """Answers the few WordPress requests the builder makes."""

    def __init__(self, posts):
        self.posts = posts
        self.requests = 0
        self.pause = 0

    def get(self, url, check_robots=True, timeout=90, attempts=4):
        self.requests += 1
        from urllib.parse import parse_qs, urlparse

        u = urlparse(url)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        headers = {"X-WP-TotalPages": "1"}
        if u.path.endswith("/categories"):
            return 200, json.dumps(CATEGORIES).encode(), headers
        if u.path.endswith("/authors"):
            return 200, json.dumps([{"id": 7, "name": "Rabbi A. Writer"}]).encode(), headers
        if u.path.endswith("/posts"):
            want = {int(x) for x in q["categories"].split(",")}
            drop = {int(x) for x in q.get("categories_exclude", "").split(",") if x}
            after = q.get("modified_after")
            found = [p for p in self.posts if set(p["categories"]) & want and not set(p["categories"]) & drop
                     and (not after or p["modified"] > after)]
            return 200, json.dumps(sorted(found, key=lambda p: p["modified"])).encode(), headers
        return 404, b"", {}


def section(work, edition, include, exclude=None):
    return {
        "work": work, "title": work.title(), "edition": edition, "language": "en", "category": "articles",
        "streams": ["kiruv"], "approved": False, "standing": "established",
        "site": {"permission": "aish", "home": "https://example.org/", "from": "wordpress", "include": include,
                 **({"exclude": exclude} if exclude else {})},
    }


class BuilderTest(unittest.TestCase):
    def build(self, path, posts, sections, full=False):
        sink = L.LocalSink(path)
        for stmt in C.schema_statements():
            sink.batch([(stmt, [])])
        col = C.Collection(sink, "Example.org", "Permission (Example, 2026-10-10)")
        col.load()
        site = FakeSite(posts)
        wp = C.WordPress(site, "https://example.org/")
        ids = [col.work_and_edition(s) for s in sections]
        col.rank = {eid: i for i, eid in enumerate(ids)}
        counts = [C.copy_wordpress(col, wp, s, eid, 0, full) for s, eid in zip(sections, ids)]
        col.flush()
        return sink, counts

    def test_articles_become_titles_and_paragraphs(self):
        posts = [
            post(10, "Lighting: Why?", [1, 2], "<p>Candles bring peace.</p><p>Light them before sunset.</p>", "2024-01-01T10:00:00",
                 footnotes=[{"id": "a", "content": "Shabbat 23b"}]),
            post(11, "Chanukah Guide", [3], "<p>Eight nights of light.</p>", "2024-01-02T10:00:00"),
            post(12, "Election news", [1, 9], "<p>Politics.</p>", "2024-01-03T10:00:00"),
            post(13, "A video", [1], "<p> </p>", "2024-01-04T10:00:00"),
        ]
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"], ["current"]), section("hol", "Holidays (English)", ["holidays"])]
        with tempfile.TemporaryDirectory() as d:
            sink, counts = self.build(Path(d) / "c.db", posts, sections)
            self.assertEqual(counts[0]["new"], 1)
            self.assertEqual(counts[0]["no text"], 1)
            self.assertEqual(counts[1]["new"], 1)
            refs = [r[0] for r in sink.query("SELECT ref FROM passages ORDER BY seq")]
            self.assertEqual(refs, ["Example.org, Lighting – Why? 1", "Example.org, Lighting – Why? 2", "Example.org, Lighting – Why? 3",
                                    "Example.org, Chanukah Guide 1"])
            self.assertEqual(sink.query("SELECT text FROM passages WHERE ref = ?", ["Example.org, Lighting – Why? 3"])[0][0], "Note 1: Shabbat 23b")
            row = sink.query("SELECT url, author, section, site FROM articles a JOIN titles t ON t.id = a.title_id WHERE t.title = ?",
                             ["Example.org, Lighting – Why?"])[0]
            self.assertEqual(row, ["https://example.org/10/", "Rabbi A. Writer", "Ask The Rabbi > Shabbat", "Example.org"])
            hits = sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"sunset"'])
            self.assertEqual(len(hits), 1)
            self.assertFalse(sink.query("SELECT 1 FROM passages WHERE text LIKE '%Politics%'"))

    def test_an_article_in_two_sections_goes_to_the_first(self):
        posts = [post(20, "Both", [1, 3], "<p>Shared.</p>", "2024-01-01T10:00:00")]
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"]), section("hol", "Holidays (English)", ["holidays"])]
        with tempfile.TemporaryDirectory() as d:
            sink, counts = self.build(Path(d) / "c.db", posts, sections)
            self.assertEqual((counts[0]["new"], counts[1]["another section"]), (1, 1))
            works = sink.query("SELECT DISTINCT e.work FROM passages p JOIN editions e ON e.id = p.edition_id")
            self.assertEqual(works, [["ask"]])
            # A later run, with only the second section's cursor behind, still leaves it in the first.
            sink.batch([("DELETE FROM crawl_state WHERE key LIKE 'hol|%'", [])])
            sink.close()
            sink, counts = self.build(Path(d) / "c.db", posts, sections)
            self.assertEqual(counts[1]["another section"], 1)
            self.assertEqual(sink.query("SELECT DISTINCT e.work FROM passages p JOIN editions e ON e.id = p.edition_id"), [["ask"]])

    def test_a_changed_article_is_replaced_and_its_old_words_leave_the_index(self):
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"])]
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "c.db"
            sink, _ = self.build(path, [post(30, "Q", [1], "<p>The old answer about zebras.</p>", "2024-01-01T10:00:00")], sections)
            sink.close()
            sink, counts = self.build(path, [post(30, "Q", [1], "<p>A new answer about giraffes.</p>", "2024-02-01T10:00:00")], sections)
            self.assertEqual(counts[0]["changed"], 1)
            self.assertEqual(sink.query("SELECT text FROM passages"), [["A new answer about giraffes."]])
            self.assertFalse(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"zebras"']))
            self.assertEqual(len(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"giraffes"'])), 1)
            # Read again in full, nothing changed: every article is the same.
            sink.close()
            sink, counts = self.build(path, [post(30, "Q", [1], "<p>A new answer about giraffes.</p>", "2024-02-01T10:00:00")], sections, full=True)
            self.assertEqual(counts[0]["same"], 1)

    def test_two_articles_with_one_title_get_distinct_titles(self):
        posts = [post(40, "Introduction", [1], "<p>One.</p>", "2024-01-01T10:00:00"),
                 post(41, "Introduction", [1], "<p>Two.</p>", "2024-01-02T10:00:00")]
        with tempfile.TemporaryDirectory() as d:
            sink, _ = self.build(Path(d) / "c.db", posts, [section("ask", "Ask (English)", ["ask-the-rabbi"])])
            titles = sorted(r[0] for r in sink.query("SELECT title FROM titles"))
            self.assertEqual(titles, ["Example.org, Introduction", "Example.org, Introduction (2)"])


class CanonSectionsTest(unittest.TestCase):
    def test_site_blocks_are_checked(self):
        good = {"permission": "aish", "home": "https://aish.com/", "from": "wordpress", "include": ["holidays"]}
        self.assertEqual(V.site_problems(good), [])
        self.assertTrue(V.site_problems({**good, "home": "https://www.chabad.org/"}))  # not the permission's site
        self.assertTrue(V.site_problems({**good, "permission": "nobody"}))
        self.assertTrue(V.site_problems({**good, "include": []}))
        self.assertTrue(V.site_problems({**good, "include": ["Not A Slug"]}))
        self.assertTrue(V.site_problems({**good, "from": "magic"}))
        self.assertEqual(V.private_permissions({"site": good}), ["aish"])


if __name__ == "__main__":
    unittest.main()
