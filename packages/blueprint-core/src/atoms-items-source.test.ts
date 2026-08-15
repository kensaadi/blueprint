import { describe, test, expect } from 'vitest';
import { ATOM_PROP_SCHEMAS, isBoundList } from './atoms';

/**
 * Static-or-dynamic list props — `select.options`, `radio.options`,
 * `autocomplete.options` and `breadcrumbs.items` accept either a static
 * array OR a `{ source, sample?, prepend?, append? }` binding to a
 * backend data source (`$prefix.path`, convention `$data.<key>`).
 */
describe('schema — static | dynamic list props', () => {
  const select = ATOM_PROP_SCHEMAS.select;
  const base = { name: 'country' };
  const opt = { value: 'it', label: 'Italy' };

  test('accepts a static options array', () => {
    expect(select.safeParse({ ...base, options: [opt] }).success).toBe(true);
  });

  test('accepts a bound source with no items (min relaxed)', () => {
    expect(
      select.safeParse({ ...base, options: { source: '$data.countries' } }).success,
    ).toBe(true);
  });

  test('accepts a bound source with sample + prepend + append (hybrid)', () => {
    expect(
      select.safeParse({
        ...base,
        options: {
          source: '$data.countries',
          sample: [opt],
          prepend: [{ value: 'all', label: 'All' }],
          append: [{ value: 'other', label: 'Other' }],
        },
      }).success,
    ).toBe(true);
  });

  test('rejects an empty STATIC array (min still applies to the array branch)', () => {
    expect(select.safeParse({ ...base, options: [] }).success).toBe(false);
  });

  test('rejects a source that is not a $prefix.path reference', () => {
    expect(select.safeParse({ ...base, options: { source: 'countries' } }).success).toBe(false);
  });

  test('rejects unknown keys on the binding (strict)', () => {
    expect(
      select.safeParse({
        ...base,
        options: { source: '$data.countries', limit: 20 },
      }).success,
    ).toBe(false);
  });

  test('rejects malformed items inside sample', () => {
    expect(
      select.safeParse({
        ...base,
        options: { source: '$data.countries', sample: [{ value: 'it' }] },
      }).success,
    ).toBe(false); // sample item missing required `label`
  });

  test('autocomplete accepts an empty static array (no min) and a binding', () => {
    const ac = ATOM_PROP_SCHEMAS.autocomplete;
    expect(ac.safeParse({ name: 'city', options: [] }).success).toBe(true);
    expect(ac.safeParse({ name: 'city', options: { source: '$data.cities' } }).success).toBe(true);
  });

  test('radio + breadcrumbs also accept the binding form', () => {
    expect(
      ATOM_PROP_SCHEMAS.radio.safeParse({ name: 'plan', options: { source: '$data.plans' } }).success,
    ).toBe(true);
    expect(
      ATOM_PROP_SCHEMAS.breadcrumbs.safeParse({ items: { source: '$data.trail' } }).success,
    ).toBe(true);
  });
});

describe('isBoundList', () => {
  test('true for a { source } object', () => {
    expect(isBoundList({ source: '$data.x' })).toBe(true);
  });

  test('false for an array', () => {
    expect(isBoundList([{ value: 'a', label: 'A' }])).toBe(false);
  });

  test('false for null / undefined / a plain object without source', () => {
    expect(isBoundList(null)).toBe(false);
    expect(isBoundList(undefined)).toBe(false);
    expect(isBoundList({ items: [] })).toBe(false);
  });
});
