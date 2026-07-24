/**
 * Token → MUI value tables for the MUI flavor pack.
 *
 * Dashforge spacing tokens map to MUI theme spacing units (× 8 px).
 */

import type { SpacingToken, RoundedToken } from '@dashforge/blueprint-core';

export const SPACING_UNITS: Record<SpacingToken, number> = {
  none: 0,
  xs: 0.5,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
  '2xl': 6,
};

/** MUI borderRadius theme key (1 = theme.shape.borderRadius). */
export const RADIUS_UNITS: Record<RoundedToken, number | string> = {
  none: 0,
  sm: 0.5,
  md: 1,
  lg: 2,
  xl: 3,
  full: '9999px',
};
