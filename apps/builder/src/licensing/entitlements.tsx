/**
 * Template entitlements — which marketplace templates the user owns.
 *
 * ORTHOGONAL TO TIER (Decision #37). A marketplace template is a
 * standalone, one-shot purchase at the SAME price for everyone; a
 * Community user and an Enterprise user pay the identical amount and get
 * the identical thing. Access therefore depends ONLY on:
 *
 *     free  OR  already-owned
 *
 * By design this module imports nothing from `./types` — no `Tier`, no
 * `FeatureFlag`. If access logic ever needs a tier, the model is wrong.
 *
 * Purchase + persistence are deferred business logic; here we model the
 * READ side (what do I own, can I use this) with an injectable initial
 * set so the UI can be exercised.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * The minimal shape template-access needs. Any richer marketplace
 * template type satisfies this structurally. Note the absence of
 * anything tier-related — that is the whole point.
 */
export type OwnableTemplate = {
  id: string;
  /** Free templates are usable by anyone without a purchase. */
  free: boolean;
};

/** Pure access check — free OR owned. Never consults a tier. */
export function canUseTemplate(
  template: OwnableTemplate,
  owned: ReadonlySet<string>,
): boolean {
  return template.free || owned.has(template.id);
}

export type EntitlementsState = {
  ownedTemplateIds: ReadonlySet<string>;
  owns: (templateId: string) => boolean;
  canUse: (template: OwnableTemplate) => boolean;
  /**
   * Records ownership locally. The real flow (Stripe one-shot → grant →
   * persist) replaces this; kept here so the marketplace "Buy" path has
   * a seam to call during scaffolding.
   */
  grant: (templateId: string) => void;
};

const EMPTY: ReadonlySet<string> = new Set();

const EntitlementsCtx = createContext<EntitlementsState>({
  ownedTemplateIds: EMPTY,
  owns: () => false,
  canUse: (t) => canUseTemplate(t, EMPTY),
  grant: () => {},
});

export function EntitlementsProvider({
  initialOwned,
  children,
}: {
  /** Seed owned ids (e.g. restored from local persistence). */
  initialOwned?: Iterable<string>;
  children: ReactNode;
}) {
  const [owned, setOwned] = useState<ReadonlySet<string>>(
    () => new Set(initialOwned ?? []),
  );

  const grant = useCallback((templateId: string) => {
    setOwned((prev) => {
      if (prev.has(templateId)) return prev;
      const next = new Set(prev);
      next.add(templateId);
      return next;
    });
  }, []);

  const value = useMemo<EntitlementsState>(
    () => ({
      ownedTemplateIds: owned,
      owns: (id) => owned.has(id),
      canUse: (t) => canUseTemplate(t, owned),
      grant,
    }),
    [owned, grant],
  );

  return (
    <EntitlementsCtx.Provider value={value}>
      {children}
    </EntitlementsCtx.Provider>
  );
}

export function useEntitlements(): EntitlementsState {
  return useContext(EntitlementsCtx);
}
