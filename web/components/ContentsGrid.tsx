"use client";

import { useEffect, useState } from "react";
import { sectionLabel } from "@/lib/library/catalog";

/*
 * A book's pages or chapters as a grid of buttons, from /api/contents. Used by the reader's and the
 * printed page's contents menus and by a book's page in the library. Each book is fetched once.
 */

type Listing = { sections: string[] } | { error: string };

const cache = new Map<string, Promise<Listing>>();

function listBook(book: string): Promise<Listing> {
  let found = cache.get(book);
  if (!found) {
    found = fetch(`/api/contents?book=${encodeURIComponent(book)}`)
      .then((r) => r.json())
      .then((j: { sections?: string[]; error?: string }) =>
        j.sections ? { sections: j.sections } : { error: j.error ?? "The contents couldn't be loaded." },
      )
      .catch(() => ({ error: "The contents couldn't be loaded." }));
    cache.set(book, found);
    // A failure can be tried again later.
    void found.then((l) => {
      if ("error" in l) cache.delete(book);
    });
  }
  return found;
}

export default function ContentsGrid({
  book,
  current,
  onOpen,
  loadingText = "Loading the contents",
  className,
}: {
  book: string;
  /** The section that is open now, marked in the grid. */
  current?: string;
  onOpen: (section: string) => void;
  loadingText?: string;
  className?: string;
}) {
  const [listing, setListing] = useState<{ book: string; value: Listing } | null>(null);
  useEffect(() => {
    let live = true;
    void listBook(book).then((value) => {
      if (live) setListing({ book, value });
    });
    return () => {
      live = false;
    };
  }, [book]);

  const value = listing?.book === book ? listing.value : null;
  if (!value)
    return (
      <p className="muted">
        {loadingText}
        <span className="dots" />
      </p>
    );
  if ("error" in value) return <p className="muted">{value.error}</p>;
  if (!value.sections.length) return <p className="muted">This book has no sections listed in the library.</p>;
  return (
    <div className={`toc-grid${className ? ` ${className}` : ""}`}>
      {value.sections.map((sec) => (
        <button key={sec} type="button" aria-current={sec === current ? "page" : undefined} onClick={() => onOpen(sec)}>
          {sectionLabel(book, sec)}
        </button>
      ))}
    </div>
  );
}
