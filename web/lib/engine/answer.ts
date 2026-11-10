import Anthropic from "@anthropic-ai/sdk";
import { profileSummary, type LearnerProfile } from "../learner-profile";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { CORE_PREMISES } from "./core-premises.generated";
import { mapAnswer, answerText, verifiedCitation, type AnswerBlock, type AnswerSource } from "./citations";
import { CARD_LIMITS, createReadFilter, isText, livePassage, readableRefs, refKey, type LiveCite, type LivePassage, type LiveRead } from "./live-sources";
import { checkSafety, safetyInstruction, safetyNotice, type SafetyNotice } from "./safety";
import { getWork, loadLibrary, search, type Library, type LibraryMode, type Passage } from "../library";
import { connectionsFor } from "../library/language";
import { testingStore, type TestingStore } from "../library/testing";
import { asksAboutLibrary, quickFollowUp, retrieveFollowUp, retrieveFromTesting, typedFollowUp, type LookupFallback, type Retrieved } from "./lookup";
import { onlineContext, type OnlineFindings } from "./online";
import { libraryDetails, libraryOverview } from "../sources";
import type { QuestionPicture } from "../pictures";
import { calendarInfo, calendarNoteForLookup, calendarSettings, parshaRefsFor, yearAhead, type CalendarInfo, type YearItem } from "../calendar/calendar";
import { asksAboutCalendar, type WhenAndWhere } from "../calendar/place";
import { amudOf, chavrusaSettings, nextLineRef, type ChavrusaSession } from "../chavrusa";

// ---------------------------------------------------------------------------
// Inputs and outputs

export type LineAction = "explain" | "words" | "commentaries" | "halacha" | "check" | "word";
export const LINE_ACTIONS: readonly LineAction[] = ["explain", "words", "commentaries", "halacha", "check", "word"];

export interface Turn {
  role: "user" | "assistant";
  text: string;
  /** Pictures the person sent with this earlier question, sent again so RabbAI can still see them. */
  pictures?: QuestionPicture[];
}

export interface AskInput {
  question: string;
  history?: Turn[];
  /** The line the person is asking about, from the reader. */
  focusRef?: string;
  action?: LineAction;
  /** For the "word" action: the word the person tapped, as written. */
  word?: string;
  /** "Growing closer to HaShem" help. Off unless the person turned it on. */
  growth?: boolean;
  /** The person asked to go deeper: think harder and allow a fuller answer. */
  deep?: boolean;
  /** What the person told RabbAI about themselves and what they have been learning (checked). */
  profile?: LearnerProfile;
  /** Pictures the person attached to the question (lib/pictures.ts), already checked. */
  pictures?: QuestionPicture[];
  /**
   * The person's time zone, and their place if they set one (or the approximate place of their
   * connection), for the calendar and the day's times (lib/calendar). Never kept.
   */
  when?: WhenAndWhere;
  /** This chat is a chavrusa session: the way the person chose to learn, and what they are learning (lib/chavrusa). */
  chavrusa?: ChavrusaSession;
  /** The person is talking out loud (Talk): their words came from speech recognition, and the answer is read aloud. */
  talking?: boolean;
  /**
   * The sources of the answer just before this question (its cited texts first), so a short
   * follow-up in a conversation can go straight to them (lookup.ts, quickFollowUp).
   */
  lastRefs?: string[];
  /** In Talk, the person cut in while RabbAI was speaking: the last words they heard. */
  interrupted?: string;
}

/** A turn of a conversation: Talk, or a chavrusa session (not a line action, not "go deeper"). */
export function conversationTurn(input: Pick<AskInput, "talking" | "chavrusa" | "action" | "deep">): boolean {
  return !input.action && !input.deep && (!!input.talking || !!input.chavrusa);
}

/**
 * What RabbAI is reading, in a few words for the person waiting: the first texts by name, then how
 * many more ("Reading Berakhot 2a, Rashi on Berakhot 2a and 5 more").
 */
export function readingStatus(refs: string[], total: number): string {
  // A passage's place without its line ("Berakhot 2a:3" -> "Berakhot 2a"), each named once.
  const names = [...new Set(refs.map((r) => r.replace(/(?::\d+)+$/, "")))].slice(0, 2);
  if (!names.length) return `Reading ${total} ${total === 1 ? "source" : "sources"}`;
  const more = total - names.length;
  return `Reading ${names.join(", ")}${more > 0 ? ` and ${more} more` : ""}`;
}

/** What RabbAI is told when the person cut in while it was speaking. */
export function interruptedSetting(heard: string): string {
  return `The person cut in while your last answer was being read aloud; the last words they heard were: "${heard}". They may not have heard the rest. Answer what they say now, briefly, and don't repeat what you already said unless they ask.`;
}

/** What RabbAI is told when the person is talking out loud; "Talking out loud" in the core premises says how to answer. */
export const TALKING_SETTING =
  'The person is talking with you out loud (see "Talking out loud"): their words came from their device\'s speech recognition, and your answer will be read aloud.';

/**
 * What RabbAI is told on a conversation's turn (Talk or a chavrusa session); "Talking like a person"
 * in the core premises says how.
 */
/**
 * The same, repeated right after the question on a conversation's turn: the model reads the
 * documents and the history after the settings, so a reminder next to the question is what keeps
 * a turn short. It is the app's note, not the person's words, and says so.
 */
export const CONVERSATION_TURN_NOTE =
  "(A note from the app, not from the person: this is a turn in a conversation. Answer in two or three short sentences, about forty words, unless they asked you to teach or explain something fully. Say the one point that matters most; if more is worth saying, offer it in a few words.)";

export const CONVERSATION_SETTING =
  'This is a conversation, not a question and answer (see "Talking like a person"): one short turn of two to four sentences, under about sixty words, then let them answer. If more is worth saying, offer it in a few words instead of saying it.';

/** Progress reports while an answer is being made, for a live screen. */
export interface AskHooks {
  /** A short note on what RabbAI is doing, such as "Looking in the library". */
  onStatus?: (text: string) => void;
  /** Each new piece of the answer's text as the model writes it. */
  onText?: (delta: string) => void;
  /**
   * A passage to show above the answer, once each: one the answer is quoting, or a line it reads
   * aloud (live-sources.ts). Always one of the documents sent, in the library's own words.
   */
  onPassage?: (passage: LivePassage) => void;
  /** The answer quotes a passage here: its own citation, checked (citations.ts, verifiedCitation). */
  onCite?: (cite: LiveCite) => void;
  /** The answer reads a line aloud here ([[read REF]]). */
  onRead?: (read: LiveRead) => void;
  /** Aborted when the person stops the answer. */
  signal?: AbortSignal;
}

export interface AskResult {
  status: "answered" | "refused" | "no_key" | "error";
  blocks: AnswerBlock[];
  sources: AnswerSource[];
  /** Every passage that was retrieved and offered to the model. */
  retrieved: string[];
  safety: SafetyNotice | null;
  libraryMode: LibraryMode;
  /** Citations removed by the checker. */
  droppedCitations: number;
  /** The model that wrote the answer, when known. */
  model?: string;
  /** A short message for the person when there is no answer. */
  notice?: string;
  /** In the testing library: the places the lookup step chose to open. */
  lookedUp?: string[];
  /**
   * A practical halacha question (what to do in a real situation). The app shows a note to ask
   * one's rav under the answer.
   */
  practical?: boolean;
  /** What RabbAI looked up online for this answer, when it did. */
  online?: OnlineReport;
  /**
   * A question about RabbAI's own library (which books it reads, what it leaves out). The app
   * shows a link to the full sources list under the answer.
   */
  aboutLibrary?: boolean;
  /**
   * The Torah subject of the question in a few words, named by the lookup step, so the person's
   * learning can be remembered (lib/learner-profile.ts). Empty for a question about their life.
   */
  topic?: string;
  /**
   * Why the lookup step's own plan wasn't used, when it wasn't (its reply was cut off, couldn't be
   * read, or the call failed), so the question's words were searched instead. For the live check
   * ("Is RabbAI working?"); nothing shows it to the person.
   */
  lookupFallback?: LookupFallback;
  /**
   * How long each step took, in milliseconds, for the live check ("Is RabbAI working?"); nothing
   * shows it to the person.
   */
  timings?: AnswerTimings;
  /** A follow-up answered from the conversation's sources, without the lookup step. */
  quick?: boolean;
  /**
   * The passages shown above the answer: those it quoted and the lines it read aloud, in the
   * library's own words, in the order they came (live-sources.ts). At most CARD_LIMITS.passages.
   */
  card?: LivePassage[];
}

export interface AnswerTimings {
  /** The lookup step (0 when it was skipped). */
  plan: number;
  /** Opening, following and searching in the library. */
  library: number;
  /** Looking things up online, when it ran. */
  online?: number;
  /** From the start until the answer's first words. */
  firstWords?: number;
  /** From the start until the answer was finished and checked. */
  total: number;
}

/** The pages RabbAI looked up online for an answer, shown apart from the texts. */
export interface OnlineReport {
  /** "torah": trusted Orthodox sites only. "general": the open web, for everyday facts. */
  kind: "torah" | "general";
  status: "found" | "none" | "failed";
  pages: Array<{ url: string; title: string; site: string; ref: string; used: boolean }>;
  /** The library's texts opened because a page relies on them. */
  checked: string[];
}

/** The one call the engine makes. Injected so tests never touch the network. */
export interface ModelClient {
  /**
   * `onText` receives the answer's text as it is written; `signal` cancels the call; `onCitation`
   * receives each citation as the model makes it (checked by the caller before anything is shown).
   */
  create(
    params: MessageCreateParamsNonStreaming,
    onText?: (delta: string) => void,
    options?: { signal?: AbortSignal; onCitation?: (citation: { type: string; cited_text?: string; document_index?: number }) => void },
  ): Promise<BetaMessage>;
}

export const DEFAULT_MODEL = "claude-opus-5-5";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

/**
 * Medium effort keeps everyday answers quick; a request to go deeper raises it to high.
 * RABAI_EFFORT overrides the everyday level.
 */
export interface EngineConfig {
  model: string;
  effort: Effort;
  maxTokens: number;
  talkModel?: string;
  talkEffort?: Effort;
  talkMaxTokens?: number;
  cacheTtl?: "5m" | "1h";
}

export function engineConfig(): EngineConfig {
  const effort = (process.env.RABAI_EFFORT ?? "medium") as Effort;
  const talkEffort = (process.env.RABAI_TALK_EFFORT ?? "low") as Effort;
  return {
    model: process.env.RABAI_MODEL || DEFAULT_MODEL,
    effort: EFFORTS.includes(effort) ? effort : ("medium" as Effort),
    maxTokens: 16000,
    /**
     * A conversation's turns (Talk, a chavrusa session) are short and must come quickly: a faster
     * model at low effort, with room for a short turn and its thinking.
     */
    talkModel: process.env.RABAI_TALK_MODEL || "claude-sonnet-5-5",
    talkEffort: EFFORTS.includes(talkEffort) ? talkEffort : ("low" as Effort),
    talkMaxTokens: 6000,
    /**
     * How long the instructions stay cached between questions. An hour, so a person who comes back
     * after a few minutes doesn't wait for them to be read again ("5m" for five minutes).
     */
    cacheTtl: (process.env.RABAI_CACHE_TTL === "5m" ? "5m" : "1h") as "5m" | "1h",
  };
}

/** The model, effort and room for this question. */
export function modelFor(input: Pick<AskInput, "talking" | "chavrusa" | "action" | "deep">, config: EngineConfig = engineConfig()) {
  if (conversationTurn(input)) {
    return { model: config.talkModel ?? config.model, effort: config.talkEffort ?? config.effort, maxTokens: config.talkMaxTokens ?? config.maxTokens };
  }
  return { model: config.model, effort: effortFor(input, config.effort), maxTokens: config.maxTokens };
}

/** The effort for this question: at least "high" when the person asked to go deeper. */
export function effortFor(input: Pick<AskInput, "deep">, everyday: Effort): Effort {
  if (!input.deep) return everyday;
  return EFFORTS.indexOf(everyday) >= EFFORTS.indexOf("high") ? everyday : "high";
}

/** The real client: streams, so long answers do not time out and the text can be shown live. */
export function anthropicClient(apiKey = process.env.ANTHROPIC_API_KEY): ModelClient | null {
  if (!apiKey) return null;
  const client = new Anthropic({ apiKey });
  return {
    create: (params, onText, options) => {
      const stream = client.beta.messages.stream(params, options?.signal ? { signal: options.signal } : undefined);
      if (onText) stream.on("text", (delta) => onText(delta));
      if (options?.onCitation) {
        const onCitation = options.onCitation;
        stream.on("citation", (c) => onCitation(c as { type: string; cited_text?: string; document_index?: number }));
      }
      return stream.finalMessage();
    },
  };
}

// ---------------------------------------------------------------------------
// The app's instructions, added after the core premises

export const APP_INSTRUCTIONS = `## How this app works

You are answering inside the RabbAI app. The person sees your answer in a conversation, and
every source you cite becomes a button that opens the text itself in a reader beside it. While you
write (or speak), the passage you are citing shows above your answer with the words you quote
marked, so cite the exact words you are talking about, at the moment you talk about them.

Sources:
- The passages retrieved for this question are attached to the person's message as documents.
  Each document's title is its reference, for example "Rashi on Bereishit 1:1".
- Cite a document whenever you rely on it, precisely. The app turns each citation into a
  button, which is how the person sees that every point rests on a real source. Rely on the few
  documents that matter most; you do not need to use them all.
- For a question about Torah, halacha or Jewish belief, these documents are the only library
  you have. If they do not cover the question, say so plainly and kindly, answer only what you
  can stand behind, and suggest asking a rav or a teacher.
- In everyday conversation (a hard day, a practical question, schoolwork, small talk) you do
  not need documents. Answer from general knowledge and the Torah's values in your
  instructions. If documents came with the message, use the ones that truly help.
- Either way, do not name or quote a source you were not given, and never quote a translation
  that is not in a document.
- Some documents are marked as development texts. Quote and cite them normally; the app labels
  them for the person.
- Documents from the private testing library are published Orthodox editions that the rabbinic
  board has not yet approved. Quote and cite them normally; the app labels them for the person.
  When a document has no English (much of the Yerushalmi, for example), translate the words
  you use yourself and say that the translation is yours. Follow the commentaries you were
  given, and use the dictionary entries you were given for hard words, citing them.
- Dictionary entries (Jastrow, the Radak's Sefer HaShorashim, the Aruch) explain words. Jastrow
  was not written by an Orthodox author: use it only for what a word means, never for history
  or belief, and where the Aruch, Rashi, the Targum or the Radak explain a word differently,
  follow them.
- Documents titled "Found online: ..." are pages RabbAI looked up for this question: from a
  trusted Orthodox website on RabbAI's list or, for an everyday fact, from the open web. Each holds
  only the page's own words. They are not sources. Follow "Looking things up" in your
  instructions: rest your answer on the texts, check each page's points against them, and say
  plainly what you couldn't confirm. Cite a page where you use its words; the app lists the pages
  under their own heading, with links, apart from the texts.

Pictures:
- The person may attach pictures to a question: a page of a sefer, a sign, a label, a letter,
  a handwritten note. They come at the end of the person's message, after the documents,
  introduced as the picture or pictures the person sent. Pictures from earlier in the chat may
  come again with a follow-up question.
- Follow "Pictures the person sends" in your instructions. A picture is never a source and never
  becomes a citation: cite only the documents. When the documents hold the text shown in a
  picture, rest your answer on the documents and cite them.

Shape of an answer:
- Write so that anyone can follow: someone new to learning, a teenager, or someone reading in
  their second language. Everyday words, short sentences, one idea at a time.
- Start with the answer itself, warmly, in one or two sentences. Then, only if it helps, a
  short explanation resting on one or two sources. Stop when the question is answered. Don't
  restate the question, and don't end with a summary.
- Usually 30 to 120 words. A sentence or two for small talk. In a conversation (Talk or a
  chavrusa session; the settings say so), usually two to four sentences. Go longer only when the
  settings say the person asked to go deeper, or when they ask for something that needs the
  length, such as being taught a topic, a letter or a study plan.
- Do not end every answer with an offer. The app shows "Tell me more" and the sources under
  each answer; add one short closing line only when it truly helps.
- In everyday conversation, answer the way a caring friend who learns Torah would: natural and
  helpful, with a short Torah thought only when it truly helps.
- Write in short paragraphs of plain prose. Do not use Markdown: no headings, bold, tables,
  or bullet symbols.
- Use few Hebrew words. When you use one, transliterate it and translate it in a few plain
  words.
- Your answers may be read aloud, so write sentences that sound natural when spoken.

When the person asks about a specific line in the reader, the message says which line and what
they want: an explanation, a word-by-word translation, what the commentaries say, or where the
line is used in halacha. Keep that line at the center of your answer.

Learning to read:
- When the person asks about a single word, the app attaches every passage in the library where
  that word's root appears (or the word itself, if the root is not known), and the settings
  name them. Explain the word in its own line first: its parts and its root. Then show how the
  root connects the passages you were given, citing each one. These are the only connections
  you may name.
- When the person offers their own translation of a line, follow "Let them try first": begin
  with what they got right, then correct one or two things, gently, with the reason. Ask
  whether they would like to try again or see the whole line.

Reading a line together:
- To read a line of a text with the person, write [[read REF]] on a line of its own, where REF is
  the exact title of one of the documents (a line of the Gemara, a Mishnah, a verse, a Rashi).
  The app shows that line in Hebrew and English, marked, and reads it aloud from the library.
  Never copy the line out yourself: the marker brings the library's own words.
- Then talk about that line the way a chavrusa does: what it says in plain words, the one thing
  worth noticing, and, when it fits, a question for them. Follow "Reading the text together" in
  your instructions.
- Read one line, or one step of the argument, at a time. Use the marker when you are learning a
  text together (a chavrusa session, or when they ask to learn, read or go through a passage),
  not for every source you mention. Never put it inside a sentence.`;

const ACTION_PROMPTS: Record<Exclude<LineAction, "check" | "word">, (ref: string) => string> = {
  explain: (ref) => `Please explain ${ref} to me.`,
  words: (ref) =>
    `Please go through ${ref} word by word. For each word or short phrase, give the Hebrew or Aramaic, a translation, and a short note where it helps. Put each word on its own line in the form: word — meaning — note.`,
  commentaries: (ref) => `What do the commentaries say about ${ref}?`,
  halacha: (ref) =>
    `Where is ${ref} used in halacha? If the sources I have here do not say, tell me honestly and tell me what I could ask my rav.`,
};

// ---------------------------------------------------------------------------
// Limits

export const LIMITS = {
  questionChars: 2000,
  wordChars: 40,
  historyTurns: 12,
  historyChars: 6000,
  passages: 10,
  /** Sources of the answer before, sent back for a quick follow-up. */
  lastRefs: 12,
  /** The words heard before the person cut in. */
  interruptedChars: 400,
};

// ---------------------------------------------------------------------------
// The engine

export function documentText(passage: Passage): string {
  return [passage.he, passage.en].filter((t) => t.trim()).join("\n\n");
}

export function testingContext(passage: Passage): string {
  const s = passage.source!;
  if (s.article) return articleContext(s);
  // A debated work whose main claims Orthodox authorities rejected (caution kind rejected_views).
  const rejected = s.standing === "debated" && Boolean(s.caution) && (s.cautionKinds ?? []).includes("rejected_views");
  const parts = [
    `Work: ${s.workTitle} (${s.book}).`,
    / on /.test(s.book) ? "This is a commentary." : "",
    "From the private testing library: a published Orthodox edition, not yet approved by the rabbinic board.",
    s.heEdition ? `Original text: ${s.heEdition}.` : "",
    s.enEdition ? `English: ${s.enEdition}.` : "There is no English translation of this passage in the library.",
    s.heEdition && s.enEdition ? "The first part is the original text; the second is the English translation." : "",
    s.dictionary ? "This is a dictionary entry." : "",
    s.wordToolOnly
      ? "Its author was not Orthodox: use it only for what words mean, never for history or belief."
      : "",
    s.category === "kabbalah" && !rejected
      ? "This is a work of Kabbalah: present it as what the kabbalists teach."
      : "",
    rejected
      ? `Caution, a rejected source: ${s.caution} Orthodox authorities rejected its main claims. When you use it, say so plainly: give its claims only as this author's claims, never in your own voice or as what the Torah teaches, and explain the answer Orthodox authorities gave, citing the documents you were given. If they don't contain that answer, say so instead of supplying one.`
      : s.standing === "debated" && s.caution
        ? `Caution, a debated source: ${s.caution} Tell the person this caution when you use it, and never rest a halachic answer on it alone.`
        : "",
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * An article from a website collection (Aish.com and the like): a teacher's explanation for
 * today's readers, copied by the site's written permission for private study. It explains and
 * points to the texts; it doesn't replace them.
 */
export function articleContext(s: NonNullable<Passage["source"]>): string {
  const a = s.article!;
  const name = s.book.startsWith(`${a.site}, `) ? s.book.slice(a.site.length + 2) : s.book;
  const year = /^\d{4}/.test(a.published ?? "") ? a.published!.slice(0, 4) : "";
  const parts = [
    `Article: "${name}" on ${a.site}${a.author ? `, by ${a.author}` : ""}${year ? ` (${year})` : ""}.`,
    `From the private testing library: an article from ${a.site}'s website, used by the site's written permission for private study, not yet reviewed by the rabbinic board.`,
    "It is a teacher's explanation for today's readers from a trusted site, not a source: it never proves a point. Use it to explain and to find where things are discussed. Check its point against the texts you were given: if one says the same, say so and cite that text; if none does, say you couldn't confirm it from the texts. Say who wrote it when you use it, and never present its opinion as settled halacha.",
    s.standing === "debated" && s.caution
      ? `Caution: ${s.caution} Tell the person this caution when you use it.`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function documentContext(passage: Passage, lib: Library): string {
  if (passage.online) return onlineContext(passage.online);
  if (passage.source?.library === "testing") return testingContext(passage);
  const work = getWork(lib, passage.work);
  const parts = [
    `Work: ${work?.title ?? passage.work}${work?.author ? ` (${work.author})` : ""}.`,
    passage.on ? `This is a commentary on ${passage.on}.` : "",
    `The first part is the original text; the second is an English translation.`,
    work ? `Edition: ${work.edition}` : "",
    work?.translation.status === "development"
      ? "The English is a development placeholder by the RabbAI team, not an approved translation."
      : work?.translation.status === "rabai"
        ? "The English is RabbAI's own translation."
        : work
          ? `Translation: ${work.translation.by}.`
          : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function buildQuestion(input: AskInput): string {
  const q = input.question.trim();
  if (input.action === "check" && input.focusRef) {
    return `Here is my own translation of ${input.focusRef}:\n\n"${q}"\n\nCould you check it for me?`;
  }
  if (input.action === "word" && input.focusRef && input.word) {
    const ask = `What does the word ${input.word} mean in ${input.focusRef}? Show me how it is built, and where else its root comes up in the texts.`;
    return q ? `${ask}\n\n${q}` : ask;
  }
  if (input.action && input.action !== "check" && input.action !== "word" && input.focusRef) {
    const ask = ACTION_PROMPTS[input.action](input.focusRef);
    return q ? `${ask}\n\n${q}` : ask;
  }
  if (input.focusRef && q) return `About ${input.focusRef}: ${q}`;
  return q;
}

function wordStudyNote(
  word: string,
  focusRef: string | undefined,
  rootText: string,
  related: Passage[],
  documents: Passage[],
): string {
  const sent = new Set(documents.map((d) => d.ref));
  const refs = related.map((p) => p.ref).filter((r) => sent.has(r) && r !== focusRef);
  const where = focusRef ? ` in ${focusRef}` : "";
  return refs.length
    ? `Word study: the person asked about ${word}${where}. Elsewhere in the library, ${rootText} appears in: ${refs.join("; ")}. Those passages are attached.`
    : `Word study: the person asked about ${word}${where}. The library has no other passage with ${rootText}; do not name other places it appears.`;
}

export interface RequestPlan {
  params: MessageCreateParamsNonStreaming;
  documents: Passage[];
  documentTexts: string[];
}

/** What the lookup step learned about the question, beyond its passages. */
export interface LookupNotes {
  /** A practical halacha question. */
  practical?: boolean;
  /** What the online lookup found, when one ran. */
  online?: OnlineFindings;
  /** The library's texts opened because a page found online relies on them. */
  checked?: string[];
  /** The person asks about RabbAI's own library: RabbAI is given the sources list (lib/sources). */
  library?: boolean;
  /**
   * The calendar for the person: always the date, the parsha and the coming days; the day's times
   * and the year ahead too when the question depends on them.
   */
  calendar?: { info: CalendarInfo; times: boolean; year?: YearItem[] };
}

/** The settings lines for a practical question and an online lookup. */
export function lookupSettings(notes: LookupNotes): string[] {
  const lines: string[] = [];
  if (notes.practical) {
    lines.push(
      "This is a practical halacha question (halacha l'maaseh). Follow \"Practical halacha\": explain the mainstream positions and what the answer depends on, and give no final ruling for the person's own situation. End with one short, warm sentence telling them to ask their rav, and what to tell the rav. The app also shows a note to ask a rav under your answer.",
    );
  }
  const o = notes.online;
  if (!o) return lines;
  const where = o.kind === "torah" ? "trusted Orthodox websites" : "the web";
  if (o.status === "failed") {
    lines.push(
      `RabbAI tried to look this up on ${where}, but the search didn't work just now. If the texts you were given don't cover the question, say that you couldn't check online right now.`,
    );
  } else if (o.status === "none") {
    lines.push(`RabbAI looked this up on ${where} and found nothing useful. Answer from the texts you were given, or say that you don't have a source.`);
  } else if (o.kind === "torah") {
    const checked = notes.checked ?? [];
    lines.push(
      `Looked up online: ${o.pages.length} ${o.pages.length === 1 ? "page" : "pages"} from trusted Orthodox websites, attached as documents titled "Found online". ` +
        (checked.length
          ? `The texts they rely on were opened in the library and are attached: ${checked.join("; ")}. Check each page's points against these texts.`
          : "None of the texts they rely on could be opened in the library, so say which points you couldn't confirm from the texts."),
    );
  } else {
    lines.push(
      `Looked up on the web: ${o.pages.length} ${o.pages.length === 1 ? "page" : "pages"}, attached as documents titled "Found online", for everyday facts only.`,
    );
  }
  return lines;
}

/** What to search with: the question and the last thing the person said before it, so a
 * follow-up like "and what does the Ramban say?" still finds the right text. */
export function searchQuery(input: AskInput): string {
  const history = (input.history ?? []).slice(-LIMITS.historyTurns);
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.text ?? "";
  return `${buildQuestion(input)}\n${lastUser}`.trim();
}

/** The person's pictures, introduced so RabbAI knows they are the person's and not documents. */
export function picturesContent(pictures: QuestionPicture[]) {
  const image = (p: QuestionPicture) => ({ type: "image" as const, source: { type: "base64" as const, media_type: p.mediaType, data: p.data } });
  if (pictures.length === 1) return [{ type: "text" as const, text: "The picture the person sent:" }, image(pictures[0])];
  // Each picture labeled, so RabbAI can say which one it means ("in your second picture").
  return [
    { type: "text" as const, text: `The pictures the person sent (${pictures.length}):` },
    ...pictures.flatMap((p, i) => [{ type: "text" as const, text: `Picture ${i + 1}:` }, image(p)]),
  ];
}

/**
 * @param retrieved Passages already found in the testing library. Without them, the in-memory
 *   library is searched.
 */
export function planRequest(
  input: AskInput,
  lib: Library,
  config: EngineConfig = engineConfig(),
  retrieved?: Passage[],
  notes: LookupNotes = {},
): RequestPlan {
  const question = buildQuestion(input);
  const history = (input.history ?? []).slice(-LIMITS.historyTurns);
  const lastUser = [...history].reverse().find((t) => t.role === "user")?.text ?? "";
  const query = searchQuery(input);
  // For a word question, every place its root appears in the library comes along, so RabbAI can
  // show real connections and cite them.
  const connections = !retrieved && input.action === "word" && input.word ? connectionsFor(lib, input.word) : null;
  const related = connections?.passages ?? [];
  const documents =
    retrieved ??
    search(lib, query, {
      focusRef: input.focusRef,
      includeRefs: related.map((p) => p.ref),
      limit: LIMITS.passages,
    });
  const documentTexts = documents.map(documentText);

  const safety = checkSafety(`${input.question}\n${lastUser}`);
  const settings = [
    `Growth help: ${input.growth ? "on" : "off"}.`,
    input.deep
      ? "Depth: the person asked to go deeper. A fuller answer is welcome, up to about 350 words, still in plain words."
      : "",
    lib.mode === "development"
      ? "Library: development. The texts are the team's working copies, for building and testing."
      : lib.mode === "testing"
        ? "Library: the private testing library. Published Orthodox editions, not yet approved by the rabbinic board."
        : "Library: approved editions.",
    documents.length === 0 && !notes.library
      ? "No passages were found in the library for this question. For a Torah question, say so; for everyday conversation, answer without them and do not mention it."
      : "",
    notes.library
      ? "This question is about RabbAI's own library: answer it from \"RabbAI's own library\" above, unless the person is really asking something else."
      : "",
    notes.library ? libraryDetails(lib.mode, query) : "",
    connections && input.word ? wordStudyNote(input.word, input.focusRef, connections.label, related, documents) : "",
    retrieved && input.action === "word" && input.word
      ? `Word study: the person asked about ${input.word}${input.focusRef ? ` in ${input.focusRef}` : ""}. Other passages that contain this exact word were searched for and are attached if found; the library has no root index yet, so do not claim other places its root appears.`
      : "",
    ...lookupSettings(notes),
    notes.calendar ? calendarSettings(notes.calendar.info, { times: notes.calendar.times, year: notes.calendar.year }) : "",
    input.chavrusa ? chavrusaSettings(input.chavrusa) : "",
    input.talking ? TALKING_SETTING : "",
    input.talking && input.interrupted ? interruptedSetting(input.interrupted) : "",
    conversationTurn(input) ? CONVERSATION_SETTING : "",
    safety.concern ? safetyInstruction(safety.concern) : "",
    input.profile ? profileSummary(input.profile) : "",
  ]
    .filter(Boolean)
    .join("\n");

  type Content = Exclude<MessageCreateParamsNonStreaming["messages"][number]["content"], string>;
  const messages: Array<{ role: "user" | "assistant"; content: Content }> = [];
  for (const turn of history) {
    const text = turn.text.slice(0, LIMITS.historyChars).trim();
    const pictures = turn.role === "user" ? (turn.pictures ?? []) : [];
    if (!text && !pictures.length) continue;
    const content: Content = [
      ...(pictures.length ? picturesContent(pictures) : []),
      ...(text ? [{ type: "text" as const, text }] : []),
    ];
    const prev = messages[messages.length - 1];
    // The API needs alternating roles; join any repeats.
    if (prev && prev.role === turn.role) prev.content.push(...content);
    else messages.push({ role: turn.role, content });
  }
  if (messages[0]?.role === "assistant") messages.shift();
  if (messages[messages.length - 1]?.role === "user") messages.pop();

  const pictures = input.pictures ?? [];
  messages.push({
    role: "user",
    content: [
      ...documents.map((p, i) => ({
        type: "document" as const,
        source: { type: "text" as const, media_type: "text/plain" as const, data: documentTexts[i] },
        title: p.ref,
        context: documentContext(p, lib),
        citations: { enabled: true },
      })),
      // The person's pictures come after the documents, so a citation's document number still
      // points at the same document (citations.ts).
      ...(pictures.length ? picturesContent(pictures) : []),
      { type: "text" as const, text: question },
      ...(conversationTurn(input) ? [{ type: "text" as const, text: CONVERSATION_TURN_NOTE }] : []),
    ],
  });

  const chosen = modelFor(input, config);
  const params: MessageCreateParamsNonStreaming = {
    model: chosen.model,
    max_tokens: chosen.maxTokens,
    thinking: { type: "adaptive" },
    output_config: { effort: chosen.effort },
    // If the model declines, the API re-runs the request on Anthropic's recommended fallback.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: CORE_PREMISES },
      { type: "text", text: APP_INSTRUCTIONS, cache_control: { type: "ephemeral", ttl: config.cacheTtl ?? "1h" } },
      // The sources list, when the person asks about RabbAI's library: the same for every such
      // question, so it is cached too.
      ...(notes.library ? [{ type: "text" as const, text: libraryOverview(lib.mode), cache_control: { type: "ephemeral" as const, ttl: config.cacheTtl ?? "1h" } }] : []),
      { type: "text", text: settings },
    ],
    messages,
  };

  return { params, documents, documentTexts };
}

export async function ask(
  input: AskInput,
  client: ModelClient | null,
  lib = loadLibrary(),
  store: TestingStore | null = lib.mode === "testing" ? testingStore() : null,
  hooks: AskHooks = {},
): Promise<AskResult> {
  const safety = checkSafety(`${input.question}\n${(input.history ?? []).filter((t) => t.role === "user").slice(-1)[0]?.text ?? ""}`);
  const notice = safety.concern ? safetyNotice(safety.concern) : null;
  const started = Date.now();
  let firstWords: number | undefined;
  let stepTimes: Retrieved["timings"];
  let quick = false;

  let retrieved: Passage[] | undefined;
  let lookedUp: string[] | undefined;
  let notes: LookupNotes = {};
  let topic = "";
  let lookupFallback: LookupFallback | undefined;
  // Today, for the person: the date, the parsha, the coming days and, at their place, the times.
  let calendar: CalendarInfo | null = null;
  try {
    calendar = calendarInfo({ tz: input.when?.tz, place: input.when?.place, prefs: input.when?.prefs });
  } catch (err) {
    console.warn("[rabai] working out the calendar failed:", err instanceof Error ? err.message : err);
  }
  if (lib.mode === "testing") {
    if (!store) {
      return {
        status: "error",
        blocks: [],
        sources: [],
        retrieved: [],
        safety: notice,
        libraryMode: lib.mode,
        droppedCitations: 0,
        notice: "RabbAI can't reach its library right now. Please try again in a moment.",
      };
    }
    hooks.onStatus?.("Looking in the library");
    try {
      // In a chavrusa session, the line reached and the next one open first; "Just the page" keeps
      // to the page's Gemara, Rashi and Tosafot.
      const session = input.chavrusa;
      const page = session?.style === "page" ? amudOf(session.text) : null;
      const sessionNote = session?.text
        ? `The person is learning ${session.text} with RabbAI as a chavrusa${session.at ? `; the last line reached is ${session.at}` : ""}.`
        : "";
      const preface = [calendar ? calendarNoteForLookup(calendar) : "", sessionNote].filter(Boolean).join("\n");
      // Also open: in a session, the next line; for "this week's parsha", its opening verse, so its
      // meforshim open even if the lookup step misses (lib/calendar, parshaRefsFor).
      const alsoRefs = [
        ...(session?.at ? [nextLineRef(session.at)] : []),
        ...(page || input.action ? [] : parshaRefsFor(input.question, calendar)),
      ].filter((r): r is string => !!r);
      // A short follow-up in a conversation goes straight to the sources it is about: the line the
      // session is on and the next, and the answer just before (lookup.ts, quickFollowUp).
      const sessionRefs = session?.at ? [session.at, nextLineRef(session.at)].filter((r): r is string => !!r) : [];
      const followRefs = [...new Set([...(input.focusRef ? [input.focusRef] : []), ...sessionRefs, ...(input.lastRefs ?? [])])].slice(0, 14);
      const follow = { question: input.question, conversation: true, refs: followRefs, pictures: input.pictures?.length };
      quick =
        (input.history ?? []).some((t) => t.role === "assistant") &&
        // A turn in a conversation, or a short typed follow-up that leans on the answer before it.
        (conversationTurn(input) ? quickFollowUp(follow) : !input.action && !input.deep && typedFollowUp(follow));
      let found: Retrieved;
      if (quick) {
        hooks.onStatus?.("Looking at what we were learning");
        found = await retrieveFollowUp(searchQuery(input), store, { refs: followRefs, anchors: sessionRefs, ...(page ? { onlyPage: page } : {}) });
      } else {
        found = await retrieveFromTesting(searchQuery(input), store, client, {
          focusRef: input.focusRef ?? session?.at ?? session?.text,
          ...(alsoRefs.length ? { alsoRefs } : {}),
          ...(page ? { onlyPage: page } : {}),
          pictures: input.pictures,
          extraPhrases: input.action === "word" && input.word ? [input.word] : [],
          // A line action on the reader is about that line; it never needs the web.
          research: input.action ? null : client,
          onStatus: hooks.onStatus,
          ...(preface ? { preface } : {}),
        });
      }
      stepTimes = found.timings;
      topic = found.plan.topic;
      lookupFallback = found.plan.fallback;
      retrieved = found.documents;
      lookedUp = found.plan.refs;
      notes = {
        practical: found.plan.practical,
        online: found.online,
        checked: found.checked,
        library: found.plan.library,
        ...(calendar ? { calendar: calendarNotes(calendar, input, found.plan.calendar) } : {}),
      };
    } catch (err) {
      console.error("[rabai] library lookup failed:", err instanceof Error ? err.message : err);
      return {
        status: "error",
        blocks: [],
        sources: [],
        retrieved: [],
        safety: notice,
        libraryMode: lib.mode,
        droppedCitations: 0,
        notice: "RabbAI couldn't search its library just now. Please try again in a moment.",
      };
    }
  }

  // Without the lookup step (the development and approved libraries), a plainly worded question
  // about RabbAI's own library still gets the sources list. A line action is about its line.
  if (lib.mode !== "testing" && !input.action && asksAboutLibrary(buildQuestion(input))) notes.library = true;
  if (lib.mode !== "testing" && calendar) notes.calendar = calendarNotes(calendar, input, false);

  const plan = planRequest(input, lib, engineConfig(), retrieved, notes);
  const base = {
    blocks: [] as AnswerBlock[],
    sources: [] as AnswerSource[],
    // Pages found online open on their own sites, not in the reader.
    retrieved: plan.documents.filter((p) => !p.online).map((p) => p.ref),
    safety: notice,
    libraryMode: lib.mode,
    droppedCitations: 0,
    ...(lookedUp ? { lookedUp } : {}),
    ...(notes.practical ? { practical: true } : {}),
    ...(notes.online ? { online: onlineReport(notes, plan.documents, []) } : {}),
    ...(notes.library ? { aboutLibrary: true } : {}),
    // A question flagged for safety is never remembered as a topic.
    ...(topic && !notice ? { topic } : {}),
    ...(lookupFallback ? { lookupFallback } : {}),
    ...(quick ? { quick: true } : {}),
  };
  const timings = (): AnswerTimings => ({
    plan: stepTimes?.plan ?? 0,
    library: stepTimes?.library ?? 0,
    ...(stepTimes?.online !== undefined ? { online: stepTimes.online } : {}),
    ...(firstWords !== undefined ? { firstWords } : {}),
    total: Date.now() - started,
  });
  // The passages put on screen while the answer is written: each once, and only documents sent.
  const shown = new Set<string>();
  const show = (p: Passage) => {
    if (shown.has(p.ref)) return;
    shown.add(p.ref);
    hooks.onPassage?.(livePassage(p));
  };
  const byRef = new Map(plan.documents.map((p) => [p.ref, p]));
  const readable = readableRefs(plan.documents);
  // In a session, the line the person is on is on screen from the start.
  const sessionLine = input.chavrusa?.at ? byRef.get(input.chavrusa.at) : undefined;
  if (sessionLine && isText(sessionLine) && !input.action) show(sessionLine);
  const reads = createReadFilter({
    canRead: (ref) => readable.get(refKey(ref)) ?? null,
    onText: (delta) => {
      if (firstWords === undefined) firstWords = Date.now() - started;
      hooks.onText?.(delta);
    },
    onRead: (ref, at) => {
      const p = byRef.get(ref);
      if (p) show(p);
      hooks.onRead?.({ ref, at });
    },
  });
  const onText = (delta: string) => reads.push(delta);
  const onCitation = (c: { type: string; cited_text?: string; document_index?: number }) => {
    const checked = verifiedCitation(c, plan.documents, plan.documentTexts);
    if (!checked || !isText(checked.passage)) return;
    show(checked.passage);
    hooks.onCite?.({ ref: checked.passage.ref, quote: checked.quote, at: reads.position() });
  };

  if (!client) {
    return {
      ...base,
      status: "no_key",
      notice:
        "RabbAI isn't connected to its model yet, so it can't answer. These are the passages it found for your question. (Add ANTHROPIC_API_KEY to the server's settings.)",
    };
  }

  const texts = plan.documents.filter((p) => !p.online).length;
  hooks.onStatus?.(
    notes.online?.status === "found" && notes.online.kind === "torah"
      ? "Checking what I found against the texts"
      : texts
        ? readingStatus(plan.documents.filter((p) => !p.online && !p.source?.article && !p.source?.dictionary).map((p) => p.ref), texts)
        : "Thinking it through",
  );
  let message: BetaMessage;
  try {
    message = await client.create(plan.params, onText, { ...(hooks.signal ? { signal: hooks.signal } : {}), onCitation });
    reads.flush();
  } catch (err) {
    console.error("[rabai] model call failed:", err instanceof Error ? err.message : err);
    return {
      ...base,
      status: "error",
      notice: "Something went wrong reaching RabbAI. Please try again in a moment.",
    };
  }

  if (message.stop_reason === "refusal") {
    return {
      ...base,
      status: "refused",
      model: message.model,
      notice:
        "I'm not able to help with that one. If something is weighing on you, please speak with your rav or someone you trust.",
    };
  }

  const mapped = mapAnswer(message.content, plan.documents, plan.documentTexts, readable);
  if (mapped.dropped > 0) {
    console.warn(`[rabai] dropped ${mapped.dropped} unverifiable citation(s)`);
  }
  if (!answerText(mapped).trim()) {
    return { ...base, status: "error", model: message.model, notice: "RabbAI didn't finish its answer. Please try asking again." };
  }
  return {
    ...base,
    status: "answered",
    blocks: mapped.blocks,
    sources: mapped.sources,
    droppedCitations: mapped.dropped,
    model: message.model,
    timings: timings(),
    ...cardFor(mapped.blocks, byRef),
    ...(notes.online ? { online: onlineReport(notes, plan.documents, mapped.sources) } : {}),
  };
}

/**
 * The calendar for RabbAI: the times and the year ahead only when the question depends on them
 * (the planner said so, or the words do), and never for a line action in the reader.
 */
export function calendarNotes(info: CalendarInfo, input: AskInput, planned: boolean): NonNullable<LookupNotes["calendar"]> {
  const times = !input.action && (planned || asksAboutCalendar(buildQuestion(input)));
  let year: YearItem[] | undefined;
  if (times) {
    try {
      year = yearAhead({ tz: input.when?.tz, place: input.when?.place });
    } catch {
      year = undefined;
    }
  }
  return { info, times, ...(year?.length ? { year } : {}) };
}

/** The pages looked up online, each marked with whether the answer used it. */
export function onlineReport(notes: LookupNotes, documents: Passage[], sources: AnswerSource[]): OnlineReport {
  const o = notes.online!;
  const cited = new Set(sources.map((s) => s.ref));
  const pages = documents
    .filter((p) => p.online)
    .map((p) => ({ url: p.online!.url, title: p.online!.title, site: p.online!.site, ref: p.ref, used: cited.has(p.ref) }));
  // The pages the answer used come first.
  pages.sort((a, b) => Number(b.used) - Number(a.used));
  return { kind: o.kind, status: o.status, pages, checked: notes.checked ?? [] };
}

/** The passages shown above a finished answer: the texts it quoted and read, in order (live-sources.ts). */
export function cardFor(blocks: AnswerBlock[], byRef: Map<string, Passage>): { card?: LivePassage[] } {
  const refs: string[] = [];
  for (const b of blocks) {
    if (b.read && !refs.includes(b.read)) refs.push(b.read);
    for (const c of b.citations) if (!c.article && !c.online && !refs.includes(c.ref)) refs.push(c.ref);
  }
  const card = refs
    .map((r) => byRef.get(r))
    .filter((p): p is Passage => !!p && isText(p))
    .slice(0, CARD_LIMITS.passages)
    .map(livePassage);
  return card.length ? { card } : {};
}
