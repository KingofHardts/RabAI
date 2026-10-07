"use client";

import { OUTLINE_LABELS, type OutlineKind } from "@/lib/engine/outline-phrases";

/*
 * What the flow's colors mean, under the page's bar. Each color is also a filter: choosing one
 * shows only that kind's color on the page (the rest fade to plain), and choosing it again, or
 * "All", brings every color back. "Step through" opens the bar that goes phrase by phrase.
 */

export interface FlowLegendProps {
  /** The kinds the outline uses, in the legend's order, with how many phrases each has. */
  counts: ReadonlyArray<readonly [OutlineKind, number]>;
  only: OutlineKind | null;
  onOnly: (kind: OutlineKind | null) => void;
  stepping: boolean;
  onStep: () => void;
}

export default function FlowLegend({ counts, only, onOnly, stepping, onStep }: FlowLegendProps) {
  return (
    <div className={`daf-legend${only ? " filtering" : ""}`}>
      <div className="legend-chips" role="group" aria-label="What the colors mean. Choose one to show only its color.">
        <button type="button" className="legend-chip all" aria-pressed={!only} onClick={() => onOnly(null)}>
          All
        </button>
        {counts.map(([k, n]) => (
          <button
            key={k}
            type="button"
            className={`legend-chip k-${k}`}
            aria-pressed={only === k}
            aria-label={`${OUTLINE_LABELS[k]}, ${n} ${n === 1 ? "phrase" : "phrases"}`}
            onClick={() => onOnly(only === k ? null : k)}
          >
            {OUTLINE_LABELS[k]}
            <span className="legend-count" aria-hidden="true">
              {n}
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="rb-btn flow-step-btn" aria-pressed={stepping} onClick={onStep}>
        Step through
      </button>
      <span className="legend-note">RabAI’s outline, not yet reviewed by the rabbinic board.</span>
    </div>
  );
}
