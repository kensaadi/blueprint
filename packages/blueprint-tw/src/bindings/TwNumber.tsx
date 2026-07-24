/** `number` atom — bound to @dashforge/tw NumberField. */

import { NumberField } from '@dashforge/tw';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  placeholder?: TranslatableString;
  helperText?: InlineTextValue;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  showStepper?: boolean;
};

export function TwNumber({ name, label, placeholder, helperText, required, min, max, step, showStepper }: Props) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Number node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Number <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
    );
  }
  return (
    <NumberField
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      min={min}
      max={max}
      step={step}
      showStepper={showStepper}
    />
  );
}
