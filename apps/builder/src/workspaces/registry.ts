/**
 * Workspace registry — the app-wide map of available workspaces.
 *
 * MVP has one adapter (`local`, localStorage-backed). Future adapters
 * (`s3`, `git`, `custom`) register via `registerWorkspace()` at boot
 * once their descriptors + credentials resolve. The registry keeps
 * them looking uniform to the rest of the app.
 */
import type { WorkspaceAdapter, WorkspaceId } from './types';
import { localWorkspace } from './localStorageWorkspace';
import {
  s3MockWorkspace,
  gitMockWorkspace,
} from './mockRemoteWorkspaces';

const registry = new Map<WorkspaceId, WorkspaceAdapter>();
registry.set(localWorkspace.descriptor.id, localWorkspace);
// Mocked remotes — same interface as `local`, distinct labels + a bit
// of latency. Swap for real S3/git clients when the backend lands.
registry.set(s3MockWorkspace.descriptor.id, s3MockWorkspace);
registry.set(gitMockWorkspace.descriptor.id, gitMockWorkspace);

export function registerWorkspace(adapter: WorkspaceAdapter): void {
  registry.set(adapter.descriptor.id, adapter);
}

export function getWorkspace(id: WorkspaceId): WorkspaceAdapter | undefined {
  return registry.get(id);
}

export function listWorkspaces(): WorkspaceAdapter[] {
  return Array.from(registry.values());
}

/** The workspace we open on cold-boot when no session state exists. */
export const DEFAULT_WORKSPACE_ID: WorkspaceId = localWorkspace.descriptor.id;
