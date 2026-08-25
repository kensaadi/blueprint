/**
 * AI copilot modal — plain-English → validated contract.
 *
 * The moat is grounding + validation: Foundry hands the model the closed
 * catalog (from the frozen #20 schema) and the orchestrator
 * (`ai/generateContract`) validates every result with blueprint-core,
 * repairing until it passes. So this UI only ever loads a VALID tree onto
 * the canvas — the worst case is a retry, never broken JSON.
 *
 * Gated on the `ai-assist` feature: Pro+ gets the prompt, Community gets
 * the upgrade CTA. The button stays in the header for everyone so the
 * feature is discoverable (the funnel).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@dashforge/tw';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useFeature } from '../licensing/LicenseContext';
import { useSignedIn } from '../hooks/useSession';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { useBuilderState, useBuilderDispatch } from '../state/BuilderStateContext';
import { generateContract } from '../ai/generateContract';
import { getAIQuota } from '../api/ai/service';

type AIModalProps = { open: boolean; onClose: () => void };

export function AIModal({ open, onClose }: AIModalProps) {
  const hasAI = useFeature('ai-assist');
  const signedIn = useSignedIn();
  // Pro gets AI via its license; a signed-in Community user gets the free
  // teaser via the workspace proxy. Either way the prompt is available.
  const canUseAI = hasAI || (HAS_WORKSPACE && signedIn);
  const isTeaser = canUseAI && !hasAI;
  const { contract } = useBuilderState();
  const dispatch = useBuilderDispatch();
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useFocusTrap(modalRootRef, open);

  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const canvasHasContent = contract.root !== null;

  // Esc to close; autofocus the prompt on open.
  useEffect(() => {
    if (!open) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => textareaRef.current?.focus(), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  // Pull the remaining monthly quota when an entitled user opens the modal.
  useEffect(() => {
    if (!open || !canUseAI) return;
    let cancelled = false;
    void getAIQuota().then((r) => {
      if (!cancelled && r.data) setRemaining(r.data.remaining);
    });
    return () => {
      cancelled = true;
    };
  }, [open, canUseAI]);

  if (!open) return null;

  const submit = async () => {
    const description = prompt.trim();
    if (!description || busy) return;
    setBusy(true);
    setError(null);
    const result = await generateContract(description);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    dispatch({ type: 'replaceContract', contract: result.contract });
    setRemaining(Math.max(0, result.quota.limit - result.quota.used));
    setPrompt('');
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.35)', zIndex: 1100 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Generate with AI"
        className="flex w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          background: 'var(--bd-surface, var(--bd-canvas))',
          borderColor: 'var(--bd-border)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--bd-border)' }}
        >
          <i
            className="ti ti-sparkles text-[16px]"
            style={{ color: 'var(--bd-text-soft)' }}
            aria-hidden
          />
          <span className="text-[14px] font-medium" style={{ color: 'var(--bd-text)' }}>
            Generate with AI
          </span>
          {canUseAI && remaining !== null && (
            <span
              className="ml-auto text-[11px]"
              style={{ color: 'var(--bd-text-faint)' }}
            >
              {remaining} {isTeaser ? 'free' : 'left'} this month
            </span>
          )}
        </div>

        {canUseAI ? (
          <div className="flex flex-col gap-3 p-4">
            <textarea
              ref={textareaRef}
              className="min-h-[120px] w-full resize-y rounded-md border bg-transparent p-3 text-[14px] outline-none"
              style={{ borderColor: 'var(--bd-border)', color: 'var(--bd-text)' }}
              placeholder="Describe the screen — e.g. “a sign-up form with name, email, password and a submit button”"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void submit();
                }
              }}
              disabled={busy}
            />

            {canvasHasContent && (
              <p className="text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
                <i className="ti ti-alert-triangle mr-1" aria-hidden />
                This replaces the current canvas.
              </p>
            )}

            {isTeaser && (
              <p className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
                <i className="ti ti-sparkles mr-1" aria-hidden />
                You're on the free AI teaser. Upgrade to Pro for 200 generations a month.
              </p>
            )}

            {error && (
              <p
                className="rounded-md border px-3 py-2 text-[12px]"
                style={{
                  borderColor: 'var(--bd-danger, #ef4444)',
                  color: 'var(--bd-danger, #ef4444)',
                }}
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" color="secondary" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="solid"
                color="primary"
                onClick={() => void submit()}
                disabled={busy || prompt.trim() === ''}
              >
                {busy ? (
                  <>
                    <i className="ti ti-loader-2 mr-1 animate-spin" aria-hidden />
                    Generating…
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-6 text-center">
            <i
              className="ti ti-sparkles mx-auto text-[28px]"
              style={{ color: 'var(--bd-primary, #6366f1)' }}
              aria-hidden
            />
            <p className="text-[14px] font-medium" style={{ color: 'var(--bd-text)' }}>
              Describe it, and AI builds it.
            </p>
            <p className="text-[13px]" style={{ color: 'var(--bd-text-soft)' }}>
              Turn a plain-English description into a ready-to-edit layout.
              Available on Pro and above — activate a license to switch it on.
            </p>
            <div className="mt-1 flex justify-center">
              <Button variant="ghost" color="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
