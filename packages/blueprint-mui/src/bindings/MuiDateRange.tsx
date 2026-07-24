/** `dateRange` atom — bound to @dashforge/ui DateRangePicker. */

import { Alert } from '@mui/material';
import { DateRangePicker } from '@dashforge/ui';
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

export function MuiDateRange({ name, label, placeholder, helperText, required, min, max }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">DateRange node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        DateRange <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  // Bug #28 workaround — without an explicit `defaultValue`, the
  // @dashforge/ui DateRangePicker formats `${start} – ${end}` over an
  // initially-undefined value pair, rendering literal "undefined – undefined"
  // inside the input box. We force a `{start: null, end: null}` default so
  // the picker treats the field as empty and displays the placeholder
  // instead of the bad template.
  // Tracked upstream — opened against dashforge as a separate issue.
  return (
    <DateRangePicker
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder ?? 'Select a date range'}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      minDate={min as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      maxDate={max as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaultValue={{ start: null, end: null } as any}
    />
  );
}
