/**
 * `select` atom — bound to @dashforge/tw Autocomplete.
 *
 * @dashforge/tw@1.1.1 does not ship a dedicated <Select>; Autocomplete is
 * the closest fit and accepts the same `{ value, label }` option shape we
 * use in the contract. Behaviour mirrors a native <select> when the
 * options list is short; consumers get typeahead for free as the list
 * grows.
 */

import { useMemo } from 'react';
import { Autocomplete } from '@dashforge/tw';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Option = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  options: Option[];
};

export function TwSelect({ name, label, placeholder, helperText, required, options }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const resolvedOptions = useMemo(
    () => options.map((o) => ({ ...o, label: resolveTranslatableValue(o.label, intl, formValues) ?? '' })),
    [options, intl, formValues],
  );
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Select node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Select <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
    );
  }
  return (
    <Autocomplete
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      options={resolvedOptions}
    />
  );
}
