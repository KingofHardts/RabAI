import assert from "node:assert/strict";
import { test } from "node:test";
import { accessToken, codeMatches, gate, safeNext, tokenValid } from "../lib/access";

test("on a computer with no settings, the app is open", () => {
  assert.deepEqual(gate({}), { kind: "open" });
});

test("online with no access code, the app stays closed", () => {
  assert.deepEqual(gate({ VERCEL: "1" }), { kind: "closed" });
  assert.deepEqual(gate({ VERCEL: "1", RABAI_ACCESS_CODE: "   " }), { kind: "closed" });
});

test("an access code locks the app, online or not", () => {
  assert.deepEqual(gate({ VERCEL: "1", RABAI_ACCESS_CODE: " olive branch " }), { kind: "code", code: "olive branch" });
  assert.deepEqual(gate({ RABAI_ACCESS_CODE: "olive branch" }), { kind: "code", code: "olive branch" });
});

test("only RABAI_PUBLIC=true opens it to everyone", () => {
  assert.deepEqual(gate({ VERCEL: "1", RABAI_PUBLIC: "true", RABAI_ACCESS_CODE: "x" }), { kind: "open" });
  assert.deepEqual(gate({ VERCEL: "1", RABAI_PUBLIC: "yes" }), { kind: "closed" });
});

test("codes match ignoring case and outside spaces, and nothing else", async () => {
  assert.equal(await codeMatches("  Olive Branch ", "olive branch"), true);
  assert.equal(await codeMatches("olive  branch", "olive branch"), false);
  assert.equal(await codeMatches("", "olive branch"), false);
});

test("the stored token is a hash, not the code, and follows the code", async () => {
  const token = await accessToken("olive branch");
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.ok(!token.includes("olive"));
  assert.equal(await tokenValid(token, "Olive Branch"), true);
  assert.equal(await tokenValid(token, "new code"), false);
  assert.equal(await tokenValid(undefined, "olive branch"), false);
  assert.equal(await tokenValid("olive branch", "olive branch"), false);
});

test("after unlocking, people are only sent to pages on this site", () => {
  assert.equal(safeNext("/?q=1"), "/?q=1");
  assert.equal(safeNext(undefined), "/");
  assert.equal(safeNext("https://evil.example"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext("/\\evil.example"), "/");
});
