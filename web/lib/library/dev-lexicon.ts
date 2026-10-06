/*
 * Development word notes: a small hand-typed lexicon of roots and a glossary of the Gemara's
 * recurring terms, so the reader can teach people to read. Typed by the RabAI team for testing.
 *
 * These are teaching notes, not sources: RabAI never cites them. They are replaced by entries
 * drawn from approved dictionaries (the Radak's Sefer HaShorashim, the Aruch) once the board
 * approves those works. Where else a word appears is never typed here; the app computes it
 * from the library itself (see language.ts).
 */

export interface WordForm {
  /** The word as written, without vowels. */
  form: string;
  /** What this form means. */
  gloss: string;
  /** How the word is built, in plain words. */
  parts?: string;
}

export interface Root {
  id: string;
  /** The root letters, separated by hyphens: "ב-ד-ל". */
  root: string;
  language: "hebrew" | "aramaic";
  meaning: string;
  /** A connection to something familiar. The team's own explanation. */
  note?: string;
  forms: WordForm[];
}

export interface Phrase {
  id: string;
  /** As shown: "תנו רבנן". */
  phrase: string;
  /**
   * Words to match, in order. A word ending in "*" matches any word that starts with it
   * ("כ*" matches "כבית"). The first word may also carry a ו ("and") in front.
   */
  match: string[];
  meaning: string;
  /** What the phrase does in the give and take of the Gemara. */
  role: string;
}

export const DEV_ROOTS: Root[] = [
  {
    id: "bdl",
    root: "ב-ד-ל",
    language: "hebrew",
    meaning: "separate, set apart",
    note: "Havdalah (הבדלה), the blessing that separates Shabbos from the weekdays, comes from this root.",
    forms: [
      { form: "ויבדל", gloss: "and He separated", parts: "ו (and) + the root ב-ד-ל, in a form that tells what happened" },
      { form: "מבדיל", gloss: "separating", parts: "the root ב-ד-ל, describing something that keeps doing it" },
      { form: "להבדיל", gloss: "to separate", parts: "ל (to) + the root ב-ד-ל" },
      { form: "הבדלה", gloss: "separation; Havdalah", parts: "a noun from the root ב-ד-ל" },
    ],
  },
  {
    id: "qra",
    root: "ק-ר-א",
    language: "hebrew",
    meaning: "call; also read aloud",
    note: "The book of Vayikra is named for its first word, “and He called”. Mikra (מקרא), Scripture, is what is read aloud.",
    forms: [
      { form: "ויקרא", gloss: "and He called", parts: "ו (and) + the root ק-ר-א" },
      { form: "קרא", gloss: "He called" },
    ],
  },
  {
    id: "amr",
    root: "א-מ-ר",
    language: "hebrew",
    meaning: "say",
    note: "The same root works in Aramaic, so you will meet it on every page of Gemara: אמר רבי… (“Rabbi … said”).",
    forms: [
      { form: "ויאמר", gloss: "and He said", parts: "ו (and) + the root א-מ-ר" },
      { form: "אמר", gloss: "said" },
      { form: "אומרים", gloss: "say (plural)" },
      { form: "אמרו", gloss: "they said" },
      { form: "יאמרו", gloss: "they will say; they say" },
      { form: "ואמרה", gloss: "and said (of something feminine, here the heavenly voice)", parts: "ו (and) + the root א-מ-ר" },
    ],
  },
  {
    id: "hyh",
    root: "ה-י-ה",
    language: "hebrew",
    meaning: "be, become, happen",
    forms: [
      { form: "יהי", gloss: "let there be" },
      { form: "ויהי", gloss: "and there was; and it was", parts: "ו (and) + the root ה-י-ה" },
      { form: "היתה", gloss: "was (feminine)" },
      { form: "היה", gloss: "was" },
      { form: "והיו", gloss: "and they shall be", parts: "ו (and) + the root ה-י-ה" },
    ],
  },
  {
    id: "rah",
    root: "ר-א-ה",
    language: "hebrew",
    meaning: "see",
    forms: [{ form: "וירא", gloss: "and He saw", parts: "ו (and) + the root ר-א-ה" }],
  },
  {
    id: "bra",
    root: "ב-ר-א",
    language: "hebrew",
    meaning: "create",
    forms: [
      { form: "ברא", gloss: "created" },
      { form: "בראה", gloss: "He created it", parts: "the root ב-ר-א + ה (it)" },
    ],
  },
  {
    id: "rsh",
    root: "ר-א-ש",
    language: "hebrew",
    meaning: "head; beginning; first",
    note: "Rosh Hashanah is the “head” of the year.",
    forms: [
      { form: "בראשית", gloss: "in the beginning", parts: "ב (in) + ראשית (beginning), from the root ר-א-ש" },
      { form: "ראש", gloss: "head" },
      { form: "ראשון", gloss: "first" },
      { form: "ראשונה", gloss: "first (feminine)" },
    ],
  },
  {
    id: "tov",
    root: "ט-ו-ב",
    language: "hebrew",
    meaning: "good",
    forms: [{ form: "טוב", gloss: "good" }],
  },
  {
    id: "ahv",
    root: "א-ה-ב",
    language: "hebrew",
    meaning: "love",
    forms: [{ form: "ואהבת", gloss: "and you shall love", parts: "ו (and) + the root א-ה-ב, in a form that commands" }],
  },
  {
    id: "shma",
    root: "ש-מ-ע",
    language: "hebrew",
    meaning: "hear; listen; understand",
    note: "In the Gemara, תא שמע (“come and hear”) brings a source into the discussion.",
    forms: [{ form: "שמע", gloss: "hear!" }],
  },
  {
    id: "taam",
    root: "ט-ע-ם",
    language: "aramaic",
    meaning: "reason (literally, taste)",
    note: "The Gemara asks מאי טעמא, “what is the reason?”, again and again. Learn this word and you will see it everywhere.",
    forms: [
      { form: "טעמא", gloss: "the reason" },
      { form: "וטעמא", gloss: "and the reason", parts: "ו (and) + טעמא" },
      { form: "טעם", gloss: "reason; taste" },
    ],
  },
  {
    id: "hdr",
    root: "ה-ד-ר",
    language: "hebrew",
    meaning: "beauty, splendor",
    note: "Hiddur mitzvah means doing a mitzvah beautifully, more than the minimum.",
    forms: [
      { form: "המהדרין", gloss: "those who beautify (the mitzvah)", parts: "ה (the) + מהדרין, from the root ה-ד-ר" },
      { form: "והמהדרין", gloss: "and those who beautify (the mitzvah)", parts: "ו (and) + ה (the) + מהדרין" },
    ],
  },
  {
    id: "dlq",
    root: "ד-ל-ק",
    language: "hebrew",
    meaning: "kindle, light",
    note: "Hadlakas neiros, lighting the Shabbos and Chanukah candles, comes from this root.",
    forms: [{ form: "מדליק", gloss: "lights; kindles" }],
  },
  {
    id: "gmr",
    root: "ג-מ-ר",
    language: "aramaic",
    meaning: "learn; complete",
    note: "The word Gemara is commonly explained as coming from this root: what is learned.",
    forms: [{ form: "גמור", gloss: "learn! (also: finish)" }],
  },
];

export const DEV_PHRASES: Phrase[] = [
  {
    id: "tanu-rabanan",
    phrase: "תנו רבנן",
    match: ["תנו", "רבנן"],
    meaning: "The Sages taught",
    role: "Introduces a baraita: a teaching of the Tannaim that is not in the Mishnah.",
  },
  {
    id: "mai-taama",
    phrase: "מאי טעמא",
    match: ["מאי", "טעמא"],
    meaning: "What is the reason?",
    role: "Asks for the reasoning behind a ruling or a statement.",
  },
  {
    id: "ta-shma",
    phrase: "תא שמע",
    match: ["תא", "שמע"],
    meaning: "Come and hear",
    role: "Brings a source to prove a point or to challenge one.",
  },
  {
    id: "kashya",
    phrase: "קשיא",
    match: ["קשיא"],
    meaning: "It is a difficulty",
    role: "Marks a challenge. Often the Gemara leaves it standing as an open question.",
  },
  {
    id: "teyuvta",
    phrase: "תיובתא",
    match: ["תיובתא"],
    meaning: "A refutation",
    role: "The opinion has been disproved by a source.",
  },
  {
    id: "ika-deamri",
    phrase: "איכא דאמרי",
    match: ["איכא", "דאמרי"],
    meaning: "Some say",
    role: "Gives another version of the discussion just before it.",
  },
  {
    id: "pligi",
    phrase: "פליגי",
    match: ["פליגי"],
    meaning: "They disagree",
    role: "Introduces a dispute between Sages.",
  },
  {
    id: "chad-amar",
    phrase: "חד אמר … וחד אמר",
    match: ["חד", "אמר"],
    meaning: "One said … and the other said",
    role: "Two Sages give different explanations, and the Gemara does not say which Sage said which.",
  },
  {
    id: "bemaarava",
    phrase: "במערבא",
    match: ["במערבא"],
    meaning: "In the West",
    role: "Means Eretz Yisrael, which lies west of Bavel, where the Babylonian Talmud was composed.",
  },
  {
    id: "michan-veilach",
    phrase: "מכאן ואילך",
    match: ["מכאן", "ואילך"],
    meaning: "From here on; from then on",
    role: "Marks what continues after a starting point.",
  },
  {
    id: "pocheis-vehulech",
    phrase: "פוחת והולך",
    match: ["פוחת", "והולך"],
    meaning: "Steadily decreasing",
    role: "With a verb, והולך means the action keeps going: פוחת והולך, “decreasing step by step”.",
  },
  {
    id: "mosif-vehulech",
    phrase: "מוסיף והולך",
    match: ["מוסיף", "והולך"],
    meaning: "Steadily adding",
    role: "Adding step by step, one more each time.",
  },
  {
    id: "halacha-ke",
    phrase: "הלכה כ…",
    match: ["הלכה", "כ*"],
    meaning: "The halacha follows …",
    role: "States whose opinion is followed in practice.",
  },
  {
    id: "eilu-veilu",
    phrase: "אלו ואלו",
    match: ["אלו", "ואלו"],
    meaning: "These and these",
    role: "Both opinions in a dispute (from Eruvin 13b: “these and these are the words of the living God”).",
  },
  {
    id: "zil-gmor",
    phrase: "זיל גמור",
    match: ["זיל", "גמור"],
    meaning: "Go and learn",
    role: "Hillel's charge to the convert: the rest of the Torah explains the principle, so go and learn it.",
  },
];
