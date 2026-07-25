/**
 * Reusable panel shell — used by Palette, Inspector, SourceDrawer.
 *
 * Wraps `<Card>` from @dashforge/tw with the Theme A surface tokens
 * applied via CSS variables. Single responsibility: be a consistent
 * container so the panel components only worry about their content.
 *
 * DOGFOOD note: Card's API accepts variant/elevation/padding, but the
 * background and border colors come from @dashforge/tw's product theme
 * — they don't honor Builder's CSS variables out of the box. We override
 * via `className` + inline style. See BUILDER-DOGFOOD-REPORT.md gap G-05.
 */
import type { ReactNode, CSSProperties } from 'react';
import { Card } from '@dashforge/tw';

type PanelShellProps = {
  children: ReactNode;
  /** Optional className for layout (width, overflow, etc.) */
  className?: string;
  /** Optional inline style overrides (border directions, height). */
  style?: CSSProperties;
  /** Padding override — defaults to '16px' (p-4 equivalent). */
  padding?: string;
  /**
   * ARIA landmark role. Screen readers use this to build the "Skip to
   * region" menu — pass `navigation` for Palette, `complementary` for
   * Inspector, etc.
   */
  role?: 'navigation' | 'complementary' | 'main' | 'region';
  /** Accessible label for the landmark. Required when `role` is set. */
  ariaLabel?: string;
};

export function PanelShell({
  children,
  className = '',
  style,
  padding = '16px',
  role,
  ariaLabel,
}: PanelShellProps) {
  return (
    <Card
      variant="outlined"
      className={`shrink-0 overflow-y-auto ${className}`}
      style={{
        background: 'var(--bd-panel)',
        borderColor: 'var(--bd-border)',
        borderRadius: 0,
        padding,
        ...style,
      }}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </Card>
  );
}
