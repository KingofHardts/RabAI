/*
 * Fill RabbAI's translation library from inside a Claude Code session, instead of the paid Message
 * Batches API (scripts/translate-library.ts). The requests are the same (buildRequests in
 * lib/engine/translate-batch.ts) and so are the checks (collectBatch): only the step that would
 * send the requests to the API is different. Each request is written out as a file, translated in
 * the session following the request's own instructions, and the answer is read back.
 *
 * The translations are kept first in a translation library on this computer, then sealed (only the
 * import job can open them, see lib/library/inbox-seal.ts) and pushed to translations-inbox/ in the
 * repository. The "RabbAI's translation inbox" workflow imports them into the shared translation
 * library, checking each one again against the testing library's text.
 *
 * Usage, from web/, with the testing library on this computer:
 *   export RABAI_LIBRARY_DB_URL=file:../library/rabai-library.db
 *   export RABAI_TRANSLATIONS_DB_URL=file:../library/rabai-translations-local.db
 *   npx tsx scripts/translate-here.ts send --books "Rashi on Berakhot" --limit 100 [--words] [--like ...] [--works ...]
 *
 * --pages 2a-3b (or 2a,2b) keeps only those amudim of the books chosen, so a daf's Gemara, Rashi and
 * Tosafot can be done together, in order.
 * --within "Siddur Ashkenaz, Weekday, Shacharit|Siddur Ashkenaz, Weekday, Minchah" keeps only passages
 * whose reference starts with one of those beginnings (separated by |), so a long book such as a
 * siddur can be done a part at a time, in the order asked for rather than the library's.
 * --dictionary short keeps only the opening of each dictionary entry (where its meaning is) in the
 * request files; --dictionary none leaves the dictionary entries out. For texts that have the
 * library's own English line by line, such as a siddur, where the entries are about half of every
 * request. The answers are checked against the library's full sources as usual.
 * --words also makes word-by-word lists for passages that have the library's English (the Gemara),
 * which get only that list. RABAI_LIBRARY_DB_URL may be the library on Turso (libsql://...) when the
 * session has its read-only token as a network secret (docs/session-translation.md).
 *   npx tsx scripts/translate-here.ts status
 *   npx tsx scripts/translate-here.ts collect [--job ID] [--partial]
 *   npx tsx scripts/translate-here.ts seal
 *
 * send     writes the requests for up to --limit passages without English that aren't translated
 *          yet, to ../library/session-translations/<job>/: instructions.md (the same instructions
 *          the API request carries), and one <id>.request.md per request. The answer to each goes
 *          in <id>.answer.txt, written exactly in the form the request asks for.
 * status   how many answers each job has.
 * collect  reads the answers of finished jobs (or of unfinished ones with --partial), checks them
 *          like a live translation, and keeps them in the local translation library. A finished
 *          job is kept only when every word of every passage has its English (scripts/words-join.ts
 *          and scripts/words-check.ts are run first); --allow-gaps keeps it anyway.
 * seal     seals what hasn't been sent yet into ../translations-inbox/<date>-<n>.sealed, with the
 *          inbox's public key (../translations-inbox/public-key.pem).
 *
 * Every translation is RabbAI's own and is labeled in the app as not yet reviewed by the rabbinic
 * board. ../library/ is never committed: the request files hold the library's texts.
 */
import { createClient } from "@libsql/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { testingStore } from "../lib/library/testing";
import { translationStore, translationsDbUrl } from "../lib/library/translations";
import { seal } from "../lib/library/inbox-seal";
import { buildRequests, collectBatch, pendingPassages, type BatchAnswer, type BatchClient, type Selection } from "../lib/engine/translate-batch";

const ROOT = resolve(import.meta.dirname, "..", "..");
const WORK = join(ROOT, "library", "session-translations");
const INBOX = join(ROOT, "translations-inbox");
/** The model doing the translating in the session. */
const MODEL = process.env.RABAI_SESSION_MODEL || "claude-opus-5-5";
/** At most this many translations in one sealed file. */
const PER_FILE = 2000;

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const list = (name: string) => (opt(name) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const flag = (name: string) => args.includes(`--${name}`);

/** How much of a dictionary entry --short-dictionary keeps. */
const ENTRY_CHARS = 320;
const DICTIONARY_HEAD = /^\[(Jastrow|Sefer HaShorashim), /;

/** A request's text with each dictionary entry cut to its opening, or left out. Nothing else is touched. */
export function shortDictionary(user: string, keep: "short" | "none" = "short"): string {
  const out: string[] = [];
  const lines = user.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const entry = DICTIONARY_HEAD.test(lines[i]);
    if (keep === "none" && (entry || /^Dictionary entries for its words:/.test(lines[i]))) {
      // Skip the heading or the entry, up to the next source or the closing instructions.
      let j = i + 1;
      for (; j < lines.length; j++) if (/^\[/.test(lines[j]) || /^Answer each passage|^Answer in this form|^Reply |^Write the (general|word-by-word) translation |^Then list other readings/.test(lines[j])) break;
      i = j - 1;
      continue;
    }
    out.push(lines[i]);
    if (!entry) continue;
    // The entry's own lines run to the next source's heading, or to the closing instructions.
    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      if (/^\[/.test(lines[j]) || /^Answer each passage|^Answer in this form|^Reply |^Write the (general|word-by-word) translation |^Then list other readings/.test(lines[j])) break;
      body.push(lines[j]);
    }
    const text = body.join("\n").trim();
    out.push("", text.length > ENTRY_CHARS ? `${text.slice(0, ENTRY_CHARS).trimEnd()} […]` : text, "");
    i = j - 1;
  }
  return out.join("\n");
}

/** The amud a ref is on ("Rashi on Kiddushin 2a:1:1" is on 2a). */
const amudOf = (ref: string) => ref.split(":")[0].split(" ").pop() ?? "";

/** The amudim of --pages: "2a-3b" is 2a, 2b, 3a, 3b; "2a,4b" is those two. Null for every page. */
function amudim(spec: string | undefined): Set<string> | null {
  if (!spec?.trim()) return null;
  const out = new Set<string>();
  const parse = (x: string) => {
    const m = x.trim().match(/^(\d+)([ab])$/);
    if (!m) throw new Error(`--pages: "${x}" isn't an amud like 2a or 13b.`);
    return Number(m[1]) * 2 + (m[2] === "b" ? 1 : 0);
  };
  for (const part of spec.split(",")) {
    const [from, to] = part.split("-");
    const a = parse(from);
    const b = to ? parse(to) : a;
    if (b < a) throw new Error(`--pages: ${part} runs backwards.`);
    for (let n = a; n <= b; n++) out.add(`${Math.floor(n / 2)}${n % 2 ? "b" : "a"}`);
  }
  return out;
}

const ANSWER_FORM = `# How to answer

Each <id>.request.md in this folder is one request to RabbAI's translator. Answer it the way the
model would be asked to through the API: follow the instructions below (RabbAI's core premises,
then "Translating a passage") and the request's own words, and reply in exactly the form it asks
for, with no other words. Write the reply to <id>.answer.txt, beside the request.

Follow the text's own meaning and the library's English given in the request. Add nothing that
is not in the text. Never name a source that is not in the request.

---

`;

function requestText(params: Record<string, unknown>): { system: string; user: string } {
  const system = (params.system as Array<{ text: string }>).map((b) => b.text).join("\n\n");
  const messages = params.messages as Array<{ content: string }>;
  return { system, user: messages.map((m) => m.content).join("\n\n") };
}

/** Answers read back from the job's folder. */
function fileClient(dir: string, ids: () => string[]): BatchClient {
  return {
    async create() {
      throw new Error("Requests are written with send.");
    },
    async ended() {
      return ids().every((id) => existsSync(join(dir, `${id}.answer.txt`)));
    },
    async *results(): AsyncIterable<BatchAnswer> {
      for (const id of ids()) {
        const file = join(dir, `${id}.answer.txt`);
        if (existsSync(file)) yield { custom_id: id, text: readFileSync(file, "utf8"), model: MODEL };
        else yield { custom_id: id, error: "not answered yet" };
      }
    },
  };
}

async function main() {
  if (!["send", "status", "collect", "seal"].includes(mode ?? "")) {
    console.error("Say send, status, collect or seal. See the top of this file.");
    process.exit(2);
  }
  const url = translationsDbUrl();
  if (!url?.startsWith("file:")) throw new Error("Set RABAI_TRANSLATIONS_DB_URL to a file on this computer (file:../library/rabai-translations-local.db).");
  const library = translationStore()!;
  mkdirSync(WORK, { recursive: true });

  if (mode === "send") {
    const store = testingStore();
    if (!store) throw new Error("Set RABAI_LIBRARY_DB_URL (file:../library/rabai-library.db).");
    const titles = await store.booksFor({ titles: list("books"), works: list("works"), like: list("like") });
    if (!titles.length) throw new Error("No books matched. Use --books, --works or --like.");
    const sel: Selection = { titles, want: { general: true, words: flag("words") }, model: MODEL };
    const limit = Math.max(1, Number(opt("limit") ?? 50));
    // Passages in a job that isn't collected yet are being translated already.
    const open = new Set((await library.jobs("submitted")).flatMap((j) => Object.values(j.manifest).flatMap((e) => e.passages.map((p) => p.ref))));
    const pages = amudim(opt("pages"));
    // --within: the beginnings of the references wanted, in the order wanted.
    const within = (opt("within") ?? "").split("|").map((x) => x.trim()).filter(Boolean);
    const partOf = (ref: string) => within.findIndex((w) => ref.startsWith(w));
    const pending = await pendingPassages(store, library, sel, pages || within.length ? 1_000_000 : limit + open.size);
    const wanted = pending.filter((p) => !open.has(p.ref) && (!pages || pages.has(amudOf(p.ref))) && (!within.length || partOf(p.ref) >= 0));
    // Parts come in the order they were named; inside a part, the library's order is kept.
    const chosen = (within.length > 1 ? wanted.map((p, i) => ({ p, i })).sort((a, b) => partOf(a.p.ref) - partOf(b.p.ref) || a.i - b.i).map((x) => x.p) : wanted).slice(0, limit);
    if (!chosen.length) {
      console.log("Nothing to send: everything selected is translated or in a job already.");
      return;
    }
    const job = `s${Date.now().toString(36)}`;
    const { requests, manifest, words } = await buildRequests(store, chosen, sel, job);
    const dir = join(WORK, job);
    mkdirSync(dir, { recursive: true });
    const dictionary = opt("dictionary");
    const first = requestText(requests[0].params);
    writeFileSync(join(dir, "instructions.md"), ANSWER_FORM + first.system);
    for (const r of requests) {
      const { system, user } = requestText(r.params);
      if (system !== first.system) throw new Error("The requests' instructions differ; they should be the same.");
      writeFileSync(join(dir, `${r.custom_id}.request.md`), dictionary === "short" || dictionary === "none" ? shortDictionary(user, dictionary) : user);
    }
    await library.addJob({
      batchId: job,
      madeOn: new Date().toISOString(),
      model: MODEL,
      status: "submitted",
      manifest,
      note: JSON.stringify({ words, wantWords: sel.want.words, session: true }),
    });
    console.log(`Job ${job}: ${chosen.length} passages, ${words} Hebrew words, ${requests.length} requests in ${dir}`);
    return;
  }

  if (mode === "status") {
    for (const j of await library.jobs()) {
      const dir = join(WORK, j.batchId);
      const ids = Object.keys(j.manifest);
      const answered = ids.filter((id) => existsSync(join(dir, `${id}.answer.txt`))).length;
      console.log(`${j.batchId}  ${j.status}  ${answered}/${ids.length} answered  ${j.note ?? ""}`);
    }
    return;
  }

  if (mode === "collect") {
    const store = testingStore();
    if (!store) throw new Error("Set RABAI_LIBRARY_DB_URL (file:../library/rabai-library.db).");
    const only = opt("job");
    for (const j of await library.jobs("submitted")) {
      if (only && j.batchId !== only) continue;
      const client = fileClient(join(WORK, j.batchId), () => Object.keys(j.manifest));
      if (!flag("partial") && !(await client.ended(j.batchId))) {
        console.log(`${j.batchId}: not every request is answered yet (use --partial to keep what is there).`);
        continue;
      }
      // Every word must have its English before a job is kept: the usual check lets a list through
      // with some words empty. Lines that split a word joined by a makaf are joined first.
      if (!flag("partial") && !flag("allow-gaps")) {
        const dir = join(WORK, j.batchId);
        const run = (script: string) => spawnSync(process.execPath, ["--import", "tsx", join("scripts", script), dir], { cwd: resolve(import.meta.dirname, ".."), encoding: "utf8" });
        run("words-join.ts");
        const checked = run("words-check.ts");
        const toFix = Number(/to fix (\d+)/.exec(checked.stdout ?? "")?.[1] ?? "-1");
        if (toFix !== 0) {
          console.log((checked.stdout ?? "").trim() || (checked.stderr ?? "").trim());
          console.log(`${j.batchId}: not collected: ${toFix < 0 ? "the word check couldn't run" : `${toFix} passages have a word without English`}. Fix the answer files and collect again (--allow-gaps keeps them as they are).`);
          continue;
        }
      }
      const r = await collectBatch(store, library, client, j);
      const note = JSON.parse(j.note ?? "{}") as Record<string, unknown>;
      await library.setJobStatus(j.batchId, "collected", JSON.stringify({ ...note, kept: r.kept, failed: r.failed, skipped: r.skipped }));
      console.log(`${j.batchId}: kept ${r.kept}, failed ${r.failed}, skipped ${r.skipped} (text changed).`);
    }
    return;
  }

  // seal
  const keyFile = join(INBOX, "public-key.pem");
  if (!existsSync(keyFile)) {
    throw new Error("translations-inbox/public-key.pem is missing. The inbox workflow writes it the first time it runs.");
  }
  const db = createClient({ url });
  await db.execute("CREATE TABLE IF NOT EXISTS sealed (ref TEXT NOT NULL, he_check TEXT NOT NULL, made_on TEXT NOT NULL, file TEXT NOT NULL, PRIMARY KEY (ref, he_check, made_on))");
  const rows = await db.execute(
    `SELECT t.ref FROM translations t WHERE t.made_by = 'batch'
       AND NOT EXISTS (SELECT 1 FROM sealed s WHERE s.ref = t.ref AND s.he_check = t.he_check AND s.made_on = t.made_on)
     ORDER BY t.ref`,
  );
  const refs = rows.rows.map((r) => String(r.ref));
  if (!refs.length) {
    console.log("Nothing new to seal.");
    return;
  }
  const kept = await library.get(refs);
  const publicKey = readFileSync(keyFile, "utf8");
  const stamp = new Date().toISOString().slice(0, 10);
  const all = [...kept.values()];
  for (let i = 0; i < all.length; i += PER_FILE) {
    const part = all.slice(i, i + PER_FILE);
    let n = 1;
    let name = `${stamp}-${n}.sealed`;
    while (existsSync(join(INBOX, name))) name = `${stamp}-${++n}.sealed`;
    writeFileSync(
      join(INBOX, name),
      seal(publicKey, { v: 1, sealedOn: new Date().toISOString(), items: part.map((k) => ({ translation: k.translation, check: k.check })) }),
    );
    for (const k of part) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO sealed (ref, he_check, made_on, file) VALUES (?, ?, ?, ?)",
        args: [k.translation.ref, k.check, k.madeOn, name],
      });
    }
    console.log(`Sealed ${part.length} translations in translations-inbox/${name}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

