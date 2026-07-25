/**
 * ConfirmDialog — modal with title + body + up to three actions.
 *
 * Rendered through a React portal so it floats over the whole shell.
 * ESC dismisses, click-outside dismisses, primary action gets keyboard
 * focus on open. The primary action's tone (default vs danger) drives
 * the button color. The optional third action supports the "Save →
 * proceed" workflow used by the New/Open dirty-check.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';

type Action = {
  label: string;
  onClick: () => void;
  /** Visual weight — `primary` uses accent, `danger` uses red, `ghost` is neutral. */
  tone?: 'primary' | 'danger' | 'ghost';
  autoFocus?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  body?: ReactNode;
  /** Left button (usually Cancel). */
  cancel?: Action;
  /** Right button (usually Confirm/Discard). */
  confirm: Action;
  /** Optional middle button (usually Save). */
  extra?: Action;
};

export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  cancel,
  confirm,
  extra,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const autoFocusRef = useRef<HTMLButtonElement | null>(null);
  useFocusTrap(rootRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) autoFocusRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        className="flex w-[440px] max-w-full flex-col gap-4 rounded-lg border p-5 shadow-2xl"
        style={{
          background: 'var(--bd-surface, var(--bd-canvas))',
          borderColor: 'var(--bd-border)',
          color: 'var(--bd-text)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-[15px] font-semibold">{title}</div>
        {body && (
          <div className="text-[13px] leading-relaxed" style={{ color: 'var(--bd-text-soft)' }}>
            {body}
          </div>
        )}
        <div className="mt-2 flex items-center justify-end gap-2">
          {cancel && <DialogButton action={cancel} />}
          {extra && <DialogButton action={extra} />}
          <DialogButton
            action={confirm}
            ref={confirm.autoFocus ? autoFocusRef : undefined}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DialogButton({
  action,
  ref,
}: {
  action: Action;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const tone = action.tone ?? 'primary';
  const style: React.CSSProperties = {
    background:
      tone === 'primary'
        ? 'var(--bd-accent)'
        : tone === 'danger'
          ? '#dc2626'
          : 'transparent',
    color: tone === 'ghost' ? 'var(--bd-text-soft)' : 'white',
    borderColor: tone === 'ghost' ? 'var(--bd-border)' : 'transparent',
  };
  return (
    <button
      ref={ref}
      type="button"
      onClick={action.onClick}
      className="rounded-md border px-3 py-1.5 text-[13px] font-medium outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-1"
      style={style}
    >
      {action.label}
    </button>
  );
}
