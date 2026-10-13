import type { Metadata } from "next";
import Link from "next/link";
import { SourcesFind } from "@/components/SourcesFind";
import { libraryMode, type LibraryMode } from "@/lib/library";
import { SOURCES, editionsRead, shorten, sourceCounts, type SourceEdition, type SourceWork } from "@/lib/sources";

export const metadata: Metadata = { title: "RabAI's sources · RabAI" };

const REVIEW_LIST = "https://github.com/KingofHardts/RabAI/blob/main/docs/sources-for-review.md";

/** Why an edition isn't read yet, in plain words. */
const NOT_YET: Record<Exclude<SourceEdition["state"], "testing">, string> = {
  held: "waiting for the rabbinic board",
  needs_agreement: "needs the publisher's agreement",
  no_copy: "no copy RabAI may use yet",
};

function editionName(e: SourceEdition): string {
  const notes = [
    e.language === "en" && !/english|translat/i.test(e.name) ? "English" : "",
    e.use === "words" ? "only for what words mean" : "",
    e.use === "vowels" ? "only for its vowels" : "",
    e.cleaned ? "an editor's additions removed" : "",
  ].filter(Boolean);
  return notes.length ? `${e.name} (${notes.join("; ")})` : e.name;
}

/** One book: its name, who wrote it, the editions RabAI reads, and the ones it doesn't yet. */
function Work({ work, mode, proposed }: { work: SourceWork; mode: LibraryMode; proposed: boolean }) {
  const read = proposed ? work.editions.filter((e) => e.state === "testing") : editionsRead(work, mode);
  const notYet = work.editions.filter((e) => !read.includes(e) && e.state !== "testing");
  const about = [work.author, work.dates].filter(Boolean).join(", ");
  return (
    <li className="src-work" data-find="">
      <p className="src-title">
        <strong>{work.title}</strong>
        {work.hebrew && (
          <span className="he src-he" lang="he">
            {work.hebrew}
          </span>
        )}
      </p>
      {about && <p className="src-about">{about}</p>}
      {work.caution && (
        <p className="src-caution">
          <strong>With a caution.</strong> {work.caution}
        </p>
      )}
      {read.length > 0 && (
        <p className="src-eds">
          <span className="src-label">{proposed ? "Proposed:" : "Reads:"}</span> {read.map(editionName).join("; ")}
        </p>
      )}
      {notYet.length > 0 && (
        <p className="src-eds src-not-yet">
          <span className="src-label">Not yet:</span>{" "}
          {notYet.map((e) => `${editionName(e)}, ${NOT_YET[e.state as keyof typeof NOT_YET]}`).join("; ")}
        </p>
      )}
    </li>
  );
}

/** The works of one area, shelf by shelf, in the order a beit midrash arranges them. */
function Area({ title, about, works, mode, proposed }: { title: string; about: string; works: SourceWork[]; mode: LibraryMode; proposed: boolean }) {
  const shelves: Array<{ name: string; works: SourceWork[] }> = [];
  for (const w of works) {
    const last = shelves[shelves.length - 1];
    if (last && last.name === w.group) last.works.push(w);
    else shelves.push({ name: w.group, works: [w] });
  }
  return (
    <details className="src-area" data-group>
      <summary>
        <span>{title}</span>
        <span className="muted">
          {works.length} {works.length === 1 ? "work" : "works"}
        </span>
      </summary>
      <p className="muted src-area-about">{about}</p>
      {shelves.map((shelf, i) => (
        <section key={`${shelf.name}-${i}`} data-group>
          {shelf.name && shelves.length > 1 && <h3>{shelf.name}</h3>}
          <ul className="src-list">
            {shelf.works.map((w) => (
              <Work key={w.id} work={w} mode={mode} proposed={proposed} />
            ))}
          </ul>
        </section>
      ))}
    </details>
  );
}

/**
 * RabAI's sources: every book it reads, what waits for the rabbinic board, and what it leaves
 * out and why, from the same list the board reviews (docs/sources-for-review.md). The app's
 * settings link here, and so does an answer about RabAI's own library.
 */
export default function SourcesPage() {
  const mode = libraryMode();
  const counts = sourceCounts(mode);
  // A public app reads only approved works. Until the board approves some, show what is proposed.
  const proposed = mode === "approved" && counts.read === 0;
  const reads = (w: SourceWork) => (proposed ? w.editions.some((e) => e.state === "testing") : editionsRead(w, mode).length > 0);
  const works = SOURCES.works.filter(reads);
  const waiting = SOURCES.works.filter((w) => w.editions.some((e) => e.state === "held"));
  const notYet = SOURCES.works.filter((w) => !reads(w) && w.editions.some((e) => e.state === "needs_agreement" || e.state === "no_copy"));
  const cautioned = works.filter((w) => w.caution);

  return (
    <main className="privacy">
      <article className="privacy-card sources-card">
        <p className="privacy-back">
          <Link href="/">← Back to RabAI</Link>
        </p>
        <h1>RabAI&rsquo;s sources</h1>
        <p>
          Every book RabAI reads, what is waiting for the rabbinic board, and what it leaves out, and why. RabAI answers Torah
          questions only from these texts, and opens the commentaries the way a learner does.
        </p>
        <p className="muted">
          {mode === "testing"
            ? "RabAI is a private preview. It reads these published Orthodox editions for testing, before the rabbinic board approves them. This list is a proposal: the board has not approved it yet."
            : mode === "development"
              ? "This copy of RabAI runs on a few development texts typed by the team, for testing. Below is the library RabAI is being built to read, a proposal the rabbinic board has not approved yet."
              : proposed
                ? "RabAI answers only from books the rabbinic board has approved, and it hasn't approved any yet. Below are the books proposed for its review."
                : "RabAI answers only from books the rabbinic board has approved, with their licenses cleared."}
        </p>

        <ul className="sources-glance">
          <li>
            <strong>{works.length}</strong> {proposed ? "works proposed" : "works RabAI reads"}
          </li>
          {cautioned.length > 0 && (
            <li>
              <strong>{cautioned.length}</strong> kept with a caution
            </li>
          )}
          <li>
            <strong>{waiting.length}</strong> waiting for the board
          </li>
          <li>
            <strong>{notYet.length}</strong> not in the library yet
          </li>
          <li>
            <strong>{SOURCES.leftOut.length}</strong> left out, with the reasons
          </li>
        </ul>

        <SourcesFind listId="sources-list" />

        <div id="sources-list">
          <section data-group>
            <h2>{proposed ? "The books proposed, by area" : "The library, by area"}</h2>
            {SOURCES.areas.map((area) => {
              const inArea = works.filter((w) => w.area === area.id);
              return inArea.length ? (
                <Area key={area.id} title={area.title} about={area.about} works={inArea} mode={mode} proposed={proposed} />
              ) : null;
            })}
          </section>

          {cautioned.length > 0 && (
            <section data-group>
              <h2>Kept with a caution</h2>
              <p className="muted">
                These stay in the library. Whenever RabAI uses one it says the caution too, and it never rests a halachic answer
                on one of them alone.
              </p>
              <ul className="src-list">
                {cautioned.map((w) => (
                  <li key={w.id} className="src-work" data-find="">
                    <p className="src-title">
                      <strong>{w.title}</strong>
                    </p>
                    <p>{w.caution}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section data-group>
            <h2>Waiting for the rabbinic board</h2>
            <p className="muted">Editions RabAI doesn&rsquo;t read until the board decides about them.</p>
            <ul className="src-list">
              {waiting.map((w) => {
                const held = w.editions.filter((e) => e.state === "held");
                const why = held.find((e) => e.note)?.note ?? w.note;
                return (
                  <li key={w.id} className="src-work" data-find="">
                    <p className="src-title">
                      <strong>{w.title}</strong>
                    </p>
                    <p className="src-eds">{held.map(editionName).join("; ")}</p>
                    {why && <p className="src-about">{shorten(why, 320)}</p>}
                  </li>
                );
              })}
            </ul>
          </section>

          {notYet.length > 0 && (
            <section data-group>
              <h2>Not in the library yet</h2>
              <p className="muted">
                Books RabAI would like to read but can&rsquo;t yet: they are copyrighted and need the publisher&rsquo;s agreement,
                or there is no copy RabAI may use.
              </p>
              <ul className="src-list">
                {notYet.map((w) => (
                  <li key={w.id} className="src-work" data-find="">
                    <p className="src-title">
                      <strong>{w.title}</strong>
                    </p>
                    <p className="src-eds">
                      {w.editions
                        .filter((e) => e.state === "needs_agreement" || e.state === "no_copy")
                        .map((e) => `${editionName(e)}, ${NOT_YET[e.state as keyof typeof NOT_YET]}`)
                        .join("; ")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section data-group>
            <h2>Left out, and why</h2>
            <p className="muted">
              Left out on purpose, because they don&rsquo;t fit an Orthodox library: mostly translations and editions from outside
              the Orthodox world. RabAI may still describe such a view when someone asks, saying what it is, but never cites it as
              a source.
            </p>
            <ul className="src-list">
              {SOURCES.leftOut.map((x) => (
                <li key={x.id} className="src-work" data-find="">
                  <p className="src-title">
                    <strong>{x.title}</strong>
                  </p>
                  <p>{x.reason}</p>
                  {x.mayReconsider && <p className="src-about">The board may reconsider this one.</p>}
                </li>
              ))}
            </ul>
          </section>

          <section data-group>
            <h2>How RabAI opens the commentaries</h2>
            <p className="muted">
              For a ruling or a line, RabAI opens the commentaries printed around it in this order, the way a learner does, and
              each gives a line or two before the next is opened.
              {SOURCES.readingOrder.status === "approved" ? "" : " This order is a proposal for the board."}
            </p>
            <ul className="src-list">
              {SOURCES.readingOrder.texts.map((t) => (
                <li key={t.id} className="src-work" data-find="">
                  <p className="src-title">
                    <strong>{t.title}</strong>
                  </p>
                  <ol className="src-steps">
                    {t.ranks
                      .filter((r) => r.names.length)
                      .flatMap((r, i) => [
                        <li key={r.rank}>
                          <span className="src-label">{r.label}:</span> {r.names.join(", ")}
                        </li>,
                        i === 0 && t.between ? <li key={`${r.rank}-between`}>{t.between}</li> : null,
                      ])}
                    {t.after && <li>{t.after}</li>}
                  </ol>
                </li>
              ))}
            </ul>
          </section>

          <section data-group>
            <h2>Websites RabAI may search</h2>
            <p className="muted">
              For anything about Torah, halacha or belief, RabAI searches only these trusted Orthodox sites, and a page is never
              a source: RabAI checks it against the texts.
              {SOURCES.sites.status === "approved" ? "" : " This list is a proposal for the board."}
            </p>
            <ul className="src-list">
              {SOURCES.sites.trusted.map((s) => (
                <li key={s.domain} className="src-work" data-find="">
                  <p className="src-title">
                    <strong>{s.name}</strong> <span className="muted">{s.domain}</span>
                  </p>
                  <p className="src-about">{s.offers}</p>
                </li>
              ))}
            </ul>
            <h3>Never searched, even for everyday facts</h3>
            <ul className="src-list">
              {SOURCES.sites.notForWeb.map((s) => (
                <li key={s.domain} className="src-work" data-find="">
                  <p className="src-title">
                    <strong>{s.name}</strong> <span className="muted">{s.domain}</span>
                  </p>
                  <p className="src-about">{s.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="muted sources-foot">
          This page is made from RabAI&rsquo;s canon, the list of books and editions the rabbinic board reviews.{" "}
          <a href={REVIEW_LIST} target="_blank" rel="noopener noreferrer">
            The same list, as the board reads it
          </a>
          .
        </p>
      </article>
    </main>
  );
}
