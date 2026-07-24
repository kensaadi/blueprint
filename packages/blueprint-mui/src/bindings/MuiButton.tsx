import { Button } from '@dashforge/ui';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useIcon, renderIcon, useTranslatable } from '@dashforge/blueprint-runtime';

type Props = {
  label?: TranslatableString;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'start' | 'end';
};

const SIZE_MAP = { sm: 'small', md: 'medium', lg: 'large' } as const;

const VARIANT_MAP = {
  solid: 'contained',
  outline: 'outlined',
  ghost: 'text',
} as const;

export function MuiButton({
  label,
  variant = 'solid',
  size,
  fullWidth,
  disabled,
  icon,
  iconPosition = 'start',
}: Props) {
  const resolvedLabel = useTranslatable(label);
  const entry = useIcon(icon);
  const iconNode = icon
    ? renderIcon(entry, icon, { size: 16, 'aria-hidden': true })
    : null;

  // Use MUI's startIcon / endIcon slots so the spacing matches the rest
  // of the Material system.
  return (
    <Button
      variant={VARIANT_MAP[variant]}
      color="primary"
      size={size ? SIZE_MAP[size] : undefined}
      fullWidth={fullWidth}
      disabled={disabled}
      startIcon={iconNode && iconPosition === 'start' ? iconNode : undefined}
      endIcon={iconNode && iconPosition === 'end' ? iconNode : undefined}
    >
      {resolvedLabel}
    </Button>
  );
}
