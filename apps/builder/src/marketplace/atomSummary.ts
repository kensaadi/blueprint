/**
 * Atom-summary helpers for the "What's inside" panel of a template's
 * detail modal — transparency before purchase, and a reminder that every
 * template is built from the same closed 36-atom catalog (no hidden code).
 */
import type { BlueprintNode, Contract } from '../state/types';

export type AtomOutlineRow = { depth: number; type: string; label?: string };

/** First readable label for a node — label, name, or literal text child. */
function nodeLabel(node: BlueprintNode): string | undefined {
  const p = node.props as Record<string, unknown> | undefined;
  const candidate = p?.label ?? p?.name ?? p?.children;
  return typeof candidate === 'string' ? candidate : undefined;
}

/** Flat, depth-tagged outline of the tree (capped so deep trees stay compact). */
export function outlineOf(root: Contract['root'], maxRows = 40): AtomOutlineRow[] {
  const rows: AtomOutlineRow[] = [];
  const walk = (node: BlueprintNode, depth: number) => {
    if (rows.length >= maxRows) return;
    rows.push({ depth, type: node.type, label: nodeLabel(node) });
    (node.children ?? []).forEach((c) => walk(c, depth + 1));
  };
  if (root) walk(root, 0);
  return rows;
}

/** Total atom count + per-type breakdown, most frequent first. */
export function countByType(root: Contract['root']): {
  total: number;
  byType: [string, number][];
} {
  const map = new Map<string, number>();
  let total = 0;
  const walk = (node: BlueprintNode) => {
    total++;
    map.set(node.type, (map.get(node.type) ?? 0) + 1);
    (node.children ?? []).forEach(walk);
  };
  if (root) walk(root);
  return { total, byType: [...map.entries()].sort((a, b) => b[1] - a[1]) };
}
