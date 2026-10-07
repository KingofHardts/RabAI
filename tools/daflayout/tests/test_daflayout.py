"""Tests for the printed-page layout tool that need no scans, models, or network.

Run: python3 -m unittest discover -s tools/daflayout/tests
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from daf_layout import reconcile  # noqa: E402
from daflayout.dups import twins  # noqa: E402
from daflayout.text import fingerprint, letters, plain_text, words_of  # noqa: E402
from daflayout.words import _chunks, ink_runs, marks, word_positions  # noqa: E402


class Text(unittest.TestCase):
    def test_plain_text_matches_the_app(self):
        self.assertEqual(plain_text("<b>שלום</b>&nbsp;עולם<br/>טוב"), "שלום עולם טוב")
        self.assertEqual(plain_text("  א ב  "), "א ב")

    def test_words_split_like_javascript(self):
        self.assertEqual(words_of("א ב　ג﻿ד"), ["א", "ב", "ג", "ד"])
        # U+200B is not whitespace to JavaScript, so it stays inside the word.
        self.assertEqual(words_of("א​ב"), ["א​ב"])

    def test_letters(self):
        self.assertEqual(letters("מֵאֵימָתַי, קוֹרִין!"), "מאימתיקורינ")

    def test_fingerprint_matches_the_app(self):
        # web/tests/daf.test.ts checks the same value.
        self.assertEqual(fingerprint(["שלום", "עולם"]), "dbd9eeb4")
        self.assertNotEqual(fingerprint(["שלום", "עולם"]), fingerprint(["שלום", "עולם", "x"]))


WORDS = [f"מלה{chr(0x5d0 + i)}" for i in range(20)]


class Twins(unittest.TestCase):
    def test_a_long_shared_stretch_is_marked(self):
        a = {"ref": "Tosafot 1", "he": " ".join(["פתח"] + WORDS[:12])}
        b = {"ref": "Tosafot 2", "he": " ".join(WORDS[:12] + ["סוף"])}
        tw = twins([a, b])
        self.assertIn(("Tosafot 2", 0), tw[("Tosafot 1", 1)])
        self.assertNotIn(("Tosafot 1", 0), tw)

    def test_a_short_one_is_not(self):
        a = {"ref": "Tosafot 1", "he": " ".join(WORDS[:11])}
        b = {"ref": "Tosafot 2", "he": " ".join(WORDS[:11])}
        self.assertEqual(twins([a, b]), {})

    def test_a_repeat_inside_one_passage_is_not(self):
        a = {"ref": "Tosafot 1", "he": " ".join(WORDS[:12] + WORDS[:12])}
        self.assertEqual(twins([a]), {})


def printed(widths, space=8, inside=1, start=1000, xh=14):
    """Blobs of a line printed right to left: each word's letters (given as widths) one pixel apart,
    words `space` pixels apart. Returns the blobs and each word's [x0, x1]."""
    blobs, boxes, x = [], [], start
    for word in widths:
        right = x
        for w in word:
            blobs.append((x - w, x, xh))
            x -= w + inside
        x += inside
        boxes.append([x, right])
        x -= space
    return blobs, boxes


class WordPositions(unittest.TestCase):
    def test_words_found_between_the_spaces(self):
        blobs, boxes = printed([[10, 10, 10], [10, 10], [10, 10, 10, 10]])
        self.assertEqual(word_positions(blobs, ["אבג", "דה", "וחטכ"], 14), boxes)

    def test_a_gap_inside_a_word_is_not_a_space(self):
        # the middle word has a wider gap between two letters, but still narrower than a space
        blobs, boxes = printed([[10, 10, 10], [10, 10], [10, 10, 10]], space=9)
        blobs[4] = (blobs[4][0] - 3, blobs[4][1] - 3, 14)  # the second word's last letter stands apart
        out = word_positions(blobs, ["אבג", "דה", "חטכ"], 14)
        self.assertEqual([b[1] for b in out], [b[1] for b in boxes])
        self.assertEqual(out[1][0], boxes[1][0] - 3)

    def test_a_note_mark_is_left_out(self):
        blobs, boxes = printed([[10, 10], [10, 10]])
        blobs.append((boxes[1][0] - 9, boxes[1][0] - 5, 5))  # a small asterisk after the last word
        self.assertEqual(word_positions(blobs, ["אב", "גד"], 14), boxes)

    def test_a_dash_goes_in_the_space(self):
        blobs, boxes = printed([[10, 10], [10, 10]])
        out = word_positions(blobs, ["אב", "–", "גד"], 14)
        self.assertEqual(out[0], boxes[0])
        self.assertEqual(out[2], boxes[1])
        self.assertEqual(out[1], [boxes[1][1], boxes[0][0]])

    def test_an_abbreviation_is_shared_by_the_words_it_stands_for(self):
        # printed: בר פפא הקב"ה; the library: בר פפא הקדוש ברוך הוא
        blobs, boxes = printed([[10, 10], [10, 10, 10], [10, 10, 10, 4, 10]])
        read = [("בר", *boxes[0]), ("פפא", *boxes[1]), ('הקב"ה', *boxes[2])]
        out = word_positions(blobs, ["בר", "פפא", "הקדוש", "ברוך", "הוא"], 14, read)
        self.assertEqual(out[:2], boxes[:2])
        # the three share the printed word, right to left, together exactly its width
        self.assertEqual(out[2][1], boxes[2][1])
        self.assertEqual(out[4][0], boxes[2][0])
        self.assertTrue(out[2][0] == out[3][1] and out[3][0] == out[4][1])

    def test_a_printed_mark_the_library_lacks_is_left_out(self):
        blobs, boxes = printed([[10, 10], [8], [10, 10]])
        read = [("אב", *boxes[0]), ("(א)", *boxes[1]), ("גד", *boxes[2])]
        out = word_positions(blobs, ["אב", "גד"], 14, read)
        self.assertEqual(out, [boxes[0], boxes[2]])

    def test_a_yud_is_a_letter_not_a_mark(self):
        # ועל יין, set a little closer than a clear space: a yud is as short and narrow as a period,
        # but it hangs from the top of the letters, so the gap before it is a word space
        top = 100
        blobs = [(990, 1000, 14, top), (979, 989, 14, top), (968, 978, 14, top),  # ועל
                 (958, 962, 8, top), (953, 957, 8, top), (947, 952, 20, top)]  # יין
        read = [("ועל", 968, 1000), ("יין", 947, 962)]
        self.assertEqual(word_positions(blobs, ["ועל", "יין"], 14, read), [[968, 1000], [947, 962]])

    def test_a_period_between_words_goes_with_the_nearer_word(self):
        # יום. שיצא: the period sits low, a little nearer the first word, with the space split
        # around it; neither gap alone is a clear space, but the room between the words is
        top = 100
        blobs = [(990, 1000, 14, top), (979, 989, 14, top), (968, 978, 14, top),  # יום
                 (960, 964, 4, top + 10),  # .
                 (946, 956, 14, top), (935, 945, 14, top), (924, 934, 14, top)]  # דהו
        read = [("יום", 968, 1000), (".", 960, 964)]  # Tesseract missed the second word
        out = word_positions(blobs, ["יום.", "דהו"], 14, read)
        self.assertEqual(out, [[968, 1000], [924, 956]])

    def test_a_word_box_across_a_space_shares_its_letters(self):
        # printed: מאי עד ולא; Tesseract read "עדו" across the space after עד, then "לא"
        blobs, boxes = printed([[10, 10, 10], [10, 10], [5, 10, 10]], space=12)
        read = [("מאי", *boxes[0]), ("עדו", boxes[2][1] - 5, boxes[1][1]), ("לא", boxes[2][0], boxes[2][1] - 6)]
        runs = ink_runs(blobs)
        chunks = _chunks(runs, marks(runs, 14), 14, read)
        self.assertEqual([c["text"] for c in chunks], ["מאי", "עד", "ולא"])
        self.assertEqual(word_positions(blobs, ["מאי", "עד", "ולא"], 14, read), boxes)

    def test_too_few_spaces_gives_nothing(self):
        blobs, _ = printed([[10, 10, 10, 10, 10, 10]])
        self.assertIsNone(word_positions(blobs, ["אבג", "דהו"], 14))

    def test_words_far_from_their_letters_give_nothing(self):
        # three printed words, but the library's line has one long word and two one-letter words
        blobs, _ = printed([[10], [10, 10, 10, 10, 10, 10, 10, 10], [10]])
        self.assertIsNone(word_positions(blobs, ["אבגדהוזח", "ט", "י"], 14))


try:
    from daflayout.scan import stray_tall_letters
except ImportError:  # the scanning libraries (numpy, scipy) aren't installed
    stray_tall_letters = None


@unittest.skipIf(stray_tall_letters is None, "needs numpy and scipy")
class StrayLetters(unittest.TestCase):
    @staticmethod
    def piece(x0, x1, top, bottom, xh, n):
        return {"box": (x0, top, x1, bottom), "core": (x0, top, x1, bottom), "xh": xh, "n": n}

    def test_lameds_among_the_lines_letters_join_it(self):
        line = self.piece(708, 1069, 321, 338, 17, 40)
        lameds = self.piece(685, 861, 313, 338, 24, 3)  # same baseline, inside the line's span
        self.assertTrue(stray_tall_letters(lameds, line))

    def test_letters_beside_a_line_of_smaller_print_stay_apart(self):
        notes = self.piece(250, 380, 425, 438, 10, 20)  # a margin note's line
        beside = self.piece(396, 438, 423, 438, 14, 5)  # the next column's letters, same baseline
        self.assertFalse(stray_tall_letters(beside, notes))

    def test_a_full_line_is_not_a_stray(self):
        a = self.piece(708, 1069, 321, 338, 17, 40)
        b = self.piece(400, 700, 316, 338, 24, 30)
        self.assertFalse(stray_tall_letters(a, b))


def line(spans, agree=1.0, xs=None):
    return {"box": [0, 0, 100, 10], "xh": 8, "spans": spans, "agree": agree, "xs": xs}


def page(section, main=(), rashi=(), tosafot=()):
    return {"section": section, "scan": section.replace(" ", "_") + ".jpg", "size": [1000, 1500],
            "parts": {"main": list(main), "rashi": list(rashi), "tosafot": list(tosafot)}}


class Reconcile(unittest.TestCase):
    text = {
        "2a": {"main": [{"ref": "Berakhot 2a:1", "he": "א ב ג"}],
               "rashi": [{"ref": "Rashi on Berakhot 2a:1:1", "he": "ד ה"}], "tosafot": []},
        "2b": {"main": [{"ref": "Berakhot 2b:1", "he": "ו ז"}], "rashi": [], "tosafot": []},
    }

    def test_every_word_placed_is_complete(self):
        results = [
            page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 3]])], rashi=[line([["Rashi on Berakhot 2a:1:1", 0, 2]])]),
            page("Berakhot 2b", main=[line([["Berakhot 2b:1", 0, 2]])]),
        ]
        recs = {r["section"]: r for r in reconcile("Berakhot", results, self.text, {})}
        a = recs["Berakhot 2a"]
        self.assertTrue(a["complete"])
        self.assertEqual(a["refs"], ["Berakhot 2a:1", "Rashi on Berakhot 2a:1:1"])
        self.assertEqual(a["checks"][0], fingerprint(["א", "ב", "ג"]))
        self.assertEqual(a["lines"]["main"], [[0, 0, 100, 10, 8, [0, 0, 3]]])
        self.assertEqual(a["lines"]["rashi"], [[0, 0, 100, 10, 8, [1, 0, 2]]])

    def test_a_word_no_line_read_is_estimated(self):
        results = [page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 2]])], rashi=[line([["Rashi on Berakhot 2a:1:1", 0, 2]])])]
        rec = reconcile("Berakhot", results, self.text, {})[0]
        # it goes on the line of the word before it, marked as an estimate
        self.assertEqual(rec["lines"]["main"], [[0, 0, 100, 10, 8, [0, 0, 3]]])
        self.assertEqual(rec["estimated"], [0, 2, 3])
        self.assertEqual(rec["missing"], {"main": 0, "rashi": 0, "tosafot": 0})
        self.assertTrue(rec["placed_all"])
        self.assertFalse(rec["complete"])

    def test_a_long_unread_stretch_stays_missing(self):
        long = " ".join(["מלה"] * 12)
        text = {"2a": {"main": [{"ref": "Berakhot 2a:1", "he": "א " + long}], "rashi": [], "tosafot": []}}
        results = [page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 1]])])]
        rec = reconcile("Berakhot", results, text, {})[0]
        self.assertEqual(rec["missing"]["main"], 12)
        self.assertFalse(rec["placed_all"])
        self.assertFalse(rec["complete"])

    def test_a_word_claimed_twice_goes_to_the_better_reading(self):
        results = [
            page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 3]], agree=0.9)], rashi=[line([["Rashi on Berakhot 2a:1:1", 0, 2]])]),
            page("Berakhot 2b", main=[line([["Berakhot 2a:1", 2, 3], ["Berakhot 2b:1", 0, 2]], agree=0.5)]),
        ]
        recs = {r["section"]: r for r in reconcile("Berakhot", results, self.text, {})}
        self.assertEqual(recs["Berakhot 2a"]["lines"]["main"][0][5], [0, 0, 3])
        self.assertEqual(recs["Berakhot 2a"]["estimated"], [0, 2, 3])  # two lines read it: a judgment
        self.assertFalse(recs["Berakhot 2a"]["complete"])
        b = recs["Berakhot 2b"]
        self.assertEqual(b["refs"], ["Berakhot 2b:1"])
        self.assertEqual(b["lines"]["main"][0][5], [0, 0, 2])
        self.assertTrue(b["placed_all"])
        self.assertFalse(b["complete"])  # one of its lines lost a word it read

    def test_a_line_that_reads_unlike_its_words_holds_them_by_estimate(self):
        text = {"2a": {"main": [{"ref": "Berakhot 2a:1", "he": "אבגדה ושזחטי"}], "rashi": [], "tosafot": []}}
        results = [page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 2]], agree=0.3)])]
        rec = reconcile("Berakhot", results, text, {})[0]
        self.assertEqual(rec["doubtful"]["main"], 1)
        self.assertEqual(rec["estimated"], [0, 0, 2])
        self.assertTrue(rec["placed_all"])
        self.assertFalse(rec["complete"])

    def test_word_positions_are_kept(self):
        results = [
            page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 3]], xs=[[90, 100], [60, 80], [0, 50]])],
                 rashi=[line([["Rashi on Berakhot 2a:1:1", 0, 2]])]),
        ]
        rec = reconcile("Berakhot", results, self.text, {})[0]
        self.assertEqual(rec["lines"]["main"], [[0, 0, 100, 10, 8, [0, 0, 3], [90, 100, 60, 80, 0, 50]]])
        self.assertEqual(rec["lines"]["rashi"], [[0, 0, 100, 10, 8, [1, 0, 2]]])  # none found: none kept

    def test_a_line_with_a_word_added_by_estimate_has_no_positions(self):
        results = [page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 2]], xs=[[90, 100], [60, 80]])],
                        rashi=[line([["Rashi on Berakhot 2a:1:1", 0, 2]])])]
        rec = reconcile("Berakhot", results, self.text, {})[0]
        self.assertEqual(rec["lines"]["main"], [[0, 0, 100, 10, 8, [0, 0, 3]]])

    def test_a_twin_placed_counts(self):
        text = {"2a": {"main": [{"ref": "Berakhot 2a:1", "he": "א"}], "rashi": [],
                       "tosafot": [{"ref": "Tosafot 1", "he": "ב"}, {"ref": "Tosafot 2", "he": "ב"}]}}
        twin = {("Tosafot 2", 0): {("Tosafot 1", 0)}, ("Tosafot 1", 0): {("Tosafot 2", 0)}}
        results = [page("Berakhot 2a", main=[line([["Berakhot 2a:1", 0, 1]])], tosafot=[line([["Tosafot 1", 0, 1]])])]
        self.assertTrue(reconcile("Berakhot", results, text, twin)[0]["complete"])


if __name__ == "__main__":
    unittest.main()
