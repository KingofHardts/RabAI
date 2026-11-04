/*
 * Transliteration of vocalized Hebrew into Latin letters, from the vowels the siddur prints (the
 * Daven tab's transliteration setting, and the voice's pronunciation of Hebrew words). Two ways of
 * pronouncing: Sephardi (as in Israel today) and Ashkenazi (kamatz as "o", tzere as "ei", a taf
 * without a dot as "s").
 *
 * It follows the usual rules and isn't perfect: whether a sheva is sounded, a kamatz katan the
 * text doesn't mark, and where the stress falls are all guessed. The app labels it as RabbAI's
 * transliteration, not yet reviewed by the rabbinic board. God's name is never sounded out: it is
 * always read as it is said in prayer, "Adonai" (Ashkenazi "Adonoy").
 */

export type Pronunciation = "sephardi" | "ashkenazi";

const DAGESH = "ּ";
const SHIN_DOT = "ׁ";
const SIN_DOT = "ׂ";
const SHEVA = "ְ";
const HOLAM = "ֹ";
const KAMATZ = "\u05B8";
const HOLAM_VAV = "ֺ";

const VOWELS: Record<string, { sephardi: string; ashkenazi: string; long?: boolean }> = {
  "ַ": { sephardi: "a", ashkenazi: "a" }, // patach
  "ָ": { sephardi: "a", ashkenazi: "o", long: true }, // kamatz
  "ׇ": { sephardi: "o", ashkenazi: "o" }, // kamatz katan
  "ֲ": { sephardi: "a", ashkenazi: "a" }, // chataf patach
  "ֳ": { sephardi: "o", ashkenazi: "o" }, // chataf kamatz
  "ֱ": { sephardi: "e", ashkenazi: "e" }, // chataf segol
  "ֶ": { sephardi: "e", ashkenazi: "e" }, // segol
  "ֵ": { sephardi: "e", ashkenazi: "ei", long: true }, // tzere
  "ִ": { sephardi: "i", ashkenazi: "i" }, // chirik
  "ֹ": { sephardi: "o", ashkenazi: "o", long: true }, // holam
  "ֺ": { sephardi: "o", ashkenazi: "o", long: true }, // holam for vav
  "ֻ": { sephardi: "u", ashkenazi: "u" }, // kubutz
};

/** A letter with the marks written on it. */
interface Letter {
  ch: string;
  dagesh: boolean;
  shin: boolean;
  sin: boolean;
  vowel: string | null;
  sheva: boolean;
}

function lettersOf(word: string): Letter[] {
  const out: Letter[] = [];
  for (const c of word) {
    if (/[א-ת]/.test(c)) out.push({ ch: c, dagesh: false, shin: false, sin: false, vowel: null, sheva: false });
    else if (out.length) {
      const l = out[out.length - 1];
      if (c === DAGESH) l.dagesh = true;
      else if (c === SHIN_DOT) l.shin = true;
      else if (c === SIN_DOT) l.sin = true;
      else if (c === SHEVA) l.sheva = true;
      else if (VOWELS[c]) l.vowel = c;
    }
  }
  return out;
}

const FINAL: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

function consonant(l: Letter, p: Pronunciation, wordEnd: boolean): string {
  const c = FINAL[l.ch] ?? l.ch;
  switch (c) {
    case "א":
    case "ע":
      return "";
    case "ב":
      return l.dagesh ? "b" : "v";
    case "ג":
      return "g";
    case "ד":
      return "d";
    case "ה":
      // A final heh is silent unless it has a dot (mappiq).
      return wordEnd && !l.dagesh && !l.vowel ? "" : "h";
    case "ו":
      return "v";
    case "ז":
      return "z";
    case "ח":
      return "ch";
    case "ט":
      return "t";
    case "י":
      return "y";
    case "כ":
      return l.dagesh ? "k" : "ch";
    case "ל":
      return "l";
    case "מ":
      return "m";
    case "נ":
      return "n";
    case "ס":
      return "s";
    case "פ":
      return l.dagesh ? "p" : "f";
    case "צ":
      return "tz";
    case "ק":
      return "k";
    case "ר":
      return "r";
    case "ש":
      return l.sin ? "s" : "sh";
    case "ת":
      return l.dagesh || p === "sephardi" ? "t" : "s";
    default:
      return "";
  }
}

/** The Name, with the letters before it (וַ, לַ, בַּ, כַּ, שֶׁ, הַ, מֵ) left as they are. */
const NAME_RE = /^([א-ת][֑-ׇ]*)?יהוה$|^([א-ת][֑-ׇ]*)?י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה[֑-ׇ]*$/;

function transliterateWord(raw: string, p: Pronunciation): string {
  // Which letters carry a meteg (the small upright line): a kamatz with one is a long "a".
  const meteg = new Set<number>();
  let n = -1;
  for (const c of raw) {
    if (/[\u05D0-\u05EA]/.test(c)) n++;
    else if (c === "\u05BD" && n >= 0) meteg.add(n);
  }
  const word = raw.replace(/[֑-ֽֿ֯׀׃-׆]/g, "");
  const letters = lettersOf(word);
  if (!letters.length) return "";
  const plain = letters.map((l) => l.ch).join("");
  const name = p === "ashkenazi" ? "Adonoy" : "Adonai";
  // The Name is said "Adonai"; with a letter in front, "la-Adonai" reads as "ladonai".
  if (plain === "יהוה") return name;
  if (plain.length === 5 && plain.endsWith("יהוה") && NAME_RE.test(word)) {
    const pre = transliterateWord(word.slice(0, word.indexOf("י")), p);
    return pre.endsWith("a") ? pre + name.slice(1) : pre + name;
  }
  let out = "";
  let prevLong = false;
  for (let i = 0; i < letters.length; i++) {
    const l = letters[i];
    const next = letters[i + 1];
    const last = i === letters.length - 1;
    const c = FINAL[l.ch] ?? l.ch;
    // Vav as a vowel: וּ (u) and וֹ (o) carry no consonant of their own.
    if (c === "ו" && !l.vowel && !l.sheva && i > 0) {
      if (l.dagesh) {
        out += "u";
        prevLong = true;
        continue;
      }
    }
    if (c === "ו" && (l.vowel === HOLAM || l.vowel === HOLAM_VAV) && i > 0 && !letters[i - 1].vowel && !letters[i - 1].sheva) {
      // After a silent aleph or ayin that follows a vowel: "ha'olam".
      if (/[אע]/.test(letters[i - 1].ch) && /[aeiou]$/.test(out)) out += "'";
      out += "o";
      prevLong = true;
      continue;
    }
    if (c === "ו" && l.dagesh && !l.vowel && i === 0) {
      out += "u";
      prevLong = true;
      continue;
    }
    // Yod after a chirik, tzere or segol is part of the vowel; after a patach or kamatz it makes "ai".
    if (c === "י" && !l.vowel && !l.sheva && !l.dagesh && i > 0) {
      const pv = letters[i - 1].vowel;
      if (pv === "ִ") continue;
      if (pv === "ֵ" || pv === "ֶ") {
        if (p === "sephardi" && pv === "ֵ") out += "i";
        continue;
      }
      // ָיו at the end of a word is "av" ("mitzvotav"): the yod isn't heard.
      if (pv === "ָ" && next && (FINAL[next.ch] ?? next.ch) === "ו" && i + 1 === letters.length - 1 && !next.vowel) continue;
      if (pv === "ַ" || pv === "ָ") {
        out += "i";
        continue;
      }
    }
    // A patach under a final ח, ע or ה (with a dot) is said before the letter: רוּחַ, "ruach".
    const furtive = last && l.vowel === "ַ" && (c === "ח" || c === "ע" || (c === "ה" && l.dagesh));
    const cons = consonant(l, p, last);
    if (furtive) {
      out += "a" + cons;
      continue;
    }
    // A silent letter (aleph, ayin) between two vowels is shown with an apostrophe: "ha'olam".
    if (!cons && l.vowel && i > 0 && /[aeiou]$/.test(out)) out += "'";
    // A final heh after a vowel is written, as is usual: "Modeh", "atah", "Torah".
    out += last && c === "ה" && !cons && /[aeiou]$/.test(out) ? "h" : cons;
    if (l.vowel) {
      // A kamatz in a closed syllable is a short "o" (kamatz katan): before a silent sheva, as in
      // חָכְמָה "chochmah", unless a meteg marks it long or the syllable is stressed before the
      // ending ךָ (לְבָבְךָ, "levavcha"); and in כָּל, "kol".
      const katan =
        l.vowel === KAMATZ &&
        !meteg.has(i) &&
        ((!!next && next.sheva && !next.dagesh && i + 1 < letters.length - 1 && !(i + 2 === letters.length - 1 && letters[i + 2].ch === "ך")) || (c === "כ" && !!next && next.ch === "ל" && i + 1 === letters.length - 1 && !next.vowel && !next.sheva));
      out += katan ? "o" : VOWELS[l.vowel][p];
      prevLong = !katan && !!VOWELS[l.vowel].long;
    } else if (l.sheva) {
      // A sheva is sounded at the start of a word, after a long vowel, under a doubled letter, or as
      // the second of two in a row; otherwise it is silent.
      const prev = letters[i - 1];
      // Before the ending ךָ it is silent: לְבָבְךָ "levavcha".
      const beforeCha = !!next && i + 1 === letters.length - 1 && next.ch === "ך";
      const sounded = !last && !(beforeCha && i > 0) && (i === 0 || prevLong || (l.dagesh && i > 0) || (prev?.sheva && !letters[i - 2]?.sheva && i > 1));
      if (sounded && next) out += "'";
      prevLong = false;
    } else prevLong = false;
  }
  return out.replace(/'+$/, "").replace(/^'/, "");
}

/** A line of vocalized Hebrew in Latin letters; marks, punctuation and spacing kept simple. */
export function transliterate(text: string, p: Pronunciation = "sephardi"): string {
  const clean = text.replace(/[▾▴°◂]/g, "").replace(/׃/g, ".").replace(/־/g, "-");
  const out = clean.replace(/[א-ת][֑-ׇא-ת]*/g, (w) => transliterateWord(w, p));
  // A capital at the start of each sentence reads more easily.
  return out.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase()).replace(/\s+/g, " ").trim();
}
