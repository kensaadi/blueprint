import type { ReactNode } from 'react';
import { Container } from '@dashforge/tw';

type Props = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  px?: boolean;
  centerContent?: boolean;
  children?: ReactNode;
};

// Blueprint speaks 'full' (idiomatic across libs); @dashforge/tw uses 'fluid'.
const SIZE_MAP: Record<NonNullable<Props['size']>, 'sm' | 'md' | 'lg' | 'xl' | 'fluid'> = {
  sm: 'sm', md: 'md', lg: 'lg', xl: 'xl', full: 'fluid',
};

export function TwContainer({ size = 'lg', px, centerContent, children }: Props) {
  return (
    <Container
      size={SIZE_MAP[size]}
      px={px}
      centerContent={centerContent}
    >
      {children}
    </Container>
  );
}
