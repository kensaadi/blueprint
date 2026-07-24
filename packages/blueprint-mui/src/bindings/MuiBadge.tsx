import type { ReactNode } from 'react';
import { Badge } from '@mui/material';

type Color = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
type Placement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

type Props = {
  content?: string | number;
  dot?: boolean;
  color?: Color;
  placement?: Placement;
  overlap?: 'rectangular' | 'circular';
  max?: number;
  showZero?: boolean;
  children?: ReactNode;
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

const ANCHOR_MAP: Record<Placement, { vertical: 'top' | 'bottom'; horizontal: 'left' | 'right' }> = {
  'top-right': { vertical: 'top', horizontal: 'right' },
  'top-left': { vertical: 'top', horizontal: 'left' },
  'bottom-right': { vertical: 'bottom', horizontal: 'right' },
  'bottom-left': { vertical: 'bottom', horizontal: 'left' },
};

export function MuiBadge({
  content, dot, color = 'danger', placement = 'top-right',
  overlap = 'rectangular', max, showZero, children,
}: Props) {
  return (
    <Badge
      badgeContent={content}
      variant={dot ? 'dot' : 'standard'}
      color={COLOR_MAP[color]}
      anchorOrigin={ANCHOR_MAP[placement]}
      overlap={overlap}
      max={max}
      showZero={showZero}
    >
      {children}
    </Badge>
  );
}
