import { z } from 'zod';

/**
 * Wire schemas for the Workspace Service (Phase 0). Unknown keys are
 * stripped by default, so an additive WS change never trips
 * CONTRACT_MISMATCH.
 */

export const WorkspaceUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
});

/** `POST /auth/{register,login}` → session + user. */
export const AuthResponseSchema = z.object({
  token: z.string(),
  user: WorkspaceUserSchema,
});

/** `GET /auth/status` → whether the workspace has an owner (first-run gate). */
export const AuthStatusSchema = z.object({ initialized: z.boolean() });

/** `GET /license` / `POST /license/register` → authoritative entitlement. */
export const LicenseStateSchema = z.object({
  tier: z.string(),
  features: z.array(z.string()),
  seats: z.number(),
  activeUntil: z.string(),
  active: z.boolean(),
  source: z.string(), // "foundry" | "none"
  licenseId: z.string().optional(),
  subject: z.string().optional(),
});
export type WorkspaceLicense = z.infer<typeof LicenseStateSchema>;

// --- Phase 1: workspaces + version-backed files ---

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;
export const WorkspacesResponseSchema = z.object({
  workspaces: z.array(WorkspaceSchema),
});

export const WsFileEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  updatedAt: z.string(),
});
export type WsFileEntry = z.infer<typeof WsFileEntrySchema>;
export const FilesResponseSchema = z.object({ files: z.array(WsFileEntrySchema) });

/** A file with its content — `content` is the opaque Blueprint contract. */
export const WsContractFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number(),
  content: z.unknown(),
  updatedAt: z.string(),
});
export type WsContractFile = z.infer<typeof WsContractFileSchema>;

export const VersionEntrySchema = z.object({
  version: z.number(),
  authorId: z.string().optional(),
  createdAt: z.string(),
});
export type VersionEntry = z.infer<typeof VersionEntrySchema>;
export const VersionsResponseSchema = z.object({
  versions: z.array(VersionEntrySchema),
});

// --- Phase 2: team membership (gated `shared-workspaces` server-side) ---

/** A team member (the WS `users` row, safe projection). */
export const MemberSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(), // owner | admin | editor | viewer
});
export type Member = z.infer<typeof MemberSchema>;
export const MembersResponseSchema = z.object({ members: z.array(MemberSchema) });

/** A pending invite (never leaks the token in the list projection). */
export const InviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string(),
});
export type Invite = z.infer<typeof InviteSchema>;
export const InvitesResponseSchema = z.object({ invites: z.array(InviteSchema) });

/** `POST /invites` → the created invite, INCLUDING the token so the UI can
 *  build the shareable invite link (in prod this would be emailed). */
export const CreatedInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  token: z.string(),
});
export type CreatedInvite = z.infer<typeof CreatedInviteSchema>;

// --- Phase 3: collab-lock (gated `collab-lock` server-side) ---

/** An advisory lease-lock on a file. `holderEmail` powers the UI badge. */
export const LockSchema = z.object({
  fileId: z.string(),
  holderId: z.string(),
  holderEmail: z.string(),
  acquiredAt: z.string(),
  expiresAt: z.string(),
});
export type Lock = z.infer<typeof LockSchema>;

/** `GET`/`POST .../lock` → the lock, or null when the file is free. */
export const LockResponseSchema = z.object({ lock: LockSchema.nullable() });

// --- Phase 4: audit log (gated `audit-log` + admin server-side) ---

/** One recorded action in the audit trail. */
export const AuditEventSchema = z.object({
  id: z.string(),
  actorId: z.string().optional(),
  actorEmail: z.string(),
  action: z.string(), // dotted, e.g. "team.role_change"
  target: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export const AuditResponseSchema = z.object({ events: z.array(AuditEventSchema) });

// --- Phase 4: deploy-pipeline (gated `deploy-pipeline` server-side) ---

/** One immutable release: a file version promoted to an environment. */
export const DeploymentSchema = z.object({
  env: z.string(), // "staging" | "production"
  version: z.number(),
  name: z.string(),
  deployedBy: z.string().optional(),
  createdAt: z.string(),
});
export type Deployment = z.infer<typeof DeploymentSchema>;
export const DeploymentsResponseSchema = z.object({
  deployments: z.array(DeploymentSchema),
});

// --- Phase 4: custom-catalog (gated `custom-catalog` server-side) ---

/** A team template listing entry (no content). */
export const CatalogEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
});
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
export const CatalogResponseSchema = z.object({
  templates: z.array(CatalogEntrySchema),
});

/** A team template WITH its content (for "Use this template"). */
export const CatalogTemplateSchema = CatalogEntrySchema.extend({
  content: z.unknown(),
});
export type CatalogTemplate = z.infer<typeof CatalogTemplateSchema>;
