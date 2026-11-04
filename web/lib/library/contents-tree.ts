/*
 * A book's sections as an outline. Some books name their sections in several parts, separated by
 * commas ("Weekday, Shacharit, Preparatory Prayers, Modeh Ani" in a siddur, "Laws of Shabbat, 3"),
 * and a grid of whole names is unreadable. Here the shared parts become headings and only the last
 * part is left on each button. A book whose sections are plain ("2a", "3", "Introduction") gets
 * no outline, and keeps its grid. Safe on the device.
 */

export interface ContentsNode {
  /** This part of the name ("Shacharit"); several parts joined with " · " when a heading had only one way down. */
  name: string;
  /** The section this node opens, when it is a section itself. */
  section?: string;
  children: ContentsNode[];
}

/** The parts of a section's label. */
export function labelParts(label: string): string[] {
  return label
    .split(/,\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * The outline of a book's sections, in reading order, or null when the labels are plain and a grid
 * reads better. `labels` pairs each section with the label shown for it.
 */
export function contentsTree(labels: Array<{ label: string; section: string }>): ContentsNode[] | null {
  const split = labels.map((l) => ({ ...l, parts: labelParts(l.label) }));
  // Only when several sections share a first part is there anything to group.
  const multi = split.filter((l) => l.parts.length > 1);
  if (multi.length < 2) return null;
  const firstParts = new Map<string, number>();
  for (const l of multi) firstParts.set(l.parts[0], (firstParts.get(l.parts[0]) ?? 0) + 1);
  if (![...firstParts.values()].some((n) => n > 1)) return null;

  const root: ContentsNode = { name: "", children: [] };
  for (const { parts, section } of split) {
    let node = root;
    for (const part of parts) {
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, children: [] };
        node.children.push(child);
      }
      node = child;
    }
    if (!node.section) node.section = section;
  }
  return root.children.map(merge);
}

/** A heading with only one way down, and no section of its own, becomes one heading ("Weekday · Shacharit"). */
function merge(node: ContentsNode): ContentsNode {
  let n = node;
  while (!n.section && n.children.length === 1 && n.children[0].children.length > 0) {
    const only = n.children[0];
    n = { name: `${n.name} · ${only.name}`, section: only.section, children: only.children };
  }
  return { ...n, children: n.children.map(merge) };
}

/** Whether a node, or anything under it, is the given section. */
export function holdsSection(node: ContentsNode, section: string | undefined): boolean {
  if (!section) return false;
  return node.section === section || node.children.some((c) => holdsSection(c, section));
}

/** How many sections are under a node, itself included. */
export function sectionCount(node: ContentsNode): number {
  return (node.section ? 1 : 0) + node.children.reduce((n, c) => n + sectionCount(c), 0);
}

/** A short label that reads as a number ("12", "2a", "ב"), drawn as a small square button. */
export function isShortLabel(name: string): boolean {
  return /^(?:\d{1,4}[ab]?|[א-ת]{1,3}[׳״"']?)$/.test(name.trim());
}
