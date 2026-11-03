"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/*
 * A bottom sheet that follows the finger (the word card on a phone, components/WordCard.tsx).
 *
 * It rests at two heights, half and full. Dragging the handle or the top of the card moves it;
 * dragging the card's text moves it too while it is at half height (so pulling up opens it), and
 * when it is full and its text is scrolled to the top, pulling down brings it back down. On
 * letting go it settles where the finger was heading: a quick flick wins over where it was let go.
 * Below half height it closes. The motion is the curve phones use for sheets
 * (docs/research-2026-11.md, "The word card on a phone, and other sheets").
 *
 * When the page is zoomed in with two fingers, the sheet is drawn at its usual size at the bottom
 * of what is on screen, instead of being zoomed with the page (the visual viewport, below).
 */

export type SheetSnap = "half" | "full";

/** The sheet's full height, and its half height, as parts of the visible screen. */
const FULL = 0.92;
const HALF = 0.5;
/** A flick: faster than this (pixels per millisecond) decides by direction alone. */
const FLICK = 0.45;
/** How long the settling takes, and its curve. */
const SETTLE_MS = 440;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** Movement before a press on the handle counts as a drag (pixels). */
const SLOP = 6;
/** On the card's text the choice is made at the first movement, before the browser starts to
 * scroll (after that, a scroll can't be taken over). */
const BODY_SLOP = 2;

interface Geometry {
  /** Where the visible screen is on the page, and how far it is zoomed. */
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
  /** The sheet's own height, in its own (unzoomed) pixels, and the offset of each resting place. */
  sheetH: number;
  halfOffset: number;
}

function geometry(): Geometry {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const layoutH = document.documentElement.clientHeight || window.innerHeight;
  const layoutW = document.documentElement.clientWidth || window.innerWidth;
  const scale = vv && vv.scale > 1.01 ? vv.scale : 1;
  const height = vv ? vv.height : layoutH;
  const width = vv ? vv.width : layoutW;
  // In the sheet's own pixels, the visible screen is height × scale tall.
  const screenH = height * scale;
  const sheetH = Math.round(screenH * FULL);
  const halfOffset = Math.round(sheetH - Math.max(260, screenH * HALF));
  return { left: vv ? vv.offsetLeft : 0, top: vv ? vv.offsetTop : 0, width, height, scale, sheetH, halfOffset: Math.max(0, halfOffset) };
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useSheetDrag({ enabled, onClose }: { enabled: boolean; onClose: () => void }) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [snap, setSnapState] = useState<SheetSnap>("half");
  const snapRef = useRef<SheetSnap>("half");
  const geo = useRef<Geometry | null>(null);
  /** The sheet's offset from fully open, in its own pixels; its height means closed. */
  const offset = useRef(0);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const settleTimer = useRef<number | null>(null);

  /** Draw the sheet at an offset, sliding there or at once. */
  const place = useCallback((y: number, animate: boolean) => {
    const el = sheetRef.current;
    const g = geo.current;
    if (!el || !g) return;
    offset.current = y;
    const top = g.top + g.height - g.sheetH / g.scale;
    el.style.width = `${g.width * g.scale}px`;
    el.style.height = `${g.sheetH}px`;
    el.style.transition = animate && !reducedMotion() ? `transform ${SETTLE_MS}ms ${EASE}` : "none";
    el.style.transform = `translate3d(${g.left}px, ${top}px, 0) scale(${1 / g.scale}) translate3d(0, ${y}px, 0)`;
  }, []);

  const offsetFor = useCallback((s: SheetSnap) => (s === "full" ? 0 : (geo.current?.halfOffset ?? 0)), []);

  const settle = useCallback(
    (s: SheetSnap) => {
      snapRef.current = s;
      setSnapState(s);
      place(offsetFor(s), true);
    },
    [place, offsetFor],
  );

  /** Slide the sheet away, then close it. */
  const close = useCallback(() => {
    if (closing.current) return;
    if (!enabled || !geo.current) {
      onCloseRef.current();
      return;
    }
    closing.current = true;
    place(geo.current.sheetH, true);
    settleTimer.current = window.setTimeout(() => onCloseRef.current(), reducedMotion() ? 0 : SETTLE_MS - 120);
  }, [enabled, place]);

  // Open: start just below the screen, then slide up to half height.
  useLayoutEffect(() => {
    if (!enabled) return;
    geo.current = geometry();
    place(geo.current.sheetH, false);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => place(offsetFor("half"), true)));
    return () => cancelAnimationFrame(raf);
  }, [enabled, place, offsetFor]);

  // Keep the sheet at the bottom of what is on screen when the page is zoomed, panned, or resized
  // (or the keyboard opens).
  useEffect(() => {
    if (!enabled) return;
    const vv = window.visualViewport;
    const update = () => {
      if (closing.current) return;
      geo.current = geometry();
      place(offsetFor(snapRef.current), false);
    };
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
    };
  }, [enabled, place, offsetFor]);

  /** Where a released drag settles, from where it is and how fast it was going (+ is down). */
  const release = useCallback(
    (y: number, velocity: number) => {
      const g = geo.current;
      if (!g) return;
      const half = g.halfOffset;
      const closeAt = half + (g.sheetH - half) * 0.28;
      if (velocity > FLICK) {
        if (y < half - 24) settle("half");
        else close();
      } else if (velocity < -FLICK) settle("full");
      else if (y > closeAt) close();
      else if (y < half / 2) settle("full");
      else settle("half");
    },
    [settle, close],
  );

  // Dragging: by the handle and the card's top (pointer events), and by the card's text (touch
  // events, so the text can still scroll when it should).
  const track = useRef<{ start: number; startOffset: number; points: Array<{ y: number; t: number }> } | null>(null);
  const moveTo = (clientY: number) => {
    const t = track.current;
    const g = geo.current;
    if (!t || !g) return;
    let y = t.startOffset + (clientY - t.start) * g.scale;
    // Past fully open it gives a little, like a rubber band.
    if (y < 0) y = -Math.min(36, Math.sqrt(-y) * 3);
    place(y, false);
    t.points.push({ y: clientY, t: performance.now() });
    if (t.points.length > 6) t.points.shift();
  };
  const velocityOf = (): number => {
    const t = track.current;
    const g = geo.current;
    if (!t || !g || t.points.length < 2) return 0;
    const a = t.points[0];
    const b = t.points[t.points.length - 1];
    const dt = b.t - a.t;
    return dt > 0 ? ((b.y - a.y) * g.scale) / dt : 0;
  };

  /** A drag just ended: the click that follows it is not a tap. */
  const dragged = useRef(false);
  /** Where a press on the handle or the card's top began, until it becomes a drag. */
  const press = useRef<{ id: number; y: number; dragging: boolean } | null>(null);

  const handleProps = {
    onPointerDown: (e: ReactPointerEvent) => {
      if (!enabled || closing.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      press.current = { id: e.pointerId, y: e.clientY, dragging: false };
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const p = press.current;
      if (!p || p.id !== e.pointerId) return;
      if (!p.dragging) {
        if (Math.abs(e.clientY - p.y) < SLOP) return;
        // Now it is a drag: follow this finger even outside the card. (Not before, so a tap on a
        // button in the card's top still reaches the button.)
        p.dragging = true;
        geo.current = geometry();
        track.current = { start: p.y, startOffset: offset.current, points: [{ y: p.y, t: performance.now() }] };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }
      moveTo(e.clientY);
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const p = press.current;
      press.current = null;
      if (!p || p.id !== e.pointerId || !p.dragging || !track.current) return;
      const v = velocityOf();
      track.current = null;
      dragged.current = true;
      window.setTimeout(() => (dragged.current = false), 0);
      release(offset.current, v);
    },
    onPointerCancel: () => {
      press.current = null;
      if (!track.current) return;
      track.current = null;
      place(offsetFor(snapRef.current), true);
    },
  };
  // The card's text: at half height a vertical drag moves the sheet; when full, pulling down from
  // the top of the text moves it, and otherwise the text scrolls as usual.
  useEffect(() => {
    const body = bodyRef.current;
    if (!enabled || !body) return;
    let start: { x: number; y: number } | null = null;
    let taking = false;
    let decided = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || closing.current) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      taking = false;
      decided = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!start || e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      if (!decided) {
        const dx = x - start.x;
        const dy = y - start.y;
        if (Math.abs(dx) < BODY_SLOP && Math.abs(dy) < BODY_SLOP) return;
        decided = true;
        if (Math.abs(dx) > Math.abs(dy)) return;
        const atTop = body.scrollTop <= 0;
        taking = snapRef.current === "half" ? !(dy > 0 && !atTop) : atTop && dy > 0;
        if (taking) {
          geo.current = geometry();
          track.current = { start: start.y, startOffset: offset.current, points: [{ y: start.y, t: performance.now() }] };
        }
      }
      if (!taking) return;
      e.preventDefault();
      moveTo(y);
    };
    const onEnd = () => {
      if (taking && track.current) {
        const v = velocityOf();
        track.current = null;
        release(offset.current, v);
      }
      start = null;
      taking = false;
      decided = false;
    };
    body.addEventListener("touchstart", onStart, { passive: true });
    body.addEventListener("touchmove", onMove, { passive: false });
    body.addEventListener("touchend", onEnd);
    body.addEventListener("touchcancel", onEnd);
    return () => {
      body.removeEventListener("touchstart", onStart);
      body.removeEventListener("touchmove", onMove);
      body.removeEventListener("touchend", onEnd);
      body.removeEventListener("touchcancel", onEnd);
    };
    // velocityOf, moveTo and release read refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /** The handle's tap: switch between half and full. */
  const toggle = useCallback(() => {
    if (dragged.current) return;
    settle(snapRef.current === "half" ? "full" : "half");
  }, [settle]);

  return { sheetRef, bodyRef, snap, handleProps, toggle, close };
}
