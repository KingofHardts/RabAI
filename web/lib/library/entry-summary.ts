/*
 * A dictionary entry's first meaning, on one line, cut from the dictionary's own text. The word
 * card shows this for each entry and opens the whole entry on a tap. Nothing here is written by
 * RabAI: the line is the start of the entry, with the headword and the etymology in front of the
 * first meaning left out.
 */

const MAX = 140;

/** Removes one balanced group (parentheses or brackets) from the start, if the text starts with one. */
function dropGroup(text: string, open: string, close: string): string | null {
  if (!text.startsWith(open)) return null;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close && --depth === 0) return text.slice(i + 1);
  }
  return null;
}

/** Jastrow's own short forms ("v." for "see", "cmp.", "ch." and so on): a period after one of these doesn't end the meaning. */
const ABBREVIATIONS = new Set(
  "v a s ib pr n m f pl ch h c e l r w b sec denom constr inf part pass esp prob var cf cmp comp next preced foll fr transl".split(" "),
);

/**
 * Where the sources begin: a period at the top level (not inside parentheses or brackets), after a
 * word that isn't one of Jastrow's short forms (or a question mark), followed by a capital letter
 * (Targ., Yoma, Ḥull.), or a dash. The text up to there is the meaning.
 */
function sourcesStart(t: string): number {
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === "(" || ch === "[") depth++;
    else if ((ch === ")" || ch === "]") && depth > 0) depth--;
    else if (depth === 0 && ch === "—" && i > 0) return i;
    else if (depth === 0 && (ch === "." || ch === "?") && /^\s+\p{Lu}/u.test(t.slice(i + 1, i + 4))) {
      const before = /([\p{L}]+)$/u.exec(t.slice(0, i))?.[1] ?? "";
      if (ch === "?" || t.slice(i - 2, i) === "&c" || !ABBREVIATIONS.has(before.toLowerCase())) return i + 1;
    }
  }
  return t.length;
}

/** Shortens to about `max` characters at a word boundary, with an ellipsis. */
function clip(text: string, max = MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")} …`;
}

/**
 * The first meaning of an entry. For an English dictionary (Jastrow): after the headword, its
 * numeral and the parenthesized etymology, from the first numbered sense if there is one, up to
 * the sentence where the sources begin. For a Hebrew dictionary: the start of the entry.
 */
export function firstSense(entry: { text: string; headword: string; lang: "he" | "en" }): string {
  let t = entry.text.replace(/\s+/g, " ").trim();
  if (entry.lang === "he") return clip(t.startsWith(entry.headword) ? t.slice(entry.headword.length).trim() || t : t);

  if (entry.headword && t.startsWith(entry.headword)) t = t.slice(entry.headword.length);
  t = t.replace(/^\s*[IVX]+\b/, "").trim();
  // The first numbered sense, "1))", starts the meaning. Jastrow sometimes puts it inside the
  // etymology's parentheses ("(b. h.; √אך to rub, 1)) to gnaw"), so look for it before those go.
  const deep = /(?:^|[\s,;(])1\)\)\s/.exec(t.slice(0, 600));
  if (deep) t = t.slice(deep.index + deep[0].length);
  // Otherwise the etymology and grammar notes in parentheses come first.
  for (let n = 0; n < 6 && !deep; n++) {
    t = t.replace(/^[\s,;]+/, "");
    const rest = dropGroup(t, "(", ")");
    if (rest === null) break;
    t = rest;
  }
  // Or a "1)" near the start.
  const sense = deep ? null : /(?:^|\s)1\)\s/.exec(t.slice(0, 160));
  if (sense) t = t.slice(sense.index + sense[0].length);
  else if (!deep) {
    // Otherwise leave out a bracketed root meaning in front, when something follows it.
    const rest = dropGroup(t.replace(/^[\s,;]+/, ""), "[", "]");
    if (rest && rest.trim().length > 3) t = rest;
  }
  t = t.replace(/^[\s,;:—)\]-]+/, "").trim();
  t = t.slice(0, sourcesStart(t)).trim();
  // An entry that only points to another one ("Y. Keth. IV, 29ᵇ, v. וָתַר") has no meaning of its
  // own before its sources: show where it points ("v." is Jastrow's "see").
  if (t.length < 4 || /^[A-Z][a-z]{0,4}\.$/.test(t)) {
    const see = /\bv\.\s+([^\s,;.]+(?:\s+[IVX]+\b)?)/.exec(entry.text);
    if (see) return `see ${see[1]}`;
    t = "";
  }
  if (/^v\.\s/.test(t)) t = `see ${t.slice(3)}`;
  return clip(t || entry.text.replace(/\s+/g, " ").trim());
}
