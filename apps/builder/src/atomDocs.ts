/**
 * Reflect zod schemas from the catalog into a human-readable form for
 * the devtools Catalog browser.
 *
 * zod 4 uses lowercase `_def.type` markers (`"optional"`, `"union"`,
 * `"string"`, `"object"`, …) instead of the v3 `_def.typeName` PascalCase
 * convention. We walk the new shape.
 */

import { ATOM_PROP_SCHEMAS, type AtomName } from '@dashforge/blueprint-core';

export type PropDoc = {
  name: string;
  required: boolean;
  typeLabel: string;
};

export type AtomDoc = {
  name: AtomName;
  /**
   * One-sentence human explanation of what this atom is and when to
   * reach for it. Rendered in the Inspector "About this atom" panel
   * and in the devtools Catalog. Keep to a single line so it displays
   * cleanly in a narrow panel — link to DESIGN.md for depth.
   */
  description: string;
  props: PropDoc[];
};

/**
 * Per-atom human descriptions — one sentence each. When these evolve
 * (new atoms, sharpened phrasing), edit here; both the Inspector and
 * the devtools Catalog pick up the change automatically.
 */
const ATOM_DESCRIPTIONS: Record<AtomName, string> = {
  // Baseline (Tier 0)
  stack:
    'Flex container — arranges children horizontally or vertically with configurable gap, alignment, and wrapping.',
  grid:
    'Multi-column responsive grid — declare `cols` (or a responsive object) and children auto-split into equal spans; use `layoutHint` on children for asymmetric widths.',
  card:
    'Elevated content container with padding, rounded corners, optional 1px border. Use for grouped content on a page.',
  section:
    'Semantic HTML `<section>` landmark. Use it at the top of a page or panel to group a heading + subheading + description as an accessibility region — not as a generic wrapper (that is Box).',
  text:
    'Body copy — plain text or inline runs (bold/italic/code/link/break). Use for descriptions, help copy, and paragraphs.',
  heading:
    'Semantic heading (h1–h6) with a size scale. Use to introduce a page, section, or card.',
  button:
    'Standard action button with label + optional icon. Fires the parent form submit only when `type` is set via `submit` atom.',
  submit:
    'Form submit button. Placed inside a `form` node, triggers the resolved FormConfig `onSubmit`.',
  alert:
    'Inline banner for success / warning / danger / info messages. Supports a title and rich inline body text.',
  divider:
    'Thin horizontal rule separating sections. Zero configuration.',
  field:
    'Generic text input tied to a form-field name. Renders labels, placeholder, helper text, and validation state via the parent form.',
  form:
    'Submission boundary — declares a form by `id` that binds to the DashBlueprint `forms` prop for schema, defaults, and submit handler.',

  // Form expansion (Tier 0 forms)
  select:
    'Dropdown picker bound to a form field name. Options are static in the contract; use a customNode for server-fed lists.',
  date:
    'Date picker for a single ISO date (YYYY-MM-DD). Supports `min` and `max` bounds.',
  checkbox:
    'Boolean opt-in. Reads and writes a form-field boolean.',
  switch:
    'Binary on/off toggle. Semantically equivalent to checkbox but visually communicates an active state.',
  textarea:
    'Multi-line text input tied to a form-field name.',
  number:
    'Numeric input tied to a form-field name. Supports `min`, `max`, and `step`.',
  radio:
    'Exclusive-choice group tied to a form-field name.',
  time:
    'Time-of-day picker in HH:MM format.',
  dateTime:
    'Combined date + time picker.',
  dateRange:
    'From-to date range picker.',
  autocomplete:
    'Typeahead select with options.',
  otp:
    'One-time-password grid of N cells (numeric or alphanumeric).',

  // Display / layout (Tier A)
  box:
    'Generic wrapper with padding, margin, rounded corners, and elevation. Use for design-level grouping without semantic HTML meaning.',
  container:
    'Centered viewport-aware container with responsive horizontal padding. Use at the page root.',
  badge:
    'Small overlay indicator anchored to a child (Avatar / IconButton). Numeric, dotted, or content variants.',
  chip:
    'Compact selectable tag with optional icon.',
  avatar:
    'User avatar (image, initials, or fallback).',
  iconButton:
    'Icon-only button with required `ariaLabel` for accessibility.',

  // Navigation / interaction (Tier B)
  tabs:
    'Tabbed content — declares triggers in `items[]`, panels come from `children` by index.',
  accordion:
    'Collapsible content groups — each group has a summary + expandable panel.',
  tooltip:
    'Text tooltip rendered on hover / focus over a child element.',
  breadcrumbs:
    'Navigation breadcrumb trail with per-item icon + link support.',
  pagination:
    'Page navigation control for paged data.',

  // Data display (Tier C)
  calendar:
    'Month / week / day calendar view — supports event lists and multiple configurations.',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeType(schema: any): string {
  if (!schema) return 'unknown';
  const def = schema._def ?? schema.def ?? {};
  const t = String(def.type ?? def.typeName ?? '').toLowerCase().replace(/^zod/, '');

  switch (t) {
    case 'optional':
    case 'default':
    case 'nullable':
      return describeType(def.innerType);

    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'bigint':
      return 'bigint';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'Date';
    case 'any':
      return 'any';
    case 'unknown':
      return 'unknown';
    case 'null':
      return 'null';
    case 'undefined':
      return 'undefined';
    case 'void':
      return 'void';
    case 'never':
      return 'never';

    case 'literal': {
      const v = def.value ?? schema.value;
      return JSON.stringify(v);
    }

    case 'enum': {
      // zod 4: enum options live on `def.entries` (Record<string, value>)
      // OR `schema.options` (array). Try both.
      const entries = def.entries ?? def.values;
      let values: unknown[] = [];
      if (entries && typeof entries === 'object' && !Array.isArray(entries)) {
        values = Object.values(entries);
      } else if (Array.isArray(entries)) {
        values = entries;
      } else if (Array.isArray(schema.options)) {
        values = schema.options;
      }
      return values.length
        ? values.map((v) => JSON.stringify(v)).join(' | ')
        : 'enum';
    }

    case 'union': {
      const opts = def.options ?? schema.options ?? [];
      return opts.length ? opts.map(describeType).join(' | ') : 'union';
    }

    case 'array': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner = (def as any).type ?? (def as any).element ?? schema.element;
      return `${describeType(inner)}[]`;
    }

    case 'object': {
      const shape = (def.shape && typeof def.shape === 'function')
        ? def.shape()
        : (schema.shape ?? def.shape ?? {});
      const keys = Object.keys(shape);
      if (keys.length === 0) return '{}';
      if (keys.length <= 4) return `{ ${keys.join(', ')} }`;
      return `{ ${keys.length} fields }`;
    }

    case 'record':
      return 'Record<string, unknown>';
    case 'tuple':
      return '[…]';
    case 'intersection':
      return '… & …';

    default:
      return t || 'unknown';
  }
}

function isRequired(schema: unknown): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)?._def ?? (schema as any)?.def ?? {};
  const t = String(def.type ?? def.typeName ?? '').toLowerCase();
  return t !== 'optional' && t !== 'zodoptional' && t !== 'default';
}

export function getAtomDoc(name: AtomName): AtomDoc {
  const schema = ATOM_PROP_SCHEMAS[name];
  // Zod 4 exposes the shape directly on `.shape` for object schemas,
  // OR via `def.shape` (function or static). Try both.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def ?? (schema as any).def ?? {};
  const shape = (schema as unknown as { shape?: Record<string, unknown> }).shape
    ?? (typeof def.shape === 'function' ? def.shape() : def.shape)
    ?? {};

  const props: PropDoc[] = Object.entries(shape).map(([propName, propSchema]) => ({
    name: propName,
    required: isRequired(propSchema),
    typeLabel: describeType(propSchema),
  }));
  return {
    name,
    description: ATOM_DESCRIPTIONS[name] ?? '',
    props,
  };
}

export function getAllAtomDocs(): AtomDoc[] {
  return (Object.keys(ATOM_PROP_SCHEMAS) as AtomName[]).map(getAtomDoc);
}
