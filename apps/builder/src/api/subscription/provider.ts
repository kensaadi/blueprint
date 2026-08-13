import { PROVIDER } from '../_shared/config';
import type { CatalogTier, CheckoutSession } from './types';

/**
 * Contract every subscription provider implements. `live.ts` talks to
 * Foundry; `mock.ts` resolves from the static `licensing/tiers.ts`.
 * Methods THROW on failure; the service layer wraps them in `attempt()`.
 *
 *   listTiers            → GET  /subscription/tiers
 *   createCheckoutSession→ POST /subscription/checkout-session
 *   openPortal           → POST /subscription/portal  (returns the URL)
 */
export interface SubscriptionProvider {
  listTiers(): Promise<CatalogTier[]>;
  createCheckoutSession(
    tierId: string,
    seats: number,
    returnUrl?: string,
  ): Promise<CheckoutSession>;
  openPortal(licenseId: string): Promise<string>;
}

const providerMapping: Record<string, () => Promise<SubscriptionProvider>> = {
  live: () => import('./live').then((m) => m.default),
  mock: () => import('./mock').then((m) => m.default),
};

export async function subscriptionProvider(): Promise<SubscriptionProvider> {
  const loader = providerMapping[PROVIDER];
  if (!loader) {
    throw new Error(`[subscription] provider "${PROVIDER}" not supported`);
  }
  return loader();
}
