import { Button } from '@dashforge/tw';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useIcon, renderIcon, useTranslatable } from '@dashforge/blueprint-runtime';

type Variant = 'solid' | 'outline' | 'ghost';

type Props = {
  label?: TranslatableString;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'start' | 'end';
};

const VARIANT_MAP: Record<Variant, 'solid' | 'outline' | 'ghost'> = {
  solid: 'solid',
  outline: 'outline',
  ghost: 'ghost',
};

export function TwButton({
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

  return (
    <Button
      variant={VARIANT_MAP[variant] ?? 'solid'}
      color="primary"
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
    >
      {iconNode && iconPosition === 'start' && (
        <span data-icon="start" className="mr-1.5 inline-flex items-center">{iconNode}</span>
      )}
      {resolvedLabel}
      {iconNode && iconPosition === 'end' && (
        <span data-icon="end" className="ml-1.5 inline-flex items-center">{iconNode}</span>
      )}
    </Button>
  );
}
