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
import ContentsGrid, { listBook } from "./ContentsGrid";
import { contentsTree, type ContentsNode } from "@/lib/library/contents-tree";
import { findPrayers, knownPrayer, prayerForHour, siddurOrder, wantsDavening, wantsTimes, type PrayerHit } from "@/lib/library/prayer-find";
import type { DaySummary } from "@/lib/calendar/place";

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
  day,
  onPlace,
  onDaven,
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
  /** Today, for the times a search for "zmanim" shows. */
  day?: DaySummary | null;
  /** Open the place setting, for the day's times. */
  onPlace?: () => void;
  /** Open a prayer to daven from (the siddur view); without it, prayers open in the reader. */
  onDaven?: (ref: string) => void;
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

  // The siddurs' outlines, fetched the first time a search is typed, so prayers inside them can be
  // found ("Mincha", "bentching"); see lib/library/prayer-find.ts.
  const siddurs = useMemo(() => siddurOrder(placed.filter((b) => b.shelf === "prayer" && !b.commentary).map((b) => b.title)), [placed]);
  const [prayerTrees, setPrayerTrees] = useState<Array<{ book: string; nodes: ContentsNode[] }> | null>(null);
  const wantTrees = query.trim().length >= 3;
  useEffect(() => {
    if (!wantTrees || prayerTrees || !siddurs.length) return;
    let live = true;
    void Promise.all(
      siddurs.map(async (book) => {
        const listing = await listBook(book);
        if (!("sections" in listing)) return null;
        const labeled = listing.sections.map((section) => ({ section, label: sectionLabel(book, section) }));
        const nodes = contentsTree(labeled) ?? labeled.map((l) => ({ name: l.label, section: l.section, children: [] }));
        return { book, nodes };
      }),
    ).then((trees) => {
      if (live) setPrayerTrees(trees.filter((t): t is { book: string; nodes: ContentsNode[] } => !!t));
    });
    return () => {
      live = false;
    };
  }, [wantTrees, prayerTrees, siddurs]);
  const prayerHits = useMemo(() => (query.trim() && prayerTrees ? findPrayers(prayerTrees, query) : []), [query, prayerTrees]);
  const davening = query.trim() ? wantsDavening(query) : false;
  const times = query.trim() ? wantsTimes(query) : false;
  const daven = (ref: string) => (onDaven ? onDaven(ref) : onRead(ref));

  const shelf = shelves.find((s) => s.id === shelfId) ?? shelves.find((s) => s.id === "talmud") ?? shelves[0];
  const part = shelf?.parts[Math.min(partIndex, shelf.parts.length - 1)];
  const search = query.trim() ? searchBooks(placed, query) : null;
  // Prayers come before the books when a prayer's name was typed, or no book matches it exactly;
  // otherwise ("Berakhot") the books come first and a few prayers follow.
  const prayersFirst = prayerHits.length > 0 && (knownPrayer(query) || !search?.books.length || !!search?.closest);
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
    // A prayer's name opens the prayer, unless a book matches what was typed exactly.
    if (e.key === "Enter" && prayerHits[0] && prayersFirst) {
      e.preventDefault();
      daven(prayerHits[0].section);
      return;
    }
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
            Learn it with RabbAI
          </button>
        </div>
        {b.shelf === "prayer" && !b.commentary && /siddur/i.test(b.title) && <DavenFromBook book={b.title} onDaven={daven} />}

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
          placeholder="Find a book: Berakhot, משנה ברורה…"
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
          {times && <TimesCard day={day} onPlace={onPlace} />}
          {davening && siddurs.length > 0 && (
            <DaveningFinds siddurs={siddurs} trees={prayerTrees} placed={placed} onDaven={daven} onBook={(title) => open({ book: title, from: "search" })} />
          )}
          {prayersFirst && (
            <section className="quick-finds" aria-label="In the siddur">
              <h3 className="lib-h">In the siddur</h3>
              <ul className="prayer-hits">
                {prayerHits.map((h) => (
                  <li key={`${h.book}|${h.path.join("|")}`}>
                    <PrayerButton hit={h} onOpen={daven} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(times || davening || prayersFirst) && search.books.length > 0 && <h3 className="lib-h">Books</h3>}
          {search.books.length === 0 ? (
            times || davening || prayersFirst ? null : (
            <p className="muted">No book by that name in the library yet. Try a shorter part of the name.</p>
            )
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
          {!prayersFirst && prayerHits.length > 0 && (
            <section className="quick-finds after-books" aria-label="Also in the siddur">
              <h3 className="lib-h">Also in the siddur</h3>
              <ul className="prayer-hits">
                {prayerHits.slice(0, 3).map((h) => (
                  <li key={`${h.book}|${h.path.join("|")}`}>
                    <PrayerButton hit={h} onOpen={daven} />
                  </li>
                ))}
              </ul>
            </section>
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

/** One prayer found in a siddur: its name, and where it is. */
function PrayerButton({ hit, onOpen }: { hit: PrayerHit; onOpen: (ref: string) => void }) {
  const name = hit.path[hit.path.length - 1];
  const where = [hit.book, ...hit.path.slice(0, -1)].join(" · ");
  return (
    <button type="button" className="book-result prayer-hit" onClick={() => onOpen(hit.section)}>
      <span className="t">{name}</span>
      <span className="where">{where}</span>
    </button>
  );
}

/** On a siddur's page: the three daily prayers in it, the one for this time of day first in color. */
function DavenFromBook({ book, onDaven }: { book: string; onDaven: (ref: string) => void }) {
  const [tree, setTree] = useState<{ book: string; nodes: ContentsNode[] } | null>(null);
  useEffect(() => {
    let live = true;
    void listBook(book).then((listing) => {
      if (!live || !("sections" in listing)) return;
      const labeled = listing.sections.map((section) => ({ section, label: sectionLabel(book, section) }));
      const nodes = contentsTree(labeled);
      if (nodes) setTree({ book, nodes });
    });
    return () => {
      live = false;
    };
  }, [book]);
  if (!tree) return null;
  const now = prayerForHour(new Date().getHours());
  const daily = (["Shacharit", "Mincha", "Maariv"] as const)
    .map((name) => ({ name, hit: findPrayers([tree], name, 1)[0] }))
    .filter((d) => d.hit);
  if (!daily.length) return null;
  return (
    <section className="daven-from" aria-label="Daven from this siddur">
      <p className="label-sm">Daven</p>
      <div className="daven-row">
        {daily.map((d) => (
          <button key={d.name} type="button" className={`btn${d.name === now ? " primary" : ""}`} onClick={() => onDaven(d.hit.section)}>
            {d.name}
            {d.name === now ? " (now)" : ""}
          </button>
        ))}
      </div>
      <p className="fine-left">Opens the davening view: large Hebrew, a button to the next prayer at the end, and the screen kept on.</p>
    </section>
  );
}

/** For "davening": the prayer for this time of day, the three daily prayers, and the siddurs. */
function DaveningFinds({
  siddurs,
  trees,
  placed,
  onDaven,
  onBook,
}: {
  siddurs: string[];
  trees: Array<{ book: string; nodes: ContentsNode[] }> | null;
  placed: PlacedBook[];
  onDaven: (ref: string) => void;
  onBook: (title: string) => void;
}) {
  const now = prayerForHour(new Date().getHours());
  const first = trees?.[0];
  const daily = (["Shacharit", "Mincha", "Maariv"] as const)
    .map((name) => ({ name, hit: first ? findPrayers([first], name, 1)[0] : undefined }))
    .filter((d) => d.hit);
  const he = new Map(placed.map((b) => [b.title, b.he]));
  return (
    <section className="quick-finds" aria-label="Davening">
      <h3 className="lib-h">Daven{first ? ` from ${first.book}` : ""}</h3>
      {daily.length > 0 && (
        <div className="daven-row">
          {daily.map((d) => (
            <button key={d.name} type="button" className={`btn${d.name === now ? " primary" : ""}`} onClick={() => onDaven(d.hit!.section)}>
              {d.name}
              {d.name === now ? " (now)" : ""}
            </button>
          ))}
        </div>
      )}
      <ul className="book-results">
        {siddurs.map((t) => (
          <li key={t}>
            <button type="button" className="book-result" onClick={() => onBook(t)}>
              <span className="t">{t}</span>
              {he.get(t) && (
                <span className="he" lang="he" dir="rtl">
                  {he.get(t)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** For "zmanim": today's times at the person's place, or a way to set the place. */
function TimesCard({ day, onPlace }: { day?: DaySummary | null; onPlace?: () => void }) {
  const z = day?.zmanim;
  return (
    <section className="quick-finds times-card" aria-label="Today's times">
      <h3 className="lib-h">
        Today&apos;s times{day?.place ? ` · ${day.place.name}` : ""}
      </h3>
      {z ? (
        <>
          <p className="muted times-day">{z.day}</p>
          <dl className="times-list">
            {z.items.map((t) => (
              <div key={`${t.label}|${t.time}`}>
                <dt>
                  {t.label}
                  {t.note && <span className="times-note">{t.note}</span>}
                </dt>
                <dd>{t.time}</dd>
              </div>
            ))}
          </dl>
          {day?.shabbat && (
            <p className="times-shabbat">
              Shabbat: candles {day.shabbat.candlesDay} at {day.shabbat.candles}; ends {day.shabbat.endsDay} at {day.shabbat.ends}.
            </p>
          )}
          {onPlace && (
            <button type="button" className="link" onClick={onPlace}>
              Change the place or the customs used
            </button>
          )}
        </>
      ) : (
        <p className="muted">
          RabbAI needs your place to work out the day&apos;s times.{" "}
          {onPlace && (
            <button type="button" className="link" onClick={onPlace}>
              Set your place
            </button>
          )}
        </p>
      )}
    </section>
  );
}
