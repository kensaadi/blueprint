/**
 * Registers the real remote workspace into the registry whenever the user is
 * signed in to a Workspace Service. Drops it on sign-out.
 *
 * Basic file persistence is NOT a paid feature (Model A): any signed-in
 * member — Community included — stores their contracts server-side, so this
 * gates on the session alone, not `remote-storage`. Reactivity comes from
 * `useSession()` (flips on login / logout), so the file browser + save picker
 * gain the remote target the moment the user signs in. Renders nothing.
 */
import { useEffect } from 'react';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { useSession } from '../hooks/useSession';
import { createWorkspace, listWorkspaces } from '../api/workspace/service';
import { registerWorkspace, unregisterWorkspace } from './registry';
import { createRemoteWorkspace, REMOTE_WORKSPACE_ID } from './remoteWorkspace';

export function WorkspaceRegistrar() {
  const session = useSession();

  useEffect(() => {
    let alive = true;

    if (!HAS_WORKSPACE || !session) {
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
  }, [session]);

  return null;
}
