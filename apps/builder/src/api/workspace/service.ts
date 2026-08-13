import { attempt } from '../_shared/attempt';
import type { Result } from '../_shared/result.types';
import workspaceClient from '../_shared/workspace.client';
import { clearSession, saveSession, type WorkspaceUser } from './session';
import {
  AuditResponseSchema,
  AuthResponseSchema,
  AuthStatusSchema,
  CatalogEntrySchema,
  CatalogResponseSchema,
  CatalogTemplateSchema,
  CreatedInviteSchema,
  DeploymentSchema,
  DeploymentsResponseSchema,
  FilesResponseSchema,
  InvitesResponseSchema,
  LicenseStateSchema,
  LockResponseSchema,
  MembersResponseSchema,
  VersionsResponseSchema,
  WorkspaceSchema,
  WorkspacesResponseSchema,
  WsContractFileSchema,
  type AuditEvent,
  type CatalogEntry,
  type CatalogTemplate,
  type CreatedInvite,
  type Deployment,
  type Invite,
  type Lock,
  type Member,
  type VersionEntry,
  type Workspace,
  type WorkspaceLicense,
  type WsContractFile,
  type WsFileEntry,
} from './types';

/**
 * Workspace Service api surface (Phase 0). Every function returns the
 * `Result<T>` envelope. `register`/`login` persist the session as a side
 * effect so subsequent calls are authenticated.
 */

async function authenticate(
  path: '/auth/register' | '/auth/login',
  email: string,
  password: string,
): Promise<WorkspaceUser> {
  const { data } = await workspaceClient.post(
    path,
    { email, password },
    { responseSchema: AuthResponseSchema },
  );
  saveSession(data.token, data.user);
  return data.user;
}

/** Create the first (owner) account and sign in. */
export async function register(
  email: string,
  password: string,
): Promise<Result<WorkspaceUser>> {
  return attempt(authenticate('/auth/register', email, password));
}

/** Sign in to the workspace. */
export async function login(
  email: string,
  password: string,
): Promise<Result<WorkspaceUser>> {
  return attempt(authenticate('/auth/login', email, password));
}

/** Drop the local session (does not revoke server-side). */
export function logout(): void {
  clearSession();
}

/**
 * Whether the workspace has been set up (an owner exists). PUBLIC — the
 * Builder reads this at first run to choose the onboarding vs sign-in.
 */
export async function authStatus(): Promise<Result<boolean>> {
  return attempt(
    workspaceClient
      .get('/auth/status', { responseSchema: AuthStatusSchema })
      .then((r) => r.data.initialized),
  );
}

/** The current signed-in user. */
export async function me(): Promise<Result<WorkspaceUser>> {
  return attempt(
    workspaceClient
      .get('/auth/me', { responseSchema: AuthResponseSchema.pick({ user: true }) })
      .then((r) => r.data.user),
  );
}

/** The authoritative entitlement state (WS-enforced). */
export async function getLicense(): Promise<Result<WorkspaceLicense>> {
  return attempt(
    workspaceClient
      .get('/license', { responseSchema: LicenseStateSchema })
      .then((r) => r.data),
  );
}

/** Register a Foundry license token into the workspace (owner only). */
export async function registerLicense(
  token: string,
): Promise<Result<WorkspaceLicense>> {
  return attempt(
    workspaceClient
      .post('/license/register', { token }, { responseSchema: LicenseStateSchema })
      .then((r) => r.data),
  );
}

// --- Phase 1: workspaces + files (gated `remote-storage` server-side) ---

export async function listWorkspaces(): Promise<Result<Workspace[]>> {
  return attempt(
    workspaceClient
      .get('/workspaces', { responseSchema: WorkspacesResponseSchema })
      .then((r) => r.data.workspaces),
  );
}

export async function createWorkspace(name: string): Promise<Result<Workspace>> {
  return attempt(
    workspaceClient
      .post('/workspaces', { name }, { responseSchema: WorkspaceSchema })
      .then((r) => r.data),
  );
}

export async function listFiles(wid: string): Promise<Result<WsFileEntry[]>> {
  return attempt(
    workspaceClient
      .get(`/workspaces/${wid}/files`, { responseSchema: FilesResponseSchema })
      .then((r) => r.data.files),
  );
}

export async function readFile(
  wid: string,
  fid: string,
): Promise<Result<WsContractFile>> {
  return attempt(
    workspaceClient
      .get(`/workspaces/${wid}/files/${fid}`, { responseSchema: WsContractFileSchema })
      .then((r) => r.data),
  );
}

export async function createFile(
  wid: string,
  name: string,
  content: unknown,
): Promise<Result<WsContractFile>> {
  return attempt(
    workspaceClient
      .post(
        `/workspaces/${wid}/files`,
        { name, content },
        { responseSchema: WsContractFileSchema },
      )
      .then((r) => r.data),
  );
}

/**
 * Append a new version. When `expectVersion` is given, the write opts into
 * optimistic concurrency via an `If-Match` header — the server rejects it
 * with `version_conflict` (409) if the file changed since that version.
 * A live collab-lock held by another editor rejects with `locked` (423).
 */
export async function writeFile(
  wid: string,
  fid: string,
  content: unknown,
  expectVersion?: number,
): Promise<Result<WsContractFile>> {
  const headers =
    expectVersion && expectVersion > 0
      ? { 'If-Match': String(expectVersion) }
      : undefined;
  return attempt(
    workspaceClient
      .put(
        `/workspaces/${wid}/files/${fid}`,
        { content },
        { responseSchema: WsContractFileSchema, headers },
      )
      .then((r) => r.data),
  );
}

export async function renameFile(
  wid: string,
  fid: string,
  name: string,
): Promise<Result<WsContractFile>> {
  return attempt(
    workspaceClient
      .patch(
        `/workspaces/${wid}/files/${fid}`,
        { name },
        { responseSchema: WsContractFileSchema },
      )
      .then((r) => r.data),
  );
}

export async function removeFile(
  wid: string,
  fid: string,
): Promise<Result<void>> {
  return attempt(
    workspaceClient.delete(`/workspaces/${wid}/files/${fid}`).then(() => undefined),
  );
}

// --- Phase 1: version history (gated `versioning` server-side) ---

export async function listVersions(
  wid: string,
  fid: string,
): Promise<Result<VersionEntry[]>> {
  return attempt(
    workspaceClient
      .get(`/workspaces/${wid}/files/${fid}/versions`, {
        responseSchema: VersionsResponseSchema,
      })
      .then((r) => r.data.versions),
  );
}

export async function readVersion(
  wid: string,
  fid: string,
  version: number,
): Promise<Result<WsContractFile>> {
  return attempt(
    workspaceClient
      .get(`/workspaces/${wid}/files/${fid}/versions/${version}`, {
        responseSchema: WsContractFileSchema,
      })
      .then((r) => r.data),
  );
}

export async function restoreVersion(
  wid: string,
  fid: string,
  version: number,
): Promise<Result<WsContractFile>> {
  return attempt(
    workspaceClient
      .post(
        `/workspaces/${wid}/files/${fid}/versions/${version}/restore`,
        undefined,
        { responseSchema: WsContractFileSchema },
      )
      .then((r) => r.data),
  );
}

// --- Phase 2: team membership (gated `shared-workspaces` + admin server-side) ---

/** All team members. Admin/owner only (server-enforced). */
export async function listMembers(): Promise<Result<Member[]>> {
  return attempt(
    workspaceClient
      .get('/members', { responseSchema: MembersResponseSchema })
      .then((r) => r.data.members),
  );
}

/** Change a member's role. The owner role is immutable (server-enforced). */
export async function updateMemberRole(
  id: string,
  role: string,
): Promise<Result<void>> {
  return attempt(
    workspaceClient.patch(`/members/${id}`, { role }).then(() => undefined),
  );
}

/** Remove a member — their session is revoked on the next request. */
export async function removeMember(id: string): Promise<Result<void>> {
  return attempt(
    workspaceClient.delete(`/members/${id}`).then(() => undefined),
  );
}

/** Pending (not-yet-accepted) invites. */
export async function listInvites(): Promise<Result<Invite[]>> {
  return attempt(
    workspaceClient
      .get('/invites', { responseSchema: InvitesResponseSchema })
      .then((r) => r.data.invites),
  );
}

/**
 * Invite a new member. Seat-capped server-side (members + pending ≤ seats
 * → `seat_limit`). Returns the token so the caller can build the invite
 * link to share with the invitee.
 */
export async function createInvite(
  email: string,
  role: string,
): Promise<Result<CreatedInvite>> {
  return attempt(
    workspaceClient
      .post('/invites', { email, role }, { responseSchema: CreatedInviteSchema })
      .then((r) => r.data),
  );
}

/** Revoke a pending invite (frees the reserved seat). */
export async function revokeInvite(id: string): Promise<Result<void>> {
  return attempt(
    workspaceClient.delete(`/invites/${id}`).then(() => undefined),
  );
}

/**
 * Accept an invite: the invitee sets their own password and becomes a
 * member. PUBLIC — no prior session; the token is the proof. Persists the
 * new session as a side effect.
 */
export async function acceptInvite(
  token: string,
  password: string,
): Promise<Result<WorkspaceUser>> {
  const run = workspaceClient
    .post(
      '/auth/accept-invite',
      { token, password },
      { responseSchema: AuthResponseSchema },
    )
    .then((r) => {
      saveSession(r.data.token, r.data.user);
      return r.data.user;
    });
  return attempt(run);
}

// --- Phase 3: collab-lock (gated `collab-lock` + editor server-side) ---

/** The file's live lock, or null when it is free. */
export async function getLock(
  wid: string,
  fid: string,
): Promise<Result<Lock | null>> {
  return attempt(
    workspaceClient
      .get(`/workspaces/${wid}/files/${fid}/lock`, {
        responseSchema: LockResponseSchema,
      })
      .then((r) => r.data.lock),
  );
}

/**
 * Acquire (or renew) the lock for the current user — this call doubles as
 * the heartbeat, so re-invoke it within the lease to keep the lock. Fails
 * with a `locked` (423) error when another editor holds a live lock.
 */
export async function acquireLock(
  wid: string,
  fid: string,
): Promise<Result<Lock>> {
  return attempt(
    workspaceClient
      .post(`/workspaces/${wid}/files/${fid}/lock`, undefined, {
        responseSchema: LockResponseSchema,
      })
      .then((r) => r.data.lock as Lock),
  );
}

/** Release the lock (no-op if not held). */
export async function releaseLock(
  wid: string,
  fid: string,
): Promise<Result<void>> {
  return attempt(
    workspaceClient
      .delete(`/workspaces/${wid}/files/${fid}/lock`)
      .then(() => undefined),
  );
}

// --- Phase 4: audit log (gated `audit-log` + admin server-side) ---

/** Recent audit events, newest first. Admin/owner only (server-enforced). */
export async function listAudit(limit = 100): Promise<Result<AuditEvent[]>> {
  return attempt(
    workspaceClient
      .get('/audit', { params: { limit }, responseSchema: AuditResponseSchema })
      .then((r) => r.data.events),
  );
}

// --- Phase 4: deploy-pipeline (gated `deploy-pipeline` + editor server-side) ---

/**
 * Promote a file's version to an environment as an immutable release.
 * `version` omitted deploys the current latest; a specific version is a
 * rollback/forward. Editor+ (server-enforced).
 */
export async function deploy(
  wid: string,
  fid: string,
  env: string,
  version?: number,
): Promise<Result<Deployment>> {
  return attempt(
    workspaceClient
      .post(
        `/workspaces/${wid}/files/${fid}/deploy`,
        { env, version: version ?? 0 },
        { responseSchema: DeploymentSchema },
      )
      .then((r) => r.data),
  );
}

/** A file's release history (all envs, newest first). */
export async function listDeployments(
  wid: string,
  fid: string,
): Promise<Result<Deployment[]>> {
  return attempt(
    workspaceClient
      .get(`/workspaces/${wid}/files/${fid}/deployments`, {
        responseSchema: DeploymentsResponseSchema,
      })
      .then((r) => r.data.deployments),
  );
}

// --- Phase 4: custom-catalog (gated `custom-catalog` server-side) ---

/** The team's private template catalog (no content). Any member. */
export async function listCatalog(): Promise<Result<CatalogEntry[]>> {
  return attempt(
    workspaceClient
      .get('/catalog', { responseSchema: CatalogResponseSchema })
      .then((r) => r.data.templates),
  );
}

/** A team template with its content — for "Use this template". */
export async function readCatalogTemplate(
  id: string,
): Promise<Result<CatalogTemplate>> {
  return attempt(
    workspaceClient
      .get(`/catalog/${id}`, { responseSchema: CatalogTemplateSchema })
      .then((r) => r.data),
  );
}

/** Save a contract as a team template. Admin+ (server-enforced). */
export async function createCatalogTemplate(
  name: string,
  description: string,
  content: unknown,
): Promise<Result<CatalogEntry>> {
  return attempt(
    workspaceClient
      .post(
        '/catalog',
        { name, description, content },
        { responseSchema: CatalogEntrySchema },
      )
      .then((r) => r.data),
  );
}

/** Remove a team template. Admin+ (server-enforced). */
export async function deleteCatalogTemplate(id: string): Promise<Result<void>> {
  return attempt(
    workspaceClient.delete(`/catalog/${id}`).then(() => undefined),
  );
}
