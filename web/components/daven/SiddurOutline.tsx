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
}: {
  outline: OutlineCategory[];
  /** The section being davened now, if any. */
  current?: string;
  onOpen: (section: string) => void;
  /** A category to start open when nothing is being davened ("weekday", "shabbat"). */
  startOpen?: string;
}) {
  const holding = outline.find((c) => c.groups.some((g) => g.items.some((i) => i.section === current)))?.id;
  const [open, setOpen] = useState<string | null>(holding ?? startOpen ?? null);
  return (
    <div className="so">
      {outline.map((cat) => {
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
