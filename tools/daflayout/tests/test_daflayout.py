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
from daflayout.words import _chunks, abbreviates, ink_runs, marks, word_places, word_positions  # noqa: E402


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

    def test_words_read_as_one_are_split_where_the_print_sets_them_apart(self):
        # printed: ומאי וטהר, a narrow space apart; Tesseract read them as one word
        blobs, boxes = printed([[10, 10, 5, 10], [10, 10, 10, 10]], space=4)
        read = [("ומאיוטהר", boxes[1][0], boxes[0][1])]
        self.assertEqual(word_positions(blobs, ["ומאי", "וטהר"], 14, read), boxes)

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
    from daflayout.scan import stray_bits, stray_tall_letters
except ImportError:  # the scanning libraries (numpy, scipy) aren't installed
    stray_bits = stray_tall_letters = None


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

    def test_a_few_small_letters_inside_a_line_join_it(self):
        line = self.piece(1078, 1328, 309, 331, 14, 20)
        bits = self.piece(1132, 1259, 304, 325, 10.5, 5)  # yuds and a lamed, sitting a little high
        bits["comps"] = [(1255, 304, 1259, 312, 20, 1), (1205, 305, 1221, 325, 90, 2), (1132, 313, 1142, 325, 50, 3)]
        self.assertTrue(stray_bits(bits, line))
        beside = self.piece(1340, 1400, 309, 331, 10, 5)  # past the line's end: another column's
        beside["comps"] = [(1340, 312, 1350, 325, 50, 4)]
        self.assertFalse(stray_bits(beside, line))

    def test_a_full_line_is_not_a_stray(self):
        a = self.piece(708, 1069, 321, 338, 17, 40)
        b = self.piece(400, 700, 316, 338, 24, 30)
        self.assertFalse(stray_tall_letters(a, b))


try:
    from daflayout import furniture
except ImportError:  # rapidfuzz isn't installed
    furniture = None


@unittest.skipIf(furniture is None, "needs rapidfuzz")
class Heading(unittest.TestCase):
    def test_daf_numbers_in_letters(self):
        for n, he in [(2, "ב"), (10, "י"), (15, "טו"), (16, "טז"), (27, "כז"), (115, "קטו"), (176, "קעו")]:
            self.assertEqual(furniture.hebrew_number(n), he)

    def test_what_the_heading_says(self):
        (words, number), = furniture.expected("ברכות", [(4, "תפלת השחר")], 27, "a")
        self.assertEqual(words, [["תפלת"], ["השחר"], ["פרק"], ["רביעי"], ["ברכות"]])
        self.assertEqual(number, "כז")
        (words, number), = furniture.expected("בבא בתרא", [(6, "המוכר פירות")], 92, "b")
        self.assertEqual(words[3], ["ששי", "שישי"])
        self.assertEqual(number, "184")

    def test_printed_words_line_up_with_the_words_expected(self):
        words = [["תפלת"], ["השחר"], ["פרק"], ["רביעי"], ["ברכות"]]
        # two words printed close together, one read badly, one broken in two
        _, steps = furniture.line_up(["תפלת השחר", "פרק", "רב ע", "ברב", "ות"], words)
        self.assertEqual([s[0] for s in steps], ["split", "one", "one", "joined"])

    @staticmethod
    def blob(x0, x1, y0=100, y1=128, label=0):
        return (x0, y0, x1, y1, 200, label)

    def test_the_heading_is_found_where_it_is_printed(self):
        # Berakhot 27a: four words, then the daf's number far to the left; the text starts at 190.
        printed = {"תפלת": (1108, 1199), "השחר": (1007, 1099), "פרק": (890, 953), "רביעי": (787, 870),
                   "ברכות": (634, 735), "כז": (404, 436)}
        comps, said = [], {}
        for i, (word, (x0, x1)) in enumerate(printed.items()):
            a = self.blob(x0, (x0 + x1) // 2 - 3, label=2 * i + 1)
            b = self.blob((x0 + x1) // 2, x1, label=2 * i + 2)
            comps += [a, b]
            said[frozenset([a[5], b[5]])] = word
        comps.append((900, 150, 910, 160, 50, 99))  # a speck in the margin's heading, lower down
        read = lambda blobs: said.get(frozenset(c[5] for c in blobs), "")  # noqa: E731
        choices = furniture.expected("ברכות", [(4, "תפלת השחר")], 27, "a")
        out = furniture.find_heading(comps, 190, 14, choices, read, "a")
        self.assertEqual([w[0] for w in out], ["תפלת", "השחר", "פרק", "רביעי", "ברכות", "כז"])
        self.assertEqual(out[0][1:], [1108, 100, 1199, 128])
        self.assertEqual(out[-1][1:], [404, 100, 436, 128])

    @unittest.skipIf(stray_tall_letters is None, "needs numpy and scipy")
    def test_a_label_at_a_lines_end_is_taken_out_of_it(self):
        comps = [(100 + 20 * i, 300, 115 + 20 * i, 314, 90, i + 1) for i in range(10)]  # x 100-295
        label = [(20, 300, 45, 314, 90, 11), (50, 300, 70, 314, 90, 12)]  # x 20-70, at the left end
        line = {"comps": comps + label, "ocr": {
            "heb": ("", 40.0, [("שלום", 200, 295), ("עליכם", 100, 190), ("תורה", 50, 70), ("אור", 20, 45)]),
            "heb_rashi": ("", 80.0, [("שלום", 200, 295), ("עליכם", 100, 190), ("זזז", 20, 70)])}}
        found = furniture.take_labels([line])
        self.assertEqual(found, [["תורה אור", 20, 300, 70, 314]])
        self.assertEqual(len(line["comps"]), 10)
        self.assertEqual(line["box"][0], 100)
        self.assertEqual(line["ocr"]["heb"][0], "שלום עליכם")
        self.assertEqual(line["ocr"]["heb_rashi"][0], "שלום עליכם")

    def test_the_words_of_a_verse_are_not_a_label(self):
        comps = [(100 + 20 * i, 300, 115 + 20 * i, 314, 90, i + 1) for i in range(10)]
        line = {"comps": comps, "ocr": {
            "heb": ("", 40.0, [("נר", 260, 295), ("מצוה", 200, 250), ("ותורה", 130, 190), ("אור", 100, 125)]),
            "heb_rashi": ("", 80.0, [])}}
        self.assertEqual(furniture.take_labels([line]), [])

    @unittest.skipIf(stray_tall_letters is None, "needs numpy and scipy")
    def test_a_ring_an_asterisk_and_a_geresh_are_told_apart(self):
        import numpy as np
        yy, xx = np.mgrid[0:9, 0:9]
        d = np.hypot(yy - 4, xx - 4)
        ring = (d >= 2.0) & (d <= 4.3)
        star = np.zeros((11, 11), bool)
        for t in (0, 60, 120):
            a = np.radians(t)
            for r in np.linspace(-5, 5, 41):
                star[int(round(5 + r * np.cos(a))), int(round(5 + r * np.sin(a)))] = True
        star = star | np.roll(star, 1, axis=1)
        geresh = np.zeros((10, 3), bool)
        geresh[:, 1] = True
        self.assertEqual(furniture.mark_kind(ring, 17), "°")
        self.assertEqual(furniture.mark_kind(star, 17), "*")
        self.assertIsNone(furniture.mark_kind(geresh, 17))
        self.assertIsNone(furniture.mark_kind(np.ones((16, 12), bool), 17))  # too big for a mark

    def test_a_marks_place_is_taken_out_of_the_word_beside_it(self):
        import numpy as np
        lab = np.zeros((50, 200), int)
        yy, xx = np.mgrid[0:9, 0:9]
        lab[10:19, 100:109][(np.hypot(yy - 4, xx - 4) >= 2.0) & (np.hypot(yy - 4, xx - 4) <= 4.3)] = 7
        res = {"main": [{"xh": 17, "xs": [[104, 150], [40, 99]], "raised": [[(100, 10, 109, 19, 40, 7)]]}]}
        self.assertEqual(furniture.note_marks(res, lab), [["°", 100, 10, 109, 19]])
        self.assertEqual(res["main"][0]["xs"], [[110, 150], [40, 99]])
        self.assertNotIn("raised", res["main"][0])

    def test_a_heading_that_reads_unlike_any_expected_is_left_out(self):
        comps = [self.blob(1000 - 60 * i, 1040 - 60 * i, label=i + 1) for i in range(8)]
        choices = furniture.expected("ברכות", [(4, "תפלת השחר")], 27, "a")
        self.assertEqual(furniture.find_heading(comps, 190, 14, choices, lambda blobs: "שלום", "a"), [])


try:
    from daflayout.match import big_words
except ImportError:  # numpy or rapidfuzz isn't installed
    big_words = None


@unittest.skipIf(big_words is None, "needs numpy and rapidfuzz")
def letters_at(start, widths, top=100, xh=14, inside=1):
    """Blobs (x0, x1, height, top) of letters printed right to left from start; returns them and
    where the next letter would go."""
    blobs, x = [], start
    for w in widths:
        blobs.append((x - w, x, xh, top))
        x -= w + inside
    return blobs, x + inside


class ShortForms(unittest.TestCase):
    def test_an_abbreviation_is_set_as_printed(self):
        # printed: בר פפא הקב"ה; the library: בר פפא הקדוש ברוך הוא
        blobs, boxes = printed([[10, 10], [10, 10, 10], [10, 10, 10, 4, 10]])
        read = [("בר", *boxes[0]), ("פפא", *boxes[1]), ('הקב"ה', *boxes[2])]
        places, short = word_places(blobs, ["בר", "פפא", "הקדוש", "ברוך", "הוא"], 14, read)
        self.assertEqual(short, [[2, 3, "הקב״ה"]])
        self.assertEqual(places[2][1], boxes[2][1])  # the words still share the printed word's place

    def test_letters_from_inside_a_word(self):
        # ואב"א for "ואיבעית אימא": ו-א-ב of the first word (its י left out), א of the second
        self.assertTrue(abbreviates("ואבא", ["ואיבעית", "אימא"]))
        blobs, boxes = printed([[10, 10, 10, 4, 10], [10, 10]])
        read = [('ואב"א', *boxes[0]), ("רב", *boxes[1])]
        _, short = word_places(blobs, ["ואיבעית", "אימא", "רב"], 14, read)
        self.assertEqual(short, [[0, 2, "ואב״א"]])

    def test_a_short_form_run_together_with_a_whole_word(self):
        # printed: ת"ר מפני, a narrow space apart; Tesseract read them as one word, ת'ר*מפני. That is
        # not one short form of the three words, but a short form and a whole word.
        self.assertTrue(abbreviates("תרמפני", ["תנו", "רבנן", "מפני"]))
        self.assertFalse(abbreviates("תרמפני", ["תנו", "רבנן", "מפני"], whole=False))
        blobs, boxes = printed([[10, 4, 10], [10, 10, 10, 5]], space=4)
        places, short = word_places(blobs, ["תנו", "רבנן", "מפני"], 14, [("ת'ר*מפני", boxes[1][0], boxes[0][1])])
        self.assertEqual(short, [[0, 2, "ת״ר"]])
        self.assertEqual(places[2], boxes[1])
        self.assertEqual([places[1][0], places[0][1]], boxes[0])  # the short form shares its printed place

    def test_a_word_cut_short_with_its_mark(self):
        # אמר ר' יוחנן: the ׳ is a small mark hanging from the top of the letters
        a, x = letters_at(1000, [10, 10, 10])
        r, x = letters_at(x - 10, [10])
        geresh = [(x - 5, x - 2, 5, 99)]
        y, _ = letters_at(x - 12, [10, 5, 10, 10, 5])
        blobs = a + r + geresh + y
        read = [("אמר", 968, 1000), ("ר'", x - 5, r[0][1]), ("יוחנן", y[-1][0], y[0][1])]
        places, short = word_places(blobs, ["אמר", "רבי", "יוחנן"], 14, read)
        self.assertEqual(short, [[1, 1, "ר׳"]])
        self.assertEqual(places[1], [x - 5, r[0][1]])

    def test_a_last_letter_read_as_a_mark_is_not_cut_short(self):
        # the print has לדבר in full; Tesseract read its ר as ׳
        a, x = letters_at(1000, [10, 10, 10])
        b, x = letters_at(x - 10, [10, 10, 10, 10])
        c, _ = letters_at(x - 10, [10, 10])
        read = [("זכר", 968, 1000), ("לדב׳", b[-1][0], b[0][1]), ("אכל", c[-1][0], c[0][1])]
        _, short = word_places(a + b + c, ["זכר", "לדבר", "אכל"], 14, read)
        self.assertEqual(short, [])

    def test_a_word_the_library_already_sets_short_is_left_as_it_is(self):
        blobs, boxes = printed([[10, 4, 10], [10, 10]])
        read = [('ק"ש', *boxes[0]), ("רב", *boxes[1])]
        _, short = word_places(blobs, ['ק"ש', "רב"], 14, read)
        self.assertEqual(short, [])


class BigWords(unittest.TestCase):
    def test_a_word_printed_large_is_found(self):
        ink = [(200, 220, 30, 100), (180, 198, 31, 99), (150, 165, 14, 104), (130, 146, 15, 104)]
        self.assertEqual(big_words(ink, [[180, 220], [130, 165]], 15), {0: (99, 129)})

    def test_a_lamed_alone_does_not_make_a_word_large(self):
        ink = [(200, 214, 26, 92), (186, 199, 15, 103)]  # על: the lamed reaches above the line
        self.assertEqual(big_words(ink, [[186, 214]], 15), {})


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

    def test_short_forms_are_kept(self):
        main = line([["Berakhot 2a:1", 0, 3]], xs=[[90, 100], [60, 80], [0, 50]])
        main["short"] = [[1, 2, "ב״ג"]]
        results = [page("Berakhot 2a", main=[main], rashi=[line([["Rashi on Berakhot 2a:1:1", 0, 2]])])]
        rec = reconcile("Berakhot", results, self.text, {})[0]
        self.assertEqual(rec["lines"]["main"], [[0, 0, 100, 10, 8, [0, 0, 3], [90, 100, 60, 80, 0, 50], [], [[1, 2, "ב״ג"]]]])

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
