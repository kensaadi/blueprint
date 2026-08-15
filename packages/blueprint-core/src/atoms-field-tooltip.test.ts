import { describe, test, expect } from 'vitest';
import { ATOM_PROP_SCHEMAS } from './atoms';

/**
 * `field.tooltip` — the label-help tooltip forwarded to the underlying
 * `@dashforge/tw|ui` input. String shorthand or a strict config object.
 */
describe('schema — field.tooltip', () => {
  const s = ATOM_PROP_SCHEMAS.field;
  const base = { name: 'firstName' };

  test('accepts a string shorthand', () => {
    expect(s.safeParse({ ...base, tooltip: 'Your legal first name' }).success).toBe(true);
  });

  test('accepts a full config object', () => {
    expect(
      s.safeParse({
        ...base,
        tooltip: { content: 'As on your ID', icon: 'info-circle', position: 'before', side: 'right' },
      }).success,
    ).toBe(true);
  });

  test('accepts inline rich-text content', () => {
    expect(
      s.safeParse({
        ...base,
        tooltip: { content: [{ type: 'text', text: 'Press ', }, { type: 'text', text: 'Ctrl+S', code: true }] },
      }).success,
    ).toBe(true);
  });

  test('config requires content', () => {
    expect(s.safeParse({ ...base, tooltip: { icon: 'info-circle' } }).success).toBe(false);
  });

  test('rejects an unknown position', () => {
    expect(s.safeParse({ ...base, tooltip: { content: 'x', position: 'left' } }).success).toBe(false);
  });

  test('rejects an unknown side', () => {
    expect(s.safeParse({ ...base, tooltip: { content: 'x', side: 'middle' } }).success).toBe(false);
  });

  test('rejects an unknown key (strict)', () => {
    expect(s.safeParse({ ...base, tooltip: { content: 'x', delay: 200 } }).success).toBe(false);
  });

  test('field without a tooltip is still valid', () => {
    expect(s.safeParse(base).success).toBe(true);
  });
});
