import type { Passage } from "../library/types";

/**
 * Turning the model's answer into what the app shows, and checking every citation.
 *
 * The model receives each retrieved passage as a document with citations turned on. Its
 * citations come back pointing at a document by position. A citation is kept only if:
 *   - it points at a document we actually sent (so it is a retrieved, whitelisted passage), and
 *   - its quoted words really appear in that document.
 * Anything else is dropped and counted, never shown.
 */

/** The parts of a response content block this module reads. Matches the SDK's beta types. */
export interface ResponseBlock {
  type: string;
  text?: string;
  citations?: Array<{
    type: string;
    cited_text?: string;
    document_index?: number;
  }> | null;
}

export interface AnswerCitation {
  ref: string;
  /** The exact words quoted from the passage. */
  quote: string;
}

export interface AnswerBlock {
  text: string;
  citations: AnswerCitation[];
}

export interface AnswerSource {
  ref: string;
  label: string;
  work: string;
}

export interface MappedAnswer {
  blocks: AnswerBlock[];
  /** The passages the answer actually cited, in order of first citation. */
  sources: AnswerSource[];
  /** Citations removed because they failed a check. Should always be 0. */
  dropped: number;
}

function squash(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Map response content to answer blocks.
 * @param documents The passages sent to the model, in the same order as the document blocks.
 * @param documentTexts The exact text sent for each document.
 */
export function mapAnswer(content: ResponseBlock[], documents: Passage[], documentTexts: string[]): MappedAnswer {
  const blocks: AnswerBlock[] = [];
  const sources: AnswerSource[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const block of content) {
    if (block.type !== "text" || typeof block.text !== "string") continue;

    const citations: AnswerCitation[] = [];
    for (const c of block.citations ?? []) {
      const index = c.document_index;
      const passage = typeof index === "number" ? documents[index] : undefined;
      const docText = typeof index === "number" ? documentTexts[index] : undefined;
      const quote = typeof c.cited_text === "string" ? c.cited_text : "";
      const verified =
        c.type === "char_location" &&
        passage !== undefined &&
        docText !== undefined &&
        quote.trim().length > 0 &&
        squash(docText).includes(squash(quote));
      if (!verified || !passage) {
        dropped += 1;
        continue;
      }
      if (!citations.some((x) => x.ref === passage.ref)) citations.push({ ref: passage.ref, quote: quote.trim() });
      if (!seen.has(passage.ref)) {
        seen.add(passage.ref);
        sources.push({ ref: passage.ref, label: passage.label, work: passage.work });
      }
    }

    const text = cleanText(block.text);
    const last = blocks[blocks.length - 1];
    // Merge consecutive uncited text so paragraphs are not split by the API's block boundaries.
    if (last && last.citations.length === 0 && citations.length === 0) {
      last.text += text;
    } else {
      blocks.push({ text, citations });
    }
  }

  // Trim stray whitespace at the edges of the whole answer.
  if (blocks.length) {
    blocks[0].text = blocks[0].text.replace(/^\s+/, "");
    const end = blocks[blocks.length - 1];
    end.text = end.text.replace(/\s+$/, "");
  }

  return { blocks: blocks.filter((b) => b.text.length > 0 || b.citations.length > 0), sources, dropped };
}

/** The answer is plain prose; remove Markdown emphasis or heading marks if the model adds them. */
export function cleanText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\n)#{1,6}\s+/g, "$1")
    .replace(/(^|\n)\s*[-*•]\s+/g, "$1");
}

/** The answer as one plain string, for history and tests. */
export function answerText(answer: Pick<MappedAnswer, "blocks">): string {
  return answer.blocks.map((b) => b.text).join("");
}
