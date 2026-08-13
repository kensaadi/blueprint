/**
 * Deploy — the user-facing side of the `deploy-pipeline` feature.
 *
 * A "Deploy" affordance that appears ONLY when the open file lives on a
 * backend that supports deployments (the remote WS adapter exposes
 * `deployments`) AND the license entitles `deploy-pipeline`. Opens a panel
 * showing the current release per environment (staging / production), a
 * one-click "Deploy latest", and the full release history with rollback
 * (re-deploy a past version). Deploy actions require `editor`+ (the server
 * enforces it too); viewers see status read-only.
 *
 * Self-contained: resolves everything from context + the registry, no prop
 * threading — mirrors HistoryButton.
 */
import { useState } from 'react';
import { useBuilderState } from '../state/BuilderStateContext';
import { useFeature } from '../licensing/LicenseContext';
import { getWorkspace } from '../workspaces/registry';
import { REMOTE_WORKSPACE_ID } from '../workspaces/remoteWorkspace';
import { loadSession } from '../api/workspace/session';
import { downloadContract, filenameForVersion } from '../state/exportContract';
import type { DeploymentInfo, WorkspaceDeploying } from '../workspaces/types';

const ENVS = ['staging', 'production'] as const;

function formatWhen(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function DeployButton() {
  const { fileRef } = useBuilderState();
  const hasDeploy = useFeature('deploy-pipeline');
  const role = loadSession()?.user.role ?? '';
  const canDeploy = role === 'owner' || role === 'admin' || role === 'editor';

  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<DeploymentInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "env" or "env:version"

  // Same visibility rule as HistoryButton: remote file + entitled. The
  // adapter is resolved lazily at click time (survives async registration).
  if (!fileRef || fileRef.workspaceId !== REMOTE_WORKSPACE_ID || !hasDeploy) {
    return null;
  }

  function deploying(): WorkspaceDeploying | null {
    return getWorkspace(fileRef!.workspaceId)?.deployments ?? null;
  }

  async function load() {
    setError(null);
    const d = deploying();
    if (!d) {
      setError('Reconnect your workspace to deploy.');
      return;
    }
    try {
      setHistory(await d.list(fileRef!.fileId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load deployments.');
    }
  }

  async function openPanel() {
    setOpen(true);
    setHistory(null);
    void load();
  }

  async function run(env: string, version: number | undefined, key: string) {
    const d = deploying();
    if (!d) return;
    setBusy(key);
    setError(null);
    try {
      await d.deploy(fileRef!.fileId, env, version);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deploy failed.');
    } finally {
      setBusy(null);
    }
  }

  // Export the contract currently live on an environment as a .json file —
  // the deliverable handed off to the backend. Reads the deployed version's
  // content by version number (never exposes a Builder URL).
  async function exportEnv(env: string, version: number, key: string) {
    const versions = getWorkspace(fileRef!.workspaceId)?.versions;
    if (!versions) {
      setError('Reconnect your workspace to export.');
      return;
    }
    setBusy(key);
    setError(null);
    try {
      const file = await versions.read(fileRef!.fileId, version);
      if (!file) {
        setError('That version is no longer available.');
        return;
      }
      downloadContract(file.contract, filenameForVersion(file.contract, { version, env }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export.');
    } finally {
      setBusy(null);
    }
  }

  // Current release per env = the newest history entry for that env.
  const current = (env: string): DeploymentInfo | undefined =>
    history?.find((h) => h.env === env);

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        title="Deploy"
        className="flex cursor-pointer items-center gap-[5px] rounded-md px-2 py-1 text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
        style={{ color: 'var(--bd-text-soft)' }}
      >
        <i className="ti ti-rocket text-[15px]" aria-hidden />
        Deploy
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Deploy"
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
                Deploy · {fileRef.name}
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

            <div className="flex-1 overflow-auto p-4">
              {error && (
                <div className="mb-3 text-[12px]" style={{ color: 'var(--bd-danger, #dc2626)' }}>
                  {error}
                </div>
              )}

              {/* Environment cards */}
              <div className="flex flex-col gap-2">
                {ENVS.map((env) => {
                  const cur = current(env);
                  const isProd = env === 'production';
                  return (
                    <div
                      key={env}
                      className="flex items-center justify-between gap-3 rounded-xl border px-3 py-[10px]"
                      style={{ borderColor: 'var(--bd-border)' }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-[6px] text-[13px] font-medium" style={{ color: 'var(--bd-text)' }}>
                          <i
                            className={`ti ti-${isProd ? 'world' : 'flask'} text-[14px]`}
                            style={{ color: isProd ? 'var(--bd-accent)' : 'var(--bd-text-soft)' }}
                            aria-hidden
                          />
                          {env}
                        </div>
                        <div className="mt-[2px] truncate text-[11px]" style={{ color: 'var(--bd-text-soft)' }}>
                          {cur
                            ? `Live: v${cur.version} · ${formatWhen(cur.createdAt)}`
                            : 'Not deployed yet'}
                        </div>
                      </div>
                      <div className="flex flex-none items-center gap-2">
                        {cur && (
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void exportEnv(env, cur.version, `export:${env}`)}
                            title={`Export the ${env} contract (v${cur.version}) as .json`}
                            aria-label={`Export the ${env} contract as JSON`}
                            className="flex cursor-pointer items-center gap-[5px] rounded-lg border px-2 py-[6px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                            style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text-soft)' }}
                          >
                            <i
                              className={`ti ti-${busy === `export:${env}` ? 'loader-2' : 'download'} text-[14px]`}
                              aria-hidden
                            />
                          </button>
                        )}
                        {canDeploy && (
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => void run(env, undefined, env)}
                            className="cursor-pointer rounded-lg px-3 py-[6px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                            style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
                          >
                            {busy === env ? 'Deploying…' : 'Deploy latest'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* History */}
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--bd-text-faint)' }}>
                History
              </div>
              <div className="mt-1">
                {history === null && !error && (
                  <div className="py-4 text-center text-[13px]" style={{ color: 'var(--bd-text-faint)' }}>
                    Loading…
                  </div>
                )}
                {history?.map((h, i) => {
                  const key = `${h.env}:${h.version}:${i}`;
                  const isCurrent = current(h.env) === h;
                  return (
                    <div key={key} className="flex items-center justify-between gap-2 py-[5px]">
                      <div className="min-w-0 text-[12px]" style={{ color: 'var(--bd-text)' }}>
                        <span className="font-medium">{h.env}</span>{' '}
                        <span style={{ color: 'var(--bd-text-soft)' }}>v{h.version}</span>
                        {isCurrent && (
                          <span
                            className="ml-2 rounded-full px-2 py-[1px] text-[10px] font-medium"
                            style={{ background: 'var(--bd-success-bg)', color: 'var(--bd-success)' }}
                          >
                            live
                          </span>
                        )}
                        <div className="text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
                          {formatWhen(h.createdAt)}
                          {h.deployedBy ? ` · ${h.deployedBy}` : ''}
                        </div>
                      </div>
                      {canDeploy && !isCurrent && (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void run(h.env, h.version, key)}
                          title={`Re-deploy v${h.version} to ${h.env}`}
                          className="flex-none cursor-pointer rounded-lg border px-3 py-[5px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                          style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text)' }}
                        >
                          {busy === key ? '…' : 'Rollback'}
                        </button>
                      )}
                    </div>
                  );
                })}
                {history?.length === 0 && (
                  <div className="py-4 text-center text-[13px]" style={{ color: 'var(--bd-text-faint)' }}>
                    No deployments yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
