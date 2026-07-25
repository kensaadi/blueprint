import type { ReactNode } from 'react';
import { Stack, Box } from '@dashforge/tw';
import type { SpacingToken } from '@dashforge/blueprint-core';
import { SPACING_STEP, toStackGap } from '../tokens';

type Props = {
  spacing?: SpacingToken;
  p?: SpacingToken;
  children?: ReactNode;
};

export function TwSection({ spacing, p, children }: Props) {
  const stack = (
    <Stack
      as="section"
      direction="col"
      gap={spacing !== undefined ? toStackGap(SPACING_STEP[spacing]) : 4}
      align="stretch"
    >
      {children}
    </Stack>
  );
  if (p === undefined) return stack;
  return <Box p={SPACING_STEP[p]}>{stack}</Box>;
}
