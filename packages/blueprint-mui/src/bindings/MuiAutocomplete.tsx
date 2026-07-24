/** `autocomplete` atom — bound to @dashforge/ui Autocomplete (typeahead). */

import { useMemo } from 'react';
import { Alert } from '@mui/material';
import { Autocomplete } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Option = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  options: Option[];
};

export function MuiAutocomplete({ name, label, placeholder, helperText, required, options }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const resolvedOptions = useMemo(
    () => options.map((o) => ({ ...o, label: resolveTranslatableValue(o.label, intl, formValues) ?? '' })),
    [options, intl, formValues],
  );
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Autocomplete node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Autocomplete <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  // @dashforge/ui Autocomplete type doesn't list `placeholder` in its
  // public props (extends MUI TextField — placeholder is on input slot).
  // The cast is intentional: we forward the prop and the runtime handles it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AC = Autocomplete as any;
  return (
    <AC
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      options={resolvedOptions}
      fullWidth
    />
  );
}
