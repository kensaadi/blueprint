import { Typography } from '@dashforge/tw';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText } from '@dashforge/blueprint-runtime';

type Props = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: InlineTextValue;
};

const SIZE_TO_VARIANT = {
  xl: 'h4',
  '2xl': 'h3',
  '3xl': 'h2',
  '4xl': 'h1',
  '5xl': 'h1',
} as const;

export function TwHeading({ level = 2, size, align, children }: Props) {
  const variant = size ? SIZE_TO_VARIANT[size] : (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6');
  // @dashforge/tw Typography merges `rest` AFTER its own `className`,
  // which means an undefined `className` passed here wipes the variant
  // classes. Use the built-in `align` prop instead (Typography destructures
  // it before the spread, so it's safe) — and never touch className.
  return (
    <Typography variant={variant} as={`h${level}`} align={align}>
      <InlineText value={children} />
    </Typography>
  );
}
