/**
 * Map Blueprint's responsive cols → @dashforge/tw Grid item span props.
 *
 * Strategy: container is always `cols={12}`, each item span is `12 / N`
 * at each breakpoint. This works cleanly for cols ∈ {1, 2, 3, 4, 6, 12}
 * (divisors of 12). Other values degrade to the nearest integer span.
 */

import type { Responsive } from '@dashforge/blueprint-core';

type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'full';

export type GridItemSpans = {
  xs?: ColSpan;
  sm?: ColSpan;
  md?: ColSpan;
  lg?: ColSpan;
  xl?: ColSpan;
};

function spanFor(n: number): ColSpan {
  return Math.max(1, Math.min(12, Math.floor(12 / n))) as ColSpan;
}

export function colsToItemSpans(value: Responsive<number> | undefined): GridItemSpans {
  if (value === undefined) return { xs: 'full' };
  if (typeof value === 'number') return { xs: spanFor(value) };
  const out: GridItemSpans = {};
  if (value.base !== undefined) out.xs = spanFor(value.base);
  if (value.sm   !== undefined) out.sm = spanFor(value.sm);
  if (value.md   !== undefined) out.md = spanFor(value.md);
  if (value.lg   !== undefined) out.lg = spanFor(value.lg);
  if (value.xl   !== undefined) out.xl = spanFor(value.xl);
  return out;
}
