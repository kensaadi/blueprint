/** Typography primitive — see comment in MuiText.tsx. */

import { Typography } from '@mui/material';
import type { InlineText as InlineTextValue } from '@dashforge/blueprint-core';
import { InlineText } from '@dashforge/blueprint-runtime';

type Props = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: InlineTextValue;
};

const SIZE_REM = {
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
} as const;

export function MuiHeading({ level = 2, size, align, children }: Props) {
  const variant = (`h${level}`) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return (
    <Typography
      variant={variant}
      align={align}
      sx={{
        fontSize: size ? SIZE_REM[size] : undefined,
        fontWeight: 600,
        letterSpacing: '-0.02em',
      }}
    >
      <InlineText value={children} />
    </Typography>
  );
}
