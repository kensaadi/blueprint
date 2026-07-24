import { Children, type ReactNode } from 'react';
import { Grid, Box } from '@dashforge/tw';
import type { Responsive, SpacingToken } from '@dashforge/blueprint-core';
import type { LayoutHint } from '@dashforge/blueprint-core';
import { SPACING_STEP } from '../tokens';
import { colsToItemSpans } from '../responsive';
import { hintToItemSpans } from '../layoutHint';

type Props = {
  cols?: Responsive<number>;
  gap?: SpacingToken;
  p?: SpacingToken;
  children?: ReactNode;
  /**
   * Injected by compileNode when this grid has children. Index-aligned
   * with `Children.toArray(children)`. When ANY hint is defined, the
   * grid switches to 12-col track mode and each child gets its own
   * span; children without a hint fall back to the container's `cols`.
   */
  _childLayoutHints?: (LayoutHint | undefined)[];
};

export function TwGrid({ cols, gap, p, children, _childLayoutHints }: Props) {
  const containerSpans = colsToItemSpans(cols);
  const hasHints = _childLayoutHints?.some((h) => h?.size !== undefined) ?? false;
  const grid = (
    <Grid container cols={12} spacing={gap !== undefined ? SPACING_STEP[gap] : 4}>
      {Children.map(children, (child, idx) => {
        const hint = _childLayoutHints?.[idx];
        // When any sibling declared a hint we switch modes: hinted
        // children get their explicit span, unhinted ones inherit the
        // `cols`-derived default so the two rules read consistently.
        const spans = hasHints
          ? hintToItemSpans(hint) ?? containerSpans
          : containerSpans;
        return (
          <Grid key={idx} {...spans}>
            {child}
          </Grid>
        );
      })}
    </Grid>
  );
  if (p === undefined) return grid;
  return <Box p={SPACING_STEP[p]}>{grid}</Box>;
}
