"""Tests for the library build's text cleaning and work rows (tools/library_build.py)."""

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import library_build as B  # noqa: E402


class StripAngleTest(unittest.TestCase):
    def test_removes_the_editors_additions(self):
        text = "אמר רבי חייא דא צדיקא. <תרגום - זה הצדיק>. ובספר הזוהר <עוד תרגום>. וזהו סוד"
        self.assertEqual(B.strip_angle(text), "אמר רבי חייא דא צדיקא. ובספר הזוהר. וזהו סוד")

    def test_keeps_the_authors_own_words(self):
        text = "ותרגום אונקלוס גבורת ידא תקיפא"
        self.assertEqual(B.strip_angle(text), text)

    def test_leaves_out_what_cannot_be_separated(self):
        self.assertIsNone(B.strip_angle("א <ב <ג> ד> ה"))  # nested
        self.assertIsNone(B.strip_angle("א ב> ג"))  # closes without opening
        self.assertIsNone(B.strip_angle("א <ב ג"))  # never closes
        self.assertIsNone(B.strip_angle("<הכל>"))  # nothing of the author's left


class WorkRowTest(unittest.TestCase):
    def test_established_by_default(self):
        row = B.work_row({"work": "w", "work_title": "W", "category": "halacha", "streams": ["shared"]})
        self.assertEqual(row[4:], ("established", None, None))

    def test_debated_carries_its_caution(self):
        row = B.work_row({
            "work": "w", "work_title": "W", "category": "kabbalah", "streams": ["shared"],
            "standing": "debated", "caution": "Attributed.", "caution_kinds": ["uncertain_author"],
        })
        self.assertEqual(row[4], "debated")
        self.assertEqual(row[5], "Attributed.")
        self.assertEqual(json.loads(row[6]), ["uncertain_author"])


if __name__ == "__main__":
    unittest.main()
