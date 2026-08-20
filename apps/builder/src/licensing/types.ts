/**
 * Licensing types — the Builder's paid-tier surface.
 *
 * TWO ORTHOGONAL AXES, deliberately kept apart (Decision #37):
 *
 *   1. Tier → Builder FEATURES.  A signed license unlocks capabilities
 *      of the *tool* (remote storage, collaboration, SSO…). Read via
 *      `useFeature()` / `useTier()` from `LicenseContext`.
 *
 *   2. Entitlements → TEMPLATE ownership.  Marketplace templates are
 *      standalone one-shot purchases, the SAME price for everyone,
 *      buyable by ANY tier. Ownership is a set of purchased ids — see
 *      `entitlements.ts`. That module NEVER consults the tier.
 *
 * If you ever find yourself passing a `Tier` into template-access logic,
 * stop: that violates the pricing model. Nothing in this file gates a
 * template, and nothing in `entitlements.ts` reads a `Tier`.
 *
 * NOTE: this is scaffolding. The real Ed25519 token decoder + offline
 * signature check (v2 §7) lands with the license-entry business logic;
 * here the claims are supplied/mocked.
 */

/** The five subscription tiers. Absence of a token *is* `community`. */
export type Tier = 'community' | 'pro' | 'team' | 'business' | 'enterprise';

/**
 * Builder capabilities gated by tier. This is the ONLY thing a tier
 * unlocks — it never unlocks a template. Extend as features land.
 */
export type FeatureFlag =
  | 'ai-assist' // AI contract authoring — generate & edit (Pro+)
  | 'remote-storage' // legacy: basic storage is free (Model A); no longer gates
  | 'versioning'
  | 'shared-workspaces'
  | 'collab-lock'
  | 'workspace-roles'
  | 'deploy-pipeline'
  | 'sso'
  | 'saml'
  | 'audit-log'
  | 'on-prem-license'
  | 'custom-catalog';

/**
 * Decoded, verified license claims (Ed25519 JWT — v2 §7.2). `features`
 * is authoritative when present; when omitted the tier's default feature
 * set (see `featuresForTier`) applies.
 */
export type LicenseClaims = {
  tier: Tier;
  features?: FeatureFlag[];
  seats: number;
  /** ISO date. Access granted while build releaseDate <= activeUntil. */
  activeUntil: string;
  licenseId: string;
  subject: string;
};
