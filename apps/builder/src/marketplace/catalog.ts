/**
 * Marketplace catalog — first-party template listings.
 *
 * Scaffolding sample set. In production this list is served by the
 * Control Plane's marketplace module (see `service.ts` for the seam that
 * will become the HTTP call). Each entry now carries a real `contract`
 * so the detail modal can render a live preview via DashBlueprint — the
 * contracts are reused from the built-in seeds to keep the mock DRY.
 */
import type { MarketplaceTemplate } from './types';
import { LOGIN, KYC, CHECKOUT, LANDING } from '../templates/library';

export const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'mkt-admin-dashboard',
    name: 'Admin dashboard',
    description: 'Stats, table, filters.',
    icon: 'dashboard',
    categories: ['dashboards'],
    pricing: { kind: 'free' },
    contract: LANDING,
  },
  {
    id: 'mkt-billing-portal',
    name: 'Billing portal',
    description: 'Plans, invoices, cards.',
    icon: 'report-money',
    categories: ['commerce'],
    pricing: { kind: 'paid', priceUsd: 29 },
    contract: CHECKOUT,
  },
  {
    id: 'mkt-onboarding-wizard',
    name: 'Onboarding wizard',
    description: 'Multi-step invite flow.',
    icon: 'users',
    categories: ['onboarding', 'auth'],
    pricing: { kind: 'paid', priceUsd: 19 },
    contract: KYC,
  },
  {
    id: 'mkt-booking-flow',
    name: 'Booking flow',
    description: 'Calendar, slots, confirm.',
    icon: 'calendar-event',
    categories: ['commerce'],
    pricing: { kind: 'free' },
    contract: LOGIN,
  },
  {
    id: 'mkt-checkout-pro',
    name: 'Checkout pro',
    description: 'Cart, address, payment.',
    icon: 'shopping-cart',
    categories: ['commerce'],
    pricing: { kind: 'paid', priceUsd: 39 },
    contract: CHECKOUT,
  },
  {
    id: 'mkt-kyc-pro',
    name: 'KYC pro',
    description: 'ID upload, checks, consent.',
    icon: 'user-check',
    categories: ['auth', 'onboarding'],
    pricing: { kind: 'paid', priceUsd: 24 },
    contract: KYC,
  },
];
