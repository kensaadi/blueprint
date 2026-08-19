import { z } from 'zod';

/**
 * Wire schemas for the Foundry marketplace endpoints.
 *
 * These validate what Foundry returns; the domain type the Builder
 * consumes is `MarketplaceTemplate` (see `../../marketplace/types`) —
 * the mapper in `live.ts` bridges wire → domain. zod strips unknown
 * keys by default, so an additive Foundry change (a new field) never
 * trips CONTRACT_MISMATCH — the boundary stays forward-compatible.
 */

/** Pricing union — mirrors the domain `TemplatePricing`. */
const WirePricingSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('free') }),
  z.object({ kind: z.literal('paid'), priceUsd: z.number() }),
]);

/**
 * A product card from `GET /marketplace` / `GET /marketplace/:id`.
 * It is the domain `MarketplaceTemplate` WITHOUT `contract` — the
 * contract is delivered separately via the two-hop content endpoint.
 * `categories` is validated as loose strings (not the domain enum) so
 * a new Foundry category never rejects the whole payload.
 */
export const CardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  categories: z.array(z.string()),
  pricing: WirePricingSchema,
  /** Free-text revision marker from Foundry; drives the "new version" badge. */
  version: z.string().optional(),
});
export type Card = z.infer<typeof CardSchema>;

/** `GET /marketplace` — bare array of cards. */
export const CatalogSchema = z.array(CardSchema);

/** `GET /marketplace/:id/content` — presigned Spaces URL (hop 1 of 2). */
export const ContentUrlSchema = z.object({
  url: z.string(),
  expiresIn: z.number(),
});

/** `POST /marketplace/checkout-session` → hosted Stripe Checkout. */
export const CheckoutSessionSchema = z.object({
  sessionId: z.string(),
  url: z.string(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

/** `GET /receipts?session_id=…` — the buyer's signed purchase receipt. */
export const ReceiptSchema = z.object({
  token: z.string(),
  templateId: z.string(),
  receiptId: z.string(),
  purchasedAt: z.string(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;
