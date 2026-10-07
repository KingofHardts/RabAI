"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  buildShelves,
  commentariesOf,
  placeBooks,
  placeRef,
  searchBooks,
  shelfInfo,
  type BookSet,
  type CatalogBook,
  type PlacedBook,
  type ShelfId,
} from "@/lib/library/catalog";
import { parseAmud } from "@/lib/library/daf";

const SHELF_KEY = "rabai-shelf";

/** What is open: one book, or a collection of books (with one picked from it), shown under the group it was opened from. */
interface Picked {
  book?: string;
  set?: BookSet;
  /** The group the card opens under ("Talmud Bavli|Seder Nashim"); none for search results. */
  anchor?: string;
}

/** Words shared at the start of every name ("Mishnah ", "Mishneh Torah, "), so tiles can leave them off. */
function sharedStart(names: string[]): string {
  if (names.length < 2) return "";
  const words = names.map((n) => n.split(" "));
  let k = 0;
  while (words.every((w) => k < w.length - 1 && w[k] === words[0][k])) k += 1;
  return k ? words[0].slice(0, k).join(" ") + " " : "";
}

function trimStart(name: string, start: string): string {
  return start && name.startsWith(start) && name.length > start.length ? name.slice(start.length) : name;
}

/** Each shelf keeps one color, from the app's tones. */
const SHELF_TONES: Partial<Record<ShelfId, number>> = { tanakh: 0, mishnah: 1, talmud: 2, halacha: 3, midrash: 4, commentaries: 5 };
function shelfColor(id: ShelfId): string {
  return `var(--tone-${SHELF_TONES[id] ?? 5})`;
}

function readShelf(): ShelfId | null {
  try {
    return (window.localStorage.getItem(SHELF_KEY) as ShelfId | null) ?? null;
  } catch {
    return null;
  }
}

export default function LibraryShelves({
  books,
  label,
  pending,
  onRead,
  onPage,
  onLearn,
}: {
  books: CatalogBook[];
  /** A note shown under the search box (the testing library's label). */
  label?: string;
  pending: boolean;
  onRead: (ref: string) => void;
  onPage: (ref: string) => void;
  onLearn: (title: string) => void;
}) {
  const placed = useMemo(() => placeBooks(books), [books]);
  const shelves = useMemo(() => buildShelves(placed), [placed]);
  const byTitle = useMemo(() => new Map(placed.map((b) => [b.title, b])), [placed]);

  const [query, setQuery] = useState("");
  const [shelfId, setShelfId] = useState<ShelfId | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readShelf();
    if (stored) setShelfId(stored);
  }, []);

  const shelf = shelves.find((s) => s.id === shelfId) ?? shelves.find((s) => s.id === "talmud") ?? shelves[0];
  const part = shelf?.parts[Math.min(partIndex, shelf.parts.length - 1)];
  const search = query.trim() ? searchBooks(placed, query) : null;

  const chooseShelf = (id: ShelfId) => {
    setShelfId(id);
    setPartIndex(0);
    setPicked(null);
    try {
      window.localStorage.setItem(SHELF_KEY, id);
    } catch {
      /* the choice simply won't be remembered */
    }
  };

  // A card opened from inside another card stays where that card was.
  const open = (p: Picked) => {
    setPicked((prev) => ({ ...p, anchor: "anchor" in p ? p.anchor : prev?.anchor }));
    requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search?.books[0]) {
      e.preventDefault();
      open({ book: search.books[0].title, anchor: undefined });
    }
    if (e.key === "Escape") setQuery("");
  };

  const pickedBook = picked?.book ? byTitle.get(picked.book) : undefined;
  const anchorOf = (groupKey: string) => `${part?.name ?? ""}|${groupKey}`;
  const anchorShown = !!picked?.anchor && !!part?.groups.some((g) => anchorOf(g.key) === picked.anchor);

  /** "Read it", "See the page" and "Learn it" for one book. */
  const actions = (b: PlacedBook) => {
    const base = b.commentary?.on ? byTitle.get(b.commentary.on) : undefined;
    const bavliPage = b.part === "Talmud Bavli" ? (b.commentary ? base?.firstRef : b.firstRef) : undefined;
    return (
      <div className="follow">
        <button type="button" className="chip-btn primary" onClick={() => onRead(b.firstRef)}>
          Read it
        </button>
        {bavliPage && parseAmud(bavliPage) && (
          <button type="button" className="chip-btn" onClick={() => onPage(bavliPage)}>
            See the page
          </button>
        )}
        {base && (
          <button type="button" className="chip-btn" onClick={() => open({ book: base.title })}>
            Open {base.title}
          </button>
        )}
        <button type="button" className="chip-btn" disabled={pending} onClick={() => onLearn(b.title)}>
          Learn it with RabAI
        </button>
      </div>
    );
  };

  const bookCard = (b: PlacedBook) => {
    const commentaries = commentariesOf(placed, b.title);
    return (
      <>
        <div className="card-row">
          <h3>{b.title}</h3>
          <span className="he" lang="he" dir="rtl">
            {b.he}
          </span>
        </div>
        <p>{b.where}</p>
        {actions(b)}
        {commentaries.length > 0 && (
          <div className="book-commentaries">
            <p className="label-sm">Commentaries on {b.title} in the library</p>
            {commentaries.map((e) => (
              <div key={e.era} className="era-row">
                <span className="era">{e.name}</span>
                <div className="follow tight">
                  {e.books.map((c) => (
                    <button key={c.title} type="button" className="chip-btn" onClick={() => open({ book: c.title })} title={c.title}>
                      {c.commentary!.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  const setCard = (s: BookSet) => {
    const start = sharedStart(s.books.map((b) => b.title));
    const heStart = sharedStart(s.books.map((b) => b.he));
    return (
      <>
        <div className="card-row">
          <h3>{s.name}</h3>
          {s.he && (
            <span className="he" lang="he" dir="rtl">
              {s.he}
            </span>
          )}
        </div>
        <p>
          {s.gloss ? `${s.gloss} · ` : ""}
          {s.books.length} books
        </p>
        <div className="tiles">
          {s.books.map((b) => (
            <button key={b.title} type="button" className="tile" onClick={() => open({ book: b.title, set: s })}>
              <span>{b.commentary?.on ?? trimStart(b.title, start)}</span>
              <span className="he" lang="he" dir="rtl">
                {trimStart(b.he, heStart)}
              </span>
            </button>
          ))}
        </div>
      </>
    );
  };

  const opened = picked && (pickedBook || picked.set) && (
    <div className="card book-card" ref={cardRef}>
      <button type="button" className="link close-card" aria-label="Close" onClick={() => setPicked(null)}>
        ×
      </button>
      {pickedBook ? (
        <>
          {picked.set && (
            <button type="button" className="link back-link" onClick={() => open({ set: picked.set })}>
              ← {picked.set.name}
            </button>
          )}
          {bookCard(pickedBook)}
        </>
      ) : (
        setCard(picked.set!)
      )}
    </div>
  );

  return (
    <div className="library">
      <div className="card">
        <div className="card-row">
          <h3>The library</h3>
          <span className="he" lang="he" dir="rtl">
            ספרייה
          </span>
        </div>
        <label className="label-sm" htmlFor="book-filter">
          Find a book ({placed.length} in the library). Type any part of its name, in English or Hebrew.
        </label>
        <input
          id="book-filter"
          className="book-filter"
          type="search"
          value={query}
          placeholder="Kiddushin, Gemara Berachos, Rashi on Bereishis, משנה ברורה…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          autoComplete="off"
          spellCheck={false}
        />
        {label && <p className="note">{label}</p>}
      </div>

      {search ? (
        <div className="card">
          {search.books.length === 0 ? (
            <p>No book by that name in the library yet. Try a shorter part of the name.</p>
          ) : (
            <>
              {search.closest && <p className="note">No book has all of those words. These come closest.</p>}
              {search.place && search.books[0] && (
                <div className="follow tight">
                  <button type="button" className="chip-btn primary" onClick={() => onRead(placeRef(search.books[0], search.place!))}>
                    Open {placeRef(search.books[0], search.place)}
                  </button>
                  {search.books[0].part === "Talmud Bavli" && !search.books[0].commentary && parseAmud(placeRef(search.books[0], search.place)) && (
                    <button type="button" className="chip-btn" onClick={() => onPage(placeRef(search.books[0], search.place!))}>
                      See that page
                    </button>
                  )}
                </div>
              )}
              {search.shelf && (
                <div className="follow tight">
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => {
                      chooseShelf(search.shelf!);
                      setQuery("");
                    }}
                  >
                    Browse the {shelfInfo(search.shelf).name} shelf
                  </button>
                </div>
              )}
              <ul className="book-results">
                {search.books.map((b) => (
                  <li key={b.title}>
                    <button type="button" className="book-result" onClick={() => open({ book: b.title, anchor: undefined })}>
                      <span className="t">{b.title}</span>
                      <span className="he" lang="he" dir="rtl">
                        {b.he}
                      </span>
                      <span className="where">{b.where}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {(search || !anchorShown) && opened}

      {!search && shelf && (
        <div className="card shelf" style={{ ["--shelf" as string]: shelfColor(shelf.id) }}>
          <div className="shelf-tabs" role="tablist" aria-label="Shelves">
            {shelves.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === shelf.id}
                className="shelf-tab"
                style={{ ["--shelf" as string]: shelfColor(s.id) }}
                onClick={() => chooseShelf(s.id)}
              >
                {s.name}
                <span className="he" lang="he">
                  {s.he}
                </span>
              </button>
            ))}
          </div>

          {shelf.parts.length > 1 && (
            <div className="seg shelf-parts">
              {shelf.parts.map((p, i) => (
                <button
                  key={p.name ?? i}
                  type="button"
                  aria-pressed={p === part}
                  onClick={() => {
                    setPartIndex(i);
                    setPicked(null);
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {part?.groups.map((g) => {
            const start = sharedStart(g.books.map((b) => b.title));
            const heStart = sharedStart(g.books.map((b) => b.he));
            const anchor = anchorOf(g.key);
            const name = g.name || (part.groups.length > 1 ? "More works" : "");
            return (
              <section key={g.key || "books"} className="shelf-group">
                {name && (
                  <h4>
                    {name}
                    {g.he && (
                      <span className="he" lang="he">
                        {g.he}
                      </span>
                    )}
                  </h4>
                )}
                <div className="tiles">
                  {g.books.map((b) => (
                    <button
                      key={b.title}
                      type="button"
                      className="tile"
                      aria-pressed={pickedBook?.title === b.title}
                      onClick={() => open({ book: b.title, anchor })}
                    >
                      <span>{trimStart(b.title, start)}</span>
                      <span className="he" lang="he" dir="rtl">
                        {trimStart(b.he, heStart)}
                      </span>
                    </button>
                  ))}
                  {g.sets.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      className="tile set"
                      aria-pressed={picked?.set?.name === s.name && picked.anchor === anchor}
                      onClick={() => open({ set: s, anchor })}
                    >
                      <span>{s.name}</span>
                      <span className="count">
                        {s.gloss ? `${s.gloss} · ` : ""}
                        {s.books.length} {s.books.length === 1 ? "book" : "books"}
                      </span>
                      {s.he && (
                        <span className="he" lang="he" dir="rtl">
                          {s.he}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {picked?.anchor === anchor && opened}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
