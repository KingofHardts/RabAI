import { NextResponse } from "next/server";
import { libraryMode } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";
import { endingMeaning, prefixParts, type WordEntry } from "@/lib/library/word-parts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How each dictionary is named to the person, and whether it is a word tool only. */
const DICTIONARIES: Record<string, { name: string; note?: string }> = {
  Jastrow: {
    name: "Jastrow's dictionary",
    note: "Its author was not Orthodox. RabAI uses it only for what words mean.",
  },
  "Sefer HaShorashim": { name: "The Radak's Sefer HaShorashim" },
};

/**
 * GET /api/word?w=ובראשית → the entries the library's dictionaries have for this word, with
 * how the word was read to find each one. No AI is involved; RabAI explains a word only when
 * the person asks.
 */
export async function GET(request: Request) {
  const word = (new URL(request.url).searchParams.get("w") ?? "").trim().slice(0, 40);
  if (!/[א-ת]/.test(word)) return NextResponse.json({ error: "Which word?" }, { status: 400 });

  if (libraryMode() !== "testing") {
    return NextResponse.json({ word, available: false, entries: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const store = testingStore();
  if (!store) return NextResponse.json({ word, available: false, entries: [] });

  try {
    const found = await store.wordEntries(word, 8);
    const entries: WordEntry[] = found.map((p) => {
      const book = p.source?.book ?? p.ref.split(",")[0];
      const dict = DICTIONARIES[book] ?? { name: book };
      const english = p.en.trim();
      return {
        dictionary: dict.name,
        note: p.source?.wordToolOnly ? (dict.note ?? "RabAI uses this dictionary only for what words mean.") : dict.note,
        headword: p.ref.includes(", ") ? p.ref.slice(p.ref.indexOf(", ") + 2) : p.ref,
        ref: p.ref,
        text: english || p.he,
        lang: english ? "en" : "he",
        found: {
          form: p.reading.form,
          prefix: prefixParts(p.reading.prefix),
          suffix: p.reading.suffix,
          suffixMeaning: endingMeaning(p.reading.suffix),
          ...(p.reading.guess ? { guess: p.reading.guess } : {}),
        },
      };
    });
    return NextResponse.json({ word, available: true, entries }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (err) {
    console.error("[rabai] word lookup failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The dictionaries couldn't be reached just now." }, { status: 502 });
  }
}
