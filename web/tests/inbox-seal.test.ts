import { test } from "node:test";
import assert from "node:assert/strict";
import { makeInboxKeys, seal, unseal } from "../lib/library/inbox-seal";

/* The translation inbox: only the holder of the private key can open a sealed file. */

test("a sealed file opens with the inbox's private key and gives back what was sealed", () => {
  const keys = makeInboxKeys();
  const value = { v: 1, items: [{ translation: { ref: "Rashi on Berakhot 2a:1:1", general: "From when [may one] read" }, check: "abc" }] };
  const text = seal(keys.publicKey, value);
  assert.ok(!text.includes("Rashi"), "the sealed file shows nothing of what is inside");
  assert.deepEqual(unseal(keys.privateKey, text), value);
});

test("another key, or a changed file, cannot open it", () => {
  const keys = makeInboxKeys();
  const other = makeInboxKeys();
  const text = seal(keys.publicKey, { hello: "world" });
  assert.throws(() => unseal(other.privateKey, text));
  const file = JSON.parse(text);
  const data = Buffer.from(file.data, "base64");
  data[0] ^= 1;
  assert.throws(() => unseal(keys.privateKey, JSON.stringify({ ...file, data: data.toString("base64") })));
});
