/**
 * Status chip — the "✓ valid / ⚠ N issues" pill in the header.
 *
 * Wraps @dashforge/tw `<Chip>`. Maps the validation state to the
 * appropriate variant + color combo.
 *
 * DOGFOOD note: @dashforge/tw exports `<Badge>` but it's a FLOATING
 * notification badge anchored to a parent (dot/count overlay). It is
 * NOT an inline status pill. We use `<Chip>` with `variant="soft"`
 * instead — which is technically a "filter chip" semantically. Works
 * visually, but the semantic is slightly off. See gap G-02.
 */
import { Chip } from '@dashforge/tw';

export type ValidationState =
  | { kind: 'empty' }
  | { kind: 'valid' }
  | { kind: 'issues'; count: number }
  | { kind: 'modified' };

export function StatusChip({ state }: { state: ValidationState }) {
  if (state.kind === 'empty') {
    return <Chip label="empty" variant="soft" color="neutral" size="sm" />;
  }
  if (state.kind === 'valid') {
    return <Chip label="✓ valid" variant="soft" color="success" size="sm" />;
  }
  if (state.kind === 'issues') {
    const label = state.count === 1 ? '⚠ 1 issue' : `⚠ ${state.count} issues`;
    return <Chip label={label} variant="soft" color="danger" size="sm" />;
  }
  return <Chip label="● modified" variant="soft" color="primary" size="sm" />;
}
