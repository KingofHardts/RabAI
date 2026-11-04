"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent } from "react";
import ContentsGrid, { listBook } from "./ContentsGrid";
import { sectionLabel } from "@/lib/library/catalog";
import { contentsTree, type ContentsNode } from "@/lib/library/contents-tree";
import { findPrayers, firstSection, prayerForHour } from "@/lib/library/prayer-find";
import type { DaySummary } from "@/lib/calendar/place";
import { appliesToday, MARK_WORDS, readLine, withoutHebrewOpening, type MarkKind, type Phrase, type Seg, type SiddurLine } from "@/lib/siddur/lines";

/*
 * The Daven tab: the siddur used as a siddur (founding spec, "Davening from the siddur"). The
 * prayers flow one into the next as you scroll; a swipe left or right, or the bar at the bottom,
 * moves to the next or previous blessing or prayer. The siddur's own instructions stay in their
 * place, its marks (bow, rise on the toes, strike the chest) are shown clearly and explained in
 * its own words, who says each line is labeled, and lines said only on some days show whether they
 * apply today. Anything can be asked about, which opens the question in the chat, where the answer
 * is checked like any other. The text is the library's, word for word.
 */

const SIDDUR_KEY = "rabai_siddur";
const LANG_KEY = "rabai_daven_lang";
const LAST_KEY = "rabai_daven_last";
/** The Koren siddur first: Rabbi Sacks's translation, and its instructions printed in place. */
const PREFERRED = "The Koren Shalem Siddur; Ashkenaz";
/** At most this many prayers added below in one sitting (a whole service is far fewer). */
const MAX_CHUNKS = 80;

type DLang = "he" | "both" | "en";

interface Chunk {
  section: string;
  sectionHe?: string;
  lines: SiddurLine[];
  prev?: string;
  next?: string;
}

interface Stop {
  el: HTMLElement;
  label: string;
  section: string;
}

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function keep(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** The siddur a section belongs to. */
function bookOf(section: string, siddurs: string[]): string | undefined {
  return siddurs.find((b) => section === b || section.startsWith(`${b}, `));
}

/** The part of the siddur a section is in ("Weekdays", "Shabbat"): the flow stays inside it by itself. */
function partOf(book: string, section: string): string {
  return sectionLabel(book, section).split(", ")[0];
}

/** "…, Weekdays, The Amida" -> { short: "The Amida", crumb: "Weekdays" }. */
function names(book: string, section: string): { short: string; crumb: string } {
  const parts = sectionLabel(book, section).split(", ");
  return { short: parts[parts.length - 1] || section, crumb: parts.slice(0, -1).join(" · ") };
}

/** Where a service begins in a siddur: weekday or Shabbat, by the siddur's own headings. */
function serviceStart(book: string, nodes: ContentsNode[], service: string, shabbat: boolean): string | undefined {
  const group = shabbat ? /^shabbat/i : /^weekday/i;
  const top = nodes.filter((n) => group.test(n.name));
  const within = top.length ? top : nodes;
  const hit = findPrayers([{ book, nodes: within }], service, 1)[0];
  if (hit) return hit.section;
  // The Koren siddur's weekday morning has no "Shacharit" heading: it begins at the start of the weekdays.
  if (service === "Shacharit" && top.length) return firstSection(top[0]);
  return undefined;
}

/** A few things besides the daily services, found by name in the siddur. */
const EXTRAS: Array<{ name: string; label: string; when?: (d: DaySummary["davening"]) => boolean }> = [
  { name: "Birkat HaMazon", label: "Birkat HaMazon" },
  { name: "Blessings on Pleasures", label: "Blessings on food and sights" },
  { name: "Asher Yatzar", label: "Asher Yatzar" },
  { name: "Bedtime Shema", label: "Shema before sleep" },
  { name: "Tefillat HaDerech", label: "Traveler's prayer" },
  { name: "Hallel", label: "Hallel", when: (d) => !!d && d.hallel > 0 },
  { name: "Sefirat HaOmer", label: "Counting the Omer", when: (d) => !!d?.omerTonight },
  { name: "Kabbalat Shabbat", label: "Kabbalat Shabbat" },
  { name: "Kiddush", label: "Kiddush" },
  { name: "Havdalah", label: "Havdalah" },
  { name: "Kiddush Levana", label: "Blessing of the new moon" },
  { name: "Candle Lighting", label: "Candle lighting" },
];

export default function Siddur({
  siddurs,
  ready,
  day,
  testing,
  request,
  onAsk,
  onLearn,
  onPlace,
}: {
  /** The siddurs in the library, in the order offered. */
  siddurs: string[];
  /** The library's list has arrived (until then there is nothing to choose from yet). */
  ready: boolean;
  day: DaySummary | null;
  /** The texts are from the testing library (labeled as not yet approved by the board). */
  testing: boolean;
  /** A section to open, from elsewhere in the app; `n` changes each time it is asked. */
  request: { section: string; n: number } | null;
  onAsk: (question: string) => void;
  onLearn: (section: string) => void;
  onPlace: () => void;
}) {
  const [book, setBook] = useState<string>("");
  const [lang, setLang] = useState<DLang>("both");
  const [view, setView] = useState<"home" | "read">("home");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState<"" | "first" | "next" | "prev">("");
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<ContentsNode[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [stops, setStops] = useState<Array<{ label: string; section: string }>>([]);
  const [markPop, setMarkPop] = useState<{ kind: MarkKind; prayer: string } | null>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [last, setLast] = useState<{ book: string; section: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stopsRef = useRef<Stop[]>([]);
  const chunksRef = useRef<Chunk[]>([]);
  const loadingRef = useRef("");
  const keepPos = useRef<{ height: number; top: number } | null>(null);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const pendingStop = useRef<number | null>(null);
  chunksRef.current = chunks;
  const davening = day?.davening;

  // The siddur chosen before, or the Koren siddur, or the first one.
  useEffect(() => {
    const saved = read(SIDDUR_KEY, siddurs, "" as string);
    setBook(saved || (siddurs.includes(PREFERRED) ? PREFERRED : (siddurs[0] ?? "")));
    setLang(read(LANG_KEY, ["he", "both", "en"] as const, "both"));
    try {
      const l = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as { book?: string; section?: string } | null;
      if (l?.book && l.section && siddurs.includes(l.book)) setLast({ book: l.book, section: l.section });
    } catch {
      /* nothing saved */
    }
  }, [siddurs]);

  // The siddur's outline, to find its services and show its contents.
  useEffect(() => {
    if (!book) return;
    let live = true;
    setTree(null);
    void listBook(book).then((listing) => {
      if (!live || !("sections" in listing)) return;
      const labeled = listing.sections.map((section) => ({ section, label: sectionLabel(book, section) }));
      setTree(contentsTree(labeled) ?? labeled.map((l) => ({ name: l.label, section: l.section, children: [] })));
    });
    return () => {
      live = false;
    };
  }, [book]);

  const instructions = /koren/i.test(book);

  const fetchSection = useCallback(
    async (section: string): Promise<Chunk | null> => {
      const res = await fetch(`/api/text?ref=${encodeURIComponent(section)}&bare=1`);
      const data = (await res.json()) as {
        error?: string;
        section?: string;
        sectionHe?: string;
        book?: string;
        prev?: string;
        next?: string;
        lines?: Array<{ ref: string; he: string; en: string }>;
      };
      if (!res.ok || !data.lines || !data.section) throw new Error(data.error ?? "The siddur couldn't be opened just now.");
      const koren = /koren/i.test(data.book ?? "");
      return {
        section: data.section,
        sectionHe: data.sectionHe,
        prev: data.prev,
        next: data.next,
        lines: data.lines.map((l) => readLine(l.ref, l.he ?? "", l.en ?? "", koren)),
      };
    },
    [],
  );

  /** Opens the siddur at a section, from the top. */
  const openAt = useCallback(
    async (section: string) => {
      const owner = bookOf(section, siddurs);
      if (owner && owner !== book) {
        setBook(owner);
        keep(SIDDUR_KEY, owner);
      }
      setView("read");
      setContentsOpen(false);
      setError(null);
      setChunks([]);
      setLoading("first");
      loadingRef.current = "first";
      try {
        const c = await fetchSection(section);
        if (c) {
          setChunks([c]);
          const where = { book: owner ?? book, section: c.section };
          setLast(where);
          keep(LAST_KEY, JSON.stringify(where));
        }
        requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0 }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "The siddur couldn't be opened just now.");
      } finally {
        setLoading("");
        loadingRef.current = "";
      }
    },
    [book, siddurs, fetchSection],
  );

  // A section asked for from elsewhere (the library, a search).
  useEffect(() => {
    if (request) void openAt(request.section);
    // Only when a new request comes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);

  /** The next prayer, added below. By itself (`auto`) only within the same part of the siddur. */
  const loadNext = useCallback(async (auto = false) => {
    const list = chunksRef.current;
    const lastChunk = list[list.length - 1];
    if (!lastChunk?.next || loadingRef.current) return;
    if (auto && partOf(book, lastChunk.next) !== partOf(book, lastChunk.section)) return;
    loadingRef.current = "next";
    setLoading("next");
    try {
      const c = await fetchSection(lastChunk.next);
      if (c) setChunks((prev) => (prev.length >= MAX_CHUNKS ? prev : [...prev, c]));
    } catch {
      /* the bar at the end offers to try again */
    } finally {
      loadingRef.current = "";
      setLoading("");
    }
  }, [fetchSection, book]);

  /** The prayer before, added above, keeping the place on the screen. */
  const loadPrev = useCallback(async () => {
    const first = chunksRef.current[0];
    if (!first?.prev || loadingRef.current) return;
    loadingRef.current = "prev";
    setLoading("prev");
    try {
      const c = await fetchSection(first.prev);
      const body = bodyRef.current;
      if (c && body) {
        keepPos.current = { height: body.scrollHeight, top: body.scrollTop };
        setChunks((prev) => [c, ...prev]);
      }
    } catch {
      /* the button stays */
    } finally {
      loadingRef.current = "";
      setLoading("");
    }
  }, [fetchSection]);

  // After a prayer is added above, stay at the same words.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const pos = keepPos.current;
    if (!body || !pos) return;
    keepPos.current = null;
    body.scrollTop = pos.top + (body.scrollHeight - pos.height);
  }, [chunks]);

  // Scrolling near the end adds the next prayer: the davening flows on.
  useEffect(() => {
    const body = bodyRef.current;
    const end = endRef.current;
    if (view !== "read" || !body || !end) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void loadNext(true), {
      root: body,
      rootMargin: "0px 0px 900px 0px",
    });
    io.observe(end);
    return () => io.disconnect();
  }, [view, chunks, loadNext]);

  // The places to move between: each prayer, and each blessing inside a long one.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const els = Array.from(body.querySelectorAll<HTMLElement>("[data-stop]"));
    stopsRef.current = els.map((el) => ({ el, label: el.dataset.stop ?? "", section: el.dataset.section ?? "" }));
    setStops(stopsRef.current.map(({ label, section }) => ({ label, section })));
    if (pendingStop.current !== null) {
      const want = pendingStop.current;
      pendingStop.current = null;
      const s = stopsRef.current[want];
      if (s) body.scrollTo({ top: Math.max(0, s.el.offsetTop - 6), behavior: "smooth" });
    }
  }, [chunks, lang]);

  const whereNow = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const y = body.scrollTop + 90;
    let at = 0;
    stopsRef.current.forEach((s, i) => {
      if (s.el.offsetTop <= y) at = i;
    });
    setCurrent(at);
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (view !== "read" || !body) return;
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        whereNow();
      });
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    whereNow();
    return () => {
      body.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [view, chunks, whereNow]);

  // Remember the prayer you're in, to continue later.
  const nowSection = stops[current]?.section;
  useEffect(() => {
    if (view !== "read" || !nowSection) return;
    const owner = bookOf(nowSection, siddurs) ?? book;
    keep(LAST_KEY, JSON.stringify({ book: owner, section: nowSection }));
    setLast({ book: owner, section: nowSection });
  }, [view, nowSection, siddurs, book]);

  // While davening, the screen stays on where the browser allows it.
  useEffect(() => {
    if (view !== "read" || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let live = true;
    const take = () => {
      if (document.visibilityState !== "visible") return;
      void (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
        .request("screen")
        .then((l) => {
          if (live) lock = l;
          else void l.release();
        })
        .catch(() => {});
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", take);
      void lock?.release().catch(() => {});
    };
  }, [view]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 1400);
  };

  /** Moves to the next or previous blessing or prayer. */
  const step = (dir: 1 | -1) => {
    const body = bodyRef.current;
    if (!body) return;
    const list = stopsRef.current;
    const target = current + dir;
    if (target < 0) {
      if (chunksRef.current[0]?.prev) void loadPrev();
      return;
    }
    if (target >= list.length) {
      if (chunksRef.current[chunksRef.current.length - 1]?.next) {
        pendingStop.current = target;
        void loadNext();
      }
      return;
    }
    const s = list[target];
    body.scrollTo({ top: Math.max(0, s.el.offsetTop - 6), behavior: "smooth" });
    setCurrent(target);
    showToast(s.label);
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2 && Date.now() - start.t < 700) step(dx < 0 ? 1 : -1);
  };

  const chooseLang = (l: DLang) => {
    setLang(l);
    keep(LANG_KEY, l);
  };

  const chooseBook = (b: string) => {
    setBook(b);
    keep(SIDDUR_KEY, b);
  };

  // ---------------------------------------------------------------- the services for today

  const shabbat = davening?.dow === 6;
  const nowService = day?.afterSunset ? "Maariv" : prayerForHour(new Date().getHours());
  const services = useMemo(() => {
    if (!tree || !book) return [];
    const list: Array<{ name: string; label: string; section?: string }> = shabbat
      ? [
          { name: "Kabbalat Shabbat", label: "Kabbalat Shabbat" },
          { name: "Maariv", label: "Maariv" },
          { name: "Shacharit", label: "Shacharit" },
          { name: "Musaf", label: "Musaf" },
          { name: "Mincha", label: "Mincha" },
        ]
      : [
          { name: "Shacharit", label: "Shacharit" },
          { name: "Mincha", label: "Mincha" },
          { name: "Maariv", label: "Maariv" },
        ];
    return list.map((s) => ({ ...s, section: serviceStart(book, tree, s.name, shabbat) })).filter((s) => s.section);
  }, [tree, book, shabbat]);

  const extras = useMemo(() => {
    if (!tree || !book) return [];
    const seen = new Set<string>();
    return EXTRAS.filter((x) => !x.when || x.when(davening))
      .map((x) => ({ ...x, section: findPrayers([{ book, nodes: tree }], x.name, 1)[0]?.section }))
      .filter((x) => x.section && !seen.has(x.section) && seen.add(x.section));
  }, [tree, book, davening]);

  // ---------------------------------------------------------------- rendering a line

  const renderSegs = (segs: Seg[], prayer: string): ReactNode =>
    segs.map((s, i) =>
      s.mark ? (
        <button
          key={i}
          type="button"
          className={`sd-mark sd-${s.mark}`}
          aria-label={MARK_WORDS[s.mark].label}
          title={MARK_WORDS[s.mark].label}
          onClick={(e) => {
            e.stopPropagation();
            setMarkPop({ kind: s.mark!, prayer });
          }}
        >
          {s.text}
        </button>
      ) : (
        <span key={i}>{s.text}</span>
      ),
    );

  const renderPhrase = (p: Phrase, i: number, prayer: string, english: boolean, first: boolean) => {
    const today = p.tag?.condition ? appliesToday(p.tag.condition, davening) : undefined;
    const segs = english && first && lang === "both" ? withoutHebrewOpening(p.segs) : p.segs;
    return (
      <span key={i} className={`sd-ph${today === false ? " sd-not-today" : ""}${today === true ? " sd-today-line" : ""}`}>
        {p.tag && (
          <span className={`sd-tag ${p.tag.kind}`}>
            {p.tag.text}
            {today === true && <span className="sd-now"> · today</span>}
            {today === false && <span className="sd-not"> · not today</span>}
          </span>
        )}
        {renderSegs(segs, prayer)}
      </span>
    );
  };

  const renderLine = (l: SiddurLine, chunk: Chunk, prayer: string) => {
    if (l.kind === "heading" && l.heading) {
      return (
        <h3 key={l.ref} className="sd-h" data-stop={l.heading.en} data-section={chunk.section}>
          <span>{l.heading.en}</span>
          <span className="he" lang="he" dir="rtl">
            {l.heading.he}
          </span>
        </h3>
      );
    }
    if (l.kind === "instruction") {
      return (
        <div key={l.ref} className="sd-instr">
          <p>{l.en.map((p, i) => renderPhrase(p, i, prayer, true, false))}</p>
          <button
            type="button"
            className="link sd-ask"
            onClick={() => onAsk(`The siddur says, in ${prayer}: “${l.instruction}” Why do we do this, and what is the halacha?`)}
          >
            Ask about this
          </button>
        </div>
      );
    }
    const showHe = lang !== "en" && l.he.length > 0;
    const showEn = lang !== "he" && l.en.length > 0;
    if (!showHe && !showEn) return null;
    return (
      <div key={l.ref} className="sd-line">
        {showHe && (
          <p className="sd-he" lang="he" dir="rtl">
            {l.he.map((p, i) => renderPhrase(p, i, prayer, false, i === 0))}
          </p>
        )}
        {showEn && <p className={`sd-en${showHe ? " under" : ""}`}>{l.en.map((p, i) => renderPhrase(p, i, prayer, true, i === 0))}</p>}
      </div>
    );
  };

  // ---------------------------------------------------------------- the screens

  const todayCard = day ? (
    <div className="sd-today" role="group" aria-label="Today in the davening">
      <p className="sd-date">
        <span>{day.hebrew}</span>
        <span className="he" lang="he" dir="rtl">
          {day.hebrewHe}
        </span>
      </p>
      {day.todayIs.length > 0 && <p className="sd-is">{day.todayIs.join(" · ")}</p>}
      {davening && davening.notes.length > 0 && (
        <ul className="sd-notes">
          {davening.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {day.zmanim && day.zmanim.items.length > 0 && (
        <details className="sd-times">
          <summary>Times today{day.place ? ` in ${day.place.name}` : ""}</summary>
          <ul className="times-list">
            {day.zmanim.items.map((z) => (
              <li key={z.label}>
                <span>{z.label}</span>
                <span>{z.time}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="fine-left">
        From the Hebrew calendar{davening?.israel ? ", for Israel" : day.place ? "" : ", outside Israel"}, by the siddur&apos;s rules. RabbAI&apos;s reading,
        not yet reviewed by the rabbinic board.{" "}
        {!day.place && (
          <button type="button" className="link" onClick={onPlace}>
            Set your place
          </button>
        )}
      </p>
    </div>
  ) : null;

  if (!siddurs.length) {
    return (
      <div className="siddur">
        <div className="sd-scroll">
          {ready ? (
            <p className="note">No siddur is in the library yet.</p>
          ) : (
            <p className="reader-state">
              Opening the siddur<span className="dots" />
            </p>
          )}
        </div>
      </div>
    );
  }

  if (view === "home") {
    const lastNames = last ? names(last.book, last.section) : null;
    return (
      <div className="siddur">
        <div className="sd-scroll sd-home">
          <div className="sd-home-head">
            <h2>Daven</h2>
            <label className="sd-pick">
              <span className="sr-only">Siddur</span>
              <select value={book} onChange={(e) => chooseBook(e.target.value)}>
                {siddurs.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/^The /, "")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {todayCard}
          {services.length > 0 ? (
            <div className="sd-services" role="group" aria-label={shabbat ? "Shabbat prayers" : "Today's prayers"}>
              {services.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  className={`sd-service${s.name === nowService ? " now" : ""}`}
                  onClick={() => void openAt(s.section!)}
                >
                  <span className="sd-service-name">{s.label}</span>
                  {s.name === nowService && <span className="sd-service-now">Now</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="note">Opening the siddur<span className="dots" /></p>
          )}
          {last && lastNames && (
            <button type="button" className="btn sd-continue" onClick={() => void openAt(last.section)}>
              Continue at {lastNames.short}
              {lastNames.crumb ? <span className="muted"> · {lastNames.crumb}</span> : null}
            </button>
          )}
          {extras.length > 0 && (
            <>
              <h3 className="lib-h">Also in the siddur</h3>
              <div className="sd-extras">
                {extras.map((x) => (
                  <button key={x.name} type="button" className="chip" onClick={() => void openAt(x.section!)}>
                    {x.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {book && (
            <details className="sd-all">
              <summary>Everything in this siddur</summary>
              <ContentsGrid book={book} onOpen={(sec) => void openAt(sec)} />
            </details>
          )}
          {testing && <p className="fine-left">From the testing library: not yet approved by the rabbinic board.</p>}
        </div>
      </div>
    );
  }

  const stop = stops[current];
  const prevStop = stops[current - 1];
  const nextStop = stops[current + 1] ?? (chunks[chunks.length - 1]?.next ? { label: names(book, chunks[chunks.length - 1].next!).short, section: "" } : undefined);
  const nowChunk = chunks.find((c) => c.section === stop?.section) ?? chunks[0];
  const nowNames = nowChunk ? names(book, nowChunk.section) : null;

  return (
    <div className="siddur reading">
      <div className="sd-bar">
        <button type="button" className="rb-back" onClick={() => setView("home")} aria-label="Back to the siddur's home">
          <span aria-hidden="true">←</span>
          <span className="rb-back-label">Daven</span>
        </button>
        <button type="button" className="sd-title" onClick={() => setContentsOpen(!contentsOpen)} aria-expanded={contentsOpen}>
          {nowNames?.crumb && <span className="rb-crumb">{nowNames.crumb}</span>}
          <span className="rb-t">{nowNames?.short ?? "Siddur"}</span>
        </button>
        <div className="seg sd-lang" role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === "he"} onClick={() => chooseLang("he")} lang="he">
            עב
          </button>
          <button type="button" aria-pressed={lang === "both"} onClick={() => chooseLang("both")}>
            Both
          </button>
          <button type="button" aria-pressed={lang === "en"} onClick={() => chooseLang("en")}>
            En
          </button>
        </div>
        {nowChunk && (
          <button type="button" className="rb-btn sd-learn" onClick={() => onLearn(nowChunk.section)} title="Learn this prayer, with its words and commentaries">
            Learn
          </button>
        )}
      </div>
      {contentsOpen && (
        <div className="sd-contents">
          <ContentsGrid book={book} current={nowChunk?.section} onOpen={(sec) => void openAt(sec)} />
        </div>
      )}
      <div
        className={`sd-scroll sd-body lang-${lang}`}
        ref={bodyRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => markPop && setMarkPop(null)}
      >
        {testing && <p className="sd-label">Testing library · not yet approved by the rabbinic board</p>}
        {davening && davening.notes.length > 0 && (
          <button type="button" className="sd-today-chip" aria-expanded={todayOpen} onClick={() => setTodayOpen(!todayOpen)}>
            Today: {davening.notes.length} {davening.notes.length === 1 ? "note" : "notes"} for the davening {todayOpen ? "▴" : "▾"}
          </button>
        )}
        {todayOpen && todayCard}
        {loading === "first" && (
          <p className="reader-state">
            Opening the siddur<span className="dots" />
          </p>
        )}
        {error && <p className="reader-state">{error}</p>}
        {chunks[0]?.prev && partOf(book, chunks[0].prev) === partOf(book, chunks[0].section) && (
          <button type="button" className="btn quiet sd-earlier" disabled={loading === "prev"} onClick={() => void loadPrev()}>
            {loading === "prev" ? "Opening…" : `Earlier: ${names(book, chunks[0].prev).short}`}
          </button>
        )}
        {chunks.map((c) => {
          const n = names(book, c.section);
          return (
            <section key={c.section} className="sd-chunk" aria-label={n.short}>
              <h2 className="sd-sec" data-stop={n.short} data-section={c.section}>
                {n.crumb && <span className="sd-crumb">{n.crumb}</span>}
                <span>{n.short}</span>
                {(() => {
                  // The Hebrew name, when the library has one that isn't just the English again.
                  const he = c.sectionHe?.split(/,\s*/).pop();
                  return he && /[\u05D0-\u05EA]/.test(he) ? (
                    <span className="he" lang="he" dir="rtl">
                      {he}
                    </span>
                  ) : null;
                })()}
              </h2>
              {c.lines.map((l) => renderLine(l, c, n.short))}
            </section>
          );
        })}
        <div ref={endRef} className="sd-end">
          {chunks.length > 0 &&
            (chunks[chunks.length - 1].next ? (
              <button type="button" className="btn sd-next-prayer" disabled={loading === "next"} onClick={() => void loadNext()}>
                {loading === "next"
                  ? "Opening…"
                  : `Continue: ${(() => {
                      const last = chunks[chunks.length - 1];
                      const n = names(book, last.next!);
                      const other = partOf(book, last.next!) !== partOf(book, last.section);
                      return other && n.crumb ? `${n.crumb} · ${n.short}` : n.short;
                    })()} ›`}
              </button>
            ) : (
              <p className="fine-left">The end of the siddur.</p>
            ))}
        </div>
      </div>
      <nav className="sd-nav" aria-label="Move through the davening">
        <button type="button" className="sd-step" disabled={!prevStop && !chunks[0]?.prev} onClick={() => step(-1)} aria-label={prevStop ? `Back: ${prevStop.label}` : "Back"}>
          <span aria-hidden="true">‹</span> <span className="sd-step-label">{prevStop?.label ?? (chunks[0]?.prev ? "Earlier" : "")}</span>
        </button>
        <span className="sd-where" aria-live="polite">
          {stop?.label ?? ""}
        </span>
        <button type="button" className="sd-step next" disabled={!nextStop} onClick={() => step(1)} aria-label={nextStop ? `Next: ${nextStop.label}` : "Next"}>
          <span className="sd-step-label">{nextStop?.label ?? ""}</span> <span aria-hidden="true">›</span>
        </button>
      </nav>
      {toast && (
        <div className="sd-toast" role="status">
          {toast}
        </div>
      )}
      {markPop && (
        <div className="sd-pop" role="dialog" aria-label={MARK_WORDS[markPop.kind].label}>
          <p className="sd-pop-title">{MARK_WORDS[markPop.kind].label}</p>
          <p>{MARK_WORDS[markPop.kind].koren}</p>
          <p className="fine-left">The Koren siddur&apos;s own words for its mark.</p>
          <div className="sd-pop-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const kind = markPop.kind;
                setMarkPop(null);
                onAsk(
                  kind === "leader"
                    ? `In the siddur, at ${markPop.prayer}, there is a mark where the leader begins aloud. Why does the leader start there?`
                    : `In the siddur, at ${markPop.prayer}, there is a mark to ${MARK_WORDS[kind].label.toLowerCase()}. Why do we do this here, and what is the halacha?`,
                );
              }}
            >
              Ask about this
            </button>
            <button type="button" className="btn quiet" onClick={() => setMarkPop(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
