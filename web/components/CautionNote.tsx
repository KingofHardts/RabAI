import type { PassageSource } from "@/lib/library/types";

/*
 * The caution a debated work carries (canon standing: debated): who wrote it is uncertain, it comes
 * from an unusual source, a claim in it is disputed, or some of its views were criticized. The work
 * stays in the library so people can learn about it; this note tells them to read it with care.
 */

const KIND_LABELS: Record<string, string> = {
  uncertain_author: "Author uncertain",
  unusual_source: "Unusual source",
  disputed_claims: "Disputed claims",
  criticized_views: "Views criticized",
};

/** A short label for the caution, from its first kind. */
export function cautionLabel(source: PassageSource | undefined): string | null {
  if (source?.standing !== "debated" || !source.caution) return null;
  const kind = (source.cautionKinds ?? []).find((k) => KIND_LABELS[k]);
  return kind ? KIND_LABELS[kind] : "Read with care";
}

/** At the top of the reader, when the open work is debated. */
export function CautionBanner({ source }: { source: PassageSource | undefined }) {
  const label = cautionLabel(source);
  if (!label) return null;
  return (
    <div className="caution-banner" role="note">
      <strong>Read with care: {label.toLowerCase()}.</strong> {source!.caution}{" "}
      <span className="caution-fine">Not relied on alone for halacha.</span>
    </div>
  );
}

/** Beside a commentary's name, when that commentary is debated. The full caution is in the title. */
export function CautionTag({ source }: { source: PassageSource | undefined }) {
  const label = cautionLabel(source);
  if (!label) return null;
  return (
    <span className="caution-tag" title={source!.caution}>
      {label}
    </span>
  );
}
