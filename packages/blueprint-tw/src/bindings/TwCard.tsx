import type { ReactNode } from 'react';
import { Card, CardContent } from '@dashforge/tw';
import type { SpacingToken, RoundedToken, ElevationToken } from '@dashforge/blueprint-core';
import { SPACING_STEP, ROUNDED_STEP } from '../tokens';

type Props = {
  p?: SpacingToken;
  rounded?: RoundedToken;
  elevation?: ElevationToken;
  /** Explicit 1px border. `false` swaps to the borderless elevated variant. */
  border?: boolean;
  children?: ReactNode;
};

export function TwCard({
  p = 'md',
  rounded = 'lg',
  elevation = 1,
  border,
  children,
}: Props) {
  const variant = border === false ? 'elevated' : 'outlined';
  return (
    <Card variant={variant} rounded={ROUNDED_STEP[rounded]} elevation={elevation}>
      <CardContent p={SPACING_STEP[p]}>{children}</CardContent>
    </Card>
  );
}
