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

/** A vowel sound in a transliterated word: where it is in the Latin letters, and what made it. */
interface Nucleus {
  s: number;
  e: number;
  /** The letter that carries it (for a vav read as a vowel, the vav). */
  li: number;
  kind: "full" | "chataf" | "sheva" | "furtive";
  /** The vowel sign, or "shuruk" / "holamvav" for a vav read as a vowel. */
  v: string;
}

/** What transliterating a word found on the way, for working out where its stress falls. */
interface Trace {
  nuclei: Nucleus[];
  letters: Letter[];
  /** Letters carrying a cantillation accent that sits on the stressed syllable. */
  taam: number[];
  /** Letters carrying a meteg. */
  meteg: number[];
}

/**
 * Cantillation accents that are written at the start or the end of a word wherever its stress is,
 * so they say nothing about it: segolta, zarka, pashta, yetiv, telisha gedola and ketana, dechi.
 */
const UNPLACED_ACCENTS = /[\u0592\u0598\u0599\u059A\u05A0\u05A9\u05AD\u05AE]/;

function transliterateWord(raw: string, p: Pronunciation, trace?: Trace): string {
  // Which letters carry a meteg (the small upright line): a kamatz with one is a long "a".
  const meteg = new Set<number>();
  let n = -1;
  for (const c of raw) {
    if (/[\u05D0-\u05EA]/.test(c)) n++;
    else if (c === "\u05BD" && n >= 0) meteg.add(n);
    else if (trace && n >= 0 && /[\u0591-\u05AF]/.test(c) && !UNPLACED_ACCENTS.test(c)) trace.taam.push(n);
  }
  if (trace) trace.meteg = [...meteg];
  const nuclei: Nucleus[] = trace ? trace.nuclei : [];
  const word = raw.replace(/[֑-ֽֿ֯׀׃-׆]/g, "");
  const letters = lettersOf(word);
  if (!letters.length) return "";
  if (trace) trace.letters = letters;
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
        nuclei.push({ s: out.length, e: out.length + 1, li: i, kind: "full", v: "shuruk" });
        out += "u";
        prevLong = true;
        continue;
      }
    }
    if (c === "ו" && (l.vowel === HOLAM || l.vowel === HOLAM_VAV) && i > 0 && !letters[i - 1].vowel && !letters[i - 1].sheva) {
      // After a silent aleph or ayin that follows a vowel: "ha'olam".
      if (/[אע]/.test(letters[i - 1].ch) && /[aeiou]$/.test(out)) out += "'";
      nuclei.push({ s: out.length, e: out.length + 1, li: i, kind: "full", v: "holamvav" });
      out += "o";
      prevLong = true;
      continue;
    }
    if (c === "ו" && l.dagesh && !l.vowel && i === 0) {
      nuclei.push({ s: out.length, e: out.length + 1, li: i, kind: "full", v: "shuruk" });
      out += "u";
      prevLong = true;
      continue;
    }
    // Yod after a chirik, tzere or segol is part of the vowel; after a patach or kamatz it makes "ai".
    if (c === "י" && !l.vowel && !l.sheva && !l.dagesh && i > 0) {
      const pv = letters[i - 1].vowel;
      if (pv === "ִ") continue;
      if (pv === "ֵ" || pv === "ֶ") {
        if (p === "sephardi" && pv === "ֵ") {
          out += "i";
          if (nuclei.length) nuclei[nuclei.length - 1].e = out.length;
        }
        continue;
      }
      // ָיו at the end of a word is "av" ("mitzvotav"): the yod isn't heard.
      if (pv === "ָ" && next && (FINAL[next.ch] ?? next.ch) === "ו" && i + 1 === letters.length - 1 && !next.vowel) continue;
      if (pv === "ַ" || pv === "ָ") {
        out += "i";
        if (nuclei.length) nuclei[nuclei.length - 1].e = out.length;
        continue;
      }
    }
    // A patach under a final ח, ע or ה (with a dot) is said before the letter: רוּחַ, "ruach".
    const furtive = last && l.vowel === "ַ" && (c === "ח" || c === "ע" || (c === "ה" && l.dagesh));
    const cons = consonant(l, p, last);
    if (furtive) {
      nuclei.push({ s: out.length, e: out.length + 1, li: i, kind: "furtive", v: l.vowel! });
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
      const sound = katan ? "o" : VOWELS[l.vowel][p];
      nuclei.push({ s: out.length, e: out.length + sound.length, li: i, kind: /[ֱֲֳ]/.test(l.vowel) ? "chataf" : "full", v: katan ? "ׇ" : l.vowel });
      out += sound;
      prevLong = !katan && !!VOWELS[l.vowel].long;
    } else if (l.sheva) {
      // A sheva is sounded at the start of a word, after a long vowel, under a doubled letter, or as
      // the second of two in a row; otherwise it is silent.
      const prev = letters[i - 1];
      // Before the ending ךָ it is silent: לְבָבְךָ "levavcha".
      const beforeCha = !!next && i + 1 === letters.length - 1 && next.ch === "ך";
      const sounded = !last && !(beforeCha && i > 0) && (i === 0 || prevLong || (l.dagesh && i > 0) || (prev?.sheva && !letters[i - 2]?.sheva && i > 1));
      if (sounded && next) {
        nuclei.push({ s: out.length, e: out.length + 1, li: i, kind: "sheva", v: SHEVA });
        out += "'";
      }
      prevLong = false;
    } else prevLong = false;
  }
  if (out.startsWith("'")) for (const nu of nuclei) (nu.s -= 1), (nu.e -= 1);
  return out.replace(/'+$/, "").replace(/^'/, "");
}

// ---------------------------------------------------------------- where the stress falls

const SEGOL = "ֶ";
const TZERE = "ֵ";
const PATACH = "ַ";
const CHIRIK = "ִ";
/** Letters that are only there for a vowel, between two syllables. */
const isMater = (l: Letter) => !l.vowel && !l.sheva && !l.dagesh && /[אוי]/.test(l.ch);

/**
 * Which vowel of a word is stressed. Hebrew stresses the last syllable unless the word is one of
 * the kinds that stress the one before it. In order: an accent mark on the word (the Torah's
 * cantillation, or a siddur's stress mark); a few common words; nouns of the melekh / sefer /
 * bayit kind; and endings that push the stress back (-nu, -hu, -ekha, -eha, -ta, -ti, -eni, and
 * verbs like yagidu, kumu). These are the usual rules of grammar, and a guess where the text
 * doesn't mark it: a verb read after "and" or a word in an unusual form can differ.
 */
function stressedNucleus(t: Trace): number {
  const { nuclei, letters } = t;
  const full = nuclei.map((nu, i) => ({ nu, i })).filter((x) => x.nu.kind === "full");
  if (!full.length) return nuclei.length ? nuclei.length - 1 : -1;
  const last = full[full.length - 1];
  if (full.length === 1) return last.i;
  const pen = full[full.length - 2];
  const lastLetter = letters.length - 1;
  /** The vowel that a letter's syllable has: its own, or a following vav read as a vowel. */
  const nucleusAt = (li: number) => full.find((x) => x.nu.li === li || (x.nu.li === li + 1 && (x.nu.v === "shuruk" || x.nu.v === "holamvav")));

  // 1. Marks on the word. A cantillation accent sits on the stressed syllable.
  if (t.taam.length) {
    const hit = nucleusAt(t.taam[t.taam.length - 1]);
    if (hit) return hit.i;
  } else if (t.meteg.length) {
    // A siddur's stress mark: only on the syllable just before the last (anywhere earlier, a meteg
    // is the older mark for a secondary stress).
    const hit = nucleusAt(t.meteg[t.meteg.length - 1]);
    if (hit && hit.i === pen.i && last.i === pen.i + 1) return pen.i;
  }

  const bare = letters.map((l) => FINAL[l.ch] ?? l.ch).join("");
  // 2. A few common words.
  if (/^(לילה|למה|אנא)$/.test(bare) && last.nu.v === KAMATZ) return pen.i;
  if (bare === "אלה" && pen.nu.v === TZERE && last.nu.v === SEGOL) return pen.i;

  // The letters between the two last vowels: only letters that are part of a vowel may stand there.
  // (A vav read as a vowel is carried by the letter before it.)
  const carrierAt = last.nu.v === "shuruk" || last.nu.v === "holamvav" ? last.nu.li - 1 : last.nu.li;
  const between = letters.slice(pen.nu.li + 1, carrierAt);
  const adjacent = between.every(isMater);
  const carrier = letters[carrierAt];
  const after = letters.slice(last.nu.li + 1);
  const closed = after.length > 0 && after.some((l) => !(l === letters[lastLetter] && /[הא]/.test(l.ch) && !l.dagesh && !l.vowel));
  const noSheva = between.every((l) => !l.sheva);

  // 3. Nouns stressed on the first of two vowels.
  if (adjacent && noSheva && !carrier.dagesh && closed && nuclei.every((nu) => nu.kind !== "furtive")) {
    const penV = pen.nu.v;
    // melekh, sefer, kodesh, aretz, omeret, vayomer: a segol in the last syllable.
    if (last.nu.v === SEGOL && (penV === SEGOL || penV === TZERE || penV === HOLAM || penV === HOLAM_VAV || penV === "holamvav" || penV === PATACH || penV === KAMATZ) && !/(כמ|המ|כנ|הנ)$/.test(bare)) return pen.i;
    // netzach, zera: a patach before a final chet or ayin.
    if (last.nu.v === PATACH && /[חע]/.test(letters[lastLetter].ch) && (penV === SEGOL || penV === TZERE || penV === HOLAM || penV === "holamvav")) return pen.i;
    // na'ar, nachal, tachat: two patachs around a guttural (not achat, achar).
    if (last.nu.v === PATACH && penV === PATACH && /[אהחע]/.test(carrier.ch) && !/^(אחת|אחר)$/.test(bare)) return pen.i;
    // bayit, shamayim, Yerushalayim: "ayi" before one last letter.
    if (last.nu.v === CHIRIK && carrier.ch === "י" && (penV === PATACH || penV === KAMATZ) && after.length === 1) return pen.i;
  }

  // 4. Endings that push the stress back.
  const end = letters[lastLetter];
  const endCh = FINAL[end.ch] ?? end.ch;
  const beforeEnd = letters[lastLetter - 1];
  const andFirst = letters[0].ch === "ו" && letters.length > 2;
  const count = nuclei.filter((nu) => nu.kind === "full" || nu.kind === "chataf").length;
  // -nu (kidshanu, Elokeinu, lanu), -hu (Eliyahu, kamohu): after a full vowel.
  if (last.nu.v === "shuruk" && last.nu.li === lastLetter && beforeEnd) {
    const prev = letters[lastLetter - 2];
    if (beforeEnd.ch === "נ" && prev && !prev.sheva) return pen.i;
    if (beforeEnd.ch === "ה" && !beforeEnd.dagesh) return pen.i;
  }
  // -ekha, -eha (lefanekha, derakheha): a segol before the last syllable.
  if (last.nu.li === lastLetter && last.nu.v === KAMATZ && /[כה]/.test(endCh) && pen.nu.v === SEGOL) return pen.i;
  // -ta (amarta, asita): "you did". After "and" it moves to the end (ve'ahavta), except asita-like verbs.
  if (last.nu.li === lastLetter && last.nu.v === KAMATZ && endCh === "ת") {
    const iYod = pen.nu.v === CHIRIK && letters[pen.nu.li + 1]?.ch === "י";
    if (!andFirst || iYod) return pen.i;
    return last.i;
  }
  // -ti (amarti, asiti): "I did".
  if (endCh === "י" && !end.vowel && beforeEnd?.ch === "ת" && last.nu.li === lastLetter - 1 && last.nu.v === CHIRIK) {
    const prev = letters[lastLetter - 2];
    if (beforeEnd.dagesh && prev?.sheva && !andFirst) return pen.i;
    if (!beforeEnd.dagesh && pen.nu.v === CHIRIK && prev?.ch === "י" && count >= 3 && !andFirst) return pen.i;
  }
  // -eni (chaneni, hoshi'eni): "me".
  if (endCh === "י" && !end.vowel && beforeEnd?.ch === "נ" && last.nu.v === CHIRIK && pen.nu.v === TZERE && count >= 3) return pen.i;
  // yagidu, shiru, kumu, yashuvu: a long i or u before a last -u.
  if (last.nu.v === "shuruk" && last.nu.li === lastLetter && adjacent && ((pen.nu.v === CHIRIK && letters[pen.nu.li + 1]?.ch === "י" && isMater(letters[pen.nu.li + 1])) || pen.nu.v === "shuruk")) return pen.i;

  return last.i;
}

/** A Hebrew word as a voice should say it: its letters, which stretch of them is stressed, and its sounds. */
export interface SpokenWord {
  /** Latin letters, with "kh" for the throaty sound of chet and khaf. */
  latin: string;
  /** The stressed syllable's place in `latin`, when the word has more than one syllable. */
  stress: [number, number] | null;
}

const CONSONANT_PAIR = /^(ch|sh|tz)$/;

/** Where the syllable around a vowel begins: one consonant before it (ch, sh and tz count as one). */
function syllableStart(out: string, s: number): number {
  if (s === 0) return 0;
  const one = out[s - 1];
  if (!/[a-z]/.test(one) || /[aeiou]/.test(one)) return s;
  return s >= 2 && CONSONANT_PAIR.test(out.slice(s - 2, s)) ? s - 2 : s - 1;
}

/** One vocalized Hebrew word for a voice, with its stress (see `stressedNucleus`). */
export function spokenWord(raw: string, p: Pronunciation = "sephardi"): SpokenWord {
  const trace: Trace = { nuclei: [], letters: [], taam: [], meteg: [] };
  const out = transliterateWord(raw, p, trace);
  const kh = (t: string) => t.replace(/ch/g, "kh");
  const sounded = trace.nuclei.filter((nu) => nu.kind === "full" || nu.kind === "furtive" || nu.kind === "chataf");
  const at = out && trace.letters.length ? stressedNucleus(trace) : -1;
  if (at < 0 || sounded.length < 2) return { latin: kh(out), stress: null };
  const nu = trace.nuclei[at];
  const start = syllableStart(out, nu.s);
  const next = trace.nuclei[at + 1];
  const end = Math.min(out.length, next ? Math.max(nu.e, syllableStart(out, next.s)) : out.length);
  const pre = kh(out.slice(0, start));
  const mid = kh(out.slice(start, end));
  return { latin: pre + mid + kh(out.slice(end)), stress: [pre.length, pre.length + mid.length] };
}

/** How a voice is shown where the stress falls: not at all, in capitals, or as sounds (IPA) between slashes. */
export type StressStyle = "plain" | "caps" | "ipa";

const IPA_PAIRS: Array<[string, string]> = [
  ["kh", "x"],
  ["sh", "ʃ"],
  ["tz", "ts"],
  ["ei", "eɪ"],
  ["ai", "aɪ"],
  ["oy", "ɔɪ"],
];
const IPA_ONE: Record<string, string> = { a: "ɑ", e: "ɛ", i: "i", o: "oʊ", u: "u", y: "j", r: "ɹ", g: "ɡ" };

/** Latin letters from `spokenWord` as sounds (the International Phonetic Alphabet, as an English speaker says Hebrew). */
export function latinToIpa(latin: string): string {
  let out = "";
  for (let i = 0; i < latin.length; ) {
    const two = latin.slice(i, i + 2).toLowerCase();
    const pair = IPA_PAIRS.find(([from]) => from === two);
    if (pair) {
      out += pair[1];
      i += 2;
      continue;
    }
    const c = latin[i].toLowerCase();
    // A sounded sheva after a consonant; between two vowels the mark only keeps them apart.
    if (c === "'") out += /[ɑɛiʊu]$/.test(out) || !out ? "" : "ə";
    // A last "h" after a vowel is only written, not said ("atah", "Torah").
    else if (c === "h" && i === latin.length - 1 && /[ɑɛiʊu]$/.test(out)) out += "";
    else out += IPA_ONE[c] ?? c;
    i++;
  }
  return out;
}

/** A spoken word in the chosen style: "barukh", "baRUKH", or "/bɑˈɹux/". */
export function styledWord(w: SpokenWord, style: StressStyle): string {
  if (!w.latin) return "";
  if (style === "ipa") {
    if (!w.stress) return `/${latinToIpa(w.latin)}/`;
    return `/${latinToIpa(w.latin.slice(0, w.stress[0]))}ˈ${latinToIpa(w.latin.slice(w.stress[0]))}/`;
  }
  if (style === "caps" && w.stress) return w.latin.slice(0, w.stress[0]) + w.latin.slice(w.stress[0], w.stress[1]).toUpperCase() + w.latin.slice(w.stress[1]);
  return w.latin;
}

/** A line of vocalized Hebrew for a voice: each word in Latin letters or sounds, with its stress. */
export function sayHebrew(text: string, p: Pronunciation = "sephardi", style: StressStyle = "caps"): string {
  const clean = text.replace(/[▾▴°◂]/g, "").replace(/׃/g, ".").replace(/־/g, " ");
  return clean
    .replace(/[א-ת][֑-ׇא-ת]*/g, (w) => styledWord(spokenWord(w, p), style))
    .replace(/\s+/g, " ")
    .trim();
}

/** A line of vocalized Hebrew in Latin letters; marks, punctuation and spacing kept simple. */
export function transliterate(text: string, p: Pronunciation = "sephardi"): string {
  const clean = text.replace(/[▾▴°◂]/g, "").replace(/׃/g, ".").replace(/־/g, "-");
  const out = clean.replace(/[א-ת][֑-ׇא-ת]*/g, (w) => transliterateWord(w, p));
  // A capital at the start of each sentence reads more easily.
  return out.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase()).replace(/\s+/g, " ").trim();
}
