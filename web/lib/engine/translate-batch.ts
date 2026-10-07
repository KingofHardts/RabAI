import type { TestingStore } from "../library/testing";
import { plainText } from "../library/daf";
import type { Passage } from "../library/types";
import { textCheck, type TranslationJobRecord, type TranslationStore } from "../library/translations";
import {
  GROUP_WORDS,
  assembleOne,
  assembleTranslation,
  basisOf,
  groupRequest,
  mergeTranslations,
  planTranslation,
  splitGroupReply,
  type JobResult,
  type TranslateInput,
  type TranslateWant,
  type TranslationSource,
} from "./translate";
import { gatherGroupSources, gatherSources, sourcesFor } from "./translate-sources";
import { passageWords, type Translation } from "./gloss";

/*
 * Filling RabAI's translation library ahead of time, with the Message Batches API (half the
 * price of live requests, answered within a day, usually within an hour). The same requests and
 * the same checks as a live translation (translate.ts); the results are kept in the translation
 * library, so the app serves them without calling the model.
 *
 * Nothing here runs by itself: the maintainer runs it from GitHub Actions ("RabAI's translation
 * library" workflow) with a spending limit. scripts/translate-library.ts is the command line.
 */

/** Dollars per million tokens at batch prices (half the standard price), for the estimate. */
export const BATCH_PRICES: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-sonnet-5-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};

export interface Usage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export function dollars(model: string, u: Usage): number {
  const p = BATCH_PRICES[model];
  if (!p) return NaN;
  return (
    ((u.input_tokens ?? 0) * p.input +
      (u.output_tokens ?? 0) * p.output +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite) /
    1e6
  );
}

/** One request in a batch: what the API needs. */
export interface BatchRequest {
  custom_id: string;
  params: Record<string, unknown>;
}

/** One answer from a finished batch. */
export interface BatchAnswer {
  custom_id: string;
  text?: string;
  model?: string;
  usage?: Usage;
  error?: string;
}

/** The Message Batches API, as this job uses it (an adapter over the SDK; a fake in tests). */
export interface BatchClient {
  create(requests: BatchRequest[]): Promise<{ id: string }>;
  ended(id: string): Promise<boolean>;
  results(id: string): AsyncIterable<BatchAnswer>;
}

/**
 * Before a batch is sent, how much it will likely cost: tokens in are counted on a sample of the
 * real requests (or estimated from their length), tokens out are assumed per Hebrew word. A fill
 * reports what it really cost, and later estimates use that measured rate.
 */
export const ASSUMED_OUTPUT_PER_WORD = { general: 7, words: 16 };

export interface Selection {
  titles: string[];
  want: TranslateWant;
  model: string;
}

/** Passages of the selection that still need a translation, in reading order, at most `limit`. */
export async function pendingPassages(
  store: TestingStore,
  library: TranslationStore,
  sel: Selection,
  limit: number,
): Promise<Passage[]> {
  const out: Passage[] = [];
  let after = 0;
  for (let page = 0; out.length < limit && page < 10_000; page++) {
    const batch = await store.untranslated(sel.titles, after, 200);
    if (!batch.length) break;
    after = Math.max(...batch.map((p) => p.order));
    const done = await library.have(
      batch.map((p) => ({ ref: p.ref, check: textCheck(plainText(p.he)) })),
      sel.want,
    );
    for (const p of batch) {
      if (!done.has(p.ref)) out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}

const SAFE_ID = /[^a-zA-Z0-9_-]/g;

/** The page a passage is on, for running passages of one page together ("Rashi on Berakhot 2a"). */
const pageOf = (ref: string) => ref.split(":")[0];

/** Consecutive passages of one page, up to a word budget; a passage over the budget stands alone. */
export function groupPassages(passages: Passage[], budget: number): Passage[][] {
  const groups: Passage[][] = [];
  let current: Passage[] = [];
  let words = 0;
  for (const p of passages) {
    const n = passageWords(plainText(p.he)).length;
    if (current.length && (pageOf(current[0].ref) !== pageOf(p.ref) || words + n > budget)) {
      groups.push(current);
      current = [];
      words = 0;
    }
    current.push(p);
    words += n;
  }
  if (current.length) groups.push(current);
  return groups;
}

const inputOf = (p: Passage, sources: TranslationSource[] = []): TranslateInput => ({
  ref: p.ref,
  he: plainText(p.he),
  en: plainText(p.en),
  sources,
});

/** The batch requests for these passages, and the manifest to put their answers back together. */
export async function buildRequests(
  store: TestingStore,
  passages: Passage[],
  sel: Selection,
  stamp: string,
): Promise<{ requests: BatchRequest[]; manifest: TranslationJobRecord["manifest"]; words: number }> {
  const requests: BatchRequest[] = [];
  const manifest: TranslationJobRecord["manifest"] = {};
  let words = 0;
  const add = (id: string, params: unknown, entry: TranslationJobRecord["manifest"][string]) => {
    // The batch is sent with the server-side fallback beta as a header, not per request.
    const { betas: _betas, ...rest } = params as Record<string, unknown>;
    void _betas;
    const safe = id.replace(SAFE_ID, "").slice(0, 64);
    requests.push({ custom_id: safe, params: rest });
    manifest[safe] = entry;
  };
  const budget = sel.want.words ? GROUP_WORDS.words : GROUP_WORDS.general;
  const groups = groupPassages(passages, budget);
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const inputs = group.map((p) => inputOf(p));
    words += inputs.reduce((n, i) => n + passageWords(i.he).length, 0);
    const entryOf = (key: string, of: TranslateInput[]) => ({
      key,
      general: sel.want.general,
      words: sel.want.words,
      passages: of.map((i) => ({ ref: i.ref, check: textCheck(i.he) })),
    });
    const alone = group.length === 1 && passageWords(inputs[0].he).length > budget;
    if (alone) {
      // A long passage: its own requests, split into parts like a live translation.
      const plan = planTranslation({ ...inputs[0], sources: await gatherSources(store, group[0]) }, sel.want, sel.model);
      for (const job of plan.jobs) add(`${stamp}-${g}-${job.key}`, job.params, entryOf(job.key, inputs));
    } else {
      const sources = await gatherGroupSources(store, group);
      add(`${stamp}-${g}-group`, groupRequest(inputs, sources, sel.want, sel.model), entryOf("group", inputs));
    }
  }
  return { requests, manifest, words };
}

export interface CollectReport {
  batchId: string;
  kept: number;
  failed: number;
  skipped: number;
  usage: Required<{ [K in keyof Usage]: number }>;
  dollars: number;
}

/**
 * Puts a finished batch's answers back together, checks them like a live translation, and keeps
 * them. A passage whose text changed since it was sent is skipped.
 */
export async function collectBatch(
  store: TestingStore,
  library: TranslationStore,
  client: BatchClient,
  job: TranslationJobRecord,
): Promise<CollectReport> {
  const answers = new Map<string, BatchAnswer>();
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  for await (const a of client.results(job.batchId)) {
    answers.set(a.custom_id, a);
    if (a.usage) for (const k of Object.keys(usage) as Array<keyof typeof usage>) usage[k] += Number(a.usage[k] ?? 0);
  }
  const report: CollectReport = { batchId: job.batchId, kept: 0, failed: 0, skipped: 0, usage, dollars: dollars(job.model, usage) };

  const keep = async (p: Passage, check: string, make: () => Translation) => {
    try {
      const made = make();
      const before = (await library.get([p.ref])).get(p.ref);
      const merged = mergeTranslations(before && before.check === check ? before.translation : undefined, made);
      await library.put(merged, check, "batch");
      report.kept++;
    } catch {
      report.failed++;
    }
  };
  const current = async (items: Array<{ ref: string; check: string }>) => {
    const found = await store.exact(items.map((i) => i.ref));
    return items.map((i) => {
      const p = found.find((x) => x.ref === i.ref);
      return p && plainText(p.he) && textCheck(plainText(p.he)) === i.check ? p : null;
    });
  };

  // Requests of several passages: each passage's answer is under its reference.
  for (const [id, entry] of Object.entries(job.manifest)) {
    if (entry.key !== "group") continue;
    const passages = await current(entry.passages);
    const live = passages.filter((p): p is Passage => !!p);
    report.skipped += passages.length - live.length;
    const answer = answers.get(id);
    if (answer?.text === undefined) {
      report.failed += live.length;
      continue;
    }
    const parts = splitGroupReply(answer.text, live.map((p) => p.ref));
    const sources = live.length ? await gatherGroupSources(store, live) : [];
    const want: TranslateWant = { general: entry.general, words: entry.words };
    for (const p of live) {
      const text = parts.get(p.ref);
      const check = entry.passages.find((x) => x.ref === p.ref)!.check;
      await keep(p, check, () => {
        if (text === undefined) throw new Error("no answer for this passage");
        const t = assembleOne(inputOf(p), want, text, sources, answer.model);
        const basis = basisOf(sourcesFor(p, sources));
        return { ...t, ...(basis.length ? { basis } : {}) };
      });
    }
  }

  // A long passage's own requests, put together like a live translation.
  const single = new Map<string, Array<[string, TranslationJobRecord["manifest"][string]]>>();
  for (const [id, entry] of Object.entries(job.manifest)) {
    if (entry.key === "group") continue;
    const ref = entry.passages[0].ref;
    single.set(ref, [...(single.get(ref) ?? []), [id, entry]]);
  }
  for (const items of single.values()) {
    const entry = items[0][1];
    const [p] = await current(entry.passages);
    if (!p) {
      report.skipped++;
      continue;
    }
    const want: TranslateWant = { general: entry.general, words: entry.words };
    const plan = planTranslation({ ...inputOf(p), sources: await gatherSources(store, p) }, want, job.model);
    const results = new Map<string, JobResult>();
    for (const [id, e] of items) {
      const a = answers.get(id);
      results.set(e.key, a?.text !== undefined ? { text: a.text, model: a.model } : { error: a?.error ?? "no answer" });
    }
    await keep(p, entry.passages[0].check, () => assembleTranslation(plan, results));
  }
  return report;
}
