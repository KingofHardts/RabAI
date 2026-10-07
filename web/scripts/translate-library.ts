/*
 * Fill RabAI's translation library ahead of time (see lib/engine/translate-batch.ts).
 *
 * Usage, from web/:
 *   npx tsx scripts/translate-library.ts estimate --books "Rashi on Berakhot" [--like "Rashi on %"] [--works rishonim-shas] [--words] [--model claude-opus-5-5]
 *   npx tsx scripts/translate-library.ts fill --books "Rashi on Berakhot" --limit 50 --max-dollars 25 [--wait-minutes 300] [--words] [--model ...]
 *   npx tsx scripts/translate-library.ts collect [--wait-minutes 300]
 *
 * estimate  counts what the selection holds and estimates the cost. Nothing is sent to the model
 *           (with an API key, the requests' tokens are counted, which is free).
 * fill      sends up to --limit passages that aren't in the translation library yet, never more
 *           than --max-dollars by the estimate, waits for the batch, and keeps the results.
 * collect   keeps the results of batches sent earlier that weren't collected yet.
 *
 * Settings (environment): the testing library (TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, or
 * RABAI_LIBRARY_DB_URL), RabAI's translation library (TRANSLATIONS_DATABASE_URL and
 * TRANSLATIONS_AUTH_TOKEN, or RABAI_TRANSLATIONS_DB_URL), and ANTHROPIC_API_KEY. In GitHub
 * Actions, the "RabAI's translation library" workflow sets them all.
 */
import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync } from "node:fs";
import { testingStore } from "../lib/library/testing";
import { translationStore, type TranslationJobRecord } from "../lib/library/translations";
import { engineConfig } from "../lib/engine/answer";
import {
  ASSUMED_OUTPUT_PER_WORD,
  BATCH_PRICES,
  buildRequests,
  collectBatch,
  dollars,
  pendingPassages,
  type BatchClient,
  type Selection,
} from "../lib/engine/translate-batch";

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const list = (name: string) => (opt(name) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const flag = (name: string) => args.includes(`--${name}`);

function say(line = "") {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
}
const money = (d: number) => (Number.isFinite(d) ? `$${d.toFixed(d < 10 ? 2 : 0)}` : "unknown");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BATCH_REQUESTS = 4000;

function batchClient(anthropic: Anthropic): BatchClient {
  return {
    async create(requests) {
      const b = await anthropic.beta.messages.batches.create({
        requests: requests as never,
        betas: ["server-side-fallback-2026-07-01"],
      });
      return { id: b.id };
    },
    async ended(id) {
      return (await anthropic.beta.messages.batches.retrieve(id)).processing_status === "ended";
    },
    async *results(id) {
      for await (const r of await anthropic.beta.messages.batches.results(id)) {
        if (r.result.type === "succeeded") {
          const m = r.result.message;
          yield {
            custom_id: r.custom_id,
            text: m.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
            model: m.model,
            usage: m.usage,
          };
        } else {
          yield { custom_id: r.custom_id, error: r.result.type };
        }
      }
    },
  };
}

/** Cost per Hebrew word measured by earlier fills with this model and choice, if any. */
async function measuredRate(jobs: TranslationJobRecord[], sel: Selection): Promise<number | null> {
  let cost = 0;
  let words = 0;
  for (const j of jobs) {
    if (j.status !== "collected" || j.model !== sel.model || !j.note) continue;
    try {
      const n = JSON.parse(j.note) as { dollars?: number; words?: number; wantWords?: boolean };
      if (!n.words || !n.dollars || !!n.wantWords !== sel.want.words) continue;
      cost += n.dollars;
      words += n.words;
    } catch {
      /* an older note */
    }
  }
  return words > 0 ? cost / words : null;
}

async function main() {
  if (!["estimate", "fill", "collect"].includes(mode ?? "")) {
    console.error("Say estimate, fill or collect. See the top of this file.");
    process.exit(2);
  }
  const store = testingStore();
  if (!store) throw new Error("Set the testing library (TURSO_DATABASE_URL or RABAI_LIBRARY_DB_URL).");
  const library = translationStore();
  if (!library) throw new Error("Set RabAI's translation library (TRANSLATIONS_DATABASE_URL or RABAI_TRANSLATIONS_DB_URL).");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const anthropic = apiKey ? new Anthropic({ apiKey }) : null;
  const waitMinutes = Number(opt("wait-minutes") ?? 300);

  const collectPending = async () => {
    if (!anthropic) throw new Error("Set ANTHROPIC_API_KEY.");
    const client = batchClient(anthropic);
    const deadline = Date.now() + waitMinutes * 60_000;
    for (;;) {
      const pending = await library.jobs("submitted");
      if (!pending.length) return;
      let waiting = 0;
      for (const job of pending) {
        if (!(await client.ended(job.batchId))) {
          waiting++;
          continue;
        }
        const r = await collectBatch(store, library, client, job);
        const note = JSON.parse(job.note ?? "{}") as Record<string, unknown>;
        await library.setJobStatus(job.batchId, "collected", JSON.stringify({ ...note, ...r, dollars: r.dollars }));
        say(`- Batch ${job.batchId}: kept ${r.kept}, failed ${r.failed}, skipped ${r.skipped} (text changed). Cost ${money(r.dollars)}.`);
        const words = Number(note.words ?? 0);
        if (words) say(`  That is ${money((r.dollars / words) * 1000)} per 1,000 Hebrew words.`);
      }
      if (!waiting) return;
      if (Date.now() > deadline) {
        say(`- ${waiting} batch(es) still running. Run the workflow again with "collect" later (results stay available for 29 days).`);
        return;
      }
      await sleep(60_000);
    }
  };

  if (mode === "collect") return collectPending();

  const titles = await store.booksFor({ titles: list("books"), works: list("works"), like: list("like") });
  if (!titles.length) throw new Error("No books matched. Use --books, --works or --like (for example --like \"Rashi on %\").");
  const model = opt("model") ?? engineConfig().model;
  if (!BATCH_PRICES[model]) throw new Error(`No prices recorded for ${model}. Use one of: ${Object.keys(BATCH_PRICES).join(", ")}.`);
  const sel: Selection = { titles, want: { general: true, words: flag("words") }, model };

  // The estimate: tokens in from a sample of real requests, tokens out from earlier fills or an assumption.
  const counted = await store.untranslatedCount(titles);
  const sample = await pendingPassages(store, library, sel, 60);
  const built = await buildRequests(store, sample, sel, "est");
  let inTokens = 0;
  for (const r of built.requests) {
    if (anthropic) {
      const p = r.params as { model: string; system: never; messages: never; thinking: never };
      const c = await anthropic.beta.messages.countTokens({ model: p.model, system: p.system, messages: p.messages, thinking: p.thinking });
      inTokens += c.input_tokens;
    } else {
      inTokens += JSON.stringify(r.params).length / 2.5;
    }
  }
  const inPerWord = built.words ? inTokens / built.words : 0;
  const assumedOut = ASSUMED_OUTPUT_PER_WORD.general + (sel.want.words ? ASSUMED_OUTPUT_PER_WORD.words : 0);
  const assumedRate = dollars(model, { input_tokens: inPerWord, output_tokens: assumedOut });
  const measured = await measuredRate(await library.jobs(), sel);
  const rate = measured ?? assumedRate;

  say(`### RabAI's translation library: ${mode}`);
  say(`- Books: ${titles.length <= 8 ? titles.join(", ") : `${titles.slice(0, 8).join(", ")} and ${titles.length - 8} more`}`);
  say(`- Passages without English: ${counted.passages.toLocaleString()}, about ${counted.words.toLocaleString()} Hebrew words (some may already be translated).`);
  say(`- Making: the general translation${sel.want.words ? " and word by word" : ""}, with ${model}, at batch prices.`);
  say(`- Tokens in: about ${Math.round(inPerWord)} per Hebrew word (${anthropic ? "counted" : "estimated from length"} on ${sample.length} passages).`);
  say(
    measured
      ? `- Measured cost from earlier fills: ${money(measured * 1000)} per 1,000 Hebrew words.`
      : `- Tokens out: assumed ${assumedOut} per Hebrew word, thinking included. A small fill measures the real number.`,
  );
  say(`- Estimated cost for the whole selection: ${money(rate * counted.words)}.`);

  if (mode === "estimate") return;
  if (!anthropic) throw new Error("Set ANTHROPIC_API_KEY.");

  const limit = Math.max(1, Number(opt("limit") ?? 50));
  const maxDollars = Number(opt("max-dollars") ?? 25);
  const chosen = await pendingPassages(store, library, sel, limit);
  // Never more than the spending limit, by the estimate.
  let budgetWords = rate > 0 ? maxDollars / rate : Infinity;
  const within = chosen.filter((p) => {
    const words = p.he.split(/\s+/).length;
    if (words > budgetWords) return false;
    budgetWords -= words;
    return true;
  });
  if (!within.length) {
    say("- Nothing to send: everything selected is already translated, or the spending limit is too low for one passage.");
    return collectPending();
  }
  const stamp = Date.now().toString(36);
  const { requests, manifest, words } = await buildRequests(store, within, sel, stamp);
  say(`- Sending ${within.length} passages (${words.toLocaleString()} Hebrew words, ${requests.length} requests); estimated ${money(rate * words)}, limit ${money(maxDollars)}.`);
  const client = batchClient(anthropic);
  for (let i = 0; i < requests.length; i += BATCH_REQUESTS) {
    const part = requests.slice(i, i + BATCH_REQUESTS);
    const ids = new Set(part.map((r) => r.custom_id));
    const partManifest = Object.fromEntries(Object.entries(manifest).filter(([id]) => ids.has(id)));
    const partWords = Math.round((words * part.length) / requests.length);
    const { id } = await client.create(part);
    await library.addJob({
      batchId: id,
      madeOn: new Date().toISOString(),
      model,
      status: "submitted",
      manifest: partManifest,
      note: JSON.stringify({ words: partWords, wantWords: sel.want.words }),
    });
    say(`- Sent batch ${id} (${part.length} requests).`);
  }
  await collectPending();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
