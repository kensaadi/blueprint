import type { ReactNode } from 'react';
import { Stack, Box } from '@dashforge/tw';
import type { SpacingToken } from '@dashforge/blueprint-core';
import { SPACING_STEP } from '../tokens';

type Props = {
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  spacing?: SpacingToken;
  p?: SpacingToken;
  m?: SpacingToken;
  /** Enable flex-wrap so children reflow onto multiple lines when they overflow. */
  wrap?: boolean;
  /** Grow the stack to fill the parent height (`h-full`). */
  fullHeight?: boolean;
  children?: ReactNode;
};

export function TwStack({
  direction = 'column',
  align,
  justify = 'start',
  spacing,
  p,
  m,
  wrap,
  fullHeight,
  children,
}: Props) {
  // Default cross-axis is `stretch` for column stacks so children (Grid,
  // Card, etc.) fill the available width. The lib's default is `start`.
  const effectiveAlign = align ?? (direction === 'row' ? 'start' : 'stretch');
  // The dashforge Stack primitive doesn't expose flex-wrap or a full-
  // height flag directly — surface them via Tailwind classes so the
  // schema-driven props still reach the DOM.
  const extraClasses = [
    wrap ? 'flex-wrap' : undefined,
    fullHeight ? 'h-full' : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  const stack = (
    <Stack
      direction={direction === 'row' ? 'row' : 'col'}
      gap={spacing !== undefined ? SPACING_STEP[spacing] : 4}
      align={effectiveAlign}
      justify={justify}
      sx={extraClasses || undefined}
    >
      {children}
    </Stack>
  );
  // Stack has no `p` / `m` props — wrap in <Box> when set.
  if (p === undefined && m === undefined) return stack;
  return (
    <Box
      p={p !== undefined ? SPACING_STEP[p] : undefined}
      m={m !== undefined ? SPACING_STEP[m] : undefined}
    >
      {stack}
    </Box>
  );
}
