import type { ReactNode } from 'react';
import { Container } from '@mui/material';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  px?: boolean;
  centerContent?: boolean;
  children?: ReactNode;
};

export function MuiContainer({ size = 'lg', px, centerContent, children }: Props) {
  const maxWidth = size === 'full' ? false : size;
  const sx = {
    ...(px === false && { px: 0 }),
    ...(centerContent && {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }),
  };
  return (
    <Container maxWidth={maxWidth} sx={sx} disableGutters={px === false}>
      {children}
    </Container>
  );
}
