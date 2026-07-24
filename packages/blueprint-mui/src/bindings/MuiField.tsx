/**
 * `field` binding for the MUI flavor — uses @dashforge/ui TextField when
 * inside a form (detected via MuiFormCtx), falls back to a clear error
 * block otherwise.
 */

import { Alert } from '@mui/material';
import { TextField } from '@dashforge/ui';
import type { AccessRequirement } from '@dashforge/rbac';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  type?: string;
  required?: boolean;
  /** Injected by compileNode from `node.disabled`. */
  disabled?: boolean;
  /** Injected by compileNode from `node.access`. */
  access?: AccessRequirement;
};

export function MuiField({ name, label, placeholder, helperText, type = 'text', required, disabled, access }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Field node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Field <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TF = TextField as any;
  return (
    <TF
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      type={type as 'text' | 'email' | 'password'}
      required={required}
      disabled={disabled}
      access={access}
      layout="stacked"
      fullWidth
    />
  );
}
