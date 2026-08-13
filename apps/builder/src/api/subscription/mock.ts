import { TIERS } from '../../licensing/tiers';
import type { Tier } from '../../licensing/types';
import type { ApiError } from '../_shared/error.types';
import type { SubscriptionProvider } from './provider';
import type { CatalogTier, CheckoutSession } from './types';

/**
 * Static subscription provider — resolves the tier catalog from
 * `licensing/tiers.ts`, so mock mode shows the exact same plan strip
 * the Builder rendered before the api layer. The Stripe-backed methods
 * (checkout, portal) have no offline analogue and fail loudly.
 */

function makeError(
  code: ApiError['code'],
  message: string,
  status: number,
): ApiError {
  return { code, message, status };
}

/** Per-seat minimum for the mock; only Team is per-seat in the ladder. */
const MOCK_SEATS: Record<Tier, number> = {
  community: 1,
  pro: 1,
  team: 3,
  business: 1,
  enterprise: 1,
};

async function listTiers(): Promise<CatalogTier[]> {
  return TIERS.map((t) => ({ ...t, seats: MOCK_SEATS[t.id] ?? 1 }));
}

async function createCheckoutSession(
  _tierId?: string,
  _seats?: number,
  _returnUrl?: string,
): Promise<CheckoutSession> {
  throw makeError(
    'BUSINESS_ERROR',
    'Checkout is not available in mock mode — set VITE_PROVIDER=live.',
    400,
  );
}

async function openPortal(): Promise<string> {
  throw makeError(
    'BUSINESS_ERROR',
    'Billing portal is not available in mock mode — set VITE_PROVIDER=live.',
    400,
  );
}

const subscriptionMockProvider: SubscriptionProvider = {
  listTiers,
  createCheckoutSession,
  openPortal,
};
export default subscriptionMockProvider;
