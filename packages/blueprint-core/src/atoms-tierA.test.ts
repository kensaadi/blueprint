/**
 * Schema tests for the Tier A display/layout atoms:
 *   box · container · badge · chip · avatar
 *
 * Each test exercises a few accepts + a few rejects so the strict
 * shape stays pinned (no silent prop drift).
 */
import { describe, expect, test } from 'vitest';
import { ATOM_PROP_SCHEMAS } from './atoms';

describe('schema — box', () => {
  const s = ATOM_PROP_SCHEMAS.box;
  test('accepts minimal {}', () => {
    expect(s.safeParse({}).success).toBe(true);
  });
  test('accepts the full token surface', () => {
    expect(s.safeParse({
      p: 'md', px: 'sm', py: 'lg', m: 'xs', mx: 'none', my: '2xl',
      rounded: 'xl', elevation: 3, fullWidth: true,
    }).success).toBe(true);
  });
  test('rejects unknown spacing token', () => {
    expect(s.safeParse({ p: 'huge' }).success).toBe(false);
  });
  test('rejects elevation out of range', () => {
    expect(s.safeParse({ elevation: 9 }).success).toBe(false);
  });
});

describe('schema — container', () => {
  const s = ATOM_PROP_SCHEMAS.container;
  test('accepts every documented size', () => {
    for (const size of ['sm', 'md', 'lg', 'xl', 'full'] as const) {
      expect(s.safeParse({ size }).success).toBe(true);
    }
  });
  test('rejects unknown size', () => {
    expect(s.safeParse({ size: 'huge' }).success).toBe(false);
  });
  test('accepts centerContent + px toggle', () => {
    expect(s.safeParse({ centerContent: true, px: true }).success).toBe(true);
    expect(s.safeParse({ centerContent: true, px: false }).success).toBe(true);
  });
  test('rejects non-boolean px (px is a toggle, not a spacing token)', () => {
    expect(s.safeParse({ px: 'lg' }).success).toBe(false);
  });
});

describe('schema — badge', () => {
  const s = ATOM_PROP_SCHEMAS.badge;
  test('accepts numeric content + max', () => {
    expect(s.safeParse({ content: 42, max: 99, color: 'danger' }).success).toBe(true);
  });
  test('accepts string content', () => {
    expect(s.safeParse({ content: 'NEW', color: 'info' }).success).toBe(true);
  });
  test('accepts dot-only', () => {
    expect(s.safeParse({ dot: true, color: 'success', overlap: 'circular' }).success).toBe(true);
  });
  test('accepts all 4 placements', () => {
    for (const p of ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const) {
      expect(s.safeParse({ placement: p }).success).toBe(true);
    }
  });
  test('rejects unknown placement', () => {
    expect(s.safeParse({ placement: 'middle' }).success).toBe(false);
  });
  test('rejects non-positive max', () => {
    expect(s.safeParse({ max: 0 }).success).toBe(false);
    expect(s.safeParse({ max: -1 }).success).toBe(false);
  });
});

describe('schema — chip', () => {
  const s = ATOM_PROP_SCHEMAS.chip;
  test('requires label', () => {
    expect(s.safeParse({}).success).toBe(false);
  });
  test('rejects empty-string label', () => {
    expect(s.safeParse({ label: '' }).success).toBe(false);
  });
  test('accepts label + variant + color + size', () => {
    expect(s.safeParse({
      label: 'Admin', variant: 'outline', color: 'primary', size: 'sm',
    }).success).toBe(true);
  });
  test('accepts selected + disabled + icon id', () => {
    expect(s.safeParse({
      label: 'Admin', selected: true, disabled: false, icon: 'save',
    }).success).toBe(true);
  });
  test('rejects unknown variant', () => {
    expect(s.safeParse({ label: 'x', variant: 'pill' }).success).toBe(false);
  });
});

describe('schema — avatar', () => {
  const s = ATOM_PROP_SCHEMAS.avatar;
  test('accepts empty {}', () => {
    expect(s.safeParse({}).success).toBe(true);
  });
  test('accepts name + size + shape + color', () => {
    expect(s.safeParse({
      name: 'Maria Rossi', size: 'lg', shape: 'circle', color: 'primary',
    }).success).toBe(true);
  });
  test('accepts src + name fallback', () => {
    expect(s.safeParse({ src: 'https://x.dev/me.png', name: 'A B' }).success).toBe(true);
  });
  test('accepts data: src', () => {
    expect(s.safeParse({ src: 'data:image/png;base64,abc' }).success).toBe(true);
  });
  test('rejects unknown shape', () => {
    expect(s.safeParse({ shape: 'hexagon' }).success).toBe(false);
  });
  test('rejects unknown size', () => {
    expect(s.safeParse({ size: 'huge' }).success).toBe(false);
  });
});
