/**
 * License context — exposes the current verified tier + a feature check.
 *
 * Default (no provider value, or no token) = Community with an empty
 * feature set. Paid tiers arrive by decoding a pasted Ed25519 token into
 * `LicenseClaims`; that decoder + offline signature check is deferred
 * business logic (v2 §7). For now the provider accepts an optional
 * `claims` prop so the UI can be exercised at any tier during dev.
 *
 * Scope reminder (Decision #37): this context gates BUILDER FEATURES
 * only. It says nothing about template ownership — that is a separate,
 * tier-independent concern handled by `entitlements.ts`.
 */
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { FeatureFlag, LicenseClaims, Tier } from './types';
import { featuresForTier } from './tiers';

export type LicenseState = {
  tier: Tier;
  /** Effective feature set for the current tier/claims. */
  features: ReadonlySet<FeatureFlag>;
  /** Verified claims, or null when running unlicensed (Community). */
  claims: LicenseClaims | null;
  hasFeature: (flag: FeatureFlag) => boolean;
};

const COMMUNITY: LicenseState = {
  tier: 'community',
  features: new Set(),
  claims: null,
  hasFeature: () => false,
};

const LicenseCtx = createContext<LicenseState>(COMMUNITY);

function deriveState(claims: LicenseClaims | null): LicenseState {
  if (!claims) return COMMUNITY;
  // `features` on the token is authoritative; fall back to the tier's
  // default ladder when the token doesn't carry an explicit list.
  const list = claims.features ?? featuresForTier(claims.tier);
  const features = new Set<FeatureFlag>(list);
  return {
    tier: claims.tier,
    features,
    claims,
    hasFeature: (flag) => features.has(flag),
  };
}

export function LicenseProvider({
  claims = null,
  children,
}: {
  /** Verified claims; omit (or null) to run as Community. */
  claims?: LicenseClaims | null;
  children: ReactNode;
}) {
  const value = useMemo(() => deriveState(claims), [claims]);
  return <LicenseCtx.Provider value={value}>{children}</LicenseCtx.Provider>;
}

export function useLicense(): LicenseState {
  return useContext(LicenseCtx);
}

/** Current tier — for the tier strip / upgrade prompts. */
export function useTier(): Tier {
  return useContext(LicenseCtx).tier;
}

/** Gate a Builder capability. `false` under Community. */
export function useFeature(flag: FeatureFlag): boolean {
  return useContext(LicenseCtx).hasFeature(flag);
}
