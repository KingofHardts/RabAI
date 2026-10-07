/*
 * A summary of "Was this helpful?" feedback (docs/learner-profiles.md, phase 3), for the
 * maintainer and the board.
 *
 * Usage, from web/:
 *   PEOPLE_DATABASE_URL=libsql://… PEOPLE_AUTH_TOKEN=… npx tsx scripts/feedback-report.ts [--days 7] [--all]
 *
 * It prints how many answers were marked helpful and not, the reasons given, and each unhelpful
 * answer with its question, reasons, note, sources and the start of the answer. --all also lists
 * the helpful ones. Feedback is never linked to a person, so there is nothing about anyone here.
 *
 * Run it on your own computer, with a read-only token for the people database (Turso dashboard:
 * the "rabai-people" database, then Create Token, Read-only). Never run it in GitHub Actions:
 * this repository is public, and so are its Actions logs and summaries.
 */
import { FEEDBACK_REASON_LABELS, type FeedbackReason } from "../lib/account/feedback";
import { peopleStore } from "../lib/account/people";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  if (process.env.GITHUB_ACTIONS) {
    console.error("This report holds people's questions. Run it on your own computer, not in GitHub Actions (its logs are public).");
    process.exit(1);
  }
  const store = peopleStore();
  if (!store) {
    console.error("Set PEOPLE_DATABASE_URL (and PEOPLE_AUTH_TOKEN) to the people database first.");
    process.exit(1);
  }
  const days = Math.max(1, Math.min(365, Number(opt("days") ?? "7") || 7));
  const since = Date.now() - days * 86_400_000;
  const rows = await store.feedbackSince(since);

  const helpful = rows.filter((r) => r.helpful);
  const unhelpful = rows.filter((r) => !r.helpful);
  console.log(`"Was this helpful?" in the last ${days} day${days === 1 ? "" : "s"}`);
  console.log(`  ${rows.length} answer${rows.length === 1 ? "" : "s"} rated: ${helpful.length} helpful, ${unhelpful.length} not helpful`);
  if (rows.length) console.log(`  ${Math.round((100 * helpful.length) / rows.length)}% helpful`);

  const reasons = new Map<FeedbackReason, number>();
  for (const r of unhelpful) for (const x of r.reasons) reasons.set(x, (reasons.get(x) ?? 0) + 1);
  if (reasons.size) {
    console.log("\nReasons given");
    for (const [r, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${FEEDBACK_REASON_LABELS[r] ?? r}`);
  }

  const sources = new Map<string, number>();
  for (const r of unhelpful) for (const s of r.sources) sources.set(s, (sources.get(s) ?? 0) + 1);
  const repeated = [...sources].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  if (repeated.length) {
    console.log("\nSources cited in more than one unhelpful answer");
    for (const [s, n] of repeated.slice(0, 20)) console.log(`  ${n}  ${s}`);
  }

  const show = (title: string, list: typeof rows) => {
    if (!list.length) return;
    console.log(`\n${title}`);
    for (const r of list) {
      console.log(`\n— ${new Date(r.createdAt).toISOString().slice(0, 13).replace("T", " ")}:00 UTC`);
      if (r.question) console.log(`  Question: ${r.question.replace(/\s+/g, " ").slice(0, 300)}`);
      if (r.reasons.length) console.log(`  Reasons: ${r.reasons.map((x) => FEEDBACK_REASON_LABELS[x] ?? x).join(", ")}`);
      if (r.note) console.log(`  Note: ${r.note.replace(/\s+/g, " ")}`);
      if (r.sources.length) console.log(`  Sources: ${r.sources.join("; ")}`);
      console.log(`  Answer: ${r.answer.replace(/\s+/g, " ").slice(0, 400)}${r.answer.length > 400 ? "…" : ""}`);
    }
  };
  show("Answers marked not helpful", unhelpful);
  if (args.includes("--all")) show("Answers marked helpful", helpful);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
