"use client";

import { useEffect, useRef, useState } from "react";
import type { ArticleListing, ArticleShelf } from "@/lib/library/types";

/*
 * Articles from the website collections (Aish.com and the like), by section: each section with how
 * many articles it holds, then its articles, newest first, fifty at a time, and a search over their
 * titles and text. An article opens in the reader like any text. The collections are copied by the
 * sites' written permission for private study, and like everything in the testing library they are
 * not yet reviewed by the board.
 */

interface Props {
  shelves: ArticleShelf[];
  onRead: (ref: string) => void;
  onBack: () => void;
}

/** "Aish.com: Ask the Rabbi" -> "Ask the Rabbi". */
function shelfName(shelf: ArticleShelf): string {
  return shelf.title.startsWith(`${shelf.site}: `) ? shelf.title.slice(shelf.site.length + 2) : shelf.title;
}

function year(iso?: string): string {
  return iso && /^\d{4}/.test(iso) ? iso.slice(0, 4) : "";
}

function ArticleRows({ items, onRead, fallback }: { items: ArticleListing[]; onRead: (ref: string) => void; fallback: string }) {
  return (
    <div className="lib-rows article-rows">
      {items.map((a) => (
        <button key={a.title} type="button" className="lib-row" onClick={() => onRead(a.firstRef)}>
          <span className="lr-t">{a.name}</span>
          <span className="lr-sub">{[a.shelf, a.author, year(a.published)].filter(Boolean).join(" · ") || fallback}</span>
        </button>
      ))}
    </div>
  );
}

export default function ArticleShelves({ shelves, onRead, onBack }: Props) {
  const [open, setOpen] = useState<ArticleShelf | null>(null);
  const [items, setItems] = useState<ArticleListing[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ q: string; items: ArticleListing[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const asked = useRef("");
  const sites = [...new Set(shelves.map((s) => s.site))];

  // Search as the person types, after a short pause; only the latest search's answer is shown.
  useEffect(() => {
    const q = query.trim();
    asked.current = q;
    if (q.length < 2) {
      setFound(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/articles?q=${encodeURIComponent(q)}`);
        const j = (await r.json()) as { articles?: ArticleListing[]; error?: string };
        if (asked.current !== q) return;
        if (!r.ok || !j.articles) throw new Error(j.error ?? "The articles couldn't be searched just now.");
        setFound({ q, items: j.articles });
        setError(null);
      } catch (err) {
        if (asked.current === q) setError(err instanceof Error ? err.message : "The articles couldn't be searched just now.");
      } finally {
        if (asked.current === q) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  async function load(shelf: ArticleShelf, offset: number) {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/articles?work=${encodeURIComponent(shelf.work)}&offset=${offset}`);
      const j = (await r.json()) as { articles?: ArticleListing[]; more?: boolean; error?: string };
      if (!r.ok || !j.articles) throw new Error(j.error ?? "The articles couldn't be listed just now.");
      setItems((prev) => (offset ? [...prev, ...j.articles!] : j.articles!));
      setMore(Boolean(j.more));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The articles couldn't be listed just now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void load(open, 0);
  }, [open]);

  if (open) {
    return (
      <div className="thread learn-screen">
        <button type="button" className="link back-link" onClick={() => setOpen(null)}>
          ← Articles
        </button>
        <h2 className="screen-h">{shelfName(open)}</h2>
        <p className="muted">
          {open.count.toLocaleString()} articles from {open.site}, newest first.
        </p>
        {error && (
          <p className="note" role="alert">
            {error}
          </p>
        )}
        <ArticleRows items={items.map((a) => ({ ...a, shelf: undefined }))} onRead={onRead} fallback={open.site} />
        {loading ? (
          <p className="thinking">
            Opening the list<span className="dots" />
          </p>
        ) : (
          more && (
            <button type="button" className="btn" onClick={() => void load(open, items.length)}>
              Show more
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <div className="thread learn-screen">
      <button type="button" className="link back-link" onClick={onBack}>
        ← The library
      </button>
      <h2 className="screen-h">Articles</h2>
      <p className="muted">
        Articles by today’s teachers, from {sites.join(" and ")}, used by the sites’ written permission for private study. Not
        yet reviewed by the rabbinic board.
      </p>
      <label className="sr-only" htmlFor="article-search">
        Search the articles by their titles and words
      </label>
      <input
        id="article-search"
        className="book-filter"
        type="search"
        value={query}
        placeholder="Search the articles: Shabbat candles, honoring parents…"
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {error && (
        <p className="note" role="alert">
          {error}
        </p>
      )}
      {query.trim().length >= 2 ? (
        <div aria-live="polite">
          {searching && !found ? (
            <p className="thinking">
              Searching<span className="dots" />
            </p>
          ) : found ? (
            <>
              <p className="muted">
                {found.items.length === 0
                  ? `No articles found for “${found.q}”.`
                  : `${found.items.length === 40 ? "The first 40" : found.items.length} ${
                      found.items.length === 1 ? "article" : "articles"
                    } for “${found.q}”, title matches first.`}
              </p>
              <ArticleRows items={found.items} onRead={onRead} fallback={sites[0] ?? ""} />
            </>
          ) : null}
        </div>
      ) : (
        <div className="lib-rows">
          {shelves.map((s) => (
            <button key={`${s.site}|${s.work}`} type="button" className="lib-row" onClick={() => setOpen(s)}>
              <span className="lr-t">{shelfName(s)}</span>
              <span className="lr-sub">
                {s.count.toLocaleString()} {s.count === 1 ? "article" : "articles"} · {s.site}
              </span>
              <span className="lr-chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
