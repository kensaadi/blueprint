import type { ReactNode } from 'react';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useIcon, renderIcon, useTranslatable } from '@dashforge/blueprint-runtime';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Color =
  | 'neutral' | 'primary' | 'secondary'
  | 'success' | 'warning' | 'danger' | 'info';

/** Icon pixel size per token — mirrors the MUI binding for cross-flavor parity. */
const SIZE_PX: Record<Size, number> = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32 };

type Props = {
  icon: string;
  size?: Size;
  color?: Color;
  label?: TranslatableString;
};

/**
 * Standalone icon — resolves `icon` against the consumer's IconRegistry (same
 * path as button/chip icons). `label` present ⇒ accessible (role=img); absent
 * ⇒ decorative (aria-hidden). Color is applied to `currentColor` via a theme
 * token, with a safe fallback so a missing token never breaks rendering.
 */
export function TwIcon({ icon, size = 'md', color, label }: Props): ReactNode {
  const entry = useIcon(icon);
  const resolvedLabel = useTranslatable(label);
  const a11y = resolvedLabel
    ? { role: 'img', 'aria-label': resolvedLabel }
    : { 'aria-hidden': true };
  const style =
    color && color !== 'neutral'
      ? { color: `var(--df-color-${color}, currentColor)`, display: 'inline-flex' }
      : { display: 'inline-flex' };
  return (
    <span style={style}>
      {renderIcon(entry, icon, { size: SIZE_PX[size], ...a11y })}
    </span>
  );
}
