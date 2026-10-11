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
        self.assertEqual(L.clean_title("PODCAST: Why <b>Jews</b>&#8217; Success"), "PODCAST - Why Jews' Success")
        self.assertEqual(L.clean_title("Chanukah \u2013 Lights\u2014and Bar\u2011Mitzvah \u201cJoy\u201d"), 'Chanukah - Lights-and Bar-Mitzvah "Joy"')
        self.assertEqual(L.site_label("https://www.chabad.org/"), "Chabad.org")
        self.assertEqual(L.site_label("https://aish.com/"), "Aish.com")


class PageShapeTest(unittest.TestCase):
    PAGE = (
        "<html><head><title>Why Light Candles</title><script>var secret = 'zzz';</script></head><body>"
        "<nav class='menu'><p>Home</p></nav>"
        "<main id='main'><article class='post'>"
        "<div class='entry-content'><p>Why do we light candles on Friday night?</p>"
        "<div class='rabbi-answer'><p>Alpha bravo charlie.</p><p>Delta echo foxtrot.</p><p>Golf hotel india.</p></div></div>"
        "</article></main>"
        "<section class='comments'><p>Juliet kilo.</p></section></body></html>"
    )

    def report(self, probe):
        page = C.PageShape()
        page.feed(self.PAGE)
        return page.report(probe)

    def test_it_finds_the_article_and_the_elements_around_it(self):
        lines = self.report("Why do we light candles")
        text = "\n".join(lines)
        self.assertIn("found; the elements around it", text)
        around = lines[lines.index(next(l for l in lines if "found;" in l)) + 1]
        self.assertTrue(around.strip().startswith("div.entry-content"))
        self.assertIn("4 paragraphs", around)
        self.assertIn("div.rabbi-answer (depth 5): 3 paragraphs, 0 headings", text)
        self.assertIn("section.comments", text)
        box = lines.index("the children of the smallest element around it that holds more paragraphs, in page order:")
        self.assertTrue(lines[box + 1].strip().startswith("p (depth 5): 1 paragraphs"))
        self.assertTrue(lines[box + 2].strip().startswith("div.rabbi-answer (depth 5): 3 paragraphs"))

    def test_it_says_when_the_article_is_not_on_the_page(self):
        self.assertIn("not found on the page", "\n".join(self.report("Words that are not there")))

    def test_it_never_prints_the_pages_words(self):
        text = "\n".join(self.report("Why do we light candles"))
        for word in ("Alpha", "Delta", "Juliet", "Friday", "candles", "Home", "secret", "zzz"):
            self.assertNotIn(word, text)


CATEGORIES = [
    {"id": 1, "name": "Ask The Rabbi", "slug": "ask-the-rabbi", "parent": 0},
    {"id": 2, "name": "Shabbat", "slug": "shabbat-atr", "parent": 1},
    {"id": 3, "name": "Holidays", "slug": "holidays", "parent": 0},
    {"id": 9, "name": "Current", "slug": "current", "parent": 0},
]


def post(pid, title, cats, html, modified, authors=(7,), footnotes=None):
    return {
        "id": pid, "link": f"https://example.org/{pid}/", "date_gmt": "2020-01-01T00:00:00", "modified_gmt": modified,
        "title": {"rendered": title}, "content": {"rendered": html}, "categories": cats,
        "authors": list(authors), "meta": {"footnotes": json.dumps(footnotes or [])},
    }


class FakeSite:
    """Answers the few WordPress requests the builder makes.

    struggle_over: fetching more than this many posts at once fails with HTTP 500.
    list_over: listing more than this many at once fails. broken: posts that always fail.
    """

    def __init__(self, posts, struggle_over=None, list_over=None, broken=(), pages=None, disallowed=()):
        self.posts = posts
        self.pages = pages or {}  # an article's own page by its address; None: the page fails
        self.disallowed = set(disallowed)  # addresses robots.txt asks robots to leave alone
        self.struggle_over = struggle_over
        self.list_over = list_over
        self.broken = set(broken)
        self.fetched: list[list[int]] = []  # the ids asked for in each fetch, in order
        self.listings = 0
        self.pause = 0

    def get(self, url, check_robots=True, timeout=90, attempts=4):
        from urllib.parse import parse_qs, urlparse

        u = urlparse(url)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if url in self.disallowed:
            raise PermissionError(f"robots.txt asks robots to leave {url} alone")
        if url in self.pages:
            page = self.pages[url]
            return (500, b"", {}) if page is None else (200, page.encode(), {})
        if u.path.endswith("/categories"):
            return 200, json.dumps(CATEGORIES).encode(), {"X-WP-TotalPages": "1"}
        if u.path.endswith("/authors"):
            return 200, json.dumps([{"id": 7, "name": "Rabbi A. Writer"}]).encode(), {}
        if u.path.endswith("/posts") and "include" in q:
            ids = [int(x) for x in q["include"].split(",")]
            self.fetched.append(ids)
            if (self.struggle_over and len(ids) > self.struggle_over) or self.broken & set(ids):
                return 500, b'{"code":"internal_server_error"}', {}
            found = [p for p in self.posts if p["id"] in ids]
            return 200, json.dumps(found).encode(), {}
        if u.path.endswith("/posts"):
            self.listings += 1
            size, offset = int(q["per_page"]), int(q.get("offset", 0))
            if self.list_over and size > self.list_over:
                return 500, b"<html><title>Error</title></html>", {}
            if "categories_exclude" in q:  # Aish.com's server fails this filter on a large section
                return 500, b'{"code":"internal_server_error"}', {}
            want = {int(x) for x in q["categories"].split(",")}
            found = sorted((p for p in self.posts if set(p["categories"]) & want), key=lambda p: p["id"])
            page = [{"id": p["id"], "modified_gmt": p["modified_gmt"], "categories": p["categories"]} for p in found[offset : offset + size]]
            return 200, json.dumps(page).encode(), {"X-WP-Total": str(len(found))}
        return 404, b"", {}


def section(work, edition, include, exclude=None, page=None):
    return {
        "work": work, "title": work.title(), "edition": edition, "language": "en", "category": "articles",
        "streams": ["kiruv"], "approved": False, "standing": "established",
        "site": {"permission": "aish", "home": "https://example.org/", "from": "wordpress", "include": include,
                 **({"exclude": exclude} if exclude else {}), **({"page": page} if page else {})},
    }


def ask_page(question, answer_paras, box="single_post_container_content"):
    """A post's own page in Aish.com's layout: the question the interface gives, then the answer."""
    return (
        f"<html><body><nav class='menu'><p>Home</p></nav><div class='{box}'>"
        f"<div class='artContent'><div id='wtr-content'><p>{question}</p></div></div>"
        "<h3>The Aish Rabbi Replies</h3>" + "".join(f"<p>{p}</p>" for p in answer_paras) +
        "<a class='ask-q-link bottom' href='/ask/'>Ask your own question</a><a class='cmt-link' href='#c'>Comments</a>"
        "<div class='donation-form'><p>Support our work</p></div></div>"
        "<div class='comments-area'><p>A reader's comment.</p></div></body></html>"
    )


class BuilderTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.path = Path(self.dir.name) / "c.db"

    def tearDown(self):
        self.dir.cleanup()

    def build(self, site, sections, **options):
        """One run of the builder against a fake site. Returns (sink, counts per section, the run)."""
        sink = L.LocalSink(self.path)
        for stmt in C.schema_statements():
            sink.batch([(stmt, [])])
        col = C.Collection(sink, "Example.org", "Permission (Example, 2026-10-10)")
        col.load()
        run = C.copy_site(col, C.WordPress(site, "https://example.org/"), sections, **options)
        col.flush()
        self.addCleanup(sink.close)
        return sink, [s.counts for s in run["sections"]], run

    def test_articles_become_titles_and_paragraphs(self):
        posts = [
            post(10, "Lighting: Why?", [1, 2], "<p>Candles bring peace.</p><p>Light them before sunset.</p>", "2024-01-01T10:00:00",
                 footnotes=[{"id": "a", "content": "Shabbat 23b"}]),
            post(11, "Chanukah Guide", [3], "<p>Eight nights of light.</p>", "2024-01-02T10:00:00"),
            post(12, "Election news", [1, 9], "<p>Politics.</p>", "2024-01-03T10:00:00"),
            post(13, "A video", [1], "<p> </p>", "2024-01-04T10:00:00"),
        ]
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"], ["current"]), section("hol", "Holidays (English)", ["holidays"])]
        site = FakeSite(posts)
        sink, counts, _ = self.build(site, sections)
        self.assertEqual((counts[0]["listed"], counts[0]["excluded"], counts[0]["new"], counts[0]["no text"]), (2, 1, 1, 1))
        self.assertEqual(counts[1]["new"], 1)
        self.assertNotIn(12, [i for ids in site.fetched for i in ids])  # an excluded section's post is never fetched
        refs = [r[0] for r in sink.query("SELECT ref FROM passages ORDER BY seq")]
        self.assertEqual(refs, ["Example.org, Lighting - Why? 1", "Example.org, Lighting - Why? 2", "Example.org, Lighting - Why? 3",
                                "Example.org, Chanukah Guide 1"])
        self.assertEqual(sink.query("SELECT text FROM passages WHERE ref = ?", ["Example.org, Lighting - Why? 3"])[0][0], "Note 1: Shabbat 23b")
        row = sink.query("SELECT url, author, section, site FROM articles a JOIN titles t ON t.id = a.title_id WHERE t.title = ?",
                         ["Example.org, Lighting - Why?"])[0]
        self.assertEqual(row, ["https://example.org/10/", "Rabbi A. Writer", "Ask The Rabbi > Shabbat", "Example.org"])
        self.assertEqual(len(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"sunset"'])), 1)
        self.assertFalse(sink.query("SELECT 1 FROM passages WHERE text LIKE '%Politics%'"))

        # The next run lists again, but fetches nothing: nothing changed, and the empty post is remembered.
        site.fetched.clear()
        _, counts, _ = self.build(site, sections)
        self.assertEqual(site.fetched, [])
        self.assertEqual((counts[0]["unchanged"], counts[0]["no text"], counts[1]["unchanged"]), (1, 1, 1))

    def test_a_section_with_page_reads_each_article_from_its_own_page(self):
        page = {"box": "single_post_container_content", "answer": "The Aish Rabbi Replies"}
        posts = [
            post(30, "Two Candles", [1], "<p>Why two candles?</p>", "2024-01-01T10:00:00"),
            post(31, "Old Layout", [1], "<p>A question and its answer together.</p>", "2024-01-02T10:00:00"),
            post(32, "Busy Server", [1], "<p>Why wash twice?</p>", "2024-01-03T10:00:00"),
            post(33, "Kept Out", [1], "<p>Why stand?</p>", "2024-01-04T10:00:00"),
            post(34, "Moved Box", [1], "<p>Why salt?</p>", "2024-01-05T10:00:00"),
        ]
        pages = {
            "https://example.org/30/": ask_page("Why two candles?", ["One for zachor.", "One for shamor."]),
            "https://example.org/31/": "<html><body><div class='post'><p>No box here.</p></div></body></html>",
            "https://example.org/32/": None,
            "https://example.org/34/": ask_page("A different article.", ["Its answer."]),
        }
        site = FakeSite(posts, pages=pages, disallowed={"https://example.org/33/"})
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"], page=page)]
        sink, counts, _ = self.build(site, sections)
        texts = [r[0] for r in sink.query(
            "SELECT p.text FROM passages p JOIN titles t ON t.id = p.title_id WHERE t.title = ? ORDER BY p.seq",
            ["Example.org, Two Candles"])]
        self.assertEqual(texts, ["Question: Why two candles?\nThe Aish Rabbi Replies\nOne for zachor.", "One for shamor."])
        self.assertFalse(sink.query("SELECT 1 FROM passages WHERE text LIKE '%Support our work%' OR text LIKE '%comment%' "
                                    "OR text LIKE '%Ask your own%' OR text LIKE '%Home%'"))
        c = counts[0]
        self.assertEqual((c["new"], c["from the page"], c["with the answer heading"], c["page without the box"],
                          c["page failed"], c["page not allowed"], c["page without the article"]), (5, 1, 1, 1, 1, 1, 1))
        self.assertEqual(c["characters left out"], len("Ask your own question"))
        # Where the page couldn't be used, the interface's text is kept.
        for title, text in (("Old Layout", "A question and its answer together."), ("Busy Server", "Why wash twice?"),
                            ("Kept Out", "Why stand?"), ("Moved Box", "Why salt?")):
            self.assertEqual(sink.query("SELECT p.text FROM passages p JOIN titles t ON t.id = p.title_id WHERE t.title = ?",
                                        [f"Example.org, {title}"])[0][0], text)

        # The next run fetches only the article whose page didn't answer; once it does, it is settled.
        site.fetched.clear()
        pages["https://example.org/32/"] = ask_page("Why wash twice?", ["Once for the hands."])
        sink, counts, _ = self.build(site, sections)
        self.assertEqual(site.fetched, [[32]])
        self.assertEqual((counts[0]["changed"], counts[0]["unchanged"]), (1, 4))
        site.fetched.clear()
        self.build(site, sections)
        self.assertEqual(site.fetched, [])

    def test_an_existing_section_is_read_again_once_it_reads_pages(self):
        posts = [post(40, "Two Candles", [1], "<p>Why two candles?</p>", "2024-01-01T10:00:00")]
        site = FakeSite(posts, pages={"https://example.org/40/": ask_page("Why two candles?", ["One for zachor."])})
        self.build(site, [section("ask", "Ask (English)", ["ask-the-rabbi"])])
        site.fetched.clear()
        page = {"box": "single_post_container_content", "answer": "The Aish Rabbi Replies"}
        sink, counts, _ = self.build(site, [section("ask", "Ask (English)", ["ask-the-rabbi"], page=page)])
        self.assertEqual(site.fetched, [[40]])
        self.assertEqual((counts[0]["changed"], counts[0]["from the page"]), (1, 1))
        self.assertEqual(sink.query("SELECT COUNT(*) FROM passages")[0][0], 1)

    def test_two_posts_at_one_address_leave_one_article_and_no_leftovers(self):
        twin = lambda pid, text, when: {**post(pid, "Same Place", [1], f"<p>{text}</p>", when), "link": "https://example.org/same/"}
        site = FakeSite([twin(50, "The older copy.", "2024-01-01T10:00:00"), twin(51, "The newer copy.", "2024-02-01T10:00:00")])
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"])]
        sink, counts, _ = self.build(site, sections)
        # The newer post takes the address over, keeping the article's title.
        self.assertEqual(sink.query("SELECT site_id FROM articles"), [["51"]])
        self.assertEqual(sink.query("SELECT text FROM passages"), [["The newer copy."]])
        self.assertEqual(sink.query("SELECT title FROM titles"), [["Example.org, Same Place"]])
        self.assertEqual(sink.query("SELECT COUNT(*) FROM titles WHERE id NOT IN (SELECT title_id FROM articles)"), [[0]])
        # The older post is remembered, so the next run fetches nothing.
        site.fetched.clear()
        _, counts, _ = self.build(site, sections)
        self.assertEqual(site.fetched, [])
        self.assertEqual((counts[0]["unchanged"], counts[0]["same address as a newer post"]), (1, 1))

    def test_an_older_post_that_appears_at_a_stored_address_is_skipped(self):
        twin = lambda pid, text, when: {**post(pid, "Same Place", [1], f"<p>{text}</p>", when), "link": "https://example.org/same/"}
        newer = twin(71, "The newer copy.", "2024-02-01T10:00:00")
        site = FakeSite([newer])
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"])]
        self.build(site, sections)
        site.posts = [twin(70, "The older copy.", "2024-01-01T10:00:00"), newer]
        site.fetched.clear()
        sink, counts, _ = self.build(site, sections)
        self.assertEqual(site.fetched, [[70]])
        self.assertEqual((counts[0]["same address as a newer post"], counts[0]["new"]), (1, 0))
        self.assertEqual(sink.query("SELECT site_id FROM articles"), [["71"]])
        self.assertEqual(sink.query("SELECT text FROM passages"), [["The newer copy."]])
        self.assertEqual(sink.query("SELECT COUNT(*) FROM titles WHERE id NOT IN (SELECT title_id FROM articles)"), [[0]])
        site.fetched.clear()
        self.build(site, sections)
        self.assertEqual(site.fetched, [])

    def test_a_title_left_without_its_article_is_removed_with_its_paragraphs(self):
        site = FakeSite([post(60, "Kept", [1], "<p>Candles bring peace.</p>", "2024-01-01T10:00:00")])
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"])]
        sink, _, _ = self.build(site, sections)
        # Leave a title and a paragraph behind with no article row, as an earlier bug could.
        sink.batch([
            ("INSERT INTO titles (title, he_title, work, categories, depth, section_names) VALUES ('Example.org, Left', NULL, 'ask', '[]', 1, '[]')", []),
            ("INSERT INTO passages (ref, title_id, edition_id, version_id, seq, text) SELECT 'Example.org, Left 1', t.id, 1, 1, 99, "
             "'Left behind about candles.' FROM titles t WHERE t.title = 'Example.org, Left'", []),
            ("INSERT INTO passages_fts (rowid, plain) SELECT id, 'left behind about candles' FROM passages WHERE ref = 'Example.org, Left 1'", []),
        ])
        sink, _, run = self.build(site, sections)
        self.assertEqual(run["orphans"], 1)
        self.assertEqual(sink.query("SELECT title FROM titles"), [["Example.org, Kept"]])
        self.assertEqual(sink.query("SELECT ref FROM passages"), [["Example.org, Kept 1"]])
        self.assertEqual(len(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"left"'])), 0)
        self.assertEqual(len(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"candles"'])), 1)

    def test_an_article_in_two_sections_goes_to_the_first(self):
        site = FakeSite([post(20, "Both", [1, 3], "<p>Shared.</p>", "2024-01-01T10:00:00")])
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"]), section("hol", "Holidays (English)", ["holidays"])]
        sink, counts, _ = self.build(site, sections)
        self.assertEqual((counts[0]["new"], counts[1]["in an earlier section"]), (1, 1))
        works = sink.query("SELECT DISTINCT e.work FROM passages p JOIN editions e ON e.id = p.edition_id")
        self.assertEqual(works, [["ask"]])
        # Taken out of the first section on the site, it moves to the second.
        site.posts = [post(20, "Both", [3], "<p>Shared.</p>", "2024-01-01T10:00:00")]
        sink, counts, _ = self.build(site, sections)
        self.assertEqual(counts[1]["changed"], 1)
        self.assertEqual(sink.query("SELECT DISTINCT e.work FROM passages p JOIN editions e ON e.id = p.edition_id"), [["hol"]])

    def test_a_changed_article_is_replaced_and_its_old_words_leave_the_index(self):
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"])]
        self.build(FakeSite([post(30, "Q", [1], "<p>The old answer about zebras.</p>", "2024-01-01T10:00:00")]), sections)
        site = FakeSite([post(30, "Q", [1], "<p>A new answer about giraffes.</p>", "2024-02-01T10:00:00")])
        sink, counts, _ = self.build(site, sections)
        self.assertEqual(counts[0]["changed"], 1)
        self.assertEqual(sink.query("SELECT text FROM passages"), [["A new answer about giraffes."]])
        self.assertFalse(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"zebras"']))
        self.assertEqual(len(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"giraffes"'])), 1)
        # Fetched again in full, nothing changed: every article is the same.
        _, counts, _ = self.build(site, sections, full=True)
        self.assertEqual(counts[0]["same"], 1)

    def test_two_articles_with_one_title_get_distinct_titles(self):
        site = FakeSite([post(40, "Introduction", [1], "<p>One.</p>", "2024-01-01T10:00:00"),
                         post(41, "Introduction", [1], "<p>Two.</p>", "2024-01-02T10:00:00")])
        sink, _, _ = self.build(site, [section("ask", "Ask (English)", ["ask-the-rabbi"])])
        titles = sorted(r[0] for r in sink.query("SELECT title FROM titles"))
        self.assertEqual(titles, ["Example.org, Introduction", "Example.org, Introduction (2)"])

    def test_a_struggling_site_is_asked_for_fewer_and_a_broken_article_is_skipped(self):
        posts = [post(50 + i, f"Article {i}", [1], f"<p>Text number {i}.</p>", "2024-01-01T10:00:00") for i in range(9)]
        site = FakeSite(posts, struggle_over=2, list_over=60, broken=[53])
        sink, counts, run = self.build(site, [section("ask", "Ask (English)", ["ask-the-rabbi"])])
        self.assertEqual((counts[0]["new"], counts[0]["failed"]), (8, 1))
        self.assertEqual(run["fetcher"].failed, ["53"])
        self.assertTrue(all(len(ids) <= 2 for ids in site.fetched[1:] if 53 not in ids))
        self.assertEqual(sink.query("SELECT COUNT(*) FROM articles")[0][0], 8)
        # Next time the broken one works, and only it is fetched.
        site.broken.clear()
        site.fetched.clear()
        _, counts, _ = self.build(site, [section("ask", "Ask (English)", ["ask-the-rabbi"])])
        self.assertEqual((counts[0]["new"], counts[0]["unchanged"]), (1, 8))
        self.assertEqual(site.fetched, [[53]])

    def test_a_time_limit_stops_fetching_and_the_next_run_continues(self):
        posts = [post(70 + i, f"Piece {i}", [1], f"<p>Words {i}.</p>", "2024-01-01T10:00:00") for i in range(5)]
        site = FakeSite(posts)
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"])]
        _, counts, _ = self.build(site, sections, limit=2)
        self.assertEqual((counts[0]["new"], counts[0]["not reached"]), (2, 0))
        sink, counts, _ = self.build(site, sections)
        self.assertEqual((counts[0]["new"], counts[0]["unchanged"]), (3, 2))
        self.assertEqual(sink.query("SELECT COUNT(*) FROM articles")[0][0], 5)

    def test_articles_the_site_drops_are_removed_but_not_a_suspicious_number(self):
        sections = [section("ask", "Ask (English)", ["ask-the-rabbi"])]
        posts = [post(100 + i, f"Note {i}", [1], f"<p>Unique word{i}x here.</p>", "2024-01-01T10:00:00") for i in range(30)]
        self.build(FakeSite(posts), sections)
        sink, _, run = self.build(FakeSite(posts[1:]), sections)
        self.assertEqual(run["removed"], 1)
        self.assertFalse(sink.query("SELECT 1 FROM titles WHERE title = ?", ["Example.org, Note 0"]))
        self.assertFalse(sink.query("SELECT rowid FROM passages_fts WHERE passages_fts MATCH ?", ['"word0x"']))
        self.assertEqual(sink.query("SELECT COUNT(*) FROM articles")[0][0], 29)
        # The site lists nothing at all: that looks like a problem on the site, so everything is kept...
        sink, _, run = self.build(FakeSite([]), sections)
        self.assertEqual(run["removed"], 0)
        self.assertIn("--prune", run["kept_note"])
        self.assertEqual(sink.query("SELECT COUNT(*) FROM articles")[0][0], 29)
        # ...unless asked.
        sink, _, run = self.build(FakeSite([]), sections, prune_all=True)
        self.assertEqual((run["removed"], sink.query("SELECT COUNT(*) FROM passages")[0][0]), (29, 0))


class ErrorHintTest(unittest.TestCase):
    def test_an_error_page_is_described_briefly(self):
        self.assertEqual(L.error_hint(b'{"code":"rest_post_invalid_page_number","message":"x"}'), "rest_post_invalid_page_number")
        self.assertEqual(L.error_hint(b"<html><head><title>Fatal error</title></head><body>...</body></html>"), "Fatal error")
        self.assertEqual(L.error_hint(b""), "")
        self.assertEqual(L.header({"x-wp-total": "5"}, "X-WP-Total"), "5")


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
        page = {"box": "single_post_container_content", "answer": "The Aish Rabbi Replies"}
        self.assertEqual(V.site_problems({**good, "page": page}), [])
        self.assertEqual(V.site_problems({**good, "page": {"box": "post-body"}}), [])
        self.assertTrue(V.site_problems({**good, "page": {"answer": "The Aish Rabbi Replies"}}))  # no box
        self.assertTrue(V.site_problems({**good, "page": {"box": "a b"}}))  # not one class
        self.assertTrue(V.site_problems({**good, "page": {**page, "where": "x"}}))
        self.assertTrue(V.site_problems({**good, "page": {**page, "answer": ""}}))
        self.assertTrue(V.site_problems({**good, "from": "pages", "include": ["/x/"], "page": page}))


if __name__ == "__main__":
    unittest.main()
