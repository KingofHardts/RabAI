"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { computeSpacers, correctSpacers, mainColumn, sideColumn, splitOpening, withoutPoints, type DafData, type DafPiece, type DafSpacers } from "@/lib/library/daf";

/*
 * One amud of the Bavli set the way it is printed: the Gemara in the middle, Rashi on the inner
 * side (toward the binding) and Tosafot on the outer side, sharing the top lines and wrapping
 * around each other. Every word is its own element, so it can be tapped, colored, or marked.
 *
 * The shape follows the printed page, but the line breaks are the browser's own: this text has no
 * record of where each printed line ended.
 */

type Part = "main" | "rashi" | "tosafot";

export interface DafPageProps {
  data: DafData;
  /** How much bigger than the space it has the page is drawn (1 = fit the width). */
  zoom: number;
  /** The line or comment the person is looking at, and the pieces tied to it. */
  selectedRef: string | null;
  linkedRefs: ReadonlySet<string>;
  activeWord: { ref: string; index: number } | null;
  /** The outline's kind for each Gemara line, such as "question" or "answer". */
  kinds: Readonly<Record<string, string>>;
  /** The person's own marks: a color name for each line or comment they marked. */
  marks: Readonly<Record<string, string>>;
  onWord: (ref: string, index: number, word: string, part: Part) => void;
  /** Show the Gemara's vowels, where the library has them (they never move a word). */
  vowels: boolean;
}

/** Sizes at a 600-pixel page; everything scales with the page's width. */
const AT_600 = { mainFont: 15.5, mainLine: 20, sideFont: 10.5, sideLine: 14.2, padH: 16, padV: 10 };
const MIN_PAGE = 320;
const MAX_FIT = 980;

function wordsOf(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

const HAS_LETTERS = /[א-ת]/;

export default function DafPage({ data, zoom, selectedRef, linkedRefs, activeWord, kinds, marks, onWord, vowels }: DafPageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRefs = { main: useRef<HTMLDivElement>(null), rashi: useRef<HTMLDivElement>(null), tosafot: useRef<HTMLDivElement>(null) };
  const layerRefs = { main: useRef<HTMLDivElement>(null), rashi: useRef<HTMLDivElement>(null), tosafot: useRef<HTMLDivElement>(null) };
  const textRefs = { main: useRef<HTMLDivElement>(null), rashi: useRef<HTMLDivElement>(null), tosafot: useRef<HTMLDivElement>(null) };
  const corrections = useRef(0);
  const [space, setSpace] = useState(0);
  const [fontsSeen, setFontsSeen] = useState(0);
  const [spacers, setSpacers] = useState<DafSpacers | null>(null);
  const [height, setHeight] = useState(0);

  // The width the page has, and again whenever it changes.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSpace(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Measure again once the page's fonts have arrived; a fallback font has other widths.
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

  // Fit the space it has, up to a comfortable reading width; zooming in lets it run wider.
  const width = Math.max(MIN_PAGE, Math.round(Math.min(space, MAX_FIT) * zoom));
  const k = width / 600;
  const size = {
    mainFont: AT_600.mainFont * k,
    mainLine: AT_600.mainLine * k,
    sideFont: AT_600.sideFont * k,
    sideLine: AT_600.sideLine * k,
    padH: AT_600.padH * k,
    padV: AT_600.padV * k,
  };
  const shape = { width, mainShare: 0.5, topShare: 0.5, padH: size.padH, padV: size.padV, lineSide: size.sideLine };
  const mainW = mainColumn(shape);
  const sideW = sideColumn(shape);
  // Rashi is printed toward the binding: on the right of an amud a, on the left of an amud b.
  const innerFloat = data.amud === "a" ? "left" : "right";
  const outerFloat = data.amud === "a" ? "right" : "left";

  // 1. How tall is each text alone in its column? That decides the page's shape.
  useLayoutEffect(() => {
    if (!space) return;
    const h = (r: { current: HTMLDivElement | null }) => r.current?.offsetHeight ?? 0;
    corrections.current = 0;
    setSpacers(
      computeSpacers({
        ...shape,
        mainHeight: h(measureRefs.main),
        innerHeight: data.rashi.length ? h(measureRefs.rashi) : 0,
        outerHeight: data.tosafot.length ? h(measureRefs.tosafot) : 0,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, space, fontsSeen, vowels]);

  // 2. With the spacers in place, check where each text really ended and move the spacers if two
  // texts share a place. Then the page is as tall as its longest layer.
  useLayoutEffect(() => {
    if (!spacers) return;
    const bottom = (r: { current: HTMLDivElement | null }) => (r.current ? r.current.offsetTop + r.current.offsetHeight : 0);
    if (corrections.current < 8) {
      const fixed = correctSpacers(spacers, {
        width,
        padV: size.padV,
        mainColumn: mainW,
        sideColumn: sideW,
        mainBottom: bottom(textRefs.main),
        innerBottom: data.rashi.length ? bottom(textRefs.rashi) : 0,
        outerBottom: data.tosafot.length ? bottom(textRefs.tosafot) : 0,
      });
      if (fixed) {
        corrections.current += 1;
        setSpacers(fixed);
        return;
      }
    }
    setHeight(Math.max(...[layerRefs.main, layerRefs.rashi, layerRefs.tosafot].map((r) => r.current?.offsetHeight ?? 0)));
    // A page wider than the screen starts at its right edge, where Hebrew begins.
    const wrap = wrapRef.current;
    if (wrap && wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft = wrap.scrollWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spacers]);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.getSelection()?.toString().trim()) return;
    const w = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    const seg = w?.closest<HTMLElement>("[data-ref]");
    if (!w || !seg) return;
    onWord(seg.dataset.ref!, Number(w.dataset.i), withoutPoints(w.textContent ?? ""), seg.dataset.part as Part);
  };

  const renderPiece = (p: DafPiece, part: Part, n: number, interactive: boolean): ReactNode => {
    const words = wordsOf(p.he);
    const opening = part === "main" ? 0 : wordsOf(splitOpening(p.he).opening).length;
    const cls = [
      "dseg",
      part === "main" && kinds[p.ref] ? `k-${kinds[p.ref]}` : "",
      marks[p.ref] ? `mark-${marks[p.ref]}` : "",
      interactive && selectedRef === p.ref ? "sel" : "",
      interactive && linkedRefs.has(p.ref) ? "linked" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <span key={p.ref} className={cls} data-ref={interactive ? p.ref : undefined} data-part={part}>
        {words.map((w, i) => {
          const bold = i < opening || (part === "main" && /^(מתני|גמ)['׳]/.test(w));
          const big = part === "main" && n === 0 && i === 0 && data.daf === 2 && data.amud === "a";
          const tappable = interactive && HAS_LETTERS.test(w);
          const on = interactive && activeWord?.ref === p.ref && activeWord.index === i;
          return (
            <span key={i}>
              {i > 0 && " "}
              {tappable ? (
                <span data-i={i} className={`dw${bold ? " open" : ""}${big ? " big" : ""}${on ? " on" : ""}`}>
                  {(vowels && p.vowels?.[i]) || w}
                </span>
              ) : (
                <span className={bold ? "open" : undefined}>{w}</span>
              )}
            </span>
          );
        })}{" "}
      </span>
    );
  };

  const text = (part: Part, interactive: boolean) => {
    const list = part === "main" ? data.main : part === "rashi" ? data.rashi : data.tosafot;
    return list.map((p, n) => renderPiece(p, part, n, interactive));
  };

  const mainStyle = { fontSize: size.mainFont, lineHeight: `${size.mainLine}px` };
  const sideStyle = { fontSize: size.sideFont, lineHeight: `${size.sideLine}px` };
  const s = spacers;
  const halfMargin = size.padH / 2;
  const startWidth = (side: "inner" | "outer") =>
    !s ? "50%" : s.exception === (side === "inner" ? 1 : 2) ? "100%" : s.exception === (side === "inner" ? 2 : 1) ? "0%" : "50%";
  const startMargin = s && s.exception ? 0 : halfMargin;

  return (
    <div className="daf-wrap" ref={wrapRef}>
      <div
        className="daf"
        dir="rtl"
        lang="he"
        style={{ width, height: height || undefined }}
        onClick={onClick}
        aria-label={`${data.labelHe}: the Gemara with Rashi and Tosafot`}
      >
        {/* Measuring copies: each text alone in its column, never shown. */}
        <div className="daf-measure" aria-hidden="true">
          <div ref={measureRefs.main} className="daf-text main" style={{ ...mainStyle, width: mainW }}>
            {text("main", false)}
          </div>
          <div ref={measureRefs.rashi} className="daf-text rashi" style={{ ...sideStyle, width: sideW }}>
            {text("rashi", false)}
          </div>
          <div ref={measureRefs.tosafot} className="daf-text tosafot" style={{ ...sideStyle, width: sideW }}>
            {text("tosafot", false)}
          </div>
        </div>

        {s && (
          <>
            {/* Rashi, on the inner side. */}
            <div className="daf-layer" ref={layerRefs.rashi}>
              <div className="sp" style={{ float: innerFloat, width: startWidth("inner"), height: s.start, marginInline: startMargin }} />
              <div
                className="sp"
                style={{ float: innerFloat, clear: "both", width: "75%", height: s.inner, marginInline: halfMargin, marginBlock: size.padV }}
              />
              <div className="sp" style={{ float: innerFloat, width: "50%", height: s.end, marginInline: halfMargin }} />
              <div className="daf-text rashi" style={sideStyle} ref={textRefs.rashi}>
                {text("rashi", true)}
              </div>
            </div>
            {/* Tosafot, on the outer side. */}
            <div className="daf-layer" ref={layerRefs.tosafot}>
              <div className="sp" style={{ float: outerFloat, width: startWidth("outer"), height: s.start, marginInline: startMargin }} />
              <div
                className="sp"
                style={{ float: outerFloat, clear: "both", width: "75%", height: s.outer, marginInline: halfMargin, marginBlock: size.padV }}
              />
              <div className="sp" style={{ float: outerFloat, width: "50%", height: s.end, marginInline: halfMargin }} />
              <div className="daf-text tosafot" style={sideStyle} ref={textRefs.tosafot}>
                {text("tosafot", true)}
              </div>
            </div>
            {/* The Gemara, in the middle. */}
            <div className="daf-layer" ref={layerRefs.main}>
              <div className="sp" style={{ height: s.start }} />
              <div className="sp" style={{ float: outerFloat, width: "25%", height: s.inner, marginInline: halfMargin, marginBottom: size.padV }} />
              <div className="sp" style={{ float: innerFloat, width: "25%", height: s.outer, marginInline: halfMargin, marginBottom: size.padV }} />
              <div className="daf-text main" style={{ ...mainStyle, marginTop: size.padV }} ref={textRefs.main}>
                {text("main", true)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
