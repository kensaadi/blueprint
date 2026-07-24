/**
 * API surface snapshot — locks in the public exports of @dashforge/blueprint.
 *
 * A change here is a **breaking change**. If you intentionally add or
 * rename a public symbol, update the snapshots below AND document it in
 * the release notes.
 *
 * The point is to catch accidental drift: someone re-exports an internal
 * helper "for convenience" and now consumers depend on it, freezing what
 * used to be an implementation detail.
 */
import { describe, it, expect } from 'vitest';
import * as blueprint from './index';
import * as core from '@dashforge/blueprint-core';

// Expected VALUE exports (runtime symbols the consumer can `import { X }`).
// Sorted alphabetically for stable diffs.
const EXPECTED_BLUEPRINT_VALUE_EXPORTS = [
  'ATOMS_REQUIRING_ID',
  'ATOM_NAMES',
  'DashBlueprint',
  'IconFallback',
  'IconProvider',
  'InlineText',
  'IntlProvider',
  'isAtomName',
  'isSafeHref',
  'isTranslationRef',
  'renderIcon',
  'resolveTranslatableValue',
  'useFormValuesSafe',
  'useIcon',
  'useIconRegistry',
  'useIntl',
  'useTranslatable',
  'validate',
];

const EXPECTED_CORE_VALUE_EXPORTS = [
  'ATOMS_REQUIRING_ID',
  'ATOM_NAMES',
  'ATOM_PROP_SCHEMAS',
  'ICON_REF_PROPS',
  'SUPPORTED_VERSIONS',
  'accessRuleSchema',
  'collectFieldRefs',
  'collectFormFieldNames',
  'collectMissingIconRefs',
  'collectMissingTranslationKeys',
  'collectTranslationRefs',
  'documentSchema',
  'evaluateVisibility',
  'formatNodeSnippet',
  'humanizePath',
  'iconIdSchema',
  'inlineBreakSchema',
  'inlineLinkSchema',
  'inlineNodeSchema',
  'inlineTextRunSchema',
  'inlineTextSchema',
  'isAtomName',
  'isSafeHref',
  'isTranslationRef',
  'linkHrefSchema',
  'nearestNode',
  'nodeAncestors',
  'nodeSchema',
  'parsePointer',
  'pointerLeaf',
  'resolveVars',
  'translatableStringSchema',
  'translationRefSchema',
  'valueAtPath',
  'validate',
  'visibilityRuleSchema',
  'visibilityValueSchema',
];

describe('@dashforge/blueprint — public API surface', () => {
  it('exports exactly the declared runtime symbols', () => {
    const actual = Object.keys(blueprint)
      .filter((k) => typeof (blueprint as Record<string, unknown>)[k] !== 'undefined')
      .sort();
    expect(actual).toEqual(EXPECTED_BLUEPRINT_VALUE_EXPORTS.slice().sort());
  });

  it('does NOT re-export internal implementation details', () => {
    const forbidden = ['compileTree', 'CompileContext', 'LIBS', 'VisibilityGate', 'bpWarn', 'NodeErrorBoundary'];
    for (const name of forbidden) {
      expect((blueprint as Record<string, unknown>)[name]).toBeUndefined();
    }
  });

  it('DashBlueprint is a callable component', () => {
    expect(typeof blueprint.DashBlueprint).toBe('function');
  });
});

describe('@dashforge/blueprint-core — public API surface', () => {
  it('exports exactly the declared runtime symbols', () => {
    const actual = Object.keys(core)
      .filter((k) => typeof (core as Record<string, unknown>)[k] !== 'undefined')
      .sort();
    expect(actual).toEqual(EXPECTED_CORE_VALUE_EXPORTS.slice().sort());
  });

  it('validate is a callable function', () => {
    expect(typeof core.validate).toBe('function');
  });

  it('ATOM_NAMES is a non-empty array', () => {
    expect(Array.isArray(core.ATOM_NAMES)).toBe(true);
    expect(core.ATOM_NAMES.length).toBeGreaterThan(0);
  });
});
