/**
 * Tests for the three structural state axes:
 *   - `visibility: boolean | VisibilityRule`
 *   - `disabled: boolean`
 *   - `access: AccessRule` (existing; tested elsewhere)
 *
 * Plus cycle-detection in the validator pass.
 */
import { describe, expect, test } from 'vitest';
import { validate } from './validator';
import { nodeSchema } from './schema';
import type { BlueprintDocument } from './types';

describe('schema — visibility (boolean | VisibilityRule)', () => {
  test('accepts visibility: true', () => {
    expect(nodeSchema.safeParse({ type: 'text', visibility: true }).success).toBe(true);
  });
  test('accepts visibility: false', () => {
    expect(nodeSchema.safeParse({ type: 'text', visibility: false }).success).toBe(true);
  });
  test('accepts predicate VisibilityRule', () => {
    expect(nodeSchema.safeParse({
      type: 'field',
      props: { name: 'x' },
      visibility: { field: '$form.country', eq: 'IT' },
    }).success).toBe(true);
  });
  test('rejects non-boolean / non-rule visibility', () => {
    expect(nodeSchema.safeParse({ type: 'text', visibility: 'maybe' }).success).toBe(false);
  });
});

describe('schema — disabled (boolean)', () => {
  test('accepts disabled: true / false', () => {
    expect(nodeSchema.safeParse({ type: 'field', props: { name: 'x' }, disabled: true }).success).toBe(true);
    expect(nodeSchema.safeParse({ type: 'field', props: { name: 'x' }, disabled: false }).success).toBe(true);
  });
  test('rejects non-boolean disabled (no DSL, by design)', () => {
    expect(nodeSchema.safeParse({
      type: 'field',
      props: { name: 'x' },
      disabled: { field: '$form.role', eq: 'admin' },
    }).success).toBe(false);
  });
});

describe('validator — cyclic visibility detection', () => {
  const makeDoc = (root: unknown): BlueprintDocument =>
    ({ version: '1.0', root: root as BlueprintDocument['root'] });

  test('no cycle — passes', () => {
    const result = validate(makeDoc({
      type: 'form',
      nodeId: 'f',
      children: [
        { type: 'field', props: { name: 'country' } },
        { type: 'field', props: { name: 'taxId' }, visibility: { field: '$form.country', eq: 'IT' } },
      ],
    }), { mode: 'lenient' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.filter((w) => w.code === 'CYCLIC_VISIBILITY')).toEqual([]);
    }
  });

  test('A → B → A cycle — emits warning in lenient', () => {
    const result = validate(makeDoc({
      type: 'form',
      nodeId: 'f',
      children: [
        { type: 'field', props: { name: 'A' }, visibility: { field: '$form.B', eq: 'x' } },
        { type: 'field', props: { name: 'B' }, visibility: { field: '$form.A', eq: 'y' } },
      ],
    }), { mode: 'lenient' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cycles = result.warnings.filter((w) => w.code === 'CYCLIC_VISIBILITY');
      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].message).toMatch(/Cyclic visibility/);
    }
  });

  test('cycle — emits error in strict', () => {
    const result = validate(makeDoc({
      type: 'form',
      nodeId: 'f',
      children: [
        { type: 'field', props: { name: 'A' }, visibility: { field: '$form.B', eq: 'x' } },
        { type: 'field', props: { name: 'B' }, visibility: { field: '$form.A', eq: 'y' } },
      ],
    }), { mode: 'strict' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const cycles = result.errors.filter((e) => e.code === 'CYCLIC_VISIBILITY');
      expect(cycles.length).toBeGreaterThan(0);
    }
  });

  test('A → B → C → A — detected', () => {
    const result = validate(makeDoc({
      type: 'form',
      nodeId: 'f',
      children: [
        { type: 'field', props: { name: 'A' }, visibility: { field: '$form.C', eq: 'x' } },
        { type: 'field', props: { name: 'B' }, visibility: { field: '$form.A', eq: 'x' } },
        { type: 'field', props: { name: 'C' }, visibility: { field: '$form.B', eq: 'x' } },
      ],
    }), { mode: 'strict' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === 'CYCLIC_VISIBILITY')).toBe(true);
    }
  });

  test('self-reference (A depends on $form.A) — flagged as cycle', () => {
    const result = validate(makeDoc({
      type: 'form',
      nodeId: 'f',
      children: [
        { type: 'field', props: { name: 'A' }, visibility: { field: '$form.A', eq: 'x' } },
      ],
    }), { mode: 'strict' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === 'CYCLIC_VISIBILITY')).toBe(true);
    }
  });

  test('static boolean visibility does NOT create a cycle', () => {
    const result = validate(makeDoc({
      type: 'form',
      nodeId: 'f',
      children: [
        { type: 'field', props: { name: 'A' }, visibility: false },
        { type: 'field', props: { name: 'B' }, visibility: { field: '$form.A', eq: 'x' } },
      ],
    }), { mode: 'strict' });
    // No cycle: A has no rule (it's a static boolean), only B has a rule.
    expect(result.ok).toBe(true);
  });
});
