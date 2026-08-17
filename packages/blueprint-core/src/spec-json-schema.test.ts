import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import type { ValidateFunction } from 'ajv';
import { validate } from './validator';
import { contractJsonSchema } from '../scripts/gen-json-schema.mts';

/**
 * The committed `spec/contract-v1.schema.json` is the frozen, language-
 * agnostic projection of the core zod schemas. Two guarantees are tested:
 *
 *  1. DRIFT — the committed file equals a fresh generation. If a schema
 *     changes without re-running `pnpm gen:spec`, this fails.
 *  2. PARITY — a standard JSON-Schema validator (ajv, draft 2020-12) run
 *     against the artifact agrees with core `validate()` on the STRUCTURAL
 *     contract: envelope + atom props + closed catalog + required nodeId.
 *
 * The JSON Schema deliberately does NOT cover the two GRAPH-level passes
 * (`nodeId` uniqueness, visibility-cycle detection) — those are not
 * expressible in JSON Schema and every SDK runs them imperatively after
 * schema validation. The final block asserts exactly that divergence so
 * it stays documented rather than surprising.
 */

const here = dirname(fileURLToPath(import.meta.url));
const specPath = join(here, '..', 'spec', 'contract-v1.schema.json');

const doc = (root: unknown, version = '1.0') => ({ version, root });
const coreOk = (c: unknown) => validate(c, { mode: 'strict' }).ok;

describe('spec/contract-v1.schema.json', () => {
  let ajvValidate: ValidateFunction;

  beforeAll(() => {
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    ajvValidate = ajv.compile(JSON.parse(readFileSync(specPath, 'utf8')));
  });

  test('committed file is in sync with the generator (no drift)', () => {
    const committed = JSON.parse(readFileSync(specPath, 'utf8'));
    expect(committed).toEqual(contractJsonSchema);
  });

  // ── Structurally valid — both accept ────────────────────────────
  const valid: Array<[string, unknown]> = [
    [
      'stack with a field child',
      doc({
        nodeId: 'root',
        type: 'stack',
        props: {},
        children: [
          {
            nodeId: 'email',
            type: 'field',
            props: { name: 'email', label: 'Email', required: true, minLength: 3 },
          },
        ],
      }),
    ],
    ['form (requires nodeId)', doc({ nodeId: 'signup', type: 'form', props: {}, children: [] })],
    ['bare node, no props/children', doc({ type: 'divider' })],
  ];

  test.each(valid)('accepts: %s (ajv === core === true)', (_label, contract) => {
    expect(ajvValidate(contract)).toBe(true);
    expect(coreOk(contract)).toBe(true);
  });

  // ── Structurally invalid — both reject ──────────────────────────
  const invalid: Array<[string, unknown]> = [
    ['unknown atom type (closed catalog)', doc({ type: 'wormhole', props: {} })],
    ['unsupported version', doc({ type: 'divider' }, '2.0')],
    ['extra prop on field props (strict)', doc({ type: 'field', props: { name: 'x', bogus: 1 } })],
    ['field missing required name', doc({ type: 'field', props: {} })],
    ['form without nodeId', doc({ type: 'form', props: {} })],
    ['negative minLength', doc({ type: 'field', props: { name: 'x', minLength: -1 } })],
  ];

  test.each(invalid)('rejects: %s (ajv === core === false)', (_label, contract) => {
    expect(ajvValidate(contract)).toBe(false);
    expect(coreOk(contract)).toBe(false);
  });

  // ── Graph-level checks — JSON Schema can't express; core can ─────
  test('divergence: duplicate nodeId — core rejects, JSON Schema accepts', () => {
    const dup = doc({
      nodeId: 'dup',
      type: 'stack',
      props: {},
      children: [{ nodeId: 'dup', type: 'divider', props: {} }],
    });
    expect(ajvValidate(dup)).toBe(true); // structurally fine
    expect(coreOk(dup)).toBe(false); // graph pass catches it
  });
});
