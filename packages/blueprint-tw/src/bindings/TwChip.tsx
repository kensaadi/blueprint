import { Chip } from '@dashforge/tw';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useIcon, renderIcon, useTranslatable } from '@dashforge/blueprint-runtime';

type Color = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: TranslatableString;
  variant?: 'soft' | 'solid' | 'outline';
  color?: Color;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  icon?: string;
};

// @dashforge/tw Chip only ships 'sm' | 'md'. Cap 'lg' to 'md' for parity
// with the MUI binding, which is similarly capped (MUI Chip is sm | md).
const SIZE_MAP: Record<NonNullable<Props['size']>, 'sm' | 'md'> = {
  sm: 'sm', md: 'md', lg: 'md',
};

export function TwChip({
  label, variant = 'soft', color = 'neutral', size = 'md',
  selected, disabled, icon,
}: Props) {
  const entry = useIcon(icon);
  const resolvedLabel = useTranslatable(label) ?? '';
  const iconNode = icon
    ? renderIcon(entry, icon, { size: 14, 'aria-hidden': true })
    : undefined;

  return (
    <Chip
      label={resolvedLabel}
      variant={variant}
      color={color}
      size={SIZE_MAP[size]}
      selected={selected}
      disabled={disabled}
      icon={iconNode}
    />
  );
}
