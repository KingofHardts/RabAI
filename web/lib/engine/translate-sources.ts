import type { TestingStore } from "../library/testing";
import { commentBase, plainText } from "../library/daf";
import type { Passage } from "../library/types";
import type { TranslationSource } from "./translate";

/*
 * The library's sources RabAI translates a passage from: the line it explains (for a comment)
 * with the library's Orthodox English, the line before it, the other commentaries on the same
 * line, and the dictionaries' entries for its words. Only passages from the library are used.
 */

/** How many of each kind of source, and how long each may be, so a request stays small. */
export const SOURCE_LIMITS = { context: 2, commentaries: 3, dictionary: 6, chars: 1500 };

function clip(text: string, max = SOURCE_LIMITS.chars): string {
  const plain = plainText(text);
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(": "), cut.lastIndexOf("; "));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut) + " …";
}

function labelOf(p: Passage, role: TranslationSource["role"]): string {
  // The book ("Rashi on Berakhot", "Jastrow"), not the canon work, which can name a whole shelf.
  const book = (role === "dictionary" ? p.ref.split(",")[0] : p.source?.book) ?? p.work;
  if (role === "dictionary") return p.source?.wordToolOnly ? `${book} (for word meanings only)` : book;
  if (p.en.trim() && p.source?.enEdition) return `${book}, with the library's English (${p.source.enEdition})`;
  return book;
}

/** Whether `ref` is a comment on exactly this line ("Rashi on Berakhot 2a:1:3" is on "Berakhot 2a:1"). */
function isOn(ref: string, line: string): boolean {
  const at = ref.indexOf(" on ");
  if (at < 0) return false;
  const rest = ref.slice(at + 4);
  return rest === line || rest.startsWith(`${line}:`);
}

function sourceOf(p: Passage, role: TranslationSource["role"]): TranslationSource {
  return { ref: p.ref, role, he: clip(p.he), en: clip(p.en), label: labelOf(p, role) };
}

/**
 * The sources for translating `passage`. `contextRefs` are lines the person's view adds (the
 * line before a line of Gemara). Never throws: a source that can't be read is left out.
 */
export async function gatherSources(store: TestingStore, passage: Passage, contextRefs: string[] = []): Promise<TranslationSource[]> {
  // A comment explains a line: "Rashi on Berakhot 2a:1:3" explains "Berakhot 2a:1".
  const on = passage.on ?? (/ on /.test(passage.ref) ? commentBase(passage.ref) : undefined);
  const around = [...new Set([...(on ? [on] : []), ...contextRefs])].filter((r) => r !== passage.ref).slice(0, SOURCE_LIMITS.context);
  const line = on ?? passage.ref;
  const [context, linked, dictionary] = await Promise.all([
    around.length ? store.exact(around).catch(() => []) : Promise.resolve([] as Passage[]),
    store.linked([line], 12).catch(() => [] as Passage[]),
    store.dictionary([passage], SOURCE_LIMITS.dictionary).catch(() => [] as Passage[]),
  ]);
  const out: TranslationSource[] = [];
  for (const ref of around) {
    const p = context.find((c) => c.ref === ref);
    if (p && (p.he.trim() || p.en.trim())) out.push(sourceOf(p, ref === on ? "explains" : "before"));
  }
  const commentaries = linked
    .filter((p) => p.ref !== passage.ref && isOn(p.ref, line) && !p.source?.dictionary && p.he.trim())
    // Not another comment by the same commentator on the same line: those are the passage's neighbors.
    .filter((p) => !on || p.ref.split(" on ")[0] !== passage.ref.split(" on ")[0])
    .slice(0, SOURCE_LIMITS.commentaries);
  for (const p of commentaries) out.push(sourceOf(p, "commentary"));
  for (const p of dictionary) out.push(sourceOf(p, "dictionary"));
  return out;
}

/**
 * The sources for translating a run of passages from one page together (the batch job): the
 * lines they explain, other commentaries on those lines, and the dictionaries' entries for their
 * words. Three queries for the whole run.
 */
export async function gatherGroupSources(store: TestingStore, passages: Passage[]): Promise<TranslationSource[]> {
  const bases = [...new Set(passages.map((p) => p.on ?? (/ on /.test(p.ref) ? commentBase(p.ref) : null)).filter((r): r is string => !!r))];
  const own = new Set(passages.map((p) => p.ref));
  const authors = new Set(passages.map((p) => p.ref.split(" on ")[0]));
  const [lines, linked, dictionary] = await Promise.all([
    bases.length ? store.exact(bases.slice(0, 12)).catch(() => [] as Passage[]) : Promise.resolve([] as Passage[]),
    bases.length ? store.linked(bases.slice(0, 12), 40).catch(() => [] as Passage[]) : Promise.resolve([] as Passage[]),
    store.dictionary(passages, 10).catch(() => [] as Passage[]),
  ]);
  const out: TranslationSource[] = [];
  for (const p of lines) if (p.he.trim() || p.en.trim()) out.push(sourceOf(p, "explains"));
  const commentaries = linked
    .filter((p) => !own.has(p.ref) && !authors.has(p.ref.split(" on ")[0]) && !p.source?.dictionary && p.he.trim())
    .filter((p) => bases.some((b) => isOn(p.ref, b)))
    .slice(0, 6)
    .map((p) => ({ ...sourceOf(p, "commentary"), he: clip(p.he, 900) }));
  out.push(...commentaries);
  for (const p of dictionary) out.push(sourceOf(p, "dictionary"));
  return out;
}

/** Of a run's sources, the ones that bear on one passage: the line it explains, comments on that line, the dictionaries. */
export function sourcesFor(passage: Passage, sources: TranslationSource[]): TranslationSource[] {
  const base = passage.on ?? (/ on /.test(passage.ref) ? commentBase(passage.ref) : null);
  return sources.filter((s) =>
    s.role === "dictionary" ? true : s.role === "commentary" ? !!base && isOn(s.ref, base) : s.ref === base,
  );
}
