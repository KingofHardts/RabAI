"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from "react";
import ContentsGrid, { listBook } from "./ContentsGrid";
import { DictRows } from "./WordCard";
import DavenTools from "./daven/DavenTools";
import SiddurOutline from "./daven/SiddurOutline";
import { useLinkedScroll } from "./use-linked-scroll";
import { isOnline, keepAppCode, keepAppPage, keepOnDevice } from "@/lib/offline";
import { sectionLabel } from "@/lib/library/catalog";
import { contentsTree, type ContentsNode } from "@/lib/library/contents-tree";
import { findPrayers, firstSection, prayerForHour } from "@/lib/library/prayer-find";
import type { WordEntry } from "@/lib/library/word-parts";
import type { GlossRow, Translation } from "@/lib/engine/gloss";
import type { DaySummary, Place } from "@/lib/calendar/place";
import { appliesToday, CONDITION_NAMES, MARK_WORDS, readLine, withoutHebrewOpening, type MarkKind, type Phrase, type Seg, type SiddurLine } from "@/lib/siddur/lines";
import { hallelToday, planToday, serviceOf, whenWords } from "@/lib/siddur/today";
import { transliterate } from "@/lib/siddur/translit";
import { noteFor, bareLetters } from "@/lib/siddur/notes";
import { lawNumbersIn, lawRanges, prayerLinks, type LawRange } from "@/lib/siddur/links";
import type { DaveningNote } from "@/lib/siddur/davening-notes.generated";
import { loadPrefs, savePrefs, type DavenPrefs, type Layout } from "@/lib/siddur/prefs";
import { davenOrder, isOneLevel, movesTorahBlessings, siddurOutline, type OutlineCategory } from "@/lib/siddur/outline";

/*
 * The Daven tab: the siddur used as a siddur (founding spec, "Finding prayers, and the siddur as a
 * siddur"). The prayers flow one into the next as you scroll; a swipe left or right, or the bar at
 * the bottom, moves to the next or previous blessing. The siddur's own instructions stay in their
 * place, its marks (bow, rise on the toes, strike the chest) are shown and explained in its own
 * words, who says each line is labeled, a man's and a woman's wording are labeled, and the
 * congregation's responses stand out. In today's view, what isn't said today is folded into a line
 * that opens it (lib/siddur/today.ts), labeled as RabbAI's reading, not yet reviewed by the board.
 * The text is the library's, word for word; anything can be asked about in the chat, where the
 * answer is checked like any other.
 */

const SIDDUR_KEY = "rabai_siddur";
const LAST_KEY = "rabai_daven_last";
const MARKS_KEY = "rabai_daven_marks";
/** The Koren siddur first: Rabbi Sacks's translation, and its instructions printed in place. */
const PREFERRED = "The Koren Shalem Siddur; Ashkenaz";
/** At most this many prayers added below in one sitting (a whole service is far fewer). */
const MAX_CHUNKS = 80;

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

type Item =
  | { kind: "section"; key: string; chunk: Chunk; short: string; crumb: string; he?: string }
  | { kind: "fold"; key: string; chunk: Chunk; reason: string; count: number; open: boolean; whole?: boolean }
  | { kind: "line"; key: string; chunk: Chunk; line: SiddurLine; prayer: string }
  | { kind: "note"; key: string; note: DaveningNote; prayer: string }
  | { kind: "para"; key: string; chunk: Chunk; lines: SiddurLine[]; prayer: string };

type Gloss = GlossRow[] | "none" | "loading" | "failed";

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

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .trim();

/** A section of the siddur by its own name ("Hallel", "Musaf for Rosh Hodesh"). */
function sectionByName(nodes: ContentsNode[], name: string): string | undefined {
  const want = fold(name);
  const stack = [...nodes];
  let loose: string | undefined;
  while (stack.length) {
    const n = stack.shift()!;
    const label = fold(n.name);
    if (n.section && (label === want || label.endsWith(` · ${want}`))) return n.section;
    if (n.section && !loose && label.startsWith(want)) loose = n.section;
    stack.push(...n.children);
  }
  return loose;
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

/** What people reach for besides the daily services, found by name in the siddur, in groups. */
const EXTRAS: Array<{ group: string; name: string; label: string; note?: string; when?: (d: DaySummary["davening"]) => boolean }> = [
  { group: "Any time", name: "Birkat HaMazon", label: "Birkat HaMazon", note: "After a meal with bread" },
  { group: "Any time", name: "Blessings on Pleasures", label: "Blessings on food", note: "And on sights and sounds" },
  { group: "Any time", name: "Asher Yatzar", label: "Asher Yatzar", note: "After the bathroom" },
  { group: "Any time", name: "Tefillat HaDerech", label: "Traveler's prayer", note: "Tefillat HaDerech" },
  { group: "Any time", name: "Bedtime Shema", label: "Shema before sleep" },
  { group: "Any time", name: "Sefirat HaOmer", label: "Counting the Omer", note: "Tonight", when: (d) => !!d?.omerTonight },
  { group: "Shabbat", name: "Candle Lighting", label: "Candle lighting" },
  { group: "Shabbat", name: "Kabbalat Shabbat", label: "Kabbalat Shabbat", note: "Welcoming Shabbat" },
  { group: "Shabbat", name: "Kiddush", label: "Kiddush" },
  { group: "Shabbat", name: "Havdalah", label: "Havdalah", note: "The close of Shabbat" },
  { group: "This month", name: "Kiddush Levana", label: "Blessing of the new moon", note: "Kiddush Levana" },
];

/** A word on when each service is said, under its name on the home screen. */
const SERVICE_NOTE: Record<string, string> = {
  Shacharit: "Morning",
  Hallel: "After the morning Amidah",
  Musaf: "The additional prayer",
  Mincha: "Afternoon",
  Maariv: "Evening",
  "Kabbalat Shabbat": "Friday night",
  Amidah: "For Yom Tov",
};

/** Places in a service people look for, found by the line's opening words. */
const KEY_LINES: Array<{ re: RegExp; label: string }> = [
  { re: /^ברכו את יהוה/, label: "Barchu" },
  { re: /^שמע ישראל יהוה/, label: "Shema" },
  { re: /^(נקדש את שמך|נקדישך ונעריצך|כתר יתנו לך)/, label: "Kedushah" },
  { re: /^עלינו לשבח/, label: "Aleinu" },
  { re: /^יתגדל ויתקדש/, label: "Kaddish" },
];

/** The name of a key place a line opens, if it is one. */
function keyLine(line: SiddurLine): string | null {
  if (line.kind !== "prayer" || !line.he.length) return null;
  const text = bareLetters(line.he[0].segs.map((s) => s.text).join(""));
  return KEY_LINES.find((k) => k.re.test(text))?.label ?? null;
}

/** "the bookmark key" of a section: one place per service, per part of the siddur. */
function markKey(book: string, section: string): string {
  const { short } = names(book, section);
  const service = /omer|shema before sleep|bedtime/i.test(short) ? "night" : serviceOf(short);
  return `${book}|${partOf(book, section)}|${service}`;
}

const SERVICE_LABEL: Record<string, string> = { shacharit: "Shacharit", mincha: "Mincha", maariv: "Maariv", night: "At night" };

const LAYOUTS: Array<{ id: Layout; label: string; icon: string }> = [
  { id: "lines", label: "Line by line", icon: "≡" },
  { id: "paragraph", label: "Paragraph", icon: "¶" },
  { id: "words", label: "Word by word", icon: "⋮" },
  { id: "panes", label: "Two panes", icon: "⇅" },
];

/** A tapped word, without punctuation around it. */
function bareWord(text: string): string {
  const t = text.replace(/^[\s"'״׳“”‘’()[\]{}.,;:!?׃־–—…▾▴°◂]+|[\s"'״“”‘’()[\]{}.,;:!?׃־–—…▾▴°◂]+$/g, "");
  return /[א-ת֑-ׇ]['׳]$/.test(t) ? t : t.replace(/['׳]+$/, "");
}

/** The Hebrew word under a tap, from the text the browser finds there. */
function wordAt(x: number, y: number): string | null {
  const d = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  let node: Node | null = null;
  let offset = 0;
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    if (p) ({ offsetNode: node, offset } = p);
  } else if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y);
    if (r) {
      node = r.startContainer;
      offset = r.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? "";
  const isWord = (c: string) => /[א-ת֑-ׇ"״׳'־]/.test(c);
  let a = offset;
  let b = offset;
  while (a > 0 && isWord(text[a - 1])) a--;
  while (b < text.length && isWord(text[b])) b++;
  const w = bareWord(text.slice(a, b));
  return /[א-ת]/.test(w) ? w : null;
}

export default function Siddur({
  siddurs,
  ready,
  day,
  place,
  testing,
  request,
  theme,
  onTheme,
  onAsk,
  onLearn,
  onPlace,
}: {
  /** The siddurs in the library, in the order offered. */
  siddurs: string[];
  /** The library's list has arrived (until then there is nothing to choose from yet). */
  ready: boolean;
  day: DaySummary | null;
  /** The person's place, for the direction to Jerusalem and the times. */
  place: Place | null;
  /** The texts are from the testing library (labeled as not yet approved by the board). */
  testing: boolean;
  /** A section to open, from elsewhere in the app; `n` changes each time it is asked. */
  request: { section: string; n: number } | null;
  theme: "system" | "light" | "dark";
  onTheme: (t: "system" | "light" | "dark") => void;
  onAsk: (question: string) => void;
  onLearn: (section: string) => void;
  onPlace: () => void;
}) {
  const [book, setBook] = useState<string>("");
  const [prefs, setPrefs] = useState<DavenPrefs>(() => ({ ...loadPrefsSafe() }));
  const [view, setView] = useState<"home" | "read">("home");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState<"" | "first" | "next" | "prev">("");
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<ContentsNode[] | null>(null);
  /** The siddur's sections as the library lists them, each with its label. */
  const [listing, setListing] = useState<Array<{ section: string; label: string }> | null>(null);
  const [current, setCurrent] = useState(0);
  const [stops, setStops] = useState<Array<{ label: string; section: string }>>([]);
  const [markPop, setMarkPop] = useState<{ kind: MarkKind; prayer: string } | null>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  /** The home screen's list of today's changes is open in full. */
  const [notesOpen, setNotesOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [last, setLast] = useState<{ book: string; section: string } | null>(null);
  const [marks, setMarks] = useState<Record<string, { section: string; date: string }>>({});
  const [openFolds, setOpenFolds] = useState<Set<string>>(() => new Set());
  const [openBits, setOpenBits] = useState<Set<string>>(() => new Set());
  const [glosses, setGlosses] = useState<Record<string, Gloss>>({});
  const [laws, setLaws] = useState<{ range: LawRange; items: Array<{ n: string; text: string }> | null; error?: string } | null>(null);
  const [word, setWord] = useState<{ word: string; prayer: string; entries: WordEntry[] | null; error?: string } | null>(null);
  const [offline, setOffline] = useState<{ done: number; total: number; missed: number } | null>(null);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(isOnline());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  // Escape closes whatever is open on top of the siddur, the most recent first.
  useEffect(() => {
    if (!menuOpen && !jumpOpen && !laws && !word) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (word) setWord(null);
      else if (laws) setLaws(null);
      else if (jumpOpen) setJumpOpen(false);
      else setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, jumpOpen, laws, word]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const enRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stopsRef = useRef<Stop[]>([]);
  const chunksRef = useRef<Chunk[]>([]);
  const loadingRef = useRef("");
  const keepPos = useRef<{ height: number; top: number } | null>(null);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const pendingStop = useRef<number | null>(null);
  const rawCache = useRef(new Map<string, Promise<Array<{ ref: string; he: string; en: string }>>>());
  chunksRef.current = chunks;
  const davening = day?.davening;
  const layout = prefs.layout;

  const setPref = <K extends keyof DavenPrefs>(k: K, v: DavenPrefs[K]) => {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      savePrefs(next);
      return next;
    });
  };

  // The siddur chosen before, or the Koren siddur, or the first one.
  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(SIDDUR_KEY) ?? "";
    } catch {
      /* none */
    }
    setBook(siddurs.includes(saved) ? saved : siddurs.includes(PREFERRED) ? PREFERRED : (siddurs[0] ?? ""));
    setPrefs(loadPrefs());
    try {
      const l = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as { book?: string; section?: string } | null;
      if (l?.book && l.section && siddurs.includes(l.book)) setLast({ book: l.book, section: l.section });
      const m = JSON.parse(localStorage.getItem(MARKS_KEY) ?? "{}") as Record<string, { section: string; date: string }>;
      if (m && typeof m === "object") setMarks(m);
    } catch {
      /* nothing saved */
    }
  }, [siddurs]);

  // The siddur's outline, to find its services and show its contents.
  useEffect(() => {
    if (!book) return;
    let live = true;
    setTree(null);
    setListing(null);
    void listBook(book).then((found) => {
      if (!live || !("sections" in found)) return;
      setListing(found.sections.map((section) => ({ section, label: sectionLabel(book, section) })));
    });
    return () => {
      live = false;
    };
  }, [book]);

  // The order the prayers are davened in (lib/siddur/outline.ts): the siddur's own, with the
  // blessings over the Torah before the morning blessings unless the person keeps the printed order.
  const ordered = useMemo(() => (listing ? davenOrder(listing, prefs.torahBlessings) : null), [listing, prefs.torahBlessings]);
  const orderRef = useRef<string[]>([]);
  orderRef.current = ordered?.map((l) => l.section) ?? [];
  useEffect(() => {
    setTree(ordered ? (contentsTree(ordered) ?? ordered.map((l) => ({ name: l.label, section: l.section, children: [] }))) : null);
  }, [ordered]);
  /** The siddur organized for davening: categories, headings, prayers. */
  const outline: OutlineCategory[] = useMemo(() => (ordered ? siddurOutline(ordered, isOneLevel(book)) : []), [ordered, book]);
  /** Each section's name and place as the menus show them. */
  const shownNames = useMemo(() => {
    const m = new Map<string, { short: string; crumb: string }>();
    for (const cat of outline) for (const g of cat.groups) for (const it of g.items) m.set(it.section, { short: it.title, crumb: [cat.title, g.title].filter(Boolean).join(" · ") });
    return m;
  }, [outline]);
  const shown = useCallback((b: string, section: string) => shownNames.get(section) ?? names(b, section), [shownNames]);
  const torahChoice = useMemo(() => !!listing && movesTorahBlessings(listing), [listing]);

  const instructions = /koren/i.test(book);

  /** A section's lines as the library has them (cached for the laws and the Omer). */
  const fetchRaw = useCallback((section: string) => {
    let found = rawCache.current.get(section);
    if (!found) {
      found = fetch(`/api/text?ref=${encodeURIComponent(section)}&bare=1`)
        .then((r) => r.json())
        .then((d: { lines?: Array<{ ref: string; he: string; en: string }> }) => d.lines ?? []);
      rawCache.current.set(section, found);
      found.catch(() => rawCache.current.delete(section));
    }
    return found;
  }, []);

  const fetchSection = useCallback(async (section: string): Promise<Chunk | null> => {
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
    // The prayers before and after, in the order they are davened (which may differ from the print).
    const at = orderRef.current.indexOf(data.section);
    return {
      section: data.section,
      sectionHe: data.sectionHe,
      prev: at >= 0 ? orderRef.current[at - 1] : data.prev,
      next: at >= 0 ? orderRef.current[at + 1] : data.next,
      lines: data.lines.map((l) => readLine(l.ref, l.he ?? "", l.en ?? "", koren)),
    };
  }, []);

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
      setJumpOpen(false);
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

  /** Opens a section by its name in this siddur; false when it has none. */
  const openNamed = useCallback(
    (name: string) => {
      const section = tree ? sectionByName(tree, name) : undefined;
      if (!section) return false;
      void openAt(section);
      return true;
    },
    [tree, openAt],
  );

  // A section asked for from elsewhere (the library, a search).
  useEffect(() => {
    if (request) void openAt(request.section);
    // Only when a new request comes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.n]);

  /** The next prayer, added below. By itself (`auto`) only within the same part of the siddur. */
  const loadNext = useCallback(
    async (auto = false) => {
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
    },
    [fetchSection, book],
  );

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
  }, [view, chunks, loadNext, layout]);

  // ---------------------------------------------------------------- today's view and the items shown

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const c of chunks) {
      const n = names(book, c.section);
      const he = c.sectionHe?.split(/,\s*/).pop();
      const show = shown(book, c.section);
      out.push({ kind: "section", key: `s:${c.section}`, chunk: c, short: show.short, crumb: show.crumb, he: he && /[א-ת]/.test(he) ? he : undefined });
      const plan = prefs.today ? planToday(partOf(book, c.section), n.short, c.lines, davening, prefs.customs) : { folds: [] };
      if (plan.whole) {
        const key = `${c.section}#whole`;
        const open = openFolds.has(key);
        out.push({ kind: "fold", key, chunk: c, reason: plan.whole, count: c.lines.length, open, whole: true });
        if (!open) continue;
      }
      const starts = new Map(plan.folds.map((f) => [f.from, f]));
      for (let i = 0; i < c.lines.length; i++) {
        const f = starts.get(i);
        if (f) {
          const key = `${c.section}#${f.from}`;
          const open = openFolds.has(key);
          out.push({ kind: "fold", key, chunk: c, reason: f.reason, count: f.to - f.from, open });
          if (!open) {
            i = f.to - 1;
            continue;
          }
        }
        const line = c.lines[i];
        if (!instructions) {
          const note = noteFor(line);
          if (note) out.push({ kind: "note", key: `n:${line.ref}`, note, prayer: n.short });
        }
        out.push({ kind: "line", key: line.ref, chunk: c, line, prayer: n.short });
      }
    }
    if (layout !== "paragraph") return out;
    // Paragraph: the prayer lines between headings and instructions, each language together.
    const grouped: Item[] = [];
    for (const it of out) {
      const prev = grouped[grouped.length - 1];
      if (it.kind === "line" && it.line.kind === "prayer" && !keyLine(it.line)) {
        if (prev?.kind === "para" && prev.chunk === it.chunk) prev.lines.push(it.line);
        else grouped.push({ kind: "para", key: `p:${it.key}`, chunk: it.chunk, lines: [it.line], prayer: it.prayer });
      } else grouped.push(it);
    }
    return grouped;
  }, [chunks, book, prefs.today, prefs.customs, davening, openFolds, instructions, layout, shown]);

  // The places to move between: each prayer, each blessing, and the key places (Barchu, Shema, Kaddish).
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
  }, [items, prefs.lang, layout]);

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
      if (!frame)
        frame = requestAnimationFrame(() => {
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
  }, [view, chunks, whereNow, layout]);

  // Hebrew above, English below: the two panes keep the same place as either is scrolled.
  useLinkedScroll(bodyRef, enRef, view === "read" && layout === "panes", items);

  // Remember the prayer you're in, to continue later: one place per service.
  const nowSection = stops[current]?.section;
  useEffect(() => {
    if (view !== "read" || !nowSection) return;
    const owner = bookOf(nowSection, siddurs) ?? book;
    keep(LAST_KEY, JSON.stringify({ book: owner, section: nowSection }));
    setLast({ book: owner, section: nowSection });
    const key = markKey(owner, nowSection);
    setMarks((prev) => {
      const next = { ...prev, [key]: { section: nowSection, date: day?.date ?? "" } };
      keep(MARKS_KEY, JSON.stringify(next));
      return next;
    });
  }, [view, nowSection, siddurs, book, day?.date]);

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

  // Word by word: the translations already kept in RabbAI's translation library (nothing is made here).
  useEffect(() => {
    if (layout !== "words" || view !== "read") return;
    const want = chunks.flatMap((c) => c.lines.filter((l) => l.kind === "prayer" && l.he.length).map((l) => l.ref)).filter((r) => !(r in glosses));
    if (!want.length) return;
    setGlosses((prev) => Object.fromEntries([...Object.entries(prev), ...want.map((r) => [r, "loading" as Gloss])]));
    for (let i = 0; i < want.length; i += 24) {
      const refs = want.slice(i, i + 24);
      void fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keptOnly: true, refs }) })
        .then((r) => r.json())
        .then((j: { translations?: Translation[] }) => {
          const got = new Map((j.translations ?? []).map((t) => [t.ref, t.words]));
          setGlosses((prev) => {
            const next = { ...prev };
            for (const r of refs) {
              const w = got.get(r);
              next[r] = Array.isArray(w) && w.length ? w : "none";
            }
            return next;
          });
        })
        .catch(() => setGlosses((prev) => ({ ...prev, ...Object.fromEntries(refs.map((r) => [r, "none" as Gloss])) })));
    }
  }, [layout, view, chunks, glosses]);

  /** RabbAI's word-by-word translation for a prayer's lines that have none yet: asked only when the person taps. */
  const makeWords = async (c: Chunk) => {
    const refs = c.lines.filter((l) => l.kind === "prayer" && l.he.length && glosses[l.ref] === "none").map((l) => l.ref);
    setGlosses((prev) => ({ ...prev, ...Object.fromEntries(refs.map((r) => [r, "loading" as Gloss])) }));
    let i = 0;
    const worker = async () => {
      while (i < refs.length) {
        const ref = refs[i++];
        try {
          const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref, words: true }) });
          const t = (await res.json()) as Translation & { error?: string };
          setGlosses((prev) => ({ ...prev, [ref]: Array.isArray(t.words) && t.words.length ? t.words : "failed" }));
        } catch {
          setGlosses((prev) => ({ ...prev, [ref]: "failed" }));
        }
      }
    };
    await Promise.all([worker(), worker()]);
  };

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

  const jumpTo = (i: number) => {
    const s = stopsRef.current[i];
    if (!s || !bodyRef.current) return;
    bodyRef.current.scrollTo({ top: Math.max(0, s.el.offsetTop - 6), behavior: "smooth" });
    setCurrent(i);
    setJumpOpen(false);
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

  /** A tap on a Hebrew word shows its meaning in the library's dictionaries (no AI). */
  const onBodyClick = (e: MouseEvent) => {
    if (markPop) {
      setMarkPop(null);
      return;
    }
    if (!prefs.wordTap || layout === "words") return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select")) return;
    const lineEl = target.closest<HTMLElement>(".sd-he");
    if (!lineEl) return;
    const w = wordAt(e.clientX, e.clientY);
    if (!w) return;
    const prayer = lineEl.dataset.prayer ?? "the siddur";
    setWord({ word: w, prayer, entries: null });
    fetch(`/api/word?w=${encodeURIComponent(w)}`)
      .then((r) => r.json())
      .then((j: { entries?: WordEntry[]; error?: string }) => setWord((cur) => (cur?.word === w ? { ...cur, entries: j.entries ?? [], error: j.error } : cur)))
      .catch(() => setWord((cur) => (cur?.word === w ? { ...cur, entries: [], error: "The dictionaries couldn't be reached just now." } : cur)));
  };

  /** The Koren siddur's laws in a range, from its "Gates to Prayer". */
  const openLaws = async (range: LawRange) => {
    setLaws({ range, items: null });
    try {
      const gates = (tree ?? []).flatMap(function leaves(n: ContentsNode): string[] {
        return [...(n.section ? [n.section] : []), ...n.children.flatMap(leaves)];
      }).filter((s) => /gates to prayer/i.test(s));
      const found: Array<{ n: string; text: string }> = [];
      for (const section of gates) {
        const lines = await fetchRaw(section);
        for (const l of lines) {
          const en = l.en ?? "";
          const nums = lawNumbersIn(en);
          nums.forEach((x, k) => {
            if (x.n < range.from || x.n > range.to) return;
            const text = en.slice(x.at, k + 1 < nums.length ? nums[k + 1].at : undefined).trim();
            found.push({ n: `${x.n}${x.suffix}`, text: text.replace(/^\d{1,3}[a-z]?\s+/, "") });
          });
        }
        if (found.length >= range.to - range.from + 1) break;
      }
      setLaws({ range, items: found, ...(found.length ? {} : { error: "These laws aren't in this siddur's text in the library." }) });
    } catch {
      setLaws({ range, items: [], error: "The laws couldn't be opened just now." });
    }
  };

  /** Keeps this siddur's daily prayers on the device, for davening without a connection. */
  const keepOffline = async () => {
    const listing = await listBook(book);
    if (!("sections" in listing)) return;
    const wanted = listing.sections.filter((s) => /^(weekdays|shabbat|giving thanks)/i.test(partOf(book, s)));
    setOffline({ done: 0, total: wanted.length, missed: 0 });
    let done = 0;
    let missed = 0;
    let i = 0;
    // The app's page, the library list and this siddur's contents, so it opens with no connection.
    await Promise.all([keepAppPage(), keepAppCode(), keepOnDevice("/api/library"), keepOnDevice(`/api/contents?book=${encodeURIComponent(book)}`)]);
    const worker = async () => {
      while (i < wanted.length) {
        const s = wanted[i++];
        if (!(await keepOnDevice(`/api/text?ref=${encodeURIComponent(s)}&bare=1`))) missed++;
        setOffline({ done: ++done, total: wanted.length, missed });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  };

  const chooseBook = (b: string) => {
    setBook(b);
    keep(SIDDUR_KEY, b);
  };

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  // ---------------------------------------------------------------- the services for today

  const shabbat = davening?.dow === 6;
  const nowService = day?.afterSunset ? "Maariv" : prayerForHour(new Date().getHours());
  const services = useMemo(() => {
    if (!tree || !book) return [];
    const named = (name: string, label: string, kind = label) => ({ name: kind, label, section: sectionByName(tree, name) });
    const general = (name: string, label = name) => ({ name, label, section: serviceStart(book, tree, name, shabbat) });
    let list: Array<{ name: string; label: string; section?: string }>;
    if (davening?.yomTov && !shabbat) {
      list = [
        named("Ma'ariv for Shabbat and Yom Tov", "Maariv"),
        named("Shaharit for Shabbat and Yom Tov", "Shacharit"),
        named("Amida for Yom Tov", "Amidah for Yom Tov", "Amidah"),
        named("Hallel", "Hallel"),
        named("Musaf for Festivals", "Musaf"),
        named("Minha for Shabbat and Yom Tov", "Mincha"),
      ];
    } else if (shabbat) {
      list = [general("Kabbalat Shabbat"), general("Maariv"), general("Shacharit"), general("Musaf"), general("Mincha")];
      if (davening && hallelToday(davening, prefs.customs)) list.splice(3, 0, named("Hallel", "Hallel"));
    } else {
      list = [general("Shacharit")];
      if (davening && hallelToday(davening, prefs.customs)) list.push(named("Hallel", davening.hallel === 1 ? "Half Hallel" : "Hallel"));
      if (davening?.roshChodesh) list.push(named("Musaf for Rosh Hodesh", "Musaf"));
      else if (davening?.cholHamoed) list.push(named("Musaf for Festivals", "Musaf"));
      list.push(general("Mincha"), general("Maariv"));
    }
    return list.filter((s) => s.section);
  }, [tree, book, shabbat, davening, prefs.customs]);

  const extras = useMemo(() => {
    if (!tree || !book) return [];
    const seen = new Set<string>();
    return EXTRAS.filter((x) => !x.when || x.when(davening))
      .map((x) => ({ ...x, section: findPrayers([{ book, nodes: tree }], x.name, 1)[0]?.section }))
      .filter((x) => x.section && !seen.has(x.section) && seen.add(x.section));
  }, [tree, book, davening]);

  /** Today's places to continue: one per service, from today. */
  const continues = useMemo(() => {
    const today = day?.date ?? "";
    return Object.entries(marks)
      .filter(([key, m]) => key.startsWith(`${book}|`) && m.date === today && m.section)
      .map(([key, m]) => ({ key, section: m.section, service: SERVICE_LABEL[key.split("|")[2]] ?? "", ...shown(book, m.section) }))
      .slice(0, 4);
  }, [marks, book, day?.date, shown]);

  // ---------------------------------------------------------------- rendering

  const renderSegs = (segs: Seg[], prayer: string, bitKey: string): ReactNode =>
    segs.map((s, i) => {
      if (s.mark)
        return (
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
        );
      if (s.alt === "gender") {
        if (prefs.wording !== "both") return <span key={i}>{s.options[prefs.wording === "men" ? 0 : 1].text}</span>;
        return (
          <span key={i} className="sd-alt" role="group" aria-label={`${s.options[0].label} or ${s.options[1].label.toLowerCase()}`}>
            {s.options.map((o, j) => (
              <span key={j} className="sd-opt-wrap">
                {j > 0 && <span className="sd-or" aria-hidden="true">/</span>}
                <span className="sd-opt">
                  <span className="sd-opt-label">{o.label}</span>
                  <span className="sd-opt-text">{o.text}</span>
                </span>
              </span>
            ))}
          </span>
        );
      }
      if (s.alt === "when") {
        const today = s.condition ? appliesToday(s.condition, davening) : undefined;
        const key = `${bitKey}:${i}`;
        const name = s.condition ? CONDITION_NAMES[s.condition] : s.label;
        if (prefs.today && today === false && !openBits.has(key))
          return (
            <button key={i} type="button" className="sd-fold-mini" title={`Said ${s.condition ? whenWords(s.condition) : s.label}: not today. Show it`} onClick={() => setOpenBits((b) => toggle(b, key))}>
              +
            </button>
          );
        return (
          <span key={i} className={`sd-insert${today === true ? " now" : ""}`}>
            <span className="sd-tag when" title={name}>
              {s.label}
              {today === true && <span className="sd-now"> · today</span>}
              {today === false && <span className="sd-not"> · not today</span>}
            </span>
            {s.words}
          </span>
        );
      }
      if (s.alt === "response")
        return (
          <span key={i} className="sd-resp" title="The congregation answers">
            <span className="sd-resp-who">{s.who}:</span> {s.words}
          </span>
        );
      return <span key={i}>{s.text}</span>;
    });

  /** Whether a phrase is folded away in today's view (said only on another day). */
  const phraseFolded = (p: Phrase, key: string) => {
    if (!prefs.today || !p.tag?.condition) return false;
    return appliesToday(p.tag.condition, davening) === false && !openBits.has(key);
  };

  const renderPhrase = (p: Phrase, i: number, ref: string, prayer: string, english: boolean, first: boolean) => {
    const key = `${ref}:${english ? "en" : "he"}:${i}`;
    const today = p.tag?.condition ? appliesToday(p.tag.condition, davening) : undefined;
    if (phraseFolded(p, key))
      return (
        <span key={i} className="sd-ph sd-ph-folded">
          <button type="button" className="sd-fold-mini wide" onClick={() => setOpenBits((b) => toggle(b, key))} title={`Said ${whenWords(p.tag!.condition!)}: not today`}>
            + {p.tag!.text}
          </button>
        </span>
      );
    const segs = english && first && prefs.lang === "both" ? withoutHebrewOpening(p.segs) : p.segs;
    return (
      <span key={i} className={`sd-ph${today === false ? " sd-not-today" : ""}${today === true ? " sd-today-line" : ""}${p.tag?.kind === "role" && /^(cong|congregation|all|קהל)/i.test(p.tag.text) ? " sd-cong" : ""}`}>
        {p.tag && (
          <span className={`sd-tag ${p.tag.kind}`}>
            {p.tag.text}
            {today === true && <span className="sd-now"> · today</span>}
            {today === false && <span className="sd-not"> · not today</span>}
          </span>
        )}
        {renderSegs(segs, prayer, key)}
      </span>
    );
  };

  /** The Hebrew a reader sees on a line (folded phrases left out), for transliteration. */
  const visibleHebrew = (l: SiddurLine) =>
    l.he
      .filter((p, i) => !phraseFolded(p, `${l.ref}:he:${i}`))
      .map((p) =>
        p.segs
          .map((s) => (s.alt === "gender" ? (prefs.wording === "women" ? s.options[1].text : s.options[0].text) : s.alt === "when" ? "" : s.alt === "response" ? s.words : s.text))
          .join(""),
      )
      .join(" ");

  const translitLine = (l: SiddurLine) => (prefs.translit === "off" || !l.he.length ? null : <p className="sd-tr">{transliterate(visibleHebrew(l), prefs.translit)}</p>);

  const instructionBlock = (l: SiddurLine, prayer: string) => {
    const text = l.instruction ?? "";
    const lawsHere = lawRanges(text);
    const links = tree ? prayerLinks(text).filter((p) => sectionByName(tree, p.name)) : [];
    return (
      <div className="sd-instr">
        <p>{l.en.map((p, i) => renderPhrase(p, i, l.ref, prayer, true, false))}</p>
        <div className="sd-instr-actions">
          {links.map((p) => (
            <button key={p.name} type="button" className="link sd-ask" onClick={() => openNamed(p.name)}>
              Open {p.label} ›
            </button>
          ))}
          {instructions &&
            lawsHere.map((r) => (
              <button key={r.label} type="button" className="link sd-ask" onClick={() => void openLaws(r)}>
                {r.label}
              </button>
            ))}
          <button type="button" className="link sd-ask" onClick={() => onAsk(`The siddur says, in ${prayer}: “${text}” Why do we do this, and what is the halacha?`)}>
            Ask about this
          </button>
        </div>
      </div>
    );
  };

  const glossRow = (rows: GlossRow[]) => (
    <p className="sd-il" lang="he" dir="rtl">
      {rows.map((r, i) => (
        <span key={i} className="sd-il-w">
          <span className="sd-il-he">{r.he}</span>
          {prefs.translit !== "off" && <span className="sd-il-tr">{transliterate(r.he, prefs.translit)}</span>}
          <span className="sd-il-en" dir="ltr">
            {r.en ?? "—"}
          </span>
        </span>
      ))}
    </p>
  );

  const renderLine = (it: Extract<Item, { kind: "line" }>, pane?: "he" | "en") => {
    const l = it.line;
    const key = keyLine(l);
    if (l.kind === "heading" && l.heading) {
      return (
        <h3 key={l.ref} className="sd-h" data-i={pane ? it.key : undefined} {...(pane !== "en" ? { "data-stop": l.heading.en, "data-section": it.chunk.section } : {})}>
          <span>{l.heading.en}</span>
          <span className="he" lang="he" dir="rtl">
            {l.heading.he}
          </span>
        </h3>
      );
    }
    if (l.kind === "instruction") {
      if (pane === "he") return <div key={l.ref} data-i={it.key} className="sd-pane-gap" />;
      return (
        <div key={l.ref} data-i={pane ? it.key : undefined}>
          {instructionBlock(l, it.prayer)}
        </div>
      );
    }
    const stopAttrs = key && pane !== "en" ? { "data-stop": key, "data-section": it.chunk.section } : {};
    if (layout === "words" && l.he.length) {
      const g = glosses[l.ref];
      return (
        <div key={l.ref} className="sd-line" {...stopAttrs}>
          {Array.isArray(g) ? (
            glossRow(g)
          ) : (
            <>
              <p className="sd-he" lang="he" dir="rtl" data-prayer={it.prayer}>
                {l.he.map((p, i) => renderPhrase(p, i, l.ref, it.prayer, false, i === 0))}
              </p>
              {translitLine(l)}
              <p className="sd-gloss-state">{g === "loading" ? "Word by word…" : g === "failed" ? "Word by word couldn't be made for this line." : "No word-by-word translation for this line yet."}</p>
            </>
          )}
        </div>
      );
    }
    const showHe = pane !== "en" && prefs.lang !== "en" && l.he.length > 0;
    const showEn = pane !== "he" && (pane === "en" || prefs.lang !== "he") && l.en.length > 0;
    return (
      <div key={l.ref} className="sd-line" data-i={pane ? it.key : undefined} {...stopAttrs}>
        {showHe && (
          <p className="sd-he" lang="he" dir="rtl" data-prayer={it.prayer}>
            {l.he.map((p, i) => renderPhrase(p, i, l.ref, it.prayer, false, i === 0))}
          </p>
        )}
        {showHe && translitLine(l)}
        {showEn && <p className={`sd-en${showHe ? " under" : ""}`}>{l.en.map((p, i) => renderPhrase(p, i, l.ref, it.prayer, true, i === 0 && (showHe || pane === "en")))}</p>}
      </div>
    );
  };

  const renderItem = (it: Item, pane?: "he" | "en"): ReactNode => {
    const di = pane ? { "data-i": it.key } : {};
    switch (it.kind) {
      case "section": {
        const stop = pane !== "en" ? { "data-stop": it.short, "data-section": it.chunk.section } : {};
        const missing = layout === "words" && it.chunk.lines.some((l) => l.kind === "prayer" && glosses[l.ref] === "none");
        return (
          <div key={it.key} className="sd-sec-wrap" {...di}>
            <h2 className="sd-sec" {...stop}>
              {it.crumb && <span className="sd-crumb">{it.crumb}</span>}
              <span>{it.short}</span>
              {it.he && (
                <span className="he" lang="he" dir="rtl">
                  {it.he}
                </span>
              )}
            </h2>
            {missing && pane !== "en" && (
              <div className="sd-make-words">
                <button type="button" className="btn quiet" onClick={() => void makeWords(it.chunk)}>
                  Make word by word for this prayer
                </button>
                <p className="fine-left">RabbAI&apos;s translation, not from the library and not yet reviewed by the rabbinic board.</p>
              </div>
            )}
          </div>
        );
      }
      case "fold":
        return (
          <div key={it.key} className={`sd-fold${it.open ? " open" : ""}`} {...di}>
            <button type="button" className="sd-fold-btn" aria-expanded={it.open} onClick={() => setOpenFolds((f) => toggle(f, it.key))}>
              <span className="sd-fold-what">{it.whole ? "Not said today" : `Not said today · ${it.count} ${it.count === 1 ? "line" : "lines"}`}</span>
              <span className="sd-fold-why">{it.reason}</span>
              <span className="sd-fold-act">{it.open ? "Hide" : "Show"}</span>
            </button>
          </div>
        );
      case "note":
        if (pane === "he") return <div key={it.key} data-i={it.key} className="sd-pane-gap" />;
        return (
          <div key={it.key} className="sd-instr sd-note" {...di}>
            <p>{it.note.say}</p>
            <p className="fine-left">
              RabbAI&apos;s note, not yet reviewed by the rabbinic board. Suggested sources, for review: {it.note.sources.join("; ")}.
            </p>
            <button type="button" className="link sd-ask" onClick={() => onAsk(`At ${it.prayer}: “${it.note.say}” Why do we do this, and what is the halacha?`)}>
              Ask about this
            </button>
          </div>
        );
      case "para": {
        const showHe = prefs.lang !== "en";
        const showEn = prefs.lang !== "he";
        return (
          <div key={it.key} className="sd-para">
            {showHe && (
              <p className="sd-he" lang="he" dir="rtl" data-prayer={it.prayer}>
                {it.lines.flatMap((l) => l.he.map((p, i) => renderPhrase(p, i, l.ref, it.prayer, false, i === 0)))}
              </p>
            )}
            {showHe && prefs.translit !== "off" && <p className="sd-tr">{it.lines.map((l) => transliterate(visibleHebrew(l), prefs.translit as "sephardi" | "ashkenazi")).join(" ")}</p>}
            {showEn && <p className="sd-en">{it.lines.flatMap((l) => l.en.map((p, i) => renderPhrase(p, i, l.ref, it.prayer, true, i === 0 && showHe)))}</p>}
          </div>
        );
      }
      case "line":
        return renderLine(it, pane);
    }
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

  const seg = <T extends string>(label: string, value: T, options: Array<[T, string]>, onPick: (v: T) => void) => (
    <div className="sd-menu-row">
      <span className="sd-menu-label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onPick(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );

  const menu = menuOpen ? (
    <>
      <button type="button" className="menu-scrim sd-scrim" aria-label="Close the settings" onClick={() => setMenuOpen(false)} />
      <div className="sd-menu" role="dialog" aria-label="Siddur settings">
        {seg("Show", prefs.today ? "today" : "all", [["today", "Today's davening"], ["all", "Everything"]], (v) => setPref("today", v === "today"))}
        <p className="fine-left sd-menu-note">Today&apos;s davening folds what isn&apos;t said today, and shows today&apos;s additions. RabbAI&apos;s reading of the calendar, not yet reviewed by the rabbinic board. A folded part opens with a tap.</p>
        {seg("Layout", layout, LAYOUTS.map((l) => [l.id, l.label] as [Layout, string]), (v) => setPref("layout", v))}
        {seg("Language", prefs.lang, [["he", "עברית"], ["both", "Both"], ["en", "English"]], (v) => setPref("lang", v))}
        {seg("Transliteration", prefs.translit, [["off", "Off"], ["sephardi", "Sephardi"], ["ashkenazi", "Ashkenazi"]], (v) => setPref("translit", v))}
        {prefs.translit !== "off" && <p className="fine-left sd-menu-note">RabbAI&apos;s transliteration from the siddur&apos;s vowels: it may have small mistakes, and isn&apos;t yet reviewed by the rabbinic board.</p>}
        {seg("Where men and women say different words", prefs.wording, [["both", "Show both"], ["men", "Men's"], ["women", "Women's"]], (v) => setPref("wording", v))}
        <div className="sd-menu-row">
          <span className="sd-menu-label">Siddur</span>
          <select value={book} onChange={(e) => chooseBook(e.target.value)} aria-label="Siddur">
            {siddurs.map((s) => (
              <option key={s} value={s}>
                {s.replace(/^The /, "")}
              </option>
            ))}
          </select>
        </div>
        {torahChoice &&
          seg(
            "The blessings over the Torah",
            prefs.torahBlessings,
            [
              ["before-morning-blessings", "Before the morning blessings"],
              ["as-printed", "Where this siddur prints them"],
            ],
            (v) => setPref("torahBlessings", v),
          )}
        {torahChoice && (
          <p className="fine-left sd-menu-note">
            This siddur prints them straight after waking, before tallit and tefillin. Most siddurim have them after the preparation for prayer, just before the morning blessings; that is
            the order here unless you change it. The words are the same. Not yet reviewed by the rabbinic board.
          </p>
        )}
        <fieldset className="sd-customs">
          <legend>Your community&apos;s customs</legend>
          <label>
            <input type="checkbox" checked={prefs.customs.modernDays} onChange={(e) => setPref("customs", { ...prefs.customs, modernDays: e.target.checked })} /> Yom HaAtzma&apos;ut and Yom
            Yerushalayim: Hallel, and no Tachanun
          </label>
          {davening?.israel && (
            <label>
              <input type="checkbox" checked={prefs.customs.viduyIsrael} onChange={(e) => setPref("customs", { ...prefs.customs, viduyIsrael: e.target.checked })} /> Viduy and the Thirteen
              Attributes before Tachanun
            </label>
          )}
        </fieldset>
        <label className="sd-menu-check">
          <input type="checkbox" checked={prefs.wordTap} onChange={(e) => setPref("wordTap", e.target.checked)} /> Tap a Hebrew word to see its meaning
        </label>
        {seg("Light or dark", theme, [["system", "Auto"], ["light", "Light"], ["dark", "Dark"]], onTheme)}
        <div className="sd-menu-row">
          <span className="sd-menu-label">Without a connection</span>
          <button type="button" className="btn quiet" disabled={!!offline && offline.done < offline.total} onClick={() => void keepOffline()}>
            {offline ? (offline.done < offline.total ? `Keeping… ${offline.done} of ${offline.total}` : offline.missed ? `Kept ${offline.total - offline.missed} of ${offline.total}; try again for the rest` : "Kept on this device ✓") : "Keep this siddur on this device"}
          </button>
          <p className="fine-left sd-menu-note">The daily and Shabbat prayers, kept in this browser so the siddur opens without a connection. Today&apos;s changes need a connection.</p>
        </div>
      </div>
    </>
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
    const lastNames = last ? shown(last.book, last.section) : null;
    const now = services.find((s) => s.name === nowService) ?? services[0];
    const nowContinue = continues.find((c) => c.service === now?.label || c.service === now?.name);
    const notes = davening?.notes ?? [];
    const extraGroups = [...new Set(extras.map((x) => x.group))].map((g) => ({ group: g, items: extras.filter((x) => x.group === g) }));
    return (
      <div className="siddur">
        <div className="sd-scroll sd-home">
          <div className="sd-home-head">
            <div>
              <h2>Daven</h2>
              {day && (
                <p className="sd-home-date">
                  {day.hebrew}
                  {day.todayIs.length > 0 && <span className="sd-home-is"> · {day.todayIs.join(" · ")}</span>}
                </p>
              )}
            </div>
            <button type="button" className="rb-btn sd-aa" onClick={() => setMenuOpen(true)} aria-label="Siddur settings" title="Siddur settings">
              Aa
            </button>
          </div>
          {menu}
          {!online && <p className="note sd-offline" role="status">No connection: showing what is kept on this device. Today&apos;s changes come back with the connection.</p>}
          {davening?.festival === "rosh-hashana" || davening?.festival === "yom-kippur" ? (
            <p className="note">On {davening.festival === "rosh-hashana" ? "Rosh HaShana" : "Yom Kippur"}, daven from a machzor; this siddur has the daily and Shabbat prayers.</p>
          ) : null}

          {now ? (
            <div className="sd-hero" role="group" aria-label="The prayer for now">
              <p className="sd-hero-kicker">Now</p>
              <p className="sd-hero-name">{now.label}</p>
              {SERVICE_NOTE[now.name] && <p className="sd-hero-note">{SERVICE_NOTE[now.name]}</p>}
              <div className="sd-hero-actions">
                <button type="button" className="sd-hero-go" onClick={() => void openAt(nowContinue?.section ?? now.section!)}>
                  {nowContinue ? `Continue at ${nowContinue.short}` : `Begin ${now.label}`}
                </button>
                {nowContinue && (
                  <button type="button" className="sd-hero-alt" onClick={() => void openAt(now.section!)}>
                    From the start
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="note">
              Opening the siddur<span className="dots" />
            </p>
          )}

          {services.length > 0 && (
            <section className="sd-block" aria-labelledby="sd-h-today">
              <h3 id="sd-h-today" className="sd-block-h">
                {shabbat ? "Shabbat's prayers" : davening?.yomTov ? "Yom Tov's prayers" : "Today's prayers"}
              </h3>
              <ul className="sd-rows">
                {services.map((s) => {
                  const cont = continues.find((c) => c.service === s.label || c.service === s.name);
                  return (
                    <li key={`${s.name}-${s.section}`}>
                      <button type="button" className={`sd-row${s === now ? " now" : ""}`} onClick={() => void openAt(s.section!)}>
                        <span className="sd-row-text">
                          <span className="sd-row-title">{s.label}</span>
                          <span className="sd-row-note">{cont ? `You were at ${cont.short}` : (SERVICE_NOTE[s.name] ?? "")}</span>
                        </span>
                        {s === now && <span className="sd-row-badge">Now</span>}
                        <span className="sd-row-chev" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!continues.length && last && lastNames && (
                <button type="button" className="sd-last" onClick={() => void openAt(last.section)}>
                  <span className="sd-last-k">Where you were</span>
                  <span className="sd-last-t">
                    {lastNames.short}
                    {lastNames.crumb ? <span className="muted"> · {lastNames.crumb}</span> : null}
                  </span>
                </button>
              )}
            </section>
          )}

          {day && (notes.length > 0 || (day.zmanim && day.zmanim.items.length > 0)) && (
            <section className="sd-block sd-today" aria-labelledby="sd-h-changes">
              <h3 id="sd-h-changes" className="sd-block-h">
                Today in the davening
              </h3>
              {notes.length > 0 && (
                <ul className="sd-notes">
                  {(notesOpen ? notes : notes.slice(0, 3)).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              {notes.length > 3 && (
                <button type="button" className="link sd-more" aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)}>
                  {notesOpen ? "Show fewer" : `Show all ${notes.length}`}
                </button>
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
                From the Hebrew calendar{davening?.israel ? ", for Israel" : day.place ? "" : ", outside Israel"}, by the siddur&apos;s rules. RabbAI&apos;s reading, not yet reviewed by the
                rabbinic board.{" "}
                {!day.place && (
                  <button type="button" className="link" onClick={onPlace}>
                    Set your place
                  </button>
                )}
              </p>
            </section>
          )}

          {extraGroups.map((g) => (
            <section key={g.group} className="sd-block" aria-label={g.group}>
              <h3 className="sd-block-h">{g.group}</h3>
              <div className="sd-tiles">
                {g.items.map((x) => (
                  <button key={x.name} type="button" className="sd-tile" onClick={() => void openAt(x.section!)}>
                    <span className="sd-tile-title">{x.label}</span>
                    {x.note && <span className="sd-tile-note">{x.note}</span>}
                  </button>
                ))}
              </div>
            </section>
          ))}

          <DavenTools day={day} place={place} onAsk={onAsk} onLearn={onLearn} onOpen={openNamed} onPlace={onPlace} />

          {outline.length > 0 && (
            <section className="sd-block" aria-labelledby="sd-h-all">
              <h3 id="sd-h-all" className="sd-block-h">
                The whole siddur
              </h3>
              <SiddurOutline outline={outline} onOpen={(sec) => void openAt(sec)} />
            </section>
          )}

          <div className="sd-which">
            <label className="sd-pick">
              <span className="sd-pick-label">Siddur</span>
              <select value={book} onChange={(e) => chooseBook(e.target.value)}>
                {siddurs.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/^The /, "")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {testing && <p className="fine-left">From the testing library: not yet approved by the rabbinic board.</p>}
        </div>
      </div>
    );
  }

  const stop = stops[current];
  const prevStop = stops[current - 1];
  const nextStop = stops[current + 1] ?? (chunks[chunks.length - 1]?.next ? { label: shown(book, chunks[chunks.length - 1].next!).short, section: "" } : undefined);
  const nowChunk = chunks.find((c) => c.section === stop?.section) ?? chunks[0];
  const nowNames = nowChunk ? shown(book, nowChunk.section) : null;
  const layoutNow = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0];
  const nextLayout = LAYOUTS[(LAYOUTS.findIndex((l) => l.id === layout) + 1) % 3] ?? LAYOUTS[0];
  // What comes after this in the same part of the siddur, under its headings, for the jump list.
  const nowCategory = nowChunk ? outline.find((c) => c.groups.some((g) => g.items.some((i) => i.section === nowChunk.section))) : undefined;
  const loaded = new Set(chunks.map((c) => c.section));
  const lastLoaded = chunks.length ? orderRef.current.indexOf(chunks[chunks.length - 1].section) : -1;
  const furtherOn = (nowCategory?.groups ?? [])
    .map((g) => ({ title: g.title, items: g.items.filter((i) => !loaded.has(i.section) && orderRef.current.indexOf(i.section) > lastLoaded) }))
    .filter((g) => g.items.length > 0);

  const bodyTop = (
    <>
      {testing && <p className="sd-label">Testing library · not yet approved by the rabbinic board</p>}
      {!online && <p className="note sd-offline" role="status">No connection: showing what is kept on this device. Today&apos;s changes come back with the connection.</p>}
      {davening && davening.notes.length > 0 && (
        <button type="button" className="sd-today-chip" aria-expanded={todayOpen} onClick={() => setTodayOpen(!todayOpen)}>
          {prefs.today ? "Today's davening" : "Everything"} · {davening.notes.length} {davening.notes.length === 1 ? "note" : "notes"} for today {todayOpen ? "▴" : "▾"}
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
          {loading === "prev" ? "Opening…" : `Earlier: ${shown(book, chunks[0].prev).short}`}
        </button>
      )}
    </>
  );

  const endBlock = (
    <div ref={endRef} className="sd-end">
      {chunks.length > 0 &&
        (chunks[chunks.length - 1].next ? (
          <button type="button" className="btn sd-next-prayer" disabled={loading === "next"} onClick={() => void loadNext()}>
            {loading === "next"
              ? "Opening…"
              : `Continue: ${(() => {
                  const lastC = chunks[chunks.length - 1];
                  const n = shown(book, lastC.next!);
                  const other = partOf(book, lastC.next!) !== partOf(book, lastC.section);
                  return other && n.crumb ? `${n.crumb} · ${n.short}` : n.short;
                })()} ›`}
          </button>
        ) : (
          <p className="fine-left">The end of the siddur.</p>
        ))}
    </div>
  );

  return (
    <div className={`siddur reading layout-${layout}`}>
      <div className="sd-bar">
        <button type="button" className="rb-back" onClick={() => setView("home")} aria-label="Back to the siddur's home">
          <span aria-hidden="true">←</span>
          <span className="rb-back-label">Daven</span>
        </button>
        <button type="button" className="sd-title" onClick={() => setContentsOpen(!contentsOpen)} aria-expanded={contentsOpen}>
          {nowNames?.crumb && <span className="rb-crumb">{nowNames.crumb}</span>}
          <span className="rb-t">{nowNames?.short ?? "Siddur"}</span>
        </button>
        <button
          type="button"
          className="rb-btn sd-layout"
          onClick={() => setPref("layout", layout === "panes" ? "lines" : nextLayout.id)}
          aria-label={`Layout: ${layoutNow.label}. Switch to ${layout === "panes" ? "Line by line" : nextLayout.label}`}
          title={`Layout: ${layoutNow.label} (tap to switch)`}
        >
          <span aria-hidden="true">{layoutNow.icon}</span>
          <span className="sd-layout-label">{layoutNow.label}</span>
        </button>
        <button type="button" className="rb-btn sd-aa" onClick={() => setMenuOpen(true)} aria-label="Siddur settings" title="Settings">
          Aa
        </button>
        {nowChunk && (
          <button type="button" className="rb-btn sd-learn" onClick={() => onLearn(nowChunk.section)} title="Learn this prayer, with its words and commentaries">
            Learn
          </button>
        )}
      </div>
      {menu}
      {contentsOpen && (
        <div className="sd-contents">
          <SiddurOutline outline={outline} current={nowChunk?.section} onOpen={(sec) => void openAt(sec)} />
        </div>
      )}
      {layout === "panes" ? (
        <div className="sd-panes" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className={`sd-scroll sd-body sd-pane he lang-he`} ref={bodyRef} onClick={onBodyClick}>
            {bodyTop}
            {items.map((it) => renderItem(it, "he"))}
            {endBlock}
          </div>
          <div className="sd-scroll sd-pane en" ref={enRef}>
            {items.map((it) => renderItem(it, "en"))}
          </div>
        </div>
      ) : (
        <div className={`sd-scroll sd-body lang-${prefs.lang}`} ref={bodyRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={onBodyClick}>
          {bodyTop}
          {layout === "words" && <p className="sd-label">Word by word: RabbAI&apos;s translation of each word, not from the library and not yet reviewed by the rabbinic board.</p>}
          {items.map((it) => renderItem(it))}
          {endBlock}
        </div>
      )}
      <nav className="sd-nav" aria-label="Move through the davening">
        <button type="button" className="sd-step" disabled={!prevStop && !chunks[0]?.prev} onClick={() => step(-1)} aria-label={prevStop ? `Back: ${prevStop.label}` : "Back"}>
          <span aria-hidden="true">‹</span> <span className="sd-step-label">{prevStop?.label ?? (chunks[0]?.prev ? "Earlier" : "")}</span>
        </button>
        <button type="button" className="sd-where" aria-live="polite" aria-expanded={jumpOpen} onClick={() => setJumpOpen(!jumpOpen)} title="Jump to a place in the davening">
          {stop?.label ?? "Jump to…"} <span aria-hidden="true">▴</span>
        </button>
        <button type="button" className="sd-step next" disabled={!nextStop} onClick={() => step(1)} aria-label={nextStop ? `Next: ${nextStop.label}` : "Next"}>
          <span className="sd-step-label">{nextStop?.label ?? ""}</span> <span aria-hidden="true">›</span>
        </button>
      </nav>
      {jumpOpen && (
        <>
          <button type="button" className="menu-scrim sd-scrim" aria-label="Close" onClick={() => setJumpOpen(false)} />
          <div className="sd-jump" role="dialog" aria-label="Jump to">
            <p className="sd-jump-h">On this page</p>
            <ul>
              {stops.map((s, i) => (
                <li key={`${s.section}-${i}`}>
                  <button type="button" className={`sd-jump-item${i === current ? " on" : ""}${KEY_LINES.some((k) => k.label === s.label) ? " key" : ""}`} onClick={() => jumpTo(i)}>
                    {KEY_LINES.some((k) => k.label === s.label) ? "★ " : ""}
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
            {furtherOn.length > 0 && (
              <>
                {furtherOn.map((g) => (
                  <div key={g.title || "more"}>
                    <p className="sd-jump-h">{g.title || "Further on"}</p>
                    <ul>
                      {g.items.map((n) => (
                        <li key={n.section}>
                          <button type="button" className="sd-jump-item" onClick={() => void openAt(n.section)}>
                            {n.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
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
      {word && (
        <div className="sd-pop sd-word" role="dialog" aria-label={`The word ${word.word}`}>
          <p className="sd-pop-title he" lang="he" dir="rtl">
            {word.word}
          </p>
          {word.entries === null ? (
            <p className="muted">
              Looking in the dictionaries<span className="dots" />
            </p>
          ) : word.entries.length ? (
            <div className="sd-word-body">
              <DictRows entries={word.entries} />
            </div>
          ) : (
            <p className="muted">{word.error ?? "The library's dictionaries don't have this word."}</p>
          )}
          <div className="sd-pop-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const w = word;
                setWord(null);
                onAsk(`What does the word “${w.word}” mean in ${w.prayer}?`);
              }}
            >
              Ask RabbAI about this word
            </button>
            <button type="button" className="btn quiet" onClick={() => setWord(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {laws && (
        <div className="sd-pop sd-laws" role="dialog" aria-label={laws.range.label}>
          <p className="sd-pop-title">{laws.range.label} · the Koren siddur&apos;s Gates to Prayer</p>
          <div className="sd-laws-body">
            {laws.items === null ? (
              <p className="muted">
                Opening the laws<span className="dots" />
              </p>
            ) : laws.items.length ? (
              laws.items.map((x) => (
                <p key={x.n}>
                  <strong>{x.n}</strong> {x.text}
                </p>
              ))
            ) : (
              <p className="muted">{laws.error}</p>
            )}
          </div>
          <div className="sd-pop-actions">
            <button type="button" className="btn quiet" onClick={() => setLaws(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The settings, before the browser's storage is read (the first paint on the server). */
function loadPrefsSafe(): DavenPrefs {
  return typeof window === "undefined" ? { ...loadPrefsDefault() } : loadPrefs();
}

function loadPrefsDefault(): DavenPrefs {
  return { layout: "lines", lang: "both", today: true, wording: "both", translit: "off", wordTap: true, customs: { modernDays: false, viduyIsrael: false }, torahBlessings: "before-morning-blessings" };
}
