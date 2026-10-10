"""Tests for written permissions (canon/permissions.yaml) in the validator and the build plan."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import library_plan as P  # noqa: E402
import validate as V  # noqa: E402


class FromSiteTest(unittest.TestCase):
    SITES = ["toratemetfreeware.com", "ateret4u.com"]

    def test_the_holders_own_site_and_its_subdomains(self):
        self.assertTrue(P.from_site("http://www.toratemetfreeware.com/online/f_01644.html", self.SITES))
        self.assertTrue(P.from_site("http://toratemetfreeware.com/index.html?downloads", self.SITES))
        self.assertTrue(P.from_site("http://www.ateret4u.com/online/f_01605.html", self.SITES))

    def test_any_other_site_is_not_covered(self):
        self.assertFalse(P.from_site("https://he.wikisource.org/wiki/x", self.SITES))
        self.assertFalse(P.from_site("https://commons.wikimedia.org/x", self.SITES))
        # A look-alike address is not the holder's site.
        self.assertFalse(P.from_site("https://www.nottoratemetfreeware.com/x", self.SITES))
        self.assertFalse(P.from_site("https://toratemetfreeware.com.example.org/x", self.SITES))
        self.assertFalse(P.from_site(None, self.SITES))
        self.assertFalse(P.from_site("", self.SITES))


class PermissionsFileTest(unittest.TestCase):
    def test_the_file_is_valid(self):
        before = len(V.errors)
        permissions = V.load_permissions()
        self.assertEqual(V.errors[before:], [])
        self.assertIn("torat-emet", permissions)

    def test_private_only_permissions_are_found_on_an_edition(self):
        for pid in ("torat-emet", "aish", "chabad-org"):
            self.assertIs(V.load_permissions()[pid]["public"], False)
        edition = {"sefaria_versions": [
            {"version": "a", "license": "Public Domain"},
            {"version": "b", "license": "Permission", "permission": "torat-emet"},
        ]}
        self.assertEqual(V.private_permissions(edition), ["torat-emet"])
        self.assertEqual(V.private_permissions({"sefaria_versions": [{"version": "a", "license": "CC0"}]}), [])

    def test_a_version_needs_a_known_permission_to_rest_on_one(self):
        self.assertTrue(V.version_usable({"version": "x", "license": "Permission", "permission": "torat-emet"}))
        self.assertFalse(V.version_usable({"version": "x", "license": "Permission", "permission": "nobody"}))
        self.assertFalse(V.version_usable({"version": "x", "license": "Permission"}))
        self.assertFalse(V.version_usable({"version": "x", "license": "unknown"}))
        self.assertTrue(V.version_usable({"version": "x", "license": "CC-BY-SA"}))


if __name__ == "__main__":
    unittest.main()
