/**
 * Blueprint token → @dashforge/tw token-step mapping.
 *
 * The lib's Stack.gap, Box.p, Grid.spacing all share the same
 * numeric token-scale step ('0' | '0.5' | '1' | '2' | '3' | '4' | '6' …).
 * Blueprint contracts speak the higher-level dashforge scale
 * ('none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl') — we translate
 * here so bindings stay declarative.
 *
 * Note (tw ≥1.2): the half-step is typed inconsistently — `Grid.spacing`
 * / `Box.p` accept the string `'0.5'`, while `Stack.gap` (`StackGap`) wants
 * the numeric `0.5`. Both resolve to the same `gap-0.5` class at runtime;
 * `toStackGap` bridges the string form to the numeric one `Stack` expects.
 */

import type { ComponentProps } from 'react';
import type { SpacingToken, RoundedToken } from '@dashforge/blueprint-core';
import type { Stack } from '@dashforge/tw';

// Derive `StackGap` from the public component — @dashforge/tw declares the
// type internally but does not re-export it.
type StackGap = NonNullable<ComponentProps<typeof Stack>['gap']>;

export type LibSpacingStep = 0 | '0.5' | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24;

export const SPACING_STEP: Record<SpacingToken, LibSpacingStep> = {
  none: 0,
  xs: '0.5',
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
  '2xl': 6,
};

/** Bridge the shared spacing step to the numeric `StackGap` Stack expects (tw ≥1.2). */
export function toStackGap(step: LibSpacingStep): StackGap {
  return step === '0.5' ? 0.5 : step;
}

export const ROUNDED_STEP: Record<RoundedToken, 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'> = {
  none: 'none',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  full: 'full',
};
