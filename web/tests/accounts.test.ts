import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { accountSettings } from "../lib/account/config";
import { accountTag, emailCheck, ipCheck, newToken, normalizeEmail, sameCheck, tokenCheck, tokenShape, validEmail } from "../lib/account/crypto";
import { FEEDBACK_REASONS, parseFeedback } from "../lib/account/feedback";
import { chatStamp, fitChat, mergeChatLists, mergeProfiles, profileToSend, profileToStore, reconcileChats } from "../lib/account/merge";
import { createPeopleStore, execFrom, LINK_LIFETIME_MS, SESSION_LIFETIME_MS, type PeopleStore } from "../lib/account/people";
import { profileForAsk } from "../lib/account/ask-profile";
import { readCookie, sameOrigin, SESSION_COOKIE } from "../lib/account/session";
import { emptyProfile, forgetAll, forgetNoticed, noticed, parseProfile, profileSummary, withRemember, withStated, type LearnerProfile } from "../lib/learner-profile";
import type { SavedChat } from "../lib/saved-chats";
import { planRequest } from "../lib/engine/answer";
import { loadLibrary } from "../lib/library/index";

/* Accounts (docs/learner-profiles.md, phase 2) and "Was this helpful?" (phase 3). */

const SECRET = "a-test-secret-that-is-long-enough-1234567890";
const ENV = { PEOPLE_DATABASE_URL: "file::memory:", RABAI_AUTH_SECRET: SECRET };

function memoryStore(): PeopleStore {
  return createPeopleStore(execFrom(createClient({ url: ":memory:" })));
}

function chat(id: string, updatedAt: number, question = "Why do we light candles?", extra: Partial<SavedChat> = {}): SavedChat {
  return {
    id,
    title: question,
    category: "",
    createdAt: updatedAt,
    updatedAt,
    messages: [
      { role: "user", text: question },
      {
        role: "ai",
        result: { status: "answered", blocks: [{ text: "Because…", citations: [] }], sources: [], retrieved: [], safety: null, libraryMode: "development", droppedCitations: 0 },
      },
    ],
    ...extra,
  };
}

const request = (headers: Record<string, string> = {}, url = "https://rabai.example/api/ask") => new Request(url, { method: "POST", headers });

// ---------------------------------------------------------------------------
// The email address and tokens

test("the email address is never stored: only a keyed check of it, the same for the same address", () => {
  const a = emailCheck("  Moshe@Example.com ", SECRET);
  assert.equal(a, emailCheck("moshe@example.com", SECRET), "case and spaces don't matter");
  assert.notEqual(a, emailCheck("moshe@example.org", SECRET));
  assert.notEqual(a, emailCheck("moshe@example.com", `${SECRET}-other`), "another secret, another check");
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes("moshe") && !a.includes("example"));
  assert.equal(normalizeEmail(" A@B.CO "), "a@b.co");
});

test("addresses are checked before anything is sent", () => {
  for (const ok of ["a@b.co", "rivka.levi@mail.example.org", "x+torah@example.com"]) assert.ok(validEmail(ok), ok);
  for (const bad of ["", "no-at-sign", "@example.com", "a@", "a@b", "a@@b.co", "a b@c.co", "a@b.co\nBcc: x@y.co", "<a@b.co>", 42, null, `${"a".repeat(250)}@b.co`]) {
    assert.ok(!validEmail(bad), String(bad));
  }
});

test("tokens are long and random, and only their hash is kept", () => {
  const t = newToken();
  assert.ok(tokenShape(t));
  assert.notEqual(t, newToken());
  assert.equal(tokenCheck(t), tokenCheck(t));
  assert.notEqual(tokenCheck(t), t);
  assert.match(tokenCheck(t), /^[0-9a-f]{64}$/);
  assert.ok(!tokenShape("short"));
  assert.ok(!tokenShape(`${t}/`));
  assert.ok(sameCheck(tokenCheck(t), tokenCheck(t)));
  assert.ok(!sameCheck(tokenCheck(t), tokenCheck(newToken())));
  assert.ok(!sameCheck("abc", "abcd"));
  assert.equal(ipCheck("1.2.3.4", SECRET).length, 32);
  assert.notEqual(accountTag("p1", SECRET), accountTag("p2", SECRET));
});

test("accounts are on only with the database, a long secret, and a way to send the link", () => {
  assert.equal(accountSettings({}).enabled, false);
  assert.equal(accountSettings({}).feedback, false);
  assert.equal(accountSettings({ PEOPLE_DATABASE_URL: "file:x.db" }).feedback, true, "feedback needs only the database");
  assert.equal(accountSettings({ PEOPLE_DATABASE_URL: "file:x.db" }).enabled, false, "no secret");
  assert.equal(accountSettings({ PEOPLE_DATABASE_URL: "file:x.db", RABAI_AUTH_SECRET: "short" }).enabled, false, "secret too short");
  const dev = accountSettings(ENV);
  assert.equal(dev.enabled, true);
  assert.equal(dev.devLinks, true, "on a developer's computer the link goes to the log");
  const online = accountSettings({ ...ENV, VERCEL: "1" });
  assert.equal(online.enabled, false, "online, there is no log to read: mail is needed");
  assert.equal(online.devLinks, false);
  assert.equal(accountSettings({ ...ENV, VERCEL: "1", RESEND_API_KEY: "re_x", RABAI_MAIL_FROM: "RabAI <signin@example.org>" }).enabled, true);
});

test("emailed links point at the app's own address, never at one a request claims", () => {
  assert.equal(accountSettings(ENV).appUrl, null, "on a developer's computer: the page's own address");
  const live = { ...ENV, VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "rab-ai-ecru.vercel.app" };
  assert.equal(accountSettings(live).appUrl, "https://rab-ai-ecru.vercel.app");
  assert.equal(accountSettings({ ...live, RABAI_APP_URL: "https://rabai.example.org/" }).appUrl, "https://rabai.example.org");
  assert.equal(accountSettings({ ...ENV, RABAI_APP_URL: "javascript:alert(1)" }).appUrl, null, "only a plain web address");
});

// ---------------------------------------------------------------------------
// Sign-in links and sessions

test("a sign-in link works once, for 15 minutes", async () => {
  const store = memoryStore();
  const check = emailCheck("leah@example.com", SECRET);
  const t0 = 1_700_000_000_000;

  const first = newToken();
  await store.createLoginLink(check, tokenCheck(first), t0);
  assert.deepEqual(await store.useLoginLink(tokenCheck(first), t0 + LINK_LIFETIME_MS + 1), { ok: false, reason: "expired" });

  const second = newToken();
  await store.createLoginLink(check, tokenCheck(second), t0);
  assert.deepEqual(await store.useLoginLink(tokenCheck(second), t0 + 60_000), { ok: true, emailCheck: check });
  assert.deepEqual(await store.useLoginLink(tokenCheck(second), t0 + 61_000), { ok: false, reason: "used" }, "never twice");
  assert.deepEqual(await store.useLoginLink(tokenCheck(newToken()), t0), { ok: false, reason: "unknown" });
});

test("the first sign-in makes the account, later ones find it; sessions expire unless used", async () => {
  const store = memoryStore();
  const check = emailCheck("dovid@example.com", SECRET);
  const a = await store.findOrCreatePerson(check, 1000);
  const b = await store.findOrCreatePerson(check, 2000);
  assert.equal(a.created, true);
  assert.equal(b.created, false);
  assert.equal(a.personId, b.personId);

  const t0 = 1_700_000_000_000;
  const token = newToken();
  await store.createSession(a.personId, tokenCheck(token), t0);
  assert.deepEqual(await store.sessionPerson(tokenCheck(token), t0 + 1000), { personId: a.personId, refreshed: false });
  assert.equal(await store.sessionPerson(tokenCheck(newToken()), t0), null, "an unknown token is no one");
  // Used after a day: its 60 days start again.
  const later = t0 + 2 * 86_400_000;
  assert.deepEqual(await store.sessionPerson(tokenCheck(token), later), { personId: a.personId, refreshed: true });
  assert.equal(await store.sessionPerson(tokenCheck(token), later + SESSION_LIFETIME_MS + 1), null, "unused for 60 days: ended");
  assert.equal(await store.sessionPerson(tokenCheck(token), later + 1000), null, "and gone");
});

test("rate limits count per window", async () => {
  const store = memoryStore();
  const hour = 3_600_000;
  const t0 = 1_700_000_000_000;
  for (let i = 0; i < 5; i++) assert.equal(await store.hit("link-email:x", 5, hour, t0 + i), true);
  assert.equal(await store.hit("link-email:x", 5, hour, t0 + 10), false, "the sixth in an hour is refused");
  assert.equal(await store.hit("link-email:y", 5, hour, t0 + 10), true, "another key has its own count");
  assert.equal(await store.hit("link-email:x", 5, hour, t0 + hour + 1), true, "a new hour starts again");
});

test("the session cookie is read from the request, and requests from other sites are refused", () => {
  const token = newToken();
  assert.equal(readCookie(request({ cookie: `rabai_access=abc; ${SESSION_COOKIE}=${token}` }), SESSION_COOKIE), token);
  assert.equal(readCookie(request({ cookie: "rabai_access=abc" }), SESSION_COOKIE), undefined);
  assert.ok(sameOrigin(request({ origin: "https://rabai.example" })));
  assert.ok(sameOrigin(request()), "no Origin: not a browser form or fetch from another site");
  assert.ok(!sameOrigin(request({ origin: "https://evil.example" })));
  assert.ok(!sameOrigin(request({ origin: "null" })));
  assert.ok(!sameOrigin(request({ "sec-fetch-site": "cross-site" })));
});

// ---------------------------------------------------------------------------
// Merging a device's copy and the account's

const T = (n: number) => 1_700_000_000_000 + n * 1000;

function learned(base: LearnerProfile, start: number, books: string[], words: string[], questions: number): LearnerProfile {
  let p = base;
  let t = start;
  for (const b of books) p = noticed(p, { kind: "book", title: b }, T(t++));
  for (const w of words) p = noticed(p, { kind: "word", word: w }, T(t++));
  for (let i = 0; i < questions; i++) p = noticed(p, { kind: "question" }, T(t++));
  return p;
}

test("keeping a device in step never counts anything twice", () => {
  const account = learned(emptyProfile(), 0, ["Berakhot"], ["קורין"], 3);
  // The device started from the account's copy and learned more.
  const device = learned(account, 10, ["Berakhot", "Genesis"], ["קורין"], 2);
  const merged = mergeProfiles(account, device, "sync");
  assert.equal(merged.observed.questions, 5, "3 in the account, 2 more here: 5, not 8");
  assert.equal(merged.observed.books.find((b) => b.title === "Berakhot")?.count, 2);
  assert.equal(merged.observed.words.find((w) => w.word === "קורין")?.count, 2);
  assert.deepEqual(mergeProfiles(merged, merged, "sync").observed, merged.observed, "merging again changes nothing");
  assert.deepEqual(mergeProfiles(device, merged, "sync").observed, merged.observed, "the device adopting the answer settles on the same");
});

test("a device's first sign-in adds what it learned before, once", async () => {
  const phone = learned(emptyProfile(), 0, ["Berakhot"], ["קורין"], 4);
  const computer = learned(emptyProfile(), 50, ["Berakhot", "Shabbat"], ["קורין"], 6);
  const joined = mergeProfiles(computer, phone, "join");
  assert.equal(joined.observed.questions, 10);
  assert.equal(joined.observed.words.find((w) => w.word === "קורין")?.count, 2, "looked up once on each: a word to practice");

  const store = memoryStore();
  const { personId } = await store.findOrCreatePerson(emailCheck("sara@example.com", SECRET));
  await store.saveProfile(personId, computer, { join: true, joinId: "computer-join-1" });
  const once = await store.saveProfile(personId, phone, { join: true, joinId: "phone-join-1" });
  assert.equal(once.observed.questions, 10);
  const again = await store.saveProfile(personId, phone, { join: true, joinId: "phone-join-1" });
  assert.equal(again.observed.questions, 10, "the same join sent twice is added once");
});

test("what they told RabAI comes from the copy where it changed last", () => {
  const older = withStated(emptyProfile(), { level: "new", name: "Avi" }, T(1));
  const newer = withStated(emptyProfile(), { level: "advanced" }, T(2));
  assert.equal(mergeProfiles(older, newer).stated.level, "advanced");
  assert.equal(mergeProfiles(newer, older).stated.level, "advanced");
  assert.equal(mergeProfiles(newer, older).stated.name, undefined, "the newer copy as a whole, not a mix");
  // Noticing something later doesn't make an older "About you" win.
  const busy = learned(older, 100, ["Genesis"], [], 1);
  assert.equal(mergeProfiles(newer, busy).stated.level, "advanced");
  // A profile kept before these times existed counts its last change as when it was told.
  const legacy = parseProfile({ stated: { level: "some" }, observed: {}, updatedAt: T(5) });
  assert.equal(legacy.statedAt, T(5));
});

test("remembering: the latest switch wins, and a tie keeps it off", () => {
  const on = withRemember(emptyProfile(), true, T(1));
  const off = withRemember(emptyProfile(), false, T(2));
  assert.equal(mergeProfiles(on, off).remember, false);
  assert.equal(mergeProfiles(withRemember(emptyProfile(), true, T(3)), off).remember, true);
  const tieOff = { ...emptyProfile(), remember: false, rememberAt: T(4) };
  const tieOn = { ...emptyProfile(), remember: true, rememberAt: T(4) };
  assert.equal(mergeProfiles(tieOn, tieOff).remember, false);
});

test("forgetting wins over an older copy, everywhere", () => {
  const before = learned(emptyProfile(), 0, ["Berakhot", "Genesis"], ["קורין", "קורין"], 5);
  // On the computer: forget what RabAI noticed, then learn one more thing.
  const computer = learned(forgetNoticed(before, T(100)), 110, ["Shabbat"], [], 1);
  // The phone still has the old copy, and opened Berakhot again after the forget.
  const phone = learned(before, 120, ["Berakhot"], [], 3);
  const merged = mergeProfiles(computer, phone, "sync");
  assert.deepEqual(merged.observed.books.map((b) => [b.title, b.count]).sort(), [["Berakhot", 1], ["Shabbat", 1]], "Genesis is forgotten; Berakhot again, counted once");
  assert.deepEqual(merged.observed.words, [], "the words looked up before the forget are gone");
  assert.equal(merged.observed.questions, 1, "counts from the copy that didn't forget are left out");
  assert.equal(merged.observedSince, T(100));

  const all = forgetAll(withStated(before, { level: "new" }, T(1)), T(200));
  const back = mergeProfiles(withStated(before, { level: "new" }, T(1)), all);
  assert.deepEqual(back.stated, {}, "forgetting everything clears what they told RabAI too");
  assert.equal(back.observed.books.length, 0);
});

test("with remembering off, a device sends only the switch and forgetting, and the account keeps nothing new", () => {
  const known = withStated(learned(emptyProfile(), 0, ["Berakhot"], ["קורין"], 3), { level: "some" }, T(10));
  const offHere = withRemember(withStated(learned(known, 20, ["Genesis"], ["תרומה"], 2), { level: "advanced", name: "Yael" }, T(30)), false, T(40));

  const sent = profileToSend(offHere);
  assert.equal(sent.remember, false);
  assert.deepEqual(sent.stated, {}, "nothing they told RabAI leaves the device");
  assert.deepEqual(sent.observed.books, []);
  assert.deepEqual(sent.observed.words, []);
  assert.equal(sent.observed.questions, 0);
  assert.ok(!JSON.stringify(sent).includes("Yael") && !JSON.stringify(sent).includes("Genesis"));

  const stored = profileToStore(known, offHere, "sync");
  assert.equal(stored.remember, false);
  assert.equal(stored.stated.level, "some", "the account keeps what it had");
  assert.equal(stored.stated.name, undefined);
  assert.deepEqual(stored.observed.books.map((b) => b.title), ["Berakhot"], "nothing new noticed is kept");
  assert.equal(profileSummary(stored), "", "and nothing about them goes with questions");

  // Forgetting still reaches the account, even with remembering off.
  const forgot = profileToStore(known, profileToSend(forgetAll(offHere, T(50))), "sync");
  assert.deepEqual(forgot.stated, {});
  assert.deepEqual(forgot.observed.books, []);
  assert.equal(forgot.remember, false);
});

// ---------------------------------------------------------------------------
// Chats

test("chats: by id, the copy changed last wins, and deletions reach every device", () => {
  const local = [chat("a", T(5)), chat("b", T(1)), chat("c", T(9))];
  const index = [
    { id: "a", stamp: T(3) },
    { id: "b", stamp: T(7) },
    { id: "d", stamp: T(4) },
  ];
  const plan = reconcileChats(local, index, ["c"]);
  assert.deepEqual(plan.keep.map((c) => c.id), ["a", "b"], "c was deleted in the account");
  assert.deepEqual(plan.push.map((c) => c.id), ["a"], "newer here");
  assert.deepEqual(plan.fetch.sort(), ["b", "d"], "newer in the account, or not here");

  const renamed = { ...chat("b", T(1)), title: "Shabbos candles", changedAt: T(8) };
  assert.equal(chatStamp(renamed), T(8), "a new name counts as a change");
  const merged = mergeChatLists([chat("b", T(1))], [renamed]);
  assert.equal(merged[0].title, "Shabbos candles");
});

test("the account keeps the newest copy of each chat, and a deletion wins", async () => {
  const store = memoryStore();
  const { personId } = await store.findOrCreatePerson(emailCheck("chana@example.com", SECRET));
  await store.saveChats(personId, [chat("a", T(5)), chat("b", T(5))], [], T(6));
  await store.saveChats(personId, [chat("a", T(3), "An older copy")], [], T(7));
  assert.equal((await store.getChats(personId, ["a"]))[0].title, "Why do we light candles?", "an older copy doesn't replace a newer one");
  await store.saveChats(personId, [], ["b"], T(8));
  const index = await store.chatIndex(personId, T(9));
  assert.deepEqual(index.live.map((c) => c.id), ["a"]);
  assert.deepEqual(index.deleted, ["b"]);
  // A device with an old copy of b can't bring it back.
  await store.saveChats(personId, [chat("b", T(5))], [], T(10));
  assert.deepEqual((await store.chatIndex(personId, T(11))).deleted, ["b"]);
  // Bad ids and malformed chats are refused.
  const r = await store.saveChats(personId, [{ ...chat("x", T(1)), id: "../../etc" }, { nope: true }] as unknown as SavedChat[], ["bad id!"], T(12));
  assert.equal(r.saved, 0);
  assert.equal(r.removed, 0);
});

test("a chat too big for the account loses its oldest messages, never its words", () => {
  const big = chat("big", T(1));
  big.messages = Array.from({ length: 20 }, (_, i) => ({ role: "user" as const, text: `${i} ${"word ".repeat(200)}` }));
  const fitted = fitChat(big, 5000)!;
  assert.ok(fitted.messages.length < 20);
  assert.equal(fitted.messages[fitted.messages.length - 1].text, big.messages[19].text, "the newest are kept as they were");
});

test("deleting an account deletes everything kept for that person", async () => {
  const store = memoryStore();
  const check = emailCheck("eli@example.com", SECRET);
  const { personId } = await store.findOrCreatePerson(check);
  const token = newToken();
  await store.createSession(personId, tokenCheck(token));
  await store.saveProfile(personId, withStated(emptyProfile(), { level: "new" }));
  await store.saveChats(personId, [chat("a", T(1))], []);
  assert.equal((await store.exportData(personId)).chats.length, 1);
  await store.deleteAccount(personId);
  assert.equal(await store.sessionPerson(tokenCheck(token)), null);
  assert.equal(await store.getProfile(personId), null);
  assert.deepEqual((await store.chatIndex(personId)).live, []);
  const again = await store.findOrCreatePerson(check);
  assert.equal(again.created, true, "the same address later starts a new, empty account");
});

// ---------------------------------------------------------------------------
// The profile an answer uses

test("signed in, an answer uses the account's profile; otherwise the device's; with none sent, none", async () => {
  const store = memoryStore();
  const { personId } = await store.findOrCreatePerson(emailCheck("rivka@example.com", SECRET));
  const token = newToken();
  await store.createSession(personId, tokenCheck(token));
  await store.saveProfile(personId, withStated(emptyProfile(), { level: "advanced" }, T(5)));
  const device = withStated(emptyProfile(), { level: "new" }, T(1));

  const signedIn = request({ cookie: `${SESSION_COOKIE}=${token}` });
  const used = await profileForAsk(signedIn, device, ENV, store);
  assert.equal(used?.stated.level, "advanced", "the account's copy");
  const lib = loadLibrary("development");
  const { params } = planRequest({ question: "What is a mitzvah?", profile: used }, lib, { model: "m", effort: "medium", maxTokens: 1000 });
  const system = params.system as Array<{ text: string; cache_control?: unknown }>;
  assert.match(system[system.length - 1].text, /learned in yeshiva or seminary for years/, "after the cached instructions");
  assert.ok(!system.slice(0, -1).some((b) => b.text.includes("seminary for years")), "never in the cached part");

  assert.equal((await profileForAsk(request(), device, ENV, store))?.stated.level, "new", "not signed in: the device's copy");
  assert.equal((await profileForAsk(request({ cookie: `${SESSION_COOKIE}=${newToken()}` }), device, ENV, store))?.stated.level, "new");
  assert.equal(await profileForAsk(signedIn, undefined, ENV, store), undefined, "remembering off on this device: nothing");
  assert.equal((await profileForAsk(signedIn, device, {}, store))?.stated.level, "new", "accounts off: the device's copy");

  // Remembering off in the account: the account's copy says nothing.
  await store.saveProfile(personId, withRemember(emptyProfile(), false, T(9)));
  assert.equal(profileSummary((await profileForAsk(signedIn, device, ENV, store))!), "");
});

// ---------------------------------------------------------------------------
// "Was this helpful?"

test("feedback keeps only the question, the answer, the sources and the reason: never a profile", async () => {
  const body = {
    helpful: false,
    reasons: ["too-long", "made-up", "too-long", "source-wrong"],
    note: "  Too long for me.\u0007 ",
    question: "Why do we light candles?",
    answer: "Because…",
    sources: ["Shabbat 23b:4", 7, "Shabbat 23b:4"],
    profile: withStated(emptyProfile(), { name: "Moshe", level: "new" }),
    email: "moshe@example.com",
    session: "abc",
  };
  const record = parseFeedback(body);
  assert.ok(typeof record !== "string");
  assert.deepEqual(Object.keys(record).sort(), ["answer", "helpful", "note", "question", "reasons", "sources"]);
  assert.deepEqual(record.reasons, ["too-long", "source-wrong"]);
  assert.equal(record.note, "Too long for me.");
  assert.deepEqual(record.sources, ["Shabbat 23b:4"]);
  assert.ok(!JSON.stringify(record).includes("Moshe") && !JSON.stringify(record).includes("moshe@"));

  assert.equal(typeof parseFeedback({ answer: "x" }), "string", "helpful must be said");
  assert.equal(typeof parseFeedback({ helpful: true }), "string", "which answer?");
  const up = parseFeedback({ helpful: true, reasons: ["too-long"], answer: "x" });
  assert.ok(typeof up !== "string" && up.reasons.length === 0, "reasons are for an unhelpful answer");
  assert.equal(FEEDBACK_REASONS.length, 5);

  const store = memoryStore();
  await store.addFeedback(record, T(0) + 1234);
  const rows = await store.feedbackSince(0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].createdAt % 3_600_000, 0, "kept to the hour");
  assert.ok(!JSON.stringify(rows).includes("Moshe"));
});

test("the feedback table has no column that could tie it to a person", async () => {
  const client = createClient({ url: ":memory:" });
  const store = createPeopleStore(execFrom(client));
  await store.feedbackSince(0);
  const cols = (await client.execute("PRAGMA table_info(feedback)")).rows.map((r) => String(r.name));
  assert.deepEqual(cols.sort(), ["answer", "created_at", "helpful", "id", "note", "question", "reason", "sources"]);
});

test("the feedback route stores nothing about the person, even when signed in", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rabai-people-"));
  const url = `file:${join(dir, "people.db")}`;
  const saved = { ...process.env };
  Object.assign(process.env, { PEOPLE_DATABASE_URL: url, RABAI_AUTH_SECRET: SECRET });
  delete process.env.VERCEL;
  try {
    const { peopleStore } = await import("../lib/account/people");
    const { POST } = await import("../app/api/feedback/route");
    const store = peopleStore()!;
    const { personId } = await store.findOrCreatePerson(emailCheck("tova@example.com", SECRET));
    const token = newToken();
    await store.createSession(personId, tokenCheck(token));
    await store.saveProfile(personId, withStated(emptyProfile(), { name: "Tova", level: "advanced" }));
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${token}`, origin: "http://localhost" },
        body: JSON.stringify({ helpful: true, question: "Q?", answer: "A.", sources: ["Genesis 1:1"], profile: { stated: { name: "Tova" } } }),
      }),
    );
    assert.equal(res.status, 200);
    const rows = await store.feedbackSince(0);
    assert.equal(rows.length, 1);
    assert.ok(!JSON.stringify(rows).includes("Tova"));
    assert.ok(!JSON.stringify(rows).includes(personId));
    const other = await POST(new Request("http://localhost/api/feedback", { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" }));
    assert.equal(other.status, 403, "another site can't send feedback");
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
    rmSync(dir, { recursive: true, force: true });
  }
});
