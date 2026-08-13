/**
 * License context — the current verified tier + a feature check, plus
 * activation.
 *
 * A paid tier is a raw Ed25519 token (from a subscription checkout or a
 * pasted key). This provider:
 *   - hydrates the persisted token on boot and re-verifies it offline
 *     against the pinned Foundry key (`verifyToken.ts`),
 *   - exposes `activate(token)` (used by the checkout-return flow and
 *     the "Enter license" dialog) which verifies, persists, and applies,
 *   - exposes `deactivate()` to clear the license.
 *
 * A tampered/expired/foreign token simply fails verification and the
 * user stays Community — there is no server round-trip (design §7:
 * offline, never phone-home).
 *
 * Scope reminder (Decision #37): this gates BUILDER FEATURES only, never
 * template ownership (that is `entitlements.tsx`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { FeatureFlag, LicenseClaims, Tier } from './types';
import { featuresForTier } from './tiers';
import { verifyLicenseToken } from './verifyToken';
import {
  clearLicenseToken,
  loadLicenseToken,
  saveLicenseToken,
} from './licenseStore';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { sessionToken } from '../api/workspace/session';
import { getLicense, logout as workspaceLogout } from '../api/workspace/service';
import type { WorkspaceLicense } from '../api/workspace/types';

export type LicenseState = {
  tier: Tier;
  /** Effective feature set for the current tier/claims. */
  features: ReadonlySet<FeatureFlag>;
  /** Verified claims, or null when running unlicensed (Community). */
  claims: LicenseClaims | null;
  /**
   * True when a real license is registered but past its `activeUntil`
   * (JetBrains model: the WS keeps the customer READ-ONLY, never bricks —
   * writes are blocked server-side). The Builder shows a renew banner.
   */
  expired: boolean;
  hasFeature: (flag: FeatureFlag) => boolean;
  /**
   * Verify + apply a raw token (checkout return / pasted key). Persists
   * on success so it survives reload. Returns false if the token is
   * invalid or expired — the caller shows the error.
   */
  activate: (token: string) => Promise<boolean>;
  /** Drop the current license, back to Community. */
  deactivate: () => void;
  /** Re-read the WS-enforced license (after a workspace sign-in). */
  syncWorkspace: () => Promise<void>;
  /** Sign out of the workspace — the offline token (if any) resumes. */
  disconnectWorkspace: () => void;
};

type LicenseActions =
  | 'activate'
  | 'deactivate'
  | 'syncWorkspace'
  | 'disconnectWorkspace';

const NO_OP_ACTIVATE = async () => false;
const NO_OP = () => {};
const NO_OP_ASYNC = async () => {};

const COMMUNITY: Omit<LicenseState, LicenseActions> = {
  tier: 'community',
  features: new Set(),
  claims: null,
  expired: false,
  hasFeature: () => false,
};

const LicenseCtx = createContext<LicenseState>({
  ...COMMUNITY,
  activate: NO_OP_ACTIVATE,
  deactivate: NO_OP,
  syncWorkspace: NO_OP_ASYNC,
  disconnectWorkspace: NO_OP,
});

function deriveState(
  claims: LicenseClaims | null,
): Omit<LicenseState, LicenseActions> {
  if (!claims) return COMMUNITY;
  // `features` on the token is authoritative; fall back to the tier's
  // default ladder when the token doesn't carry an explicit list.
  const list = claims.features ?? featuresForTier(claims.tier);
  const features = new Set<FeatureFlag>(list);
  return {
    tier: claims.tier,
    features,
    claims,
    // A real license kept past its activeUntil = expired (read-only). The
    // offline-token path clears expired tokens to Community, so this only
    // ever fires for a WS-sourced license the server keeps enforcing.
    expired: !isActive(claims),
    hasFeature: (flag) => features.has(flag),
  };
}

/**
 * Offline access gate: a license applies while it is not past its
 * `activeUntil`. An empty date means perpetual (no expiry). We compare
 * against "now" here; the JetBrains-style build-date fallback is a
 * refinement for later.
 */
function isActive(claims: LicenseClaims): boolean {
  if (!claims.activeUntil) return true;
  const until = Date.parse(claims.activeUntil);
  if (Number.isNaN(until)) return true;
  return Date.now() <= until;
}

/**
 * Map the WS's authoritative license state → LicenseClaims. Only called
 * for a real (source="foundry") license; community is represented as null.
 */
function wsLicenseToClaims(l: WorkspaceLicense): LicenseClaims {
  return {
    tier: l.tier as Tier,
    features: l.features as FeatureFlag[],
    seats: l.seats,
    activeUntil: l.activeUntil,
    licenseId: l.licenseId ?? '',
    subject: l.subject ?? '',
  };
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => loadLicenseToken());
  const [tokenClaims, setTokenClaims] = useState<LicenseClaims | null>(null);
  // undefined = the Workspace Service has not sourced a license, so the
  // offline token wins. Once the WS answers it is AUTHORITATIVE — even
  // when the answer is Community (null): a server that enforces the
  // license overrides a client-held token.
  const [wsClaims, setWsClaims] = useState<LicenseClaims | null | undefined>(
    undefined,
  );

  // Offline token path (pasted key) — the fallback when there is no
  // Workspace Service. Unchanged.
  useEffect(() => {
    let alive = true;
    if (!token) {
      setTokenClaims(null);
      return;
    }
    verifyLicenseToken(token).then((verified) => {
      if (!alive) return;
      if (verified && isActive(verified)) {
        setTokenClaims(verified);
      } else {
        setTokenClaims(null);
        clearLicenseToken();
        setToken(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [token]);

  // Workspace-sourced path (authoritative). When a WS is configured and
  // the user is signed in, the WS-enforced entitlement is the source of
  // truth. On a WS error (offline / not signed in) wsClaims stays
  // undefined and the offline token still applies.
  const syncWorkspace = useCallback(async () => {
    if (!HAS_WORKSPACE || !sessionToken()) {
      setWsClaims(undefined);
      return;
    }
    const r = await getLicense();
    // A reachable WS is authoritative (even when it answers Community); an
    // error leaves wsClaims undefined so the offline token still applies.
    setWsClaims(
      r.data ? (r.data.source === 'foundry' ? wsLicenseToClaims(r.data) : null) : undefined,
    );
  }, []);

  const disconnectWorkspace = useCallback(() => {
    workspaceLogout();
    setWsClaims(undefined);
  }, []);

  // Source the WS license on boot (and re-source after a sign-in).
  useEffect(() => {
    void syncWorkspace();
  }, [syncWorkspace]);

  // The Workspace Service, when it has spoken, outranks the offline token.
  const claims = wsClaims !== undefined ? wsClaims : tokenClaims;

  const activate = useCallback(async (raw: string): Promise<boolean> => {
    const verified = await verifyLicenseToken(raw);
    if (!verified || !isActive(verified)) return false;
    saveLicenseToken(raw);
    setToken(raw);
    setTokenClaims(verified);
    return true;
  }, []);

  const deactivate = useCallback(() => {
    clearLicenseToken();
    setToken(null);
    setTokenClaims(null);
  }, []);

  const value = useMemo<LicenseState>(
    () => ({
      ...deriveState(claims),
      activate,
      deactivate,
      syncWorkspace,
      disconnectWorkspace,
    }),
    [claims, activate, deactivate, syncWorkspace, disconnectWorkspace],
  );

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

/** True when the registered license has lapsed (read-only mode). */
export function useLicenseExpired(): boolean {
  return useContext(LicenseCtx).expired;
}
