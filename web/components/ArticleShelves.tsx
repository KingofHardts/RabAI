"use client";

import { useEffect, useState } from "react";
import type { ArticleListing, ArticleShelf } from "@/lib/library/types";

/*
 * Articles from the website collections (Aish.com and the like), by section: each section with how
 * many articles it holds, then its articles, newest first, fifty at a time. An article opens in the
 * reader like any text. The collections are copied by the sites' written permission for private
 * study, and like everything in the testing library they are not yet reviewed by the board.
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

export default function ArticleShelves({ shelves, onRead, onBack }: Props) {
  const [open, setOpen] = useState<ArticleShelf | null>(null);
  const [items, setItems] = useState<ArticleListing[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sites = [...new Set(shelves.map((s) => s.site))];

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
        <div className="lib-rows article-rows">
          {items.map((a) => (
            <button key={a.title} type="button" className="lib-row" onClick={() => onRead(a.firstRef)}>
              <span className="lr-t">{a.name}</span>
              <span className="lr-sub">{[a.author, year(a.published)].filter(Boolean).join(" · ") || open.site}</span>
            </button>
          ))}
        </div>
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
    </div>
  );
}
