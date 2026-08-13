/**
 * Version history — the user-facing side of the `versioning` feature.
 *
 * A "History" affordance that appears ONLY when the open file lives in a
 * backend that keeps history (the remote WS adapter exposes `versions`)
 * AND the license entitles `versioning`. Lists every saved version and
 * lets the user restore one — restore re-applies that version's content
 * as a NEW version server-side (append-only) and loads it onto the
 * canvas. Self-contained: reads everything from context, no prop
 * threading into the header.
 */
import { useState } from 'react';
import { useBuilderState, useBuilderDispatch } from '../state/BuilderStateContext';
import { useFeature } from '../licensing/LicenseContext';
import { getWorkspace } from '../workspaces/registry';
import { REMOTE_WORKSPACE_ID } from '../workspaces/remoteWorkspace';
import { downloadContract, filenameForVersion } from '../state/exportContract';
import type { VersionEntry, WorkspaceVersioning } from '../workspaces/types';

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function HistoryButton() {
  const { fileRef } = useBuilderState();
  const dispatch = useBuilderDispatch();
  const hasVersioning = useFeature('versioning');

  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  // Show for a saved file on the history-keeping remote backend, when
  // entitled. We key off the remote id (not a live registry lookup) so
  // visibility survives the adapter's async (re)registration on reload;
  // the adapter itself is resolved lazily at click time.
  if (!fileRef || fileRef.workspaceId !== REMOTE_WORKSPACE_ID || !hasVersioning) {
    return null;
  }

  function versioningOf(): WorkspaceVersioning | null {
    return getWorkspace(fileRef!.workspaceId)?.versions ?? null;
  }

  async function openHistory() {
    setOpen(true);
    setVersions(null);
    setError(null);
    const v = versioningOf();
    if (!v) {
      setError('Reconnect your workspace to view history.');
      return;
    }
    try {
      setVersions(await v.list(fileRef!.fileId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load history.');
    }
  }

  async function restore(version: number) {
    const v = versioningOf();
    if (!v) return;
    setBusy(version);
    setError(null);
    try {
      const file = await v.restore(fileRef!.fileId, version);
      dispatch({ type: 'replaceContract', contract: file.contract });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore.');
    } finally {
      setBusy(null);
    }
  }

  // Export a specific version as a .json file — the artifact handed off to
  // the backend. Reads that version's content without touching the canvas.
  async function download(version: number) {
    const v = versioningOf();
    if (!v) return;
    setDownloading(version);
    setError(null);
    try {
      const file = await v.read(fileRef!.fileId, version);
      if (!file) {
        setError('That version is no longer available.');
        return;
      }
      downloadContract(file.contract, filenameForVersion(file.contract, { version }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export.');
    } finally {
      setDownloading(null);
    }
  }

  const latest = versions && versions.length > 0 ? versions[0].version : 0;

  return (
    <>
      <button
        type="button"
        onClick={openHistory}
        title="Version history"
        className="flex cursor-pointer items-center gap-[5px] rounded-md px-2 py-1 text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
        style={{ color: 'var(--bd-text-soft)' }}
      >
        <i className="ti ti-history text-[15px]" aria-hidden />
        History
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Version history"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border"
            style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: 'var(--bd-border)' }}
            >
              <div className="text-[14px] font-semibold" style={{ color: 'var(--bd-text)' }}>
                History · {fileRef.name}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="cursor-pointer rounded-md p-1 text-[18px]"
                style={{ color: 'var(--bd-text-soft)' }}
              >
                <i className="ti ti-x" aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2">
              {error && (
                <div className="px-3 py-2 text-[12px]" style={{ color: 'var(--bd-danger, #dc2626)' }}>
                  {error}
                </div>
              )}
              {versions === null && !error && (
                <div className="px-3 py-6 text-center text-[13px]" style={{ color: 'var(--bd-text-faint)' }}>
                  Loading history…
                </div>
              )}
              {versions?.map((v) => (
                <div
                  key={v.version}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                >
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: 'var(--bd-text)' }}>
                      Version {v.version}
                      {v.version === latest && (
                        <span
                          className="ml-2 rounded-full px-2 py-[1px] text-[10px] font-medium"
                          style={{ background: 'var(--bd-success-bg)', color: 'var(--bd-success)' }}
                        >
                          current
                        </span>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--bd-text-soft)' }}>
                      {formatWhen(v.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <button
                      type="button"
                      disabled={downloading !== null}
                      onClick={() => download(v.version)}
                      title={`Export version ${v.version} as .json`}
                      aria-label={`Export version ${v.version} as JSON`}
                      className="flex cursor-pointer items-center gap-[5px] rounded-lg border px-2 py-[6px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:cursor-default disabled:opacity-40"
                      style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text-soft)' }}
                    >
                      <i
                        className={`ti ti-${downloading === v.version ? 'loader-2' : 'download'} text-[14px]`}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null || v.version === latest}
                      onClick={() => restore(v.version)}
                      className="cursor-pointer rounded-lg border px-3 py-[6px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:cursor-default disabled:opacity-40"
                      style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text)' }}
                    >
                      {busy === v.version ? 'Restoring…' : 'Restore'}
                    </button>
                  </div>
                </div>
              ))}
              {versions?.length === 0 && (
                <div className="px-3 py-6 text-center text-[13px]" style={{ color: 'var(--bd-text-faint)' }}>
                  No versions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
