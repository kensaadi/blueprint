/**
 * Unit tests for the i18n core:
 *   - `inlineTextSchema` accepts `$t` shorthand + array variant
 *   - `translatableStringSchema` accepts literal + ref
 *   - dynamic keys (Decision A) are rejected at schema time
 *   - `resolveVars` correctly substitutes `$form.X` refs
 *   - `collectMissingTranslationKeys` reports keys not in registry
 */
import { describe, expect, test } from 'vitest';
import {
  collectMissingTranslationKeys,
  collectTranslationRefs,
  inlineTextRunSchema,
  inlineTextSchema,
  isTranslationRef,
  resolveVars,
  translatableStringSchema,
  translationRefSchema,
  type BlueprintNode,
} from './index';

describe('schema — $t variant + shorthand', () => {
  test('translationRefSchema accepts { $t }', () => {
    expect(translationRefSchema.safeParse({ $t: 'common.save' }).success).toBe(true);
    expect(translationRefSchema.safeParse({ $t: 'common.save', vars: { name: 'Maria' } }).success).toBe(true);
  });

  test('translationRefSchema rejects empty key (Decision A — no dynamic keys)', () => {
    expect(translationRefSchema.safeParse({ $t: '' }).success).toBe(false);
    // Non-string key — schema enforces literal
    expect(translationRefSchema.safeParse({ $t: 42 }).success).toBe(false);
  });

  test('translatableString accepts literal OR ref', () => {
    expect(translatableStringSchema.safeParse('Save').success).toBe(true);
    expect(translatableStringSchema.safeParse({ $t: 'common.save' }).success).toBe(true);
    expect(translatableStringSchema.safeParse(42).success).toBe(false);
  });

  test('inlineTextSchema accepts $t at prop level (shorthand)', () => {
    expect(inlineTextSchema.safeParse('hello').success).toBe(true);
    expect(inlineTextSchema.safeParse({ $t: 'common.hello' }).success).toBe(true);
    expect(
      inlineTextSchema.safeParse([{ type: 'text', text: 'plain' }]).success,
    ).toBe(true);
  });

  test('inline text run with $t carries marks', () => {
    const parsed = inlineTextRunSchema.safeParse({
      type: 'text',
      $t: 'common.bold-greeting',
      vars: { name: '$form.firstName' },
      bold: true,
      italic: true,
    });
    expect(parsed.success).toBe(true);
  });

  test('text run rejects both `text` AND `$t` at once', () => {
    expect(
      inlineTextRunSchema.safeParse({ type: 'text', text: 'literal', $t: 'k' }).success,
    ).toBe(false);
  });

  test('text run rejects neither `text` nor `$t`', () => {
    expect(inlineTextRunSchema.safeParse({ type: 'text' }).success).toBe(false);
  });

  test('inline array mixes literal + $t freely', () => {
    const parsed = inlineTextSchema.safeParse([
      { type: 'text', text: 'Hello ' },
      { type: 'text', $t: 'greeting.name', vars: { name: '$form.firstName' }, bold: true },
      { type: 'text', text: '!' },
    ]);
    expect(parsed.success).toBe(true);
  });
});

describe('isTranslationRef type guard', () => {
  test('positive cases', () => {
    expect(isTranslationRef({ $t: 'k' })).toBe(true);
    expect(isTranslationRef({ $t: 'k', vars: { a: 'b' } })).toBe(true);
  });

  test('negative cases', () => {
    expect(isTranslationRef('plain')).toBe(false);
    expect(isTranslationRef([])).toBe(false);
    expect(isTranslationRef(null)).toBe(false);
    expect(isTranslationRef(undefined)).toBe(false);
    expect(isTranslationRef({ $t: 42 })).toBe(false);
    expect(isTranslationRef({ text: 'no $t' })).toBe(false);
  });
});

describe('resolveVars', () => {
  test('returns undefined for undefined input', () => {
    expect(resolveVars(undefined, {})).toBeUndefined();
  });

  test('passes literal strings through', () => {
    expect(resolveVars({ name: 'Maria' }, {})).toEqual({ name: 'Maria' });
  });

  test('resolves $form.X refs against form state', () => {
    const vars = { name: '$form.firstName', city: '$form.address' };
    const state = { firstName: 'Maria', address: 'Rome' };
    expect(resolveVars(vars, state)).toEqual({ name: 'Maria', city: 'Rome' });
  });

  test('returns undefined when form state is null (no form in scope)', () => {
    const vars = { name: '$form.firstName' };
    expect(resolveVars(vars, null)).toEqual({ name: undefined });
  });

  test('falls back to undefined for missing form keys', () => {
    const vars = { name: '$form.absent' };
    expect(resolveVars(vars, { firstName: 'Maria' })).toEqual({ name: undefined });
  });

  test('mixes literal + $form refs in the same map', () => {
    const vars = { greeting: 'Ciao', name: '$form.firstName' };
    expect(resolveVars(vars, { firstName: 'Maria' })).toEqual({ greeting: 'Ciao', name: 'Maria' });
  });
});

describe('collectTranslationRefs', () => {
  test('finds shorthand refs at prop level', () => {
    const node: BlueprintNode = {
      type: 'form',
      id: 'f',
      children: [
        { type: 'field', props: { name: 'a', label: { $t: 'common.firstName' } } },
        { type: 'submit', props: { label: { $t: 'actions.save' } } },
      ],
    };
    const refs = collectTranslationRefs(node);
    expect(refs.map((r) => r.key)).toEqual(['common.firstName', 'actions.save']);
  });

  test('finds inline-run refs inside InlineNode[] arrays', () => {
    const node: BlueprintNode = {
      type: 'heading',
      props: {
        level: 1,
        children: [
          { type: 'text', text: 'Plain ' },
          { type: 'text', $t: 'common.title' },
        ],
      },
    };
    const refs = collectTranslationRefs(node);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ key: 'common.title' });
  });

  test('finds per-item label refs in options arrays (select / radio / etc.)', () => {
    const node: BlueprintNode = {
      type: 'form',
      id: 'f',
      children: [
        {
          type: 'select',
          props: {
            name: 's',
            options: [
              { value: 'a', label: { $t: 'opt.a' } },
              { value: 'b', label: 'literal' },
              { value: 'c', label: { $t: 'opt.c' } },
            ],
          },
        },
      ],
    };
    const refs = collectTranslationRefs(node);
    expect(refs.map((r) => r.key).sort()).toEqual(['opt.a', 'opt.c']);
  });

  test('preserves vars on each ref site', () => {
    const node: BlueprintNode = {
      type: 'heading',
      props: {
        level: 1,
        children: [
          { type: 'text', $t: 'greeting.name', vars: { name: '$form.firstName' } },
        ],
      },
    };
    const refs = collectTranslationRefs(node);
    expect(refs[0]?.vars).toEqual({ name: '$form.firstName' });
  });

  test('reports per-occurrence (duplicates kept)', () => {
    const node: BlueprintNode = {
      type: 'stack',
      children: [
        { type: 'text', props: { children: { $t: 'common.same' } } },
        { type: 'text', props: { children: { $t: 'common.same' } } },
      ],
    };
    const refs = collectTranslationRefs(node);
    expect(refs).toHaveLength(2);
    expect(refs[0]?.path).not.toEqual(refs[1]?.path);
  });
});

describe('collectMissingTranslationKeys', () => {
  function tree(): BlueprintNode {
    return {
      type: 'form',
      id: 'f',
      children: [
        // shorthand at prop level
        { type: 'field', props: { name: 'a', label: { $t: 'common.firstName' } } },
        // inline array with $t variant
        {
          type: 'heading',
          props: {
            level: 1,
            children: [
              { type: 'text', text: 'Plain ' },
              { type: 'text', $t: 'common.title' },
              { type: 'text', $t: 'common.unknown' },
            ],
          },
        },
        // submit label
        { type: 'submit', props: { label: { $t: 'actions.save' } } },
      ],
    };
  }

  test('no registry → no diagnostics', () => {
    expect(collectMissingTranslationKeys(tree(), undefined, 'strict')).toEqual([]);
  });

  test('all keys present → no diagnostics', () => {
    const out = collectMissingTranslationKeys(
      tree(),
      ['common.firstName', 'common.title', 'common.unknown', 'actions.save'],
      'strict',
    );
    expect(out).toEqual([]);
  });

  test('missing key → error in strict', () => {
    const out = collectMissingTranslationKeys(
      tree(),
      ['common.firstName', 'common.title', 'actions.save'],
      'strict',
    );
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].code).toBe('UNKNOWN_TRANSLATION_KEY');
    expect(out[0].received).toBe('common.unknown');
  });

  test('missing key → warning in lenient', () => {
    const out = collectMissingTranslationKeys(
      tree(),
      new Set(['common.firstName', 'common.title', 'actions.save']),
      'lenient',
    );
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('warning');
  });

  test('reports json pointer path for each miss', () => {
    const out = collectMissingTranslationKeys(tree(), new Set(), 'strict');
    // 4 references total — 1 field.label shorthand + 2 in inline array + 1 submit.label
    expect(out).toHaveLength(4);
    // Sanity: paths should be JSON pointers under /root
    expect(out.every((d) => d.path.startsWith('/root'))).toBe(true);
  });
});
