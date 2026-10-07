/*
 * The import side of the translation inbox (see scripts/translate-here.ts). Runs in GitHub Actions
 * ("RabAI's translation inbox" workflow), connected to the testing library (read) and RabAI's
 * translation library (read and write) by tools/translations_setup.py --inbox.
 *
 *   npx tsx scripts/translations-inbox.ts key      Make the inbox's key pair the first time: the
 *                                                  private key stays in the translation library's
 *                                                  own database (table inbox_key); the public key
 *                                                  is written to ../translations-inbox/public-key.pem.
 *   npx tsx scripts/translations-inbox.ts import   Open each ../translations-inbox/*.sealed, check
 *                                                  every translation against the testing library's
 *                                                  text again, keep it, and remove the file.
 *
 * A translation is kept only when its text check matches the passage's current text. A translation
 * the board has reviewed is never replaced. The private key is never printed.
 */
import { createClient as createHttpClient } from "@libsql/client/http";
import { appendFileSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { plainText } from "../lib/library/daf";
import { testingStore } from "../lib/library/testing";
import { textCheck, translationStore } from "../lib/library/translations";
import { makeInboxKeys, unseal } from "../lib/library/inbox-seal";
import { readKeptTranslation } from "../lib/engine/gloss";
import { mergeTranslations } from "../lib/engine/translate";

const INBOX = resolve(import.meta.dirname, "..", "..", "translations-inbox");
const KEY_FILE = join(INBOX, "public-key.pem");

function say(line = "") {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

function translationsDb() {
  const url = process.env.TRANSLATIONS_DATABASE_URL;
  if (!url) throw new Error("Set TRANSLATIONS_DATABASE_URL and TRANSLATIONS_AUTH_TOKEN (tools/translations_setup.py --inbox does).");
  return createHttpClient({ url: url.replace(/^libsql:\/\//, "https://"), authToken: process.env.TRANSLATIONS_AUTH_TOKEN });
}

async function inboxKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const db = translationsDb();
  await db.execute("CREATE TABLE IF NOT EXISTS inbox_key (id INTEGER PRIMARY KEY CHECK (id = 1), public_key TEXT NOT NULL, private_key TEXT NOT NULL, made_on TEXT NOT NULL)");
  const rows = (await db.execute("SELECT public_key, private_key FROM inbox_key WHERE id = 1")).rows;
  if (rows.length) return { publicKey: String(rows[0].public_key), privateKey: String(rows[0].private_key) };
  const keys = makeInboxKeys();
  await db.execute({
    sql: "INSERT INTO inbox_key (id, public_key, private_key, made_on) VALUES (1, ?, ?, ?)",
    args: [keys.publicKey, keys.privateKey, new Date().toISOString()],
  });
  say("- Made the inbox's key pair. The private key is kept only in the translation library's database.");
  return keys;
}

interface SealedItems {
  v: number;
  sealedOn?: string;
  items: Array<{ translation: unknown; check: string }>;
}

async function main() {
  const mode = process.argv[2];
  if (mode === "key") {
    const { publicKey } = await inboxKeys();
    if (!existsSync(KEY_FILE) || readFileSync(KEY_FILE, "utf8") !== publicKey) {
      writeFileSync(KEY_FILE, publicKey);
      say("- Wrote translations-inbox/public-key.pem.");
    }
    return;
  }
  if (mode !== "import") throw new Error("Say key or import.");

  const files = existsSync(INBOX) ? readdirSync(INBOX).filter((f) => f.endsWith(".sealed")).sort() : [];
  say("### RabAI's translation inbox");
  if (!files.length) {
    say("- No sealed files to import.");
    return;
  }
  const store = testingStore();
  if (!store) throw new Error("Set the testing library (TURSO_DATABASE_URL).");
  const library = translationStore();
  if (!library) throw new Error("Set the translation library (TRANSLATIONS_DATABASE_URL).");
  const { privateKey } = await inboxKeys();

  for (const file of files) {
    let sealed: SealedItems;
    try {
      sealed = unseal(privateKey, readFileSync(join(INBOX, file), "utf8")) as SealedItems;
    } catch (err) {
      say(`- ${file}: could not be opened (${err instanceof Error ? err.message : "unknown error"}). Left in place.`);
      continue;
    }
    let kept = 0;
    let changed = 0;
    let reviewed = 0;
    let bad = 0;
    const items = Array.isArray(sealed.items) ? sealed.items : [];
    for (let i = 0; i < items.length; i += 200) {
      const chunk = items.slice(i, i + 200);
      const refs = chunk.map((c) => (c.translation as { ref?: string })?.ref).filter((r): r is string => typeof r === "string");
      const passages = new Map((await store.exact(refs)).map((p) => [p.ref, p]));
      const before = await library.get(refs);
      for (const item of chunk) {
        const t = readKeptTranslation(item.translation);
        if (!t || typeof item.check !== "string") {
          bad++;
          continue;
        }
        const p = passages.get(t.ref);
        if (!p || textCheck(plainText(p.he)) !== item.check) {
          changed++;
          continue;
        }
        const old = before.get(t.ref);
        if (old && old.check === item.check && old.review !== "unreviewed") {
          reviewed++;
          continue;
        }
        await library.put(mergeTranslations(old && old.check === item.check ? old.translation : undefined, t), item.check, "batch");
        kept++;
      }
    }
    await library.addJob({
      batchId: `inbox:${file}`,
      madeOn: new Date().toISOString(),
      model: "session",
      status: "collected",
      manifest: {},
      note: JSON.stringify({ kept, changed, reviewed, bad, sealedOn: sealed.sealedOn }),
    }).catch(() => {
      /* imported again after a failed push: the job row is there already */
    });
    rmSync(join(INBOX, file));
    say(`- ${file}: kept ${kept}; skipped ${changed} whose text changed, ${reviewed} already reviewed by the board, ${bad} unreadable.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
