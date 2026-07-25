/**
 * Canvas view — wraps the editing canvas with an optional live preview.
 *
 * Two views of the SAME contract (reconciles Decision #12):
 *   - Wireframe → the primary editing surface (select, drag, structure).
 *   - Preview   → a read-only LIVE render of the current contract via the
 *                 real Blueprint runtime (tw flavor), for a composition
 *                 sanity-check. NOT a design-system source of truth — it
 *                 adopts the consumer's flavor/theme on use.
 *
 * The toggle only appears once there's something to preview (root set);
 * on the empty launcher it stays hidden. Preview defaults OFF so the
 * wireframe remains the primary surface.
 *
 * Reuses `TemplatePreview` — the single module that imports
 * `@dashforge/blueprint` — so the runtime weight stays in one lazy chunk,
 * shared with the marketplace preview.
 */
import { Suspense, lazy, useState } from 'react';
import { useBuilderState } from '../state/BuilderStateContext';
import { CanvasPanel } from './CanvasPanel';

const TemplatePreview = lazy(() => import('./TemplatePreview'));

type Mode = 'wireframe' | 'preview';

function CanvasToolbar({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div
      className="flex flex-none items-center gap-3 border-b px-4 py-2"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
    >
      <div
        className="flex gap-1 rounded-lg border p-[3px]"
        style={{ borderColor: 'var(--bd-border)' }}
      >
        {(['wireframe', 'preview'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMode(m)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] font-medium capitalize"
            style={{
              background: mode === m ? 'var(--bd-canvas)' : 'transparent',
              color: mode === m ? 'var(--bd-text)' : 'var(--bd-text-soft)',
            }}
          >
            <i
              className={`ti ti-${m === 'wireframe' ? 'layout-grid' : 'eye'} text-[14px]`}
              aria-hidden
            />
            {m}
          </button>
        ))}
      </div>
      {mode === 'preview' && (
        <span className="text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
          <i className="ti ti-info-circle mr-1 align-[-2px]" aria-hidden />
          Reference composition — adopts your design system on use, not this theme.
        </span>
      )}
    </div>
  );
}

function ContractPreview() {
  const { contract } = useBuilderState();
  return (
    <div className="bd-grid flex-1 overflow-y-auto p-8" style={{ background: 'var(--bd-canvas)' }}>
      <div className="mx-auto max-w-3xl">
        <Suspense
          fallback={
            <div className="p-10 text-center text-[13px]" style={{ color: 'var(--bd-text-faint)' }}>
              Loading preview…
            </div>
          }
        >
          <TemplatePreview contract={contract} maxHeightVh={80} />
        </Suspense>
      </div>
    </div>
  );
}

export function CanvasView() {
  const { contract } = useBuilderState();
  const [mode, setMode] = useState<Mode>('wireframe');
  const hasContract = contract.root !== null;
  const showPreview = hasContract && mode === 'preview';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {hasContract && <CanvasToolbar mode={mode} onMode={setMode} />}
      {showPreview ? <ContractPreview /> : <CanvasPanel />}
    </div>
  );
}
