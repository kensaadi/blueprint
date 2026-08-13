/**
 * Marketplace data-access seam — the boundary to the Foundry control
 * plane's marketplace module.
 *
 * This file is now a thin ADAPTER over the api layer
 * (`../api/marketplace/service`). It preserves the original plain-
 * promise signatures so existing consumers (MarketplacePanel,
 * MarketplaceCarousel, TemplateDetailModal) stay untouched, while the
 * real transport (live Foundry vs static mock) is chosen by
 * `VITE_PROVIDER` inside the api layer.
 *
 *   getCatalog()      → GET /marketplace          (the card list)
 *   getTemplate(id)   → GET /marketplace/:id       (card + contract)
 *
 * New UI that needs error branching or the Stripe flows should import
 * from `../api/marketplace/service` directly and consume its `Result<T>`.
 */
import * as api from '../api/marketplace/service';
import type { MarketplaceTemplate } from './types';

export async function getCatalog(): Promise<MarketplaceTemplate[]> {
  const r = await api.getCatalog();
  if (r.error) throw r.error;
  return r.data;
}

export async function getTemplate(
  id: string,
): Promise<MarketplaceTemplate | undefined> {
  const r = await api.getTemplate(id);
  if (r.error) {
    // Preserve the legacy "not found ⇒ undefined" contract; surface
    // everything else so the caller sees a real failure.
    if (r.error.code === 'NOT_FOUND') return undefined;
    throw r.error;
  }
  return r.data;
}
