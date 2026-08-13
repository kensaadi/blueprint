/**
 * Registers the real remote workspace into the registry when — and only
 * when — the user is signed in to a Workspace Service and the license
 * carries `remote-storage`. Drops it on sign-out / downgrade.
 *
 * Reactivity: `useFeature('remote-storage')` flips true once the WS
 * license is sourced (after a workspace sign-in), which re-runs the
 * effect and registers the adapter — so the file browser + save picker
 * gain the remote target without any manual refresh. Renders nothing.
 */
import { useEffect } from 'react';
import { useFeature } from '../licensing/LicenseContext';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { sessionToken } from '../api/workspace/session';
import { createWorkspace, listWorkspaces } from '../api/workspace/service';
import { registerWorkspace, unregisterWorkspace } from './registry';
import { createRemoteWorkspace, REMOTE_WORKSPACE_ID } from './remoteWorkspace';

export function WorkspaceRegistrar() {
  const hasRemote = useFeature('remote-storage');

  useEffect(() => {
    let alive = true;

    if (!HAS_WORKSPACE || !sessionToken() || !hasRemote) {
      unregisterWorkspace(REMOTE_WORKSPACE_ID);
      return;
    }

    (async () => {
      // Bind to the user's first workspace, creating a default one if the
      // account has none yet.
      const list = await listWorkspaces();
      if (!alive || list.error) return;
      let wid = list.data[0]?.id;
      let label = list.data[0]?.name;
      if (!wid) {
        const created = await createWorkspace('My workspace');
        if (!alive || created.error) return;
        wid = created.data.id;
        label = created.data.name;
      }
      registerWorkspace(
        createRemoteWorkspace(
          {
            id: REMOTE_WORKSPACE_ID,
            kind: 'custom',
            label: label ?? 'Remote workspace',
            writable: true,
          },
          wid,
        ),
      );
    })();

    return () => {
      alive = false;
    };
  }, [hasRemote]);

  return null;
}
