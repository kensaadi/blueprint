/* eslint-disable react-refresh/only-export-components -- provider colocates with its consumer hook */
/**
 * DialogFlow — promise-returning replacements for window.confirm /
 * window.prompt / window.alert. Mounts a single portal at the app
 * root and exposes typed hooks so any call site can `await` the
 * user's response instead of blocking the main thread with a native
 * dialog.
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: '…', body: '…', confirmLabel: 'Delete' });
 *
 *   const prompt = usePrompt();
 *   const name = await prompt({ title: 'Rename', defaultValue: 'x' });
 *
 *   const alert = useAlert();
 *   await alert({ title: 'Imported', body: '…' });
 *
 * All three flows use the same modal primitive (portalled, focus-
 * trapped, ESC-dismissable) so the visual language matches the rest
 * of the Builder.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { PromptDialog } from './PromptDialog';

export type ConfirmOptions = {
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type PromptOptions = {
  title: ReactNode;
  body?: ReactNode;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export type AlertOptions = {
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: string;
};

type ConfirmState = ConfirmOptions & { resolve: (v: boolean) => void };
type PromptState = PromptOptions & { resolve: (v: string | null) => void };
type AlertState = AlertOptions & { resolve: () => void };

const ConfirmCtx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);
const PromptCtx = createContext<((o: PromptOptions) => Promise<string | null>) | null>(null);
const AlertCtx = createContext<((o: AlertOptions) => Promise<void>) | null>(null);

export function DialogFlowProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);
  const promptResolveRef = useRef<((v: string | null) => void) | null>(null);
  const alertResolveRef = useRef<(() => void) | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        confirmResolveRef.current = resolve;
        setConfirmState({ ...opts, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOptions): Promise<string | null> =>
      new Promise<string | null>((resolve) => {
        promptResolveRef.current = resolve;
        setPromptState({ ...opts, resolve });
      }),
    [],
  );

  const alert = useCallback(
    (opts: AlertOptions): Promise<void> =>
      new Promise<void>((resolve) => {
        alertResolveRef.current = resolve;
        setAlertState({ ...opts, resolve });
      }),
    [],
  );

  const closeConfirm = (v: boolean) => {
    const r = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmState(null);
    r?.(v);
  };
  const closePrompt = (v: string | null) => {
    const r = promptResolveRef.current;
    promptResolveRef.current = null;
    setPromptState(null);
    r?.(v);
  };
  const closeAlert = () => {
    const r = alertResolveRef.current;
    alertResolveRef.current = null;
    setAlertState(null);
    r?.();
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      <PromptCtx.Provider value={prompt}>
        <AlertCtx.Provider value={alert}>
          {children}
          <ConfirmDialog
            open={confirmState !== null}
            onClose={() => closeConfirm(false)}
            title={confirmState?.title ?? ''}
            body={confirmState?.body}
            cancel={{
              label: confirmState?.cancelLabel ?? 'Cancel',
              tone: 'ghost',
              onClick: () => closeConfirm(false),
            }}
            confirm={{
              label: confirmState?.confirmLabel ?? 'Confirm',
              tone: confirmState?.danger ? 'danger' : 'primary',
              onClick: () => closeConfirm(true),
              autoFocus: true,
            }}
          />
          <ConfirmDialog
            open={alertState !== null}
            onClose={closeAlert}
            title={alertState?.title ?? ''}
            body={alertState?.body}
            confirm={{
              label: alertState?.confirmLabel ?? 'OK',
              tone: 'primary',
              onClick: closeAlert,
              autoFocus: true,
            }}
          />
          <PromptDialog
            open={promptState !== null}
            onClose={() => closePrompt(null)}
            onSubmit={(v) => closePrompt(v)}
            title={promptState?.title ?? ''}
            body={promptState?.body}
            label={promptState?.label}
            defaultValue={promptState?.defaultValue ?? ''}
            placeholder={promptState?.placeholder}
            confirmLabel={promptState?.confirmLabel}
            cancelLabel={promptState?.cancelLabel}
          />
        </AlertCtx.Provider>
      </PromptCtx.Provider>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used inside DialogFlowProvider');
  return ctx;
}

export function usePrompt() {
  const ctx = useContext(PromptCtx);
  if (!ctx) throw new Error('usePrompt must be used inside DialogFlowProvider');
  return ctx;
}

export function useAlert() {
  const ctx = useContext(AlertCtx);
  if (!ctx) throw new Error('useAlert must be used inside DialogFlowProvider');
  return ctx;
}
