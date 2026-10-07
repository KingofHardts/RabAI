"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

/*
 * Pinch and double-tap to zoom the printed page on a phone (docs/ui-research.md, 3.6). The page
 * opens fitted to the screen's width; two fingers zoom it around the spot between them, and a
 * double tap zooms into the spot tapped (or back out to the whole page). While the fingers move
 * the page is only scaled on screen; when they lift, the page is drawn again at the new size and
 * scrolled so the same spot stays under the fingers.
 *
 * The page scrolls sideways inside `.daf-wrap` and up and down inside the container.
 */

interface Anchor {
  /** Where on the screen the spot was. */
  x: number;
  y: number;
  /** Where on the page it was, as a fraction of the page's width and height. */
  fx: number;
  fy: number;
}

const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 12;

export function usePinchZoom(
  container: RefObject<HTMLElement | null>,
  { zoom, min, max, onZoom, enabled }: { zoom: number; min: number; max: number; onZoom: (z: number) => void; enabled: boolean },
) {
  const zoomRef = useRef(zoom);
  const onZoomRef = useRef(onZoom);
  zoomRef.current = zoom;
  onZoomRef.current = onZoom;
  const anchor = useRef<Anchor | null>(null);

  useEffect(() => {
    const box = container.current;
    if (!box || !enabled) return;
    const page = () => box.querySelector<HTMLElement>(".daf");
    let pinch: { d0: number; z0: number; anchor: Anchor; el: HTMLElement } | null = null;
    let scale = 1;
    let tap: { x: number; y: number; t: number; moved: boolean } | null = null;
    let lastTap: { x: number; y: number; t: number } | null = null;
    let swallowClick = false;

    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const anchorAt = (el: HTMLElement, x: number, y: number): Anchor => {
      const r = el.getBoundingClientRect();
      return { x, y, fx: (x - r.left) / r.width, fy: (y - r.top) / r.height };
    };
    const commit = (next: number, a: Anchor) => {
      const z = Math.min(max, Math.max(min, next));
      if (Math.abs(z - zoomRef.current) < 0.05) return;
      anchor.current = a;
      onZoomRef.current(Math.round(z * 100) / 100);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const el = page();
        if (!el) return;
        const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const a = anchorAt(el, x, y);
        pinch = { d0: dist(e.touches), z0: zoomRef.current, anchor: a, el };
        scale = 1;
        el.style.transformOrigin = `${a.fx * 100}% ${a.fy * 100}%`;
        el.style.willChange = "transform";
        tap = null;
      } else if (e.touches.length === 1) {
        tap = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), moved: false };
      }
    };

    const onMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const z = Math.min(max, Math.max(min, (pinch.z0 * dist(e.touches)) / pinch.d0));
        scale = z / pinch.z0;
        pinch.el.style.transform = `scale(${scale})`;
      } else if (tap && e.touches.length === 1) {
        if (Math.hypot(e.touches[0].clientX - tap.x, e.touches[0].clientY - tap.y) > TAP_SLOP) tap.moved = true;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        const p = pinch;
        pinch = null;
        p.el.style.transform = "";
        p.el.style.transformOrigin = "";
        p.el.style.willChange = "";
        commit(p.z0 * scale, p.anchor);
        lastTap = null;
        return;
      }
      if (!tap || e.touches.length > 0) return;
      const t = tap;
      tap = null;
      if (t.moved || Date.now() - t.t > 350) return;
      const now = Date.now();
      if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(t.x - lastTap.x, t.y - lastTap.y) < 30) {
        lastTap = null;
        const el = page();
        if (!el) return;
        // The second tap only zooms; the first one already chose the word.
        swallowClick = true;
        setTimeout(() => (swallowClick = false), 500);
        commit(zoomRef.current < 1.75 ? 2.5 : min, anchorAt(el, t.x, t.y));
        e.preventDefault();
      } else {
        lastTap = { x: t.x, y: t.y, t: now };
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopPropagation();
      e.preventDefault();
    };

    box.addEventListener("touchstart", onStart, { passive: true });
    box.addEventListener("touchmove", onMove, { passive: false });
    box.addEventListener("touchend", onEnd, { passive: false });
    box.addEventListener("touchcancel", onEnd, { passive: false });
    box.addEventListener("click", onClick, true);
    return () => {
      box.removeEventListener("touchstart", onStart);
      box.removeEventListener("touchmove", onMove);
      box.removeEventListener("touchend", onEnd);
      box.removeEventListener("touchcancel", onEnd);
      box.removeEventListener("click", onClick, true);
    };
  }, [container, enabled, min, max]);

  // After the page is drawn at the new size, scroll so the spot is back under the fingers.
  useLayoutEffect(() => {
    const a = anchor.current;
    const box = container.current;
    if (!a || !box) return;
    anchor.current = null;
    const el = box.querySelector<HTMLElement>(".daf");
    if (!el) return;
    const r = el.getBoundingClientRect();
    const wrap = box.querySelector<HTMLElement>(".daf-wrap");
    const dx = r.left + a.fx * r.width - a.x;
    const dy = r.top + a.fy * r.height - a.y;
    if (wrap && wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft += dx;
    box.scrollTop += dy;
  }, [zoom, container]);
}
