import { attempt } from '../_shared/attempt';
import type { Result } from '../_shared/result.types';
import type { MarketplaceTemplate } from '../../marketplace/types';
import { marketplaceProvider } from './provider';
import type { CheckoutSession, Receipt } from './types';

/**
 * Marketplace api surface — every function returns the `Result<T>`
 * envelope (never throws). The Builder's legacy seam
 * (`../../marketplace/service.ts`) adapts `getCatalog`/`getTemplate`
 * back to plain promises so existing consumers stay untouched; new UI
 * (checkout, receipts) can consume `Result` directly.
 */

export async function getCatalog(): Promise<Result<MarketplaceTemplate[]>> {
  const provider = await marketplaceProvider();
  return attempt(provider.listCatalog());
}

export async function getTemplate(
  id: string,
  receipt?: string,
): Promise<Result<MarketplaceTemplate>> {
  const provider = await marketplaceProvider();
  return attempt(provider.getTemplate(id, receipt));
}

/**
 * Start a one-shot template checkout. `returnUrl` defaults to THIS Builder's
 * own origin, so after payment Stripe brings the buyer back here with
 * `?checkout=success&session_id=…` and CheckoutReturn grants (and opens) the
 * purchased template. Critical for the self-hosted bundle, where every
 * customer's Builder lives at a different URL — without it Stripe would
 * redirect to Foundry (API-only → 404).
 */
export async function createCheckoutSession(
  templateId: string,
  returnUrl: string = defaultReturnUrl(),
): Promise<Result<CheckoutSession>> {
  const provider = await marketplaceProvider();
  return attempt(provider.createCheckoutSession(templateId, returnUrl));
}

function defaultReturnUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin + window.location.pathname;
}

export async function getReceiptBySession(
  sessionId: string,
): Promise<Result<Receipt>> {
  const provider = await marketplaceProvider();
  return attempt(provider.getReceiptBySession(sessionId));
}
