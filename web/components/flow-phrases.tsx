import { Fragment, type ReactNode } from "react";
import { phraseClass, phraseId, phraseOfWord, type FlowView } from "@/lib/engine/outline-phrases";

/*
 * Wrapping the Gemara's words in RabAI's phrases, so each phrase's color runs behind its words and
 * the spaces between them. Used by the flowing page, the printed page and the Gemara alone.
 *
 * Only inline spans are added, with no size of their own: no word moves. The space (or, on the
 * printed page, the printed gap) before a phrase's first word stays outside its color, so two
 * phrases side by side still read as two.
 */

/** One word as drawn: what goes before it (a space or a gap), the word, and its phrase (-1 for none). */
export interface WordEntry {
  n: number;
  before: ReactNode;
  word: ReactNode;
}

/** The phrase number of each word of a line, or -1 everywhere when the line isn't outlined. */
export function phraseNumbers(flow: FlowView | null, ref: string, count: number): number[] {
  const phrases = flow?.phrases[ref];
  return Array.from({ length: count }, (_, i) => (phrases ? phraseOfWord(phrases, i) : -1));
}

/** The words with each phrase's run wrapped in its colored span. */
export function wrapPhrases(entries: readonly WordEntry[], flow: FlowView | null, ref: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let group: ReactNode[] | null = null;
  let groupN = -1;
  const flush = () => {
    if (group && flow) {
      out.push(
        <span key={`${key}p${out.length}`} className={phraseClass(flow, ref, groupN)} data-phrase={phraseId({ ref, n: groupN })}>
          {group}
        </span>,
      );
    }
    group = null;
    groupN = -1;
  };
  entries.forEach((e, i) => {
    if (e.n < 0 || !flow) {
      flush();
      out.push(<Fragment key={`${key}w${i}`}>{e.before}{e.word}</Fragment>);
      return;
    }
    if (group && groupN === e.n) {
      group.push(<Fragment key={`${key}w${i}`}>{e.before}{e.word}</Fragment>);
      return;
    }
    flush();
    // The space before a phrase stays outside its color.
    if (e.before !== null && e.before !== undefined && e.before !== false) out.push(<Fragment key={`${key}b${i}`}>{e.before}</Fragment>);
    group = [<Fragment key={`${key}w${i}`}>{e.word}</Fragment>];
    groupN = e.n;
  });
  flush();
  return out;
}
