/** `textarea` atom — bound to @dashforge/ui Textarea. */

import { Alert } from '@mui/material';
import { Textarea } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  rows?: number;
  maxLength?: number;
};

export function MuiTextarea({ name, label, placeholder, helperText, required, rows, maxLength }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Textarea node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Textarea <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TA = Textarea as any;
  // @dashforge/ui Textarea defaults to minRows={3} internally — passing
  // `rows` alongside that default makes MUI complain
  // ("can not use minRows/maxRows when rows is set"). We translate the
  // catalog's `rows` prop into `minRows` so the underlying TextareaAutosize
  // grows from N visible rows without a hard cap.
  return (
    <TA
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      minRows={rows}
      maxLength={maxLength}
      fullWidth
    />
  );
}
