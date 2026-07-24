import type { ReactNode } from 'react';
import { Box } from '@dashforge/tw';
import type { SpacingToken, RoundedToken, ElevationToken } from '@dashforge/blueprint-core';
import { SPACING_STEP, ROUNDED_STEP } from '../tokens';

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

export function TwBox({
  p, px, py, m, mx, my, rounded, elevation, fullWidth, children,
}: Props) {
  return (
    <Box
      p={p !== undefined ? SPACING_STEP[p] : undefined}
      px={px !== undefined ? SPACING_STEP[px] : undefined}
      py={py !== undefined ? SPACING_STEP[py] : undefined}
      m={m !== undefined ? SPACING_STEP[m] : undefined}
      mx={mx !== undefined ? SPACING_STEP[mx] : undefined}
      my={my !== undefined ? SPACING_STEP[my] : undefined}
      rounded={rounded !== undefined ? ROUNDED_STEP[rounded] : undefined}
      elevation={elevation}
      fullWidth={fullWidth}
    >
      {children}
    </Box>
  );
}
