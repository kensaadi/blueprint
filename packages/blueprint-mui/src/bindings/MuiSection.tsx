/** Layout primitive — see comment in MuiStack.tsx. */

import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
import type { SpacingToken } from '@dashforge/blueprint-core';
import { SPACING_UNITS } from '../tokens';

type Props = {
  spacing?: SpacingToken;
  p?: SpacingToken;
  children?: ReactNode;
};

export function MuiSection({ spacing = 'md', p, children }: Props) {
  return (
    <Stack
      component="section"
      spacing={SPACING_UNITS[spacing] ?? 2}
      sx={{ p: p !== undefined ? SPACING_UNITS[p] : undefined }}
    >
      {children}
    </Stack>
  );
}
