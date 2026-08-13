import { attempt } from '../_shared/attempt';
import type { Result } from '../_shared/result.types';
import { subscriptionProvider } from './provider';
import type { CatalogTier, CheckoutSession } from './types';

/**
 * Subscription api surface — every function returns `Result<T>`.
 * `getTiers` powers the dynamic tier catalog (TierCatalogProvider);
 * checkout + portal back the Plans UI (wired with the license return
 * flow).
 */

export async function getTiers(): Promise<Result<CatalogTier[]>> {
  const provider = await subscriptionProvider();
  return attempt(provider.listTiers());
}

/**
 * Start a subscription checkout. `returnUrl` defaults to THIS Builder's own
 * origin, so after payment Stripe brings the buyer back here with
 * `?checkout=success&session_id=…` and CheckoutReturn registers the license
 * into this workspace. Critical for the self-hosted bundle, where every
 * customer's Builder lives at a different URL.
 */
export async function createCheckoutSession(
  tierId: string,
  seats: number,
  returnUrl: string = defaultReturnUrl(),
): Promise<Result<CheckoutSession>> {
  const provider = await subscriptionProvider();
  return attempt(provider.createCheckoutSession(tierId, seats, returnUrl));
}

function defaultReturnUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin + window.location.pathname;
}

export async function openPortal(licenseId: string): Promise<Result<string>> {
  const provider = await subscriptionProvider();
  return attempt(provider.openPortal(licenseId));
}
