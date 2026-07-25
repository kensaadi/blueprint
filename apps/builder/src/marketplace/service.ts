/**
 * Marketplace data-access seam — the boundary that becomes the HTTP
 * client for the Control Plane's marketplace web-service.
 *
 * Today it resolves from the static `catalog.ts` mock; tomorrow these two
 * functions become `fetch()` calls and NOTHING else in the Builder
 * changes. Keeping the surface async now means the UI already handles the
 * loading shape.
 *
 *   getCatalog()      → GET /marketplace          (the card list)
 *   getTemplate(id)   → GET /marketplace/:id       (full detail + contract)
 *
 * The service serves DATA (metadata + the contract JSON), never rendered
 * images — the client renders the contract locally (the Blueprint model).
 */
import { MARKETPLACE_TEMPLATES } from './catalog';
import type { MarketplaceTemplate } from './types';

export async function getCatalog(): Promise<MarketplaceTemplate[]> {
  return MARKETPLACE_TEMPLATES;
}

export async function getTemplate(
  id: string,
): Promise<MarketplaceTemplate | undefined> {
  return MARKETPLACE_TEMPLATES.find((t) => t.id === id);
}
