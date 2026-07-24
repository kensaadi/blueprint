/**
 * Layout hint envelope — how a node asks its parent container to
 * size / position it. Currently only `size` (Bootstrap-style 12-col
 * span) is honoured, and only by the `grid` renderer.
 *
 * The 12-col model is the lingua franca every mainstream UI library
 * speaks — MUI Grid v2 (`size`), Chakra (`colSpan`), Ant (`span`),
 * Bootstrap (`col-md-6`), Tailwind (`col-span-6` + `md:col-span-*`).
 * By expressing the intent in that shared vocabulary we can render
 * the same contract through any of them without owning a CSS DSL.
 *
 * Rendering rules for `grid`:
 *   - If NO child in the grid has a `layoutHint.size`, the grid falls
 *     back to the equal-cell mode (`cols` decides the track count).
 *   - If ANY child has a `layoutHint.size`, the grid switches to
 *     12-column track mode. Each hinted child spans exactly `size`
 *     columns; each un-hinted child gets `12 / cols` (or 12 if `cols`
 *     is unset) so the two modes stay visually consistent for the
 *     unhinted majority.
 *
 * Deliberately kept small — `order` / `rowSpan` / `align` per-child
 * are future extensions if real contracts need them, not speculative
 * surface area today.
 */
import { z } from 'zod';

/** `1..12` OR responsive object keyed by breakpoint. */
const responsiveNumber = z.union([
  z.number().int().min(1).max(12),
  z
    .object({
      base: z.number().int().min(1).max(12).optional(),
      sm: z.number().int().min(1).max(12).optional(),
      md: z.number().int().min(1).max(12).optional(),
      lg: z.number().int().min(1).max(12).optional(),
      xl: z.number().int().min(1).max(12).optional(),
    })
    .strict(),
]);

export const layoutHintSchema = z
  .object({
    /**
     * Bootstrap column span, 1..12. A number applies at every
     * breakpoint; an object lets it change per breakpoint.
     */
    size: responsiveNumber.optional(),
  })
  .strict();

export type ResponsiveColumnSpan = z.infer<typeof responsiveNumber>;
export type LayoutHint = z.infer<typeof layoutHintSchema>;

/** Breakpoints in ascending order — reused by both TW and MUI adapters. */
export const BREAKPOINTS = ['base', 'sm', 'md', 'lg', 'xl'] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

/**
 * Resolve a `ResponsiveColumnSpan` to a plain object keyed by
 * breakpoint. A bare `number` becomes `{ base: n }`. Missing
 * breakpoints stay undefined so callers can decide their own
 * fallback (usually "inherit from smaller breakpoint").
 */
export function resolveSpan(
  span: ResponsiveColumnSpan | undefined,
): Partial<Record<Breakpoint, number>> {
  if (span === undefined) return {};
  if (typeof span === 'number') return { base: span };
  return span;
}
