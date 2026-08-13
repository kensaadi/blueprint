import { MARKETPLACE_TEMPLATES } from '../../marketplace/catalog';
import type { MarketplaceTemplate } from '../../marketplace/types';
import type { ApiError } from '../_shared/error.types';
import type { MarketplaceProvider } from './provider';
import type { CheckoutSession, Receipt } from './types';

/**
 * Static marketplace provider — resolves from `catalog.ts`, the same
 * source the Builder used before the api layer existed. In mock mode
 * the catalog + detail paths are byte-identical to the old scaffolding
 * (contract stays inline on every card).
 *
 * The Stripe-backed methods (checkout, receipts) have no mock analogue —
 * there is no payment processor and no purchase state offline — so they
 * fail loudly, pointing the developer at `VITE_PROVIDER=live`.
 */

function makeError(
  code: ApiError['code'],
  message: string,
  status: number,
): ApiError {
  return { code, message, status };
}

// No artificial delay: mock mode resolves on a microtask so the catalog
// and detail paths stay visually identical to the pre-api scaffolding.
async function listCatalog(): Promise<MarketplaceTemplate[]> {
  return MARKETPLACE_TEMPLATES;
}

async function getTemplate(id: string): Promise<MarketplaceTemplate> {
  const template = MARKETPLACE_TEMPLATES.find((t) => t.id === id);
  if (!template) throw makeError('NOT_FOUND', 'template not found', 404);
  return template;
}

async function createCheckoutSession(): Promise<CheckoutSession> {
  throw makeError(
    'BUSINESS_ERROR',
    'Checkout is not available in mock mode — set VITE_PROVIDER=live.',
    400,
  );
}

async function getReceiptBySession(): Promise<Receipt> {
  throw makeError('NOT_FOUND', 'no receipts in mock mode', 404);
}

const marketplaceMockProvider: MarketplaceProvider = {
  listCatalog,
  getTemplate,
  createCheckoutSession,
  getReceiptBySession,
};
export default marketplaceMockProvider;
