/**
 * Section label — the small uppercase tracked text we use as a header
 * inside panels (LAYOUT, FORM, INSPECTOR, ...).
 *
 * Wraps `<Typography>` from @dashforge/tw so the variant is centralized
 * here. Lets every panel call <SectionLabel>X</SectionLabel> instead of
 * repeating the same className + style soup.
 *
 * DOGFOOD note: Typography doesn't expose an `overline` / `eyebrow`
 * preset variant for uppercase tracked labels, so we manually compose
 * `variant="caption"` with custom className. See BUILDER-DOGFOOD-REPORT.md
 * gap G-04 for the proposal.
 */
import type { ReactNode } from 'react';
import { Typography } from '@dashforge/tw';

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx="mb-2 block text-[12px] font-medium uppercase tracking-[0.08em]"
      style={{ color: 'var(--bd-text-soft)' }}
    >
      {children}
    </Typography>
  );
}
