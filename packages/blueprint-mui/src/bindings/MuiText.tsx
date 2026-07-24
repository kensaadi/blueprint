/** Typography primitive — not exposed by @dashforge/ui. Raw MUI is the
 *  honest binding; theming flows from @dashforge/theme-mui. */

import { Typography } from '@mui/material';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText } from '@dashforge/blueprint-runtime';

type Props = {
  tone?: 'muted' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'bold';
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: InlineTextValue;
};

const COLOR_MAP = {
  muted: 'text.secondary',
  success: 'success.main',
  warning: 'warning.main',
  danger: 'error.main',
} as const;

const VARIANT_MAP = {
  xs: 'caption',
  sm: 'body2',
  base: 'body1',
  lg: 'subtitle1',
} as const;

const WEIGHT_MAP = {
  normal: 400,
  medium: 500,
  bold: 700,
} as const;

export function MuiText({
  tone,
  size = 'base',
  weight,
  align,
  children,
}: Props) {
  return (
    <Typography
      variant={VARIANT_MAP[size]}
      color={tone ? COLOR_MAP[tone] : 'text.primary'}
      align={align}
      sx={{ fontWeight: weight ? WEIGHT_MAP[weight] : undefined, lineHeight: 1.6 }}
    >
      <InlineText value={children} />
    </Typography>
  );
}
