/** `radio` atom — bound to @dashforge/ui RadioGroup. */

import { useMemo } from 'react';
import { Alert } from '@mui/material';
import { RadioGroup } from '@dashforge/ui';
import type { InlineText as InlineTextValue, ListProp, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe, useResolvedList } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Option = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  orientation?: 'horizontal' | 'vertical';
  options: ListProp<Option>;
};

export function MuiRadio({ name, label, helperText, required, orientation, options }: Props) {
  const resolvedLabel = useTranslatable(label);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const items = useResolvedList(options);
  const resolvedOptions = useMemo(
    () => items.map((o) => ({ ...o, label: resolveTranslatableValue(o.label, intl, formValues) ?? '' })),
    [items, intl, formValues],
  );
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Radio node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Radio <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RG = RadioGroup as any;
  return (
    <RG
      name={name}
      label={resolvedLabel}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      row={orientation === 'horizontal'}
      options={resolvedOptions}
    />
  );
}
