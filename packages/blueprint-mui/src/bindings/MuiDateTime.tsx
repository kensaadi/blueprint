/** `dateTime` atom — bound to @dashforge/ui DateTimePicker. */

import { Alert } from '@mui/material';
import { DateTimePicker } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
};

export function MuiDateTime({ name, label, placeholder, helperText, required }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">DateTime node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        DateTime <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  return (
    <DateTimePicker
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
    />
  );
}
