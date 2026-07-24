/**
 * IntlContext — React-side glue for the `intl: IntlConfig` prop.
 *
 * Mirrors the IconProvider pattern: stash the user-supplied resolver in
 * a context so renderers (InlineText, TwField/MuiField label resolution,
 * etc.) can read it lazily without prop drilling.
 *
 * `useIntl()` returns `null` when no provider is in scope — callers
 * should fall back to literal rendering in that case (the contract
 * stays valid without i18n; opting in is opt-in).
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { IntlConfig } from '@dashforge/blueprint-core';

const IntlCtx = createContext<IntlConfig | null>(null);

export function IntlProvider({
  intl,
  children,
}: {
  intl?: IntlConfig;
  children: ReactNode;
}) {
  return <IntlCtx.Provider value={intl ?? null}>{children}</IntlCtx.Provider>;
}

export function useIntl(): IntlConfig | null {
  return useContext(IntlCtx);
}
