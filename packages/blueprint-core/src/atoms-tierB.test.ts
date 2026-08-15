/**
 * Schema tests for the Tier B navigation/interaction atoms:
 *   tabs · accordion · tooltip · breadcrumbs · pagination
 */
import { describe, expect, test } from 'vitest';
import { ATOM_PROP_SCHEMAS } from './atoms';

describe('schema — tabs', () => {
  const s = ATOM_PROP_SCHEMAS.tabs;
  test('requires items', () => {
    expect(s.safeParse({}).success).toBe(false);
  });
  test('rejects empty items array', () => {
    expect(s.safeParse({ items: [] }).success).toBe(false);
  });
  test('accepts minimal valid items', () => {
    expect(s.safeParse({ items: [{ value: 'a', label: 'A' }] }).success).toBe(true);
  });
  test('accepts full surface', () => {
    expect(s.safeParse({
      items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', disabled: true }],
      defaultValue: 'a',
      variant: 'pill',
      orientation: 'vertical',
      keepMounted: true,
    }).success).toBe(true);
  });
  test('rejects unknown variant', () => {
    expect(s.safeParse({ items: [{ value: 'a', label: 'A' }], variant: 'tabsy' }).success).toBe(false);
  });
  test('rejects item with empty value', () => {
    expect(s.safeParse({ items: [{ value: '', label: 'A' }] }).success).toBe(false);
  });
});

describe('schema — accordion', () => {
  const s = ATOM_PROP_SCHEMAS.accordion;
  test('discriminates on type="single"', () => {
    expect(s.safeParse({
      type: 'single',
      items: [{ value: 'a', header: 'A' }],
      defaultValue: 'a',
      collapsible: true,
    }).success).toBe(true);
  });
  test('discriminates on type="multiple"', () => {
    expect(s.safeParse({
      type: 'multiple',
      items: [{ value: 'a', header: 'A' }, { value: 'b', header: 'B' }],
      defaultValue: ['a', 'b'],
    }).success).toBe(true);
  });
  test('rejects single with array defaultValue', () => {
    expect(s.safeParse({
      type: 'single',
      items: [{ value: 'a', header: 'A' }],
      defaultValue: ['a'],
    }).success).toBe(false);
  });
  test('rejects multiple with string defaultValue', () => {
    expect(s.safeParse({
      type: 'multiple',
      items: [{ value: 'a', header: 'A' }],
      defaultValue: 'a',
    }).success).toBe(false);
  });
  test('rejects unknown type', () => {
    expect(s.safeParse({ type: 'tri-state', items: [{ value: 'a', header: 'A' }] }).success).toBe(false);
  });
  test('rejects empty items', () => {
    expect(s.safeParse({ type: 'single', items: [] }).success).toBe(false);
  });
});

describe('schema — tooltip', () => {
  const s = ATOM_PROP_SCHEMAS.tooltip;
  test('requires content', () => {
    expect(s.safeParse({}).success).toBe(false);
  });
  test('accepts empty string (hybrid inline schema is permissive on strings)', () => {
    // Empty tooltip is allowed at the schema level — the binding renders
    // nothing in practice. Previous strict-non-empty constraint dropped
    // when content became `string | InlineNode[]`.
    expect(s.safeParse({ content: '' }).success).toBe(true);
  });
  test('rejects empty inline array (must have at least one node)', () => {
    expect(s.safeParse({ content: [] }).success).toBe(false);
  });
  test('accepts inline rich-text array', () => {
    expect(s.safeParse({
      content: [
        { type: 'text', text: 'Press ' },
        { type: 'text', text: 'Ctrl+S', code: true },
        { type: 'text', text: ' to save' },
      ],
    }).success).toBe(true);
  });
  test('accepts minimal valid', () => {
    expect(s.safeParse({ content: 'hi' }).success).toBe(true);
  });
  test('accepts an icon (Tabler name for the standalone trigger)', () => {
    expect(s.safeParse({ content: 'hi', icon: 'info-circle' }).success).toBe(true);
    expect(s.safeParse({ content: 'hi', icon: 'help' }).success).toBe(true);
  });
  test('rejects a non-string icon', () => {
    expect(s.safeParse({ content: 'hi', icon: 42 }).success).toBe(false);
  });
  test('accepts every side × align combo', () => {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      for (const align of ['start', 'center', 'end'] as const) {
        expect(s.safeParse({ content: 'x', side, align }).success).toBe(true);
      }
    }
  });
  test('rejects negative delay', () => {
    expect(s.safeParse({ content: 'x', delayDuration: -1 }).success).toBe(false);
  });
});

describe('schema — breadcrumbs', () => {
  const s = ATOM_PROP_SCHEMAS.breadcrumbs;
  test('requires items', () => {
    expect(s.safeParse({}).success).toBe(false);
  });
  test('rejects empty items', () => {
    expect(s.safeParse({ items: [] }).success).toBe(false);
  });
  test('accepts a minimal trail', () => {
    expect(s.safeParse({
      items: [{ id: 'h', label: 'Home', href: '/' }],
    }).success).toBe(true);
  });
  test('accepts current=true marker on last crumb', () => {
    expect(s.safeParse({
      items: [
        { id: 'h', label: 'Home', href: '/' },
        { id: 'd', label: 'Docs', current: true },
      ],
    }).success).toBe(true);
  });
  test('accepts icon id ref', () => {
    expect(s.safeParse({
      items: [{ id: 'h', label: 'Home', href: '/', icon: 'home' }],
    }).success).toBe(true);
  });
  test('accepts truncation knobs', () => {
    expect(s.safeParse({
      items: [{ id: 'h', label: 'Home' }],
      maxItems: 5, itemsBeforeCollapse: 1, itemsAfterCollapse: 2,
    }).success).toBe(true);
  });
  test('rejects negative maxItems', () => {
    expect(s.safeParse({
      items: [{ id: 'h', label: 'Home' }],
      maxItems: -1,
    }).success).toBe(false);
  });
});

describe('schema — pagination', () => {
  const s = ATOM_PROP_SCHEMAS.pagination;
  test('requires totalCount', () => {
    expect(s.safeParse({}).success).toBe(false);
  });
  test('accepts minimal valid', () => {
    expect(s.safeParse({ totalCount: 0 }).success).toBe(true);
  });
  test('accepts full surface', () => {
    expect(s.safeParse({
      totalCount: 1437,
      defaultPage: 5,
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
      siblingCount: 2,
      boundaryCount: 1,
      showFirstLast: true,
      showJumpInput: true,
      disabled: false,
      variant: 'compact',
      size: 'sm',
    }).success).toBe(true);
  });
  test('rejects non-integer totalCount', () => {
    expect(s.safeParse({ totalCount: 3.14 }).success).toBe(false);
  });
  test('rejects negative totalCount', () => {
    expect(s.safeParse({ totalCount: -1 }).success).toBe(false);
  });
  test('rejects empty pageSizeOptions', () => {
    expect(s.safeParse({ totalCount: 100, pageSizeOptions: [] }).success).toBe(false);
  });
});
