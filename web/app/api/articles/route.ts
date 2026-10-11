import { NextResponse } from "next/server";
import { loadLibrary } from "@/lib/library";
import { testingStore } from "@/lib/library/testing";

export const runtime = "nodejs";

const PAGE = 50;

/**
 * GET /api/articles?work=aish-ask-the-rabbi&offset=0 → one section of a website collection, newest
 * first, fifty at a time. The collections are private and never open on a public app.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const work = (params.get("work") ?? "").slice(0, 120);
  const offset = Math.max(0, Math.min(1_000_000, Number(params.get("offset")) || 0));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(work)) return NextResponse.json({ error: "Which section? Pass ?work=" }, { status: 400 });
  const store = loadLibrary().mode === "testing" ? testingStore() : null;
  if (!store) return NextResponse.json({ error: "The articles aren't connected right now." }, { status: 503 });
  try {
    const articles = await store.articleList(work, offset, PAGE + 1);
    return NextResponse.json({ articles: articles.slice(0, PAGE), more: articles.length > PAGE });
  } catch (err) {
    console.error("[rabai] listing articles failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The articles couldn't be listed just now." }, { status: 502 });
  }
}
