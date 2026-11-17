"use client";

import { useEffect, useState } from "react";
import { foldPrayer, prayerNames, usualPrayerName } from "@/lib/library/prayer-find";
import type { OutlineCategory } from "@/lib/siddur/outline";

/** A heading inside a section, with the line it opens. */
interface Heading {
  ref: string;
  en: string;
  he: string;
}

const headingCache = new Map<string, Promise<Heading[]>>();

/** The headings printed inside a siddur's sections, fetched once per siddur. */
function headingsOf(book: string): Promise<Heading[]> {
  let p = headingCache.get(book);
  if (!p) {
    p = fetch(`/api/siddur/headings?book=${encodeURIComponent(book)}`)
      .then((r) => (r.ok ? r.json() : { headings: [] }))
      .then((j: { headings?: Heading[] }) => j.headings ?? [])
      .catch(() => {
        headingCache.delete(book);
        return [];
      });
    headingCache.set(book, p);
  }
  return p;
}

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
  book,
}: {
  outline: OutlineCategory[];
  /** The section being davened now, if any. */
  current?: string;
  onOpen: (section: string) => void;
  /** A category to start open when nothing is being davened ("weekday", "shabbat"). */
  startOpen?: string;
  /** Offer a box that finds a prayer by name anywhere in the siddur. */
  search?: boolean;
  /** The siddur, so the search can also find the headings inside its prayers. */
  book?: string;
}) {
  const holding = outline.find((c) => c.groups.some((g) => g.items.some((i) => i.section === current)))?.id;
  const [open, setOpen] = useState<string | null>(holding ?? startOpen ?? null);
  const [query, setQuery] = useState("");
  const [headings, setHeadings] = useState<Heading[]>([]);
  useEffect(() => {
    if (!search || !book || !query.trim()) return;
    let live = true;
    void headingsOf(book).then((h) => live && setHeadings(h));
    return () => {
      live = false;
    };
  }, [search, book, query]);
  const q = foldPrayer(query);
  // Every way the prayer typed is called ("Al HaMichya" is also "Me'ein Shalosh"), and the words
  // themselves: a name matches when it holds one of the names, or every word typed.
  const names = q ? [...new Set([q, ...prayerNames(query)])] : [];
  const words = q.split(" ").filter(Boolean);
  const matches = (text: string) => {
    const hay = ` ${foldPrayer(text)} `;
    return names.some((n) => n.length >= 3 && hay.includes(` ${n}`)) || words.every((w) => hay.includes(w));
  };
  const sectionTitle = new Map(outline.flatMap((cat) => cat.groups.flatMap((g) => g.items.map((i) => [i.section, { title: i.title, where: [cat.title, g.title].filter(Boolean).join(" · ") }] as const))));
  const inSections = q
    ? outline.flatMap((cat) =>
        cat.groups.flatMap((g) =>
          g.items.filter((i) => matches(`${i.title} ${i.own ?? ""} ${i.note ?? ""}`)).map((i) => ({ key: i.section, open: i.section, title: i.title, own: i.own, where: [cat.title, g.title].filter(Boolean).join(" · ") })),
        ),
      )
    : [];
  // A heading inside a prayer ("Al HaMiḥya" inside Birkat HaMazon), when the prayer itself isn't found by that name.
  const inHeadings = q
    ? headings
        .filter((h) => matches(`${h.en} ${h.he}`))
        .flatMap((h) => {
          const section = h.ref.replace(/\s+\d+$/, "");
          const owner = sectionTitle.get(section);
          if (!owner || inSections.some((x) => x.open === section && foldPrayer(x.title) === foldPrayer(h.en))) return [];
          const heading = h.en.replace(/\s+-+\s+/g, " – ");
          // "Blessing After Food – Al Hamiḥya" is found and shown by its usual name, "Al HaMichya".
          const usual = heading.includes(" – ") ? usualPrayerName(heading) : null;
          return [{ key: h.ref, open: h.ref, title: usual ?? heading, own: usual ? heading : undefined, where: usual ? `${heading} · in ${owner.title}` : `In ${owner.title}` }];
        })
    : [];
  const found = [...inSections, ...inHeadings].slice(0, 40);
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
            <li key={item.key}>
              <button type="button" className="so-item" title={item.own ? `In this siddur: ${item.own}` : undefined} onClick={() => onOpen(item.open)}>
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
