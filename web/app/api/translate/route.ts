import { NextResponse } from "next/server";
import { libraryMode } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { plainText } from "@/lib/library/daf";
import { anthropicClient } from "@/lib/engine/answer";
import { mergeTranslations, translatePassage } from "@/lib/engine/translate";
import { gatherSources } from "@/lib/engine/translate-sources";
import type { Translation } from "@/lib/engine/gloss";
import { textCheck, translationStore } from "@/lib/library/translations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Translations this server instance has seen, so a passage isn't looked up twice in a row. */
const seen = new Map<string, { t: Translation; check: string; hasEnglish: boolean }>();
const MAX_KEPT = 300;

const FAILED = "RabAI couldn't translate this just now. Please try again.";

/** Whether a kept translation already has what was asked for. */
function enough(t: Translation, hasEnglish: boolean, words: boolean): boolean {
  return (hasEnglish || t.general !== null) && (!words || t.words !== undefined);
}

/**
 * POST /api/translate {"ref": "Rashi on Berakhot 2a:1:1", "context": ["Berakhot 2a:1"], "words": true}
 * → RabAI's translation of the passage: a general translation when the library has no English, and,
 * with "words", word by word. Called only when the person taps Translate or Word by word.
 *
 * Translations are kept in RabAI's translation library (when the app is connected to it), so a
 * passage is translated once for everyone; a kept translation is used only if it was made from the
 * same text. `context` names up to two passages (the line before a line of Gemara) to read it with.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send JSON: {"ref": "Berakhot 2a:1"}' }, { status: 400 });
  }
  const raw = (body ?? {}) as { ref?: unknown; context?: unknown; words?: unknown };
  const ref = String(raw.ref ?? "").trim().slice(0, 160);
  if (!ref) return NextResponse.json({ error: "Which passage?" }, { status: 400 });
  const words = raw.words === true;
  const context = (Array.isArray(raw.context) ? raw.context : [])
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0 && r !== ref)
    .map((r) => r.trim().slice(0, 160))
    .slice(0, 2);

  if (libraryMode() !== "testing") return NextResponse.json({ error: "Translating needs the full library." }, { status: 404 });
  const store = testingStore();
  if (!store) return NextResponse.json({ error: "The library isn't connected right now." }, { status: 503 });

  try {
    const passage = (await store.exact([ref])).find((p) => p.ref === ref);
    const he = passage ? plainText(passage.he) : "";
    if (!passage || !he) return NextResponse.json({ error: `${ref} isn't in the library.` }, { status: 404 });
    const en = plainText(passage.en);
    const hasEnglish = !!en.trim();
    const check = textCheck(he);

    const recent = seen.get(ref);
    if (recent && recent.check === check && enough(recent.t, hasEnglish, words)) return NextResponse.json(recent.t);

    // RabAI's translation library: made once, kept for everyone.
    const library = translationStore();
    let kept: Translation | undefined;
    if (library) {
      try {
        const k = (await library.get([ref])).get(ref);
        if (k && k.check === check) kept = k.translation;
      } catch (err) {
        console.warn("[rabai] translation library unavailable:", err instanceof Error ? err.message : err);
      }
    }
    if (kept && enough(kept, hasEnglish, words)) {
      remember(ref, kept, check, hasEnglish);
      return NextResponse.json(kept);
    }

    const client = anthropicClient();
    if (!client) return NextResponse.json({ error: "This build isn't connected to its AI model yet." }, { status: 503 });
    const want = { general: !hasEnglish && !kept?.general, words: words && kept?.words === undefined };
    const sources = await gatherSources(store, passage, context);
    const made = await translatePassage({ ref, he, en, sources }, client, want);
    const result = mergeTranslations(kept, made);
    if (library) {
      try {
        await library.put(result, check, "request");
      } catch (err) {
        console.warn("[rabai] couldn't keep the translation:", err instanceof Error ? err.message : err);
      }
    }
    remember(ref, result, check, hasEnglish);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[rabai] translation failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: FAILED }, { status: 502 });
  }
}

function remember(ref: string, t: Translation, check: string, hasEnglish: boolean) {
  if (seen.size >= MAX_KEPT) seen.delete(seen.keys().next().value!);
  seen.set(ref, { t, check, hasEnglish });
}
