/**
 * Layout primitive — not exposed by @dashforge/ui (1.0.0), which only
 * wraps form/action atoms with RBAC. The MUI Stack is consumed directly
 * here; theming flows through the @dashforge/theme-mui provider that
 * `main.tsx` mounts at the app root.
 */

import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
import type { SpacingToken } from '@dashforge/blueprint-core';
import { SPACING_UNITS } from '../tokens';

type Props = {
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  spacing?: SpacingToken;
  p?: SpacingToken;
  m?: SpacingToken;
  wrap?: boolean;
  fullHeight?: boolean;
  children?: ReactNode;
};

const ALIGN_MAP = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const;
const JUSTIFY_MAP = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
} as const;

export function MuiStack({
  direction = 'column',
  align,
  justify = 'start',
  spacing = 'md',
  p,
  m,
  wrap,
  fullHeight,
  children,
}: Props) {
  const effectiveAlign = align ?? (direction === 'row' ? 'start' : 'stretch');
  return (
    <Stack
      direction={direction}
      spacing={SPACING_UNITS[spacing] ?? 2}
      sx={{
        alignItems: ALIGN_MAP[effectiveAlign],
        justifyContent: JUSTIFY_MAP[justify] ?? 'flex-start',
        p: p !== undefined ? SPACING_UNITS[p] : undefined,
        m: m !== undefined ? SPACING_UNITS[m] : undefined,
        flexWrap: wrap ? 'wrap' : undefined,
        height: fullHeight ? '100%' : undefined,
      }}
    >
      {children}
    </Stack>
  );
}
