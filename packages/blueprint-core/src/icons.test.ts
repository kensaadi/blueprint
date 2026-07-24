/**
 * Unit tests for the icon system core — collectMissingIconRefs walker.
 *
 * The walker is pure (no React). These tests pin its behavior across
 * lenient vs strict, multiple nested misses, and the empty-registry edge.
 */
import { describe, expect, test } from 'vitest';
import { createElement } from 'react';
import { collectMissingIconRefs, type IconRegistry } from './icons';
import type { BlueprintNode } from './types';

const REG: IconRegistry = [
  { id: 'save',  render: () => createElement('span'), sources: ['custom'] },
  { id: 'trash', render: () => createElement('span'), sources: ['custom'] },
];

describe('collectMissingIconRefs', () => {
  test('returns no diagnostics for tree without icon refs', () => {
    const root: BlueprintNode = {
      type: 'card',
      children: [{ type: 'text', props: { children: 'hi' } }],
    };
    expect(collectMissingIconRefs(root, REG, 'lenient')).toEqual([]);
  });

  test('returns no diagnostics when every ref is registered', () => {
    const root: BlueprintNode = {
      type: 'stack',
      children: [
        { type: 'button',     props: { label: 'Save',   icon: 'save'  } },
        { type: 'iconButton', props: { icon: 'trash', ariaLabel: 'd' } },
      ],
    };
    expect(collectMissingIconRefs(root, REG, 'lenient')).toEqual([]);
  });

  test('emits warning per missing ref in lenient mode', () => {
    const root: BlueprintNode = {
      type: 'stack',
      children: [
        { type: 'button',     props: { label: 'Save', icon: 'nope-1' } },
        { type: 'iconButton', props: { icon: 'nope-2', ariaLabel: 'd' } },
      ],
    };
    const diag = collectMissingIconRefs(root, REG, 'lenient');
    expect(diag).toHaveLength(2);
    expect(diag.every((d) => d.severity === 'warning')).toBe(true);
    expect(diag[0].code).toBe('UNKNOWN_ICON_REF');
    expect(diag[0].path).toBe('/root/children/0/props/icon');
    expect(diag[1].path).toBe('/root/children/1/props/icon');
  });

  test('emits error per missing ref in strict mode', () => {
    const root: BlueprintNode = {
      type: 'button',
      props: { label: 'x', icon: 'nope' },
    };
    const diag = collectMissingIconRefs(root, REG, 'strict');
    expect(diag).toHaveLength(1);
    expect(diag[0].severity).toBe('error');
    expect(diag[0].path).toBe('/root/props/icon');
  });

  test('returns warnings for every ref against empty registry', () => {
    const root: BlueprintNode = {
      type: 'stack',
      children: [
        { type: 'button',     props: { label: 'a', icon: 'a' } },
        { type: 'button',     props: { label: 'b', icon: 'b' } },
        { type: 'iconButton', props: { icon: 'c', ariaLabel: 'd' } },
      ],
    };
    const diag = collectMissingIconRefs(root, [], 'lenient');
    expect(diag).toHaveLength(3);
  });

  test('ignores empty / non-string icon values', () => {
    const root: BlueprintNode = {
      type: 'stack',
      children: [
        // empty string → considered absent
        { type: 'button', props: { label: 'a', icon: '' } },
        { type: 'button', props: { label: 'b' } },
      ],
    };
    expect(collectMissingIconRefs(root, REG, 'strict')).toEqual([]);
  });

  test('descends into deeply nested trees', () => {
    const root: BlueprintNode = {
      type: 'card',
      children: [{
        type: 'stack',
        children: [{
          type: 'section',
          children: [{ type: 'button', props: { label: 'x', icon: 'missing' } }],
        }],
      }],
    };
    const diag = collectMissingIconRefs(root, REG, 'lenient');
    expect(diag).toHaveLength(1);
    expect(diag[0].path).toBe('/root/children/0/children/0/children/0/props/icon');
  });
});
