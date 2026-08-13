/**
 * Remote workspace adapter — a real `WorkspaceAdapter` backed by the
 * self-hosted Workspace Service (Phase 1). Replaces the localStorage-
 * faking `mockRemoteWorkspaces`. Save/open/list/rename/remove hit the
 * WS `/workspaces/:wid/files` endpoints; every save is a new immutable
 * version server-side.
 *
 * Registered into the workspace registry ONLY when the user is signed in
 * to a WS and the license carries `remote-storage` (see
 * WorkspaceRegistrar) — so it appears in the file browser + save picker
 * exactly like `local`, but gated to Pro+.
 */
import type { Contract } from '../state/types';
import { normalizeContract } from '../state/importContract';
import type {
  ContractFile,
  DeploymentInfo,
  FileEntry,
  FileId,
  LockInfo,
  VersionEntry,
  WorkspaceAdapter,
  WorkspaceDescriptor,
} from './types';
import type { Result } from '../api/_shared/result.types';
import type { Lock, WsContractFile } from '../api/workspace/types';
import * as ws from '../api/workspace/service';
import { loadSession } from '../api/workspace/session';

/** Stable registry key for the remote workspace (distinct from the WS's
 *  own workspace id, which the adapter uses internally for API calls). */
export const REMOTE_WORKSPACE_ID = 'remote';

function unwrap<T>(r: Result<T>): T {
  if (r.error) throw r.error;
  return r.data;
}

export function createRemoteWorkspace(
  descriptor: WorkspaceDescriptor,
  wid: string,
): WorkspaceAdapter {
  // The file's workspaceId is the REGISTRY key (so getWorkspace() finds
  // this adapter); `wid` is the WS-side workspace the API calls target.
  const toFile = (f: WsContractFile): ContractFile => ({
    id: f.id,
    workspaceId: descriptor.id,
    name: f.name,
    updatedAt: f.updatedAt,
    // Normalize at the load boundary so a slightly-off stored contract
    // renders (empty at worst) instead of crashing the canvas + header.
    contract: normalizeContract(f.content),
  });

  const toLock = (l: Lock): LockInfo => ({
    fileId: l.fileId,
    holderId: l.holderId,
    holderEmail: l.holderEmail,
    acquiredAt: l.acquiredAt,
    expiresAt: l.expiresAt,
    mine: l.holderId === (loadSession()?.user.id ?? ''),
  });

  return {
    descriptor,

    async list(): Promise<FileEntry[]> {
      const files = unwrap(await ws.listFiles(wid));
      return files.map((f) => ({ id: f.id, name: f.name, updatedAt: f.updatedAt }));
    },

    async read(id: FileId): Promise<ContractFile | null> {
      const r = await ws.readFile(wid, id);
      if (r.error) {
        if (r.error.code === 'NOT_FOUND') return null;
        throw r.error;
      }
      return toFile(r.data);
    },

    async write(
      id: FileId | undefined,
      name: string,
      contract: Contract,
    ): Promise<ContractFile> {
      if (id === undefined) {
        return toFile(unwrap(await ws.createFile(wid, name, contract)));
      }
      const saved = unwrap(await ws.writeFile(wid, id, contract));
      // Honor a rename on save (matches the local adapter's write).
      if (saved.name !== name) {
        return toFile(unwrap(await ws.renameFile(wid, id, name)));
      }
      return toFile(saved);
    },

    async rename(id: FileId, newName: string): Promise<ContractFile> {
      return toFile(unwrap(await ws.renameFile(wid, id, newName)));
    },

    async remove(id: FileId): Promise<void> {
      unwrap(await ws.removeFile(wid, id));
    },

    versions: {
      async list(id: FileId): Promise<VersionEntry[]> {
        const vs = unwrap(await ws.listVersions(wid, id));
        return vs.map((v) => ({
          version: v.version,
          authorId: v.authorId,
          createdAt: v.createdAt,
        }));
      },
      async read(id: FileId, version: number): Promise<ContractFile | null> {
        const r = await ws.readVersion(wid, id, version);
        if (r.error) {
          if (r.error.code === 'NOT_FOUND') return null;
          throw r.error;
        }
        return toFile(r.data);
      },
      async restore(id: FileId, version: number): Promise<ContractFile> {
        return toFile(unwrap(await ws.restoreVersion(wid, id, version)));
      },
    },

    locks: {
      async get(id: FileId): Promise<LockInfo | null> {
        const l = unwrap(await ws.getLock(wid, id));
        return l ? toLock(l) : null;
      },
      async acquire(id: FileId): Promise<LockInfo> {
        return toLock(unwrap(await ws.acquireLock(wid, id)));
      },
      async release(id: FileId): Promise<void> {
        unwrap(await ws.releaseLock(wid, id));
      },
    },

    deployments: {
      async list(id: FileId): Promise<DeploymentInfo[]> {
        return unwrap(await ws.listDeployments(wid, id));
      },
      async deploy(id: FileId, env: string, version?: number): Promise<DeploymentInfo> {
        return unwrap(await ws.deploy(wid, id, env, version));
      },
    },
  };
}
