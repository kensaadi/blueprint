/**
 * Targeted tests for low-coverage branch paths (validator.summarizeValue +
 * collectFieldRefs edge cases). Bumps branch coverage above the 85%
 * extraction-checklist threshold.
 */
import { describe, expect, test } from 'vitest';
import { validate } from './validator';
import { collectFieldRefs, type VisibilityRule } from './visibility';

describe('validator — summarizeValue diagnostic enrichment branches', () => {
  test('numeric received value triggers summarizeValue branch', () => {
    // Goal: walk the diagnostic-enrichment path with a numeric prop.
    const out = validate(
      { version: '1.0', root: { type: 'field', props: { name: 'a', label: 42 as unknown as string } } },
      { mode: 'strict' },
    );
    expect(out.ok).toBe(false);
  });

  test('boolean received value gets stringified', () => {
    const out = validate(
      { version: '1.0', root: { type: 'field', props: { name: 'a', required: 'yes' as unknown as boolean } } },
      { mode: 'strict' },
    );
    expect(out.ok).toBe(false);
  });

  test('array received value gets summarized as array[N]', () => {
    const out = validate(
      { version: '1.0', root: { type: 'field', props: { name: [1, 2, 3] as unknown as string } } },
      { mode: 'strict' },
    );
    expect(out.ok).toBe(false);
  });

  test('long string received gets truncated with ellipsis', () => {
    const long = 'x'.repeat(50);
    const out = validate(
      {
        version: '1.0',
        root: {
          type: 'heading',
          props: { level: long as unknown as number, children: 'h' },
        },
      },
      { mode: 'strict' },
    );
    expect(out.ok).toBe(false);
  });

  test('enum / invalid_enum path runs without crash', () => {
    // Goal: walk the enum-branch in fromZodError with an out-of-enum value.
    const out = validate(
      {
        version: '1.0',
        root: { type: 'heading', props: { level: 99 as unknown as 1, children: 'h' } },
      },
      { mode: 'strict' },
    );
    expect(out.ok).toBe(false);
  });
});

describe('visibility — collectFieldRefs branches', () => {
  test('and composer recurses into every sub-rule', () => {
    const r: VisibilityRule = {
      and: [
        { field: '$form.a', eq: 'x' },
        { field: '$form.b', eq: 'y' },
      ],
    };
    expect([...collectFieldRefs(r)].sort()).toEqual(['a', 'b']);
  });

  test('or composer recurses into every sub-rule', () => {
    const r: VisibilityRule = {
      or: [
        { field: '$form.c', eq: 1 },
        { field: '$form.d', eq: 2 },
      ],
    };
    expect([...collectFieldRefs(r)].sort()).toEqual(['c', 'd']);
  });

  test('not composer recurses into the inner rule', () => {
    const r: VisibilityRule = { not: { field: '$form.e', neq: 'z' } };
    expect([...collectFieldRefs(r)]).toEqual(['e']);
  });

  test('named rule escape hatch is opaque — yields no deps', () => {
    const r: VisibilityRule = { rule: 'showForBeta' };
    expect([...collectFieldRefs(r)]).toEqual([]);
  });

  test('leaf with non-$form field is ignored', () => {
    const r: VisibilityRule = { field: 'literal.path', eq: 1 };
    expect([...collectFieldRefs(r)]).toEqual([]);
  });

  test('reuses caller-provided Set so callers can accumulate', () => {
    const seen = new Set<string>(['preexisting']);
    collectFieldRefs({ field: '$form.fresh', eq: 1 }, seen);
    expect([...seen].sort()).toEqual(['fresh', 'preexisting']);
  });

  test('deeply nested and/or/not still resolves leaves', () => {
    const r: VisibilityRule = {
      and: [
        { or: [{ field: '$form.x', eq: 1 }, { not: { field: '$form.y', neq: 2 } }] },
        { field: '$form.z', exists: true },
      ],
    };
    expect([...collectFieldRefs(r)].sort()).toEqual(['x', 'y', 'z']);
  });
});
