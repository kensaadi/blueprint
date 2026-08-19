/**
 * Reactive Workspace-Service session. Re-renders on sign-in / sign-out so
 * the app can gate the builder behind a login (bundle: Model A) and register
 * the remote workspace the moment a session appears — Community included,
 * since basic file persistence is no longer a paid feature.
 */
import { useSyncExternalStore } from 'react';
import {
  loadSession,
  subscribeSession,
  type WorkspaceUser,
} from '../api/workspace/session';

const serverSnapshot = () => null;

/** The signed-in user, or null when not signed in. Reactive. */
export function useSession(): { token: string; user: WorkspaceUser } | null {
  return useSyncExternalStore(subscribeSession, loadSession, serverSnapshot);
}

/** Convenience: reactive boolean "is the user signed in to the WS?". */
export function useSignedIn(): boolean {
  return useSession() !== null;
}
