/**
 * Status bar — thin strip at the bottom of the shell showing contextual
 * info: workspace, file path, node count, contract size, theme,
 * keyboard hints.
 *
 * `nodeCount` and `contractKb` are derived live from BuilderState so
 * the strip reflects the tree at every action. Everything else is
 * still prop-driven (workspace + file path come from the workspace
 * layer that lands in Phase 3b; theme comes from BuilderApp).
 *
 * Inspired by Linear / VSCode / Cursor's bottom status strip. Provides
 * orientation without taking screen real-estate from the canvas.
 */
import { useMemo } from 'react';
import { Typography } from '@dashforge/tw';
import { useBuilderState, useBuilderDirty } from '../state/BuilderStateContext';
import { countNodes } from '../state/reducer';

type StatusBarProps = {
  workspace: string;
  filePath: string;
  theme: 'dark' | 'light';
};

export function StatusBar({ workspace, filePath, theme }: StatusBarProps) {
  const { contract } = useBuilderState();
  const dirty = useBuilderDirty();
  // Round to 0.1 kB so the counter doesn't jitter on tiny prop edits.
  // Uses JSON length as a byte proxy — good enough for a status hint.
  const { nodeCount, contractKb } = useMemo(() => {
    const bytes = new Blob([JSON.stringify(contract)]).size;
    return {
      nodeCount: countNodes(contract.root),
      contractKb: bytes / 1024,
    };
  }, [contract]);

  // Dirty/clean label — flips to "unsaved" the moment the buffer
  // diverges from what's on disk, back to "saved" as soon as the
  // debounced write completes. Cloud icon swaps for a solid dot when
  // dirty so it reads even at a glance.
  const savedLabel = dirty ? 'unsaved changes' : 'saved';

  return (
    <div
      className="flex h-7 shrink-0 items-center gap-4 border-t px-4 text-[12px]"
      style={{
        background: 'var(--bd-status)',
        borderColor: 'var(--bd-border)',
        color: 'var(--bd-text-soft)',
      }}
    >
      <StatusItem icon="server-2" label={workspace} />
      <Divider />
      <StatusItem icon="file-text" label={filePath} />
      <Divider />
      <StatusItem icon="hierarchy-3" label={`${nodeCount} node${nodeCount === 1 ? '' : 's'}`} />
      <Divider />
      <StatusItem icon="weight" label={`${contractKb.toFixed(1)} kB`} />
      <Divider />
      <StatusItem
        icon={dirty ? 'point-filled' : 'cloud-check'}
        label={savedLabel}
        accent={dirty}
      />

      <div className="ml-auto flex items-center gap-4">
        <StatusItem
          icon={theme === 'dark' ? 'moon' : 'sun'}
          label={`${theme} theme`}
        />
        <Divider />
        <KbdHint keys={['⌘', 'O']} action="Open" />
        <KbdHint keys={['⌘', 'P']} action="Quick open" />
      </div>
    </div>
  );
}

function StatusItem({
  icon,
  label,
  accent,
}: {
  icon: string;
  label: string;
  accent?: boolean;
}) {
  const color = accent ? 'var(--bd-accent)' : 'var(--bd-text-soft)';
  return (
    <div className="flex items-center gap-1.5">
      <i className={`ti ti-${icon} text-[13px]`} style={{ color }} aria-hidden />
      <Typography variant="caption" className="text-[12px]" style={{ color }}>
        {label}
      </Typography>
    </div>
  );
}

function Divider() {
  return (
    <span
      className="h-3 w-px"
      style={{ background: 'var(--bd-border-strong)' }}
      aria-hidden
    />
  );
}

function KbdHint({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {keys.map((k) => (
          <kbd
            key={k}
            className="rounded px-1 py-0.5 font-mono text-[10px]"
            style={{ background: 'var(--bd-item)', color: 'var(--bd-text-soft)' }}
          >
            {k}
          </kbd>
        ))}
      </span>
      <Typography variant="caption" className="text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
        {action}
      </Typography>
    </div>
  );
}
