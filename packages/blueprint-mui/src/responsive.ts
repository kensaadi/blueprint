import type { Responsive } from '@dashforge/blueprint-core';

/** grid cols → MUI sx gridTemplateColumns responsive object. */
export function responsiveColsToSx(
  value: Responsive<number> | undefined,
): Record<string, string> | string {
  if (value === undefined || value === null) return 'repeat(1, 1fr)';
  if (typeof value === 'number') return `repeat(${value}, 1fr)`;
  const out: Record<string, string> = {};
  if (value.base !== undefined) out.xs = `repeat(${value.base}, 1fr)`;
  if (value.sm   !== undefined) out.sm = `repeat(${value.sm}, 1fr)`;
  if (value.md   !== undefined) out.md = `repeat(${value.md}, 1fr)`;
  if (value.lg   !== undefined) out.lg = `repeat(${value.lg}, 1fr)`;
  if (value.xl   !== undefined) out.xl = `repeat(${value.xl}, 1fr)`;
  return out;
}
