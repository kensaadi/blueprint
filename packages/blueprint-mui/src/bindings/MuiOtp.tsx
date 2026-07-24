/** `otp` atom — bound to @dashforge/ui OTPField. */

import { Alert } from '@mui/material';
import { OTPField } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  length?: number;
  mode?: 'numeric' | 'alphanumeric';
};

export function MuiOtp({ name, label, helperText, required, length, mode }: Props) {
  const resolvedLabel = useTranslatable(label);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">OTP node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        OTP <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  return (
    <OTPField
      name={name}
      label={resolvedLabel}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      length={length}
      mode={mode}
    />
  );
}
