import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import vercel_cleanup as V  # noqa: E402


class PlanTest(unittest.TestCase):
    def test_keeps_newest_built_production_and_previews(self):
        ds = [{"uid": f"p{i}", "created": 100 - i, "state": "READY", "target": "production"} for i in range(8)]
        ds += [{"uid": f"v{i}", "created": 50 - i, "state": "READY", "target": None} for i in range(5)]
        ds += [{"uid": "c", "created": 99, "state": "CANCELED", "target": "production"},
               {"uid": "e", "created": 98, "state": "ERROR", "target": "production"},
               {"uid": "b", "created": 1, "state": "BUILDING", "target": "production"}]
        kept, gone = V.plan(ds, keep=5, keep_preview=2)
        ids = {d["uid"] for d in kept}
        self.assertEqual(ids, {"p0", "p1", "p2", "p3", "p4", "v0", "v1", "b"})
        self.assertIn("c", {d["uid"] for d in gone})
        self.assertIn("e", {d["uid"] for d in gone})
        self.assertNotIn("p0", {d["uid"] for d in gone})


if __name__ == "__main__":
    unittest.main()
