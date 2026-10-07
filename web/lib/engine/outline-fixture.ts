import { readFile } from "node:fs/promises";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { ModelClient } from "./answer";

/*
 * For trying the colored outline on a computer without calling the model: RABAI_OUTLINE_FIXTURE
 * names a file holding a model's reply (with "{section}" in the name standing for the page, as in
 * "/tmp/outline-{section}.txt"). The reply is then read and checked exactly as a real one is.
 *
 * Never on a deployment: it is ignored whenever VERCEL is set, and in a production build.
 */
export function outlineFixtureClient(section: string, env: Record<string, string | undefined> = process.env): ModelClient | null {
  const path = env.RABAI_OUTLINE_FIXTURE;
  if (!path || env.VERCEL || env.NODE_ENV === "production") return null;
  return {
    create: async () => {
      const text = await readFile(path.replaceAll("{section}", section), "utf8");
      return { model: "fixture", content: [{ type: "text", text }] } as unknown as BetaMessage;
    },
  };
}
