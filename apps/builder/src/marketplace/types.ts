/**
 * Marketplace template types.
 *
 * A marketplace template is a ONE-TIME purchase, priced per template,
 * the same price for everyone regardless of subscription tier
 * (Decision #37). Pricing is a discriminated union so "free" is explicit
 * and never conflated with a $0 paid item.
 *
 * Ownership/access lives in `licensing/entitlements.tsx` — free OR owned,
 * never a tier check. This module carries no `Tier` reference on purpose.
 */
import type { Contract } from '../state/types';

export type TemplateCategory =
  | 'auth'
  | 'onboarding'
  | 'commerce'
  | 'dashboards'
  | 'marketing';

/** Human labels for categories — shared by the filter chips and the modal. */
export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  auth: 'Auth',
  onboarding: 'Onboarding',
  commerce: 'Commerce',
  dashboards: 'Dashboards',
  marketing: 'Marketing',
};

export type TemplatePricing =
  | { kind: 'free' }
  | { kind: 'paid'; /** Whole dollars, for display; real charge is server-side. */ priceUsd: number };

export type MarketplaceTemplate = {
  id: string;
  name: string;
  description: string;
  /** Tabler icon name, without the `ti-` prefix. */
  icon: string;
  /** One or more categories the template belongs to. */
  categories: TemplateCategory[];
  pricing: TemplatePricing;
  /**
   * The seeded contract, delivered for free templates and snapshot-on-buy
   * for paid ones. Undefined = preview-only card (not yet owned).
   */
  contract?: Contract;
};

export function isFreeTemplate(t: Pick<MarketplaceTemplate, 'pricing'>): boolean {
  return t.pricing.kind === 'free';
}

/** Badge label — "Free" or "$29". Same for every tier. */
export function priceLabel(t: Pick<MarketplaceTemplate, 'pricing'>): string {
  return t.pricing.kind === 'free' ? 'Free' : `$${t.pricing.priceUsd}`;
}
