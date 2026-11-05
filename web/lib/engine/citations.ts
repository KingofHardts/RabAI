import type { Passage } from "../library/types";
import { READ_MARKER, refKey, stripMarkers } from "./live-sources";

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
  /** The passage is an article by today's teachers (a website collection), not one of the texts. */
  article?: boolean;
  /** The passage is a page RabbAI looked up online for this answer, not one of the texts. */
  online?: boolean;
}

export interface AnswerBlock {
  text: string;
  citations: AnswerCitation[];
  /**
   * A line RabbAI reads aloud with the person ([[read REF]]): one of the documents it was given,
   * shown and read from the library's own text. Such a block has no text of its own.
   */
  read?: string;
}

export interface AnswerSource {
  ref: string;
  label: string;
  work: string;
  /**
   * An article by today's teachers (a website collection): an explanation, not a source. The app
   * shows these under their own heading, apart from the texts.
   */
  article?: { site: string; title: string; author?: string };
  /**
   * A page RabbAI looked up online for this answer (lib/engine/online.ts): never a source. The app
   * shows these apart from the texts, with a link to the page.
   */
  online?: { site: string; title: string; url: string; kind: "torah" | "general" };
}

/** Whether a passage is an article from a website collection, and how to name it. */
function articleOf(passage: Passage): AnswerSource["article"] {
  const a = passage.source?.article;
  if (!a) return undefined;
  const book = passage.source?.book ?? passage.ref;
  const title = book.startsWith(`${a.site}, `) ? book.slice(a.site.length + 2) : book;
  return { site: a.site, title, ...(a.author ? { author: a.author } : {}) };
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
 * Whether a citation passes the check: it points at a document we sent, and its quoted words are
 * in that document. The one test for citations, live (live-sources.ts) and final (mapAnswer).
 */
export function verifiedCitation(
  c: { type: string; cited_text?: string; document_index?: number },
  documents: Passage[],
  documentTexts: string[],
): { passage: Passage; quote: string } | null {
  const index = c.document_index;
  const passage = typeof index === "number" ? documents[index] : undefined;
  const docText = typeof index === "number" ? documentTexts[index] : undefined;
  const quote = typeof c.cited_text === "string" ? c.cited_text : "";
  const verified = c.type === "char_location" && passage !== undefined && docText !== undefined && quote.trim().length > 0 && squash(docText).includes(squash(quote));
  return verified && passage ? { passage, quote: quote.trim() } : null;
}

/** A block's text split at its read markers: the text between them, and the lines to read. */
function splitReads(text: string, readable: Map<string, string> | undefined): Array<{ text: string } | { read: string }> {
  const parts: Array<{ text: string } | { read: string }> = [];
  let last = 0;
  for (const m of text.matchAll(READ_MARKER)) {
    const at = m.index ?? 0;
    parts.push({ text: text.slice(last, at) });
    const ref = readable?.get(refKey(m[1]));
    if (ref) parts.push({ read: ref });
    last = at + m[0].length;
  }
  parts.push({ text: text.slice(last) });
  return parts;
}

/**
 * Map response content to answer blocks.
 * @param documents The passages sent to the model, in the same order as the document blocks.
 * @param documentTexts The exact text sent for each document.
 */
export function mapAnswer(
  content: ResponseBlock[],
  documents: Passage[],
  documentTexts: string[],
  /** The documents that may be read aloud, by reference (live-sources.ts, readableRefs). */
  readable?: Map<string, string>,
): MappedAnswer {
  const blocks: AnswerBlock[] = [];
  const sources: AnswerSource[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const block of content) {
    if (block.type !== "text" || typeof block.text !== "string") continue;

    const citations: AnswerCitation[] = [];
    for (const c of block.citations ?? []) {
      const checked = verifiedCitation(c, documents, documentTexts);
      if (!checked) {
        dropped += 1;
        continue;
      }
      const { passage, quote } = checked;
      const article = articleOf(passage);
      const online = passage.online
        ? { site: passage.online.site, title: passage.online.title, url: passage.online.url, kind: passage.online.kind }
        : undefined;
      if (!citations.some((x) => x.ref === passage.ref)) {
        citations.push({ ref: passage.ref, quote: quote.trim(), ...(article ? { article: true } : {}), ...(online ? { online: true } : {}) });
      }
      if (!seen.has(passage.ref)) {
        seen.add(passage.ref);
        sources.push({ ref: passage.ref, label: passage.label, work: passage.work, ...(article ? { article } : {}), ...(online ? { online } : {}) });
      }
    }

    // A line read aloud ([[read REF]]) becomes a block of its own, between the text around it.
    const parts = splitReads(block.text, readable);
    parts.forEach((part, i) => {
      if ("read" in part) {
        blocks.push({ text: "", citations: [], read: part.read });
        return;
      }
      const text = cleanText(stripMarkers(part.text));
      // The citations belong with the block's last piece of text.
      const own = i === parts.length - 1 ? citations : [];
      const last = blocks[blocks.length - 1];
      // Merge consecutive uncited text so paragraphs are not split by the API's block boundaries.
      if (last && !last.read && last.citations.length === 0 && own.length === 0) {
        last.text += text;
      } else if (text || own.length) {
        blocks.push({ text, citations: own });
      }
    });
  }

  // Trim stray whitespace at the edges of the whole answer.
  if (blocks.length) {
    blocks[0].text = blocks[0].text.replace(/^\s+/, "");
    const end = blocks[blocks.length - 1];
    end.text = end.text.replace(/\s+$/, "");
  }
  // Text right after a line read aloud starts fresh, without the marker's leftover line breaks.
  for (let i = 1; i < blocks.length; i++) if (blocks[i - 1].read) blocks[i].text = blocks[i].text.replace(/^\s+/, "");
  return { blocks: blocks.filter((b) => b.read || b.text.length > 0 || b.citations.length > 0), sources, dropped };
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
  return answer.blocks.map((b) => (b.read ? `\n[[read ${b.read}]]\n` : b.text)).join("");
}
