/** `time` atom — bound to @dashforge/ui TimePicker. */

import { Alert } from '@mui/material';
import { TimePicker } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  min?: string;
  max?: string;
};

export function MuiTime({ name, label, placeholder, helperText, required, min, max }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Time node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Time <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  return (
    <TimePicker
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      minTime={min as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      maxTime={max as any}
    />
  );
}
