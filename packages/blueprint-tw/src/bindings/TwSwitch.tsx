/** `switch` atom — bound to @dashforge/tw Switch. */

import { Switch } from '@dashforge/tw';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  /** Injected by compileNode from `node.disabled`. */
  disabled?: boolean;
};

export function TwSwitch({ name, label, helperText, disabled }: Props) {
  const resolvedLabel = useTranslatable(label);
  const inForm = useTwFormCtx() !== null;
  if (!name) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Switch node is missing required <code>name</code> prop.
      </div>
    );
  }
  if (!inForm) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        Switch <code>{name}</code> must be rendered inside a <code>form</code> node.
      </div>
    );
  }
  return (
    <Switch
      name={name}
      label={resolvedLabel}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      disabled={disabled}
    />
  );
}
