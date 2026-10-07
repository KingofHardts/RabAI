/*
 * Fill RabAI's translation library from inside a Claude Code session, instead of the paid Message
 * Batches API (scripts/translate-library.ts). The requests are the same (buildRequests in
 * lib/engine/translate-batch.ts) and so are the checks (collectBatch): only the step that would
 * send the requests to the API is different. Each request is written out as a file, translated in
 * the session following the request's own instructions, and the answer is read back.
 *
 * The translations are kept first in a translation library on this computer, then sealed (only the
 * import job can open them, see lib/library/inbox-seal.ts) and pushed to translations-inbox/ in the
 * repository. The "RabAI's translation inbox" workflow imports them into the shared translation
 * library, checking each one again against the testing library's text.
 *
 * Usage, from web/, with the testing library on this computer:
 *   export RABAI_LIBRARY_DB_URL=file:../library/rabai-library.db
 *   export RABAI_TRANSLATIONS_DB_URL=file:../library/rabai-translations-local.db
 *   npx tsx scripts/translate-here.ts send --books "Rashi on Berakhot" --limit 100 [--words] [--like ...] [--works ...]
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
 *          like a live translation, and keeps them in the local translation library.
 * seal     seals what hasn't been sent yet into ../translations-inbox/<date>-<n>.sealed, with the
 *          inbox's public key (../translations-inbox/public-key.pem).
 *
 * Every translation is RabAI's own and is labeled in the app as not yet reviewed by the rabbinic
 * board. ../library/ is never committed: the request files hold the library's texts.
 */
import { createClient } from "@libsql/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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

const ANSWER_FORM = `# How to answer

Each <id>.request.md in this folder is one request to RabAI's translator. Answer it the way the
model would be asked to through the API: follow the instructions below (RabAI's core premises,
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
    const chosen = (await pendingPassages(store, library, sel, limit + open.size)).filter((p) => !open.has(p.ref)).slice(0, limit);
    if (!chosen.length) {
      console.log("Nothing to send: everything selected is translated or in a job already.");
      return;
    }
    const job = `s${Date.now().toString(36)}`;
    const { requests, manifest, words } = await buildRequests(store, chosen, sel, job);
    const dir = join(WORK, job);
    mkdirSync(dir, { recursive: true });
    const first = requestText(requests[0].params);
    writeFileSync(join(dir, "instructions.md"), ANSWER_FORM + first.system);
    for (const r of requests) {
      const { system, user } = requestText(r.params);
      if (system !== first.system) throw new Error("The requests' instructions differ; they should be the same.");
      writeFileSync(join(dir, `${r.custom_id}.request.md`), user);
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

