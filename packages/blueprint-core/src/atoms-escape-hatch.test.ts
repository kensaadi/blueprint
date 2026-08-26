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

describe('schema — defaultValue (field initial state, typed per atom)', () => {
  test('field/textarea/otp take a string', () => {
    expect(ATOM_PROP_SCHEMAS.field.safeParse({ name: 'x', defaultValue: 'v' }).success).toBe(true);
    expect(ATOM_PROP_SCHEMAS.field.safeParse({ name: 'x', defaultValue: 5 }).success).toBe(false);
  });
  test('number takes a number', () => {
    expect(ATOM_PROP_SCHEMAS.number.safeParse({ name: 'x', defaultValue: 5 }).success).toBe(true);
    expect(ATOM_PROP_SCHEMAS.number.safeParse({ name: 'x', defaultValue: '5' }).success).toBe(false);
  });
  test('checkbox/switch take a boolean', () => {
    expect(ATOM_PROP_SCHEMAS.checkbox.safeParse({ name: 'x', defaultValue: true }).success).toBe(true);
    expect(ATOM_PROP_SCHEMAS.switch.safeParse({ name: 'x', defaultValue: 'true' }).success).toBe(false);
  });
  test('radio takes an option value (string); consent can default to "no"', () => {
    expect(
      ATOM_PROP_SCHEMAS.radio.safeParse({
        name: 'consent', required: true, defaultValue: 'no',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
      }).success,
    ).toBe(true);
  });
  test('date default must be ISO YYYY-MM-DD', () => {
    expect(ATOM_PROP_SCHEMAS.date.safeParse({ name: 'x', defaultValue: '2026-08-24' }).success).toBe(true);
    expect(ATOM_PROP_SCHEMAS.date.safeParse({ name: 'x', defaultValue: '24/08/2026' }).success).toBe(false);
  });
  test('dateRange default is { from, to }', () => {
    expect(ATOM_PROP_SCHEMAS.dateRange.safeParse({ name: 'x', defaultValue: { from: '2026-01-01', to: '2026-12-31' } }).success).toBe(true);
  });
});
