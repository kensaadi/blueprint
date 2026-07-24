/**
 * Map a `LayoutHint.size` → @dashforge/tw `<Grid>` item span props
 * (xs / sm / md / lg / xl). Returns `null` when the hint has no
 * `size` set, letting the caller fall back to the container's
 * `cols`-derived defaults.
 *
 * The Grid container is always instantiated with `cols={12}` in
 * `TwGrid`, so a hint of `size: 6` maps to `xs: 6` (half a row) and
 * `size: { base: 12, md: 6 }` maps to `{ xs: 12, md: 6 }`.
 */
import type { LayoutHint } from '@dashforge/blueprint-core';
import type { GridItemSpans } from './responsive';

type ColSpan = GridItemSpans['xs'];

function clamp(n: number): ColSpan {
  return Math.max(1, Math.min(12, Math.round(n))) as ColSpan;
}

export function hintToItemSpans(
  hint: LayoutHint | undefined,
): GridItemSpans | null {
  if (hint?.size === undefined) return null;
  const size = hint.size;
  if (typeof size === 'number') return { xs: clamp(size) };
  const out: GridItemSpans = {};
  if (size.base !== undefined) out.xs = clamp(size.base);
  if (size.sm !== undefined) out.sm = clamp(size.sm);
  if (size.md !== undefined) out.md = clamp(size.md);
  if (size.lg !== undefined) out.lg = clamp(size.lg);
  if (size.xl !== undefined) out.xl = clamp(size.xl);
  return out;
}
