import { test } from "node:test";
import assert from "node:assert/strict";
import { LibraryMemory, withMemory } from "../lib/library/memory";

test("a read is remembered as an exact copy, and a caller's change never reaches the next answer", async () => {
  let reads = 0;
  const store = {
    async exact(refs: string[]) {
      reads++;
      return refs.map((ref) => ({ ref, he: "בראשית", en: "In the beginning" }));
    },
    async toTranslate() {
      reads++;
      return [{ ref: "x" }];
    },
  };
  const mem = new LibraryMemory();
  const s = withMemory(store, mem);
  const a = await s.exact(["Genesis 1:1"]);
  a[0].en = "changed by a caller";
  const b = await s.exact(["Genesis 1:1"]);
  assert.equal(reads, 1, "read once");
  assert.equal(b[0].en, "In the beginning", "the kept copy is the library's");
  await s.toTranslate();
  await s.toTranslate();
  assert.equal(reads, 3, "the translation job's reads are never remembered");
  assert.deepEqual(mem.stats().hits, 1);
});

test("nothing empty is kept, two reads at once read the library once, and a copy expires", async () => {
  let t = 0;
  let reads = 0;
  const mem = new LibraryMemory(1000, 1_000_000, () => t);
  const read = async () => {
    reads++;
    return reads === 1 ? [] : [{ ref: "a" }];
  };
  await mem.remember("k", read);
  await mem.remember("k", read);
  assert.equal(reads, 2, "an empty result is read again");
  const slow = () => new Promise<Array<{ ref: string }>>((r) => setTimeout(() => (reads++, r([{ ref: "b" }])), 5));
  await Promise.all([mem.remember("j", slow), mem.remember("j", slow)]);
  assert.equal(reads, 3, "asked twice at once, read once");
  t = 2000;
  await mem.remember("j", slow);
  assert.equal(reads, 4, "after it expires it is read again");
});

test("a section's commentaries (a Map) survive the copy", async () => {
  const mem = new LibraryMemory();
  const v = await mem.remember("s", async () => ({ lines: [{ ref: "a" }], commentaries: new Map([["a", [{ ref: "Rashi a" }]]]) }));
  const w = await mem.remember("s", async () => ({ lines: [], commentaries: new Map() }));
  assert.equal(w.commentaries.get("a")?.[0].ref, "Rashi a");
  assert.notEqual(v, w);
});
