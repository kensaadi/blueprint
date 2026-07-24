/**
 * Form adapter for the TW flavor.
 *
 * Wraps `<DashFormProvider>` from @dashforge/forms and exposes a small
 * context that the field / submit bindings consume. Submit captures
 * RHF values and forwards them to the FormConfig.onSubmit callback
 * provided via the `<DashBlueprint forms={{ ... }}>` prop.
 */

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DashFormProvider, useDashFormContext } from '@dashforge/forms';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import type { FormConfig } from '@dashforge/blueprint-core';
import { FormValuesPublisher } from '@dashforge/blueprint-runtime';
import { TwFormCtx, type TwFormCtxValue } from './formContext';

function resolveValidation(formConfig?: FormConfig): Resolver | undefined {
  if (formConfig?.resolver) return formConfig.resolver as Resolver;
  if (formConfig?.schema) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return zodResolver(formConfig.schema as any) as Resolver;
  }
  return undefined;
}

export function TwForm({
  formConfig,
  children,
}: {
  formConfig?: FormConfig;
  children?: ReactNode;
}) {
  return (
    <DashFormProvider
      defaultValues={(formConfig?.defaultValues as Record<string, unknown>) ?? {}}
      resolver={resolveValidation(formConfig)}
      mode={formConfig?.mode}
    >
      <TwFormInner formConfig={formConfig}>{children}</TwFormInner>
    </DashFormProvider>
  );
}

function TwFormInner({ formConfig, children }: { formConfig?: FormConfig; children?: ReactNode }) {
  const { rhf } = useDashFormContext();
  const [submitting, setSubmitting] = useState(false);

  // Lifecycle hooks (FormConfig.onMount / onValuesChange).
  // Keep formConfig in a ref so we don't re-fire onMount when the
  // consumer rebuilds the callback identity on re-renders. Sync the
  // ref inside useEffect to satisfy the react-hooks/immutability rule.
  const configRef = useRef(formConfig);
  useEffect(() => {
    configRef.current = formConfig;
  });

  // onMount — fires ONCE after the bridge is ready.
  useEffect(() => {
    configRef.current?.onMount?.({
      getValues: () => rhf.getValues() as Record<string, unknown>,
      reset: (values) => rhf.reset(values),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue: (name, value) => rhf.setValue(name, value as any),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // onValuesChange — fires per field change. RHF.watch returns a
  // subscription; we tear it down on unmount.
  useEffect(() => {
    const sub = rhf.watch((values, info) => {
      configRef.current?.onValuesChange?.(
        values as Record<string, unknown>,
        info.name as string | undefined,
      );
    });
    return () => sub.unsubscribe();
  }, [rhf]);

  const submit = useCallback(async () => {
    if (!formConfig) return;
    setSubmitting(true);
    try {
      await rhf.handleSubmit(
        async (values) => {
          try {
            await formConfig.onSubmit(values as Record<string, unknown>);
          } catch (err) {
            formConfig.onError?.(err);
          }
        },
        (errors) => {
          formConfig.onError?.(errors);
          // Submit-fail focus management (Formily-gap audit item #4): jump
          // focus to the first invalid field so keyboard users can recover
          // without scanning the form. RHF reports errors in registration
          // order so Object.keys()[0] is the first declared invalid field.
          const firstError = Object.keys(errors)[0];
          if (firstError) {
            try {
              rhf.setFocus(firstError);
            } catch {
              // Field may be unmounted (visibility:false) — silently skip.
            }
          }
        },
      )();
    } finally {
      setSubmitting(false);
    }
  }, [rhf, formConfig]);

  const ctxValue = useMemo<TwFormCtxValue>(() => ({ submitting, submit }), [submitting, submit]);

  return (
    <TwFormCtx.Provider value={ctxValue}>
      <FormValuesPublisher>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
        >
          {children}
        </form>
      </FormValuesPublisher>
    </TwFormCtx.Provider>
  );
}
