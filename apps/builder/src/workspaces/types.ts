/**
 * Workspace abstraction — the Builder's uniform interface over
 * "wherever a contract lives". Every backend (local FS, S3, git,
 * custom HTTP) plugs in via a `WorkspaceAdapter` and the rest of the
 * app doesn't care which one is active.
 *
 * MVP scope in the sandbox:
 *   - `local` (localStorage-backed) is fully implemented
 *   - `s3` / `git` are stubbed at the type level so the UI can
 *     enumerate workspace kinds; concrete adapters land when Tauri
 *     or a backend proxy is available
 */
import type { Contract } from '../state/types';

/** Stable identifier for a workspace instance (uuid-ish). */
export type WorkspaceId = string;

/**
 * Stable identifier for a file inside a workspace. For the local
 * adapter it's a random slug; remote adapters use their backend key.
 */
export type FileId = string;

/**
 * Envelope around a contract stored in a workspace. `contract` is the
 * authoritative payload; the rest is workspace metadata.
 */
export type ContractFile = {
  id: FileId;
  workspaceId: WorkspaceId;
  /** Human-readable name — the file browser shows this. */
  name: string;
  /** ISO timestamp, string so JSON round-trips cleanly. */
  updatedAt: string;
  contract: Contract;
};

/** Kinds Builder understands. Anything else drops to `custom` at UI level. */
export type WorkspaceKind = 'local' | 's3' | 'git' | 'custom';

/** Descriptor the workspace picker renders. */
export type WorkspaceDescriptor = {
  id: WorkspaceId;
  kind: WorkspaceKind;
  /** Human name — e.g. "My laptop", "Team S3", "acme/contracts on GitHub". */
  label: string;
  /** Whether the current session can write to this workspace. */
  writable: boolean;
};

/**
 * A minimal file entry returned by `list()`. Full contract payloads
 * are fetched via `read()` on demand — keeps the file browser fast
 * even for large workspaces.
 */
export type FileEntry = {
  id: FileId;
  name: string;
  updatedAt: string;
};

/** One point in a file's version history (no content). */
export type VersionEntry = {
  version: number;
  authorId?: string;
  createdAt: string;
};

/**
 * Optional versioning surface. Implemented only by backends that keep
 * history (the remote WS adapter); `undefined` on `local`. The History
 * UI shows only when this is present AND `versioning` is entitled.
 */
export type WorkspaceVersioning = {
  list: (id: FileId) => Promise<VersionEntry[]>;
  read: (id: FileId, version: number) => Promise<ContractFile | null>;
  /** Re-apply a version as a NEW version (append-only) and return it. */
  restore: (id: FileId, version: number) => Promise<ContractFile>;
};

/** The advisory lock on a file (collab-lock). `mine` is a convenience the
 *  adapter fills in so the UI needn't compare holder ids itself. */
export type LockInfo = {
  fileId: FileId;
  holderId: string;
  holderEmail: string;
  acquiredAt: string;
  expiresAt: string;
  /** True when the current session holds this lock. */
  mine: boolean;
};

/**
 * Optional collab-lock surface. Implemented only by backends that support
 * multi-user locking (the remote WS adapter). `acquire` doubles as the
 * heartbeat. The lock UI shows only when this is present AND `collab-lock`
 * is entitled.
 */
export type WorkspaceLocking = {
  /** The file's live lock, or null when free. */
  get: (id: FileId) => Promise<LockInfo | null>;
  /** Take/renew the caller's lease. Throws a `locked` error if held by another. */
  acquire: (id: FileId) => Promise<LockInfo>;
  /** Release the caller's lock (no-op if not held). */
  release: (id: FileId) => Promise<void>;
};

/** One immutable release (deploy-pipeline). */
export type DeploymentInfo = {
  env: string;
  version: number;
  name: string;
  deployedBy?: string;
  createdAt: string;
};

/**
 * Optional deploy surface. Implemented only by backends that support
 * environments + published releases (the remote WS adapter). The Deploy UI
 * shows only when this is present AND `deploy-pipeline` is entitled.
 */
export type WorkspaceDeploying = {
  /** Release history (all envs, newest first). */
  list: (id: FileId) => Promise<DeploymentInfo[]>;
  /** Promote a version (undefined = current latest) to an env. */
  deploy: (id: FileId, env: string, version?: number) => Promise<DeploymentInfo>;
};

/**
 * Every backend implements this. The signatures are intentionally
 * async so remote adapters can await network calls without changing
 * the callers.
 */
export type WorkspaceAdapter = {
  descriptor: WorkspaceDescriptor;
  list: () => Promise<FileEntry[]>;
  read: (id: FileId) => Promise<ContractFile | null>;
  /**
   * `id === undefined` means "create new". The adapter picks the id
   * and returns the fully-populated `ContractFile`.
   */
  write: (
    id: FileId | undefined,
    name: string,
    contract: Contract,
  ) => Promise<ContractFile>;
  rename: (id: FileId, newName: string) => Promise<ContractFile>;
  remove: (id: FileId) => Promise<void>;
  /** Version history — present only on backends that keep it (remote WS). */
  versions?: WorkspaceVersioning;
  /** Collab-lock — present only on backends that support it (remote WS). */
  locks?: WorkspaceLocking;
  /** Deploy-pipeline — present only on backends that support it (remote WS). */
  deployments?: WorkspaceDeploying;
};
