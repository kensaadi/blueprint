/**
 * `autocomplete` atom — bound to @dashforge/tw Autocomplete (typeahead).
 *
 * Same options shape as `select`, but the underlying component is richer
 * (filter-as-you-type). Use this when the option list is large or when
 * the user is expected to know what they're searching for.
 */

import { useMemo } from 'react';
import { Autocomplete } from '@dashforge/tw';
import type { InlineText as InlineTextValue, ListProp, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe, useResolvedList } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Option = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  options: ListProp<Option>;
};

export function TwAutocomplete({ name, label, placeholder, helperText, required, options }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const items = useResolvedList(options);
  const resolvedOptions = useMemo(
    () => items.map((o) => ({ ...o, label: resolveTranslatableValue(o.label, intl, formValues) ?? '' })),
    [items, intl, formValues],
  );
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Autocomplete node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Autocomplete <code>{name}</code> must be rendered inside a <code>form</code> node.
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
