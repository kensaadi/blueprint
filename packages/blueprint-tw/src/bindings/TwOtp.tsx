/** `otp` atom — bound to @dashforge/tw OTPField. */

import { OTPField } from '@dashforge/tw';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  length?: number;
  mode?: 'numeric' | 'alphanumeric';
};

export function TwOtp({ name, label, helperText, required, length, mode }: Props) {
  const resolvedLabel = useTranslatable(label);
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        OTP node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        OTP <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
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
