/**
 * Workspace registry — the app-wide map of available workspaces.
 *
 * `local` (localStorage-backed) is always present. The `remote` adapter
 * (real, WS-backed) registers via `registerWorkspace()` only when the
 * user is signed in to a Workspace Service AND the license carries
 * `remote-storage` (see WorkspaceRegistrar); `unregisterWorkspace()`
 * drops it on sign-out / downgrade. The registry keeps every backend
 * looking uniform to the rest of the app.
 *
 * The former localStorage-faking `s3`/`git` mocks are gone — Phase 1
 * ships the real remote backend.
 */
import type { WorkspaceAdapter, WorkspaceId } from './types';
import { localWorkspace } from './localStorageWorkspace';

const registry = new Map<WorkspaceId, WorkspaceAdapter>();
registry.set(localWorkspace.descriptor.id, localWorkspace);

export function registerWorkspace(adapter: WorkspaceAdapter): void {
  registry.set(adapter.descriptor.id, adapter);
}

export function unregisterWorkspace(id: WorkspaceId): void {
  registry.delete(id);
}

export function getWorkspace(id: WorkspaceId): WorkspaceAdapter | undefined {
  return registry.get(id);
}

export function listWorkspaces(): WorkspaceAdapter[] {
  return Array.from(registry.values());
}

/** The workspace we open on cold-boot when no session state exists. */
export const DEFAULT_WORKSPACE_ID: WorkspaceId = localWorkspace.descriptor.id;
