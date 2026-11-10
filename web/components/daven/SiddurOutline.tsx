"use client";

import { useState } from "react";
import type { OutlineCategory } from "@/lib/siddur/outline";

/*
 * The whole siddur as an outline (lib/siddur/outline.ts): its categories, each opening to its
 * headings and their prayers in the order they are said. The category holding the prayer that is
 * open starts open, and that prayer is marked.
 */
export default function SiddurOutline({
  outline,
  current,
  onOpen,
  startOpen,
  search,
}: {
  outline: OutlineCategory[];
  /** The section being davened now, if any. */
  current?: string;
  onOpen: (section: string) => void;
  /** A category to start open when nothing is being davened ("weekday", "shabbat"). */
  startOpen?: string;
  /** Offer a box that finds a prayer by name anywhere in the siddur. */
  search?: boolean;
}) {
  const holding = outline.find((c) => c.groups.some((g) => g.items.some((i) => i.section === current)))?.id;
  const [open, setOpen] = useState<string | null>(holding ?? startOpen ?? null);
  const [query, setQuery] = useState("");
  const fold = (t: string) => t.toLowerCase().replace(/[’'`\-]/g, "").replace(/[^a-z0-9\u0590-\u05ff]+/g, " ").trim();
  const q = fold(query);
  // A prayer whose name (the app's or the siddur's own) or the few words about it hold every word
  // typed, in the order the siddur has them.
  const found = q
    ? outline
        .flatMap((cat) =>
          cat.groups.flatMap((g) =>
            g.items
              .filter((i) => {
                const hay = fold(`${i.title} ${i.own ?? ""} ${i.note ?? ""}`);
                return q.split(" ").every((w) => hay.includes(w));
              })
              .map((i) => ({ ...i, where: [cat.title, g.title].filter(Boolean).join(" · ") })),
          ),
        )
        .slice(0, 40)
    : [];
  return (
    <div className="so">
      {search && (
        <div className="so-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a prayer in this siddur"
            aria-label="Find a prayer in this siddur"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      )}
      {q && (
        <ul className="so-list so-found" aria-live="polite">
          {found.map((item) => (
            <li key={item.section}>
              <button type="button" className="so-item" title={item.own ? `In this siddur: ${item.own}` : undefined} onClick={() => onOpen(item.section)}>
                <span className="so-item-title">{item.title}</span>
                <span className="so-item-note">{item.where}</span>
              </button>
            </li>
          ))}
          {found.length === 0 && <li className="so-none">No prayer by that name in this siddur. The Learn tab&apos;s search looks in every book.</li>}
        </ul>
      )}
      {!q && outline.map((cat) => {
        const isOpen = open === cat.id;
        return (
          <section key={cat.id} className={`so-cat${isOpen ? " open" : ""}`}>
            <button type="button" className="so-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : cat.id)}>
              <span className="so-head-text">
                <span className="so-title">{cat.title}</span>
                <span className="so-note">{cat.note}</span>
              </span>
              <span className="so-count" aria-label={`${cat.count} prayers`}>
                {cat.count}
              </span>
              <span className="so-chev" aria-hidden="true">
                ›
              </span>
            </button>
            {isOpen && (
              <div className="so-body">
                {cat.groups.map((g, gi) => (
                  <div key={`${g.title}-${gi}`} className="so-group">
                    {g.title && (
                      <h4 className="so-group-h">
                        {g.title}
                        {g.note && <span className="so-group-note"> · {g.note}</span>}
                      </h4>
                    )}
                    <ul className="so-list">
                      {g.items.map((item) => (
                        <li key={item.section}>
                          <button
                            type="button"
                            className={`so-item${item.section === current ? " on" : ""}`}
                            aria-current={item.section === current ? "true" : undefined}
                            title={item.own ? `In this siddur: ${item.own}` : undefined}
                            onClick={() => onOpen(item.section)}
                          >
                            <span className="so-item-title">{item.title}</span>
                            {item.note && <span className="so-item-note">{item.note}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
