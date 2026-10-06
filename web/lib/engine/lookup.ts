import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Passage } from "../library/types";
import { parseRef, sectionOf, type TestingStore } from "../library/testing";

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

export interface LookupPlan {
  refs: string[];
  hebrew: string[];
  english: string[];
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
  /** Full-text search results. */
  searched: 8,
  /** All documents sent to the model. */
  documents: 24,
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
A chapter or daf alone ("Berakhot 2a", "Genesis 1") opens its first lines. Prefer the central
places: the primary text first, then the code that rules on it. If you are not sure of the
exact line, give the chapter or the daf.

Also give a few short phrases (two to four words) likely to appear in the sources: Hebrew or
Aramaic without vowels, and English as the translations would put it.

Reply with JSON only, in this form:
{"refs": ["..."], "hebrew": ["..."], "english": ["..."]}
At most ${LOOKUP_LIMITS.refs} refs, ${LOOKUP_LIMITS.hebrew} Hebrew phrases and ${LOOKUP_LIMITS.english} English phrases.
For a question that needs no sources (a greeting, a question about the app), reply with empty lists.

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

/** Read the plan from the model's reply. Anything malformed becomes an empty plan. */
export function parseLookupPlan(text: string): LookupPlan {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { refs: [], hebrew: [], english: [] };
  try {
    const json = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    return {
      refs: strings(json.refs, LOOKUP_LIMITS.refs, 100),
      hebrew: strings(json.hebrew, LOOKUP_LIMITS.hebrew, 60),
      english: strings(json.english, LOOKUP_LIMITS.english, 60),
    };
  } catch {
    return { refs: [], hebrew: [], english: [] };
  }
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
  return { refs: [], hebrew, english };
}

export async function planLookups(question: string, store: TestingStore, client: LookupClient | null): Promise<LookupPlan> {
  if (!client || !question.trim()) return fallbackPlan(question);
  try {
    const catalog = await store.catalog();
    const reply = await client.create(lookupRequest(question, catalog));
    const text = reply.content.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
    const plan = parseLookupPlan(text);
    return plan.refs.length || plan.hebrew.length || plan.english.length ? plan : fallbackPlan(question);
  } catch (err) {
    console.warn("[rabai] lookup planning failed:", err instanceof Error ? err.message : err);
    return fallbackPlan(question);
  }
}

export interface Retrieved {
  plan: LookupPlan;
  documents: Passage[];
}

/** Open the planned places, follow their links, and search; the line in focus comes first. */
export async function retrieveFromTesting(
  question: string,
  store: TestingStore,
  client: LookupClient | null,
  opts: { focusRef?: string; extraPhrases?: string[] } = {},
): Promise<Retrieved> {
  const plan = await planLookups(question, store, client);
  const refs = [...(opts.focusRef ? [opts.focusRef] : []), ...plan.refs];
  const phrases = [...(opts.extraPhrases ?? []), ...plan.hebrew, ...plan.english];

  const [opened, searched] = await Promise.all([
    store.lookup(refs, LOOKUP_LIMITS.perRef),
    store.search(phrases, LOOKUP_LIMITS.searched),
  ]);
  // Follow cross-references from the places opened: the commentaries on a verse, the Mishnah
  // behind a Gemara, the Gemara behind a halacha. Every line asked for by name is followed; a
  // whole chapter or daf is followed from its first line.
  const asked = new Set(refs.map((r) => parseRef(r).start));
  const anchors: string[] = [];
  for (const p of opened) {
    if (anchors.length >= 4) break;
    if (asked.has(p.ref) || !anchors.some((a) => sectionOf(a) === p.section)) anchors.push(p.ref);
  }
  const linked = await store.linked(anchors, LOOKUP_LIMITS.linked);

  const out = new Map<string, Passage>();
  const add = (ps: Passage[]) => {
    for (const p of ps) if (out.size < LOOKUP_LIMITS.documents && !out.has(p.ref)) out.set(p.ref, p);
  };
  add(opened);
  add(linked);
  add(searched);
  return { plan, documents: [...out.values()] };
}
