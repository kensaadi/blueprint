/**
 * Tier catalog — display metadata + the tier→features ladder.
 *
 * Pure data, no business logic. `cta` encodes the ratified purchase
 * path (v2 §4/§7):
 *   - community  → 'none'    (the default; no token, no checkout)
 *   - pro/team/business → 'stripe'  (self-serve, vendor-hosted checkout)
 *   - enterprise → 'contact' (contact form — NO amount, NO Stripe)
 *
 * `priceLabel` is exactly what the UI renders. Enterprise deliberately
 * carries NO number — its label is "Contact us". The internal ~€25k/yr
 * reference lives only in the design doc, never in the app.
 */
import type { Tier, FeatureFlag } from './types';

export type TierCta = 'none' | 'stripe' | 'contact';

export type TierMeta = {
  id: Tier;
  label: string;
  /** Rendered price string. Enterprise carries no amount by design. */
  priceLabel: string;
  /** One-line positioning for the tier strip / upgrade dialog. */
  tagline: string;
  cta: TierCta;
  /** Cumulative — each tier is a superset of the one before it. */
  features: FeatureFlag[];
  /** Human-readable bullets shown as ✓ on the plan card. */
  highlights: string[];
  /** Optional constraint line (seats), shown muted under the bullets. */
  note?: string;
};

// Basic server-side storage is free (Model A) — not a Pro perk. Pro is the
// AI copilot + version history; the paid ladder builds from there.
const PRO_FEATURES: FeatureFlag[] = ['ai-assist', 'versioning'];
const TEAM_FEATURES: FeatureFlag[] = [
  ...PRO_FEATURES,
  'shared-workspaces',
  'collab-lock',
  'workspace-roles',
  'deploy-pipeline',
];
const BUSINESS_FEATURES: FeatureFlag[] = [...TEAM_FEATURES, 'sso', 'audit-log'];
const ENTERPRISE_FEATURES: FeatureFlag[] = [
  ...BUSINESS_FEATURES,
  'saml',
  'on-prem-license',
  'custom-catalog',
];

/** Ordered lowest→highest; the tier strip and upgrade UI iterate this. */
export const TIERS: readonly TierMeta[] = [
  {
    id: 'community',
    label: 'Community',
    priceLabel: 'Free',
    tagline: 'Unlimited atoms, saved on your server',
    cta: 'none',
    features: [],
    highlights: ['36 atoms · Tailwind + MUI', 'Unlimited projects', 'Saved on your server', 'Export JSON'],
  },
  {
    id: 'pro',
    label: 'Pro',
    priceLabel: '$39 / mo',
    tagline: 'AI authoring & version history',
    cta: 'stripe',
    features: PRO_FEATURES,
    highlights: [
      'Everything in Community',
      'AI: generate & edit contracts',
      'Version history & restore',
    ],
  },
  {
    id: 'team',
    label: 'Team',
    priceLabel: '$99 / seat / mo',
    tagline: 'Shared workspaces, lock & roles',
    cta: 'stripe',
    features: TEAM_FEATURES,
    highlights: ['Everything in Pro', 'Shared workspaces & seats', 'Roles & collab lock', 'Publish to environments'],
    note: 'min 3 seats',
  },
  {
    id: 'business',
    label: 'Business',
    priceLabel: '$399 / mo',
    tagline: 'SSO, audit log, flat pricing',
    cta: 'stripe',
    features: BUSINESS_FEATURES,
    highlights: ['Everything in Team', 'SSO (OAuth)', 'Audit log'],
    note: 'flat, up to 10 seats',
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    priceLabel: 'Contact us', // no amount, by design
    tagline: 'SAML, on-prem, dedicated support',
    cta: 'contact',
    features: ENTERPRISE_FEATURES,
    highlights: ['Everything in Business', 'SAML', 'On-prem & SLA', 'Private catalog'],
  },
];

const BY_ID: Record<Tier, TierMeta> = Object.fromEntries(
  TIERS.map((t) => [t.id, t]),
) as Record<Tier, TierMeta>;

export function getTierMeta(tier: Tier): TierMeta {
  return BY_ID[tier];
}

/** The default feature set for a tier, when a token doesn't list its own. */
export function featuresForTier(tier: Tier): FeatureFlag[] {
  return BY_ID[tier].features;
}

/** Rank for "is X at least Y" comparisons in upgrade prompts. */
export function tierRank(tier: Tier): number {
  return TIERS.findIndex((t) => t.id === tier);
}
