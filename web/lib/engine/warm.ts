/*
 * Warming RabbAI's caches before the first question (prompt caching's "pre-warming"): the long
 * instructions (the core premises, and the lookup step's catalog of every book) are read once and
 * kept for an hour, so the person's first question doesn't wait for them. A warm-up request asks
 * for no answer (max_tokens 0) and carries nothing about the person: only the instructions and the
 * word "warmup".
 */

import Anthropic from "@anthropic-ai/sdk";
import { CORE_PREMISES } from "./core-premises.generated";
import { APP_INSTRUCTIONS, engineConfig, modelFor } from "./answer";
import { lookupModel, lookupRequest } from "./lookup";
import type { TestingStore } from "../library/testing";

export type WarmKind = "talk" | "ask";

/** When each kind was last warmed by this server; a warm-up within ten minutes is skipped. */
const lastWarm = new Map<WarmKind, number>();
export const WARM_EVERY_MS = 10 * 60_000;

export function shouldWarm(kind: WarmKind, now = Date.now()): boolean {
  const at = lastWarm.get(kind);
  return at === undefined || now - at >= WARM_EVERY_MS;
}

/**
 * The requests that warm the caches for a kind of question: the lookup step's catalog, and the
 * answering model's instructions with the same model, thinking and effort as the real requests
 * (all of them are part of what is cached).
 */
export function warmRequests(kind: WarmKind, catalog: string | null) {
  const config = engineConfig();
  const chosen = modelFor(kind === "talk" ? { talking: true } : {}, config);
  const answer = {
    model: chosen.model,
    max_tokens: 0,
    thinking: { type: "adaptive" as const },
    output_config: { effort: chosen.effort },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
    system: [
      { type: "text" as const, text: CORE_PREMISES },
      { type: "text" as const, text: APP_INSTRUCTIONS, cache_control: { type: "ephemeral" as const, ttl: config.cacheTtl ?? "1h" } },
    ],
    messages: [{ role: "user" as const, content: "warmup" }],
  };
  const plan = catalog ? { ...lookupRequest("warmup", catalog, lookupModel()), max_tokens: 0 } : null;
  return { answer, plan };
}

/** Warm the caches for a kind of question. Never throws; says what it warmed. */
export async function warmCaches(kind: WarmKind, store: TestingStore | null, apiKey = process.env.ANTHROPIC_API_KEY): Promise<string[]> {
  if (!apiKey || !shouldWarm(kind)) return [];
  lastWarm.set(kind, Date.now());
  const client = new Anthropic({ apiKey });
  let catalog: string | null = null;
  try {
    catalog = store ? await store.catalog() : null;
  } catch {
    catalog = null;
  }
  const { answer, plan } = warmRequests(kind, catalog);
  const warmed: string[] = [];
  await Promise.all([
    client.beta.messages
      .create(answer as Parameters<typeof client.beta.messages.create>[0])
      .then(() => warmed.push("instructions"))
      .catch((err) => console.warn("[rabai] warming the instructions failed:", err instanceof Error ? err.message.slice(0, 120) : err)),
    plan
      ? client.beta.messages
          .create(plan as Parameters<typeof client.beta.messages.create>[0])
          .then(() => warmed.push("catalog"))
          .catch((err) => console.warn("[rabai] warming the catalog failed:", err instanceof Error ? err.message.slice(0, 120) : err))
      : Promise.resolve(),
  ]);
  return warmed;
}
