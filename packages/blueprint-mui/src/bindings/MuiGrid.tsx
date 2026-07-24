/** Layout primitive — see comment in MuiStack.tsx. */

import { Children, type ReactNode } from 'react';
import { Box } from '@mui/material';
import type { Responsive, SpacingToken } from '@dashforge/blueprint-core';
import type { LayoutHint } from '@dashforge/blueprint-core';
import { SPACING_UNITS } from '../tokens';
import { responsiveColsToSx } from '../responsive';
import { hintToSx } from '../layoutHint';

type Props = {
  cols?: Responsive<number>;
  gap?: SpacingToken;
  p?: SpacingToken;
  children?: ReactNode;
  /** Injected by compileNode — see TwGrid for shape docs. */
  _childLayoutHints?: (LayoutHint | undefined)[];
};

export function MuiGrid({
  cols,
  gap = 'md',
  p,
  children,
  _childLayoutHints,
}: Props) {
  const hasHints = _childLayoutHints?.some((h) => h?.size !== undefined) ?? false;
  // When any child declared a hint we switch the track to 12 columns so
  // Bootstrap-style spans map cleanly. Otherwise keep the caller's
  // `cols`-derived template (backwards compatible).
  const gridTemplateColumns = hasHints
    ? 'repeat(12, 1fr)'
    : responsiveColsToSx(cols);
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        gap: SPACING_UNITS[gap] ?? 2,
        p: p !== undefined ? SPACING_UNITS[p] : undefined,
      }}
    >
      {hasHints
        ? Children.map(children, (child, idx) => {
            const hint = _childLayoutHints?.[idx];
            const itemSx = hintToSx(hint, cols);
            return (
              <Box sx={itemSx} key={idx}>
                {child}
              </Box>
            );
          })
        : children}
    </Box>
  );
}
