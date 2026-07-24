/**
 * <ValidationErrorCard /> — reusable rich error display.
 *
 * Renders ONE ValidationError with:
 *   - breadcrumb of ancestor atoms (root › stack › form#kyc › field[2])
 *   - severity badge (error / warning)
 *   - raw JSON pointer + code (when set)
 *   - expected vs received (when the validator captured them)
 *   - JSON snippet of the offending atom with the failing prop highlighted
 *
 * Two consumers:
 *   - <ValidationErrorPanel> (inline, lenient + strict block render)
 *   - <DiagnosticsTab> in DashBlueprintDevtools (devtools drawer)
 *
 * Pure presentation — receives error + document and renders the card.
 */
import { useMemo } from 'react';
import type { ValidationError } from '@dashforge/blueprint-core';
import {
  humanizePath,
  nearestNode,
  formatNodeSnippet,
  pointerLeaf,
} from '@dashforge/blueprint-core';

type Variant = 'inline' | 'panel';

export function ValidationErrorCard({
  error,
  contract,
  variant = 'inline',
}: {
  error: ValidationError;
  contract?: unknown;
  variant?: Variant;
}) {
  const breadcrumb = useMemo(() => humanizePath(contract, error.path), [contract, error.path]);
  const node = useMemo(() => nearestNode(contract, error.path), [contract, error.path]);
  const snippet = useMemo(() => (node ? formatNodeSnippet(node, 2) : null), [node]);
  const offendingProp = useMemo(() => pointerLeaf(error.path), [error.path]);

  const isError = error.severity === 'error';
  const palette = variant === 'panel'
    ? (isError
        ? 'border-red-500/40 bg-red-500/5 text-red-100'
        : 'border-amber-500/40 bg-amber-500/5 text-amber-100')
    : (isError
        ? 'border-red-300 bg-red-50 text-red-900'
        : 'border-amber-300 bg-amber-50 text-amber-900');

  const accent = variant === 'panel'
    ? (isError ? 'bg-red-500/25 text-red-200' : 'bg-amber-500/25 text-amber-200')
    : (isError ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800');

  const codeSurface = variant === 'panel'
    ? 'bg-neutral-950 text-neutral-100 border-neutral-800'
    : 'bg-white text-neutral-900 border-neutral-300';

  return (
    <div className={`rounded-md border p-3 ${palette}`}>
      {/* Header: severity + breadcrumb + code */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${accent}`}>
          {error.severity}
        </span>
        <span className="font-mono text-xs">{breadcrumb}</span>
        {error.code && (
          <span className="ml-auto rounded bg-black/10 px-1.5 py-0.5 font-mono text-[10px] uppercase">
            {error.code}
          </span>
        )}
      </div>

      {/* Message */}
      <div className="mb-2 text-sm">{error.message}</div>

      {/* Expected vs received */}
      {(error.expected || error.received) && (
        <div className="mb-2 grid grid-cols-[80px_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          {error.expected && (
            <>
              <span className="opacity-70">Expected:</span>
              <code>{error.expected}</code>
            </>
          )}
          {error.received && (
            <>
              <span className="opacity-70">Received:</span>
              <code>{error.received}</code>
            </>
          )}
        </div>
      )}

      {/* Raw path (small print) */}
      <div className="mb-2 font-mono text-[10px] opacity-60">
        path: {error.path || '/'}{offendingProp ? ` · prop: ${offendingProp}` : ''}
      </div>

      {/* Snippet of the offending atom */}
      {snippet && (
        <pre className={`overflow-x-auto rounded border p-2 font-mono text-[11px] leading-relaxed ${codeSurface}`}>
          {snippet}
        </pre>
      )}
    </div>
  );
}
