/**
 * Tests for the diagnostic helpers used by ValidationErrorCard:
 *   - parsePointer / valueAtPath / nodeAncestors
 *   - humanizePath
 *   - nearestNode / pointerLeaf
 *   - formatNodeSnippet
 */
import { describe, expect, test } from 'vitest';
import {
  parsePointer,
  valueAtPath,
  nodeAncestors,
  humanizePath,
  nearestNode,
  formatNodeSnippet,
  pointerLeaf,
} from './diagnostics';
import type { BlueprintDocument } from './types';

const doc: BlueprintDocument = {
  version: '1.0',
  root: {
    type: 'card',
    children: [
      { type: 'heading', props: { level: 1, children: 'Title' } },
      {
        type: 'stack',
        props: { spacing: 'md' },
        children: [
          { type: 'text', props: { children: 'Hi' } },
          {
            type: 'form',
            id: 'kyc-form',
            children: [
              { type: 'field', props: { name: 'email', required: true } },
              { type: 'field', props: { name: 'phone' } },
            ],
          },
        ],
      },
    ],
  },
};

describe('parsePointer', () => {
  test('empty / root pointer → []', () => {
    expect(parsePointer('/')).toEqual([]);
    expect(parsePointer('')).toEqual([]);
  });
  test('splits on /', () => {
    expect(parsePointer('/root/children/0/type')).toEqual(['root', 'children', '0', 'type']);
  });
  test('unescapes ~1 → / and ~0 → ~', () => {
    expect(parsePointer('/a~1b/c~0d')).toEqual(['a/b', 'c~d']);
  });

  // RFC 6901 edge cases — escape order matters: ~1 first, then ~0.
  // Reversing the order would corrupt sequences like `~01` (= `~1`).
  test('RFC 6901: handles a literal "/" in a segment via ~1', () => {
    expect(parsePointer('/path~1with~1slash')).toEqual(['path/with/slash']);
  });
  test('RFC 6901: handles a literal "~" in a segment via ~0', () => {
    expect(parsePointer('/~0root~0name')).toEqual(['~root~name']);
  });
  test('RFC 6901: ~01 unescapes to ~1 (not /)', () => {
    // ~0 → ~ FIRST, then no further substitution → result is "~1"
    expect(parsePointer('/foo~01bar')).toEqual(['foo~1bar']);
  });
  test('RFC 6901: ~10 unescapes to / then literal 0', () => {
    // ~1 → / so the segment becomes "foo/0bar"
    expect(parsePointer('/foo~10bar')).toEqual(['foo/0bar']);
  });
  test('RFC 6901: empty segment between slashes', () => {
    expect(parsePointer('/foo//bar')).toEqual(['foo', '', 'bar']);
  });
  test('RFC 6901: trailing slash → trailing empty segment', () => {
    expect(parsePointer('/foo/')).toEqual(['foo', '']);
  });
  test('RFC 6901: single tilde without 0 or 1 is left as-is (no panic)', () => {
    expect(parsePointer('/foo~bar')).toEqual(['foo~bar']);
  });
  test('RFC 6901: mixed ~0 and ~1 in same segment', () => {
    expect(parsePointer('/key~0with~1both')).toEqual(['key~with/both']);
  });
  test('RFC 6901: leading / required — without leading / first segment still extracted', () => {
    // Permissive form: callers occasionally omit the leading slash
    expect(parsePointer('root/children')).toEqual(['root', 'children']);
  });
});

describe('valueAtPath', () => {
  test('resolves nested object value', () => {
    expect(valueAtPath(doc, '/root/type')).toBe('card');
    expect(valueAtPath(doc, '/root/children/0/props/level')).toBe(1);
  });
  test('resolves array index', () => {
    expect(valueAtPath(doc, '/root/children/1/id')).toBeUndefined();
    expect(valueAtPath(doc, '/root/children/1/children/1/id')).toBe('kyc-form');
  });
  test('returns undefined for non-existing path', () => {
    expect(valueAtPath(doc, '/root/children/99/foo')).toBeUndefined();
    expect(valueAtPath(doc, '/nope')).toBeUndefined();
  });
});

describe('nodeAncestors', () => {
  test('collects atoms only', () => {
    const crumbs = nodeAncestors(doc, '/root/children/1/children/1/children/0/props/name');
    expect(crumbs.map((c) => c.type)).toEqual(['card', 'stack', 'form', 'field']);
  });
  test('captures index when crumb sits inside children array', () => {
    const crumbs = nodeAncestors(doc, '/root/children/1/children/1/children/1');
    expect(crumbs.map((c) => `${c.type}#${c.id ?? ''}[${c.index ?? ''}]`)).toEqual([
      'card#[]',
      'stack#[1]',
      'form#kyc-form[1]',
      'field#[1]',
    ]);
  });
});

describe('humanizePath', () => {
  test('root only', () => {
    expect(humanizePath(doc, '/root')).toBe('card');
  });
  test('atom with id renders as type#id', () => {
    expect(humanizePath(doc, '/root/children/1/children/1')).toContain('form#kyc-form');
  });
  test('atom without id and with index renders as type[index]', () => {
    expect(humanizePath(doc, '/root/children/1/children/0')).toContain('text[0]');
  });
  test('deep breadcrumb assembles the chain', () => {
    const path = humanizePath(doc, '/root/children/1/children/1/children/0/props/name');
    expect(path).toBe('card › stack[1] › form#kyc-form › field[0]');
  });
  test('returns "root" when no ancestors resolved', () => {
    expect(humanizePath(null, '/anywhere')).toBe('root');
  });
});

describe('nearestNode + pointerLeaf', () => {
  test('nearestNode returns the deepest atom on the path', () => {
    const node = nearestNode(doc, '/root/children/1/children/1/children/0/props/name');
    expect(node?.type).toBe('field');
    expect((node?.props as Record<string, unknown>).name).toBe('email');
  });
  test('pointerLeaf returns the last segment', () => {
    expect(pointerLeaf('/root/props/name')).toBe('name');
    expect(pointerLeaf('/')).toBeUndefined();
    expect(pointerLeaf('')).toBeUndefined();
  });
});

describe('formatNodeSnippet', () => {
  test('returns valid JSON', () => {
    const node = { type: 'field', props: { name: 'email' } };
    const snippet = formatNodeSnippet(node);
    expect(() => JSON.parse(snippet)).not.toThrow();
  });
  test('truncates deep sub-trees at maxDepth', () => {
    const deep = {
      type: 'card',
      children: [{ type: 'stack', children: [{ type: 'form', children: [{ type: 'field' }] }] }],
    };
    const snippet = formatNodeSnippet(deep, 1);
    // At maxDepth=1, anything indented more than 4 spaces is dropped.
    expect(snippet.split('\n').length).toBeLessThan(15);
  });
});
