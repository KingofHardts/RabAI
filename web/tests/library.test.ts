import { test } from "node:test";
import assert from "node:assert/strict";
import { commentariesOn, getPassage, getSection, listSections, loadLibrary, search, stripNiqqud } from "../lib/library/index";
import { DEV_PASSAGES, DEV_WORKS } from "../lib/library/dev-library";

const lib = loadLibrary("development");

test("every passage belongs to a known work and has unique ref", () => {
  const works = new Set(DEV_WORKS.map((w) => w.id));
  const refs = new Set<string>();
  for (const p of DEV_PASSAGES) {
    assert.ok(works.has(p.work), `${p.ref} has unknown work ${p.work}`);
    assert.ok(!refs.has(p.ref), `duplicate ref ${p.ref}`);
    refs.add(p.ref);
    assert.ok(p.he.trim() && p.en.trim(), `${p.ref} needs Hebrew and English`);
    if (p.on) assert.ok(getPassage(lib, p.on), `${p.ref} comments on missing ${p.on}`);
  }
});

test("every development work is labeled as development, never approved", () => {
  for (const w of DEV_WORKS) {
    assert.equal(w.library, "development");
    assert.equal(w.translation.status, "development");
  }
});

test("approved mode is empty until the board approves editions", () => {
  const approved = loadLibrary("approved");
  assert.equal(approved.passages.length, 0);
  assert.deepEqual(search(approved, "Rashi on Bereishit 1:1"), []);
});

test("lookups are case- and niqqud-insensitive", () => {
  assert.equal(getPassage(lib, "bereishit 1:1")?.ref, "Bereishit 1:1");
  assert.equal(stripNiqqud("בְּרֵאשִׁית"), "בראשית");
});

test("a section gathers its lines with their commentaries", () => {
  const s = getSection(lib, "Rashi on Bereishit 1:1");
  assert.ok(s);
  assert.equal(s.section, "Bereishit 1");
  assert.equal(s.lines[0].passage.ref, "Bereishit 1:1");
  assert.deepEqual(
    s.lines[0].commentaries.map((c) => c.ref),
    ["Rashi on Bereishit 1:1", "Ramban on Bereishit 1:1"],
  );
  assert.equal(commentariesOn(lib, "Bereishit 1:2").length, 0);
});

test("listSections covers every base section once", () => {
  const sections = listSections(lib);
  const names = sections.map((s) => s.section);
  assert.equal(new Set(names).size, names.length);
  const b = sections.find((s) => s.section === "Bereishit 1");
  assert.equal(b?.firstRef, "Bereishit 1:1");
  assert.equal(b?.commentaryCount, 2);
});

test("search finds Rashi's question about why the Torah begins with Creation", () => {
  const refs = search(lib, "Why does the Torah begin with Creation and not with the first mitzvah?").map((p) => p.ref);
  assert.ok(refs.includes("Rashi on Bereishit 1:1"), refs.join(", "));
  assert.ok(refs.includes("Bereishit 1:1"), "the commentary comes with its line");
});

test("search finds the Chanukah sugya", () => {
  const refs = search(lib, "Why do we add a Chanukah light each night?").map((p) => p.ref);
  assert.ok(refs.includes("Shabbat 21b:2"), refs.join(", "));
});

test("an explicit reference wins, including English book names", () => {
  assert.equal(search(lib, "What does Genesis 1:3 mean?")[0]?.ref, "Bereishit 1:3");
  assert.equal(search(lib, "Explain Shabbos 31a:1")[0]?.ref, "Shabbat 31a:1");
});

test("the focused line, its commentaries and neighbors come first", () => {
  const refs = search(lib, "explain", { focusRef: "Bereishit 1:1" }).map((p) => p.ref);
  assert.equal(refs[0], "Bereishit 1:1");
  assert.ok(refs.includes("Rashi on Bereishit 1:1"));
  assert.ok(refs.includes("Bereishit 1:2"));
});

test("search respects the limit and returns nothing for unrelated words", () => {
  assert.ok(search(lib, "chanukah shabbat hillel shammai light", { limit: 3 }).length <= 3);
  assert.deepEqual(search(lib, "zzqx vvlorp"), []);
});
