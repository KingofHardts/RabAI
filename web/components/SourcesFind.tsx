"use client";

import { useState } from "react";
import { fold } from "@/lib/sources/fold";

/**
 * The search box on the Sources page. The list itself is drawn on the server; this only hides
 * the entries that don't match, searching each entry's own words (so the list isn't sent twice).
 */
export function SourcesFind({ listId }: { listId: string }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<number | null>(null);

  function apply(value: string): number | null {
    const root = document.getElementById(listId);
    if (!root) return null;
    const words = fold(value).split(" ").filter(Boolean);
    let count = 0;
    for (const el of root.querySelectorAll<HTMLElement>("[data-find]")) {
      // Each entry's own words, folded once and kept.
      if (!el.dataset.find) el.dataset.find = fold(el.textContent ?? "");
      const match = words.every((w) => el.dataset.find!.includes(w));
      el.hidden = !match;
      if (match) count++;
    }
    // A shelf, an area or a section with nothing left in it is hidden too.
    for (const group of root.querySelectorAll<HTMLElement>("[data-group]")) {
      group.hidden = words.length > 0 && !group.querySelector("[data-find]:not([hidden])");
    }
    if (words.length) for (const d of root.querySelectorAll("details")) d.open = true;
    return words.length ? count : null;
  }

  return (
    <div className="sources-find" role="search">
      <label htmlFor="sources-find-input">Find a book, an author or a translation</label>
      <input
        id="sources-find-input"
        type="search"
        value={query}
        placeholder="For example: Mishnah Berurah, Ramban, Schottenstein"
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setFound(apply(e.target.value));
        }}
      />
      <p className="muted" aria-live="polite">
        {found === null ? "" : found === 0 ? "Nothing on the list matches." : `${found} ${found === 1 ? "match" : "matches"}`}
      </p>
    </div>
  );
}
