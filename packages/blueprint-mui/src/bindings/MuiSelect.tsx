/** `select` atom — bound to @dashforge/ui Select (MUI native dropdown). */

import { useMemo } from 'react';
import { Alert } from '@mui/material';
import { Select } from '@dashforge/ui';
import type { InlineText as InlineTextValue, ListProp, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe, useResolvedList } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Option = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  options: ListProp<Option>;
};

export function MuiSelect({ name, label, placeholder, helperText, required, options }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const items = useResolvedList(options);
  const resolvedOptions = useMemo(
    () => items.map((o) => ({ ...o, label: resolveTranslatableValue(o.label, intl, formValues) ?? '' })),
    [items, intl, formValues],
  );
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Select node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Select <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  return (
    <Select
      name={name}
      label={resolvedLabel ?? ''}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      options={resolvedOptions}
      fullWidth
    />
  );
}
