"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { pieceWords, splitOpening, withoutPoints, wordKey, type DafData, type DafPart, type DafPiece, type DafPrinted as Printed } from "@/lib/library/daf";
import type { DafPageProps } from "./DafPage";

/*
 * One amud of the Bavli exactly as the Vilna page prints it: every line where it sits on the page,
 * holding the words it holds there, so a word found on a line of a printed Gemara is in the same
 * place here. The positions come from a scan of the Romm printing (tools/daf_layout.py); the words
 * are the library's, each its own element, so it can be tapped, colored, or marked.
 *
 * Each line is set in the font at the printed letters' height, then stretched (or, rarely, squeezed)
 * to exactly the printed line's width.
 */

const MIN_PAGE = 320;
const MAX_FIT = 980;
/**
 * The printed letters' height over the font size to set them at: the height of an ordinary letter in
 * each part's typeface (Romm Vilna for the Gemara, Mekorot for Rashi and Tosafot; see daf-fonts.ts),
 * so the letters come out as tall as on the printed page.
 */
const LETTER_EM: Record<DafPart, number> = { main: 0.543, rashi: 0.726, tosafot: 0.726 };
const HAS_LETTERS = /[א-ת]/;
/** The same for the heading's typeface (Romm Vilna Heading): its letters, and its figures. */
const HEADING_EM = { letters: 0.541, figures: 0.51 };
const ESTIMATE_NOTE = "Placed by estimate: the scan didn't show for certain which line this word is on.";
/** A word set in a wider space than its letters need is stretched at most this much (then it sits at its right). */
const MAX_STRETCH = 1.35;

export default function DafPrinted({ data, zoom, selectedRef, linkedRefs, activeWord, kinds, marks, onWord, vowels }: DafPageProps & { data: DafData & { printed: Printed } }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState(0);
  const [fontsSeen, setFontsSeen] = useState(0);
  const printed = data.printed;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSpace(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let live = true;
    const bump = () => live && setFontsSeen((n) => n + 1);
    void document.fonts.ready.then(bump);
    document.fonts.addEventListener?.("loadingdone", bump);
    return () => {
      live = false;
      document.fonts.removeEventListener?.("loadingdone", bump);
    };
  }, []);

  const [ax0, ay0, ax1, ay1] = printed.area;
  const width = Math.max(MIN_PAGE, Math.round(Math.min(space || MAX_FIT, MAX_FIT) * zoom));
  const k = width / (ax1 - ax0);
  const height = Math.round((ay1 - ay0) * k);

  const pieces = useMemo(() => {
    const m = new Map<string, { words: string[]; opening: number; part: DafPart; vowels?: string[] }>();
    const add = (p: DafPiece, part: DafPart) =>
      m.set(p.ref, { words: pieceWords(p.he), opening: part === "main" ? 0 : pieceWords(splitOpening(p.he).opening).length, part, vowels: p.vowels });
    for (const p of data.main) add(p, "main");
    for (const p of data.rashi) add(p, "rashi");
    for (const p of data.tosafot) add(p, "tosafot");
    for (const p of printed.extra) add(p, p.part);
    return m;
  }, [data, printed]);
  const firstMain = data.main[0]?.ref;
  const estimated = useMemo(() => new Set(printed.estimated), [printed]);

  // Fit each line's words to the printed line's width: spread them when they are narrower, squeeze
  // them when wider. A line whose word places are known instead fits each word to its printed width.
  // Measure everything first, then set everything, so the page reflows once.
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !space) return;
    const fits = [...page.querySelectorAll<HTMLElement>(".daf-pfit")];
    const words = [...page.querySelectorAll<HTMLElement>(".dwi")];
    const heads = [...page.querySelectorAll<HTMLElement>(".dhead-fit")];
    for (const h of heads) h.style.transform = "none";
    const naturalHeads = heads.map((h) => h.offsetWidth);
    for (const f of fits) {
      f.style.wordSpacing = "0px";
      f.style.transform = "none";
    }
    for (const w of words) w.style.transform = "none";
    const natural = fits.map((f) => f.offsetWidth);
    const naturalWords = words.map((w) => w.offsetWidth);
    fits.forEach((f, i) => {
      const target = Number(f.dataset.w);
      const gaps = Number(f.dataset.gaps);
      if (!natural[i] || !target) return;
      if (natural[i] <= target && gaps > 0) f.style.wordSpacing = `${(target - natural[i]) / gaps}px`;
      else if (Math.abs(natural[i] - target) > 0.5) f.style.transform = `scaleX(${target / natural[i]})`;
    });
    words.forEach((w, i) => {
      const target = Number(w.dataset.w);
      if (!naturalWords[i] || !target) return;
      const scale = Math.min(MAX_STRETCH, target / naturalWords[i]);
      // Words much wider than their printed place are the library's spelling of a short form in the
      // print (the print's הקב״ה is "הקדוש ברוך הוא" here): set them smaller as well as narrower, so
      // they stay readable in that place.
      const down = scale < 0.75 ? Math.max(0.55, Math.sqrt(scale)) : 1;
      if (Math.abs(scale - 1) > 0.01) w.style.transform = down < 1 ? `scale(${scale}, ${down})` : `scaleX(${scale})`;
    });
    // Each heading word fills its printed width exactly.
    heads.forEach((h, i) => {
      const target = Number(h.dataset.w);
      if (naturalHeads[i] && target && Math.abs(naturalHeads[i] - target) > 0.5) h.style.transform = `scaleX(${target / naturalHeads[i]})`;
    });
    // A page wider than the screen starts at its right edge, where Hebrew begins.
    const wrap = wrapRef.current;
    if (wrap && wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft = wrap.scrollWidth;
  }, [printed, width, space, fontsSeen, vowels]);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.getSelection()?.toString().trim()) return;
    const w = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    const seg = w?.closest<HTMLElement>("[data-ref]");
    if (!w || !seg) return;
    // A short form stands for the library's words: those are what is looked up.
    const short = w.dataset.short;
    onWord(seg.dataset.ref!, Number(w.dataset.i), withoutPoints(short ? (w.dataset.full ?? "") : (w.textContent ?? "")), seg.dataset.part as DafPart, short);
  };

  return (
    <div className="daf-wrap" ref={wrapRef}>
      <div
        className="daf daf-printed"
        dir="rtl"
        lang="he"
        ref={pageRef}
        style={{ width, height }}
        onClick={onClick}
        aria-label={`${data.labelHe}: the Gemara with Rashi and Tosafot, line for line as printed`}
      >
        {[...printed.heading, ...printed.labels].map((w, n) => {
          const [x0, y0, x1, y1] = w.box;
          const h = (y1 - y0) * k;
          const figures = /^[0-9]+$/.test(w.text);
          const label = n >= printed.heading.length;
          return (
            <div
              key={`h${n}`}
              className={label ? "daf-head daf-label" : "daf-head"}
              style={{ left: (x0 - ax0) * k, top: (y0 - ay0) * k, width: (x1 - x0) * k, height: h, lineHeight: `${h}px`, fontSize: h / (figures ? HEADING_EM.figures : label ? LETTER_EM.main : HEADING_EM.letters) }}
            >
              <span className="dhead-fit" data-w={(x1 - x0) * k}>
                {w.text}
              </span>
            </div>
          );
        })}
        {printed.marks.map((m, n) => {
          const [x0, y0, x1, y1] = m.box;
          return (
            <svg
              key={`m${n}`}
              className="daf-mark"
              viewBox="0 0 10 10"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{ left: (x0 - ax0) * k, top: (y0 - ay0) * k, width: (x1 - x0) * k, height: (y1 - y0) * k }}
            >
              {m.mark === "°" ? (
                <circle cx="5" cy="5" r="3.7" fill="none" stroke="currentColor" strokeWidth="2.2" />
              ) : (
                <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                  <line x1="5" y1="0.9" x2="5" y2="9.1" />
                  <line x1="1.45" y1="2.95" x2="8.55" y2="7.05" />
                  <line x1="1.45" y1="7.05" x2="8.55" y2="2.95" />
                </g>
              )}
            </svg>
          );
        })}
        {printed.lines.map((line, n) => {
          const [x0, y0, x1, y1] = line.box;
          const h = (y1 - y0) * k;
          const font = (line.letter * k) / LETTER_EM[line.part];
          const places = line.words;
          const tall = new Map((line.big ?? []).map(([w, top, bottom]) => [w, [top, bottom] as const]));
          const short = new Map((line.short ?? []).map(([w, n, form]) => [w, [n, form] as const]));
          let skip = 0; // the rest of a short form's words, drawn by its first
          let words = 0;
          // In a line with word places, each word is a box as wide as the printed word, after a gap as
          // wide as the printed space (the space before the line's first word is from the line's right).
          let edge = x1;
          const placed = (w: number, inner: ReactNode, cls: string | undefined, key: number, extra: Record<string, unknown>, n = 1) => {
            const [l, r] = [places![w + n - 1][0], places![w][1]];
            const gap = Math.max(0, edge - r) * k;
            edge = l;
            // A word printed larger than its line is set at its own letters' height, where they print.
            const t = tall.get(w);
            const size = t
              ? { marginTop: (t[0] - y0) * k, height: (t[1] - t[0]) * k, lineHeight: `${(t[1] - t[0]) * k}px`, fontSize: ((t[1] - t[0]) * k) / LETTER_EM.main }
              : {};
            return [
              <span key={`g${key}`} className="dgap" style={{ width: gap }}>
                {" "}
              </span>,
              <span key={key} className={t ? `${cls} tall` : cls} style={{ width: (r - l) * k, ...size }} {...extra}>
                <span className="dwi" data-w={(r - l) * k}>
                  {inner}
                </span>
              </span>,
            ];
          };
          const segs = line.spans.map(([ref, from, to], s) => {
            const p = pieces.get(ref);
            if (!p) return null;
            const cls = [
              "dseg",
              p.part === "main" && kinds[ref] ? `k-${kinds[ref]}` : "",
              marks[ref] ? `mark-${marks[ref]}` : "",
              selectedRef === ref ? "sel" : "",
              linkedRefs.has(ref) ? "linked" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const out = [];
            for (let i = from; i < to; i++) {
              const w = p.words[i];
              // With the vowels on, the word gains its points and nothing else, in the same box.
              const shown = (vowels && p.vowels?.[i]) || w;
              const bold = i < p.opening || (p.part === "main" && /^(מתני|גמ)['׳]/.test(w));
              const big = p.part === "main" && ref === firstMain && i === 0 && data.daf === 2 && data.amud === "a";
              const on = activeWord?.ref === ref && activeWord.index === i;
              const est = estimated.has(wordKey(ref, i));
              const title = est ? ESTIMATE_NOTE : undefined;
              if (places) {
                if (skip > 0) {
                  skip--;
                  words++;
                  continue;
                }
                const letters = HAS_LETTERS.test(w);
                const cls = letters
                  ? `dw dplaced${bold ? " open" : ""}${big ? " big" : ""}${on ? " on" : ""}${est ? " est" : ""}`
                  : `dplaced${bold ? " open" : ""}`;
                const sf = short.get(words);
                if (sf && letters) {
                  // The print's short form for these words (ק״ש for "קריאת שמע"), in their place, with
                  // the punctuation the library sets around them.
                  const [n, form] = sf;
                  const group = p.words.slice(i, i + n);
                  const span = Array.from({ length: n }, (_, d) => i + d);
                  const onAny = activeWord?.ref === ref && span.includes(activeWord.index);
                  const estAny = span.some((d) => estimated.has(wordKey(ref, d)));
                  const gcls = `dw dplaced short${bold ? " open" : ""}${onAny ? " on" : ""}${estAny ? " est" : ""}`;
                  const full = group.join(" ");
                  const lead = group[0].match(/^[^\u05D0-\u05EA]*/)?.[0] ?? "";
                  const trail = group[n - 1].match(/[^\u05D0-\u05EA\u0591-\u05C7]*$/)?.[0] ?? "";
                  const note = `${form}: printed short for ${withoutPoints(full)}`;
                  out.push(
                    ...placed(words, `${lead}${form}${trail}`, gcls, i, { "data-i": i, "data-short": form, "data-full": full, title: estAny ? `${note}. ${ESTIMATE_NOTE}` : note }, n),
                  );
                  skip = n - 1;
                  words++;
                  continue;
                }
                out.push(...placed(words++, shown, cls, i, letters ? { "data-i": i, title } : {}));
                continue;
              }
              if (words++ > 0) out.push(" ");
              out.push(
                HAS_LETTERS.test(w) ? (
                  <span key={i} data-i={i} className={`dw${bold ? " open" : ""}${big ? " big" : ""}${on ? " on" : ""}${est ? " est" : ""}`} title={title}>
                    {shown}
                  </span>
                ) : (
                  <span key={i} className={bold ? "open" : undefined}>
                    {w}
                  </span>
                ),
              );
            }
            return (
              <span key={s} className={cls} data-ref={ref} data-part={p.part}>
                {out}
              </span>
            );
          });
          return (
            <div
              key={n}
              className={`daf-pline daf-text ${line.part}${places ? " placed" : ""}`}
              style={{ left: (x0 - ax0) * k, top: (y0 - ay0) * k, width: (x1 - x0) * k, height: h, fontSize: font, lineHeight: `${h}px` }}
            >
              {places ? (
                segs
              ) : (
                <span className="daf-pfit" data-w={(x1 - x0) * k} data-gaps={Math.max(0, words - 1)}>
                  {segs}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
