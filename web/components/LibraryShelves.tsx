"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  buildShelves,
  commentariesOf,
  lastPlaceIn,
  MAIN_SHELVES,
  placeBooks,
  placeRef,
  searchBooks,
  sectionIn,
  sectionLabel,
  shelfInfo,
  type BookSet,
  type CatalogBook,
  type PlacedBook,
  type ShelfId,
} from "@/lib/library/catalog";
import { parseAmud } from "@/lib/library/daf";
import { whenLabel, type RecentReading } from "@/lib/saved-chats";
import ContentsGrid from "./ContentsGrid";

/*
 * The library home (docs/ui-research.md, 3.3): "Continue" cards for recent reading, a search box
 * that stays at the top, the main shelves with "More" for the rest, and a page for each book with
 * its pages or chapters to jump to. On a wide screen the shelves become a list on the left.
 */

const SHELF_KEY = "rabai-shelf";
const OPEN_AS_KEY = "rabai-open-as";

/** What is open in place of the shelf: a book's page or a collection's page. */
interface Page {
  book?: string;
  set?: BookSet;
  /** Where "Back" goes. */
  from: "shelf" | "search" | "set";
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

/** Each shelf keeps one muted color, shown only as a thin edge. */
const SHELF_TONES: Partial<Record<ShelfId, number>> = { tanakh: 0, mishnah: 1, talmud: 2, halacha: 3, midrash: 4, prayer: 5 };
function shelfColor(id: ShelfId): string {
  return `var(--shelf-${SHELF_TONES[id] ?? 6})`;
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* the choice simply won't be remembered */
  }
}

export default function LibraryShelves({
  books,
  label,
  recent,
  pending,
  onRead,
  onPage,
  onLearn,
  extras,
}: {
  books: CatalogBook[];
  /** The testing library's label, shown under the search box. */
  label?: string;
  /** Recent reading, newest first, for "Continue" and a book's "Continue at". */
  recent: RecentReading[];
  pending: boolean;
  onRead: (ref: string) => void;
  onPage: (ref: string) => void;
  onLearn: (title: string) => void;
  /** Shown at the end of the home (My words, the key words). */
  extras?: ReactNode;
}) {
  const placed = useMemo(() => placeBooks(books), [books]);
  const shelves = useMemo(() => buildShelves(placed), [placed]);
  const byTitle = useMemo(() => new Map(placed.map((b) => [b.title, b])), [placed]);

  const [query, setQuery] = useState("");
  const [shelfId, setShelfId] = useState<ShelfId | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [openAs, setOpenAs] = useState<"text" | "page">("text");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readStored(SHELF_KEY) as ShelfId | null;
    if (stored) setShelfId(stored);
    if (readStored(OPEN_AS_KEY) === "page") setOpenAs("page");
  }, []);

  const shelf = shelves.find((s) => s.id === shelfId) ?? shelves.find((s) => s.id === "talmud") ?? shelves[0];
  const part = shelf?.parts[Math.min(partIndex, shelf.parts.length - 1)];
  const search = query.trim() ? searchBooks(placed, query) : null;
  const main = shelves.filter((s) => MAIN_SHELVES.includes(s.id));
  const more = shelves.filter((s) => !MAIN_SHELVES.includes(s.id));

  /** The book a section belongs to (the longest title that holds it), for its Hebrew name. */
  const bookOf = (section: string): PlacedBook | undefined => {
    let best: PlacedBook | undefined;
    for (const b of placed) if (sectionIn(b.title, section) !== null && (!best || b.title.length > best.title.length)) best = b;
    return best;
  };

  const toTop = () =>
    requestAnimationFrame(() => {
      const el = rootRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
    });

  const chooseShelf = (id: ShelfId) => {
    setShelfId(id);
    setPartIndex(0);
    setPage(null);
    setMoreOpen(false);
    store(SHELF_KEY, id);
  };

  const open = (p: Page) => {
    setPage(p);
    toTop();
  };

  const back = () => {
    if (page?.from === "set" && page.set) setPage({ set: page.set, from: "shelf" });
    else setPage(null);
    toTop();
  };

  const chooseOpenAs = (v: "text" | "page") => {
    setOpenAs(v);
    store(OPEN_AS_KEY, v);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search?.books[0]) {
      e.preventDefault();
      if (search.place) onRead(placeRef(search.books[0], search.place));
      else open({ book: search.books[0].title, from: "search" });
    }
    if (e.key === "Escape") setQuery("");
  };

  // ------------------------------------------------------------------ a book's page

  const bookPage = (b: PlacedBook) => {
    const base = b.commentary?.on ? byTitle.get(b.commentary.on) : undefined;
    const bavli = b.part === "Talmud Bavli";
    const bavliPage = bavli ? (b.commentary ? base?.firstRef : b.firstRef) : undefined;
    const pageOk = !!bavliPage && !!parseAmud(bavliPage);
    const gridAsPage = bavli && !b.commentary && openAs === "page";
    const last = lastPlaceIn(b.title, recent);
    const commentaries = commentariesOf(placed, b.title);
    const goTo = (sec: string, asPage: boolean) => (asPage ? onPage(sec) : onRead(sec));
    const heading = bavli && !b.commentary ? "Pages (dafim)" : b.shelf === "tanakh" || b.shelf === "mishnah" ? "Chapters" : "Sections";
    return (
      <div className="book-page" aria-label={b.title}>
        <div className="bp-head">
          <h2>{b.title}</h2>
          <span className="he" lang="he" dir="rtl">
            {b.he}
          </span>
        </div>
        <p className="bp-where">{b.where}</p>
        <div className="follow">
          {last ? (
            <>
              <button type="button" className="btn primary" onClick={() => goTo(last.ref, !!last.page)}>
                Continue at {sectionIn(b.title, last.title)}
                {last.page ? " (the page)" : ""}
              </button>
              <button type="button" className="btn" onClick={() => onRead(b.firstRef)}>
                Start at the beginning
              </button>
            </>
          ) : (
            <button type="button" className="btn primary" onClick={() => onRead(b.firstRef)}>
              Start reading
            </button>
          )}
          {pageOk && (
            <button type="button" className="btn" onClick={() => onPage(bavliPage!)}>
              See the page
            </button>
          )}
          {base && (
            <button type="button" className="btn" onClick={() => open({ book: base.title, from: page?.from ?? "shelf" })}>
              Open {base.title}
            </button>
          )}
          <button type="button" className="btn quiet" disabled={pending} onClick={() => onLearn(b.title)}>
            Learn it with RabAI
          </button>
        </div>

        <section className="bp-section">
          <div className="bp-section-head">
            <h3>{heading}</h3>
            {bavli && !b.commentary && (
              <div className="seg" role="group" aria-label="Open a page as">
                <button type="button" aria-pressed={openAs === "text"} onClick={() => chooseOpenAs("text")}>
                  Line by line
                </button>
                <button type="button" aria-pressed={openAs === "page"} onClick={() => chooseOpenAs("page")}>
                  The printed page
                </button>
              </div>
            )}
          </div>
          <ContentsGrid book={b.title} current={last?.title} onOpen={(sec) => goTo(sec, gridAsPage)} />
        </section>

        {commentaries.length > 0 && (
          <section className="bp-section">
            <h3>Commentaries in the library</h3>
            {commentaries.map((e) => (
              <p key={e.era} className="era-line">
                <span className="era">{e.name}</span>
                {e.books.map((c, i) => (
                  <span key={c.title}>
                    {i > 0 ? " · " : " "}
                    <button type="button" className="link" title={c.title} onClick={() => open({ book: c.title, from: page?.from ?? "shelf" })}>
                      {c.commentary!.label}
                    </button>
                  </span>
                ))}
              </p>
            ))}
          </section>
        )}
      </div>
    );
  };

  const setPageView = (s: BookSet) => {
    const start = sharedStart(s.books.map((b) => b.title));
    const heStart = sharedStart(s.books.map((b) => b.he));
    return (
      <div className="book-page" aria-label={s.name}>
        <div className="bp-head">
          <h2>{s.name}</h2>
          {s.he && (
            <span className="he" lang="he" dir="rtl">
              {s.he}
            </span>
          )}
        </div>
        <p className="bp-where">
          {s.gloss ? `${s.gloss} · ` : ""}
          {s.books.length} books
        </p>
        <div className="tiles">
          {s.books.map((b) => (
            <button key={b.title} type="button" className="tile" onClick={() => open({ book: b.title, set: s, from: "set" })}>
              <span>{b.commentary?.on ?? trimStart(b.title, start)}</span>
              <span className="he" lang="he" dir="rtl">
                {trimStart(b.he, heStart)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const pageBook = page?.book ? byTitle.get(page.book) : undefined;
  const backLabel =
    page?.from === "set" && page.set ? page.set.name : page?.from === "search" ? "Search results" : (shelf?.name ?? "The library");

  // ------------------------------------------------------------------ the shelves

  const shelfTab = (s: (typeof shelves)[number], extra = "") => (
    <button
      key={`${s.id}${extra}`}
      type="button"
      aria-pressed={s.id === shelf?.id}
      className={`shelf-tab${extra ? ` ${extra}` : ""}`}
      style={{ ["--shelf" as string]: shelfColor(s.id) }}
      onClick={() => chooseShelf(s.id)}
    >
      <span>{s.name}</span>
      <span className="he" lang="he">
        {s.he}
      </span>
    </button>
  );

  const shelfView = shelf && (
    <div className="shelf" style={{ ["--shelf" as string]: shelfColor(shelf.id) }}>
      {shelf.parts.length > 1 && (
        <div className="seg shelf-parts">
          {shelf.parts.map((p, i) => (
            <button
              key={p.name ?? i}
              type="button"
              aria-pressed={p === part}
              onClick={() => {
                setPartIndex(i);
                setPage(null);
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
                <button key={b.title} type="button" className="tile" onClick={() => open({ book: b.title, from: "shelf" })}>
                  <span>{trimStart(b.title, start)}</span>
                  <span className="he" lang="he" dir="rtl">
                    {trimStart(b.he, heStart)}
                  </span>
                </button>
              ))}
              {g.sets.map((s) => (
                <button key={s.name} type="button" className="tile set" onClick={() => open({ set: s, from: "shelf" })}>
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
          </section>
        );
      })}
    </div>
  );

  // A "More" shelf that is open shows in the first row too, so the row says where you are.
  const openMore = shelf && !MAIN_SHELVES.includes(shelf.id) ? shelf : null;

  return (
    <div className="library" ref={rootRef}>
      {!query && !page && recent.length > 0 && (
        <section className="continue" aria-label="Continue reading">
          <h2 className="lib-h">Continue</h2>
          <div className="continue-row">
            {recent.map((r) => {
              const b = bookOf(r.title);
              return (
                <button
                  key={`${r.title}${r.page ? ":page" : ""}`}
                  type="button"
                  className="continue-card"
                  style={{ ["--shelf" as string]: b ? shelfColor(b.shelf) : undefined }}
                  onClick={() => (r.page ? onPage(r.ref) : onRead(r.ref))}
                >
                  <span className="cc-title">{r.title}</span>
                  {b && (
                    <span className="he cc-he" lang="he" dir="rtl">
                      {b.he}
                    </span>
                  )}
                  <span className="cc-meta">
                    {r.page ? "The printed page" : "Line by line"} · {whenLabel(r.at)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="lib-search">
        <label className="sr-only" htmlFor="book-filter">
          Find a book ({placed.length} in the library), in English or Hebrew
        </label>
        <input
          id="book-filter"
          className="book-filter"
          type="search"
          value={query}
          placeholder={`Find a book: Berakhot, Rashi on Bereishis, משנה ברורה…`}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(null);
          }}
          onKeyDown={onSearchKey}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {label && (
        <p className="lib-label" title={label}>
          <span className="tag-gray">Testing library</span> {placed.length} books, not yet approved by the rabbinic board.
        </p>
      )}

      {page && (pageBook || page.set) ? (
        <div className="lib-page">
          <button type="button" className="link back-link" onClick={back}>
            ← {backLabel}
          </button>
          {pageBook ? bookPage(pageBook) : setPageView(page.set!)}
        </div>
      ) : search ? (
        <div className="lib-results">
          {search.books.length === 0 ? (
            <p className="muted">No book by that name in the library yet. Try a shorter part of the name.</p>
          ) : (
            <>
              {search.closest && <p className="muted">No book has all of those words. These come closest.</p>}
              <ul className="book-results">
                {search.place && search.books[0] && (
                  <li>
                    <button type="button" className="book-result go" onClick={() => onRead(placeRef(search.books[0], search.place!))}>
                      <span className="t">Open {placeRef(search.books[0], search.place)}</span>
                      <span className="where">Line by line</span>
                    </button>
                    {search.books[0].part === "Talmud Bavli" &&
                      !search.books[0].commentary &&
                      parseAmud(placeRef(search.books[0], search.place)) && (
                        <button type="button" className="link" onClick={() => onPage(placeRef(search.books[0], search.place!))}>
                          or see that page as printed
                        </button>
                      )}
                  </li>
                )}
                {search.shelf && (
                  <li>
                    <button
                      type="button"
                      className="book-result go"
                      onClick={() => {
                        chooseShelf(search.shelf!);
                        setQuery("");
                      }}
                    >
                      <span className="t">Browse the {shelfInfo(search.shelf).name} shelf</span>
                    </button>
                  </li>
                )}
                {search.books.map((b) => (
                  <li key={b.title}>
                    <button type="button" className="book-result" onClick={() => open({ book: b.title, from: "search" })}>
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
      ) : (
        <div className="lib-body">
          <nav className="shelf-nav" aria-label="Shelves">
            <div className="shelf-row">
              {main.map((s) => shelfTab(s))}
              {openMore && shelfTab(openMore, "from-more")}
              {more.length > 0 && (
                <button type="button" className="shelf-tab more-btn" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
                  <span>More</span>
                  <span aria-hidden="true">{moreOpen ? "▴" : "▾"}</span>
                </button>
              )}
            </div>
            {more.length > 0 && (
              <div className={`shelf-more${moreOpen ? " open" : ""}`}>
                <p className="shelf-more-h">More shelves</p>
                <div className="shelf-row">{more.map((s) => shelfTab(s))}</div>
              </div>
            )}
          </nav>
          <div className="lib-main">{shelfView}</div>
        </div>
      )}

      {!query && !page && extras}
    </div>
  );
}
