/**
 * File browser modal — Cmd+O. Lists every file in every registered
 * workspace, ranked by recency. MVP scope: local workspace only (the
 * S3 / git adapters land in Sprint C, but this component already
 * iterates `listWorkspaces()` so they slot in without a rewrite).
 *
 * Layout:
 *   - Title + close button
 *   - Search box (fuzzy over file name — reuses the palette scorer)
 *   - Scrollable rows: name · workspace label · updated-at · [× rename/delete]
 *   - Footer hint (↑↓ navigate · ↵ open · esc close)
 *
 * Design notes:
 *   - Portalled to document.body so it floats over the AppShell just
 *     like the command palette.
 *   - Reads the workspace index lazily on open — no need to keep
 *     watching it while the modal is closed.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FileEntry, WorkspaceId } from './types';
import { listWorkspaces } from './registry';
import { fuzzyScore, highlightRuns } from '../commands/fuzzy';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useConfirm, usePrompt } from '../primitives/DialogFlow';

type FileWithWorkspace = FileEntry & {
  workspaceId: WorkspaceId;
  workspaceLabel: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen: (workspaceId: WorkspaceId, fileId: string) => void | Promise<void>;
  onRename: (workspaceId: WorkspaceId, fileId: string, newName: string) => void | Promise<void>;
  onDelete: (workspaceId: WorkspaceId, fileId: string) => void | Promise<void>;
};

export function FileBrowserModal({
  open,
  onClose,
  onOpen,
  onRename,
  onDelete,
}: Props) {
  const [files, setFiles] = useState<FileWithWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  // Workspace filter — `null` shows every workspace's files at once.
  const [workspaceFilter, setWorkspaceFilter] = useState<WorkspaceId | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(modalRootRef, open);
  const promptDialog = usePrompt();
  const confirmDialog = useConfirm();

  // Reload the workspace listing every time the modal opens so a Save
  // As from another surface reflects immediately on the next reopen.
  // Intentional setState-in-effect — parent-toggled `open` is the
  // external signal this effect is syncing to.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery('');
    setCursor(0);
    setWorkspaceFilter(null);
    queueMicrotask(() => inputRef.current?.focus());
    let cancelled = false;
    setFiles([]);
    setLoading(true);
    (async () => {
      const collected: FileWithWorkspace[] = [];
      for (const ws of listWorkspaces()) {
        const list = await ws.list();
        if (cancelled) return;
        for (const entry of list) {
          collected.push({
            ...entry,
            workspaceId: ws.descriptor.id,
            workspaceLabel: ws.descriptor.label,
          });
        }
        // Incremental reveal: as each workspace resolves, show its
        // files so the fast local list doesn't wait on the slow S3
        // simulation.
        setFiles([...collected]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Apply workspace filter FIRST so fuzzy scoring only considers the
  // visible pool — no wasted work + more predictable cursor bounds.
  const scoped = useMemo(
    () =>
      workspaceFilter
        ? files.filter((f) => f.workspaceId === workspaceFilter)
        : files,
    [files, workspaceFilter],
  );
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q)
      return scoped.map((f) => ({
        file: f,
        match: null as ReturnType<typeof fuzzyScore>,
      }));
    const scored = scoped
      .map((f) => ({ file: f, match: fuzzyScore(q, f.name) }))
      .filter(
        (r): r is {
          file: FileWithWorkspace;
          match: NonNullable<ReturnType<typeof fuzzyScore>>;
        } => r.match !== null,
      );
    scored.sort((a, b) => b.match.score - a.match.score);
    return scored;
  }, [scoped, query]);

  useEffect(() => {
    // Legitimate clamp — mirrors the pattern in CommandPalette.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cursor >= filtered.length) setCursor(Math.max(0, filtered.length - 1));
  }, [filtered.length, cursor]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
        return;
      }
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = filtered[cursor];
        if (!target) return;
        void onOpen(target.file.workspaceId, target.file.id);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, cursor, onOpen, onClose]);

  // Scroll active row into view
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-file-index="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

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
        aria-label="Open file"
        className="flex w-[560px] max-w-[92vw] flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          background: 'var(--bd-surface, var(--bd-canvas))',
          borderColor: 'var(--bd-border)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header + search */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: 'var(--bd-border)' }}
        >
          <i
            className="ti ti-folder-open text-[16px]"
            style={{ color: 'var(--bd-text-soft)' }}
            aria-hidden
          />
          <input
            ref={inputRef}
            className="w-full bg-transparent text-[14px] outline-none"
            placeholder="Open file — search by name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            style={{ color: 'var(--bd-text)' }}
          />
        </div>

        {/* Workspace filter chips — hidden until at least two
            workspaces are registered so a single-workspace setup
            keeps the modal minimal. */}
        <WorkspaceChips
          workspaces={listWorkspaces()}
          active={workspaceFilter}
          onChange={(id) => {
            setWorkspaceFilter(id);
            setCursor(0);
          }}
          counts={workspaceCounts(files)}
        />

        {/* Rows */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div
              className="p-4 text-center text-[13px]"
              style={{ color: 'var(--bd-text-soft)' }}
              role="status"
              aria-live="polite"
            >
              {loading
                ? 'Loading files from workspaces…'
                : files.length === 0
                  ? 'No files yet. Save one with ⌘⇧S.'
                  : 'No matching files.'}
            </div>
          ) : (
            filtered.map((entry, idx) => (
              <FileRow
                key={`${entry.file.workspaceId}:${entry.file.id}`}
                entry={entry}
                index={idx}
                active={idx === cursor}
                onHover={setCursor}
                onOpen={() => {
                  void onOpen(entry.file.workspaceId, entry.file.id);
                  onClose();
                }}
                onRename={async () => {
                  const next = await promptDialog({
                    title: 'Rename file',
                    label: 'File name',
                    defaultValue: entry.file.name,
                    confirmLabel: 'Rename',
                  });
                  if (!next || next === entry.file.name) return;
                  await onRename(
                    entry.file.workspaceId,
                    entry.file.id,
                    next,
                  );
                  // Refresh listing after rename
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === entry.file.id
                        ? { ...f, name: next.trim() }
                        : f,
                    ),
                  );
                }}
                onDelete={async () => {
                  const ok = await confirmDialog({
                    title: 'Delete file',
                    body: `Delete "${entry.file.name}"? This can't be undone.`,
                    confirmLabel: 'Delete',
                    danger: true,
                  });
                  if (!ok) return;
                  await onDelete(entry.file.workspaceId, entry.file.id);
                  setFiles((prev) => prev.filter((f) => f.id !== entry.file.id));
                }}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t px-4 py-2 text-[11px]"
          style={{
            borderColor: 'var(--bd-border)',
            color: 'var(--bd-text-faint)',
          }}
        >
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span className="flex items-center gap-2">
            {loading && (
              <span aria-live="polite" role="status">
                <i
                  className="ti ti-loader-2 animate-spin"
                  aria-hidden
                />{' '}
                loading remote…
              </span>
            )}
            <span>
              {filtered.length} file{filtered.length === 1 ? '' : 's'}
            </span>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FileRow({
  entry,
  index,
  active,
  onHover,
  onOpen,
  onRename,
  onDelete,
}: {
  entry: { file: FileWithWorkspace; match: ReturnType<typeof fuzzyScore> };
  index: number;
  active: boolean;
  onHover: (i: number) => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { file, match } = entry;
  const runs = match ? highlightRuns(file.name, match.positions) : null;
  return (
    <div
      data-file-index={index}
      onMouseEnter={() => onHover(index)}
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-[13px] transition-colors"
      style={{
        background: active ? 'var(--bd-accent-bg)' : 'transparent',
        color: active ? 'var(--bd-accent)' : 'var(--bd-text)',
      }}
    >
      <i
        className="ti ti-file-text shrink-0 text-[15px]"
        style={{ color: active ? 'var(--bd-accent)' : 'var(--bd-text-soft)' }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">
        {runs
          ? runs.map((run, i) => (
              <span
                key={i}
                style={{
                  fontWeight: run.matched ? 600 : 400,
                  color:
                    run.matched && active ? 'var(--bd-accent)' : undefined,
                }}
              >
                {run.text}
              </span>
            ))
          : file.name}
      </span>
      <span
        className="shrink-0 text-[11px]"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        {file.workspaceLabel}
      </span>
      <span
        className="shrink-0 text-[11px]"
        style={{ color: 'var(--bd-text-faint)' }}
        title={file.updatedAt}
      >
        {formatUpdatedAt(file.updatedAt)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRename();
        }}
        aria-label={`Rename ${file.name}`}
        title="Rename"
        className="rounded p-1"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        <i className="ti ti-edit text-[13px]" aria-hidden />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${file.name}`}
        title="Delete"
        className="rounded p-1"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        <i className="ti ti-trash text-[13px]" aria-hidden />
      </button>
    </div>
  );
}

function workspaceCounts(files: FileWithWorkspace[]): Record<WorkspaceId, number> {
  const out: Record<WorkspaceId, number> = {};
  for (const f of files) out[f.workspaceId] = (out[f.workspaceId] ?? 0) + 1;
  return out;
}

const KIND_ICON: Record<string, string> = {
  local: 'device-desktop',
  s3: 'cloud',
  git: 'brand-git',
  custom: 'plug-connected',
};

function WorkspaceChips({
  workspaces,
  active,
  onChange,
  counts,
}: {
  workspaces: import('./types').WorkspaceAdapter[];
  active: WorkspaceId | null;
  onChange: (id: WorkspaceId | null) => void;
  counts: Record<WorkspaceId, number>;
}) {
  // Show the row only when there's an actual choice of workspace.
  if (workspaces.length < 2) return null;
  return (
    <div
      className="flex items-center gap-1.5 border-b px-3 py-2 overflow-x-auto"
      style={{ borderColor: 'var(--bd-border)' }}
    >
      <Chip
        active={active === null}
        onClick={() => onChange(null)}
        icon="apps"
        label="All"
      />
      {workspaces.map((ws) => (
        <Chip
          key={ws.descriptor.id}
          active={active === ws.descriptor.id}
          onClick={() => onChange(ws.descriptor.id)}
          icon={KIND_ICON[ws.descriptor.kind] ?? 'server-2'}
          label={ws.descriptor.label}
          count={counts[ws.descriptor.id]}
        />
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition-colors"
      style={{
        borderColor: active ? 'var(--bd-accent)' : 'var(--bd-border)',
        background: active ? 'var(--bd-accent-bg)' : 'transparent',
        color: active ? 'var(--bd-accent)' : 'var(--bd-text-soft)',
      }}
    >
      <i className={`ti ti-${icon} text-[13px]`} aria-hidden />
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className="rounded px-1 py-0.5 text-[10px] font-mono"
          style={{
            background: active ? 'var(--bd-accent)' : 'var(--bd-item)',
            color: active ? 'white' : 'var(--bd-text-faint)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Compact relative-time formatter. jsdom + real browsers all support
 * `Intl.RelativeTimeFormat`; fall back to the ISO date if not.
 */
function formatUpdatedAt(iso: string): string {
  try {
    const then = Date.parse(iso);
    if (Number.isNaN(then)) return iso.slice(0, 10);
    const now = Date.now();
    const diffMs = now - then;
    const rt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    if (diffMs < 60_000) return 'just now';
    if (diffMs < 3600_000)
      return rt.format(-Math.round(diffMs / 60_000), 'minute');
    if (diffMs < 86_400_000)
      return rt.format(-Math.round(diffMs / 3600_000), 'hour');
    if (diffMs < 30 * 86_400_000)
      return rt.format(-Math.round(diffMs / 86_400_000), 'day');
    return iso.slice(0, 10);
  } catch {
    return iso.slice(0, 10);
  }
}
