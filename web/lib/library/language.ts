import { DEV_PHRASES, DEV_ROOTS, type Phrase, type Root, type WordForm } from "./dev-lexicon";
import { stripNiqqud, type Library } from "./index";
import type { Passage } from "./types";

export type { Phrase, Root, WordForm } from "./dev-lexicon";

/*
 * Word study: break a passage into words, recognize roots and the Gemara's recurring phrases,
 * and find where else each appears in the library.
 *
 * "Where else it appears" is computed from the library's own text, never typed by hand, so
 * every connection the app shows is real and can be opened.
 */

/** The library's word notes. Development entries until approved dictionaries replace them. */
export interface Lexicon {
  roots: Root[];
  phrases: Phrase[];
}

export function loadLexicon(): Lexicon {
  return { roots: DEV_ROOTS, phrases: DEV_PHRASES };
}

const EDGE_PUNCTUATION = /^[\s"'״׳“”‘’()[\]{}.,;:!?׃־–—…]+|[\s"'״׳“”‘’()[\]{}.,;:!?׃־–—…]+$/g;

/** A word as the lexicon sees it: no vowels, no punctuation at either end. */
export function normalizeWord(word: string): string {
  return stripNiqqud(word).replace(EDGE_PUNCTUATION, "");
}

export interface Token {
  /** The word as written in the passage, punctuation included. */
  text: string;
  /** Set when the word is a known form of a root. */
  root?: string;
  gloss?: string;
  parts?: string;
  /** Set when the word is part of a known Gemara phrase. */
  phrase?: string;
}

interface FormHit {
  root: Root;
  form: WordForm;
}

function formIndex(lex: Lexicon): Map<string, FormHit> {
  const index = new Map<string, FormHit>();
  for (const root of lex.roots) {
    for (const form of root.forms) index.set(normalizeWord(form.form), { root, form });
  }
  return index;
}

const formIndexCache = new WeakMap<Lexicon, Map<string, FormHit>>();
function formsOf(lex: Lexicon): Map<string, FormHit> {
  let index = formIndexCache.get(lex);
  if (!index) {
    index = formIndex(lex);
    formIndexCache.set(lex, index);
  }
  return index;
}

/** The words of a Hebrew or Aramaic text, as written. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function wordMatches(word: string, pattern: string, first: boolean): boolean {
  const candidates = first && word.startsWith("ו") && word.length > 1 ? [word, word.slice(1)] : [word];
  return candidates.some((w) => (pattern.endsWith("*") ? w.startsWith(pattern.slice(0, -1)) && w.length > pattern.length - 1 : w === pattern));
}

/** Where each phrase starts and ends, by word position. */
export function findPhrases(words: string[], lex: Lexicon): Array<{ phrase: Phrase; start: number; end: number }> {
  const normalized = words.map(normalizeWord);
  const hits: Array<{ phrase: Phrase; start: number; end: number }> = [];
  for (const phrase of lex.phrases) {
    for (let i = 0; i + phrase.match.length <= normalized.length; i++) {
      if (phrase.match.every((p, j) => wordMatches(normalized[i + j], p, j === 0))) {
        hits.push({ phrase, start: i, end: i + phrase.match.length - 1 });
      }
    }
  }
  return hits;
}

/** Break a passage's Hebrew or Aramaic into words, marking known roots and phrases. */
export function tokenize(text: string, lex: Lexicon = loadLexicon()): Token[] {
  const words = splitWords(text);
  const forms = formsOf(lex);
  const tokens: Token[] = words.map((w) => {
    const hit = forms.get(normalizeWord(w));
    return hit ? { text: w, root: hit.root.id, gloss: hit.form.gloss, parts: hit.form.parts } : { text: w };
  });
  for (const { phrase, start, end } of findPhrases(words, lex)) {
    for (let i = start; i <= end; i++) tokens[i].phrase ??= phrase.id;
  }
  return tokens;
}

/** Every library passage that contains a form of the root, in library order. */
export function rootOccurrences(lib: Library, rootId: string, lex: Lexicon = loadLexicon()): Passage[] {
  const root = lex.roots.find((r) => r.id === rootId);
  if (!root) return [];
  const forms = new Set(root.forms.map((f) => normalizeWord(f.form)));
  return lib.passages.filter((p) => splitWords(p.he).some((w) => forms.has(normalizeWord(w))));
}

/** Every library passage that contains the phrase. */
export function phraseOccurrences(lib: Library, phraseId: string, lex: Lexicon = loadLexicon()): Passage[] {
  const only: Lexicon = { roots: [], phrases: lex.phrases.filter((p) => p.id === phraseId) };
  if (only.phrases.length === 0) return [];
  return lib.passages.filter((p) => findPhrases(splitWords(p.he), only).length > 0);
}

/** The root a word belongs to, if the lexicon knows it. */
export function lookupWord(word: string, lex: Lexicon = loadLexicon()): FormHit | undefined {
  return formsOf(lex).get(normalizeWord(word));
}

/** Library passages that contain this exact word, when the lexicon doesn't know its root. */
export function wordOccurrences(lib: Library, word: string): Passage[] {
  const target = normalizeWord(word);
  if (!target) return [];
  return lib.passages.filter((p) => splitWords(p.he).some((w) => normalizeWord(w) === target));
}

/** A Gemara phrase, looked up by how it is shown or by its words. */
export function lookupPhrase(text: string, lex: Lexicon = loadLexicon()): Phrase | undefined {
  const t = text.trim();
  const words = splitWords(t).map(normalizeWord).join(" ");
  return lex.phrases.find((p) => p.phrase === t || p.match.join(" ") === words);
}

export interface WordConnections {
  /** How to name what connects the passages: "the root ב-ד-ל", "the phrase תנו רבנן", or "this exact word". */
  label: string;
  passages: Passage[];
}

/**
 * The passages to show RabAI when someone asks about a word or phrase: every place the same
 * phrase or root appears, or the same word when its root isn't known.
 */
export function connectionsFor(lib: Library, word: string, lex: Lexicon = loadLexicon()): WordConnections {
  const phrase = lookupPhrase(word, lex);
  if (phrase && (splitWords(word).length > 1 || !lookupWord(word, lex))) {
    return { label: `the phrase ${phrase.phrase}`, passages: phraseOccurrences(lib, phrase.id, lex) };
  }
  const hit = lookupWord(word, lex);
  if (hit) return { label: `the root ${hit.root.root}`, passages: rootOccurrences(lib, hit.root.id, lex) };
  return { label: "this exact word", passages: wordOccurrences(lib, word) };
}

/** Shorthand for the passages alone. */
export function relatedForWord(lib: Library, word: string, lex: Lexicon = loadLexicon()): Passage[] {
  return connectionsFor(lib, word, lex).passages;
}
