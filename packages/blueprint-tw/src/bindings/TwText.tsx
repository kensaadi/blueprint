import { Typography } from '@dashforge/tw';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText } from '@dashforge/blueprint-runtime';

type Props = {
  tone?: 'muted' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'bold';
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: InlineTextValue;
};

const VARIANT_MAP = {
  xs: 'caption',
  sm: 'body2',
  base: 'body1',
  lg: 'subtitle1',
} as const;

export function TwText({
  tone,
  size = 'base',
  weight,
  align,
  children,
}: Props) {
  return (
    // Same fix as TwHeading — never pass className to Typography; use
    // the built-in `align` prop so the variant classes survive.
    <Typography
      variant={VARIANT_MAP[size]}
      color={tone ?? 'inherit'}
      weight={weight === 'bold' ? 'bold' : weight === 'medium' ? 'medium' : undefined}
      align={align}
    >
      <InlineText value={children} />
    </Typography>
  );
}
