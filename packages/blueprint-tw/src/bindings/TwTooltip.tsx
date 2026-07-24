import { Children, isValidElement, type ReactNode } from 'react';
import { Tooltip } from '@dashforge/tw';
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

export function TwTooltip({
  content, side = 'top', align = 'center', hideArrow, delayDuration, sideOffset,
  children,
}: Props) {
  // @dashforge/tw Tooltip uses RadixTooltip.Trigger with asChild=true —
  // the immediate child receives refs + event listeners via Radix Slot.
  // Function-component children (TwIconButton, etc.) don't forward refs,
  // so we wrap in a native <span> so Slot can attach to a DOM node.
  // The span doesn't break focus order: child stays in the tab sequence.
  //
  // Testing note: Radix Tooltip uses native pointerenter/pointerleave +
  // focus events. Synthetic events via `Element.dispatchEvent` won't
  // trigger the popup (the Radix internal pointer-tracking layer is
  // listening on a Provider-level context that's only updated by real
  // user input). For UI tests that need to assert tooltip content, use
  // `@testing-library/user-event` (which simulates real pointer events)
  // rather than `fireEvent` / programmatic dispatch.
  const arr = Children.toArray(children);
  const anchor = arr.find(isValidElement) ?? <span />;
  return (
    <Tooltip
      content={<InlineText value={content} />}
      side={side}
      align={align}
      hideArrow={hideArrow}
      delayDuration={delayDuration}
      sideOffset={sideOffset}
    >
      <span style={{ display: 'inline-flex' }}>{anchor}</span>
    </Tooltip>
  );
}
