/**
 * Tier catalog context — the DYNAMIC tier source.
 *
 * Foundry's `GET /subscription/tiers` is the source of truth for tier
 * prices/features/labels across every Builder (change a price in
 * Foundry, it applies everywhere with no rebuild). This provider fetches
 * that catalog once at boot and exposes it through synchronous accessors
 * so the existing UI (which reads tiers synchronously) is untouched.
 *
 * The static `TIERS` ladder is DEMOTED to a typed FALLBACK: it seeds the
 * initial render (the plan strip appears instantly and works offline)
 * and stands in if the Foundry fetch fails (e.g. no network / CORS). A
 * successful fetch swaps in the live catalog.
 *
 * Scope: this is the SUBSCRIPTION axis (tier → Builder features). It is
 * orthogonal to template ownership (`entitlements.tsx`).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { TIERS } from './tiers';
import type { Tier } from './types';
import { getTiers } from '../api/subscription/service';
import type { CatalogTier } from '../api/subscription/types';

/**
 * Static ladder → fallback catalog. `seats` isn't part of the display
 * `TierMeta`; the static ladder encodes the per-seat minimum only in
 * prose (`note`), so the fallback uses 1 — real per-seat values arrive
 * with the live Foundry catalog.
 */
const FALLBACK_TIERS: CatalogTier[] = TIERS.map((t) => ({ ...t, seats: 1 }));

export type TierCatalogState = {
  /** Ordered lowest→highest, same as the static ladder. */
  tiers: CatalogTier[];
  /** True until the first Foundry fetch settles. */
  loading: boolean;
  /** Whether the current `tiers` came from Foundry (vs the fallback). */
  live: boolean;
  getTierMeta: (id: Tier) => CatalogTier | undefined;
};

const TierCatalogCtx = createContext<TierCatalogState>({
  tiers: FALLBACK_TIERS,
  loading: false,
  live: false,
  getTierMeta: (id) => FALLBACK_TIERS.find((t) => t.id === id),
});

export function TierCatalogProvider({ children }: { children: ReactNode }) {
  const [tiers, setTiers] = useState<CatalogTier[]>(FALLBACK_TIERS);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    getTiers().then((r) => {
      if (!alive) return;
      // On success swap in the live catalog; on any failure keep the
      // fallback so the plan strip never disappears.
      if (r.data && r.data.length > 0) {
        setTiers(r.data);
        setLive(true);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<TierCatalogState>(
    () => ({
      tiers,
      loading,
      live,
      getTierMeta: (id) => tiers.find((t) => t.id === id),
    }),
    [tiers, loading, live],
  );

  return (
    <TierCatalogCtx.Provider value={value}>{children}</TierCatalogCtx.Provider>
  );
}

export function useTierCatalog(): TierCatalogState {
  return useContext(TierCatalogCtx);
}
