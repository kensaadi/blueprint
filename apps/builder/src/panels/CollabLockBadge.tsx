/**
 * Collab-lock badge — the user-facing side of the `collab-lock` feature.
 *
 * Appears ONLY when the open file lives on a backend that supports locking
 * (the remote WS adapter exposes `locks`) AND the license entitles
 * `collab-lock`. While mounted it:
 *   - acquires an advisory lease-lock on the open file,
 *   - heartbeats (re-acquires) within the lease so the lock stays alive,
 *   - releases the lock on unmount / when the open file changes.
 *
 * If another editor already holds the lock, acquisition fails and the badge
 * shows "Locked by <email>" — the write path is server-enforced (a save
 * returns 423), so this is an honest signal, not the security boundary.
 *
 * Self-contained: reads everything from context, no prop threading.
 */
import { useEffect, useRef, useState } from 'react';
import { useBuilderState } from '../state/BuilderStateContext';
import { useFeature } from '../licensing/LicenseContext';
import { getWorkspace } from '../workspaces/registry';
import { REMOTE_WORKSPACE_ID } from '../workspaces/remoteWorkspace';

// Re-acquire well within the server's 90s lease so a brief network hiccup
// doesn't drop the lock.
const HEARTBEAT_MS = 30_000;
// On a cold boot with a remote file already open, the remote adapter is
// registered ASYNC (after the license syncs), so it may not be in the
// registry when this effect first runs. Poll quickly until it appears,
// then settle into the slow heartbeat.
const WARMUP_MS = 1_500;

type LockState =
  | { kind: 'idle' }
  | { kind: 'mine' }
  | { kind: 'held'; by: string };

/** Resolve the remote adapter's locking surface lazily — it may register
 *  after this component mounts. */
function locking() {
  return getWorkspace(REMOTE_WORKSPACE_ID)?.locks;
}

export function CollabLockBadge() {
  const { fileRef } = useBuilderState();
  const hasCollabLock = useFeature('collab-lock');
  const [state, setState] = useState<LockState>({ kind: 'idle' });
  // Guards against a stale async setState after the file changed/unmounted.
  const tokenRef = useRef(0);

  const isRemote = fileRef?.workspaceId === REMOTE_WORKSPACE_ID;
  const fileId = fileRef?.fileId;
  const enabled = Boolean(isRemote && hasCollabLock && fileId);

  useEffect(() => {
    if (!enabled || !fileId) {
      setState({ kind: 'idle' });
      return;
    }

    const myToken = ++tokenRef.current;
    const alive = () => tokenRef.current === myToken;
    let warmup: number | undefined;
    let heartbeat: number | undefined;

    // One acquire/heartbeat cycle. Returns false when the adapter isn't
    // registered yet (so the caller keeps warming up), true otherwise.
    async function beat(): Promise<boolean> {
      const lk = locking();
      if (!lk) return false;
      try {
        await lk.acquire(fileId!);
        if (alive()) setState({ kind: 'mine' });
      } catch {
        // Contention (423) or transient error → surface who holds it.
        if (!alive()) return true;
        try {
          const held = await lk.get(fileId!);
          if (alive()) {
            setState(
              held && !held.mine
                ? { kind: 'held', by: held.holderEmail || 'another editor' }
                : { kind: 'idle' },
            );
          }
        } catch {
          if (alive()) setState({ kind: 'idle' });
        }
      }
      return true;
    }

    function startHeartbeat() {
      heartbeat = window.setInterval(() => void beat(), HEARTBEAT_MS);
    }

    void (async () => {
      const ready = await beat();
      if (!alive()) return;
      if (ready) {
        startHeartbeat();
      } else {
        // Adapter not registered yet — poll until it is, then settle.
        warmup = window.setInterval(() => {
          void beat().then((ok) => {
            if (ok && alive()) {
              window.clearInterval(warmup);
              startHeartbeat();
            }
          });
        }, WARMUP_MS);
      }
    })();

    return () => {
      // Invalidate in-flight callbacks, stop the timers, release the lock.
      tokenRef.current++;
      window.clearInterval(warmup);
      window.clearInterval(heartbeat);
      void locking()?.release(fileId!);
    };
  }, [enabled, fileId]);

  if (!enabled || state.kind === 'idle') return null;

  const mine = state.kind === 'mine';
  return (
    <span
      className="flex items-center gap-[5px] rounded-md px-2 py-1 text-[12px] font-medium"
      style={{
        color: mine ? 'var(--bd-success)' : 'var(--bd-warning, #b45309)',
        background: mine
          ? 'var(--bd-success-bg)'
          : 'var(--bd-warning-bg, rgba(180,83,9,0.12))',
      }}
      title={
        mine
          ? 'You hold the edit lock on this file'
          : `${state.kind === 'held' ? state.by : ''} is editing — your changes are read-only until they finish`
      }
    >
      <i className={`ti ti-${mine ? 'lock' : 'lock-exclamation'} text-[14px]`} aria-hidden />
      {mine ? 'Editing' : `Locked by ${state.kind === 'held' ? state.by : ''}`}
    </span>
  );
}
