/** `radio` atom — bound to @dashforge/tw RadioGroup. */

import { useMemo } from 'react';
import { RadioGroup } from '@dashforge/tw';
import type { InlineText as InlineTextValue, ListProp, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe, useResolvedList } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Option = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  orientation?: 'horizontal' | 'vertical';
  options: ListProp<Option>;
};

export function TwRadio({ name, label, helperText, required, orientation, options }: Props) {
  const resolvedLabel = useTranslatable(label);
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
        Radio node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Radio <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
    );
  }
  return (
    <RadioGroup
      name={name}
      label={resolvedLabel}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      layout={orientation === 'horizontal' ? 'row' : 'stacked'}
      options={resolvedOptions}
    />
  );
}
