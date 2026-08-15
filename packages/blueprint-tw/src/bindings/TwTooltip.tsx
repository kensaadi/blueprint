import { Children, isValidElement, type ReactNode } from 'react';
import { Tooltip } from '@dashforge/tw';
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

export function TwTooltip({
  content, icon, side = 'top', align = 'center', hideArrow, delayDuration, sideOffset,
  children,
}: Props) {
  // @dashforge/tw Tooltip uses RadixTooltip.Trigger with asChild=true — the
  // immediate child is the trigger. Two modes:
  //  • child present → wrap it (tooltip on an existing element).
  //  • no child     → render a standalone info-icon trigger (the "ⓘ" hint),
  //    inline + baseline-aligned so it sits AFTER a preceding label/text.
  const iconId = icon ?? 'info-circle';
  const iconEntry = useIcon(iconId); // hook: called unconditionally
  const child = Children.toArray(children).find(isValidElement);

  const anchor = child ? (
    <span style={{ display: 'inline-flex' }}>{child}</span>
  ) : (
    <button
      type="button"
      aria-label="More information"
      className="ml-1 inline-flex items-center justify-center align-middle text-neutral-500 hover:text-neutral-700 cursor-help"
    >
      {renderIcon(iconEntry, iconId, { size: 18, 'aria-hidden': true })}
    </button>
  );

  return (
    <Tooltip
      content={<InlineText value={content} />}
      side={side}
      align={align}
      hideArrow={hideArrow}
      delayDuration={delayDuration}
      sideOffset={sideOffset}
    >
      {anchor}
    </Tooltip>
  );
}
