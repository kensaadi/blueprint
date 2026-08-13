import { z } from 'zod';
import type { TierMeta } from '../../licensing/tiers';

/**
 * Wire schemas for the Foundry subscription endpoints.
 *
 * `GET /subscription/tiers` is Foundry's dynamic tier catalog — the
 * source of truth for prices/features/labels across every Builder. The
 * Builder maps each wire tier onto its display `TierMeta` (see
 * `live.ts`), carrying the extra `seats` needed for per-seat checkout.
 * Unknown keys are stripped by default, so additive Foundry fields
 * never trip CONTRACT_MISMATCH.
 */

/** Purchase path — mirrors the domain `TierCta`. */
export const TierCtaSchema = z.enum(['none', 'stripe', 'contact']);

export const WireTierSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceLabel: z.string(),
  tagline: z.string(),
  cta: TierCtaSchema,
  features: z.array(z.string()),
  highlights: z.array(z.string()),
  seats: z.number(),
  note: z.string().optional(),
});
export type WireTier = z.infer<typeof WireTierSchema>;

/** `GET /subscription/tiers` — Foundry wraps the list in `{ tiers }`. */
export const TiersResponseSchema = z.object({ tiers: z.array(WireTierSchema) });

/** `POST /subscription/checkout-session` → hosted Stripe Checkout. */
export const CheckoutSessionSchema = z.object({
  sessionId: z.string(),
  url: z.string(),
});
export type CheckoutSession = z.infer<typeof CheckoutSessionSchema>;

/** `POST /subscription/portal` → Stripe billing-portal URL. */
export const PortalSchema = z.object({ url: z.string() });

/**
 * The display tier the Builder consumes: the licensing `TierMeta`
 * (labels, price, features, cta) plus the numeric `seats` minimum used
 * when starting a per-seat checkout.
 */
export type CatalogTier = TierMeta & { seats: number };
