import { IconButton } from '@mui/material';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useIcon, renderIcon, useTranslatable } from '@dashforge/blueprint-runtime';

type Props = {
  icon?: string;
  ariaLabel?: TranslatableString;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
};

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 14,
  md: 18,
  lg: 22,
};

const MUI_SIZE: Record<'sm' | 'md' | 'lg', 'small' | 'medium' | 'large'> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

export function MuiIconButton({
  icon,
  ariaLabel,
  variant = 'solid',
  size = 'md',
  disabled,
}: Props) {
  const entry = useIcon(icon);
  const px = SIZE_PX[size];
  const resolvedAriaLabel = useTranslatable(ariaLabel);

  // MUI IconButton doesn't ship "solid/outline/ghost" variants — emulate
  // them with sx for parity with TwIconButton.
  const sx =
    variant === 'solid'
      ? { bgcolor: 'grey.900', color: 'common.white', '&:hover': { bgcolor: 'grey.700' } }
      : variant === 'outline'
        ? { border: 1, borderColor: 'grey.300', color: 'grey.800', '&:hover': { bgcolor: 'grey.50' } }
        : { color: 'grey.700', '&:hover': { bgcolor: 'grey.100' } };

  return (
    <IconButton
      aria-label={resolvedAriaLabel}
      size={MUI_SIZE[size]}
      disabled={disabled}
      sx={sx}
    >
      {renderIcon(entry, icon, { size: px, 'aria-hidden': true })}
    </IconButton>
  );
}
