/**
 * `field` binding for the TW flavor — uses @dashforge/tw TextField when
 * inside a form (detected via the local TwFormCtx), falls back to a
 * clear error block otherwise.
 */

import { TextField } from '@dashforge/tw';
import type { AccessRequirement } from '@dashforge/rbac';
import type { InlineText as InlineTextValue, TranslatableString, FieldTooltip } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable, useFieldTooltip } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  type?: string;
  required?: boolean;
  /** Label-help tooltip (ⓘ in the label row). Resolved + forwarded to the dashforge input. */
  tooltip?: FieldTooltip;
  /** Injected by compileNode from `node.disabled` (top-level on BlueprintNode). */
  disabled?: boolean;
  /** Injected by compileNode from `node.access`. Resolved by `useAccessState` in the underlying dashforge component. */
  access?: AccessRequirement;
};

export function TwField({ name, label, placeholder, helperText, type = 'text', required, disabled, access, tooltip }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const resolvedTooltip = useFieldTooltip(tooltip);
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Field node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Field <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
    );
  }
  // @dashforge/tw TextField accepts ReactNode for helperText, so the
  // <InlineText /> element passes through cleanly. When helperText is a
  // plain string we still render it via InlineText to keep the path
  // uniform (string fast-path inside the renderer).
  return (
    <TextField
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      type={type as 'text' | 'email' | 'password'}
      required={required}
      disabled={disabled}
      access={access}
      tooltip={resolvedTooltip}
    />
  );
}
