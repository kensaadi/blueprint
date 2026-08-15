/**
 * Resolve a Blueprint form field's `tooltip` (a JSON-serializable
 * `FieldTooltip`) into the shape the `@dashforge/tw|ui` inputs expect:
 * `content` becomes an `<InlineText>` node and `icon` (a Tabler name) is
 * resolved against the icon registry into a ReactNode. Shared by the
 * `field` bindings on both flavor packs.
 */
import type { ReactNode } from 'react';
import type { FieldTooltip } from '@dashforge/blueprint-core';
import { InlineText } from './InlineText';
import { useIcon, renderIcon } from './IconContext';

/** The resolved shape passed to the input component's `tooltip` prop. */
export interface ResolvedFieldTooltip {
  content: ReactNode;
  icon?: ReactNode;
  position?: 'before' | 'after';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function useFieldTooltip(
  tooltip: FieldTooltip | undefined,
): ResolvedFieldTooltip | undefined {
  // Hook called unconditionally (rules of hooks); the early return follows.
  const iconId = tooltip && typeof tooltip === 'object' ? tooltip.icon : undefined;
  const iconEntry = useIcon(iconId);

  if (tooltip == null) return undefined;
  if (typeof tooltip === 'string') return { content: <InlineText value={tooltip} /> };
  return {
    content: <InlineText value={tooltip.content} />,
    // Fall back to the component's built-in info-circle when the id is
    // absent / unresolved, rather than a missing-icon placeholder.
    icon: iconEntry ? renderIcon(iconEntry, iconId, { size: 16, 'aria-hidden': true }) : undefined,
    position: tooltip.position,
    side: tooltip.side,
  };
}
