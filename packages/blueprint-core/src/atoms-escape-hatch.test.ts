/**
 * Schema tests for the domain-boundary additions:
 *   icon        — standalone registry-resolved icon
 *   custom      — first-class escape hatch (component + dataSchema + config)
 *
 * These pin the contract surface the SDK will target, so a future prop drift
 * fails loudly here rather than surfacing across every renderer.
 */
import { describe, expect, test } from 'vitest';
import { ATOM_NAMES, ATOM_PROP_SCHEMAS, isAtomName } from './atoms';

describe('schema — icon', () => {
  const s = ATOM_PROP_SCHEMAS.icon;
  test('requires a non-empty icon id', () => {
    expect(s.safeParse({}).success).toBe(false);
    expect(s.safeParse({ icon: '' }).success).toBe(false);
    expect(s.safeParse({ icon: 'user' }).success).toBe(true);
  });
  test('accepts size + color + label', () => {
    expect(
      s.safeParse({ icon: 'user', size: 'lg', color: 'primary', label: 'Profile' })
        .success,
    ).toBe(true);
  });
  test('rejects unknown size + off-palette color', () => {
    expect(s.safeParse({ icon: 'user', size: 'huge' }).success).toBe(false);
    expect(s.safeParse({ icon: 'user', color: 'chartreuse' }).success).toBe(false);
  });
});

describe('schema — custom (escape hatch)', () => {
  const s = ATOM_PROP_SCHEMAS.custom;
  test('is a known catalog atom', () => {
    expect(isAtomName('custom')).toBe(true);
    expect(ATOM_NAMES).toContain('custom');
  });
  test('requires a component name', () => {
    expect(s.safeParse({}).success).toBe(false);
    expect(s.safeParse({ component: '' }).success).toBe(false);
    expect(s.safeParse({ component: 'ProductGrid' }).success).toBe(true);
  });
  test('accepts dataSchema + config', () => {
    expect(
      s.safeParse({
        component: 'ProductGrid',
        dataSchema: { title: 'string', price: 'number' },
        config: { cols: 3, live: true },
      }).success,
    ).toBe(true);
  });
  test('rejects arbitrary top-level props (must go through config)', () => {
    expect(s.safeParse({ component: 'X', cols: 3 }).success).toBe(false);
  });
  // Multi-select is deliberately NOT a native prop — a `multiple` field is
  // rejected; multi-value selection is a `custom` component (domain-coupled
  // value origin). This locks that boundary.
  test('rejects a `multiple` prop on select (multi-select is custom)', () => {
    expect(
      ATOM_PROP_SCHEMAS.select.safeParse({
        name: 'tags', multiple: true, options: [{ value: 'a', label: 'A' }],
      }).success,
    ).toBe(false);
  });
});
