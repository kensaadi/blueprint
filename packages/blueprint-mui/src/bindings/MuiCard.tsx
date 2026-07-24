/** Layout primitive — see comment in MuiStack.tsx. */

import type { ReactNode } from 'react';
import { Card, CardContent } from '@mui/material';
import type { SpacingToken, RoundedToken, ElevationToken } from '@dashforge/blueprint-core';
import { SPACING_UNITS, RADIUS_UNITS } from '../tokens';

type Props = {
  p?: SpacingToken;
  rounded?: RoundedToken;
  elevation?: ElevationToken;
  border?: boolean;
  children?: ReactNode;
};

export function MuiCard({
  p = 'md',
  rounded = 'lg',
  elevation = 1,
  border,
  children,
}: Props) {
  return (
    <Card
      elevation={border === false ? elevation : 0}
      variant={border === false ? 'elevation' : 'outlined'}
      sx={{
        borderRadius: RADIUS_UNITS[rounded],
        '& .MuiCardContent-root:last-child': { pb: SPACING_UNITS[p] },
      }}
    >
      <CardContent sx={{ p: SPACING_UNITS[p] }}>{children}</CardContent>
    </Card>
  );
}
