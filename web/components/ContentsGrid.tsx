"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { sectionLabel } from "@/lib/library/catalog";
import { contentsTree, holdsSection, isShortLabel, sectionCount, type ContentsNode } from "@/lib/library/contents-tree";

/*
 * A book's pages or chapters as a grid of buttons, from /api/contents. Used by the reader's and the
 * printed page's contents menus and by a book's page in the library. Each book is fetched once.
 * When its sections are named in several parts (a siddur's "Weekday, Shacharit, Modeh Ani"), they
 * are shown as an outline instead: the shared parts as headings, the last part on each button
 * (lib/library/contents-tree.ts).
 */

type Listing = { sections: string[] } | { error: string };

const cache = new Map<string, Promise<Listing>>();

/** A book's sections, fetched once (also used by the Learn search to find prayers in the siddurs). */
export function listBook(book: string): Promise<Listing> {
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
  const tree = useMemo(
    () =>
      value && "sections" in value ? contentsTree(value.sections.map((section) => ({ section, label: sectionLabel(book, section) }))) : null,
    [value, book],
  );
  if (!value)
    return (
      <p className="muted">
        {loadingText}
        <span className="dots" />
      </p>
    );
  if ("error" in value) return <p className="muted">{value.error}</p>;
  if (!value.sections.length) return <p className="muted">This book has no sections listed in the library.</p>;
  if (tree) return <ContentsOutline key={book} nodes={tree} current={current} onOpen={onOpen} className={className} />;
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

/** The outline: each top part folds open; under it, headings and short buttons in reading order. */
function ContentsOutline({
  nodes,
  current,
  onOpen,
  className,
}: {
  nodes: ContentsNode[];
  current?: string;
  onOpen: (section: string) => void;
  className?: string;
}) {
  // The part holding the open section starts open; with none, the first part does.
  const [open, setOpen] = useState<Set<string>>(() => {
    const at = nodes.find((n) => holdsSection(n, current)) ?? nodes.find((n) => n.children.length);
    return new Set(at ? [at.name] : []);
  });
  const toggle = (name: string, isOpen: boolean) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(name);
      else next.delete(name);
      return next;
    });

  const chip = (n: ContentsNode) => (
    <button
      key={`${n.name}|${n.section}`}
      type="button"
      className={`toc-chip${isShortLabel(n.name) ? " short" : ""}`}
      aria-current={n.section === current ? "page" : undefined}
      onClick={() => n.section && onOpen(n.section)}
    >
      {n.name}
    </button>
  );

  /** Children in order: runs of plain sections as a row of buttons, headings with what is under them. */
  const body = (children: ContentsNode[], depth: number): ReactNode[] => {
    const out: ReactNode[] = [];
    let run: ContentsNode[] = [];
    const flush = () => {
      if (run.length) out.push(<div key={`run-${out.length}`} className="toc-chips">{run.map(chip)}</div>);
      run = [];
    };
    for (const c of children) {
      if (!c.children.length) {
        run.push(c);
        continue;
      }
      flush();
      out.push(
        <div key={`sub-${c.name}`} className={`toc-sub depth-${Math.min(depth, 3)}`}>
          <p className="toc-sub-head">
            {c.section ? (
              <button type="button" className="link" aria-current={c.section === current ? "page" : undefined} onClick={() => onOpen(c.section!)}>
                {c.name}
              </button>
            ) : (
              c.name
            )}
          </p>
          {body(c.children, depth + 1)}
        </div>,
      );
    }
    flush();
    return out;
  };

  const top: ReactNode[] = [];
  let loose: ContentsNode[] = [];
  const flushLoose = () => {
    if (loose.length) top.push(<div key={`loose-${top.length}`} className="toc-chips">{loose.map(chip)}</div>);
    loose = [];
  };
  for (const n of nodes) {
    if (!n.children.length) {
      loose.push(n);
      continue;
    }
    flushLoose();
    const isOpen = open.has(n.name);
    top.push(
      <details key={n.name} className="toc-group" open={isOpen} onToggle={(e) => toggle(n.name, (e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <span className="toc-group-name">{n.name}</span>
          <span className="toc-group-count">{sectionCount(n)}</span>
        </summary>
        <div className="toc-group-body">
          {n.section && (
            <div className="toc-chips">
              <button type="button" className="toc-chip" aria-current={n.section === current ? "page" : undefined} onClick={() => onOpen(n.section!)}>
                Start of {n.name}
              </button>
            </div>
          )}
          {isOpen && body(n.children, 1)}
        </div>
      </details>,
    );
  }
  flushLoose();
  return <div className={`toc-outline${className ? ` ${className}` : ""}`}>{top}</div>;
}
