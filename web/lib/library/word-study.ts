import type { Library } from "./index";
import { loadLexicon, phraseOccurrences, rootOccurrences, tokenize, type Lexicon, type Token } from "./language";
import type { Passage } from "./types";

/** What the reader needs to explain a root or a phrase, with every place it appears. */
export interface RootInfo {
  id: string;
  root: string;
  language: "hebrew" | "aramaic";
  meaning: string;
  note?: string;
  occurrences: string[];
}

export interface PhraseInfo {
  id: string;
  phrase: string;
  meaning: string;
  role: string;
  occurrences: string[];
}

export interface WordStudy {
  /** Word notes are typed by the team until approved dictionaries replace them. */
  status: "development";
  roots: Record<string, RootInfo>;
  phrases: Record<string, PhraseInfo>;
}

export function rootInfo(lib: Library, lex: Lexicon, id: string): RootInfo | undefined {
  const r = lex.roots.find((x) => x.id === id);
  if (!r) return undefined;
  return {
    id: r.id,
    root: r.root,
    language: r.language,
    meaning: r.meaning,
    note: r.note,
    occurrences: rootOccurrences(lib, r.id, lex).map((p) => p.ref),
  };
}

export function phraseInfo(lib: Library, lex: Lexicon, id: string): PhraseInfo | undefined {
  const p = lex.phrases.find((x) => x.id === id);
  if (!p) return undefined;
  return {
    id: p.id,
    phrase: p.phrase,
    meaning: p.meaning,
    role: p.role,
    occurrences: phraseOccurrences(lib, p.id, lex).map((x) => x.ref),
  };
}

/** Tokens for each passage, and the notes for every root and phrase they use. */
export function studyPassages(lib: Library, passages: Passage[], lex: Lexicon = loadLexicon()) {
  const tokens = new Map<string, Token[]>();
  const study: WordStudy = { status: "development", roots: {}, phrases: {} };
  for (const p of passages) {
    const t = tokenize(p.he, lex);
    tokens.set(p.ref, t);
    for (const tok of t) {
      if (tok.root && !study.roots[tok.root]) {
        const info = rootInfo(lib, lex, tok.root);
        if (info) study.roots[tok.root] = info;
      }
      if (tok.phrase && !study.phrases[tok.phrase]) {
        const info = phraseInfo(lib, lex, tok.phrase);
        if (info) study.phrases[tok.phrase] = info;
      }
    }
  }
  return { tokens, study };
}

/** The Gemara's key words, for the Learn tab. */
export function phraseGlossary(lib: Library, lex: Lexicon = loadLexicon()): PhraseInfo[] {
  return lex.phrases.map((p) => phraseInfo(lib, lex, p.id)).filter((p): p is PhraseInfo => Boolean(p));
}
