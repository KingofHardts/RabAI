"use client";

import type { MouseEvent } from "react";
import { pieceWords, withoutPoints } from "@/lib/library/daf";
import type { DafPageProps } from "./DafPage";

/*
 * The Gemara of one amud alone, in one column at a readable size: for a phone, where the whole
 * printed page is small (docs/ui-research.md, 3.6). Every word can be tapped as on the page; the
 * Rashi and Tosafot on a line are in the card's "Rashi & Tosafot" tab.
 */

const HAS_LETTERS = /[א-ת]/;

export default function DafColumn({ data, selectedRef, linkedRefs, activeWord, kinds, marks, onWord, vowels }: DafPageProps) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.getSelection()?.toString().trim()) return;
    const w = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
    const seg = w?.closest<HTMLElement>("[data-ref]");
    if (!w || !seg) return;
    onWord(seg.dataset.ref!, Number(w.dataset.i), withoutPoints(w.textContent ?? ""), "main");
  };

  return (
    <div className="daf-column daf-text main" dir="rtl" lang="he" onClick={onClick} aria-label={`${data.labelHe}: the Gemara alone`}>
      {data.main.map((p) => {
        const words = pieceWords(p.he);
        const cls = [
          "dseg",
          kinds[p.ref] ? `k-${kinds[p.ref]}` : "",
          marks[p.ref] ? `mark-${marks[p.ref]}` : "",
          selectedRef === p.ref ? "sel" : "",
          linkedRefs.has(p.ref) ? "linked" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <p key={p.ref} className="dcol-line">
            <span className={cls} data-ref={p.ref} data-part="main">
              {words.map((w, i) => {
                const on = activeWord?.ref === p.ref && activeWord.index === i;
                const bold = /^(מתני|גמ)['׳]/.test(w);
                return (
                  <span key={i}>
                    {i > 0 && " "}
                    {HAS_LETTERS.test(w) ? (
                      <span data-i={i} className={`dw${bold ? " open" : ""}${on ? " on" : ""}`}>
                        {(vowels && p.vowels?.[i]) || w}
                      </span>
                    ) : (
                      <span>{w}</span>
                    )}
                  </span>
                );
              })}
            </span>
          </p>
        );
      })}
    </div>
  );
}
