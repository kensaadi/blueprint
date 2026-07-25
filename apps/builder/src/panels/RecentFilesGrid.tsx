/**
 * RecentFilesGrid — compact "pick up where you left off" section for
 * the Canvas empty state. Iterates every registered workspace, merges
 * their file listings, and shows the top 6 by `updatedAt`.
 *
 * Design choices:
 *   - Incremental reveal per workspace (fast local first, S3/git as
 *     they resolve). Mirrors the FileBrowserModal to feel consistent.
 *   - Renders NOTHING when no workspace returned any file — the empty
 *     state falls back to templates only, no ghost heading.
 *   - Click opens the file. The dirty-guard on `useFileOps.open` is
 *     currently absent, but the empty state IS the "no content"
 *     situation so no data is at risk. If the user has a fileRef
 *     without content, opening another file cleanly swaps.
 */
import { useEffect, useMemo, useState } from 'react';
import { Typography } from '@dashforge/tw';
import { useFileOps } from '../hooks/useFileOps';
import { listWorkspaces } from '../workspaces/registry';
import type { FileEntry, WorkspaceId } from '../workspaces/types';
import { iconForType } from '../data/typeIcons';

type FileWithWorkspace = FileEntry & {
  workspaceId: WorkspaceId;
  workspaceLabel: string;
};

const MAX_RECENT = 6;

/** Compact humanized "N unit ago" — no dep, deterministic in tests. */
function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const s = Math.round(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo === 1 ? '' : 's'} ago`;
}

export function RecentFilesGrid() {
  const { open } = useFileOps();
  const [files, setFiles] = useState<FileWithWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  // Incremental fetch — each workspace resolves independently and the
  // list rolls in as each promise settles. `cancelled` guards against
  // stale writes if the component unmounts before all workspaces reply.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setFiles([]);
    const collected: FileWithWorkspace[] = [];
    const jobs = listWorkspaces().map(async (ws) => {
      try {
        const list = await ws.list();
        if (cancelled) return;
        for (const entry of list) {
          collected.push({
            ...entry,
            workspaceId: ws.descriptor.id,
            workspaceLabel: ws.descriptor.label,
          });
        }
        setFiles([...collected]);
      } catch {
        // Workspace read failed — skip silently. Same policy as the
        // FileBrowserModal: one broken adapter doesn't nuke the whole
        // list.
      }
    });
    void Promise.allSettled(jobs).then(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const top = useMemo(
    () =>
      [...files]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, MAX_RECENT),
    [files],
  );

  // No files anywhere — collapse the whole section. The empty state
  // still has the templates below, which is a better first-time
  // impression than "Recent files — none".
  if (!loading && top.length === 0) return null;

  return (
    <div className="mt-8">
      <Typography
        variant="caption"
        sx="mb-3 block text-center text-[12px] font-medium uppercase tracking-[0.1em]"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Recent files
      </Typography>
      {loading && top.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[86px] animate-pulse rounded-lg border"
              style={{
                borderColor: 'var(--bd-border)',
                background: 'var(--bd-panel)',
              }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {top.map((f) => (
            <button
              key={`${f.workspaceId}:${f.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void open(f.workspaceId, f.id);
              }}
              className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors"
              style={{
                borderColor: 'var(--bd-border)',
                background: 'var(--bd-panel)',
                color: 'var(--bd-text)',
              }}
              title={`Open ${f.name} from ${f.workspaceLabel}`}
            >
              <div className="flex w-full items-center gap-2">
                <i
                  className={`ti ti-${iconForType('form')} text-[18px]`}
                  style={{ color: 'var(--bd-accent)' }}
                  aria-hidden
                />
                <Typography
                  variant="body2"
                  sx="truncate text-[13px] font-semibold"
                  style={{ color: 'var(--bd-text)' }}
                >
                  {f.name}
                </Typography>
              </div>
              <div className="flex w-full items-center justify-between gap-2 text-[11px]">
                <span style={{ color: 'var(--bd-accent)' }}>{f.workspaceLabel}</span>
                <span style={{ color: 'var(--bd-text-faint)' }}>
                  {relativeTime(f.updatedAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
