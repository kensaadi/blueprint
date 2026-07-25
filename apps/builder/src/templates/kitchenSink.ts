/**
 * Kitchen Sink template — instantiates ALL 36 atoms grouped by
 * category, so a single "Load Kitchen Sink" click gives the user
 * a complete visual sweep of the catalog:
 *   - every Inspector control the schema-driven editor knows about,
 *   - every Canvas render path (containers, form inputs, actions,
 *     content, navigation, display),
 *   - every runtime binding when the export is pasted in the
 *     Playground.
 *
 * Built programmatically from `ATOM_NAMES` + `createNode`. Two
 * consequences we rely on:
 *   1. If someone adds a new atom to `ATOM_PROP_SCHEMAS`, the
 *      `assertAllAtomsCovered` guard below fails at module load —
 *      the template can never drift out of sync with the catalog.
 *   2. The factory defaults are the same ones the palette drop uses,
 *      so what you see here is what you get when you drop an atom
 *      manually.
 */
import type { BlueprintNode, Contract } from '../state/types';
import { ATOM_NAMES, type AtomName } from '@dashforge/blueprint-core';
import { createNode } from '../state/factory';

const CATEGORIES = {
  layout:     ['stack', 'section', 'card', 'container', 'grid', 'box'],
  formInputs: ['field', 'textarea', 'number', 'select', 'autocomplete',
               'checkbox', 'switch', 'radio', 'date', 'time',
               'dateTime', 'dateRange', 'otp'],
  actions:    ['button', 'iconButton'],
  content:    ['heading', 'text', 'alert', 'divider'],
  navigation: ['tabs', 'accordion', 'breadcrumbs', 'pagination'],
  display:    ['badge', 'chip', 'avatar', 'tooltip', 'calendar'],
} as const satisfies Record<string, readonly AtomName[]>;

/**
 * Compile-time-ish guard: every atom must appear in exactly one
 * category, plus the `form` envelope which wraps `formInputs`. Runs
 * once at module load; throws loudly rather than shipping a template
 * that silently drops atoms.
 */
function assertAllAtomsCovered(): void {
  const covered = new Set<string>([
    ...CATEGORIES.layout,
    ...CATEGORIES.formInputs,
    ...CATEGORIES.actions,
    ...CATEGORIES.content,
    ...CATEGORIES.navigation,
    ...CATEGORIES.display,
    'form',    // envelope, wraps formInputs
    'submit',  // lives inside the form section
  ]);
  const missing = ATOM_NAMES.filter((n) => !covered.has(n));
  if (missing.length > 0) {
    throw new Error(
      `Kitchen Sink: ${missing.length} atom(s) not covered — ${missing.join(', ')}. ` +
      `Add them to CATEGORIES in src/builder/templates/kitchenSink.ts.`,
    );
  }
}

function withHeading(node: BlueprintNode, text: string): BlueprintNode {
  // Seed containers with a single heading so the fresh "Empty
  // container" lint (3j.6) doesn't fire on every layout demo.
  const heading = createNode('heading');
  heading.props = { level: 4, children: text };
  return { ...node, children: [heading] };
}

function sectionOf(title: string, kids: BlueprintNode[]): BlueprintNode {
  const heading = createNode('heading');
  heading.props = { level: 2, children: title };
  const section = createNode('section');
  return { ...section, children: [heading, ...kids] };
}

export function buildKitchenSink(): Contract {
  assertAllAtomsCovered();

  const layoutSection = sectionOf(
    '1 · Layout containers',
    CATEGORIES.layout.map((name) => withHeading(createNode(name), name)),
  );

  // Form section is the `form` atom itself — its envelope id doubles
  // as the runtime lookup key, so we let the factory pick one.
  const formSection = ((): BlueprintNode => {
    const heading = createNode('heading');
    heading.props = { level: 2, children: '2 · Form inputs' };
    const submit = createNode('submit');
    const form = createNode('form');
    return {
      ...form,
      children: [
        heading,
        ...CATEGORIES.formInputs.map((name) => createNode(name)),
        submit,
      ],
    };
  })();

  const actionsSection = sectionOf(
    '3 · Actions',
    CATEGORIES.actions.map((name) => createNode(name)),
  );

  const contentSection = sectionOf(
    '4 · Content',
    CATEGORIES.content.map((name) => createNode(name)),
  );

  const navigationSection = sectionOf(
    '5 · Navigation',
    CATEGORIES.navigation.map((name) => createNode(name)),
  );

  const displaySection = sectionOf(
    '6 · Display',
    CATEGORIES.display.map((name) => createNode(name)),
  );

  const root = createNode('stack');
  return {
    version: '1.0',
    root: {
      ...root,
      props: { direction: 'column', spacing: 'lg' },
      children: [
        layoutSection,
        formSection,
        actionsSection,
        contentSection,
        navigationSection,
        displaySection,
      ],
    },
  };
}
