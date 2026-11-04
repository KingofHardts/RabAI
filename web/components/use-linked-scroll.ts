"use client";

import { useEffect, type RefObject } from "react";
import { matchingScrollTop, readingPoint, type PaneMetrics } from "@/lib/linked-scroll";

/*
 * Keeps two panes at the same place as either is scrolled (the reader's two panes; the math is in
 * lib/linked-scroll.ts). The pane the person last touched, wheeled or used the keyboard in leads,
 * and the other follows it, including while a flick is still gliding. Each pane's lines are its
 * children marked data-i, in the same order in both.
 */

/** The pane's lines, measured inside the pane's own scrolling content (not against the page). */
function metrics(el: HTMLElement): PaneMetrics {
  const box = el.getBoundingClientRect();
  const origin = box.top + el.clientTop - el.scrollTop;
  const items = Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-i]"), (n) => {
    const r = n.getBoundingClientRect();
    return { top: r.top - origin, height: r.height };
  });
  return { scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, items };
}

export function useLinkedScroll(a: RefObject<HTMLElement | null>, b: RefObject<HTMLElement | null>, enabled: boolean, content: unknown) {
  useEffect(() => {
    const panes = [a.current, b.current];
    if (!enabled || !panes[0] || !panes[1]) return;
    const [first, second] = panes as [HTMLElement, HTMLElement];
    const els = [first, second];
    let leader = 0;
    let frame = 0;

    const follow = () => {
      frame = 0;
      const from = els[leader];
      const to = els[1 - leader];
      const target = matchingScrollTop(metrics(to), readingPoint(metrics(from)));
      if (Math.abs(to.scrollTop - target) >= 1) to.scrollTop = target;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(follow);
    };

    const offs: Array<() => void> = [];
    els.forEach((el, i) => {
      const lead = () => {
        leader = i;
      };
      // The other pane's scrolling is this hook's own, or its glide; only the leader's counts.
      const onScroll = () => {
        if (leader === i) schedule();
      };
      for (const type of ["pointerdown", "touchstart", "wheel", "keydown", "focusin"] as const) {
        el.addEventListener(type, lead, { passive: true });
        offs.push(() => el.removeEventListener(type, lead));
      }
      el.addEventListener("scroll", onScroll, { passive: true });
      offs.push(() => el.removeEventListener("scroll", onScroll));
    });

    // Line up once at the start, and again when the panes change size (a rotated phone, fonts loading).
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(first);
    ro.observe(second);

    return () => {
      offs.forEach((off) => off());
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [a, b, enabled, content]);
}
