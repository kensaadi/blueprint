import { PROVIDER } from '../_shared/config';
import type { MarketplaceTemplate } from '../../marketplace/types';
import type { CheckoutSession, Receipt } from './types';

/**
 * Contract every marketplace provider implements. Two interchangeable
 * implementations live in `live.ts` (Foundry over HTTP) and `mock.ts`
 * (the static `catalog.ts`); the active one is chosen by `VITE_PROVIDER`.
 *
 * Provider methods THROW on failure (ApiError-shaped). The service layer
 * wraps each call in `attempt()` to return the `Result<T>` envelope —
 * mirroring the booking-kit split.
 *
 *   listCatalog          → GET  /marketplace
 *   getTemplate          → GET  /marketplace/:id  (+ two-hop contract)
 *   createCheckoutSession→ POST /marketplace/checkout-session
 *   getReceiptBySession  → GET  /receipts?session_id=…
 */
export interface MarketplaceProvider {
  listCatalog(): Promise<MarketplaceTemplate[]>;
  /**
   * A single card. The Blueprint `contract` is attached for FREE
   * templates (and for paid ones when a valid `receipt` is supplied);
   * for a paid, not-yet-owned template it stays undefined — a
   * preview-only card, matching the pay-before-you-get-the-goods gate.
   */
  getTemplate(id: string, receipt?: string): Promise<MarketplaceTemplate>;
  createCheckoutSession(templateId: string): Promise<CheckoutSession>;
  getReceiptBySession(sessionId: string): Promise<Receipt>;
}

const providerMapping: Record<string, () => Promise<MarketplaceProvider>> = {
  live: () => import('./live').then((m) => m.default),
  mock: () => import('./mock').then((m) => m.default),
};

export async function marketplaceProvider(): Promise<MarketplaceProvider> {
  const loader = providerMapping[PROVIDER];
  if (!loader) {
    throw new Error(`[marketplace] provider "${PROVIDER}" not supported`);
  }
  return loader();
}
