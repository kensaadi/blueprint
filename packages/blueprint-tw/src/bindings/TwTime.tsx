/** `time` atom — bound to @dashforge/tw TimePicker. Value stored as "HH:mm". */

import { TimePicker } from '@dashforge/tw';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  min?: string;
  max?: string;
};

export function TwTime({ name, label, placeholder, helperText, required, min, max }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Time node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Time <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
    );
  }
  return (
    <TimePicker
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      minTime={min as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      maxTime={max as any}
    />
  );
}
