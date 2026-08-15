import { Children, isValidElement, cloneElement, type ReactNode, type ReactElement } from 'react';
import { Tooltip, Box } from '@mui/material';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText, useIcon, renderIcon } from '@dashforge/blueprint-runtime';

type Props = {
  content: InlineTextValue;
  /** Tabler icon for the standalone trigger (when no child). Default: info-circle. */
  icon?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  hideArrow?: boolean;
  delayDuration?: number;
  sideOffset?: number;
  children?: ReactNode;
};

const PLACEMENT_MAP: Record<
  NonNullable<Props['side']>,
  Record<NonNullable<Props['align']>, 'top' | 'top-start' | 'top-end' | 'right' | 'right-start' | 'right-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end'>
> = {
  top:    { start: 'top-start',    center: 'top',    end: 'top-end'    },
  right:  { start: 'right-start',  center: 'right',  end: 'right-end'  },
  bottom: { start: 'bottom-start', center: 'bottom', end: 'bottom-end' },
  left:   { start: 'left-start',   center: 'left',   end: 'left-end'   },
};

export function MuiTooltip({
  content, icon, side = 'top', align = 'center', hideArrow, delayDuration = 200,
  children,
}: Props) {
  const iconId = icon ?? 'info-circle';
  const iconEntry = useIcon(iconId); // hook: called unconditionally
  const first = Children.toArray(children).find(isValidElement) as ReactElement | undefined;

  // Two modes: wrap an existing child, or render a standalone info-icon
  // trigger (the "ⓘ" hint) inline + baseline-aligned, so it sits AFTER a
  // preceding label/text. MUI Tooltip needs a ref-forwarding element child.
  let anchor: ReactElement;
  if (first) {
    anchor = typeof first.type === 'string' ? cloneElement(first) : first;
  } else {
    anchor = (
      <Box
        component="button"
        type="button"
        aria-label="More information"
        sx={{
          ml: 0.5,
          p: 0,
          border: 0,
          background: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          color: 'text.secondary',
          cursor: 'help',
          '&:hover': { color: 'text.primary' },
        }}
      >
        {renderIcon(iconEntry, iconId, { size: 18, 'aria-hidden': true })}
      </Box>
    );
  }

  return (
    <Tooltip
      title={<InlineText value={content} />}
      placement={PLACEMENT_MAP[side][align]}
      arrow={!hideArrow}
      enterDelay={delayDuration}
    >
      {anchor}
    </Tooltip>
  );
}
