/**
 * First-run detection. Reads the Workspace Service's public
 * `GET /auth/status` once (module-cached, shared across callers) to decide
 * whether the workspace has an owner yet:
 *   - `initialized === false` → show the create-your-workspace onboarding.
 *   - `initialized === true`  → show sign-in.
 *   - `null` → still loading (render nothing to avoid a flash).
 *
 * Without a Workspace Service (`HAS_WORKSPACE === false`) there is no
 * onboarding — resolves to `true` (local-only Community).
 */
import { useEffect, useState } from 'react';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { authStatus } from '../api/workspace/service';

let cache: boolean | null = null;
let inflight: Promise<boolean> | null = null;

/** Force a re-read on the next mount (call after creating the owner). */
export function invalidateAuthStatus(): void {
  cache = null;
  inflight = null;
}

export function useAuthStatus(): boolean | null {
  const [initialized, setInitialized] = useState<boolean | null>(
    HAS_WORKSPACE ? cache : true,
  );

  useEffect(() => {
    if (!HAS_WORKSPACE) {
      setInitialized(true);
      return;
    }
    if (cache !== null) {
      setInitialized(cache);
      return;
    }
    if (!inflight) {
      inflight = authStatus().then((r) => {
        // On error, assume initialized so we never trap a user behind the
        // onboarding when the status probe fails.
        cache = r.data ?? true;
        return cache;
      });
    }
    let alive = true;
    inflight.then((v) => {
      if (alive) setInitialized(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return initialized;
}
