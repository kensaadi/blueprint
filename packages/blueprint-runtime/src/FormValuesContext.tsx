/**
 * FormValuesContext — Blueprint-owned snapshot of the current form
 * values, published by the flavor-specific form adapters (TwForm /
 * MuiForm).
 *
 * Why a separate context (not just reading dashforge's own):
 *   - InlineText / translatable label resolvers need values to resolve
 *     `$form.X` refs in translation vars
 *   - They render OUTSIDE form contexts too (e.g. a top-level heading)
 *   - dashforge's `useDashFormContext` throws when no provider — we
 *     need a graceful "no form" answer, which a nullable context
 *     handles cleanly without breaking rules-of-hooks
 *
 * The form adapter wraps its inner with `<FormValuesProvider>` and
 * pushes a fresh snapshot on every RHF `watch` tick.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useDashFormContext } from '@dashforge/forms';

type FormValues = Record<string, unknown>;

const FormValuesCtx = createContext<FormValues | null>(null);

/**
 * Hook for renderers (InlineText, label resolvers). Returns the current
 * form values, or null when no form context is in scope — callers
 * should treat `$form.X` refs as undefined in that case.
 */
export function useFormValuesSafe(): FormValues | null {
  return useContext(FormValuesCtx);
}

/**
 * Mounted inside the form adapter (TwFormInner / MuiFormInner). Reads
 * the dashforge context (we're guaranteed to be inside its provider),
 * subscribes to RHF.watch, and pushes the snapshot down.
 */
export function FormValuesPublisher({ children }: { children: ReactNode }) {
  const { rhf } = useDashFormContext();
  const [values, setValues] = useState<FormValues>(
    () => rhf.getValues() as FormValues,
  );

  useEffect(() => {
    const sub = rhf.watch((next) => {
      setValues({ ...(next as FormValues) });
    });
    return () => sub.unsubscribe();
  }, [rhf]);

  // Memoize the provider value to avoid spurious re-renders on identity
  // changes — the underlying object only differs when fields actually
  // mutate (RHF's watch already debounces equality at field level).
  const ctxValue = useMemo(() => values, [values]);

  return <FormValuesCtx.Provider value={ctxValue}>{children}</FormValuesCtx.Provider>;
}
