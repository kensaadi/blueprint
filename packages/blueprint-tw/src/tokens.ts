/**
 * Blueprint token → @dashforge/tw token-step mapping.
 *
 * The lib's Stack.gap, Box.p, Grid.spacing all share the same
 * numeric token-scale step ('0' | '0.5' | '1' | '2' | '3' | '4' | '6' …).
 * Blueprint contracts speak the higher-level dashforge scale
 * ('none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl') — we translate
 * here so bindings stay declarative.
 */

import type { SpacingToken, RoundedToken } from '@dashforge/blueprint-core';

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

export const ROUNDED_STEP: Record<RoundedToken, 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'> = {
  none: 'none',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  full: 'full',
};
