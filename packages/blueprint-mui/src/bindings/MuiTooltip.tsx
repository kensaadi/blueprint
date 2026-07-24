import { Children, isValidElement, cloneElement, type ReactNode, type ReactElement } from 'react';
import { Tooltip } from '@mui/material';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText } from '@dashforge/blueprint-runtime';

type Props = {
  content: InlineTextValue;
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
  content, side = 'top', align = 'center', hideArrow, delayDuration = 200,
  children,
}: Props) {
  const arr = Children.toArray(children);
  // MUI Tooltip refuses non-element children (it needs a ref forwarder).
  // Wrap raw text / multiple children in a <span> defensively.
  let anchor: ReactElement;
  const first = arr.find(isValidElement) as ReactElement | undefined;
  if (first) {
    anchor = first;
  } else {
    anchor = <span>{children}</span>;
  }
  // Some MUI components (Button, IconButton) accept tooltip without issue.
  // For native elements that may not forward ref properly, wrap.
  if (typeof anchor.type === 'string') {
    anchor = cloneElement(anchor);
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
