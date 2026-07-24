import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import type { SpacingToken, RoundedToken, ElevationToken } from '@dashforge/blueprint-core';

type Props = {
  p?: SpacingToken;
  px?: SpacingToken;
  py?: SpacingToken;
  m?: SpacingToken;
  mx?: SpacingToken;
  my?: SpacingToken;
  rounded?: RoundedToken;
  elevation?: ElevationToken;
  fullWidth?: boolean;
  children?: ReactNode;
};

// MUI spacing is theme.spacing(n) → n * 8px by default. Match the
// Tailwind step-scale visually.
const SPACING: Record<SpacingToken, number> = {
  none: 0, xs: 0.5, sm: 1, md: 2, lg: 3, xl: 4, '2xl': 6,
};
const RADIUS: Record<RoundedToken, number | string> = {
  none: 0, sm: 1, md: 1.5, lg: 2, xl: 3, full: 9999,
};

export function MuiBox({
  p, px, py, m, mx, my, rounded, elevation, fullWidth, children,
}: Props) {
  const sx = {
    ...(p !== undefined && { p: SPACING[p] }),
    ...(px !== undefined && { px: SPACING[px] }),
    ...(py !== undefined && { py: SPACING[py] }),
    ...(m !== undefined && { m: SPACING[m] }),
    ...(mx !== undefined && { mx: SPACING[mx] }),
    ...(my !== undefined && { my: SPACING[my] }),
    ...(rounded !== undefined && { borderRadius: RADIUS[rounded] }),
    ...(elevation !== undefined && elevation > 0 && { boxShadow: elevation }),
    ...(fullWidth && { width: '100%' }),
  };
  return <Box sx={sx}>{children}</Box>;
}
