/**
 * Map a `LayoutHint.size` → MUI `sx` fragment that spans the requested
 * number of CSS-grid columns, with responsive breakpoints when the
 * hint carries them.
 *
 * When a child has NO hint but the sibling did (so the grid is in
 * 12-col mode), we fall back to the container's `cols`-derived span
 * so the unhinted children keep their equal-share layout.
 */
import type {
  LayoutHint,
  Responsive,
  ResponsiveColumnSpan,
} from '@dashforge/blueprint-core';

type Sx = Record<string, unknown>;

function clamp(n: number): number {
  return Math.max(1, Math.min(12, Math.round(n)));
}

/** Turn a 1..12 span into the responsive `gridColumn` sx entry. */
function fromResponsive(value: ResponsiveColumnSpan): Sx {
  if (typeof value === 'number') {
    return { gridColumn: `span ${clamp(value)}` };
  }
  const out: Sx = {};
  const entries: Array<[string, number | undefined]> = [
    ['xs', value.base],
    ['sm', value.sm],
    ['md', value.md],
    ['lg', value.lg],
    ['xl', value.xl],
  ];
  const gridColumn: Record<string, string> = {};
  for (const [bp, span] of entries) {
    if (span !== undefined) gridColumn[bp] = `span ${clamp(span)}`;
  }
  out.gridColumn = gridColumn;
  return out;
}

/**
 * `cols` may itself be responsive — pick each breakpoint's "12 / cols"
 * default. Used for children in 12-col-mode grids that didn't declare
 * an explicit hint.
 */
function defaultSpanFromCols(cols: Responsive<number> | undefined): Sx {
  if (cols === undefined) return { gridColumn: 'span 12' };
  if (typeof cols === 'number') {
    return { gridColumn: `span ${clamp(12 / cols)}` };
  }
  const gridColumn: Record<string, string> = {};
  const entries: Array<[string, number | undefined]> = [
    ['xs', cols.base],
    ['sm', cols.sm],
    ['md', cols.md],
    ['lg', cols.lg],
    ['xl', cols.xl],
  ];
  for (const [bp, n] of entries) {
    if (n !== undefined) gridColumn[bp] = `span ${clamp(12 / n)}`;
  }
  return { gridColumn };
}

export function hintToSx(
  hint: LayoutHint | undefined,
  cols: Responsive<number> | undefined,
): Sx {
  if (hint?.size !== undefined) return fromResponsive(hint.size);
  return defaultSpanFromCols(cols);
}
