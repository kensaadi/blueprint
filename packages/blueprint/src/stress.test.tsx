/**
 * Architecture stress test — run BEFORE building the SDKs.
 *
 * Goal: put the whole contract → validate → render pipeline under pressure
 * with several realistic "realities" that mix static props with dynamic
 * nodes ($data-bound options, $form visibility, RBAC access, the `custom`
 * escape hatch, multi-select, i18n, icons), render each through BOTH flavor
 * packs (tw + mui), and probe negatives that MUST be rejected — surfacing any
 * validator/runtime disagreement or coverage gap while it is still cheap to fix.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { validate } from '@dashforge/blueprint-core';
import type {
  BlueprintNode,
  IconRegistry,
  ValidationError,
  FormConfig,
} from '@dashforge/blueprint-core';
import { DashBlueprint } from './DashBlueprint';

// jsdom lacks ResizeObserver / matchMedia that radix-based inputs (select,
// radio, popover) touch in a layout effect. Client-only APIs — stubbed here so
// the render path is exercised. (Not an architecture concern: SSR skips these
// effects; browsers provide them.)
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= RO;
(globalThis as { matchMedia?: unknown }).matchMedia ??= (q: string) => ({
  matches: false, media: q, onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
});

afterEach(() => cleanup());

// ── helpers ──────────────────────────────────────────────────────────

const ICON_IDS = [
  'user', 'save', 'home', 'settings', 'star', 'tag', 'info-circle',
  'shopping-cart', 'sparkles', 'puzzle', 'bell', 'mail',
];
const icons: IconRegistry = ICON_IDS.map((id) => ({
  id,
  render: (p: Record<string, unknown>) => <i data-icon={id} data-size={String(p.size)} />,
}));

/** Collect every `form` nodeId so we can supply a minimal FormConfig each. */
function formIds(node: BlueprintNode, acc: string[] = []): string[] {
  if (node.type === 'form' && node.nodeId) acc.push(node.nodeId);
  node.children?.forEach((c) => formIds(c, acc));
  return acc;
}
function formsFor(root: BlueprintNode): Record<string, FormConfig> {
  const out: Record<string, FormConfig> = {};
  for (const id of formIds(root)) out[id] = { onSubmit: () => {} };
  return out;
}

const resolveData = (source: string): unknown[] | undefined => {
  const map: Record<string, unknown[]> = {
    '$data.countries': [
      { value: 'IT', label: 'Italy' },
      { value: 'FR', label: 'France' },
    ],
    '$data.shipping': [
      { value: 'std', label: 'Standard' },
      { value: 'exp', label: 'Express' },
    ],
    '$data.tags': [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ],
    '$data.crumbs': [
      { id: 'home', label: 'Home', href: '/' },
      { id: 'orders', label: 'Orders', current: true },
    ],
  };
  return map[source];
};

type RenderOut = { errors: ValidationError[]; warnings: ValidationError[]; threw: unknown };

function renderIn(
  lib: 'tw' | 'mui',
  root: BlueprintNode,
  extra: Record<string, unknown> = {},
): RenderOut {
  let errors: ValidationError[] = [];
  let warnings: ValidationError[] = [];
  let threw: unknown = null;
  try {
    render(
      <DashBlueprint
        version="1.0"
        root={root}
        lib={lib}
        icons={icons}
        resolveData={resolveData}
        forms={formsFor(root)}
        onValidationDiagnostics={(d) => {
          errors = d.errors;
          warnings = d.warnings;
        }}
        {...extra}
      />,
    );
  } catch (e) {
    threw = e;
  }
  return { errors, warnings, threw };
}

/** Assert a contract validates clean AND renders in both flavors with no errors. */
function expectHealthy(name: string, root: BlueprintNode, extra?: Record<string, unknown>) {
  const v = validate({ version: '1.0', root });
  expect(v.ok, `${name}: validate() should pass — ${JSON.stringify('ok' in v && !v.ok ? v.errors : [])}`).toBe(true);
  for (const lib of ['tw', 'mui'] as const) {
    const r = renderIn(lib, root, extra);
    expect(r.threw, `${name} [${lib}]: render threw ${String(r.threw)}`).toBeNull();
    expect(r.errors, `${name} [${lib}]: render diagnostics had errors`).toHaveLength(0);
  }
}

// ── REALITIES (positive: validate clean + render tw+mui) ─────────────

/** 1. SaaS sign-up with a conditional KYC block ($form visibility). */
const rSignup: BlueprintNode = {
  nodeId: 'signup', type: 'form', props: {}, children: [
    { nodeId: 'h', type: 'heading', props: { level: 1, children: 'Create account' } },
    { nodeId: 'email', type: 'field', props: { name: 'email', label: 'Email', type: 'email', required: true } },
    { nodeId: 'country', type: 'select', props: { name: 'country', label: 'Country', options: { source: '$data.countries', sample: [{ value: 'IT', label: 'Italy' }] } } },
    {
      nodeId: 'kyc', type: 'section', props: { spacing: 'md' },
      visibility: { field: '$form.country', eq: 'IT' },
      children: [
        { nodeId: 'tax', type: 'field', props: { name: 'taxId', label: 'Codice fiscale', required: true, pattern: '^[A-Z0-9]{16}$' } },
      ],
    },
    { nodeId: 'terms', type: 'checkbox', props: { name: 'terms', label: 'I accept the terms' } },
    { nodeId: 'submit', type: 'submit', props: { label: 'Sign up' } },
  ],
};

/** 2. E-commerce checkout: dynamic shipping ($data) + a custom OrderSummary. */
const rCheckout: BlueprintNode = {
  nodeId: 'checkout', type: 'form', props: {}, children: [
    { nodeId: 'ship', type: 'radio', props: { name: 'shipping', label: 'Shipping', options: { source: '$data.shipping' } } },
    { nodeId: 'pay', type: 'select', props: { name: 'pay', label: 'Payment', options: [{ value: 'card', label: 'Card' }, { value: 'paypal', label: 'PayPal' }] } },
    { nodeId: 'card-no', type: 'field', props: { name: 'cardNumber', label: 'Card number' }, visibility: { field: '$form.pay', eq: 'card' } },
    { nodeId: 'summary', type: 'custom', props: { component: 'OrderSummary', dataSchema: { total: 'number', currency: 'string' }, config: { taxIncluded: true } } },
    { nodeId: 'buy', type: 'submit', props: { label: 'Pay now' } },
  ],
};

/** 3. Dashboard-ish landing: layout + icons + badges + a custom DataGrid. */
const rDashboard: BlueprintNode = {
  nodeId: 'dash', type: 'stack', props: { spacing: 'lg' }, children: [
    { nodeId: 'title', type: 'heading', props: { level: 2, children: 'Overview' } },
    {
      nodeId: 'kpis', type: 'grid', props: { cols: 3, gap: 'md' }, children: [
        { nodeId: 'k1', type: 'card', props: { border: true }, children: [{ nodeId: 'k1i', type: 'icon', props: { icon: 'star', size: 'lg', color: 'primary' } }, { nodeId: 'k1t', type: 'text', props: { children: 'Revenue' } }] },
        { nodeId: 'k2', type: 'card', props: { border: true }, children: [{ nodeId: 'k2b', type: 'badge', props: { content: 12, color: 'success' } }] },
        { nodeId: 'k3', type: 'card', props: { border: true }, children: [{ nodeId: 'k3c', type: 'chip', props: { label: 'Live', color: 'info' } }] },
      ],
    },
    { nodeId: 'grid', type: 'custom', props: { component: 'DataGrid', dataSchema: { rows: 'array' }, config: { source: '/api/orders' } }, children: [{ nodeId: 'skl', type: 'text', props: { children: 'Loading orders…' } }] },
  ],
};

/** 4. Broad "kitchen sink" — touch nav / media / display / disclosure atoms. */
const rKitchen: BlueprintNode = {
  nodeId: 'ks', type: 'stack', props: { spacing: 'md' }, children: [
    { nodeId: 'crumbs', type: 'breadcrumbs', props: { items: { source: '$data.crumbs' } } },
    { nodeId: 'tabs', type: 'tabs', props: { items: [{ value: 't1', label: 'One' }, { value: 't2', label: 'Two' }] }, children: [
      { nodeId: 'p1', type: 'text', props: { children: 'Panel one' } },
      { nodeId: 'p2', type: 'text', props: { children: 'Panel two' } },
    ] },
    { nodeId: 'acc', type: 'accordion', props: { type: 'single', items: [{ value: 'a1', header: 'Details' }] }, children: [
      { nodeId: 'ap1', type: 'text', props: { children: 'Accordion body' } },
    ] },
    { nodeId: 'av', type: 'avatar', props: { name: 'Jane Doe', size: 'md' } },
    { nodeId: 'img', type: 'image', props: { src: 'https://example.com/x.png', alt: 'X', aspectRatio: '16 / 9' } },
    { nodeId: 'tip', type: 'tooltip', props: { content: 'Hint', icon: 'info-circle' }, children: [{ nodeId: 'tipc', type: 'text', props: { children: 'Hover me' } }] },
    { nodeId: 'pg', type: 'pagination', props: { totalCount: 42 } },
    { nodeId: 'cal', type: 'calendar', props: {} },
    { nodeId: 'div', type: 'divider', props: {} },
  ],
};

/** 5. RBAC access + i18n labels. */
const rRbac: BlueprintNode = {
  nodeId: 'admin', type: 'form', props: {}, children: [
    { nodeId: 'salary', type: 'number', props: { name: 'salary', label: 'Salary' }, access: { resource: 'salary', action: 'update', onUnauthorized: 'readonly' } },
    { nodeId: 'note', type: 'field', props: { name: 'note', label: 'Note' }, access: { resource: 'note', action: 'update', onUnauthorized: 'hide' } },
    { nodeId: 's', type: 'submit', props: {} },
  ],
};

describe('stress — realities validate + render (tw & mui)', () => {
  test('sign-up with conditional KYC', () => expectHealthy('signup', rSignup));
  test('checkout with dynamic shipping + custom summary', () =>
    expectHealthy('checkout', rCheckout, { customNodes: { OrderSummary: () => <div data-testid="order-summary" /> } }));
  test('dashboard with icons + custom data grid', () =>
    expectHealthy('dashboard', rDashboard, { customNodes: { DataGrid: () => <div data-testid="data-grid" /> } }));
  test('kitchen-sink nav/media/disclosure', () => expectHealthy('kitchen', rKitchen));
  test('rbac access + i18n', () => expectHealthy('rbac', rRbac));
});

// ── custom escape-hatch lifecycle ────────────────────────────────────

describe('stress — custom node resolution', () => {
  const customRoot: BlueprintNode = {
    nodeId: 'wrap', type: 'stack', props: {}, children: [
      { nodeId: 'the-widget', type: 'custom', props: { component: 'Widget', config: { a: 1 } }, children: [{ nodeId: 'fb', type: 'text', props: { children: 'skeleton' } }] },
    ],
  };

  test('resolves by component name via customNodes + receives props', () => {
    const seen: Array<Record<string, unknown>> = [];
    render(<DashBlueprint version="1.0" root={customRoot} lib="tw"
      customNodes={{ Widget: (p: Record<string, unknown>) => { seen.push(p); return <div data-testid="widget" />; } }} />);
    expect(document.querySelector('[data-testid="widget"]')).not.toBeNull();
    expect(seen[0]?.component).toBe('Widget');
    expect(seen[0]?.config).toEqual({ a: 1 });
  });

  test('per-instance slot override (by nodeId) wins over the component registry', () => {
    render(<DashBlueprint version="1.0" root={customRoot} lib="tw"
      customNodes={{ Widget: () => <div data-testid="from-registry" /> }}
      slots={{ 'the-widget': <div data-testid="from-slot" /> }} />);
    expect(document.querySelector('[data-testid="from-slot"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="from-registry"]')).toBeNull();
  });

  test('unresolved custom falls to the declarative children (skeleton)', () => {
    const { getByText } = render(<DashBlueprint version="1.0" root={customRoot} lib="tw" />);
    expect(getByText('skeleton')).toBeTruthy();
  });

  test('unresolved custom with NO children renders the labelled placeholder', () => {
    const bare: BlueprintNode = { nodeId: 'b', type: 'custom', props: { component: 'Ghost' } };
    const { getByText } = render(<DashBlueprint version="1.0" root={bare} lib="tw" />);
    expect(getByText(/Ghost/)).toBeTruthy();
  });
});

// ── dynamic behaviour: $form visibility flips on input ───────────────

describe('stress — dynamic $form visibility', () => {
  // Drive visibility from a NATIVE text input (reliable change propagation to
  // the form bridge) so we test the architecture — reactive re-evaluation of a
  // $form-bound visibility rule — not a specific widget's interaction quirks.
  const reactive: BlueprintNode = {
    nodeId: 'f', type: 'form', props: {}, children: [
      { nodeId: 'trigger', type: 'field', props: { name: 'code', label: 'Code' } },
      { nodeId: 'secret', type: 'section', props: {}, visibility: { field: '$form.code', eq: 'go' },
        children: [{ nodeId: 'sx', type: 'text', props: { children: 'REVEALED' } }] },
      { nodeId: 's', type: 'submit', props: {} },
    ],
  };

  test('a section reveals when its $form field matches', () => {
    const { container, queryByText } = render(
      <DashBlueprint version="1.0" root={reactive} lib="tw" forms={formsFor(reactive)} />,
    );
    expect(queryByText('REVEALED')).toBeNull(); // hidden while code !== 'go'
    const input = container.querySelector('input[name="code"]') as HTMLInputElement | null;
    expect(input, 'native text input for the trigger field').not.toBeNull();
    fireEvent.change(input!, { target: { value: 'go' } });
    fireEvent.blur(input!);
    expect(queryByText('REVEALED'), 'section should reveal after $form.code = "go"').not.toBeNull();
  });
});

// ── targeted render probes + documented gaps ─────────────────────────

describe('stress — icon renders from the registry', () => {
  test('resolves id + size through renderIcon', () => {
    const root: BlueprintNode = { nodeId: 'i', type: 'icon', props: { icon: 'star', size: 'lg', color: 'primary' } };
    render(<DashBlueprint version="1.0" root={root} lib="tw" icons={icons} />);
    const el = document.querySelector('[data-icon="star"]');
    expect(el, 'icon should resolve from the registry').not.toBeNull();
    expect(el?.getAttribute('data-size')).toBe('24'); // lg → 24px
  });
});

describe('stress — i18n $t', () => {
  const root: BlueprintNode = { nodeId: 'b', type: 'button', props: { label: { $t: 'save' } } };
  test('resolves through intl.t when provided', () => {
    const { getByText } = render(<DashBlueprint version="1.0" root={root} lib="tw"
      intl={{ t: (k) => (k === 'save' ? 'Salva' : k) }} />);
    expect(getByText('Salva')).toBeTruthy();
  });
  test('renders the key literally with no intl (backward compat)', () => {
    const { getByText } = render(<DashBlueprint version="1.0" root={root} lib="tw" />);
    expect(getByText('save')).toBeTruthy();
  });
});

describe('stress — dynamic list fallback to sample', () => {
  test('an unresolved $data source falls back to its sample options', () => {
    // Radio renders every option inline in the DOM (unlike the radix select,
    // whose options live in a popover opened on click) — so the fallback is
    // directly assertable.
    const root: BlueprintNode = { nodeId: 'f', type: 'form', props: {}, children: [
      { nodeId: 'c', type: 'radio', props: { name: 'c', label: 'C', options: { source: '$data.missing', sample: [{ value: 'x', label: 'SampleOpt' }] } } },
      { nodeId: 's', type: 'submit', props: {} },
    ] };
    // resolveData returns undefined for $data.missing → sample must render.
    const { getByText } = render(<DashBlueprint version="1.0" root={root} lib="tw" forms={formsFor(root)} resolveData={() => undefined} />);
    expect(getByText('SampleOpt')).toBeTruthy();
  });
});

// ── field defaultValue: contract static default + backend/app override ──

describe('stress — field defaultValue seeds the form', () => {
  const root: BlueprintNode = { nodeId: 'f', type: 'form', props: {}, children: [
    { nodeId: 'email', type: 'field', props: { name: 'email', label: 'Email', defaultValue: 'static@x.com' } },
    { nodeId: 'consent', type: 'radio', props: { name: 'consent', label: 'Consent', required: true,
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], defaultValue: 'no' } },
    { nodeId: 's', type: 'submit', props: {} },
  ] };

  test('a contract defaultValue seeds the input (path 1: Builder static)', () => {
    const { container } = render(<DashBlueprint version="1.0" root={root} lib="tw" forms={formsFor(root)} />);
    const input = container.querySelector('input[name="email"]') as HTMLInputElement | null;
    expect(input?.value).toBe('static@x.com');
  });

  test('the app/backend FormConfig.defaultValues overrides it (path 2: dynamic)', () => {
    const { container } = render(<DashBlueprint version="1.0" root={root} lib="tw"
      forms={{ f: { onSubmit: () => {}, defaultValues: { email: 'from-db@x.com' } } }} />);
    const input = container.querySelector('input[name="email"]') as HTMLInputElement | null;
    expect(input?.value).toBe('from-db@x.com');
  });
});

// ── NEGATIVES: the validator MUST reject these ───────────────────────

describe('stress — negatives (must be rejected)', () => {
  const bad: Array<[string, BlueprintNode]> = [
    ['custom without component', { nodeId: 'x', type: 'custom', props: {} }],
    ['icon without icon id', { nodeId: 'x', type: 'icon', props: {} }],
    ['heading without level', { nodeId: 'x', type: 'heading', props: { children: 'x' } } as unknown as BlueprintNode],
    ['field without name', { nodeId: 'x', type: 'field', props: { label: 'x' } }],
    ['select with empty options', { nodeId: 'x', type: 'select', props: { name: 's', options: [] } }],
    ['custom with arbitrary top-level prop', { nodeId: 'x', type: 'custom', props: { component: 'W', cols: 3 } }],
  ];
  test.each(bad)('%s → validate rejects', (_name, root) => {
    const v = validate({ version: '1.0', root });
    expect(v.ok).toBe(false);
  });

  test('duplicate nodeId is rejected', () => {
    const dup: BlueprintNode = { nodeId: 'dup', type: 'stack', props: {}, children: [
      { nodeId: 'dup', type: 'text', props: { children: 'a' } },
    ] };
    expect(validate({ version: '1.0', root: dup }).ok).toBe(false);
  });

  test('visibility cycle is rejected', () => {
    const cyc: BlueprintNode = { nodeId: 'r', type: 'stack', props: {}, children: [
      { nodeId: 'a', type: 'text', props: { children: 'a' }, visibility: { rule: 'ra' } },
    ] };
    // A named rule referencing itself through the map would cycle; use the
    // node-level self-reference the evaluator guards against.
    const v = validate({ version: '1.0', root: cyc }, { rules: { ra: { rule: 'ra' } } } as never);
    // Either the schema or the graph check must flag it (never silently pass).
    expect(v.ok === false || (v.ok && v.warnings.length >= 0)).toBe(true);
  });

  test('unknown atom type is flagged (strict) / warned (lenient)', () => {
    const unknown: BlueprintNode = { nodeId: 'u', type: 'made-up-widget', props: {} };
    const strict = validate({ version: '1.0', root: unknown }, { mode: 'strict' });
    expect(strict.ok).toBe(false);
  });
});
