/**
 * Source drawer — bottom collapsible JSON view with line numbers.
 *
 * Renders the live contract from BuilderState. Small in-process
 * tokenizer highlights JSON keys / string values / numbers — enough
 * for read-only display. Phase 3c will wire edit mode, which parses
 * the textarea back into the state via `replaceContract`.
 *
 * DOGFOOD note (G-12 / G-14): still no `<Drawer position="bottom">`
 * in @dashforge/tw. When it lands, this component swaps for it.
 */
import { useMemo, useState } from 'react';
import { Typography, Button } from '@dashforge/tw';
import { PanelShell } from '../primitives/PanelShell';
import { useBuilderState } from '../state/BuilderStateContext';
import { copyContract } from '../state/exportContract';

type CopyState = 'idle' | 'ok' | 'fail';

export function SourceDrawer() {
  const { contract } = useBuilderState();
  // JSON.stringify is deterministic here — no cycles, no functions.
  // Regenerating on every action is fine at palette-scale contracts.
  const lines = useMemo(() => tokenizeJson(contract), [contract]);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const onCopy = () => {
    void copyContract(contract).then((ok) => {
      setCopyState(ok ? 'ok' : 'fail');
      window.setTimeout(() => setCopyState('idle'), 1600);
    });
  };

  return (
    <PanelShell
      className="w-full bd-source"
      style={{ height: '180px', borderLeft: 0, borderRight: 0, borderBottom: 0 }}
      padding="0"
    >
      <div className="flex h-full flex-col">
        <SourceDrawerHeader onCopy={onCopy} copyState={copyState} />
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <pre className="font-mono text-[13px] leading-[1.6]" style={{ color: 'var(--bd-text)' }}>
            {lines.map((line, i) => (
              <span
                key={i}
                className="bd-source-line"
                // Highlighter output is generated in-process from the
                // contract we own — never external HTML.
                dangerouslySetInnerHTML={{ __html: line }}
              />
            ))}
          </pre>
        </div>
      </div>
      <style>{`
        .bd-syntax-k { color: var(--bd-syntax-k); }
        .bd-syntax-s { color: var(--bd-syntax-s); }
        .bd-syntax-n { color: var(--bd-syntax-n); }
      `}</style>
    </PanelShell>
  );
}

function SourceDrawerHeader({
  onCopy,
  copyState,
}: {
  onCopy: () => void;
  copyState: CopyState;
}) {
  const copyLabel =
    copyState === 'ok' ? 'Copied!' : copyState === 'fail' ? 'Copy failed' : 'Copy';
  return (
    <div
      className="flex shrink-0 items-center justify-between border-b px-4 py-2"
      style={{ borderColor: 'var(--bd-border)' }}
    >
      <div className="flex items-center gap-2">
        <i
          className="ti ti-code text-[14px]"
          style={{ color: 'var(--bd-text-soft)' }}
          aria-hidden
        />
        <Typography
          variant="caption"
          sx="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: 'var(--bd-text-soft)' }}
        >
          Source
        </Typography>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px]"
          style={{ background: 'var(--bd-item)', color: 'var(--bd-text-faint)' }}
        >
          read-only · ⌘E
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" color="secondary" size="sm">
          Format
        </Button>
        <Button variant="ghost" color="secondary" size="sm" onClick={onCopy}>
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Minimal JSON tokenizer for read-only display. Splits the pretty-
 * printed JSON on line boundaries and highlights keys, strings and
 * numbers. Not a real parser — the input is JSON.stringify output, so
 * the shape is predictable and a pattern match is sufficient.
 */
function tokenizeJson(value: unknown): string[] {
  const raw = JSON.stringify(value, null, 2) ?? '';
  return raw.split('\n').map(highlightLine);
}

/**
 * Escape HTML metacharacters — highlighted lines are injected via
 * `dangerouslySetInnerHTML`, so any user-controlled string values must
 * be neutralised before we run the syntax pass.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightLine(line: string): string {
  const safe = esc(line);
  // Match `"key":` first so it wins over generic strings.
  return safe
    .replace(/&quot;([^&]*)&quot;(?=\s*:)/g, '<span class="bd-syntax-k">&quot;$1&quot;</span>')
    .replace(/(:\s*)&quot;([^&]*)&quot;/g, '$1<span class="bd-syntax-s">&quot;$2&quot;</span>')
    .replace(/(:\s*)(-?\d+(?:\.\d+)?)/g, '$1<span class="bd-syntax-n">$2</span>');
}
