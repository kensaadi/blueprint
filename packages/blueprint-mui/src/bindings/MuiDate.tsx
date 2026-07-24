/** `date` atom — bound to @dashforge/ui DatePicker. */

import { Alert } from '@mui/material';
import { DatePicker } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  min?: string;
  max?: string;
};

export function MuiDate({ name, label, helperText, required, min, max }: Props) {
  const resolvedLabel = useTranslatable(label);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Date node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Date <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  return (
    <DatePicker
      name={name}
      label={resolvedLabel}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      minDate={min as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      maxDate={max as any}
    />
  );
}
