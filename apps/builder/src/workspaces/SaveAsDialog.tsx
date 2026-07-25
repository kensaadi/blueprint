/**
 * SaveAsDialog — modal picker for "save the current contract as a
 * named file in a workspace". Replaces the native `window.prompt`
 * flow so the Builder feels production-grade instead of a debug tool.
 *
 * Layout:
 *   Header  — "Save as"
 *   Field   — file name text input (auto-focused, pre-filled with
 *             the suggested default)
 *   Field   — workspace picker (only visible when more than one
 *             writable workspace exists; otherwise the single option
 *             is used implicitly and the row collapses to a hint)
 *   Actions — Cancel / Save
 *
 * Enter submits (with valid input); Escape cancels; click-outside
 * cancels. Focus trap keeps Tab navigation inside the modal.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { WorkspaceAdapter, WorkspaceId } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (workspaceId: WorkspaceId, name: string) => void | Promise<void>;
  /** Suggested file name (pre-filled). */
  suggestedName: string;
  /** All writable workspaces to choose from. */
  workspaces: WorkspaceAdapter[];
  /** Default workspace id — pre-selected in the picker. */
  defaultWorkspaceId: WorkspaceId;
};

export function SaveAsDialog({
  open,
  onClose,
  onSubmit,
  suggestedName,
  workspaces,
  defaultWorkspaceId,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useFocusTrap(rootRef, open);

  const [name, setName] = useState(suggestedName);
  const [workspaceId, setWorkspaceId] =
    useState<WorkspaceId>(defaultWorkspaceId);

  // Re-seed on open so the second invocation of a workflow reflects
  // the current suggestion, not the buffer from last time. Intentional
  // setState-in-effect — the parent's `open` toggle is the external
  // signal we're syncing to.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(suggestedName);
    setWorkspaceId(defaultWorkspaceId);
    queueMicrotask(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open, suggestedName, defaultWorkspaceId]);

  // ESC dismisses. Enter submits when the input is focused (Enter on
  // a radio would trigger form submission that we're already handling
  // via the button's onClick + form.onSubmit).
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

  const trimmed = useMemo(() => name.trim(), [name]);
  const canSubmit = trimmed.length > 0 && workspaces.length > 0;
  const showPicker = workspaces.length > 1;
  const soleWorkspaceLabel = workspaces[0]?.descriptor.label;

  const submit = () => {
    if (!canSubmit) return;
    void onSubmit(workspaceId, trimmed);
  };

  if (!open) return null;

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
        aria-labelledby="save-as-title"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex w-[460px] max-w-full flex-col gap-4 rounded-lg border p-5 shadow-2xl"
        style={{
          background: 'var(--bd-surface, var(--bd-canvas))',
          borderColor: 'var(--bd-border)',
          color: 'var(--bd-text)',
        }}
      >
        <div id="save-as-title" className="text-[15px] font-semibold">
          Save as
        </div>

        <label className="flex flex-col gap-1.5">
          <span
            className="text-[11px] font-medium uppercase tracking-[0.08em]"
            style={{ color: 'var(--bd-text-soft)' }}
          >
            File name
          </span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-form.json"
            className="rounded-md border px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2"
            style={{
              background: 'var(--bd-item)',
              borderColor: 'var(--bd-border)',
              color: 'var(--bd-text)',
            }}
          />
        </label>

        {showPicker ? (
          <fieldset className="flex flex-col gap-1.5 border-0 p-0">
            <legend
              className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.08em]"
              style={{ color: 'var(--bd-text-soft)' }}
            >
              Save to workspace
            </legend>
            <div className="flex flex-col gap-1.5">
              {workspaces.map((ws) => {
                const active = ws.descriptor.id === workspaceId;
                return (
                  <label
                    key={ws.descriptor.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors"
                    style={{
                      borderColor: active
                        ? 'var(--bd-accent)'
                        : 'var(--bd-border)',
                      background: active
                        ? 'var(--bd-accent-bg)'
                        : 'var(--bd-item)',
                    }}
                  >
                    <input
                      type="radio"
                      name="workspace"
                      value={ws.descriptor.id}
                      checked={active}
                      onChange={() => setWorkspaceId(ws.descriptor.id)}
                      style={{ accentColor: 'var(--bd-accent)' }}
                    />
                    <span
                      className="font-medium"
                      style={{
                        color: active ? 'var(--bd-accent)' : 'var(--bd-text)',
                      }}
                    >
                      {ws.descriptor.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div
            className="text-[12px]"
            style={{ color: 'var(--bd-text-faint)' }}
          >
            Saving to{' '}
            <span style={{ color: 'var(--bd-text-soft)' }}>
              {soleWorkspaceLabel ?? 'the active workspace'}
            </span>
            .
          </div>
        )}

        <div className="mt-2 flex items-center justify-end gap-2">
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md border px-3 py-1.5 text-[13px] font-medium disabled:opacity-40"
            style={{
              background: 'var(--bd-accent)',
              borderColor: 'transparent',
              color: 'white',
            }}
          >
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
