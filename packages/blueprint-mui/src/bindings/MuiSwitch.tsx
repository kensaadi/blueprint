/** `switch` atom — bound to @dashforge/ui Switch. */

import { Alert } from '@mui/material';
import { Switch } from '@dashforge/ui';
import type { InlineText as InlineTextValue, TranslatableString } from '@dashforge/blueprint-core';
import { InlineText, useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  name?: string;
  label?: TranslatableString;
  helperText?: InlineTextValue;
  /** Injected by compileNode from `node.disabled`. */
  disabled?: boolean;
};

export function MuiSwitch({ name, label, helperText, disabled }: Props) {
  const resolvedLabel = useTranslatable(label);
  const inForm = useMuiFormCtx() !== null;
  if (!name) {
    return <Alert severity="error">Switch node is missing required <code>name</code> prop.</Alert>;
  }
  if (!inForm) {
    return (
      <Alert severity="error">
        Switch <code>{name}</code> must be rendered inside a <code>form</code> node.
      </Alert>
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const S = Switch as any;
  return (
    <S
      name={name}
      label={resolvedLabel}
      helperText={helperText !== undefined ? <InlineText value={helperText} /> : undefined}
      disabled={disabled}
    />
  );
}
