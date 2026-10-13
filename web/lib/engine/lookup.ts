import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Passage } from "../library/types";
import { codeOf } from "../library/link-order";
import { parseRef, sectionOf, type TestingStore } from "../library/testing";
import {
  allowedLookup,
  lookOnline,
  onlineDocuments,
  onlineSetting,
  type OnlineFindings,
  type OnlineSetting,
  type ResearchClient,
} from "./online";

/*
 * Finding sources the way a lamdan does: first think where the answer lives (the Gemara on
 * the topic, the Rambam, the Shulchan Aruch and the Mishnah Berurah, the meforshim on the
 * verse), then open those places, follow their cross-references, and search the library for
 * the key words, in Hebrew and in English.
 *
 * A quick model call proposes the places and the words. It may only name books the library
 * holds, and every place it names is looked up; anything that is not in the library simply
 * finds nothing. The model that writes the answer sees only what was found.
 */

/**
 * Whether to look online as well, and where: "torah" searches only the trusted Orthodox sites
 * (canon/lookup-sites.yaml); "general" searches the open web, for everyday facts with no Torah
 * side, never the sites barred there.
 */
export type OnlineNeed = "" | "torah" | "general";

export interface LookupPlan {
  refs: string[];
  hebrew: string[];
  english: string[];
  /** A practical halacha question: what to do in a real situation (halacha l'maaseh). */
  practical: boolean;
  online: OnlineNeed;
  /** Searches for the online lookup, as a person would type them. */
  queries: string[];
  /**
   * The person asks about RabAI's own library: which books it reads, whether a book is in it,
   * what it leaves out and why. RabAI is then given the sources list (lib/sources).
   */
  library: boolean;
}

export interface LookupClient {
  create(params: MessageCreateParamsNonStreaming): Promise<{ content: Array<{ type: string; text?: string }> }>;
}

export const LOOKUP_LIMITS = {
  refs: 8,
  hebrew: 6,
  english: 4,
  /** Lines taken from each place the plan names. */
  perRef: 6,
  /** Commentaries and parallel passages followed from the first places. */
  linked: 8,
  /**
   * The same, when a place opened is a seif of the Shulchan Aruch or a halacha of the Mishneh
   * Torah: a ruling is read with the commentaries printed around it and the sources it rests on.
   */
  halachaLinked: 12,
  /** Full-text search results. */
  searched: 8,
  /** All texts sent to the model. */
  documents: 24,
  /** Dictionary entries for the words of passages that have no English. */
  dictionary: 8,
  /**
   * Articles from the website collections (Aish.com and the like), added after the texts
   * themselves so they never take a primary source's place.
   */
  articles: 4,
  /** Searches for an online lookup. */
  queries: 3,
  /** Places opened in the library because a page found online relies on them. */
  checked: 8,
  /** Lines taken from each of those places. */
  perChecked: 3,
};

export function lookupModel(env: Record<string, string | undefined> = process.env): string {
  return env.RABAI_LOOKUP_MODEL || "claude-sonnet-5-5";
}

const LOOKUP_INSTRUCTIONS = `You find sources for a Torah learning app, the way a lamdan would: you
know where in Tanakh, Mishnah, Gemara, Midrash, the Rishonim, the codes and the classic
Acharonim a question is discussed, and you name those places precisely.

Name only places in the books listed below, using exactly the names given there, in the form
"Book chapter:verse" or "Tractate daf:line", for example "Genesis 1:1", "Shabbat 21b:5",
"Mishnah Berakhot 1:1", "Shulchan Arukh, Orach Chayim 671:2", "Mishneh Torah, Repentance 2:1".
A chapter, siman or daf alone ("Berakhot 2a", "Genesis 1", "Arukh HaShulchan, Orach Chaim 671")
opens the lines in it that hold your phrases, or its first lines. Prefer the central places: the
primary text first, then the code that rules on it. If you are not sure of the exact line, give
the chapter, siman or daf.

For a question of halacha, name the places the way a posek opens them:
- the seif of the Shulchan Aruch, which holds the Rema's gloss too ("Shulchan Arukh, Yoreh
  De'ah 87:1"). The commentaries printed with it (the Mishnah Berurah, the Magen Avraham, the
  Taz, the Shach and the rest) and the Gemara it rests on are opened with it, so you need not
  name them;
- the same siman in the Tur ("Tur, Orach Chayim 671") and in the Beit Yosef ("Beit Yosef, Orach
  Chayim 671"), and in the Arukh HaShulchan, which spells Orach Chayim "Orach Chaim" ("Arukh
  HaShulchan, Orach Chaim 671"; "Arukh HaShulchan, Yoreh De'ah 87");
- the halacha in the Rambam's Mishneh Torah ("Mishneh Torah, Sabbath 1:1"); its commentaries
  (the Maggid Mishneh, the Kessef Mishneh, the Ra'avad) come with it;
- the Gemara the ruling comes from, when you know the line;
- for an everyday practical question, also the Kitzur Shulchan Arukh's siman ("Kitzur Shulchan
  Arukh 139"); for Sephardic practice, the Kaf HaChayim and the Ben Ish Hai.

Questions about everyday life count too. When someone asks about anger, an argument, grief,
worry, a hard decision, honesty, gratitude, money, or raising children, name the places the
Torah speaks to it: Pirkei Avot, the Rambam's Hilchot De'ot, the mussar works, the Chafetz
Chaim, the works on bitachon (trust in HaShem).

Also give a few short phrases (two to four words) likely to appear in the sources: Hebrew or
Aramaic without vowels, and English as the translations would put it.

Then say what kind of question it is, and whether RabAI should also look online:
- "practical": true when the person asks what to do in a real situation, theirs or someone's
  (may I, can I, is it allowed, what do I do if, which blessing, how long do I wait, is this
  product kosher, what time is candle lighting). False for learning questions ("why does the
  Gemara say", "what is the reason for"), even about halacha.
- "online": "torah" when RabAI should also check what trusted Orthodox websites say: for every
  practical question; for anything the classic books won't name directly (electricity and
  technology, medicine, a product or brand, a hechsher, today's customs and calendar, a
  contemporary posek's ruling, a recent rabbi, an organization or an event); or when the person
  asks to look it up. "general" when the question needs current or specific facts with no Torah
  side (news, a place, a product, a schedule, recent science). Otherwise "".
- "queries": for an online lookup, one to three short searches, the way a person would type
  them into a search engine (for example "using a microwave on Shabbat", "Star-K dishwasher
  Shabbos").
- "library": true when the person asks about RabAI itself and its own library: which books,
  editions, translations or commentaries it uses, whether a book is in its library, what it
  leaves out and why, which websites it searches, or how it chooses its sources ("what sources
  do you use?", "do you have the Zohar?", "why don't you use that translation?"). False when they
  ask what the sources say about a topic ("what are the sources for lighting candles?"). A
  library question needs no refs or phrases, unless they also ask what a book says.

Reply with JSON only, in this form:
{"refs": ["..."], "hebrew": ["..."], "english": ["..."], "practical": false, "online": "", "queries": [], "library": false}
At most ${LOOKUP_LIMITS.refs} refs, ${LOOKUP_LIMITS.hebrew} Hebrew phrases, ${LOOKUP_LIMITS.english} English phrases and ${LOOKUP_LIMITS.queries} queries.
For a message that needs no sources (a greeting, small talk, a question about the app, or a
practical task with no Torah side, such as a recipe or a math problem), reply with empty lists
of refs and phrases; it may still need an everyday lookup online.

The books in the library:
`;

export function lookupRequest(question: string, catalog: string, model = lookupModel()): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 800,
    output_config: { effort: "low" },
    system: [{ type: "text", text: LOOKUP_INSTRUCTIONS + catalog, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: question }],
  };
}

function strings(value: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const s = v.replace(/\s+/g, " ").trim().slice(0, maxLen);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

/** Read the plan from the model's reply, or null when the reply holds no plan at all. */
export function readLookupPlan(text: string): LookupPlan | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const json = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (!json || typeof json !== "object" || !("refs" in json || "hebrew" in json || "english" in json)) return null;
    const online: OnlineNeed = json.online === "torah" || json.online === "general" ? json.online : "";
    return {
      refs: strings(json.refs, LOOKUP_LIMITS.refs, 100),
      hebrew: strings(json.hebrew, LOOKUP_LIMITS.hebrew, 60),
      english: strings(json.english, LOOKUP_LIMITS.english, 60),
      practical: json.practical === true,
      online,
      queries: online ? strings(json.queries, LOOKUP_LIMITS.queries, 120) : [],
      library: json.library === true,
    };
  } catch {
    return null;
  }
}

/** A plan that opens nothing and looks nothing up. */
export function emptyPlan(): LookupPlan {
  return { refs: [], hebrew: [], english: [], practical: false, online: "", queries: [], library: false };
}

/** Read the plan from the model's reply. Anything malformed becomes an empty plan. */
export function parseLookupPlan(text: string): LookupPlan {
  return readLookupPlan(text) ?? emptyPlan();
}

/** Common English words that make poor search terms. */
const STOP_WORDS = new Set(
  "about after again also always among another because before being could does doing during every from have here into just know like many might more most much must only other over said same should since some such than that their them then there these they this those through very want were what when where which while whole will with would your".split(
    " ",
  ),
);

/** Words of the question itself, used when no plan is available. */
export function fallbackPlan(question: string): LookupPlan {
  const hebrew = (question.match(/[א-ת][֑-ׇא-ת"'״׳]*(?:\s+[א-ת][֑-ׇא-ת"'״׳]*){0,2}/g) ?? []).slice(0, 3);
  const english = (question.match(/[A-Za-z][A-Za-z'-]*/g) ?? [])
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 4);
  return { ...emptyPlan(), hebrew, english, library: asksAboutLibrary(question) };
}

const SOURCE_WORDS = "sources?|books?|seforim|sefarim|texts?|editions?|translations?|commentar(?:y|ies)|meforshim|websites?|sites?|library";

/**
 * Whether a question plainly asks about RabAI's own library ("what sources do you use?", "is the
 * Kuzari in your library?", "what do you leave out?"). Used when the planner isn't available; the
 * planner itself decides otherwise. Asking for sources on a topic ("do you have a source for
 * waiting six hours?") is not a library question.
 */
export function asksAboutLibrary(question: string): boolean {
  const t = question.slice(0, 600);
  if (new RegExp(`\\byour\\s+(?:own\\s+)?(?:${SOURCE_WORDS}|canon|bookshelf|whitelist|list)\\b`, "i").test(t)) return true;
  if (/\brabai'?s\s+(?:own\s+)?(?:library|sources|books|canon|bookshelf)\b/i.test(t)) return true;
  if (new RegExp(`\\b(?:which|what)\\s+(?:${SOURCE_WORDS})\\s+(?:do|does|did|will|can|are)\\s+(?:you|rabai)\\b`, "i").test(t)) return true;
  if (/\b(?:leave|leaves|left)\s+out\b|\bexclud(?:e|es|ed|ing)\b/i.test(t) && /\b(?:you|your|rabai)\b/i.test(t)) return true;
  if (/\bsources?\s+(?:for|on|about|that)\b/i.test(t)) return false;
  return new RegExp(
    `\\b(?:do|does|did|can)\\s+(?:you|rabai)\\s+(?:use|have|include|read|rely on|trust|search|quote|cite|consult|open)\\b[^?.!]{0,60}\\b(?:${SOURCE_WORDS})\\b`,
    "i",
  ).test(t);
}

export async function planLookups(question: string, store: TestingStore, client: LookupClient | null): Promise<LookupPlan> {
  if (!client || !question.trim()) return fallbackPlan(question);
  try {
    const catalog = await store.catalog();
    const reply = await client.create(lookupRequest(question, catalog));
    const text = reply.content.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
    // An empty plan is a choice: small talk or a practical task needs no sources, and searching
    // anyway only slows the answer and hands the model passages that don't help.
    return readLookupPlan(text) ?? fallbackPlan(question);
  } catch (err) {
    console.warn("[rabai] lookup planning failed:", err instanceof Error ? err.message : err);
    return fallbackPlan(question);
  }
}

/**
 * The library's places for texts a page found online relies on ("Shulchan Aruch O.C. 318:4"),
 * named by the same planner with the same cached catalog, so RabAI can open them and check the
 * page against them.
 */
export async function placesForTexts(texts: string[], store: TestingStore, client: LookupClient | null): Promise<string[]> {
  if (!client || !texts.length) return [];
  const request = [
    "This is not the person's question. A trusted Orthodox website relies on the texts below. Name each one as a place in the library, exactly as the library names it, so RabAI can open it and check the website against it.",
    ...texts.map((t) => `- ${t}`),
    'Fill in "refs" only. Leave the phrase lists and "queries" empty, "practical" false, and "online" "".',
  ].join("\n");
  return (await planLookups(request, store, client)).refs;
}

export interface Retrieved {
  plan: LookupPlan;
  documents: Passage[];
  /** What the online lookup found, when one ran. */
  online?: OnlineFindings;
  /** Places opened in the library because a page found online relies on them. */
  checked?: string[];
}

export interface RetrieveOptions {
  focusRef?: string;
  extraPhrases?: string[];
  /** The client for an online lookup; without one, nothing is looked up online. */
  research?: ResearchClient | null;
  /** RABAI_ONLINE, read from the environment unless given. */
  online?: OnlineSetting;
  /** A short note on what is happening, for a live screen. */
  onStatus?: (text: string) => void;
}

/** Open the planned places, follow their links, and search; the line in focus comes first. */
export async function retrieveFromTesting(
  question: string,
  store: TestingStore,
  client: LookupClient | null,
  opts: RetrieveOptions = {},
): Promise<Retrieved> {
  const plan = await planLookups(question, store, client);
  const refs = [...(opts.focusRef ? [opts.focusRef] : []), ...plan.refs];
  const phrases = [...(opts.extraPhrases ?? []), ...plan.hebrew, ...plan.english];

  // An online lookup runs beside the library's, when the plan asks for one and the setting allows.
  const kind = opts.research ? allowedLookup(plan.online, opts.online ?? onlineSetting()) : "";
  if (kind) opts.onStatus?.(kind === "torah" ? "Searching trusted Orthodox sites" : "Searching the web");
  const lookingOnline = kind && opts.research ? lookOnline(question, plan.queries, kind, opts.research) : null;

  const [opened, searched, articles] = await Promise.all([
    store.lookup(refs, LOOKUP_LIMITS.perRef, phrases),
    store.search(phrases, LOOKUP_LIMITS.searched),
    store.articles(phrases, LOOKUP_LIMITS.articles).catch((err) => {
      console.warn("[rabai] article search failed:", err instanceof Error ? err.message : err);
      return [] as Passage[];
    }),
  ]);
  // Follow cross-references from the places opened: the commentaries on a verse, the Mishnah
  // behind a Gemara, the commentaries printed around a seif and the Gemara behind it, in the
  // order a learner opens them (link-order.ts). Every line asked for by name is followed; a
  // whole chapter, siman or daf is followed from its first line opened.
  const asked = new Set(refs.map((r) => parseRef(r).start));
  const anchors: string[] = [];
  for (const p of opened) {
    if (anchors.length >= 4) break;
    if (asked.has(p.ref) || !anchors.some((a) => sectionOf(a) === p.section)) anchors.push(p.ref);
  }
  const linked = await store.linked(anchors, anchors.some((a) => codeOf(a)) ? LOOKUP_LIMITS.halachaLinked : LOOKUP_LIMITS.linked);

  const out = new Map<string, Passage>();
  const add = (ps: Passage[], cap: number) => {
    for (const p of ps) if (out.size < cap && !out.has(p.ref)) out.set(p.ref, p);
  };
  add(opened, LOOKUP_LIMITS.documents);
  add(linked, LOOKUP_LIMITS.documents);
  add(searched, LOOKUP_LIMITS.documents);

  // What the online lookup found, and the texts its pages rely on, opened in the library so the
  // pages can be checked against them.
  let online: OnlineFindings | undefined;
  let checked: string[] = [];
  if (lookingOnline) {
    online = await lookingOnline;
    if (online.texts.length) {
      opts.onStatus?.("Opening the texts those pages rely on");
      try {
        const places = await placesForTexts(online.texts, store, client);
        const found = await store.lookup(places.slice(0, LOOKUP_LIMITS.checked), LOOKUP_LIMITS.perChecked);
        add(found, out.size + LOOKUP_LIMITS.checked * LOOKUP_LIMITS.perChecked);
        checked = [...new Set(found.map((p) => p.ref))].filter((r) => out.has(r));
      } catch (err) {
        console.warn("[rabai] opening the texts a page relies on failed:", err instanceof Error ? err.message : err);
      }
    }
  }

  // Passages with no English (much of the Yerushalmi, the Rishonim, the Acharonim) are
  // translated by RabAI itself. Give it the dictionaries' entries for their words: first the
  // entries that cite these very lines, then entries whose headword matches a word.
  const untranslated = [...out.values()].filter((p) => p.he.trim() && !p.en.trim() && !p.source?.dictionary).slice(0, 3);
  if (untranslated.length) {
    try {
      const entries = await store.dictionary(untranslated, LOOKUP_LIMITS.dictionary);
      add(entries, out.size + LOOKUP_LIMITS.dictionary);
    } catch (err) {
      console.warn("[rabai] dictionary lookup failed:", err instanceof Error ? err.message : err);
    }
  }
  // Contemporary articles last: they explain and point to the texts, and never replace them.
  add(articles, out.size + LOOKUP_LIMITS.articles);
  // Pages found online come after everything from the library, marked as found online.
  if (online?.pages.length) add(onlineDocuments(online), out.size + online.pages.length);
  return { plan, documents: [...out.values()], ...(online ? { online, checked } : {}) };
}
