import { test } from "node:test";
import assert from "node:assert/strict";
import { compareLines, mergeOrders } from "../lib/library/merge-order";

test("a section in only one edition keeps its place in that edition's order", () => {
  const hebrew = ["Weekdays", "Shabbat", "Festivals", "Torah Readings"];
  const english = ["Preface", "Foreword", "Weekdays", "Shabbat", "Festivals", "Yom Yerushalayim", "Torah Readings", "Gates to Prayer"];
  assert.deepEqual(mergeOrders([hebrew, english]), english);
  assert.deepEqual(mergeOrders([english, hebrew]), english);
});

test("items from the shorter order go right after what they follow", () => {
  assert.deepEqual(mergeOrders([["a", "b", "c", "d"], ["x", "a", "y", "z", "c"]]), ["x", "a", "b", "y", "z", "c", "d"]);
  assert.deepEqual(mergeOrders([]), []);
  assert.deepEqual(mergeOrders([["a"], []]), ["a"]);
});

test("lines in a section go by their numbers", () => {
  const s = "Koren, The Amida";
  const lines = [`${s} 2`, `${s} 10`, `${s} 1`, `${s} 9`];
  assert.deepEqual(lines.sort((a, b) => compareLines(a, b, s) ?? 0), [`${s} 1`, `${s} 2`, `${s} 9`, `${s} 10`]);
  assert.ok((compareLines("Berakhot 2a:3", "Berakhot 2a:12", "Berakhot 2a") ?? 0) < 0);
  assert.equal(compareLines("A 1", "B 2", "A"), null);
});
