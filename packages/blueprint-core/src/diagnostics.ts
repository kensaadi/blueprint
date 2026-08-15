/**
 * Helpers for rendering enriched validation diagnostics.
 *
 * Pure (no React). The validator produces RFC-6901 JSON pointers
 * (e.g. `/root/children/2/props/level`); these helpers turn them into
 * human-readable breadcrumbs and resolve sub-trees for snippet rendering.
 *
 * Designed for the inline ValidationErrorPanel, the devtools
 * Diagnostics tab, and the future Builder error overlay.
 */

import type { BlueprintNode } from './types';

/**
 * Parse an RFC-6901 JSON pointer into segments. Reverses the escaping
 * applied by the validator (`~0` → `~`, `~1` → `/`).
 */
export function parsePointer(pointer: string): string[] {
  if (!pointer || pointer === '/') return [];
  const raw = pointer.startsWith('/') ? pointer.slice(1) : pointer;
  return raw.split('/').map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * Resolve a sub-value from the document at the given pointer.
 * Returns `undefined` if the path can't be walked (no auto-create).
 */
export function valueAtPath(doc: unknown, pointer: string): unknown {
  const segs = parsePointer(pointer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = doc;
  for (const seg of segs) {
    if (cursor == null) return undefined;
    if (Array.isArray(cursor)) {
      const idx = Number(seg);
      if (Number.isNaN(idx)) return undefined;
      cursor = cursor[idx];
    } else if (typeof cursor === 'object') {
      cursor = cursor[seg];
    } else {
      return undefined;
    }
  }
  return cursor;
}

/**
 * Walk the pointer and collect the chain of ancestor nodes (those
 * with a `type` field — atoms). For each, capture `type` + optional
 * `id` + the index when it sits inside a `children` array.
 */
export type AncestorCrumb = {
  type: string;
  nodeId?: string;
  index?: number;
  /** Cumulative pointer up to this crumb. */
  pointer: string;
};

export function nodeAncestors(doc: unknown, pointer: string): AncestorCrumb[] {
  const segs = parsePointer(pointer);
  const crumbs: AncestorCrumb[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = doc;
  let accumulated = '';
  let lastChildIndex: number | undefined;

  for (const seg of segs) {
    if (cursor == null) break;
    if (Array.isArray(cursor)) {
      const idx = Number(seg);
      if (Number.isNaN(idx)) break;
      lastChildIndex = idx;
      cursor = cursor[idx];
    } else if (typeof cursor === 'object') {
      cursor = cursor[seg];
    } else {
      break;
    }
    accumulated += '/' + seg;
    if (cursor && typeof cursor === 'object' && typeof cursor.type === 'string') {
      crumbs.push({
        type: cursor.type,
        nodeId: cursor.nodeId,
        index: lastChildIndex,
        pointer: accumulated,
      });
      lastChildIndex = undefined;
    }
  }
  return crumbs;
}

/**
 * Format an ancestor chain as a developer-friendly breadcrumb:
 *   `root > stack[0] > form#kyc > field[2]`
 *
 * Atoms with a `nodeId` show as `type#nodeId`; positional atoms show as
 * `type[index]`; the document root is always labelled `root`.
 */
export function humanizePath(doc: unknown, pointer: string): string {
  const crumbs = nodeAncestors(doc, pointer);
  if (crumbs.length === 0) return 'root';
  return crumbs
    .map((c, i) => {
      if (c.nodeId) return `${c.type}#${c.nodeId}`;
      if (i === 0) return c.type;
      return c.index !== undefined ? `${c.type}[${c.index}]` : c.type;
    })
    .join(' › ');
}

/**
 * Resolve the nearest ancestor NODE (object with a `type`) for the
 * pointer — used as the snippet root in error cards. If the pointer
 * targets a prop (`/root/.../props/X`) we return the parent NODE so
 * the snippet renders the surrounding object, not just the value.
 */
export function nearestNode(doc: unknown, pointer: string): BlueprintNode | undefined {
  const crumbs = nodeAncestors(doc, pointer);
  if (crumbs.length === 0) return undefined;
  return valueAtPath(doc, crumbs[crumbs.length - 1].pointer) as BlueprintNode;
}

/**
 * Format a node as a compact, indented JSON snippet for display. The
 * snippet truncates deep children to keep the output readable.
 */
export function formatNodeSnippet(node: unknown, maxDepth = 2): string {
  return JSON.stringify(node, (_key, value) => {
    if (value === undefined) return undefined;
    return value;
  }, 2)
    // Truncate any sub-tree past maxDepth — basic heuristic: any
    // line indented more than (maxDepth * 2 + 4) spaces gets ellided.
    .split('\n')
    .map((line) => {
      const indent = line.length - line.trimStart().length;
      if (indent > (maxDepth + 1) * 2 + 2) return null;
      return line;
    })
    .filter((l): l is string => l !== null)
    .join('\n');
}

/**
 * Extract the final segment of a pointer — typically the failing
 * property name. Useful for highlighting the offending line in
 * the snippet.
 */
export function pointerLeaf(pointer: string): string | undefined {
  const segs = parsePointer(pointer);
  return segs[segs.length - 1];
}
