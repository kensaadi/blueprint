/**
 * Resolve a `TranslatableString` (literal string | `{ $t, vars? }`) to a
 * plain string at render time, against the active intl + form values.
 *
 * Used by binding code (TwField/MuiField/TwButton/MuiButton/...) for
 * label / placeholder props where rich inline formatting would be
 * misuse. Returns the literal key when no intl provider is in scope —
 * keeps the contract valid without forcing i18n.
 */
import { useMemo } from 'react';
import {
  isTranslationRef,
  resolveVars,
  type IntlConfig,
  type TranslatableString,
} from '@dashforge/blueprint-core';
import { useIntl } from './IntlContext';
import { useFormValuesSafe } from './FormValuesContext';
import { bpWarn } from './warn';

/**
 * Hook-form — single value. Use directly on `label`/`placeholder` props.
 */
export function useTranslatable(value: TranslatableString | undefined): string | undefined {
  const intl = useIntl();
  const formValues = useFormValuesSafe();

  return useMemo(() => resolveTranslatableValue(value, intl, formValues), [value, intl, formValues]);
}

/**
 * Non-hook form — for array-item resolution in bindings that map over
 * `options[]` / `items[]` (chip-list, tabs, breadcrumbs, select, …).
 * Hooks can't run in a loop; callers read `useIntl()` / `useFormValuesSafe()`
 * at the top, then call this synchronously inside their `useMemo` over
 * the items array.
 */
export function resolveTranslatableValue(
  value: TranslatableString | undefined,
  intl: IntlConfig | null,
  formValues: Record<string, unknown> | null,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (!isTranslationRef(value)) return undefined;
  if (!intl) return value.$t;
  // Consumer-supplied `intl.t` is user code — a throw would otherwise
  // bubble through render and crash the whole tree. Fall back to the key
  // and surface the failure via bpWarn (silent in prod).
  try {
    const resolved = intl.t(value.$t, resolveVars(value.vars, formValues));
    return resolved === undefined ? value.$t : resolved;
  } catch (e) {
    bpWarn(`intl.t("${value.$t}")`, 'threw during translation — falling back to the key.', e);
    return value.$t;
  }
}
