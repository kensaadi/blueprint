/** `textarea` atom — bound to @dashforge/tw Textarea. */

import { Textarea } from '@dashforge/tw';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  rows?: number;
  maxLength?: number;
};

export function TwTextarea({ name, label, placeholder, helperText, required, rows, maxLength }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Textarea node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Textarea <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
    );
  }
  return (
    <Textarea
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      rows={rows}
      maxLength={maxLength}
    />
  );
}
