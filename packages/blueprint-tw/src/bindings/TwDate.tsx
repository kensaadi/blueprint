/** `date` atom — bound to @dashforge/tw DatePicker. Value stored as YYYY-MM-DD. */

import { DatePicker } from '@dashforge/tw';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  min?: string;
  max?: string;
};

export function TwDate({ name, label, helperText, required, min, max }: Props) {
  const resolvedLabel = useTranslatable(label);
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Date node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Date <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
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
