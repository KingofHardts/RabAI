import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Passage } from "../library/types";
import type { QuestionPicture } from "../pictures";
import { codeOf } from "../library/link-order";
import { asksAboutCalendar } from "../calendar/place";
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
   * The person asks about RabbAI's own library: which books it reads, whether a book is in it,
   * what it leaves out and why. RabbAI is then given the sources list (lib/sources).
   */
  library: boolean;
  /**
   * The question depends on the date or the time: the day's zmanim, when Shabbat or a holiday or
   * a fast begins or ends, the Hebrew date, this week's parsha, today's daf. RabbAI is then given
   * the calendar's times for the person's place (lib/calendar).
   */
  calendar: boolean;
  /** The Torah subject of the question, in a few words; empty when it isn't about Torah learning. */
  topic: string;
  /**
   * Set when the lookup step's own plan couldn't be used and the question's words were searched
   * instead: its reply was cut off at the token limit, couldn't be read as a plan, or the call
   * failed. Nothing shows it to the person; the live check reports it.
   */
  fallback?: LookupFallback;
  /** A follow-up in a conversation, answered from its sources without the lookup step. */
  quick?: boolean;
}

export type LookupFallback = "cut_off" | "unreadable" | "failed";

export interface LookupClient {
  create(params: MessageCreateParamsNonStreaming): Promise<{ content: Array<{ type: string; text?: string }>; stop_reason?: string | null }>;
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
  /** How many texts count as plenty, and how many articles still come then. */
  plentyOfTexts: 10,
  articlesWithPlenty: 2,
  /**
   * The most the lookup step may write, thinking included: the model thinks before it plans, and
   * its thinking counts toward this cap even though it isn't returned. At 800 a longer think cut
   * the plan off, and the answer fell back to searching the question's words (2026-11-03).
   */
  replyTokens: 4000,
  /** Searches for an online lookup. */
  queries: 3,
  /** Places opened in the library because a page found online relies on them. */
  checked: 8,
  /** Lines taken from each of those places. */
  perChecked: 3,
};

/** How long the long instructions stay cached: an hour, unless RABAI_CACHE_TTL is "5m". */
export function cacheTtl(env: Record<string, string | undefined> = process.env): "5m" | "1h" {
  return env.RABAI_CACHE_TTL === "5m" ? "5m" : "1h";
}

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

Then say what kind of question it is, and whether RabbAI should also look online:
- "practical": true when the person asks what to do in a real situation, theirs or someone's
  (may I, can I, is it allowed, what do I do if, which blessing, how long do I wait, is this
  product kosher, what time is candle lighting). False for learning questions ("why does the
  Gemara say", "what is the reason for"), even about halacha.
- "online": "torah" when RabbAI should also check what trusted Orthodox websites say: for every
  practical question; for anything the classic books won't name directly (electricity and
  technology, medicine, a product or brand, a hechsher, today's customs and calendar, a
  contemporary posek's ruling, a recent rabbi, an organization or an event); or when the person
  asks to look it up. "general" when the question needs current or specific facts with no Torah
  side (news, a place, a product, a schedule, recent science). Otherwise "".
- "queries": for an online lookup, one to three short searches, the way a person would type
  them into a search engine (for example "using a microwave on Shabbat", "Star-K dishwasher
  Shabbos").
- "library": true when the person asks about RabbAI itself and its own library: which books,
  editions, translations or commentaries it uses, whether a book is in its library, what it
  leaves out and why, which websites it searches, or how it chooses its sources ("what sources
  do you use?", "do you have the Zohar?", "why don't you use that translation?"). False when they
  ask what the sources say about a topic ("what are the sources for lighting candles?"). A
  library question needs no refs or phrases, unless they also ask what a book says.

- "calendar": true when the answer depends on today's date or the time of day: the day's times
  (zmanim), when Shabbat, a holiday or a fast begins or ends, candle lighting, the Hebrew date,
  this week's parsha, today's daf or other daily learning, or how many days until a holiday.
- "topic": the Torah subject of the question in three to six English words ("the times for the
  Shema", "Rashi on Genesis 1:1", "lighting Chanukah candles"), so the person's learning can be
  remembered. Empty ("") when the question isn't about Torah learning: about the person's own
  life, feelings, health, family or work, a greeting, or a practical task. Never put a name, a
  place or anything personal in it.

In a chavrusa session, a line before the question says what the person is learning with RabbAI
and the last line reached. "Next line", "keep going" and the like mean the line after it; name
that line and the commentaries on it.

The message may begin with a line about today: the date, the Hebrew date, this week's parsha with
its verses, and today's Daf Yomi. Use it whenever the question depends on the date. "This week's
parsha" means the parsha named there; "today's daf" means the daf named there.

For a dvar Torah, a drash or a thought on the parsha or a holiday, plan the way a darshan
prepares: name the verses at the center (for this week's parsha, its opening verses and a verse
or two the person mentions or that the parsha is known for), so their meforshim open with them
(Rashi, the Ramban, the Ibn Ezra, the Sforno, the Or HaChaim, the Kli Yakar and the rest the
library holds); and name the Midrash on those verses (Bereshit Rabbah and the other Midrash
Rabbah, the Tanchuma) and the Chassidic and mussar works on the parsha the library holds (the
Sefat Emet, the Kedushat Levi, the Noam Elimelech, the Me'or Einayim, the Shem MiShmuel), by their
section for that parsha.

When the person sends pictures, read them first. A picture of a page from a sefer (a daf of
Gemara, a page of Chumash, a siddur, a Mishnah Berurah) shows where to look. Read the page's
header and the words printed on it: on a daf of Gemara, the tractate's name, the chapter and the
daf number in Hebrew letters are printed at the top. Name that place in the library ("Berakhot
2a"; if you can't tell which side of the daf it is, name the daf and give phrases from the page),
and give phrases printed on it, so the right lines open. Handwritten notes in the margins are the person's
own: they tell you what the person is asking about, but they are not the book's words. A picture
of a label, a sign or a letter tells you what the question is about; plan for that question. If
you can't tell what a picture shows, plan from the words of the question alone.

Reply with JSON only, in this form:
{"refs": ["..."], "hebrew": ["..."], "english": ["..."], "practical": false, "online": "", "queries": [], "library": false, "calendar": false, "topic": ""}
At most ${LOOKUP_LIMITS.refs} refs, ${LOOKUP_LIMITS.hebrew} Hebrew phrases, ${LOOKUP_LIMITS.english} English phrases and ${LOOKUP_LIMITS.queries} queries.
For a message that needs no sources (a greeting, small talk, a question about the app, or a
practical task with no Torah side, such as a recipe or a math problem), reply with empty lists
of refs and phrases; it may still need an everyday lookup online.

The books in the library:
`;

export function lookupRequest(
  question: string,
  catalog: string,
  model = lookupModel(),
  pictures: QuestionPicture[] = [],
): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: LOOKUP_LIMITS.replyTokens,
    output_config: { effort: "low" },
    // The catalog is long (every book in the library): kept cached for an hour, so a question asked
    // a few minutes after the last one doesn't wait for it to be read again.
    system: [{ type: "text", text: LOOKUP_INSTRUCTIONS + catalog, cache_control: { type: "ephemeral", ttl: cacheTtl() } }],
    messages: [
      {
        role: "user",
        content: pictures.length
          ? [
              ...pictures.map((p) => ({ type: "image" as const, source: { type: "base64" as const, media_type: p.mediaType, data: p.data } })),
              { type: "text" as const, text: question },
            ]
          : question,
      },
    ],
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

/**
 * The plan's JSON. A Hebrew abbreviation written with a plain quote mark (ק"ש, רש"י) breaks it, so
 * when it can't be read as it is, such quotes are written as the Hebrew gershayim (ק״ש), as the
 * books print them, and it is read again. Valid JSON is never changed.
 */
function parsePlanJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return JSON.parse(raw.replace(/([\u05D0-\u05EA])"(?=[\u05D0-\u05EA])/g, "$1\u05F4")) as Record<string, unknown>;
  }
}

/**
 * The JSON objects in a reply, each from an opening brace to the brace that closes it (braces in
 * strings don't count), so a word in braces before or after the plan doesn't spoil it.
 */
function jsonObjects(text: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"' && depth > 0) inString = true;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}" && depth > 0) {
      depth--;
      if (depth === 0) found.push(text.slice(start, i + 1));
    }
  }
  return found;
}

/** Small slips a model makes in JSON: curly quotes, and a comma before a closing bracket. */
function tidyJson(raw: string): string {
  return raw.replace(/[\u201C\u201D]/g, '"').replace(/,\s*([}\]])/g, "$1");
}

/** Read the plan from the model's reply, or null when the reply holds no plan at all. */
export function readLookupPlan(text: string): LookupPlan | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  // The whole span first, as before; then each complete object in the reply, as written and tidied.
  const spans = [text.slice(start, end + 1), ...jsonObjects(text)];
  const candidates = [...spans, ...spans.map(tidyJson)];
  for (const raw of candidates) {
    let json: Record<string, unknown>;
    try {
      json = parsePlanJson(raw);
    } catch {
      continue;
    }
    if (!json || typeof json !== "object" || Array.isArray(json) || !("refs" in json || "hebrew" in json || "english" in json)) continue;
    return planFromJson(json);
  }
  return null;
}

function planFromJson(json: Record<string, unknown>): LookupPlan {
  const online: OnlineNeed = json.online === "torah" || json.online === "general" ? json.online : "";
  return {
    refs: strings(json.refs, LOOKUP_LIMITS.refs, 100),
    hebrew: strings(json.hebrew, LOOKUP_LIMITS.hebrew, 60),
    english: strings(json.english, LOOKUP_LIMITS.english, 60),
    practical: json.practical === true,
    online,
    queries: online ? strings(json.queries, LOOKUP_LIMITS.queries, 120) : [],
    library: json.library === true,
    calendar: json.calendar === true,
    topic: typeof json.topic === "string" ? json.topic.replace(/[^\p{L}\p{M}\p{N} ,.'’:()-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60) : "",
  };
}

/** A plan that opens nothing and looks nothing up. */
export function emptyPlan(): LookupPlan {
  return { refs: [], hebrew: [], english: [], practical: false, online: "", queries: [], library: false, calendar: false, topic: "" };
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
  return { ...emptyPlan(), hebrew, english, library: asksAboutLibrary(question), calendar: asksAboutCalendar(question) };
}

const SOURCE_WORDS = "sources?|books?|seforim|sefarim|texts?|editions?|translations?|commentar(?:y|ies)|meforshim|websites?|sites?|library";

/**
 * Whether a question plainly asks about RabbAI's own library ("what sources do you use?", "is the
 * Kuzari in your library?", "what do you leave out?"). Used when the planner isn't available; the
 * planner itself decides otherwise. Asking for sources on a topic ("do you have a source for
 * waiting six hours?") is not a library question.
 */
export function asksAboutLibrary(question: string): boolean {
  const t = question.slice(0, 600);
  if (new RegExp(`\\byour\\s+(?:own\\s+)?(?:${SOURCE_WORDS}|canon|bookshelf|whitelist|list)\\b`, "i").test(t)) return true;
  if (/\brabb?ai'?s\s+(?:own\s+)?(?:library|sources|books|canon|bookshelf)\b/i.test(t)) return true;
  if (new RegExp(`\\b(?:which|what)\\s+(?:${SOURCE_WORDS})\\s+(?:do|does|did|will|can|are)\\s+(?:you|rabb?ai)\\b`, "i").test(t)) return true;
  if (/\b(?:leave|leaves|left)\s+out\b|\bexclud(?:e|es|ed|ing)\b/i.test(t) && /\b(?:you|your|rabb?ai)\b/i.test(t)) return true;
  if (/\bsources?\s+(?:for|on|about|that)\b/i.test(t)) return false;
  return new RegExp(
    `\\b(?:do|does|did|can)\\s+(?:you|rabb?ai)\\s+(?:use|have|include|read|rely on|trust|search|quote|cite|consult|open)\\b[^?.!]{0,60}\\b(?:${SOURCE_WORDS})\\b`,
    "i",
  ).test(t);
}

export async function planLookups(
  question: string,
  store: TestingStore,
  client: LookupClient | null,
  pictures: QuestionPicture[] = [],
  /** Lines read before the question: today (the date, this week's parsha, today's daf), and a chavrusa session's place. */
  preface = "",
): Promise<LookupPlan> {
  if (!client || !question.trim()) return fallbackPlan(question);
  try {
    const catalog = await store.catalog();
    const reply = await client.create(lookupRequest(preface ? `${preface}\n\n${question}` : question, catalog, lookupModel(), pictures));
    const text = reply.content.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
    // An empty plan is a choice: small talk or a practical task needs no sources, and searching
    // anyway only slows the answer and hands the model passages that don't help.
    const plan = readLookupPlan(text);
    if (plan) return plan;
    // No plan: say why, so a cut-off or unreadable reply is noticed rather than quietly searched around.
    const cutOff = reply.stop_reason === "max_tokens";
    console.warn(`[rabai] lookup planning ${cutOff ? "was cut off at the token limit" : "gave no plan that could be read"}; searching the question's words instead`);
    return { ...fallbackPlan(question), fallback: cutOff ? "cut_off" : "unreadable" };
  } catch (err) {
    console.warn("[rabai] lookup planning failed:", err instanceof Error ? err.message : err);
    return { ...fallbackPlan(question), fallback: "failed" };
  }
}

/**
 * The library's places for texts a page found online relies on ("Shulchan Aruch O.C. 318:4"),
 * named by the same planner with the same cached catalog, so RabbAI can open them and check the
 * page against them.
 */
export async function placesForTexts(texts: string[], store: TestingStore, client: LookupClient | null): Promise<string[]> {
  if (!client || !texts.length) return [];
  const request = [
    "This is not the person's question. A trusted Orthodox website relies on the texts below. Name each one as a place in the library, exactly as the library names it, so RabbAI can open it and check the website against it.",
    ...texts.map((t) => `- ${t}`),
    'Fill in "refs" only. Leave the phrase lists and "queries" empty, "practical" false, and "online" "".',
  ].join("\n");
  return (await planLookups(request, store, client)).refs;
}

/** How long each step of finding the sources took, in milliseconds (for the live check). */
export interface RetrieveTimings {
  /** The lookup step (the planner's model call), or 0 when it was skipped. */
  plan: number;
  /** Opening, following and searching in the library. */
  library: number;
  /** Looking things up online, when it ran. */
  online?: number;
}

export interface Retrieved {
  plan: LookupPlan;
  documents: Passage[];
  timings?: RetrieveTimings;
  /** What the online lookup found, when one ran. */
  online?: OnlineFindings;
  /** Places opened in the library because a page found online relies on them. */
  checked?: string[];
}

export interface RetrieveOptions {
  focusRef?: string;
  /** Pictures the person sent with the question: the planner reads them too. */
  pictures?: QuestionPicture[];
  extraPhrases?: string[];
  /** The client for an online lookup; without one, nothing is looked up online. */
  research?: ResearchClient | null;
  /** RABAI_ONLINE, read from the environment unless given. */
  online?: OnlineSetting;
  /** A short note on what is happening, for a live screen. */
  onStatus?: (text: string) => void;
  /**
   * Lines the planner reads before the question: today's date and parsha (lib/calendar:
   * calendarNoteForLookup) and, in a chavrusa session, what is being learned (lib/chavrusa).
   */
  preface?: string;
  /** More places to open beside the one in focus (in a chavrusa session, the next line). */
  alsoRefs?: string[];
  /**
   * Keep to one amud of the Bavli: its Gemara, Rashi and Tosafot, and the dictionaries (the
   * chavrusa's "Just the page"). Nothing else is opened, searched or looked up online.
   */
  onlyPage?: string;
}

/** A passage of an amud's Gemara, Rashi or Tosafot, or a dictionary entry for its words. */
export function onThePage(p: Passage, page: string): boolean {
  if (p.source?.dictionary) return true;
  return [page, `Rashi on ${page}`, `Tosafot on ${page}`].some((s) => p.ref === s || p.ref.startsWith(`${s}:`));
}

/** Open the planned places, follow their links, and search; the line in focus comes first. */
export async function retrieveFromTesting(
  question: string,
  store: TestingStore,
  client: LookupClient | null,
  opts: RetrieveOptions = {},
): Promise<Retrieved> {
  const started = Date.now();
  const plan = await planLookups(question, store, client, opts.pictures ?? [], opts.preface ?? "");
  const planned = Date.now();
  const refs = [...(opts.focusRef ? [opts.focusRef] : []), ...(opts.alsoRefs ?? []), ...plan.refs];
  const phrases = [...(opts.extraPhrases ?? []), ...plan.hebrew, ...plan.english];

  // An online lookup runs beside the library's, when the plan asks for one and the setting allows.
  const kind = opts.research && !opts.onlyPage ? allowedLookup(plan.online, opts.online ?? onlineSetting()) : "";
  if (kind) opts.onStatus?.(kind === "torah" ? "Searching trusted Orthodox sites" : "Searching the web");
  const lookingOnline = kind && opts.research ? lookOnline(question, plan.queries, kind, opts.research) : null;

  const [opened, searched, articles] = await Promise.all([
    store.lookup(refs, LOOKUP_LIMITS.perRef, phrases),
    store.search(phrases, LOOKUP_LIMITS.searched),
    (opts.onlyPage ? Promise.resolve([] as Passage[]) : store.articles(phrases, LOOKUP_LIMITS.articles)).catch((err) => {
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
  let onlineMs: number | undefined;
  if (lookingOnline) {
    const waitFrom = Date.now();
    online = await lookingOnline;
    onlineMs = Date.now() - waitFrom;
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
  // translated by RabbAI itself. Give it the dictionaries' entries for their words: first the
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
  // When the library already gave plenty of texts, fewer articles come, so an answer rests on the
  // texts and not on a ready-made article.
  const articleRoom = out.size >= LOOKUP_LIMITS.plentyOfTexts ? LOOKUP_LIMITS.articlesWithPlenty : LOOKUP_LIMITS.articles;
  add(articles.slice(0, articleRoom), out.size + articleRoom);
  // Pages found online come after everything from the library, marked as found online.
  if (online?.pages.length) add(onlineDocuments(online), out.size + online.pages.length);
  const documents = opts.onlyPage ? [...out.values()].filter((p) => onThePage(p, opts.onlyPage!)) : [...out.values()];
  const timings: RetrieveTimings = {
    plan: planned - started,
    library: Date.now() - planned - (onlineMs ?? 0),
    ...(onlineMs !== undefined ? { online: onlineMs } : {}),
  };
  return { plan, documents, timings, ...(online ? { online, checked } : {}) };
}

// ---------------------------------------------------------------------------
// A follow-up in a conversation: no lookup step

/**
 * Words that ask for something new: another book, a ruling, a place, the calendar. A follow-up
 * with these goes through the lookup step as usual, so a practical question still gets its plan
 * (and the note to ask one's rav), and a new book is found.
 */
const NEW_LOOK = new RegExp(
  [
    "\\b(?:rambam|ramban|rashba|ritva|rosh|rif|tur|beit yosef|beis yosef|shulchan|shulhan|aruch|arukh|mishnah? berurah?|kitzur|chayei adam|midrash|zohar|tanya|kuzari|yerushalmi|tosefta|sifr[ae]i?|mechilta|mekhilta|targum|ibn ezra|sforno|malbim|or hachaim|kli yakar|maharsha|maharal|chofetz|chafetz|chazon ish|igros|igrot|responsa|teshuvos|teshuvot|rishonim|acharonim|achronim|poskim)\\b",
    "\\b(?:halach\\w*|halakh\\w*|psak|posek|poskim|ruling|rule|allowed|permitted|forbidden|assur|mutar|kosher|may i|can i|should i|am i allowed|do i have to|must i|is it ok)\\b",
    "\\b(?:source|sources|mekor|where (?:else|is|does|do)|other (?:opinions?|views?|commentar\\w*)|another (?:opinion|view|source))\\b",
    "\\b(?:today|tonight|tomorrow|zmanim|shabbos|shabbat|candle|sunset|sunrise|parsha|parshah|daf yomi|holiday|fast)\\b",
    "רמב|שולחן|משנה ברורה|מדרש|זוהר|הלכה|מקור",
  ].join("|"),
  "i",
);

export interface FollowUpInput {
  question: string;
  /** Whether this turn is part of a conversation (Talk or a chavrusa session) that already has an answer. */
  conversation: boolean;
  /** The sources of the answer just before, and the line a session is on. */
  refs: string[];
  /** Pictures with the question: they need the lookup step's eyes. */
  pictures?: number;
}

/**
 * Whether a turn is a short follow-up in a conversation that can go straight to the sources of the
 * answer before it, without the lookup step (a model call that takes seconds). Only a short
 * question that names no new book, asks no halacha and needs no calendar qualifies; anything
 * else is planned as usual.
 */
export function quickFollowUp(f: FollowUpInput): boolean {
  if (!f.conversation || !f.refs.length || (f.pictures ?? 0) > 0) return false;
  const q = f.question.trim();
  if (!q) return false;
  const words = q.split(/\s+/).length;
  if (words > 25) return false;
  if (NEW_LOOK.test(q)) return false;
  if (asksAboutLibrary(q) || asksAboutCalendar(q)) return false;
  return true;
}

/** Words that point back at what was just said ("that", "why", "simpler"), which a follow-up leans on. */
const POINTS_BACK =
  /^(?:why|how so|how come|and|but|so|then|ok(?:ay)?|wait|really|meaning|what about|what does (?:that|this|it|he|she)|what do (?:you|they) mean|what is that|can you|could you|tell me more|say (?:that|it)|explain|give me|for example|an example|go on|continue|simpler|shorter|in short|more)\b|\b(?:that|this|it|those|these|he|she|they|him|them|there|above|again|simpler|simply|example|you (?:said|mean|mentioned))\b/i;

/**
 * Whether a typed question, outside a conversation out loud or a chavrusa session, is a short
 * follow-up that leans on the answer before it ("Why?", "Can you say that more simply?", "What does
 * he mean by that?"), so it can go straight to that answer's sources like a turn in a conversation.
 * Stricter than `quickFollowUp`: a typed question changes the subject more often, so it must be
 * short and point back at what was said. Everything `quickFollowUp` sends to the lookup step (a new
 * book, halacha, the calendar, a picture) still goes there.
 */
export function typedFollowUp(f: FollowUpInput): boolean {
  if (!quickFollowUp(f)) return false;
  const q = f.question.trim();
  return q.split(/\s+/).length <= 14 && POINTS_BACK.test(q);
}

/** Open the sources of the conversation so far and search the question's own words, with no lookup step. */
export async function retrieveFollowUp(
  question: string,
  store: TestingStore,
  opts: { refs: string[]; anchors?: string[]; onlyPage?: string },
): Promise<Retrieved> {
  const started = Date.now();
  const words = fallbackPlan(question);
  const phrases = [...words.hebrew, ...words.english];
  const anchors = (opts.anchors ?? []).slice(0, 2);
  const [opened, searched, linked] = await Promise.all([
    store.lookup(opts.refs, LOOKUP_LIMITS.perRef, phrases),
    phrases.length && !opts.onlyPage ? store.search(phrases, 4) : Promise.resolve([] as Passage[]),
    anchors.length ? store.linked(anchors, LOOKUP_LIMITS.linked) : Promise.resolve([] as Passage[]),
  ]);
  const out = new Map<string, Passage>();
  for (const p of [...opened, ...linked, ...searched]) if (out.size < FOLLOW_UP_DOCUMENTS && !out.has(p.ref)) out.set(p.ref, p);
  const documents = opts.onlyPage ? [...out.values()].filter((p) => onThePage(p, opts.onlyPage!)) : [...out.values()];
  return {
    plan: { ...emptyPlan(), refs: opts.refs, quick: true },
    documents,
    timings: { plan: 0, library: Date.now() - started },
  };
}

/** The most texts a quick follow-up sends: enough for the conversation, small enough to answer fast. */
export const FOLLOW_UP_DOCUMENTS = 16;
