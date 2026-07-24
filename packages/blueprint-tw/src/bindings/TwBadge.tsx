import type { ReactNode } from 'react';
import { Badge } from '@dashforge/tw';

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

export function TwBadge({
  content, dot, color = 'danger', placement = 'top-right',
  overlap = 'rectangular', max, showZero, children,
}: Props) {
  return (
    <Badge
      content={content}
      dot={dot}
      color={color}
      placement={placement}
      overlap={overlap}
      max={max}
      showZero={showZero}
    >
      {children}
    </Badge>
  );
}
