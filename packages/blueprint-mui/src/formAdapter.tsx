/**
 * Form adapter for the MUI flavor — same shape as the TW adapter:
 * wrap @dashforge/forms DashFormProvider, expose submit + submitting.
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
import { Box } from '@mui/material';
import type { FormConfig } from '@dashforge/blueprint-core';
import { FormValuesPublisher } from '@dashforge/blueprint-runtime';
import { MuiFormCtx, type MuiFormCtxValue } from './formContext';

function resolveValidation(formConfig?: FormConfig): Resolver | undefined {
  if (formConfig?.resolver) return formConfig.resolver as Resolver;
  if (formConfig?.schema) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return zodResolver(formConfig.schema as any) as Resolver;
  }
  return undefined;
}

export function MuiForm({
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
      <MuiFormInner formConfig={formConfig}>{children}</MuiFormInner>
    </DashFormProvider>
  );
}

function MuiFormInner({ formConfig, children }: { formConfig?: FormConfig; children?: ReactNode }) {
  const { rhf } = useDashFormContext();
  const [submitting, setSubmitting] = useState(false);

  // Lifecycle hooks — same shape as TwForm; see formAdapter.tsx in the
  // tw flavor for the rationale (configRef avoids re-firing onMount).
  const configRef = useRef(formConfig);
  useEffect(() => {
    configRef.current = formConfig;
  });

  useEffect(() => {
    configRef.current?.onMount?.({
      getValues: () => rhf.getValues() as Record<string, unknown>,
      reset: (values) => rhf.reset(values),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setValue: (name, value) => rhf.setValue(name, value as any),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          // Submit-fail focus management (Formily-gap audit item #4) —
          // mirror of TwForm. See its comment for the rationale.
          const firstError = Object.keys(errors)[0];
          if (firstError) {
            try {
              rhf.setFocus(firstError);
            } catch {
              // Field may be unmounted — silently skip.
            }
          }
        },
      )();
    } finally {
      setSubmitting(false);
    }
  }, [rhf, formConfig]);

  const ctxValue = useMemo<MuiFormCtxValue>(() => ({ submitting, submit }), [submitting, submit]);

  return (
    <MuiFormCtx.Provider value={ctxValue}>
      <FormValuesPublisher>
        <Box
          component="form"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            void submit();
          }}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {children}
        </Box>
      </FormValuesPublisher>
    </MuiFormCtx.Provider>
  );
}
