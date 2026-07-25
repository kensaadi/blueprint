/**
 * PromptDialog — single-line text input inside a portalled modal.
 * Used by the DialogFlowProvider to replace `window.prompt`. Enter
 * submits, ESC / Cancel returns null.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: ReactNode;
  body?: ReactNode;
  label?: string;
  defaultValue: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function PromptDialog({
  open,
  onClose,
  onSubmit,
  title,
  body,
  label,
  defaultValue,
  placeholder,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: Props) {
  const rootRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useFocusTrap(rootRef, open);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(defaultValue);
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open, defaultValue]);

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

  if (!open) return null;
  const trimmed = value.trim();

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSubmit(trimmed);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-[440px] max-w-full flex-col gap-4 rounded-lg border p-5 shadow-2xl"
        style={{
          background: 'var(--bd-surface, var(--bd-canvas))',
          borderColor: 'var(--bd-border)',
          color: 'var(--bd-text)',
        }}
      >
        <div className="text-[15px] font-semibold">{title}</div>
        {body && (
          <div className="text-[13px] leading-relaxed" style={{ color: 'var(--bd-text-soft)' }}>
            {body}
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          {label && (
            <span
              className="text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: 'var(--bd-text-soft)' }}
            >
              {label}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="rounded-md border px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2"
            style={{
              background: 'var(--bd-item)',
              borderColor: 'var(--bd-border)',
              color: 'var(--bd-text)',
            }}
          />
        </label>
        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5 text-[13px] font-medium"
            style={{
              borderColor: 'var(--bd-border)',
              background: 'transparent',
              color: 'var(--bd-text-soft)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="rounded-md border px-3 py-1.5 text-[13px] font-medium disabled:opacity-40"
            style={{
              background: 'var(--bd-accent)',
              borderColor: 'transparent',
              color: 'white',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
