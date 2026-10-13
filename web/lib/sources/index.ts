import type { LibraryMode } from "../library";
import { SOURCES } from "./sources.generated";
import type { SourceEdition, SourceWork, SourcesData } from "./types";
import { fold } from "./fold";

export { SOURCES, fold };
export type * from "./types";

/*
 * What RabAI reads, and what it leaves out, from the same list the rabbinic board reviews
 * (docs/sources-for-review.md, made from the canon by tools/review_list.py). RabAI is given this
 * when someone asks about its own library, and the Sources page (app/sources) shows it.
 */

/** Whether RabAI reads this edition in this mode. */
export function readsEdition(e: SourceEdition, mode: LibraryMode): boolean {
  if (mode === "approved") return e.approved;
  return e.state === "testing";
}

/** The editions of a work RabAI reads in this mode. */
export function editionsRead(w: SourceWork, mode: LibraryMode): SourceEdition[] {
  return w.editions.filter((e) => readsEdition(e, mode));
}

export interface SourceCounts {
  /** Works with at least one edition RabAI reads. */
  read: number;
  /** Works with an edition waiting for the board. */
  waiting: number;
  /** Works RabAI wants but doesn't read yet: no usable copy, or the publisher's agreement is needed. */
  notYet: number;
  cautions: number;
  leftOut: number;
}

export function sourceCounts(mode: LibraryMode, data: SourcesData = SOURCES): SourceCounts {
  let read = 0;
  let waiting = 0;
  let notYet = 0;
  let cautions = 0;
  for (const w of data.works) {
    const reads = editionsRead(w, mode).length > 0;
    if (reads) read++;
    if (w.editions.some((e) => e.state === "held")) waiting++;
    if (!reads && w.editions.some((e) => e.state === "needs_agreement" || e.state === "no_copy")) notYet++;
    if (reads && w.caution) cautions++;
  }
  return { read, waiting, notYet, cautions, leftOut: data.leftOut.length };
}

/**
 * Up to `max` characters, ending at a sentence when one ends in time. A leading "Proposed
 * 2026-10-13." (when an edition was proposed) is dropped: it says nothing about the book.
 */
export function shorten(text: string, max = 240): string {
  const t = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^Proposed \d{4}-\d{2}-\d{2}\.\s*/, "");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = cut.lastIndexOf(". ");
  return end > max / 2 ? cut.slice(0, end + 1) : `${cut.replace(/[\s,;:]+\S*$/, "")}...`;
}

/** Plain-language names of the steps between a work's editions. */
const STATE_WORDS: Record<SourceEdition["state"], string> = {
  testing: "read now (private testing library, not yet approved by the board)",
  held: "waiting for the rabbinic board's decision",
  needs_agreement: "not used: copyrighted, needs the publisher's agreement",
  no_copy: "not used: no copy RabAI may use yet",
};

function editionWords(e: SourceEdition, mode: LibraryMode): string {
  const lang = e.language === "en" ? "English" : "Hebrew/Aramaic";
  const state =
    mode === "approved"
      ? e.approved
        ? "approved by the board, read now"
        : e.state === "testing"
          ? "proposed, not yet approved by the board"
          : STATE_WORDS[e.state]
      : STATE_WORDS[e.state];
  const use = e.use === "words" ? "; only for what words mean" : e.use === "vowels" ? "; only for its vowels" : "";
  const cleaned = e.cleaned ? "; an editor's additions are removed" : "";
  const note = e.note ? ` Note: ${shorten(e.note, 240)}` : "";
  return `${e.name} [${lang}]: ${state}${use}${cleaned}.${note}`;
}

/** Words too common in book titles or names to pick a book by. */
const TITLE_STOP = new Set(
  "the on of a an and with to in his her its rabbi rav rabbeinu rabbenu sefer book commentary commentaries glosses hebrew english text translation edition ben bar ibn attributed compiled redacted".split(
    " ",
  ),
);

/** Given names, which can't pick out an author on their own ("Moshe" in "Igros Moshe"). */
const GIVEN_NAMES = new Set(
  "moshe moses yosef joseph yaakov jacob avraham abraham yitzchak isaac david shlomo solomon eliyahu elijah menachem chaim aharon aaron shmuel samuel yehuda judah meir mordechai binyamin benjamin naftali zalman shimon simeon levi yisrael israel eliezer yehoshua joshua ephraim avigdor tzvi hirsch".split(
    " ",
  ),
);

/** Topic words, which name a subject rather than a book ("halacha books"). */
const TOPIC_WORDS = new Set(
  "lacha lakha lakhah lachah lachot lakhot torah jewish judaism law laws prayer prayers kabbalah chassidus chasidut hasidut mussar musar philosophy ethics thought works writings letters essays selections guide guides introduction introductions dictionary dictionaries history practical".split(
    " ",
  ),
);

interface NameIndex {
  works: Array<{
    work: SourceWork;
    /** The whole title and the Hebrew name, folded. */
    names: string[];
    /** Each author named, folded. */
    authors: string[];
    /** The title's distinctive words. */
    keys: string[];
    /** The names within the title: "Tanya (Likkutei Amarim)" is "Tanya" and "Likkutei Amarim". */
    segments: string[][];
    /** The distinctive words of its editions' names ("Schottenstein", "Touger"). */
    editionKeys: string[];
  }>;
  /** In how many titles, and how many editions' names, each word appears. */
  titleDf: Map<string, number>;
  editionDf: Map<string, number>;
}

const indexes = new WeakMap<SourcesData, NameIndex>();

function nameIndex(data: SourcesData): NameIndex {
  let index = indexes.get(data);
  if (index) return index;
  const titleDf = new Map<string, number>();
  const editionDf = new Map<string, number>();
  const distinct = (text: string, min: number) => [...new Set(fold(text).split(" ").filter((t) => t.length >= min && !TITLE_STOP.has(t)))];
  const works = data.works.map((work) => {
    const keys = distinct(work.title, 3);
    const segments = work.title
      .split(/[():;,]/)
      .map((seg) => distinct(seg, 3))
      .filter((seg) => seg.join("").length >= 4);
    const editionKeys = [...new Set(work.editions.flatMap((e) => distinct(e.name, 6)))];
    for (const k of keys) titleDf.set(k, (titleDf.get(k) ?? 0) + 1);
    for (const k of editionKeys) editionDf.set(k, (editionDf.get(k) ?? 0) + 1);
    return {
      work,
      names: [work.title, work.hebrew ?? ""].map(fold).filter((n) => n.length >= 3),
      authors: (work.author ?? "").split(/[;(),]/).map(fold).filter((n) => n.length >= 4),
      keys,
      segments,
      editionKeys,
    };
  });
  index = { works, titleDf, editionDf };
  indexes.set(data, index);
  return index;
}

/**
 * The works a question names, best first: its whole title or Hebrew name, an author, every
 * distinctive word of its title or of a name within it, or a word only a few titles or editions
 * have ("Tanya", "Schottenstein").
 */
export function worksNamed(question: string, data: SourcesData = SOURCES, max = 6): SourceWork[] {
  const q = ` ${fold(question)} `;
  if (q.trim().length < 3) return [];
  const words = new Set(q.split(" ").filter(Boolean));
  const { works, titleDf, editionDf } = nameIndex(data);
  const scored: Array<{ w: SourceWork; score: number }> = [];
  for (const { work, names, authors, keys, segments, editionKeys } of works) {
    let score = 0;
    for (const n of names) if (q.includes(` ${n} `)) score = Math.max(score, 100 + n.length);
    for (const n of authors) {
      if (q.includes(` ${n} `)) score = Math.max(score, 50 + n.length);
      // A surname alone ("Jastrow", "Kagan"), when it is one: not a patronymic or a given name.
      const parts = n.split(" ");
      const last = parts[parts.length - 1];
      const patronymic = parts.some((t) => t === "ben" || t === "bar" || t === "bat" || t === "ibn");
      if (parts.length > 1 && !patronymic && last.length >= 5 && !GIVEN_NAMES.has(last) && words.has(last)) {
        score = Math.max(score, 20 + last.length);
      }
    }
    if (keys.length && keys.every((t) => words.has(t))) score = Math.max(score, 40 + keys.join(" ").length);
    for (const seg of segments) if (seg.every((t) => words.has(t))) score = Math.max(score, 30 + seg.join(" ").length);
    // A word only a few titles have, from the book's own name (not the description after it).
    for (const k of segments[0] ?? []) {
      if (k.length >= 4 && !TOPIC_WORDS.has(k) && (titleDf.get(k) ?? 0) <= 4 && words.has(k)) score = Math.max(score, 10 + k.length);
    }
    for (const k of editionKeys) {
      const rare = (editionDf.get(k) ?? 0) <= 3 && (titleDf.get(k) ?? 0) <= 2;
      if (rare && !TOPIC_WORDS.has(k) && words.has(k)) score = Math.max(score, 5 + k.length);
    }
    if (score) scored.push({ w: work, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.w);
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function readingOrderLines(data: SourcesData): string[] {
  return data.readingOrder.texts.map((t) => {
    const ranks = t.ranks.filter((r) => r.names.length).map((r) => `${r.label}: ${r.names.join(", ")}.`);
    return `- ${t.title}. ${[ranks[0], t.between, ...ranks.slice(1), t.after].filter(Boolean).join(" ")}`;
  });
}

const overviews = new Map<LibraryMode, string>();

/**
 * What RabAI is told when someone asks about its own library: which books it reads, what waits
 * for the board, what is left out and why, the order it opens the commentaries in, and the
 * websites it may search. The same for every question in a mode, so it can be cached; the books a
 * question names are added by libraryDetails.
 */
export function libraryOverview(mode: LibraryMode, data: SourcesData = SOURCES): string {
  if (data !== SOURCES) return buildOverview(mode, data);
  let text = overviews.get(mode);
  if (!text) overviews.set(mode, (text = buildOverview(mode, data)));
  return text;
}

function buildOverview(mode: LibraryMode, data: SourcesData): string {
  const counts = sourceCounts(mode, data);
  const lines: string[] = [];
  lines.push("## RabAI's own library (for this question)");
  lines.push(
    "The person may be asking about you and your library: which books you read, whether a book is in your library, what you leave out and why, which commentaries you open, or which websites you search. If they are, answer from this list, which is made from RabAI's canon, the same list the rabbinic board is reviewing. If they are asking something else, ignore this section.",
  );
  lines.push(
    [
      "When you describe the library:",
      "- You may name the books below. You were not given their texts here, so don't quote them or say what they teach.",
      "- Say a book is in your library only if it is listed below as one you read. If a book isn't listed at all, say it isn't in your library, and that you haven't been given it rather than that it was rejected.",
      "- Say plainly that this list is a proposal: the rabbinic board has not approved it yet.",
      "- When you say why something is left out or waits, say it respectfully and briefly: about whether a book or a translation fits an Orthodox library, never about the people who wrote it or the communities that use it.",
      "- Keep it short and plain: answer what they asked, give a few examples, and don't list every book unless they ask for a whole area. The full list, with every edition and the reasons, is on the Sources page (the gear at the top, then \"RabAI's sources\"); the app shows a link to it under your answer.",
    ].join("\n"),
  );

  if (mode === "approved") {
    lines.push(
      counts.read
        ? `What you read: only works the rabbinic board has approved, with their licenses cleared (${plural(counts.read, "work")}).`
        : "What you read: only works the rabbinic board has approved, and it hasn't approved any yet, so you have no texts of your own to quote. The works below are the ones proposed for its review.",
    );
  } else if (mode === "development") {
    lines.push(
      "What you read: this copy of RabAI is running on a few development texts typed by the team, for testing. The list below is the library RabAI is being built to read (its private testing library).",
    );
  } else {
    lines.push(
      `What you read: the private testing library, ${plural(counts.read, "work")} in published Orthodox editions, for testing before the rabbinic board approves them. It is a private preview, not open to the public.`,
    );
  }

  // Every work read, by area, as a learner's shelves are arranged.
  const read = (w: SourceWork) => (mode === "approved" && !counts.read ? w.editions.some((e) => e.state === "testing") : editionsRead(w, mode).length > 0);
  const label = mode === "approved" && !counts.read ? "Proposed for the board" : "The works you read";
  lines.push(`### ${label}, by area\n(A work marked "with English" has an English translation you can quote; the others are in Hebrew or Aramaic, which you translate yourself.)`);
  for (const area of data.areas) {
    const works = data.works.filter((w) => w.area === area.id && read(w));
    if (!works.length) continue;
    const titles = works.map((w) => {
      const eds = mode === "approved" && !counts.read ? w.editions.filter((e) => e.state === "testing") : editionsRead(w, mode);
      const notes = [
        eds.some((e) => e.language === "en" && e.use !== "words") ? "with English" : "",
        eds.length && eds.every((e) => e.use === "words") ? "for word meanings only" : "",
        w.caution ? "debated, with a caution" : "",
      ].filter(Boolean);
      return notes.length ? `${w.title} (${notes.join("; ")})` : w.title;
    });
    lines.push(`- ${area.title} (${plural(works.length, "work")}): ${titles.join("; ")}.`);
  }

  const cautioned = data.works.filter((w) => w.caution && read(w));
  if (cautioned.length) {
    lines.push("### Kept with a caution");
    lines.push(
      "These stay in the library, and you give their caution whenever you use them. Never rest a halachic answer on one alone.",
    );
    for (const w of cautioned) lines.push(`- ${w.title}: ${shorten(w.caution!, 320)}`);
  }

  const waiting = data.works.filter((w) => w.editions.some((e) => e.state === "held"));
  if (waiting.length) {
    lines.push("### Waiting for the rabbinic board's decision");
    for (const w of waiting) {
      const held = w.editions.filter((e) => e.state === "held");
      const why = held.find((e) => e.note)?.note ?? w.note ?? "";
      lines.push(`- ${w.title}: ${held.map((e) => e.name).join("; ")}.${why ? ` Why it waits: ${shorten(why, 150)}` : ""}`);
    }
  }

  const notYet = data.works.filter((w) => w.editions.some((e) => e.state === "needs_agreement" || e.state === "no_copy"));
  if (notYet.length) {
    lines.push("### Editions you don't read yet");
    lines.push(
      "Wanted, but either copyrighted (RabAI needs the publisher's agreement, and hasn't asked or heard back yet) or with no copy RabAI may use. When the work itself is listed above, you read it in another edition.",
    );
    for (const w of notYet) {
      const missing = w.editions.filter((e) => e.state === "needs_agreement" || e.state === "no_copy");
      lines.push(
        `- ${w.title}: ${missing.map((e) => `${e.name} (${e.state === "needs_agreement" ? "needs the publisher's agreement" : "no copy yet"})`).join("; ")}.`,
      );
    }
  }

  lines.push("### Left out, and why");
  lines.push(
    "Left out of the library on purpose. RabAI may still describe such a view when someone asks, labeled for what it is, but never cites it as a source. \"The board may reconsider\" means the board may bring it back.",
  );
  for (const x of data.leftOut) {
    lines.push(`- ${x.title}: ${shorten(x.reason, 170)}${x.mayReconsider ? " (The board may reconsider.)" : ""}`);
  }

  lines.push(`### How you open the commentaries (${data.readingOrder.status === "approved" ? "approved by the board" : "a proposal for the board"})`);
  lines.push(
    "For a ruling or a line, you open the commentaries printed around it in this order, the way a learner does, and each gives a line or two before the next is opened.",
  );
  lines.push(...readingOrderLines(data));

  lines.push(`### Websites you may search (${data.sites.status === "approved" ? "approved by the board" : "a proposal for the board"})`);
  lines.push(
    `For anything about Torah, halacha or belief, you search only these trusted Orthodox sites, and a page is never a source: you check it against the texts. ${data.sites.trusted.map((s) => `${s.name} (${s.domain})`).join("; ")}.`,
  );
  lines.push(
    `Never searched, even for everyday facts: ${data.sites.notForWeb.map((s) => `${s.name} (${s.reason.charAt(0).toLowerCase()}${s.reason.slice(1)})`).join("; ")}.`,
  );

  return lines.join("\n");
}

/**
 * The books a question about the library names, with every edition and its state, for the
 * question's own settings. Empty when it names none.
 */
export function libraryDetails(mode: LibraryMode, question: string, data: SourcesData = SOURCES): string {
  const named = worksNamed(question, data);
  if (!named.length) return "";
  const lines = ["Books this question names, from RabAI's own library, with each edition and whether you read it:"];
  for (const w of named) {
    const about = [w.author ? `by ${w.author}` : "", w.dates ?? "", w.region ?? ""].filter(Boolean).join(", ");
    lines.push(`- ${w.title}${w.hebrew ? ` (${w.hebrew})` : ""}${about ? `, ${about}` : ""}.`);
    for (const e of w.editions) lines.push(`  - ${editionWords(e, mode)}`);
    if (w.caution) lines.push(`  - Caution: ${w.caution}`);
  }
  return lines.join("\n");
}
