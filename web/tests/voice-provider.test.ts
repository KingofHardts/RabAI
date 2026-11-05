import { test } from "node:test";
import assert from "node:assert/strict";

/*
 * RabbAI's own voice: a turn in a conversation (Talk) asks for the quick model, streamed, and falls
 * back to the usual model when the quick one can't be used. No real service is called.
 */

type Call = { url: string; body: Record<string, unknown> };

async function withFetch(statuses: number[], run: (calls: Call[]) => Promise<void>) {
  const calls: Call[] = [];
  const real = globalThis.fetch;
  const before = { key: process.env.ELEVENLABS_API_KEY, model: process.env.ELEVENLABS_MODEL, talk: process.env.ELEVENLABS_TALK_MODEL };
  process.env.ELEVENLABS_API_KEY = "test";
  delete process.env.ELEVENLABS_MODEL;
  delete process.env.ELEVENLABS_TALK_MODEL;
  let i = 0;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
    const status = statuses[Math.min(i++, statuses.length - 1)];
    return new Response(status === 200 ? new Uint8Array([1, 2, 3]) : "no", { status });
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = real;
    for (const [k, v] of [
      ["ELEVENLABS_API_KEY", before.key],
      ["ELEVENLABS_MODEL", before.model],
      ["ELEVENLABS_TALK_MODEL", before.talk],
    ] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("a conversation's turn uses the quick model, streamed; an answer read aloud uses the usual one", async () => {
  // Load after the environment is set, so nothing is remembered from another test.
  const { synthesize } = await import(`../lib/voice/provider.ts?fresh=${Date.now()}`);
  await withFetch([200], async (calls) => {
    await synthesize("elevenlabs", { text: "Let's read it.", voice: "v1", group: "men", fast: true });
    assert.match(calls[0].url, /\/v1\/text-to-speech\/v1\/stream\?/);
    assert.equal(calls[0].body.model_id, "eleven_flash_v2_5");
    assert.equal((calls[0].body.voice_settings as { speed: number }).speed, 0.98);
  });
  await withFetch([200], async (calls) => {
    await synthesize("elevenlabs", { text: "Let's read it.", voice: "v1", group: "men" });
    assert.doesNotMatch(calls[0].url, /\/stream/);
    assert.equal(calls[0].body.model_id, "eleven_v4");
  });
});

test("when the quick model can't be used, the usual one reads instead", async () => {
  const { synthesize } = await import(`../lib/voice/provider.ts?fresh=${Date.now()}b`);
  await withFetch([422, 422, 200], async (calls) => {
    await synthesize("elevenlabs", { text: "Let's read it.", voice: "v1", group: "men", fast: true });
    assert.equal(calls.length, 3);
    assert.equal(calls[2].body.model_id, "eleven_v4");
    assert.doesNotMatch(calls[2].url, /\/stream/);
  });
});
