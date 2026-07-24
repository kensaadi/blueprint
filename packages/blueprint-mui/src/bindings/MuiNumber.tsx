/** `number` atom — bound to @dashforge/ui NumberField. */

import { Alert } from '@mui/material';
import { NumberField } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

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

export function MuiNumber({
  name, label, placeholder, helperText, required, min, max, step,
  // `showStepper` is a catalog-level prop the TW flavor uses to toggle
  // +/- buttons. The MUI flavor relies on the native `<input type="number">`
  // browser stepper instead — so we deliberately omit it from the destructure
  // (it's in `Props` so callers can still pass it) to prevent it leaking onto
  // the DOM as an unknown HTML attribute (React warns about that).
}: Omit<Props, 'showStepper'>) {
  const resolvedLabel = useTranslatable(label);
  const resolvedPlaceholder = useTranslatable(placeholder);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Number node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Number <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  // @dashforge/ui NumberField type doesn't surface min/max/step in its
  // public TS — they go through MUI inputProps. Runtime accepts them via
  // input attributes; cast bypasses the missing surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NF = NumberField as any;
  return (
    <NF
      name={name}
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      required={required}
      min={min}
      max={max}
      step={step}
      fullWidth
    />
  );
}
