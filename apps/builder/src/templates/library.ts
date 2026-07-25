/**
 * Template library — a small curated set of starter contracts the
 * user can drop onto an empty canvas.
 *
 * Each template is a full `Contract` — same shape the runtime consumes,
 * same shape `Import` reads. Adding a new template is a matter of
 * pushing an entry here; the empty-state card grid pulls the list.
 *
 * Templates aim to demonstrate the framework rather than to ship
 * production-grade UX. The Builder user is expected to rename fields,
 * adjust labels, and tune validation once the template is on the
 * canvas.
 */
import type { Contract } from '../state/types';
// `buildKitchenSink` is intentionally NOT surfaced in the templates
// grid — it exists purely as a testing artefact for the round-trip
// snapshot suite (see `src/builder/state/roundTrip.test.ts`).

/**
 * Where a template comes from. Drives which lane it appears in on the
 * Dashboard start area:
 *   - `builtin`     → the curated quick-start set shipped with the Builder
 *   - `customer`    → contracts the user saved as their own template
 *   - `marketplace` → free/paid templates from the in-Builder Store
 *
 * Source is independent of pricing/ownership: a `marketplace` template
 * may be free or paid, and being paid never depends on the user's tier
 * (Decision #37 — see `licensing/entitlements.tsx`).
 */
export type TemplateSource = 'builtin' | 'customer' | 'marketplace';

export type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
  source: TemplateSource;
  contract: Contract;
};

/** Prefix ids so instances of the same template don't clash on import. */
function n(id: string): string {
  return 'tpl_' + id;
}

export const LOGIN: Contract = {
  version: '1.0',
  root: {
    id: 'login',
    type: 'form',
    props: {},
    children: [
      {
        id: n('login-stack'),
        type: 'stack',
        props: { direction: 'column', spacing: 'md' },
        children: [
          {
            id: n('login-heading'),
            type: 'heading',
            props: { level: 2, children: 'Sign in' },
            children: [],
          },
          {
            id: n('login-email'),
            type: 'field',
            props: {
              name: 'email',
              label: 'Email',
              placeholder: 'you@example.com',
              type: 'email',
              required: true,
            },
            children: [],
          },
          {
            id: n('login-password'),
            type: 'field',
            props: {
              name: 'password',
              label: 'Password',
              type: 'password',
              required: true,
            },
            children: [],
          },
          {
            id: n('login-remember'),
            type: 'checkbox',
            props: { name: 'remember', label: 'Remember me on this device' },
            children: [],
          },
          {
            id: n('login-submit'),
            type: 'submit',
            props: { label: 'Sign in', variant: 'solid' },
            children: [],
          },
        ],
      },
    ],
    slots: undefined,
  } as Contract['root'],
};

export const KYC: Contract = {
  version: '1.0',
  root: {
    id: 'kyc',
    type: 'form',
    props: {},
    children: [
      {
        id: n('kyc-heading'),
        type: 'heading',
        props: { level: 2, children: 'Identity verification' },
        children: [],
      },
      {
        id: n('kyc-firstName'),
        type: 'field',
        props: { name: 'firstName', label: 'First name', required: true },
        children: [],
      },
      {
        id: n('kyc-lastName'),
        type: 'field',
        props: { name: 'lastName', label: 'Last name', required: true },
        children: [],
      },
      {
        id: n('kyc-birth'),
        type: 'date',
        props: { name: 'birthDate', label: 'Date of birth', required: true },
        children: [],
      },
      {
        id: n('kyc-country'),
        type: 'select',
        props: {
          name: 'country',
          label: 'Country of residence',
          required: true,
          options: [
            { value: 'IT', label: 'Italy' },
            { value: 'FR', label: 'France' },
            { value: 'DE', label: 'Germany' },
            { value: 'ES', label: 'Spain' },
          ],
        },
        children: [],
      },
      {
        id: n('kyc-taxid'),
        type: 'field',
        props: {
          name: 'taxId',
          label: 'Tax ID / Codice fiscale',
          required: true,
        },
        // Only show when country == IT — demonstrates visibility rules.
        visibility: { field: '$form.country', eq: 'IT' },
        children: [],
      },
      {
        id: n('kyc-consent'),
        type: 'checkbox',
        props: {
          name: 'consent',
          label: 'I agree to the identity checks described in the privacy policy',
        },
        children: [],
      },
      {
        id: n('kyc-submit'),
        type: 'submit',
        props: { label: 'Submit for review', variant: 'solid' },
        children: [],
      },
    ],
  } as Contract['root'],
};

/**
 * Non-form landing page — hero + features grid + FAQ + footer.
 * Demonstrates that the Blueprint contract is not form-centric: root
 * can be any container atom, and marketing / dashboard-style pages
 * compose from the same 36 atoms as forms do.
 */
export const LANDING: Contract = {
  version: '1.0',
  root: {
    id: 'landing',
    type: 'section',
    props: { spacing: 'lg' },
    children: [
      {
        id: n('land-hero'),
        type: 'stack',
        props: { direction: 'column', spacing: 'md', align: 'center' },
        children: [
          {
            id: n('land-hero-badge'),
            type: 'chip',
            props: { label: 'New · v1.0', color: 'primary' },
            children: [],
          },
          {
            id: n('land-hero-title'),
            type: 'heading',
            props: {
              level: 1,
              align: 'center',
              children: 'Ship visual UIs your team can actually maintain',
            },
            children: [],
          },
          {
            id: n('land-hero-sub'),
            type: 'text',
            props: {
              size: 'lg',
              align: 'center',
              tone: 'muted',
              children:
                'Declarative contracts, one runtime, two flavors. No custom DSL to learn.',
            },
            children: [],
          },
          {
            id: n('land-hero-ctas'),
            type: 'stack',
            props: { direction: 'row', spacing: 'sm', justify: 'center' },
            children: [
              {
                id: n('land-cta-primary'),
                type: 'button',
                props: { label: 'Get started', variant: 'solid' },
                children: [],
              },
              {
                id: n('land-cta-secondary'),
                type: 'button',
                props: { label: 'Read the docs', variant: 'ghost' },
                children: [],
              },
            ],
          },
        ],
      },
      { id: n('land-div-1'), type: 'divider', props: {}, children: [] },
      {
        id: n('land-features-title'),
        type: 'heading',
        props: { level: 2, align: 'center', children: 'Why teams pick us' },
        children: [],
      },
      {
        id: n('land-features-grid'),
        type: 'grid',
        props: { cols: 3, gap: 'md' },
        children: [
          {
            id: n('land-feat-1'),
            type: 'card',
            props: { p: 'md', rounded: 'lg', elevation: 1 },
            children: [
              {
                id: n('land-feat-1-h'),
                type: 'heading',
                props: { level: 3, children: 'Declarative' },
                children: [],
              },
              {
                id: n('land-feat-1-t'),
                type: 'text',
                props: {
                  children: 'A JSON contract renders everywhere the runtime does.',
                },
                children: [],
              },
            ],
          },
          {
            id: n('land-feat-2'),
            type: 'card',
            props: { p: 'md', rounded: 'lg', elevation: 1 },
            children: [
              {
                id: n('land-feat-2-h'),
                type: 'heading',
                props: { level: 3, children: 'Two flavors' },
                children: [],
              },
              {
                id: n('land-feat-2-t'),
                type: 'text',
                props: {
                  children: 'Tailwind or Material — swap the `lib` prop, keep the contract.',
                },
                children: [],
              },
            ],
          },
          {
            id: n('land-feat-3'),
            type: 'card',
            props: { p: 'md', rounded: 'lg', elevation: 1 },
            children: [
              {
                id: n('land-feat-3-h'),
                type: 'heading',
                props: { level: 3, children: 'Escape hatch' },
                children: [],
              },
              {
                id: n('land-feat-3-t'),
                type: 'text',
                props: {
                  children:
                    "Anything the catalog doesn't cover, drop in via `customNodes`.",
                },
                children: [],
              },
            ],
          },
        ],
      },
      { id: n('land-div-2'), type: 'divider', props: {}, children: [] },
      {
        id: n('land-faq-title'),
        type: 'heading',
        props: { level: 2, align: 'center', children: 'Frequently asked' },
        children: [],
      },
      {
        // Panel bodies live in `children`, one per item — the accordion
        // binding zips `items[i]` with `Children.toArray(children)[i]`.
        id: n('land-faq'),
        type: 'accordion',
        props: {
          type: 'single',
          items: [
            { value: 'q-lib',   header: 'Can I use my own component library?' },
            { value: 'q-forms', header: 'Is it only for forms?' },
            { value: 'q-size',  header: 'How big is the runtime?' },
          ],
        },
        children: [
          {
            id: n('land-faq-a1'),
            type: 'text',
            props: {
              children:
                'Yes — write a set of bindings for your library and register them as a flavor. The contract stays untouched.',
            },
            children: [],
          },
          {
            id: n('land-faq-a2'),
            type: 'text',
            props: {
              children:
                'No. Any tree of atoms is a valid contract — landing pages, dashboards, wizards, or plain content pages.',
            },
            children: [],
          },
          {
            id: n('land-faq-a3'),
            type: 'text',
            props: {
              children:
                'The core runtime is small; the flavor pack (Tailwind or MUI) is what dominates the bundle. Tree-shaken by default.',
            },
            children: [],
          },
        ],
      },
      { id: n('land-div-3'), type: 'divider', props: {}, children: [] },
      {
        id: n('land-footer'),
        type: 'stack',
        props: { direction: 'row', spacing: 'md', justify: 'between', align: 'center' },
        children: [
          {
            id: n('land-footer-copy'),
            type: 'text',
            props: { size: 'sm', tone: 'muted', children: '© 2026 Dashforge' },
            children: [],
          },
          {
            id: n('land-footer-links'),
            type: 'stack',
            props: { direction: 'row', spacing: 'sm' },
            children: [
              {
                id: n('land-footer-privacy'),
                type: 'button',
                props: { label: 'Privacy', variant: 'ghost' },
                children: [],
              },
              {
                id: n('land-footer-terms'),
                type: 'button',
                props: { label: 'Terms', variant: 'ghost' },
                children: [],
              },
              {
                id: n('land-footer-contact'),
                type: 'button',
                props: { label: 'Contact', variant: 'ghost' },
                children: [],
              },
            ],
          },
        ],
      },
    ],
  } as Contract['root'],
};

export const CHECKOUT: Contract = {
  version: '1.0',
  root: {
    id: 'checkout',
    type: 'form',
    props: {},
    children: [
      {
        id: n('co-heading'),
        type: 'heading',
        props: { level: 2, children: 'Checkout' },
        children: [],
      },
      {
        id: n('co-section-shipping'),
        type: 'section',
        props: { spacing: 'md' },
        children: [
          {
            id: n('co-shipping-heading'),
            type: 'heading',
            props: { level: 3, children: 'Shipping address' },
            children: [],
          },
          {
            id: n('co-street'),
            type: 'field',
            props: { name: 'street', label: 'Street', required: true },
            children: [],
          },
          {
            id: n('co-city'),
            type: 'field',
            props: { name: 'city', label: 'City', required: true },
            children: [],
          },
          {
            id: n('co-zip'),
            type: 'field',
            props: { name: 'zip', label: 'ZIP / Postal code', required: true },
            children: [],
          },
        ],
      },
      {
        id: n('co-section-payment'),
        type: 'section',
        props: { spacing: 'md' },
        children: [
          {
            id: n('co-payment-heading'),
            type: 'heading',
            props: { level: 3, children: 'Payment' },
            children: [],
          },
          {
            id: n('co-method'),
            type: 'radio',
            props: {
              name: 'paymentMethod',
              label: 'Method',
              required: true,
              options: [
                { value: 'card', label: 'Credit card' },
                { value: 'paypal', label: 'PayPal' },
                { value: 'bank', label: 'Bank transfer' },
              ],
            },
            children: [],
          },
          {
            id: n('co-card-number'),
            type: 'field',
            props: { name: 'cardNumber', label: 'Card number' },
            visibility: { field: '$form.paymentMethod', eq: 'card' },
            children: [],
          },
          {
            id: n('co-card-exp'),
            type: 'field',
            props: { name: 'cardExpiry', label: 'Expiry (MM / YY)' },
            visibility: { field: '$form.paymentMethod', eq: 'card' },
            children: [],
          },
        ],
      },
      {
        id: n('co-submit'),
        type: 'submit',
        props: { label: 'Place order', variant: 'solid' },
        children: [],
      },
    ],
  } as Contract['root'],
};

export const TEMPLATES: Template[] = [
  {
    id: 'login',
    name: 'Sign in',
    description: 'Email + password with remember-me and a submit button.',
    icon: 'login',
    source: 'builtin',
    contract: LOGIN,
  },
  {
    id: 'kyc',
    name: 'KYC — Identity check',
    description:
      'Name, birth date, country, and a tax ID that only appears when Country = Italy.',
    icon: 'user-check',
    source: 'builtin',
    contract: KYC,
  },
  {
    id: 'checkout',
    name: 'Checkout',
    description:
      'Shipping address, payment method selector with card fields shown only when card is chosen.',
    icon: 'shopping-cart',
    source: 'builtin',
    contract: CHECKOUT,
  },
  {
    id: 'landing',
    name: 'Landing page',
    description:
      'Non-form page — hero, three-feature grid, FAQ accordion, footer. Proof that the contract fits marketing pages too.',
    icon: 'world',
    source: 'builtin',
    contract: LANDING,
  },
];
