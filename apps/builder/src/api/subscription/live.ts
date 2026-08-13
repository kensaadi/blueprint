import foundryClient from '../_shared/foundry.client';
import type { FeatureFlag, Tier } from '../../licensing/types';
import type { TierCta } from '../../licensing/tiers';
import type { SubscriptionProvider } from './provider';
import {
  CheckoutSessionSchema,
  PortalSchema,
  TiersResponseSchema,
  type CatalogTier,
  type CheckoutSession,
  type WireTier,
} from './types';

/**
 * Wire tier → display `CatalogTier`. The id/cta/features are validated
 * as strings on the wire (forward-compatible) and narrowed here to the
 * Builder's unions; an unfamiliar value degrades gracefully rather than
 * rejecting the whole catalog.
 */
function wireToTier(w: WireTier): CatalogTier {
  return {
    id: w.id as Tier,
    label: w.label,
    priceLabel: w.priceLabel,
    tagline: w.tagline,
    cta: w.cta as TierCta,
    features: w.features as FeatureFlag[],
    highlights: w.highlights,
    note: w.note,
    seats: w.seats,
  };
}

async function listTiers(): Promise<CatalogTier[]> {
  const { data } = await foundryClient.get('/subscription/tiers', {
    responseSchema: TiersResponseSchema,
  });
  return data.tiers.map(wireToTier);
}

async function createCheckoutSession(
  tierId: string,
  seats: number,
  returnUrl?: string,
): Promise<CheckoutSession> {
  const { data } = await foundryClient.post(
    '/subscription/checkout-session',
    { tier: tierId, seats, returnUrl },
    { responseSchema: CheckoutSessionSchema },
  );
  return data;
}

async function openPortal(licenseId: string): Promise<string> {
  const { data } = await foundryClient.post(
    '/subscription/portal',
    { licenseId },
    { responseSchema: PortalSchema },
  );
  return data.url;
}

const subscriptionLiveProvider: SubscriptionProvider = {
  listTiers,
  createCheckoutSession,
  openPortal,
};
export default subscriptionLiveProvider;
