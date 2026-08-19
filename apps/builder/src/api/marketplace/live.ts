import foundryClient from '../_shared/foundry.client';
import type { Contract } from '../../state/types';
import type {
  MarketplaceTemplate,
  TemplateCategory,
} from '../../marketplace/types';
import type { MarketplaceProvider } from './provider';
import {
  CardSchema,
  CatalogSchema,
  CheckoutSessionSchema,
  ReceiptSchema,
  type Card,
  type CheckoutSession,
  type Receipt,
} from './types';

/**
 * Wire card → domain template (minus contract). `categories` is
 * narrowed by cast: Foundry mirrors the Builder's category set, and an
 * unknown value degrades gracefully (the label lookup just misses).
 */
function cardToTemplate(c: Card): MarketplaceTemplate {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    icon: c.icon,
    categories: c.categories as TemplateCategory[],
    pricing: c.pricing,
  };
}

/**
 * Contract fetch — a SINGLE hop. `GET /marketplace/:id/content` returns
 * the Blueprint contract JSON directly, proxied through Foundry (which
 * reads it from Spaces server-side). The browser never touches Spaces, so
 * the only CORS surface is Foundry itself (wildcard) — previews load from
 * any self-hosted / custom-domain origin. Open access (preview before buy).
 */
async function fetchContract(id: string): Promise<Contract> {
  const { data } = await foundryClient.get<Contract>(
    `/marketplace/${encodeURIComponent(id)}/content`,
  );
  return data;
}

async function listCatalog(): Promise<MarketplaceTemplate[]> {
  const { data } = await foundryClient.get('/marketplace', {
    responseSchema: CatalogSchema,
  });
  return data.map(cardToTemplate);
}

async function getTemplate(id: string): Promise<MarketplaceTemplate> {
  const { data } = await foundryClient.get(
    `/marketplace/${encodeURIComponent(id)}`,
    { responseSchema: CardSchema },
  );
  const template = cardToTemplate(data);
  // Attach the contract for every template so the detail modal can render
  // a live preview (free or paid) — Foundry serves contracts openly; the
  // receipt gates "Use", not the preview. If the fetch fails, degrade to a
  // preview-less card rather than failing the whole detail view.
  try {
    template.contract = await fetchContract(id);
  } catch {
    // leave contract undefined — the modal shows its no-preview state
  }
  return template;
}

async function createCheckoutSession(
  templateId: string,
  returnUrl?: string,
): Promise<CheckoutSession> {
  const { data } = await foundryClient.post(
    '/marketplace/checkout-session',
    { templateId, returnUrl },
    { responseSchema: CheckoutSessionSchema },
  );
  return data;
}

async function getReceiptBySession(sessionId: string): Promise<Receipt> {
  const { data } = await foundryClient.get('/receipts', {
    params: { session_id: sessionId },
    responseSchema: ReceiptSchema,
  });
  return data;
}

const marketplaceLiveProvider: MarketplaceProvider = {
  listCatalog,
  getTemplate,
  createCheckoutSession,
  getReceiptBySession,
};
export default marketplaceLiveProvider;
