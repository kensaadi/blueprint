/**
 * Parity STRESS — validator (zod) vs the frozen #20 JSON Schema (ajv), across
 * the new + dynamic contract surface (custom, icon, multiple, $data-bound
 * options, visibility, access). Every SDK will validate against ONE of these;
 * any disagreement here is a divergence that would surface as an SDK bug.
 *
 * Run before building the SDKs so the two validators are provably aligned on
 * the surface the existing spec test does not exercise.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import type { ValidateFunction } from 'ajv';
import { validate } from './validator';

const specPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'spec', 'contract-v1.schema.json');
const doc = (root: unknown) => ({ version: '1.0', root });

describe('spec parity stress — zod ⇔ #20 agree on the new/dynamic surface', () => {
  let ajvValidate: ValidateFunction;
  beforeAll(() => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    ajvValidate = ajv.compile(JSON.parse(readFileSync(specPath, 'utf8')));
  });

  const both = (c: unknown) => ({ ajv: ajvValidate(c) === true, core: validate(c, { mode: 'strict' }).ok });

  // Each row: [label, contract, expectedAccepted]. The assertion is that BOTH
  // validators reach `expected` — a mismatch is the bug we are hunting.
  const cases: Array<[string, unknown, boolean]> = [
    // ── new atoms ──
    ['icon (valid)', doc({ type: 'icon', props: { icon: 'user', size: 'lg', color: 'primary' } }), true],
    ['icon without id', doc({ type: 'icon', props: {} }), false],
    ['custom (component + dataSchema + config)', doc({ nodeId: 'g', type: 'custom', props: { component: 'DataGrid', dataSchema: { rows: 'array' }, config: { live: true } } }), true],
    ['custom without component', doc({ type: 'custom', props: {} }), false],
    // The .strict() divergence hunt: an arbitrary top-level prop must be
    // rejected by BOTH (config is the only extension point).
    ['custom with arbitrary top-level prop', doc({ type: 'custom', props: { component: 'W', cols: 3 } }), false],

    // ── multi-select is NOT a native prop (it is a `custom` component) ──
    ['select with a `multiple` prop is rejected', doc({ type: 'select', props: { name: 's', multiple: true, options: [{ value: 'a', label: 'A' }] } }), false],

    // ── dynamic list binding ($data) ──
    ['select options bound to $data with sample/prepend', doc({ type: 'select', props: { name: 's', options: { source: '$data.countries', sample: [{ value: 'IT', label: 'Italy' }], prepend: [{ value: '', label: 'All' }] } } }), true],
    ['bound source with a bad ref (no $prefix)', doc({ type: 'select', props: { name: 's', options: { source: 'countries' } } }), false],
    ['breadcrumbs items bound to $data', doc({ type: 'breadcrumbs', props: { items: { source: '$data.crumbs' } } }), true],

    // ── visibility / access on the node envelope ──
    ['node with $form visibility rule', doc({ type: 'section', props: {}, visibility: { field: '$form.country', eq: 'IT' } }), true],
    ['node with boolean visibility', doc({ type: 'section', props: {}, visibility: false }), true],
    ['node with malformed visibility', doc({ type: 'section', props: {}, visibility: { field: 123 } }), false],
    ['node with RBAC access rule', doc({ type: 'number', props: { name: 'n' }, access: { resource: 'salary', action: 'update', onUnauthorized: 'readonly' } }), true],
    ['node with bad onUnauthorized', doc({ type: 'number', props: { name: 'n' }, access: { resource: 'x', action: 'y', onUnauthorized: 'nuke' } }), false],
  ];

  test.each(cases)('%s', (label, contract, expected) => {
    const { ajv, core } = both(contract);
    expect(ajv, `${label}: ajv(#20) accepted=${ajv}, expected=${expected}`).toBe(expected);
    expect(core, `${label}: core zod accepted=${core}, expected=${expected}`).toBe(expected);
    // The real prize: the two validators must never disagree.
    expect(ajv, `${label}: DIVERGENCE — ajv=${ajv} vs core=${core}`).toBe(core);
  });
});
