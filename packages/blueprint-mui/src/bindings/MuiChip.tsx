import { Chip } from '@mui/material';
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

const COLOR_MAP: Record<Color, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  neutral: 'default',
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'info',
};

// MUI only has 'filled' | 'outlined'. soft + solid both map to filled;
// soft renders with the lighter default treatment.
const VARIANT_MAP: Record<'soft' | 'solid' | 'outline', 'filled' | 'outlined'> = {
  soft: 'filled',
  solid: 'filled',
  outline: 'outlined',
};

const SIZE_MAP: Record<'sm' | 'md' | 'lg', 'small' | 'medium'> = {
  sm: 'small',
  md: 'medium',
  lg: 'medium',
};

export function MuiChip({
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
      variant={VARIANT_MAP[variant]}
      color={COLOR_MAP[color]}
      size={SIZE_MAP[size]}
      disabled={disabled}
      icon={iconNode as never}
      sx={selected ? { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 } : undefined}
    />
  );
}
